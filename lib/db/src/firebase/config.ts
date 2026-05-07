/**
 * Firebase Configuration Module
 * Handles initialization and configuration of Firebase Firestore
 * Works with both local emulator and production Firebase
 */

import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let firestoreInstance: Firestore | null = null;

/**
 * Initialize Firebase based on environment
 * Production: Uses credentials from FIREBASE_CREDENTIALS env var
 * Local: Uses FIRESTORE_EMULATOR_HOST for local testing
 */
export function initializeFirebase(): Firestore {
  // Return existing instance if already initialized
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    // Get existing Firebase app or initialize new one
    const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());

    // Enable Firestore emulator for local development
    if (process.env.NODE_ENV === "development" && process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIREBASE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
      const db = getFirestore(app);
      db.settings({
        host: process.env.FIRESTORE_EMULATOR_HOST,
        ssl: false,
      });
      firestoreInstance = db;
    } else {
      firestoreInstance = getFirestore(app);
    }

    return firestoreInstance;
  } catch (error) {
    throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get Firebase configuration from environment
 * Supports both credentials JSON and individual env vars
 */
function getFirebaseConfig() {
  const credentialsJson = process.env.FIREBASE_CREDENTIALS;

  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      return {
        credential: cert(credentials),
      };
    } catch (error) {
      throw new Error(`Invalid FIREBASE_CREDENTIALS JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Fallback to individual env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    // For local development, allow initialization without credentials
    if (process.env.NODE_ENV === "development" && process.env.FIRESTORE_EMULATOR_HOST) {
      return {
        projectId: projectId || "test-project",
        credential: cert({
          projectId: projectId || "test-project",
          clientEmail: clientEmail || "test@test.iam.gserviceaccount.com",
          privateKey: privateKey || "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jPpOKkGJNe\n-----END PRIVATE KEY-----\n",
        }),
      };
    }

    throw new Error(
      "Firebase credentials not configured. Set FIREBASE_CREDENTIALS env var (JSON) " +
        "or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY individually. " +
        "For local development, set FIRESTORE_EMULATOR_HOST.",
    );
  }

  return {
    projectId,
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  };
}

export function getFirestore_Instance(): Firestore {
  if (!firestoreInstance) {
    return initializeFirebase();
  }
  return firestoreInstance;
}
