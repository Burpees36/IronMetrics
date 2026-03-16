import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  gte: () => ({}),
  lte: () => ({}),
  desc: () => ({}),
}));

let mockAttendance: any[] = [];

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
    select() {
      return {
        from(table: any) {
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            orderBy() { return chain; },
            limit() { return chain; },
            then(resolve: any) {
              resolve(mockAttendance.filter((r: any) => matchesCondition(r, cond)));
            },
          };
          return chain;
        },
      };
    },
  };
  return {
    db,
    attendanceTable: makeTable("attendance"),
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

describe("Attendance route handlers", () => {
  let router: any;

  beforeEach(async () => {
    mockAttendance = [];
    const mod = await import("../routes/attendance");
    router = mod.default;
  });

  describe("GET /gyms/:gymId/attendance", () => {
    it("returns attendance records array", async () => {
      const now = new Date();
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: now, classId: null },
        { id: 2, gymId: 1, memberId: 2, checkinTime: now, classId: 5 },
      ];
      const handler = findHandler(router, "get", "/attendance");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
      const data = res.json.mock.calls[0][0];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it("returns 400 for invalid gym ID", async () => {
      const handler = findHandler(router, "get", "/attendance");
      const { req, res } = makeReqRes({ params: { gymId: "abc" } });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns empty array when no records", async () => {
      const handler = findHandler(router, "get", "/attendance");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: {} });
      await handler(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data).toHaveLength(0);
    });

    it("accepts memberId filter", async () => {
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
        { id: 2, gymId: 1, memberId: 2, checkinTime: new Date() },
      ];
      const handler = findHandler(router, "get", "/attendance");
      const { req, res } = makeReqRes({ params: { gymId: "1" }, query: { memberId: "1" } });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it("accepts date range filters", async () => {
      mockAttendance = [
        { id: 1, gymId: 1, memberId: 1, checkinTime: new Date() },
      ];
      const handler = findHandler(router, "get", "/attendance");
      const { req, res } = makeReqRes({
        params: { gymId: "1" },
        query: { startDate: "2024-01-01", endDate: "2024-12-31" },
      });
      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
