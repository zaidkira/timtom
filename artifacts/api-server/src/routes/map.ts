import { Router, type IRouter } from "express";
import { db, distributorsTable, storesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/locations", requireRole("admin", "distributor"), async (_req, res) => {
  const stores = await db
    .select({
      id: storesTable.id,
      name: storesTable.name,
      latitude: storesTable.latitude,
      longitude: storesTable.longitude,
      debt: storesTable.debt,
      lastVisit: storesTable.lastVisit,
    })
    .from(storesTable);

  const distributors = await db
    .select({
      id: distributorsTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      latitude: distributorsTable.latitude,
      longitude: distributorsTable.longitude,
      isActive: usersTable.isActive,
      lastSeen: distributorsTable.lastSeen,
    })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id));

  res.json({
    stores: stores.map((store) => ({ ...store, debt: parseFloat(store.debt) })),
    distributors: distributors.map((distributor) => ({
      id: distributor.id,
      name: `${distributor.firstName} ${distributor.lastName}`,
      latitude: distributor.latitude,
      longitude: distributor.longitude,
      isActive: distributor.isActive,
      lastSeen: distributor.lastSeen,
    })),
  });
});

export default router;
