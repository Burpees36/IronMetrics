import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere });
mockWhere.mockResolvedValue([]);
mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockResolvedValue([]);

vi.mock("@workspace/db", () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
    insert: (...args: any[]) => mockInsert(...args),
  },
  nudgeHistoryTable: { gymId: "gym_id", nudgeId: "nudge_id", shownAt: "shown_at" },
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  desc: vi.fn(),
}));

const mockSearchKnowledge = vi.fn().mockResolvedValue([]);
vi.mock("../services/knowledge-retrieval", () => ({
  searchKnowledge: (...args: any[]) => mockSearchKnowledge(...args),
}));

vi.mock("../services/iron-metrics-voice", () => ({
  assertVoiceCompliance: vi.fn(),
  fmtDollars: (v: number) => `$${Math.round(v).toLocaleString()}`,
  fmtPercent: (v: number) => `${v.toFixed(1)}%`,
}));

import { buildCandidates, selectAndRotate, generateGrowthNudges, groundWithKnowledge } from "../routes/intelligence/growth-nudge-engine";

const BASE_METRICS = {
  activeMembers: 50,
  mrr: 8000,
  engagementRate: 65,
  classFillRate: 75,
  retentionRate: 92,
  atRiskCount: 0,
  activeLeads: 2,
  staleLeads: 0,
  arm: 160,
  rsiScore: 65,
  rsiBand: "Moderate" as string,
  churnRate: 8,
};

describe("buildCandidates", () => {
  it("returns bring-a-friend when classFillRate < 70", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, classFillRate: 55 });
    const baf = candidates.find(c => c.id === "bring_a_friend");
    expect(baf).toBeDefined();
    expect(baf!.relevanceScore).toBeGreaterThan(0);
  });

  it("does not return bring-a-friend when classFillRate >= 70", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, classFillRate: 80 });
    expect(candidates.find(c => c.id === "bring_a_friend")).toBeUndefined();
  });

  it("returns referral_sprint when engagement > 60 and leads < 3", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, engagementRate: 70, activeLeads: 1 });
    expect(candidates.find(c => c.id === "referral_sprint")).toBeDefined();
  });

  it("does not return referral_sprint when leads >= 3", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, engagementRate: 70, activeLeads: 5 });
    expect(candidates.find(c => c.id === "referral_sprint")).toBeUndefined();
  });

  it("returns nutrition_challenge when ARM < 175", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, arm: 140 });
    expect(candidates.find(c => c.id === "nutrition_challenge")).toBeDefined();
  });

  it("returns community_event when engagement < 50 and members > 10", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, engagementRate: 40, activeMembers: 30 });
    expect(candidates.find(c => c.id === "community_event")).toBeDefined();
  });

  it("returns growth_mode when RSI >= 70", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, rsiScore: 75, rsiBand: "Strong" });
    expect(candidates.find(c => c.id === "growth_mode")).toBeDefined();
  });

  it("returns social_proof when members > 20", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, activeMembers: 25 });
    expect(candidates.find(c => c.id === "social_proof")).toBeDefined();
  });

  it("returns coaching_audit when members >= 30", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, activeMembers: 35 });
    expect(candidates.find(c => c.id === "coaching_audit")).toBeDefined();
  });

  it("returns local_partnership when MRR > 5000", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, mrr: 8000 });
    expect(candidates.find(c => c.id === "local_partnership")).toBeDefined();
  });

  it("returns fill_rate_social when classFillRate < 60", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, classFillRate: 45 });
    expect(candidates.find(c => c.id === "fill_rate_social")).toBeDefined();
  });
});

