import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, programmingSectionsTable } from "@workspace/db";
import { requireProgrammingWrite } from "../../middlewares/programmingRbac";
import { parseGymId, parseDayId, parseSectionId, verifyDayBelongsToGym, verifySectionBelongsToDay } from "./helpers";

const router: IRouter = Router();

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

    const { programmingDaysTable } = await import("@workspace/db");
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

export default router;
