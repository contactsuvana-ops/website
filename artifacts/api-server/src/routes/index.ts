import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import quoteRouter from "./quote";
import submissionsRouter from "./submissions";
import commentsRouter from "./comments";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);
router.use(quoteRouter);
router.use(submissionsRouter);
router.use(commentsRouter);
router.use("/admin", adminRouter);

export default router;
