import { eq, and } from "drizzle-orm";
import { db, membersTable, syncRunsTable, timelineEventsTable, gymsTable } from "@workspace/db";
import { createWodifyClient } from "./client";
import { isWodifySentinelDate, normalizeWodifyStatus } from "./types";
import type { WodifyClient, WodifyMembership } from "./types";
import { normalizePhone } from "../../members/import-utils";

interface MemberUpsert {
  wodifyClientId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  joinDate: string | null;
  lastVisitDate: Date | null;
  birthDate: string | null;
  membershipType: string | null;
  monthlyRevenue: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  tags: string[];
  totalClassSignIns: number;
  currentWeekstreak: number;
}

function parseWodifyDate(val: string | null | undefined): string | null {
  if (!val || isWodifySentinelDate(val)) return null;
  const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function parseWodifyTimestamp(val: string | null | undefined): Date | null {
  if (!val || isWodifySentinelDate(val)) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function titleCase(s: string): string {
  if (!s) return "";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeClient(client: WodifyClient): MemberUpsert | null {
  if (!client.id || !client.email?.trim()) return null;

  const tags: string[] = [];
  if (Array.isArray(client.tags)) {
    tags.push(...client.tags.filter(Boolean));
  }
  if (client.is_email_subscribed === false) tags.push("email-opt-out");
  if (client.is_sms_subscribed === false) tags.push("sms-opt-out");

  const lastAttendance = parseWodifyTimestamp(client.last_attendance);
  const lastClassSignIn = parseWodifyTimestamp(client.last_class_sign_in);
  let lastVisitDate = lastAttendance;
  if (lastClassSignIn && (!lastVisitDate || lastClassSignIn > lastVisitDate)) {
    lastVisitDate = lastClassSignIn;
  }

  return {
    wodifyClientId: client.id,
    firstName: (client.first_name || "").trim(),
    lastName: (client.last_name || "").trim(),
    email: client.email.toLowerCase().trim(),
    phone: client.phone_number?.trim() ? normalizePhone(client.phone_number.trim()) : null,
    status: normalizeWodifyStatus(client.client_status || "Active"),
    joinDate: parseWodifyDate(client.member_since),
    lastVisitDate,
    birthDate: parseWodifyDate(client.date_of_birth),
    membershipType: null,
    monthlyRevenue: null,
    emergencyContactName: client.emergency_contact_name?.trim()
      ? titleCase(client.emergency_contact_name.trim())
      : null,
    emergencyContactPhone: client.emergency_contact_phone?.trim()
      ? normalizePhone(client.emergency_contact_phone.trim())
      : null,
    tags,
    totalClassSignIns: client.total_class_sign_ins ?? 0,
    currentWeekstreak: client.current_weekstreak ?? 0,
  };
}

function normalizeToMonthly(cost: number, intervalUnit: string, intervalLength: number): number {
  if (cost === 0) return 0;
  const unit = intervalUnit.replace(/\(s\)$/i, "").trim().toLowerCase();
  const totalPerInterval = cost;
  switch (unit) {
    case "week":
      return Math.round((totalPerInterval * (52 / 12) / intervalLength) * 100) / 100;
    case "month":
      return Math.round((totalPerInterval / intervalLength) * 100) / 100;
    case "quarter":
      return Math.round((totalPerInterval / (3 * intervalLength)) * 100) / 100;
    case "year":
      return Math.round((totalPerInterval / (12 * intervalLength)) * 100) / 100;
    default:
      return Math.round(totalPerInterval * 100) / 100;
  }
}

interface MembershipSummary {
  primaryMembershipName: string | null;
  monthlyRevenue: number;
}

export function consolidateMemberships(
  memberships: WodifyMembership[],
): Map<number, MembershipSummary> {
  const byClient = new Map<number, WodifyMembership[]>();
  for (const m of memberships) {
    if (!m.is_active || m.is_deleted) continue;
    const list = byClient.get(m.client_id) || [];
    list.push(m);
    byClient.set(m.client_id, list);
  }

  const result = new Map<number, MembershipSummary>();

  for (const [clientId, clientMemberships] of byClient) {
    let totalMrr = 0;
    let primaryName: string | null = null;
    let primaryRevenue = -1;

    for (const m of clientMemberships) {
      let cost = 0;
      let intervalUnit = "";
      let intervalLength = 1;

      if (m.payment_plan) {
        if (m.payment_plan.is_auto_renew && m.payment_plan.renewal_payment_option) {
          cost = m.payment_plan.renewal_payment_option.renewal_cost ?? 0;
          intervalUnit = (m.payment_plan.renewal_payment_interval_time_unit || "").toLowerCase();
          intervalLength = m.payment_plan.renewal_payment_interval_length || 1;
        } else if (m.payment_plan.initial_payment_option) {
          cost = m.payment_plan.initial_payment_option.initial_cost ?? 0;
          intervalUnit = (m.payment_plan.initial_payment_interval_time_unit || "").toLowerCase();
          intervalLength = m.payment_plan.initial_payment_interval_length || 1;
        }
      }

      const monthlyCost = normalizeToMonthly(cost, intervalUnit, intervalLength);
      totalMrr += monthlyCost;
      if (monthlyCost > primaryRevenue) {
        primaryRevenue = monthlyCost;
        primaryName = m.name || m.payment_plan?.payment_plan_name || "Unknown";
      }
    }

    if (primaryName === null && clientMemberships.length > 0) {
      primaryName = clientMemberships[0].name || "Complimentary";
    }

    result.set(clientId, {
      primaryMembershipName: primaryName,
      monthlyRevenue: Math.round(totalMrr * 100) / 100,
    });
  }

  return result;
}

export interface SyncResult {
  syncRunId: number;
  status: string;
  totalClients: number;
  totalMemberships: number;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
  errors: { wodifyClientId: number; error: string }[];
}

export async function runWodifySync(
  gymId: number,
  apiKey: string,
  triggeredBy: string,
): Promise<SyncResult> {
  const [syncRun] = await db.insert(syncRunsTable).values({
    gymId,
    source: "wodify-api",
    status: "running",
    totalRows: 0,
    triggeredBy,
  }).returning();

  const result: SyncResult = {
    syncRunId: syncRun.id,
    status: "running",
    totalClients: 0,
    totalMemberships: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errored: 0,
    errors: [],
  };

  try {
    const client = createWodifyClient(apiKey);

    const [wodifyClients, wodifyMemberships] = await Promise.all([
      client.fetchAllClients(),
      client.fetchAllMemberships(),
    ]);

    result.totalClients = wodifyClients.length;
    result.totalMemberships = wodifyMemberships.length;

    await db.update(syncRunsTable).set({
      totalRows: wodifyClients.length,
      metadata: {
        totalClients: wodifyClients.length,
        totalMemberships: wodifyMemberships.length,
      },
    }).where(eq(syncRunsTable.id, syncRun.id));

    const membershipMap = consolidateMemberships(wodifyMemberships);

    const existingMembers = await db
      .select({
        id: membersTable.id,
        email: membersTable.email,
        wodifyClientId: membersTable.wodifyClientId,
      })
      .from(membersTable)
      .where(eq(membersTable.gymId, gymId));

    const byWodifyId = new Map<number, number>();
    const byEmail = new Map<string, number>();
    for (const m of existingMembers) {
      if (m.wodifyClientId) byWodifyId.set(m.wodifyClientId, m.id);
      byEmail.set(m.email.toLowerCase(), m.id);
    }

    const today = new Date().toISOString().split("T")[0];

    for (const wClient of wodifyClients) {
      const normalized = normalizeClient(wClient);
      if (!normalized) {
        result.skipped++;
        continue;
      }

      const mSummary = membershipMap.get(normalized.wodifyClientId);
      if (mSummary) {
        normalized.membershipType = mSummary.primaryMembershipName;
        normalized.monthlyRevenue = String(mSummary.monthlyRevenue);
      }

      let existingId = byWodifyId.get(normalized.wodifyClientId);
      if (!existingId) {
        const emailMatch = byEmail.get(normalized.email);
        if (emailMatch) {
          const existingWodifyId = existingMembers.find(m => m.id === emailMatch)?.wodifyClientId;
          if (!existingWodifyId) {
            existingId = emailMatch;
          } else {
            result.skipped++;
            continue;
          }
        }
      }

      try {
        if (existingId) {
          await db.update(membersTable).set({
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            email: normalized.email,
            phone: normalized.phone ?? undefined,
            status: normalized.status,
            membershipType: normalized.membershipType ?? undefined,
            joinDate: normalized.joinDate ?? undefined,
            lastVisitDate: normalized.lastVisitDate ?? undefined,
            birthDate: normalized.birthDate ?? undefined,
            emergencyContactName: normalized.emergencyContactName ?? undefined,
            emergencyContactPhone: normalized.emergencyContactPhone ?? undefined,
            tags: normalized.tags,
            wodifyClientId: normalized.wodifyClientId,
            monthlyRevenue: normalized.monthlyRevenue ?? undefined,
            totalClassSignIns: normalized.totalClassSignIns,
            currentWeekstreak: normalized.currentWeekstreak,
          }).where(eq(membersTable.id, existingId));
          result.updated++;
        } else {
          const [newMember] = await db.insert(membersTable).values({
            gymId,
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            email: normalized.email,
            phone: normalized.phone,
            status: normalized.status,
            membershipType: normalized.membershipType,
            joinDate: normalized.joinDate ?? today,
            lastVisitDate: normalized.lastVisitDate,
            birthDate: normalized.birthDate,
            emergencyContactName: normalized.emergencyContactName,
            emergencyContactPhone: normalized.emergencyContactPhone,
            tags: normalized.tags,
            wodifyClientId: normalized.wodifyClientId,
            monthlyRevenue: normalized.monthlyRevenue,
            totalClassSignIns: normalized.totalClassSignIns,
            currentWeekstreak: normalized.currentWeekstreak,
          }).returning();

          byEmail.set(normalized.email, newMember.id);
          byWodifyId.set(normalized.wodifyClientId, newMember.id);

          try {
            await db.insert(timelineEventsTable).values({
              memberId: newMember.id,
              gymId,
              type: "imported",
              title: "Imported from Wodify API",
              description: `${normalized.firstName} ${normalized.lastName} was synced via Wodify API`,
              date: new Date(),
            });
          } catch (_) {}

          result.created++;
        }
      } catch (err: any) {
        result.errored++;
        if (result.errors.length < 50) {
          result.errors.push({
            wodifyClientId: normalized.wodifyClientId,
            error: err.message || "Unexpected error",
          });
        }
      }
    }

    result.status =
      result.errored > 0 && result.created === 0 && result.updated === 0
        ? "failed"
        : result.errored > 0
          ? "completed_with_errors"
          : "completed";

    await db.update(syncRunsTable).set({
      status: result.status,
      created: result.created,
      skipped: result.skipped,
      errored: result.errored,
      totalRows: result.totalClients,
      errorDetails: result.errors.length > 0 ? result.errors.slice(0, 50) as any : null,
      completedAt: new Date(),
      metadata: {
        totalClients: result.totalClients,
        totalMemberships: result.totalMemberships,
        updated: result.updated,
      },
    }).where(eq(syncRunsTable.id, syncRun.id));

  } catch (err: any) {
    result.status = "failed";
    await db.update(syncRunsTable).set({
      status: "failed",
      errorDetails: [{ rowIndex: 0, error: err.message || "Sync failed" }] as any,
      completedAt: new Date(),
    }).where(eq(syncRunsTable.id, syncRun.id));
  }

  return result;
}
