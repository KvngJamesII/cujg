import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountRouter from "./account";
import dashboardRouter from "./dashboard";
import botsRouter from "./bots";
import billingRouter from "./billing";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import settingsRouter from "./settings";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/account", accountRouter);
router.use("/dashboard", dashboardRouter);
router.use("/bots", botsRouter);
router.use("/billing", billingRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
router.use("/settings", settingsRouter);
router.use("/debug", debugRouter);

export default router;
