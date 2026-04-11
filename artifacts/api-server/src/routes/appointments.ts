import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  db,
  appointmentTypesTable,
  coachAvailabilityTable,
  appointmentsTable,
  gymStaffTable,
  leadsTable,
  leadActivitiesTable,
} from "@workspace/db";
import { requireScheduleManage } from "../middlewares/scheduleRbac";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/appointment-types", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const types = await db
    .select()
    .from(appointmentTypesTable)
    .where(eq(appointmentTypesTable.gymId, gymId))
    .orderBy(appointmentTypesTable.name);

  res.json(types);
});

router.post("/gyms/:gymId/appointment-types", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { name, description, durationMinutes, color, isFree, price } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }

  const [type] = await db.insert(appointmentTypesTable).values({
    gymId,
    name,
    description: description || null,
    durationMinutes: durationMinutes || 30,
    color: color || "#6366f1",
    isFree: isFree || false,
    price: price || null,
  }).returning();

  res.status(201).json(type);
});

router.patch("/gyms/:gymId/appointment-types/:typeId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const typeId = parseInt(req.params.typeId, 10);
  if (!gymId || isNaN(typeId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const updateData: any = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.durationMinutes !== undefined) updateData.durationMinutes = req.body.durationMinutes;
  if (req.body.color !== undefined) updateData.color = req.body.color;
  if (req.body.isFree !== undefined) updateData.isFree = req.body.isFree;
  if (req.body.price !== undefined) updateData.price = req.body.price;
  if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

  const [updated] = await db
    .update(appointmentTypesTable)
    .set(updateData)
    .where(and(eq(appointmentTypesTable.id, typeId), eq(appointmentTypesTable.gymId, gymId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Appointment type not found" }); return; }
  res.json(updated);
});

router.delete("/gyms/:gymId/appointment-types/:typeId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const typeId = parseInt(req.params.typeId, 10);
  if (!gymId || isNaN(typeId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [deleted] = await db
    .delete(appointmentTypesTable)
    .where(and(eq(appointmentTypesTable.id, typeId), eq(appointmentTypesTable.gymId, gymId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Appointment type not found" }); return; }
  res.json({ message: "Appointment type deleted" });
});

router.get("/gyms/:gymId/coach-availability", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(coachAvailabilityTable.gymId, gymId)];

  if (req.query.coachId) {
    conditions.push(eq(coachAvailabilityTable.coachId, parseInt(req.query.coachId as string, 10)));
  }

  const slots = await db
    .select()
    .from(coachAvailabilityTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(coachAvailabilityTable.dayOfWeek, coachAvailabilityTable.startTime);

  res.json(slots);
});

router.post("/gyms/:gymId/coach-availability", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { coachId, dayOfWeek, startTime, endTime } = req.body;
  if (!coachId || dayOfWeek === undefined || !startTime || !endTime) {
    res.status(400).json({ error: "coachId, dayOfWeek, startTime, and endTime are required" });
    return;
  }

  const [staff] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.id, coachId), eq(gymStaffTable.gymId, gymId))
  );
  if (!staff) { res.status(400).json({ error: "Invalid coach ID" }); return; }

  const [slot] = await db.insert(coachAvailabilityTable).values({
    gymId,
    coachId,
    dayOfWeek,
    startTime,
    endTime,
  }).returning();

  res.status(201).json(slot);
});

router.delete("/gyms/:gymId/coach-availability/:slotId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const slotId = parseInt(req.params.slotId, 10);
  if (!gymId || isNaN(slotId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [deleted] = await db
    .delete(coachAvailabilityTable)
    .where(and(eq(coachAvailabilityTable.id, slotId), eq(coachAvailabilityTable.gymId, gymId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Availability slot not found" }); return; }
  res.json({ message: "Availability slot deleted" });
});

router.get("/gyms/:gymId/appointments", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(appointmentsTable.gymId, gymId)];

  if (req.query.startDate) {
    conditions.push(gte(appointmentsTable.startTime, new Date(req.query.startDate as string)));
  }
  if (req.query.endDate) {
    conditions.push(lte(appointmentsTable.startTime, new Date(req.query.endDate as string)));
  }
  if (req.query.coachId) {
    conditions.push(eq(appointmentsTable.coachId, parseInt(req.query.coachId as string, 10)));
  }
  if (req.query.memberId) {
    conditions.push(eq(appointmentsTable.memberId, parseInt(req.query.memberId as string, 10)));
  }
  if (req.query.status) {
    conditions.push(eq(appointmentsTable.status, req.query.status as string));
  }

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(appointmentsTable.startTime);

  res.json(appointments);
});

router.post("/gyms/:gymId/appointments", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { appointmentTypeId, coachId, memberId, leadId, startTime, notes } = req.body;
  if (!appointmentTypeId || !startTime) {
    res.status(400).json({ error: "appointmentTypeId and startTime are required" });
    return;
  }

  const [apptType] = await db.select().from(appointmentTypesTable).where(
    and(eq(appointmentTypesTable.id, appointmentTypeId), eq(appointmentTypesTable.gymId, gymId))
  );
  if (!apptType) { res.status(400).json({ error: "Invalid appointment type" }); return; }

  let coachName: string | null = null;
  let resolvedCoachId: number | null = null;
  if (coachId) {
    const [coach] = await db.select().from(gymStaffTable).where(
      and(eq(gymStaffTable.id, coachId), eq(gymStaffTable.gymId, gymId))
    );
    if (!coach) { res.status(400).json({ error: "Invalid coach ID" }); return; }
    resolvedCoachId = coach.id;
    coachName = `${coach.firstName} ${coach.lastName}`;
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + apptType.durationMinutes * 60000);

  let memberName: string | null = null;
  let leadName: string | null = null;

  if (memberId) {
    const { membersTable } = await import("@workspace/db");
    const [member] = await db.select().from(membersTable).where(
      and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId))
    );
    if (!member) { res.status(400).json({ error: "Invalid member ID" }); return; }
    memberName = `${member.firstName} ${member.lastName}`;
  }

  if (leadId) {
    const [lead] = await db.select().from(leadsTable).where(
      and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId))
    );
    if (!lead) { res.status(400).json({ error: "Invalid lead ID" }); return; }
    leadName = `${lead.firstName} ${lead.lastName}`;
  }

  const userId = req.user?.id || null;

  const [appointment] = await db.insert(appointmentsTable).values({
    gymId,
    appointmentTypeId,
    coachId: resolvedCoachId,
    coachName,
    memberId: memberId || null,
    memberName,
    leadId: leadId || null,
    leadName,
    startTime: start,
    endTime: end,
    notes: notes || null,
    status: "scheduled",
    createdBy: userId,
  }).returning();

  if (leadId) {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (lead && (lead.stage === "new" || lead.stage === "contacted")) {
      await db.update(leadsTable).set({ stage: "scheduled" }).where(eq(leadsTable.id, leadId));
      await db.insert(leadActivitiesTable).values({
        leadId,
        gymId,
        type: "appointment_booked",
        description: `${apptType.name} scheduled with ${coach.firstName} ${coach.lastName} for ${start.toLocaleDateString()}`,
      });
    }
  }

  res.status(201).json(appointment);
});

