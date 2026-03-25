import { Router, type IRouter } from "express";
import daysRouter from "./days";
import sectionsRouter from "./sections";
import resultsRouter from "./results";

const router: IRouter = Router();

router.use(daysRouter);
router.use(sectionsRouter);
router.use(resultsRouter);

export default router;
