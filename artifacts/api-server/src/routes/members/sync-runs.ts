import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, syncRunsTable } from "@workspace/db";
import { parseGymId } from "./helpers";

const router: IRouter = Router();

router.get("/gyms/:gymId/sync-runs", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const runs = await db
    .select()
    .from(syncRunsTable)
    .where(eq(syncRunsTable.gymId, gymId))
    .orderBy(desc(syncRunsTable.startedAt))
    .limit(limit);

  res.json({ runs });
});

router.get("/gyms/:gymId/sync-runs/latest", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [run] = await db
    .select()
    .from(syncRunsTable)
    .where(eq(syncRunsTable.gymId, gymId))
    .orderBy(desc(syncRunsTable.startedAt))
    .limit(1);

  res.json({ run: run || null });
});

export default router;
