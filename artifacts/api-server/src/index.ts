import "dotenv/config";
import admin from "firebase-admin";
import app from "./app";
import { logger } from "./lib/logger";

// Initialize Firebase Admin SDK with Application Default Credentials
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    logger.info("Firebase Admin SDK initialized");
  } catch (error) {
    logger.error({ error }, "Failed to initialize Firebase Admin SDK");
    process.exit(1);
  }
}

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

app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
