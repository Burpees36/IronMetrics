import { type Request, type Response, type NextFunction } from "express";
import { db, gymStaffTable, gymsTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export type ProgrammingRole = "owner" | "admin" | "coach" | "front_desk" | "member";

interface ResolvedUser {
  role: ProgrammingRole;
  memberTags?: string[];
}

async function resolveUserRole(userId: string, gymId: number): Promise<ResolvedUser | null> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) return null;
  if (gym.ownerId === userId) return { role: "owner" };

  const [staff] = await db
    .select()
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.userId, userId), eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.isActive, true)));

  if (staff) return { role: staff.role as ProgrammingRole };

  const [member] = await db
    .select({ id: membersTable.id, tags: membersTable.tags })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.email, userId)));

  if (member) return { role: "member", memberTags: (member.tags as string[]) || [] };

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
    const resolved = await resolveUserRole(userId, gymId);

    if (!resolved || !WRITE_ROLES.includes(resolved.role)) {
      res.status(403).json({ error: "Insufficient permissions for programming management" });
      return;
    }

    req.programmingRole = resolved.role;
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
    const resolved = await resolveUserRole(userId, gymId);

    if (!resolved || !READ_ROLES.includes(resolved.role)) {
      res.status(403).json({ error: "No access to this gym's programming" });
      return;
    }

    req.programmingRole = resolved.role;
    req.memberAllowedTracks = resolved.memberTags
      ? extractAllowedTracks(resolved.memberTags)
      : undefined;
    next();
  };
}

export function extractAllowedTracks(tags: string[]): string[] {
  const tracks = new Set<string>(["default"]);
  for (const tag of tags) {
    if (tag.startsWith("track:")) {
      tracks.add(tag.slice(6));
    }
  }
  return Array.from(tracks);
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
