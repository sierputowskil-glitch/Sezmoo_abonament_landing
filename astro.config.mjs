// @ts-check
import { defineConfig, envField } from 'astro/config';

/**
 * PUBLIC_SITE_URL — canonical origin, e.g. https://abonament.sezmoo.com
 * PUBLIC_BASE_PATH — URL prefix; "/" for prod root.
 * (Config itself still reads process.env — astro:env is for app code.)
 */
const site = (process.env.PUBLIC_SITE_URL || 'https://abonament.sezmoo.com').replace(/\/$/, '');
const rawBase = process.env.PUBLIC_BASE_PATH ?? '/';
const base = rawBase === '/' || rawBase === '' ? '/' : `/${rawBase.replace(/^\/|\/$/g, '')}/`;

export default defineConfig({
  site,
  base,
  compressHTML: true,
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
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://abonament.sezmoo.com',
      }),
      PUBLIC_BASE_PATH: envField.string({
        context: 'client',
        access: 'public',
        default: '/',
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '',
        optional: true,
      }),
      PUBLIC_CONTACT_API_URL: envField.string({
        context: 'client',
        access: 'public',
        default: '/api/contact',
      }),
      PUBLIC_ENABLE_GTM: envField.boolean({
        context: 'client',
        access: 'public',
        default: false,
        optional: true,
      }),
      PUBLIC_ROBOTS: envField.enum({
        context: 'client',
        access: 'public',
        values: ['index', 'noindex'],
        optional: true,
      }),
    },
  },
});
