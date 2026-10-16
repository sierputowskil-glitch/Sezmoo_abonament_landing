// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * PUBLIC_SITE_URL — canonical origin, e.g. https://abonament.sezmoo.com
 * PUBLIC_BASE_PATH — URL prefix; "/" for prod root.
 */
const site = (process.env.PUBLIC_SITE_URL || 'https://abonament.sezmoo.com').replace(
  /\/$/,
  '',
);
const rawBase = process.env.PUBLIC_BASE_PATH ?? '/';
const base = rawBase === '/' || rawBase === '' ? '/' : `/${rawBase.replace(/^\/|\/$/g, '')}/`;

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  integrations: [sitemap()],
});
