/**
 * Data Migration Utility
 * Migrates data from PostgreSQL to Firestore
 * Run this script before switching to Firestore in production
 * 
 * Usage: 
 *   npx ts-node lib/db/src/firebase/migrate.ts
 * 
 * Prerequisites:
 *   - DATABASE_URL set to PostgreSQL connection
 *   - FIRESTORE_EMULATOR_HOST or FIREBASE_CREDENTIALS set
 */

import pg from "pg";
import { initializeFirebase } from "./config";

const { Pool } = pg;

interface SubmissionRow {
  id: number;
  type: string;
  name: string;
  email: string;
  phone: string;
  project_type?: string | null;
  location?: string | null;
  budget?: string | null;
  timeline?: string | null;
  message: string;
  created_at: Date;
}

interface CommentRow {
  id: number;
  submission_id: number;
  content: string;
  is_shared: boolean;
  created_at: Date;
}

async function migrateSubmissions() {
  console.log("🔄 Starting Firestore migration...\n");

  // Connect to PostgreSQL
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = initializeFirebase();

  try {
    // Fetch all submissions from PostgreSQL
    console.log("📥 Fetching submissions from PostgreSQL...");
    const submissionsResult = await pgPool.query(
      `SELECT id, type, name, email, phone, project_type, location, budget, timeline, message, created_at 
       FROM submissions 
       ORDER BY id ASC`,
    );

    const submissions = submissionsResult.rows as SubmissionRow[];
    console.log(`✓ Found ${submissions.length} submissions\n`);

    // Migrate submissions to Firestore
    console.log("📤 Migrating submissions to Firestore...");
    let migratedCount = 0;
    const batch = db.batch();

    for (const submission of submissions) {
      const docRef = db.collection("submissions").doc(String(submission.id));

      batch.set(docRef, {
        id: String(submission.id),
        type: submission.type,
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        projectType: submission.project_type || null,
        location: submission.location || null,
        budget: submission.budget || null,
        timeline: submission.timeline || null,
        message: submission.message,
        createdAt: submission.created_at,
        updatedAt: submission.created_at,
      });

      migratedCount++;
      if (migratedCount % 100 === 0) {
        await batch.commit();
        console.log(`  ✓ Migrated ${migratedCount} submissions`);
      }
    }

    if (migratedCount % 100 !== 0) {
      await batch.commit();
    }

    console.log(`✓ Successfully migrated ${migratedCount} submissions\n`);

    // Fetch and migrate comments
    console.log("📥 Fetching comments from PostgreSQL...");
    const commentsResult = await pgPool.query(
      `SELECT id, submission_id, content, is_shared, created_at 
       FROM submission_comments 
       ORDER BY id ASC`,
    );

    const comments = commentsResult.rows as CommentRow[];
    console.log(`✓ Found ${comments.length} comments\n`);

    console.log("📤 Migrating comments to Firestore...");
    let commentCount = 0;
    const commentBatch = db.batch();

    for (const comment of comments) {
      const docRef = db.collection("comments").doc(String(comment.id));

      commentBatch.set(docRef, {
        id: String(comment.id),
        submissionId: String(comment.submission_id),
        content: comment.content,
        isShared: comment.is_shared,
        createdAt: comment.created_at,
      });

      commentCount++;
      if (commentCount % 100 === 0) {
        await commentBatch.commit();
        console.log(`  ✓ Migrated ${commentCount} comments`);
      }
    }

    if (commentCount % 100 !== 0) {
      await commentBatch.commit();
    }

    console.log(`✓ Successfully migrated ${commentCount} comments\n`);

    console.log("✅ Migration completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`  - Submissions: ${migratedCount}`);
    console.log(`  - Comments: ${commentCount}`);
    console.log("\n🚀 Next steps:");
    console.log("  1. Verify data in Firestore console");
    console.log("  2. Switch to Firestore in your environment variables");
    console.log("  3. Monitor the application for any issues");
  } finally {
    await pgPool.end();
  }
}

// Run migration
migrateSubmissions().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
