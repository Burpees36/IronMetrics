import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, gymStaffTable, classesTable } from "@workspace/db";
import { InviteStaffBody, UpdateStaffBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/staff", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [callerStaff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id)));
  if (!callerStaff) {
    res.status(403).json({ error: "You do not have access to this gym" });
    return;
  }

  const staff = await db.select().from(gymStaffTable).where(eq(gymStaffTable.gymId, gymId));

  const staffWithCounts = await Promise.all(
    staff.map(async (s) => {
      const [classCountResult] = await db
        .select({ count: count() })
        .from(classesTable)
        .where(and(eq(classesTable.coachId, s.id), eq(classesTable.gymId, gymId)));
      return { ...s, classCount30d: classCountResult?.count ?? 0 };
    })
  );

  res.json(staffWithCounts);
});

router.post("/gyms/:gymId/staff", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [callerStaff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id)));
  if (!callerStaff || !["gym_owner", "admin"].includes(callerStaff.role)) {
    res.status(403).json({ error: "Only owners and admins can invite staff" });
    return;
  }

  const parsed = InviteStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [staff] = await db.insert(gymStaffTable).values({
    gymId,
    userId: `invited-${Date.now()}`,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    role: parsed.data.role,
  }).returning();

  res.status(201).json({ ...staff, classCount30d: 0 });
});

router.patch("/gyms/:gymId/staff/:staffId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.staffId) ? req.params.staffId[0] : req.params.staffId;
  const staffId = parseInt(raw, 10);
  if (!gymId || isNaN(staffId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [callerStaff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id)));
  if (!callerStaff || !["gym_owner", "admin"].includes(callerStaff.role)) {
    res.status(403).json({ error: "Only owners and admins can manage staff" });
    return;
  }

  const [targetStaff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.id, staffId), eq(gymStaffTable.gymId, gymId)));
  if (!targetStaff) { res.status(404).json({ error: "Staff not found" }); return; }

  if (targetStaff.role === "gym_owner" && callerStaff.role !== "gym_owner") {
    res.status(403).json({ error: "Cannot modify the gym owner's account" });
    return;
  }

  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.role === "gym_owner" && callerStaff.role !== "gym_owner") {
    res.status(403).json({ error: "Only the owner can assign the owner role" });
    return;
  }

  const [staff] = await db.update(gymStaffTable).set(parsed.data).where(and(eq(gymStaffTable.id, staffId), eq(gymStaffTable.gymId, gymId))).returning();
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json({ ...staff, classCount30d: 0 });
});

router.delete("/gyms/:gymId/staff/:staffId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.staffId) ? req.params.staffId[0] : req.params.staffId;
  const staffId = parseInt(raw, 10);
  if (!gymId || isNaN(staffId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [callerStaff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id)));
  if (!callerStaff || !["gym_owner", "admin"].includes(callerStaff.role)) {
    res.status(403).json({ error: "Only owners and admins can remove staff" });
    return;
  }

  const [targetStaff] = await db.select().from(gymStaffTable).where(and(eq(gymStaffTable.id, staffId), eq(gymStaffTable.gymId, gymId)));
  if (targetStaff?.role === "gym_owner") {
    res.status(403).json({ error: "Cannot remove the gym owner" });
    return;
  }

  await db.delete(gymStaffTable).where(and(eq(gymStaffTable.id, staffId), eq(gymStaffTable.gymId, gymId)));
  res.sendStatus(204);
});

export default router;
