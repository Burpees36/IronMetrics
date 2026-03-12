import { db, subscriptionsTable, paymentsTable, refundsTable, membershipPlansTable, billingAuditLogsTable, billingWebhookEventsTable, membersTable } from "@workspace/db";
import { eq, and, desc, count, sql, gte, lt } from "drizzle-orm";

async function main() {
  console.log("=".repeat(60));
  console.log("  IRON METRICS — BILLING TRUTH AUDIT REPORT");
  console.log("  Generated:", new Date().toISOString());
  console.log("=".repeat(60));
  console.log();

  const allSubs = await db.select().from(subscriptionsTable);
  const activeSubs = allSubs.filter((s) => s.status === "active");
  const pausedSubs = allSubs.filter((s) => s.status === "paused");
  const cancelledSubs = allSubs.filter((s) => s.status === "cancelled" || s.status === "cancel_at_period_end");
  const pastDueSubs = allSubs.filter((s) => s.status === "past_due");
  const failedSubs = allSubs.filter((s) => s.failedPayments > 0);

  const mrr = activeSubs.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const arm = activeSubs.length > 0 ? mrr / activeSubs.length : 0;

  console.log("--- SUBSCRIPTION SUMMARY ---");
  console.log(`  Total subscriptions:     ${allSubs.length}`);
  console.log(`  Active:                  ${activeSubs.length}`);
  console.log(`  Paused:                  ${pausedSubs.length}`);
  console.log(`  Cancelled:               ${cancelledSubs.length}`);
  console.log(`  Past due:                ${pastDueSubs.length}`);
  console.log(`  With failed payments:    ${failedSubs.length}`);
  console.log();

  console.log("--- REVENUE METRICS ---");
  console.log(`  MRR:                     $${mrr.toFixed(2)}`);
  console.log(`  ARR:                     $${(mrr * 12).toFixed(2)}`);
  console.log(`  ARM:                     $${arm.toFixed(2)}`);
  console.log();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthPayments = await db.select().from(paymentsTable)
    .where(and(gte(paymentsTable.createdAt, monthStart), lt(paymentsTable.createdAt, monthEnd), eq(paymentsTable.status, "succeeded")));
  const monthRefunds = await db.select().from(refundsTable)
    .where(and(gte(refundsTable.createdAt, monthStart), lt(refundsTable.createdAt, monthEnd)));

  const collected = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const refunded = monthRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  console.log("--- THIS MONTH ---");
  console.log(`  Collections:             $${collected.toFixed(2)}`);
  console.log(`  Refunds:                 $${refunded.toFixed(2)}`);
  console.log(`  Net:                     $${(collected - refunded).toFixed(2)}`);
  console.log();

  const orphanedSubs = allSubs.filter((s) => s.status === "active" && !s.stripeSubscriptionId);
  const suspiciousSubs = allSubs.filter((s) => s.status === "active" && s.failedPayments > 0);

  console.log("--- DATA INTEGRITY ---");
  console.log(`  Active subs without Stripe ID:  ${orphanedSubs.length}`);
  console.log(`  Active subs with failed payments: ${suspiciousSubs.length}`);

  if (orphanedSubs.length > 0) {
    console.log("  WARNING: Subscriptions without Stripe IDs may not be collecting revenue:");
    for (const s of orphanedSubs.slice(0, 5)) {
      console.log(`    - Sub #${s.id}: ${s.memberName} (${s.planName}) $${s.amount}/mo`);
    }
  }

  if (suspiciousSubs.length > 0) {
    console.log("  WARNING: Active subscriptions with failed payments need attention:");
    for (const s of suspiciousSubs.slice(0, 5)) {
      console.log(`    - Sub #${s.id}: ${s.memberName} — ${s.failedPayments} failed payment(s)`);
    }
  }
  console.log();

  const [auditLogCount] = await db.select({ count: count() }).from(billingAuditLogsTable);
  const [webhookEventCount] = await db.select({ count: count() }).from(billingWebhookEventsTable);
  const failedWebhooks = await db.select().from(billingWebhookEventsTable).where(eq(billingWebhookEventsTable.status, "failed"));

  console.log("--- AUDIT & WEBHOOK HEALTH ---");
  console.log(`  Total audit log entries:   ${auditLogCount?.count ?? 0}`);
  console.log(`  Total webhook events:      ${webhookEventCount?.count ?? 0}`);
  console.log(`  Failed webhook events:     ${failedWebhooks.length}`);

  if (failedWebhooks.length > 0) {
    console.log("  ALERT: Failed webhook events:");
    for (const w of failedWebhooks.slice(0, 5)) {
      console.log(`    - ${w.stripeEventId} (${w.eventType}): ${w.processingError}`);
    }
  }
  console.log();

  const plans = await db.select().from(membershipPlansTable);
  console.log("--- PLANS ---");
  for (const p of plans) {
    const subCount = allSubs.filter((s) => s.planId === p.id && s.status === "active").length;
    const revenue = subCount * parseFloat(p.price);
    console.log(`  ${p.name}: $${p.price}/${p.billingInterval} | ${subCount} active | $${revenue.toFixed(2)}/mo`);
  }
  console.log();

  console.log("=".repeat(60));
  console.log("  AUDIT COMPLETE");
  console.log("=".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
