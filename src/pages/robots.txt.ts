import type { APIRoute } from 'astro';

const DEFAULT_SITE = 'https://abonament.sezmoo.com';

function siteOrigin(): string {
  return (import.meta.env.PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
}

function shouldDisallowAll(origin: string): boolean {
  return (
    import.meta.env.PUBLIC_ROBOTS === 'noindex' ||
    origin.includes('websky.pro') ||
    origin.includes('abonament.websky.pro')
  );
}

export const GET: APIRoute = () => {
  const origin = siteOrigin();

  const body = shouldDisallowAll(origin)
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap-index.xml\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
