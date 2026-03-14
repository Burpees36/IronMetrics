import { pgTable, text, serial, timestamp, integer, boolean, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";
import { membersTable } from "./members";
import { programmingSectionsTable } from "./programming";

export const workoutsTable = pgTable("workouts", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  workoutDate: date("workout_date", { mode: "string" }).notNull(),
  type: text("type").notNull().default("WOD"),
  movements: text("movements").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_workouts_gym").on(table.gymId),
  index("idx_workouts_gym_date").on(table.gymId, table.workoutDate),
]);

export const insertWorkoutSchema = createInsertSchema(workoutsTable).omit({ id: true, createdAt: true });
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workoutsTable.$inferSelect;

export const workoutResultsTable = pgTable("workout_results", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workoutsTable.id),
  programmingSectionId: integer("programming_section_id").references(() => programmingSectionsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  result: text("result").notNull(),
  notes: text("notes"),
  isRx: boolean("is_rx").notNull().default(false),
  isPr: boolean("is_pr").notNull().default(false),
  rank: integer("rank"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_workout_results_workout").on(table.workoutId),
  index("idx_workout_results_member").on(table.memberId),
  index("idx_workout_results_gym").on(table.gymId),
]);

export const insertWorkoutResultSchema = createInsertSchema(workoutResultsTable).omit({ id: true, createdAt: true });
export type InsertWorkoutResult = z.infer<typeof insertWorkoutResultSchema>;
export type WorkoutResult = typeof workoutResultsTable.$inferSelect;
