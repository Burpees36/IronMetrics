/**
 * @module billing
 * Database schema for the complete billing lifecycle.
 *
 * Tables are organized around the billing flow:
 *   1. `membership_plans`       — defines available plans and their Stripe product/price mappings
 *   2. `subscriptions`          — tracks active, past_due, and cancelled member subscriptions
 *   3. `invoices`               — individual billing statements sent to members
 *   4. `payments`               — successful and failed payment records
 *   5. `refunds`                — refund records linked back to payments
 *   6. `billing_events`         — raw event log (Stripe events and internal events)
 *   7. `billing_audit_logs`     — detailed audit trail with before/after values for compliance
 *   8. `billing_webhook_events` — idempotency tracking for Stripe webhook processing
 *   9. `billing_recovery`       — failed payment recovery workflow state
 *  10. `payment_update_tokens`  — secure, time-limited tokens for self-service card updates
 *
 * Known normalization concerns:
 *   - `memberName` is denormalized into subscriptions, invoices, payments, and refunds.
 *     This avoids joins for display purposes but means name changes on the member record
 *     will not propagate to historical billing records. This is intentional for audit
 *     accuracy (the name at time of transaction is preserved), but could cause confusion
 *     in the UI if not handled carefully.
 *   - `planName` is similarly denormalized in subscriptions for the same reason.
 *   - `metadata` fields in billing_events and billing_audit_logs are stored as text
 *     (serialized JSON) rather than jsonb, which prevents structured queries and
 *     indexing on metadata properties.
 */
import { pgTable, text, serial, timestamp, integer, numeric, boolean, index, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";
import { membersTable } from "./members";

/**
 * Membership plans — the catalog of available subscription tiers.
 * Each plan can be linked to a Stripe product and price for automated billing.
 */
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

/**
 * Subscriptions — links a member to a plan with billing period tracking.
 *
 * Known weakness: `memberName` and `planName` are denormalized copies (see module note).
 * `status` is free text (e.g., "active", "past_due", "cancelled") with no CHECK constraint.
 *
 * Indexes optimize the most common query patterns:
 *   - By gym (dashboard listings)
 *   - By member (member detail page)
 *   - By gym + status (active subscription counts, past_due recovery)
 */
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(), // Denormalized — see module note
  planId: integer("plan_id").notNull().references(() => membershipPlansTable.id),
  planName: text("plan_name").notNull(), // Denormalized — see module note
  status: text("status").notNull().default("active"),
  currentPeriodStart: date("current_period_start", { mode: "string" }),
  currentPeriodEnd: date("current_period_end", { mode: "string" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  failedPayments: integer("failed_payments").notNull().default(0),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_subscriptions_gym").on(table.gymId),
  index("idx_subscriptions_member").on(table.memberId),
  index("idx_subscriptions_gym_status").on(table.gymId, table.status),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;

/**
 * Invoices — individual billing statements.
 * `memberName` is denormalized for display (see module note).
 */
export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(), // Denormalized — see module note
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("unpaid"),
  dueDate: date("due_date", { mode: "string" }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  description: text("description"),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

/**
 * Payments — records of successful and failed payment transactions.
 * `memberName` is denormalized for display (see module note).
 */
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(), // Denormalized — see module note
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

/**
 * Refunds — tracks refund requests and their resolution.
 * `memberName` is denormalized for display (see module note).
 */
export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  memberName: text("member_name").notNull(), // Denormalized — see module note
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

/**
 * Billing events — raw event log for Stripe and internal billing events.
 * Known weakness: `metadata` is text (serialized JSON) rather than jsonb.
 */
export const billingEventsTable = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").references(() => membersTable.id),
  type: text("type").notNull(),
  description: text("description"),
  stripeEventId: text("stripe_event_id"),
  metadata: text("metadata"), // Text instead of jsonb — see module note
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBillingEventSchema = createInsertSchema(billingEventsTable).omit({ id: true, createdAt: true });
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;
export type BillingEvent = typeof billingEventsTable.$inferSelect;

/**
 * Billing audit logs — detailed change tracking for compliance and debugging.
 * Records who did what, with before/after values for the affected entity.
 * Known weakness: `metadata`, `beforeValue`, and `afterValue` are text rather than jsonb.
 */
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
  metadata: text("metadata"), // Text instead of jsonb — see module note
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBillingAuditLogSchema = createInsertSchema(billingAuditLogsTable).omit({ id: true, createdAt: true });
export type InsertBillingAuditLog = z.infer<typeof insertBillingAuditLogSchema>;
export type BillingAuditLog = typeof billingAuditLogsTable.$inferSelect;

/**
 * Billing webhook events — idempotency table for Stripe webhook processing.
 * Each Stripe event ID is stored with a unique constraint to prevent
 * double-processing of the same webhook delivery.
 */
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

/**
 * Billing recovery — tracks the dunning/recovery workflow for failed payments.
 *
 * When a subscription payment fails, a recovery record is created to track:
 *   - How many attempts have failed
 *   - When the member was last notified
 *   - The grace period deadline before cancellation
 *   - Resolution status (recovered, cancelled, etc.)
 *
 * Indexes:
 *   - `idx_billing_recovery_gym_status`: Dashboard view of active recovery cases
 *   - `idx_billing_recovery_subscription_status`: Lookup by subscription
 *   - `idx_billing_recovery_member`: Member detail page recovery history
 */
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

/**
 * Payment update tokens — secure, single-use tokens for self-service card updates.
 * Sent to members via email when a payment fails, allowing them to update their
 * card without logging in. Tokens expire (via `expiresAt`) and are marked used
 * (via `usedAt`) to prevent reuse.
 */
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

export const scheduledHoldsTable = pgTable("scheduled_holds", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id),
  status: text("status").notNull().default("scheduled"),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  reason: text("reason"),
  createdBy: text("created_by"),
  createdByName: text("created_by_name"),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_scheduled_holds_gym_status").on(table.gymId, table.status),
  index("idx_scheduled_holds_member").on(table.memberId),
  index("idx_scheduled_holds_subscription").on(table.subscriptionId),
]);

export const insertScheduledHoldSchema = createInsertSchema(scheduledHoldsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScheduledHold = z.infer<typeof insertScheduledHoldSchema>;
export type ScheduledHold = typeof scheduledHoldsTable.$inferSelect;

export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull().default("percentage"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  duration: text("duration").notNull().default("once"),
  durationInMonths: integer("duration_in_months"),
  maxRedemptions: integer("max_redemptions"),
  timesRedeemed: integer("times_redeemed").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  stripeCouponId: text("stripe_coupon_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_discount_codes_gym").on(table.gymId),
  index("idx_discount_codes_gym_code").on(table.gymId, table.code),
]);

export const insertDiscountCodeSchema = createInsertSchema(discountCodesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodesTable.$inferSelect;
