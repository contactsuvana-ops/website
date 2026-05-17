import "dotenv/config";
import admin from "firebase-admin";
import { logger } from "./lib/logger";

// Dotenv may load a local .env that points at the Firestore/Auth emulators.
// In production these point at localhost which doesn't exist — clear them.
if (process.env["NODE_ENV"] === "production") {
  delete process.env["FIRESTORE_EMULATOR_HOST"];
  delete process.env["FIREBASE_AUTH_EMULATOR_HOST"];
  delete process.env["FIREBASE_STORAGE_EMULATOR_HOST"];
  delete process.env["PUBSUB_EMULATOR_HOST"];
}

// Initialize Firebase Admin SDK BEFORE importing app
if (!admin.apps.length) {
  try {
    const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
    const rawKey = process.env["FIREBASE_PRIVATE_KEY"];
    const projectId = process.env["FIREBASE_PROJECT_ID"];

    if (clientEmail && rawKey && projectId) {
      // Explicit service account credentials (provided via env vars)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: rawKey.replace(/\\n/g, "\n"),
        }),
      });
      logger.info("Firebase Admin SDK initialized with explicit credentials");
    } else {
      // Application Default Credentials (Cloud Run service account)
      admin.initializeApp();
      logger.info("Firebase Admin SDK initialized with ADC");
    }
  } catch (error) {
    logger.error({ error }, "Failed to initialize Firebase Admin SDK");
    process.exit(1);
  }
}

// NOW import the app (which imports routes that depend on Firebase)
import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
