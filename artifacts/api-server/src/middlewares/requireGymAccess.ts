import { type Request, type Response, type NextFunction } from "express";
import { db, gymsTable, gymStaffTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

async function resolveGymRole(userId: string, gymId: number): Promise<{ role: string | null; gymExists: boolean; gymDeactivated: boolean }> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) return { role: null, gymExists: false, gymDeactivated: false };

  const isOwner = gym.ownerId === userId;

  if (!gym.isActive && !isOwner) {
    return { role: null, gymExists: true, gymDeactivated: true };
  }

  if (isOwner) return { role: "owner", gymExists: true, gymDeactivated: !gym.isActive };

  const [staff] = await db
    .select()
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, userId), eq(gymStaffTable.isActive, true)));

  return { role: staff?.role || null, gymExists: true, gymDeactivated: false };
}

export function requireGymAccess(req: Request, res: Response, next: NextFunction): void {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);

  if (!gymId || isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  resolveGymRole(userId, gymId).then(({ role, gymExists, gymDeactivated }) => {
    if (!gymExists) {
      console.warn(`[GYM ACCESS DENIED] User ${userId} requested non-existent gym ${gymId}`);
      res.status(404).json({ error: "Gym not found" });
      return;
    }

    if (gymDeactivated && !role) {
      console.warn(`[GYM ACCESS DENIED] User ${userId} tried to access deactivated gym ${gymId}`);
      res.status(403).json({ error: "This business has been deactivated by the owner.", code: "GYM_DEACTIVATED" });
      return;
    }

    if (!role) {
      console.warn(`[GYM ACCESS DENIED] User ${userId} has no access to gym ${gymId}`);
      res.status(403).json({ error: "You do not have access to this gym" });
      return;
    }

    req.gymRole = role;
    req.gymId = gymId;
    next();
  }).catch((err) => {
    console.error("[GYM ACCESS ERROR]", err);
    res.status(500).json({ error: "Internal server error" });
  });
}
