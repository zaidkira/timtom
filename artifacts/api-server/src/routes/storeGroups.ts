import { Router, type IRouter } from "express";
import { db, storeGroupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res, next) => {
  try {
    const groups = await db.select().from(storeGroupsTable);
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Validation Error", message: "Name is required" });
      return;
    }

    const [group] = await db.insert(storeGroupsTable).values({ name }).returning();
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: "Validation Error", message: "Invalid ID" });
      return;
    }

    if (!name) {
      res.status(400).json({ error: "Validation Error", message: "Name is required" });
      return;
    }

    const [group] = await db
      .update(storeGroupsTable)
      .set({ name })
      .where(eq(storeGroupsTable.id, id))
      .returning();

    if (!group) {
      res.status(404).json({ error: "Not Found", message: "Store group not found" });
      return;
    }

    res.json(group);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Validation Error", message: "Invalid ID" });
      return;
    }

    await db.delete(storeGroupsTable).where(eq(storeGroupsTable.id, id));
    res.json({ message: "Store group deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
