import { pgTable, text, serial, timestamp, integer, numeric, boolean, index } from "drizzle-orm/pg-core";
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
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
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
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
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
  stripeInvoiceId: text("stripe_invoice_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull().default("subscription"),
  status: text("status").notNull().default("succeeded"),
  description: text("description"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  paymentId: integer("payment_id").references(() => paymentsTable.id),
  stripeRefundId: text("stripe_refund_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRefundSchema = createInsertSchema(refundsTable).omit({ id: true, createdAt: true });
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refundsTable.$inferSelect;

export const billingEventsTable = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").references(() => membersTable.id),
  type: text("type").notNull(),
  description: text("description"),
  stripeEventId: text("stripe_event_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBillingEventSchema = createInsertSchema(billingEventsTable).omit({ id: true, createdAt: true });
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;
export type BillingEvent = typeof billingEventsTable.$inferSelect;

export const billingAuditLogsTable = pgTable("billing_audit_logs", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").references(() => membersTable.id),
  actorUserId: text("actor_user_id"),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("usd"),
  reason: text("reason"),
  source: text("source").notNull().default("ui"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBillingAuditLogSchema = createInsertSchema(billingAuditLogsTable).omit({ id: true, createdAt: true });
export type InsertBillingAuditLog = z.infer<typeof insertBillingAuditLogSchema>;
export type BillingAuditLog = typeof billingAuditLogsTable.$inferSelect;

export const billingWebhookEventsTable = pgTable("billing_webhook_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull().default("pending"),
  processingError: text("processing_error"),
  rawPayload: text("raw_payload"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBillingWebhookEventSchema = createInsertSchema(billingWebhookEventsTable).omit({ id: true, createdAt: true });
export type InsertBillingWebhookEvent = z.infer<typeof insertBillingWebhookEventSchema>;
export type BillingWebhookEvent = typeof billingWebhookEventsTable.$inferSelect;

export const billingRecoveryTable = pgTable("billing_recovery", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"),
  failedAttempts: integer("failed_attempts").notNull().default(1),
  lastFailedAt: timestamp("last_failed_at", { withTimezone: true }).notNull().defaultNow(),
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  graceDeadline: timestamp("grace_deadline", { withTimezone: true }),
  amountDue: numeric("amount_due", { precision: 10, scale: 2 }),
  cardLast4: text("card_last4"),
  cardBrand: text("card_brand"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedReason: text("resolved_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_billing_recovery_gym_status").on(table.gymId, table.status),
  index("idx_billing_recovery_subscription_status").on(table.subscriptionId, table.status),
  index("idx_billing_recovery_member").on(table.memberId),
]);

export type BillingRecovery = typeof billingRecoveryTable.$inferSelect;

export const paymentUpdateTokensTable = pgTable("payment_update_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id),
  recoveryId: integer("recovery_id").references(() => billingRecoveryTable.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_payment_update_tokens_token").on(table.token),
  index("idx_payment_update_tokens_expires_used").on(table.expiresAt, table.usedAt),
]);

export type PaymentUpdateToken = typeof paymentUpdateTokensTable.$inferSelect;
