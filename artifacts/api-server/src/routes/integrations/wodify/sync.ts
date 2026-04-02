import { eq, and, sql } from "drizzle-orm";
import { db, membersTable, syncRunsTable, timelineEventsTable, gymsTable, mrrSnapshotsTable, membershipPlansTable } from "@workspace/db";
import { createWodifyClient } from "./client";
import type { PageProgressCallback } from "./client";
import { isWodifySentinelDate, normalizeWodifyStatus } from "./types";
import type { WodifyClient, WodifyMembership } from "./types";
import { normalizePhone } from "../../members/import-utils";
import { computeBlendedMRR } from "../../../blendedMetrics";

export interface SyncProgress {
  phase: "fetching-clients" | "fetching-memberships" | "processing" | "writing" | "complete" | "failed";
  currentPage?: number;
  totalItemsFetched?: number;
  processed?: number;
  totalToProcess?: number;
  created?: number;
  updated?: number;
  message: string;
}

async function updateSyncProgress(syncRunId: number, progress: SyncProgress) {
  try {
    const [current] = await db.select({ metadata: syncRunsTable.metadata })
      .from(syncRunsTable).where(eq(syncRunsTable.id, syncRunId));
    const existing = (current?.metadata as Record<string, unknown>) || {};
    await db.update(syncRunsTable).set({
      metadata: { ...existing, progress } as Record<string, unknown>,
    }).where(eq(syncRunsTable.id, syncRunId));
  } catch (_) {}
}

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
  daysSinceLastAttendance: number | null;
  isAtRisk: boolean;
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
    daysSinceLastAttendance: client.days_since_last_attendance ?? null,
    isAtRisk: client.is_at_risk ?? false,
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
  totalMrr: number;
  errors: { rowIndex: number; error: string; wodifyClientId?: number }[];
}

