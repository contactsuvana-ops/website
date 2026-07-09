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
  recaptchaToken: z.string().min(1, "reCAPTCHA token is required"),
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
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).optional(),
  propertyAddress: z.string().optional(),
  contractValue: z.number().min(0).optional(),
  startTarget: z.string().datetime({ offset: true }).optional(),
  completionTarget: z.string().datetime({ offset: true }).optional(),
  assignedPM: z.string().optional(),
  crewIds: z.array(z.string()).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  tags: z.array(z.string()).optional(),
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

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const CreateCatalogCategoryBody = z.object({
  name: z.string().min(1, "Name is required"),
  parentId: z.string().optional(),
  position: z.number().int().min(0).default(0),
});
export type CreateCatalogCategoryBody = z.infer<typeof CreateCatalogCategoryBody>;

export const UpdateCatalogCategoryBody = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateCatalogCategoryBody = z.infer<typeof UpdateCatalogCategoryBody>;

const pricingModel = z.enum(["fixed", "unit", "formula"]);

export const CreateCatalogItemBody = z.object({
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  unit: z.string().default(""),
  pricingModel: pricingModel.default("unit"),
  laborUnitPrice: z.number().min(0).default(0),
  materialUnitPrice: z.number().min(0).default(0),
  defaultMarkupPct: z.number().min(0).max(200).default(20),
  minimumCharge: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateCatalogItemBody = z.infer<typeof CreateCatalogItemBody>;

export const UpdateCatalogItemBody = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  pricingModel: pricingModel.optional(),
  laborUnitPrice: z.number().min(0).optional(),
  materialUnitPrice: z.number().min(0).optional(),
  defaultMarkupPct: z.number().min(0).max(200).optional(),
  minimumCharge: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});
export type UpdateCatalogItemBody = z.infer<typeof UpdateCatalogItemBody>;

export const GetCatalogItemsQuery = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
export type GetCatalogItemsQuery = z.infer<typeof GetCatalogItemsQuery>;

// ─── Opportunities ────────────────────────────────────────────────────────────

export const CreateOpportunityBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  projectType: z.string().optional(),
  location: z.string().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  description: z.string().optional(),
  submissionId: z.string().optional(),
});
export type CreateOpportunityBody = z.infer<typeof CreateOpportunityBody>;

export const UpdateOpportunityBody = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  projectType: z.string().optional(),
  location: z.string().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["new", "assigned", "estimating", "quoted", "closed"]).optional(),
  assignedTo: z.string().optional(),
});
export type UpdateOpportunityBody = z.infer<typeof UpdateOpportunityBody>;

