import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  gte: () => ({}),
  lte: () => ({}),
  desc: () => ({}),
  lt: () => ({}),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
}));

let mockClasses: any[] = [];
let insertedClass: any = null;
let insertedAttendance: any = null;
let updatedClass: any = null;
let mockStaff: any[] = [];
let mockAttendance: any[] = [];
let mockMembers: any[] = [];

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
              let data = tn === "classes" ? mockClasses :
                         tn === "gym_staff" ? mockStaff :
                         tn === "attendance" ? mockAttendance :
                         tn === "members" ? mockMembers : [];
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
          if (tn === "classes") insertedClass = val;
          if (tn === "attendance") insertedAttendance = val;
          return {
            returning() {
              return { then(resolve: any) { resolve([{ id: 1, ...val }]); } };
            },
          };
        },
      };
    },
    update(table: any) {
      return {
        set(val: any) {
          updatedClass = val;
          return {
            where() {
              return {
                returning() {
                  return { then(resolve: any) { resolve([{ id: 1, ...val }]); } };
                },
              };
            },
          };
        },
      };
    },
    delete(table: any) {
      return {
        where() {
          return { then(resolve: any) { resolve(undefined); } };
        },
      };
    },
  };
  return {
    db,
    classesTable: makeTable("classes"),
    attendanceTable: makeTable("attendance"),
    gymStaffTable: makeTable("gym_staff"),
    membersTable: makeTable("members"),
  };
});

vi.mock("@workspace/api-zod", () => ({
  CreateClassBody: {
    safeParse: (data: any) => ({ success: true, data }),
  },
  UpdateClassBody: {
    safeParse: (data: any) => ({ success: true, data }),
  },
}));

vi.mock("../middlewares/scheduleRbac", () => ({
  requireScheduleManage: () => (_req: any, _res: any, next: any) => next(),
  requireScheduleOperate: () => (_req: any, _res: any, next: any) => next(),
  canManageSchedule: () => true,
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

function findHandler(router: any, method: string, pathFragment: string) {
  for (const layer of router.stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (routeMethod === method && routePath.includes(pathFragment)) {
        return layer.route.stack[layer.route.stack.length - 1].handle;
      }
    }
  }
  return null;
}

describe("Classes route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockClasses = [];
    mockStaff = [];
    mockAttendance = [];
    mockMembers = [];
    insertedClass = null;
    insertedAttendance = null;
    updatedClass = null;
    const mod = await import("../routes/classes");
    router = mod.default;
  });

  describe("GET /gyms/:gymId/classes", () => {
    it("returns classes list for gym", async () => {
      const now = new Date();
      mockClasses = [
        { id: 1, gymId: 1, name: "WOD", startTime: now, endTime: now, capacity: 20, enrolled: 10, status: "scheduled", staffNotes: "internal" },
        { id: 2, gymId: 1, name: "Open Gym", startTime: now, endTime: now, capacity: 30, enrolled: 5, status: "scheduled", staffNotes: null },
      ];
      const handler = findHandler(router, "get", "/classes");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it("strips staffNotes for member role", async () => {
      mockClasses = [
        { id: 1, gymId: 1, name: "WOD", startTime: new Date(), endTime: new Date(), capacity: 20, enrolled: 10, status: "scheduled", staffNotes: "secret" },
      ];
      const handler = findHandler(router, "get", "/classes");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      req.gymRole = "member";
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data[0]).not.toHaveProperty("staffNotes");
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "/classes");
      const { req, res } = makeReqRes({ params: { gymId: "xyz" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /gyms/:gymId/classes", () => {
    it("creates a class and returns 201", async () => {
      const handler = findHandler(router, "post", "/classes");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({
        params: { gymId: "1" },
        body: { name: "New WOD", startTime: "2025-01-15T09:00:00Z", endTime: "2025-01-15T10:00:00Z", capacity: 20 },
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(insertedClass).toBeTruthy();
      expect(insertedClass.gymId).toBe(1);
    });
  });

  describe("GET /gyms/:gymId/classes/:classId", () => {
    it("returns single class with roster", async () => {
      mockClasses = [
        { id: 5, gymId: 1, name: "WOD", startTime: new Date(), endTime: new Date(), capacity: 20, enrolled: 3, status: "scheduled" },
      ];
      mockAttendance = [
        { id: 1, classId: 5, memberId: 1, memberName: "John", status: "checked_in" },
      ];
      const routes = router.stack.filter((l: any) => l.route?.path?.includes(":classId") && l.route?.methods?.get);
      if (routes.length === 0) return;
      const handler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(data.roster).toBeDefined();
    });

    it("returns 404 when class not found", async () => {
      mockClasses = [];
      const routes = router.stack.filter((l: any) => l.route?.path?.includes(":classId") && l.route?.methods?.get);
      if (routes.length === 0) return;
      const handler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "999" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("POST /gyms/:gymId/classes/:classId/checkin", () => {
    it("checks in a member and returns 201", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "John", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "WOD", capacity: 20, enrolled: 5, waitlistEnabled: false }];
      mockAttendance = [];
      const handler = findHandler(router, "post", "/checkin");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 404 when member not found", async () => {
      mockMembers = [];
      mockClasses = [{ id: 5, gymId: 1, name: "WOD", capacity: 20, enrolled: 5 }];
      const handler = findHandler(router, "post", "/checkin");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 999 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 404 when class not found", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "John", lastName: "Doe" }];
      mockClasses = [];
      const handler = findHandler(router, "post", "/checkin");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when member already checked in", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "John", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "WOD", capacity: 20, enrolled: 5 }];
      mockAttendance = [{ id: 1, classId: 5, memberId: 10, status: "checked_in" }];
      const handler = findHandler(router, "post", "/checkin");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 when class is full", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "John", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "WOD", capacity: 5, enrolled: 5, waitlistEnabled: false }];
      mockAttendance = [];
      const handler = findHandler(router, "post", "/checkin");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 400 for invalid IDs", async () => {
      const handler = findHandler(router, "post", "/checkin");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "abc", classId: "xyz" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /gyms/:gymId/classes/:classId/book", () => {
    it("books a member into a class and returns 201", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "Jane", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "Yoga", capacity: 20, enrolled: 3, isBookable: true, waitlistEnabled: false }];
      mockAttendance = [];
      const handler = findHandler(router, "post", "/book");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 when memberId is missing", async () => {
      const handler = findHandler(router, "post", "/book");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: {} });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when member not found", async () => {
      mockMembers = [];
      mockClasses = [{ id: 5, gymId: 1, name: "Yoga", capacity: 20, enrolled: 3, isBookable: true }];
      const handler = findHandler(router, "post", "/book");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 999 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when class is not bookable", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "Jane", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "WOD", capacity: 20, enrolled: 3, isBookable: false }];
      const handler = findHandler(router, "post", "/book");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 when already booked", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "Jane", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "Yoga", capacity: 20, enrolled: 3, isBookable: true }];
      mockAttendance = [{ id: 1, classId: 5, memberId: 10, status: "reserved" }];
      const handler = findHandler(router, "post", "/book");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 when class is full and no waitlist", async () => {
      mockMembers = [{ id: 10, gymId: 1, firstName: "Jane", lastName: "Doe" }];
      mockClasses = [{ id: 5, gymId: 1, name: "Yoga", capacity: 5, enrolled: 5, isBookable: true, waitlistEnabled: false }];
      mockAttendance = [];
      const handler = findHandler(router, "post", "/book");
      expect(handler).toBeTruthy();
      const { req, res } = makeReqRes({ params: { gymId: "1", classId: "5" }, body: { memberId: 10 } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });
});
