/**
 * Submission Types and Zod Schemas
 * Production-ready schemas for form submissions
 */

import { z } from "zod/v4";

// Enums for submission types
export const SubmissionType = {
  CONTACT: "contact",
  QUOTE: "quote",
} as const;

export const ProjectType = {
  KITCHEN_REMODELING: "kitchen-remodeling",
  DRYWALL: "drywall",
  PLUMBING: "plumbing",
  ELECTRICAL: "electrical",
  FLOORING: "flooring",
  FIREPLACE: "fireplace",
  BASEMENT: "basement",
  PAINTING: "painting",
  REMODELING: "remodeling",
  HANDYMAN: "handyman",
} as const;

export const BudgetRange = {
  UNDER_5K: "under-5k",
  RANGE_5K_15K: "5k-15k",
  RANGE_15K_50K: "15k-50k",
  RANGE_50K_100K: "50k-100k",
  OVER_100K: "over-100k",
  NOT_SURE: "not-sure",
} as const;

export const TimelineRange = {
  ASAP: "asap",
  RANGE_1_3_MONTHS: "1-3-months",
  RANGE_3_6_MONTHS: "3-6-months",
  RANGE_6_12_MONTHS: "6-12-months",
  FLEXIBLE: "flexible",
} as const;

// Zod schemas
export const submissionTypeSchema = z.enum([
  SubmissionType.CONTACT,
  SubmissionType.QUOTE,
]);

export const projectTypeSchema = z.enum([
  ProjectType.KITCHEN_REMODELING,
  ProjectType.DRYWALL,
  ProjectType.PLUMBING,
  ProjectType.ELECTRICAL,
  ProjectType.FLOORING,
  ProjectType.FIREPLACE,
  ProjectType.BASEMENT,
  ProjectType.PAINTING,
  ProjectType.REMODELING,
  ProjectType.HANDYMAN,
]);

export const budgetRangeSchema = z.enum([
  BudgetRange.UNDER_5K,
  BudgetRange.RANGE_5K_15K,
  BudgetRange.RANGE_15K_50K,
  BudgetRange.RANGE_50K_100K,
  BudgetRange.OVER_100K,
  BudgetRange.NOT_SURE,
]);

export const timelineRangeSchema = z.enum([
  TimelineRange.ASAP,
  TimelineRange.RANGE_1_3_MONTHS,
  TimelineRange.RANGE_3_6_MONTHS,
  TimelineRange.RANGE_6_12_MONTHS,
  TimelineRange.FLEXIBLE,
]);

// Base submission schema (shared fields)
const baseSubmissionSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  message: z.string().min(1).max(5000),
});

// Insert schemas (without id and createdAt)
export const insertContactSubmissionSchema = baseSubmissionSchema.extend({
  type: z.literal(SubmissionType.CONTACT),
});

export const insertQuoteSubmissionSchema = baseSubmissionSchema.extend({
  type: z.literal(SubmissionType.QUOTE),
  projectType: projectTypeSchema.nullable(),
  location: z.string().max(255).nullable(),
  budget: budgetRangeSchema.nullable(),
  timeline: timelineRangeSchema.nullable(),
});

export const insertSubmissionSchema = z.discriminatedUnion("type", [
  insertContactSubmissionSchema,
  insertQuoteSubmissionSchema,
]);

// Full submission schema (with id and createdAt)
export const submissionSchema = z.object({
  id: z.string(),
  type: z.enum(["contact", "quote"]),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  projectType: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  message: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// Firestore submission document type
export interface SubmissionDocument {
  id: string;
  type: "contact" | "quote";
  name: string;
  email: string;
  phone: string;
  projectType?: string | null;
  location?: string | null;
  budget?: string | null;
  timeline?: string | null;
  message: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Comment schema
export const insertCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  isShared: z.boolean().default(false),
});

export const commentSchema = insertCommentSchema.extend({
  id: z.string(),
  submissionId: z.string(),
  createdAt: z.date(),
});

export interface CommentDocument {
  id: string;
  submissionId: string;
  content: string;
  isShared: boolean;
  createdAt: Date;
}

// Stats response schema
export const submissionStatsSchema = z.object({
  totalContacts: z.number(),
  totalQuotes: z.number(),
  recentSubmissions: z.number(),
  byProjectType: z.array(
    z.object({
      projectType: z.string(),
      count: z.number(),
    }),
  ),
});

// Type exports
export type SubmissionType = z.infer<typeof submissionTypeSchema>;
export type ProjectType = z.infer<typeof projectTypeSchema>;
export type BudgetRange = z.infer<typeof budgetRangeSchema>;
export type TimelineRange = z.infer<typeof timelineRangeSchema>;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type InsertQuoteSubmission = z.infer<typeof insertQuoteSubmissionSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type SubmissionStats = z.infer<typeof submissionStatsSchema>;
