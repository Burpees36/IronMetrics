import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  membershipType: text("membership_type"),
  joinDate: text("join_date"),
  birthDate: text("birth_date"),
  profileImageUrl: text("profile_image_url"),
  tags: text("tags").array().notNull().default([]),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  riskScore: real("risk_score"),
  riskTier: text("risk_tier"),
  lastVisitDate: timestamp("last_visit_date", { withTimezone: true }),
  attendanceCount30d: integer("attendance_count_30d").default(0),
  waiverSigned: boolean("waiver_signed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const memberNotesTable = pgTable("member_notes", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberTimelineTable = pgTable("member_timeline", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMemberNoteSchema = createInsertSchema(memberNotesTable).omit({ id: true, createdAt: true });
export const insertMemberTimelineSchema = createInsertSchema(memberTimelineTable).omit({ id: true, createdAt: true });

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
export type MemberNote = typeof memberNotesTable.$inferSelect;
export type MemberTimeline = typeof memberTimelineTable.$inferSelect;
