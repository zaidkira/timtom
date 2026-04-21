import { Router, type IRouter } from "express";
import {
  db,
  deliveriesTable,
  distributorsTable,
  productsTable,
  storesTable,
  tasksTable,
  usersTable,
} from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stats", requireRole("admin"), async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const calcProfit = async (since: Date) => {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.status, "completed"), gte(tasksTable.completedAt!, since)));

    let revenue = 0;
    for (const task of tasks) {
      revenue += parseFloat(task.totalAmount as string);
    }

    return revenue * 0.3;
  };

  const [todayProfit, weekProfit, monthProfit] = await Promise.all([
    calcProfit(todayStart),
    calcProfit(weekStart),
    calcProfit(monthStart),
  ]);

  const [allTasks, pendingTasks, completedTasks] = await Promise.all([
    db.select({ id: tasksTable.id }).from(tasksTable),
    db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.status, "pending")),
    db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.status, "completed")),
  ]);

  const products = await db.select().from(productsTable);
  const lowStockProducts = products.filter(
    (product) => product.quantity <= product.lowStockThreshold,
  ).length;

  const stores = await db.select().from(storesTable);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const unvisitedStores = stores.filter((store) => !store.lastVisit || store.lastVisit < thirtyDaysAgo).length;
  const unpaidDebts = stores.reduce((sum, store) => sum + parseFloat(store.debt), 0);

  const pendingDeliveries = await db
    .select({ id: deliveriesTable.id })
    .from(deliveriesTable)
    .where(eq(deliveriesTable.status, "pending_admin"));

  const activeDistributors = await db
    .select({ id: distributorsTable.id })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(eq(usersTable.isActive, true));

  res.json({
    todayProfit,
    weekProfit,
    monthProfit,
    totalTasks: allTasks.length,
    pendingTasks: pendingTasks.length,
    completedTasks: completedTasks.length,
    lowStockProducts,
    unvisitedStores,
    unpaidDebts,
    pendingDeliveries: pendingDeliveries.length,
    activeDistributors: activeDistributors.length,
    totalStores: stores.length,
  });
});

export default router;
