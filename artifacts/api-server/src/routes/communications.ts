import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { CreateAnnouncementBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/announcements", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const announcements = await db.select().from(announcementsTable).where(eq(announcementsTable.gymId, gymId)).orderBy(desc(announcementsTable.createdAt));
  res.json(announcements);
});

router.post("/gyms/:gymId/announcements", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const authorName = req.userId ? "Admin" : "System";

  const [ann] = await db.insert(announcementsTable).values({
    ...parsed.data,
    gymId,
    authorName,
    authorId: req.userId,
  }).returning();

  res.status(201).json(ann);
});

export default router;
