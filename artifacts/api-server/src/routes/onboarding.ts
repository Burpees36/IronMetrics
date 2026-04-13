import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import {
  db,
  gymOnboardingTable,
  gymsTable,
  membersTable,
  leadSequencesTable,
  leadSequenceStepsTable,
  retentionSequencesTable,
  retentionSequenceStepsTable,
} from "@workspace/db";
import { DEFAULT_LEAD_SEQUENCES } from "../services/lead-sequence-defaults";
import { DEFAULT_SEQUENCES as DEFAULT_RETENTION_SEQUENCES } from "./retention";

const router: IRouter = Router();

const STEPS = ["gym_details", "connect_data", "email_branding", "finish"] as const;
type StepId = (typeof STEPS)[number];
const VALID_STEPS = new Set<string>(STEPS);

function parseGymId(params: Record<string, string | string[]>): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function isValidStep(step: string | undefined): step is StepId {
  return !!step && VALID_STEPS.has(step);
}

async function getOrCreateOnboarding(gymId: number) {
  let [onboarding] = await db
    .select()
    .from(gymOnboardingTable)
    .where(eq(gymOnboardingTable.gymId, gymId));

  if (!onboarding) {
    try {
      [onboarding] = await db
        .insert(gymOnboardingTable)
        .values({ gymId, currentStep: "gym_details" })
        .onConflictDoNothing()
        .returning();
    } catch (_) {}

    if (!onboarding) {
      [onboarding] = await db
        .select()
        .from(gymOnboardingTable)
        .where(eq(gymOnboardingTable.gymId, gymId));
    }
  }

  return onboarding;
}

async function computeStepStatus(gymId: number) {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));

  const memberCount = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const membersTotal = Number(memberCount[0]?.count ?? 0);
  const connectDataComplete = membersTotal > 0;

  const gymDetailsComplete = !!(gym && gym.name && gym.timezone);

  const connectBillingComplete = !!(gym && (
    gym.isBetaAccess ||
    (gym.subscriptionTier !== "none" && gym.platformSubscriptionId)
  ));

  const emailBrandingComplete = !!(gym && gym.fromEmail);

  return {
    stepStatus: {
      gym_details: gymDetailsComplete,
      connect_billing: connectBillingComplete,
      connect_data: connectDataComplete,
      email_branding: emailBrandingComplete,
      finish: false,
    },
    counts: {
      members: membersTotal,
    },
    gymName: gym?.name || "",
    gymTimezone: gym?.timezone || "",
  };
}

router.get("/gyms/:gymId/onboarding", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const onboarding = await getOrCreateOnboarding(gymId);
  if (!onboarding) { res.status(500).json({ error: "Failed to initialize onboarding" }); return; }

  const { stepStatus, counts, gymName, gymTimezone } = await computeStepStatus(gymId);

  const [gymRow] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));

  res.json({
    ...onboarding,
    stepStatus,
    counts,
    steps: STEPS,
    gymName,
    gymTimezone,
    subscriptionTier: gymRow?.subscriptionTier ?? "none",
    isBetaAccess: gymRow?.isBetaAccess ?? false,
  });
});

