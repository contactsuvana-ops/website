import nodemailer from "nodemailer";
import { logger } from "./logger";

const RECIPIENT_EMAIL = "contactsuvana@gmail.com";

function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.warn("SMTP credentials not configured — emails will be logged only");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

export async function sendContactEmail(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): Promise<void> {
  const subject = `New Contact Inquiry from ${data.name}`;
  const html = `
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Name</td><td style="padding:8px;">${escHtml(data.name)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Email</td><td style="padding:8px;">${escHtml(data.email)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Phone</td><td style="padding:8px;">${escHtml(data.phone)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;vertical-align:top;">Message</td><td style="padding:8px;">${escHtml(data.message).replace(/\n/g, "<br>")}</td></tr>
    </table>
  `;
  await sendEmail(subject, html, data.email);
}

export async function sendQuoteEmail(data: {
  name: string;
  email: string;
  phone: string;
  projectType: string;
  location: string;
  budget?: string | null;
  timeline?: string | null;
  message: string;
}): Promise<void> {
  const subject = `New Quote Request from ${data.name} — ${formatProjectType(data.projectType)}`;
  const html = `
    <h2>New Quote Request</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Name</td><td style="padding:8px;">${escHtml(data.name)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Email</td><td style="padding:8px;">${escHtml(data.email)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Phone</td><td style="padding:8px;">${escHtml(data.phone)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Project Type</td><td style="padding:8px;">${escHtml(formatProjectType(data.projectType))}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Location</td><td style="padding:8px;">${escHtml(data.location)}</td></tr>
      ${data.budget ? `<tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Budget</td><td style="padding:8px;">${escHtml(formatBudget(data.budget))}</td></tr>` : ""}
      ${data.timeline ? `<tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;">Timeline</td><td style="padding:8px;">${escHtml(formatTimeline(data.timeline))}</td></tr>` : ""}
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5;vertical-align:top;">Project Details</td><td style="padding:8px;">${escHtml(data.message).replace(/\n/g, "<br>")}</td></tr>
    </table>
  `;
  await sendEmail(subject, html, data.email);
}

async function sendEmail(subject: string, html: string, replyTo?: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info({ subject }, "Email would have been sent (SMTP not configured)");
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: RECIPIENT_EMAIL,
      replyTo,
      subject,
      html,
    });
    logger.info({ subject, to: RECIPIENT_EMAIL }, "Email sent successfully");
  } catch (err) {
    logger.error({ err, subject }, "Failed to send email");
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatProjectType(pt: string): string {
  const map: Record<string, string> = {
    "kitchen-remodeling": "Kitchen Remodeling",
    drywall: "Drywall",
    plumbing: "Plumbing",
    electrical: "Electrical",
    flooring: "Flooring",
    fireplace: "Fireplace",
    basement: "Basement",
    painting: "Painting",
    remodeling: "Remodeling",
    handyman: "Handyman",
  };
  return map[pt] ?? pt;
}

function formatBudget(b: string): string {
  const map: Record<string, string> = {
    "under-5k": "Under $5,000",
    "5k-15k": "$5,000 – $15,000",
    "15k-50k": "$15,000 – $50,000",
    "50k-100k": "$50,000 – $100,000",
    "over-100k": "Over $100,000",
    "not-sure": "Not sure yet",
  };
  return map[b] ?? b;
}

function formatTimeline(t: string): string {
  const map: Record<string, string> = {
    asap: "As soon as possible",
    "1-3-months": "1–3 months",
    "3-6-months": "3–6 months",
    "6-12-months": "6–12 months",
    flexible: "Flexible",
  };
  return map[t] ?? t;
}
