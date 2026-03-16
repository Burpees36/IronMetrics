/**
 * @module recommendation-learning
 * Adaptive recommendation learning system for gym intelligence.
 *
 * Implements a lightweight Bayesian-like learning mechanism that adjusts
 * recommendation quality scores based on observed outcomes. The system:
 *
 *   1. Tracks recommendation "cards" — each card represents a suggested
 *      intervention with an execution checklist (e.g., "Reach out to at-risk members").
 *
 *   2. Measures "execution strength" — the fraction of checklist items the
 *      gym owner has completed. A threshold (MIN_EXECUTION_STRENGTH = 0.6)
 *      gates whether a recommendation's outcome is attributable to the
 *      recommendation itself (i.e., if the owner didn't follow through,
 *      the recommendation shouldn't be penalized).
 *
 *   3. Updates learning stats using a weighted moving average:
 *      - `learningRate` controls how quickly new observations shift the
 *        expected impact. Per-gym learning is faster (0.06 base) than
 *        global learning (0.03 base) to allow gym-specific adaptation.
 *      - `qualityWeight` scales the learning rate by roster size, clamped
 *        to [0.2, 1.0] via: max(0.2, min(1, rosterSize / 100)). Smaller
 *        gyms contribute less to confidence since their sample is noisier.
 *      - `confidenceGain` increases confidence per observation, scaled by
 *        execution strength and quality weight. Confidence asymptotes at 0.99.
 *
 *   4. The update formula (weighted moving average / exponential smoothing):
 *        newExpectedImpact = oldExpectedImpact * (1 - learningRate) + impactScore * learningRate
 *      This is analogous to Bayesian posterior updating with a fixed prior
 *      weight, allowing the system to gradually converge on each
 *      recommendation type's true effectiveness for a given gym.
 */
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

/**
 * Minimum execution strength (fraction of checklist completed) required
 * before a recommendation's outcome is considered attributable to the
 * recommendation. Below this threshold, outcome data is too noisy to learn from.
 */
const MIN_EXECUTION_STRENGTH = 0.6;

/**
 * Returns the first day of the month for the given date (or today) as "YYYY-MM-DD".
 * Used as the period key for grouping recommendations and outcomes by month.
 */
