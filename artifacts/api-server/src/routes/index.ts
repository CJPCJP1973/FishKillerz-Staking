import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sessionsRouter from "./sessions";
import sharesRouter from "./shares";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sessionsRouter);
router.use(sharesRouter);
router.use(usersRouter);

export default router;
