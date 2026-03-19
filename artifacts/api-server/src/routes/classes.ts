import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, lt } from "drizzle-orm";
import { db, classesTable, attendanceTable, gymStaffTable, scheduledHoldsTable, gymsTable } from "@workspace/db";
import { CreateClassBody, UpdateClassBody } from "@workspace/api-zod";
import { requireScheduleManage, requireScheduleOperate, canManageSchedule, type ScheduleRole } from "../middlewares/scheduleRbac";

async function checkMemberBillingStatus(memberId: number, gymId: number): Promise<{ allowed: boolean; reason?: string }> {
  const activeHolds = await db.select().from(scheduledHoldsTable)
    .where(and(
      eq(scheduledHoldsTable.memberId, memberId), eq(scheduledHoldsTable.gymId, gymId),
      eq(scheduledHoldsTable.status, "active")
    ));
  if (activeHolds.length > 0) return { allowed: false, reason: "Member is on hold" };

  const { billingRecoveryTable } = await import("@workspace/db");
  const activeRecovery = await db.select().from(billingRecoveryTable)
    .where(and(
      eq(billingRecoveryTable.memberId, memberId), eq(billingRecoveryTable.gymId, gymId),
      eq(billingRecoveryTable.status, "active")
    ));

  if (activeRecovery.length > 0) {
    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    const policy = gym?.pastDuePolicy || "grace_period";
    if (policy === "strict") return { allowed: false, reason: "Payment past due — check-in blocked" };
    const recovery = activeRecovery[0];
    if (recovery.graceDeadline && new Date(recovery.graceDeadline) < new Date()) {
      return { allowed: false, reason: "Grace period expired — payment required before check-in" };
    }
  }
  return { allowed: true };
}

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function parseClassId(params: any): number | null {
  const raw = Array.isArray(params.classId) ? params.classId[0] : params.classId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/classes", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const role = req.gymRole as ScheduleRole;

  let conditions: any[] = [eq(classesTable.gymId, gymId)];
  if (req.query.startDate) conditions.push(gte(classesTable.startTime, new Date(req.query.startDate as string)));
  if (req.query.endDate) conditions.push(lte(classesTable.startTime, new Date(req.query.endDate as string)));

  const classes = await db
    .select()
    .from(classesTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(classesTable.startTime);

  if (role === "member") {
    const sanitized = classes.map(({ staffNotes, ...rest }) => rest);
    res.json(sanitized);
    return;
  }

  res.json(classes);
});

router.post("/gyms/:gymId/classes", requireScheduleManage(), async (req, res): Promise<void> => {
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

  const userId = req.user?.id || null;

  const [gymClass] = await db.insert(classesTable).values({
    ...parsed.data,
    gymId,
    coachName,
    enrolled: 0,
    waitlistCount: 0,
    status: "scheduled",
    createdBy: userId,
    updatedBy: userId,
  }).returning();

  res.status(201).json(gymClass);
});

router.get("/gyms/:gymId/classes/:classId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const role = req.gymRole as ScheduleRole;

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const roster = await db.select().from(attendanceTable).where(eq(attendanceTable.classId, classId));

  if (role === "member") {
    const { staffNotes, ...safeClass } = gymClass;
    const safeRoster = roster.map(({ memberName, status, id }) => ({ id, memberName, status }));
    res.json({ ...safeClass, roster: safeRoster });
    return;
  }

  res.json({ ...gymClass, roster });
});

