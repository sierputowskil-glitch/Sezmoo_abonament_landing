/**
 * POST /api/contact — Cloudflare Pages Function
 * Port of send.php: Turnstile, honeypot, validation, rate limit, SMTP.
 */
import type { KVNamespace, PagesFunction } from '@cloudflare/workers-types';
import { sendContactEmail } from '../lib/smtp';
import { verifyTurnstile } from '../lib/turnstile';

export interface Env {
  TURNSTILE_SECRET_KEY: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_FROM_NAME?: string;
  MAIL_TO?: string;
  /** Shared rate limit; bind via wrangler.toml / CF Pages dashboard. */
  CONTACT_RATE_LIMIT?: KVNamespace;
}

const RATE_SECONDS = 20;
const MAX_LINKS = 2;

/** Fallback when KV is not bound (local / misconfigured). Not shared across isolates. */
const rateBucket = new Map<string, number>();

const ALLOWED_NEED = new Set([
  'Wideo / motion',
  'Kampania / content',
  'Social media',
  'Design / grafika',
  'Strona / landing page',
  'Nie wiem, chcę pogadać',
  'Video / motion',
  'Campaign / content',
  'Design / graphics',
  'Website / landing page',
  'Not sure, let’s talk',
  "Not sure, let's talk",
  'Foto',
  'Grafika',
  'Wszystko po trochu',
  'Photo',
  'Design',
  'A bit of everything',
]);

const ALLOWED_PACKAGE = new Set([
  '30h',
  '60h',
  '120h',
  '250h',
  'Custom',
  'Nie wiem – doradźcie',
]);

const NAME_RE =
  /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*(?:\s+[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*)+$/u;

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

function clean(v: FormDataEntryValue | null, max = 300): string {
  const s = String(v ?? '')
    .trim()
    .replace(/[\r\n\0]/g, ' ');
  return s.slice(0, max);
}

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

async function checkRateLimit(
  kv: KVNamespace | undefined,
  ip: string,
  secret: string,
): Promise<boolean> {
  const key = `rl:${ip}:${secret.slice(0, 8)}`;
  const now = Date.now();

  if (kv) {
    const prev = await kv.get(key);
    if (prev) {
      const last = Number(prev);
      if (Number.isFinite(last) && now - last < RATE_SECONDS * 1000) {
        return false;
      }
    }
    // KV min expirationTtl is 60s; window itself is RATE_SECONDS via timestamp check.
    await kv.put(key, String(now), { expirationTtl: Math.max(60, RATE_SECONDS) });
    return true;
  }

  const last = rateBucket.get(key) || 0;
  if (now - last < RATE_SECONDS * 1000) return false;
  rateBucket.set(key, now);
  return true;
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

  // honeypot — pretend success
  if (clean(form.get('bot-field'), 40) !== '') {
    return json({ ok: true });
  }

  const ip = clientIp(request);
  const tsSecret = (env.TURNSTILE_SECRET_KEY || '').trim();
  const cfToken = clean(form.get('cf-turnstile-response'), 2048);

  const ts = await verifyTurnstile(cfToken, tsSecret, ip);
  if (!ts.ok) {
    return fail(
      ts.error === 'Turnstile not configured'
        ? 'Turnstile nie jest skonfigurowany.'
        : 'Weryfikacja antybot nieudana. Odśwież stronę i spróbuj ponownie.',
      ts.error === 'Turnstile not configured' ? 500 : 403,
    );
  }

  if (!(await checkRateLimit(env.CONTACT_RATE_LIMIT, ip, tsSecret))) {
    return fail('Za szybko — odczekaj chwilę.', 429);
  }

  const lang = clean(form.get('lang'), 4) === 'en' ? 'en' : 'pl';
  const name = clean(form.get('name'), 120).replace(/\s+/gu, ' ');
  const email = clean(form.get('email'), 160);
  const phone = clean(form.get('phone'), 40);
  const company = clean(form.get('company'), 160);
  const need = clean(form.get('need'), 80);
  const message = String(form.get('message') ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, 5000);
  const consent = form.get('consent') != null && form.get('consent') !== '';
  let packageVal = clean(form.get('package'), 40);
  if (packageVal && !ALLOWED_PACKAGE.has(packageVal)) packageVal = '';
  const origin =
    clean(form.get('form-name'), 40) === 'abonament' ? 'abonament' : 'kontakt';

  if (need && !ALLOWED_NEED.has(need)) {
    return fail('Nieprawidłowy obszar.');
  }

  if (!name || !message) {
    return fail(
      lang === 'en'
        ? 'Please fill in the required fields.'
        : 'Uzupełnij wymagane pola.',
    );
  }

  if (!NAME_RE.test(name)) {
    return fail(
      lang === 'en'
        ? 'Enter your first and last name (letters only).'
        : 'Podaj imię i nazwisko (same litery).',
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(
      lang === 'en' ? 'Invalid email address.' : 'Nieprawidłowy adres e-mail.',
    );
  }

  if (phone) {
    const digits = phone.replace(/\D+/g, '');
    if (
      !/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/.test(phone) ||
      digits.length < 9 ||
      digits.length > 15
    ) {
      return fail(
        lang === 'en'
          ? 'Enter a valid phone number (e.g. +48 500 000 000).'
          : 'Podaj prawidłowy numer telefonu (np. +48 500 000 000).',
      );
    }
  }

  if (!consent) {
    return fail(
      lang === 'en'
        ? 'Consent is required.'
        : 'Wymagana zgoda na przetwarzanie danych.',
    );
  }

  if (message.length < 10) {
    return fail(
      lang === 'en' ? 'Message is too short.' : 'Wiadomość jest zbyt krótka.',
    );
  }

  const linkHits = (name + ' ' + message).match(/https?:\/\/|www\./gi);
  if (linkHits && linkHits.length > MAX_LINKS) {
    return fail('Wiadomość odrzucona.');
  }
  if (/\[url=|\[\/url\]|<a\s+href/i.test(name + ' ' + message)) {
    return fail('Wiadomość odrzucona.');
  }
  if (
    /\b(seo\s+services|backlinks?|crypto\s+invest|viagra|casino|loan\s+offer)\b/i.test(
      message,
    )
  ) {
    return fail('Wiadomość odrzucona.');
  }
  if (/https?:\/\//i.test(name)) {
    return fail('Wiadomość odrzucona.');
  }

  const when = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const companyLine = company ? `Firma           : ${company}\n` : '';
  const originLine = origin === 'abonament' ? `Formularz       : abonament\n` : '';
  const packageLine = packageVal ? `Pakiet          : ${packageVal}\n` : '';

  const body = `Nowe zapytanie z formularza abonament.sezmoo.com
${originLine}
Imię i nazwisko : ${name}
${companyLine}E-mail          : ${email}
Telefon         : ${phone}
Obszar          : ${need}
${packageLine}Język formularza: ${lang}

Wiadomość:
${message}

---
Zgoda RODO: TAK (checkbox zaznaczony)
Data        : ${when}`;

  const subject = `Nowe zapytanie z abonament.sezmoo.com — ${name}`;
  const sent = await sendContactEmail(
    { subject, text: body, replyTo: email, replyName: name },
    env,
  );

  if (!sent.ok) {
    return fail('Nie udało się wysłać wiadomości.', 500);
  }

  return json({ ok: true });
};

export const onRequestGet: PagesFunction = async () =>
  fail('Method not allowed', 405);
