import { Router, type IRouter } from "express";
import { eq, and, lte } from "drizzle-orm";
import { db, programmingPreferencesTable, programmingDaysTable, programmingSectionsTable } from "@workspace/db";
import { requireProgrammingWrite } from "../../middlewares/programmingRbac";
import { parseGymId } from "./helpers";
import { generateDay, generateWeek } from "../../services/programmingAI";
import { ProgrammingValidationError } from "../../services/programmingValidation";

const router: IRouter = Router();

type SectionType = "warmup" | "strength" | "conditioning" | "skill" | "cooldown" | "wod" | "accessory" | "custom";

const VALID_SECTION_TYPES: Set<string> = new Set([
  "warmup", "strength", "conditioning", "skill", "cooldown", "wod", "accessory", "custom"
]);

interface EffectivePrefs {
  methodology: string;
  structureTemplate: string[];
  equipment: string[];
  constraints: string | null;
  defaultTimeDomains: Record<string, string>;
}

function getDefaultPrefs(): EffectivePrefs {
  return {
    methodology: "crossfit",
    structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
    equipment: [],
    constraints: null,
    defaultTimeDomains: {
      warmup: "10-15 min",
      strength: "15-20 min",
      conditioning: "8-20 min",
      cooldown: "5-10 min",
    },
  };
}

function sanitizeSectionType(type: unknown): SectionType {
  if (typeof type === "string" && VALID_SECTION_TYPES.has(type)) {
    return type as SectionType;
  }
  return "custom";
}

function loadPrefs(prefs: typeof programmingPreferencesTable.$inferSelect | undefined): EffectivePrefs {
  if (!prefs) return getDefaultPrefs();
  return {
    methodology: prefs.methodology,
    structureTemplate: Array.isArray(prefs.structureTemplate) ? (prefs.structureTemplate as string[]) : getDefaultPrefs().structureTemplate,
    equipment: prefs.equipment,
    constraints: prefs.constraints,
    defaultTimeDomains: (prefs.defaultTimeDomains && typeof prefs.defaultTimeDomains === "object" && !Array.isArray(prefs.defaultTimeDomains))
      ? (prefs.defaultTimeDomains as Record<string, string>)
      : getDefaultPrefs().defaultTimeDomains,
  };
}

interface GeneratedSection {
  sectionType: unknown;
  title: unknown;
  instructions?: string | null;
  duration?: string | null;
  timeCap?: string | null;
  intendedStimulus?: string | null;
  movements?: unknown;
  scalingNotes?: string | null;
  coachNotes?: string | null;
  memberNotes?: string | null;
  resultTrackingEnabled?: unknown;
}

