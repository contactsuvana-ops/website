import { Router, type IRouter } from "express";
import type admin from "firebase-admin";
import { getSubmissionsRepository, type SubmissionDoc } from "../db";
import { GetSubmissionsQueryParams } from "../validation";
import { logger } from "../lib/logger";

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string {
  if (!ts) return new Date(0).toISOString();
  return ts.toDate().toISOString();
}

function toApiSubmission(doc: SubmissionDoc) {
  return { ...doc, createdAt: tsToIso(doc.createdAt) };
}

const router: IRouter = Router();

// GET /admin/submissions
router.get("/", async (req, res): Promise<void> => {
  try {
    const parsed = GetSubmissionsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { type, page, limit } = parsed.data;
    const repository = getSubmissionsRepository();
    const { items, total } = await repository.listSubmissions({
      type: type ?? "all",
      page,
      limit,
      excludeConverted: true,
    });

    res.json({ submissions: items.map(toApiSubmission), total, page, limit });
  } catch (error) {
    logger.error({ error }, "Error fetching submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/submissions/stats
router.get("/stats", async (req, res): Promise<void> => {
  try {
    const repository = getSubmissionsRepository();
    const stats = await repository.getSubmissionStats();
    res.json({
      totalContacts: stats.contact,
      totalQuotes: stats.quote,
      recentSubmissions: stats.recentCount,
      byProjectType: stats.byProjectType,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching submission stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/submissions/:id
router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]).trim();
    const repository = getSubmissionsRepository();
    const submission = await repository.getSubmission(id);
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    res.json(submission);
  } catch (error) {
    logger.error({ error }, "Error fetching submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/submissions/:id/status
router.patch("/:id/status", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]).trim();
    const { status } = req.body as { status?: string };
    if (!["new", "viewed", "converted"].includes(status ?? "")) {
      res.status(400).json({ error: "Invalid status. Must be new, viewed, or converted." });
      return;
    }
    const repository = getSubmissionsRepository();
    await repository.updateSubmissionStatus(id, status as "new" | "viewed" | "converted");
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating submission status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
