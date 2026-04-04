import { eq, and, sql, desc, gte } from "drizzle-orm";
import {
  db,
  membersTable,
  attendanceTable,
  classesTable,
  subscriptionsTable,
  workoutResultsTable,
  workoutsTable,
  leadsTable,
  leadActivitiesTable,
} from "@workspace/db";

export interface MemberContext {
  firstName: string;
  lastName: string;
  tenureMonths: number;
  daysSinceLastVisit: number | null;
  attendanceLast30d: number;
  attendancePrior30d: number;
  attendanceTrend: "declining" | "stable" | "improving";
  favoriteClassName: string | null;
  favoriteTimeSlot: string | null;
  lastCoachName: string | null;
  recentPRs: { workoutTitle: string; result: string }[];
  planName: string | null;
  riskTier: string | null;
}

export interface LeadContext {
  firstName: string;
  lastName: string;
  source: string | null;
  daysSinceCreated: number;
  stage: string;
  notes: string | null;
  followUpNote: string | null;
  nextFollowUpDate: string | null;
  activityCount: number;
}

export interface PersonalizationMeta {
  dataPoints: string[];
  hooks: string[];
}

export async function assembleMemberContext(memberId: number, gymId: number): Promise<MemberContext | null> {
  const [member] = await db.select().from(membersTable).where(
    and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId))
  );
  if (!member) return null;

  const now = new Date();

  const tenureMonths = member.joinDate
    ? Math.max(1, Math.floor((now.getTime() - new Date(member.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  const daysSinceLastVisit = member.lastVisitDate
    ? Math.floor((now.getTime() - new Date(member.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : (member.daysSinceLastAttendance ?? null);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentAttendance = await db.select({
    className: attendanceTable.className,
    checkinTime: attendanceTable.checkinTime,
  }).from(attendanceTable).where(
    and(
      eq(attendanceTable.memberId, memberId),
      eq(attendanceTable.gymId, gymId),
      gte(attendanceTable.checkinTime, sixtyDaysAgo)
    )
  );

  const last30d = recentAttendance.filter(a => new Date(a.checkinTime) >= thirtyDaysAgo);
  const prior30d = recentAttendance.filter(a => new Date(a.checkinTime) < thirtyDaysAgo);
  const attendanceLast30d = last30d.length;
  const attendancePrior30d = prior30d.length;

  let attendanceTrend: "declining" | "stable" | "improving" = "stable";
  if (attendancePrior30d > 0) {
    const ratio = attendanceLast30d / attendancePrior30d;
    if (ratio < 0.7) attendanceTrend = "declining";
    else if (ratio > 1.3) attendanceTrend = "improving";
  } else if (attendanceLast30d > 0) {
    attendanceTrend = "improving";
  }

  const classNameCounts: Record<string, number> = {};
  const hourCounts: Record<string, number> = {};
  for (const a of recentAttendance) {
    if (a.className) {
      classNameCounts[a.className] = (classNameCounts[a.className] || 0) + 1;
    }
    const hour = new Date(a.checkinTime).getHours();
    const slot = hour < 9 ? "early morning" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    hourCounts[slot] = (hourCounts[slot] || 0) + 1;
  }

  const favoriteClassName = Object.entries(classNameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteTimeSlot = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  let lastCoachName: string | null = null;
  const lastAttendanceWithClass = await db.select({
    classId: attendanceTable.classId,
  }).from(attendanceTable).where(
    and(
      eq(attendanceTable.memberId, memberId),
      eq(attendanceTable.gymId, gymId),
      sql`${attendanceTable.classId} IS NOT NULL`
    )
  ).orderBy(desc(attendanceTable.checkinTime)).limit(1);

  if (lastAttendanceWithClass.length > 0 && lastAttendanceWithClass[0].classId) {
    const [cls] = await db.select({ coachName: classesTable.coachName })
      .from(classesTable).where(eq(classesTable.id, lastAttendanceWithClass[0].classId));
    if (cls?.coachName) lastCoachName = cls.coachName;
  }

  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const prResults = await db.select({
    result: workoutResultsTable.result,
    workoutTitle: workoutsTable.title,
  }).from(workoutResultsTable)
    .innerJoin(workoutsTable, eq(workoutResultsTable.workoutId, workoutsTable.id))
    .where(
      and(
        eq(workoutResultsTable.memberId, memberId),
        eq(workoutResultsTable.gymId, gymId),
        eq(workoutResultsTable.isPr, true),
        gte(workoutResultsTable.createdAt, ninetyDaysAgo)
      )
    ).limit(5);

  let planName: string | null = null;
  const [activeSub] = await db.select({ planName: subscriptionsTable.planName })
    .from(subscriptionsTable).where(
      and(eq(subscriptionsTable.memberId, memberId), eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active"))
    ).limit(1);
  if (activeSub) planName = activeSub.planName;

  return {
    firstName: member.firstName,
    lastName: member.lastName,
    tenureMonths,
    daysSinceLastVisit,
    attendanceLast30d,
    attendancePrior30d,
    attendanceTrend,
    favoriteClassName,
    favoriteTimeSlot,
    lastCoachName,
    recentPRs: prResults.map(r => ({ workoutTitle: r.workoutTitle, result: r.result })),
    planName,
    riskTier: member.riskTier,
  };
}

export async function assembleLeadContext(leadId: number, gymId: number): Promise<LeadContext | null> {
  const [lead] = await db.select().from(leadsTable).where(
    and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId))
  );
  if (!lead) return null;

  const now = new Date();
  const daysSinceCreated = Math.floor((now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const activities = await db.select({ id: leadActivitiesTable.id })
    .from(leadActivitiesTable).where(eq(leadActivitiesTable.leadId, leadId));

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    source: lead.source,
    daysSinceCreated,
    stage: lead.stage,
    notes: lead.notes,
    followUpNote: lead.followUpNote,
    nextFollowUpDate: lead.nextFollowUpDate,
    activityCount: activities.length,
  };
}

export function buildMemberPersonalizationMeta(ctx: MemberContext): PersonalizationMeta {
  const dataPoints: string[] = [];
  const hooks: string[] = [];

  if (ctx.tenureMonths > 0) {
    dataPoints.push(`Member for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""}`);
  }
  if (ctx.daysSinceLastVisit !== null) {
    dataPoints.push(`Last visit: ${ctx.daysSinceLastVisit} day${ctx.daysSinceLastVisit !== 1 ? "s" : ""} ago`);
  }
  if (ctx.favoriteClassName) {
    dataPoints.push(`Favorite class: ${ctx.favoriteClassName}`);
    hooks.push(`class-based`);
  }
  if (ctx.favoriteTimeSlot) {
    dataPoints.push(`Preferred time: ${ctx.favoriteTimeSlot}`);
  }
  if (ctx.lastCoachName) {
    dataPoints.push(`Last coach: ${ctx.lastCoachName}`);
    hooks.push(`coach-based`);
  }
  if (ctx.attendanceTrend !== "stable") {
    dataPoints.push(`Attendance trend: ${ctx.attendanceTrend} (${ctx.attendancePrior30d} → ${ctx.attendanceLast30d} visits)`);
    hooks.push(`trend-based`);
  }
  if (ctx.recentPRs.length > 0) {
    dataPoints.push(`Recent PRs: ${ctx.recentPRs.length}`);
    hooks.push(`milestone-based`);
  }
  if (ctx.planName) {
    dataPoints.push(`Plan: ${ctx.planName}`);
  }

  return { dataPoints, hooks };
}

export function buildLeadPersonalizationMeta(ctx: LeadContext): PersonalizationMeta {
  const dataPoints: string[] = [];
  const hooks: string[] = [];

  if (ctx.source) {
    dataPoints.push(`Source: ${ctx.source}`);
    hooks.push(`source-based`);
  }
  dataPoints.push(`Inquired ${ctx.daysSinceCreated} day${ctx.daysSinceCreated !== 1 ? "s" : ""} ago`);
  dataPoints.push(`Pipeline stage: ${ctx.stage}`);

  if (ctx.notes) {
    dataPoints.push(`Has notes on file`);
    hooks.push(`interest-based`);
  }
  if (ctx.nextFollowUpDate) {
    dataPoints.push(`Follow-up scheduled: ${ctx.nextFollowUpDate}`);
  }
  if (ctx.activityCount > 0) {
    dataPoints.push(`${ctx.activityCount} recorded interaction${ctx.activityCount !== 1 ? "s" : ""}`);
  }

  return { dataPoints, hooks };
}
