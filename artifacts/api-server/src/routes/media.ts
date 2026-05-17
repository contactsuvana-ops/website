import { Router, type IRouter } from "express";
import multer from "multer";
import crypto from "crypto";
import admin from "firebase-admin";
import { getMediaRepository, type MediaLinkedToType } from "../db";
import { requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET_NAME = process.env["FIREBASE_STORAGE_BUCKET"] ?? `${process.env["GCLOUD_PROJECT"] ?? "suvana-97279"}.firebasestorage.app`;

// ─── Upload (admin) ───────────────────────────────────────────────────────────

router.post(
  "/admin/media/upload",
  requireAdmin,
  upload.single("file"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const mediaId = crypto.randomUUID();
      const originalName = req.file.originalname;
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `media/${mediaId}/${safeName}`;

      const bucket = admin.storage().bucket(BUCKET_NAME);
      const fileRef = bucket.file(storagePath);

      // Generate a stable download token so the URL is deterministic
      const downloadToken = crypto.randomUUID();

      await fileRef.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      });

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET_NAME)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

      // Parse optional linkedTo from body
      const linkedToType = req.body?.linkedToType as MediaLinkedToType | undefined;
      const linkedToId = req.body?.linkedToId as string | undefined;

      const repo = getMediaRepository();
      const media = await repo.createMedia({
        filename: safeName,
        originalName,
        storagePath,
        downloadUrl,
        contentType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: "admin",
        linkedTo:
          linkedToType && linkedToId
            ? { type: linkedToType, id: linkedToId }
            : undefined,
      });

      res.status(201).json(media);
    } catch (error) {
      logger.error({ error }, "Error uploading media");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Download proxy (public) ──────────────────────────────────────────────────

router.get("/media/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getMediaRepository();
    const media = await repo.getMedia(id);
    if (!media) {
      res.status(404).json({ error: "Media not found" });
      return;
    }

    const bucket = admin.storage().bucket(BUCKET_NAME);
    const fileRef = bucket.file(media.storagePath);

    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${media.originalName}"`
    );

    fileRef.createReadStream().pipe(res);
  } catch (error) {
    logger.error({ error }, "Error streaming media");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── List media (admin) ───────────────────────────────────────────────────────

router.get("/admin/media", requireAdmin, async (req, res): Promise<void> => {
  try {
    const linkedToType = req.query["linkedToType"] as MediaLinkedToType | undefined;
    const linkedToId = req.query["linkedToId"] as string | undefined;
    const repo = getMediaRepository();
    const items = await repo.listMedia(
      linkedToType && linkedToId ? { linkedToType, linkedToId } : undefined
    );
    res.json(items);
  } catch (error) {
    logger.error({ error }, "Error listing media");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Delete media (admin) ─────────────────────────────────────────────────────

router.delete("/admin/media/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const repo = getMediaRepository();
    const media = await repo.getMedia(id);
    if (!media) {
      res.status(404).json({ error: "Media not found" });
      return;
    }

    // Delete from Firebase Storage
    const bucket = admin.storage().bucket(BUCKET_NAME);
    await bucket.file(media.storagePath).delete({ ignoreNotFound: true });

    // Delete Firestore record
    await repo.deleteMedia(id);

    res.sendStatus(204);
  } catch (error) {
    logger.error({ error }, "Error deleting media");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
