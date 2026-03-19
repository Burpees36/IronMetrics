import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, asc, sql, ne } from "drizzle-orm";
import {
  db,
  programmingDaysTable,
  programmingSectionsTable,
  workoutResultsTable,
} from "@workspace/db";
import {
  requireProgrammingRead,
  requireProgrammingWrite,
  isStaffRole,
  stripCoachNotesFromDay,
  type ProgrammingRole,
} from "../middlewares/programmingRbac";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function parseDayId(params: any): number | null {
  const raw = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function parseSectionId(params: any): number | null {
  const raw = Array.isArray(params.sectionId) ? params.sectionId[0] : params.sectionId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

async function getDayWithSections(dayId: number, gymId?: number) {
  const conditions = [eq(programmingDaysTable.id, dayId)];
  if (gymId !== undefined) {
    conditions.push(eq(programmingDaysTable.gymId, gymId));
  }

  const [day] = await db
    .select()
    .from(programmingDaysTable)
    .where(and(...conditions));
  if (!day) return null;

  const sections = await db
    .select()
    .from(programmingSectionsTable)
    .where(eq(programmingSectionsTable.dayId, dayId))
    .orderBy(asc(programmingSectionsTable.orderIndex));

  return { ...day, sections };
}

async function verifyDayBelongsToGym(dayId: number, gymId: number) {
  const [day] = await db
    .select()
    .from(programmingDaysTable)
    .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));
  return day || null;
}

async function verifySectionBelongsToDay(sectionId: number, dayId: number) {
  const [section] = await db
    .select()
    .from(programmingSectionsTable)
    .where(and(eq(programmingSectionsTable.id, sectionId), eq(programmingSectionsTable.dayId, dayId)));
  return section || null;
}

router.get(
  "/gyms/:gymId/programming",
  requireProgrammingRead(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const role = req.programmingRole;
    const { startDate, endDate, status } = req.query;

    const conditions: any[] = [eq(programmingDaysTable.gymId, gymId)];

    if (!isStaffRole(role)) {
      conditions.push(eq(programmingDaysTable.status, "published"));
    } else if (status && typeof status === "string") {
      const validStatuses = ["draft", "published", "archived"] as const;
      if (validStatuses.includes(status as (typeof validStatuses)[number])) {
        conditions.push(eq(programmingDaysTable.status, status as (typeof validStatuses)[number]));
      }
    } else {
      conditions.push(ne(programmingDaysTable.status, "archived"));
    }

    if (startDate && typeof startDate === "string") {
      conditions.push(gte(programmingDaysTable.date, startDate));
    }
    if (endDate && typeof endDate === "string") {
      conditions.push(lte(programmingDaysTable.date, endDate));
    }

    const days = await db
      .select()
      .from(programmingDaysTable)
      .where(and(...conditions))
      .orderBy(desc(programmingDaysTable.date));

    const daysWithSections = await Promise.all(
      days.map(async (day) => {
        const sections = await db
          .select()
          .from(programmingSectionsTable)
          .where(eq(programmingSectionsTable.dayId, day.id))
          .orderBy(asc(programmingSectionsTable.orderIndex));
        return stripCoachNotesFromDay({ ...day, sections }, role);
      })
    );

    res.json(daysWithSections);
  }
);

