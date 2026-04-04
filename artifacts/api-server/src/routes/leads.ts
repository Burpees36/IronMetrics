import { Router, type IRouter } from "express";
import { eq, and, ilike, or, desc, sql, count } from "drizzle-orm";
import { db, leadsTable, leadActivitiesTable, membersTable, timelineEventsTable, gymsTable } from "@workspace/db";
import { CreateLeadBody, UpdateLeadBody } from "@workspace/api-zod";
import { enrollLeadInSequence, pauseLeadSequences } from "../services/lead-sequence-engine";
import { sendLeadSms } from "../services/member-sms";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function parseLeadId(params: any): number | null {
  const raw = Array.isArray(params.leadId) ? params.leadId[0] : params.leadId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

async function logActivity(leadId: number, gymId: number, type: string, description: string, metadata?: string) {
  await db.insert(leadActivitiesTable).values({ leadId, gymId, type, description, metadata: metadata || null });
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
      or(
        ilike(leadsTable.firstName, `%${search}%`),
        ilike(leadsTable.lastName, `%${search}%`),
        ilike(leadsTable.email, `%${search}%`),
        ilike(leadsTable.phone || "", `%${search}%`)
      )!
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

  await logActivity(lead.id, gymId, "created", `Lead created: ${lead.firstName} ${lead.lastName}`);

  try {
    await enrollLeadInSequence(lead.id, gymId, lead.stage);
  } catch (err: any) {
    console.error("[leads] Auto-enroll error:", err.message);
  }

  res.status(201).json(lead);
});

router.get("/gyms/:gymId/leads/insights", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const allLeads = await db.select().from(leadsTable).where(eq(leadsTable.gymId, gymId));

  const stageCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const sourceConverted: Record<string, number> = {};
  let staleCount = 0;
  let needsFollowUp = 0;
  let conversionsThisMonth = 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const lead of allLeads) {
    stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;

    if (lead.source) {
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
      if (lead.stage === "converted") {
        sourceConverted[lead.source] = (sourceConverted[lead.source] || 0) + 1;
      }
    }

    const isStale = computeStale(lead);
    if (isStale) staleCount++;

    if (lead.nextFollowUpDate) {
      const followUpDate = new Date(lead.nextFollowUpDate + "T00:00:00");
      if (followUpDate <= now && lead.stage !== "converted" && lead.stage !== "lost") {
        needsFollowUp++;
      }
    }

    if (lead.stage === "converted" && lead.convertedAt && lead.convertedAt >= monthStart) {
      conversionsThisMonth++;
    }
  }

  const totalActive = allLeads.filter(l => l.stage !== "converted" && l.stage !== "lost").length;

  let bottleneckStage = "";
  let bottleneckCount = 0;
  for (const [stage, cnt] of Object.entries(stageCounts)) {
    if (stage !== "converted" && stage !== "lost" && cnt > bottleneckCount) {
      bottleneckStage = stage;
      bottleneckCount = cnt;
    }
  }

  const sourcePerformance = Object.entries(sourceCounts).map(([source, total]) => ({
    source,
    total,
    converted: sourceConverted[source] || 0,
    rate: total > 0 ? Math.round(((sourceConverted[source] || 0) / total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  res.json({
    totalLeads: allLeads.length,
    totalActive,
    stageCounts,
    staleCount,
    needsFollowUp,
    conversionsThisMonth,
    bottleneckStage,
    bottleneckCount,
    sourcePerformance,
  });
});

router.get("/gyms/:gymId/leads/:leadId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const leadId = parseLeadId(req.params);
  if (!gymId || !leadId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  res.json(lead);
});

router.patch("/gyms/:gymId/leads/:leadId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const leadId = parseLeadId(req.params);
  if (!gymId || !leadId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
  if (!existing) { res.status(404).json({ error: "Lead not found" }); return; }

  const updateData: any = { ...parsed.data };

  if (parsed.data.stage && parsed.data.stage !== existing.stage) {
    updateData.lastContactDate = new Date();
    if (parsed.data.stage === "lost") {
      updateData.nextFollowUpDate = null;
      updateData.followUpNote = null;
    }
  }

  if (parsed.data.nextFollowUpDate !== undefined) {
    updateData.lastContactDate = new Date();
  }

  const [lead] = await db.update(leadsTable).set(updateData).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId))).returning();

  if (parsed.data.stage && parsed.data.stage !== existing.stage) {
    await logActivity(leadId, gymId, "stage_changed", `Stage changed from ${existing.stage} to ${parsed.data.stage}`, JSON.stringify({ from: existing.stage, to: parsed.data.stage }));

    try {
      await pauseLeadSequences(leadId, gymId, `stage_changed_to_${parsed.data.stage}`);
      if (parsed.data.stage !== "converted" && parsed.data.stage !== "lost") {
        await enrollLeadInSequence(leadId, gymId, parsed.data.stage);
      }
    } catch (err: any) {
      console.error("[leads] Sequence stage-change handling error:", err.message);
    }
  }

  if (parsed.data.nextFollowUpDate !== undefined) {
    await logActivity(leadId, gymId, "follow_up_scheduled", `Follow-up ${parsed.data.nextFollowUpDate ? "scheduled for " + parsed.data.nextFollowUpDate : "cleared"}`);
  }

  if (parsed.data.notes !== undefined && parsed.data.notes !== existing.notes) {
    await logActivity(leadId, gymId, "note_updated", "Notes updated");
  }

  res.json(lead);
});

