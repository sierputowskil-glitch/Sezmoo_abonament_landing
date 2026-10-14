# SEZMOO – landing /abonament/

Samodzielny landing (statyczny HTML, bez builda). Wszystkie zasoby w `assets/`.

- Wejście: `index.html`
- Linki do serwisu głównego są absolutne (https://sezmoo.com/...).
- Domena: **https://abonamenty.sezmoo.com/** (canonical, og:url, og:image, JSON-LD ustawione).
- Na sezmoo.com warto dodać przekierowanie 301: /abonament/ → https://abonamenty.sezmoo.com/
- `robots: noindex,follow` celowo (landing kampanijny).
- Telefon na landingu: +48 739 260 450 (celowo inny niż w serwisie).
- GTM: GTM-KJFG8DZL.

## Formularz (PHP)
- `send.php` + `public-config.php` — skopiowane z serwisu głównego, działają na Apache + PHP (Cyberfolks).
- `composer install` (PHPMailer) → `vendor/`.
- Skopiuj `config.local.php.example` → `config.local.php` i uzupełnij SMTP + klucze Turnstile (te same co w serwisie; w panelu Cloudflare Turnstile dodaj hostname abonamenty.sezmoo.com).
