/**
 * SMTP send via cloudflare-smtp (TCP + STARTTLS) — pattern from sammu-form.
 * Cyberfolks: s186.cyber-folks.pl:465 (implicit TLS; prefer over 587 STARTTLS on CF Workers).
 */
import { sendMail } from 'cloudflare-smtp';

export type SmtpEnv = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_FROM_NAME?: string;
};

export type SmtpResult = { ok: true } | { ok: false; error: string };

export async function sendContactEmail(
  opts: {
    subject: string;
    text: string;
    replyTo: string;
    to: string;
    replyName?: string;
  },
  env: SmtpEnv,
): Promise<SmtpResult> {
  const host = (env.SMTP_HOST || 's186.cyber-folks.pl').trim();
  const port = Number((env.SMTP_PORT || '465').trim()) || 465;
  const username = (env.SMTP_USER || '').trim();
  const password = env.SMTP_PASS?.trim() || '';
  const from = (env.SMTP_FROM || username || 'noreply@sezmoo.com').trim();
  const to = opts.to.trim();

  if (!username || !password || !to) {
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
