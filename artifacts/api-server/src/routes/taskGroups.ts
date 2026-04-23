import { Router } from "express";
import { db, taskGroupsTable, insertTaskGroupSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const taskGroups = await db.query.taskGroupsTable.findMany({
      with: {
        distributor: true,
      },
    });
    res.json(taskGroups);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch task groups" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = insertTaskGroupSchema.parse(req.body);
    const [taskGroup] = await db.insert(taskGroupsTable).values(payload).returning();
    res.status(201).json(taskGroup);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else {
      res.status(500).json({ error: "Failed to create task group" });
    }
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payload = insertTaskGroupSchema.partial().parse(req.body);
    const [updated] = await db.update(taskGroupsTable).set(payload).where(eq(taskGroupsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task group" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(taskGroupsTable).where(eq(taskGroupsTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task group" });
  }
});

export default router;
