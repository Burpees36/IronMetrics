export function computeRSI(churnRate: number, avgRevPerMember: number, netGrowth: number, avgTenure: number, totalMembers?: number) {
  if (totalMembers !== undefined && totalMembers === 0) {
    return {
      score: null,
      band: "No Data",
      components: { churnRate: 0, avgRevPerMember: 0, netMemberGrowth: 0, avgTenure: 0 },
      breakdown: [
        { metric: "Churn Rate", value: 0, normalized: 0, weight: 35, contribution: 0 },
        { metric: "Avg Revenue/Member", value: 0, normalized: 0, weight: 25, contribution: 0 },
        { metric: "Net Member Growth", value: 0, normalized: 0, weight: 20, contribution: 0 },
        { metric: "Avg Tenure (months)", value: 0, normalized: 0, weight: 20, contribution: 0 },
      ],
    };
  }

  const churnNorm = Math.max(0, Math.min(100, 100 - churnRate * 7));
  const revNorm = Math.min(100, (avgRevPerMember / 200) * 100);
  const growthNorm = Math.max(0, Math.min(100, netGrowth * 10));
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

export function calculateRiskScore(daysSinceLastVisit: number, attendanceCount30d: number | null, storedRiskScore?: string | null): number {
  const attendanceDecay = Math.min(1, daysSinceLastVisit / 30);
  if (storedRiskScore) return parseFloat(storedRiskScore);
  return Math.min(100, attendanceDecay * 60 + (attendanceCount30d !== null && attendanceCount30d < 3 ? 25 : 0));
}

export function getRiskTier(riskScore: number): string {
  return riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 35 ? "moderate" : riskScore >= 15 ? "low" : "healthy";
}
