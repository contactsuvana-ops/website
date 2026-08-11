import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import {
  getPortalRepository,
  getEstimateVersionsRepository,
  getEstimatesRepository,
} from "../db";
import {
  CustomerAcceptBody,
  CustomerDeclineBody,
  CustomerChangesBody,
  CustomerCommentBody,
} from "../validation";
import {
  sendQuoteAcceptedNotification,
  sendQuoteActionNotification,
} from "../lib/email";
import { logger } from "../lib/logger";

export const portalRouter: IRouter = Router();

// ─── Resolve token → version snapshot ────────────────────────────────────────

portalRouter.get("/:token", async (req, res): Promise<void> => {
  try {
    const tokenDoc = await getPortalRepository().resolveToken(req.params.token);
    if (!tokenDoc) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }
    if (tokenDoc.isRevoked) {
      res.status(410).json({ error: "This quote link has been revoked" });
      return;
    }
    if (tokenDoc.expiresAt.toDate() < new Date()) {
      res.status(410).json({ error: "This quote link has expired" });
      return;
    }

    // Always show the latest version — any old link a customer has will show the current quote
    const versions = await getEstimateVersionsRepository().listVersions(tokenDoc.estimateId);
    const version = versions[0]; // ordered versionNumber DESC
    if (!version) {
      res.status(404).json({ error: "Quote version not found" });
      return;
    }

    // Record view async — don't await
    getPortalRepository().recordView(tokenDoc.id).catch((err) =>
      logger.error({ err }, "Failed to record portal view")
    );

    // Fetch current estimate status so the portal can show accepted/declined state
    const estimate = await getEstimatesRepository().getEstimate(tokenDoc.estimateId);
    const estimateStatus = estimate?.status ?? "draft";

    let acceptedAt: string | null = null;
    if (estimateStatus === "accepted") {
      const actions = await getPortalRepository().listActions(tokenDoc.estimateId);
      const acceptAction = actions.find((a) => a.action === "accept");
      if (acceptAction) {
        acceptedAt = (acceptAction.createdAt as admin.firestore.Timestamp).toDate().toISOString();
      }
    }

    res.json({
      tokenId: tokenDoc.id,
      estimateId: tokenDoc.estimateId,
      versionId: tokenDoc.versionId,
      versionNumber: version.versionNumber,
      expiresAt: tokenDoc.expiresAt.toDate().toISOString(),
      snapshot: version.snapshotData,
      estimateStatus,
      acceptedAt,
    });
  } catch (error) {
    logger.error({ error }, "Error resolving portal token");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Customer accepts ─────────────────────────────────────────────────────────

portalRouter.post("/:token/accept", async (req, res): Promise<void> => {
  try {
    const tokenDoc = await getValidToken(req.params.token, res);
    if (!tokenDoc) return;

    const parsed = CustomerAcceptBody.safeParse(req.body);
    const selectedOptionalIds = new Set(parsed.success ? parsed.data.selectedOptionalIds : []);

    await getPortalRepository().recordAction({
      estimateId: tokenDoc.estimateId,
      versionId: tokenDoc.versionId,
      tokenId: tokenDoc.id,
      action: "accept",
      payload: { selectedOptionalIds: [...selectedOptionalIds] },
    });

    await getEstimatesRepository().transitionStatus(tokenDoc.estimateId, "accepted");

    // Notify staff with full accepted item breakdown
    const version = await getEstimateVersionsRepository().getVersion(tokenDoc.versionId);
    if (version?.snapshotData) {
      const snap = version.snapshotData as {
        estimate?: { title?: string; customerName?: string; taxRate?: number; depositPct?: number };
        sections?: { id: string; title: string; position: number }[];
        items?: { id: string; sectionId: string; description: string; qty: number; unit: string; isOptional: boolean; isVisibleToCustomer: boolean; lineTotal?: number; position: number }[];
        totals?: { discountAmount?: number };
      };

      const allItems = snap.items ?? [];
      // Include internal/hidden items in totals (they are part of the sold scope)
      const acceptedItems = allItems.filter(
        (i) => (!i.isOptional || selectedOptionalIds.has(i.id))
      );
      const subtotal = acceptedItems.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
      const discountAmt = snap.totals?.discountAmount ?? 0;
      const afterDiscount = Math.max(0, subtotal - discountAmt);
      const taxAmt = afterDiscount * ((snap.estimate?.taxRate ?? 0) / 100);
      const grandTotal = afterDiscount + taxAmt;
      const depositAmount = grandTotal * ((snap.estimate?.depositPct ?? 0) / 100);

      sendQuoteAcceptedNotification({
        estimateTitle: snap.estimate?.title ?? "Estimate",
        customerName: snap.estimate?.customerName ?? "Customer",
        customerEmail: tokenDoc.customerEmail,
        grandTotal,
        depositAmount,
        discountAmount: discountAmt,
        taxAmount: taxAmt,
        sections: (snap.sections ?? []).sort((a, b) => a.position - b.position),
        acceptedItems,
      }).catch((err) => logger.error({ err }, "Failed to send acceptance notification"));
    }

    res.json({ success: true, action: "accept" });
  } catch (error) {
    logger.error({ error }, "Error processing quote acceptance");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Customer declines ────────────────────────────────────────────────────────

portalRouter.post("/:token/decline", async (req, res): Promise<void> => {
  try {
    const tokenDoc = await getValidToken(req.params.token, res);
    if (!tokenDoc) return;

    const parsed = CustomerDeclineBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    await getPortalRepository().recordAction({
      estimateId: tokenDoc.estimateId,
      versionId: tokenDoc.versionId,
      tokenId: tokenDoc.id,
      action: "decline",
      payload: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
    });

    await getEstimatesRepository().transitionStatus(tokenDoc.estimateId, "declined");

    sendQuoteActionNotification({
      action: "declined",
      estimateTitle: "Quote",
      customerName: tokenDoc.customerEmail,
      customerEmail: tokenDoc.customerEmail,
      message: parsed.data.reason,
    }).catch((err) => logger.error({ err }, "Failed to send decline notification"));

    res.json({ success: true, action: "decline" });
  } catch (error) {
    logger.error({ error }, "Error processing quote decline");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Customer requests changes ────────────────────────────────────────────────

portalRouter.post("/:token/changes", async (req, res): Promise<void> => {
  try {
    const tokenDoc = await getValidToken(req.params.token, res);
    if (!tokenDoc) return;

    const parsed = CustomerChangesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    await getPortalRepository().recordAction({
      estimateId: tokenDoc.estimateId,
      versionId: tokenDoc.versionId,
      tokenId: tokenDoc.id,
      action: "request_changes",
      payload: { message: parsed.data.message },
    });

    await getEstimatesRepository().transitionStatus(
      tokenDoc.estimateId,
      "revision_requested"
    );

    sendQuoteActionNotification({
      action: "revision_requested",
      estimateTitle: "Quote",
      customerName: tokenDoc.customerEmail,
      customerEmail: tokenDoc.customerEmail,
      message: parsed.data.message,
    }).catch((err) => logger.error({ err }, "Failed to send revision notification"));

    res.json({ success: true, action: "request_changes" });
  } catch (error) {
    logger.error({ error }, "Error processing change request");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Customer comment ─────────────────────────────────────────────────────────

portalRouter.post("/:token/comment", async (req, res): Promise<void> => {
  try {
    const tokenDoc = await getValidToken(req.params.token, res);
    if (!tokenDoc) return;

    const parsed = CustomerCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    await getPortalRepository().recordAction({
      estimateId: tokenDoc.estimateId,
      versionId: tokenDoc.versionId,
      tokenId: tokenDoc.id,
      action: "comment",
      payload: { message: parsed.data.message },
    });

    sendQuoteActionNotification({
      action: "comment",
      estimateTitle: "Quote",
      customerName: tokenDoc.customerEmail,
      customerEmail: tokenDoc.customerEmail,
      message: parsed.data.message,
    }).catch((err) => logger.error({ err }, "Failed to send comment notification"));

    res.json({ success: true, action: "comment" });
  } catch (error) {
    logger.error({ error }, "Error recording customer comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getValidToken(
  token: string,
  res: import("express").Response
): Promise<import("../db").PortalTokenDoc | null> {
  const tokenDoc = await getPortalRepository().resolveToken(token);
  if (!tokenDoc) {
    res.status(404).json({ error: "Quote not found" });
    return null;
  }
  if (tokenDoc.isRevoked) {
    res.status(410).json({ error: "This quote link has been revoked" });
    return null;
  }
  if ((tokenDoc.expiresAt as admin.firestore.Timestamp).toDate() < new Date()) {
    res.status(410).json({ error: "This quote link has expired" });
    return null;
  }
  return tokenDoc;
}