export async function runWodifySync(
  gymId: number,
  apiKey: string,
  triggeredBy: string,
  existingSyncRunId?: number,
): Promise<SyncResult> {
  let syncRunId: number;
  if (existingSyncRunId) {
    syncRunId = existingSyncRunId;
  } else {
    const [newRun] = await db.insert(syncRunsTable).values({
      gymId,
      source: "wodify-api",
      status: "running",
      totalRows: 0,
      triggeredBy,
    }).returning();
    syncRunId = newRun.id;
  }
  const syncRun = { id: syncRunId };

  const result: SyncResult = {
    syncRunId: syncRun.id,
    status: "running",
    totalClients: 0,
    totalMemberships: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errored: 0,
    totalMrr: 0,
    errors: [],
  };

  let rowIndex = 0;

  try {
    const client = createWodifyClient(apiKey);

    await updateSyncProgress(syncRun.id, {
      phase: "fetching-clients",
      currentPage: 1,
      totalItemsFetched: 0,
      message: "Fetching members from Wodify...",
    });

    const wodifyClients = await client.fetchAllClients((info) => {
      updateSyncProgress(syncRun.id, {
        phase: "fetching-clients",
        currentPage: info.page,
        totalItemsFetched: info.totalSoFar,
        message: info.done
          ? `Fetched ${info.totalSoFar} members`
          : `Fetching members page ${info.page} (${info.totalSoFar} so far)...`,
      });
    });

    await updateSyncProgress(syncRun.id, {
      phase: "fetching-memberships",
      currentPage: 1,
      totalItemsFetched: 0,
      message: "Fetching memberships from Wodify...",
    });

    const wodifyMemberships = await client.fetchAllMemberships((info) => {
      updateSyncProgress(syncRun.id, {
        phase: "fetching-memberships",
        currentPage: info.page,
        totalItemsFetched: info.totalSoFar,
        message: info.done
          ? `Fetched ${info.totalSoFar} memberships`
          : `Fetching memberships page ${info.page} (${info.totalSoFar} so far)...`,
      });
    });

    result.totalClients = wodifyClients.length;
    result.totalMemberships = wodifyMemberships.length;

    await updateSyncProgress(syncRun.id, {
      phase: "processing",
      totalToProcess: wodifyClients.length,
      processed: 0,
      message: `Processing ${wodifyClients.length} members...`,
    });

    await db.update(syncRunsTable).set({
      totalRows: wodifyClients.length,
    }).where(eq(syncRunsTable.id, syncRun.id));

    const membershipMap = consolidateMemberships(wodifyMemberships);

    let totalMrr = 0;
    for (const summary of membershipMap.values()) {
      totalMrr += summary.monthlyRevenue;
    }
    result.totalMrr = Math.round(totalMrr * 100) / 100;

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
      rowIndex++;
      if (rowIndex % 25 === 0 || rowIndex === wodifyClients.length) {
        await updateSyncProgress(syncRun.id, {
          phase: "writing",
          processed: rowIndex,
          totalToProcess: wodifyClients.length,
          created: result.created,
          updated: result.updated,
          message: `Writing member ${rowIndex} of ${wodifyClients.length}...`,
        });
      }
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
            daysSinceLastAttendance: normalized.daysSinceLastAttendance,
            isAtRisk: normalized.isAtRisk,
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
            daysSinceLastAttendance: normalized.daysSinceLastAttendance,
            isAtRisk: normalized.isAtRisk,
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
            rowIndex,
            error: err.message || "Unexpected error",
            wodifyClientId: normalized.wodifyClientId,
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

    const completeProgress: SyncProgress = {
      phase: "complete",
      processed: result.totalClients,
      totalToProcess: result.totalClients,
      created: result.created,
      updated: result.updated,
      message: `Sync complete: ${result.created} created, ${result.updated} updated`,
    };

    await db.update(syncRunsTable).set({
      status: result.status,
      created: result.created,
      skipped: result.skipped,
      errored: result.errored,
      totalRows: result.totalClients,
      errorDetails: result.errors.length > 0 ? result.errors.slice(0, 50) : null,
      completedAt: new Date(),
      metadata: {
        totalClients: result.totalClients,
        totalMemberships: result.totalMemberships,
        updated: result.updated,
        totalMrr: result.totalMrr,
        progress: completeProgress,
      },
    }).where(eq(syncRunsTable.id, syncRun.id));

    if (result.status === "completed" || result.status === "completed_with_errors") {
      try {
        const mrrData = await computeBlendedMRR(gymId);
        const today = new Date().toISOString().split("T")[0];
        await db.insert(mrrSnapshotsTable).values({
          gymId,
          snapshotDate: today,
          totalMRR: mrrData.totalMRR.toFixed(2),
          subscriptionMRR: mrrData.subscriptionMRR.toFixed(2),
          wodifyMRR: mrrData.wodifyMRR.toFixed(2),
          activeMemberCount: mrrData.activeBillableMembers,
          arm: mrrData.arm.toFixed(2),
          revenueSource: mrrData.revenueSource,
        }).onConflictDoUpdate({
          target: [mrrSnapshotsTable.gymId, mrrSnapshotsTable.snapshotDate],
          set: {
            totalMRR: mrrData.totalMRR.toFixed(2),
            subscriptionMRR: mrrData.subscriptionMRR.toFixed(2),
            wodifyMRR: mrrData.wodifyMRR.toFixed(2),
            activeMemberCount: mrrData.activeBillableMembers,
            arm: mrrData.arm.toFixed(2),
            revenueSource: mrrData.revenueSource,
            createdAt: new Date(),
          },
        });
      } catch (snapshotErr: unknown) {
        const msg = snapshotErr instanceof Error ? snapshotErr.message : String(snapshotErr);
        console.error(`[MRR Snapshot] Failed to save snapshot for gym ${gymId}:`, msg);
      }

      try {
        const allMembers = await db.select({
          membershipType: membersTable.membershipType,
          monthlyRevenue: membersTable.monthlyRevenue,
        }).from(membersTable).where(eq(membersTable.gymId, gymId));

        const planMap = new Map<string, number>();
        for (const m of allMembers) {
          if (!m.membershipType) continue;
          const name = m.membershipType.trim();
          if (!name) continue;
          const rev = Number(m.monthlyRevenue) || 0;
          const existing = planMap.get(name);
          if (existing === undefined || rev > existing) {
            planMap.set(name, rev);
          }
        }

        const existingPlans = await db.select({ name: membershipPlansTable.name })
          .from(membershipPlansTable)
          .where(eq(membershipPlansTable.gymId, gymId));
        const existingNames = new Set(existingPlans.map((p) => p.name.toLowerCase()));

        for (const [planName, price] of planMap) {
          if (existingNames.has(planName.toLowerCase())) continue;
          await db.insert(membershipPlansTable).values({
            gymId,
            name: planName,
            price: price.toFixed(2),
            billingInterval: "monthly",
            isActive: true,
          });
        }
      } catch (planErr: unknown) {
        const msg = planErr instanceof Error ? planErr.message : String(planErr);
        console.error(`[Auto Plans] Failed to create plans for gym ${gymId}:`, msg);
      }
    }

  } catch (err: any) {
    result.status = "failed";
    const failedProgress: SyncProgress = {
      phase: "failed",
      message: err.message || "Sync failed",
    };
    await db.update(syncRunsTable).set({
      status: "failed",
      errorDetails: [{ rowIndex: 0, error: err.message || "Sync failed" }],
      completedAt: new Date(),
      metadata: { progress: failedProgress },
    }).where(eq(syncRunsTable.id, syncRun.id));
  }

  return result;
}
