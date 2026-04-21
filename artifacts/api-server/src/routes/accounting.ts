import { Router, type IRouter } from "express";
import {
  db,
  deliveriesTable,
  distributorsTable,
  settlementsTable,
  storesTable,
  tasksTable,
  usersTable,
} from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/summary", requireRole("admin"), async (req, res) => {
  const { period = "month" } = req.query;
  const now = new Date();
  let startDate: Date;

  if (period === "day") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const completedTasks = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.status, "completed"), gte(tasksTable.completedAt!, startDate)));

  let totalRevenue = 0;
  let totalCost = 0;

  for (const task of completedTasks) {
    const items = task.items as Array<{ quantity: number; price: number }>;
    for (const item of items) {
      totalRevenue += item.price * item.quantity;
    }
    totalCost += parseFloat(task.totalAmount as string) * 0.7;
  }

  const storeDebts = await db.select({ debt: storesTable.debt }).from(storesTable);
  const totalStoreDebts = storeDebts.reduce((sum, store) => sum + parseFloat(store.debt), 0);

  const distributorDebts = await db.select({ debt: distributorsTable.debt }).from(distributorsTable);
  const totalDistributorDebts = distributorDebts.reduce(
    (sum, distributor) => sum + parseFloat(distributor.debt),
    0,
  );

  const allTasks = await db.select({ id: tasksTable.id }).from(tasksTable);
  const deliveries = await db.select({ id: deliveriesTable.id }).from(deliveriesTable);

  res.json({
    period,
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    totalStoreDebts,
    totalDistributorDebts,
    totalDeliveries: deliveries.length,
    totalTasks: allTasks.length,
  });
});

router.get("/debts/stores", requireRole("admin"), async (_req, res) => {
  const stores = await db.select().from(storesTable).where(sql`${storesTable.debt}::numeric > 0`);
  res.json(
    stores.map((store) => ({
      storeId: store.id,
      storeName: store.name,
      ownerName: store.ownerName,
      phone: store.phone,
      debt: parseFloat(store.debt),
      lastVisit: store.lastVisit,
    })),
  );
});

router.get("/debts/distributors", requireRole("admin"), async (_req, res) => {
  const result = await db
    .select({
      id: distributorsTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      phone: usersTable.phone,
      debt: distributorsTable.debt,
      totalAmountCollected: distributorsTable.totalAmountCollected,
    })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(sql`${distributorsTable.debt}::numeric > 0`);

  res.json(
    result.map((distributor) => ({
      distributorId: distributor.id,
      distributorName: `${distributor.firstName} ${distributor.lastName}`,
      phone: distributor.phone ?? "",
      debt: parseFloat(distributor.debt),
      totalCollected: parseFloat(distributor.totalAmountCollected as string),
      totalSettled:
        parseFloat(distributor.totalAmountCollected as string) - parseFloat(distributor.debt),
    })),
  );
});

router.post("/settle/:distributorId", requireRole("admin"), async (req, res) => {
  const distributorId = Number.parseInt(String(req.params.distributorId), 10);
  const amount = Number(req.body.amount);
  const { notes } = req.body;

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "validation_error", message: "A valid amount is required" });
    return;
  }

  const distributors = await db
    .select({ debt: distributorsTable.debt })
    .from(distributorsTable)
    .where(eq(distributorsTable.id, distributorId));

  if (distributors.length === 0) {
    res.status(404).json({ error: "not_found", message: "Distributor not found" });
    return;
  }

  const currentDebt = parseFloat(distributors[0]?.debt ?? "0");
  const newDebt = Math.max(0, currentDebt - amount);

  await db.insert(settlementsTable).values({ distributorId, amount: amount.toString(), notes });

  await db
    .update(distributorsTable)
    .set({ debt: newDebt.toString() })
    .where(eq(distributorsTable.id, distributorId));

  res.json({ message: "Account settled", remainingDebt: newDebt });
});

export default router;
