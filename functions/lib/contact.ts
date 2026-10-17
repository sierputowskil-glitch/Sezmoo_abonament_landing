import type { KVNamespace } from '@cloudflare/workers-types';
import { ALLOWED_NEED, ALLOWED_PACKAGE } from './form-options';

export const RATE_SECONDS = 20;
export const MAX_LINKS = 2;

const NAME_RE =
  /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*(?:\s+[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*)+$/u;

/** Fallback when KV is not bound (local / misconfigured). Not shared across isolates. */
const rateBucket = new Map<string, number>();

export type MailboxEnv = {
  MAIL_TO?: string;
  MAIL_TO_PREVIEW?: string;
};

export type ValidatedContact = {
  lang: 'pl' | 'en';
  name: string;
  email: string;
  phone: string;
  company: string;
  need: string;
  message: string;
  packageVal: string;
  origin: 'abonament' | 'kontakt';
};

export type ContactFormResult =
  | { kind: 'honeypot' }
  | { kind: 'fail'; error: string; status: number }
  | { kind: 'ok'; data: ValidatedContact };

export type RateLimitStore = Pick<KVNamespace, 'get' | 'put'>;

export function clean(v: unknown, max = 300): string {
  const s = String(v ?? '')
    .trim()
    .replace(/[\r\n\0]/g, ' ');
  return s.slice(0, max);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

export function requestHostname(request: Request): string {
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isPreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith('.pages.dev') || h.endsWith('.websky.pro');
}

export function mailboxForHost(
  hostname: string,
  env: MailboxEnv,
): { ok: true; to: string } | { ok: false; reason: 'preview-disabled' | 'missing' } {
  if (isPreviewHost(hostname)) {
    const preview = (env.MAIL_TO_PREVIEW || '').trim();
    if (!preview) return { ok: false, reason: 'preview-disabled' };
    return { ok: true, to: preview };
  }
  const to = (env.MAIL_TO || '').trim();
  if (!to) return { ok: false, reason: 'missing' };
  return { ok: true, to };
}

export async function rateLimitKey(ip: string, bucket: 'prod' | 'preview'): Promise<string> {
  const bytes = new TextEncoder().encode(`${bucket}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `rl:${bucket}:${hex.slice(0, 32)}`;
}

export async function checkRateLimit(
  kv: RateLimitStore | undefined,
  ip: string,
  bucket: 'prod' | 'preview',
): Promise<boolean> {
  const key = await rateLimitKey(ip, bucket);
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

export function evaluateContactForm(form: FormData): ContactFormResult {
  if (clean(form.get('bot-field'), 40) !== '') {
    return { kind: 'honeypot' };
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
  const origin = clean(form.get('form-name'), 40) === 'abonament' ? 'abonament' : 'kontakt';

  const fail = (pl: string, en: string, status = 400): ContactFormResult => ({
    kind: 'fail',
    status,
    error: lang === 'en' ? en : pl,
  });

  if (need && !ALLOWED_NEED.has(need)) {
    return { kind: 'fail', status: 400, error: 'Nieprawidłowy obszar.' };
  }

  if (!name || !message) {
    return fail('Uzupełnij wymagane pola.', 'Please fill in the required fields.');
  }

  if (!NAME_RE.test(name)) {
    return fail(
      'Podaj imię i nazwisko (same litery).',
      'Enter your first and last name (letters only).',
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Nieprawidłowy adres e-mail.', 'Invalid email address.');
  }

  if (phone) {
    const digits = phone.replace(/\D+/g, '');
    if (
      !/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/.test(phone) ||
      digits.length < 9 ||
      digits.length > 15
    ) {
      return fail(
        'Podaj prawidłowy numer telefonu (np. +48 500 000 000).',
        'Enter a valid phone number (e.g. +48 500 000 000).',
      );
    }
  }

  if (!consent) {
    return fail('Wymagana zgoda na przetwarzanie danych.', 'Consent is required.');
  }

  if (message.length < 10) {
    return fail('Wiadomość jest zbyt krótka.', 'Message is too short.');
  }

  const linkHits = (name + ' ' + message).match(/https?:\/\/|www\./gi);
  if (linkHits && linkHits.length > MAX_LINKS) {
    return { kind: 'fail', status: 400, error: 'Wiadomość odrzucona.' };
  }
  if (/\[url=|\[\/url\]|<a\s+href/i.test(name + ' ' + message)) {
    return { kind: 'fail', status: 400, error: 'Wiadomość odrzucona.' };
  }
  if (/\b(seo\s+services|backlinks?|crypto\s+invest|viagra|casino|loan\s+offer)\b/i.test(message)) {
    return { kind: 'fail', status: 400, error: 'Wiadomość odrzucona.' };
  }
  if (/https?:\/\//i.test(name)) {
    return { kind: 'fail', status: 400, error: 'Wiadomość odrzucona.' };
  }

  return {
    kind: 'ok',
    data: { lang, name, email, phone, company, need, message, packageVal, origin },
  };
}

export function buildContactEmail(
  data: ValidatedContact,
  when: string,
): {
  subject: string;
  text: string;
} {
  const companyLine = data.company ? `Firma           : ${data.company}\n` : '';
  const originLine = data.origin === 'abonament' ? `Formularz       : abonament\n` : '';
  const packageLine = data.packageVal ? `Pakiet          : ${data.packageVal}\n` : '';

  const text = `Nowe zapytanie z formularza abonament.sezmoo.com
${originLine}
Imię i nazwisko : ${data.name}
${companyLine}E-mail          : ${data.email}
Telefon         : ${data.phone}
Obszar          : ${data.need}
${packageLine}Język formularza: ${data.lang}

Wiadomość:
${data.message}

---
Zgoda RODO: TAK (checkbox zaznaczony)
Data        : ${when}`;

  return {
    subject: `Nowe zapytanie z abonament.sezmoo.com — ${data.name}`,
    text,
  };
}
