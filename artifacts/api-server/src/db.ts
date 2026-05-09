import admin from "firebase-admin";

export enum SubmissionType {
  QUOTE = "quote",
  CONTACT = "contact",
}

export interface Submission {
  id: string;
  type: SubmissionType;
  email: string;
  name: string;
  message: string;
  createdAt: admin.firestore.Timestamp;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  text: string;
  createdAt: admin.firestore.Timestamp;
  createdBy: string;
}

const db = admin.firestore();
const submissionsCollection = "submissions";

export async function getSubmissionsRepository() {
  return {
    async create(
      type: SubmissionType,
      data: Record<string, any>
    ): Promise<string> {
      const doc = await db.collection(submissionsCollection).add({
        type,
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return doc.id;
    },

    async findById(id: string): Promise<Submission | null> {
      const doc = await db
        .collection(submissionsCollection)
        .doc(id)
        .get();
      if (!doc.exists) return null;
      return {
        id: doc.id,
        ...(doc.data() as any),
      };
    },

    async findAll(
      type?: SubmissionType,
      limit = 50,
      offset = 0
    ): Promise<Submission[]> {
      let query = db.collection(submissionsCollection);

      if (type) {
        query = query.where("type", "==", type);
      }

      const docs = await query
        .orderBy("createdAt", "desc")
        .limit(limit)
        .offset(offset)
        .get();

      return docs.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
    },

    async addComment(
      submissionId: string,
      comment: string,
      createdBy: string
    ): Promise<void> {
      await db
        .collection(submissionsCollection)
        .doc(submissionId)
        .update({
          comments: admin.firestore.FieldValue.arrayUnion({
            text: comment,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy,
          }),
        });
    },

    async getComments(submissionId: string): Promise<Comment[]> {
      const doc = await db
        .collection(submissionsCollection)
        .doc(submissionId)
        .get();
      return doc.data()?.comments || [];
    },
  };
}
