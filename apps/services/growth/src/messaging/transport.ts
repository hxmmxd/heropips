import { Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { maskEmail } from "../common/position";
import type { MessagingConfig } from "./config";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers (List-Unsubscribe etc.). */
  headers?: Record<string, string>;
};

export interface EmailTransport {
  send(msg: OutgoingEmail): Promise<{ providerId: string | null }>;
}

export const EMAIL_TRANSPORT = Symbol("EMAIL_TRANSPORT");

/**
 * Any SMTP endpoint: Mailpit in dev; Brevo/Resend/SES/postfix in prod — all
 * of them speak SMTP, so the provider is a pure env decision.
 */
export class SmtpTransport implements EmailTransport {
  private readonly mailer: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
    private readonly replyTo: string | null,
  ) {
    this.mailer = nodemailer.createTransport(smtpUrl);
  }

  async send(msg: OutgoingEmail): Promise<{ providerId: string | null }> {
    const info = await this.mailer.sendMail({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: msg.headers,
      ...(this.replyTo ? { replyTo: this.replyTo } : {}),
    });
    return { providerId: typeof info.messageId === "string" ? info.messageId : null };
  }
}

/**
 * No SMTP configured: log the envelope so dev flows stay observable. The
 * recipient is masked (L1) — this transport is only ever selected outside
 * production (loadMessagingConfig throws without SMTP_URL there), but a
 * dev/staging log is still not the place for a full member address.
 */
export class LogTransport implements EmailTransport {
  private readonly logger = new Logger("email-log");

  async send(msg: OutgoingEmail): Promise<{ providerId: string | null }> {
    this.logger.log(`[email:not-sent] to=${maskEmail(msg.to)} subject="${msg.subject}"`);
    return { providerId: null };
  }
}

export function makeTransport(cfg: MessagingConfig): EmailTransport {
  return cfg.smtpUrl !== null
    ? new SmtpTransport(cfg.smtpUrl, cfg.emailFrom, cfg.replyTo)
    : new LogTransport();
}
