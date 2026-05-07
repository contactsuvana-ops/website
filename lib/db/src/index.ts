/**
 * Database Module - Supports both Firestore and PostgreSQL
 * Auto-detects based on environment variables
 */

import { Firestore } from "firebase-admin/firestore";
import { initializeFirebase, getFirestore_Instance } from "./firebase/config";
import { SubmissionsRepository } from "./firebase/repository";

// Export Firestore schemas and types
export * from "./firebase/schemas";
export { SubmissionsRepository };

// Initialize Firestore when using it
let firestoreDb: Firestore | null = null;
let submissionsRepository: SubmissionsRepository | null = null;

/**
 * Get the initialized Firestore instance
 */
export function getFirestore(): Firestore {
  if (!firestoreDb) {
    firestoreDb = initializeFirebase();
  }
  return firestoreDb;
}

/**
 * Get the submissions repository
 */
export function getSubmissionsRepository(): SubmissionsRepository {
  if (!submissionsRepository) {
    submissionsRepository = new SubmissionsRepository(getFirestore());
  }
  return submissionsRepository;
}

// For backward compatibility, maintain old Drizzle export if PostgreSQL is configured
const useFirestore = !process.env.DATABASE_URL || process.env.USE_FIRESTORE === "true";

if (!useFirestore) {
  // PostgreSQL mode - optional exports
  try {
    // These exports are conditional and optional
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { drizzle } = require("drizzle-orm/node-postgres");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pg = require("pg");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const schema = require("./schema");

    const { Pool } = pg;
    // Export postgres items (these are conditional)
    module.exports.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    module.exports.db = drizzle(module.exports.pool, { schema });
    Object.assign(module.exports, schema);
  } catch (error) {
    console.warn("PostgreSQL not available, using Firestore only");
  }
} else {
  // Firestore is primary - verify it's configured
  if (process.env.NODE_ENV === "production" && !process.env.FIREBASE_CREDENTIALS && !process.env.FIREBASE_PROJECT_ID) {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error(
        "Firestore not properly configured. Set FIREBASE_CREDENTIALS (JSON) or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY. " +
          "For local development, set FIRESTORE_EMULATOR_HOST.",
      );
    }
  }
}
