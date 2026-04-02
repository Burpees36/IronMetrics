import { db, billingRecoveryTable, subscriptionsTable, membersTable, gymsTable } from "@workspace/db";
import { eq, and, lt, isNull, inArray } from "drizzle-orm";
import { billingAuditLogger } from "../billingAuditLogger";
import { paymentUpdateTokenService } from "./payment-update-token";
import { buildPaymentFailedEmail, buildGraceExpiredEmail, sendBillingEmail } from "./billing-email";
import { getStripeClient } from "../stripeClient";

export const BILLING_RECOVERY_CONFIG = {
  GRACE_PERIOD_DAYS: 14,
  MIN_NOTIFICATION_INTERVAL_MS: 4 * 60 * 60 * 1000,
  TOKEN_EXPIRY_HOURS: 72,
  RESOLVED_RETENTION_DAYS: 90,
} as const;

function getUpdateCardUrl(token: string): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "localhost";
  return `https://${domain}/update-payment?token=${token}`;
}

export class BillingRecoveryService {
  async handlePaymentFailure(params: {
    subscriptionId: number;
    gymId: number;
    memberId: number;
    stripeSubscriptionId: string;
    amountDue: number;
    cardLast4?: string | null;
    cardBrand?: string | null;
    stripeEventId?: string;
  }): Promise<void> {
    const [existing] = await db
      .select()
      .from(billingRecoveryTable)
      .where(
        and(
          eq(billingRecoveryTable.subscriptionId, params.subscriptionId),
          eq(billingRecoveryTable.status, "active")
        )
      );

    let recoveryId: number;

    if (existing) {
      const timeSinceLastNotification = existing.lastNotifiedAt
        ? Date.now() - existing.lastNotifiedAt.getTime()
        : Infinity;

      await db
        .update(billingRecoveryTable)
        .set({
          failedAttempts: existing.failedAttempts + 1,
          lastFailedAt: new Date(),
          amountDue: params.amountDue ? String(params.amountDue) : existing.amountDue,
          cardLast4: params.cardLast4 || existing.cardLast4,
          cardBrand: params.cardBrand || existing.cardBrand,
        })
        .where(eq(billingRecoveryTable.id, existing.id));

      recoveryId = existing.id;

      if (timeSinceLastNotification < BILLING_RECOVERY_CONFIG.MIN_NOTIFICATION_INTERVAL_MS) {
        console.log(`[billing-recovery] Skipping duplicate notification for recovery ${existing.id}, last sent ${Math.round(timeSinceLastNotification / 60000)}m ago`);
        return;
      }
    } else {
      const graceDeadline = new Date(Date.now() + BILLING_RECOVERY_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      const [newRecovery] = await db
        .insert(billingRecoveryTable)
        .values({
          gymId: params.gymId,
          memberId: params.memberId,
          subscriptionId: params.subscriptionId,
          stripeSubscriptionId: params.stripeSubscriptionId,
          status: "active",
          failedAttempts: 1,
          lastFailedAt: new Date(),
          graceDeadline,
          amountDue: params.amountDue ? String(params.amountDue) : null,
          cardLast4: params.cardLast4 || null,
          cardBrand: params.cardBrand || null,
        })
        .returning();

      recoveryId = newRecovery.id;
      console.log(`[billing-recovery] Created recovery ${recoveryId} for subscription ${params.subscriptionId}, grace deadline: ${graceDeadline.toISOString()}`);
    }

    await this.sendRecoveryNotification(recoveryId, params.gymId, params.memberId, params.subscriptionId);
  }

  async sendRecoveryNotification(
    recoveryId: number,
    gymId: number,
    memberId: number,
    subscriptionId: number
  ): Promise<{ token?: string; updateLink?: string; success: boolean; error?: string }> {
    const [recovery] = await db
      .select()
      .from(billingRecoveryTable)
      .where(eq(billingRecoveryTable.id, recoveryId));

    if (!recovery) {
      console.warn(`[billing-recovery] Recovery ${recoveryId} not found for notification`);
      return { success: false, error: "Recovery record not found" };
    }

    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    if (!member) {
      console.warn(`[billing-recovery] Member ${memberId} not found for recovery ${recoveryId}`);
      return { success: false, error: "Member not found" };
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) {
      console.warn(`[billing-recovery] Gym ${gymId} not found for recovery ${recoveryId}`);
      return { success: false, error: "Gym not found" };
    }

    const { token, expiresAt } = await paymentUpdateTokenService.createToken({
      gymId,
      memberId,
      subscriptionId,
      recoveryId,
    });

    const updateLink = getUpdateCardUrl(token);

    const email = buildPaymentFailedEmail({
      memberName: `${member.firstName} ${member.lastName}`,
      amountDue: recovery.amountDue ? parseFloat(recovery.amountDue) : 0,
      cardLast4: recovery.cardLast4,
      cardBrand: recovery.cardBrand,
      updateLink,
      branding: {
        name: gym.name,
        fromEmail: gym.fromEmail,
        fromName: gym.fromName,
        logoUrl: gym.logoUrl,
        email: gym.email,
        phone: gym.phone,
      },
    });

    const result = await sendBillingEmail({
      to: member.email,
      ...email,
      branding: {
        name: gym.name,
        fromEmail: gym.fromEmail,
        fromName: gym.fromName,
        logoUrl: gym.logoUrl,
        email: gym.email,
        phone: gym.phone,
      },
    });

    if (result.success) {
      await db
        .update(billingRecoveryTable)
        .set({ lastNotifiedAt: new Date() })
        .where(eq(billingRecoveryTable.id, recoveryId));
      console.log(`[billing-recovery] Notification sent for recovery ${recoveryId}, email=${member.email}`);
    } else {
      console.warn(`[billing-recovery] Email send failed for recovery ${recoveryId}: ${result.error}`);
    }

    await billingAuditLogger.log({
      gymId,
      memberId,
      action: "recovery.notification_sent",
      entityType: "billing_recovery",
      entityId: String(recoveryId),
      source: "system",
      metadata: {
        emailSent: result.success,
        emailError: result.error || null,
        token: token.substring(0, 8) + "...",
        emailSkippedReason: result.success ? null : result.error,
      },
    });

    return { token, updateLink, success: result.success, error: result.error };
  }

  async resolveRecovery(subscriptionId: number, reason: string): Promise<void> {
    const [recovery] = await db
      .select()
      .from(billingRecoveryTable)
      .where(
        and(
          eq(billingRecoveryTable.subscriptionId, subscriptionId),
          inArray(billingRecoveryTable.status, ["active", "grace_expired", "auto_suspended"])
        )
      );

    if (!recovery) return;

    const wasAutoSuspended = recovery.status === "auto_suspended";

    await db
      .update(billingRecoveryTable)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedReason: reason,
      })
      .where(eq(billingRecoveryTable.id, recovery.id));