router.get(
  "/gyms/:gymId/programming/:dayId",
  requireProgrammingRead(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const role = req.programmingRole;

    const dayWithSections = await getDayWithSections(dayId);
    if (!dayWithSections || dayWithSections.gymId !== gymId) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    if (!isStaffRole(role) && dayWithSections.status !== "published") {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    res.json(stripCoachNotesFromDay(dayWithSections, role));
  }
);

router.post(
  "/gyms/:gymId/programming",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const { date, title, status, publicNotes, coachNotes, track, sections } = req.body;

    if (!date || !title) {
      res.status(400).json({ error: "date and title are required" });
      return;
    }

    const userId = req.user?.id || null;

    const [day] = await db
      .insert(programmingDaysTable)
      .values({
        gymId,
        date,
        title,
        status: status || "draft",
        publicNotes: publicNotes || null,
        coachNotes: coachNotes || null,
        track: track || "default",
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    if (sections && Array.isArray(sections) && sections.length > 0) {
      const sectionValues = sections.map((s: any, idx: number) => ({
        dayId: day.id,
        orderIndex: s.orderIndex ?? idx,
        sectionType: s.sectionType || "wod",
        title: s.title || "Untitled Section",
        instructions: s.instructions || null,
        duration: s.duration || null,
        timeCap: s.timeCap || null,
        intendedStimulus: s.intendedStimulus || null,
        movements: s.movements || [],
        scalingNotes: s.scalingNotes || null,
        coachNotes: s.coachNotes || null,
        memberNotes: s.memberNotes || null,
        resultTrackingEnabled: s.resultTrackingEnabled ?? false,
      }));

      await db.insert(programmingSectionsTable).values(sectionValues);
    }

    const result = await getDayWithSections(day.id);
    res.status(201).json(result);
  }
);

router.patch(
  "/gyms/:gymId/programming/:dayId",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const [existing] = await db
      .select()
      .from(programmingDaysTable)
      .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));

    if (!existing) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const { date, title, status, publicNotes, coachNotes, track } = req.body;
    const userId = req.user?.id || null;

    const updates: any = { updatedBy: userId };
    if (date !== undefined) updates.date = date;
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (publicNotes !== undefined) updates.publicNotes = publicNotes;
    if (coachNotes !== undefined) updates.coachNotes = coachNotes;
    if (track !== undefined) updates.track = track;

    await db
      .update(programmingDaysTable)
      .set(updates)
      .where(eq(programmingDaysTable.id, dayId));

    const result = await getDayWithSections(dayId);
    res.json(result);
  }
);

router.delete(
  "/gyms/:gymId/programming/:dayId",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const [existing] = await db
      .select()
      .from(programmingDaysTable)
      .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));

    if (!existing) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    await db
      .update(programmingDaysTable)
      .set({ status: "archived" })
      .where(eq(programmingDaysTable.id, dayId));

    res.json({ success: true });
  }
);

router.post(
  "/gyms/:gymId/programming/:dayId/publish",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const [existing] = await db
      .select()
      .from(programmingDaysTable)
      .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));

    if (!existing) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const newStatus = existing.status === "published" ? "draft" : "published";

    await db
      .update(programmingDaysTable)
      .set({ status: newStatus, updatedBy: req.user?.id || null })
      .where(eq(programmingDaysTable.id, dayId));

    const result = await getDayWithSections(dayId);
    res.json(result);
  }
);

router.post(
  "/gyms/:gymId/programming/:dayId/duplicate",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const [existing] = await db
      .select()
      .from(programmingDaysTable)
      .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));

    if (!existing) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const { date } = req.body;
    if (!date) {
      res.status(400).json({ error: "date is required for duplication target" });
      return;
    }

    const userId = req.user?.id || null;

    const [newDay] = await db
      .insert(programmingDaysTable)
      .values({
        gymId: existing.gymId,
        date,
        title: existing.title,
        status: "draft",
        publicNotes: existing.publicNotes,
        coachNotes: existing.coachNotes,
        track: existing.track,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const sections = await db
      .select()
      .from(programmingSectionsTable)
      .where(eq(programmingSectionsTable.dayId, dayId))
      .orderBy(asc(programmingSectionsTable.orderIndex));

    if (sections.length > 0) {
      const sectionValues = sections.map((s) => ({
        dayId: newDay.id,
        orderIndex: s.orderIndex,
        sectionType: s.sectionType,
        title: s.title,
        instructions: s.instructions,
        duration: s.duration,
        timeCap: s.timeCap,
        intendedStimulus: s.intendedStimulus,
        movements: s.movements,
        scalingNotes: s.scalingNotes,
        coachNotes: s.coachNotes,
        memberNotes: s.memberNotes,
        resultTrackingEnabled: s.resultTrackingEnabled,
      }));

      await db.insert(programmingSectionsTable).values(sectionValues);
    }

    const result = await getDayWithSections(newDay.id);
    res.status(201).json(result);
  }
);

