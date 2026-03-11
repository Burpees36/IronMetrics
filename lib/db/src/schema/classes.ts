import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  coachId: integer("coach_id"),
  coachName: text("coach_name"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull().default(20),
  enrolled: integer("enrolled").notNull().default(0),
  type: text("type").notNull().default("regular"),
  status: text("status").notNull().default("scheduled"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringDays: integer("recurring_days").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type GymClass = typeof classesTable.$inferSelect;
