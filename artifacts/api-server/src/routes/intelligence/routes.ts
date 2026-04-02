import { Router, type IRouter } from "express";
import { eq, and, count, sql, gte, desc, asc } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, attendanceTable, leadsTable, classesTable, rsiSnapshotsTable } from "@workspace/db";
import { computeRSI } from "./computations";
import { getGymMetrics, getRiskProfiles, getInterventions, computeRevenueForecast } from "./metrics";
import { computeBlendedMRR, computeBlendedEngagement, isActiveBillableMember } from "../../blendedMetrics";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

async function getRsiTrendsFromSnapshots(gymId: number, currentScore: number) {
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

  if (allSnapshots.length < 7) {
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
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);

    const { trend30d, trend90d, trendInsufficient } = await getRsiTrendsFromSnapshots(gymId, rsi.score);

    res.json({
      ...rsi,
      trend30d,
      trend90d,
      trendInsufficient,
      revenueSource: metrics.revenueSource,
      attendanceSource: metrics.attendanceSource,
      hasSubscriptionData: metrics.hasSubscriptionData,
      insight: rsi.band === "Strong"
        ? "Your gym is showing strong retention. Keep focus on onboarding quality."
        : rsi.band === "Moderate"
        ? "Some retention pressure building. Review at-risk members and recent cancellation patterns."
        : "Retention is fragile. Prioritize outreach to at-risk members and review billing failures immediately.",
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
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);
    const { trend30d, trend90d, trendInsufficient } = await getRsiTrendsFromSnapshots(gymId, rsi.score);
    const rsiData = {
      ...rsi,
      trend30d,
      trend90d,
      trendInsufficient,
      insight: rsi.band === "Strong"
        ? "Your gym is showing strong retention. Keep focus on onboarding quality."
        : rsi.band === "Moderate"
        ? "Some retention pressure building. Review at-risk members and recent cancellation patterns."
        : "Retention is fragile. Prioritize outreach to at-risk members and review billing failures immediately.",
    };

    const risks = await getRiskProfiles(gymId);
    const interventions = await getInterventions(gymId);

    const currentMrr = metrics.totalRev;
    const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));
    const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
    const total = Number(totalCount?.count ?? 0);
    const churnRate = total > 0 ? Math.round(Number(cancelledCount?.count ?? 0) / total * 1000) / 10 : 0;
    const forecast = await computeRevenueForecast(gymId, currentMrr, churnRate, metrics.active);

    res.json({
      gymId,
      rsi: rsiData,
      topRisks: risks.slice(0, 5),
      topInterventions: interventions.slice(0, 3),
      revenueForecast: forecast,
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
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);
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

    if (failedSubs.length > 0) {
      const failedRev = failedSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
      items.push({
        icon: "billing",
        priority: "critical",
        message: `${failedSubs.length} failed payment${failedSubs.length > 1 ? "s" : ""} totaling $${Math.round(failedRev)}/mo need recovery`,
        action: "Go to Billing",
        link: "/billing",
      });
    }

    if (staleLeads.length > 0) {
      items.push({
        icon: "leads",
        priority: "warning",
        message: `${staleLeads.length} lead${staleLeads.length > 1 ? "s" : ""} went stale — follow up before they go cold`,
        action: "Open Pipeline",
        link: "/leads",
      });
    }

    if (todayClasses.length > 0) {
      items.push({
        icon: "schedule",
        priority: classFillRate >= 80 ? "positive" : "info",
        message: `${todayClasses.length} class${todayClasses.length > 1 ? "es" : ""} today at ${classFillRate}% capacity (${totalEnrolled}/${totalCapacity} spots filled)`,
        action: "View Schedule",
        link: "/schedule",
      });
    }

    if (activeLeads.length > 0 && staleLeads.length === 0) {
      items.push({
        icon: "leads",
        priority: "info",
        message: `${activeLeads.length} active lead${activeLeads.length > 1 ? "s" : ""} in your pipeline`,
        link: "/leads",
      });
    }

    if (rsi.band === "Strong") {
      items.push({
        icon: "positive",
        priority: "positive",
        message: `RSI is ${rsi.score.toFixed(1)} (Strong) — your business is in great shape. Invest in your systems and don't get complacent.`,
      });
    }

    if (newLeadsToday.length > 0) {
      items.push({
        icon: "leads",
        priority: "positive",
        message: `${newLeadsToday.length} new lead${newLeadsToday.length > 1 ? "s" : ""} in the last 24 hours`,
        action: "View Leads",
        link: "/leads",
      });
    }

    const summary = buildBriefingSummary(atRiskCount, staleLeads.length, failedSubs.length, metrics.totalRev, rsi, todayClasses.length, classFillRate);

    res.json({
      date: todayStr,
      summary,
      items: items.sort((a, b) => {
        const priorityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
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
    });
  } catch (err) {
    console.error("[intelligence/morning-briefing] Failed to generate briefing:", err);
    res.status(500).json({ error: "Failed to generate morning briefing. Please try again." });
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
    return `All clear — your gym is running smoothly. RSI: ${rsi.score.toFixed(1)} (${rsi.band}), MRR: $${mrr.toLocaleString()}.`;
  }

  const actionPart = parts.join(", ");
  return `${actionPart.charAt(0).toUpperCase() + actionPart.slice(1)}. MRR: $${Math.round(mrr).toLocaleString()}, RSI: ${rsi.score.toFixed(1)} (${rsi.band}).`;
}

export default router;
