import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const programmingDayStatusEnum = pgEnum("programming_day_status", ["draft", "published", "archived"]);

export const sectionTypeEnum = pgEnum("section_type", [
  "warmup",
  "strength",
  "conditioning",
  "skill",
  "cooldown",
  "wod",
  "accessory",
  "custom",
]);

export const programmingDaysTable = pgTable("programming_days", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  date: text("date").notNull(),
  title: text("title").notNull(),
  status: programmingDayStatusEnum("status").notNull().default("draft"),
  publicNotes: text("public_notes"),
  coachNotes: text("coach_notes"),
  track: text("track").default("default"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProgrammingDaySchema = createInsertSchema(programmingDaysTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProgrammingDay = z.infer<typeof insertProgrammingDaySchema>;
export type ProgrammingDay = typeof programmingDaysTable.$inferSelect;

export const programmingSectionsTable = pgTable("programming_sections", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").notNull().references(() => programmingDaysTable.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  sectionType: sectionTypeEnum("section_type").notNull().default("wod"),
  title: text("title").notNull(),
  instructions: text("instructions"),
  duration: text("duration"),
  timeCap: text("time_cap"),
  intendedStimulus: text("intended_stimulus"),
  movements: text("movements").array().notNull().default([]),
  scalingNotes: text("scaling_notes"),
  coachNotes: text("coach_notes"),
  memberNotes: text("member_notes"),
  resultTrackingEnabled: boolean("result_tracking_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProgrammingSectionSchema = createInsertSchema(programmingSectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProgrammingSection = z.infer<typeof insertProgrammingSectionSchema>;
export type ProgrammingSection = typeof programmingSectionsTable.$inferSelect;
