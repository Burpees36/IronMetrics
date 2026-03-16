import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGyms: any[] = [];
let mockStaff: any[] = [];
let mockMembers: any[] = [];

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
}));

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
            then(resolve: any) {
              let data = tn === "gyms" ? mockGyms :
                         tn === "gym_staff" ? mockStaff :
                         tn === "members" ? mockMembers : [];
              resolve(data.filter(r => matchesCondition(r, cond)));
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
    membersTable: makeTable("members"),
  };
});

import {
  requireProgrammingWrite,
  requireProgrammingRead,
  isStaffRole,
  stripCoachNotes,
  stripCoachNotesFromDay,
} from "../middlewares/programmingRbac";

function makeReqRes(opts: { userId?: string; gymId?: string; authenticated?: boolean }) {
  const req = {
    params: { gymId: opts.gymId || "1" },
    user: opts.userId ? { id: opts.userId } : undefined,
    isAuthenticated: () => opts.authenticated !== false,
  } as any;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("Programming RBAC Middleware", () => {
  beforeEach(() => {
    mockGyms = [{ id: 1, ownerId: "owner-1" }];
    mockStaff = [];
    mockMembers = [];
  });

  describe("requireProgrammingWrite", () => {
    it("returns 401 when not authenticated", async () => {
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ authenticated: false });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid gym ID", async () => {
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "user-1", gymId: "abc" });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 for member role (read-only)", async () => {
      mockMembers = [{ id: 10, gymId: 1, email: "member-1" }];
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "member-1", gymId: "1" });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 for front_desk (not in WRITE_ROLES)", async () => {
      mockStaff = [{ userId: "fd-1", gymId: 1, role: "front_desk", isActive: true }];
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "fd-1", gymId: "1" });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows owner and sets programmingRole", async () => {
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "owner-1", gymId: "1" });
      await mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.programmingRole).toBe("owner");
    });

    it("allows admin and sets programmingRole", async () => {
      mockStaff = [{ userId: "admin-1", gymId: 1, role: "admin", isActive: true }];
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "admin-1", gymId: "1" });
      await mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.programmingRole).toBe("admin");
    });

    it("allows coach and sets programmingRole", async () => {
      mockStaff = [{ userId: "coach-1", gymId: 1, role: "coach", isActive: true }];
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "coach-1", gymId: "1" });
      await mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.programmingRole).toBe("coach");
    });

    it("returns 403 for unknown user (no gym/staff/member match)", async () => {
      const mw = requireProgrammingWrite();
      const { req, res, next } = makeReqRes({ userId: "stranger", gymId: "1" });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("requireProgrammingRead", () => {
    it("returns 401 when not authenticated", async () => {
      const mw = requireProgrammingRead();
      const { req, res, next } = makeReqRes({ authenticated: false });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid gym ID", async () => {
      const mw = requireProgrammingRead();
      const { req, res, next } = makeReqRes({ userId: "u1", gymId: "xyz" });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("allows member for read access", async () => {
      mockMembers = [{ id: 10, gymId: 1, email: "member-1" }];
      const mw = requireProgrammingRead();
      const { req, res, next } = makeReqRes({ userId: "member-1", gymId: "1" });
      await mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.programmingRole).toBe("member");
    });

    it("allows front_desk for read access", async () => {
      mockStaff = [{ userId: "fd-1", gymId: 1, role: "front_desk", isActive: true }];
      const mw = requireProgrammingRead();
      const { req, res, next } = makeReqRes({ userId: "fd-1", gymId: "1" });
      await mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.programmingRole).toBe("front_desk");
    });

    it("allows owner for read access", async () => {
      const mw = requireProgrammingRead();
      const { req, res, next } = makeReqRes({ userId: "owner-1", gymId: "1" });
      await mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.programmingRole).toBe("owner");
    });

    it("returns 403 for unknown user", async () => {
      const mw = requireProgrammingRead();
      const { req, res, next } = makeReqRes({ userId: "stranger", gymId: "1" });
      await mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("isStaffRole", () => {
    it("returns true for owner, admin, coach", () => {
      expect(isStaffRole("owner")).toBe(true);
      expect(isStaffRole("admin")).toBe(true);
      expect(isStaffRole("coach")).toBe(true);
    });

    it("returns false for front_desk and member", () => {
      expect(isStaffRole("front_desk")).toBe(false);
      expect(isStaffRole("member")).toBe(false);
    });
  });

  describe("stripCoachNotes", () => {
    it("preserves coachNotes for staff roles", () => {
      const obj = { id: 1, name: "WOD", coachNotes: "secret" };
      expect(stripCoachNotes(obj, "coach")).toEqual(obj);
    });

    it("removes coachNotes for member role", () => {
      const obj = { id: 1, name: "WOD", coachNotes: "secret" };
      const result = stripCoachNotes(obj, "member");
      expect(result).not.toHaveProperty("coachNotes");
      expect(result.name).toBe("WOD");
    });
  });

  describe("stripCoachNotesFromDay", () => {
    it("removes coachNotes from day and its sections for member", () => {
      const day = {
        id: 1,
        title: "Monday",
        coachNotes: "private",
        sections: [
          { id: 1, title: "Warmup", coachNotes: "stretch more" },
          { id: 2, title: "WOD", coachNotes: "scale for beginners" },
        ],
      };
      const result = stripCoachNotesFromDay(day, "member");
      expect(result).not.toHaveProperty("coachNotes");
      expect(result.sections[0]).not.toHaveProperty("coachNotes");
      expect(result.sections[1]).not.toHaveProperty("coachNotes");
    });

    it("preserves coachNotes for coach role", () => {
      const day = {
        id: 1,
        coachNotes: "private",
        sections: [{ id: 1, coachNotes: "note" }],
      };
      const result = stripCoachNotesFromDay(day, "coach");
      expect(result.coachNotes).toBe("private");
      expect(result.sections[0].coachNotes).toBe("note");
    });
  });
});
