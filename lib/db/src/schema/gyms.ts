import { pgTable, text, serial, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
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
  businessName: text("business_name"),
  description: text("description"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  ownerId: text("owner_id").notNull(),
  subscriptionTier: text("subscription_tier").notNull().default("none"),
  isBetaAccess: boolean("is_beta_access").notNull().default(false),
  stripeGymCustomerId: text("stripe_gym_customer_id"),
  platformSubscriptionId: text("platform_subscription_id"),
  platformCancelAtPeriodEnd: boolean("platform_cancel_at_period_end").notNull().default(false),
  platformCurrentPeriodEnd: timestamp("platform_current_period_end", { withTimezone: true }),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxLabel: text("tax_label").default("Sales Tax"),
  taxRate: text("tax_rate").default("0"),
  taxJurisdiction: text("tax_jurisdiction"),
  stripeTaxRateId: text("stripe_tax_rate_id"),
  pastDuePolicy: text("past_due_policy").notNull().default("grace_period"),
  autoSuspendEnabled: boolean("auto_suspend_enabled").notNull().default(true),
  autoSuspendBufferDays: integer("auto_suspend_buffer_days").notNull().default(3),
  wodifyApiKey: text("wodify_api_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGymSchema = createInsertSchema(gymsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGym = z.infer<typeof insertGymSchema>;
export type Gym = typeof gymsTable.$inferSelect;

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
  joinDate: date("join_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGymStaffSchema = createInsertSchema(gymStaffTable).omit({ id: true, createdAt: true });
export type InsertGymStaff = z.infer<typeof insertGymStaffSchema>;
export type GymStaff = typeof gymStaffTable.$inferSelect;

export const gymOnboardingTable = pgTable("gym_onboarding", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id).unique(),
  currentStep: text("current_step").notNull().default("basics"),
  completedSteps: text("completed_steps").array().notNull().default([]),
  skippedSteps: text("skipped_steps").array().notNull().default([]),
  isComplete: boolean("is_complete").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
