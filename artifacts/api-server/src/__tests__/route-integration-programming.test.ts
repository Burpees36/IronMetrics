import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  gte: () => ({}),
  lte: () => ({}),
  desc: () => ({}),
  asc: () => ({}),
  ne: (left: any, right: any) => ({ _type: "ne", left, right }),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
  notInArray: (left: any, values: any[]) => ({ _type: "notInArray", left, values }),
}));

let mockDays: any[] = [];
let mockSections: any[] = [];
let mockResults: any[] = [];
let insertedDay: any = null;

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
              let data = tn === "programming_days" ? mockDays :
                         tn === "programming_sections" ? mockSections :
                         tn === "workout_results" ? mockResults : [];
              resolve(data.filter(r => matchesCondition(r, cond)));
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
          if (tn === "programming_days") insertedDay = val;
          return {
            returning() {
              return { then(resolve: any) { resolve([{ id: 1, ...val }]); } };
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
                  return { then(resolve: any) { resolve([{ id: 1, ...val }]); } };
                },
                then(resolve: any) { resolve(undefined); },
              };
            },
          };
        },
      };
    },
    delete(table: any) {
      return {
        where() { return { then(resolve: any) { resolve(undefined); } }; },
      };
    },
  };
  return {
    db,
    programmingDaysTable: makeTable("programming_days"),
    programmingSectionsTable: makeTable("programming_sections"),
    workoutResultsTable: makeTable("workout_results"),
    membersTable: makeTable("members"),
    subscriptionsTable: makeTable("subscriptions"),
    attendanceTable: makeTable("attendance"),
  };
});

vi.mock("../middlewares/programmingRbac", () => ({
  requireProgrammingRead: () => (req: any, _res: any, next: any) => { req.programmingRole = req._testRole || "owner"; next(); },
  requireProgrammingWrite: () => (req: any, _res: any, next: any) => { req.programmingRole = req._testRole || "owner"; next(); },
  isStaffRole: (role: string) => ["owner", "admin", "coach"].includes(role),
  stripCoachNotesFromDay: (day: any, role: string) => {
    if (["owner", "admin", "coach"].includes(role)) return day;
    const { coachNotes, ...rest } = day;
    if (rest.sections) {
      rest.sections = rest.sections.map((s: any) => { const { coachNotes: _, ...sr } = s; return sr; });
    }
    return rest;
  },
}));

function makeReqRes(opts: { params?: any; query?: any; body?: any; role?: string }) {
  const req = {
    params: opts.params || {},
    query: opts.query || {},
    body: opts.body || {},
    gymId: 1,
    user: { id: "user-1" },
    isAuthenticated: () => true,
    gymRole: "owner",
    programmingRole: opts.role || "owner",
    _testRole: opts.role || "owner",
  } as any;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as any;
  return { req, res };
}

