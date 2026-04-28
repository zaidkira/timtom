import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storeGroupsTable = pgTable("store_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStoreGroupSchema = createInsertSchema(storeGroupsTable).omit({ id: true, createdAt: true });
export type InsertStoreGroup = z.infer<typeof insertStoreGroupSchema>;
export type StoreGroup = typeof storeGroupsTable.$inferSelect;
