import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, gymsTable, gymStaffTable, membersTable } from "@workspace/db";
import { CreateGymBody, UpdateGymBody, GetGymParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/gyms", async (req, res): Promise<void> => {
  const staffEntries = await db
    .select({ gymId: gymStaffTable.gymId })
    .from(gymStaffTable)
    .where(eq(gymStaffTable.userId, req.user.id));

  const ownedGyms = await db
    .select()
    .from(gymsTable)
    .where(eq(gymsTable.ownerId, req.user.id));

  const staffGymIds = staffEntries.map((s) => s.gymId);
  const ownedGymIds = ownedGyms.map((g) => g.id);
  const allGymIds = [...new Set([...ownedGymIds, ...staffGymIds])];

  if (allGymIds.length === 0) {
    const allGyms = await db.select().from(gymsTable).limit(1);
    if (allGyms.length > 0) {
      const gym = allGyms[0];
      await db.update(gymsTable).set({ ownerId: req.user.id }).where(eq(gymsTable.id, gym.id));
      await db.insert(gymStaffTable).values({
        gymId: gym.id,
        userId: req.user.id,
        firstName: req.user.firstName || "Owner",
        lastName: req.user.lastName || "",
        email: req.user.email || "",
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
      .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));
    gyms.push({
      ...gym,
      memberCount: memberCountResult?.count ?? 0,
      activeCount: activeCountResult?.count ?? 0,
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
    .values({ ...parsed.data, slug, ownerId: req.user.id })
    .returning();

  await db.insert(gymStaffTable).values({
    gymId: gym.id,
    userId: req.user.id,
    firstName: req.user.firstName || "Owner",
    lastName: req.user.lastName || "",
    email: req.user.email || "",
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

  const isOwner = gym.ownerId === req.user.id;
  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user.id))
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
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

  res.json({
    ...gym,
    memberCount: memberCountResult?.count ?? 0,
    activeCount: activeCountResult?.count ?? 0,
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
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, req.user.id))
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
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

  res.json({
    ...gym,
    memberCount: memberCountResult?.count ?? 0,
    activeCount: activeCountResult?.count ?? 0,
  });
});

export default router;
