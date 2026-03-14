/**
 * @module requireGymAccess
 * Express middleware that enforces gym-level authorization.
 *
 * Flow:
 *   1. Verify the user is authenticated (via Passport session).
 *   2. Parse and validate the `:gymId` route parameter.
 *   3. Resolve the user's role within the gym:
 *      - If the user owns the gym → role = "owner"
 *      - If the user is active staff → role = their staff role (e.g., "admin", "coach")
 *      - Otherwise → no role (access denied)
 *   4. Attach `gymRole` and `gymId` to the request for downstream handlers.
 *
 * Known weakness: `(req as any).gymRole` and `(req as any).gymId` use
 * unsafe type casting because Express's built-in Request type does not
 * include custom properties. A cleaner approach would be to extend the
 * Express Request interface via declaration merging or use a typed
 * middleware pattern with `res.locals`.
 */
import { type Request, type Response, type NextFunction } from "express";
import { db, gymsTable, gymStaffTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

/**
 * Resolves a user's role within a specific gym.
 *
 * @param userId - The authenticated user's ID.
 * @param gymId  - The target gym's ID from the route parameter.
 * @returns An object with the user's role (or null if none) and whether the gym exists.
 *
 * Checks ownership first (single query), then falls back to the gym_staff
 * table for staff-level roles. Only active staff records are considered.
 */
async function resolveGymRole(userId: string, gymId: number): Promise<{ role: string | null; gymExists: boolean }> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) return { role: null, gymExists: false };

  // Gym owner always has full access
  if (gym.ownerId === userId) return { role: "owner", gymExists: true };

  // Check staff table — only active staff records grant access
  const [staff] = await db
    .select()
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, userId), eq(gymStaffTable.isActive, true)));

  return { role: staff?.role || null, gymExists: true };
}

/**
 * Express middleware that gates access to gym-scoped routes.
 * Must be mounted on routes that include a `:gymId` parameter.
 *
 * On success, attaches `req.gymRole` and `req.gymId` to the request object
 * (via `(req as any)` — see known weakness above).
 */
export function requireGymAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);

  if (!gymId || isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const userId = req.user!.id;

  resolveGymRole(userId, gymId).then(({ role, gymExists }) => {
    if (!gymExists) {
      console.warn(`[GYM ACCESS DENIED] User ${userId} requested non-existent gym ${gymId}`);
      res.status(404).json({ error: "Gym not found" });
      return;
    }

    if (!role) {
      console.warn(`[GYM ACCESS DENIED] User ${userId} has no access to gym ${gymId}`);
      res.status(403).json({ error: "You do not have access to this gym" });
      return;
    }

    // Known weakness: uses `(req as any)` to attach custom properties
    // because Express Request type is not extended with gymRole/gymId.
    (req as any).gymRole = role;
    (req as any).gymId = gymId;
    next();
  }).catch((err) => {
    console.error("[GYM ACCESS ERROR]", err);
    res.status(500).json({ error: "Internal server error" });
  });
}
