import { and, asc, eq, inArray, desc } from "drizzle-orm";
import {
  db,
  recommendationCardsTable,
  checklistItemCompletionsTable,
  ownerAdditionalActionsTable,
  recommendationLearningStatsTable,
  recommendationLearningEventsTable,
  outcomeSnapshotsTable,
} from "@workspace/db";

const MIN_EXECUTION_STRENGTH = 0.6;

export function getPeriodStart(inputDate?: Date): string {
  const d = inputDate ? new Date(inputDate) : new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getItemId(recommendationType: string, item: string, index: number): string {
  const clean = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${recommendationType}-${index}-${clean.slice(0, 32)}`;
}

export async function ensureRecommendationCards(
  gymId: number,
  periodStart: string,
  recommendations: Array<{ interventionType: string; headline: string; executionChecklist: string[] }>,
  baselineForecast: { baselineMembers: number; baselineMrr: number; baselineChurn: number },
) {
  for (const recommendation of recommendations) {
    const checklistItems = recommendation.executionChecklist.map((item, index) => ({
      itemId: getItemId(recommendation.interventionType, item, index),
      text: item,
    }));

    const [existing] = await db
      .select()
      .from(recommendationCardsTable)
      .where(
        and(
          eq(recommendationCardsTable.gymId, gymId),
          eq(recommendationCardsTable.periodStart, periodStart),
          eq(recommendationCardsTable.recommendationType, recommendation.interventionType),
          eq(recommendationCardsTable.headline, recommendation.headline),
        ),
      );

    if (existing) continue;

    await db.insert(recommendationCardsTable).values({
      gymId,
      periodStart,
      recommendationType: recommendation.interventionType,
      headline: recommendation.headline,
      checklistItems,
      baselineForecast,
      executionStrengthThreshold: String(MIN_EXECUTION_STRENGTH),
    });
  }
}

export async function getRecommendationExecutionState(gymId: number, periodStart?: string) {
  const period = periodStart ?? getPeriodStart();
  const cards = await db
    .select()
    .from(recommendationCardsTable)
    .where(and(eq(recommendationCardsTable.gymId, gymId), eq(recommendationCardsTable.periodStart, period)))
    .orderBy(asc(recommendationCardsTable.generatedAt));

  const allCompletions = cards.length === 0 ? [] : await db
    .select()
    .from(checklistItemCompletionsTable)
    .where(inArray(checklistItemCompletionsTable.recommendationId, cards.map((card) => card.id)));

  const completionMap = new Map<string, { checked: boolean; checkedAt: Date; note: string | null }>();
  for (const row of allCompletions) {
    completionMap.set(`${row.recommendationId}:${row.itemId}`, {
      checked: row.checked,
      checkedAt: row.checkedAt,
      note: row.note,
    });
  }

  return cards.map((card) => {
    const items = card.checklistItems as Array<{ itemId: string; text: string }>;
    const checklist = items.map((item) => {
      const completion = completionMap.get(`${card.id}:${item.itemId}`);
      return {
        ...item,
        checked: completion?.checked ?? false,
        checkedAt: completion?.checkedAt ?? null,
        note: completion?.note ?? null,
      };
    });

    const checkedItems = checklist.filter((item) => item.checked).length;
    const totalItems = checklist.length;
    const executionStrength = totalItems === 0 ? 0 : checkedItems / totalItems;

    return {
      id: card.id,
      gymId: card.gymId,
      periodStart: card.periodStart,
      recommendationType: card.recommendationType,
      headline: card.headline,
      checklist,
      totalItems,
      checkedItems,
      executionStrength,
      executionStrengthThreshold: Number(card.executionStrengthThreshold),
      baselineForecast: card.baselineForecast,
    };
  });
}

export async function toggleChecklistItem(
  gymId: number,
  recommendationId: number,
  itemId: string,
  checked: boolean,
  note?: string,
) {
  const [card] = await db
    .select()
    .from(recommendationCardsTable)
    .where(and(eq(recommendationCardsTable.id, recommendationId), eq(recommendationCardsTable.gymId, gymId)));

  if (!card) throw new Error("Recommendation card not found");

  const items = card.checklistItems as Array<{ itemId: string; text: string }>;
  if (!items.find((i) => i.itemId === itemId)) {
    throw new Error("Checklist item not found");
  }

  const [existing] = await db
    .select()
    .from(checklistItemCompletionsTable)
    .where(
      and(
        eq(checklistItemCompletionsTable.recommendationId, recommendationId),
        eq(checklistItemCompletionsTable.itemId, itemId),
      ),
    );

  if (existing) {
    await db
      .update(checklistItemCompletionsTable)
      .set({ checked, checkedAt: new Date(), note: note ?? existing.note })
      .where(eq(checklistItemCompletionsTable.id, existing.id));
  } else {
    await db.insert(checklistItemCompletionsTable).values({
      recommendationId,
      itemId,
      checked,
      checkedAt: new Date(),
      note: note ?? null,
    });
  }
}

const INTERVENTION_KEYWORDS: Record<string, string[]> = {
  retention: ["retain", "keep", "churn", "at-risk", "save", "loyalty", "re-engage"],
  onboarding: ["onboard", "new member", "welcome", "intro", "first visit", "nsi", "ramp"],
  referral: ["refer", "word of mouth", "bring a friend", "advocate"],
  community: ["event", "social", "community", "gathering", "potluck", "competition"],
  coaching: ["coach", "training", "programming", "skill", "development", "quality"],
  pricing: ["price", "revenue", "upsell", "nutrition challenge", "arm"],
  marketing: ["market", "social proof", "content", "testimonial", "local partner"],
};

function classifyAction(text: string): string | null {
  const lower = text.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(INTERVENTION_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = type;
    }
  }

  return bestMatch;
}

export async function logOwnerAction(gymId: number, periodStart: string, text: string) {
  const classifiedType = classifyAction(text);

  const [action] = await db
    .insert(ownerAdditionalActionsTable)
    .values({ gymId, periodStart, text, classifiedType })
    .returning();

  return action;
}

export async function getOwnerActions(gymId: number, limit: number = 50, offset: number = 0) {
  return db
    .select()
    .from(ownerAdditionalActionsTable)
    .where(eq(ownerAdditionalActionsTable.gymId, gymId))
    .orderBy(desc(ownerAdditionalActionsTable.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function upsertLearningStat(
  recommendationType: string,
  gymId: number | null,
  impactScore: number,
  executionStrength: number,
  rosterSize: number,
) {
  const conditions = gymId
    ? and(
        eq(recommendationLearningStatsTable.recommendationType, recommendationType),
        eq(recommendationLearningStatsTable.gymId, gymId),
      )
    : eq(recommendationLearningStatsTable.recommendationType, recommendationType);

  const [existing] = await db
    .select()
    .from(recommendationLearningStatsTable)
    .where(conditions);

  const qualityWeight = Math.max(0.2, Math.min(1, rosterSize / 100));
  const learningRate = gymId ? 0.06 * qualityWeight : 0.03 * qualityWeight;
  const confidenceGain = 0.03 * executionStrength * qualityWeight;

  if (!existing) {
    await db.insert(recommendationLearningStatsTable).values({
      recommendationType,
      gymId,
      expectedImpact: String(impactScore * learningRate),
      confidence: String(Math.min(0.4, 0.1 + confidenceGain)),
      sampleSize: 1,
    });
    return;
  }

  const newExpectedImpact = Number(existing.expectedImpact) * (1 - learningRate) + impactScore * learningRate;
  const newConfidence = Math.min(0.99, Number(existing.confidence) + confidenceGain);

  await db
    .update(recommendationLearningStatsTable)
    .set({
      expectedImpact: String(newExpectedImpact),
      confidence: String(newConfidence),
      sampleSize: existing.sampleSize + 1,
    })
    .where(eq(recommendationLearningStatsTable.id, existing.id));
}
