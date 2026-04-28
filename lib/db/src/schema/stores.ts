import { pgTable, serial, text, numeric, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storeGroupsTable } from "./store_groups";

export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  imageUrl: text("image_url"),
  debt: numeric("debt", { precision: 12, scale: 2 }).notNull().default("0"),
  totalVisits: integer("total_visits").notNull().default(0),
  lastVisit: timestamp("last_visit"),
  groupId: integer("group_id").references(() => storeGroupsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true, createdAt: true });
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
