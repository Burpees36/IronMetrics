import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, classesTable, attendanceTable, gymStaffTable } from "@workspace/db";
import { CreateClassBody, UpdateClassBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/classes", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(classesTable.gymId, gymId)];
  if (req.query.startDate) conditions.push(gte(classesTable.startTime, new Date(req.query.startDate as string)));
  if (req.query.endDate) conditions.push(lte(classesTable.startTime, new Date(req.query.endDate as string)));

  const classes = await db
    .select()
    .from(classesTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(classesTable.startTime);

  res.json(classes);
});

router.post("/gyms/:gymId/classes", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  let coachName: string | null = null;
  if (parsed.data.coachId) {
    const [staff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.id, parsed.data.coachId), eq(gymStaffTable.gymId, gymId)));
    if (!staff) { res.status(400).json({ error: "Invalid coach ID" }); return; }
    coachName = `${staff.firstName} ${staff.lastName}`;
  }

  const [gymClass] = await db.insert(classesTable).values({
    ...parsed.data,
    gymId,
    coachName,
    enrolled: 0,
    status: "scheduled",
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
  }).returning();

  res.status(201).json(gymClass);
});

router.get("/gyms/:gymId/classes/:classId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId;
  const classId = parseInt(raw, 10);
  if (!gymId || isNaN(classId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const roster = await db.select().from(attendanceTable).where(eq(attendanceTable.classId, classId));

  res.json({ ...gymClass, roster });
});

router.patch("/gyms/:gymId/classes/:classId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId;
  const classId = parseInt(raw, 10);
  if (!gymId || isNaN(classId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: any = { ...parsed.data };
  if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
  if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

  if (updateData.coachId) {
    const [staff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.id, updateData.coachId), eq(gymStaffTable.gymId, gymId)));
    if (!staff) { res.status(400).json({ error: "Invalid coach ID" }); return; }
    updateData.coachName = `${staff.firstName} ${staff.lastName}`;
  } else if (updateData.coachId === null) {
    updateData.coachName = null;
  }

  const [gymClass] = await db.update(classesTable).set(updateData).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId))).returning();
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }
  res.json(gymClass);
});

router.delete("/gyms/:gymId/classes/:classId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId;
  const classId = parseInt(raw, 10);
  if (!gymId || isNaN(classId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  await db.delete(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  res.sendStatus(204);
});

router.post("/gyms/:gymId/classes/:classId/checkin", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId;
  const classId = parseInt(raw, 10);
  if (!gymId || isNaN(classId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const memberId = req.body.memberId;
  const status = req.body.status || "present";

  const { membersTable } = await import("@workspace/db");
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const [gymClass] = await db.select().from(classesTable).where(eq(classesTable.id, classId));

  const [attendance] = await db.insert(attendanceTable).values({
    gymId,
    memberId,
    memberName: `${member.firstName} ${member.lastName}`,
    classId,
    className: gymClass?.name || "Open Gym",
    checkinTime: new Date(),
    status,
  }).returning();

  await db.update(classesTable).set({ enrolled: (gymClass?.enrolled || 0) + 1 }).where(eq(classesTable.id, classId));
  await db.update(membersTable).set({ lastVisitDate: new Date() }).where(eq(membersTable.id, memberId));

  res.status(201).json(attendance);
});

export default router;
