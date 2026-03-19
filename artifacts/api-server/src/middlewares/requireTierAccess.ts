/**
 * @module requireTierAccess
 * Express middleware that enforces subscription tier access.
 *
 * Must be applied AFTER requireGymAccess (which populates req.gymId).
 * Checks the gym's subscriptionTier and isBetaAccess flag against the
 * route group being accessed. Returns 403 with an upgrade message if
 * the gym's tier doesn't include the requested route group.
 */
import { type Request, type Response, type NextFunction } from "express";
import { db, gymsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isRouteGroupAllowed, type SubscriptionTier } from "../tierConfig";

export function requireTierAccess(routeGroup: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const gymId = req.gymId;
    if (!gymId) {
      res.status(400).json({ error: "Gym ID not resolved" });
      return;
    }

    try {
      const [gym] = await db.select({
        subscriptionTier: gymsTable.subscriptionTier,
        isBetaAccess: gymsTable.isBetaAccess,
      }).from(gymsTable).where(eq(gymsTable.id, gymId));

      if (!gym) {
        res.status(404).json({ error: "Gym not found" });
        return;
      }

      const tier = gym.subscriptionTier as SubscriptionTier;
      const allowed = isRouteGroupAllowed(tier, gym.isBetaAccess, routeGroup);

      if (!allowed) {
        res.status(403).json({
          error: "upgrade_required",
          message: `Your current plan does not include access to this feature. Please upgrade to continue.`,
          currentTier: tier,
          requiredRouteGroup: routeGroup,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("[TIER ACCESS ERROR]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
