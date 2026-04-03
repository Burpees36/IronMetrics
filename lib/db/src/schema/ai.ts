import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const aiTasksTable = pgTable("ai_tasks", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  targetId: integer("target_id"),
  targetType: text("target_type"),
  aiContent: text("ai_content"),
  subject: text("subject"),
  personalizationMeta: text("personalization_meta"),
  outcome: text("outcome").default("none"),
  outcomeDetectedAt: timestamp("outcome_detected_at", { withTimezone: true }),
  revenueImpact: numeric("revenue_impact", { precision: 10, scale: 2 }),
  actionedAt: timestamp("actioned_at", { withTimezone: true }),
  autoSent: boolean("auto_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiTaskSchema = createInsertSchema(aiTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiTask = z.infer<typeof insertAiTaskSchema>;
export type AiTask = typeof aiTasksTable.$inferSelect;

export const aiGeneratedContentTable = pgTable("ai_generated_content", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  subject: text("subject"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("0.8"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(true),
  contextSummary: text("context_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiGeneratedContentSchema = createInsertSchema(aiGeneratedContentTable).omit({ id: true, createdAt: true });
export type InsertAiGeneratedContent = z.infer<typeof insertAiGeneratedContentSchema>;
export type AiGeneratedContent = typeof aiGeneratedContentTable.$inferSelect;

export const aiOperatorSettingsTable = pgTable("ai_operator_settings", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id).unique(),
  autopilotOutreach: boolean("autopilot_outreach").notNull().default(false),
  autopilotBilling: boolean("autopilot_billing").notNull().default(false),
  autopilotLeads: boolean("autopilot_leads").notNull().default(false),
  cooldownDays: integer("cooldown_days").notNull().default(14),
  digestFrequency: text("digest_frequency").notNull().default("daily"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiOperatorSettingsSchema = createInsertSchema(aiOperatorSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiOperatorSettings = z.infer<typeof insertAiOperatorSettingsSchema>;
export type AiOperatorSettings = typeof aiOperatorSettingsTable.$inferSelect;
