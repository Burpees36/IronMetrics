import { Router, type IRouter } from "express";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { db, leadsTable, membersTable, timelineEventsTable } from "@workspace/db";
import { CreateLeadBody, UpdateLeadBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/leads", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const stage = req.query.stage as string | undefined;
  const search = req.query.search as string | undefined;

  let conditions = [eq(leadsTable.gymId, gymId)];
  if (stage) conditions.push(eq(leadsTable.stage, stage));
  if (search) {
    conditions.push(
      or(ilike(leadsTable.firstName, `%${search}%`), ilike(leadsTable.lastName, `%${search}%`), ilike(leadsTable.email, `%${search}%`))!
    );
  }

  const leads = await db
    .select()
    .from(leadsTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(leadsTable.createdAt));

  res.json(leads);
});

router.post("/gyms/:gymId/leads", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [lead] = await db.insert(leadsTable).values({ ...parsed.data, gymId }).returning();
  res.status(201).json(lead);
});

router.get("/gyms/:gymId/leads/:leadId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
  const leadId = parseInt(raw, 10);
  if (!gymId || isNaN(leadId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  res.json(lead);
});

router.patch("/gyms/:gymId/leads/:leadId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
  const leadId = parseInt(raw, 10);
  if (!gymId || isNaN(leadId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [lead] = await db.update(leadsTable).set(parsed.data).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId))).returning();
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  res.json(lead);
});

router.post("/gyms/:gymId/leads/:leadId/convert", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
  const leadId = parseInt(raw, 10);
  if (!gymId || isNaN(leadId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const [member] = await db.insert(membersTable).values({
    gymId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    status: "active",
    joinDate: today,
    tags: [],
  }).returning();

  await db.update(leadsTable).set({ stage: "converted" }).where(eq(leadsTable.id, leadId));

  await db.insert(timelineEventsTable).values({
    memberId: member.id,
    gymId,
    type: "converted",
    title: "Converted from lead",
    description: `Converted from lead pipeline`,
    date: new Date(),
  });

  res.json({ ...member, riskScore: null });
});

export default router;
