import { Router, type IRouter } from "express";
import { getSubmissionsRepository } from "../db";
import { AddCommentBody } from "../validation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /admin/submissions/:id/comments
router.get("/:id/comments", async (req, res): Promise<void> => {
  try {
    const submissionId = String(req.params["id"]).trim();
    const repository = getSubmissionsRepository();
    const submission = await repository.getSubmission(submissionId);
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    const comments = await repository.getComments(submissionId);
    res.json(comments);
  } catch (error) {
    logger.error({ error }, "Error fetching comments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/submissions/:id/comments
router.post("/:id/comments", async (req, res): Promise<void> => {
  try {
    const submissionId = String(req.params["id"]).trim();
    const parsed = AddCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const repository = getSubmissionsRepository();
    const submission = await repository.getSubmission(submissionId);
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const comment = await repository.addComment(submissionId, {
      content: parsed.data.content,
      isShared: parsed.data.isShared ?? false,
    });

    req.log.info({ submissionId, commentId: comment.id }, "Comment added");
    res.status(201).json(comment);
  } catch (error) {
    logger.error({ error }, "Error adding comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/submissions/:id/comments/:commentId
router.delete("/:id/comments/:commentId", async (req, res): Promise<void> => {
  try {
    const submissionId = String(req.params["id"]).trim();
    const commentId = String(req.params["commentId"]).trim();

    const repository = getSubmissionsRepository();
    const submission = await repository.getSubmission(submissionId);
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const comments = await repository.getComments(submissionId);
    if (!comments.find((c) => c.id === commentId)) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    await repository.deleteComment(submissionId, commentId);
    res.sendStatus(204);
  } catch (error) {
    logger.error({ error }, "Error deleting comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
