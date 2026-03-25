import { Router, type IRouter } from "express";
import crudRouter from "./crud";
import notesRouter from "./notes";
import importRouter from "./import";
import importWodifyRouter from "./import-wodify";
import billingLinkingRouter from "./billing-linking";
import syncRunsRouter from "./sync-runs";

const router: IRouter = Router();

router.use(crudRouter);
router.use(notesRouter);
router.use(importRouter);
router.use(importWodifyRouter);
router.use(billingLinkingRouter);
router.use(syncRunsRouter);

export default router;

export { normalizePhone, isValidCalendarDate, parseImportDate, sanitizeRow, validateRow } from "./import-utils";
