import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const appointmentTypesTable = pgTable("appointment_types", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  color: text("color").notNull().default("#6366f1"),
  isFree: boolean("is_free").notNull().default(false),
  price: integer("price"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_appointment_types_gym").on(table.gymId),
]);

export const coachAvailabilityTable = pgTable("coach_availability", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  coachId: integer("coach_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_coach_availability_gym").on(table.gymId),
  index("idx_coach_availability_coach").on(table.coachId),
]);

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  appointmentTypeId: integer("appointment_type_id").notNull().references(() => appointmentTypesTable.id),
  coachId: integer("coach_id").notNull(),
  coachName: text("coach_name"),
  memberId: integer("member_id"),
  memberName: text("member_name"),
  leadId: integer("lead_id"),
  leadName: text("lead_name"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  reminderSent24h: boolean("reminder_sent_24h").notNull().default(false),
  reminderSent1h: boolean("reminder_sent_1h").notNull().default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_appointments_gym").on(table.gymId),
  index("idx_appointments_coach").on(table.coachId),
  index("idx_appointments_member").on(table.memberId),
  index("idx_appointments_lead").on(table.leadId),
  index("idx_appointments_start").on(table.gymId, table.startTime),
]);

export const insertAppointmentTypeSchema = createInsertSchema(appointmentTypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointmentType = z.infer<typeof insertAppointmentTypeSchema>;
export type AppointmentType = typeof appointmentTypesTable.$inferSelect;

export const insertCoachAvailabilitySchema = createInsertSchema(coachAvailabilityTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoachAvailability = z.infer<typeof insertCoachAvailabilitySchema>;
export type CoachAvailability = typeof coachAvailabilityTable.$inferSelect;

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
