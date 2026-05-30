import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/auth";

import healthRouter from "./health";
import contactRouter from "./contact";
import quoteRouter from "./quote";
import submissionsRouter from "./submissions";
import commentsRouter from "./comments";
import adminRouter from "./admin";
import discussionsRouter from "./discussions";
import projectsRouter from "./projects";
import caseStudiesRouter from "./caseStudies";
import mediaRouter from "./media";
import { servicesPublicRouter, servicesAdminRouter } from "./services";
import { qrScansPublicRouter, qrScansAdminRouter } from "./qrScans";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(contactRouter);
router.use(quoteRouter);
router.use("/qr-scan", qrScansPublicRouter);
router.use("/services", servicesPublicRouter);

// Case studies: public reads + admin writes handled inside the router
// (requireAdmin applied per-route inside caseStudies.ts)
router.use(caseStudiesRouter);

// Media: public download proxy + admin upload/delete inside the router
// (requireAdmin applied per-route inside media.ts)
router.use(mediaRouter);

// Admin auth — no auth middleware here, this IS the login endpoint
router.use("/admin", adminRouter);

// Protected admin: submissions + inline comments
// Served at both /admin/submissions (new) and /submissions (legacy API client paths)
router.use("/admin/submissions", requireAdmin, submissionsRouter);
router.use("/admin/submissions", requireAdmin, commentsRouter);
router.use("/submissions", requireAdmin, submissionsRouter);
router.use("/submissions", requireAdmin, commentsRouter);

// Protected admin: discussions
router.use("/admin/discussions", requireAdmin, discussionsRouter);

// Protected admin: projects
router.use("/admin/projects", requireAdmin, projectsRouter);

// Protected admin: services content management
router.use("/admin/services", requireAdmin, servicesAdminRouter);

// Protected admin: QR scan stats
router.use("/admin/qr-scans", requireAdmin, qrScansAdminRouter);

export default router;