router.patch("/gyms/:gymId/classes/:classId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const body = { ...req.body };
  if (body.startTime) body.startTime = new Date(body.startTime);
  if (body.endTime) body.endTime = new Date(body.endTime);
  const parsed = UpdateClassBody.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: any = { ...parsed.data };

  if (body.memberNotes !== undefined) updateData.memberNotes = body.memberNotes || null;
  if (body.staffNotes !== undefined) updateData.staffNotes = body.staffNotes || null;
  if (body.isBookable !== undefined) updateData.isBookable = body.isBookable;
  if (body.waitlistEnabled !== undefined) updateData.waitlistEnabled = body.waitlistEnabled;

  if (updateData.coachId) {
    const [staff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.id, updateData.coachId), eq(gymStaffTable.gymId, gymId)));
    if (!staff) { res.status(400).json({ error: "Invalid coach ID" }); return; }
    updateData.coachName = `${staff.firstName} ${staff.lastName}`;
  } else if (updateData.coachId === null) {
    updateData.coachName = null;
  }

  updateData.updatedBy = req.user?.id || null;

  const [gymClass] = await db.update(classesTable).set(updateData).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId))).returning();
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }
  res.json(gymClass);
});

router.delete("/gyms/:gymId/classes/clear-week", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { weekStart } = req.body;
  if (!weekStart) { res.status(400).json({ error: "weekStart is required" }); return; }

  const start = new Date(weekStart);
  if (isNaN(start.getTime())) { res.status(400).json({ error: "Invalid weekStart date" }); return; }

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const weekClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, start),
        lt(classesTable.startTime, end)
      )
    );

  if (weekClasses.length === 0) {
    res.json({ deleted: 0, message: "No classes found for this week." });
    return;
  }

  const classIds = weekClasses.map((c) => c.id);
  const { inArray } = await import("drizzle-orm");

  await db.delete(attendanceTable).where(inArray(attendanceTable.classId, classIds));
  await db.delete(classesTable).where(inArray(classesTable.id, classIds));

  res.json({ deleted: classIds.length, message: `${classIds.length} class${classIds.length > 1 ? "es" : ""} and all associated attendance records removed.` });
});

router.delete("/gyms/:gymId/classes/:classId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const enrolledCount = gymClass.enrolled || 0;

  await db.delete(attendanceTable).where(eq(attendanceTable.classId, classId));
  await db.delete(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  res.json({ message: "Class deleted", enrolledCount });
});

router.post("/gyms/:gymId/classes/:classId/duplicate", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [source] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!source) { res.status(404).json({ error: "Source class not found" }); return; }

  const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : null;
  let startTime = new Date(source.startTime);
  let endTime = new Date(source.endTime);

  if (targetDate) {
    const duration = endTime.getTime() - startTime.getTime();
    startTime = new Date(targetDate);
    startTime.setHours(new Date(source.startTime).getHours(), new Date(source.startTime).getMinutes(), 0, 0);
    endTime = new Date(startTime.getTime() + duration);
  }

  const userId = req.user?.id || null;

  const [duplicate] = await db.insert(classesTable).values({
    gymId,
    name: source.name,
    description: source.description,
    memberNotes: source.memberNotes,
    staffNotes: source.staffNotes,
    coachId: source.coachId,
    coachName: source.coachName,
    startTime,
    endTime,
    capacity: source.capacity,
    enrolled: 0,
    waitlistCount: 0,
    type: source.type,
    status: "scheduled",
    isBookable: source.isBookable,
    waitlistEnabled: source.waitlistEnabled,
    isRecurring: false,
    createdBy: userId,
    updatedBy: userId,
  }).returning();

  res.status(201).json(duplicate);
});

