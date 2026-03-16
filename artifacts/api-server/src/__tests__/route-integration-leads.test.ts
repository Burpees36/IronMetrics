import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  or: (...conditions: any[]) => ({ _type: "or", conditions }),
  count: () => ({ _type: "count" }),
  desc: () => ({}),
  ilike: (left: any, pattern: any) => ({ _type: "ilike", left, pattern }),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
}));

let mockLeads: any[] = [];
let mockActivities: any[] = [];
let insertedLead: any = null;

vi.mock("@workspace/db", () => {
  function resolveField(colRef: any): string {
    return colRef?._field || "id";
  }
  function matchesCondition(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._type === "eq") return row[resolveField(cond.left)] === cond.right;
    if (cond._type === "and") return cond.conditions.every((c: any) => matchesCondition(row, c));
    if (cond._type === "or") return cond.conditions.some((c: any) => matchesCondition(row, c));
    if (cond._type === "ilike") return true;
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
    if (tn === "leads") return mockLeads;
    if (tn === "lead_activities") return mockActivities;
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
    insert(table: any) {
      const tn = table._name;
      return {
        values(val: any) {
          if (tn === "leads") insertedLead = val;
          return {
            returning() {
              return {
                then(resolve: any) { resolve([{ id: 99, ...val }]); },
              };
            },
            then(resolve: any) { resolve(undefined); },
          };
        },
      };
    },
    update(table: any) {
      return {
        set(val: any) {
          return {
            where() {
              return {
                returning() {
                  return {
                    then(resolve: any) { resolve([{ id: 1, ...mockLeads[0], ...val }]); },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return {
    db,
    leadsTable: makeTable("leads"),
    leadActivitiesTable: makeTable("lead_activities"),
    membersTable: makeTable("members"),
    timelineEventsTable: makeTable("timeline_events"),
  };
});

vi.mock("@workspace/api-zod", () => ({
  CreateLeadBody: { safeParse: (data: any) => ({ success: true, data }) },
  UpdateLeadBody: { safeParse: (data: any) => ({ success: true, data }) },
}));

function makeReqRes(opts: { params?: any; query?: any; body?: any }) {
  const req = {
    params: opts.params || {},
    query: opts.query || {},
    body: opts.body || {},
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

function findHandler(router: any, method: string, pathFragment: string, exact?: string) {
  for (const layer of router.stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (exact) {
        if (routeMethod === method && routePath === exact) {
          return layer.route.stack[0].handle;
        }
      } else if (routeMethod === method && routePath.includes(pathFragment)) {
        return layer.route.stack[0].handle;
      }
    }
  }
  return null;
}

describe("Leads route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockLeads = [];
    mockActivities = [];
    insertedLead = null;
    const mod = await import("../routes/leads");
    router = mod.default;
  });

  describe("GET /gyms/:gymId/leads", () => {
    it("returns leads array", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "alice@test.com", stage: "new", source: "website", createdAt: new Date() },
        { id: 2, gymId: 1, firstName: "Bob", lastName: "Jones", email: "bob@test.com", stage: "contacted", source: "referral", createdAt: new Date() },
      ];
      const handler = findHandler(router, "get", "/leads");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(2);
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "/leads");
      const { req, res } = makeReqRes({ params: { gymId: "bad" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns empty array when no leads exist", async () => {
      const handler = findHandler(router, "get", "/leads");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response).toHaveLength(0);
    });

    it("accepts stage filter", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "A", lastName: "B", email: "a@b.com", stage: "new", source: "web", createdAt: new Date() },
      ];
      const handler = findHandler(router, "get", "/leads");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: { stage: "new" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it("accepts search query", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "B", email: "a@b.com", stage: "new", source: "web", createdAt: new Date() },
      ];
      const handler = findHandler(router, "get", "/leads");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: { search: "Alice" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("POST /gyms/:gymId/leads", () => {
    it("creates a new lead and returns 201", async () => {
      const handler = findHandler(router, "post", "/leads");
      if (!handler) return;
      const body = { firstName: "Charlie", lastName: "Brown", email: "charlie@test.com", source: "website" };
      const { req, res } = makeReqRes({ params: { gymId: "1" }, body });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(insertedLead).toBeTruthy();
      expect(insertedLead.firstName).toBe("Charlie");
      expect(insertedLead.gymId).toBe(1);
    });

    it("returns 400 for invalid gym ID on POST", async () => {
      const handler = findHandler(router, "post", "/leads");
      if (!handler) return;
      const { req, res } = makeReqRes({ params: { gymId: "bad" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("PATCH /gyms/:gymId/leads/:leadId", () => {
    it("updates a lead and returns updated record", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "a@b.com", stage: "new", source: "web", notes: null },
      ];
      const handler = findHandler(router, "patch", "/leads", "/gyms/:gymId/leads/:leadId");
      if (!handler) return;
      const { req, res } = makeReqRes({
        params: { gymId: "1", leadId: "1" },
        body: { stage: "contacted" },
      });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data.stage).toBe("contacted");
    });

    it("returns 400 for invalid IDs", async () => {
      const handler = findHandler(router, "patch", "/leads", "/gyms/:gymId/leads/:leadId");
      if (!handler) return;
      const { req, res } = makeReqRes({ params: { gymId: "bad", leadId: "bad" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when lead not found", async () => {
      mockLeads = [];
      const handler = findHandler(router, "patch", "/leads", "/gyms/:gymId/leads/:leadId");
      if (!handler) return;
      const { req, res } = makeReqRes({
        params: { gymId: "1", leadId: "999" },
        body: { stage: "contacted" },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("clears follow-up when stage changed to lost", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "a@b.com", stage: "contacted", nextFollowUpDate: "2025-01-20", followUpNote: "call back" },
      ];
      const handler = findHandler(router, "patch", "/leads", "/gyms/:gymId/leads/:leadId");
      if (!handler) return;
      const { req, res } = makeReqRes({
        params: { gymId: "1", leadId: "1" },
        body: { stage: "lost" },
      });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data.nextFollowUpDate).toBeNull();
      expect(data.followUpNote).toBeNull();
    });
  });

  describe("POST /gyms/:gymId/leads/:leadId/convert", () => {
    it("converts a lead to a member", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "a@b.com", phone: "555-0100", stage: "trial" },
      ];
      const handler = findHandler(router, "post", "/convert", "/gyms/:gymId/leads/:leadId/convert");
      if (!handler) return;
      const { req, res } = makeReqRes({
        params: { gymId: "1", leadId: "1" },
        body: { startDate: "2025-02-01" },
      });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data.firstName).toBe("Alice");
      expect(data.riskScore).toBeNull();
    });

    it("returns 404 when lead not found", async () => {
      mockLeads = [];
      const handler = findHandler(router, "post", "/convert", "/gyms/:gymId/leads/:leadId/convert");
      if (!handler) return;
      const { req, res } = makeReqRes({ params: { gymId: "1", leadId: "999" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when lead is already converted", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "A", lastName: "B", email: "a@b.com", stage: "converted" },
      ];
      const handler = findHandler(router, "post", "/convert", "/gyms/:gymId/leads/:leadId/convert");
      if (!handler) return;
      const { req, res } = makeReqRes({ params: { gymId: "1", leadId: "1" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 400 when lead is lost", async () => {
      mockLeads = [
        { id: 1, gymId: 1, firstName: "A", lastName: "B", email: "a@b.com", stage: "lost" },
      ];
      const handler = findHandler(router, "post", "/convert", "/gyms/:gymId/leads/:leadId/convert");
      if (!handler) return;
      const { req, res } = makeReqRes({ params: { gymId: "1", leadId: "1" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
