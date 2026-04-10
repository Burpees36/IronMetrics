import { Router, type IRouter } from "express";
import { eq, and, count, sql, gte, desc, asc } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, attendanceTable, leadsTable, classesTable, rsiSnapshotsTable, benchmarksTable, billingAuditLogsTable, dismissedInterventionsTable, aiOperatorSettingsTable } from "@workspace/db";
import { detectMilestonesForBriefing } from "../../services/milestone-detection";
import { computeRSI } from "./computations";
import { getGymMetrics, getRiskProfiles, getInterventions, computeRevenueForecast } from "./metrics";
import { computeBlendedMRR, computeBlendedEngagement, isActiveBillableMember } from "../../blendedMetrics";
import {
  generateRSIComponentInsight,
  generateRSIOverallInsight,
  generateRevenueForecastInsight,
  generateBenchmarkInsight,
  generateConversationalBriefingItem,
  generateConversationalSummary,
} from "./insights-copy-engine";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

async function getRsiTrendsFromSnapshots(gymId: number, currentScore: number | null) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const allSnapshots = await db.select()
    .from(rsiSnapshotsTable)
    .where(eq(rsiSnapshotsTable.gymId, gymId))
    .orderBy(asc(rsiSnapshotsTable.recordedAt));

  let trend30d: number | null = null;
  let trend90d: number | null = null;
  let trendInsufficient = false;

  if (currentScore === null || allSnapshots.length < 7) {
    trendInsufficient = true;
    return { trend30d, trend90d, trendInsufficient };
  }

  const snapshot30d = allSnapshots
    .filter(s => s.recordedAt <= thirtyDaysAgo)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

  const snapshot90d = allSnapshots
    .filter(s => s.recordedAt <= ninetyDaysAgo)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

  if (snapshot30d) {
    trend30d = Math.round((currentScore - parseFloat(snapshot30d.score)) * 10) / 10;
  } else {
    trendInsufficient = true;
  }

  if (snapshot90d) {
    trend90d = Math.round((currentScore - parseFloat(snapshot90d.score)) * 10) / 10;
  }

  return { trend30d, trend90d, trendInsufficient };
}

router.get("/gyms/:gymId/intelligence/rsi", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure, metrics.total);

    const { trend30d, trend90d, trendInsufficient } = await getRsiTrendsFromSnapshots(gymId, rsi.score);

    const rsiOverallInsight = generateRSIOverallInsight(rsi);
    const rsiComponentInsights = rsi.breakdown.map((item) => ({
      ...item,
      ...generateRSIComponentInsight(item, rsi.components),
    }));

    res.json({
      ...rsi,
      trend30d,
      trend90d,
      trendInsufficient,
      revenueSource: metrics.revenueSource,
      attendanceSource: metrics.attendanceSource,
      hasSubscriptionData: metrics.hasSubscriptionData,
      insight: rsiOverallInsight,
      componentInsights: rsiComponentInsights,
    });
  } catch (err) {
    console.error("[intelligence/rsi] Failed to compute RSI:", err);
    res.status(500).json({ error: "Failed to compute retention index. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/rsi/history", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const rawWindow = (req.query.window as string) || "90d";
    const window = rawWindow === "30d" || rawWindow === "90d" || rawWindow === "all" ? rawWindow : "90d";
    let daysBack = 90;
    if (window === "30d") daysBack = 30;
    else if (window === "all") daysBack = 3650;

    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const snapshots = await db.select({
      date: rsiSnapshotsTable.recordedAt,
      score: rsiSnapshotsTable.score,
      band: rsiSnapshotsTable.band,
    })
      .from(rsiSnapshotsTable)
      .where(and(
        eq(rsiSnapshotsTable.gymId, gymId),
        sql`${rsiSnapshotsTable.recordedAt} >= ${cutoff}`
      ))
      .orderBy(asc(rsiSnapshotsTable.recordedAt));

    res.json({
      window,
      dataPoints: snapshots.map(s => ({
        date: s.date,
        score: parseFloat(s.score),
        band: s.band,
      })),
      insufficient: snapshots.length < 7,
    });
  } catch (err) {
    console.error("[intelligence/rsi/history] Failed to fetch RSI history:", err);
    res.status(500).json({ error: "Failed to fetch RSI history." });
  }
});

