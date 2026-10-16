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

## Deploy (Cloudflare Pages)

1. Create Pages project `sezmoo-abonament` and KV namespace `CONTACT_RATE_LIMIT` (update `wrangler.toml` IDs).
2. Secrets: `TURNSTILE_SECRET_KEY`, `SMTP_PASS` (+ GH Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`).
3. Custom domain: `abonament.sezmoo.com`.
4. Turnstile: allow hostname `abonament.sezmoo.com`.
5. Push to `main` → workflow `.github/workflows/cf-pages-prod.yml`.

## sezmoosite follow-up

On the main site repo: remove `/abonament/` page and add 301:

```
/abonament/  https://abonament.sezmoo.com/  301
/abonament  https://abonament.sezmoo.com/  301
```
