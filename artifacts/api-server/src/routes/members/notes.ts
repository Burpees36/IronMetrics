import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, memberNotesTable, timelineEventsTable } from "@workspace/db";
import { AddMemberNoteBody } from "@workspace/api-zod";
import { parseGymId, parseMemberId } from "./helpers";

const router: IRouter = Router();

router.post("/gyms/:gymId/members/:memberId/notes", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = AddMemberNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const authorName = req.isAuthenticated() ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Staff" : "System";
  const authorId = req.isAuthenticated() ? req.user.id : undefined;

  const [note] = await db
    .insert(memberNotesTable)
    .values({ memberId, gymId, content: parsed.data.content, authorName, authorId })
    .returning();

  res.status(201).json(note);
});

router.get("/gyms/:gymId/members/:memberId/timeline", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(and(eq(timelineEventsTable.memberId, memberId), eq(timelineEventsTable.gymId, gymId)))
    .orderBy(desc(timelineEventsTable.date));

  res.json(events.map((e) => ({ ...e, metadata: e.metadata ? JSON.parse(e.metadata) : {} })));
});

export default router;
