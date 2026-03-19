import { type Request, type Response, type NextFunction } from "express";

export type ScheduleRole = "owner" | "admin" | "coach" | "head_coach" | "front_desk" | "member";

const MANAGE_ROLES: ScheduleRole[] = ["owner", "admin"];
const OPERATIONAL_ROLES: ScheduleRole[] = ["owner", "admin", "coach", "head_coach", "front_desk"];
const VIEW_ROLES: ScheduleRole[] = ["owner", "admin", "coach", "head_coach", "front_desk", "member"];

export function canManageSchedule(role: ScheduleRole): boolean {
  return MANAGE_ROLES.includes(role);
}

export function canOperateSchedule(role: ScheduleRole): boolean {
  return OPERATIONAL_ROLES.includes(role);
}

export function canViewSchedule(role: ScheduleRole): boolean {
  return VIEW_ROLES.includes(role);
}

export function requireScheduleManage() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.gymRole;
    if (!role || !canManageSchedule(role as ScheduleRole)) {
      res.status(403).json({ error: "Only owners and admins can manage the schedule" });
      return;
    }
    next();
  };
}

export function requireScheduleOperate() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.gymRole;
    if (!role || !canOperateSchedule(role as ScheduleRole)) {
      res.status(403).json({ error: "Insufficient permissions for this operation" });
      return;
    }
    next();
  };
}
