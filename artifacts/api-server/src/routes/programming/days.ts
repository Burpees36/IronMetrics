import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, asc, ne } from "drizzle-orm";
import { db, programmingDaysTable, programmingSectionsTable } from "@workspace/db";
import { requireProgrammingRead, requireProgrammingWrite, isStaffRole, stripCoachNotesFromDay } from "../../middlewares/programmingRbac";
import { parseGymId, parseDayId, getDayWithSections } from "./helpers";

const router: IRouter = Router();

router.get(
  "/gyms/:gymId/programming",
  requireProgrammingRead(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const role = req.programmingRole ?? "member";
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

    const role = req.programmingRole ?? "member";

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

export default router;
