import { Router, type IRouter } from "express";
import { db, deliveriesTable, distributorsTable, productsTable, storesTable, tasksTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getSessionContext, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

async function getTaskFull(taskId: number) {
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  const task = tasks[0];
  if (!task) return null;

  const distributorResult = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(eq(distributorsTable.id, task.distributorId));

  const stores = await db.select().from(storesTable).where(eq(storesTable.id, task.storeId));
  const distributor = distributorResult[0];
  const store = stores[0];

  return {
    ...task,
    distributorName: distributor
      ? `${distributor.firstName} ${distributor.lastName}`
      : "Unknown distributor",
    storeName: store?.name ?? "Unknown store",
    storeLatitude: store?.latitude ?? 0,
    storeLongitude: store?.longitude ?? 0,
    totalAmount: parseFloat(task.totalAmount as string),
    items: task.items as Array<Record<string, unknown>>,
  };
}

router.get("/", requireRole("admin", "distributor"), async (req, res) => {
  const { distributorId, status } = req.query;
  const session = getSessionContext(req);
  let query = db.select().from(tasksTable).$dynamic();
  const conditions: any[] = [];

  if (session.role === "distributor" && session.distributorId) {
    conditions.push(eq(tasksTable.distributorId, session.distributorId));
  } else if (distributorId) {
    conditions.push(eq(tasksTable.distributorId, Number.parseInt(distributorId as string, 10)));
  }

  if (status) {
    conditions.push(eq(tasksTable.status, status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const tasks = await query.orderBy(tasksTable.createdAt);
  const results = await Promise.all(tasks.map((task) => getTaskFull(task.id)));
  res.json(results.filter(Boolean));
});

router.get("/:id", requireRole("admin", "distributor"), async (req, res) => {
  const task = await getTaskFull(Number.parseInt(String(req.params.id), 10));
  if (!task) {
    res.status(404).json({ error: "not_found", message: "Task not found" });
    return;
  }

  if (req.session.role === "distributor" && req.session.distributorId !== task.distributorId) {
    res.status(403).json({ error: "forbidden", message: "You can only view your own tasks" });
    return;
  }

  res.json(task);
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { distributorId, storeId, items, notes } = req.body;
  if (!distributorId || !storeId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "validation_error", message: "Missing required fields" });
    return;
  }

  let totalAmount = 0;
  const itemsWithNames: Array<Record<string, unknown>> = [];

  for (const item of items) {
    const products = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    const product = products[0];
    if (!product) {
      res.status(404).json({ error: "not_found", message: `Product ${item.productId} not found` });
      return;
    }

    const price = parseFloat(product.sellPrice);
    totalAmount += price * item.quantity;
    itemsWithNames.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price,
    });
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      distributorId,
      storeId,
      items: itemsWithNames,
      totalAmount: totalAmount.toString(),
      notes,
    })
    .returning();

  res.status(201).json(await getTaskFull(task.id));
});

router.put("/:id", requireRole("admin", "distributor"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const existing = await getTaskFull(id);
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "Task not found" });
    return;
  }

  if (req.session.role === "distributor" && req.session.distributorId !== existing.distributorId) {
    res.status(403).json({ error: "forbidden", message: "You can only update your own tasks" });
    return;
  }

  const { status, notes, failureReason } = req.body;
  const updates: Record<string, unknown> = {};

  if (status !== undefined) {
    if (req.session.role === "distributor" && !["in_progress", "failed"].includes(status)) {
      res.status(403).json({
        error: "forbidden",
        message: "Distributors can only mark tasks in progress or failed",
      });
      return;
    }

    updates.status = status;
    if (status === "completed" || status === "failed") {
      updates.completedAt = new Date();
    }
  }

  if (notes !== undefined) updates.notes = notes;
  if (failureReason !== undefined) updates.failureReason = failureReason;

  await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id));
  res.json(await getTaskFull(id));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "validation_error", message: "Invalid task id" });
    return;
  }

  const existing = await db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "not_found", message: "Task not found" });
    return;
  }

  const deliveries = await db
    .select({ id: deliveriesTable.id })
    .from(deliveriesTable)
    .where(eq(deliveriesTable.taskId, id))
    .limit(1);

  if (deliveries.length > 0) {
    res.status(409).json({
      error: "conflict",
      message: "This task has delivery records and cannot be deleted.",
    });
    return;
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.json({ message: "Task deleted" });
});

export default router;
