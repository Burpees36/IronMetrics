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

import { requireBillingPermission, requireBillingRead } from "../middlewares/billingRbac";

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

describe("requireBillingPermission middleware integration", () => {
  beforeEach(() => {
    mockGyms = [];
    mockStaff = [];
  });

  it("returns 401 for unauthenticated user", async () => {
    const { req, res, next } = makeMocks({ authenticated: false });
    const mw = requireBillingPermission("billing.read");
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid gym ID", async () => {
    const { req, res, next } = makeMocks({ gymId: "abc" });
    const mw = requireBillingPermission("billing.read");
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user has no role in gym", async () => {
    mockGyms = [{ id: 1, ownerId: "other-user" }];
    mockStaff = [];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingPermission("billing.read");
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role lacks required permission", async () => {
    mockGyms = [{ id: 1, ownerId: "other-user" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "coach" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingPermission("billing.read");
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Insufficient billing permissions" }));
  });

  it("calls next and decorates req for owner with full perms", async () => {
    mockGyms = [{ id: 1, ownerId: "user-1" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingPermission("billing.read");
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.billingRole).toBe("owner");
    expect(req.billingPermissions).toContain("billing.read");
    expect(req.billingPermissions).toContain("billing.issue_refund");
  });

  it("calls next for admin with billing.create_charge", async () => {
    mockGyms = [{ id: 1, ownerId: "other" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "admin" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingPermission("billing.create_charge");
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.billingRole).toBe("admin");
  });

  it("allows front_desk for billing.read but denies billing.issue_refund", async () => {
    mockGyms = [{ id: 1, ownerId: "other" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "front_desk" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });

    const readMw = requireBillingPermission("billing.read");
    await readMw(req, res, next);
    expect(next).toHaveBeenCalled();

    next.mockClear();
    res.status.mockClear();
    res.json.mockClear();

    const refundMw = requireBillingPermission("billing.issue_refund");
    await refundMw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows analyst for billing.read only", async () => {
    mockGyms = [{ id: 1, ownerId: "other" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "analyst" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });

    const readMw = requireBillingPermission("billing.read");
    await readMw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.billingPermissions).toHaveLength(1);
  });

  it("denies inactive staff", async () => {
    mockGyms = [{ id: 1, ownerId: "other" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: false, role: "admin" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingPermission("billing.read");
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("requires all specified permissions simultaneously", async () => {
    mockGyms = [{ id: 1, ownerId: "other" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "front_desk" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingPermission("billing.read", "billing.issue_refund");
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("requireBillingRead convenience wrapper", () => {
  beforeEach(() => {
    mockGyms = [];
    mockStaff = [];
  });

  it("allows owner to read", async () => {
    mockGyms = [{ id: 1, ownerId: "user-1" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingRead();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("denies coach from reading", async () => {
    mockGyms = [{ id: 1, ownerId: "other" }];
    mockStaff = [{ gymId: 1, userId: "user-1", isActive: true, role: "coach" }];
    const { req, res, next } = makeMocks({ userId: "user-1", gymId: "1" });
    const mw = requireBillingRead();
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
