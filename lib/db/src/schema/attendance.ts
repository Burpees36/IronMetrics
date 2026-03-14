import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";
import { membersTable } from "./members";
import { classesTable } from "./classes";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(),
  classId: integer("class_id").references(() => classesTable.id),
  className: text("class_name"),
  checkinTime: timestamp("checkin_time", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("reserved"),
  waitlistPosition: integer("waitlist_position"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_attendance_gym").on(table.gymId),
  index("idx_attendance_member").on(table.memberId),
  index("idx_attendance_class").on(table.classId),
  index("idx_attendance_gym_checkin").on(table.gymId, table.checkinTime),
]);

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
