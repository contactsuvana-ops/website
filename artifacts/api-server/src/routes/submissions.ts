import { Router, type IRouter } from "express";
import { getSubmissionsRepository } from "../db";
import { GetSubmissionsQueryParams } from "../validation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/submissions", async (req, res): Promise<void> => {
  try {
    const parsed = GetSubmissionsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { type, page, limit } = parsed.data;
    const repository = getSubmissionsRepository();

    const { submissions, total } = await repository.listSubmissions({
      type: type ?? "all",
      page: page ?? 1,
      limit: limit ?? 20,
    });

    res.json({
      submissions,
      total,
      page: page ?? 1,
      limit: limit ?? 20,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/submissions/stats", async (req, res): Promise<void> => {
  try {
    const repository = getSubmissionsRepository();
    const stats = await repository.getSubmissionStats();
    res.json(stats);
  } catch (error) {
    logger.error({ error }, "Error fetching submission stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
