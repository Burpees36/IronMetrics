import { eq, and, sql, gte, desc } from "drizzle-orm";
import { db, gymsTable, gymStaffTable, aiOperatorSettingsTable, aiTasksTable } from "@workspace/db";
import { sendMorningBriefingEmail } from "../services/briefing-email";
import { sendBriefingSms } from "../services/briefing-sms";
import { detectMilestonesForBriefing } from "../services/milestone-detection";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
const lastRunPerGym = new Map<number, string>();

async function getMorningBriefingData(gymId: number): Promise<any> {
  try {
    const { getGymMetrics, getRiskProfiles } = await import("../routes/intelligence/metrics");
    const { computeRSI } = await import("../routes/intelligence/computations");
    const { computeBlendedEngagement } = await import("../blendedMetrics");
    const { generateConversationalSummary } = await import("../routes/intelligence/insights-copy-engine");
    const { leadsTable, subscriptionsTable, classesTable } = await import("@workspace/db");

    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure, metrics.total);
    const risks = await getRiskProfiles(gymId);

    const criticalRisks = risks.filter((r: any) => r.riskTier === "critical");
    const highRisks = risks.filter((r: any) => r.riskTier === "high");
    const atRiskCount = criticalRisks.length + highRisks.length;
    const revenueAtRisk = risks.reduce((sum: number, r: any) => sum + r.revenueAtRisk, 0);

    const allLeads = await db.select().from(leadsTable).where(eq(leadsTable.gymId, gymId));
    const staleLeads = allLeads.filter((l: any) => {
      if (l.stage === "converted" || l.stage === "lost") return false;
      const now = new Date();
      const lastContact = l.lastContactDate ? new Date(l.lastContactDate) : new Date(l.createdAt);
      const hours = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
      if (l.stage === "new" && hours > 24) return true;
      if (l.stage === "contacted" && hours > 72) return true;
      return false;
    });
    const activeLeads = allLeads.filter((l: any) => l.stage !== "converted" && l.stage !== "lost");
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const newLeadsToday = allLeads.filter((l: any) => new Date(l.createdAt) >= oneDayAgo && l.stage !== "converted" && l.stage !== "lost");

    const blendedEngagement = await computeBlendedEngagement(gymId);

    const todayStr = now.toISOString().split("T")[0];
    const allClasses = await db.select().from(classesTable).where(eq(classesTable.gymId, gymId));
    const todayClasses = allClasses.filter((c: any) => {
      const classDate = new Date(c.startTime).toISOString().split("T")[0];
      return classDate === todayStr;
    });
    const totalCapacity = todayClasses.reduce((sum: number, c: any) => sum + (c.capacity || 0), 0);
    const totalEnrolled = todayClasses.reduce((sum: number, c: any) => sum + (c.enrolled || 0), 0);
    const classFillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    const failedSubs = await db.select().from(subscriptionsTable).where(
      and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due"))
    );

    const snapshot = {
      activeMembers: metrics.active,
      mrr: Math.round(metrics.totalRev),
      rsiScore: rsi.score,
      rsiBand: rsi.band,
      atRiskMembers: atRiskCount,
      atRiskCritical: criticalRisks.length,
      atRiskHigh: highRisks.length,
      revenueAtRisk: Math.round(revenueAtRisk),
      engagementRate: blendedEngagement.engagementRate,
      staleLeads: staleLeads.length,
      newLeads: newLeadsToday.length,
      activeLeads: activeLeads.length,
      failedPayments: failedSubs.length,
      todayClasses: todayClasses.length,
      classFillRate,
    };

    const summary = generateConversationalSummary(snapshot);

    const { generateConversationalBriefingItem } = await import("../routes/intelligence/insights-copy-engine");
    const items: any[] = [];

    if (failedSubs.length > 0) {
      const failedRev = failedSubs.reduce((sum: number, s: any) => sum + parseFloat(s.amount || "0"), 0);
      const conv = generateConversationalBriefingItem("failed_payments", { count: failedSubs.length, amount: failedRev });
      items.push({ icon: "billing", priority: "critical", message: conv.message, action: conv.action, link: conv.link });
    }

    if (atRiskCount > 0) {
      const conv = generateConversationalBriefingItem("at_risk_critical", { count: atRiskCount, amount: revenueAtRisk });
      items.push({ icon: "alert", priority: criticalRisks.length > 0 ? "critical" : "warning", message: conv.message, action: conv.action, link: conv.link });
    }

    if (staleLeads.length > 0) {
      const avgRevPerMember = metrics.active > 0 ? metrics.totalRev / metrics.active : 0;
      const conv = generateConversationalBriefingItem("stale_leads", { count: staleLeads.length, avgRevPerMember });
      items.push({ icon: "leads", priority: "warning", message: conv.message, action: conv.action, link: conv.link });
    }

    if (newLeadsToday.length > 0) {
      const conv = generateConversationalBriefingItem("new_leads", { count: newLeadsToday.length });
      items.push({ icon: "leads", priority: "positive", message: conv.message, action: conv.action, link: conv.link });
    }

    return { summary, items, snapshot };
  } catch (err: any) {
    console.error(`[briefing-scheduler] Failed to build briefing data for gym ${gymId}:`, err.message);
    return null;
  }
}

