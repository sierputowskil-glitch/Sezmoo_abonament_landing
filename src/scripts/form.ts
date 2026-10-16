/**
 * Abonament contact form — Turnstile + /api/contact + dataLayer events.
 * Reads window.__SEZMOO__ from CampaignLayout.
 */

const NAME_RE =
  /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*(?:\s+[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*)+$/u;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/;

type SezmooCfg = {
  turnstileSiteKey?: string;
  contactApiUrl?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string | number;
      execute: (id: string | number) => void;
      reset: (id: string | number) => void;
    };
  }
}

function cfg(): SezmooCfg {
  return window.__SEZMOO__ && typeof window.__SEZMOO__ === 'object' ? window.__SEZMOO__ : {};
}

function dlPush(payload: Record<string, unknown>): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function initContactForm(formId = 'abonament-form'): void {
  const el = document.getElementById(formId);
  if (!(el instanceof HTMLFormElement)) return;
  const f: HTMLFormElement = el;

  const note = f.querySelector('.cform__note');
  const btn = f.querySelector('button[type="submit"]');
  const lbl = btn?.querySelector('.lbl') ?? null;
  const lblText = lbl?.textContent ?? '';
  const nameInput = f.querySelector<HTMLInputElement>('input[name="name"]');
  const phoneInput = f.querySelector<HTMLInputElement>('input[name="phone"]');

  let widgetId: string | number | null = null;
  let tokenResolve: ((err?: Error) => void) | null = null;
  let started = false;
  let siteKeyPromise: Promise<string> | null = null;
  let apiPromise: Promise<void> | null = null;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);';
  f.appendChild(host);

  function contactUrl(): string {
    const u = cfg().contactApiUrl;
    if (u === '' || u === null) return '';
    return u || f.getAttribute('action') || '/api/contact';
  }

  function meta() {
    const need = f.querySelector<HTMLSelectElement>('[name="need"]');
    const pack = f.querySelector<HTMLSelectElement>('[name="package"]');
    return {
      form_id: f.id,
      form_name: 'abonament',
      form_lang: 'pl',
      form_need: need?.value || '',
      form_package: pack?.value || '',
    };
  }

  function say(t: string): void {
    if (note instanceof HTMLElement) {
      note.textContent = t;
      note.style.color = 'var(--y)';
    }
  }

  function validate(): void {
    if (nameInput) {
      const n = (nameInput.value || '').trim().replace(/\s+/g, ' ');
      nameInput.value = n;
      nameInput.setCustomValidity(
        !n
          ? 'Podaj imię i nazwisko.'
          : NAME_RE.test(n)
            ? ''
            : 'Podaj imię i nazwisko (same litery).',
      );
    }
    if (phoneInput) {
      const p = (phoneInput.value || '').trim();
      const d = p.replace(/\D+/g, '');
      phoneInput.value = p;
      phoneInput.setCustomValidity(
        p === '' || (PHONE_RE.test(p) && d.length >= 9 && d.length <= 15)
          ? ''
          : 'Podaj prawidłowy numer telefonu (np. +48 500 000 000).',
      );
    }
  }

  for (const el of [nameInput, phoneInput]) {
    if (!el) continue;
    el.addEventListener('input', () => el.setCustomValidity(''));
    el.addEventListener('blur', validate);
  }

  function getSiteKey(): Promise<string> {
    if (!siteKeyPromise) {
      siteKeyPromise = Promise.resolve().then(() => {
        const k = cfg().turnstileSiteKey ? String(cfg().turnstileSiteKey) : '';
        if (!k || k.includes('...')) throw new Error('no-sitekey');
        return k;
      });
    }
    return siteKeyPromise;
  }

  function loadApi(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    if (!apiPromise) {
      apiPromise = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error('turnstile'));
        document.head.appendChild(s);
      });
    }
    return apiPromise;
  }

  function ensureWidget(): Promise<void> {
    if (widgetId !== null) return Promise.resolve();
    return Promise.all([getSiteKey(), loadApi()]).then(([sitekey]) => {
      if (!window.turnstile) throw new Error('turnstile');
      widgetId = window.turnstile.render(host, {
        sitekey,
        size: 'invisible',
        execution: 'execute',
        appearance: 'execute',
        callback: () => {
          if (tokenResolve) {
            const r = tokenResolve;
            tokenResolve = null;
            r();
          }
        },
        'error-callback': () => {
          if (tokenResolve) {
            const r = tokenResolve;
            tokenResolve = null;
            r(new Error('turnstile-error'));
          }
        },
      });
    });
  }

  function challenge(): Promise<void> {
    return ensureWidget().then(
      () =>
        new Promise((res, rej) => {
          tokenResolve = (err?: Error) => (err ? rej(err) : res());
          try {
            window.turnstile!.execute(widgetId!);
          } catch (e) {
            tokenResolve = null;
            rej(e instanceof Error ? e : new Error('turnstile'));
          }
        }),
    );
  }

  function resetWidget(): void {
    if (widgetId !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
      } catch {
        /* ignore */
      }
    }
  }

  function done(): void {
    if (btn instanceof HTMLButtonElement) btn.disabled = false;
    if (lbl) lbl.textContent = lblText;
  }

  f.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    const m = meta();
    dlPush({
      event: 'form_start',
      form_id: m.form_id,
      form_name: m.form_name,
      form_lang: m.form_lang,
    });
    if (!contactUrl()) {
      say('● Formularz niedostępny na tym środowisku — napisz na biuro@sezmoo.com');
      return;
    }
    ensureWidget().catch(() => {
      say('● Nie udało się załadować ochrony formularza — napisz na biuro@sezmoo.com');
    });
  });

  f.addEventListener('submit', (e) => {
    e.preventDefault();
    validate();
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    const url = contactUrl();
    if (!url) {
      say('● Formularz niedostępny na tym środowisku — napisz na biuro@sezmoo.com');
      return;
    }
    if (btn instanceof HTMLButtonElement) btn.disabled = true;
    if (lbl) lbl.textContent = 'Wysyłanie…';
    const m = meta();
    challenge()
      .then(() => fetch(url, { method: 'POST', body: new FormData(f) }))
      .then((r) =>
        r.json().catch(() => ({ ok: false, error: 'Nieprawidłowa odpowiedź serwera' })),
      )
      .then((d: { ok?: boolean; error?: string }) => {
        if (d && d.ok) {
          dlPush({
            event: 'generate_lead',
            form_id: m.form_id,
            form_name: m.form_name,
            form_lang: m.form_lang,
            form_need: m.form_need,
            form_package: m.form_package,
          });
          say('● Dziękujemy — odezwiemy się w ciągu 24h.');
          f.reset();
          started = false;
        } else {
          dlPush({
            event: 'form_submit_error',
            form_id: m.form_id,
            form_name: m.form_name,
            form_lang: m.form_lang,
            form_need: m.form_need,
            error_type: d?.error ? 'server' : 'unknown',
          });
          say(`● ${d?.error || 'Coś poszło nie tak'} — napisz na biuro@sezmoo.com`);
        }
        resetWidget();
        done();
      })
      .catch(() => {
        dlPush({
          event: 'form_submit_error',
          form_id: m.form_id,
          form_name: m.form_name,
          form_lang: m.form_lang,
          form_need: m.form_need,
          error_type: 'network',
        });
        say('● Nie udało się wysłać — napisz na biuro@sezmoo.com');
        resetWidget();
        done();
      });
  });
}