router.patch("/gyms/:gymId/onboarding", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { action, step } = req.body as { action: string; step?: string };

  if (!action || typeof action !== "string") {
    res.status(400).json({ error: "action is required" });
    return;
  }

  if (action !== "finish" && !isValidStep(step)) {
    res.status(400).json({ error: `Invalid step. Must be one of: ${STEPS.join(", ")}` });
    return;
  }

  let onboarding = await getOrCreateOnboarding(gymId);
  if (!onboarding) { res.status(500).json({ error: "Failed to initialize onboarding" }); return; }

  if (action === "complete_step") {
    const completed = new Set(onboarding.completedSteps);
    completed.add(step!);
    [onboarding] = await db
      .update(gymOnboardingTable)
      .set({
        completedSteps: Array.from(completed),
        currentStep: getNextStep(step as StepId),
      })
      .where(eq(gymOnboardingTable.gymId, gymId))
      .returning();
  } else if (action === "skip_step") {
    const skipped = new Set(onboarding.skippedSteps);
    skipped.add(step!);
    [onboarding] = await db
      .update(gymOnboardingTable)
      .set({
        skippedSteps: Array.from(skipped),
        currentStep: getNextStep(step as StepId),
      })
      .where(eq(gymOnboardingTable.gymId, gymId))
      .returning();
  } else if (action === "go_to_step") {
    [onboarding] = await db
      .update(gymOnboardingTable)
      .set({ currentStep: step! })
      .where(eq(gymOnboardingTable.gymId, gymId))
      .returning();
  } else if (action === "finish") {
    const { stepStatus, gymName, gymTimezone } = await computeStepStatus(gymId);
    if (!gymName || !gymName.trim() || !gymTimezone || !gymTimezone.trim()) {
      res.status(400).json({ error: "Gym name and timezone are required before finishing onboarding." });
      return;
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (gym && gym.subscriptionTier === "none" && !gym.isBetaAccess) {
      res.status(400).json({ error: "Please select a plan before finishing onboarding." });
      return;
    }

    [onboarding] = await db
      .update(gymOnboardingTable)
      .set({
        isComplete: true,
        completedAt: new Date(),
        currentStep: "finish",
      })
      .where(eq(gymOnboardingTable.gymId, gymId))
      .returning();

    try {
      await seedDefaultSequences(gymId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[onboarding] Auto-seed sequences error:", message);
    }
  } else {
    res.status(400).json({ error: "Invalid action. Must be: complete_step, skip_step, go_to_step, or finish" });
    return;
  }

  const { stepStatus, counts, gymName, gymTimezone } = await computeStepStatus(gymId);

  res.json({
    ...onboarding,
    stepStatus,
    counts,
    steps: STEPS,
    gymName,
    gymTimezone,
  });
});

function getNextStep(current: StepId): string {
  const idx = STEPS.indexOf(current);
  if (idx >= 0 && idx < STEPS.length - 1) return STEPS[idx + 1];
  return "finish";
}

async function seedDefaultSequences(gymId: number): Promise<void> {
  const existingLead = await db.select({ id: leadSequencesTable.id, type: leadSequencesTable.type })
    .from(leadSequencesTable)
    .where(eq(leadSequencesTable.gymId, gymId));
  const existingLeadTypes = new Set(existingLead.map(s => s.type));

  for (const def of DEFAULT_LEAD_SEQUENCES) {
    if (existingLeadTypes.has(def.type)) continue;
    const [seq] = await db.insert(leadSequencesTable).values({
      gymId,
      name: def.name,
      description: def.description,
      type: def.type,
      isEnabled: false,
      triggerStage: def.triggerStage,
    }).returning();

    for (const step of def.steps) {
      await db.insert(leadSequenceStepsTable).values({
        sequenceId: seq.id,
        stepOrder: step.stepOrder,
        channel: step.channel,
        delayMinutes: step.delayMinutes,
        subject: step.subject,
        messageContent: step.messageContent,
      });
    }
  }

  const existingRetention = await db.select({ id: retentionSequencesTable.id, type: retentionSequencesTable.type })
    .from(retentionSequencesTable)
    .where(eq(retentionSequencesTable.gymId, gymId));
  const existingRetentionTypes = new Set(existingRetention.map(s => s.type));

  for (const def of DEFAULT_RETENTION_SEQUENCES) {
    if (existingRetentionTypes.has(def.type)) continue;
    const [seq] = await db.insert(retentionSequencesTable).values({
      gymId,
      name: def.name,
      description: def.description,
      type: def.type,
      isEnabled: false,
      triggerConfig: def.triggerConfig,
      cooldownDays: def.cooldownDays,
    }).returning();

    for (const step of def.steps) {
      await db.insert(retentionSequenceStepsTable).values({
        sequenceId: seq.id,
        stepOrder: step.stepOrder,
        actionType: step.actionType,
        delayDays: step.delayDays,
        config: step.config,
      });
    }
  }

  console.log(`[onboarding] Auto-seeded default sequences for gym ${gymId}`);
}

export default router;
