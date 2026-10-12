import { env } from "../../config/env";
import { escapeHtml, sendMail } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";
import type { ContactInput } from "./contact.schemas";

// Public contact form (logic extracted from server contact.routes.ts). Messages are
// stored for the admin inbox (/api/admin/contact-messages). The route answers 201.

/** Stores the message and notifies the admin (non-blocking; a failed email never fails the request). */
export async function submitContactMessage(body: ContactInput): Promise<{ message: string }> {
  const { id } = await prisma.contactMessage.create({ data: body, select: { id: true } });

  // Notify the admin (non-blocking; a failed email never fails the request).
  const fields: [string, string][] = [["From", `${body.name} <${body.email}>`], ["Phone", body.phone ?? "-"], ["Subject", body.subject]];
  sendMail({
    to: env.mail.adminEmail,
    subject: `Contact form #${id}: ${body.subject.replace(/[\r\n]+/g, " ")}`,
    text: [...fields.map(([k, v]) => `${k}: ${v}`), "", body.message].join("\n"),
    html:
      fields.map(([k, v]) => `<p><strong>${k}:</strong> ${escapeHtml(v)}</p>`).join("") +
      `<p style="white-space:pre-wrap">${escapeHtml(body.message)}</p>`,
  });

  return { message: "Thanks for writing to us. We'll get back to you soon." };
}
