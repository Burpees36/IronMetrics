/**
 * @module routes
 * API route hierarchy with layered middleware.
 *
 * Routes are organized in three tiers:
 *
 *   1. **Public routes** (no auth required):
 *      - Health check (`/api/health`)
 *      - Auth endpoints (`/api/login`, `/api/callback`, `/api/logout`)
 *
 *   2. **Authenticated routes** (require valid session via `requireAuth`):
 *      - Gym management (`/api/gyms`) — list/create gyms the user owns or has access to
 *
 *   3. **Gym-scoped routes** (require auth + gym membership via `requireGymAccess`):
 *      - All remaining routes are mounted under `/gyms/:gymId/...`
 *      - `requireGymAccess` resolves the user's role (owner, admin, coach, etc.)
 *        and attaches it to the request before these handlers execute.
 *
 * This layering ensures that gym-scoped routes never execute without a
 * verified gym role, while auth and health routes remain accessible.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireGymAccess } from "../middlewares/requireGymAccess";
import { requireTierAccess } from "../middlewares/requireTierAccess";
import healthRouter from "./health";
import storageRouter from "./storage";
import authRouter from "./auth";
import gymsRouter from "./gyms";
import membersRouter from "./members";
import leadsRouter from "./leads";
import staffRouter from "./staff";
import classesRouter from "./classes";
import classTemplatesRouter from "./class-templates";
import attendanceRouter from "./attendance";
import billingRouter from "./billing";
import billingRecoveryRouter from "./billing-recovery";
import retailRouter from "./retail";
import workoutsRouter from "./workouts";
import programmingRouter from "./programming";
import communicationsRouter from "./communications";
import documentsRouter from "./documents";
import intelligenceRouter from "./intelligence";
import aiRouter from "./ai";
import reportsRouter from "./reports";
import recommendationsRouter from "./recommendations";
import knowledgeRouter from "./knowledge";
import onboardingRouter from "./onboarding";
import leadCaptureConfigRouter from "./lead-capture-config";
import retentionRouter from "./retention";
import leadSequencesRouter from "./lead-sequences";
import platformBillingRouter from "./platform-billing";
import adminRouter from "./admin";
import wodifyRouter from "./integrations/wodify";
import financesRouter from "./finances";
import appointmentsRouter from "./appointments";

const router: IRouter = Router();

// --- Tier 1: Public routes (no authentication required) ---
router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);

// --- Tier 2: Authenticated routes (valid session required) ---
router.use(requireAuth);
router.use(gymsRouter);

// --- Admin routes (platform owner only, protected by secret header) ---
router.use(adminRouter);

// --- Tier 3: Gym-scoped routes (auth + gym role required) ---
router.use("/gyms/:gymId", requireGymAccess);

// Platform billing — available to all authenticated gym members (needed to subscribe/upgrade)
router.use(platformBillingRouter);

// Onboarding and lead-capture-config are ungated (needed for initial setup before subscribing)
router.use(onboardingRouter);
router.use(leadCaptureConfigRouter);

// Wodify integration — available to all authenticated gym members (needed for initial data import)
router.use(wodifyRouter);

// Insights-tier access gates — block zero-subscription gyms from paid features.
// These must come before the corresponding routers.
router.use("/gyms/:gymId/finances", requireTierAccess("billing"));
router.use("/gyms/:gymId/billing", requireTierAccess("billing"));
router.use("/gyms/:gymId/plans", requireTierAccess("billing"));
router.use("/gyms/:gymId/subscriptions", requireTierAccess("billing"));
router.use("/gyms/:gymId/billing-recovery", requireTierAccess("billing"));
router.use("/gyms/:gymId/products", requireTierAccess("retail"));
router.use("/gyms/:gymId/sales", requireTierAccess("retail"));
router.use("/gyms/:gymId/intelligence", requireTierAccess("intelligence"));
router.use("/gyms/:gymId/ai", requireTierAccess("ai"));
router.use("/gyms/:gymId/reports", requireTierAccess("reports"));
router.use("/gyms/:gymId/documents", requireTierAccess("documents"));
router.use("/gyms/:gymId/recommendations", requireTierAccess("recommendations"));
router.use("/gyms/:gymId/retention", requireTierAccess("retention"));
router.use("/gyms/:gymId/announcements", requireTierAccess("communications"));
router.use("/gyms/:gymId/stripe", requireTierAccess("billing"));

// Insights-tier routers
router.use(financesRouter);
router.use(billingRouter);
router.use(billingRecoveryRouter);
router.use(retailRouter);
router.use(intelligenceRouter);
router.use(aiRouter);
router.use(reportsRouter);
router.use(documentsRouter);
router.use(recommendationsRouter);
router.use(knowledgeRouter);
router.use(retentionRouter);
router.use(communicationsRouter);

// Growth-tier access gates — must come before the routers that handle those paths
router.use("/gyms/:gymId/members", requireTierAccess("members"));
router.use("/gyms/:gymId/leads", requireTierAccess("leads"));
router.use("/gyms/:gymId/lead-sequences", requireTierAccess("leads"));
router.use("/gyms/:gymId/classes", requireTierAccess("schedule"));
router.use("/gyms/:gymId/appointment-types", requireTierAccess("schedule"));
router.use("/gyms/:gymId/coach-availability", requireTierAccess("schedule"));
router.use("/gyms/:gymId/appointments", requireTierAccess("schedule"));
router.use("/gyms/:gymId/attendance", requireTierAccess("attendance"));
router.use("/gyms/:gymId/workouts", requireTierAccess("workouts"));
router.use("/gyms/:gymId/programming", requireTierAccess("programming"));
router.use("/gyms/:gymId/staff", requireTierAccess("staff"));

// Pro-tier access gates — must come before the corresponding routers
router.use("/gyms/:gymId/class-templates", requireTierAccess("class-templates"));

// Growth-tier routers
router.use(membersRouter);
router.use(leadsRouter);
router.use(leadSequencesRouter);
router.use(staffRouter);
router.use(classesRouter);
router.use(classTemplatesRouter);
router.use(attendanceRouter);
router.use(appointmentsRouter);
router.use(workoutsRouter);
router.use(programmingRouter);

export default router;
