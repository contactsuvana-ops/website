import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import admin from "firebase-admin";
import {
  getEstimatesRepository,
  getEstimateSectionsRepository,
  getEstimateLineItemsRepository,
  getEstimateVersionsRepository,
  getPortalRepository,
  getCatalogCategoriesRepository,
  getCatalogItemsRepository,
  getEstimateCommentsRepository,
  type EstimateDoc,
  type EstimateSectionDoc,
  type EstimateLineItemDoc,
} from "../db";
import {
  CreateEstimateBody,
  UpdateEstimateBody,
  GetEstimatesQuery,
  TransitionEstimateBody,
  CreateEstimateSectionBody,
  UpdateEstimateSectionBody,
  ReorderSectionsBody,
  CreateLineItemBody,
  UpdateLineItemBody,
  ReorderLineItemsBody,
  SendEstimateBody,
} from "../validation";
import { computeEstimateTotals, computeLineTotals } from "../lib/pricing";
import { sendQuoteToCustomer } from "../lib/email";
import { logger } from "../lib/logger";
import { convertEstimateToProject } from "../lib/conversion";

export const estimatesRouter: IRouter = Router();
const SITE_URL = (process.env.SITE_URL?.trim() || "https://suvanaconstruction.com").replace(/\/$/, "");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeEstimate(doc: EstimateDoc) {
  return {
    ...doc,
    validUntil: tsToIso(doc.validUntil),
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

function serializeSection(doc: EstimateSectionDoc) {
  return {
    ...doc,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

function serializeLineItem(doc: EstimateLineItemDoc) {
  const lineTotals = computeLineTotals({
    qty: doc.qty,
    laborUnitPrice: doc.laborUnitPrice,
    materialUnitPrice: doc.materialUnitPrice,
    markupPct: doc.markupPct,
    discountPct: doc.discountPct,
    isOptional: doc.isOptional,
  });
  return {
    ...doc,
    ...lineTotals,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

// ─── List & Create ────────────────────────────────────────────────────────────

estimatesRouter.get("/", async (req, res): Promise<void> => {
  try {
    const parsed = GetEstimatesQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { status, page, limit } = parsed.data;
    const result = await getEstimatesRepository().listEstimates({
      status: status as EstimateDoc["status"] | "all" | undefined,
      page,
      limit,
    });
    res.json({
      items: result.items.map(serializeEstimate),
      total: result.total,
    });
  } catch (error) {
    logger.error({ error }, "Error listing estimates");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateEstimateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const estimate = await getEstimatesRepository().createEstimate({
      ...parsed.data,
      status: "draft",
      createdBy: "admin",
      currentVersionNumber: 0,
    });
    res.status(201).json(serializeEstimate(estimate));
  } catch (error) {
    logger.error({ error }, "Error creating estimate");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get full estimate (with sections + items) ────────────────────────────────

estimatesRouter.get("/:id", async (req, res): Promise<void> => {
  try {
    const estimate = await getEstimatesRepository().getEstimate(req.params.id);
    if (!estimate) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    const [sections, items] = await Promise.all([
      getEstimateSectionsRepository().listSections(req.params.id),
      getEstimateLineItemsRepository().listItems(req.params.id),
    ]);

    let acceptedAt: string | null = null;
    let acceptedOptionalIds: string[] | null = null;
    if (estimate.status === "accepted") {
      const actions = await getPortalRepository().listActions(req.params.id);
      const acceptAction = actions.find((a) => a.action === "accept");
      if (acceptAction) {
        acceptedAt = (acceptAction.createdAt as admin.firestore.Timestamp).toDate().toISOString();
        acceptedOptionalIds =
          (acceptAction.payload as { selectedOptionalIds?: string[] })?.selectedOptionalIds ?? [];
      }
    }

    res.json({
      estimate: serializeEstimate(estimate),
      sections: sections.map(serializeSection),
      items: items.map(serializeLineItem),
      acceptedAt,
      acceptedOptionalIds,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching estimate");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.put("/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateEstimateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getEstimatesRepository();
    const existing = await repo.getEstimate(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    const { validUntil: validUntilStr, ...rest } = parsed.data;
    const updateData: Partial<EstimateDoc> = { ...rest };
    if (validUntilStr) {
      updateData.validUntil = admin.firestore.Timestamp.fromDate(new Date(validUntilStr));
    }
    await repo.updateEstimate(req.params.id, updateData);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating estimate");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Status transition ────────────────────────────────────────────────────────

estimatesRouter.post("/:id/transition", async (req, res): Promise<void> => {
  try {
    const parsed = TransitionEstimateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getEstimatesRepository();
    const existing = await repo.getEstimate(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    await repo.transitionStatus(req.params.id, parsed.data.status);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error transitioning estimate status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Sections ─────────────────────────────────────────────────────────────────

estimatesRouter.post("/:id/sections", async (req, res): Promise<void> => {
  try {
    const parsed = CreateEstimateSectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const section = await getEstimateSectionsRepository().createSection({
      ...parsed.data,
      estimateId: req.params.id,
    });
    res.status(201).json(serializeSection(section));
  } catch (error) {
    logger.error({ error }, "Error creating estimate section");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.put("/:id/sections/:sid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateEstimateSectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getEstimateSectionsRepository().updateSection(req.params.sid, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating estimate section");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.delete("/:id/sections/:sid", async (req, res): Promise<void> => {
  try {
    await getEstimateSectionsRepository().deleteSection(req.params.sid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting estimate section");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.post("/:id/sections/reorder", async (req, res): Promise<void> => {
  try {
    const parsed = ReorderSectionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getEstimateSectionsRepository().reorderSections(parsed.data.orderedIds);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error reordering sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Line Items ───────────────────────────────────────────────────────────────

estimatesRouter.post("/:id/items", async (req, res): Promise<void> => {
  try {
    const parsed = CreateLineItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    // Auto-assign position at end of section so new items appear at the bottom
    const existingItems = await getEstimateLineItemsRepository().listItemsBySection(parsed.data.sectionId);
    const position = existingItems.length > 0
      ? Math.max(...existingItems.map((i) => i.position)) + 1
      : 0;

    const item = await getEstimateLineItemsRepository().createItem({
      ...parsed.data,
      estimateId: req.params.id,
      position,
    });
    res.status(201).json(serializeLineItem(item));
  } catch (error) {
    logger.error({ error }, "Error creating estimate line item");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.put("/:id/items/:iid", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateLineItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getEstimateLineItemsRepository();
    const existing = await repo.getItem(req.params.iid);
    if (!existing) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }

    let { catalogItemId } = existing;

    // Auto-create catalog entry once the item has a real description AND both prices set
    const mergedDesc = parsed.data.description ?? existing.description;
    const mergedLabor = parsed.data.laborUnitPrice ?? existing.laborUnitPrice;
    const mergedMaterial = parsed.data.materialUnitPrice ?? existing.materialUnitPrice;
    const isPlaceholder = (d: string) => !d || d.trim() === "" || d === "New Item";
    const readyForCatalog =
      !catalogItemId &&
      !isPlaceholder(mergedDesc) &&
      (mergedLabor > 0 || mergedMaterial > 0);
    if (readyForCatalog) {
      try {
        const catRepo = getCatalogCategoriesRepository();
        const cats = await catRepo.listCategories();
        let defaultCat = cats.find((c) => c.name === "Custom");
        if (!defaultCat) {
          defaultCat = await catRepo.createCategory({ name: "Custom", position: 9999 });
        }
        const catalogItem = await getCatalogItemsRepository().createItem({
          categoryId: defaultCat.id,
          name: mergedDesc,
          description: "",
          unit: parsed.data.unit ?? existing.unit,
          pricingModel: "unit",
          laborUnitPrice: mergedLabor,
          materialUnitPrice: mergedMaterial,
          defaultMarkupPct: parsed.data.markupPct ?? existing.markupPct,
          tags: [],
          isActive: true,
          displayOrder: 0,
          createdBy: "admin",
        });
        catalogItemId = catalogItem.id;
      } catch (catalogErr) {
        logger.warn({ catalogErr }, "Failed to auto-create catalog item; continuing without it");
      }
    }

    await repo.updateItem(req.params.iid, { ...parsed.data, ...(catalogItemId ? { catalogItemId } : {}) });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating estimate line item");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.delete("/:id/items/:iid", async (req, res): Promise<void> => {
  try {
    await getEstimateLineItemsRepository().deleteItem(req.params.iid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting estimate line item");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.post("/:id/items/reorder", async (req, res): Promise<void> => {
  try {
    const parsed = ReorderLineItemsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getEstimateLineItemsRepository().reorderItems(parsed.data.updates);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error reordering line items");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Totals ───────────────────────────────────────────────────────────────────

estimatesRouter.get("/:id/totals", async (req, res): Promise<void> => {
  try {
    const estimate = await getEstimatesRepository().getEstimate(req.params.id);
    if (!estimate) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    const items = await getEstimateLineItemsRepository().listItems(req.params.id);
    const totals = computeEstimateTotals(items, {
      taxRate: estimate.taxRate,
      markupPct: estimate.markupPct,
      depositPct: estimate.depositPct,
      discountAmount: estimate.discountAmount,
    });
    res.json(totals);
  } catch (error) {
    logger.error({ error }, "Error computing estimate totals");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Send quote ───────────────────────────────────────────────────────────────

estimatesRouter.post("/:id/send", async (req, res): Promise<void> => {
  try {
    const parsed = SendEstimateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const estimateRepo = getEstimatesRepository();
    const estimate = await estimateRepo.getEstimate(req.params.id);
    if (!estimate) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }

    const [sections, items] = await Promise.all([
      getEstimateSectionsRepository().listSections(req.params.id),
      getEstimateLineItemsRepository().listItems(req.params.id),
    ]);

    const totals = computeEstimateTotals(items, {
      taxRate: estimate.taxRate,
      markupPct: estimate.markupPct,
      depositPct: estimate.depositPct,
      discountAmount: estimate.discountAmount,
    });
    const recipientEmail = parsed.data.customerEmail?.trim() || estimate.customerEmail?.trim();
    if (!recipientEmail) {
      res.status(400).json({ error: "Customer email is required to send a quote." });
      return;
    }

    // Create immutable snapshot
    const newVersionNumber = (estimate.currentVersionNumber ?? 0) + 1;
    const snapshotData = {
      estimate: serializeEstimate(estimate),
      sections: sections.map(serializeSection),
      items: items.map(serializeLineItem),
      totals,
      note: parsed.data.message?.trim() || undefined,
    };

    const versionsRepo = getEstimateVersionsRepository();
    const version = await versionsRepo.createVersion({
      estimateId: req.params.id,
      versionNumber: newVersionNumber,
      snapshotData,
      changeSummary: parsed.data.changeSummary,
      authorId: "admin",
      statusAtSnapshot: "sent",
    });

    // Generate portal token
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + parsed.data.validDays * 24 * 60 * 60 * 1000)
    );
    const token = randomUUID();
    const portalToken = await getPortalRepository().createToken({
      estimateId: req.params.id,
      versionId: version.id,
      customerEmail: estimate.customerEmail,
      token,
      expiresAt,
      isRevoked: false,
      viewCount: 0,
    });

    // Update estimate status + version number
    await estimateRepo.updateEstimate(req.params.id, {
      status: "sent",
      currentVersionNumber: newVersionNumber,
      validUntil: expiresAt,
      customerEmail: recipientEmail,
    });

    await versionsRepo.markSent(version.id);

    // Send email (fire and forget)
    const portalUrl = `${SITE_URL}/quote/${token}`;
    sendQuoteToCustomer({
      to: recipientEmail,
      customerName: estimate.customerName,
      estimateTitle: estimate.title,
      versionNumber: newVersionNumber,
      portalUrl,
      message: parsed.data.message,
      validUntil: expiresAt.toDate(),
      totals,
    }).catch((err) => logger.error({ err }, "Failed to send quote email"));

    res.status(201).json({
      success: true,
      versionId: version.id,
      tokenId: portalToken.id,
      portalUrl,
    });
  } catch (error) {
    logger.error({ error }, "Error sending estimate");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Versions ─────────────────────────────────────────────────────────────────

// ─── Convert to Project ───────────────────────────────────────────────────────

estimatesRouter.post("/:id/convert", async (req, res): Promise<void> => {
  try {
    const estimate = await getEstimatesRepository().getEstimate(req.params.id);
    if (!estimate) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    if (estimate.status === "converted_to_project") {
      res.status(400).json({ error: "Estimate has already been converted to a project" });
      return;
    }
    if (estimate.status !== "accepted") {
      res.status(400).json({ error: "Estimate must be accepted before converting to a project" });
      return;
    }
    const result = await convertEstimateToProject(req.params.id);
    res.status(201).json(result);
  } catch (error) {
    logger.error({ error }, "Error converting estimate to project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Versions ─────────────────────────────────────────────────────────────────

estimatesRouter.get("/:id/versions", async (req, res): Promise<void> => {
  try {
    const versions = await getEstimateVersionsRepository().listVersions(req.params.id);
    res.json(
      versions.map((v) => ({
        ...v,
        sentAt: tsToIso(v.sentAt as admin.firestore.Timestamp | undefined),
        createdAt: tsToIso(v.createdAt as admin.firestore.Timestamp),
      }))
    );
  } catch (error) {
    logger.error({ error }, "Error listing estimate versions");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.get("/:id/versions/:vid", async (req, res): Promise<void> => {
  try {
    const version = await getEstimateVersionsRepository().getVersion(req.params.vid);
    if (!version) {
      res.status(404).json({ error: "Version not found" });
      return;
    }
    res.json({
      ...version,
      sentAt: tsToIso(version.sentAt as admin.firestore.Timestamp | undefined),
      createdAt: tsToIso(version.createdAt as admin.firestore.Timestamp),
    });
  } catch (error) {
    logger.error({ error }, "Error fetching estimate version");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Comments ─────────────────────────────────────────────────────────────────

estimatesRouter.get("/:id/comments", async (req, res): Promise<void> => {
  try {
    const comments = await getEstimateCommentsRepository().listComments(req.params.id);
    res.json(comments.map((c) => ({
      ...c,
      createdAt: tsToIso(c.createdAt as admin.firestore.Timestamp),
    })));
  } catch (error) {
    logger.error({ error }, "Error listing estimate comments");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.post("/:id/comments", async (req, res): Promise<void> => {
  try {
    const { content, source } = req.body as { content?: string; source?: string };
    if (!content?.trim()) {
      res.status(400).json({ error: "Content is required" });
      return;
    }
    const comment = await getEstimateCommentsRepository().addComment({
      estimateId: req.params.id,
      content: content.trim(),
      source: source === "carried_over" ? "carried_over" : "manual",
    });
    res.status(201).json({
      ...comment,
      createdAt: tsToIso(comment.createdAt as admin.firestore.Timestamp),
    });
  } catch (error) {
    logger.error({ error }, "Error adding estimate comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

estimatesRouter.delete("/:id/comments/:cid", async (req, res): Promise<void> => {
  try {
    await getEstimateCommentsRepository().deleteComment(req.params.cid);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting estimate comment");
    res.status(500).json({ error: "Internal server error" });
  }
});