router.get("/gyms/:gymId/intelligence/risk-radar", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const profiles = await getRiskProfiles(gymId);
    res.json(profiles);
  } catch (err) {
    console.error("[intelligence/risk-radar] Failed to generate risk profiles:", err);
    res.status(500).json({ error: "Failed to generate risk profiles. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/interventions", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const interventions = await getInterventions(gymId);
    res.json(interventions);
  } catch (err) {
    console.error("[intelligence/interventions] Failed to generate interventions:", err);
    res.status(500).json({ error: "Failed to generate interventions. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/dismissed-interventions", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const rows = await db.select({ interventionId: dismissedInterventionsTable.interventionId })
      .from(dismissedInterventionsTable)
      .where(eq(dismissedInterventionsTable.gymId, gymId));
    res.json(rows.map(r => r.interventionId));
  } catch (err) {
    console.error("[intelligence/dismissed-interventions] Failed to fetch:", err);
    res.status(500).json({ error: "Failed to fetch dismissed interventions." });
  }
});

router.post("/gyms/:gymId/intelligence/dismissed-interventions", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { interventionId } = req.body;
  if (!interventionId || typeof interventionId !== "string") {
    res.status(400).json({ error: "interventionId is required" });
    return;
  }

  try {
    await db.insert(dismissedInterventionsTable)
      .values({ gymId, interventionId })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    console.error("[intelligence/dismissed-interventions] Failed to dismiss:", err);
    res.status(500).json({ error: "Failed to dismiss intervention." });
  }
});

router.delete("/gyms/:gymId/intelligence/dismissed-interventions/:interventionId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const interventionId = req.params.interventionId;
  if (!interventionId) { res.status(400).json({ error: "interventionId is required" }); return; }

  try {
    await db.delete(dismissedInterventionsTable)
      .where(and(eq(dismissedInterventionsTable.gymId, gymId), eq(dismissedInterventionsTable.interventionId, interventionId)));
    res.json({ success: true });
  } catch (err) {
    console.error("[intelligence/dismissed-interventions] Failed to restore:", err);
    res.status(500).json({ error: "Failed to restore intervention." });
  }
});

