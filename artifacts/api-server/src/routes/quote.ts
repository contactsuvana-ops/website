import { Router, type IRouter } from "express";
import { getSubmissionsRepository } from "../db";
import { SubmitQuoteBody } from "../validation";
import { sendQuoteEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    logger.warn("RECAPTCHA_SECRET_KEY is not configured");
    return true; // Allow submission if secret key is not configured
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = (await response.json()) as RecaptchaResponse;
    // For reCAPTCHA v3, check both success and score (threshold: 0.5)
    const isValid = data.success && (data.score === undefined || data.score >= 0.5);
    return isValid;
  } catch (error) {
    logger.error({ error }, "Error verifying reCAPTCHA token");
    return false;
  }
}

router.post("/quote", async (req, res): Promise<void> => {
  try {
    const parsed = SubmitQuoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { honeypot, recaptchaToken, ...data } = parsed.data;
    if (honeypot && honeypot.trim().length > 0) {
      res.status(201).json({ success: true, message: "Your quote request has been received!" });
      return;
    }

    // Verify reCAPTCHA token
    const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
    if (!isValidCaptcha) {
      logger.warn({ recaptchaToken: recaptchaToken.substring(0, 20) + "..." }, "Invalid reCAPTCHA token");
      res.status(400).json({ error: "reCAPTCHA verification failed. Please try again." });
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
