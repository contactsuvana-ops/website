import { Router, type IRouter } from "express";
import { getDiscussionsRepository } from "../db";
import {
  CreateDiscussionBody,
  UpdateDiscussionBody,
  AddDiscussionCommentBody,
} from "../validation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// List discussions — optionally filter by projectId
router.get("/", async (req, res): Promise<void> => {
  try {
    const projectId = req.query["projectId"]
      ? String(req.query["projectId"])
      : undefined;
    const repo = getDiscussionsRepository();
    const discussions = await repo.listDiscussions({ projectId });
    res.json(discussions);
  } catch (error) {
    logger.error({ error }, "Error listing discussions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create discussion
router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateDiscussionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getDiscussionsRepository();
    const discussion = await repo.createDiscussion({
      title: parsed.data.title,
      content: parsed.data.content,
      projectId: parsed.data.projectId,
      pinned: parsed.data.pinned ?? false,
      tags: parsed.data.tags ?? [],
      createdBy: "admin",
    });
    res.status(201).json(discussion);
  } catch (error) {
    logger.error({ error }, "Error creating discussion");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single discussion with its comments
router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getDiscussionsRepository();
    const [discussion, comments] = await Promise.all([
      repo.getDiscussion(id),
      repo.getComments(id),
    ]);
    if (!discussion) {
      res.status(404).json({ error: "Discussion not found" });
      return;
    }
    res.json({ ...discussion, comments });
  } catch (error) {
    logger.error({ error }, "Error fetching discussion");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update discussion
router.put("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const parsed = UpdateDiscussionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getDiscussionsRepository();
    const existing = await repo.getDiscussion(id);
    if (!existing) {
      res.status(404).json({ error: "Discussion not found" });
      return;
    }
    await repo.updateDiscussion(id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating discussion");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete discussion
router.delete("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getDiscussionsRepository();
    const existing = await repo.getDiscussion(id);
    if (!existing) {
      res.status(404).json({ error: "Discussion not found" });
      return;
    }
    await repo.deleteDiscussion(id);
    res.sendStatus(204);
  } catch (error) {
    logger.error({ error }, "Error deleting discussion");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add comment to discussion
router.post("/:id/comments", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const parsed = AddDiscussionCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getDiscussionsRepository();
    const existing = await repo.getDiscussion(id);
    if (!existing) {
      res.status(404).json({ error: "Discussion not found" });
      return;
    }
    const comment = await repo.addComment(id, {
      content: parsed.data.content,
      createdBy: "admin",
    });
    res.status(201).json(comment);
  } catch (error) {
    logger.error({ error }, "Error adding discussion comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete comment from discussion
router.delete("/:id/comments/:commentId", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const commentId = String(req.params["commentId"]);
    const repo = getDiscussionsRepository();
    const [existing, comments] = await Promise.all([
      repo.getDiscussion(id),
      repo.getComments(id),
    ]);
    if (!existing) {
      res.status(404).json({ error: "Discussion not found" });
      return;
    }
    if (!comments.find((c) => c.id === commentId)) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    await repo.deleteComment(id, commentId);
    res.sendStatus(204);
  } catch (error) {
    logger.error({ error }, "Error deleting discussion comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