export const GetOpportunitiesQuery = z.object({
  status: z.enum(["new", "assigned", "estimating", "quoted", "closed", "all"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetOpportunitiesQuery = z.infer<typeof GetOpportunitiesQuery>;

// ─── Estimates ────────────────────────────────────────────────────────────────

export const CreateEstimateBody = z.object({
  title: z.string().min(1, "Title is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  customerPhone: z.string().optional(),
  projectAddress: z.string().optional(),
  description: z.string().optional(),
  opportunityId: z.string().optional(),
  taxRate: z.number().min(0).max(30).default(0),
  markupPct: z.number().min(0).max(200).default(20),
  depositPct: z.number().min(0).max(100).default(30),
});
export type CreateEstimateBody = z.infer<typeof CreateEstimateBody>;

export const UpdateEstimateBody = z.object({
  title: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  projectAddress: z.string().optional(),
  description: z.string().optional(),
  taxRate: z.number().min(0).max(30).optional(),
  markupPct: z.number().min(0).max(200).optional(),
  depositPct: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  validUntil: z.string().datetime({ offset: true }).optional(),
  internalNotes: z.string().optional(),
});
export type UpdateEstimateBody = z.infer<typeof UpdateEstimateBody>;

export const GetEstimatesQuery = z.object({
  status: z.enum([
    "draft", "reviewing", "ready_to_send", "sent", "viewed",
    "accepted", "declined", "revision_requested", "expired",
    "converted_to_project", "all",
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetEstimatesQuery = z.infer<typeof GetEstimatesQuery>;

export const TransitionEstimateBody = z.object({
  status: z.enum([
    "draft", "reviewing", "ready_to_send", "sent", "viewed",
    "accepted", "declined", "revision_requested", "expired",
    "converted_to_project",
  ]),
  note: z.string().optional(),
});
export type TransitionEstimateBody = z.infer<typeof TransitionEstimateBody>;

export const CreateEstimateSectionBody = z.object({
  title: z.string().min(1, "Section title is required"),
  position: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});
export type CreateEstimateSectionBody = z.infer<typeof CreateEstimateSectionBody>;

export const UpdateEstimateSectionBody = z.object({
  title: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});
export type UpdateEstimateSectionBody = z.infer<typeof UpdateEstimateSectionBody>;

export const ReorderSectionsBody = z.object({
  orderedIds: z.array(z.string()).min(1),
});
export type ReorderSectionsBody = z.infer<typeof ReorderSectionsBody>;

export const CreateLineItemBody = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  catalogItemId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  qty: z.number().min(0).default(1),
  unit: z.string().default(""),
  laborUnitPrice: z.number().min(0).default(0),
  materialUnitPrice: z.number().min(0).default(0),
  markupPct: z.number().min(0).max(200).default(20),
  discountPct: z.number().min(0).max(100).optional(),
  isOptional: z.boolean().default(false),
  isVisibleToCustomer: z.boolean().default(true),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  position: z.number().int().min(0).default(0),
});
export type CreateLineItemBody = z.infer<typeof CreateLineItemBody>;

export const UpdateLineItemBody = z.object({
  sectionId: z.string().optional(),
  description: z.string().min(1).optional(),
  qty: z.number().min(0).optional(),
  unit: z.string().optional(),
  laborUnitPrice: z.number().min(0).optional(),
  materialUnitPrice: z.number().min(0).optional(),
  markupPct: z.number().min(0).max(200).optional(),
  discountPct: z.number().min(0).max(100).optional(),
  isOptional: z.boolean().optional(),
  isVisibleToCustomer: z.boolean().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateLineItemBody = z.infer<typeof UpdateLineItemBody>;

export const ReorderLineItemsBody = z.object({
  updates: z.array(z.object({
    id: z.string(),
    position: z.number().int().min(0),
    sectionId: z.string().optional(),
  })).min(1),
});
export type ReorderLineItemsBody = z.infer<typeof ReorderLineItemsBody>;

export const SendEstimateBody = z.object({
  message: z.string().optional(),
  validDays: z.number().int().min(1).max(365).default(30),
  changeSummary: z.string().optional(),
});
export type SendEstimateBody = z.infer<typeof SendEstimateBody>;

// ─── Customer portal ──────────────────────────────────────────────────────────

export const CustomerAcceptBody = z.object({
  selectedOptionalIds: z.array(z.string()).optional().default([]),
});
export type CustomerAcceptBody = z.infer<typeof CustomerAcceptBody>;

export const CustomerDeclineBody = z.object({
  reason: z.string().optional(),
});
export type CustomerDeclineBody = z.infer<typeof CustomerDeclineBody>;

export const CustomerChangesBody = z.object({
  message: z.string().min(1, "Message is required"),
});
export type CustomerChangesBody = z.infer<typeof CustomerChangesBody>;

export const CustomerCommentBody = z.object({
  message: z.string().min(1, "Message is required"),
});
export type CustomerCommentBody = z.infer<typeof CustomerCommentBody>;

// ─── Customers ────────────────────────────────────────────────────────────────

const customerContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const customerPropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateCustomerBody = z.object({
  displayName: z.string().min(1, "Display name is required"),
  companyName: z.string().optional(),
  status: z.enum(["active", "inactive", "vip"]).default("active"),
  contacts: z.array(customerContactSchema).default([]),
  properties: z.array(customerPropertySchema).default([]),
  tags: z.array(z.string()).default([]),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  sourceEstimateId: z.string().optional(),
  sourceOpportunityId: z.string().optional(),
});
export type CreateCustomerBody = z.infer<typeof CreateCustomerBody>;

export const UpdateCustomerBody = z.object({
  displayName: z.string().min(1).optional(),
  companyName: z.string().optional(),
  status: z.enum(["active", "inactive", "vip"]).optional(),
  contacts: z.array(customerContactSchema).optional(),
  properties: z.array(customerPropertySchema).optional(),
  tags: z.array(z.string()).optional(),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
});
export type UpdateCustomerBody = z.infer<typeof UpdateCustomerBody>;

export const GetCustomersQuery = z.object({
  status: z.enum(["active", "inactive", "vip", "all"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetCustomersQuery = z.infer<typeof GetCustomersQuery>;

// ─── Project Milestones ───────────────────────────────────────────────────────

export const CreateMilestoneBody = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "blocked", "skipped"]).default("not_started"),
  position: z.number().int().min(0).default(0),
  targetDate: z.string().datetime({ offset: true }).optional(),
  dependsOn: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type CreateMilestoneBody = z.infer<typeof CreateMilestoneBody>;

export const UpdateMilestoneBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "blocked", "skipped"]).optional(),
  position: z.number().int().min(0).optional(),
  targetDate: z.string().datetime({ offset: true }).optional(),
  dependsOn: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type UpdateMilestoneBody = z.infer<typeof UpdateMilestoneBody>;

export const ReorderMilestonesBody = z.object({
  orderedIds: z.array(z.string()).min(1),
});
export type ReorderMilestonesBody = z.infer<typeof ReorderMilestonesBody>;

// ─── Project Charters ─────────────────────────────────────────────────────────

const charterMilestoneRefSchema = z.object({
  title: z.string().min(1),
  targetDate: z.string().optional(),
  description: z.string().optional(),
});

export const UpdateCharterBody = z.object({
  summary: z.string().optional(),
  customerSummary: z.string().optional(),
  scopeSummary: z.string().optional(),
  assumptions: z.string().optional(),
  constraints: z.string().optional(),
  risks: z.string().optional(),
  successCriteria: z.string().optional(),
  communicationPlan: z.string().optional(),
  teamAssignments: z.string().optional(),
  milestones: z.array(charterMilestoneRefSchema).optional(),
  approvals: z.string().optional(),
});
export type UpdateCharterBody = z.infer<typeof UpdateCharterBody>;

// ─── Project Sections (WBS) ───────────────────────────────────────────────────

export const CreateProjectSectionBody = z.object({
  title: z.string().min(1, "Title is required"),
  position: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});
export type CreateProjectSectionBody = z.infer<typeof CreateProjectSectionBody>;

export const UpdateProjectSectionBody = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  isCollapsed: z.boolean().optional(),
});
export type UpdateProjectSectionBody = z.infer<typeof UpdateProjectSectionBody>;

export const ReorderProjectSectionsBody = z.object({
  orderedIds: z.array(z.string()).min(1),
});
export type ReorderProjectSectionsBody = z.infer<typeof ReorderProjectSectionsBody>;

// ─── Project Tasks (WBS) ──────────────────────────────────────────────────────

const taskStatusEnum = z.enum(["not_started", "ready", "in_progress", "blocked", "inspection_pending", "approved", "done", "cancelled"]);
const taskPriorityEnum = z.enum(["low", "normal", "high", "urgent"]);

export const CreateTaskBody = z.object({
  sectionId: z.string().optional(),
  parentTaskId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: taskStatusEnum.default("not_started"),
  priority: taskPriorityEnum.default("normal"),
  assignedTo: z.array(z.string()).default([]),
  assignedCrewId: z.string().optional(),
  plannedStartDate: z.string().datetime({ offset: true }).optional(),
  plannedEndDate: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().min(0).optional(),
  dependsOn: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  position: z.number().int().min(0).default(0),
});
export type CreateTaskBody = z.infer<typeof CreateTaskBody>;

export const UpdateTaskBody = z.object({
  sectionId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assignedTo: z.array(z.string()).optional(),
  assignedCrewId: z.string().optional(),
  plannedStartDate: z.string().datetime({ offset: true }).optional(),
  plannedEndDate: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  dependsOn: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateTaskBody = z.infer<typeof UpdateTaskBody>;

export const ReorderTasksBody = z.object({
  updates: z.array(z.object({
    id: z.string(),
    position: z.number().int().min(0),
    sectionId: z.string().optional(),
  })).min(1),
});
export type ReorderTasksBody = z.infer<typeof ReorderTasksBody>;

// ─── Daily Logs ───────────────────────────────────────────────────────────────

const dailyLogCrewEntrySchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  hours: z.number().min(0),
});

export const CreateDailyLogBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  weather: z.string().optional(),
  temperature: z.string().optional(),
  completedWork: z.string().min(1, "Completed work is required"),
  crew: z.array(dailyLogCrewEntrySchema).default([]),
  totalHours: z.number().min(0).default(0),
  materials: z.string().optional(),
  issues: z.string().optional(),
  delays: z.string().optional(),
  safetyNotes: z.string().optional(),
  inspectionNotes: z.string().optional(),
  generalNotes: z.string().optional(),
  photoIds: z.array(z.string()).default([]),
});
export type CreateDailyLogBody = z.infer<typeof CreateDailyLogBody>;

export const UpdateDailyLogBody = z.object({
  weather: z.string().optional(),
  temperature: z.string().optional(),
  completedWork: z.string().min(1).optional(),
  crew: z.array(dailyLogCrewEntrySchema).optional(),
  totalHours: z.number().min(0).optional(),
  materials: z.string().optional(),
  issues: z.string().optional(),
  delays: z.string().optional(),
  safetyNotes: z.string().optional(),
  inspectionNotes: z.string().optional(),
  generalNotes: z.string().optional(),
  photoIds: z.array(z.string()).optional(),
});
export type UpdateDailyLogBody = z.infer<typeof UpdateDailyLogBody>;

// ─── Crews ────────────────────────────────────────────────────────────────────

export const CreateCrewBody = z.object({
  name: z.string().min(1, "Name is required"),
  leadMemberId: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});
export type CreateCrewBody = z.infer<typeof CreateCrewBody>;

export const UpdateCrewBody = z.object({
  name: z.string().min(1).optional(),
  leadMemberId: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCrewBody = z.infer<typeof UpdateCrewBody>;

export const CreateCrewMemberBody = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(["lead", "laborer", "specialist", "apprentice"]).default("laborer"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  specialties: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});
export type CreateCrewMemberBody = z.infer<typeof CreateCrewMemberBody>;

export const UpdateCrewMemberBody = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["lead", "laborer", "specialist", "apprentice"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  specialties: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
