/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_BASE_PATH?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  readonly PUBLIC_CONTACT_API_URL: string;
  readonly PUBLIC_ENABLE_GTM?: string;
  /** Set to `noindex` to force meta robots noindex (staging). */
  readonly PUBLIC_ROBOTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __SEZMOO__?: {
    turnstileSiteKey?: string;
    contactApiUrl?: string;
  };
  __SEZMOO_GTM__?: boolean;
  dataLayer?: Record<string, unknown>[];
  turnstile?: {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string | number;
    execute: (id: string | number) => void;
    reset: (id: string | number) => void;
  };
}
