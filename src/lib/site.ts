/** Shared LP constants and helpers (contact form whitelist, GTM, phone). */

import { PUBLIC_SITE_URL } from 'astro:env/client';

export { NEED_OPTIONS, PACKAGE_OPTIONS } from './form-options';

export const GTM_ID = 'GTM-KJFG8DZL';

export const PHONE_DISPLAY = '+48 739 260 450';
export const PHONE_TEL = '+48739260450';
export const EMAIL = 'biuro@sezmoo.com';
export const MAILTO = `mailto:${EMAIL}`;
export const TEL_HREF = `tel:${PHONE_TEL}`;

/** Canonical origin without trailing slash, then join pathname. */
export function siteUrl(pathname = '/'): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, '');
  if (!pathname || pathname === '/') return `${base}/`;
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function siteOrigin(): string {
  return PUBLIC_SITE_URL.replace(/\/$/, '');
}
