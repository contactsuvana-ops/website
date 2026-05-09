import { z } from "zod";

// Health check response
export const HealthCheckResponse = z.object({
  status: z.literal("ok"),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponse>;

// Quote submission
export const SubmitQuoteBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  projectType: z.string().min(1, "Project type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  companyName: z.string().optional(),
});

export type SubmitQuoteBody = z.infer<typeof SubmitQuoteBody>;

// Contact submission
export const SubmitContactBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type SubmitContactBody = z.infer<typeof SubmitContactBody>;

// Get submissions query parameters
export const GetSubmissionsQueryParams = z.object({
  type: z.enum(["quote", "contact"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type GetSubmissionsQueryParams = z.infer<typeof GetSubmissionsQueryParams>;

// Admin authentication
export const AdminAuth = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type AdminAuth = z.infer<typeof AdminAuth>;

// Comment on submission
export const AddCommentBody = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  comment: z.string().min(1, "Comment is required"),
});

export type AddCommentBody = z.infer<typeof AddCommentBody>;
