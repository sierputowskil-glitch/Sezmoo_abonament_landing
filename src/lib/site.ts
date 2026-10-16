/** Shared LP constants and helpers (contact, packages, GTM). */

export const GTM_ID = 'GTM-KJFG8DZL';

export const PHONE_DISPLAY = '+48 739 260 450';
export const PHONE_TEL = '+48739260450';
export const EMAIL = 'biuro@sezmoo.com';
export const MAILTO = `mailto:${EMAIL}`;
export const TEL_HREF = `tel:${PHONE_TEL}`;

const DEFAULT_SITE = 'https://abonament.sezmoo.com';

/** Canonical origin without trailing slash, then join pathname. */
export function siteUrl(pathname = '/'): string {
  const base = (import.meta.env.PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
  if (!pathname || pathname === '/') return `${base}/`;
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function siteOrigin(): string {
  return (import.meta.env.PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
}

/** Form select: package (whitelist must match /api/contact). */
export const PACKAGE_OPTIONS = [
  { value: 'Nie wiem – doradźcie', label: 'Nie wiem – doradźcie' },
  { value: '30h', label: '30h' },
  { value: '60h', label: '60h', selected: true },
  { value: '120h', label: '120h' },
  { value: 'Custom', label: 'Custom' },
] as const;

/** Form select: need / obszar (whitelist must match /api/contact). */
export const NEED_OPTIONS = [
  { value: '', label: 'Wybierz obszar' },
  { value: 'Wideo / motion', label: 'Wideo / motion' },
  { value: 'Foto', label: 'Foto' },
  { value: 'Grafika', label: 'Grafika' },
  { value: 'Social media', label: 'Social media' },
  { value: 'Wszystko po trochu', label: 'Wszystko po trochu' },
] as const;
