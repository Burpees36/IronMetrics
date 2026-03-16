import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
}));

let mockGyms: any[] = [];
let mockStaff: any[] = [];

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
          const tn = table._name;
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            then(resolve: any) {
              const data = tn === "gyms" ? mockGyms : tn === "gym_staff" ? mockStaff : [];
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
    gymsTable: makeTable("gyms"),
    gymStaffTable: makeTable("gym_staff"),
  };
});

import { requireGymAccess } from "../middlewares/requireGymAccess";

function makeMocks(opts: { authenticated?: boolean; userId?: string; gymId?: string }) {
  const req = {
    isAuthenticated: () => opts.authenticated ?? true,
    user: opts.authenticated !== false ? { id: opts.userId || "user-1" } : undefined,
    params: { gymId: opts.gymId || "1" },
  } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("requireGymAccess", () => {
  beforeEach(() => {
    mockGyms = [];
    mockStaff = [];
  });

  it("rejects unauthenticated request with 401", () => {
    const { req, res, next } = makeMocks({ authenticated: false });
    requireGymAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid gym ID with 400", () => {
    const { req, res, next } = makeMocks({ gymId: "abc" });
    requireGymAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects zero gym ID with 400", () => {
    const { req, res, next } = makeMocks({ gymId: "0" });
    requireGymAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when gym does not exist", async () => {
    mockGyms = [];
    const { req, res, next } = makeMocks({ gymId: "999" });
    requireGymAccess(req, res, next);
    await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(404));
    expect(next).not.toHaveBeenCalled();
  });

  it("grants owner role to gym owner", async () => {
    mockGyms = [{ id: 1, ownerId: "user-1" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    requireGymAccess(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(req.gymRole).toBe("owner");
    expect(req.gymId).toBe(1);
  });

  it("grants staff role from gym_staff table", async () => {
    mockGyms = [{ id: 1, ownerId: "other-user" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "admin" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    requireGymAccess(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(req.gymRole).toBe("admin");
  });

  it("denies access when user has no role in gym", async () => {
    mockGyms = [{ id: 1, ownerId: "other-user" }];
    mockStaff = [];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    requireGymAccess(req, res, next);
    await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(403));
    expect(next).not.toHaveBeenCalled();
  });

  it("denies access when staff record is inactive", async () => {
    mockGyms = [{ id: 1, ownerId: "other-user" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: false, role: "coach" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    requireGymAccess(req, res, next);
    await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(403));
  });

  it("handles array gymId param", async () => {
    mockGyms = [{ id: 1, ownerId: "user-1" }];
    const req = {
      isAuthenticated: () => true,
      user: { id: "user-1" },
      params: { gymId: ["1", "2"] },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    requireGymAccess(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(req.gymId).toBe(1);
  });
});
