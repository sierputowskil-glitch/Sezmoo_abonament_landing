const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = { ok: true } | { ok: false; error: string };

export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteip?: string,
): Promise<TurnstileResult> {
  if (!secret || secret.includes('...')) {
    return { ok: false, error: 'Turnstile not configured' };
  }
  if (!token) {
    return { ok: false, error: 'Missing Turnstile token' };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteip) body.set('remoteip', remoteip);

  let res: Response;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    return { ok: false, error: 'Turnstile verify failed' };
  }

  if (!res.ok) {
    return { ok: false, error: 'Turnstile verify failed' };
  }

  const data = (await res.json()) as {
    success?: boolean;
  };

  if (!data.success) {
    return { ok: false, error: 'Turnstile verification failed' };
  }

  return { ok: true };
}
