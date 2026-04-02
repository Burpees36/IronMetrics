import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { getPeriodStart } from "../services/recommendation-learning";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  inArray: (left: any, values: any[]) => ({ _type: "inArray", left, values }),
  asc: () => ({}),
  desc: () => ({}),
}));

let mockCards: any[] = [];
let mockCompletions: any[] = [];
let mockActions: any[] = [];
let mockStats: any[] = [];
let idCounter = 0;

vi.mock("@workspace/db", () => {
  function resolveField(colRef: any): string {
    return colRef?._field || "id";
  }
  function matchesCondition(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._type === "eq") return row[resolveField(cond.left)] === cond.right;
    if (cond._type === "and") return cond.conditions.every((c: any) => matchesCondition(row, c));
    if (cond._type === "inArray") return cond.values.includes(row[resolveField(cond.left)]);
    return true;
  }
  function makeTable(name: string) {
    return new Proxy({ _name: name }, {
      get(_, prop) {
        if (prop === "_name") return name;
        return { _col: true, _table: name, _field: String(prop) };
      },
    });
  }
  function getTableData(tn: string): any[] {
    if (tn === "recommendation_cards") return mockCards;
    if (tn === "checklist_item_completions") return mockCompletions;
    if (tn === "owner_additional_actions") return mockActions;
    if (tn === "recommendation_learning_stats") return mockStats;
    return [];
  }
  const db: any = {
    select(fields?: any) {
      return {
        from(table: any) {
          const tn = table._name;
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            orderBy() { return chain; },
            limit() { return chain; },
            offset() { return chain; },
            then(resolve: any) {
              resolve(getTableData(tn).filter((r: any) => matchesCondition(r, cond)));
            },
          };
          return chain;
        },
      };
    },
    insert(table: any) {
      const tn = table._name;
      return {
        values(vals: any) {
          return {
            returning() {
              return {
                then(resolve: any) {
                  const nr = { id: ++idCounter, ...vals, createdAt: new Date() };
                  getTableData(tn).push(nr);
                  resolve([nr]);
                },
              };
            },
            then(resolve: any) {
              const nr = { id: ++idCounter, ...vals, createdAt: new Date() };
              getTableData(tn).push(nr);
              resolve(undefined);
            },
          };
        },
      };
    },
    update(table: any) {
      const tn = table._name;
      return {
        set(vals: any) {
          return {
            where(c: any) {
              return {
                then(resolve: any) {
                  for (const row of getTableData(tn)) {
                    if (matchesCondition(row, c)) Object.assign(row, vals);
                  }
                  resolve(undefined);
                },
              };
            },
          };
        },
      };
    },
  };
  return {
    db,
    recommendationCardsTable: makeTable("recommendation_cards"),
    checklistItemCompletionsTable: makeTable("checklist_item_completions"),
    ownerAdditionalActionsTable: makeTable("owner_additional_actions"),
    recommendationLearningStatsTable: makeTable("recommendation_learning_stats"),
    recommendationLearningEventsTable: makeTable("recommendation_learning_events"),
    outcomeSnapshotsTable: makeTable("outcome_snapshots"),
  };
});

import {
  ensureRecommendationCards,
  getRecommendationExecutionState,
  toggleChecklistItem,
  logOwnerAction,
  getOwnerActions,
  upsertLearningStat,
} from "../services/recommendation-learning";

