import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const result: Record<string, string> = { status: "ok" };

  try {
    await admin.firestore().collection("_health").doc("ping").set({
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    result["firestore"] = "ok";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result["firestore"] = "error";
    result["firestoreError"] = msg;
    logger.error({ err }, "Firestore health check failed");
  }

  const httpStatus = result["firestore"] === "ok" ? 200 : 503;
  res.status(httpStatus).json(result);
});

export default router;
