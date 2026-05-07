/**
 * Firestore Repository Layer
 * Handles all database operations for submissions and comments
 * Provides a clean abstraction over Firestore
 */

import { Firestore, Timestamp } from "firebase-admin/firestore";
import {
  SubmissionDocument,
  CommentDocument,
  InsertSubmission,
  InsertComment,
  SubmissionStats,
} from "./schemas";

export class SubmissionsRepository {
  private readonly db: Firestore;
  private readonly submissionsCollection = "submissions";
  private readonly commentsCollection = "comments";

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Create a new submission
   */
  async createSubmission(data: InsertSubmission): Promise<SubmissionDocument> {
    const now = new Date();
    const docRef = this.db.collection(this.submissionsCollection).doc();

    const submission: SubmissionDocument = {
      id: docRef.id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(submission);
    return submission;
  }

  /**
   * Get a submission by ID
   */
  async getSubmission(id: string): Promise<SubmissionDocument | null> {
    const doc = await this.db.collection(this.submissionsCollection).doc(id).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as Omit<SubmissionDocument, "id">;
    return {
      id: doc.id,
      ...data,
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? this.timestampToDate(data.updatedAt) : undefined,
    };
  }

  /**
   * List submissions with pagination and filtering
   */
  async listSubmissions(options: {
    type?: "contact" | "quote" | "all";
    page?: number;
    limit?: number;
  }): Promise<{ submissions: SubmissionDocument[]; total: number }> {
    const pageNum = options.page ?? 1;
    const pageSize = options.limit ?? 20;
    const queryOffset = (pageNum - 1) * pageSize;

    // Build base query
    let baseQuery = this.db.collection(this.submissionsCollection) as any;

    if (options.type && options.type !== "all") {
      baseQuery = baseQuery.where("type", "==", options.type);
    }

    // Get total count
    const totalSnapshot = await baseQuery.count().get();
    const total = totalSnapshot.data().count;

    // Get paginated results
    const snapshot = await baseQuery
      .orderBy("createdAt", "desc")
      .limit(pageSize)
      .offset(queryOffset)
      .get();

    const submissions: SubmissionDocument[] = snapshot.docs.map((doc: any) => {
      const data = doc.data() as Omit<SubmissionDocument, "id">;
      return {
        id: doc.id,
        ...data,
        createdAt: this.timestampToDate(data.createdAt),
        updatedAt: data.updatedAt ? this.timestampToDate(data.updatedAt) : undefined,
      };
    });

    return { submissions, total };
  }

  /**
   * Get submission statistics
   */
  async getSubmissionStats(): Promise<SubmissionStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [contactSnapshot, quoteSnapshot, recentSnapshot, byProjectTypeSnapshot] = await Promise.all([
      (this.db.collection(this.submissionsCollection) as any).where("type", "==", "contact").count().get(),
      (this.db.collection(this.submissionsCollection) as any).where("type", "==", "quote").count().get(),
      (this.db.collection(this.submissionsCollection) as any)
        .where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
        .count()
        .get(),
      (this.db.collection(this.submissionsCollection) as any)
        .where("type", "==", "quote")
        .where("projectType", "!=", null)
        .get(),
    ]);

    // Group by project type
    const projectTypeMap = new Map<string | null, number>();
    byProjectTypeSnapshot.forEach((doc: any) => {
      const projectType = doc.data().projectType;
      projectTypeMap.set(projectType, (projectTypeMap.get(projectType) || 0) + 1);
    });

    const byProjectType = Array.from(projectTypeMap.entries())
      .map(([projectType, count]) => ({
        projectType: projectType ?? "unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalContacts: contactSnapshot.data().count,
      totalQuotes: quoteSnapshot.data().count,
      recentSubmissions: recentSnapshot.data().count,
      byProjectType,
    };
  }

  /**
   * Add a comment to a submission
   */
  async addComment(submissionId: string, data: InsertComment): Promise<CommentDocument> {
    const now = new Date();
    const docRef = this.db.collection(this.commentsCollection).doc();

    const comment: CommentDocument = {
      id: docRef.id,
      submissionId,
      ...data,
      createdAt: now,
    };

    await docRef.set(comment);
    return comment;
  }

  /**
   * Get comments for a submission
   */
  async getComments(submissionId: string): Promise<CommentDocument[]> {
    const snapshot = await (this.db.collection(this.commentsCollection) as any)
      .where("submissionId", "==", submissionId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data() as Omit<CommentDocument, "id">;
      return {
        id: doc.id,
        ...data,
        createdAt: this.timestampToDate(data.createdAt),
      };
    });
  }

  /**
   * Delete a submission (cascade delete comments)
   */
  async deleteSubmission(submissionId: string): Promise<void> {
    const batch = this.db.batch();

    // Delete submission
    batch.delete(this.db.collection(this.submissionsCollection).doc(submissionId));

    // Delete associated comments
    const commentsSnapshot = await (this.db.collection(this.commentsCollection) as any)
      .where("submissionId", "==", submissionId)
      .get();

    commentsSnapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  /**
   * Update submission (for internal use, e.g., marking as read)
   */
  async updateSubmission(id: string, updates: Partial<SubmissionDocument>): Promise<void> {
    await this.db
      .collection(this.submissionsCollection)
      .doc(id)
      .update({
        ...updates,
        updatedAt: new Date(),
      });
  }

  /**
   * Helper: Convert Firestore Timestamp to Date
   */
  private timestampToDate(value: any): Date {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return new Date();
  }
}