router.post(
  "/gyms/:gymId/programming/:dayId/sections",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const [existing] = await db
      .select()
      .from(programmingDaysTable)
      .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));

    if (!existing) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const {
      orderIndex,
      sectionType,
      title,
      instructions,
      duration,
      timeCap,
      intendedStimulus,
      movements,
      scalingNotes,
      coachNotes,
      memberNotes,
      resultTrackingEnabled,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const existingSections = await db
      .select()
      .from(programmingSectionsTable)
      .where(eq(programmingSectionsTable.dayId, dayId));

    const maxOrder = existingSections.reduce((max, s) => Math.max(max, s.orderIndex), -1);

    const [section] = await db
      .insert(programmingSectionsTable)
      .values({
        dayId,
        orderIndex: orderIndex ?? maxOrder + 1,
        sectionType: sectionType || "wod",
        title,
        instructions: instructions || null,
        duration: duration || null,
        timeCap: timeCap || null,
        intendedStimulus: intendedStimulus || null,
        movements: movements || [],
        scalingNotes: scalingNotes || null,
        coachNotes: coachNotes || null,
        memberNotes: memberNotes || null,
        resultTrackingEnabled: resultTrackingEnabled ?? false,
      })
      .returning();

    res.status(201).json(section);
  }
);

router.patch(
  "/gyms/:gymId/programming/:dayId/sections/:sectionId",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    const sectionId = parseSectionId(req.params);
    if (!gymId || !dayId || !sectionId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const day = await verifyDayBelongsToGym(dayId, gymId);
    if (!day) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const existing = await verifySectionBelongsToDay(sectionId, dayId);
    if (!existing) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    const {
      orderIndex,
      sectionType,
      title,
      instructions,
      duration,
      timeCap,
      intendedStimulus,
      movements,
      scalingNotes,
      coachNotes,
      memberNotes,
      resultTrackingEnabled,
    } = req.body;

    const updates: any = {};
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;
    if (sectionType !== undefined) updates.sectionType = sectionType;
    if (title !== undefined) updates.title = title;
    if (instructions !== undefined) updates.instructions = instructions;
    if (duration !== undefined) updates.duration = duration;
    if (timeCap !== undefined) updates.timeCap = timeCap;
    if (intendedStimulus !== undefined) updates.intendedStimulus = intendedStimulus;
    if (movements !== undefined) updates.movements = movements;
    if (scalingNotes !== undefined) updates.scalingNotes = scalingNotes;
    if (coachNotes !== undefined) updates.coachNotes = coachNotes;
    if (memberNotes !== undefined) updates.memberNotes = memberNotes;
    if (resultTrackingEnabled !== undefined) updates.resultTrackingEnabled = resultTrackingEnabled;

    const [updated] = await db
      .update(programmingSectionsTable)
      .set(updates)
      .where(eq(programmingSectionsTable.id, sectionId))
      .returning();

    res.json(updated);
  }
);

router.delete(
  "/gyms/:gymId/programming/:dayId/sections/:sectionId",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    const sectionId = parseSectionId(req.params);
    if (!gymId || !dayId || !sectionId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const day = await verifyDayBelongsToGym(dayId, gymId);
    if (!day) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const existing = await verifySectionBelongsToDay(sectionId, dayId);
    if (!existing) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    await db
      .delete(programmingSectionsTable)
      .where(eq(programmingSectionsTable.id, sectionId));

    res.json({ success: true });
  }
);

router.put(
  "/gyms/:gymId/programming/:dayId/sections/reorder",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    if (!gymId || !dayId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const day = await verifyDayBelongsToGym(dayId, gymId);
    if (!day) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const { sectionIds } = req.body;
    if (!sectionIds || !Array.isArray(sectionIds)) {
      res.status(400).json({ error: "sectionIds array is required" });
      return;
    }

    await Promise.all(
      sectionIds.map((id: number, index: number) =>
        db
          .update(programmingSectionsTable)
          .set({ orderIndex: index })
          .where(
            and(
              eq(programmingSectionsTable.id, id),
              eq(programmingSectionsTable.dayId, dayId)
            )
          )
      )
    );

    const sections = await db
      .select()
      .from(programmingSectionsTable)
      .where(eq(programmingSectionsTable.dayId, dayId))
      .orderBy(asc(programmingSectionsTable.orderIndex));

    res.json(sections);
  }
);

