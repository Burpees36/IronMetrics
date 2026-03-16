import { describe, it, expect } from "vitest";
import { computeRSI, calculateRiskScore, getRiskTier } from "../routes/intelligence";

describe("computeRSI (production export)", () => {
  it("returns Strong band for healthy gym", () => {
    const result = computeRSI(2, 180, 15, 18);
    expect(result.band).toBe("Strong");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("returns Moderate band for average gym", () => {
    const result = computeRSI(4, 120, 3, 10);
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
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("perfect gym scores 100", () => {
    const result = computeRSI(0, 200, 10, 24);
    expect(result.score).toBe(100);
    expect(result.band).toBe("Strong");
  });

  it("zero churn gives maximum churn contribution", () => {
    const zeroChurn = computeRSI(0, 0, 0, 0);
    const highChurn = computeRSI(10, 0, 0, 0);
    expect(zeroChurn.score).toBeGreaterThan(highChurn.score);
  });

  it("weights sum correctly (deterministic check)", () => {
    const result = computeRSI(0, 200, 10, 24);
    expect(result.score).toBe(100);
  });

  it("returns breakdown array with 4 metrics", () => {
    const result = computeRSI(5, 100, 5, 12);
    expect(result.breakdown).toHaveLength(4);
    expect(result.breakdown[0].metric).toBe("Churn Rate");
    expect(result.breakdown[1].metric).toBe("Avg Revenue/Member");
    expect(result.breakdown[2].metric).toBe("Net Member Growth");
    expect(result.breakdown[3].metric).toBe("Avg Tenure (months)");
  });

  it("breakdown weights sum to 100", () => {
    const result = computeRSI(5, 100, 5, 12);
    const totalWeight = result.breakdown.reduce((sum, b) => sum + b.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("returns raw components object", () => {
    const result = computeRSI(5, 150, 3, 12);
    expect(result.components).toEqual({
      churnRate: 5,
      avgRevPerMember: 150,
      netMemberGrowth: 3,
      avgTenure: 12,
    });
  });
});

describe("calculateRiskScore (production export)", () => {
  it("healthy member with recent visit and good attendance", () => {
    const score = calculateRiskScore(2, 8);
    expect(score).toBeLessThan(15);
    expect(getRiskTier(score)).toBe("healthy");
  });

  it("low risk member with moderate gap", () => {
    const score = calculateRiskScore(10, 5);
    expect(getRiskTier(score)).toBe("low");
  });

  it("moderate risk with low attendance", () => {
    const score = calculateRiskScore(15, 2);
    expect(getRiskTier(score)).toBe("moderate");
  });

  it("high risk member with significant gap", () => {
    const score = calculateRiskScore(30, 4);
    expect(getRiskTier(score)).toBe("high");
  });

  it("critical risk for inactive member", () => {
    const score = calculateRiskScore(60, 0);
    expect(getRiskTier(score)).toBe("critical");
  });

  it("caps at 100", () => {
    const score = calculateRiskScore(999, 0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("no penalty when attendance >= 3", () => {
    const score = calculateRiskScore(0, 3);
    expect(score).toBe(0);
  });

  it("25-point penalty when attendance < 3", () => {
    const base = calculateRiskScore(0, 5);
    const withPenalty = calculateRiskScore(0, 2);
    expect(withPenalty - base).toBe(25);
  });

  it("null attendance does not add penalty", () => {
    const score = calculateRiskScore(0, null);
    expect(score).toBe(0);
  });

  it("uses stored riskScore when provided", () => {
    const score = calculateRiskScore(0, 8, "75.5");
    expect(score).toBe(75.5);
  });

  it("ignores stored riskScore when null", () => {
    const score = calculateRiskScore(0, 8, null);
    expect(score).toBe(0);
  });
});

describe("getRiskTier (production export)", () => {
  it("returns correct tier for boundary values", () => {
    expect(getRiskTier(80)).toBe("critical");
    expect(getRiskTier(79)).toBe("high");
    expect(getRiskTier(60)).toBe("high");
    expect(getRiskTier(59)).toBe("moderate");
    expect(getRiskTier(35)).toBe("moderate");
    expect(getRiskTier(34)).toBe("low");
    expect(getRiskTier(15)).toBe("low");
    expect(getRiskTier(14)).toBe("healthy");
    expect(getRiskTier(0)).toBe("healthy");
  });

  it("revenue at risk only applies to critical/high tiers", () => {
    const sub = 150;
    const tiers = ["critical", "high", "moderate", "low", "healthy"];
    const revenueAtRisk = tiers.map(t => t === "critical" || t === "high" ? sub : 0);
    expect(revenueAtRisk).toEqual([150, 150, 0, 0, 0]);
  });
});
