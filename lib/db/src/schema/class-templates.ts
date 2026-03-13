import { pgTable, text, serial, timestamp, integer, time } from "drizzle-orm/pg-core";
import { gymsTable } from "./gyms";

export const classTemplatesTable = pgTable("class_templates", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by"),
  totalClasses: integer("total_classes").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const classTemplateItemsTable = pgTable("class_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => classTemplatesTable.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  className: text("class_name").notNull(),
  type: text("type").notNull().default("regular"),
  capacity: integer("capacity").notNull().default(20),
  coachId: integer("coach_id"),
  coachName: text("coach_name"),
  description: text("description"),
});

export type ClassTemplate = typeof classTemplatesTable.$inferSelect;
export type ClassTemplateItem = typeof classTemplateItemsTable.$inferSelect;
