import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import {
  db,
  gymOnboardingTable,
  gymsTable,
  membersTable,
} from "@workspace/db";

const router: IRouter = Router();

const STEPS = ["connect_data", "gym_details", "finish"] as const;
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
        .values({ gymId })
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

  return {
    stepStatus: {
      connect_data: connectDataComplete,
      gym_details: gymDetailsComplete,
      finish: false,
    },
    counts: {
      members: membersTotal,
    },
  };
}

router.get("/gyms/:gymId/onboarding", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const onboarding = await getOrCreateOnboarding(gymId);
  if (!onboarding) { res.status(500).json({ error: "Failed to initialize onboarding" }); return; }

  const { stepStatus, counts } = await computeStepStatus(gymId);

  res.json({
    ...onboarding,
    stepStatus,
    counts,
    steps: STEPS,
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
    [onboarding] = await db
      .update(gymOnboardingTable)
      .set({
        isComplete: true,
        completedAt: new Date(),
        currentStep: "finish",
      })
      .where(eq(gymOnboardingTable.gymId, gymId))
      .returning();
  } else {
    res.status(400).json({ error: "Invalid action. Must be: complete_step, skip_step, go_to_step, or finish" });
    return;
  }

  const { stepStatus, counts } = await computeStepStatus(gymId);

  res.json({
    ...onboarding,
    stepStatus,
    counts,
    steps: STEPS,
  });
});

function getNextStep(current: StepId): string {
  const idx = STEPS.indexOf(current);
  if (idx >= 0 && idx < STEPS.length - 1) return STEPS[idx + 1];
  return "finish";
}

export default router;
