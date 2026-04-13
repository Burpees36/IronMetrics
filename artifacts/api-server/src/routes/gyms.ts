import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, gymsTable, gymStaffTable, membersTable } from "@workspace/db";
import { CreateGymBody, UpdateGymBody, GetGymParams, SendTestSmsBody } from "@workspace/api-zod";
import { activeMemberCondition } from "../blendedMetrics";
import { applyOwnerVoice, type CommunicationStyle } from "../services/ai-task-generation";
import { getSmsService } from "../services/sms-service";
import { ObjectStorageService } from "../lib/objectStorage";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();

router.get("/gyms", async (req, res): Promise<void> => {
  const staffEntries = await db
    .select({ gymId: gymStaffTable.gymId })
    .from(gymStaffTable)
    .where(eq(gymStaffTable.userId, req.userId!));

  const ownedGyms = await db
    .select()
    .from(gymsTable)
    .where(eq(gymsTable.ownerId, req.userId!));

  const staffGymIds = staffEntries.map((s) => s.gymId);
  const ownedGymIds = ownedGyms.map((g) => g.id);
  const allGymIds = [...new Set([...ownedGymIds, ...staffGymIds])];

  if (allGymIds.length === 0) {
    const allGyms = await db.select().from(gymsTable).limit(1);
    if (allGyms.length > 0) {
      const gym = allGyms[0];
      await db.update(gymsTable).set({ ownerId: req.userId! }).where(eq(gymsTable.id, gym.id));
      let clerkUser: { firstName?: string | null; lastName?: string | null; emailAddresses?: { emailAddress: string }[] } = {};
      try { clerkUser = await clerkClient.users.getUser(req.userId!); } catch {}
      await db.insert(gymStaffTable).values({
        gymId: gym.id,
        userId: req.userId!,
        firstName: clerkUser.firstName || "Owner",
        lastName: clerkUser.lastName || "",
        email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
        role: "gym_owner",
      }).onConflictDoNothing();
      allGymIds.push(gym.id);
    } else {
      res.json([]);
      return;
    }
  }

  const gyms = [];
  for (const gymId of allGymIds) {
    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) continue;
    const [memberCountResult] = await db
      .select({ count: count() })
      .from(membersTable)
      .where(eq(membersTable.gymId, gymId));
    const [activeCountResult] = await db
      .select({ count: count() })
      .from(membersTable)
      .where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));
    gyms.push({
      ...gym,
      memberCount: Number(memberCountResult?.count ?? 0),
      activeCount: Number(activeCountResult?.count ?? 0),
    });
  }

  res.json(gyms);
});

router.post("/gyms", async (req, res): Promise<void> => {
  const parsed = CreateGymBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [gym] = await db
    .insert(gymsTable)
    .values({ ...parsed.data, slug, ownerId: req.userId! })
    .returning();

  let clerkUser: { firstName?: string | null; lastName?: string | null; emailAddresses?: { emailAddress: string }[] } = {};
  try { clerkUser = await clerkClient.users.getUser(req.userId!); } catch {}
  await db.insert(gymStaffTable).values({
    gymId: gym.id,
    userId: req.userId!,
    firstName: clerkUser.firstName || "Owner",
    lastName: clerkUser.lastName || "",
    email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
    role: "gym_owner",
  });

  res.status(201).json({ ...gym, memberCount: 0, activeCount: 0 });
});

router.get("/gyms/:gymId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const isOwner = gym.ownerId === req.userId!;

  if (!gym.isActive && !isOwner) {
    res.status(403).json({ error: "This business has been deactivated by the owner.", code: "GYM_DEACTIVATED" });
    return;
  }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!isOwner && !staffEntry) {
    res.status(403).json({ error: "You do not have access to this gym" });
    return;
  }

  const [memberCountResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const [activeCountResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));

  res.json({
    ...gym,
    memberCount: Number(memberCountResult?.count ?? 0),
    activeCount: Number(activeCountResult?.count ?? 0),
  });
});

