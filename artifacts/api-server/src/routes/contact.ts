import { Router, type IRouter } from "express";
import { getSubmissionsRepository } from "../db";
import { SubmitContactBody } from "../validation";
import { sendContactEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/contact", async (req, res): Promise<void> => {
  try {
    const parsed = SubmitContactBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { honeypot, ...data } = parsed.data;
    if (honeypot && honeypot.trim().length > 0) {
      res.status(201).json({ success: true, message: "Thank you for your message!" });
      return;
    }

    const repository = getSubmissionsRepository();
    const submission = await repository.createSubmission({
      type: "contact",
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    });

    sendContactEmail({
      name: data.name,
      email: data.email,
      phone: data.phone ?? "",
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
    logger.error({ error }, "Error processing contact submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