router.post("/gyms/:gymId/classes/:classId/checkin", requireScheduleOperate(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const memberId = req.body.memberId;
  const status = req.body.status || "checked_in";

  const { membersTable } = await import("@workspace/db");
  const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  if (status === "checked_in") {
    const billingCheck = await checkMemberBillingStatus(memberId, gymId);
    if (!billingCheck.allowed) {
      res.status(403).json({ error: billingCheck.reason || "Check-in blocked by billing policy" }); return;
    }
  }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.classId, classId), eq(attendanceTable.memberId, memberId))
  );

  if (existing) {
    if (existing.status === "checked_in" || existing.status === "present") {
      res.status(409).json({ error: "Member is already checked in to this class" });
      return;
    }
    const [updated] = await db.update(attendanceTable)
      .set({ status: "checked_in", checkinTime: new Date() })
      .where(eq(attendanceTable.id, existing.id))
      .returning();

    if (existing.status === "waitlisted") {
      await db.update(classesTable)
        .set({
          enrolled: sql`COALESCE(${classesTable.enrolled}, 0) + 1`,
          waitlistCount: sql`GREATEST(COALESCE(${classesTable.waitlistCount}, 0) - 1, 0)`,
        })
        .where(eq(classesTable.id, classId));
    }

    await db.update(membersTable).set({ lastVisitDate: new Date() }).where(eq(membersTable.id, memberId));
    res.json(updated);
    return;
  }

  const currentEnrolled = gymClass.enrolled || 0;
  if (gymClass.capacity && currentEnrolled >= gymClass.capacity) {
    if (gymClass.waitlistEnabled) {
      const waitlistPos = (gymClass.waitlistCount || 0) + 1;
      const [attendance] = await db.insert(attendanceTable).values({
        gymId, memberId, memberName: `${member.firstName} ${member.lastName}`,
        classId, className: gymClass.name || "Class",
        checkinTime: new Date(), status: "waitlisted", waitlistPosition: waitlistPos,
      }).returning();
      await db.update(classesTable).set({ waitlistCount: sql`COALESCE(${classesTable.waitlistCount}, 0) + 1` }).where(eq(classesTable.id, classId));
      res.status(201).json(attendance);
      return;
    }
    res.status(409).json({ error: "Class is full", enrolled: currentEnrolled, capacity: gymClass.capacity });
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
    gymId, memberId, memberName: `${member.firstName} ${member.lastName}`,
    classId, className: gymClass.name || "Class",
    checkinTime: new Date(), status,
  }).returning();

  await db.update(membersTable).set({ lastVisitDate: new Date() }).where(eq(membersTable.id, memberId));
  res.status(201).json(attendance);
});

router.post("/gyms/:gymId/classes/:classId/book", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const memberId = req.body.memberId;
  if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }

  const { membersTable } = await import("@workspace/db");
  const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  if (!gymClass.isBookable) { res.status(400).json({ error: "This class is not currently bookable" }); return; }

  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.classId, classId), eq(attendanceTable.memberId, memberId))
  );
  if (existing) {
    res.status(409).json({ error: "Already booked", status: existing.status });
    return;
  }

  const currentEnrolled = gymClass.enrolled || 0;
  if (gymClass.capacity && currentEnrolled >= gymClass.capacity) {
    if (gymClass.waitlistEnabled) {
      const waitlistPos = (gymClass.waitlistCount || 0) + 1;
      const [attendance] = await db.insert(attendanceTable).values({
        gymId, memberId, memberName: `${member.firstName} ${member.lastName}`,
        classId, className: gymClass.name || "Class",
        checkinTime: new Date(), status: "waitlisted", waitlistPosition: waitlistPos,
      }).returning();
      await db.update(classesTable).set({ waitlistCount: sql`COALESCE(${classesTable.waitlistCount}, 0) + 1` }).where(eq(classesTable.id, classId));
      res.status(201).json({ ...attendance, message: "Added to waitlist" });
      return;
    }
    res.status(409).json({ error: "Class is full" });
    return;
  }

  const [updated] = await db
    .update(classesTable)
    .set({ enrolled: sql`COALESCE(${classesTable.enrolled}, 0) + 1` })
    .where(and(eq(classesTable.id, classId), lt(classesTable.enrolled, gymClass.capacity || 9999)))
    .returning();

  if (!updated) { res.status(409).json({ error: "Class is full" }); return; }

  const [attendance] = await db.insert(attendanceTable).values({
    gymId, memberId, memberName: `${member.firstName} ${member.lastName}`,
    classId, className: gymClass.name || "Class",
    checkinTime: new Date(), status: "reserved",
  }).returning();

  res.status(201).json(attendance);
});

