import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, lt } from "drizzle-orm";
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

  const body = {
    ...req.body,
    startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
    endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
  };
  const parsed = CreateClassBody.safeParse(body);
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

  const body = { ...req.body };
  if (body.startTime) body.startTime = new Date(body.startTime);
  if (body.endTime) body.endTime = new Date(body.endTime);
  const parsed = UpdateClassBody.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: any = { ...parsed.data };

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
  const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const currentEnrolled = gymClass.enrolled || 0;
  if (gymClass.capacity && currentEnrolled >= gymClass.capacity) {
    res.status(409).json({ error: "Class is full", enrolled: currentEnrolled, capacity: gymClass.capacity });
    return;
  }

  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.classId, classId), eq(attendanceTable.memberId, memberId))
  );
  if (existing) {
    res.status(409).json({ error: "Member is already checked in to this class" });
    return;
  }

  const capacityCondition = gymClass.capacity
    ? and(eq(classesTable.id, classId), lt(classesTable.enrolled, gymClass.capacity))
    : eq(classesTable.id, classId);

  const [updated] = await db
    .update(classesTable)
    .set({ enrolled: sql`COALESCE(${classesTable.enrolled}, 0) + 1` })
    .where(capacityCondition)
    .returning();

  if (!updated) {
    res.status(409).json({ error: "Class is full" });
    return;
  }

  const [attendance] = await db.insert(attendanceTable).values({
    gymId,
    memberId,
    memberName: `${member.firstName} ${member.lastName}`,
    classId,
    className: gymClass.name || "Open Gym",
    checkinTime: new Date(),
    status,
  }).returning();

  await db.update(membersTable).set({ lastVisitDate: new Date() }).where(eq(membersTable.id, memberId));

  res.status(201).json(attendance);
});

export default router;
