import { Router, type IRouter } from "express";
import { getCaseStudiesRepository, getProjectsRepository } from "../db";
import { CreateCaseStudyBody, UpdateCaseStudyBody } from "../validation";
import { requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

// List published case studies
router.get("/case-studies", async (req, res): Promise<void> => {
  try {
    const repo = getCaseStudiesRepository();
    const caseStudies = await repo.listCaseStudies(true);
    res.json(caseStudies);
  } catch (error) {
    logger.error({ error }, "Error listing case studies");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single published case study
router.get("/case-studies/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getCaseStudiesRepository();
    const caseStudy = await repo.getCaseStudy(id);
    if (!caseStudy || !caseStudy.published) {
      res.status(404).json({ error: "Case study not found" });
      return;
    }
    res.json(caseStudy);
  } catch (error) {
    logger.error({ error }, "Error fetching case study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

// List all case studies (including drafts)
router.get("/admin/case-studies", requireAdmin, async (req, res): Promise<void> => {
  try {
    const repo = getCaseStudiesRepository();
    const caseStudies = await repo.listCaseStudies(false);
    res.json(caseStudies);
  } catch (error) {
    logger.error({ error }, "Error listing all case studies");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create case study
router.post("/admin/case-studies", requireAdmin, async (req, res): Promise<void> => {
  try {
    const parsed = CreateCaseStudyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    // Verify the project exists
    const projectsRepo = getProjectsRepository();
    const project = await projectsRepo.getProject(parsed.data.projectId);
    if (!project) {
      res.status(400).json({ error: "Project not found" });
      return;
    }

    const repo = getCaseStudiesRepository();
    const caseStudy = await repo.createCaseStudy({
      ...parsed.data,
      technologies: parsed.data.technologies ?? [],
      mediaIds: parsed.data.mediaIds ?? [],
      published: false,
    });

    // Link the case study back to the project
    await projectsRepo.linkCaseStudy(parsed.data.projectId, caseStudy.id);

    res.status(201).json(caseStudy);
  } catch (error) {
    logger.error({ error }, "Error creating case study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update case study
router.put("/admin/case-studies/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const parsed = UpdateCaseStudyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getCaseStudiesRepository();
    const existing = await repo.getCaseStudy(id);
    if (!existing) {
      res.status(404).json({ error: "Case study not found" });
      return;
    }
    await repo.updateCaseStudy(id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating case study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Publish case study
router.post("/admin/case-studies/:id/publish", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getCaseStudiesRepository();
    const existing = await repo.getCaseStudy(id);
    if (!existing) {
      res.status(404).json({ error: "Case study not found" });
      return;
    }
    await repo.publishCaseStudy(id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error publishing case study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Unpublish case study
router.post("/admin/case-studies/:id/unpublish", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getCaseStudiesRepository();
    const existing = await repo.getCaseStudy(id);
    if (!existing) {
      res.status(404).json({ error: "Case study not found" });
      return;
    }
    await repo.unpublishCaseStudy(id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error unpublishing case study");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
