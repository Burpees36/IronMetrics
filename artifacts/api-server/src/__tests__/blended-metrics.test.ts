import { describe, it, expect, vi, beforeEach } from "vitest";

let mockMembers: any[] = [];
let mockSubscriptions: any[] = [];
let mockAttendance: any[] = [];

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  gte: (left: any, right: any) => ({ _type: "gte", left, right }),
  count: () => ({ _type: "count" }),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => {
      const template = strings.join("__VAL__");
      if (template.includes("IS NOT NULL")) {
        const field = values[0]?._field;
        return { _type: "isNotNull", field };
      }
      if (template.includes("AS numeric) > 0")) {
        const field = values[0]?._field;
        return { _type: "numericGt0", field };
      }
      if (template.includes(" < ")) {
        const field = values[0]?._field;
        const compareValue = values[1];
        return { _type: "lt_sql", field, value: compareValue };
      }
      return {};
    },
    { raw: () => ({}) },
  ),
  notInArray: (left: any, values: any[]) => ({ _type: "notInArray", left, values }),
}));

vi.mock("@workspace/db", () => {
  function resolveField(colRef: any): string {
    return colRef?._field || "id";
  }
  function matchesCondition(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._type === "eq") return row[resolveField(cond.left)] === cond.right;
    if (cond._type === "gte") {
      const field = resolveField(cond.left);
      return row[field] >= cond.right;
    }
    if (cond._type === "notInArray") {
      const field = resolveField(cond.left);
      return !cond.values.includes(row[field]);
    }
    if (cond._type === "isNotNull") {
      return row[cond.field] !== null && row[cond.field] !== undefined;
    }
    if (cond._type === "numericGt0") {
      const val = parseFloat(row[cond.field] || "0");
      return !isNaN(val) && val > 0;
    }
    if (cond._type === "lt_sql") {
      return row[cond.field] < cond.value;
    }
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
  function getTableData(tn: string): any[] {
    if (tn === "members") return mockMembers;
    if (tn === "subscriptions") return mockSubscriptions;
    if (tn === "attendance") return mockAttendance;
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
            then(resolve: any) {
              const data = getTableData(tn);
              const filtered = data.filter((r: any) => matchesCondition(r, cond));
              if (fields && fields.count) {
                resolve([{ count: filtered.length }]);
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
  };
});

import {
  computeBlendedMRR,
  computeBlendedEngagement,
  getBlendedGymMetrics,
  getMemberRevenueFromMembersTable,
  isActiveBillableMember,
} from "../blendedMetrics";

describe("computeBlendedMRR", () => {
  beforeEach(() => {
    mockMembers = [];
    mockSubscriptions = [];
    mockAttendance = [];
  });

  describe("subscription-only gym", () => {
    it("MRR equals sum of active subscription amounts", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: null },
        { id: 2, gymId: 1, status: "active", monthlyRevenue: null },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, memberId: 1, status: "active", amount: "100.00" },
        { id: 2, gymId: 1, memberId: 2, status: "active", amount: "200.00" },
      ];
      const result = await computeBlendedMRR(1);
      expect(result.subscriptionMRR).toBe(300);
      expect(result.wodifyMRR).toBe(0);
      expect(result.totalMRR).toBe(300);
      expect(result.revenueSource).toBe("subscriptions_only");
      expect(result.hasSubscriptionData).toBe(true);
      expect(result.activeSubscriptionCount).toBe(2);
    });
  });

  describe("Wodify-only gym", () => {
    it("MRR equals sum of active members monthlyRevenue", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "150.00" },
        { id: 2, gymId: 1, status: "active", monthlyRevenue: "100.00" },
      ];
      mockSubscriptions = [];
      const result = await computeBlendedMRR(1);
      expect(result.subscriptionMRR).toBe(0);
      expect(result.wodifyMRR).toBe(250);
      expect(result.totalMRR).toBe(250);
      expect(result.revenueSource).toBe("wodify_only");
      expect(result.hasSubscriptionData).toBe(false);
      expect(result.activeSubscriptionCount).toBe(0);
    });
  });

  describe("mixed gym — anti-double-counting", () => {
    it("member covered by subscription does NOT contribute monthlyRevenue", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "200.00" },
        { id: 2, gymId: 1, status: "active", monthlyRevenue: "150.00" },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, memberId: 1, status: "active", amount: "100.00" },
      ];
      const result = await computeBlendedMRR(1);
      expect(result.subscriptionMRR).toBe(100);
      expect(result.wodifyMRR).toBe(150);
      expect(result.totalMRR).toBe(250);
      expect(result.revenueSource).toBe("blended");
      expect(result.hasSubscriptionData).toBe(true);
    });

    it("cancelled subscription still counts as hasSubscriptionData", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "100.00" },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, memberId: 1, status: "cancelled", amount: "50.00" },
      ];
      const result = await computeBlendedMRR(1);
      expect(result.subscriptionMRR).toBe(0);
      expect(result.hasSubscriptionData).toBe(true);
    });
  });

  describe("null/zero monthlyRevenue handling", () => {
    it("member with null monthlyRevenue contributes 0", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: null },
      ];
      mockSubscriptions = [];
      const result = await computeBlendedMRR(1);
      expect(result.wodifyMRR).toBe(0);
      expect(result.totalMRR).toBe(0);
      expect(Number.isNaN(result.totalMRR)).toBe(false);
    });

    it("member with monthlyRevenue '0' contributes 0", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "0" },
      ];
      mockSubscriptions = [];
      const result = await computeBlendedMRR(1);
      expect(result.wodifyMRR).toBe(0);
      expect(result.totalMRR).toBe(0);
      expect(Number.isNaN(result.totalMRR)).toBe(false);
    });

    it("member with monthlyRevenue '0.00' contributes 0", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "0.00" },
      ];
      mockSubscriptions = [];
      const result = await computeBlendedMRR(1);
      expect(result.wodifyMRR).toBe(0);
    });

    it("SQL filters exclude null and zero rows — only positive values contribute to Wodify MRR", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "100.00" },
        { id: 2, gymId: 1, status: "active", monthlyRevenue: null },
        { id: 3, gymId: 1, status: "active", monthlyRevenue: "0" },
        { id: 4, gymId: 1, status: "active", monthlyRevenue: "0.00" },
        { id: 5, gymId: 1, status: "active", monthlyRevenue: "50.00" },
      ];
      mockSubscriptions = [];
      const result = await computeBlendedMRR(1);
      expect(result.wodifyMRR).toBe(150);
      expect(result.totalMRR).toBe(150);
    });

    it("SQL filters exclude null/zero rows even in mixed gym with coveredMemberIds", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "200.00" },
        { id: 2, gymId: 1, status: "active", monthlyRevenue: null },
        { id: 3, gymId: 1, status: "active", monthlyRevenue: "0" },
        { id: 4, gymId: 1, status: "active", monthlyRevenue: "75.00" },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, memberId: 1, status: "active", amount: "100.00" },
      ];
      const result = await computeBlendedMRR(1);
      expect(result.subscriptionMRR).toBe(100);
      expect(result.wodifyMRR).toBe(75);
      expect(result.totalMRR).toBe(175);
    });
  });

  describe("ARM calculation", () => {
    it("ARM = totalMRR / activeBillableMembers", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: null },
        { id: 2, gymId: 1, status: "active", monthlyRevenue: null },
      ];
      mockSubscriptions = [
        { id: 1, gymId: 1, memberId: 1, status: "active", amount: "100.00" },
        { id: 2, gymId: 1, memberId: 2, status: "active", amount: "200.00" },
      ];
      const result = await computeBlendedMRR(1);
      expect(result.arm).toBe(150);
    });

    it("ARM is 0 when no active members", async () => {
      const result = await computeBlendedMRR(1);
      expect(result.arm).toBe(0);
      expect(Number.isNaN(result.arm)).toBe(false);
    });
  });

  describe("empty gym", () => {
    it("returns all zeros without throwing", async () => {
      const result = await computeBlendedMRR(999);
      expect(result.totalMRR).toBe(0);
      expect(result.subscriptionMRR).toBe(0);
      expect(result.wodifyMRR).toBe(0);
      expect(result.activeSubscriptionCount).toBe(0);
      expect(result.activeBillableMembers).toBe(0);
      expect(result.arm).toBe(0);
      expect(result.revenueSource).toBe("wodify_only");
      expect(result.hasSubscriptionData).toBe(false);
    });
  });

  describe("cancelled members excluded", () => {
    it("cancelled members do not count as activeBillableMembers", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", monthlyRevenue: "100.00" },
        { id: 2, gymId: 1, status: "cancelled", monthlyRevenue: "200.00" },
      ];
      mockSubscriptions = [];
      const result = await computeBlendedMRR(1);
      expect(result.activeBillableMembers).toBe(1);
    });
  });
});

