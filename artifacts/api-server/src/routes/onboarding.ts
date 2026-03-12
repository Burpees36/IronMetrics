import { Router, type IRouter } from "express";
import { eq, and, count, gte } from "drizzle-orm";
import {
  db,
  gymOnboardingTable,
  gymsTable,
  gymStaffTable,
  membersTable,
  membershipPlansTable,
  classesTable,
} from "@workspace/db";

const router: IRouter = Router();

const STEPS = ["basics", "plans", "staff", "members", "schedule", "finish"] as const;
type StepId = (typeof STEPS)[number];
const VALID_STEPS = new Set<string>(STEPS);

function parseGymId(params: any): number | null {
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

  const basicsComplete = !!(gym && gym.name && gym.timezone && (gym.email || gym.phone));

  const plans = await db
    .select({ count: count() })
    .from(membershipPlansTable)
    .where(and(eq(membershipPlansTable.gymId, gymId), eq(membershipPlansTable.isActive, true)));
  const plansComplete = (plans[0]?.count ?? 0) > 0;

  const staffCount = await db
    .select({ count: count() })
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.isActive, true)));
  const staffComplete = (staffCount[0]?.count ?? 0) > 1;

  const memberCount = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const membersComplete = (memberCount[0]?.count ?? 0) > 0;

  const now = new Date();
  const upcomingClasses = await db
    .select({ count: count() })
    .from(classesTable)
    .where(and(eq(classesTable.gymId, gymId), gte(classesTable.startTime, now)));
  const scheduleComplete = (upcomingClasses[0]?.count ?? 0) > 0;

  return {
    stepStatus: {
      basics: basicsComplete,
      plans: plansComplete,
      staff: staffComplete,
      members: membersComplete,
      schedule: scheduleComplete,
      finish: false,
    },
    counts: {
      plans: plans[0]?.count ?? 0,
      staff: staffCount[0]?.count ?? 0,
      members: memberCount[0]?.count ?? 0,
      upcomingClasses: upcomingClasses[0]?.count ?? 0,
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
