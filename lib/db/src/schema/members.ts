/**
 * @module members
 * Database schema for gym members, member notes, and timeline events.
 *
 * The `members` table is the central entity for tracking individuals enrolled
 * in a gym. Each member belongs to exactly one gym (via `gymId` foreign key).
 *
 * Known weaknesses:
 *   - `email` has no unique constraint scoped to `gymId`, so duplicate emails
 *     within the same gym are not prevented at the database level. Application
 *     code should enforce this, but a composite unique index on (gymId, email)
 *     would be safer.
 *   - `status` is a free-text column (e.g., "active", "cancelled", "frozen")
 *     with no enum or CHECK constraint, so invalid statuses can be inserted.
 *   - `membershipType` is also free-text with no validation — ideally it would
 *     reference the membership_plans table or use a CHECK constraint.
 *   - `riskScore` and `riskTier` are denormalized from the intelligence module;
 *     they can become stale if not periodically refreshed.
 *
 * Indexes:
 *   - `idx_members_gym`: Speeds up queries filtering by gym (most common pattern).
 *   - `idx_members_gym_status`: Optimizes the frequent "active members for gym X" query.
 */
import { pgTable, text, serial, timestamp, integer, numeric, boolean, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(), // No unique constraint per gym — see module note
  phone: text("phone"),
  status: text("status").notNull().default("active"), // Free text — no enum/CHECK constraint
  membershipType: text("membership_type"), // Free text — no enum/CHECK constraint
  joinDate: date("join_date", { mode: "string" }),
  birthDate: date("birth_date", { mode: "string" }),
  profileImageUrl: text("profile_image_url"),
  tags: text("tags").array().notNull().default([]),
  riskScore: numeric("risk_score"), // Denormalized from intelligence module
  riskTier: text("risk_tier"), // Denormalized from intelligence module
  lastVisitDate: timestamp("last_visit_date", { withTimezone: true }),
  attendanceCount30d: integer("attendance_count_30d").default(0),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  waiverSigned: boolean("waiver_signed").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  linkedBillingMemberId: integer("linked_billing_member_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_members_gym").on(table.gymId),
  index("idx_members_gym_status").on(table.gymId, table.status),
]);

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;

/**
 * Member notes — free-text notes attached to a member by staff.
 * Indexed by memberId for efficient retrieval of a member's note history.
 */
export const memberNotesTable = pgTable("member_notes", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  authorId: text("author_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_member_notes_member").on(table.memberId),
  index("idx_member_notes_gym").on(table.gymId),
]);

export const insertMemberNoteSchema = createInsertSchema(memberNotesTable).omit({ id: true, createdAt: true });
export type InsertMemberNote = z.infer<typeof insertMemberNoteSchema>;
export type MemberNote = typeof memberNotesTable.$inferSelect;

/**
 * Timeline events — an append-only activity log for each member.
 * Records events like check-ins, plan changes, billing events, etc.
 * Indexed by (memberId, date) for chronological member history queries.
 *
 * Known weakness: `metadata` is stored as text rather than jsonb,
 * preventing structured queries against event metadata.
 */
export const timelineEventsTable = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  metadata: text("metadata"), // Stored as text — would benefit from jsonb for structured queries
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_timeline_events_member").on(table.memberId),
  index("idx_timeline_events_gym").on(table.gymId),
  index("idx_timeline_events_member_date").on(table.memberId, table.date),
]);

export const insertTimelineEventSchema = createInsertSchema(timelineEventsTable).omit({ id: true, createdAt: true });
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
