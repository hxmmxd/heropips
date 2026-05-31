import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'smtp_config')
      .single();

    if (data?.value) {
      const v = data.value;
      return {
        host: v.host || '',
        port: Number(v.port) || 587,
        user: v.user || '',
        pass: v.pass || '',
        from: v.from || 'TradeGPT <noreply@yourdomain.com>',
        secure: !!v.secure,
      };
    }
  } catch (e) {
    console.warn('[mail] Failed to load SMTP config from DB:', e);
  }

  // Fallback env vars
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'TradeGPT <noreply@yourdomain.com>',
      secure: process.env.SMTP_SECURE === 'true',
    };
  }

  return null;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const config = await getSmtpConfig();
  if (!config || !config.host) {
    throw new Error('SMTP configuration is missing. Please configure it in Admin Settings.');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  });
}

export async function sendOtpEmail(to: string, otp: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e1b4b; text-align: center; margin-bottom: 24px;">Verify Your Email Address</h2>
      <p style="font-size: 15px; color: #475569; line-height: 1.5;">
        Thank you for signing up for TradeGPT. Please use the following one-time password (OTP) to complete your account registration:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #6366f1; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center;">
        This code is valid for 10 minutes. If you did not request this code, please ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to,
    subject: `[TradeGPT] Email Verification Code: ${otp}`,
    html,
  });
}
