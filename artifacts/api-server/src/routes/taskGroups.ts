import { Router } from "express";
import { db, taskGroupsTable, tasksTable, storesTable, distributorsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { requireRole } from "../middlewares/auth";

const router = Router();

// Helper to get full group with distributor name and store names
async function getGroupFull(group: typeof taskGroupsTable.$inferSelect) {
  const distResult = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(eq(distributorsTable.id, group.distributorId));

  const stores = group.storeIds.length > 0
    ? await db.select({ id: storesTable.id, name: storesTable.name, imageUrl: storesTable.imageUrl })
        .from(storesTable)
        .where(inArray(storesTable.id, group.storeIds))
    : [];

  const dist = distResult[0];

  return {
    ...group,
    distributorName: dist ? `${dist.firstName} ${dist.lastName}` : "غير معروف",
    stores,
  };
}

router.get("/", requireRole("admin"), async (_req, res) => {
  try {
    const groups = await db.select().from(taskGroupsTable).orderBy(taskGroupsTable.createdAt);
    const full = await Promise.all(groups.map(getGroupFull));
    res.json(full);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch task groups" });
  }
});

router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { name, distributorId, storeIds, daysOfWeek } = req.body;
    if (!name || !distributorId || !Array.isArray(storeIds) || storeIds.length === 0 || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const [taskGroup] = await db
      .insert(taskGroupsTable)
      .values({ name, distributorId, storeIds, daysOfWeek, recurrence: "weekly" })
      .returning();
    res.status(201).json(await getGroupFull(taskGroup));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create task group" });
  }
});

// Manually trigger task generation for a specific group
router.post("/:id/trigger", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const groups = await db.select().from(taskGroupsTable).where(eq(taskGroupsTable.id, id)).limit(1);
    const group = groups[0];
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (!group.storeIds || group.storeIds.length === 0) {
      res.status(400).json({ error: "Group has no stores" });
      return;
    }

    const tasksToInsert = group.storeIds.map((storeId) => ({
      distributorId: group.distributorId,
      storeId,
      items: [] as any[],
      status: "pending" as const,
      totalAmount: "0",
    }));

    await db.insert(tasksTable).values(tasksToInsert);
    res.json({ message: `تم توليد ${tasksToInsert.length} مهمة بنجاح` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to trigger task generation" });
  }
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, distributorId, storeIds, daysOfWeek } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (distributorId !== undefined) updates.distributorId = distributorId;
    if (storeIds !== undefined) updates.storeIds = storeIds;
    if (daysOfWeek !== undefined) updates.daysOfWeek = daysOfWeek;
    const [updated] = await db.update(taskGroupsTable).set(updates).where(eq(taskGroupsTable.id, id)).returning();
    res.json(await getGroupFull(updated));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update task group" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(taskGroupsTable).where(eq(taskGroupsTable.id, id));
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete task group" });
  }
});

export default router;
