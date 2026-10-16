# SEZMOO – landing abonament

Astro (static) + Cloudflare Pages Function for the contact form.

- **Canonical:** https://abonament.sezmoo.com/
- **GTM:** `GTM-KJFG8DZL` (only when `PUBLIC_ENABLE_GTM=true` in prod CI)
- **Phone:** +48 739 260 450
- **Legacy HTML/PHP:** branch `legacy/cyberfolks-html`

## Local

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars   # fill SMTP_PASS for real mail
npm install
npm run dev                      # static site only
npm run build && npm run dev:functions   # site + /api/contact
```

## Staging (Cloudflare Pages)

- URL: **https://abonament.websky.pro**
- Project: `sezmoo-abonament-staging`
- **Noindex:** staging builds set `PUBLIC_SITE_URL=https://abonament.websky.pro` and `PUBLIC_ROBOTS=noindex` → meta `robots: noindex,follow` and `robots.txt` Disallow all
- **Turnstile:** invisible always-pass test site key `1x00000000000000000000BB` (no real secret in the client)
- **GTM:** off (`PUBLIC_ENABLE_GTM` empty)
- In `.env`: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (never commit)

```bash
npm run build:staging    # local verify
npm run deploy:staging   # build + wrangler pages deploy
```

CI: `.github/workflows/cf-pages-staging.yml` (`workflow_dispatch` or push to `feat/astro-migration`) deploys with the same staging env. Needs secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Then in CF dashboard (once): custom domain `abonament.websky.pro`, Turnstile hostname allowlist, secrets (`TURNSTILE_SECRET_KEY` if testing real verification, optional `SMTP_PASS`), KV binding `CONTACT_RATE_LIMIT`.

## Deploy production (Cloudflare Pages)

1. Create Pages project `sezmoo-abonament` and KV namespace `CONTACT_RATE_LIMIT` (update `wrangler.toml` IDs).
2. Secrets: `TURNSTILE_SECRET_KEY`, `SMTP_PASS` (+ GH Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`).
3. Custom domain: `abonament.sezmoo.com`.
4. Turnstile: allow hostname `abonament.sezmoo.com`.
5. Push to `main` → workflow `.github/workflows/cf-pages-prod.yml`.

## sezmoosite follow-up

On the main site: `/abonament/` and `/en/retainer/` 301 → `https://abonament.sezmoo.com/` (done on `feat/astro-migration`).
