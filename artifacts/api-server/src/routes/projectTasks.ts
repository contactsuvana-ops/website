import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import {
  getProjectSectionsRepository,
  getProjectTasksRepository,
  getActivitiesRepository,
  type ProjectSectionDoc,
  type ProjectTaskDoc,
} from "../db";
import {
  CreateProjectSectionBody,
  UpdateProjectSectionBody,
  ReorderProjectSectionsBody,
  CreateTaskBody,
  UpdateTaskBody,
  ReorderTasksBody,
} from "../validation";
import { logger } from "../lib/logger";

export const projectTasksRouter: IRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };
type SectionParams = { id: string; sid: string };
type TaskParams = { id: string; tid: string };

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeSection(doc: ProjectSectionDoc) {
  return {
    ...doc,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

function serializeTask(doc: ProjectTaskDoc) {
  return {
    ...doc,
    plannedStartDate: tsToIso(doc.plannedStartDate),
    plannedEndDate: tsToIso(doc.plannedEndDate),
    actualStartDate: tsToIso(doc.actualStartDate),
    actualEndDate: tsToIso(doc.actualEndDate),
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

// ─── Sections ─────────────────────────────────────────────────────────────────

projectTasksRouter.get("/sections", async (req, res): Promise<void> => {
  try {
    const sections = await getProjectSectionsRepository().listSections((req.params as TaskParams).id);
    res.json(sections.map(serializeSection));
  } catch (error) {
    logger.error({ error }, "Error listing project sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.post("/sections", async (req, res): Promise<void> => {
  try {
    const parsed = CreateProjectSectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = await getProjectSectionsRepository().listSections((req.params as TaskParams).id);
    const position = parsed.data.position ?? existing.length;
    const section = await getProjectSectionsRepository().createSection({
      ...parsed.data,
      position,
      projectId: (req.params as TaskParams).id,
      isCollapsed: false,
    });
    res.status(201).json(serializeSection(section));
  } catch (error) {
    logger.error({ error }, "Error creating project section");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.patch("/sections/:sid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateProjectSectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getProjectSectionsRepository().updateSection((req.params as SectionParams).sid, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating project section");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.delete("/sections/:sid", async (req, res): Promise<void> => {
  try {
    await getProjectSectionsRepository().deleteSection((req.params as SectionParams).sid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting project section");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.post("/sections/reorder", async (req, res): Promise<void> => {
  try {
    const parsed = ReorderProjectSectionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getProjectSectionsRepository().reorderSections(parsed.data.orderedIds);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error reordering project sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

projectTasksRouter.get("/tasks", async (req, res): Promise<void> => {
  try {
    const tasks = await getProjectTasksRepository().listTasks((req.params as TaskParams).id);
    res.json(tasks.map(serializeTask));
  } catch (error) {
    logger.error({ error }, "Error listing project tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.post("/tasks", async (req, res): Promise<void> => {
  try {
    const parsed = CreateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { plannedStartDate, plannedEndDate, ...rest } = parsed.data;

    const existingTasks = parsed.data.sectionId
      ? await getProjectTasksRepository().listTasksBySection(parsed.data.sectionId)
      : await getProjectTasksRepository().listTasks((req.params as TaskParams).id);
    const position = existingTasks.length > 0
      ? Math.max(...existingTasks.map((t) => t.position)) + 1
      : 0;

    const task = await getProjectTasksRepository().createTask({
      ...rest,
      projectId: (req.params as TaskParams).id,
      position,
      plannedStartDate: plannedStartDate
        ? admin.firestore.Timestamp.fromDate(new Date(plannedStartDate))
        : undefined,
      plannedEndDate: plannedEndDate
        ? admin.firestore.Timestamp.fromDate(new Date(plannedEndDate))
        : undefined,
    });

    await getActivitiesRepository().addActivity({
      projectId: (req.params as TaskParams).id,
      type: "task_created",
      actorId: "admin",
      summary: `Task created: "${task.title}"`,
      payload: { taskId: task.id, title: task.title },
    });

    res.status(201).json(serializeTask(task));
  } catch (error) {
    logger.error({ error }, "Error creating task");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.get("/tasks/:tid", async (req, res): Promise<void> => {
  try {
    const task = await getProjectTasksRepository().getTask((req.params as TaskParams).tid);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(serializeTask(task));
  } catch (error) {
    logger.error({ error }, "Error fetching task");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.patch("/tasks/:tid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = await getProjectTasksRepository().getTask((req.params as TaskParams).tid);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const { plannedStartDate, plannedEndDate, status, ...rest } = parsed.data;
    const updateData: Parameters<ReturnType<typeof getProjectTasksRepository>["updateTask"]>[1] = { ...rest };
    if (status) (updateData as Record<string, unknown>)["status"] = status;
    if (plannedStartDate) {
      (updateData as Record<string, unknown>)["plannedStartDate"] = admin.firestore.Timestamp.fromDate(new Date(plannedStartDate));
    }
    if (plannedEndDate) {
      (updateData as Record<string, unknown>)["plannedEndDate"] = admin.firestore.Timestamp.fromDate(new Date(plannedEndDate));
    }

    await getProjectTasksRepository().updateTask((req.params as TaskParams).tid, updateData);

    if (status && status !== existing.status) {
      await getActivitiesRepository().addActivity({
        projectId: (req.params as TaskParams).id,
        type: "task_status_changed",
        actorId: "admin",
        summary: `Task "${existing.title}" → ${status}`,
        payload: { taskId: (req.params as TaskParams).tid, from: existing.status, to: status },
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating task");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.delete("/tasks/:tid", async (req, res): Promise<void> => {
  try {
    await getProjectTasksRepository().deleteTask((req.params as TaskParams).tid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting task");
    res.status(500).json({ error: "Internal server error" });
  }
});

projectTasksRouter.post("/tasks/reorder", async (req, res): Promise<void> => {
  try {
    const parsed = ReorderTasksBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getProjectTasksRepository().reorderTasks(parsed.data.updates);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error reordering tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});
