import { pgTable, text, serial, timestamp, integer, boolean, index, jsonb, numeric, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";
import { membersTable } from "./members";

export const rsiSnapshotsTable = pgTable("rsi_snapshots", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  score: numeric("score", { precision: 5, scale: 1 }).notNull(),
  band: text("band").notNull(),
  churnNorm: numeric("churn_norm", { precision: 5, scale: 1 }),
  revNorm: numeric("rev_norm", { precision: 5, scale: 1 }),
  growthNorm: numeric("growth_norm", { precision: 5, scale: 1 }),
  tenureNorm: numeric("tenure_norm", { precision: 5, scale: 1 }),
  recordedAt: date("recorded_at", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_rsi_snapshots_gym_date").on(table.gymId, table.recordedAt),
  uniqueIndex("idx_rsi_snapshots_gym_date_unique").on(table.gymId, table.recordedAt),
]);

export const insertRsiSnapshotSchema = createInsertSchema(rsiSnapshotsTable).omit({ id: true, createdAt: true });
export type InsertRsiSnapshot = z.infer<typeof insertRsiSnapshotSchema>;
export type RsiSnapshot = typeof rsiSnapshotsTable.$inferSelect;

export const retentionSequencesTable = pgTable("retention_sequences", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("custom"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  triggerConfig: jsonb("trigger_config").notNull().default({}),
  cooldownDays: integer("cooldown_days").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_retention_sequences_gym").on(table.gymId),
  index("idx_retention_sequences_gym_enabled").on(table.gymId, table.isEnabled),
]);

export const retentionSequenceStepsTable = pgTable("retention_sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => retentionSequencesTable.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  actionType: text("action_type").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_retention_steps_sequence").on(table.sequenceId),
]);

export const memberSequenceEnrollmentsTable = pgTable("member_sequence_enrollments", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  sequenceId: integer("sequence_id").notNull().references(() => retentionSequencesTable.id),
  status: text("status").notNull().default("active"),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  nextActionAt: timestamp("next_action_at", { withTimezone: true }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  exitReason: text("exit_reason"),
  triggerSnapshot: jsonb("trigger_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_enrollments_gym").on(table.gymId),
  index("idx_enrollments_member").on(table.memberId),
  index("idx_enrollments_sequence").on(table.sequenceId),
  index("idx_enrollments_status").on(table.gymId, table.status),
  index("idx_enrollments_next_action").on(table.status, table.nextActionAt),
]);

export const retentionSequenceEventsTable = pgTable("retention_sequence_events", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  enrollmentId: integer("enrollment_id").notNull().references(() => memberSequenceEnrollmentsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  sequenceId: integer("sequence_id").notNull().references(() => retentionSequencesTable.id),
  eventType: text("event_type").notNull(),
  stepIndex: integer("step_index"),
  details: text("details"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_retention_events_enrollment").on(table.enrollmentId),
  index("idx_retention_events_gym").on(table.gymId),
]);

export const insertRetentionSequenceSchema = createInsertSchema(retentionSequencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRetentionSequence = z.infer<typeof insertRetentionSequenceSchema>;
export type RetentionSequence = typeof retentionSequencesTable.$inferSelect;

export const insertRetentionSequenceStepSchema = createInsertSchema(retentionSequenceStepsTable).omit({ id: true, createdAt: true });
export type InsertRetentionSequenceStep = z.infer<typeof insertRetentionSequenceStepSchema>;
export type RetentionSequenceStep = typeof retentionSequenceStepsTable.$inferSelect;

export const insertMemberSequenceEnrollmentSchema = createInsertSchema(memberSequenceEnrollmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemberSequenceEnrollment = z.infer<typeof insertMemberSequenceEnrollmentSchema>;
export type MemberSequenceEnrollment = typeof memberSequenceEnrollmentsTable.$inferSelect;

export const insertRetentionSequenceEventSchema = createInsertSchema(retentionSequenceEventsTable).omit({ id: true, createdAt: true });
export type InsertRetentionSequenceEvent = z.infer<typeof insertRetentionSequenceEventSchema>;
export type RetentionSequenceEvent = typeof retentionSequenceEventsTable.$inferSelect;
