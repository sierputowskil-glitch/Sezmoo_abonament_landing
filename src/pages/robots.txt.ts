import type { APIRoute } from 'astro';
import { PUBLIC_ROBOTS, PUBLIC_SITE_URL } from 'astro:env/client';

function siteOrigin(): string {
  return PUBLIC_SITE_URL.replace(/\/$/, '');
}

function shouldDisallowAll(origin: string): boolean {
  return (
    PUBLIC_ROBOTS === 'noindex' ||
    origin.includes('pages.dev') ||
    origin.includes('websky.pro')
  );
}

export const GET: APIRoute = () => {
  const origin = siteOrigin();

  const body = shouldDisallowAll(origin)
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
