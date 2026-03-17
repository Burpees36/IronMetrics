import { pgTable, text, serial, timestamp, integer, boolean, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  stage: text("stage").notNull().default("new"),
  source: text("source"),
  assignedToId: integer("assigned_to_id"),
  lastContactDate: timestamp("last_contact_date", { withTimezone: true }),
  nextFollowUpDate: date("next_follow_up_date", { mode: "string" }),
  followUpNote: text("follow_up_note"),
  lostReason: text("lost_reason"),
  notes: text("notes"),
  isStale: boolean("is_stale").notNull().default(false),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_leads_gym").on(table.gymId),
  index("idx_leads_gym_stage").on(table.gymId, table.stage),
]);

export const leadActivitiesTable = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_lead_activities_lead").on(table.leadId),
  index("idx_lead_activities_gym").on(table.gymId),
]);

export const leadCaptureConfigTable = pgTable("lead_capture_config", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id).unique(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  headline: text("headline"),
  subheadline: text("subheadline"),
  ctaButtonText: text("cta_button_text"),
  successMessage: text("success_message"),
  disclaimerText: text("disclaimer_text"),
  showPhone: boolean("show_phone").notNull().default(true),
  showAddress: boolean("show_address").notNull().default(true),
  phoneRequired: boolean("phone_required").notNull().default(false),
  showInterests: boolean("show_interests").notNull().default(true),
  showConsent: boolean("show_consent").notNull().default(false),
  consentText: text("consent_text"),
  sourceLabel: text("source_label").notNull().default("website"),
  campaignTag: text("campaign_tag"),
  defaultStage: text("default_stage").notNull().default("new"),
  autoAssignStaffId: integer("auto_assign_staff_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadCaptureConfigSchema = createInsertSchema(leadCaptureConfigTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadCaptureConfig = z.infer<typeof insertLeadCaptureConfigSchema>;
export type LeadCaptureConfig = typeof leadCaptureConfigTable.$inferSelect;

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

export const insertLeadActivitySchema = createInsertSchema(leadActivitiesTable).omit({ id: true, createdAt: true });
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type LeadActivity = typeof leadActivitiesTable.$inferSelect;