router.post("/gyms/:gymId/classes/:classId/cancel-booking", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  if (!gymId || !classId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const memberId = req.body.memberId;
  if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }

  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.classId, classId), eq(attendanceTable.memberId, memberId))
  );
  if (!existing) { res.status(404).json({ error: "No booking found" }); return; }

  if (existing.status === "checked_in" || existing.status === "present") {
    res.status(400).json({ error: "Cannot cancel after check-in" });
    return;
  }

  const wasWaitlisted = existing.status === "waitlisted";

  await db.update(attendanceTable)
    .set({ status: "cancelled" })
    .where(eq(attendanceTable.id, existing.id));

  if (wasWaitlisted) {
    await db.update(classesTable)
      .set({ waitlistCount: sql`GREATEST(COALESCE(${classesTable.waitlistCount}, 0) - 1, 0)` })
      .where(eq(classesTable.id, classId));
  } else {
    await db.update(classesTable)
      .set({ enrolled: sql`GREATEST(COALESCE(${classesTable.enrolled}, 0) - 1, 0)` })
      .where(eq(classesTable.id, classId));
  }

  res.json({ message: "Booking cancelled" });
});

router.patch("/gyms/:gymId/classes/:classId/attendance/:attendanceId", requireScheduleOperate(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const classId = parseClassId(req.params);
  const attendanceId = parseInt(String(req.params.attendanceId), 10);
  if (!gymId || !classId || isNaN(attendanceId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const newStatus = req.body.status;
  const validStatuses = ["reserved", "checked_in", "no_show", "cancelled", "waitlisted"];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const [gymClass] = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.gymId, gymId)));
  if (!gymClass) { res.status(404).json({ error: "Class not found" }); return; }

  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.id, attendanceId), eq(attendanceTable.classId, classId))
  );
  if (!existing) { res.status(404).json({ error: "Attendance record not found" }); return; }

  if (newStatus === "checked_in" && existing.status !== "checked_in") {
    const billingCheck = await checkMemberBillingStatus(existing.memberId, gymId);
    if (!billingCheck.allowed) {
      res.status(403).json({ error: billingCheck.reason || "Check-in blocked by billing policy" }); return;
    }
  }

  const oldStatus = existing.status;

  const updateFields: any = { status: newStatus };
  if (newStatus === "checked_in") updateFields.checkinTime = new Date();

  const [updated] = await db.update(attendanceTable)
    .set(updateFields)
    .where(eq(attendanceTable.id, attendanceId))
    .returning();

  const enrolledStatuses = ["reserved", "checked_in", "present"];
  const wasEnrolled = enrolledStatuses.includes(oldStatus);
  const isNowEnrolled = enrolledStatuses.includes(newStatus);
  const wasWaitlisted = oldStatus === "waitlisted";
  const isNowWaitlisted = newStatus === "waitlisted";

  if (wasEnrolled && !isNowEnrolled) {
    await db.update(classesTable).set({ enrolled: sql`GREATEST(COALESCE(${classesTable.enrolled}, 0) - 1, 0)` }).where(eq(classesTable.id, classId));
  } else if (!wasEnrolled && isNowEnrolled) {
    await db.update(classesTable).set({ enrolled: sql`COALESCE(${classesTable.enrolled}, 0) + 1` }).where(eq(classesTable.id, classId));
  }

  if (wasWaitlisted && !isNowWaitlisted) {
    await db.update(classesTable).set({ waitlistCount: sql`GREATEST(COALESCE(${classesTable.waitlistCount}, 0) - 1, 0)` }).where(eq(classesTable.id, classId));
  } else if (!wasWaitlisted && isNowWaitlisted) {
    await db.update(classesTable).set({ waitlistCount: sql`COALESCE(${classesTable.waitlistCount}, 0) + 1` }).where(eq(classesTable.id, classId));
  }

  if (newStatus === "checked_in") {
    const { membersTable } = await import("@workspace/db");
    await db.update(membersTable).set({ lastVisitDate: new Date() }).where(eq(membersTable.id, existing.memberId));
  }

  res.json(updated);
});

export default router;
