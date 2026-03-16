import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  count: () => ({ _type: "count" }),
  desc: () => ({}),
  gte: () => ({}),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
}));

let mockMembers: any[] = [];
let mockSubs: any[] = [];
let mockAttendance: any[] = [];
let mockLeads: any[] = [];
let mockClasses: any[] = [];
let mockInvoices: any[] = [];
let mockPlans: any[] = [];

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
  function getTableData(tn: string): any[] {
    if (tn === "members") return mockMembers;
    if (tn === "subscriptions") return mockSubs;
    if (tn === "attendance") return mockAttendance;
    if (tn === "leads") return mockLeads;
    if (tn === "classes") return mockClasses;
    if (tn === "invoices") return mockInvoices;
    if (tn === "membership_plans") return mockPlans;
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
            groupBy() { return chain; },
            then(resolve: any) {
              const data = getTableData(tn);
              if (fields && fields.count) {
                const filtered = data.filter((r: any) => matchesCondition(r, cond));
                resolve([{ count: filtered.length }]);
              } else {
                resolve(data.filter((r: any) => matchesCondition(r, cond)));
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
    classesTable: makeTable("classes"),
    invoicesTable: makeTable("invoices"),
    membershipPlansTable: makeTable("membership_plans"),
  };
});

function makeReqRes(opts: { params?: any; query?: any }) {
  const req = {
    params: opts.params || {},
    query: opts.query || {},
    gymId: 1,
    user: { id: "user-1" },
    isAuthenticated: () => true,
    gymRole: "owner",
  } as any;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as any;
  return { req, res };
}

function findHandler(router: any, method: string, pathFragment: string) {
  for (const layer of router.stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (routeMethod === method && routePath.includes(pathFragment)) {
        return layer.route.stack[0].handle;
      }
    }
  }
  return null;
}

describe("Reports route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockMembers = [];
    mockSubs = [];
    mockAttendance = [];
    mockLeads = [];
    mockClasses = [];
    mockInvoices = [];
    mockPlans = [];
    const mod = await import("../routes/reports");
    router = mod.default;
  });

  describe("GET /reports/dashboard", () => {
    it("returns dashboard stats with KPIs", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", joinDate: "2024-01-01", riskTier: null },
        { id: 2, gymId: 1, status: "active", joinDate: "2024-02-01", riskTier: null },
        { id: 3, gymId: 1, status: "cancelled", joinDate: "2024-01-15", riskTier: null },
      ];
      mockSubs = [
        { id: 1, gymId: 1, status: "active", amount: "150.00" },
        { id: 2, gymId: 1, status: "active", amount: "100.00" },
      ];
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("activeMembers");
      expect(data.activeMembers).toBe(2);
      expect(data).toHaveProperty("mrr");
      expect(data.mrr).toBe(250);
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "abc" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("computes RSI score in dashboard", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", joinDate: "2024-01-01", riskTier: null },
      ];
      mockSubs = [{ id: 1, gymId: 1, status: "active", amount: "150.00" }];
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("rsiScore");
      expect(data).toHaveProperty("rsiBand");
      expect(typeof data.rsiScore).toBe("number");
    });

    it("returns zero MRR when no active subscriptions", async () => {
      mockMembers = [{ id: 1, gymId: 1, status: "active", joinDate: "2024-01-01", riskTier: null }];
      mockSubs = [];
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data.mrr).toBe(0);
    });

    it("includes member status breakdown array", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", joinDate: "2024-01-01", riskTier: null },
        { id: 2, gymId: 1, status: "cancelled", joinDate: "2024-01-15", riskTier: null },
        { id: 3, gymId: 1, status: "hold", joinDate: "2024-02-01", riskTier: null },
      ];
      mockSubs = [];
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("memberStatusBreakdown");
      expect(data.memberStatusBreakdown).toHaveLength(3);
      const holdEntry = data.memberStatusBreakdown.find((s: any) => s.status === "hold");
      expect(holdEntry.count).toBe(1);
    });

    it("computes engagement rate from attendance", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", joinDate: "2024-01-01", riskTier: null },
        { id: 2, gymId: 1, status: "active", joinDate: "2024-02-01", riskTier: null },
      ];
      mockSubs = [];
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
      ];
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("engagementRate");
      expect(typeof data.engagementRate).toBe("number");
    });

    it("includes revenue by month array", async () => {
      mockMembers = [{ id: 1, gymId: 1, status: "active", joinDate: "2024-01-01", riskTier: null }];
      mockSubs = [{ id: 1, gymId: 1, status: "active", amount: "100.00" }];
      const handler = findHandler(router, "get", "reports/dashboard");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("revenueByMonth");
      expect(data.revenueByMonth).toHaveLength(12);
    });
  });
});
