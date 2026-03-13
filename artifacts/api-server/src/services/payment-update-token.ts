import crypto from "crypto";
import { db, paymentUpdateTokensTable, billingRecoveryTable, subscriptionsTable, membersTable, gymsTable } from "@workspace/db";
import { eq, and, isNull, gt } from "drizzle-orm";

const TOKEN_EXPIRY_HOURS = 72;

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

    return { token, expiresAt };
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    error?: string;
    data?: {
      id: number;
      gymId: number;
      memberId: number;
      subscriptionId: number;
      recoveryId: number | null;
    };
  }> {
    const [record] = await db
      .select()
      .from(paymentUpdateTokensTable)
      .where(eq(paymentUpdateTokensTable.token, token));

    if (!record) {
      return { valid: false, error: "Invalid or expired link. Please contact your gym for a new update link." };
    }

    if (record.usedAt) {
      return { valid: false, error: "This link has already been used. Please contact your gym if you need to update your payment method again." };
    }

    if (new Date() > record.expiresAt) {
      return { valid: false, error: "This link has expired. Please contact your gym for a new update link." };
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
}

export const paymentUpdateTokenService = new PaymentUpdateTokenService();
