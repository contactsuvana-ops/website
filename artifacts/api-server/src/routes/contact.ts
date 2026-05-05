import { Router, type IRouter } from "express";
import { db, submissionsTable } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";
import { sendContactEmail } from "../lib/email";

const router: IRouter = Router();

router.post("/contact", async (req, res): Promise<void> => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { honeypot, ...data } = parsed.data;
  if (honeypot && honeypot.trim().length > 0) {
    res.status(201).json({ success: true, id: 0, message: "Thank you for your message!" });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      type: "contact",
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    })
    .returning();

  await sendContactEmail({
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
  });

  req.log.info({ id: submission.id }, "Contact submission stored");
  res.status(201).json({ success: true, id: submission.id, message: "Thank you for reaching out! We will get back to you within 1–2 business days." });
});

export default router;
