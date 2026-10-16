/**
 * SMTP send via cloudflare-smtp (TCP + STARTTLS) — pattern from sammu-form.
 * Cyberfolks: smtp.cyberfolks.pl:587
 */
import { sendMail } from 'cloudflare-smtp';

export type SmtpEnv = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_FROM_NAME?: string;
  MAIL_TO?: string;
};

export type SmtpResult = { ok: true } | { ok: false; error: string };

export async function sendContactEmail(
  opts: {
    subject: string;
    text: string;
    replyTo: string;
    replyName?: string;
  },
  env: SmtpEnv,
): Promise<SmtpResult> {
  const host = (env.SMTP_HOST || 'smtp.cyberfolks.pl').trim();
  const port = Number((env.SMTP_PORT || '587').trim()) || 587;
  const username = (env.SMTP_USER || '').trim();
  const password = env.SMTP_PASS?.trim() || '';
  const from = (env.SMTP_FROM || username || 'no-reply@sezmoo.com').trim();
  const to = (env.MAIL_TO || 'biuro@sezmoo.com').trim();

  if (!username || !password) {
    console.error('smtp_not_configured');
    return { ok: false, error: 'SMTP not configured' };
  }

  try {
    // Body line endings: patched in scripts/patch-cloudflare-smtp.mjs (bare LF → CRLF).
    await sendMail(
      {
        host,
        port,
        secureTransport: port === 465 ? 'tls' : 'starttls',
        username,
        password,
        from,
        to,
        heloName: 'sezmoo.com',
        messageIdDomain: 'sezmoo.com',
      },
      {
        subject: opts.subject,
        replyTo: opts.replyTo,
        text: opts.text,
      },
    );
    console.log('smtp_sent', { to, from, host, port });
    return { ok: true };
  } catch (err) {
    console.error('smtp_send_failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return { ok: false, error: 'SMTP send failed' };
  }
}