router.get("/gyms/:gymId/leads/:leadId/activities", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const leadId = parseLeadId(req.params);
  if (!gymId || !leadId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const activities = await db
    .select()
    .from(leadActivitiesTable)
    .where(and(eq(leadActivitiesTable.leadId, leadId), eq(leadActivitiesTable.gymId, gymId)))
    .orderBy(desc(leadActivitiesTable.createdAt));

  res.json(activities);
});

router.post("/gyms/:gymId/leads/:leadId/activities", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const leadId = parseLeadId(req.params);
  if (!gymId || !leadId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { type, description } = req.body;
  if (!type || !description) { res.status(400).json({ error: "type and description required" }); return; }

  const [existing] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
  if (!existing) { res.status(404).json({ error: "Lead not found" }); return; }

  await logActivity(leadId, gymId, type, description);

  if (type === "contact_logged") {
    await db.update(leadsTable).set({ lastContactDate: new Date() }).where(eq(leadsTable.id, leadId));
    try {
      await pauseLeadSequences(leadId, gymId, "manual_contact");
    } catch (err: any) {
      console.error("[leads] Pause sequence on contact error:", err.message);
    }
  }

  const activities = await db
    .select()
    .from(leadActivitiesTable)
    .where(and(eq(leadActivitiesTable.leadId, leadId), eq(leadActivitiesTable.gymId, gymId)))
    .orderBy(desc(leadActivitiesTable.createdAt));

  res.json(activities);
});

router.post("/gyms/:gymId/leads/:leadId/convert", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const leadId = parseLeadId(req.params);
  if (!gymId || !leadId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
  if (lead.stage === "converted") { res.status(409).json({ error: "Lead is already converted" }); return; }
  if (lead.stage === "lost") { res.status(400).json({ error: "Cannot convert a lost lead. Change stage first." }); return; }

  const body = req.body || {};
  const startDate = body.startDate || new Date().toISOString().split("T")[0];
  const conversionNote = body.note || null;

  const [member] = await db.insert(membersTable).values({
    gymId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    status: "active",
    joinDate: startDate,
    tags: [],
  }).returning();

  await db.update(leadsTable).set({
    stage: "converted",
    convertedAt: new Date(),
    nextFollowUpDate: null,
    followUpNote: null,
  }).where(eq(leadsTable.id, leadId));

  await db.insert(timelineEventsTable).values({
    memberId: member.id,
    gymId,
    type: "converted",
    title: "Converted from lead",
    description: conversionNote || "Converted from lead pipeline",
    date: new Date(),
  });

  await logActivity(leadId, gymId, "converted", `Converted to member${conversionNote ? ": " + conversionNote : ""}`);

  res.json({ ...member, riskScore: null });
});

function computeStale(lead: any): boolean {
  if (lead.stage === "converted" || lead.stage === "lost") return false;

  const now = new Date();
  const created = new Date(lead.createdAt);
  const lastContact = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
  const hoursInStage = lastContact
    ? (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60)
    : (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (lead.stage === "new" && !lastContact && hoursInStage > 24) return true;
  if (lead.stage === "contacted" && hoursInStage > 72) return true;
  if ((lead.stage === "scheduled" || lead.stage === "trial") && lead.nextFollowUpDate) {
    const followUp = new Date(lead.nextFollowUpDate + "T00:00:00");
    if (now > followUp) return true;
  }
  if ((lead.stage === "scheduled" || lead.stage === "trial") && !lead.nextFollowUpDate && hoursInStage > 72) return true;

  return false;
}

router.post("/gyms/:gymId/leads/:leadId/send-sms", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const leadId = parseLeadId(req.params);
  if (!gymId || !leadId) { res.status(400).json({ error: "Invalid gym or lead ID" }); return; }

  const { message } = req.body as { message?: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" }); return;
  }

  try {
    const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    if (!lead.phone) { res.status(400).json({ error: "Lead has no phone number on file" }); return; }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }
    if (!gym.smsEnabled) { res.status(400).json({ error: "SMS is not enabled for this gym" }); return; }

    const result = await sendLeadSms({
      leadId,
      gymId,
      to: lead.phone,
      body: message.trim(),
      smsType: "manual",
      gymConfig: {
        smsEnabled: gym.smsEnabled ?? false,
        twilioAccountSid: gym.twilioAccountSid,
        twilioAuthToken: gym.twilioAuthToken,
        twilioPhoneNumber: gym.twilioPhoneNumber,
      },
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || "Failed to send SMS" }); return;
    }

    res.json({
      success: true,
      recipientName: `${lead.firstName} ${lead.lastName}`,
      recipientPhone: lead.phone,
      messageSid: result.messageSid,
    });
  } catch (err) {
    console.error("Error sending lead SMS:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
