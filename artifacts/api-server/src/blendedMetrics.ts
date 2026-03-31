import { eq, and, count, gte, sql, notInArray, inArray } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, attendanceTable } from "@workspace/db";

export const BILLABLE_STATUSES = ["active"] as const;

export function isActiveBillableMember(status: string): boolean {
  return (BILLABLE_STATUSES as readonly string[]).includes(status);
}

export function activeMemberCondition(table: typeof membersTable) {
  if (BILLABLE_STATUSES.length === 1) {
    return eq(table.status, BILLABLE_STATUSES[0]);
  }
  return inArray(table.status, [...BILLABLE_STATUSES]);
}

export interface BlendedMRRResult {
  totalMRR: number;
  subscriptionMRR: number;
  wodifyMRR: number;
  activeSubscriptionCount: number;
  activeBillableMembers: number;
  arm: number;
  revenueSource: "subscriptions_only" | "wodify_only" | "blended";
  hasSubscriptionData: boolean;
}

export async function computeBlendedMRR(gymId: number): Promise<BlendedMRRResult> {
  const activeSubs = await db
    .select({
      memberId: subscriptionsTable.memberId,
      amount: subscriptionsTable.amount,
    })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));

  const subscriptionMRR = activeSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
  const coveredMemberIds = activeSubs.map(s => s.memberId);

  let wodifyMRR = 0;

  if (coveredMemberIds.length > 0) {
    const uncoveredMembers = await db
      .select({ monthlyRevenue: membersTable.monthlyRevenue })
      .from(membersTable)
      .where(and(
        eq(membersTable.gymId, gymId),
        activeMemberCondition(membersTable),
        sql`${membersTable.monthlyRevenue} IS NOT NULL`,
        sql`CAST(${membersTable.monthlyRevenue} AS numeric) > 0`,
        notInArray(membersTable.id, coveredMemberIds),
      ));
    wodifyMRR = uncoveredMembers.reduce((sum, m) => sum + parseFloat(m.monthlyRevenue || "0"), 0);
  } else {
    const allWodifyMembers = await db
      .select({ monthlyRevenue: membersTable.monthlyRevenue })
      .from(membersTable)
      .where(and(
        eq(membersTable.gymId, gymId),
        activeMemberCondition(membersTable),
        sql`${membersTable.monthlyRevenue} IS NOT NULL`,
        sql`CAST(${membersTable.monthlyRevenue} AS numeric) > 0`,
      ));
    wodifyMRR = allWodifyMembers.reduce((sum, m) => sum + parseFloat(m.monthlyRevenue || "0"), 0);
  }

  const [activeBillableResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));

  const activeBillableMembers = Number(activeBillableResult?.count ?? 0);
  const totalMRR = subscriptionMRR + wodifyMRR;
  const arm = activeBillableMembers > 0 ? totalMRR / activeBillableMembers : 0;

  const [anySubResult] = await db
    .select({ count: count() })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.gymId, gymId));
  const hasSubscriptionData = Number(anySubResult?.count ?? 0) > 0;
  let revenueSource: BlendedMRRResult["revenueSource"];
  if (hasSubscriptionData && wodifyMRR > 0) revenueSource = "blended";
  else if (hasSubscriptionData) revenueSource = "subscriptions_only";
  else revenueSource = "wodify_only";

  return {
    totalMRR,
    subscriptionMRR,
    wodifyMRR,
    activeSubscriptionCount: activeSubs.length,
    activeBillableMembers,
    arm,
    revenueSource,
    hasSubscriptionData,
  };
}

export interface BlendedEngagementResult {
  engagementRate: number;
  engagementChange: number;
  attendanceSource: "attendance_table" | "wodify_summary" | "mixed" | "none";
  engagedThisWeek: number;
  engagedPriorWeek: number;
  totalActive: number;
}

