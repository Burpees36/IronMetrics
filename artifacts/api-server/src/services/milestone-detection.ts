import { eq, and, sql, desc } from "drizzle-orm";
import { db, membersTable, aiTasksTable } from "@workspace/db";

export type MilestoneType = "birthday" | "anniversary" | "attendance_milestone" | "streak" | "comeback";

export interface DetectedMilestone {
  memberId: number;
  memberFirstName: string;
  memberLastName: string;
  milestoneType: MilestoneType;
  detail: string;
  value?: number;
}

const ATTENDANCE_MILESTONES = [50, 100, 200, 500, 1000];
const STREAK_MILESTONES = [4, 8, 12, 26, 52];
const COMEBACK_THRESHOLD_DAYS = 30;

async function getRecentCelebrationSubtypes(
  gymId: number,
  memberId: number,
  cooldownDays: number
): Promise<Set<string>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cooldownDays);

  const recentSent = await db
    .select({ subtype: aiTasksTable.subtype })
    .from(aiTasksTable)
    .where(
      and(
        eq(aiTasksTable.gymId, gymId),
        eq(aiTasksTable.type, "celebration"),
        eq(aiTasksTable.targetId, memberId),
        eq(aiTasksTable.targetType, "member"),
        eq(aiTasksTable.status, "sent"),
        sql`${aiTasksTable.createdAt} >= ${cutoff.toISOString()}`
      )
    );

  const openTasks = await db
    .select({ subtype: aiTasksTable.subtype })
    .from(aiTasksTable)
    .where(
      and(
        eq(aiTasksTable.gymId, gymId),
        eq(aiTasksTable.type, "celebration"),
        eq(aiTasksTable.targetId, memberId),
        eq(aiTasksTable.targetType, "member"),
        sql`${aiTasksTable.status} IN ('pending', 'approved')`
      )
    );

  const subtypes = new Set<string>();
  for (const r of recentSent) {
    if (r.subtype) subtypes.add(r.subtype);
  }
  for (const r of openTasks) {
    if (r.subtype) subtypes.add(r.subtype);
  }
  return subtypes;
}

function isBirthdayToday(birthDate: string | null): boolean {
  if (!birthDate) return false;
  const today = new Date();
  const bd = new Date(birthDate + "T00:00:00");
  return bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate();
}

function isAnniversaryToday(joinDate: string | null): { isAnniversary: boolean; years: number } {
  if (!joinDate) return { isAnniversary: false, years: 0 };
  const today = new Date();
  const jd = new Date(joinDate + "T00:00:00");
  if (jd.getMonth() !== today.getMonth() || jd.getDate() !== today.getDate()) {
    return { isAnniversary: false, years: 0 };
  }
  const years = today.getFullYear() - jd.getFullYear();
  if (years < 1) return { isAnniversary: false, years: 0 };
  return { isAnniversary: true, years };
}

function checkAttendanceMilestone(totalSignIns: number | null): number | null {
  if (totalSignIns == null) return null;
  for (const milestone of ATTENDANCE_MILESTONES) {
    if (totalSignIns >= milestone && totalSignIns < milestone + 3) {
      return milestone;
    }
  }
  return null;
}

function checkStreakMilestone(weekstreak: number | null): number | null {
  if (weekstreak == null) return null;
  for (const milestone of STREAK_MILESTONES) {
    if (weekstreak === milestone) {
      return milestone;
    }
  }
  return null;
}

function isComeback(
  daysSinceLastAttendance: number | null,
  attendanceCount30d: number | null,
  totalClassSignIns: number | null,
  joinDate: string | null,
  currentWeekstreak: number | null
): boolean {
  if (daysSinceLastAttendance == null || attendanceCount30d == null) return false;
  if (totalClassSignIns == null || totalClassSignIns < 10) return false;
  if (joinDate) {
    const membershipDays = (Date.now() - new Date(joinDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24);
    if (membershipDays < 90) return false;
  }
  if (daysSinceLastAttendance > 7) return false;
  if (attendanceCount30d !== 1) return false;
  if (currentWeekstreak != null && currentWeekstreak > 1) return false;
  return true;
}

export async function detectMilestones(
  gymId: number,
  cooldownDays: number = 90
): Promise<DetectedMilestone[]> {
  const members = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

  const milestones: DetectedMilestone[] = [];

  for (const member of members) {
    const recentSubtypes = await getRecentCelebrationSubtypes(gymId, member.id, cooldownDays);

    if (!recentSubtypes.has("birthday") && isBirthdayToday(member.birthDate)) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "birthday",
        detail: "Birthday today",
      });
    }

    if (!recentSubtypes.has("anniversary")) {
      const { isAnniversary, years } = isAnniversaryToday(member.joinDate);
      if (isAnniversary) {
        milestones.push({
          memberId: member.id,
          memberFirstName: member.firstName,
          memberLastName: member.lastName,
          milestoneType: "anniversary",
          detail: `${years}-year membership anniversary`,
          value: years,
        });
      }
    }

    if (!recentSubtypes.has("attendance_milestone")) {
      const milestone = checkAttendanceMilestone(member.totalClassSignIns);
      if (milestone) {
        milestones.push({
          memberId: member.id,
          memberFirstName: member.firstName,
          memberLastName: member.lastName,
          milestoneType: "attendance_milestone",
          detail: `Reached ${milestone} total class sign-ins`,
          value: milestone,
        });
      }
    }

    if (!recentSubtypes.has("streak")) {
      const streakMilestone = checkStreakMilestone(member.currentWeekstreak);
      if (streakMilestone) {
        milestones.push({
          memberId: member.id,
          memberFirstName: member.firstName,
          memberLastName: member.lastName,
          milestoneType: "streak",
          detail: `${streakMilestone}-week attendance streak`,
          value: streakMilestone,
        });
      }
    }

    if (!recentSubtypes.has("comeback") && isComeback(member.daysSinceLastAttendance, member.attendanceCount30d, member.totalClassSignIns, member.joinDate, member.currentWeekstreak)) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "comeback",
        detail: "Returned after 30+ days of inactivity",
      });
    }
  }

  return milestones;
}

export async function detectMilestonesForBriefing(
  gymId: number
): Promise<DetectedMilestone[]> {
  const members = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

  const milestones: DetectedMilestone[] = [];

  for (const member of members) {
    if (isBirthdayToday(member.birthDate)) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "birthday",
        detail: "Birthday today",
      });
    }

    const { isAnniversary, years } = isAnniversaryToday(member.joinDate);
    if (isAnniversary) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "anniversary",
        detail: `${years}-year membership anniversary`,
        value: years,
      });
    }

    const milestone = checkAttendanceMilestone(member.totalClassSignIns);
    if (milestone) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "attendance_milestone",
        detail: `Reached ${milestone} total class sign-ins`,
        value: milestone,
      });
    }

    const streakMilestone = checkStreakMilestone(member.currentWeekstreak);
    if (streakMilestone) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "streak",
        detail: `${streakMilestone}-week attendance streak`,
        value: streakMilestone,
      });
    }

    if (isComeback(member.daysSinceLastAttendance, member.attendanceCount30d, member.totalClassSignIns, member.joinDate, member.currentWeekstreak)) {
      milestones.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        milestoneType: "comeback",
        detail: "Returned after 30+ days of inactivity",
      });
    }
  }

  return milestones;
}
