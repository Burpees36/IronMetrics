import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, attendanceTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/gyms/:gymId/attendance", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(attendanceTable.gymId, gymId)];

  if (req.query.memberId) {
    conditions.push(eq(attendanceTable.memberId, parseInt(req.query.memberId as string, 10)));
  }
  if (req.query.startDate) {
    conditions.push(gte(attendanceTable.checkinTime, new Date(req.query.startDate as string)));
  }
  if (req.query.endDate) {
    conditions.push(lte(attendanceTable.checkinTime, new Date(req.query.endDate as string)));
  }

  const attendance = await db
    .select()
    .from(attendanceTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(attendanceTable.checkinTime))
    .limit(200);

  res.json(attendance);
});

export default router;
