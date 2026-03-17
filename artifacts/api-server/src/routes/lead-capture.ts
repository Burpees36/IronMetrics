import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";
import { db, leadsTable, leadActivitiesTable, gymsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/lead-capture/:gymSlug", async (req, res): Promise<void> => {
  const { gymSlug } = req.params;
  if (!gymSlug) { res.status(400).json({ error: "Missing gym identifier" }); return; }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.slug, gymSlug));
  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }

  const { firstName, lastName, email, phone, notes } = req.body;
  if (!firstName || !lastName || !email) {
    res.status(400).json({ error: "firstName, lastName, and email are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const [duplicateForGym] = await db.select({ id: leadsTable.id }).from(leadsTable).where(
    and(
      eq(leadsTable.gymId, gym.id),
      sql`lower(${leadsTable.email}) = ${normalizedEmail}`,
      ne(leadsTable.stage, "lost")
    )
  ).limit(1);
  if (duplicateForGym) {
    res.status(200).json({ message: "Thank you! We already have your information and will be in touch." });
    return;
  }

  const [lead] = await db.insert(leadsTable).values({
    gymId: gym.id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    notes: notes?.trim() || null,
    source: "website",
    stage: "new",
  }).returning();

  await db.insert(leadActivitiesTable).values({
    leadId: lead.id,
    gymId: gym.id,
    type: "created",
    description: `Lead captured from website form: ${lead.firstName} ${lead.lastName}`,
    metadata: JSON.stringify({ source: "lead_capture_form" }),
  });

  res.status(201).json({ message: "Thank you! We'll be in touch soon." });
});

router.get("/lead-capture/:gymSlug/info", async (req, res): Promise<void> => {
  const { gymSlug } = req.params;
  if (!gymSlug) { res.status(400).json({ error: "Missing gym identifier" }); return; }

  const [gym] = await db.select({
    name: gymsTable.name,
    description: gymsTable.description,
    logoUrl: gymsTable.logoUrl,
    phone: gymsTable.phone,
    email: gymsTable.email,
    address: gymsTable.address,
    city: gymsTable.city,
    state: gymsTable.state,
    website: gymsTable.website,
  }).from(gymsTable).where(eq(gymsTable.slug, gymSlug));

  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }

  res.json(gym);
});

export default router;
