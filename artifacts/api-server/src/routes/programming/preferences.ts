import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, programmingPreferencesTable } from "@workspace/db";
import { requireProgrammingWrite } from "../../middlewares/programmingRbac";
import { parseGymId } from "./helpers";

const router: IRouter = Router();

router.get(
  "/gyms/:gymId/programming/preferences",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const [prefs] = await db
      .select()
      .from(programmingPreferencesTable)
      .where(eq(programmingPreferencesTable.gymId, gymId));

    if (!prefs) {
      res.json({
        gymId,
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
        autoPublishEnabled: false,
        autoPublishTime: "20:00",
        autoPublishLeadDays: 1,
      });
      return;
    }

    res.json(prefs);
  }
);

router.put(
  "/gyms/:gymId/programming/preferences",
  requireProgrammingWrite(),
  async (req, res): Promise<void> => {
    const gymId = parseGymId(req.params);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const {
      methodology,
      structureTemplate,
      equipment,
      constraints,
      defaultTimeDomains,
      autoPublishEnabled,
      autoPublishTime,
      autoPublishLeadDays,
    } = req.body;

    const [existing] = await db
      .select()
      .from(programmingPreferencesTable)
      .where(eq(programmingPreferencesTable.gymId, gymId));

    if (existing) {
      const updates: Record<string, any> = {};
      if (methodology !== undefined) updates.methodology = methodology;
      if (structureTemplate !== undefined) updates.structureTemplate = structureTemplate;
      if (equipment !== undefined) updates.equipment = equipment;
      if (constraints !== undefined) updates.constraints = constraints;
      if (defaultTimeDomains !== undefined) updates.defaultTimeDomains = defaultTimeDomains;
      if (autoPublishEnabled !== undefined) updates.autoPublishEnabled = autoPublishEnabled;
      if (autoPublishTime !== undefined) updates.autoPublishTime = autoPublishTime;
      if (autoPublishLeadDays !== undefined) updates.autoPublishLeadDays = autoPublishLeadDays;

      const [updated] = await db
        .update(programmingPreferencesTable)
        .set(updates)
        .where(eq(programmingPreferencesTable.gymId, gymId))
        .returning();

      res.json(updated);
    } else {
      const [created] = await db
        .insert(programmingPreferencesTable)
        .values({
          gymId,
          methodology: methodology ?? "crossfit",
          structureTemplate: structureTemplate ?? ["warmup", "strength", "conditioning", "cooldown"],
          equipment: equipment ?? [],
          constraints: constraints ?? null,
          defaultTimeDomains: defaultTimeDomains ?? {
            warmup: "10-15 min",
            strength: "15-20 min",
            conditioning: "8-20 min",
            cooldown: "5-10 min",
          },
          autoPublishEnabled: autoPublishEnabled ?? false,
          autoPublishTime: autoPublishTime ?? "20:00",
          autoPublishLeadDays: autoPublishLeadDays ?? 1,
        })
        .returning();

      res.status(201).json(created);
    }
  }
);

export default router;