describe("computeBlendedEngagement", () => {
  beforeEach(() => {
    mockMembers = [];
    mockSubscriptions = [];
    mockAttendance = [];
  });

  describe("attendance table precedence", () => {
    it("member with attendance table rows + Wodify summary: only attendance table counts", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: 3, lastVisitDate: new Date() },
      ];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
      ];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(1);
      expect(result.attendanceSource).toBe("attendance_table");
    });

    it("member with zero attendance rows + daysSinceLastAttendance <= 7: counted as engaged via Wodify", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: 3, lastVisitDate: null },
      ];
      mockAttendance = [];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(1);
      expect(result.attendanceSource).toBe("wodify_summary");
    });

    it("member with zero attendance rows + daysSinceLastAttendance > 14: not counted as engaged", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: 30, lastVisitDate: null },
      ];
      mockAttendance = [];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(0);
      expect(result.engagedPriorWeek).toBe(0);
    });

    it("member with neither attendance rows nor Wodify summary: not counted", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
      ];
      mockAttendance = [];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(0);
      expect(result.engagedPriorWeek).toBe(0);
      expect(result.attendanceSource).toBe("none");
    });
  });

  describe("prior-week engagement", () => {
    it("daysSinceLastAttendance between 8-14 counted in prior week", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: 10, lastVisitDate: null },
      ];
      mockAttendance = [];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(0);
      expect(result.engagedPriorWeek).toBe(1);
    });

    it("current-week attendance row does not count in prior-week bucket (SQL < weekAgo filter)", async () => {
      const now = new Date();
      const recentCheckin = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
      ];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: recentCheckin },
      ];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(1);
      expect(result.engagedPriorWeek).toBe(0);
    });

    it("prior-week attendance row does not count in current-week bucket", async () => {
      const now = new Date();
      const priorCheckin = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
      ];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: priorCheckin },
      ];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(0);
      expect(result.engagedPriorWeek).toBe(1);
    });
  });

  describe("source metadata", () => {
    it("attendance_table when only attendance records exist", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
      ];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
      ];
      const result = await computeBlendedEngagement(1);
      expect(result.attendanceSource).toBe("attendance_table");
    });

    it("wodify_summary when only Wodify engagement data exists", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: 5, lastVisitDate: null },
      ];
      mockAttendance = [];
      const result = await computeBlendedEngagement(1);
      expect(result.attendanceSource).toBe("wodify_summary");
    });

    it("mixed when both attendance records and Wodify summary exist", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
        { id: 2, gymId: 1, status: "active", daysSinceLastAttendance: 3, lastVisitDate: null },
      ];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
      ];
      const result = await computeBlendedEngagement(1);
      expect(result.attendanceSource).toBe("mixed");
    });

    it("none when no engagement data at all", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
      ];
      mockAttendance = [];
      const result = await computeBlendedEngagement(1);
      expect(result.attendanceSource).toBe("none");
    });
  });

  describe("safe defaults", () => {
    it("zero active members returns engagement=0 without errors", async () => {
      const result = await computeBlendedEngagement(1);
      expect(result.engagementRate).toBe(0);
      expect(result.engagementChange).toBe(0);
      expect(result.engagedThisWeek).toBe(0);
      expect(result.engagedPriorWeek).toBe(0);
      expect(result.totalActive).toBe(0);
      expect(result.attendanceSource).toBe("none");
    });

    it("empty gym returns all zeros", async () => {
      const result = await computeBlendedEngagement(999);
      expect(result.engagementRate).toBe(0);
      expect(result.totalActive).toBe(0);
    });
  });

  describe("engagement rate calculation", () => {
    it("computes correct engagement rate percentage", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
        { id: 2, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
        { id: 3, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
        { id: 4, gymId: 1, status: "active", daysSinceLastAttendance: null, lastVisitDate: null },
      ];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
      ];
      const result = await computeBlendedEngagement(1);
      expect(result.engagedThisWeek).toBe(1);
      expect(result.totalActive).toBe(4);
      expect(result.engagementRate).toBe(25);
    });
  });
});

