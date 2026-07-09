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

export async function sendQuoteToCustomer(data: {
  to: string;
  customerName: string;
  estimateTitle: string;
  versionNumber: number;
  portalUrl: string;
  message?: string;
  validUntil: Date;
  totals: { grandTotal: number; depositAmount: number };
}): Promise<void> {
  const subject = `Your Quote is Ready — ${escHtml(data.estimateTitle)}`;
  const validDate = data.validUntil.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1a1a1a;padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">Suvana Constructions</h1>
      </div>
      <div style="padding:32px;background:#fff;">
        <h2 style="margin-top:0;">Hi ${escHtml(data.customerName)},</h2>
        <p>Your quote for <strong>${escHtml(data.estimateTitle)}</strong> (v${data.versionNumber}) is ready to review.</p>
        ${data.message ? `<p style="background:#f9f9f9;padding:16px;border-left:3px solid #e5e5e5;">${escHtml(data.message)}</p>` : ""}
        <div style="background:#f5f5f5;padding:20px;border-radius:4px;margin:24px 0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span>Total</span>
            <strong>$${data.totals.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Deposit</span>
            <strong>$${data.totals.depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
        <p style="color:#666;font-size:14px;">This quote is valid until <strong>${validDate}</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${data.portalUrl}" style="background:#1a1a1a;color:#fff;padding:14px 32px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">
            Review &amp; Accept Quote →
          </a>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">
          If the button doesn't work, copy this link:<br>
          <a href="${data.portalUrl}" style="color:#666;">${data.portalUrl}</a>
        </p>
      </div>
    </div>
  `;
  await sendEmailTo(data.to, subject, html);
}

export async function sendQuoteAcceptedNotification(data: {
  estimateTitle: string;
  customerName: string;
  customerEmail: string;
  grandTotal: number;
  depositAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  sections?: { id: string; title: string; position: number }[];
  acceptedItems?: { id: string; sectionId: string; description: string; qty: number; unit: string; isOptional: boolean; lineTotal?: number }[];
}): Promise<void> {
  const subject = `✓ Quote Accepted — ${escHtml(data.estimateTitle)}`;

  const fmtMoney = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let itemsHtml = "";
  if (data.sections && data.acceptedItems && data.acceptedItems.length > 0) {
    const itemsBySectionId = new Map<string, typeof data.acceptedItems>();
    for (const item of data.acceptedItems) {
      const list = itemsBySectionId.get(item.sectionId) ?? [];
      list.push(item);
      itemsBySectionId.set(item.sectionId, list);
    }

    itemsHtml = `
      <h3 style="margin-top:24px;margin-bottom:8px;font-size:14px;color:#555;">Accepted Items</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e0e0e0;">Item</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:1px solid #e0e0e0;">Qty</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:1px solid #e0e0e0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.sections
            .filter((s) => itemsBySectionId.has(s.id))
            .map((section) => {
              const sectionItems = (itemsBySectionId.get(section.id) ?? []).sort(
                (a, b) => (a as { position?: number }).position! - (b as { position?: number }).position!
              );
              return `
                <tr>
                  <td colspan="3" style="padding:10px 10px 4px;font-weight:600;color:#333;border-top:2px solid #e0e0e0;">${escHtml(section.title)}</td>
                </tr>
                ${sectionItems.map((item) => `
                  <tr>
                    <td style="padding:6px 10px 6px 20px;color:#333;">
                      ${escHtml(item.description)}
                      ${item.isOptional ? `<span style="margin-left:6px;font-size:11px;color:#2563eb;font-weight:500;">Optional add-on</span>` : ""}
                    </td>
                    <td style="padding:6px 10px;text-align:right;color:#666;">${item.qty}${item.unit ? " " + escHtml(item.unit) : ""}</td>
                    <td style="padding:6px 10px;text-align:right;font-weight:500;color:#333;">${item.lineTotal !== undefined ? fmtMoney(item.lineTotal) : "—"}</td>
                  </tr>
                `).join("")}
              `;
            }).join("")}
        </tbody>
      </table>`;
  }

  const totalsHtml = `
    <table style="border-collapse:collapse;width:100%;margin-top:16px;font-size:13px;">
      ${(data.discountAmount ?? 0) > 0 ? `
        <tr>
          <td style="padding:5px 10px;color:#666;">Discount</td>
          <td style="padding:5px 10px;text-align:right;color:#16a34a;">–${fmtMoney(data.discountAmount!)}</td>
        </tr>` : ""}
      ${(data.taxAmount ?? 0) > 0 ? `
        <tr>
          <td style="padding:5px 10px;color:#666;">Tax</td>
          <td style="padding:5px 10px;text-align:right;">${fmtMoney(data.taxAmount!)}</td>
        </tr>` : ""}
      <tr style="border-top:2px solid #333;">
        <td style="padding:10px 10px;font-weight:700;font-size:15px;">Grand Total</td>
        <td style="padding:10px 10px;text-align:right;font-weight:700;font-size:15px;">${fmtMoney(data.grandTotal)}</td>
      </tr>
      ${(data.depositAmount ?? 0) > 0 ? `
        <tr>
          <td style="padding:5px 10px;color:#666;">Deposit Required</td>
          <td style="padding:5px 10px;text-align:right;font-weight:500;">${fmtMoney(data.depositAmount!)}</td>
        </tr>` : ""}
    </table>`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#16a34a;">✓ Quote Accepted!</h2>
      <p><strong>${escHtml(data.customerName)}</strong> (<a href="mailto:${escHtml(data.customerEmail)}">${escHtml(data.customerEmail)}</a>) has accepted the quote for <strong>${escHtml(data.estimateTitle)}</strong>.</p>
      ${itemsHtml}
      ${totalsHtml}
    </div>
  `;
  await sendEmail(subject, html, data.customerEmail);
}

export async function sendQuoteActionNotification(data: {
  action: "declined" | "revision_requested" | "comment";
  estimateTitle: string;
  customerName: string;
  customerEmail: string;
  message?: string;
}): Promise<void> {
  const labels = {
    declined: "Declined",
    revision_requested: "Requested Changes",
    comment: "New Comment",
  };
  const subject = `Quote ${labels[data.action]} — ${escHtml(data.estimateTitle)}`;
  const html = `
    <h2>Quote ${labels[data.action]}</h2>
    <p><strong>${escHtml(data.customerName)}</strong> (${escHtml(data.customerEmail)}) has ${data.action.replace("_", " ")} the quote for <strong>${escHtml(data.estimateTitle)}</strong>.</p>
    ${data.message ? `<blockquote style="border-left:3px solid #ccc;margin-left:0;padding-left:16px;">${escHtml(data.message)}</blockquote>` : ""}
  `;
  await sendEmail(subject, html, data.customerEmail);
}

async function sendEmailTo(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info({ subject, to }, "Email would have been sent (SMTP not configured)");
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    logger.info({ subject, to }, "Email sent successfully");
  } catch (err) {
    logger.error({ err, subject }, "Failed to send email");
  }
}
