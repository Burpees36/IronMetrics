import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { db, workoutsTable, workoutResultsTable } from "@workspace/db";
import { CreateWorkoutBody, LogWorkoutResultBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/workouts", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const workouts = await db.select().from(workoutsTable).where(eq(workoutsTable.gymId, gymId)).orderBy(desc(workoutsTable.createdAt));

  const workoutsWithCounts = await Promise.all(
    workouts.map(async (w) => {
      const [resultCountRes] = await db.select({ count: count() }).from(workoutResultsTable).where(eq(workoutResultsTable.workoutId, w.id));
      return { ...w, resultCount: resultCountRes?.count ?? 0 };
    })
  );

  res.json(workoutsWithCounts);
});

router.post("/gyms/:gymId/workouts", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const bodyWithStringDate = { ...req.body };
  if (typeof bodyWithStringDate.workoutDate === "string") {
    bodyWithStringDate.workoutDate = new Date(bodyWithStringDate.workoutDate);
  }
  const parsed = CreateWorkoutBody.safeParse(bodyWithStringDate);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const workoutDate = typeof parsed.data.workoutDate === 'string'
    ? parsed.data.workoutDate
    : (parsed.data.workoutDate as Date).toISOString().split('T')[0];

  const [workout] = await db.insert(workoutsTable).values({
    ...parsed.data,
    workoutDate,
    gymId,
    movements: parsed.data.movements || [],
  }).returning();

  res.status(201).json({ ...workout, resultCount: 0 });
});

router.get("/gyms/:gymId/workouts/:workoutId/results", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.workoutId) ? req.params.workoutId[0] : req.params.workoutId;
  const workoutId = parseInt(raw, 10);
  if (!gymId || isNaN(workoutId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const results = await db.select().from(workoutResultsTable).where(eq(workoutResultsTable.workoutId, workoutId)).orderBy(workoutResultsTable.rank);
  res.json(results);
});

router.post("/gyms/:gymId/workouts/:workoutId/results", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.workoutId) ? req.params.workoutId[0] : req.params.workoutId;
  const workoutId = parseInt(raw, 10);
  if (!gymId || isNaN(workoutId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = LogWorkoutResultBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { membersTable } = await import("@workspace/db");
  const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, parsed.data.memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const [result] = await db.insert(workoutResultsTable).values({
    workoutId,
    memberId: parsed.data.memberId,
    memberName: `${member.firstName} ${member.lastName}`,
    gymId,
    result: parsed.data.result,
    notes: parsed.data.notes,
    isRx: parsed.data.isRx ?? false,
    isPr: parsed.data.isPr ?? false,
  }).returning();

  res.status(201).json(result);
});

export default router;