describe("getBlendedGymMetrics", () => {
  beforeEach(() => {
    mockMembers = [];
    mockSubscriptions = [];
    mockAttendance = [];
  });

  it("returns consistent values with separate calls to computeBlendedMRR and computeBlendedEngagement", async () => {
    mockMembers = [
      { id: 1, gymId: 1, status: "active", monthlyRevenue: "100.00", daysSinceLastAttendance: 3, lastVisitDate: null, joinDate: "2024-01-01" },
      { id: 2, gymId: 1, status: "active", monthlyRevenue: null, daysSinceLastAttendance: null, lastVisitDate: null, joinDate: "2024-06-01" },
      { id: 3, gymId: 1, status: "cancelled", monthlyRevenue: null, daysSinceLastAttendance: null, lastVisitDate: null, joinDate: "2024-03-01", updatedAt: "2025-01-01" },
    ];
    mockSubscriptions = [
      { id: 1, gymId: 1, memberId: 2, status: "active", amount: "150.00" },
    ];
    mockAttendance = [];

    const composite = await getBlendedGymMetrics(1);
    const separateMRR = await computeBlendedMRR(1);
    const separateEngagement = await computeBlendedEngagement(1);

    expect(composite.mrr.totalMRR).toBe(separateMRR.totalMRR);
    expect(composite.mrr.subscriptionMRR).toBe(separateMRR.subscriptionMRR);
    expect(composite.mrr.wodifyMRR).toBe(separateMRR.wodifyMRR);
    expect(composite.mrr.revenueSource).toBe(separateMRR.revenueSource);
    expect(composite.mrr.hasSubscriptionData).toBe(separateMRR.hasSubscriptionData);
    expect(composite.mrr.arm).toBe(separateMRR.arm);

    expect(composite.engagement.engagementRate).toBe(separateEngagement.engagementRate);
    expect(composite.engagement.attendanceSource).toBe(separateEngagement.attendanceSource);
    expect(composite.engagement.engagedThisWeek).toBe(separateEngagement.engagedThisWeek);
    expect(composite.engagement.engagedPriorWeek).toBe(separateEngagement.engagedPriorWeek);

    expect(composite.activeBillableMembers).toBe(separateMRR.activeBillableMembers);
    expect(composite.avgRevPerMember).toBe(separateMRR.arm);
  });

  it("computes correct member counts and churn rate", async () => {
    mockMembers = [
      { id: 1, gymId: 1, status: "active", monthlyRevenue: null, daysSinceLastAttendance: null, lastVisitDate: null, joinDate: "2024-01-01" },
      { id: 2, gymId: 1, status: "cancelled", monthlyRevenue: null, daysSinceLastAttendance: null, lastVisitDate: null, joinDate: "2024-02-01" },
      { id: 3, gymId: 1, status: "hold", monthlyRevenue: null, daysSinceLastAttendance: null, lastVisitDate: null, joinDate: "2024-03-01" },
    ];
    mockSubscriptions = [];
    mockAttendance = [];

    const result = await getBlendedGymMetrics(1);
    expect(result.totalMembers).toBe(3);
    expect(result.cancelledMembers).toBe(1);
    expect(result.holdMembers).toBe(1);
    expect(result.activeBillableMembers).toBe(1);
    expect(result.churnRate).toBeCloseTo(33.3, 0);
    expect(result.netGrowth).toBe(0);
  });

  it("returns all zeros for empty gym", async () => {
    const result = await getBlendedGymMetrics(999);
    expect(result.totalMembers).toBe(0);
    expect(result.cancelledMembers).toBe(0);
    expect(result.holdMembers).toBe(0);
    expect(result.activeBillableMembers).toBe(0);
    expect(result.churnRate).toBe(0);
    expect(result.netGrowth).toBe(0);
    expect(result.avgTenure).toBe(0);
    expect(result.avgRevPerMember).toBe(0);
    expect(result.mrr.totalMRR).toBe(0);
    expect(result.engagement.engagementRate).toBe(0);
  });
});

