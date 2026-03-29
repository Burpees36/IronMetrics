import { db, subscriptionsTable, paymentsTable, refundsTable } from "@workspace/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { computeBlendedMRR, type BlendedMRRResult } from "./blendedMetrics";

export function getMonthWindow(date?: Date): { start: Date; end: Date } {
  const now = date || new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export function computeMRR(activeSubs: { amount: string }[]): number {
  return activeSubs.reduce((sum, s) => sum + parseFloat(s.amount), 0);
}

export function computeARM(mrr: number, activeCount: number): number {
  return activeCount > 0 ? mrr / activeCount : 0;
}

export interface BillingSummary {
  mrr: number;
  arr: number;
  arm: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  activeBillableMembers: number;
  failedPayments: number;
  overdueAccounts: number;
  collectionsThisMonth: number;
  refundsThisMonth: number;
  cancelledThisMonth: number;
  revenueSource: BlendedMRRResult["revenueSource"];
  hasSubscriptionData: boolean;
}

export async function computeBillingSummary(gymId: number, asOfDate?: Date): Promise<BillingSummary> {
  const blended = await computeBlendedMRR(gymId);

  const allSubs = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.gymId, gymId));

  const failedPaymentSubs = allSubs.filter((s) => s.failedPayments > 0);
  const overdueSubs = allSubs.filter((s) => s.status === "past_due");

  const { start: monthStart, end: monthEnd } = getMonthWindow(asOfDate);

  const monthPayments = await db
    .select()
    .from(paymentsTable)
    .where(and(
      eq(paymentsTable.gymId, gymId),
      gte(paymentsTable.createdAt, monthStart),
      lt(paymentsTable.createdAt, monthEnd),
      eq(paymentsTable.status, "succeeded"),
    ));

  const collectionsThisMonth = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const monthRefunds = await db
    .select()
    .from(refundsTable)
    .where(and(
      eq(refundsTable.gymId, gymId),
      gte(refundsTable.createdAt, monthStart),
      lt(refundsTable.createdAt, monthEnd),
    ));

  const refundsThisMonth = monthRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const cancelledThisMonth = allSubs.filter((s) =>
    s.cancelledAt && s.cancelledAt >= monthStart && s.cancelledAt < monthEnd
  );

  return {
    mrr: blended.totalMRR,
    arr: blended.totalMRR * 12,
    arm: blended.arm,
    activeSubscriptions: blended.activeSubscriptionCount,
    totalSubscriptions: allSubs.length,
    activeBillableMembers: blended.activeBillableMembers,
    failedPayments: failedPaymentSubs.length,
    overdueAccounts: overdueSubs.length,
    collectionsThisMonth,
    refundsThisMonth,
    cancelledThisMonth: cancelledThisMonth.length,
    revenueSource: blended.revenueSource,
    hasSubscriptionData: blended.hasSubscriptionData,
  };
}
