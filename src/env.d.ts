/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

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