router.get("/gyms/:gymId/appointments/:appointmentId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const appointmentId = parseInt(req.params.appointmentId, 10);
  if (!gymId || isNaN(appointmentId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [appointment] = await db
    .select()
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, appointmentId), eq(appointmentsTable.gymId, gymId)));

  if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(appointment);
});

router.patch("/gyms/:gymId/appointments/:appointmentId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const appointmentId = parseInt(req.params.appointmentId, 10);
  if (!gymId || isNaN(appointmentId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const updateData: any = {};
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;
  if (req.body.startTime !== undefined) {
    updateData.startTime = new Date(req.body.startTime);
    const [existing] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, appointmentId));
    if (existing) {
      const [apptType] = await db.select().from(appointmentTypesTable).where(eq(appointmentTypesTable.id, existing.appointmentTypeId));
      if (apptType) {
        updateData.endTime = new Date(updateData.startTime.getTime() + apptType.durationMinutes * 60000);
      }
    }
  }

  const [updated] = await db
    .update(appointmentsTable)
    .set(updateData)
    .where(and(eq(appointmentsTable.id, appointmentId), eq(appointmentsTable.gymId, gymId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(updated);
});

router.delete("/gyms/:gymId/appointments/:appointmentId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const appointmentId = parseInt(req.params.appointmentId, 10);
  if (!gymId || isNaN(appointmentId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [deleted] = await db
    .delete(appointmentsTable)
    .where(and(eq(appointmentsTable.id, appointmentId), eq(appointmentsTable.gymId, gymId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json({ message: "Appointment deleted" });
});

export default router;