router.patch("/gyms/:gymId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [existingGym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!existingGym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!staffEntry || !["gym_owner", "admin"].includes(staffEntry.role)) {
    res.status(403).json({ error: "Only owners and admins can update gym settings" });
    return;
  }

  const parsed = UpdateGymBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.fromEmail !== undefined && parsed.data.fromEmail !== null && parsed.data.fromEmail !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parsed.data.fromEmail)) {
      res.status(400).json({ error: "Invalid email format for fromEmail" });
      return;
    }
  }

  if (parsed.data.autoSuspendBufferDays !== undefined) {
    const days = parsed.data.autoSuspendBufferDays;
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      res.status(400).json({ error: "autoSuspendBufferDays must be an integer between 1 and 30" });
      return;
    }
  }

  const [gym] = await db
    .update(gymsTable)
    .set(parsed.data)
    .where(eq(gymsTable.id, gymId))
    .returning();

  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const [memberCountResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const [activeCountResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));

  res.json({
    ...gym,
    memberCount: Number(memberCountResult?.count ?? 0),
    activeCount: Number(activeCountResult?.count ?? 0),
  });
});

router.post("/gyms/:gymId/preview-voice", async (req, res): Promise<void> => {
  const gymId = Number(req.params.gymId);
  if (!gymId || isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!staffEntry || !["gym_owner", "admin"].includes(staffEntry.role)) {
    res.status(403).json({ error: "Only owners and admins can preview voice settings" });
    return;
  }

  const { tone, rules, samples } = req.body || {};
  const validTones = ["casual_friendly", "professional", "motivational_coach"];

  const safeTone = typeof tone === "string" && validTones.includes(tone) ? tone : "casual_friendly";
  const safeRules = Array.isArray(rules) ? rules.filter((r: unknown) => typeof r === "string").slice(0, 20) : [];
  const safeSamples = Array.isArray(samples) ? samples.filter((s: unknown) => typeof s === "string").slice(0, 5) : [];

  const style: CommunicationStyle = {
    tone: safeTone,
    rules: safeRules,
    samples: safeSamples,
  };

  const sampleContent = `Hi Sarah,\n\nJust wanted to check in — it's been a little while since we've seen you, and we genuinely miss having you around.\n\nYou've been part of our community for 8 months, and we value that. I'd love to schedule a quick goal review — even just 10 minutes to check in on your progress.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!\n\nLooking forward to hearing from you!`;
  const sampleSubject = "Checking in, Sarah";

  const result = applyOwnerVoice(sampleContent, sampleSubject, style);

  res.json({
    original: { subject: sampleSubject, content: sampleContent },
    styled: { subject: result.subject, content: result.content },
  });
});

router.get("/gyms/:gymId/sms/status", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }

  const smsService = getSmsService(gym);
  res.json({
    configured: smsService.isConfigured(),
    smsEnabled: gym.smsEnabled,
    twilioPhoneNumber: gym.twilioPhoneNumber,
  });
});

router.post("/gyms/:gymId/sms/test", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!staffEntry || !["gym_owner", "admin"].includes(staffEntry.role)) {
    res.status(403).json({ error: "Only owners and admins can test SMS" });
    return;
  }

  const parsed = SendTestSmsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const smsService = getSmsService(gym);
  if (!smsService.isConfigured()) {
    res.status(503).json({ error: "SMS not configured. Set up Twilio credentials and enable SMS first." });
    return;
  }

  const result = await smsService.sendSms({
    to: parsed.data.to,
    body: `Test message from ${gym.name} via ForgeOS. Your SMS setup is working!`,
  });

  if (!result.success) {
    res.status(500).json({ error: result.error || "Failed to send test SMS" });
    return;
  }

  res.json({
    success: true,
    messageSid: result.messageSid,
    recipientPhone: parsed.data.to,
    recipientName: "Test",
  });
});

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

router.post("/gyms/:gymId/logo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!staffEntry || !["gym_owner", "admin"].includes(staffEntry.role)) {
    res.status(403).json({ error: "Only owners and admins can update the gym logo" });
    return;
  }

  const { contentType, size } = req.body || {};

  if (!contentType || !ALLOWED_LOGO_TYPES.includes(contentType)) {
    res.status(400).json({ error: "Invalid file type. Accepted formats: PNG, JPG, SVG." });
    return;
  }

  if (typeof size !== "number" || size <= 0 || size > MAX_LOGO_SIZE) {
    res.status(400).json({ error: `File size must be under ${MAX_LOGO_SIZE / (1024 * 1024)}MB.` });
    return;
  }

  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath });
  } catch (error) {
    console.error("[gyms] Error generating logo upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.put("/gyms/:gymId/logo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!staffEntry || !["gym_owner", "admin"].includes(staffEntry.role)) {
    res.status(403).json({ error: "Only owners and admins can update the gym logo" });
    return;
  }

  const { objectPath } = req.body || {};
  const objectPathPattern = /^\/objects\/[a-f0-9-]+$/;
  if (!objectPath || typeof objectPath !== "string" || !objectPathPattern.test(objectPath)) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }

  const logoUrl = `/api/storage${objectPath}`;

  const [updated] = await db
    .update(gymsTable)
    .set({ logoUrl })
    .where(eq(gymsTable.id, gymId))
    .returning();

  res.json(updated);
});

