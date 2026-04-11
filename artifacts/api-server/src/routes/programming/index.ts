import { Router, type IRouter } from "express";
import daysRouter from "./days";
import sectionsRouter from "./sections";
import resultsRouter from "./results";
import preferencesRouter from "./preferences";
import generateRouter from "./generate";

const router: IRouter = Router();

router.use(preferencesRouter);
router.use(generateRouter);
router.use(daysRouter);
router.use(sectionsRouter);
router.use(resultsRouter);

export default router;
