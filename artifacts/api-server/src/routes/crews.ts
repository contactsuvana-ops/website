import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import { getCrewsRepository, getCrewMembersRepository, type CrewDoc, type CrewMemberDoc } from "../db";
import { CreateCrewBody, UpdateCrewBody, CreateCrewMemberBody, UpdateCrewMemberBody } from "../validation";
import { logger } from "../lib/logger";

export const crewsRouter: IRouter = Router();

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeCrew(doc: CrewDoc) {
  return {
    ...doc,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

function serializeMember(doc: CrewMemberDoc) {
  return {
    ...doc,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

// ─── Crews ────────────────────────────────────────────────────────────────────

crewsRouter.get("/", async (req, res): Promise<void> => {
  try {
    const activeOnly = req.query["activeOnly"] === "true";
    const crews = await getCrewsRepository().listCrews(activeOnly);
    res.json(crews.map(serializeCrew));
  } catch (error) {
    logger.error({ error }, "Error listing crews");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCrewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const crew = await getCrewsRepository().createCrew(parsed.data);
    res.status(201).json(serializeCrew(crew));
  } catch (error) {
    logger.error({ error }, "Error creating crew");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.get("/:id", async (req, res): Promise<void> => {
  try {
    const crew = await getCrewsRepository().getCrew(req.params.id);
    if (!crew) {
      res.status(404).json({ error: "Crew not found" });
      return;
    }
    const members = await getCrewMembersRepository().listMembers(req.params.id);
    res.json({ ...serializeCrew(crew), members: members.map(serializeMember) });
  } catch (error) {
    logger.error({ error }, "Error fetching crew");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.put("/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateCrewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = await getCrewsRepository().getCrew(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Crew not found" });
      return;
    }
    await getCrewsRepository().updateCrew(req.params.id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating crew");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.delete("/:id", async (req, res): Promise<void> => {
  try {
    const existing = await getCrewsRepository().getCrew(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Crew not found" });
      return;
    }
    await getCrewsRepository().deleteCrew(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting crew");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Crew Members ─────────────────────────────────────────────────────────────

crewsRouter.get("/:id/members", async (req, res): Promise<void> => {
  try {
    const members = await getCrewMembersRepository().listMembers(req.params.id);
    res.json(members.map(serializeMember));
  } catch (error) {
    logger.error({ error }, "Error listing crew members");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.post("/:id/members", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCrewMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const member = await getCrewMembersRepository().createMember({
      ...parsed.data,
      crewId: req.params.id,
    });
    res.status(201).json(serializeMember(member));
  } catch (error) {
    logger.error({ error }, "Error creating crew member");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.put("/:id/members/:mid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateCrewMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = await getCrewMembersRepository().getMember(req.params.mid);
    if (!existing) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    await getCrewMembersRepository().updateMember(req.params.mid, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating crew member");
    res.status(500).json({ error: "Internal server error" });
  }
});

crewsRouter.delete("/:id/members/:mid", async (req, res): Promise<void> => {
  try {
    const existing = await getCrewMembersRepository().getMember(req.params.mid);
    if (!existing) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    await getCrewMembersRepository().deleteMember(req.params.mid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting crew member");
    res.status(500).json({ error: "Internal server error" });
  }
});
