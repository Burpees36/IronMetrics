import { Router, type IRouter } from "express";
import { eq, and, ilike, or, count, desc } from "drizzle-orm";
import { db, membersTable, memberNotesTable, timelineEventsTable, subscriptionsTable, attendanceTable } from "@workspace/db";
import { CreateMemberBody, UpdateMemberBody, AddMemberNoteBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function parseMemberId(params: any): number | null {
  const raw = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  let conditions = [eq(membersTable.gymId, gymId)];
  if (status) conditions.push(eq(membersTable.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(membersTable.firstName, `%${search}%`),
        ilike(membersTable.lastName, `%${search}%`),
        ilike(membersTable.email, `%${search}%`)
      )!
    );
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const members = await db
    .select()
    .from(membersTable)
    .where(where)
    .orderBy(desc(membersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(where);

  res.json({
    members: members.map((m) => ({
      ...m,
      riskScore: m.riskScore ? parseFloat(m.riskScore) : null,
    })),
    total: totalResult?.count ?? 0,
    limit,
    offset,
  });
});

router.post("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const [member] = await db
    .insert(membersTable)
    .values({
      ...parsed.data,
      gymId,
      status: "active",
      joinDate: today,
      tags: parsed.data.tags || [],
    })
    .returning();

  await db.insert(timelineEventsTable).values({
    memberId: member.id,
    gymId,
    type: "joined",
    title: "Member joined",
    description: `${member.firstName} ${member.lastName} joined the gym`,
    date: new Date(),
  });

  res.status(201).json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
  });
});

router.get("/gyms/:gymId/members/:memberId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [member] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const notes = await db
    .select()
    .from(memberNotesTable)
    .where(eq(memberNotesTable.memberId, memberId))
    .orderBy(desc(memberNotesTable.createdAt));

  const recentAttendance = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.memberId, memberId))
    .orderBy(desc(attendanceTable.checkinTime))
    .limit(20);

  const [activeSub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.memberId, memberId), eq(subscriptionsTable.status, "active")));

  res.json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
    notes,
    recentAttendance: recentAttendance.map((a) => ({ ...a })),
    activeSubscription: activeSub ? { ...activeSub, amount: parseFloat(activeSub.amount), failedPayments: activeSub.failedPayments } : undefined,
    waiverSigned: member.waiverSigned,
  });
});

router.patch("/gyms/:gymId/members/:memberId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [member] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)))
    .returning();

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  res.json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
  });
});

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