function buildSectionValues(dayId: number, sections: GeneratedSection[]) {
  return sections.map((s, idx) => ({
    dayId,
    orderIndex: idx,
    sectionType: sanitizeSectionType(s.sectionType),
    title: (typeof s.title === "string" && s.title) ? s.title : "Untitled Section",
    instructions: (typeof s.instructions === "string") ? s.instructions : null,
    duration: (typeof s.duration === "string") ? s.duration : null,
    timeCap: (typeof s.timeCap === "string") ? s.timeCap : null,
    intendedStimulus: (typeof s.intendedStimulus === "string") ? s.intendedStimulus : null,
    movements: Array.isArray(s.movements) ? s.movements.filter((m): m is string => typeof m === "string") : [],
    scalingNotes: (typeof s.scalingNotes === "string") ? s.scalingNotes : null,
    coachNotes: (typeof s.coachNotes === "string") ? s.coachNotes : null,
    memberNotes: (typeof s.memberNotes === "string") ? s.memberNotes : null,
    resultTrackingEnabled: s.resultTrackingEnabled === true,
  }));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.post(
  "/gyms/:gymId/programming/generate-day",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const { date, overwrite } = req.body;
    if (!date || typeof date !== "string" || !DATE_RE.test(date)) {
      res.status(400).json({ error: "date is required in YYYY-MM-DD format" });
      return;
    }

    try {
      const [existing] = await db
        .select()
        .from(programmingDaysTable)
        .where(
          and(
            eq(programmingDaysTable.gymId, gymId),
            eq(programmingDaysTable.date, date)
          )
        );

      if (existing && overwrite !== true) {
        res.status(409).json({ error: "Programming already exists for this date. Set overwrite: true to regenerate." });
        return;
      }

      if (existing) {
        await db.delete(programmingSectionsTable).where(eq(programmingSectionsTable.dayId, existing.id));
        await db.delete(programmingDaysTable).where(eq(programmingDaysTable.id, existing.id));
      }

      const [prefs] = await db
        .select()
        .from(programmingPreferencesTable)
        .where(eq(programmingPreferencesTable.gymId, gymId));

      const effectivePrefs = loadPrefs(prefs);
      const generated = await generateDay(gymId, date, effectivePrefs);

      const userId = req.user?.id || null;
      const [day] = await db
        .insert(programmingDaysTable)
        .values({
          gymId,
          date: (typeof generated.date === "string" && DATE_RE.test(generated.date)) ? generated.date : date,
          title: (typeof generated.title === "string" && generated.title) ? generated.title : `Workout – ${date}`,
          status: "draft",
          publicNotes: generated.publicNotes || null,
          coachNotes: generated.coachNotes || null,
          track: "default",
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      const validSections: GeneratedSection[] = Array.isArray(generated.sections) ? generated.sections : [];
      if (validSections.length > 0) {
        await db.insert(programmingSectionsTable).values(buildSectionValues(day.id, validSections));
      }

      const sections = await db
        .select()
        .from(programmingSectionsTable)
        .where(eq(programmingSectionsTable.dayId, day.id));

      res.status(201).json({ ...day, sections });
    } catch (error: unknown) {
      if (error instanceof ProgrammingValidationError) {
        console.error("AI generation validation error:", error.message, error.violations);
        res.status(422).json({
          error: "AI-generated programming failed validation after multiple attempts.",
          violations: error.violations,
        });
        return;
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("AI generation error:", msg);
      res.status(500).json({ error: "Failed to generate programming. Please try again." });
    }
  }
);

router.post(
  "/gyms/:gymId/programming/generate-week",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const { startDate } = req.body;
    if (!startDate || typeof startDate !== "string" || !DATE_RE.test(startDate)) {
      res.status(400).json({ error: "startDate is required in YYYY-MM-DD format" });
      return;
    }

    try {
      const [prefs] = await db
        .select()
        .from(programmingPreferencesTable)
        .where(eq(programmingPreferencesTable.gymId, gymId));

      const effectivePrefs = loadPrefs(prefs);
      const { generatedDays, skippedDates } = await generateWeek(gymId, startDate, effectivePrefs);

      if (generatedDays.length === 0) {
        res.status(200).json({ days: [], generated: 0, skipped: skippedDates.length });
        return;
      }

      const userId = req.user?.id || null;
      const results = [];

      for (const generated of generatedDays) {
        try {
          const dayDate = (typeof generated.date === "string" && DATE_RE.test(generated.date)) ? generated.date : null;
          if (!dayDate) continue;

          if (!Array.isArray(generated.sections) || generated.sections.length === 0) continue;

          const [day] = await db
            .insert(programmingDaysTable)
            .values({
              gymId,
              date: dayDate,
              title: (typeof generated.title === "string" && generated.title) ? generated.title : `Workout – ${dayDate}`,
              status: "draft",
              publicNotes: generated.publicNotes || null,
              coachNotes: generated.coachNotes || null,
              track: "default",
              createdBy: userId,
              updatedBy: userId,
            })
            .returning();

          const validSections: GeneratedSection[] = Array.isArray(generated.sections) ? generated.sections : [];
          if (validSections.length > 0) {
            await db.insert(programmingSectionsTable).values(buildSectionValues(day.id, validSections));
          }

          const sections = await db
            .select()
            .from(programmingSectionsTable)
            .where(eq(programmingSectionsTable.dayId, day.id));

          results.push({ ...day, sections });
        } catch (dayError) {
          console.error(`Failed to save generated day ${generated.date}:`, dayError instanceof Error ? dayError.message : dayError);
        }
      }

      res.status(201).json({ days: results, generated: results.length, skipped: skippedDates.length });
    } catch (error: unknown) {
      if (error instanceof ProgrammingValidationError) {
        console.error("AI week generation validation error:", error.message, error.violations);
        res.status(422).json({
          error: "AI-generated programming failed validation after multiple attempts.",
          violations: error.violations,
        });
        return;
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("AI week generation error:", msg);
      const isUserFacing = msg.includes("truncated") || msg.includes("invalid JSON") || msg.includes("valid sections") || msg.includes("'days' array");
      res.status(500).json({ error: isUserFacing ? msg : "Failed to generate week programming. Please try again." });
    }
  }
);

router.post(
  "/gyms/:gymId/programming/auto-publish",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    try {
      const [prefs] = await db
        .select()
        .from(programmingPreferencesTable)
        .where(eq(programmingPreferencesTable.gymId, gymId));

      if (!prefs || !prefs.autoPublishEnabled) {
        res.json({ published: 0, message: "Auto-publish is not enabled" });
        return;
      }

      const result = await runAutoPublishForGym(gymId, prefs.autoPublishLeadDays || 1);
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Auto-publish error:", msg);
      res.status(500).json({ error: "Failed to auto-publish" });
    }
  }
);

export async function runAutoPublishForGym(gymId: number, leadDays: number): Promise<{ published: number; targetDate: string }> {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + leadDays);
  const targetDateStr = targetDate.toISOString().split("T")[0]!;

  const draftDays = await db
    .select()
    .from(programmingDaysTable)
    .where(
      and(
        eq(programmingDaysTable.gymId, gymId),
        lte(programmingDaysTable.date, targetDateStr),
        eq(programmingDaysTable.status, "draft")
      )
    );

  let published = 0;
  for (const day of draftDays) {
    await db
      .update(programmingDaysTable)
      .set({ status: "published" })
      .where(eq(programmingDaysTable.id, day.id));
    published++;
  }

  return { published, targetDate: targetDateStr };
}

export default router;
