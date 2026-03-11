import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gymsTable = pgTable("gyms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  timezone: text("timezone").notNull().default("America/New_York"),
  logoUrl: text("logo_url"),
  website: text("website"),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const gymStaffTable = pgTable("gym_staff", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  userId: text("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("coach"),
  specialties: text("specialties").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  joinDate: text("join_date"),
  classCount30d: integer("class_count_30d").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGymSchema = createInsertSchema(gymsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGymStaffSchema = createInsertSchema(gymStaffTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertGym = z.infer<typeof insertGymSchema>;
export type Gym = typeof gymsTable.$inferSelect;
export type InsertGymStaff = z.infer<typeof insertGymStaffSchema>;
export type GymStaff = typeof gymStaffTable.$inferSelect;
