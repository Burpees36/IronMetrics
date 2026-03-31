import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  or: (...conditions: any[]) => ({ _type: "or", conditions }),
  count: () => ({ _type: "count" }),
  desc: () => ({}),
  gte: () => ({}),
  lt: () => ({}),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
  sum: () => ({}),
  avg: () => ({}),
  notInArray: (left: any, values: any[]) => ({ _type: "notInArray", left, values }),
}));

let mockMembers: any[] = [];
let mockSubs: any[] = [];
let mockLeads: any[] = [];
let mockAttendance: any[] = [];
let mockTasks: any[] = [];
let mockInvoices: any[] = [];

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
    if (tn === "leads") return mockLeads;
    if (tn === "attendance") return mockAttendance;
    if (tn === "ai_tasks") return mockTasks;
    if (tn === "invoices") return mockInvoices;
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
    leadsTable: makeTable("leads"),
    attendanceTable: makeTable("attendance"),
    aiTasksTable: makeTable("ai_tasks"),
    invoicesTable: makeTable("invoices"),
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

describe("Intelligence route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockMembers = [];
    mockSubs = [];
    mockLeads = [];
    mockAttendance = [];
    mockTasks = [];
    mockInvoices = [];
    const mod = await import("../routes/intelligence");
    router = mod.default;
  });

  describe("GET /intelligence/rsi", () => {
    it("returns RSI score and band with blended metadata", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "A", lastName: "B", email: "a@b.com", riskScore: null, lastVisitDate: null, attendanceCount30d: 5, joinDate: "2024-01-01", monthlyRevenue: null, daysSinceLastAttendance: null },
        { id: 2, gymId: 1, status: "cancelled", firstName: "C", lastName: "D", email: "c@d.com", riskScore: null, lastVisitDate: null, attendanceCount30d: 0, joinDate: "2023-06-01", monthlyRevenue: null, daysSinceLastAttendance: null },
      ];
      mockSubs = [{ id: 1, gymId: 1, memberId: 1, status: "active", amount: "150.00" }];
      const handler = findHandler(router, "get", "intelligence/rsi");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("band");
      expect(typeof data.score).toBe("number");
      expect(["Strong", "Moderate", "Fragile"]).toContain(data.band);
      expect(data).toHaveProperty("revenueSource");
      expect(data.revenueSource).toBe("subscriptions_only");
      expect(data).toHaveProperty("attendanceSource");
      expect(data).toHaveProperty("hasSubscriptionData");
      expect(data.hasSubscriptionData).toBe(true);
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "intelligence/rsi");
      const { req, res } = makeReqRes({ params: { gymId: "abc" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("handles gym with no members", async () => {
      mockMembers = [];
      mockSubs = [];
      const handler = findHandler(router, "get", "intelligence/rsi");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("score");
    });

    it("includes trend data", async () => {
      mockMembers = [{ id: 1, gymId: 1, status: "active", monthlyRevenue: null, daysSinceLastAttendance: null, lastVisitDate: null }];
      mockSubs = [{ id: 1, gymId: 1, memberId: 1, status: "active", amount: "100.00" }];
      const handler = findHandler(router, "get", "intelligence/rsi");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("trend30d");
      expect(data).toHaveProperty("trend90d");
    });
  });

  describe("GET /intelligence/risk-radar", () => {
    it("returns risk profiles array sorted by score", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "Alice", lastName: "A", email: "a@b.com", riskScore: "85", lastVisitDate: "2024-01-01", attendanceCount30d: 0, joinDate: "2023-01-01", membershipType: "Premium", profileImageUrl: null },
        { id: 2, gymId: 1, status: "active", firstName: "Bob", lastName: "B", email: "b@b.com", riskScore: null, lastVisitDate: new Date().toISOString().split("T")[0], attendanceCount30d: 10, joinDate: "2023-06-01", membershipType: "Basic", profileImageUrl: null },
      ];
      const handler = findHandler(router, "get", "intelligence/risk-radar");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0].riskScore).toBeGreaterThanOrEqual(data[1].riskScore);
    });

    it("returns empty array for gym with no active members", async () => {
      mockMembers = [];
      const handler = findHandler(router, "get", "intelligence/risk-radar");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveLength(0);
    });

    it("each profile has required fields", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "Alice", lastName: "A", email: "a@b.com", riskScore: "50", lastVisitDate: "2024-06-01", attendanceCount30d: 5, joinDate: "2023-01-01", membershipType: "Premium", profileImageUrl: null },
      ];
      const handler = findHandler(router, "get", "intelligence/risk-radar");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      const profile = res.json.mock.calls[0][0][0];
      expect(profile).toHaveProperty("memberId");
      expect(profile).toHaveProperty("memberName");
      expect(profile).toHaveProperty("riskScore");
      expect(profile).toHaveProperty("riskTier");
      expect(profile).toHaveProperty("signals");
    });
  });

  describe("GET /intelligence/interventions", () => {
    it("returns intervention recommendations array", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "A", lastName: "B", email: "a@b.com", riskScore: "85", lastVisitDate: "2024-01-01", attendanceCount30d: 0, joinDate: "2023-01-01", membershipType: "Premium", profileImageUrl: null },
      ];
      mockLeads = [{ id: 1, gymId: 1, stage: "new" }];
      const handler = findHandler(router, "get", "intelligence/interventions");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /intelligence/cohorts", () => {
    it("returns cohort analysis data", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "A", lastName: "B", joinDate: "2024-01-15", membershipType: "Premium" },
      ];
      const handler = findHandler(router, "get", "intelligence/cohorts");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /intelligence/revenue-forecast", () => {
    it("returns revenue forecast", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "A", lastName: "B", riskScore: null, lastVisitDate: null, attendanceCount30d: 5, joinDate: "2024-01-01", membershipType: "Premium", email: "a@b.com", profileImageUrl: null, monthlyRevenue: null, daysSinceLastAttendance: null },
      ];
      mockSubs = [{ id: 1, gymId: 1, memberId: 1, status: "active", amount: "150.00" }];
      const handler = findHandler(router, "get", "intelligence/revenue-forecast");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("currentMrr");
    });
  });

  describe("GET /intelligence/overview", () => {
    it("returns full overview with rsi and topRisks", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", firstName: "A", lastName: "B", email: "a@b.com", riskScore: null, lastVisitDate: null, attendanceCount30d: 5, joinDate: "2024-01-01", membershipType: "Premium", profileImageUrl: null, monthlyRevenue: null, daysSinceLastAttendance: null },
      ];
      mockSubs = [{ id: 1, gymId: 1, memberId: 1, status: "active", amount: "150.00" }];
      const handler = findHandler(router, "get", "intelligence/overview");
      const { req, res } = makeReqRes({ params: { gymId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveProperty("rsi");
      expect(data).toHaveProperty("topRisks");
      expect(data).toHaveProperty("gymId");
      expect(data).toHaveProperty("revenueForecast");
      expect(data.revenueForecast).toHaveProperty("currentMrr");
      expect(data.revenueForecast.currentMrr).toBe(150);
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "intelligence/overview");
      const { req, res } = makeReqRes({ params: { gymId: "bad" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
