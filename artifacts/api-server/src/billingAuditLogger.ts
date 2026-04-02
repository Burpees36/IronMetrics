import { db, billingAuditLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

export type AuditAction =
  | "subscription.created"
  | "subscription.cancelled"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.plan_changed"
  | "plan.created"
  | "plan.updated"
  | "plan.changed"
  | "charge.created"
  | "refund.issued"
  | "payment_method.updated"
  | "payment.succeeded"
  | "payment.failed"
  | "webhook.reconciliation"
  | "recovery.notification_sent"
  | "recovery.resolved"
  | "recovery.link_generated"
  | "recovery.card_updated"
  | "recovery.grace_expired"
  | "recovery.final_warning_sent"
  | "maintenance.tokens_cleaned"
  | "maintenance.recoveries_archived"
  | "maintenance.scheduled_run"
  | "discount.created"
  | "discount.applied"
  | "discount.removed"
  | "discount.reactivated"
  | "discount.deactivated"
  | "hold.started"
  | "hold.scheduled"
  | "hold.updated"
  | "hold.cancelled"
  | "hold.auto_activated"
  | "hold.auto_completed"
  | "recovery.auto_suspended"
  | "recovery.auto_reactivated"
  | "credit.added"
  | "credit.removed"
  | "tax.configured"
  | "tax.disabled";

export type AuditSource = "ui" | "webhook" | "system" | "api";

export interface AuditEntry {
  gymId: number;
  memberId?: number | null;
  actorUserId?: string | null;
  actorName?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  beforeValue?: Record<string, any> | null;
  afterValue?: Record<string, any> | null;
  amount?: number | null;
  currency?: string;
  reason?: string | null;
  source: AuditSource;
  metadata?: Record<string, any> | null;
}

class BillingAuditLogger {
  async log(entry: AuditEntry): Promise<void> {
    try {
      await db.insert(billingAuditLogsTable).values({
        gymId: entry.gymId,
        memberId: entry.memberId ?? null,
        actorUserId: entry.actorUserId ?? null,
        actorName: entry.actorName ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        beforeValue: entry.beforeValue ? JSON.stringify(entry.beforeValue) : null,
        afterValue: entry.afterValue ? JSON.stringify(entry.afterValue) : null,
        amount: entry.amount != null ? String(entry.amount) : null,
        currency: entry.currency || "usd",
        reason: entry.reason ?? null,
        source: entry.source,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      });
    } catch (err) {
      console.error("[AUDIT] Failed to write audit log:", err);
    }
  }

  async getAuditLogs(gymId: number, options?: { limit?: number; offset?: number; memberId?: number; action?: string }) {
    let conditions: any[] = [eq(billingAuditLogsTable.gymId, gymId)];
    if (options?.memberId) conditions.push(eq(billingAuditLogsTable.memberId, options.memberId));
    if (options?.action) conditions.push(eq(billingAuditLogsTable.action, options.action));

    const logs = await db
      .select()
      .from(billingAuditLogsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(billingAuditLogsTable.createdAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    return logs.map((l) => ({
      ...l,
      amount: l.amount ? parseFloat(l.amount) : null,
      beforeValue: l.beforeValue ? JSON.parse(l.beforeValue) : null,
      afterValue: l.afterValue ? JSON.parse(l.afterValue) : null,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
    }));
  }
}

export const billingAuditLogger = new BillingAuditLogger();