    if (wasAutoSuspended) {
      const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, recovery.subscriptionId));
      if (sub?.stripeSubscriptionId) {
        const stripe = await getStripeClient();
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          pause_collection: null as any,
        });
      }

      await db.update(subscriptionsTable).set({ status: "active" }).where(eq(subscriptionsTable.id, recovery.subscriptionId));
      await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, recovery.memberId));

      await billingAuditLogger.log({
        gymId: recovery.gymId,
        memberId: recovery.memberId,
        action: "recovery.auto_reactivated",
        entityType: "billing_recovery",
        entityId: String(recovery.id),
        source: "system",
        metadata: { reason, previousStatus: "auto_suspended" },
      });

      console.log(`[billing-recovery] Auto-reactivated member ${recovery.memberId} after suspension, reason=${reason}`);
    }

    console.log(`[billing-recovery] Resolved recovery ${recovery.id} for subscription ${subscriptionId}, reason=${reason}`);

    await billingAuditLogger.log({
      gymId: recovery.gymId,
      memberId: recovery.memberId,
      action: "recovery.resolved",
      entityType: "billing_recovery",
      entityId: String(recovery.id),
      source: "system",
      metadata: { reason, previousStatus: recovery.status },
    });
  }

  async evaluateGraceDeadlines(gymId: number): Promise<{
    escalated: number;
    errors: number;
  }> {
    const now = new Date();
    const expiredRecoveries = await db
      .select({
        id: billingRecoveryTable.id,
        gymId: billingRecoveryTable.gymId,
        memberId: billingRecoveryTable.memberId,
        subscriptionId: billingRecoveryTable.subscriptionId,
        failedAttempts: billingRecoveryTable.failedAttempts,
        amountDue: billingRecoveryTable.amountDue,
        cardLast4: billingRecoveryTable.cardLast4,
        cardBrand: billingRecoveryTable.cardBrand,
        graceDeadline: billingRecoveryTable.graceDeadline,
      })
      .from(billingRecoveryTable)
      .where(
        and(
          eq(billingRecoveryTable.gymId, gymId),
          eq(billingRecoveryTable.status, "active"),
          lt(billingRecoveryTable.graceDeadline, now)
        )
      );

    let escalated = 0;
    let errors = 0;

    for (const recovery of expiredRecoveries) {
      try {
        await db
          .update(billingRecoveryTable)
          .set({ status: "grace_expired" })
          .where(eq(billingRecoveryTable.id, recovery.id));

        await billingAuditLogger.log({
          gymId: recovery.gymId,
          memberId: recovery.memberId,
          action: "recovery.grace_expired",
          entityType: "billing_recovery",
          entityId: String(recovery.id),
          source: "system",
          metadata: {
            graceDeadline: recovery.graceDeadline?.toISOString(),
            failedAttempts: recovery.failedAttempts,
            amountDue: recovery.amountDue,
          },
        });

        const [member] = await db.select().from(membersTable).where(eq(membersTable.id, recovery.memberId));
        const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, recovery.gymId));

        if (member && gym) {
          const { token } = await paymentUpdateTokenService.createToken({
            gymId: recovery.gymId,
            memberId: recovery.memberId,
            subscriptionId: recovery.subscriptionId,
            recoveryId: recovery.id,
          });

          const updateLink = getUpdateCardUrl(token);
          const branding = {
            name: gym.name,
            fromEmail: gym.fromEmail,
            fromName: gym.fromName,
            logoUrl: gym.logoUrl,
            email: gym.email,
            phone: gym.phone,
          };

          const email = buildGraceExpiredEmail({
            memberName: `${member.firstName} ${member.lastName}`,
            amountDue: recovery.amountDue ? parseFloat(recovery.amountDue) : 0,
            updateLink,
            branding,
          });

          const emailResult = await sendBillingEmail({
            to: member.email,
            ...email,
            branding,
          });

          await billingAuditLogger.log({
            gymId: recovery.gymId,
            memberId: recovery.memberId,
            action: "recovery.final_warning_sent",
            entityType: "billing_recovery",
            entityId: String(recovery.id),
            source: "system",
            metadata: {
              emailSent: emailResult.success,
              emailError: emailResult.error || null,
            },
          });

          console.log(`[billing-recovery] Grace expired for recovery ${recovery.id}, final warning sent=${emailResult.success}`);
        }

        escalated++;
      } catch (err: any) {
        console.error(`[billing-recovery] Error escalating recovery ${recovery.id}:`, err.message);
        errors++;
      }
    }

    console.log(`[billing-recovery] Grace deadline evaluation complete: ${escalated} escalated, ${errors} errors, ${expiredRecoveries.length} total expired`);
    return { escalated, errors };
  }

  async evaluateAutoSuspensions(gymId: number): Promise<{
    suspended: number;
    errors: number;
  }> {
    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym || !gym.autoSuspendEnabled) {
      return { suspended: 0, errors: 0 };
    }

    const bufferMs = gym.autoSuspendBufferDays * 24 * 60 * 60 * 1000;
    const now = new Date();

    const graceExpiredRecoveries = await db
      .select({
        id: billingRecoveryTable.id,
        gymId: billingRecoveryTable.gymId,
        memberId: billingRecoveryTable.memberId,
        subscriptionId: billingRecoveryTable.subscriptionId,
        stripeSubscriptionId: billingRecoveryTable.stripeSubscriptionId,
        graceDeadline: billingRecoveryTable.graceDeadline,
        amountDue: billingRecoveryTable.amountDue,
        updatedAt: billingRecoveryTable.updatedAt,
      })
      .from(billingRecoveryTable)
      .where(
        and(
          eq(billingRecoveryTable.gymId, gymId),
          eq(billingRecoveryTable.status, "grace_expired")
        )
      );

    let suspended = 0;
    let errors = 0;

    for (const recovery of graceExpiredRecoveries) {
      try {
        const graceExpiredAt = recovery.graceDeadline || recovery.updatedAt;
        if (!graceExpiredAt) continue;

        const timeSinceGraceExpired = now.getTime() - graceExpiredAt.getTime();
        if (timeSinceGraceExpired < bufferMs) continue;

        const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, recovery.subscriptionId));
        if (sub?.stripeSubscriptionId) {
          const stripe = await getStripeClient();
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            pause_collection: { behavior: "void" },
          });
        }

        await db.update(subscriptionsTable).set({ status: "paused" }).where(eq(subscriptionsTable.id, recovery.subscriptionId));
        await db.update(membersTable).set({ status: "inactive" }).where(eq(membersTable.id, recovery.memberId));

        await db
          .update(billingRecoveryTable)
          .set({ status: "auto_suspended" })
          .where(eq(billingRecoveryTable.id, recovery.id));

        await billingAuditLogger.log({
          gymId: recovery.gymId,
          memberId: recovery.memberId,
          action: "recovery.auto_suspended",
          entityType: "billing_recovery",
          entityId: String(recovery.id),
          source: "system",
          metadata: {
            graceDeadline: recovery.graceDeadline?.toISOString(),
            bufferDays: gym.autoSuspendBufferDays,
            amountDue: recovery.amountDue,
          },
        });

        console.log(`[billing-recovery] Auto-suspended member ${recovery.memberId} for recovery ${recovery.id} (buffer: ${gym.autoSuspendBufferDays} days)`);
        suspended++;
      } catch (err: any) {
        console.error(`[billing-recovery] Error auto-suspending recovery ${recovery.id}:`, err.message);
        errors++;
      }
    }

    if (suspended > 0) {
      console.log(`[billing-recovery] Auto-suspension evaluation complete: ${suspended} suspended, ${errors} errors`);
    }

    return { suspended, errors };
  }

  async archiveOldResolvedRecoveries(gymId: number): Promise<number> {
    const cutoff = new Date(Date.now() - BILLING_RECOVERY_CONFIG.RESOLVED_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const deleted = await db
      .delete(billingRecoveryTable)
      .where(
        and(
          eq(billingRecoveryTable.gymId, gymId),
          inArray(billingRecoveryTable.status, ["resolved"]),
          lt(billingRecoveryTable.resolvedAt, cutoff)
        )
      )
      .returning({ id: billingRecoveryTable.id });

    if (deleted.length > 0) {
      console.log(`[billing-recovery] Archived ${deleted.length} resolved recovery records older than ${BILLING_RECOVERY_CONFIG.RESOLVED_RETENTION_DAYS} days`);
    }

    return deleted.length;
  }

  async getActiveRecoveries(gymId: number): Promise<any[]> {
    const recoveries = await db
      .select({
        id: billingRecoveryTable.id,
        gymId: billingRecoveryTable.gymId,
        memberId: billingRecoveryTable.memberId,
        subscriptionId: billingRecoveryTable.subscriptionId,
        stripeSubscriptionId: billingRecoveryTable.stripeSubscriptionId,
        status: billingRecoveryTable.status,
        failedAttempts: billingRecoveryTable.failedAttempts,
        lastFailedAt: billingRecoveryTable.lastFailedAt,
        lastNotifiedAt: billingRecoveryTable.lastNotifiedAt,
        graceDeadline: billingRecoveryTable.graceDeadline,
        amountDue: billingRecoveryTable.amountDue,
        cardLast4: billingRecoveryTable.cardLast4,
        cardBrand: billingRecoveryTable.cardBrand,
        createdAt: billingRecoveryTable.createdAt,
        memberName: subscriptionsTable.memberName,
        planName: subscriptionsTable.planName,
        memberEmail: membersTable.email,
      })
      .from(billingRecoveryTable)
      .innerJoin(subscriptionsTable, eq(billingRecoveryTable.subscriptionId, subscriptionsTable.id))
      .innerJoin(membersTable, eq(billingRecoveryTable.memberId, membersTable.id))
      .where(
        and(
          eq(billingRecoveryTable.gymId, gymId),
          inArray(billingRecoveryTable.status, ["active", "grace_expired", "auto_suspended"])
        )
      );

    return recoveries.map((r) => ({
      ...r,
      amountDue: r.amountDue ? parseFloat(r.amountDue) : null,
    }));
  }

  async getMemberRecovery(memberId: number, gymId: number): Promise<any | null> {
    const [recovery] = await db
      .select()
      .from(billingRecoveryTable)
      .where(
        and(
          eq(billingRecoveryTable.memberId, memberId),
          eq(billingRecoveryTable.gymId, gymId),
          inArray(billingRecoveryTable.status, ["active", "grace_expired", "auto_suspended"])
        )
      );

    if (!recovery) return null;

    return {
      ...recovery,
      amountDue: recovery.amountDue ? parseFloat(recovery.amountDue) : null,
    };
  }
}

export const billingRecoveryService = new BillingRecoveryService();
