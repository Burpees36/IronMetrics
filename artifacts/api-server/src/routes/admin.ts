/**
 * @module admin
 * Platform owner admin endpoints.
 * Protected by PLATFORM_OWNER_SECRET env var for simple auth.
 *
 * Routes:
 *   POST /admin/gyms/:gymId/beta-access — toggle beta access flag
 *   GET  /admin/gyms — list all gyms with subscription info
 */
import { Router, type Request, type Response } from "express";
import { db, gymsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requirePlatformOwner(req: Request, res: Response): boolean {
  const secret = process.env.PLATFORM_OWNER_SECRET;
  const provided = req.headers["x-platform-owner-secret"] || req.body?.platformOwnerSecret;

  if (!secret) {
    console.warn("[ADMIN] PLATFORM_OWNER_SECRET not configured");
    res.status(503).json({ error: "Admin endpoint not configured" });
    return false;
  }

  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

router.post("/admin/gyms/:gymId/beta-access", async (req, res): Promise<void> => {
  if (!requirePlatformOwner(req, res)) return;

  const gymId = parseInt(req.params.gymId, 10);
  if (!gymId || isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const [updated] = await db.update(gymsTable)
    .set({ isBetaAccess: enabled })
    .where(eq(gymsTable.id, gymId))
    .returning();

  console.log(`[ADMIN] Beta access for gym ${gymId} (${gym.name}): ${enabled}`);
  res.json({
    gymId: updated.id,
    gymName: updated.name,
    isBetaAccess: updated.isBetaAccess,
    subscriptionTier: updated.subscriptionTier,
  });
});

router.get("/admin/gyms", async (req, res): Promise<void> => {
  if (!requirePlatformOwner(req, res)) return;

  const gyms = await db.select({
    id: gymsTable.id,
    name: gymsTable.name,
    slug: gymsTable.slug,
    email: gymsTable.email,
    subscriptionTier: gymsTable.subscriptionTier,
    isBetaAccess: gymsTable.isBetaAccess,
    platformSubscriptionId: gymsTable.platformSubscriptionId,
    platformCancelAtPeriodEnd: gymsTable.platformCancelAtPeriodEnd,
    platformCurrentPeriodEnd: gymsTable.platformCurrentPeriodEnd,
    createdAt: gymsTable.createdAt,
  }).from(gymsTable);

  res.json({ gyms });
});

export default router;