router.delete("/gyms/:gymId/logo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.userId!), eq(gymStaffTable.isActive, true))
  );
  if (!staffEntry || !["gym_owner", "admin"].includes(staffEntry.role)) {
    res.status(403).json({ error: "Only owners and admins can remove the gym logo" });
    return;
  }

  const [updated] = await db
    .update(gymsTable)
    .set({ logoUrl: null })
    .where(eq(gymsTable.id, gymId))
    .returning();

  res.json(updated);
});

router.post("/gyms/:gymId/deactivate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  if (gym.ownerId !== req.userId!) {
    res.status(403).json({ error: "Only the gym owner can deactivate the business" });
    return;
  }

  if (!gym.isActive) {
    res.status(400).json({ error: "Gym is already deactivated" });
    return;
  }

  const [updated] = await db
    .update(gymsTable)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(eq(gymsTable.id, gymId))
    .returning();

  res.json({ ...updated, memberCount: 0, activeCount: 0 });
});

router.post("/gyms/:gymId/reactivate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  if (gym.ownerId !== req.userId!) {
    res.status(403).json({ error: "Only the gym owner can reactivate the business" });
    return;
  }

  if (gym.isActive) {
    res.status(400).json({ error: "Gym is already active" });
    return;
  }

  const [updated] = await db
    .update(gymsTable)
    .set({ isActive: true, deactivatedAt: null })
    .where(eq(gymsTable.id, gymId))
    .returning();

  const [memberCountResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const [activeCountResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));

  res.json({
    ...updated,
    memberCount: Number(memberCountResult?.count ?? 0),
    activeCount: Number(activeCountResult?.count ?? 0),
  });
});

const GYM_CHILD_TABLES = [
  "recommendation_chunk_audit",
  "outcome_snapshots",
  "recommendation_learning_events",
  "recommendation_learning_stats",
  "checklist_item_completions",
  "recommendation_cards",
  "owner_additional_actions",
  "retention_sequence_events",
  "member_sequence_enrollments",
  "retention_sequence_steps",
  "retention_sequences",
  "rsi_snapshots",
  "lead_sequence_events",
  "lead_sequence_enrollments",
  "lead_sequence_steps",
  "lead_sequences",
  "dismissed_interventions",
  "ai_generated_content",
  "ai_operator_settings",
  "ai_tasks",
  "programming_sections",
  "programming_days",
  "programming_preferences",
  "class_template_items",
  "class_templates",
  "workout_results",
  "workouts",
  "attendance",
  "classes",
  "appointments",
  "coach_availability",
  "appointment_types",
  "announcements",
  "documents",
  "billing_recovery",
  "payment_update_tokens",
  "scheduled_holds",
  "discount_codes",
  "refunds",
  "billing_audit_logs",
  "billing_events",
  "payments",
  "invoices",
  "subscriptions",
  "membership_plans",
  "sales",
  "products",
  "lead_activities",
  "lead_capture_config",
  "leads",
  "timeline_events",
  "member_notes",
  "members",
  "sync_runs",
  "mrr_snapshots",
  "monthly_financial_snapshots",
  "payroll_settings",
  "expenses",
  "expense_categories",
  "gym_onboarding",
  "gym_staff",
];

router.delete("/gyms/:gymId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gymId) ? req.params.gymId[0] : req.params.gymId;
  const gymId = parseInt(raw, 10);
  if (isNaN(gymId)) {
    res.status(400).json({ error: "Invalid gym ID" });
    return;
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  if (gym.ownerId !== req.userId!) {
    res.status(403).json({ error: "Only the gym owner can delete the business" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      for (const table of GYM_CHILD_TABLES) {
        await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE gym_id = ${gymId}`);
      }
      await tx.delete(gymsTable).where(eq(gymsTable.id, gymId));
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE GYM ERROR]", err);
    res.status(500).json({ error: "Failed to delete gym. Please try again or contact support." });
  }
});

export default router;
