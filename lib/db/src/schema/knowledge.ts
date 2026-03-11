import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const knowledgeSourcesTable = pgTable("knowledge_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull().default("youtube_channel"),
  lastIngestedAt: timestamp("last_ingested_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKnowledgeSourceSchema = createInsertSchema(knowledgeSourcesTable).omit({ id: true, createdAt: true, lastIngestedAt: true });
export type InsertKnowledgeSource = z.infer<typeof insertKnowledgeSourceSchema>;
export type KnowledgeSource = typeof knowledgeSourcesTable.$inferSelect;

export const knowledgeDocumentsTable = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => knowledgeSourcesTable.id),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  channelName: text("channel_name"),
  durationSeconds: integer("duration_seconds"),
  rawTranscript: text("raw_transcript"),
  status: text("status").notNull().default("pending"),
  chunkCount: integer("chunk_count").notNull().default(0),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocumentsTable).omit({ id: true, createdAt: true });
export type InsertKnowledgeDocument = z.infer<typeof insertKnowledgeDocumentSchema>;
export type KnowledgeDocument = typeof knowledgeDocumentsTable.$inferSelect;

export const knowledgeChunksTable = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeDocumentsTable.id),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  taxonomy: jsonb("taxonomy").notNull().default([]),
  tokenCount: integer("token_count").notNull().default(0),
  embedding: text("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunksTable).omit({ id: true, createdAt: true });
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunksTable.$inferSelect;

export const knowledgeIngestJobsTable = pgTable("knowledge_ingest_jobs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => knowledgeSourcesTable.id),
  status: text("status").notNull().default("pending"),
  videosFound: integer("videos_found").notNull().default(0),
  videosProcessed: integer("videos_processed").notNull().default(0),
  chunksCreated: integer("chunks_created").notNull().default(0),
  errorDetails: text("error_details"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const insertKnowledgeIngestJobSchema = createInsertSchema(knowledgeIngestJobsTable).omit({ id: true, startedAt: true });
export type InsertKnowledgeIngestJob = z.infer<typeof insertKnowledgeIngestJobSchema>;
export type KnowledgeIngestJob = typeof knowledgeIngestJobsTable.$inferSelect;

export const recommendationChunkAuditTable = pgTable("recommendation_chunk_audit", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  periodStart: text("period_start").notNull(),
  recommendationType: text("recommendation_type").notNull(),
  chunkId: integer("chunk_id").notNull().references(() => knowledgeChunksTable.id),
  similarityScore: numeric("similarity_score", { precision: 5, scale: 4 }),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecommendationChunkAuditSchema = createInsertSchema(recommendationChunkAuditTable).omit({ id: true, usedAt: true });
export type InsertRecommendationChunkAudit = z.infer<typeof insertRecommendationChunkAuditSchema>;
export type RecommendationChunkAudit = typeof recommendationChunkAuditTable.$inferSelect;

export const TAXONOMY_TAGS = [
  "retention", "onboarding", "pricing", "community", "coaching",
  "sales", "marketing", "leadership", "operations", "programming",
  "culture", "growth", "member-experience", "staffing", "facility",
  "financial", "churn", "referral", "goal-setting", "accountability",
] as const;
