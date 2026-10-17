import { describe, expect, it } from 'vitest';
import { isTestTurnstileSecret } from './turnstile';
import {
  RATE_SECONDS,
  buildContactEmail,
  checkRateLimit,
  evaluateContactForm,
  isPreviewHost,
  mailboxForHost,
  rateLimitKey,
} from './contact';

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const valid = {
  name: 'Jan Kowalski',
  email: 'jan@firma.pl',
  message: 'Potrzebujemy stałego wsparcia wideo i grafiki.',
  consent: '1',
  need: 'Wideo / motion',
  package: '60h',
  'form-name': 'abonament',
};

describe('isPreviewHost', () => {
  it('detects Pages preview hosts', () => {
    expect(isPreviewHost('foo.sezmoo-abonament.pages.dev')).toBe(true);
    expect(isPreviewHost('abonament.sezmoo.com')).toBe(false);
    expect(isPreviewHost('localhost')).toBe(false);
  });
});

describe('mailboxForHost', () => {
  it('refuses preview unless MAIL_TO_PREVIEW is set', () => {
    expect(mailboxForHost('x.pages.dev', { MAIL_TO: 'biuro@sezmoo.com' })).toEqual({
      ok: false,
      reason: 'preview-disabled',
    });
  });

  it('uses MAIL_TO_PREVIEW on preview, never MAIL_TO', () => {
    expect(
      mailboxForHost('x.pages.dev', {
        MAIL_TO: 'biuro@sezmoo.com',
        MAIL_TO_PREVIEW: 'sink@example.com',
      }),
    ).toEqual({ ok: true, to: 'sink@example.com' });
  });

  it('uses MAIL_TO on production host', () => {
    expect(mailboxForHost('abonament.sezmoo.com', { MAIL_TO: 'biuro@sezmoo.com' })).toEqual({
      ok: true,
      to: 'biuro@sezmoo.com',
    });
  });
});

describe('evaluateContactForm', () => {
  it('swallows honeypot as success-shaped honeypot', () => {
    expect(evaluateContactForm(form({ ...valid, 'bot-field': 'spam' }))).toEqual({
      kind: 'honeypot',
    });
  });

  it('accepts a valid payload', () => {
    const r = evaluateContactForm(form(valid));
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.data.name).toBe('Jan Kowalski');
    expect(r.data.packageVal).toBe('60h');
    expect(r.data.origin).toBe('abonament');
  });

  it('rejects missing consent', () => {
    const { consent: _c, ...rest } = valid;
    const r = evaluateContactForm(form(rest));
    expect(r).toMatchObject({ kind: 'fail', status: 400 });
  });

  it('strips unknown package instead of failing', () => {
    const r = evaluateContactForm(form({ ...valid, package: '250h' }));
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.data.packageVal).toBe('');
  });

  it('rejects too many links', () => {
    const r = evaluateContactForm(
      form({
        ...valid,
        message: 'http://a.com and http://b.com and www.c.com extra text here',
      }),
    );
    expect(r).toEqual({ kind: 'fail', status: 400, error: 'Wiadomość odrzucona.' });
  });
});

describe('isTestTurnstileSecret', () => {
  it('detects Cloudflare dummy secrets', () => {
    expect(isTestTurnstileSecret('1x0000000000000000000000000000000AA')).toBe(true);
    expect(isTestTurnstileSecret('prod-secret')).toBe(false);
  });
});

describe('rateLimitKey', () => {
  it('does not embed secrets or raw IPs', async () => {
    const key = await rateLimitKey('203.0.113.9', 'prod');
    expect(key.startsWith('rl:prod:')).toBe(true);
    expect(key).not.toContain('203.0.113');
    expect(key).not.toContain('TURNSTILE');
  });
});

describe('checkRateLimit', () => {
  it('blocks a second hit within the window', async () => {
    const store = new Map<string, string>();
    const kv = {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => {
        store.set(k, v);
      },
    };
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    expect(await checkRateLimit(kv, ip, 'preview')).toBe(true);
    expect(await checkRateLimit(kv, ip, 'preview')).toBe(false);
    expect(RATE_SECONDS).toBeGreaterThan(0);
  });
});

describe('buildContactEmail', () => {
  it('puts the name in the subject and body', () => {
    const r = evaluateContactForm(form(valid));
    if (r.kind !== 'ok') throw new Error('expected ok');
    const mail = buildContactEmail(r.data, '2026-10-17 06:00:00');
    expect(mail.subject).toContain('Jan Kowalski');
    expect(mail.text).toContain('jan@firma.pl');
  });
});
