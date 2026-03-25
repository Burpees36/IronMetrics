import { Router, type IRouter } from "express";
import plansRouter from "./plans";
import subscriptionsRouter from "./subscriptions";
import paymentsRouter from "./payments";
import reportingRouter from "./reporting";
import discountsTaxRouter from "./discounts-tax";
import holdsRouter from "./holds";

const router: IRouter = Router();

router.use(plansRouter);
router.use(subscriptionsRouter);
router.use(paymentsRouter);
router.use(reportingRouter);
router.use(discountsTaxRouter);
router.use(holdsRouter);

export default router;
