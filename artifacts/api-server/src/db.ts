import admin from "firebase-admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubmissionStatus = "new" | "viewed" | "converted";
export type SubmissionType = "contact" | "quote";

export interface SubmissionDoc {
  id: string;
  type: SubmissionType;
  status: SubmissionStatus;
  name: string;
  email: string;
  phone?: string;
  message: string;
  projectType?: string;
  location?: string;
  budget?: string;
  timeline?: string;
  companyName?: string;
  projectId?: string;
  createdAt: admin.firestore.Timestamp;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectPriority = "low" | "normal" | "high" | "urgent";

export interface ProjectDoc {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  clientName: string;
  clientEmail: string;
  submissionId?: string;
  startDate?: admin.firestore.Timestamp;
  completedDate?: admin.firestore.Timestamp;
  caseStudyId?: string;
  // Phase A
  projectNumber?: string;
  customerId?: string;
  sourceEstimateId?: string;
  sourceEstimateVersion?: number;
  propertyAddress?: string;
  contractValue?: number;
  startTarget?: admin.firestore.Timestamp;
  completionTarget?: admin.firestore.Timestamp;
  assignedPM?: string;
  crewIds?: string[];
  priority?: ProjectPriority;
  tags?: string[];
  scopeId?: string;
  charterId?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface DiscussionDoc {
  id: string;
  title: string;
  content: string;
  projectId?: string;
  pinned: boolean;
  tags: string[];
  createdBy: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface CommentDoc {
  id: string;
  content: string;
  createdBy: string;
  createdAt: admin.firestore.Timestamp;
}

export interface CaseStudyDoc {
  id: string;
  title: string;
  clientName: string;
  industry?: string;
  projectId: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string[];
  technologies: string[];
  mediaIds: string[];
  coverImageId?: string;
  published: boolean;
  publishedAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export type MediaLinkedToType = "project" | "caseStudy" | "discussion";

export interface MediaDoc {
  id: string;
  filename: string;
  originalName: string;
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: admin.firestore.Timestamp;
  linkedTo?: { type: MediaLinkedToType; id: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() {
  return admin.firestore();
}

function toDoc<T extends { id: string }>(
  snap: admin.firestore.DocumentSnapshot
): T {
  return { id: snap.id, ...snap.data() } as unknown as T;
}

// Firestore rejects undefined field values — strip them before any write.
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export function getSubmissionsRepository() {
  const col = db().collection("submissions");

  return {
    async createSubmission(
      data: Omit<SubmissionDoc, "id" | "createdAt" | "status">
    ): Promise<SubmissionDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        status: "new" as SubmissionStatus,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<SubmissionDoc>(snap);
    },

    async getSubmission(id: string): Promise<SubmissionDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<SubmissionDoc>(snap);
    },

    async listSubmissions(opts: {
      type?: SubmissionType | "all";
      page: number;
      limit: number;
      excludeConverted?: boolean;
    }): Promise<{ items: SubmissionDoc[]; total: number }> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (opts.type && opts.type !== "all") {
        query = query.where("type", "==", opts.type);
      }
      if (opts.excludeConverted) {
        query = query.where("status", "in", ["new", "viewed"]);
      }
      const countSnap = await query.count().get();
      const total = countSnap.data().count;

      const offset = (opts.page - 1) * opts.limit;
      const docs = await query.offset(offset).limit(opts.limit).get();
      const items = docs.docs.map((d) => toDoc<SubmissionDoc>(d));
      return { items, total };
    },

    async getSubmissionStats(): Promise<{
      total: number;
      contact: number;
      quote: number;
      new: number;
      viewed: number;
      converted: number;
      recentCount: number;
      byProjectType: { projectType: string; count: number }[];
    }> {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const [totalSnap, contactSnap, quoteSnap, newSnap, viewedSnap, convertedSnap, recentSnap, quoteDocs] =
        await Promise.all([
          col.count().get(),
          col.where("type", "==", "contact").count().get(),
          col.where("type", "==", "quote").count().get(),
          col.where("status", "==", "new").count().get(),
          col.where("status", "==", "viewed").count().get(),
          col.where("status", "==", "converted").count().get(),
          col.where("createdAt", ">=", thirtyDaysAgo).count().get(),
          col.where("type", "==", "quote").select("projectType").get(),
        ]);
      const ptMap = new Map<string, number>();
      quoteDocs.forEach((d) => {
        const pt = d.data()["projectType"] as string | undefined;
        if (pt) ptMap.set(pt, (ptMap.get(pt) ?? 0) + 1);
      });
      return {
        total: totalSnap.data().count,
        contact: contactSnap.data().count,
        quote: quoteSnap.data().count,
        new: newSnap.data().count,
        viewed: viewedSnap.data().count,
        converted: convertedSnap.data().count,
        recentCount: recentSnap.data().count,
        byProjectType: Array.from(ptMap.entries()).map(([projectType, count]) => ({ projectType, count })),
      };
    },

    async updateSubmissionStatus(
      id: string,
      status: SubmissionStatus
    ): Promise<void> {
      await col.doc(id).update({ status });
    },

    async linkSubmissionToProject(
      id: string,
      projectId: string
    ): Promise<void> {
      await col
        .doc(id)
        .update({ projectId, status: "converted" as SubmissionStatus });
    },

    async addComment(
      submissionId: string,
      data: { content: string; isShared?: boolean }
    ): Promise<CommentDoc> {
      const commentRef = col
        .doc(submissionId)
        .collection("comments")
        .doc();
      const commentData = {
        content: data.content,
        isShared: data.isShared ?? false,
        createdBy: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await commentRef.set(commentData);
      const snap = await commentRef.get();
      return toDoc<CommentDoc>(snap);
    },

    async getComments(submissionId: string): Promise<CommentDoc[]> {
      const snap = await col
        .doc(submissionId)
        .collection("comments")
        .orderBy("createdAt", "asc")
        .get();
      return snap.docs.map((d) => toDoc<CommentDoc>(d));
    },

    async deleteComment(
      submissionId: string,
      commentId: string
    ): Promise<void> {
      await col
        .doc(submissionId)
        .collection("comments")
        .doc(commentId)
        .delete();
    },
  };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function getProjectsRepository() {
  const col = db().collection("projects");

  return {
    async createProject(
      data: Omit<ProjectDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<ProjectDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ProjectDoc>(snap);
    },

    async getProject(id: string): Promise<ProjectDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<ProjectDoc>(snap);
    },

    async listProjects(opts?: {
      status?: ProjectStatus | "all";
      page?: number;
      limit?: number;
    }): Promise<{ items: ProjectDoc[]; total: number }> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (opts?.status && opts.status !== "all") {
        query = col.where("status", "==", opts.status).orderBy("createdAt", "desc");
      }
      const countSnap = await query.count().get();
      const total = countSnap.data().count;
      const page = opts?.page ?? 1;
      const limit = opts?.limit ?? 50;
      const offset = (page - 1) * limit;
      const docs = await query.offset(offset).limit(limit).get();
      return { items: docs.docs.map((d) => toDoc<ProjectDoc>(d)), total };
    },

    async updateProject(
      id: string,
      data: Partial<
        Omit<ProjectDoc, "id" | "createdAt" | "updatedAt">
      >
    ): Promise<void> {
      await col
        .doc(id)
        .update(stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData);
    },

    async completeProject(id: string): Promise<void> {
      await col.doc(id).update({
        status: "completed" as ProjectStatus,
        completedDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },

    async linkCaseStudy(id: string, caseStudyId: string): Promise<void> {
      await col.doc(id).update({
        caseStudyId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

// ─── Discussions ──────────────────────────────────────────────────────────────

export function getDiscussionsRepository() {
  const col = db().collection("discussions");

  return {
    async createDiscussion(
      data: Omit<DiscussionDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<DiscussionDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<DiscussionDoc>(snap);
    },

    async getDiscussion(id: string): Promise<DiscussionDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<DiscussionDoc>(snap);
    },

    async listDiscussions(opts?: {
      projectId?: string;
    }): Promise<DiscussionDoc[]> {
      let query: admin.firestore.Query = col.orderBy("pinned", "desc").orderBy("createdAt", "desc");
      if (opts?.projectId) {
        query = col
          .where("projectId", "==", opts.projectId)
          .orderBy("createdAt", "desc");
      }
      const docs = await query.get();
      return docs.docs.map((d) => toDoc<DiscussionDoc>(d));
    },

    async updateDiscussion(
      id: string,
      data: Partial<Omit<DiscussionDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col
        .doc(id)
        .update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    },

    async deleteDiscussion(id: string): Promise<void> {
      // Delete comments subcollection first
      const comments = await col.doc(id).collection("comments").get();
      const batch = db().batch();
      comments.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(col.doc(id));
      await batch.commit();
    },

    async addComment(
      discussionId: string,
      data: { content: string; createdBy: string }
    ): Promise<CommentDoc> {
      const ref = col.doc(discussionId).collection("comments").doc();
      await ref.set({
        content: data.content,
        createdBy: data.createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Update discussion updatedAt
      await col
        .doc(discussionId)
        .update({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      const snap = await ref.get();
      return toDoc<CommentDoc>(snap);
    },

    async getComments(discussionId: string): Promise<CommentDoc[]> {
      const snap = await col
        .doc(discussionId)
        .collection("comments")
        .orderBy("createdAt", "asc")
        .get();
      return snap.docs.map((d) => toDoc<CommentDoc>(d));
    },

    async deleteComment(
      discussionId: string,
      commentId: string
    ): Promise<void> {
      await col
        .doc(discussionId)
        .collection("comments")
        .doc(commentId)
        .delete();
    },
  };
}

// ─── Case Studies ─────────────────────────────────────────────────────────────

export function getCaseStudiesRepository() {
  const col = db().collection("caseStudies");

  return {
    async createCaseStudy(
      data: Omit<CaseStudyDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<CaseStudyDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CaseStudyDoc>(snap);
    },

    async getCaseStudy(id: string): Promise<CaseStudyDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<CaseStudyDoc>(snap);
    },

    async listCaseStudies(onlyPublished = false): Promise<CaseStudyDoc[]> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (onlyPublished) {
        query = col
          .where("published", "==", true)
          .orderBy("publishedAt", "desc");
      }
      const docs = await query.get();
      return docs.docs.map((d) => toDoc<CaseStudyDoc>(d));
    },

    async updateCaseStudy(
      id: string,
      data: Partial<Omit<CaseStudyDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col
        .doc(id)
        .update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    },

    async publishCaseStudy(id: string): Promise<void> {
      await col.doc(id).update({
        published: true,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },

    async unpublishCaseStudy(id: string): Promise<void> {
      await col.doc(id).update({
        published: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

// ─── Services ─────────────────────────────────────────────────────────────────

export interface ServiceMediaItem {
  url: string;
  type: "image" | "video";
}

export interface ServiceDoc {
  id: string;
  title: string;
  tag: string;
  desc: string;
  bullets: string[];
  mediaUrl: string;
  mediaType: "image" | "video";
  mediaItems?: ServiceMediaItem[];
  order: number;
  updatedAt: admin.firestore.Timestamp;
}

export function getServicesRepository() {
  const col = db().collection("services");

  return {
    async listServices(): Promise<ServiceDoc[]> {
      const docs = await col.orderBy("order", "asc").get();
      return docs.docs.map((d) => toDoc<ServiceDoc>(d));
    },

    async upsertService(
      id: string,
      data: Omit<ServiceDoc, "id" | "updatedAt">
    ): Promise<void> {
      await col.doc(id).set(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData,
        { merge: true }
      );
    },

    async updateService(
      id: string,
      data: Partial<Omit<ServiceDoc, "id" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData
      );
    },
  };
}

// ─── QR Scans ────────────────────────────────────────────────────────────────

export interface QrScanDoc {
  id: string;
  count: number;
  lastScannedAt: admin.firestore.Timestamp;
}

export function getQrScansRepository() {
  const col = db().collection("qrScans");

  return {
    async recordScan(source: string): Promise<void> {
      await col.doc(source).set(
        {
          count: admin.firestore.FieldValue.increment(1),
          lastScannedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    },

    async listScans(): Promise<QrScanDoc[]> {
      const docs = await col.orderBy("lastScannedAt", "desc").get();
      return docs.docs.map((d) => toDoc<QrScanDoc>(d));
    },
  };
}

// ─── Media ────────────────────────────────────────────────────────────────────

export function getMediaRepository() {
  const col = db().collection("media");

  return {
    async createMedia(
      data: Omit<MediaDoc, "id" | "uploadedAt">
    ): Promise<MediaDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<MediaDoc>(snap);
    },

    async getMedia(id: string): Promise<MediaDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<MediaDoc>(snap);
    },

    async listMedia(opts?: {
      linkedToType?: MediaLinkedToType;
      linkedToId?: string;
    }): Promise<MediaDoc[]> {
      let query: admin.firestore.Query = col.orderBy("uploadedAt", "desc");
      if (opts?.linkedToType && opts?.linkedToId) {
        query = col
          .where("linkedTo.type", "==", opts.linkedToType)
          .where("linkedTo.id", "==", opts.linkedToId)
          .orderBy("uploadedAt", "desc");
      }
      const docs = await query.get();
      return docs.docs.map((d) => toDoc<MediaDoc>(d));
    },

    async deleteMedia(id: string): Promise<void> {
      await col.doc(id).delete();
    },
  };
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export type PricingModel = "fixed" | "unit" | "formula";

export interface CatalogCategoryDoc {
  id: string;
  name: string;
  parentId?: string;
  position: number;
  createdAt: admin.firestore.Timestamp;
}

export interface CatalogItemDoc {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  name: string;
  description: string;
  unit: string;
  pricingModel: PricingModel;
  laborUnitPrice: number;
  materialUnitPrice: number;
  defaultMarkupPct: number;
  minimumCharge?: number;
  tags: string[];
  notes?: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getCatalogCategoriesRepository() {
  const col = db().collection("catalogCategories");

  return {
    async listCategories(): Promise<CatalogCategoryDoc[]> {
      const docs = await col.orderBy("position", "asc").get();
      return docs.docs.map((d) => toDoc<CatalogCategoryDoc>(d));
    },

    async createCategory(
      data: Omit<CatalogCategoryDoc, "id" | "createdAt">
    ): Promise<CatalogCategoryDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CatalogCategoryDoc>(snap);
    },

    async updateCategory(
      id: string,
      data: Partial<Omit<CatalogCategoryDoc, "id" | "createdAt">>
    ): Promise<void> {
      await col.doc(id).update(stripUndefined(data as Record<string, unknown>));
    },

    async deleteCategory(id: string): Promise<void> {
      await col.doc(id).delete();
    },
  };
}

export function getCatalogItemsRepository() {
  const col = db().collection("catalogItems");

  return {
    async listItems(opts?: {
      categoryId?: string;
      search?: string;
      isActive?: boolean;
    }): Promise<CatalogItemDoc[]> {
      let query: admin.firestore.Query = col.orderBy("displayOrder", "asc");
      if (opts?.categoryId) {
        query = col
          .where("categoryId", "==", opts.categoryId)
          .orderBy("displayOrder", "asc");
      }
      if (opts?.isActive !== undefined) {
        query = query.where("isActive", "==", opts.isActive);
      }
      const docs = await query.get();
      let items = docs.docs.map((d) => toDoc<CatalogItemDoc>(d));
      if (opts?.search) {
        const q = opts.search.toLowerCase();
        items = items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return items;
    },

    async getItem(id: string): Promise<CatalogItemDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<CatalogItemDoc>(snap);
    },

    async createItem(
      data: Omit<CatalogItemDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<CatalogItemDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CatalogItemDoc>(snap);
    },

    async updateItem(
      id: string,
      data: Partial<Omit<CatalogItemDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData
      );
    },

    async archiveItem(id: string): Promise<void> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return;
      const current = snap.data() as CatalogItemDoc;
      await col.doc(id).update({
        isActive: !current.isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },

    async duplicateItem(id: string): Promise<CatalogItemDoc> {
      const snap = await col.doc(id).get();
      if (!snap.exists) throw new Error("Item not found");
      const data = snap.data() as CatalogItemDoc;
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({
        ...data,
        name: `${data.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      }) as admin.firestore.DocumentData);
      const newSnap = await ref.get();
      return toDoc<CatalogItemDoc>(newSnap);
    },
  };
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export type OpportunityStatus = "new" | "assigned" | "estimating" | "quoted" | "closed";

export interface OpportunityDoc {
  id: string;
  source: "web_form" | "manual";
  name: string;
  email: string;
  phone?: string;
  projectType?: string;
  location?: string;
  budget?: string;
  timeline?: string;
  description?: string;
  status: OpportunityStatus;
  assignedTo?: string;
  submissionId?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getOpportunitiesRepository() {
  const col = db().collection("opportunities");

  return {
    async listOpportunities(opts: {
      status?: OpportunityStatus | "all";
      page: number;
      limit: number;
    }): Promise<{ items: OpportunityDoc[]; total: number }> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (opts.status && opts.status !== "all") {
        query = col
          .where("status", "==", opts.status)
          .orderBy("createdAt", "desc");
      }
      const countSnap = await query.count().get();
      const total = countSnap.data().count;
      const offset = (opts.page - 1) * opts.limit;
      const docs = await query.offset(offset).limit(opts.limit).get();
      return { items: docs.docs.map((d) => toDoc<OpportunityDoc>(d)), total };
    },

    async getOpportunity(id: string): Promise<OpportunityDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<OpportunityDoc>(snap);
    },

    async createOpportunity(
      data: Omit<OpportunityDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<OpportunityDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<OpportunityDoc>(snap);
    },

    async updateOpportunity(
      id: string,
      data: Partial<Omit<OpportunityDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData
      );
    },
  };
}

// ─── Estimates ────────────────────────────────────────────────────────────────

export type EstimateStatus =
  | "draft"
  | "reviewing"
  | "ready_to_send"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "revision_requested"
  | "expired"
  | "converted_to_project";

export interface EstimateDoc {
  id: string;
  opportunityId?: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  projectAddress?: string;
  description?: string;
  status: EstimateStatus;
  taxRate: number;
  markupPct: number;
  depositPct: number;
  discountAmount?: number;
  validUntil?: admin.firestore.Timestamp;
  internalNotes?: string;
  createdBy: string;
  currentVersionNumber: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface EstimateSectionDoc {
  id: string;
  estimateId: string;
  title: string;
  position: number;
  notes?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface EstimateLineItemDoc {
  id: string;
  estimateId: string;
  sectionId: string;
  catalogItemId?: string;
  description: string;
  qty: number;
  unit: string;
  laborUnitPrice: number;
  materialUnitPrice: number;
  markupPct: number;
  discountPct?: number;
  isOptional: boolean;
  isVisibleToCustomer: boolean;
  notes?: string;
  internalNotes?: string;
  position: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface EstimateVersionDoc {
  id: string;
  estimateId: string;
  versionNumber: number;
  snapshotData: Record<string, unknown>;
  changeSummary?: string;
  authorId: string;
  statusAtSnapshot: EstimateStatus;
  sentAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

export function getEstimatesRepository() {
  const col = db().collection("estimates");

  return {
    async listEstimates(opts: {
      status?: EstimateStatus | "all";
      page: number;
      limit: number;
    }): Promise<{ items: EstimateDoc[]; total: number }> {
      let query: admin.firestore.Query = col.orderBy("updatedAt", "desc");
      if (opts.status && opts.status !== "all") {
        query = col
          .where("status", "==", opts.status)
          .orderBy("updatedAt", "desc");
      }
      const countSnap = await query.count().get();
      const total = countSnap.data().count;
      const offset = (opts.page - 1) * opts.limit;
      const docs = await query.offset(offset).limit(opts.limit).get();
      return { items: docs.docs.map((d) => toDoc<EstimateDoc>(d)), total };
    },

    async getEstimate(id: string): Promise<EstimateDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<EstimateDoc>(snap);
    },

    async createEstimate(
      data: Omit<EstimateDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<EstimateDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<EstimateDoc>(snap);
    },

    async updateEstimate(
      id: string,
      data: Partial<Omit<EstimateDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData
      );
    },

    async transitionStatus(
      id: string,
      status: EstimateStatus
    ): Promise<void> {
      await col.doc(id).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

export function getEstimateSectionsRepository() {
  const col = db().collection("estimateSections");

  return {
    async listSections(estimateId: string): Promise<EstimateSectionDoc[]> {
      const docs = await col
        .where("estimateId", "==", estimateId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<EstimateSectionDoc>(d));
    },

    async createSection(
      data: Omit<EstimateSectionDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<EstimateSectionDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<EstimateSectionDoc>(snap);
    },

    async updateSection(
      id: string,
      data: Partial<Omit<EstimateSectionDoc, "id" | "estimateId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData
      );
    },

    async deleteSection(id: string): Promise<void> {
      await col.doc(id).delete();
    },

    async reorderSections(orderedIds: string[]): Promise<void> {
      const batch = db().batch();
      orderedIds.forEach((id, index) => {
        batch.update(col.doc(id), {
          position: index,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    },
  };
}

export function getEstimateLineItemsRepository() {
  const col = db().collection("estimateLineItems");

  return {
    async listItems(estimateId: string): Promise<EstimateLineItemDoc[]> {
      const docs = await col
        .where("estimateId", "==", estimateId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<EstimateLineItemDoc>(d));
    },

    async listItemsBySection(sectionId: string): Promise<EstimateLineItemDoc[]> {
      const docs = await col
        .where("sectionId", "==", sectionId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<EstimateLineItemDoc>(d));
    },

    async getItem(id: string): Promise<EstimateLineItemDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<EstimateLineItemDoc>(snap);
    },

    async createItem(
      data: Omit<EstimateLineItemDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<EstimateLineItemDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<EstimateLineItemDoc>(snap);
    },

    async updateItem(
      id: string,
      data: Partial<Omit<EstimateLineItemDoc, "id" | "estimateId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData
      );
    },

    async deleteItem(id: string): Promise<void> {
      await col.doc(id).delete();
    },

    async reorderItems(updates: { id: string; position: number; sectionId?: string }[]): Promise<void> {
      const batch = db().batch();
      for (const u of updates) {
        const updateData: Record<string, unknown> = {
          position: u.position,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (u.sectionId !== undefined) updateData["sectionId"] = u.sectionId;
        batch.update(col.doc(u.id), updateData);
      }
      await batch.commit();
    },

    async deleteItemsByEstimate(estimateId: string): Promise<void> {
      const docs = await col.where("estimateId", "==", estimateId).get();
      const batch = db().batch();
      docs.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
  };
}

export function getEstimateVersionsRepository() {
  const col = db().collection("estimateVersions");

  return {
    async listVersions(estimateId: string): Promise<EstimateVersionDoc[]> {
      const docs = await col
        .where("estimateId", "==", estimateId)
        .orderBy("versionNumber", "desc")
        .get();
      return docs.docs.map((d) => toDoc<EstimateVersionDoc>(d));
    },

    async getVersion(id: string): Promise<EstimateVersionDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<EstimateVersionDoc>(snap);
    },

    async createVersion(
      data: Omit<EstimateVersionDoc, "id" | "createdAt">
    ): Promise<EstimateVersionDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<EstimateVersionDoc>(snap);
    },

    async markSent(id: string): Promise<void> {
      await col.doc(id).update({
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

// ─── Portal ───────────────────────────────────────────────────────────────────

export interface PortalTokenDoc {
  id: string;
  estimateId: string;
  versionId: string;
  customerEmail: string;
  token: string;
  expiresAt: admin.firestore.Timestamp;
  isRevoked: boolean;
  firstViewedAt?: admin.firestore.Timestamp;
  lastViewedAt?: admin.firestore.Timestamp;
  viewCount: number;
  createdAt: admin.firestore.Timestamp;
}

export interface CustomerActionDoc {
  id: string;
  estimateId: string;
  versionId: string;
  tokenId: string;
  action: "accept" | "decline" | "request_changes" | "comment";
  payload?: Record<string, unknown>;
  createdAt: admin.firestore.Timestamp;
}

export function getPortalRepository() {
  const tokenCol = db().collection("portalTokens");
  const actionCol = db().collection("customerActions");

  return {
    async createToken(
      data: Omit<PortalTokenDoc, "id" | "createdAt">
    ): Promise<PortalTokenDoc> {
      const ref = await tokenCol.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<PortalTokenDoc>(snap);
    },

    async resolveToken(token: string): Promise<PortalTokenDoc | null> {
      const snap = await tokenCol.where("token", "==", token).limit(1).get();
      if (snap.empty) return null;
      return toDoc<PortalTokenDoc>(snap.docs[0]);
    },

    async recordView(tokenId: string): Promise<void> {
      const ref = tokenCol.doc(tokenId);
      const snap = await ref.get();
      if (!snap.exists) return;
      const data = snap.data() as PortalTokenDoc;
      const update: Record<string, unknown> = {
        lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
        viewCount: admin.firestore.FieldValue.increment(1),
      };
      if (!data.firstViewedAt) {
        update["firstViewedAt"] = admin.firestore.FieldValue.serverTimestamp();
      }
      await ref.update(update);
    },

    async recordAction(
      data: Omit<CustomerActionDoc, "id" | "createdAt">
    ): Promise<CustomerActionDoc> {
      const ref = await actionCol.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CustomerActionDoc>(snap);
    },

    async listActions(estimateId: string): Promise<CustomerActionDoc[]> {
      const docs = await actionCol
        .where("estimateId", "==", estimateId)
        .orderBy("createdAt", "desc")
        .get();
      return docs.docs.map((d) => toDoc<CustomerActionDoc>(d));
    },
  };
}

// ─── Estimate Comments ────────────────────────────────────────────────────────

export interface EstimateCommentDoc {
  id: string;
  estimateId: string;
  content: string;
  createdBy: string;
  source: "manual" | "carried_over";
  createdAt: admin.firestore.Timestamp;
}

export function getEstimateCommentsRepository() {
  const col = db().collection("estimateComments");

  return {
    async listComments(estimateId: string): Promise<EstimateCommentDoc[]> {
      const docs = await col
        .where("estimateId", "==", estimateId)
        .orderBy("createdAt", "asc")
        .get();
      return docs.docs.map((d) => toDoc<EstimateCommentDoc>(d));
    },

    async addComment(data: {
      estimateId: string;
      content: string;
      source?: "manual" | "carried_over";
    }): Promise<EstimateCommentDoc> {
      const ref = await col.add(stripUndefined({
        estimateId: data.estimateId,
        content: data.content,
        createdBy: "admin",
        source: data.source ?? "manual",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<EstimateCommentDoc>(snap);
    },

    async deleteComment(commentId: string): Promise<void> {
      await col.doc(commentId).delete();
    },
  };
}

// ─── Customers ────────────────────────────────────────────────────────────────

export type CustomerStatus = "active" | "inactive" | "vip";

export interface CustomerContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface CustomerProperty {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export interface CustomerDoc {
  id: string;
  displayName: string;
  companyName?: string;
  status: CustomerStatus;
  contacts: CustomerContact[];
  properties: CustomerProperty[];
  tags: string[];
  billingEmail?: string;
  billingAddress?: string;
  notes?: string;
  sourceEstimateId?: string;
  sourceOpportunityId?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getCustomersRepository() {
  const col = db().collection("customers");

  return {
    async createCustomer(
      data: Omit<CustomerDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<CustomerDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CustomerDoc>(snap);
    },

    async getCustomer(id: string): Promise<CustomerDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<CustomerDoc>(snap);
    },

    async listCustomers(opts?: {
      status?: CustomerStatus | "all";
      page?: number;
      limit?: number;
    }): Promise<{ items: CustomerDoc[]; total: number }> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (opts?.status && opts.status !== "all") {
        query = col.where("status", "==", opts.status).orderBy("createdAt", "desc");
      }
      const countSnap = await query.count().get();
      const total = countSnap.data().count;
      const page = opts?.page ?? 1;
      const limit = opts?.limit ?? 20;
      const offset = (page - 1) * limit;
      const docs = await query.offset(offset).limit(limit).get();
      return { items: docs.docs.map((d) => toDoc<CustomerDoc>(d)), total };
    },

    async updateCustomer(
      id: string,
      data: Partial<Omit<CustomerDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData
      );
    },

    async deleteCustomer(id: string): Promise<void> {
      await col.doc(id).delete();
    },
  };
}

// ─── Project Scopes (immutable snapshot) ─────────────────────────────────────

export interface ScopeSectionRef {
  id: string;
  title: string;
  position: number;
  notes?: string;
}

export interface ScopeLineItemRef {
  id: string;
  sectionId: string;
  description: string;
  qty: number;
  unit: string;
  laborUnitPrice: number;
  materialUnitPrice: number;
  markupPct: number;
  discountPct?: number;
  isOptional: boolean;
  isIncluded: boolean;
  notes?: string;
  lineTotal: number;
}

export interface ScopeTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  depositAmount: number;
  laborCost: number;
  materialCost: number;
}

export interface ProjectScopeDoc {
  id: string;
  projectId: string;
  estimateId: string;
  estimateVersionNumber: number;
  estimateTitle: string;
  taxRate: number;
  depositPct: number;
  sections: ScopeSectionRef[];
  lineItems: ScopeLineItemRef[];
  totals: ScopeTotals;
  contractValue: number;
  scopeNotes?: string;
  contractNotes?: string;
  acceptedOptionalIds: string[];
  acceptedAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

export function getProjectScopesRepository() {
  const col = db().collection("projectScopes");

  return {
    async createScope(
      data: Omit<ProjectScopeDoc, "id" | "createdAt">
    ): Promise<ProjectScopeDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ProjectScopeDoc>(snap);
    },

    async getScopeByProject(projectId: string): Promise<ProjectScopeDoc | null> {
      const snap = await col.where("projectId", "==", projectId).limit(1).get();
      if (snap.empty) return null;
      return toDoc<ProjectScopeDoc>(snap.docs[0]);
    },

    async getScope(id: string): Promise<ProjectScopeDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<ProjectScopeDoc>(snap);
    },

    async updateScope(
      id: string,
      data: Partial<Pick<ProjectScopeDoc, "scopeNotes" | "contractNotes">>
    ): Promise<void> {
      await col.doc(id).update(stripUndefined(data as Record<string, unknown>));
    },
  };
}

// ─── Project Milestones ───────────────────────────────────────────────────────

export type MilestoneStatus = "not_started" | "in_progress" | "completed" | "blocked" | "skipped";

export interface ProjectMilestoneDoc {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  position: number;
  targetDate?: admin.firestore.Timestamp;
  completedDate?: admin.firestore.Timestamp;
  dependsOn: string[];
  notes?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getProjectMilestonesRepository() {
  const col = db().collection("projectMilestones");

  return {
    async listMilestones(projectId: string): Promise<ProjectMilestoneDoc[]> {
      const docs = await col
        .where("projectId", "==", projectId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<ProjectMilestoneDoc>(d));
    },

    async createMilestone(
      data: Omit<ProjectMilestoneDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<ProjectMilestoneDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ProjectMilestoneDoc>(snap);
    },

    async updateMilestone(
      id: string,
      data: Partial<Omit<ProjectMilestoneDoc, "id" | "projectId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      const update: Record<string, unknown> = {
        ...stripUndefined(data as Record<string, unknown>),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (data.status === "completed" && !data.completedDate) {
        update["completedDate"] = admin.firestore.FieldValue.serverTimestamp();
      }
      await col.doc(id).update(update);
    },

    async deleteMilestone(id: string): Promise<void> {
      await col.doc(id).delete();
    },

    async reorderMilestones(orderedIds: string[]): Promise<void> {
      const batch = db().batch();
      orderedIds.forEach((id, index) => {
        batch.update(col.doc(id), {
          position: index,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    },
  };
}

// ─── Activities ───────────────────────────────────────────────────────────────

export type ActivityType =
  | "project_created"
  | "project_status_changed"
  | "milestone_updated"
  | "task_created"
  | "task_status_changed"
  | "task_assigned"
  | "daily_log_submitted"
  | "daily_log_approved"
  | "file_uploaded"
  | "comment_added"
  | "charter_published"
  | "estimate_converted"
  | "crew_assigned";

export interface ActivityDoc {
  id: string;
  projectId: string;
  type: ActivityType;
  actorId: string;
  summary: string;
  payload?: Record<string, unknown>;
  createdAt: admin.firestore.Timestamp;
}

export function getActivitiesRepository() {
  const col = db().collection("activities");

  return {
    async listActivities(projectId: string, limit = 50): Promise<ActivityDoc[]> {
      const docs = await col
        .where("projectId", "==", projectId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      return docs.docs.map((d) => toDoc<ActivityDoc>(d));
    },

    async addActivity(
      data: Omit<ActivityDoc, "id" | "createdAt">
    ): Promise<ActivityDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ActivityDoc>(snap);
    },
  };
}

// ─── Project Charters ─────────────────────────────────────────────────────────

export type CharterStatus = "draft" | "published";

export interface CharterMilestoneRef {
  title: string;
  targetDate?: string;
  description?: string;
}

export interface ProjectCharterDoc {
  id: string;
  projectId: string;
  status: CharterStatus;
  version: number;
  summary: string;
  customerSummary?: string;
  scopeSummary?: string;
  assumptions?: string;
  constraints?: string;
  risks?: string;
  successCriteria?: string;
  communicationPlan?: string;
  teamAssignments?: string;
  milestones: CharterMilestoneRef[];
  approvals?: string;
  publishedAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getProjectChartersRepository() {
  const col = db().collection("projectCharters");

  return {
    async getCharterByProject(projectId: string): Promise<ProjectCharterDoc | null> {
      const snap = await col.where("projectId", "==", projectId).orderBy("version", "desc").limit(1).get();
      if (snap.empty) return null;
      return toDoc<ProjectCharterDoc>(snap.docs[0]);
    },

    async getCharter(id: string): Promise<ProjectCharterDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<ProjectCharterDoc>(snap);
    },

    async createCharter(
      data: Omit<ProjectCharterDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<ProjectCharterDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ProjectCharterDoc>(snap);
    },

    async updateCharter(
      id: string,
      data: Partial<Omit<ProjectCharterDoc, "id" | "projectId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData
      );
    },

    async publishCharter(id: string): Promise<void> {
      await col.doc(id).update({
        status: "published" as CharterStatus,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

// ─── Project Sections (WBS) ───────────────────────────────────────────────────

export interface ProjectSectionDoc {
  id: string;
  projectId: string;
  title: string;
  position: number;
  notes?: string;
  isCollapsed: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getProjectSectionsRepository() {
  const col = db().collection("projectSections");

  return {
    async listSections(projectId: string): Promise<ProjectSectionDoc[]> {
      const docs = await col
        .where("projectId", "==", projectId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<ProjectSectionDoc>(d));
    },

    async createSection(
      data: Omit<ProjectSectionDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<ProjectSectionDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ProjectSectionDoc>(snap);
    },

    async updateSection(
      id: string,
      data: Partial<Omit<ProjectSectionDoc, "id" | "projectId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData
      );
    },

    async deleteSection(id: string): Promise<void> {
      await col.doc(id).delete();
    },

    async reorderSections(orderedIds: string[]): Promise<void> {
      const batch = db().batch();
      orderedIds.forEach((id, index) => {
        batch.update(col.doc(id), {
          position: index,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    },
  };
}

// ─── Project Tasks (WBS) ──────────────────────────────────────────────────────

export type TaskStatus =
  | "not_started"
  | "ready"
  | "in_progress"
  | "blocked"
  | "inspection_pending"
  | "approved"
  | "done"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface ProjectTaskDoc {
  id: string;
  projectId: string;
  sectionId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string[];
  assignedCrewId?: string;
  plannedStartDate?: admin.firestore.Timestamp;
  plannedEndDate?: admin.firestore.Timestamp;
  actualStartDate?: admin.firestore.Timestamp;
  actualEndDate?: admin.firestore.Timestamp;
  estimatedHours?: number;
  actualHours?: number;
  dependsOn: string[];
  tags: string[];
  notes?: string;
  position: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getProjectTasksRepository() {
  const col = db().collection("projectTasks");

  return {
    async listTasks(projectId: string): Promise<ProjectTaskDoc[]> {
      const docs = await col
        .where("projectId", "==", projectId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<ProjectTaskDoc>(d));
    },

    async listTasksBySection(sectionId: string): Promise<ProjectTaskDoc[]> {
      const docs = await col
        .where("sectionId", "==", sectionId)
        .orderBy("position", "asc")
        .get();
      return docs.docs.map((d) => toDoc<ProjectTaskDoc>(d));
    },

    async getTask(id: string): Promise<ProjectTaskDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<ProjectTaskDoc>(snap);
    },

    async createTask(
      data: Omit<ProjectTaskDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<ProjectTaskDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<ProjectTaskDoc>(snap);
    },

    async updateTask(
      id: string,
      data: Partial<Omit<ProjectTaskDoc, "id" | "projectId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      const update: Record<string, unknown> = {
        ...stripUndefined(data as Record<string, unknown>),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (data.status === "in_progress" && !data.actualStartDate) {
        update["actualStartDate"] = admin.firestore.FieldValue.serverTimestamp();
      }
      if ((data.status === "done" || data.status === "approved") && !data.actualEndDate) {
        update["actualEndDate"] = admin.firestore.FieldValue.serverTimestamp();
      }
      await col.doc(id).update(update);
    },

    async deleteTask(id: string): Promise<void> {
      await col.doc(id).delete();
    },

    async reorderTasks(updates: { id: string; position: number; sectionId?: string }[]): Promise<void> {
      const batch = db().batch();
      for (const u of updates) {
        const updateData: Record<string, unknown> = {
          position: u.position,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (u.sectionId !== undefined) updateData["sectionId"] = u.sectionId;
        batch.update(col.doc(u.id), updateData);
      }
      await batch.commit();
    },

    async deleteTasksByProject(projectId: string): Promise<void> {
      const docs = await col.where("projectId", "==", projectId).get();
      const batch = db().batch();
      docs.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
  };
}

// ─── Daily Logs ───────────────────────────────────────────────────────────────

export type DailyLogStatus = "draft" | "submitted" | "approved" | "archived";

export interface DailyLogCrewEntry {
  name: string;
  role?: string;
  hours: number;
}

export interface DailyLogDoc {
  id: string;
  projectId: string;
  date: string;
  status: DailyLogStatus;
  weather?: string;
  temperature?: string;
  completedWork: string;
  crew: DailyLogCrewEntry[];
  totalHours: number;
  materials?: string;
  issues?: string;
  delays?: string;
  safetyNotes?: string;
  inspectionNotes?: string;
  generalNotes?: string;
  photoIds: string[];
  submittedBy?: string;
  submittedAt?: admin.firestore.Timestamp;
  approvedBy?: string;
  approvedAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getDailyLogsRepository() {
  const col = db().collection("dailyLogs");

  return {
    async listLogs(projectId: string): Promise<DailyLogDoc[]> {
      const docs = await col
        .where("projectId", "==", projectId)
        .orderBy("date", "desc")
        .get();
      return docs.docs.map((d) => toDoc<DailyLogDoc>(d));
    },

    async getLog(id: string): Promise<DailyLogDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<DailyLogDoc>(snap);
    },

    async createLog(
      data: Omit<DailyLogDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<DailyLogDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<DailyLogDoc>(snap);
    },

    async updateLog(
      id: string,
      data: Partial<Omit<DailyLogDoc, "id" | "projectId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData
      );
    },

    async submitLog(id: string, submittedBy: string): Promise<void> {
      await col.doc(id).update({
        status: "submitted" as DailyLogStatus,
        submittedBy,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },

    async approveLog(id: string, approvedBy: string): Promise<void> {
      await col.doc(id).update({
        status: "approved" as DailyLogStatus,
        approvedBy,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },

    async deleteLog(id: string): Promise<void> {
      await col.doc(id).delete();
    },
  };
}

// ─── Crews ────────────────────────────────────────────────────────────────────

export type CrewMemberRole = "lead" | "laborer" | "specialist" | "apprentice";

export interface CrewMemberDoc {
  id: string;
  crewId: string;
  name: string;
  role: CrewMemberRole;
  phone?: string;
  email?: string;
  specialties: string[];
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface CrewDoc {
  id: string;
  name: string;
  leadMemberId?: string;
  description?: string;
  tags: string[];
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export function getCrewsRepository() {
  const col = db().collection("crews");

  return {
    async listCrews(activeOnly = false): Promise<CrewDoc[]> {
      let query: admin.firestore.Query = col.orderBy("name", "asc");
      if (activeOnly) {
        query = col.where("isActive", "==", true).orderBy("name", "asc");
      }
      const docs = await query.get();
      return docs.docs.map((d) => toDoc<CrewDoc>(d));
    },

    async getCrew(id: string): Promise<CrewDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<CrewDoc>(snap);
    },

    async createCrew(
      data: Omit<CrewDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<CrewDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CrewDoc>(snap);
    },

    async updateCrew(
      id: string,
      data: Partial<Omit<CrewDoc, "id" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData
      );
    },

    async deleteCrew(id: string): Promise<void> {
      await col.doc(id).delete();
    },
  };
}

export function getCrewMembersRepository() {
  const col = db().collection("crewMembers");

  return {
    async listMembers(crewId: string): Promise<CrewMemberDoc[]> {
      const docs = await col
        .where("crewId", "==", crewId)
        .orderBy("name", "asc")
        .get();
      return docs.docs.map((d) => toDoc<CrewMemberDoc>(d));
    },

    async getMember(id: string): Promise<CrewMemberDoc | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      return toDoc<CrewMemberDoc>(snap);
    },

    async createMember(
      data: Omit<CrewMemberDoc, "id" | "createdAt" | "updatedAt">
    ): Promise<CrewMemberDoc> {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await col.add(stripUndefined({ ...data, createdAt: now, updatedAt: now }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<CrewMemberDoc>(snap);
    },

    async updateMember(
      id: string,
      data: Partial<Omit<CrewMemberDoc, "id" | "crewId" | "createdAt" | "updatedAt">>
    ): Promise<void> {
      await col.doc(id).update(
        stripUndefined({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }) as admin.firestore.DocumentData
      );
    },

    async deleteMember(id: string): Promise<void> {
      await col.doc(id).delete();
    },
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "task_assigned"
  | "milestone_approaching"
  | "daily_log_submitted"
  | "project_status_changed"
  | "file_uploaded"
  | "charter_published";

export interface NotificationDoc {
  id: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  recipientId: string;
  payload?: Record<string, unknown>;
  createdAt: admin.firestore.Timestamp;
}

export function getNotificationsRepository() {
  const col = db().collection("notifications");

  return {
    async listNotifications(recipientId: string, unreadOnly = false): Promise<NotificationDoc[]> {
      let query: admin.firestore.Query = col
        .where("recipientId", "==", recipientId)
        .orderBy("createdAt", "desc")
        .limit(100);
      if (unreadOnly) {
        query = col
          .where("recipientId", "==", recipientId)
          .where("isRead", "==", false)
          .orderBy("createdAt", "desc")
          .limit(50);
      }
      const docs = await query.get();
      return docs.docs.map((d) => toDoc<NotificationDoc>(d));
    },

    async createNotification(
      data: Omit<NotificationDoc, "id" | "createdAt">
    ): Promise<NotificationDoc> {
      const ref = await col.add(stripUndefined({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as admin.firestore.DocumentData);
      const snap = await ref.get();
      return toDoc<NotificationDoc>(snap);
    },

    async markRead(id: string): Promise<void> {
      await col.doc(id).update({ isRead: true });
    },

    async markAllRead(recipientId: string): Promise<void> {
      const docs = await col
        .where("recipientId", "==", recipientId)
        .where("isRead", "==", false)
        .get();
      const batch = db().batch();
      docs.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
      await batch.commit();
    },
  };
}

// ─── Site Config ──────────────────────────────────────────────────────────────

export interface SiteContactDoc {
  phone: string;
  email: string;
  serviceArea: string;
  address?: string;
  hours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  updatedAt?: admin.firestore.Timestamp;
}

export function getSiteConfigRepository() {
  const col = db().collection("siteConfig");

  return {
    async getContact(): Promise<SiteContactDoc | null> {
      const snap = await col.doc("contact").get();
      if (!snap.exists) return null;
      return snap.data() as SiteContactDoc;
    },

    async updateContact(
      data: Partial<Omit<SiteContactDoc, "updatedAt">>
    ): Promise<void> {
      await col.doc("contact").set(
        stripUndefined({
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }) as admin.firestore.DocumentData,
        { merge: true }
      );
    },
  };
}
