import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth/index.js";
import questionsRouter from "./questions/index.js";
import studentsRouter from "./students/index.js";
import testRouter from "./test/index.js";
import contentRouter from "./content/index.js";
import activityRouter from "./activity/index.js";
import analyticsRouter from "./analytics/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/questions', questionsRouter);
router.use('/students', studentsRouter);
router.use('/test', testRouter);
router.use('/content', contentRouter);
router.use('/activity', activityRouter);
router.use('/analytics', analyticsRouter);

export default router;