router.get("/gyms/:gymId/intelligence/cohorts", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const members = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));

    const now = new Date();
    const monthBuckets: Record<string, typeof members> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      monthBuckets[key] = [];
    }

    for (const m of members) {
      if (!m.joinDate) continue;
      const joinMonth = new Date(m.joinDate).toISOString().slice(0, 7);
      if (monthBuckets[joinMonth] !== undefined) {
        monthBuckets[joinMonth].push(m);
      }
    }

    const allSubs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.gymId, gymId));
    const subAmountByMember: Record<number, number> = {};
    for (const s of allSubs) {
      subAmountByMember[s.memberId] = parseFloat(s.amount || "0");
    }

    const cohorts = Object.entries(monthBuckets).map(([month, cohortMembers]) => {
      const starting = cohortMembers.length;
      const stillActive = cohortMembers.filter(m => isActiveBillableMember(m.status)).length;
      const retRate = starting > 0 ? Math.round((stillActive / starting) * 1000) / 10 : 0;

      const cohortStart = new Date(month + "-01");
      const day30 = new Date(cohortStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const day60 = new Date(cohortStart.getTime() + 60 * 24 * 60 * 60 * 1000);

      const retained30d = starting > 0 ? cohortMembers.filter(m => {
        if (isActiveBillableMember(m.status)) return true;
        if (m.status === "cancelled" && m.updatedAt && new Date(m.updatedAt) > day30) return true;
        return false;
      }).length : 0;

      const retained60d = starting > 0 ? cohortMembers.filter(m => {
        if (isActiveBillableMember(m.status)) return true;
        if (m.status === "cancelled" && m.updatedAt && new Date(m.updatedAt) > day60) return true;
        return false;
      }).length : 0;

      const cohortRevenues = cohortMembers.map(m => subAmountByMember[m.id] ?? 0);
      const avgRevenue = starting > 0 ? Math.round((cohortRevenues.reduce((s, v) => s + v, 0) / starting) * 100) / 100 : 0;

      return {
        cohortMonth: month,
        startingMembers: starting,
        retained30d,
        retained60d,
        retained90d: stillActive,
        retained180d: stillActive,
        retained365d: 0,
        retentionRate30d: starting > 0 ? Math.round((retained30d / starting) * 1000) / 10 : 0,
        retentionRate90d: retRate,
        retentionRate365d: 0,
        avgRevenue,
      };
    });

    res.json(cohorts);
  } catch (err) {
    console.error("[intelligence/cohorts] Failed to generate cohort analysis:", err);
    res.status(500).json({ error: "Failed to generate cohort analysis. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/revenue-forecast", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const blendedMRR = await computeBlendedMRR(gymId);
    const currentMrr = blendedMRR.totalMRR;
    const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));
    const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
    const total = Number(totalCount?.count ?? 0);
    const churnRate = total > 0 ? Math.round(Number(cancelledCount?.count ?? 0) / total * 1000) / 10 : 0;

    const forecast = await computeRevenueForecast(gymId, currentMrr, churnRate, blendedMRR.activeBillableMembers);
    res.json(forecast);
  } catch (err) {
    console.error("[intelligence/revenue-forecast] Failed to generate forecast:", err);
    res.status(500).json({ error: "Failed to generate revenue forecast. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/overview", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure, metrics.total);
    const { trend30d, trend90d, trendInsufficient } = await getRsiTrendsFromSnapshots(gymId, rsi.score);
    const rsiOverallInsight = generateRSIOverallInsight(rsi);
    const rsiComponentInsights = rsi.breakdown.map((item) => ({
      ...item,
      ...generateRSIComponentInsight(item, rsi.components),
    }));

    const rsiData = {
      ...rsi,
      trend30d,
      trend90d,
      trendInsufficient,
      insight: rsiOverallInsight,
      componentInsights: rsiComponentInsights,
    };

    const risks = await getRiskProfiles(gymId);
    const interventions = await getInterventions(gymId);

    const currentMrr = metrics.totalRev;
    const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));
    const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
    const total = Number(totalCount?.count ?? 0);
    const churnRate = total > 0 ? Math.round(Number(cancelledCount?.count ?? 0) / total * 1000) / 10 : 0;
    const forecast = await computeRevenueForecast(gymId, currentMrr, churnRate, metrics.active);

    const openLeads = await db.select({ count: count() }).from(leadsTable).where(
      and(eq(leadsTable.gymId, gymId), sql`${leadsTable.stage} NOT IN ('converted', 'lost')`)
    );
    const openLeadCount = Number(openLeads[0]?.count ?? 0);
    const forecastInsight = generateRevenueForecastInsight(forecast, openLeadCount, churnRate, metrics.active);

    res.json({
      gymId,
      rsi: rsiData,
      topRisks: risks.slice(0, 5),
      topInterventions: interventions.slice(0, 3),
      revenueForecast: { ...forecast, insight: forecastInsight },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[intelligence/overview] Failed to generate overview:", err);
    res.status(500).json({ error: "Failed to generate intelligence overview. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/morning-briefing", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure, metrics.total);
    const risks = await getRiskProfiles(gymId);

    const criticalRisks = risks.filter(r => r.riskTier === "critical");
    const highRisks = risks.filter(r => r.riskTier === "high");
    const atRiskCount = criticalRisks.length + highRisks.length;
    const revenueAtRisk = risks.reduce((sum, r) => sum + r.revenueAtRisk, 0);

    const allLeads = await db.select().from(leadsTable).where(eq(leadsTable.gymId, gymId));
    const staleLeads = allLeads.filter(l => {
      if (l.stage === "converted" || l.stage === "lost") return false;
      const now = new Date();
      const lastContact = l.lastContactDate ? new Date(l.lastContactDate) : new Date(l.createdAt);
      const hours = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
      if (l.stage === "new" && hours > 24) return true;
      if (l.stage === "contacted" && hours > 72) return true;
      return false;
    });
    const activeLeads = allLeads.filter(l => l.stage !== "converted" && l.stage !== "lost");

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const newLeadsToday = allLeads.filter(l => new Date(l.createdAt) >= oneDayAgo && l.stage !== "converted" && l.stage !== "lost");

    const blendedEngagement = await computeBlendedEngagement(gymId);
    const engagementRate = blendedEngagement.engagementRate;

    const todayStr = now.toISOString().split("T")[0];
    const allClasses = await db.select().from(classesTable).where(eq(classesTable.gymId, gymId));
    const todayClasses = allClasses.filter(c => {
      const classDate = new Date(c.startTime).toISOString().split("T")[0];
      return classDate === todayStr;
    });
    const totalCapacity = todayClasses.reduce((sum, c) => sum + (c.capacity || 0), 0);
    const totalEnrolled = todayClasses.reduce((sum, c) => sum + (c.enrolled || 0), 0);
    const classFillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

    const items: { icon: string; priority: "critical" | "warning" | "info" | "positive"; message: string; action?: string; link?: string }[] = [];

    const oneDayAgoTS = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAutoSuspensions = await db
      .select({
        id: billingAuditLogsTable.id,
        memberId: billingAuditLogsTable.memberId,
        createdAt: billingAuditLogsTable.createdAt,
      })
      .from(billingAuditLogsTable)
      .where(
        and(
          eq(billingAuditLogsTable.gymId, gymId),
          eq(billingAuditLogsTable.action, "recovery.auto_suspended"),
          gte(billingAuditLogsTable.createdAt, oneDayAgoTS)
        )
      );

    const avgRevPerMember = metrics.active > 0 ? metrics.totalRev / metrics.active : 0;

    if (recentAutoSuspensions.length > 0) {
      const memberIds = recentAutoSuspensions.map(s => s.memberId).filter(Boolean);
      const suspendedMembers = memberIds.length > 0
        ? await db.select({ id: membersTable.id, firstName: membersTable.firstName, lastName: membersTable.lastName }).from(membersTable).where(
            and(eq(membersTable.gymId, gymId), sql`${membersTable.id} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`)
          )
        : [];
      const memberNames = suspendedMembers.map(m => `${m.firstName} ${m.lastName}`);
      const conversational = generateConversationalBriefingItem("auto_suspended", {
        count: recentAutoSuspensions.length,
        names: memberNames,
      });
      items.push({
        icon: "billing",
        priority: "warning",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (failedSubs.length > 0) {
      const failedRev = failedSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
      const conversational = generateConversationalBriefingItem("failed_payments", {
        count: failedSubs.length,
        amount: failedRev,
      });
      items.push({
        icon: "billing",
        priority: "critical",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (atRiskCount > 0) {
      const conversational = generateConversationalBriefingItem("at_risk_critical", {
        count: atRiskCount,
        amount: revenueAtRisk,
      });
      items.push({
        icon: "alert",
        priority: criticalRisks.length > 0 ? "critical" : "warning",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (staleLeads.length > 0) {
      const conversational = generateConversationalBriefingItem("stale_leads", {
        count: staleLeads.length,
        avgRevPerMember,
      });
      items.push({
        icon: "leads",
        priority: "warning",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (todayClasses.length > 0) {
      const conversational = generateConversationalBriefingItem("class_schedule", {
        classCount: todayClasses.length,
        classFillRate,
        enrolled: totalEnrolled,
        capacity: totalCapacity,
      });
      items.push({
        icon: "schedule",
        priority: classFillRate >= 80 ? "positive" : "info",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (activeLeads.length > 0 && staleLeads.length === 0) {
      const conversational = generateConversationalBriefingItem("active_leads", {
        count: activeLeads.length,
      });
      items.push({
        icon: "leads",
        priority: "info",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (rsi.band === "Strong") {
      const conversational = generateConversationalBriefingItem("rsi_strong", {
        rsiScore: rsi.score,
        rsiBand: rsi.band,
      });
      items.push({
        icon: "positive",
        priority: "positive",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    if (newLeadsToday.length > 0) {
      const conversational = generateConversationalBriefingItem("new_leads", {
        count: newLeadsToday.length,
      });
      items.push({
        icon: "leads",
        priority: "positive",
        message: conversational.message,
        action: conversational.action,
        link: conversational.link,
      });
    }

    const briefingSnapshot = {
      activeMembers: metrics.active,
      mrr: Math.round(metrics.totalRev),
      rsiScore: rsi.score,
      rsiBand: rsi.band,
      atRiskMembers: atRiskCount,
      atRiskCritical: criticalRisks.length,
      atRiskHigh: highRisks.length,
      revenueAtRisk: Math.round(revenueAtRisk),
      engagementRate,
      staleLeads: staleLeads.length,
      newLeads: newLeadsToday.length,
      activeLeads: activeLeads.length,
      failedPayments: failedSubs.length,
      todayClasses: todayClasses.length,
      classFillRate,
    };
    const summary = generateConversationalSummary(briefingSnapshot);

    let celebrations: { type: string; memberName: string; detail: string }[] = [];
    try {
      const [opSettings] = await db.select().from(aiOperatorSettingsTable).where(eq(aiOperatorSettingsTable.gymId, gymId));
      const cooldown = opSettings?.cooldownCelebrations ?? 90;
      const milestones = await detectMilestonesForBriefing(gymId);
      celebrations = milestones.map((m) => ({
        type: m.milestoneType,
        memberName: `${m.memberFirstName} ${m.memberLastName}`,
        detail: m.detail,
      }));
    } catch (err: any) {
      console.error("[intelligence/morning-briefing] Celebration detection error:", err.message);
    }

    if (celebrations.length > 0) {
      items.push({
        icon: "celebration",
        priority: "positive",
        message: `${celebrations.length} member milestone${celebrations.length !== 1 ? "s" : ""} today — birthdays, anniversaries, and wins worth celebrating.`,
        action: "View celebrations",
        link: "/ai-insights",
      });
    }

    res.json({
      date: todayStr,
      summary,
      items: items.sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
        return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      }),
      snapshot: {
        activeMembers: metrics.active,
        mrr: Math.round(metrics.totalRev),
        rsiScore: rsi.score,
        rsiBand: rsi.band,
        atRiskMembers: atRiskCount,
        atRiskCritical: criticalRisks.length,
        atRiskHigh: highRisks.length,
        revenueAtRisk: Math.round(revenueAtRisk),
        engagementRate,
        staleLeads: staleLeads.length,
        newLeads: newLeadsToday.length,
        activeLeads: activeLeads.length,
        failedPayments: failedSubs.length,
        todayClasses: todayClasses.length,
        classFillRate,
      },
      celebrations,
    });
  } catch (err) {
    console.error("[intelligence/morning-briefing] Failed to generate briefing:", err);
    res.status(500).json({ error: "Failed to generate morning briefing. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/benchmarks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure, metrics.total);
    const engagement = await computeBlendedEngagement(gymId);

    const activeMemberCount = metrics.active;
    const sizeSegment = activeMemberCount < 100 ? "small" : activeMemberCount <= 250 ? "medium" : "large";
    const sizeLabel = sizeSegment === "small" ? "Small (<100 members)" : sizeSegment === "medium" ? "Medium (100-250 members)" : "Large (250+ members)";

    const latestBenchmarks = await db
      .select()
      .from(benchmarksTable)
      .where(eq(benchmarksTable.sizeSegment, sizeSegment))
      .orderBy(desc(benchmarksTable.computedAt))
      .limit(5);

    const mostRecentDate = latestBenchmarks.length > 0 ? latestBenchmarks[0].computedAt : null;
    const currentBenchmarks = mostRecentDate
      ? latestBenchmarks.filter(b => b.computedAt?.getTime() === mostRecentDate.getTime())
      : [];

    const sampleCount = currentBenchmarks.length > 0 ? currentBenchmarks[0].sampleCount : 0;
    const insufficientData = sampleCount < 5;

    const gymValues: Record<string, number> = {
      rsiScore: rsi.score,
      churnRate: metrics.churnRate,
      avgRevPerMember: metrics.avgRev,
      avgTenure: metrics.avgTenure,
      engagementRate: engagement.engagementRate,
    };

    const metricLabels: Record<string, string> = {
      rsiScore: "RSI Score",
      churnRate: "Churn Rate",
      avgRevPerMember: "Avg Revenue/Member",
      avgTenure: "Avg Tenure (months)",
      engagementRate: "Engagement Rate",
    };

    const metricFormats: Record<string, string> = {
      rsiScore: "score",
      churnRate: "percent",
      avgRevPerMember: "currency",
      avgTenure: "months",
      engagementRate: "percent",
    };

    const lowerIsBetter: Record<string, boolean> = {
      rsiScore: false,
      churnRate: true,
      avgRevPerMember: false,
      avgTenure: false,
      engagementRate: false,
    };

    function computePercentileRank(value: number, benchmarkRow: typeof currentBenchmarks[0] | undefined, metric: string): number | null {
      if (!benchmarkRow || insufficientData) return null;
      const p25 = parseFloat(benchmarkRow.p25 || "0");
      const p50 = parseFloat(benchmarkRow.p50 || "0");
      const p75 = parseFloat(benchmarkRow.p75 || "0");
      const p90 = parseFloat(benchmarkRow.p90 || "0");

      let rank: number;
      if (value <= p25) rank = 25 * (value / Math.max(p25, 0.01));
      else if (value <= p50) rank = 25 + 25 * ((value - p25) / Math.max(p50 - p25, 0.01));
      else if (value <= p75) rank = 50 + 25 * ((value - p50) / Math.max(p75 - p50, 0.01));
      else if (value <= p90) rank = 75 + 15 * ((value - p75) / Math.max(p90 - p75, 0.01));
      else rank = 90 + 10 * Math.min(1, (value - p90) / Math.max(p90 * 0.2, 0.01));

      if (lowerIsBetter[metric]) rank = 100 - rank;
      return Math.round(Math.max(0, Math.min(100, rank)));
    }

    function getPercentileLabel(rank: number | null): string | null {
      if (rank === null) return null;
      if (rank >= 85) return "Top 15%";
      if (rank >= 75) return "Top 25%";
      if (rank >= 50) return "Above Average";
      if (rank >= 25) return "Below Average";
      return "Bottom 25%";
    }

    const comparisons = Object.keys(gymValues).map(metric => {
      const benchmarkRow = currentBenchmarks.find(b => b.metric === metric);
      const gymValue = gymValues[metric];
      const percentileRank = computePercentileRank(gymValue, benchmarkRow, metric);
      const percentileLabel = getPercentileLabel(percentileRank);
      const industryMedian = benchmarkRow && !insufficientData ? parseFloat(benchmarkRow.p50 || "0") : null;

      const insight = generateBenchmarkInsight({
        metric,
        gymValue,
        industryMedian,
        percentileRank,
        label: metricLabels[metric],
        format: metricFormats[metric],
        lowerIsBetter: lowerIsBetter[metric],
      });

      return {
        metric,
        label: metricLabels[metric],
        format: metricFormats[metric],
        gymValue,
        industryMedian,
        p25: benchmarkRow && !insufficientData ? parseFloat(benchmarkRow.p25 || "0") : null,
        p75: benchmarkRow && !insufficientData ? parseFloat(benchmarkRow.p75 || "0") : null,
        p90: benchmarkRow && !insufficientData ? parseFloat(benchmarkRow.p90 || "0") : null,
        percentileRank,
        percentileLabel,
        lowerIsBetter: lowerIsBetter[metric] ?? false,
        insight,
      };
    });

    res.json({
      gymId,
      sizeSegment,
      sizeLabel,
      sampleCount,
      insufficientData,
      insufficientMessage: insufficientData ? "Not enough data yet — benchmarks require at least 5 gyms in your size category." : null,
      computedAt: mostRecentDate?.toISOString() ?? null,
      comparisons,
    });
  } catch (err) {
    console.error("[intelligence/benchmarks] Failed to compute benchmarks:", err);
    res.status(500).json({ error: "Failed to compute benchmarks. Please try again." });
  }
});

function buildBriefingSummary(
  atRisk: number, staleLeads: number, failedPayments: number,
  mrr: number, rsi: { score: number; band: string },
  todayClasses: number, classFillRate: number
): string {
  const parts: string[] = [];

  if (atRisk > 0) {
    parts.push(`${atRisk} member${atRisk > 1 ? "s" : ""} need${atRisk === 1 ? "s" : ""} attention`);
  }
  if (failedPayments > 0) {
    parts.push(`${failedPayments} payment${failedPayments > 1 ? "s" : ""} to recover`);
  }
  if (staleLeads > 0) {
    parts.push(`${staleLeads} stale lead${staleLeads > 1 ? "s" : ""}`);
  }
  if (todayClasses > 0) {
    parts.push(`today's classes are ${classFillRate}% full`);
  }

  if (parts.length === 0) {
    const rsiStr = rsi.score !== null ? `RSI: ${rsi.score.toFixed(1)} (${rsi.band})` : "RSI: No Data";
    return `All clear — your gym is running smoothly. ${rsiStr}, MRR: $${mrr.toLocaleString()}.`;
  }

  const actionPart = parts.join(", ");
  const rsiStr = rsi.score !== null ? `RSI: ${rsi.score.toFixed(1)} (${rsi.band})` : "RSI: No Data";
  return `${actionPart.charAt(0).toUpperCase() + actionPart.slice(1)}. MRR: $${Math.round(mrr).toLocaleString()}, ${rsiStr}.`;
}

export default router;
