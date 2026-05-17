import { Router, type IRouter } from "express";
import { getProjectsRepository, getSubmissionsRepository } from "../db";
import { CreateProjectBody, UpdateProjectBody } from "../validation";
import { logger } from "../lib/logger";
import admin from "firebase-admin";

const router: IRouter = Router();

// List projects
router.get("/", async (req, res): Promise<void> => {
  try {
    const status = req.query["status"] as "active" | "completed" | undefined;
    const repo = getProjectsRepository();
    const projects = await repo.listProjects(
      status ? { status } : undefined
    );
    res.json(projects);
  } catch (error) {
    logger.error({ error }, "Error listing projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create project
router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { submissionId, startDate, ...rest } = parsed.data;
    const projectsRepo = getProjectsRepository();

    const project = await projectsRepo.createProject({
      ...rest,
      submissionId,
      status: "active",
      startDate: startDate
        ? admin.firestore.Timestamp.fromDate(new Date(startDate))
        : admin.firestore.Timestamp.now(),
    });

    // Mark the linked submission as converted
    if (submissionId) {
      const subRepo = getSubmissionsRepository();
      await subRepo.linkSubmissionToProject(submissionId, project.id);
    }

    res.status(201).json(project);
  } catch (error) {
    logger.error({ error }, "Error creating project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single project
router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getProjectsRepository();
    const project = await repo.getProject(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    logger.error({ error }, "Error fetching project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update project
router.put("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getProjectsRepository();
    const existing = await repo.getProject(id);
    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await repo.updateProject(id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark project as completed
router.post("/:id/complete", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getProjectsRepository();
    const existing = await repo.getProject(id);
    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await repo.completeProject(id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error completing project");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