describe("getPeriodStart", () => {
  it("returns first day of current month by default", () => {
    const result = getPeriodStart();
    expect(result).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("returns first day of provided month", () => {
    expect(getPeriodStart(new Date(2026, 2, 15))).toBe("2026-03-01");
  });

  it("handles January correctly", () => {
    expect(getPeriodStart(new Date(2026, 0, 31))).toBe("2026-01-01");
  });

  it("handles December correctly", () => {
    expect(getPeriodStart(new Date(2026, 11, 25))).toBe("2026-12-01");
  });
});

describe("ensureRecommendationCards", () => {
  beforeEach(() => {
    mockCards = [];
    mockCompletions = [];
    mockActions = [];
    mockStats = [];
    idCounter = 0;
  });

  it("creates cards when none exist", async () => {
    await ensureRecommendationCards(1, "2026-03-01", [
      { interventionType: "retention", headline: "Reach out", executionChecklist: ["Call members", "Send emails"] },
    ], { baselineMembers: 50, baselineMrr: 5000, baselineChurn: 5 });
    expect(mockCards).toHaveLength(1);
    expect(mockCards[0].recommendationType).toBe("retention");
    expect(mockCards[0].checklistItems).toHaveLength(2);
  });

  it("does not duplicate existing cards", async () => {
    mockCards = [{
      id: 1, gymId: 1, periodStart: "2026-03-01",
      recommendationType: "retention", headline: "Reach out",
      checklistItems: [{ itemId: "test", text: "test" }],
    }];
    await ensureRecommendationCards(1, "2026-03-01", [
      { interventionType: "retention", headline: "Reach out", executionChecklist: ["Call members"] },
    ], { baselineMembers: 50, baselineMrr: 5000, baselineChurn: 5 });
    expect(mockCards).toHaveLength(1);
  });

  it("creates multiple cards for different types", async () => {
    await ensureRecommendationCards(1, "2026-03-01", [
      { interventionType: "retention", headline: "Reach out", executionChecklist: ["Task 1"] },
      { interventionType: "retention", headline: "Welcome new", executionChecklist: ["Task A"] },
    ], { baselineMembers: 50, baselineMrr: 5000, baselineChurn: 5 });
    expect(mockCards).toHaveLength(2);
  });
});

describe("getRecommendationExecutionState", () => {
  beforeEach(() => {
    mockCards = [];
    mockCompletions = [];
    idCounter = 0;
  });

  it("returns empty array when no cards exist", async () => {
    const result = await getRecommendationExecutionState(1, "2026-03-01");
    expect(result).toEqual([]);
  });

  it("returns cards with unchecked items when no completions", async () => {
    mockCards = [{
      id: 1, gymId: 1, periodStart: "2026-03-01",
      recommendationType: "retention", headline: "Reach out",
      checklistItems: [{ itemId: "item-1", text: "Call members" }],
      executionStrengthThreshold: "0.6",
      baselineForecast: { baselineMembers: 50 },
      generatedAt: new Date(),
    }];
    const result = await getRecommendationExecutionState(1, "2026-03-01");
    expect(result).toHaveLength(1);
    expect(result[0].executionStrength).toBe(0);
    expect(result[0].checklist[0].checked).toBe(false);
  });

  it("computes execution strength from completions", async () => {
    mockCards = [{
      id: 1, gymId: 1, periodStart: "2026-03-01",
      recommendationType: "retention", headline: "Test",
      checklistItems: [
        { itemId: "item-1", text: "Task 1" },
        { itemId: "item-2", text: "Task 2" },
      ],
      executionStrengthThreshold: "0.6",
      baselineForecast: {},
      generatedAt: new Date(),
    }];
    mockCompletions = [{
      recommendationId: 1, itemId: "item-1",
      checked: true, checkedAt: new Date(), note: null,
    }];
    const result = await getRecommendationExecutionState(1, "2026-03-01");
    expect(result[0].executionStrength).toBe(0.5);
    expect(result[0].checkedItems).toBe(1);
    expect(result[0].totalItems).toBe(2);
  });
});

describe("toggleChecklistItem", () => {
  beforeEach(() => {
    mockCards = [];
    mockCompletions = [];
    idCounter = 0;
  });

  it("throws when card not found", async () => {
    await expect(toggleChecklistItem(1, 999, "item-1", true)).rejects.toThrow("Recommendation card not found");
  });

  it("throws when item ID not found in card", async () => {
    mockCards = [{
      id: 1, gymId: 1, checklistItems: [{ itemId: "item-1", text: "Task 1" }],
    }];
    await expect(toggleChecklistItem(1, 1, "nonexistent", true)).rejects.toThrow("Checklist item not found");
  });

  it("creates new completion for unchecked item", async () => {
    mockCards = [{
      id: 1, gymId: 1, checklistItems: [{ itemId: "item-1", text: "Task 1" }],
    }];
    await toggleChecklistItem(1, 1, "item-1", true, "Done!");
    expect(mockCompletions).toHaveLength(1);
    expect(mockCompletions[0].checked).toBe(true);
    expect(mockCompletions[0].note).toBe("Done!");
  });

  it("updates existing completion", async () => {
    mockCards = [{
      id: 1, gymId: 1, checklistItems: [{ itemId: "item-1", text: "Task 1" }],
    }];
    mockCompletions = [{
      id: 1, recommendationId: 1, itemId: "item-1",
      checked: true, checkedAt: new Date(), note: "old",
    }];
    await toggleChecklistItem(1, 1, "item-1", false);
    expect(mockCompletions[0].checked).toBe(false);
  });
});

describe("logOwnerAction", () => {
  beforeEach(() => {
    mockActions = [];
    idCounter = 0;
  });

  it("logs action with classification", async () => {
    const result = await logOwnerAction(1, "2026-03-01", "Reached out to at-risk members to retain them");
    expect(result.classifiedType).toBe("retention");
    expect(result.gymId).toBe(1);
  });

  it("logs action with null classification for unrelated text", async () => {
    const result = await logOwnerAction(1, "2026-03-01", "Fixed the parking lot lights");
    expect(result.classifiedType).toBeNull();
  });

  it("classifies onboarding actions as retention", async () => {
    const result = await logOwnerAction(1, "2026-03-01", "Set up welcome intro for new member");
    expect(result.classifiedType).toBe("retention");
  });
});

describe("upsertLearningStat", () => {
  beforeEach(() => {
    mockStats = [];
    idCounter = 0;
  });

  it("creates new stat on first observation", async () => {
    await upsertLearningStat("retention", 1, 0.8, 0.9, 100);
    expect(mockStats).toHaveLength(1);
    expect(mockStats[0].recommendationType).toBe("retention");
    expect(mockStats[0].sampleSize).toBe(1);
  });

  it("updates existing stat with exponential smoothing", async () => {
    mockStats = [{
      id: 1, recommendationType: "retention", gymId: 1,
      expectedImpact: "0.5", confidence: "0.3", sampleSize: 5,
    }];
    await upsertLearningStat("retention", 1, 0.9, 1.0, 100);
    expect(mockStats[0].sampleSize).toBe(6);
    expect(parseFloat(mockStats[0].expectedImpact)).toBeGreaterThan(0.5);
  });

  it("applies quality weight based on roster size", async () => {
    await upsertLearningStat("coaching", 1, 0.8, 1.0, 10);
    const smallGymImpact = parseFloat(mockStats[0].expectedImpact);
    mockStats = [];
    idCounter = 100;
    await upsertLearningStat("coaching", 1, 0.8, 1.0, 100);
    const largeGymImpact = parseFloat(mockStats[0].expectedImpact);
    expect(largeGymImpact).toBeGreaterThan(smallGymImpact);
  });

  it("confidence is capped at 0.99", async () => {
    mockStats = [{
      id: 1, recommendationType: "retention", gymId: 1,
      expectedImpact: "0.8", confidence: "0.98", sampleSize: 100,
    }];
    await upsertLearningStat("retention", 1, 0.9, 1.0, 200);
    expect(parseFloat(mockStats[0].confidence)).toBeLessThanOrEqual(0.99);
  });
});

describe("keyword classification (production import)", () => {
  let classifyAction: (text: string) => string | null;

  beforeAll(async () => {
    const mod = await import("../services/recommendation-learning");
    classifyAction = mod.classifyAction;
  });

  it("classifies referral keywords", () => {
    expect(classifyAction("Launched bring a friend campaign")).toBe("referral");
  });

  it("classifies community keywords", () => {
    expect(classifyAction("Organized community social event")).toBe("community");
  });

  it("classifies pricing keywords", () => {
    expect(classifyAction("Launched nutrition challenge upsell")).toBe("pricing");
  });

  it("classifies marketing keywords", () => {
    expect(classifyAction("Published social proof testimonial content")).toBe("marketing");
  });

  it("picks category with most keyword hits", () => {
    expect(classifyAction("coach training skill development quality programming")).toBe("coaching");
  });

  it("is case-insensitive", () => {
    expect(classifyAction("RETAIN AT-RISK MEMBERS")).toBe("retention");
  });
});
