import { Router, type IRouter } from "express";
import { db, submissionsTable } from "@workspace/db";
import { SubmitQuoteBody } from "@workspace/api-zod";
import { sendQuoteEmail } from "../lib/email";

const router: IRouter = Router();

router.post("/quote", async (req, res): Promise<void> => {
  const parsed = SubmitQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { honeypot, ...data } = parsed.data;
  if (honeypot && honeypot.trim().length > 0) {
    res.status(201).json({ success: true, id: 0, message: "Your quote request has been received!" });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      type: "quote",
      name: data.name,
      email: data.email,
      phone: data.phone,
      projectType: data.projectType,
      location: data.location,
      budget: data.budget ?? null,
      timeline: data.timeline ?? null,
      message: data.message,
    })
    .returning();

  await sendQuoteEmail({
    name: data.name,
    email: data.email,
    phone: data.phone,
    projectType: data.projectType,
    location: data.location,
    budget: data.budget ?? null,
    timeline: data.timeline ?? null,
    message: data.message,
  });

  req.log.info({ id: submission.id }, "Quote submission stored");
  res.status(201).json({ success: true, id: submission.id, message: "Your quote request has been received! We will follow up within 1 business day." });
});

export default router;
