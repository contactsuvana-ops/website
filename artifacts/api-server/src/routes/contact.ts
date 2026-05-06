import { Router, type IRouter } from "express";
import { getSubmissionsRepository, SubmissionType } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";
import { sendContactEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/contact", async (req, res): Promise<void> => {
  try {
    const parsed = SubmitContactBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { honeypot, ...data } = parsed.data;

    // Honeypot spam detection
    if (honeypot && honeypot.trim().length > 0) {
      // Silently return success to fool bots
      res.status(201).json({ success: true, id: 0, message: "Thank you for your message!" });
      return;
    }

    // Save to Firestore
    const repository = getSubmissionsRepository();
    const submission = await repository.createSubmission({
      type: SubmissionType.CONTACT,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    });

    // Send email notification (async, don't wait)
    sendContactEmail({
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    }).catch((error) => {
      logger.error({ error, submissionId: submission.id }, "Failed to send contact email");
    });

    req.log.info({ id: submission.id }, "Contact submission created");
    res.status(201).json({
      success: true,
      id: submission.id,
      message: "Thank you for reaching out! We will get back to you within 1–2 business days.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ error: errorMessage, stack: errorStack }, "Error processing contact submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
