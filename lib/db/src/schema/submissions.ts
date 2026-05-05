import { pgTable, serial, text, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionTypeEnum = pgEnum("submission_type", ["contact", "quote"]);

export const projectTypeEnum = pgEnum("project_type", [
  "kitchen-remodeling",
  "drywall",
  "plumbing",
  "electrical",
  "flooring",
  "fireplace",
  "basement",
  "painting",
  "remodeling",
  "handyman",
]);

export const budgetEnum = pgEnum("budget_range", [
  "under-5k",
  "5k-15k",
  "15k-50k",
  "50k-100k",
  "over-100k",
  "not-sure",
]);

export const timelineEnum = pgEnum("timeline_range", [
  "asap",
  "1-3-months",
  "3-6-months",
  "6-12-months",
  "flexible",
]);

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  type: submissionTypeEnum("type").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  projectType: projectTypeEnum("project_type"),
  location: text("location"),
  budget: budgetEnum("budget"),
  timeline: timelineEnum("timeline"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const submissionCommentsTable = pgTable("submission_comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true });
export const selectSubmissionSchema = createSelectSchema(submissionsTable);
export const insertCommentSchema = createInsertSchema(submissionCommentsTable).omit({ id: true, createdAt: true });
export const selectCommentSchema = createSelectSchema(submissionCommentsTable);

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof submissionCommentsTable.$inferSelect;