async function getOvernightAutopilotActions(gymId: number): Promise<any[]> {
  const lastRun = lastRunPerGym.get(gymId);
  const sinceDate = lastRun
    ? new Date(lastRun + "T00:00:00")
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sentTasks = await db
    .select({ type: aiTasksTable.type })
    .from(aiTasksTable)
    .where(
      and(
        eq(aiTasksTable.gymId, gymId),
        eq(aiTasksTable.autoSent, true),
        gte(aiTasksTable.updatedAt, sinceDate)
      )
    );

  const typeCounts: Record<string, number> = {};
  for (const t of sentTasks) {
    typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
  }

  const descriptions: Record<string, string> = {
    outreach: "Win-back emails sent",
    billing: "Payment recovery follow-ups",
    leads: "Lead follow-up messages",
    celebration: "Celebration messages sent",
  };

  return Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count,
    description: descriptions[type] || `${type} tasks auto-sent`,
  }));
}

async function processBriefingForGym(gymId: number): Promise<void> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) return;

  const [settings] = await db.select().from(aiOperatorSettingsTable).where(eq(aiOperatorSettingsTable.gymId, gymId));
  if (!settings) return;
  if (!settings.briefingEmailEnabled && !settings.briefingSmsEnabled) return;

  const now = new Date();
  let gymLocalDate: string;
  let gymLocalHour: number;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: gym.timezone || "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === "year")?.value || "";
    const month = parts.find(p => p.type === "month")?.value || "";
    const day = parts.find(p => p.type === "day")?.value || "";
    gymLocalDate = `${year}-${month}-${day}`;
    gymLocalHour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  } catch {
    gymLocalDate = now.toISOString().split("T")[0];
    gymLocalHour = now.getHours();
  }

  const lastRun = lastRunPerGym.get(gymId);
  if (lastRun === gymLocalDate) return;

  if (gymLocalHour < settings.briefingDeliveryHour) return;

  lastRunPerGym.set(gymId, gymLocalDate);

  const ownerStaff = await db
    .select()
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, gym.ownerId)))
    .limit(1);

  const ownerEmail = ownerStaff[0]?.email || gym.email;
  if (!ownerEmail && settings.briefingEmailEnabled) {
    console.warn(`[briefing-scheduler] No owner email found for gym ${gymId}, skipping email briefing`);
  }

  const briefingData = await getMorningBriefingData(gymId);
  if (!briefingData) return;

  const overnightActions = await getOvernightAutopilotActions(gymId);
  const milestones = await detectMilestonesForBriefing(gymId);
  const celebrations = milestones.map((m) => ({
    type: m.milestoneType,
    memberName: `${m.memberFirstName} ${m.memberLastName}`,
    detail: m.detail,
    memberId: m.memberId,
  }));

  const dashboardUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/`
    : "https://app.ironmetrics.com/";

  const branding = {
    name: gym.name,
    fromEmail: gym.fromEmail,
    fromName: gym.fromName,
    logoUrl: gym.logoUrl,
    email: gym.email,
    phone: gym.phone,
  };

  if (settings.briefingEmailEnabled && ownerEmail) {
    try {
      const result = await sendMorningBriefingEmail(ownerEmail, {
        summary: briefingData.summary,
        items: briefingData.items,
        snapshot: briefingData.snapshot,
        overnightActions,
        celebrations,
        dashboardUrl,
      }, branding);

      if (result.success) {
        console.log(`[briefing-scheduler] Morning briefing email sent to ${ownerEmail} for gym ${gymId}`);
      } else {
        console.error(`[briefing-scheduler] Failed to send email for gym ${gymId}:`, result.error);
      }
    } catch (err: any) {
      console.error(`[briefing-scheduler] Email error for gym ${gymId}:`, err.message);
    }
  }

  if (settings.briefingSmsEnabled) {
    const ownerPhone = gym.phone;
    if (ownerPhone) {
      try {
        const result = await sendBriefingSms(
          ownerPhone,
          gym.name,
          briefingData.snapshot,
          dashboardUrl,
          gym
        );
        if (result.success) {
          console.log(`[briefing-scheduler] Morning briefing SMS sent for gym ${gymId}`);
        } else {
          console.error(`[briefing-scheduler] Failed to send SMS for gym ${gymId}:`, result.error);
        }
      } catch (err: any) {
        console.error(`[briefing-scheduler] SMS error for gym ${gymId}:`, err.message);
      }
    }
  }
}

async function runBriefingCheck(): Promise<void> {
  try {
    const gyms = await db.select({ id: gymsTable.id }).from(gymsTable);
    for (const gym of gyms) {
      try {
        await processBriefingForGym(gym.id);
      } catch (err: any) {
        console.error(`[briefing-scheduler] Error processing gym ${gym.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[briefing-scheduler] Failed to fetch gyms:", err.message);
  }
}

export function startBriefingScheduler(): void {
  if (schedulerTimer) {
    console.warn("[briefing-scheduler] Already running, skipping duplicate start.");
    return;
  }

  console.log("[briefing-scheduler] Morning briefing scheduler started (checks every 15 minutes)");

  schedulerTimer = setInterval(async () => {
    try {
      await runBriefingCheck();
    } catch (err: any) {
      console.error("[briefing-scheduler] Unhandled error:", err.message);
    }
  }, 15 * 60 * 1000);
}

export function stopBriefingScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[briefing-scheduler] Scheduler stopped.");
  }
}
