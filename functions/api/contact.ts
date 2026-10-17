/**
 * POST /api/contact — Cloudflare Pages Function
 * Port of send.php: Turnstile, honeypot, validation, rate limit, SMTP.
 */
import type { KVNamespace, PagesFunction } from '@cloudflare/workers-types';
import {
  buildContactEmail,
  checkRateLimit,
  clientIp,
  evaluateContactForm,
  isPreviewHost,
  mailboxForHost,
  requestHostname,
} from '../lib/contact';
import { sendContactEmail } from '../lib/smtp';
import { isTestTurnstileSecret, verifyTurnstile } from '../lib/turnstile';

export interface Env {
  TURNSTILE_SECRET_KEY: string;
  /** Local wrangler only — allows Cloudflare dummy Turnstile secrets. */
  ALLOW_TURNSTILE_TEST?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_FROM_NAME?: string;
  MAIL_TO?: string;
  /** Preview / pages.dev only. Production always uses MAIL_TO. */
  MAIL_TO_PREVIEW?: string;
  CONTACT_RATE_LIMIT?: KVNamespace;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function fail(msg: string, code = 400): Response {
  return json({ ok: false, error: msg }, code);
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid form body');
  }

  const parsed = evaluateContactForm(form);
  if (parsed.kind === 'honeypot') {
    return json({ ok: true });
  }

  const host = requestHostname(request);
  const preview = isPreviewHost(host);
  const mailbox = mailboxForHost(host, env);
  if (!mailbox.ok) {
    return fail(
      mailbox.reason === 'preview-disabled'
        ? 'Formularz niedostępny na tym środowisku.'
        : 'Nie udało się wysłać wiadomości.',
      503,
    );
  }

  const ip = clientIp(request);
  if (!(await checkRateLimit(env.CONTACT_RATE_LIMIT, ip, preview ? 'preview' : 'prod'))) {
    return fail('Za szybko — odczekaj chwilę.', 429);
  }

  const tsSecret = (env.TURNSTILE_SECRET_KEY || '').trim();
  const allowTest = env.ALLOW_TURNSTILE_TEST === '1';
  if (isTestTurnstileSecret(tsSecret) && !allowTest) {
    return fail('Turnstile nie jest skonfigurowany.', 500);
  }

  const cfToken = String(form.get('cf-turnstile-response') ?? '')
    .trim()
    .replace(/[\r\n\0]/g, ' ')
    .slice(0, 2048);

  const ts = await verifyTurnstile(cfToken, tsSecret, ip);
  if (!ts.ok) {
    return fail(
      ts.error === 'Turnstile not configured'
        ? 'Turnstile nie jest skonfigurowany.'
        : 'Weryfikacja antybot nieudana. Odśwież stronę i spróbuj ponownie.',
      ts.error === 'Turnstile not configured' ? 500 : 403,
    );
  }

  if (parsed.kind === 'fail') {
    return fail(parsed.error, parsed.status);
  }

  const when = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const mail = buildContactEmail(parsed.data, when);
  const sent = await sendContactEmail(
    {
      subject: mail.subject,
      text: mail.text,
      replyTo: parsed.data.email,
      to: mailbox.to,
    },
    env,
  );

  if (!sent.ok) {
    return fail('Nie udało się wysłać wiadomości.', 500);
  }

  return json({ ok: true });
};

export const onRequestGet: PagesFunction = async () => fail('Method not allowed', 405);
