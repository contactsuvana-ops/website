import { Router, type IRouter } from "express";
import { getQrScansRepository } from "../db";
import { logger } from "../lib/logger";

const ALLOWED_SOURCES = new Set(["quote-request", "site-visit"]);

export const qrScansPublicRouter: IRouter = Router();

qrScansPublicRouter.post("/:source", async (req, res): Promise<void> => {
  const { source } = req.params;
  if (!ALLOWED_SOURCES.has(source)) {
    res.status(404).json({ error: "Unknown QR source" });
    return;
  }
  try {
    await getQrScansRepository().recordScan(source);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error recording QR scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export const qrScansAdminRouter: IRouter = Router();

qrScansAdminRouter.get("/", async (_req, res): Promise<void> => {
  try {
    const items = await getQrScansRepository().listScans();
    res.json({ items });
  } catch (error) {
    logger.error({ error }, "Error fetching QR scan stats");
    res.status(500).json({ error: "Internal server error" });
  }
});
