import { z } from "zod";

// ─── Health ───────────────────────────────────────────────────────────────────

export const HealthCheckResponse = z.object({
  status: z.literal("ok"),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponse>;

// ─── Public forms ─────────────────────────────────────────────────────────────

export const SubmitQuoteBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  projectType: z.string().min(1, "Project type is required"),
  location: z.string().min(1, "Location is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  companyName: z.string().optional(),
  honeypot: z.string().optional(),
});
export type SubmitQuoteBody = z.infer<typeof SubmitQuoteBody>;

export const SubmitContactBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  honeypot: z.string().optional(),
});
export type SubmitContactBody = z.infer<typeof SubmitContactBody>;

// ─── Admin auth ───────────────────────────────────────────────────────────────

export const AdminAuth = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type AdminAuth = z.infer<typeof AdminAuth>;

// ─── Submissions (admin) ──────────────────────────────────────────────────────

export const GetSubmissionsQueryParams = z.object({
  type: z.enum(["quote", "contact", "all"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetSubmissionsQueryParams = z.infer<typeof GetSubmissionsQueryParams>;

// ─── Comments on submissions ──────────────────────────────────────────────────

export const AddCommentBody = z.object({
  content: z.string().min(1, "Comment content is required"),
  isShared: z.boolean().optional(),
});
export type AddCommentBody = z.infer<typeof AddCommentBody>;

// ─── Projects ─────────────────────────────────────────────────────────────────

export const CreateProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid client email is required"),
  submissionId: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
});
export type CreateProjectBody = z.infer<typeof CreateProjectBody>;

export const UpdateProjectBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  status: z.enum(["active", "completed"]).optional(),
});
export type UpdateProjectBody = z.infer<typeof UpdateProjectBody>;

// ─── Discussions ──────────────────────────────────────────────────────────────

export const CreateDiscussionBody = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  projectId: z.string().optional(),
  pinned: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});
export type CreateDiscussionBody = z.infer<typeof CreateDiscussionBody>;

export const UpdateDiscussionBody = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  projectId: z.string().optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateDiscussionBody = z.infer<typeof UpdateDiscussionBody>;

export const AddDiscussionCommentBody = z.object({
  content: z.string().min(1, "Comment content is required"),
});
export type AddDiscussionCommentBody = z.infer<typeof AddDiscussionCommentBody>;

// ─── Case Studies ─────────────────────────────────────────────────────────────

export const CreateCaseStudyBody = z.object({
  title: z.string().min(1, "Title is required"),
  clientName: z.string().min(1, "Client name is required"),
  industry: z.string().optional(),
  projectId: z.string().min(1, "Project ID is required"),
  summary: z.string().min(1, "Summary is required"),
  challenge: z.string().min(1, "Challenge is required"),
  solution: z.string().min(1, "Solution is required"),
  results: z.array(z.string()).min(1, "At least one result is required"),
  technologies: z.array(z.string()).optional().default([]),
  mediaIds: z.array(z.string()).optional().default([]),
  coverImageId: z.string().optional(),
});
export type CreateCaseStudyBody = z.infer<typeof CreateCaseStudyBody>;

export const UpdateCaseStudyBody = z.object({
  title: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  industry: z.string().optional(),
  summary: z.string().min(1).optional(),
  challenge: z.string().min(1).optional(),
  solution: z.string().min(1).optional(),
  results: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
  coverImageId: z.string().optional(),
});
export type UpdateCaseStudyBody = z.infer<typeof UpdateCaseStudyBody>;
