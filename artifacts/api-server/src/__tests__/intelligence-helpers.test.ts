import { describe, it, expect, vi, beforeEach } from "vitest";

let mockMembers: any[] = [];
let mockSubscriptions: any[] = [];
let mockAttendance: any[] = [];
let mockLeads: any[] = [];
let mockLearningStats: any[] = [];
let mockClasses: any[] = [];

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  gte: () => ({}),
  lte: () => ({}),
  desc: () => ({}),
  count: () => ({ _type: "count" }),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
  notInArray: (left: any, values: any[]) => ({ _type: "notInArray", left, values }),
  inArray: (left: any, values: any[]) => ({ _type: "inArray", left, values }),
}));

vi.mock("@workspace/db", () => {
  function resolveField(colRef: any): string {
    return colRef?._field || "id";
  }
  function matchesCondition(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._type === "eq") return row[resolveField(cond.left)] === cond.right;
    if (cond._type === "and") return cond.conditions.every((c: any) => matchesCondition(row, c));
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
            then(resolve: any) {
              let data = tn === "members" ? mockMembers :
                         tn === "subscriptions" ? mockSubscriptions :
                         tn === "attendance" ? mockAttendance :
                         tn === "leads" ? mockLeads :
                         tn === "recommendation_learning_stats" ? mockLearningStats :
                         tn === "classes" ? mockClasses : [];
              const filtered = data.filter(r => matchesCondition(r, cond));
              if (fields && fields.count) {
                resolve([{ count: filtered.length }]);
              } else if (fields && fields.id) {
                resolve(filtered.map(r => ({ id: r.id })));
              } else {
                resolve(filtered);
              }
            },
          };
          return chain;
        },
      };
    },
  };
  return {
    db,
    membersTable: makeTable("members"),
    subscriptionsTable: makeTable("subscriptions"),
    attendanceTable: makeTable("attendance"),
    leadsTable: makeTable("leads"),
    recommendationLearningStatsTable: makeTable("recommendation_learning_stats"),
    classesTable: makeTable("classes"),
  };
});

import { getGymMetrics, getRiskProfiles, getInterventions } from "../routes/intelligence";

describe("Intelligence helper functions (DB integration)", () => {
  beforeEach(() => {
    mockMembers = [];
    mockSubscriptions = [];
    mockAttendance = [];
    mockLeads = [];
    mockLearningStats = [];
    mockClasses = [];
  });

  describe("getGymMetrics", () => {
    it("returns correct member counts and financial metrics", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active" },
        { id: 2, gymId: 1, status: "active" },
        { id: 3, gymId: 1, status: "cancelled" },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, status: "active", amount: "100.00" },
        { id: 2, gymId: 1, status: "active", amount: "150.00" },
      ];

      const metrics = await getGymMetrics(1);
      expect(metrics.active).toBe(2);
      expect(metrics.cancelled).toBe(1);
      expect(metrics.total).toBe(3);
      expect(metrics.churnRate).toBeCloseTo(33.33, 1);
      expect(metrics.totalRev).toBe(250);
      expect(metrics.avgRev).toBe(125);
      expect(metrics.netGrowth).toBe(1);
    });

    it("handles empty gym with zero counts", async () => {
      const metrics = await getGymMetrics(999);
      expect(metrics.active).toBe(0);
      expect(metrics.cancelled).toBe(0);
      expect(metrics.total).toBe(0);
      expect(metrics.churnRate).toBe(0);
      expect(metrics.totalRev).toBe(0);
      expect(metrics.avgRev).toBe(0);
    });
  });

  describe("getRiskProfiles", () => {
    it("returns risk profiles for active members sorted by score", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "Alice", lastName: "A", email: "a@b.com", lastVisitDate: thirtyDaysAgo, riskScore: null, riskTier: null },
        { id: 2, gymId: 1, status: "active", firstName: "Bob", lastName: "B", email: "b@b.com", lastVisitDate: twoDaysAgo, riskScore: null, riskTier: null },
      ];
      mockAttendance = [];

      const profiles = await getRiskProfiles(1);
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles).toHaveLength(2);
      expect(profiles[0].riskScore).toBeGreaterThanOrEqual(profiles[1].riskScore);
      expect(profiles[0]).toHaveProperty("memberId");
      expect(profiles[0]).toHaveProperty("riskTier");
      expect(profiles[0]).toHaveProperty("riskScore");
    });

    it("returns empty array when no active members", async () => {
      const profiles = await getRiskProfiles(999);
      expect(profiles).toHaveLength(0);
    });
  });

  describe("getInterventions", () => {
    it("returns intervention recommendations for at-risk members", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", riskTier: "critical", monthlyRevenue: "100" },
        { id: 2, gymId: 1, status: "active", riskTier: "high", monthlyRevenue: "150" },
        { id: 3, gymId: 1, status: "active", riskTier: "low", monthlyRevenue: "120" },
      ];

      const interventions = await getInterventions(1);
      expect(Array.isArray(interventions)).toBe(true);
      expect(interventions.length).toBeGreaterThan(0);
      for (const intervention of interventions) {
        expect(intervention).toHaveProperty("category");
        expect(intervention).toHaveProperty("score");
        expect(intervention).toHaveProperty("description");
        expect(intervention).toHaveProperty("title");
        expect(intervention).toHaveProperty("impact");
        expect(intervention).toHaveProperty("actions");
      }
      const hasRetention = interventions.some((i: any) => i.category === "retention");
      expect(hasRetention).toBe(true);
    });

    it("returns empty array when gym has no actionable data", async () => {
      const interventions = await getInterventions(999);
      expect(Array.isArray(interventions)).toBe(true);
      expect(interventions.length).toBe(0);
    });

    it("returns interventions sorted by score descending", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", riskTier: "critical", monthlyRevenue: "200" },
        { id: 2, gymId: 1, status: "active", riskTier: "high", monthlyRevenue: "150" },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, status: "past_due", memberId: 1, amount: "200" },
      ];
      mockLeads = [
        { id: 1, gymId: 1, stage: "new", isStale: false },
      ];

      const interventions = await getInterventions(1);
      for (let i = 1; i < interventions.length; i++) {
        expect((interventions as any)[i - 1].score).toBeGreaterThanOrEqual((interventions as any)[i].score);
      }
    });
  });
});