router.post(
  "/gyms/:gymId/programming/:dayId/sections/:sectionId/results",
  requireProgrammingRead(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    const sectionId = parseSectionId(req.params);
    if (!gymId || !dayId || !sectionId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const day = await verifyDayBelongsToGym(dayId, gymId);
    if (!day) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const section = await verifySectionBelongsToDay(sectionId, dayId);
    if (!section) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    const { memberId, result, notes, isRx, isPr } = req.body;
    if (!memberId || !result) {
      res.status(400).json({ error: "memberId and result are required" });
      return;
    }

    const role = req.programmingRole as ProgrammingRole;
    const userId = req.user!.id;
    const { membersTable } = await import("@workspace/db");
    const [member] = await db
      .select()
      .from(membersTable)
      .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));

    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    if (!isStaffRole(role) && member.email !== userId) {
      res.status(403).json({ error: "You can only log results for yourself" });
      return;
    }

    const [existingResult] = await db
      .select()
      .from(workoutResultsTable)
      .where(
        and(
          eq(workoutResultsTable.programmingSectionId, sectionId),
          eq(workoutResultsTable.memberId, memberId),
          eq(workoutResultsTable.gymId, gymId)
        )
      );

    if (existingResult) {
      res.status(409).json({ error: "You have already logged a result for this section", existing: existingResult });
      return;
    }

    const { workoutsTable } = await import("@workspace/db");
    let workoutId: number;

    const [existingWorkout] = await db
      .select()
      .from(workoutsTable)
      .where(
        and(
          eq(workoutsTable.gymId, gymId),
          eq(workoutsTable.title, `${day.title} - ${section.title}`),
        )
      );

    if (existingWorkout) {
      workoutId = existingWorkout.id;
    } else {
      const [newWorkout] = await db
        .insert(workoutsTable)
        .values({
          gymId,
          title: `${day.title} - ${section.title}`,
          description: section.instructions,
          workoutDate: day.date,
          type: section.sectionType,
          movements: section.movements,
        })
        .returning();
      workoutId = newWorkout.id;
    }

    const [logged] = await db
      .insert(workoutResultsTable)
      .values({
        workoutId,
        programmingSectionId: sectionId,
        memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        gymId,
        result,
        notes: notes || null,
        isRx: isRx ?? false,
        isPr: isPr ?? false,
      })
      .returning();

    res.status(201).json(logged);
  }
);

router.get(
  "/gyms/:gymId/programming/:dayId/sections/:sectionId/results",
  requireProgrammingRead(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    const sectionId = parseSectionId(req.params);
    if (!gymId || !dayId || !sectionId) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const day = await verifyDayBelongsToGym(dayId, gymId);
    if (!day) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const section = await verifySectionBelongsToDay(sectionId, dayId);
    if (!section) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    const results = await db
      .select()
      .from(workoutResultsTable)
      .where(
        and(
          eq(workoutResultsTable.programmingSectionId, sectionId),
          eq(workoutResultsTable.gymId, gymId)
        )
      )
      .orderBy(workoutResultsTable.rank);

    res.json(results);
  }
);

router.patch(
  "/gyms/:gymId/programming/:dayId/sections/:sectionId/results/:resultId",
  requireProgrammingRead(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    const dayId = parseDayId(req.params);
    const sectionId = parseSectionId(req.params);
    const raw = Array.isArray(req.params.resultId) ? req.params.resultId[0] : req.params.resultId;
    const resultId = parseInt(raw, 10);
    if (!gymId || !dayId || !sectionId || isNaN(resultId)) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const day = await verifyDayBelongsToGym(dayId, gymId);
    if (!day) {
      res.status(404).json({ error: "Programming day not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(workoutResultsTable)
      .where(
        and(
          eq(workoutResultsTable.id, resultId),
          eq(workoutResultsTable.programmingSectionId, sectionId),
          eq(workoutResultsTable.gymId, gymId)
        )
      );

    if (!existing) {
      res.status(404).json({ error: "Result not found" });
      return;
    }

    const role = req.programmingRole as ProgrammingRole;
    const userId = req.user!.id;
    if (!isStaffRole(role)) {
      const { membersTable } = await import("@workspace/db");
      const [member] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, existing.memberId), eq(membersTable.gymId, gymId)));
      if (!member || member.email !== userId) {
        res.status(403).json({ error: "You can only edit your own results" });
        return;
      }
    }

    const { result, notes, isRx, isPr } = req.body;
    const updates: Partial<{ result: string; notes: string | null; isRx: boolean; isPr: boolean }> = {};
    if (result !== undefined) updates.result = result;
    if (notes !== undefined) updates.notes = notes;
    if (isRx !== undefined) updates.isRx = isRx;
    if (isPr !== undefined) updates.isPr = isPr;

    const [updated] = await db
      .update(workoutResultsTable)
      .set(updates)
      .where(eq(workoutResultsTable.id, resultId))
      .returning();

    res.json(updated);
  }
);

export default router;
