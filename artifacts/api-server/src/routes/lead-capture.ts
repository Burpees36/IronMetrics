import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";
import { db, leadsTable, leadActivitiesTable, gymsTable, leadCaptureConfigTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/lead-capture/:gymSlug", async (req, res): Promise<void> => {
  try {
    const { gymSlug } = req.params;
    if (!gymSlug) { res.status(400).json({ error: "Missing gym identifier" }); return; }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.slug, gymSlug));
    if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }

    const [config] = await db.select().from(leadCaptureConfigTable).where(eq(leadCaptureConfigTable.gymId, gym.id));

    if (config && !config.isEnabled) {
      res.status(403).json({ error: "Lead capture is currently disabled for this gym" });
      return;
    }

    const { firstName, lastName, email, phone, notes, consentGiven } = req.body;
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: "firstName, lastName, and email are required" });
      return;
    }

    if (config?.phoneRequired && !phone) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    if (config?.showConsent && !consentGiven) {
      res.status(400).json({ error: "Consent is required" });
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
      await db.update(leadsTable)
        .set({ updatedAt: new Date() })
        .where(eq(leadsTable.id, duplicateForGym.id));

      await db.insert(leadActivitiesTable).values({
        leadId: duplicateForGym.id,
        gymId: gym.id,
        type: "form_resubmit",
        description: "Lead resubmitted via public form (duplicate detected)",
        metadata: JSON.stringify({ source: "lead_capture_form" }),
      });

      const msg = config?.successMessage || "Thank you! We already have your information and will be in touch.";
      res.status(200).json({ message: msg });
      return;
    }

    const sourceLabel = config?.sourceLabel || "website";
    const defaultStage = config?.defaultStage || "new";

    const [lead] = await db.insert(leadsTable).values({
      gymId: gym.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      source: sourceLabel,
      stage: defaultStage,
      assignedToId: config?.autoAssignStaffId || null,
    }).returning();

    await db.insert(leadActivitiesTable).values({
      leadId: lead.id,
      gymId: gym.id,
      type: "created",
      description: `Lead captured from website form: ${lead.firstName} ${lead.lastName}`,
      metadata: JSON.stringify({
        source: "lead_capture_form",
        campaignTag: config?.campaignTag || null,
      }),
    });

    const msg = config?.successMessage || "Thank you! We'll be in touch soon.";
    res.status(201).json({ message: msg });
  } catch (err: any) {
    console.error("[lead-capture] POST error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.get("/lead-capture/:gymSlug/info", async (req, res): Promise<void> => {
  try {
    const { gymSlug } = req.params;
    if (!gymSlug) { res.status(400).json({ error: "Missing gym identifier" }); return; }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.slug, gymSlug));
    if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }

    const [config] = await db.select().from(leadCaptureConfigTable).where(eq(leadCaptureConfigTable.gymId, gym.id));

    if (config && !config.isEnabled) {
      res.status(403).json({ error: "Lead capture is currently disabled for this gym" });
      return;
    }

    res.json({
      name: gym.name,
      description: gym.description,
      logoUrl: gym.logoUrl,
      phone: gym.phone,
      email: gym.email,
      address: gym.address,
      city: gym.city,
      state: gym.state,
      website: gym.website,
      formConfig: {
        headline: config?.headline || null,
        subheadline: config?.subheadline || null,
        ctaButtonText: config?.ctaButtonText || null,
        successMessage: config?.successMessage || null,
        disclaimerText: config?.disclaimerText || null,
        showPhone: config?.showPhone ?? true,
        showAddress: config?.showAddress ?? true,
        phoneRequired: config?.phoneRequired ?? false,
        showInterests: config?.showInterests ?? true,
        showConsent: config?.showConsent ?? false,
        consentText: config?.consentText || null,
      },
    });
  } catch (err: any) {
    console.error("[lead-capture] GET info error:", err.message);
    res.status(500).json({ error: "Failed to load form info" });
  }
});

export default router;
