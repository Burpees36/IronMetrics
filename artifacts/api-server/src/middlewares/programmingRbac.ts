import { type Request, type Response, type NextFunction } from "express";
import { db, gymStaffTable, gymsTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export type ProgrammingRole = "owner" | "admin" | "coach" | "front_desk" | "member";

async function resolveUserRole(userId: string, gymId: number): Promise<ProgrammingRole | null> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) return null;
  if (gym.ownerId === userId) return "owner";

  const [staff] = await db
    .select()
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.userId, userId), eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.isActive, true)));

  if (staff) return staff.role as ProgrammingRole;

  const [member] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.email, userId)));

  if (member) return "member";

  return null;
}

const WRITE_ROLES: ProgrammingRole[] = ["owner", "admin", "coach"];
const READ_ROLES: ProgrammingRole[] = ["owner", "admin", "coach", "front_desk", "member"];

export function requireProgrammingWrite() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const gymIdParam = req.params.gymId;
    const gymId = gymIdParam ? parseInt(Array.isArray(gymIdParam) ? gymIdParam[0] : gymIdParam, 10) : null;

    if (!gymId || isNaN(gymId)) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const userId = req.user!.id;
    const role = await resolveUserRole(userId, gymId);

    if (!role || !WRITE_ROLES.includes(role)) {
      res.status(403).json({ error: "Insufficient permissions for programming management" });
      return;
    }

    (req as any).programmingRole = role;
    next();
  };
}

export function requireProgrammingRead() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const gymIdParam = req.params.gymId;
    const gymId = gymIdParam ? parseInt(Array.isArray(gymIdParam) ? gymIdParam[0] : gymIdParam, 10) : null;

    if (!gymId || isNaN(gymId)) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const userId = req.user!.id;
    const role = await resolveUserRole(userId, gymId);

    if (!role || !READ_ROLES.includes(role)) {
      res.status(403).json({ error: "No access to this gym's programming" });
      return;
    }

    (req as any).programmingRole = role;
    next();
  };
}

export function isStaffRole(role: ProgrammingRole): boolean {
  return WRITE_ROLES.includes(role);
}

export function stripCoachNotes<T extends Record<string, any>>(obj: T, role: ProgrammingRole): T {
  if (isStaffRole(role)) return obj;
  const { coachNotes, ...rest } = obj;
  return rest as T;
}

export function stripCoachNotesFromDay(day: any, role: ProgrammingRole): any {
  if (isStaffRole(role)) return day;
  const { coachNotes, ...rest } = day;
  if (rest.sections) {
    rest.sections = rest.sections.map((s: any) => {
      const { coachNotes: _, ...sectionRest } = s;
      return sectionRest;
    });
  }
  return rest;
}
