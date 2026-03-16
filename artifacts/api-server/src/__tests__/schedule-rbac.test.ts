import { describe, it, expect, vi } from "vitest";
import { canManageSchedule, canOperateSchedule, canViewSchedule, requireScheduleManage, requireScheduleOperate, type ScheduleRole } from "../middlewares/scheduleRbac";

describe("canManageSchedule", () => {
  it("owner can manage", () => expect(canManageSchedule("owner")).toBe(true));
  it("admin can manage", () => expect(canManageSchedule("admin")).toBe(true));
  it("coach cannot manage", () => expect(canManageSchedule("coach")).toBe(false));
  it("head_coach cannot manage", () => expect(canManageSchedule("head_coach")).toBe(false));
  it("front_desk cannot manage", () => expect(canManageSchedule("front_desk")).toBe(false));
  it("member cannot manage", () => expect(canManageSchedule("member")).toBe(false));
});

describe("canOperateSchedule", () => {
  it("owner can operate", () => expect(canOperateSchedule("owner")).toBe(true));
  it("admin can operate", () => expect(canOperateSchedule("admin")).toBe(true));
  it("coach can operate", () => expect(canOperateSchedule("coach")).toBe(true));
  it("head_coach can operate", () => expect(canOperateSchedule("head_coach")).toBe(true));
  it("front_desk can operate", () => expect(canOperateSchedule("front_desk")).toBe(true));
  it("member cannot operate", () => expect(canOperateSchedule("member")).toBe(false));
});

describe("canViewSchedule", () => {
  it("owner can view", () => expect(canViewSchedule("owner")).toBe(true));
  it("admin can view", () => expect(canViewSchedule("admin")).toBe(true));
  it("coach can view", () => expect(canViewSchedule("coach")).toBe(true));
  it("head_coach can view", () => expect(canViewSchedule("head_coach")).toBe(true));
  it("front_desk can view", () => expect(canViewSchedule("front_desk")).toBe(true));
  it("member can view", () => expect(canViewSchedule("member")).toBe(true));
});

describe("requireScheduleManage middleware", () => {
  function makeMocks(role?: string) {
    const req = { gymRole: role } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    return { req, res, next };
  }

  it("allows owner through", () => {
    const { req, res, next } = makeMocks("owner");
    requireScheduleManage()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows admin through", () => {
    const { req, res, next } = makeMocks("admin");
    requireScheduleManage()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("blocks coach", () => {
    const { req, res, next } = makeMocks("coach");
    requireScheduleManage()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks when no role set", () => {
    const { req, res, next } = makeMocks(undefined);
    requireScheduleManage()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("requireScheduleOperate middleware", () => {
  function makeMocks(role?: string) {
    const req = { gymRole: role } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    return { req, res, next };
  }

  it("allows coach through", () => {
    const { req, res, next } = makeMocks("coach");
    requireScheduleOperate()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows front_desk through", () => {
    const { req, res, next } = makeMocks("front_desk");
    requireScheduleOperate()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("blocks member", () => {
    const { req, res, next } = makeMocks("member");
    requireScheduleOperate()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks when no role set", () => {
    const { req, res, next } = makeMocks(undefined);
    requireScheduleOperate()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
