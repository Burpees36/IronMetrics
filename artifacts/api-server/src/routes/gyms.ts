import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, gymsTable, gymStaffTable, membersTable } from "@workspace/db";
import { CreateGymBody, UpdateGymBody, GetGymParams } from "@workspace/api-zod";
import { activeMemberCondition } from "../blendedMetrics";
import { applyOwnerVoice, type CommunicationStyle } from "../services/ai-task-generation";

const router: IRouter = Router();

router.get("/gyms", async (req, res): Promise<void> => {
  const staffEntries = await db
    .select({ gymId: gymStaffTable.gymId })
    .from(gymStaffTable)
    .where(eq(gymStaffTable.userId, req.user!.id));

  const ownedGyms = await db
    .select()
    .from(gymsTable)
    .where(eq(gymsTable.ownerId, req.user!.id));

  const staffGymIds = staffEntries.map((s) => s.gymId);
  const ownedGymIds = ownedGyms.map((g) => g.id);
  const allGymIds = [...new Set([...ownedGymIds, ...staffGymIds])];

  if (allGymIds.length === 0) {
    const allGyms = await db.select().from(gymsTable).limit(1);
    if (allGyms.length > 0) {
      const gym = allGyms[0];
      await db.update(gymsTable).set({ ownerId: req.user!.id }).where(eq(gymsTable.id, gym.id));
      await db.insert(gymStaffTable).values({
        gymId: gym.id,
        userId: req.user!.id,
        firstName: req.user!.firstName || "Owner",
        lastName: req.user!.lastName || "",
        email: req.user!.email || "",
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
    .values({ ...parsed.data, slug, ownerId: req.user!.id })
    .returning();

  await db.insert(gymStaffTable).values({
    gymId: gym.id,
    userId: req.user!.id,
    firstName: req.user!.firstName || "Owner",
    lastName: req.user!.lastName || "",
    email: req.user!.email || "",
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

  const isOwner = gym.ownerId === req.user!.id;
  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id), eq(gymStaffTable.isActive, true))
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
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id), eq(gymStaffTable.isActive, true))
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
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user!.id), eq(gymStaffTable.isActive, true))
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

export default router;
