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
import healthRouter from "./health";
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

const router: IRouter = Router();

// --- Tier 1: Public routes (no authentication required) ---
router.use(healthRouter);
router.use(authRouter);

// --- Tier 2: Authenticated routes (valid session required) ---
router.use(requireAuth);
router.use(gymsRouter);

// --- Tier 3: Gym-scoped routes (auth + gym role required) ---
router.use("/gyms/:gymId", requireGymAccess);

router.use(membersRouter);
router.use(leadsRouter);
router.use(staffRouter);
router.use(classesRouter);
router.use(classTemplatesRouter);
router.use(attendanceRouter);
router.use(billingRouter);
router.use(billingRecoveryRouter);
router.use(retailRouter);
router.use(workoutsRouter);
router.use(programmingRouter);
router.use(communicationsRouter);
router.use(reportsRouter);
router.use(documentsRouter);
router.use(intelligenceRouter);
router.use(aiRouter);
router.use(recommendationsRouter);
router.use(knowledgeRouter);
router.use(onboardingRouter);
router.use(leadCaptureConfigRouter);
router.use(retentionRouter);

export default router;