export async function computeBlendedEngagement(gymId: number): Promise<BlendedEngagementResult> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [activeResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));
  const totalActive = Number(activeResult?.count ?? 0);

  if (totalActive === 0) {
    return { engagementRate: 0, engagementChange: 0, attendanceSource: "none", engagedThisWeek: 0, engagedPriorWeek: 0, totalActive: 0 };
  }

  const weeklyAttendance = await db
    .select({ memberId: attendanceTable.memberId })
    .from(attendanceTable)
    .where(and(eq(attendanceTable.gymId, gymId), gte(attendanceTable.checkinTime, weekAgo)));
  const attendanceTableMemberIds = new Set(weeklyAttendance.map(a => a.memberId));

  const priorWeekAttendance = await db
    .select({ memberId: attendanceTable.memberId })
    .from(attendanceTable)
    .where(and(
      eq(attendanceTable.gymId, gymId),
      gte(attendanceTable.checkinTime, twoWeeksAgo),
      sql`${attendanceTable.checkinTime} < ${weekAgo}`,
    ));
  const priorAttendanceTableMemberIds = new Set(priorWeekAttendance.map(a => a.memberId));

  const hasAttendanceRecords = attendanceTableMemberIds.size > 0 || priorAttendanceTableMemberIds.size > 0;

  const allAttendanceMemberIds = await db
    .select({ memberId: attendanceTable.memberId })
    .from(attendanceTable)
    .where(eq(attendanceTable.gymId, gymId));
  const membersWithAnyAttendance = new Set(allAttendanceMemberIds.map(a => a.memberId));

  const wodifyActiveMembers = await db
    .select({
      id: membersTable.id,
      lastVisitDate: membersTable.lastVisitDate,
      daysSinceLastAttendance: membersTable.daysSinceLastAttendance,
    })
    .from(membersTable)
    .where(and(
      eq(membersTable.gymId, gymId),
      activeMemberCondition(membersTable),
    ));

  let engagedThisWeek = attendanceTableMemberIds.size;
  let engagedPriorWeek = priorAttendanceTableMemberIds.size;

  for (const m of wodifyActiveMembers) {
    if (membersWithAnyAttendance.has(m.id)) {
      continue;
    }

    if (m.daysSinceLastAttendance !== null) {
      if (m.daysSinceLastAttendance <= 7) {
        engagedThisWeek++;
      } else if (m.daysSinceLastAttendance <= 14) {
        engagedPriorWeek++;
      }
    } else if (m.lastVisitDate) {
      const daysSince = Math.floor((now.getTime() - new Date(m.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) {
        engagedThisWeek++;
      } else if (daysSince <= 14) {
        engagedPriorWeek++;
      }
    }
  }

  const engagementRate = totalActive > 0 ? Math.round((engagedThisWeek / totalActive) * 1000) / 10 : 0;
  const priorEngagementRate = totalActive > 0 ? Math.round((engagedPriorWeek / totalActive) * 1000) / 10 : 0;
  const engagementChange = Math.round((engagementRate - priorEngagementRate) * 10) / 10;

  const hasWodifyEngagement = wodifyActiveMembers.some(m =>
    !membersWithAnyAttendance.has(m.id) &&
    (m.daysSinceLastAttendance !== null || m.lastVisitDate !== null)
  );

  let attendanceSource: BlendedEngagementResult["attendanceSource"];
  if (hasAttendanceRecords && hasWodifyEngagement) attendanceSource = "mixed";
  else if (hasAttendanceRecords) attendanceSource = "attendance_table";
  else if (hasWodifyEngagement) attendanceSource = "wodify_summary";
  else attendanceSource = "none";

  return {
    engagementRate,
    engagementChange,
    attendanceSource,
    engagedThisWeek,
    engagedPriorWeek,
    totalActive,
  };
}

export interface BlendedGymMetrics {
  mrr: BlendedMRRResult;
  engagement: BlendedEngagementResult;
  activeBillableMembers: number;
  totalMembers: number;
  cancelledMembers: number;
  holdMembers: number;
  churnRate: number;
  netGrowth: number;
  avgTenure: number;
  avgRevPerMember: number;
}

export async function getBlendedGymMetrics(gymId: number): Promise<BlendedGymMetrics> {
  const mrr = await computeBlendedMRR(gymId);
  const engagement = await computeBlendedEngagement(gymId);

  const [cancelledResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [holdResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));
  const [totalResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));

  const cancelledMembers = Number(cancelledResult?.count ?? 0);
  const holdMembers = Number(holdResult?.count ?? 0);
  const totalMembers = Number(totalResult?.count ?? 0);
  const churnRate = totalMembers > 0 ? Math.round((cancelledMembers / totalMembers) * 1000) / 10 : 0;
  const netGrowth = mrr.activeBillableMembers - cancelledMembers;

  const now = new Date();
  const allMembers = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));
  const tenures = allMembers
    .filter(m => m.joinDate || m.createdAt)
    .map(m => {
      const end = m.status === "cancelled" && m.updatedAt ? new Date(m.updatedAt) : now;
      const start = new Date(m.joinDate || m.createdAt!);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    });
  const avgTenure = tenures.length > 0 ? Math.round((tenures.reduce((s, t) => s + t, 0) / tenures.length) * 10) / 10 : 0;

  return {
    mrr,
    engagement,
    activeBillableMembers: mrr.activeBillableMembers,
    totalMembers,
    cancelledMembers,
    holdMembers,
    churnRate,
    netGrowth,
    avgTenure,
    avgRevPerMember: mrr.arm,
  };
}

export function getMemberRevenueFromMembersTable(member: { monthlyRevenue: string | null }): number {
  if (!member.monthlyRevenue) return 0;
  const val = parseFloat(member.monthlyRevenue);
  return isNaN(val) ? 0 : val;
}
