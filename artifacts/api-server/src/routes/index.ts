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
import attendanceRouter from "./attendance";
import billingRouter from "./billing";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.use(requireAuth);
router.use(gymsRouter);

router.use("/gyms/:gymId", requireGymAccess);

router.use(membersRouter);
router.use(leadsRouter);
router.use(staffRouter);
router.use(classesRouter);
router.use(attendanceRouter);
router.use(billingRouter);
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

export default router;
