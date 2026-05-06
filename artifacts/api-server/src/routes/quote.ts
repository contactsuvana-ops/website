import { Router, type IRouter } from "express";
import { getSubmissionsRepository, SubmissionType } from "@workspace/db";
import { SubmitQuoteBody } from "@workspace/api-zod";
import { sendQuoteEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/quote", async (req, res): Promise<void> => {
  try {
    const parsed = SubmitQuoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { honeypot, ...data } = parsed.data;

    // Honeypot spam detection
    if (honeypot && honeypot.trim().length > 0) {
      // Silently return success to fool bots
      res.status(201).json({ success: true, id: 0, message: "Your quote request has been received!" });
      return;
    }

    logger.info({ data }, "Processing quote submission");

    // Save to Firestore
    const repository = getSubmissionsRepository();
    const submission = await repository.createSubmission({
      type: SubmissionType.QUOTE,
      name: data.name,
      email: data.email,
      phone: data.phone,
      projectType: data.projectType,
      location: data.location,
      budget: data.budget ?? null,
      timeline: data.timeline ?? null,
      message: data.message,
    });

    logger.info({ submission }, "Quote submission saved");

    // Send email notification (async, don't wait)
    sendQuoteEmail({
      name: data.name,
      email: data.email,
      phone: data.phone,
      projectType: data.projectType,
      location: data.location,
      budget: data.budget ?? null,
      timeline: data.timeline ?? null,
      message: data.message,
    }).catch((error) => {
      logger.error({ error, submissionId: submission.id }, "Failed to send quote email");
    });

    req.log.info({ id: submission.id }, "Quote submission created");
    res.status(201).json({
      success: true,
      id: submission.id,
      message: "Your quote request has been received! We will follow up within 1 business day.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ error: errorMessage, stack: errorStack }, "Error processing quote submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
