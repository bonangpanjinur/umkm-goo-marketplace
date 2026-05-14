import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import paymentsRouter from "./payments.js";
import notificationsRouter from "./notifications.js";
import aiDescriptionRouter from "./ai-description.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentsRouter);
router.use(notificationsRouter);
router.use(aiDescriptionRouter);

export default router;