describe("getMemberRevenueFromMembersTable", () => {
  it("returns parsed value for valid monthlyRevenue", () => {
    expect(getMemberRevenueFromMembersTable({ monthlyRevenue: "150.50" })).toBe(150.50);
  });

  it("returns 0 for null monthlyRevenue", () => {
    expect(getMemberRevenueFromMembersTable({ monthlyRevenue: null })).toBe(0);
  });

  it("returns 0 for empty string monthlyRevenue", () => {
    expect(getMemberRevenueFromMembersTable({ monthlyRevenue: "" })).toBe(0);
  });

  it("returns 0 for non-numeric monthlyRevenue", () => {
    expect(getMemberRevenueFromMembersTable({ monthlyRevenue: "abc" })).toBe(0);
  });

  it("returns 0 for '0' monthlyRevenue", () => {
    expect(getMemberRevenueFromMembersTable({ monthlyRevenue: "0" })).toBe(0);
  });
});

describe("isActiveBillableMember", () => {
  it("returns true for 'active' status", () => {
    expect(isActiveBillableMember("active")).toBe(true);
  });

  it("returns false for 'cancelled' status", () => {
    expect(isActiveBillableMember("cancelled")).toBe(false);
  });

  it("returns false for 'hold' status", () => {
    expect(isActiveBillableMember("hold")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isActiveBillableMember("")).toBe(false);
  });
});
