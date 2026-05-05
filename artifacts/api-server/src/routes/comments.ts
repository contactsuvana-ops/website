import { Router, type IRouter } from "express";
import { db, submissionsTable, submissionCommentsTable } from "@workspace/db";
import { AddCommentBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/submissions/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid submission id" }); return; }

  const [submission] = await db.select({ id: submissionsTable.id }).from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  const comments = await db
    .select()
    .from(submissionCommentsTable)
    .where(eq(submissionCommentsTable.submissionId, id))
    .orderBy(submissionCommentsTable.createdAt);

  res.json(comments);
});

router.post("/submissions/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid submission id" }); return; }

  const [submission] = await db.select({ id: submissionsTable.id }).from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  const parsed = AddCommentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [comment] = await db
    .insert(submissionCommentsTable)
    .values({
      submissionId: id,
      content: parsed.data.content,
      isShared: parsed.data.isShared ?? false,
    })
    .returning();

  req.log.info({ submissionId: id, commentId: comment.id }, "Comment added");
  res.status(201).json(comment);
});

router.delete("/submissions/:id/comments/:commentId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawCid = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;
  const id = parseInt(rawId, 10);
  const commentId = parseInt(rawCid, 10);
  if (isNaN(id) || isNaN(commentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(submissionCommentsTable)
    .where(and(eq(submissionCommentsTable.id, commentId), eq(submissionCommentsTable.submissionId, id)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Comment not found" }); return; }

  res.sendStatus(204);
});

export default router;
