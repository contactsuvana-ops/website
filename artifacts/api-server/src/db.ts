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

export type ProjectStatus = "active" | "completed";

export interface ProjectDoc {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  clientName: string;
  clientEmail: string;
  submissionId?: string;
  startDate: admin.firestore.Timestamp;
  completedDate?: admin.firestore.Timestamp;
  caseStudyId?: string;
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
    }): Promise<{ items: SubmissionDoc[]; total: number }> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (opts.type && opts.type !== "all") {
        query = query.where("type", "==", opts.type);
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
      status?: ProjectStatus;
    }): Promise<ProjectDoc[]> {
      let query: admin.firestore.Query = col.orderBy("createdAt", "desc");
      if (opts?.status) {
        query = query.where("status", "==", opts.status);
      }
      const docs = await query.get();
      return docs.docs.map((d) => toDoc<ProjectDoc>(d));
    },

    async updateProject(
      id: string,
      data: Partial<
        Omit<ProjectDoc, "id" | "createdAt" | "updatedAt">
      >
    ): Promise<void> {
      await col
        .doc(id)
        .update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
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

export interface ServiceDoc {
  id: string;
  title: string;
  tag: string;
  desc: string;
  bullets: string[];
  mediaUrl: string;
  mediaType: "image" | "video";
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
