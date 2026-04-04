import { pgTable, text, serial, timestamp, integer, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";
import { leadsTable } from "./leads";

export const leadSequencesTable = pgTable("lead_sequences", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("custom"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  triggerStage: text("trigger_stage").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_lead_sequences_gym").on(table.gymId),
  index("idx_lead_sequences_gym_enabled").on(table.gymId, table.isEnabled),
]);

export const leadSequenceStepsTable = pgTable("lead_sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => leadSequencesTable.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  channel: text("channel").notNull().default("email"),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  subject: text("subject"),
  messageContent: text("message_content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_lead_seq_steps_sequence").on(table.sequenceId),
]);

export const leadSequenceEnrollmentsTable = pgTable("lead_sequence_enrollments", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id),
  sequenceId: integer("sequence_id").notNull().references(() => leadSequencesTable.id),
  status: text("status").notNull().default("active"),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  nextActionAt: timestamp("next_action_at", { withTimezone: true }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  exitReason: text("exit_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_lead_seq_enrollments_gym").on(table.gymId),
  index("idx_lead_seq_enrollments_lead").on(table.leadId),
  index("idx_lead_seq_enrollments_sequence").on(table.sequenceId),
  index("idx_lead_seq_enrollments_status").on(table.gymId, table.status),
  index("idx_lead_seq_enrollments_next_action").on(table.status, table.nextActionAt),
]);

export const leadSequenceEventsTable = pgTable("lead_sequence_events", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  enrollmentId: integer("enrollment_id").notNull().references(() => leadSequenceEnrollmentsTable.id),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id),
  sequenceId: integer("sequence_id").notNull().references(() => leadSequencesTable.id),
  eventType: text("event_type").notNull(),
  stepIndex: integer("step_index"),
  channel: text("channel"),
  details: text("details"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_lead_seq_events_enrollment").on(table.enrollmentId),
  index("idx_lead_seq_events_gym").on(table.gymId),
  index("idx_lead_seq_events_sequence").on(table.sequenceId),
]);

export const insertLeadSequenceSchema = createInsertSchema(leadSequencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadSequence = z.infer<typeof insertLeadSequenceSchema>;
export type LeadSequence = typeof leadSequencesTable.$inferSelect;

export const insertLeadSequenceStepSchema = createInsertSchema(leadSequenceStepsTable).omit({ id: true, createdAt: true });
export type InsertLeadSequenceStep = z.infer<typeof insertLeadSequenceStepSchema>;
export type LeadSequenceStep = typeof leadSequenceStepsTable.$inferSelect;

export const insertLeadSequenceEnrollmentSchema = createInsertSchema(leadSequenceEnrollmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadSequenceEnrollment = z.infer<typeof insertLeadSequenceEnrollmentSchema>;
export type LeadSequenceEnrollment = typeof leadSequenceEnrollmentsTable.$inferSelect;

export const insertLeadSequenceEventSchema = createInsertSchema(leadSequenceEventsTable).omit({ id: true, createdAt: true });
export type InsertLeadSequenceEvent = z.infer<typeof insertLeadSequenceEventSchema>;
export type LeadSequenceEvent = typeof leadSequenceEventsTable.$inferSelect;
