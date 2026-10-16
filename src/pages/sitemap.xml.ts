import type { APIRoute } from 'astro';
import { PUBLIC_SITE_URL } from 'astro:env/client';

/** Single-page LP — one urlset, no sitemap index. */
export const GET: APIRoute = () => {
  const origin = PUBLIC_SITE_URL.replace(/\/$/, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
  </url>
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
