import { Router, type IRouter } from "express";
import { db, deliveriesTable, distributorsTable, storesTable, tasksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

async function getDeliveryFull(id: number) {
  const deliveries = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id));
  const delivery = deliveries[0];
  if (!delivery) return null;

  const distributorResult = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(eq(distributorsTable.id, delivery.distributorId));

  const stores = await db
    .select({ name: storesTable.name })
    .from(storesTable)
    .where(eq(storesTable.id, delivery.storeId));

  return {
    ...delivery,
    distributorName: distributorResult[0]
      ? `${distributorResult[0].firstName} ${distributorResult[0].lastName}`
      : "Unknown distributor",
    storeName: stores[0]?.name ?? "Unknown store",
    amountCollected: parseFloat(delivery.amountCollected as string),
  };
}

router.get("/", requireRole("admin", "distributor"), async (req, res) => {
  const { status } = req.query;
  const deliveries = status
    ? await db
        .select()
        .from(deliveriesTable)
        .where(eq(deliveriesTable.status, status as any))
        .orderBy(deliveriesTable.deliveredAt)
    : await db.select().from(deliveriesTable).orderBy(deliveriesTable.deliveredAt);

  const results = await Promise.all(deliveries.map((delivery) => getDeliveryFull(delivery.id)));
  const filtered = results.filter(Boolean).filter((delivery: any) => {
    if (req.session.role === "admin") return true;
    return delivery.distributorId === req.session.distributorId;
  });

  res.json(filtered);
});

router.post("/", requireRole("distributor"), async (req, res) => {
  const { taskId, photoUrl, latitude, longitude, amountCollected } = req.body;
  if (!taskId || latitude == null || longitude == null || amountCollected == null) {
    res.status(400).json({ error: "validation_error", message: "Missing required fields" });
    return;
  }

  try {
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
    const task = tasks[0];
    if (!task) {
      res.status(404).json({ error: "not_found", message: "Task not found" });
      return;
    }

    if (req.session.distributorId !== task.distributorId) {
      res.status(403).json({
        error: "forbidden",
        message: "You can only submit deliveries for your assigned tasks",
      });
      return;
    }

    const existingDelivery = await db.select().from(deliveriesTable).where(eq(deliveriesTable.taskId, taskId));
    if (existingDelivery.length > 0) {
      res.status(409).json({
        error: "conflict",
        message: "A delivery has already been submitted for this task",
      });
      return;
    }

    const [delivery] = await db
      .insert(deliveriesTable)
      .values({
        taskId,
        distributorId: task.distributorId,
        storeId: task.storeId,
        photoUrl,
        latitude,
        longitude,
        amountCollected: amountCollected.toString(),
      })
      .returning();

    await db
      .update(tasksTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    const stores = await db.select().from(storesTable).where(eq(storesTable.id, task.storeId));
    const store = stores[0];
    if (store) {
      const currentDebt = parseFloat(store.debt || "0");
      const taskAmount = parseFloat(task.totalAmount || "0");
      const collected = parseFloat(amountCollected.toString());
      const newDebt = Math.max(0, currentDebt + taskAmount - collected);

      await db
        .update(storesTable)
        .set({
          debt: newDebt.toString(),
          totalVisits: (store.totalVisits || 0) + 1,
          lastVisit: new Date(),
        })
        .where(eq(storesTable.id, task.storeId));
    }

    res.status(201).json(await getDeliveryFull(delivery.id));
  } catch (error) {
    console.error("Delivery Creation Error:", error);
    res.status(500).json({ error: "server_error", message: "Failed to process delivery" });
  }
});

router.put("/:id/confirm", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);

  try {
    const deliveries = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id));
    const delivery = deliveries[0];
    if (!delivery) {
      res.status(404).json({ error: "not_found", message: "Delivery not found" });
      return;
    }

    await db
      .update(deliveriesTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(deliveriesTable.id, id));

    const distributors = await db
      .select()
      .from(distributorsTable)
      .where(eq(distributorsTable.id, delivery.distributorId));
    const distributor = distributors[0];
    if (distributor) {
      const currentDebt = parseFloat(distributor.debt || "0");
      const collectedAmount = parseFloat(delivery.amountCollected || "0");

      await db
        .update(distributorsTable)
        .set({
          debt: (currentDebt + collectedAmount).toString(),
          totalTasksCompleted: (distributor.totalTasksCompleted || 0) + 1,
          totalAmountCollected: (
            parseFloat(distributor.totalAmountCollected || "0") + collectedAmount
          ).toString(),
        })
        .where(eq(distributorsTable.id, delivery.distributorId));
    }

    res.json(await getDeliveryFull(id));
  } catch (error) {
    console.error("Delivery Confirmation Error:", error);
    res.status(500).json({ error: "server_error", message: "Failed to confirm delivery" });
  }
});

router.put("/:id/reject", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const { reason } = req.body;

  await db
    .update(deliveriesTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(deliveriesTable.id, id));

  const delivery = await getDeliveryFull(id);
  if (!delivery) {
    res.status(404).json({ error: "not_found", message: "Delivery not found" });
    return;
  }

  res.json(delivery);
});

export default router;
