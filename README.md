# SEZMOO – landing abonament

Astro (static) + Cloudflare Pages Function for the contact form.

- **Canonical:** https://abonament.sezmoo.com/
- **GTM:** `GTM-KJFG8DZL` (only when `PUBLIC_ENABLE_GTM=true` in prod CI); CookieYes is a tag inside the container
- **Phone:** +48 739 260 450
- **Legacy HTML/PHP:** branch `legacy/cyberfolks-html`

## Structure

- `src/assets/` — images via `astro:assets` (`<Image>` / `getImage`)
- `src/content/` — typed content collections (faq, packages, works, team, quotes, clients)
- `public/` — fixed URLs only (favicons, `og-image.png`, hero/scope videos)
- `astro:env` — public env schema in `astro.config.mjs`

## Local

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars   # fill SMTP_PASS for real mail
npm install
npm run dev                      # static site only
npm run build && npm run dev:functions   # site + /api/contact
```

## Staging (Pages preview on sezmoo.com account)

Same project as production: **`sezmoo-abonament`**. Non-`main` branches deploy as **preview** (not `abonament.sezmoo.com`).

- URL: `https://<hash>.sezmoo-abonament.pages.dev` (branch alias often `https://<branch>.sezmoo-abonament.pages.dev`)
- **Noindex:** staging builds set `PUBLIC_ROBOTS=noindex` (+ auto for `*.pages.dev`)
- **Turnstile:** no dummy site key. Preview Function rejects Cloudflare test secrets unless `ALLOW_TURNSTILE_TEST=1` (local only).
- **Mail:** preview hosts (`*.pages.dev`) never send to `MAIL_TO`. Set `MAIL_TO_PREVIEW` in the Pages Preview environment (sink inbox) or the form returns 503.
- **GTM:** off
- In `.env`: `PROD_CLOUDFLARE_ACCOUNT_ID`, `PROD_CLOUDFLARE_API_TOKEN` (never commit)

```bash
npm run build:staging    # local verify
npm run deploy:staging   # build + wrangler pages deploy as preview for current git branch
```

CI: `.github/workflows/cf-pages-staging.yml` on push to any branch except `main` (or `workflow_dispatch`). Uses secrets `PROD_CLOUDFLARE_API_TOKEN`, `PROD_CLOUDFLARE_ACCOUNT_ID`.

## Deploy production (Cloudflare Pages)

1. Project `sezmoo-abonament`, custom domain `abonament.sezmoo.com`, KV `CONTACT_RATE_LIMIT`.
2. Secrets: `TURNSTILE_SECRET_KEY`, `SMTP_PASS` (+ GH: `PROD_CLOUDFLARE_API_TOKEN`, `PROD_CLOUDFLARE_ACCOUNT_ID`, `PROD_PUBLIC_TURNSTILE_SITE_KEY`).
3. Turnstile: allow `abonament.sezmoo.com` (and `sezmoo.com` if shared widget).
4. Push to `main` → `.github/workflows/cf-pages-prod.yml`.

## sezmoosite follow-up

On the main site: `/abonament/` and `/en/retainer/` 301 → `https://abonament.sezmoo.com/`.
