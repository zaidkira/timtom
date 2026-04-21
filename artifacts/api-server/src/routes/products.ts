import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireRole("admin", "distributor"), async (_req, res) => {
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  res.json(
    products.map((product) => ({
      ...product,
      purchasePrice: parseFloat(product.purchasePrice),
      sellPrice: parseFloat(product.sellPrice),
      isLowStock: product.quantity <= product.lowStockThreshold,
    })),
  );
});

router.get("/:id", requireRole("admin", "distributor"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const products = await db.select().from(productsTable).where(eq(productsTable.id, id));
  const product = products[0];
  if (!product) {
    res.status(404).json({ error: "not_found", message: "Product not found" });
    return;
  }

  res.json({
    ...product,
    purchasePrice: parseFloat(product.purchasePrice),
    sellPrice: parseFloat(product.sellPrice),
    isLowStock: product.quantity <= product.lowStockThreshold,
  });
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { name, purchasePrice, sellPrice, quantity, lowStockThreshold } = req.body;
  if (!name || purchasePrice == null || sellPrice == null || quantity == null) {
    res.status(400).json({ error: "validation_error", message: "Missing required fields" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      name,
      purchasePrice: purchasePrice.toString(),
      sellPrice: sellPrice.toString(),
      quantity,
      lowStockThreshold: lowStockThreshold ?? 10,
    })
    .returning();

  res.status(201).json({
    ...product,
    purchasePrice: parseFloat(product.purchasePrice),
    sellPrice: parseFloat(product.sellPrice),
    isLowStock: product.quantity <= product.lowStockThreshold,
  });
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const { name, purchasePrice, sellPrice, quantity, lowStockThreshold } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (purchasePrice !== undefined) updates.purchasePrice = purchasePrice.toString();
  if (sellPrice !== undefined) updates.sellPrice = sellPrice.toString();
  if (quantity !== undefined) updates.quantity = quantity;
  if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;

  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "not_found", message: "Product not found" });
    return;
  }

  res.json({
    ...product,
    purchasePrice: parseFloat(product.purchasePrice),
    sellPrice: parseFloat(product.sellPrice),
    isLowStock: product.quantity <= product.lowStockThreshold,
  });
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  await db.delete(productsTable).where(eq(productsTable.id, Number.parseInt(String(req.params.id), 10)));
  res.json({ message: "Product deleted" });
});

export default router;