function findHandler(router: any, method: string, pathFragment: string, exact?: string): any {
  function search(stack: any[]): any {
    for (const layer of stack) {
      if (layer.route) {
        const routePath = layer.route.path;
        const routeMethod = Object.keys(layer.route.methods)[0];
        if (exact) {
          if (routeMethod === method && routePath === exact) {
            return layer.route.stack[layer.route.stack.length - 1].handle;
          }
        } else if (routeMethod === method && routePath.includes(pathFragment)) {
          return layer.route.stack[layer.route.stack.length - 1].handle;
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

describe("Programming route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockDays = [];
    mockSections = [];
    mockResults = [];
    insertedDay = null;
    const mod = await import("../routes/programming");
    router = mod.default;
  });

  describe("GET /gyms/:gymId/programming", () => {
    it("returns programming days with sections", async () => {
      mockDays = [
        { id: 1, gymId: 1, date: "2025-01-15", title: "Monday", status: "published", coachNotes: "hard day" },
      ];
      mockSections = [
        { id: 1, dayId: 1, title: "Warmup", orderIndex: 0, coachNotes: "5 min" },
      ];
      const handler = findHandler(router, "get", "/programming", "/gyms/:gymId/programming");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].sections).toBeDefined();
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "/programming", "/gyms/:gymId/programming");
      const { req, res } = makeReqRes({ params: { gymId: "abc" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("strips coachNotes for member role", async () => {
      mockDays = [
        { id: 1, gymId: 1, date: "2025-01-15", title: "Monday", status: "published", coachNotes: "secret" },
      ];
      mockSections = [
        { id: 1, dayId: 1, title: "WOD", orderIndex: 0, coachNotes: "private" },
      ];
      const handler = findHandler(router, "get", "/programming", "/gyms/:gymId/programming");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {}, role: "member" });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data[0]).not.toHaveProperty("coachNotes");
    });
  });

  describe("GET /gyms/:gymId/programming/:dayId", () => {
    it("returns a single day with sections", async () => {
      mockDays = [
        { id: 5, gymId: 1, date: "2025-01-15", title: "Monday", status: "published" },
      ];
      mockSections = [
        { id: 1, dayId: 5, title: "WOD", orderIndex: 0 },
      ];
      const handler = findHandler(router, "get", "/programming", "/gyms/:gymId/programming/:dayId");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", dayId: "5" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it("returns 404 for non-existent day", async () => {
      mockDays = [];
      const handler = findHandler(router, "get", "/programming", "/gyms/:gymId/programming/:dayId");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", dayId: "999" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("POST /gyms/:gymId/programming", () => {
    it("creates a programming day and returns 201", async () => {
      const handler = findHandler(router, "post", "/programming", "/gyms/:gymId/programming");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({
        params: { gymId: "1" },
        body: { date: "2025-01-20", title: "New Day", description: "Test" },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(insertedDay).toBeTruthy();
      expect(insertedDay.gymId).toBe(1);
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "post", "/programming", "/gyms/:gymId/programming");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "xyz" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /gyms/:gymId/programming/:dayId/sections", () => {
    it("adds a section to a day and returns 201", async () => {
      mockDays = [{ id: 1, gymId: 1, date: "2025-01-15", title: "Monday", status: "draft" }];
      mockSections = [];
      const handler = findHandler(router, "post", "/sections", "/gyms/:gymId/programming/:dayId/sections");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({
        params: { gymId: "1", dayId: "1" },
        body: { title: "Warmup", sectionType: "warmup", instructions: "5 min row" },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const data = res.json.mock.calls[0][0];
      expect(data.title).toBe("Warmup");
    });

    it("returns 400 when title is missing", async () => {
      mockDays = [{ id: 1, gymId: 1, date: "2025-01-15", title: "Monday", status: "draft" }];
      const handler = findHandler(router, "post", "/sections", "/gyms/:gymId/programming/:dayId/sections");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({
        params: { gymId: "1", dayId: "1" },
        body: {},
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when day not found", async () => {
      mockDays = [];
      const handler = findHandler(router, "post", "/sections", "/gyms/:gymId/programming/:dayId/sections");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({
        params: { gymId: "1", dayId: "999" },
        body: { title: "WOD" },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid IDs", async () => {
      const handler = findHandler(router, "post", "/sections", "/gyms/:gymId/programming/:dayId/sections");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "abc", dayId: "xyz" }, body: { title: "WOD" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /gyms/:gymId/programming/:dayId/publish", () => {
    it("toggles publish status of a day", async () => {
      mockDays = [{ id: 1, gymId: 1, date: "2025-01-15", title: "Monday", status: "draft" }];
      mockSections = [{ id: 1, dayId: 1, title: "WOD", orderIndex: 0 }];
      const handler = findHandler(router, "post", "/publish", "/gyms/:gymId/programming/:dayId/publish");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", dayId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it("returns 404 when day not found", async () => {
      mockDays = [];
      const handler = findHandler(router, "post", "/publish", "/gyms/:gymId/programming/:dayId/publish");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", dayId: "999" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid IDs", async () => {
      const handler = findHandler(router, "post", "/publish", "/gyms/:gymId/programming/:dayId/publish");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "abc", dayId: "xyz" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
