import { Router, type IRouter } from "express";
import { getSubmissionsRepository } from "../db";
import { AddCommentBody } from "../validation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/submissions/:id/comments", async (req, res): Promise<void> => {
  try {
    const submissionId = String(req.params.id).trim();
    if (!submissionId) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }

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

router.post("/submissions/:id/comments", async (req, res): Promise<void> => {
  try {
    const submissionId = String(req.params.id).trim();
    if (!submissionId) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }

    const parsed = AddCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
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

router.delete("/submissions/:id/comments/:commentId", async (req, res): Promise<void> => {
  try {
    const submissionId = String(req.params.id).trim();
    const commentId = String(req.params.commentId).trim();

    if (!submissionId || !commentId) {
      res.status(400).json({ error: "Invalid ids" });
      return;
    }

    const repository = getSubmissionsRepository();

    // Verify submission exists
    const submission = await repository.getSubmission(submissionId);
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Verify comment exists and belongs to this submission
    const comments = await repository.getComments(submissionId);
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    // Delete individual comment
    const batch = require("firebase-admin").firestore().batch();
    const db = require("firebase-admin").firestore();
    batch.delete(db.collection("comments").doc(commentId));
    await batch.commit();

    res.sendStatus(204);
  } catch (error) {
    logger.error({ error }, "Error deleting comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
