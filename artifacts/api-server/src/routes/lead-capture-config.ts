import { Router, type IRouter } from "express";
import { eq, and, sql, gte, count } from "drizzle-orm";
import { db, leadCaptureConfigTable, leadsTable, gymsTable, leadActivitiesTable } from "@workspace/db";
import { requireGymAccess } from "../middlewares/requireGymAccess";

const router: IRouter = Router();

router.use("/gyms/:gymId", requireGymAccess);

router.get("/gyms/:gymId/lead-capture-config", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const [config] = await db.select().from(leadCaptureConfigTable).where(eq(leadCaptureConfigTable.gymId, gymId));

    if (!config) {
      const [gym] = await db.select({ slug: gymsTable.slug }).from(gymsTable).where(eq(gymsTable.id, gymId));
      res.json({
        gymId,
        isEnabled: true,
        headline: null,
        subheadline: null,
        ctaButtonText: null,
        successMessage: null,
        disclaimerText: null,
        showPhone: true,
        showAddress: true,
        phoneRequired: false,
        showInterests: true,
        showConsent: false,
        consentText: null,
        sourceLabel: "website",
        campaignTag: null,
        defaultStage: "new",
        autoAssignStaffId: null,
        slug: gym?.slug || null,
      });
      return;
    }

    const [gym] = await db.select({ slug: gymsTable.slug }).from(gymsTable).where(eq(gymsTable.id, gymId));
    res.json({ ...config, slug: gym?.slug || null });
  } catch (err: any) {
    console.error("[lead-capture-config] GET error:", err.message);
    res.status(500).json({ error: "Failed to load lead capture config" });
  }
});

router.put("/gyms/:gymId/lead-capture-config", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "gym_owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can manage lead capture settings" });
      return;
    }

    const {
      isEnabled, headline, subheadline, ctaButtonText, successMessage, disclaimerText,
      showPhone, showAddress, phoneRequired, showInterests, showConsent, consentText,
      sourceLabel, campaignTag, defaultStage, autoAssignStaffId
    } = req.body;

    const values = {
      gymId,
      isEnabled: isEnabled ?? true,
      headline: headline || null,
      subheadline: subheadline || null,
      ctaButtonText: ctaButtonText || null,
      successMessage: successMessage || null,
      disclaimerText: disclaimerText || null,
      showPhone: showPhone ?? true,
      showAddress: showAddress ?? true,
      phoneRequired: phoneRequired ?? false,
      showInterests: showInterests ?? true,
      showConsent: showConsent ?? false,
      consentText: consentText || null,
      sourceLabel: sourceLabel || "website",
      campaignTag: campaignTag || null,
      defaultStage: defaultStage || "new",
      autoAssignStaffId: autoAssignStaffId || null,
    };

    const [existing] = await db.select({ id: leadCaptureConfigTable.id })
      .from(leadCaptureConfigTable)
      .where(eq(leadCaptureConfigTable.gymId, gymId));

    let result;
    if (existing) {
      [result] = await db.update(leadCaptureConfigTable)
        .set(values)
        .where(eq(leadCaptureConfigTable.gymId, gymId))
        .returning();
    } else {
      [result] = await db.insert(leadCaptureConfigTable)
        .values(values)
        .returning();
    }

    const [gym] = await db.select({ slug: gymsTable.slug }).from(gymsTable).where(eq(gymsTable.id, gymId));
    res.json({ ...result, slug: gym?.slug || null });
  } catch (err: any) {
    console.error("[lead-capture-config] PUT error:", err.message);
    res.status(500).json({ error: "Failed to save lead capture config" });
  }
});

router.get("/gyms/:gymId/lead-capture-analytics", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);

    const [config] = await db.select().from(leadCaptureConfigTable).where(eq(leadCaptureConfigTable.gymId, gymId));
    const sourceLabel = config?.sourceLabel || "website";

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalResult] = await db.select({ count: count() }).from(leadsTable)
      .where(and(eq(leadsTable.gymId, gymId), eq(leadsTable.source, sourceLabel)));

    const [last7Result] = await db.select({ count: count() }).from(leadsTable)
      .where(and(
        eq(leadsTable.gymId, gymId),
        eq(leadsTable.source, sourceLabel),
        gte(leadsTable.createdAt, sevenDaysAgo)
      ));

    const [last30Result] = await db.select({ count: count() }).from(leadsTable)
      .where(and(
        eq(leadsTable.gymId, gymId),
        eq(leadsTable.source, sourceLabel),
        gte(leadsTable.createdAt, thirtyDaysAgo)
      ));

    const [convertedResult] = await db.select({ count: count() }).from(leadsTable)
      .where(and(
        eq(leadsTable.gymId, gymId),
        eq(leadsTable.source, sourceLabel),
        sql`${leadsTable.convertedAt} IS NOT NULL`
      ));

    const recentLeads = await db.select({
      id: leadsTable.id,
      firstName: leadsTable.firstName,
      lastName: leadsTable.lastName,
      email: leadsTable.email,
      stage: leadsTable.stage,
      createdAt: leadsTable.createdAt,
    }).from(leadsTable)
      .where(and(eq(leadsTable.gymId, gymId), eq(leadsTable.source, sourceLabel)))
      .orderBy(sql`${leadsTable.createdAt} DESC`)
      .limit(10);

    res.json({
      total: Number(totalResult.count),
      last7Days: Number(last7Result.count),
      last30Days: Number(last30Result.count),
      converted: Number(convertedResult.count),
      recentLeads,
    });
  } catch (err: any) {
    console.error("[lead-capture-analytics] error:", err.message);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
