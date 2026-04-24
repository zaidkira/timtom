import { Router, type IRouter } from "express";
import { db, deliveriesTable, storesTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireRole("admin", "distributor"), async (_req, res) => {
  const stores = await db.select().from(storesTable).orderBy(storesTable.name);
  res.json(stores.map((store) => ({ ...store, debt: parseFloat(store.debt) })));
});

router.get("/:id", requireRole("admin", "distributor"), async (req, res) => {
  const stores = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.id, Number.parseInt(String(req.params.id), 10)));
  const store = stores[0];
  if (!store) {
    res.status(404).json({ error: "not_found", message: "Store not found" });
    return;
  }

  res.json({ ...store, debt: parseFloat(store.debt) });
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { name, ownerName, phone, latitude, longitude, address, imageUrl } = req.body;
  if (!name || !ownerName || !phone || latitude == null || longitude == null) {
    res.status(400).json({ error: "validation_error", message: "Missing required fields" });
    return;
  }

  const [store] = await db
    .insert(storesTable)
    .values({ name, ownerName, phone, latitude, longitude, address, imageUrl })
    .returning();

  res.status(201).json({ ...store, debt: parseFloat(store.debt) });
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const { name, ownerName, phone, latitude, longitude, address, imageUrl } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (ownerName !== undefined) updates.ownerName = ownerName;
  if (phone !== undefined) updates.phone = phone;
  if (latitude !== undefined) updates.latitude = latitude;
  if (longitude !== undefined) updates.longitude = longitude;
  if (address !== undefined) updates.address = address;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;

  const [store] = await db.update(storesTable).set(updates).where(eq(storesTable.id, id)).returning();
  if (!store) {
    res.status(404).json({ error: "not_found", message: "Store not found" });
    return;
  }

  res.json({ ...store, debt: parseFloat(store.debt) });
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const [tasks, deliveries] = await Promise.all([
    db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.storeId, id)).limit(1),
    db.select({ id: deliveriesTable.id }).from(deliveriesTable).where(eq(deliveriesTable.storeId, id)).limit(1),
  ]);

  if (tasks.length > 0 || deliveries.length > 0) {
    res.status(409).json({
      error: "conflict",
      message: "This store has task or delivery history and cannot be deleted.",
    });
    return;
  }

  await db.delete(storesTable).where(eq(storesTable.id, id));
  res.json({ message: "Store deleted" });
});

export default router;
