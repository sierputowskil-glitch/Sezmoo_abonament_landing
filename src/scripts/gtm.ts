/**
 * Load GTM on idle after window load. CookieYes stays a tag inside the container.
 */

import { GTM_ID } from '../lib/site';

function loadGtm(): void {
  if (window.__SEZMOO_GTM__) return;
  window.__SEZMOO_GTM__ = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const f = document.getElementsByTagName('script')[0];
  const j = document.createElement('script');
  j.async = true;
  j.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  f?.parentNode?.insertBefore(j, f);
}

function schedule(): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadGtm, { timeout: 3000 });
  } else {
    setTimeout(loadGtm, 1);
  }
}

if (document.readyState === 'complete') {
  schedule();
} else {
  window.addEventListener('load', schedule, { once: true });
}
