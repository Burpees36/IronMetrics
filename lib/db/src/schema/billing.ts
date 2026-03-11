import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";
import { membersTable } from "./members";

export const membershipPlansTable = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  billingInterval: text("billing_interval").notNull().default("monthly"),
  sessionsPerMonth: integer("sessions_per_month"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMembershipPlanSchema = createInsertSchema(membershipPlansTable).omit({ id: true, createdAt: true });
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type MembershipPlan = typeof membershipPlansTable.$inferSelect;

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(),
  planId: integer("plan_id").notNull().references(() => membershipPlansTable.id),
  planName: text("plan_name").notNull(),
  status: text("status").notNull().default("active"),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  failedPayments: integer("failed_payments").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("unpaid"),
  dueDate: text("due_date"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
