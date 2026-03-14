import crypto from "crypto";
import { db, paymentUpdateTokensTable, subscriptionsTable, membersTable, gymsTable } from "@workspace/db";
import { eq, and, isNull, gt, lt, or } from "drizzle-orm";

const TOKEN_EXPIRY_HOURS = 72;
const TOKEN_RETENTION_DAYS = 30;

export class PaymentUpdateTokenService {
  generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createToken(params: {
    gymId: number;
    memberId: number;
    subscriptionId: number;
    recoveryId?: number;
  }): Promise<{ token: string; expiresAt: Date }> {
    const [sub] = await db
      .select({ id: subscriptionsTable.id })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.id, params.subscriptionId),
          eq(subscriptionsTable.gymId, params.gymId),
          eq(subscriptionsTable.memberId, params.memberId)
        )
      );

    if (!sub) {
      throw new Error("Subscription does not belong to the specified member and gym");
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(paymentUpdateTokensTable).values({
      token,
      gymId: params.gymId,
      memberId: params.memberId,
      subscriptionId: params.subscriptionId,
      recoveryId: params.recoveryId || null,
      expiresAt,
    });

    console.log(`[payment-token] Token created for member=${params.memberId} sub=${params.subscriptionId} gym=${params.gymId}, expires=${expiresAt.toISOString()}`);

    return { token, expiresAt };
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    error?: string;
    errorCode?: "invalid" | "used" | "expired";
    data?: {
      id: number;
      gymId: number;
      memberId: number;
      subscriptionId: number;
      recoveryId: number | null;
    };
  }> {
    if (!token || typeof token !== "string" || token.length < 32) {
      return { valid: false, error: "Invalid or expired link. Please contact your gym for a new update link.", errorCode: "invalid" };
    }

    const [record] = await db
      .select()
      .from(paymentUpdateTokensTable)
      .where(eq(paymentUpdateTokensTable.token, token));

    if (!record) {
      return { valid: false, error: "Invalid or expired link. Please contact your gym for a new update link.", errorCode: "invalid" };
    }

    if (record.usedAt) {
      return { valid: false, error: "This link has already been used. Please contact your gym if you need to update your payment method again.", errorCode: "used" };
    }

    if (new Date() > record.expiresAt) {
      return { valid: false, error: "This link has expired. Please contact your gym for a new update link.", errorCode: "expired" };
    }

    return {
      valid: true,
      data: {
        id: record.id,
        gymId: record.gymId,
        memberId: record.memberId,
        subscriptionId: record.subscriptionId,
        recoveryId: record.recoveryId,
      },
    };
  }

  async markUsed(tokenId: number): Promise<boolean> {
    const result = await db
      .update(paymentUpdateTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(paymentUpdateTokensTable.id, tokenId),
          isNull(paymentUpdateTokensTable.usedAt),
          gt(paymentUpdateTokensTable.expiresAt, new Date())
        )
      )
      .returning({ id: paymentUpdateTokensTable.id });
    return result.length > 0;
  }

  async getTokenContext(token: string): Promise<{
    gymName: string;
    gymLogoUrl: string | null;
    memberName: string;
    memberEmail: string;
  } | null> {
    const validation = await this.validateToken(token);
    if (!validation.valid || !validation.data) return null;

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, validation.data.gymId));
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, validation.data.memberId));

    if (!gym || !member) return null;

    return {
      gymName: gym.name,
      gymLogoUrl: gym.logoUrl,
      memberName: `${member.firstName} ${member.lastName}`,
      memberEmail: member.email,
    };
  }

  async cleanupExpiredTokens(gymId: number): Promise<number> {
    const cutoff = new Date(Date.now() - TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const deleted = await db
      .delete(paymentUpdateTokensTable)
      .where(
        and(
          eq(paymentUpdateTokensTable.gymId, gymId),
          lt(paymentUpdateTokensTable.expiresAt, cutoff),
          or(
            isNull(paymentUpdateTokensTable.usedAt),
            lt(paymentUpdateTokensTable.usedAt, cutoff)
          )
        )
      )
      .returning({ id: paymentUpdateTokensTable.id });

    if (deleted.length > 0) {
      console.log(`[payment-token] Cleaned up ${deleted.length} expired/used tokens older than ${TOKEN_RETENTION_DAYS} days`);
    }

    return deleted.length;
  }
}

export const paymentUpdateTokenService = new PaymentUpdateTokenService();