describe("selectAndRotate", () => {
  it("returns at most maxNudges candidates", () => {
    const candidates = buildCandidates({
      ...BASE_METRICS,
      classFillRate: 40,
      engagementRate: 40,
      activeLeads: 1,
      arm: 100,
    });
    expect(candidates.length).toBeGreaterThan(3);
    const selected = selectAndRotate(candidates, new Set(), 3);
    expect(selected.length).toBeLessThanOrEqual(3);
  });

  it("returns empty array for empty candidates", () => {
    expect(selectAndRotate([], new Set(), 3)).toEqual([]);
  });

  it("returns all candidates when fewer than maxNudges", () => {
    const candidates = buildCandidates({
      ...BASE_METRICS,
      classFillRate: 80,
      engagementRate: 55,
      activeLeads: 10,
      arm: 200,
      mrr: 3000,
      activeMembers: 15,
      rsiScore: 50,
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(3);
    const selected = selectAndRotate(candidates, new Set(), 3);
    expect(selected.length).toBe(candidates.length);
  });

  it("does not include duplicate IDs", () => {
    const candidates = buildCandidates({ ...BASE_METRICS, classFillRate: 30 });
    const selected = selectAndRotate(candidates, new Set(), 3);
    const ids = selected.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("excludes recently shown nudge IDs", () => {
    const candidates = buildCandidates({
      ...BASE_METRICS,
      classFillRate: 40,
      engagementRate: 40,
      activeLeads: 1,
      arm: 100,
    });
    expect(candidates.length).toBeGreaterThan(3);

    const recentIds = new Set([candidates[0].id, candidates[1].id]);
    const selected = selectAndRotate(candidates, recentIds, 3);
    for (const s of selected) {
      expect(recentIds.has(s.id)).toBe(false);
    }
  });

  it("falls back to full pool when all candidates are recent", () => {
    const candidates = buildCandidates({
      ...BASE_METRICS,
      classFillRate: 40,
      engagementRate: 40,
      activeLeads: 1,
      arm: 100,
    });
    const allIds = new Set(candidates.map(c => c.id));
    const selected = selectAndRotate(candidates, allIds, 3);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(3);
  });
});

describe("groundWithKnowledge", () => {
  beforeEach(() => {
    mockSearchKnowledge.mockReset();
  });

  it("enriches message with KB content when available", async () => {
    mockSearchKnowledge.mockResolvedValueOnce([
      {
        content: "Every new member should receive a personal call from the owner within 24 hours.",
        chunkId: 1,
        similarity: 0.7,
        docTitle: "Two Brain Business",
        docUrl: "https://example.com",
        taxonomy: ["onboarding"],
      },
    ]);

    const candidate = {
      id: "test",
      icon: "test",
      title: "Test",
      message: "Base message here.",
      actionLabel: "Go",
      actionLink: "/test",
      relevanceScore: 50,
      knowledgeQuery: "test query",
      knowledgeTags: ["test"],
    };

    const result = await groundWithKnowledge(candidate);
    expect(result.source).toBe("Two Brain Business");
    expect(result.message).toContain("From the playbook:");
    expect(result.message).toContain("personal call");
  });

  it("returns base message when KB returns no results", async () => {
    mockSearchKnowledge.mockResolvedValueOnce([]);

    const candidate = {
      id: "test",
      icon: "test",
      title: "Test",
      message: "Base message here.",
      actionLabel: "Go",
      actionLink: "/test",
      relevanceScore: 50,
      knowledgeQuery: "test query",
      knowledgeTags: ["test"],
    };

    const result = await groundWithKnowledge(candidate);
    expect(result.source).toBeUndefined();
    expect(result.message).toBe("Base message here.");
  });

  it("returns source even when no actionable sentences found", async () => {
    mockSearchKnowledge.mockResolvedValueOnce([
      {
        content: "Short.",
        chunkId: 1,
        similarity: 0.5,
        docTitle: "Best Hour of Their Day",
        docUrl: "https://example.com",
        taxonomy: [],
      },
    ]);

    const candidate = {
      id: "test",
      icon: "test",
      title: "Test",
      message: "Base message.",
      actionLabel: "Go",
      actionLink: "/test",
      relevanceScore: 50,
      knowledgeQuery: "test",
      knowledgeTags: [],
    };

    const result = await groundWithKnowledge(candidate);
    expect(result.source).toBe("Best Hour of Their Day");
    expect(result.message).toBe("Base message.");
  });
});

describe("generateGrowthNudges", () => {
  beforeEach(() => {
    mockSearchKnowledge.mockReset();
    mockSearchKnowledge.mockResolvedValue([]);
  });

  it("returns nudges with required fields", async () => {
    const nudges = await generateGrowthNudges({
      ...BASE_METRICS,
      classFillRate: 50,
    });
    expect(nudges.length).toBeGreaterThan(0);
    expect(nudges.length).toBeLessThanOrEqual(3);
    for (const nudge of nudges) {
      expect(nudge.id).toBeTruthy();
      expect(nudge.icon).toBeTruthy();
      expect(nudge.title).toBeTruthy();
      expect(nudge.message).toBeTruthy();
      expect(nudge.actionLabel).toBeTruthy();
      expect(nudge.actionLink).toBeTruthy();
    }
  });

  it("returns fallback nudges when no metric-specific conditions match", async () => {
    const nudges = await generateGrowthNudges({
      activeMembers: 5,
      mrr: 500,
      engagementRate: 55,
      classFillRate: 80,
      retentionRate: 95,
      atRiskCount: 0,
      activeLeads: 2,
      staleLeads: 0,
      arm: 200,
      rsiScore: 50,
      rsiBand: "Moderate",
      churnRate: 5,
    });
    expect(nudges.length).toBeGreaterThan(0);
    expect(nudges.length).toBeLessThanOrEqual(3);
    const fallbackIds = nudges.map(n => n.id);
    expect(fallbackIds.some(id => id.startsWith("fallback_"))).toBe(true);
  });

  it("includes grounded source when KB returns results", async () => {
    mockSearchKnowledge.mockResolvedValue([
      {
        content: "Members who receive a welcome call within 48 hours are 3x more likely to stay.",
        chunkId: 1,
        similarity: 0.7,
        docTitle: "Two Brain Business",
        docUrl: "https://example.com",
        taxonomy: [],
      },
    ]);

    const nudges = await generateGrowthNudges({
      ...BASE_METRICS,
      classFillRate: 50,
    });
    expect(nudges.length).toBeGreaterThan(0);
    const withSource = nudges.filter(n => n.source);
    expect(withSource.length).toBeGreaterThan(0);
    expect(withSource[0].source).toBe("Two Brain Business");
  });
});
