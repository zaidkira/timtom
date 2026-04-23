import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { distributorsTable } from "./distributors";

export const taskGroupsTable = pgTable("task_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  distributorId: integer("distributor_id").notNull().references(() => distributorsTable.id),
  storeIds: integer("store_ids").array().notNull(),
  recurrence: text("recurrence", { enum: ["none", "weekly"] }).notNull().default("none"),
  dayOfWeek: integer("day_of_week"), // 0 = Sunday, 1 = Monday, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskGroupSchema = createInsertSchema(taskGroupsTable).omit({ id: true, createdAt: true });
export type InsertTaskGroup = z.infer<typeof insertTaskGroupSchema>;
export type TaskGroup = typeof taskGroupsTable.$inferSelect;
