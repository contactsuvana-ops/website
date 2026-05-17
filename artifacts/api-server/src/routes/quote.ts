import { Router, type IRouter } from "express";
import { getSubmissionsRepository } from "../db";
import { SubmitQuoteBody } from "../validation";
import { sendQuoteEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/quote", async (req, res): Promise<void> => {
  try {
    const parsed = SubmitQuoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { honeypot, ...data } = parsed.data;
    if (honeypot && honeypot.trim().length > 0) {
      res.status(201).json({ success: true, message: "Your quote request has been received!" });
      return;
    }

    const repository = getSubmissionsRepository();
    const submission = await repository.createSubmission({
      type: "quote",
      name: data.name,
      email: data.email,
      phone: data.phone,
      projectType: data.projectType,
      location: data.location,
      budget: data.budget,
      timeline: data.timeline,
      companyName: data.companyName,
      message: data.message,
    });

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
    logger.error({ error }, "Error processing quote submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
