import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import {
  getProjectChartersRepository,
  getActivitiesRepository,
  type ProjectCharterDoc,
} from "../db";
import { UpdateCharterBody } from "../validation";
import { logger } from "../lib/logger";

export const chartersRouter: IRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeCharter(doc: ProjectCharterDoc) {
  return {
    ...doc,
    publishedAt: tsToIso(doc.publishedAt),
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

chartersRouter.get("/charter", async (req, res): Promise<void> => {
  try {
    const charter = await getProjectChartersRepository().getCharterByProject((req.params as ProjectParams).id);
    if (!charter) {
      res.status(404).json({ error: "Charter not found" });
      return;
    }
    res.json(serializeCharter(charter));
  } catch (error) {
    logger.error({ error }, "Error fetching charter");
    res.status(500).json({ error: "Internal server error" });
  }
});

chartersRouter.put("/charter", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateCharterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const charter = await getProjectChartersRepository().getCharterByProject((req.params as ProjectParams).id);
    if (!charter) {
      res.status(404).json({ error: "Charter not found" });
      return;
    }
    await getProjectChartersRepository().updateCharter(charter.id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating charter");
    res.status(500).json({ error: "Internal server error" });
  }
});

chartersRouter.post("/charter/publish", async (req, res): Promise<void> => {
  try {
    const charter = await getProjectChartersRepository().getCharterByProject((req.params as ProjectParams).id);
    if (!charter) {
      res.status(404).json({ error: "Charter not found" });
      return;
    }
    await getProjectChartersRepository().publishCharter(charter.id);
    await getActivitiesRepository().addActivity({
      projectId: (req.params as ProjectParams).id,
      type: "charter_published",
      actorId: "admin",
      summary: "Project charter published",
      payload: { charterId: charter.id, version: charter.version },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error publishing charter");
    res.status(500).json({ error: "Internal server error" });
  }
});
