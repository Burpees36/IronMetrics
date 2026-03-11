import { pgTable, text, serial, timestamp, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const recommendationCardsTable = pgTable("recommendation_cards", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  periodStart: text("period_start").notNull(),
  recommendationType: text("recommendation_type").notNull(),
  headline: text("headline").notNull(),
  checklistItems: jsonb("checklist_items").notNull().default([]),
  baselineForecast: jsonb("baseline_forecast"),
  executionStrengthThreshold: numeric("execution_strength_threshold", { precision: 3, scale: 2 }).notNull().default("0.60"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecommendationCardSchema = createInsertSchema(recommendationCardsTable).omit({ id: true, generatedAt: true });
export type InsertRecommendationCard = z.infer<typeof insertRecommendationCardSchema>;
export type RecommendationCard = typeof recommendationCardsTable.$inferSelect;

export const checklistItemCompletionsTable = pgTable("checklist_item_completions", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull().references(() => recommendationCardsTable.id),
  itemId: text("item_id").notNull(),
  checked: boolean("checked").notNull().default(false),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

export const insertChecklistItemCompletionSchema = createInsertSchema(checklistItemCompletionsTable).omit({ id: true });
export type InsertChecklistItemCompletion = z.infer<typeof insertChecklistItemCompletionSchema>;
export type ChecklistItemCompletion = typeof checklistItemCompletionsTable.$inferSelect;

export const recommendationLearningStatsTable = pgTable("recommendation_learning_stats", {
  id: serial("id").primaryKey(),
  recommendationType: text("recommendation_type").notNull(),
  gymId: integer("gym_id").references(() => gymsTable.id),
  expectedImpact: numeric("expected_impact", { precision: 10, scale: 4 }).notNull().default("0"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0.10"),
  sampleSize: integer("sample_size").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecommendationLearningStatSchema = createInsertSchema(recommendationLearningStatsTable).omit({ id: true, updatedAt: true });
export type InsertRecommendationLearningStat = z.infer<typeof insertRecommendationLearningStatSchema>;
export type RecommendationLearningStat = typeof recommendationLearningStatsTable.$inferSelect;

export const recommendationLearningEventsTable = pgTable("recommendation_learning_events", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  recommendationType: text("recommendation_type").notNull(),
  periodStart: text("period_start").notNull(),
  executionStrength: numeric("execution_strength", { precision: 5, scale: 4 }).notNull(),
  impactScore: numeric("impact_score", { precision: 10, scale: 4 }).notNull(),
  outcomeMetrics: jsonb("outcome_metrics"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecommendationLearningEventSchema = createInsertSchema(recommendationLearningEventsTable).omit({ id: true, createdAt: true });
export type InsertRecommendationLearningEvent = z.infer<typeof insertRecommendationLearningEventSchema>;
export type RecommendationLearningEvent = typeof recommendationLearningEventsTable.$inferSelect;

export const outcomeSnapshotsTable = pgTable("outcome_snapshots", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  periodStart: text("period_start").notNull(),
  activeMembers: integer("active_members").notNull().default(0),
  mrr: numeric("mrr", { precision: 10, scale: 2 }).notNull().default("0"),
  churnRate: numeric("churn_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutcomeSnapshotSchema = createInsertSchema(outcomeSnapshotsTable).omit({ id: true, snapshotAt: true });
export type InsertOutcomeSnapshot = z.infer<typeof insertOutcomeSnapshotSchema>;
export type OutcomeSnapshot = typeof outcomeSnapshotsTable.$inferSelect;

export const ownerAdditionalActionsTable = pgTable("owner_additional_actions", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  periodStart: text("period_start").notNull(),
  text: text("text").notNull(),
  classifiedType: text("classified_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOwnerAdditionalActionSchema = createInsertSchema(ownerAdditionalActionsTable).omit({ id: true, createdAt: true });
export type InsertOwnerAdditionalAction = z.infer<typeof insertOwnerAdditionalActionSchema>;
export type OwnerAdditionalAction = typeof ownerAdditionalActionsTable.$inferSelect;
