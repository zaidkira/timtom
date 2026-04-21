import { Router, type IRouter } from "express";
import { db, deliveriesTable, distributorsTable, settlementsTable, tasksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";
import { hashPassword } from "./auth";

const router: IRouter = Router();

async function getDistributorFull(distId: number) {
  const result = await db
    .select({
      id: distributorsTable.id,
      userId: distributorsTable.userId,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      phone: usersTable.phone,
      username: usersTable.username,
      isActive: usersTable.isActive,
      latitude: distributorsTable.latitude,
      longitude: distributorsTable.longitude,
      lastSeen: distributorsTable.lastSeen,
      totalTasksCompleted: distributorsTable.totalTasksCompleted,
      totalAmountCollected: distributorsTable.totalAmountCollected,
      debt: distributorsTable.debt,
      createdAt: distributorsTable.createdAt,
    })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(eq(distributorsTable.id, distId));

  const distributor = result[0];
  if (!distributor) return null;

  return {
    ...distributor,
    totalAmountCollected: parseFloat(distributor.totalAmountCollected as string),
    debt: parseFloat(distributor.debt as string),
  };
}

router.get("/", requireRole("admin"), async (_req, res) => {
  const result = await db
    .select({
      id: distributorsTable.id,
      userId: distributorsTable.userId,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      phone: usersTable.phone,
      username: usersTable.username,
      isActive: usersTable.isActive,
      latitude: distributorsTable.latitude,
      longitude: distributorsTable.longitude,
      lastSeen: distributorsTable.lastSeen,
      totalTasksCompleted: distributorsTable.totalTasksCompleted,
      totalAmountCollected: distributorsTable.totalAmountCollected,
      debt: distributorsTable.debt,
      createdAt: distributorsTable.createdAt,
    })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .orderBy(usersTable.firstName);

  res.json(
    result.map((distributor) => ({
      ...distributor,
      totalAmountCollected: parseFloat(distributor.totalAmountCollected as string),
      debt: parseFloat(distributor.debt as string),
    })),
  );
});

router.get("/:id", requireRole("admin"), async (req, res) => {
  const distributor = await getDistributorFull(Number.parseInt(String(req.params.id), 10));
  if (!distributor) {
    res.status(404).json({ error: "not_found", message: "Distributor not found" });
    return;
  }

  res.json(distributor);
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { firstName, lastName, phone, username, password } = req.body;
  if (!firstName || !lastName || !phone || !username || !password) {
    res.status(400).json({ error: "validation_error", message: "Missing required fields" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      firstName,
      lastName,
      phone,
      username,
      password: hashPassword(password),
      role: "distributor",
    })
    .returning();

  const [distributor] = await db.insert(distributorsTable).values({ userId: user.id }).returning();
  res.status(201).json(await getDistributorFull(distributor.id));
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const distributors = await db.select().from(distributorsTable).where(eq(distributorsTable.id, id));
  const distributor = distributors[0];
  if (!distributor) {
    res.status(404).json({ error: "not_found", message: "Distributor not found" });
    return;
  }

  const { firstName, lastName, phone, isActive, password } = req.body;
  const userUpdates: Record<string, unknown> = {};
  if (firstName !== undefined) userUpdates.firstName = firstName;
  if (lastName !== undefined) userUpdates.lastName = lastName;
  if (phone !== undefined) userUpdates.phone = phone;
  if (isActive !== undefined) userUpdates.isActive = isActive;
  if (password !== undefined) userUpdates.password = hashPassword(password);

  if (Object.keys(userUpdates).length > 0) {
    await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, distributor.userId));
  }

  res.json(await getDistributorFull(id));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const distributors = await db.select().from(distributorsTable).where(eq(distributorsTable.id, id));
  const distributor = distributors[0];
  if (!distributor) {
    res.status(404).json({ error: "not_found", message: "Distributor not found" });
    return;
  }

  const [tasks, deliveries, settlements] = await Promise.all([
    db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.distributorId, id)).limit(1),
    db.select({ id: deliveriesTable.id }).from(deliveriesTable).where(eq(deliveriesTable.distributorId, id)).limit(1),
    db.select({ id: settlementsTable.id }).from(settlementsTable).where(eq(settlementsTable.distributorId, id)).limit(1),
  ]);

  if (tasks.length > 0 || deliveries.length > 0 || settlements.length > 0) {
    await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, distributor.userId));
    res.json({ message: "Distributor has history, so the account was deactivated instead of deleted." });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, distributor.userId));
  res.json({ message: "Distributor deleted" });
});

router.put("/:id/location", requireRole("admin", "distributor"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const { latitude, longitude } = req.body;

  if (req.session.role === "distributor" && req.session.distributorId !== id) {
    res.status(403).json({ error: "forbidden", message: "You can only update your own location" });
    return;
  }

  await db
    .update(distributorsTable)
    .set({ latitude, longitude, lastSeen: new Date() })
    .where(eq(distributorsTable.id, id));

  res.json({ message: "Location updated" });
});

export default router;
