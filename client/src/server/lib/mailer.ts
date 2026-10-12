import { after } from "next/server";
import { env } from "../config/env";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  name: string;
  send(message: MailMessage): Promise<void>;
}

/** Dev default: logs the email. In production only the recipient and subject are logged (bodies can hold reset links). */
const consoleMailer: Mailer = {
  name: "console",
  async send({ to, subject, text }) {
    console.info(`[mail] to=${to} subject="${subject}"${env.isProd ? "" : `\n${text}`}`);
  },
};

import * as nodemailer from "nodemailer";

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
function resendMailer(apiKey: string): Mailer {
  return {
    name: "resend",
    async send(message) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.mail.from, ...message }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  };
}

/** SMTP using nodemailer */
function smtpMailer(): Mailer {
  const { host, port, user, pass } = env.mail.smtp;
  if (!user || !pass) {
    throw new Error("MAIL_PROVIDER=smtp needs SMTP_USER and SMTP_PASS");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return {
    name: "smtp",
    async send(message) {
      await transporter.sendMail({
        from: env.mail.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}

/** Picked once at startup from MAIL_PROVIDER. A provider selected without its keys stops the server with a clear error. */
function createMailer(): Mailer {
  const { provider, resendApiKey } = env.mail;
  if (provider === "console") return consoleMailer;
  if (provider === "resend") {
    if (!resendApiKey) throw new Error("MAIL_PROVIDER=resend needs RESEND_API_KEY (and MAIL_FROM on a verified domain)");
    return resendMailer(resendApiKey);
  }
  if (provider === "smtp" || provider === "gmail") {
    return smtpMailer();
  }
  throw new Error(`Unknown MAIL_PROVIDER "${provider}" (use console, resend, smtp, or gmail)`);
}

export const mailer = createMailer();

/**
 * Keeps already-started background work alive past the response on serverless hosts:
 * inside a request scope it is handed to Next's `after()` (the platform waits for it);
 * outside one (scripts, tests calling handlers directly) `after` throws and the work just
 * runs fire-and-forget. `task` must never reject. Nothing here delays the response.
 */
export function keepAlive(task: Promise<unknown>): void {
  try {
    after(task);
  } catch {
    // not in a request scope: fire-and-forget
  }
}

/**
 * Fire-and-forget: never awaited by request handlers, never throws. A failure
 * is logged, so an email problem can never fail an order or a request. The returned
 * promise never rejects (await it only from background work, e.g. orders.emails.ts).
 */
export function sendMail(message: MailMessage): Promise<void> {
  const task = mailer.send(message).catch((err: unknown) => console.error(`[mail] failed to send "${message.subject}" to ${message.to}`, err));
  keepAlive(task);
  return task;
}

/** Escape user-supplied text before putting it in an HTML email. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
