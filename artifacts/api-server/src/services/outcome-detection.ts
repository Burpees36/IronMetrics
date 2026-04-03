import { eq, and, sql, isNull, ne } from "drizzle-orm";
import { db, aiTasksTable, membersTable, subscriptionsTable, leadsTable } from "@workspace/db";

const OBSERVATION_WINDOW_DAYS = 30;

interface OutcomeResult {
  taskId: number;
  outcome: string;
  revenueImpact: string | null;
}

async function detectOutreachOutcome(task: any): Promise<OutcomeResult | null> {
  if (!task.targetId || task.targetType !== "member") return null;

  const [member] = await db.select().from(membersTable).where(
    and(eq(membersTable.id, task.targetId), eq(membersTable.gymId, task.gymId))
  );
  if (!member) {
    return { taskId: task.id, outcome: "no_change", revenueImpact: null };
  }

  const actionedAt = new Date(task.actionedAt);
  const now = new Date();
  const daysSinceAction = Math.floor((now.getTime() - actionedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (member.lastVisitDate) {
    const lastVisit = new Date(member.lastVisitDate);
    if (lastVisit > actionedAt) {
      const monthlyRevenue = member.monthlyRevenue ? parseFloat(member.monthlyRevenue) : 0;
      return {
        taskId: task.id,
        outcome: "won_back",
        revenueImpact: monthlyRevenue > 0 ? String(monthlyRevenue) : null,
      };
    }
  }

  if (daysSinceAction >= OBSERVATION_WINDOW_DAYS) {
    return { taskId: task.id, outcome: "no_change", revenueImpact: null };
  }

  return null;
}

async function detectBillingOutcome(task: any): Promise<OutcomeResult | null> {
  if (!task.targetId || task.targetType !== "member") return null;

  const subs = await db.select().from(subscriptionsTable).where(
    and(eq(subscriptionsTable.memberId, task.targetId), eq(subscriptionsTable.gymId, task.gymId))
  );

  if (subs.length === 0) {
    return { taskId: task.id, outcome: "no_change", revenueImpact: null };
  }

  const actionedAt = new Date(task.actionedAt);
  const now = new Date();
  const daysSinceAction = Math.floor((now.getTime() - actionedAt.getTime()) / (1000 * 60 * 60 * 24));

  const reactivatedSub = subs.find(s =>
    s.status === "active" && s.updatedAt && new Date(s.updatedAt) > actionedAt
  );
  if (reactivatedSub) {
    const amount = parseFloat(reactivatedSub.amount);
    return {
      taskId: task.id,
      outcome: "reactivated",
      revenueImpact: amount > 0 ? String(amount) : null,
    };
  }

  if (daysSinceAction >= OBSERVATION_WINDOW_DAYS) {
    return { taskId: task.id, outcome: "no_change", revenueImpact: null };
  }

  return null;
}

async function detectLeadOutcome(task: any): Promise<OutcomeResult | null> {
  if (!task.targetId || task.targetType !== "lead") return null;

  const [lead] = await db.select().from(leadsTable).where(
    and(eq(leadsTable.id, task.targetId), eq(leadsTable.gymId, task.gymId))
  );

  if (!lead) {
    return { taskId: task.id, outcome: "no_change", revenueImpact: null };
  }

  const actionedAt = new Date(task.actionedAt);
  const now = new Date();
  const daysSinceAction = Math.floor((now.getTime() - actionedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (lead.convertedAt && new Date(lead.convertedAt) > actionedAt) {
    return { taskId: task.id, outcome: "converted", revenueImpact: null };
  }

  if (daysSinceAction >= OBSERVATION_WINDOW_DAYS) {
    return { taskId: task.id, outcome: "no_change", revenueImpact: null };
  }

  return null;
}

export async function runOutcomeDetection(): Promise<{ evaluated: number; updated: number }> {
  const pendingTasks = await db.select().from(aiTasksTable).where(
    and(
      eq(aiTasksTable.outcome, "pending_observation"),
      sql`${aiTasksTable.actionedAt} IS NOT NULL`
    )
  );

  let updated = 0;

  for (const task of pendingTasks) {
    let result: OutcomeResult | null = null;

    try {
      if (task.type === "outreach") {
        result = await detectOutreachOutcome(task);
      } else if (task.type === "billing") {
        result = await detectBillingOutcome(task);
      } else if (task.type === "leads") {
        result = await detectLeadOutcome(task);
      } else {
        const actionedAt = new Date(task.actionedAt!);
        const daysSinceAction = Math.floor((Date.now() - actionedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceAction >= OBSERVATION_WINDOW_DAYS) {
          result = { taskId: task.id, outcome: "no_change", revenueImpact: null };
        }
      }

      if (result) {
        await db.update(aiTasksTable).set({
          outcome: result.outcome,
          outcomeDetectedAt: new Date(),
          revenueImpact: result.revenueImpact,
        }).where(eq(aiTasksTable.id, result.taskId));
        updated++;
      }
    } catch (err: any) {
      console.error(`[outcome-detection] Error processing task ${task.id}:`, err.message);
    }
  }

  return { evaluated: pendingTasks.length, updated };
}
