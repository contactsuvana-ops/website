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
import { catalogRouter } from "./catalog";
import { estimatesRouter } from "./estimates";
import { opportunitiesRouter } from "./opportunities";
import { portalRouter } from "./portal";
import { customersRouter } from "./customers";
import { projectTasksRouter } from "./projectTasks";
import { chartersRouter } from "./charters";
import { dailyLogsRouter } from "./dailyLogs";
import { crewsRouter } from "./crews";
import { siteConfigPublicRouter, siteConfigAdminRouter } from "./siteConfig";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(contactRouter);
router.use(quoteRouter);
router.use("/qr-scan", qrScansPublicRouter);
router.use("/services", servicesPublicRouter);
router.use("/site-config", siteConfigPublicRouter);

// Case studies: public reads + admin writes handled inside the router
router.use(caseStudiesRouter);

// Media: public download proxy + admin upload/delete inside the router
router.use(mediaRouter);

// Admin auth — no auth middleware here, this IS the login endpoint
router.use("/admin", adminRouter);

// Protected admin: submissions + inline comments
router.use("/admin/submissions", requireAdmin, submissionsRouter);
router.use("/admin/submissions", requireAdmin, commentsRouter);
router.use("/submissions", requireAdmin, submissionsRouter);
router.use("/submissions", requireAdmin, commentsRouter);

// Protected admin: discussions
router.use("/admin/discussions", requireAdmin, discussionsRouter);

// Protected admin: projects (core + milestones + activities + scope)
router.use("/admin/projects", requireAdmin, projectsRouter);

// Protected admin: project WBS (sections + tasks) — merged params from /:id
router.use("/admin/projects/:id", requireAdmin, projectTasksRouter);

// Protected admin: project charters
router.use("/admin/projects/:id", requireAdmin, chartersRouter);

// Protected admin: daily logs
router.use("/admin/projects/:id", requireAdmin, dailyLogsRouter);

// Protected admin: services content management
router.use("/admin/services", requireAdmin, servicesAdminRouter);

// Protected admin: QR scan stats
router.use("/admin/qr-scans", requireAdmin, qrScansAdminRouter);

// Protected admin: catalog
router.use("/admin/catalog", requireAdmin, catalogRouter);

// Protected admin: estimates
router.use("/admin/estimates", requireAdmin, estimatesRouter);

// Protected admin: opportunities
router.use("/admin/opportunities", requireAdmin, opportunitiesRouter);

// Protected admin: customers
router.use("/admin/customers", requireAdmin, customersRouter);

// Protected admin: crews
router.use("/admin/crews", requireAdmin, crewsRouter);

// Protected admin: site config (contact info, social links)
router.use("/admin/site-config", requireAdmin, siteConfigAdminRouter);

// Public: customer quote portal (token-gated inside the handler)
router.use("/portal", portalRouter);

export default router;
