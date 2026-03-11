import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  knowledgeSourcesTable,
  knowledgeDocumentsTable,
  knowledgeChunksTable,
  knowledgeIngestJobsTable,
  recommendationChunkAuditTable,
} from "@workspace/db";
import { searchKnowledge, getKnowledgeStats, TAXONOMY_TAGS } from "../services/knowledge-retrieval";
import { getPeriodStart } from "../services/recommendation-learning";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/knowledge/sources", async (_req, res): Promise<void> => {
  try {
    const sources = await db.select().from(knowledgeSourcesTable).orderBy(desc(knowledgeSourcesTable.createdAt));
    res.json(sources);
  } catch (error) {
    console.error("Error fetching knowledge sources:", error);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

router.post("/knowledge/sources", async (req, res): Promise<void> => {
  try {
    const { name, url, sourceType } = req.body;
    if (!name || !url) { res.status(400).json({ error: "Name and URL are required" }); return; }

    const [source] = await db.insert(knowledgeSourcesTable).values({
      name,
      url,
      sourceType: sourceType || "youtube_channel",
    }).returning();
    res.status(201).json(source);
  } catch (error: any) {
    console.error("Error creating knowledge source:", error);
    res.status(400).json({ error: error.message || "Invalid data" });
  }
});

router.delete("/knowledge/sources/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid source ID" }); return; }

    await db.delete(knowledgeSourcesTable).where(eq(knowledgeSourcesTable.id, id));
    res.json({ message: "Source deleted" });
  } catch (error) {
    console.error("Error deleting knowledge source:", error);
    res.status(500).json({ error: "Failed to delete source" });
  }
});

router.get("/knowledge/sources/:id/documents", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid source ID" }); return; }

    const docs = await db.select().from(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.sourceId, id))
      .orderBy(desc(knowledgeDocumentsTable.createdAt));

    res.json(docs.map(d => ({
      id: d.id,
      title: d.title,
      url: d.url,
      status: d.status,
      chunkCount: d.chunkCount,
      channelName: d.channelName,
      durationSeconds: d.durationSeconds,
      ingestedAt: d.ingestedAt,
    })));
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/knowledge/documents/:id/chunks", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid document ID" }); return; }

    const chunks = await db.select().from(knowledgeChunksTable)
      .where(eq(knowledgeChunksTable.documentId, id))
      .orderBy(knowledgeChunksTable.chunkIndex);

    res.json(chunks.map(c => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      content: c.content,
      taxonomy: c.taxonomy,
      tokenCount: c.tokenCount,
      hasEmbedding: c.embedding !== null,
    })));
  } catch (error) {
    console.error("Error fetching chunks:", error);
    res.status(500).json({ error: "Failed to fetch chunks" });
  }
});

router.get("/knowledge/stats", async (_req, res): Promise<void> => {
  try {
    const stats = await getKnowledgeStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching knowledge stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post("/knowledge/search", async (req, res): Promise<void> => {
  try {
    const { query, tags, limit } = req.body;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Query is required" });
      return;
    }
    const results = await searchKnowledge(query, tags || [], limit || 10);
    res.json(results);
  } catch (error) {
    console.error("Error searching knowledge:", error);
    res.status(500).json({ error: "Failed to search knowledge" });
  }
});

router.get("/knowledge/taxonomy", async (_req, res): Promise<void> => {
  res.json(TAXONOMY_TAGS);
});

router.get("/knowledge/ingest-jobs", async (req, res): Promise<void> => {
  try {
    const sourceId = typeof req.query.sourceId === "string" ? parseInt(req.query.sourceId, 10) : undefined;
    let query = db.select().from(knowledgeIngestJobsTable).orderBy(desc(knowledgeIngestJobsTable.startedAt));

    if (sourceId && !isNaN(sourceId)) {
      const jobs = await db.select().from(knowledgeIngestJobsTable)
        .where(eq(knowledgeIngestJobsTable.sourceId, sourceId))
        .orderBy(desc(knowledgeIngestJobsTable.startedAt));
      res.json(jobs);
    } else {
      const jobs = await query;
      res.json(jobs);
    }
  } catch (error) {
    console.error("Error fetching ingest jobs:", error);
    res.status(500).json({ error: "Failed to fetch ingest jobs" });
  }
});

router.get("/gyms/:gymId/knowledge/audits", async (req, res): Promise<void> => {
  try {
    const gymId = parseGymId(req.params);
    if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

    const periodStart = typeof req.query.periodStart === "string" ? req.query.periodStart : getPeriodStart();
    const audits = await db.select().from(recommendationChunkAuditTable)
      .where(eq(recommendationChunkAuditTable.gymId, gymId))
      .orderBy(desc(recommendationChunkAuditTable.usedAt));

    res.json(audits);
  } catch (error) {
    console.error("Error fetching recommendation audits:", error);
    res.status(500).json({ error: "Failed to fetch audits" });
  }
});

export default router;
