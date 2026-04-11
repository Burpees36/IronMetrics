import { describe, it, expect } from "vitest";
import { BANNED_PHRASES } from "../services/iron-metrics-voice";
import {
  generateRSIComponentInsight,
  generateRSIOverallInsight,
  generateRevenueForecastInsight,
  generateBenchmarkInsight,
  generateConversationalBriefingItem,
  generateConversationalSummary,
} from "../routes/intelligence/insights-copy-engine";

function assertNoBanned(text: string) {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    expect(lower).not.toContain(phrase);
  }
}

function assertThreePartStructure(text: string) {
  expect(text.length).toBeGreaterThan(20);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  expect(sentences.length).toBeGreaterThanOrEqual(2);
}

const RSI_COMPONENTS = {
  churnRate: 5,
  avgRevPerMember: 120,
  netMemberGrowth: 2,
  avgTenure: 8,
};

describe("Voice compliance: RSI insights", () => {
  const metrics = ["Churn Rate", "Avg Revenue/Member", "Net Member Growth", "Avg Tenure (months)"];

  for (const metric of metrics) {
    it(`produces compliant copy for ${metric}`, () => {
      const result = generateRSIComponentInsight(
        { metric, value: 5, normalized: 0.5, weight: 0.25, contribution: 12.5 },
        RSI_COMPONENTS
      );
      assertNoBanned(result.explanation);
      assertNoBanned(result.lever);
      assertThreePartStructure(result.explanation);
    });
  }

  const bands = [
    { score: 85, band: "Strong" as const },
    { score: 55, band: "Moderate" as const },
    { score: 25, band: "Weak" as const },
  ];

  for (const { score, band } of bands) {
    it(`produces compliant RSI overall insight for ${band} band`, () => {
      const result = generateRSIOverallInsight({
        score,
        band,
        components: RSI_COMPONENTS,
        breakdown: [
          { metric: "Churn Rate", value: 5, normalized: 0.5, weight: 0.25, contribution: 12.5 },
          { metric: "Avg Revenue/Member", value: 120, normalized: 0.6, weight: 0.25, contribution: 15 },
          { metric: "Net Member Growth", value: 2, normalized: 0.4, weight: 0.25, contribution: 10 },
          { metric: "Avg Tenure (months)", value: 8, normalized: 0.7, weight: 0.25, contribution: 17.5 },
        ],
      });
      assertNoBanned(result);
      assertThreePartStructure(result);
    });
  }
});

describe("Voice compliance: Revenue forecast", () => {
  const scenarios = [
    { name: "growing", mrr: 10000, expected6m: 14000, leads: 5, churn: 4, members: 60 },
    { name: "shrinking", mrr: 10000, expected6m: 7000, leads: 0, churn: 12, members: 60 },
    { name: "flat", mrr: 10000, expected6m: 10000, leads: 2, churn: 2, members: 60 },
  ];

  for (const s of scenarios) {
    it(`produces compliant copy for ${s.name} scenario`, () => {
      const result = generateRevenueForecastInsight(
        { currentMrr: s.mrr, expectedMrr6m: s.expected6m },
        s.leads,
        s.churn,
        s.members
      );
      assertNoBanned(result.headline);
      assertNoBanned(result.currentPace);
      if (result.leadScenario) assertNoBanned(result.leadScenario);
      if (result.churnScenario) assertNoBanned(result.churnScenario);
    });
  }
});

describe("Voice compliance: Benchmark insights", () => {
  const percentiles = [90, 60, 35, 10];

  for (const pct of percentiles) {
    it(`produces compliant copy at ${pct}th percentile`, () => {
      const result = generateBenchmarkInsight({
        metric: "churn_rate",
        gymValue: 5,
        industryMedian: 6,
        percentileRank: pct,
        label: "Churn Rate",
        format: "percent",
        lowerIsBetter: true,
      });
      assertNoBanned(result.conversational);
      assertNoBanned(result.recommendation);
    });
  }
});

describe("Voice compliance: Briefing items", () => {
  const briefingTypes = [
    { type: "at_risk_critical", data: { count: 3, amount: 450 } },
    { type: "failed_payments", data: { count: 2, amount: 300 } },
    { type: "auto_suspended", data: { count: 1, names: ["John Doe"] } },
    { type: "stale_leads", data: { count: 5, avgRevPerMember: 150 } },
    { type: "new_leads", data: { count: 3 } },
    { type: "class_schedule", data: { classCount: 6, classFillRate: 45, enrolled: 54, capacity: 120 } },
    { type: "class_schedule", data: { classCount: 6, classFillRate: 90, enrolled: 108, capacity: 120 } },
    { type: "rsi_strong", data: { rsiScore: 82.5, rsiBand: "Strong" } },
    { type: "active_leads", data: { count: 8 } },
  ];

  for (const { type, data } of briefingTypes) {
    it(`produces compliant copy for ${type} (${JSON.stringify(data).slice(0, 40)})`, () => {
      const result = generateConversationalBriefingItem(type, data);
      if (result.message) assertNoBanned(result.message);
    });
  }
});

describe("Voice compliance: Conversational summary", () => {
  it("produces compliant copy for urgent snapshot", () => {
    const result = generateConversationalSummary({
      mrr: 12000,
      activeMembers: 80,
      rsiScore: 55,
      rsiBand: "Moderate",
      atRiskCritical: 3,
      revenueAtRisk: 600,
      failedPayments: 2,
      staleLeads: 4,
    });
    assertNoBanned(result);
    assertThreePartStructure(result);
  });

  it("produces compliant copy for clean snapshot", () => {
    const result = generateConversationalSummary({
      mrr: 15000,
      activeMembers: 100,
      rsiScore: 82,
      rsiBand: "Strong",
      atRiskCritical: 0,
      revenueAtRisk: 0,
      failedPayments: 0,
      staleLeads: 0,
    });
    assertNoBanned(result);
  });
});
