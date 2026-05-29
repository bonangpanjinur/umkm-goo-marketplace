import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import paymentsRouter from "./payments.js";
import notificationsRouter from "./notifications.js";
import aiDescriptionRouter from "./ai-description.js";
import staffRouter from "./staff.js";
import printerRouter from "./printer.js";
import rajaongkirRouter from "./rajaongkir.js";
import sseRouter from "./sse.js";
import webhooksRouter from "./webhooks.js";
import adminToolsRouter from "./admin-tools.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentsRouter);
router.use(notificationsRouter);
router.use(aiDescriptionRouter);
router.use(staffRouter);
router.use(printerRouter);
router.use(rajaongkirRouter);
// F5-1 · F5-2 · F5-3 — SSE Realtime relay
router.use(sseRouter);
// F6-3 — Outgoing Webhooks
router.use(webhooksRouter);
// F9 — Admin Platform Tools (auto-cancel, GDPR, churn, commission)
router.use(adminToolsRouter);

export default router;
