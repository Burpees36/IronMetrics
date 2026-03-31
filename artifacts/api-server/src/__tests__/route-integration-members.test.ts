import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  or: (...conditions: any[]) => ({ _type: "or", conditions }),
  count: () => ({ _type: "count" }),
  desc: () => ({}),
  ilike: (left: any, pattern: any) => ({ _type: "ilike", left, pattern }),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
  notInArray: (left: any, values: any[]) => ({ _type: "notInArray", left, values }),
  ne: (left: any, right: any) => ({ _type: "ne", left, right }),
  inArray: (left: any, values: any[]) => ({ _type: "inArray", left, values }),
}));

let mockMembers: any[] = [];
let mockNotes: any[] = [];
let insertedMember: any = null;
let updatedMember: any = null;

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
    if (tn === "members") return mockMembers;
    if (tn === "member_notes") return mockNotes;
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
            leftJoin() { return chain; },
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
      return {
        values(val: any) {
          insertedMember = val;
          return {
            returning() {
              return {
                then(resolve: any) {
                  resolve([{ id: 99, ...val }]);
                },
              };
            },
          };
        },
      };
    },
    update(table: any) {
      return {
        set(val: any) {
          updatedMember = val;
          return {
            where() {
              return {
                returning() {
                  return {
                    then(resolve: any) {
                      resolve([{ id: 1, ...mockMembers[0], ...val }]);
                    },
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
    membersTable: makeTable("members"),
    memberNotesTable: makeTable("member_notes"),
    timelineEventsTable: makeTable("timeline_events"),
    subscriptionsTable: makeTable("subscriptions"),
    attendanceTable: makeTable("attendance"),
    membershipPlansTable: makeTable("membership_plans"),
  };
});

vi.mock("../../stripeService", () => ({
  stripeService: {
    createCustomer: vi.fn().mockResolvedValue({ id: "cus_test" }),
    createSubscription: vi.fn().mockResolvedValue({ id: "sub_test" }),
  },
}));

vi.mock("../../stripeClient", () => ({
  getStripeClient: vi.fn().mockReturnValue(null),
}));

vi.mock("@workspace/api-zod", () => ({
  CreateMemberBody: { safeParse: (data: any) => ({ success: true, data }) },
  UpdateMemberBody: { safeParse: (data: any) => ({ success: true, data }) },
  AddMemberNoteBody: { safeParse: (data: any) => ({ success: true, data }) },
}));

function makeReqRes(opts: { params?: any; query?: any; body?: any; gymId?: number }) {
  const req = {
    params: opts.params || {},
    query: opts.query || {},
    body: opts.body || {},
    gymId: opts.gymId || 1,
    user: { id: "user-1" },
    isAuthenticated: () => true,
    gymRole: "owner",
  } as any;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as any;
  return { req, res };
}

describe("Members route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockMembers = [];
    mockNotes = [];
    insertedMember = null;
    updatedMember = null;
    const mod = await import("../routes/members");
    router = mod.default;
  });

  function findHandler(method: string, pathPattern: string, exact?: string): any {
    function search(stack: any[]): any {
      for (const layer of stack) {
        if (layer.route) {
          const routePath = layer.route.path;
          const routeMethod = Object.keys(layer.route.methods)[0];
          if (exact) {
            if (routeMethod === method && routePath === exact) {
              return layer.route.stack[0].handle;
            }
          } else if (routeMethod === method && routePath.includes(pathPattern)) {
            return layer.route.stack[0].handle;
          }
        } else if (layer.handle && layer.handle.stack) {
          const found = search(layer.handle.stack);
          if (found) return found;
        }
      }
      return null;
    }
    return search(router.stack);
  }

  describe("GET /gyms/:gymId/members", () => {
    it("returns members list with total count", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "alice@test.com", status: "active", riskScore: null, createdAt: new Date() },
        { id: 2, gymId: 1, firstName: "Bob", lastName: "Jones", email: "bob@test.com", status: "active", riskScore: "75.5", createdAt: new Date() },
      ];
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.members).toHaveLength(2);
      expect(response.total).toBe(2);
      expect(response.members[0].firstName).toBe("Alice");
    });

    it("parses riskScore from string to number", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "A", lastName: "B", email: "a@b.com", status: "active", riskScore: "85.3", createdAt: new Date() },
      ];
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.members[0].riskScore).toBe(85.3);
    });

    it("returns null for members without riskScore", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "A", lastName: "B", email: "a@b.com", status: "active", riskScore: null, createdAt: new Date() },
      ];
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.members[0].riskScore).toBeNull();
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "abc" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns empty array when no members exist", async () => {
      mockMembers = [];
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.members).toHaveLength(0);
      expect(response.total).toBe(0);
    });

    it("accepts search query parameter", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "alice@test.com", status: "active", riskScore: null, createdAt: new Date() },
      ];
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: { search: "Alice" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it("accepts status filter parameter", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "alice@test.com", status: "active", riskScore: null, createdAt: new Date() },
      ];
      const handler = findHandler("get", "/members");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: { status: "active" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.members).toHaveLength(1);
    });
  });

  describe("POST /gyms/:gymId/members", () => {
    it("creates a new member and returns 201", async () => {
      const handler = findHandler("post", "/members", "/gyms/:gymId/members");
      expect(handler).toBeTruthy();
      const body = { firstName: "Charlie", lastName: "Brown", email: "charlie@test.com" };
      const { req, res } = makeReqRes({ params: { gymId: "1" }, body });
      await handler!(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(insertedMember).toBeTruthy();
      expect(insertedMember.gymId).toBe(1);
    });

    it("returns 400 for invalid gym ID on create", async () => {
      const handler = findHandler("post", "/members", "/gyms/:gymId/members");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "bad" }, body: {} });
      await handler!(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("GET /gyms/:gymId/members/:memberId", () => {
    it("returns a single member by ID", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "alice@test.com", status: "active", riskScore: "42.5" },
      ];
      mockNotes = [{ id: 1, memberId: 1, content: "Good progress" }];
      const handler = findHandler("get", "/members", "/gyms/:gymId/members/:memberId");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", memberId: "1" } });
      await handler!(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data.firstName).toBe("Alice");
    });

    it("returns 404 when member not found", async () => {
      mockMembers = [];
      const handler = findHandler("get", "/members", "/gyms/:gymId/members/:memberId");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", memberId: "999" } });
      await handler!(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid IDs", async () => {
      const handler = findHandler("get", "/members", "/gyms/:gymId/members/:memberId");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "abc", memberId: "xyz" } });
      await handler!(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("PATCH /gyms/:gymId/members/:memberId", () => {
    it("updates a member", async () => {
      mockMembers = [
        { id: 1, gymId: 1, firstName: "Alice", lastName: "Smith", email: "alice@test.com", status: "active" },
      ];
      const handler = findHandler("patch", "/members", "/gyms/:gymId/members/:memberId");
      expect(handler).toBeTruthy();
      const body = { firstName: "Alicia" };
      const { req, res } = makeReqRes({ params: { gymId: "1", memberId: "1" }, body });
      await handler!(req, res);
      expect(updatedMember).toBeTruthy();
      expect(updatedMember.firstName).toBe("Alicia");
    });

    it("returns 400 for invalid IDs on update", async () => {
      const handler = findHandler("patch", "/members", "/gyms/:gymId/members/:memberId");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "bad", memberId: "bad" }, body: {} });
      await handler!(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
