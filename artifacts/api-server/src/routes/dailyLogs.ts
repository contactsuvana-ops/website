import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import { getDailyLogsRepository, getActivitiesRepository, type DailyLogDoc } from "../db";
import { CreateDailyLogBody, UpdateDailyLogBody } from "../validation";
import { logger } from "../lib/logger";

export const dailyLogsRouter: IRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };
type LogParams = { id: string; lid: string };

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeLog(doc: DailyLogDoc) {
  return {
    ...doc,
    submittedAt: tsToIso(doc.submittedAt),
    approvedAt: tsToIso(doc.approvedAt),
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

dailyLogsRouter.get("/logs", async (req, res): Promise<void> => {
  try {
    const logs = await getDailyLogsRepository().listLogs((req.params as LogParams).id);
    res.json(logs.map(serializeLog));
  } catch (error) {
    logger.error({ error }, "Error listing daily logs");
    res.status(500).json({ error: "Internal server error" });
  }
});

dailyLogsRouter.post("/logs", async (req, res): Promise<void> => {
  try {
    const parsed = CreateDailyLogBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const log = await getDailyLogsRepository().createLog({
      ...parsed.data,
      projectId: (req.params as LogParams).id,
      status: "draft",
    });
    res.status(201).json(serializeLog(log));
  } catch (error) {
    logger.error({ error }, "Error creating daily log");
    res.status(500).json({ error: "Internal server error" });
  }
});

dailyLogsRouter.get("/logs/:lid", async (req, res): Promise<void> => {
  try {
    const log = await getDailyLogsRepository().getLog((req.params as LogParams).lid);
    if (!log) {
      res.status(404).json({ error: "Log not found" });
      return;
    }
    res.json(serializeLog(log));
  } catch (error) {
    logger.error({ error }, "Error fetching daily log");
    res.status(500).json({ error: "Internal server error" });
  }
});

dailyLogsRouter.put("/logs/:lid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateDailyLogBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = await getDailyLogsRepository().getLog((req.params as LogParams).lid);
    if (!existing) {
      res.status(404).json({ error: "Log not found" });
      return;
    }
    if (existing.status === "approved") {
      res.status(400).json({ error: "Approved logs cannot be edited" });
      return;
    }
    await getDailyLogsRepository().updateLog((req.params as LogParams).lid, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating daily log");
    res.status(500).json({ error: "Internal server error" });
  }
});

dailyLogsRouter.post("/logs/:lid/submit", async (req, res): Promise<void> => {
  try {
    const existing = await getDailyLogsRepository().getLog((req.params as LogParams).lid);
    if (!existing) {
      res.status(404).json({ error: "Log not found" });
      return;
    }
    await getDailyLogsRepository().submitLog((req.params as LogParams).lid, "admin");
    await getActivitiesRepository().addActivity({
      projectId: (req.params as LogParams).id,
      type: "daily_log_submitted",
      actorId: "admin",
      summary: `Daily log submitted for ${existing.date}`,
      payload: { logId: (req.params as LogParams).lid, date: existing.date },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error submitting daily log");
    res.status(500).json({ error: "Internal server error" });
  }
});

dailyLogsRouter.post("/logs/:lid/approve", async (req, res): Promise<void> => {
  try {
    const existing = await getDailyLogsRepository().getLog((req.params as LogParams).lid);
    if (!existing) {
      res.status(404).json({ error: "Log not found" });
      return;
    }
    if (existing.status !== "submitted") {
      res.status(400).json({ error: "Only submitted logs can be approved" });
      return;
    }
    await getDailyLogsRepository().approveLog((req.params as LogParams).lid, "admin");
    await getActivitiesRepository().addActivity({
      projectId: (req.params as LogParams).id,
      type: "daily_log_approved",
      actorId: "admin",
      summary: `Daily log approved for ${existing.date}`,
      payload: { logId: (req.params as LogParams).lid, date: existing.date },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error approving daily log");
    res.status(500).json({ error: "Internal server error" });
  }
});

dailyLogsRouter.delete("/logs/:lid", async (req, res): Promise<void> => {
  try {
    const existing = await getDailyLogsRepository().getLog((req.params as LogParams).lid);
    if (!existing) {
      res.status(404).json({ error: "Log not found" });
      return;
    }
    if (existing.status === "approved") {
      res.status(400).json({ error: "Approved logs cannot be deleted" });
      return;
    }
    await getDailyLogsRepository().deleteLog((req.params as LogParams).lid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting daily log");
    res.status(500).json({ error: "Internal server error" });
  }
});
