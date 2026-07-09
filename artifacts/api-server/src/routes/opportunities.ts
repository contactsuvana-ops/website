import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import { getOpportunitiesRepository, getEstimatesRepository, type OpportunityDoc } from "../db";
import {
  CreateOpportunityBody,
  UpdateOpportunityBody,
  GetOpportunitiesQuery,
} from "../validation";
import { logger } from "../lib/logger";

export const opportunitiesRouter: IRouter = Router();

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serialize(doc: OpportunityDoc) {
  return {
    ...doc,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

opportunitiesRouter.get("/", async (req, res): Promise<void> => {
  try {
    const parsed = GetOpportunitiesQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { status, page, limit } = parsed.data;
    const result = await getOpportunitiesRepository().listOpportunities({
      status: status as OpportunityDoc["status"] | "all" | undefined,
      page,
      limit,
    });
    res.json({ items: result.items.map(serialize), total: result.total });
  } catch (error) {
    logger.error({ error }, "Error listing opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

opportunitiesRouter.get("/:id", async (req, res): Promise<void> => {
  try {
    const opp = await getOpportunitiesRepository().getOpportunity(req.params.id);
    if (!opp) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }
    res.json(serialize(opp));
  } catch (error) {
    logger.error({ error }, "Error fetching opportunity");
    res.status(500).json({ error: "Internal server error" });
  }
});

opportunitiesRouter.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateOpportunityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const opp = await getOpportunitiesRepository().createOpportunity({
      ...parsed.data,
      source: "manual",
      status: "new",
    });
    res.status(201).json(serialize(opp));
  } catch (error) {
    logger.error({ error }, "Error creating opportunity");
    res.status(500).json({ error: "Internal server error" });
  }
});

opportunitiesRouter.put("/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateOpportunityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getOpportunitiesRepository();
    const existing = await repo.getOpportunity(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }
    await repo.updateOpportunity(req.params.id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating opportunity");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Convert opportunity → create estimate stub
opportunitiesRouter.post("/:id/convert", async (req, res): Promise<void> => {
  try {
    const repo = getOpportunitiesRepository();
    const opp = await repo.getOpportunity(req.params.id);
    if (!opp) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }
    const estimate = await getEstimatesRepository().createEstimate({
      opportunityId: opp.id,
      title: opp.projectType
        ? `${opp.projectType.replace(/-/g, " ")} — ${opp.name}`
        : `Estimate — ${opp.name}`,
      customerName: opp.name,
      customerEmail: opp.email,
      customerPhone: opp.phone,
      projectAddress: opp.location,
      description: opp.description,
      status: "draft",
      taxRate: 0,
      markupPct: 20,
      depositPct: 30,
      createdBy: "admin",
      currentVersionNumber: 0,
    });
    await repo.updateOpportunity(opp.id, { status: "estimating" });
    res.status(201).json({
      estimateId: estimate.id,
      estimateTitle: estimate.title,
    });
  } catch (error) {
    logger.error({ error }, "Error converting opportunity to estimate");
    res.status(500).json({ error: "Internal server error" });
  }
});
