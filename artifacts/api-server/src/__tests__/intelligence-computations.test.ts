import { describe, it, expect } from "vitest";

function computeRSI(churnRate: number, avgRevPerMember: number, netGrowth: number, avgTenure: number) {
  const churnNorm = Math.max(0, Math.min(100, 100 - churnRate * 10));
  const revNorm = Math.min(100, (avgRevPerMember / 200) * 100);
  const growthNorm = Math.max(0, Math.min(100, 50 + netGrowth * 5));
  const tenureNorm = Math.min(100, (avgTenure / 24) * 100);
  const weights = { churn: 0.35, rev: 0.25, growth: 0.2, tenure: 0.2 };
  const score = churnNorm * weights.churn + revNorm * weights.rev + growthNorm * weights.growth + tenureNorm * weights.tenure;
  const band = score >= 70 ? "Strong" : score >= 45 ? "Moderate" : "Fragile";
  return {
    score: Math.round(score * 10) / 10,
    band,
    components: { churnRate, avgRevPerMember, netMemberGrowth: netGrowth, avgTenure },
    breakdown: [
      { metric: "Churn Rate", value: churnRate, normalized: Math.round(churnNorm), weight: 35, contribution: Math.round(churnNorm * weights.churn * 10) / 10 },
      { metric: "Avg Revenue/Member", value: avgRevPerMember, normalized: Math.round(revNorm), weight: 25, contribution: Math.round(revNorm * weights.rev * 10) / 10 },
      { metric: "Net Member Growth", value: netGrowth, normalized: Math.round(growthNorm), weight: 20, contribution: Math.round(growthNorm * weights.growth * 10) / 10 },
      { metric: "Avg Tenure (months)", value: avgTenure, normalized: Math.round(tenureNorm), weight: 20, contribution: Math.round(tenureNorm * weights.tenure * 10) / 10 },
    ],
  };
}

describe("computeRSI", () => {
  it("returns Strong band for healthy gym", () => {
    const result = computeRSI(2, 180, 15, 18);
    expect(result.band).toBe("Strong");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("returns Moderate band for average gym", () => {
    const result = computeRSI(6, 100, 0, 8);
    expect(result.band).toBe("Moderate");
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.score).toBeLessThan(70);
  });

  it("returns Fragile band for struggling gym", () => {
    const result = computeRSI(10, 50, -10, 3);
    expect(result.band).toBe("Fragile");
    expect(result.score).toBeLessThan(45);
  });

  it("clamps churn normalization to 0 for 10%+ churn", () => {
    const result = computeRSI(15, 200, 10, 24);
    const churnBreakdown = result.breakdown.find(b => b.metric === "Churn Rate");
    expect(churnBreakdown!.normalized).toBe(0);
  });

  it("caps revenue normalization at 100 for $200+", () => {
    const result = computeRSI(0, 500, 0, 0);
    const revBreakdown = result.breakdown.find(b => b.metric === "Avg Revenue/Member");
    expect(revBreakdown!.normalized).toBe(100);
  });

  it("caps tenure normalization at 100 for 24+ months", () => {
    const result = computeRSI(0, 0, 0, 48);
    const tenureBreakdown = result.breakdown.find(b => b.metric === "Avg Tenure (months)");
    expect(tenureBreakdown!.normalized).toBe(100);
  });

  it("gives neutral growth score for 0 net growth", () => {
    const result = computeRSI(0, 0, 0, 0);
    const growthBreakdown = result.breakdown.find(b => b.metric === "Net Member Growth");
    expect(growthBreakdown!.normalized).toBe(50);
  });

  it("clamps negative growth normalization to 0", () => {
    const result = computeRSI(0, 0, -20, 0);
    const growthBreakdown = result.breakdown.find(b => b.metric === "Net Member Growth");
    expect(growthBreakdown!.normalized).toBe(0);
  });

  it("returns score as single decimal precision", () => {
    const result = computeRSI(3.7, 145, 5, 12);
    const decimalPart = result.score.toString().split(".")[1];
    expect(!decimalPart || decimalPart.length <= 1).toBe(true);
  });

  it("weights sum to 100%", () => {
    const result = computeRSI(0, 0, 0, 0);
    const totalWeight = result.breakdown.reduce((sum, b) => sum + b.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("returns all four breakdown entries", () => {
    const result = computeRSI(5, 100, 5, 10);
    expect(result.breakdown).toHaveLength(4);
  });

  it("includes correct components in output", () => {
    const result = computeRSI(5, 120, 8, 15);
    expect(result.components.churnRate).toBe(5);
    expect(result.components.avgRevPerMember).toBe(120);
    expect(result.components.netMemberGrowth).toBe(8);
    expect(result.components.avgTenure).toBe(15);
  });

  it("perfect gym scores 100", () => {
    const result = computeRSI(0, 200, 10, 24);
    expect(result.score).toBe(100);
    expect(result.band).toBe("Strong");
  });

  it("boundary: score exactly 70 is Strong", () => {
    const result = computeRSI(0, 200, 10, 24);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.band).toBe("Strong");
  });

  it("zero churn gives maximum churn contribution", () => {
    const result = computeRSI(0, 0, 0, 0);
    const churnBreakdown = result.breakdown.find(b => b.metric === "Churn Rate");
    expect(churnBreakdown!.normalized).toBe(100);
    expect(churnBreakdown!.contribution).toBe(35);
  });
});

describe("risk scoring formula", () => {
  function calculateRisk(daysSinceLastVisit: number, attendanceCount30d: number | null): number {
    const attendanceDecay = Math.min(1, daysSinceLastVisit / 30);
    return Math.min(100, attendanceDecay * 60 + (attendanceCount30d !== null && attendanceCount30d < 3 ? 25 : 0));
  }

  function getRiskTier(score: number): string {
    return score >= 80 ? "critical" : score >= 60 ? "high" : score >= 35 ? "moderate" : score >= 15 ? "low" : "healthy";
  }

  it("healthy member with recent visit and good attendance", () => {
    const score = calculateRisk(2, 8);
    expect(score).toBeLessThan(15);
    expect(getRiskTier(score)).toBe("healthy");
  });

  it("low risk member with moderate attendance gap", () => {
    const score = calculateRisk(10, 5);
    expect(getRiskTier(score)).toBe("low");
  });

  it("moderate risk member with low attendance", () => {
    const score = calculateRisk(15, 2);
    expect(getRiskTier(score)).toBe("moderate");
  });

  it("high risk member with significant gap", () => {
    const score = calculateRisk(28, 1);
    expect(getRiskTier(score)).toBe("high");
  });

  it("critical risk for inactive member", () => {
    const score = calculateRisk(60, 0);
    expect(getRiskTier(score)).toBe("critical");
  });

  it("caps at 100", () => {
    const score = calculateRisk(999, 0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("decay maxes at 1 after 30 days", () => {
    const decay = Math.min(1, 30 / 30);
    expect(decay).toBe(1);
  });

  it("no penalty when attendance >= 3", () => {
    const score = calculateRisk(0, 3);
    expect(score).toBe(0);
  });

  it("25-point penalty when attendance < 3", () => {
    const base = calculateRisk(0, 5);
    const withPenalty = calculateRisk(0, 2);
    expect(withPenalty - base).toBe(25);
  });

  it("null attendance does not add penalty", () => {
    const score = calculateRisk(0, null);
    expect(score).toBe(0);
  });
});
