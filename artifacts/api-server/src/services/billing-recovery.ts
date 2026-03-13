import { db, billingRecoveryTable, subscriptionsTable, membersTable, gymsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { billingAuditLogger } from "../billingAuditLogger";
import { paymentUpdateTokenService } from "./payment-update-token";
import { buildPaymentFailedEmail, buildPaymentUpdatedEmail, sendBillingEmail } from "./billing-email";

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
      const MIN_NOTIFICATION_INTERVAL = 4 * 60 * 60 * 1000;

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

      if (timeSinceLastNotification < MIN_NOTIFICATION_INTERVAL) {
        console.log(`[billing-recovery] Skipping duplicate notification for recovery ${existing.id}, last sent ${Math.round(timeSinceLastNotification / 60000)}m ago`);
        return;
      }
    } else {
      const graceDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
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

    if (!recovery) return { success: false, error: "Recovery record not found" };

    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    if (!member) return { success: false, error: "Member not found" };

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) return { success: false, error: "Gym not found" };

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
    }

    await billingAuditLogger.log({
      gymId,
      memberId,
      action: "recovery.notification_sent",
      entityType: "billing_recovery",
      entityId: String(recoveryId),
      source: "system",
      metadata: { emailSent: result.success, token: token.substring(0, 8) + "..." },
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
          eq(billingRecoveryTable.status, "active")
        )
      );

    if (!recovery) return;

    await db
      .update(billingRecoveryTable)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedReason: reason,
      })
      .where(eq(billingRecoveryTable.id, recovery.id));

    await billingAuditLogger.log({
      gymId: recovery.gymId,
      memberId: recovery.memberId,
      action: "recovery.resolved",
      entityType: "billing_recovery",
      entityId: String(recovery.id),
      source: "system",
      metadata: { reason },
    });
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
          eq(billingRecoveryTable.status, "active")
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
          eq(billingRecoveryTable.status, "active")
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
