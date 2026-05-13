import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth/index.js";
import questionsRouter from "./questions/index.js";
import studentsRouter from "./students/index.js";
import testRouter from "./test/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/questions', questionsRouter);
router.use('/students', studentsRouter);
router.use('/test', testRouter);

export default router;
