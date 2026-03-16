import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  gte: (left: any, right: any) => ({ _type: "gte", left, right }),
  lt: (left: any, right: any) => ({ _type: "lt", left, right }),
  desc: () => ({}),
}));

let mockSubs: any[] = [];
let mockPayments: any[] = [];
let mockRefunds: any[] = [];

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
    if (cond._type === "lt") {
      const field = resolveField(cond.left);
      return row[field] < cond.right;
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
    if (tn === "subscriptions") return mockSubs;
    if (tn === "payments") return mockPayments;
    if (tn === "refunds") return mockRefunds;
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
              resolve(data.filter((r: any) => matchesCondition(r, cond)));
            },
          };
          return chain;
        },
      };
    },
  };
  return {
    db,
    subscriptionsTable: makeTable("subscriptions"),
    paymentsTable: makeTable("payments"),
    refundsTable: makeTable("refunds"),
  };
});

import { computeBillingSummary, computeMRR, computeARM, getMonthWindow } from "../billingMetrics";

describe("computeBillingSummary integration", () => {
  beforeEach(() => {
    mockSubs = [];
    mockPayments = [];
    mockRefunds = [];
  });

  it("returns zero summary for empty gym", async () => {
    const result = await computeBillingSummary(1);
    expect(result.mrr).toBe(0);
    expect(result.arr).toBe(0);
    expect(result.arm).toBe(0);
    expect(result.activeSubscriptions).toBe(0);
    expect(result.totalSubscriptions).toBe(0);
    expect(result.failedPayments).toBe(0);
    expect(result.overdueAccounts).toBe(0);
  });

  it("computes MRR from active subscriptions", async () => {
    mockSubs = [
      { id: 1, gymId: 1, status: "active", amount: "100.00", failedPayments: 0, cancelledAt: null },
      { id: 2, gymId: 1, status: "active", amount: "150.00", failedPayments: 0, cancelledAt: null },
      { id: 3, gymId: 1, status: "cancelled", amount: "200.00", failedPayments: 0, cancelledAt: null },
    ];
    const result = await computeBillingSummary(1);
    expect(result.mrr).toBe(250);
    expect(result.arr).toBe(3000);
    expect(result.activeSubscriptions).toBe(2);
    expect(result.totalSubscriptions).toBe(3);
  });

  it("computes ARM correctly", async () => {
    mockSubs = [
      { id: 1, gymId: 1, status: "active", amount: "100.00", failedPayments: 0, cancelledAt: null },
      { id: 2, gymId: 1, status: "active", amount: "200.00", failedPayments: 0, cancelledAt: null },
    ];
    const result = await computeBillingSummary(1);
    expect(result.arm).toBe(150);
  });

  it("counts failed payment subscriptions", async () => {
    mockSubs = [
      { id: 1, gymId: 1, status: "active", amount: "100.00", failedPayments: 2, cancelledAt: null },
      { id: 2, gymId: 1, status: "active", amount: "100.00", failedPayments: 0, cancelledAt: null },
    ];
    const result = await computeBillingSummary(1);
    expect(result.failedPayments).toBe(1);
  });

  it("counts overdue (past_due) accounts", async () => {
    mockSubs = [
      { id: 1, gymId: 1, status: "past_due", amount: "100.00", failedPayments: 1, cancelledAt: null },
      { id: 2, gymId: 1, status: "active", amount: "100.00", failedPayments: 0, cancelledAt: null },
    ];
    const result = await computeBillingSummary(1);
    expect(result.overdueAccounts).toBe(1);
  });

  it("sums collections for current month", async () => {
    const now = new Date();
    const { start, end } = getMonthWindow(now);
    mockSubs = [{ id: 1, gymId: 1, status: "active", amount: "100.00", failedPayments: 0, cancelledAt: null }];
    mockPayments = [
      { id: 1, gymId: 1, status: "succeeded", amount: "100.00", createdAt: new Date(start.getTime() + 86400000) },
      { id: 2, gymId: 1, status: "succeeded", amount: "50.00", createdAt: new Date(start.getTime() + 172800000) },
      { id: 3, gymId: 1, status: "failed", amount: "75.00", createdAt: new Date(start.getTime() + 86400000) },
    ];
    const result = await computeBillingSummary(1, now);
    expect(result.collectionsThisMonth).toBe(150);
  });

  it("sums refunds for current month", async () => {
    const now = new Date();
    const { start } = getMonthWindow(now);
    mockSubs = [];
    mockRefunds = [
      { id: 1, gymId: 1, amount: "25.00", createdAt: new Date(start.getTime() + 86400000) },
      { id: 2, gymId: 1, amount: "10.00", createdAt: new Date(start.getTime() + 172800000) },
    ];
    const result = await computeBillingSummary(1, now);
    expect(result.refundsThisMonth).toBe(35);
  });

  it("counts cancelled subscriptions this month", async () => {
    const now = new Date();
    const { start } = getMonthWindow(now);
    mockSubs = [
      { id: 1, gymId: 1, status: "cancelled", amount: "100.00", failedPayments: 0, cancelledAt: new Date(start.getTime() + 86400000) },
      { id: 2, gymId: 1, status: "cancelled", amount: "100.00", failedPayments: 0, cancelledAt: new Date(2020, 1, 1) },
      { id: 3, gymId: 1, status: "active", amount: "100.00", failedPayments: 0, cancelledAt: null },
    ];
    const result = await computeBillingSummary(1, now);
    expect(result.cancelledThisMonth).toBe(1);
  });
});

describe("computeMRR pure function", () => {
  it("sums active subscription amounts", () => {
    expect(computeMRR([{ amount: "100.00" }, { amount: "150.50" }])).toBeCloseTo(250.50);
  });

  it("returns 0 for empty array", () => {
    expect(computeMRR([])).toBe(0);
  });
});

describe("computeARM pure function", () => {
  it("divides MRR by active count", () => {
    expect(computeARM(300, 2)).toBe(150);
  });

  it("returns 0 when no active subscriptions", () => {
    expect(computeARM(0, 0)).toBe(0);
  });
});
