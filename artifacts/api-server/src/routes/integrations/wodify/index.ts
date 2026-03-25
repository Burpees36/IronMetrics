import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, gymsTable, syncRunsTable } from "@workspace/db";
import { createWodifyClient } from "./client";
import { runWodifySync } from "./sync";

const router: IRouter = Router();

router.post("/gyms/:gymId/integrations/wodify/validate-key", async (req, res): Promise<void> => {
  const gymId = parseInt(req.params.gymId, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey?.trim()) {
    res.status(400).json({ error: "API key is required" });
    return;
  }

  try {
    const client = createWodifyClient(apiKey.trim());
    const result = await client.validateKey();

    if (!result.valid) {
      res.json({ valid: false, message: "Invalid API key" });
      return;
    }

    await db.update(gymsTable)
      .set({ wodifyApiKey: apiKey.trim() })
      .where(eq(gymsTable.id, gymId));

    res.json({
      valid: true,
      clientCount: result.clientCount,
      message: `Connected successfully. Found ${result.clientCount} clients on first page.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to validate API key" });
  }
});

router.post("/gyms/:gymId/integrations/wodify/sync", async (req, res): Promise<void> => {
  const gymId = parseInt(req.params.gymId, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const apiKey = gym.wodifyApiKey;
  if (!apiKey) {
    res.status(400).json({ error: "No Wodify API key configured. Validate your key first." });
    return;
  }

  const triggeredBy = (req as any).user?.claims?.sub || "unknown";

  try {
    const result = await db.transaction(async (tx) => {
      const [existingRun] = await tx
        .select()
        .from(syncRunsTable)
        .where(and(eq(syncRunsTable.gymId, gymId), eq(syncRunsTable.source, "wodify-api"), eq(syncRunsTable.status, "running")))
        .limit(1);

      if (existingRun) {
        return { conflict: true, syncRunId: existingRun.id };
      }

      const [syncRun] = await tx.insert(syncRunsTable).values({
        gymId,
        source: "wodify-api",
        status: "running",
        totalRows: 0,
        triggeredBy,
      }).returning();

      return { conflict: false, syncRunId: syncRun.id };
    });

    if (result.conflict) {
      res.status(409).json({
        error: "A sync is already in progress",
        syncRunId: result.syncRunId,
      });
      return;
    }

    runWodifySync(gymId, apiKey, triggeredBy, result.syncRunId).catch((err) => {
      console.error(`[wodify-sync] Background sync failed for gym ${gymId}:`, err);
    });

    res.json({ syncRunId: result.syncRunId, status: "running" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to start sync" });
  }
});

router.get("/gyms/:gymId/integrations/wodify/sync-status", async (req, res): Promise<void> => {
  const gymId = parseInt(req.params.gymId, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select({ wodifyApiKey: gymsTable.wodifyApiKey }).from(gymsTable).where(eq(gymsTable.id, gymId));

  const wodifyRuns = await db
    .select()
    .from(syncRunsTable)
    .where(and(eq(syncRunsTable.gymId, gymId), eq(syncRunsTable.source, "wodify-api")))
    .orderBy(desc(syncRunsTable.startedAt))
    .limit(5);

  const maskedKey = gym?.wodifyApiKey
    ? `····${gym.wodifyApiKey.slice(-4)}`
    : null;

  res.json({
    hasApiKey: !!gym?.wodifyApiKey,
    maskedKey,
    latestSync: wodifyRuns[0] || null,
    recentSyncs: wodifyRuns,
  });
});

export default router;
