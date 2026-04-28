import { Router } from "express";
import { db } from "@workspace/db";
import { storeGroupsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const storeGroupsRouter = Router();

storeGroupsRouter.get("/", async (req, res, next) => {
  try {
    const groups = await db.query.storeGroupsTable.findMany();
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

storeGroupsRouter.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Validation Error", message: "Name is required" });
    }

    const [group] = await db.insert(storeGroupsTable).values({ name }).returning();
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

storeGroupsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Validation Error", message: "Invalid ID" });
    }

    if (!name) {
      return res.status(400).json({ error: "Validation Error", message: "Name is required" });
    }

    const [group] = await db
      .update(storeGroupsTable)
      .set({ name })
      .where(eq(storeGroupsTable.id, id))
      .returning();

    if (!group) {
      return res.status(404).json({ error: "Not Found", message: "Store group not found" });
    }

    res.json(group);
  } catch (error) {
    next(error);
  }
});

storeGroupsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Validation Error", message: "Invalid ID" });
    }

    await db.delete(storeGroupsTable).where(eq(storeGroupsTable.id, id));
    res.json({ message: "Store group deleted successfully" });
  } catch (error) {
    next(error);
  }
});
