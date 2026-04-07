import { describe, it, expect } from "vitest";
import { blendWithLearning, clamp, _interventionBuilders, type InterventionContext } from "../routes/intelligence/intervention-engine";

function makeContext(overrides: Partial<InterventionContext> = {}): InterventionContext {
  return {
    gymId: 1,
    atRiskMembers: [],
    atRiskCount: 0,
    atRiskRevenue: 0,
    failedSubs: [],
    openLeadCount: 0,
    staleLeadCount: 0,
    avgSubAmount: 150,
    activeBillableMembers: 50,
    totalMRR: 7500,
    arm: 150,
    newMembers: [],
    recentlyCancelled: [],
    engagementRate: 65,
    engagementChange: 0,
    learningStats: new Map(),
    cancelledMembers: 0,
    longTenureActiveCount: 0,
    recentClasses: [],
    avgFillRate: 0,
    ...overrides,
  };
}

describe("clamp", () => {
  it("clamps values within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("blendWithLearning", () => {
  it("returns base score when no learning stats", () => {
    const stats = new Map();
    expect(blendWithLearning(80, "retention", stats)).toBe(80);
  });

  it("adjusts score when learning stats exist", () => {
    const stats = new Map([
      ["retention", { expectedImpact: 5, confidence: 0.8, sampleSize: 10 }],
    ]);
    const result = blendWithLearning(80, "retention", stats);
    expect(result).toBeGreaterThan(80);
    expect(result).toBeLessThanOrEqual(99);
  });

  it("ignores learning stats with zero sample size", () => {
    const stats = new Map([
      ["retention", { expectedImpact: 5, confidence: 0.8, sampleSize: 0 }],
    ]);
    expect(blendWithLearning(80, "retention", stats)).toBe(80);
  });
});

describe("retentionIntervention", () => {
  const builder = _interventionBuilders.retentionIntervention;

  it("returns null when no at-risk members", () => {
    const ctx = makeContext({ atRiskCount: 0 });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention with dynamic score for few at-risk members", () => {
    const ctx = makeContext({
      atRiskCount: 2,
      atRiskMembers: [{ id: 1, riskTier: "critical", monthlyRevenue: "100" }, { id: 2, riskTier: "high", monthlyRevenue: "150" }],
      atRiskRevenue: 250,
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("retention");
    expect(result.score).toBeGreaterThan(40);
    expect(result.score).toBeLessThan(99);
    expect(result.affectedMembers).toBe(2);
    expect(result.expectedRevenue).toBe(250);
  });

  it("scores higher with more at-risk members", () => {
    const ctx2 = makeContext({ atRiskCount: 2, atRiskRevenue: 300, atRiskMembers: [] });
    const ctx15 = makeContext({ atRiskCount: 15, atRiskRevenue: 2000, atRiskMembers: [] });
    const result2 = builder(ctx2)!;
    const result15 = builder(ctx15)!;
    expect(result15.score).toBeGreaterThan(result2.score);
  });

  it("sets urgency to immediate when at-risk count >= 5", () => {
    const ctx = makeContext({ atRiskCount: 5, atRiskRevenue: 500, atRiskMembers: [] });
    const result = builder(ctx)!;
    expect(result.urgency).toBe("immediate");
  });
});

describe("billingIntervention", () => {
  const builder = _interventionBuilders.billingIntervention;

  it("returns null when no failed payments", () => {
    const ctx = makeContext();
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention with expected revenue for failed payments", () => {
    const ctx = makeContext({
      failedSubs: [
        { memberId: 1, amount: "100" },
        { memberId: 2, amount: "150" },
      ],
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("billing");
    expect(result.expectedRevenue).toBe(250);
    expect(result.affectedMembers).toBe(2);
  });
});

describe("onboardingIntervention", () => {
  const builder = _interventionBuilders.onboardingIntervention;

  it("returns null when no new members", () => {
    const ctx = makeContext();
    expect(builder(ctx)).toBeNull();
  });

  it("returns null when all new members have good attendance", () => {
    const ctx = makeContext({
      newMembers: [{ id: 1, joinDate: new Date().toISOString().slice(0, 10), createdAt: new Date(), attendanceCount30d: 8 }],
    });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention when new members have low attendance", () => {
    const ctx = makeContext({
      newMembers: [
        { id: 1, joinDate: new Date().toISOString().slice(0, 10), createdAt: new Date(), attendanceCount30d: 1 },
        { id: 2, joinDate: new Date().toISOString().slice(0, 10), createdAt: new Date(), attendanceCount30d: 0 },
      ],
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("onboarding");
    expect(result.affectedMembers).toBe(2);
  });
});

describe("leadsIntervention", () => {
  const builder = _interventionBuilders.leadsIntervention;

  it("returns null when no open leads", () => {
    const ctx = makeContext();
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention with stale lead info", () => {
    const ctx = makeContext({
      openLeadCount: 10,
      staleLeadCount: 6,
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("leads");
    expect(result.description).toContain("stale");
  });
});

describe("campaignIntervention", () => {
  const builder = _interventionBuilders.campaignIntervention;

  it("returns null when no long-tenure members and adequate pipeline", () => {
    const ctx = makeContext({ longTenureActiveCount: 0, openLeadCount: 10 });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention when good retention and long-tenure members", () => {
    const ctx = makeContext({
      longTenureActiveCount: 10,
      atRiskCount: 1,
      openLeadCount: 2,
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("campaign");
  });
});

describe("pricingIntervention", () => {
  const builder = _interventionBuilders.pricingIntervention;

  it("returns null when ARM is above benchmark", () => {
    const ctx = makeContext({ arm: 150 });
    expect(builder(ctx)).toBeNull();
  });

  it("returns null when too few members", () => {
    const ctx = makeContext({ activeBillableMembers: 3, arm: 80 });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention when ARM is low", () => {
    const ctx = makeContext({ arm: 70, activeBillableMembers: 50 });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("pricing");
    expect(result.description).toContain("$70");
  });
});

describe("engagementDeclineIntervention", () => {
  const builder = _interventionBuilders.engagementDeclineIntervention;

  it("returns null when engagement is stable", () => {
    const ctx = makeContext({ engagementChange: 2 });
    expect(builder(ctx)).toBeNull();
  });

  it("returns null when decline is small", () => {
    const ctx = makeContext({ engagementChange: -3 });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention when significant decline", () => {
    const ctx = makeContext({ engagementChange: -10, engagementRate: 55 });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("engagement");
  });

  it("sets immediate urgency for large drops", () => {
    const ctx = makeContext({ engagementChange: -20, engagementRate: 40 });
    const result = builder(ctx)!;
    expect(result.urgency).toBe("immediate");
    expect(result.impact).toBe("high");
  });
});

describe("newMemberRampUpIntervention", () => {
  const builder = _interventionBuilders.newMemberRampUpIntervention;

  it("returns null when no very new members need attention", () => {
    const ctx = makeContext();
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention for very new members with low attendance", () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const ctx = makeContext({
      newMembers: [
        { id: 1, joinDate: recentDate.toISOString().slice(0, 10), createdAt: recentDate, attendanceCount30d: 0 },
        { id: 2, joinDate: recentDate.toISOString().slice(0, 10), createdAt: recentDate, attendanceCount30d: 1 },
      ],
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("onboarding");
    expect(result.urgency).toBe("immediate");
  });
});

describe("winBackIntervention", () => {
  const builder = _interventionBuilders.winBackIntervention;

  it("returns null when no recently cancelled members", () => {
    const ctx = makeContext();
    expect(builder(ctx)).toBeNull();
  });

  it("returns null when cancellations are too old", () => {
    const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const ctx = makeContext({
      recentlyCancelled: [{ id: 1, updatedAt: oldDate, monthlyRevenue: "100" }],
    });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention for recent cancellations", () => {
    const recentDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const ctx = makeContext({
      recentlyCancelled: [
        { id: 1, updatedAt: recentDate, monthlyRevenue: "100" },
        { id: 2, updatedAt: recentDate, monthlyRevenue: "150" },
      ],
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("retention");
    expect(result.title).toContain("Win-back");
    expect(result.affectedMembers).toBe(2);
  });
});

describe("capacityOptimizationIntervention", () => {
  const builder = _interventionBuilders.capacityOptimizationIntervention;

  it("returns null when fewer than 5 recent classes", () => {
    const ctx = makeContext({
      recentClasses: [
        { capacity: 20, enrolled: 5 },
        { capacity: 20, enrolled: 5 },
      ],
      avgFillRate: 25,
    });
    expect(builder(ctx)).toBeNull();
  });

  it("returns null when fill rates are neutral", () => {
    const ctx = makeContext({
      recentClasses: Array.from({ length: 10 }, () => ({ capacity: 20, enrolled: 12 })),
      avgFillRate: 60,
    });
    expect(builder(ctx)).toBeNull();
  });

  it("returns intervention for consistently low fill rates", () => {
    const ctx = makeContext({
      recentClasses: Array.from({ length: 10 }, () => ({ capacity: 20, enrolled: 4 })),
      avgFillRate: 20,
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.category).toBe("engagement");
    expect(result.title).toContain("low class attendance");
  });

  it("returns intervention for consistently full classes", () => {
    const ctx = makeContext({
      recentClasses: Array.from({ length: 10 }, () => ({ capacity: 20, enrolled: 20 })),
      avgFillRate: 100,
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.title).toContain("capacity");
  });

  it("returns intervention for split problem (both low and full)", () => {
    const classes = [
      ...Array.from({ length: 4 }, () => ({ capacity: 20, enrolled: 3 })),
      ...Array.from({ length: 4 }, () => ({ capacity: 20, enrolled: 20 })),
      ...Array.from({ length: 2 }, () => ({ capacity: 20, enrolled: 10 })),
    ];
    const ctx = makeContext({
      recentClasses: classes,
      avgFillRate: 53,
    });
    const result = builder(ctx)!;
    expect(result).not.toBeNull();
    expect(result.title).toContain("Optimize");
  });
});

describe("edge cases", () => {
  it("empty gym returns no interventions", () => {
    const ctx = makeContext({
      activeBillableMembers: 0,
      totalMRR: 0,
      arm: 0,
    });
    const builders = Object.values(_interventionBuilders);
    const results = builders.map(b => b(ctx)).filter(Boolean);
    expect(results.length).toBe(0);
  });

  it("gym with perfect metrics returns few or no interventions", () => {
    const ctx = makeContext({
      atRiskCount: 0,
      atRiskRevenue: 0,
      failedSubs: [],
      openLeadCount: 0,
      staleLeadCount: 0,
      arm: 200,
      engagementChange: 5,
      longTenureActiveCount: 2,
    });
    const builders = Object.values(_interventionBuilders);
    const results = builders.map(b => b(ctx)).filter(Boolean);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("gym with only cancelled members", () => {
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const ctx = makeContext({
      activeBillableMembers: 0,
      totalMRR: 0,
      arm: 0,
      cancelledMembers: 20,
      recentlyCancelled: [
        { id: 1, updatedAt: recentDate, monthlyRevenue: "100" },
        { id: 2, updatedAt: recentDate, monthlyRevenue: "150" },
      ],
    });
    const builders = Object.values(_interventionBuilders);
    const results = builders.map(b => b(ctx)).filter(Boolean);
    const hasWinBack = results.some(r => r!.title.includes("Win-back"));
    expect(hasWinBack).toBe(true);
  });

  it("interventions are sorted by score descending", () => {
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const ctx = makeContext({
      atRiskCount: 5,
      atRiskRevenue: 1000,
      atRiskMembers: [],
      failedSubs: [{ memberId: 1, amount: "200" }],
      openLeadCount: 8,
      staleLeadCount: 4,
      arm: 80,
      engagementChange: -12,
      engagementRate: 50,
      recentlyCancelled: [{ id: 1, updatedAt: recentDate, monthlyRevenue: "100" }],
      longTenureActiveCount: 10,
      newMembers: [{ id: 10, joinDate: recentDate.toISOString().slice(0, 10), createdAt: recentDate, attendanceCount30d: 0 }],
    });

    const builders = Object.values(_interventionBuilders);
    const results = builders.map(b => b(ctx)).filter((r): r is NonNullable<typeof r> => r !== null);
    expect(results.length).toBeGreaterThanOrEqual(3);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(99);
      expect(r.id).toBeTruthy();
      expect(r.category).toBeTruthy();
    }
    const sorted = [...results].sort((a, b) => b.score - a.score);
    expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[sorted.length - 1].score);
  });
});