export function getPeriodStart(inputDate?: Date): string {
  const d = inputDate ? new Date(inputDate) : new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates a deterministic, URL-safe ID for a checklist item.
 * Combines the recommendation type, item index, and a sanitized slug
 * of the item text (truncated to 32 chars) to produce a stable identifier.
 */
function getItemId(recommendationType: string, item: string, index: number): string {
  const clean = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${recommendationType}-${index}-${clean.slice(0, 32)}`;
}

/**
 * Persists recommendation cards for a gym/period if they don't already exist.
 * Each card stores its execution checklist and the baseline forecast at the
 * time of generation, enabling before/after outcome comparisons.
 *
 * @param gymId             - Target gym.
 * @param periodStart       - Month period key (e.g., "2026-03-01").
 * @param recommendations   - Array of intervention recommendations with checklists.
 * @param baselineForecast  - Snapshot of gym metrics at recommendation time.
 */
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

/**
 * Retrieves the current execution state of all recommendation cards for a
 * gym/period. Joins checklist items with their completion records to build
 * a full picture of what the owner has done.
 *
 * Computes `executionStrength` as: checkedItems / totalItems (0 to 1).
 *
 * @param gymId       - Target gym.
 * @param periodStart - Optional month key; defaults to current month.
 * @returns Array of card objects with enriched checklist and execution metrics.
 */
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
    // Execution strength: fraction of checklist completed (0 = nothing done, 1 = all done)
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

/**
 * Toggles a single checklist item's completion state. Upserts the completion
 * record so the same item can be checked/unchecked multiple times.
 *
 * @param gymId            - Gym owning the recommendation (for authorization).
 * @param recommendationId - The recommendation card ID.
 * @param itemId           - The checklist item ID to toggle.
 * @param checked          - New checked state.
 * @param note             - Optional note from the gym owner.
 */
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

/**
 * Keyword-based classifier for owner-logged actions.
 * Maps free-text actions to known intervention categories using simple
 * keyword matching. Returns the category with the most keyword hits, or
 * null if no keywords match.
 */
const INTERVENTION_KEYWORDS: Record<string, string[]> = {
  retention: ["retain", "keep", "churn", "at-risk", "save", "loyalty", "re-engage"],
  onboarding: ["onboard", "new member", "welcome", "intro", "first visit", "nsi", "ramp"],
  referral: ["refer", "word of mouth", "bring a friend", "advocate"],
  community: ["event", "social", "community", "gathering", "potluck", "competition"],
  coaching: ["coach", "training", "programming", "skill", "development", "quality"],
  pricing: ["price", "revenue", "upsell", "nutrition challenge", "arm"],
  marketing: ["market", "social proof", "content", "testimonial", "local partner"],
};

export function classifyAction(text: string): string | null {
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

/**
 * Logs a free-text action taken by the gym owner. The action is auto-classified
 * into an intervention category via keyword matching. These actions supplement
 * the structured checklist and capture ad-hoc efforts.
 */
export async function logOwnerAction(gymId: number, periodStart: string, text: string) {
  const classifiedType = classifyAction(text);

  const [action] = await db
    .insert(ownerAdditionalActionsTable)
    .values({ gymId, periodStart, text, classifiedType })
    .returning();

  return action;
}

/**
 * Retrieves paginated owner actions for a gym, ordered newest first.
 */
export async function getOwnerActions(gymId: number, limit: number = 50, offset: number = 0) {
  return db
    .select()
    .from(ownerAdditionalActionsTable)
    .where(eq(ownerAdditionalActionsTable.gymId, gymId))
    .orderBy(desc(ownerAdditionalActionsTable.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Updates (or creates) the learning stats for a recommendation type.
 *
 * Uses a Bayesian-like weighted moving average to update expected impact:
 *
 *   learningRate = baseLR * qualityWeight
 *     - baseLR: 0.06 for per-gym stats, 0.03 for global stats
 *       (per-gym learns faster to capture gym-specific patterns)
 *     - qualityWeight: max(0.2, min(1, rosterSize / 100))
 *       (larger gyms produce more reliable signal, capped at 100 members)
 *
 *   newExpectedImpact = old * (1 - learningRate) + impactScore * learningRate
 *     → Exponential smoothing: blends prior belief with new observation.
 *     → A high learningRate means new data shifts expectations faster.
 *
 *   confidenceGain = 0.03 * executionStrength * qualityWeight
 *     → Confidence only grows when the owner actually executed (high execution strength).
 *     → Capped at 0.99 to never reach full certainty.
 *
 * @param recommendationType - The category of recommendation (e.g., "retention", "onboarding").
 * @param gymId              - Gym ID for per-gym stats, or null for global stats.
 * @param impactScore        - Observed outcome metric (higher = better outcome).
 * @param executionStrength  - Fraction of checklist completed (0 to 1).
 * @param rosterSize         - Current active member count (used for quality weighting).
 */
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

  // Quality weight: scales learning by gym size — small gyms (< 20 members) get min 0.2
  const qualityWeight = Math.max(0.2, Math.min(1, rosterSize / 100));
  // Per-gym learning rate is 2x global to allow faster adaptation
  const learningRate = gymId ? 0.06 * qualityWeight : 0.03 * qualityWeight;
  // Confidence grows proportional to execution strength and data quality
  const confidenceGain = 0.03 * executionStrength * qualityWeight;

  if (!existing) {
    // First observation: seed with initial values
    await db.insert(recommendationLearningStatsTable).values({
      recommendationType,
      gymId,
      expectedImpact: String(impactScore * learningRate),
      confidence: String(Math.min(0.4, 0.1 + confidenceGain)),
      sampleSize: 1,
    });
    return;
  }

  // Weighted moving average update (exponential smoothing)
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
