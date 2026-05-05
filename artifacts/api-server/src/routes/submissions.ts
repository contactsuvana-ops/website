import { Router, type IRouter } from "express";
import { db, submissionsTable } from "@workspace/db";
import { GetSubmissionsQueryParams } from "@workspace/api-zod";
import { eq, count, sql, desc, and, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/submissions", async (req, res): Promise<void> => {
  const parsed = GetSubmissionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, page, limit } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 20);
  const take = limit ?? 20;

  const whereClause =
    type && type !== "all"
      ? eq(submissionsTable.type, type as "contact" | "quote")
      : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(submissionsTable)
      .where(whereClause)
      .orderBy(desc(submissionsTable.createdAt))
      .limit(take)
      .offset(offset),
    db
      .select({ count: count() })
      .from(submissionsTable)
      .where(whereClause),
  ]);

  res.json({
    submissions: rows,
    total: Number(totalResult[0]?.count ?? 0),
    page: page ?? 1,
    limit: take,
  });
});

router.get("/submissions/stats", async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [contactCount, quoteCount, recentCount, byProjectType] = await Promise.all([
    db
      .select({ count: count() })
      .from(submissionsTable)
      .where(eq(submissionsTable.type, "contact")),
    db
      .select({ count: count() })
      .from(submissionsTable)
      .where(eq(submissionsTable.type, "quote")),
    db
      .select({ count: count() })
      .from(submissionsTable)
      .where(gte(submissionsTable.createdAt, thirtyDaysAgo)),
    db
      .select({
        projectType: submissionsTable.projectType,
        count: count(),
      })
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.type, "quote"),
          sql`${submissionsTable.projectType} IS NOT NULL`
        )
      )
      .groupBy(submissionsTable.projectType),
  ]);

  res.json({
    totalContacts: Number(contactCount[0]?.count ?? 0),
    totalQuotes: Number(quoteCount[0]?.count ?? 0),
    recentSubmissions: Number(recentCount[0]?.count ?? 0),
    byProjectType: byProjectType.map((r) => ({
      projectType: r.projectType ?? "unknown",
      count: Number(r.count),
    })),
  });
});

export default router;
