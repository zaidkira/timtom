import { Router, type IRouter } from "express";
import { db, distributorsTable, storeSuggestionsTable, storesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

async function getSuggestionFull(id: number) {
  const suggestions = await db.select().from(storeSuggestionsTable).where(eq(storeSuggestionsTable.id, id));
  const suggestion = suggestions[0];
  if (!suggestion) return null;

  const distributorResult = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(distributorsTable)
    .innerJoin(usersTable, eq(distributorsTable.userId, usersTable.id))
    .where(eq(distributorsTable.id, suggestion.distributorId));

  return {
    ...suggestion,
    distributorName: distributorResult[0]
      ? `${distributorResult[0].firstName} ${distributorResult[0].lastName}`
      : "Unknown distributor",
  };
}

router.get("/", requireRole("admin", "distributor"), async (req, res) => {
  const suggestions = await db.select().from(storeSuggestionsTable).orderBy(storeSuggestionsTable.createdAt);
  const results = await Promise.all(suggestions.map((suggestion) => getSuggestionFull(suggestion.id)));
  const filtered = results.filter(Boolean).filter((suggestion: any) => {
    if (req.session.role === "admin") return true;
    return suggestion.distributorId === req.session.distributorId;
  });

  res.json(filtered);
});

router.post("/", requireRole("distributor"), async (req, res) => {
  const { name, ownerName, phone, address, photoUrl, latitude, longitude } = req.body;
  const distributorId = req.session.distributorId;

  if (!name || !phone || latitude == null || longitude == null || !distributorId) {
    res.status(400).json({ error: "validation_error", message: "Missing required fields" });
    return;
  }

  const [suggestion] = await db
    .insert(storeSuggestionsTable)
    .values({
      distributorId,
      name,
      ownerName,
      phone,
      address,
      photoUrl,
      latitude,
      longitude,
    })
    .returning();

  res.status(201).json(await getSuggestionFull(suggestion.id));
});

router.put("/:id/approve", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const suggestions = await db.select().from(storeSuggestionsTable).where(eq(storeSuggestionsTable.id, id));
  const suggestion = suggestions[0];

  if (!suggestion) {
    res.status(404).json({ error: "not_found", message: "Suggestion not found" });
    return;
  }

  await db.insert(storesTable).values({
    name: suggestion.name,
    ownerName: suggestion.ownerName ?? "Unknown owner",
    phone: suggestion.phone ?? "N/A",
    address: suggestion.address,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  });

  await db.update(storeSuggestionsTable).set({ status: "approved" }).where(eq(storeSuggestionsTable.id, id));
  res.json(await getSuggestionFull(id));
});

router.put("/:id/reject", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  await db.update(storeSuggestionsTable).set({ status: "rejected" }).where(eq(storeSuggestionsTable.id, id));
  const suggestion = await getSuggestionFull(id);

  if (!suggestion) {
    res.status(404).json({ error: "not_found", message: "Suggestion not found" });
    return;
  }

  res.json(suggestion);
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  await db.delete(storeSuggestionsTable).where(eq(storeSuggestionsTable.id, id));
  res.json({ message: "Suggestion deleted" });
});

export default router;
