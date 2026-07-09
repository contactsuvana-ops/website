import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import {
  getProjectsRepository,
  getSubmissionsRepository,
  getProjectScopesRepository,
  getProjectMilestonesRepository,
  getActivitiesRepository,
  type ProjectDoc,
  type ProjectMilestoneDoc,
} from "../db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  CreateMilestoneBody,
  UpdateMilestoneBody,
  ReorderMilestonesBody,
} from "../validation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeProject(doc: ProjectDoc) {
  return {
    ...doc,
    startDate: tsToIso(doc.startDate),
    completedDate: tsToIso(doc.completedDate),
    startTarget: tsToIso(doc.startTarget),
    completionTarget: tsToIso(doc.completionTarget),
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

function serializeMilestone(doc: ProjectMilestoneDoc) {
  return {
    ...doc,
    targetDate: tsToIso(doc.targetDate),
    completedDate: tsToIso(doc.completedDate),
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

// ─── List Projects ────────────────────────────────────────────────────────────

router.get("/", async (req, res): Promise<void> => {
  try {
    const status = req.query["status"] as string | undefined;
    const page = Number(req.query["page"]) || 1;
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);

    const result = await getProjectsRepository().listProjects({ status: status as ProjectDoc["status"] | "all" | undefined, page, limit });
    res.json({
      items: result.items.map(serializeProject),
      total: result.total,
    });
  } catch (error) {
    logger.error({ error }, "Error listing projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Create Project ───────────────────────────────────────────────────────────

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

    if (submissionId) {
      await getSubmissionsRepository().linkSubmissionToProject(submissionId, project.id);
    }

    res.status(201).json(serializeProject(project));
  } catch (error) {
    logger.error({ error }, "Error creating project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Single Project ───────────────────────────────────────────────────────

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const project = await getProjectsRepository().getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(serializeProject(project));
  } catch (error) {
    logger.error({ error }, "Error fetching project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Update Project ───────────────────────────────────────────────────────────

router.put("/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getProjectsRepository();
    const existing = await repo.getProject(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const { startTarget, completionTarget, status, ...rest } = parsed.data;
    const updateData: Partial<ProjectDoc> = { ...rest };

    if (status) updateData.status = status;
    if (startTarget) {
      updateData.startTarget = admin.firestore.Timestamp.fromDate(new Date(startTarget));
    }
    if (completionTarget) {
      updateData.completionTarget = admin.firestore.Timestamp.fromDate(new Date(completionTarget));
    }

    const prevStatus = existing.status;
    await repo.updateProject(req.params.id, updateData);

    if (status && status !== prevStatus) {
      await getActivitiesRepository().addActivity({
        projectId: req.params.id,
        type: "project_status_changed",
        actorId: "admin",
        summary: `Project status changed from ${prevStatus} to ${status}`,
        payload: { from: prevStatus, to: status },
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Complete Project ─────────────────────────────────────────────────────────

router.post("/:id/complete", async (req, res): Promise<void> => {
  try {
    const repo = getProjectsRepository();
    const existing = await repo.getProject(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await repo.completeProject(req.params.id);
    await getActivitiesRepository().addActivity({
      projectId: req.params.id,
      type: "project_status_changed",
      actorId: "admin",
      summary: "Project marked as completed",
      payload: { from: existing.status, to: "completed" },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error completing project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Scope ────────────────────────────────────────────────────────────────────

router.get("/:id/scope", async (req, res): Promise<void> => {
  try {
    const scope = await getProjectScopesRepository().getScopeByProject(req.params.id);
    if (!scope) {
      res.status(404).json({ error: "Scope not found" });
      return;
    }
    res.json({
      ...scope,
      acceptedAt: tsToIso(scope.acceptedAt),
      createdAt: tsToIso(scope.createdAt as admin.firestore.Timestamp),
    });
  } catch (error) {
    logger.error({ error }, "Error fetching project scope");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/scope", async (req, res): Promise<void> => {
  try {
    const project = await getProjectsRepository().getProject(req.params.id);
    if (!project || !project.scopeId) {
      res.status(404).json({ error: "Scope not found" });
      return;
    }
    const { scopeNotes, contractNotes } = req.body as {
      scopeNotes?: string;
      contractNotes?: string;
    };
    await getProjectScopesRepository().updateScope(project.scopeId, { scopeNotes, contractNotes });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating project scope notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Milestones ───────────────────────────────────────────────────────────────

router.get("/:id/milestones", async (req, res): Promise<void> => {
  try {
    const milestones = await getProjectMilestonesRepository().listMilestones(req.params.id);
    res.json(milestones.map(serializeMilestone));
  } catch (error) {
    logger.error({ error }, "Error fetching milestones");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/milestones", async (req, res): Promise<void> => {
  try {
    const parsed = CreateMilestoneBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { targetDate, ...rest } = parsed.data;
    const milestone = await getProjectMilestonesRepository().createMilestone({
      ...rest,
      projectId: req.params.id,
      targetDate: targetDate ? admin.firestore.Timestamp.fromDate(new Date(targetDate)) : undefined,
    });
    res.status(201).json(serializeMilestone(milestone));
  } catch (error) {
    logger.error({ error }, "Error creating milestone");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/milestones/:mid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateMilestoneBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { targetDate, ...rest } = parsed.data;
    const update: Parameters<ReturnType<typeof getProjectMilestonesRepository>["updateMilestone"]>[1] = { ...rest };
    if (targetDate) {
      (update as Record<string, unknown>)["targetDate"] = admin.firestore.Timestamp.fromDate(new Date(targetDate));
    }
    await getProjectMilestonesRepository().updateMilestone(req.params.mid, update);

    if (rest.status) {
      await getActivitiesRepository().addActivity({
        projectId: req.params.id,
        type: "milestone_updated",
        actorId: "admin",
        summary: `Milestone "${req.params.mid}" updated to ${rest.status}`,
        payload: { milestoneId: req.params.mid, status: rest.status },
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating milestone");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/milestones/:mid", async (req, res): Promise<void> => {
  try {
    await getProjectMilestonesRepository().deleteMilestone(req.params.mid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting milestone");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/milestones/reorder", async (req, res): Promise<void> => {
  try {
    const parsed = ReorderMilestonesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getProjectMilestonesRepository().reorderMilestones(parsed.data.orderedIds);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error reordering milestones");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Activities ───────────────────────────────────────────────────────────────

router.get("/:id/activities", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 50, 100);
    const activities = await getActivitiesRepository().listActivities(req.params.id, limit);
    res.json(activities.map((a) => ({
      ...a,
      createdAt: tsToIso(a.createdAt as admin.firestore.Timestamp),
    })));
  } catch (error) {
    logger.error({ error }, "Error fetching activities");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
