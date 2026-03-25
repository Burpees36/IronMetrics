import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, workoutResultsTable } from "@workspace/db";
import { requireProgrammingRead, isStaffRole, type ProgrammingRole } from "../../middlewares/programmingRbac";
import { parseGymId, parseDayId, parseSectionId, verifyDayBelongsToGym, verifySectionBelongsToDay } from "./helpers";

const router: IRouter = Router();

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
