import { pgTable, text, serial, timestamp, integer, boolean, pgEnum, date, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export interface ValidationMetaViolation {
  type: string;
  severity: "error" | "warning";
  message: string;
}

export interface ValidationMeta {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  retryCount: number;
  violations: ValidationMetaViolation[];
}

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
  date: date("date", { mode: "string" }).notNull(),
  title: text("title").notNull(),
  status: programmingDayStatusEnum("status").notNull().default("draft"),
  publicNotes: text("public_notes"),
  coachNotes: text("coach_notes"),
  track: text("track").default("default"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  validationMeta: jsonb("validation_meta").$type<ValidationMeta>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_programming_days_gym").on(table.gymId),
  index("idx_programming_days_gym_date").on(table.gymId, table.date),
]);

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

export const programmingPreferencesTable = pgTable("programming_preferences", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id).unique(),
  methodology: text("methodology").notNull().default("crossfit"),
  structureTemplate: jsonb("structure_template").notNull().default([
    "warmup", "strength", "conditioning", "cooldown"
  ]),
  equipment: text("equipment").array().notNull().default([]),
  constraints: text("constraints"),
  defaultTimeDomains: jsonb("default_time_domains").notNull().default({
    warmup: "10-15 min",
    strength: "15-20 min",
    conditioning: "8-20 min",
    cooldown: "5-10 min"
  }),
  autoPublishEnabled: boolean("auto_publish_enabled").notNull().default(false),
  autoPublishTime: text("auto_publish_time").default("20:00"),
  autoPublishLeadDays: integer("auto_publish_lead_days").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProgrammingPreferencesSchema = createInsertSchema(programmingPreferencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProgrammingPreferences = z.infer<typeof insertProgrammingPreferencesSchema>;
export type ProgrammingPreferences = typeof programmingPreferencesTable.$inferSelect;
