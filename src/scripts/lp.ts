/**
 * LP client: sticky mbar, data-cta → dataLayer lp_cta_click, YouTube data-yt-bg facade.
 * Bundled as a module from CampaignLayout (static CF Pages).
 */

type NetworkInformation = { saveData?: boolean };

function getSaveData(): boolean {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(conn?.saveData);
}

function initStickyMbar(): void {
  const bar = document.getElementById('mbar');
  const form = document.getElementById('kontakt');
  if (!bar || !form || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(
    (entries) => {
      bar.classList.toggle('is-hidden', entries[0]?.isIntersecting ?? false);
    },
    { threshold: 0.15 },
  ).observe(form);
}

function initCtaTracking(): void {
  document.addEventListener('click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const a = target.closest('[data-cta]');
    if (!a) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'lp_cta_click',
      cta_id: a.getAttribute('data-cta'),
      page: 'abonament',
    });
  });
}

function initPack60Preset(): void {
  document.querySelectorAll('[data-cta="pack-60"]').forEach((b) => {
    b.addEventListener('click', () => {
      const s = document.getElementById('ab-package');
      if (s instanceof HTMLSelectElement) s.value = '60h';
    });
  });
}

function initHeroVideoReducedMotion(): void {
  const v = document.querySelector('.hero__frame video');
  if (!(v instanceof HTMLVideoElement)) return;
  const rm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (rm || getSaveData()) {
    v.removeAttribute('autoplay');
    v.pause();
  }
}

function mountYt(el: HTMLElement): void {
  if (el.dataset.ytMounted) return;
  el.dataset.ytMounted = '1';
  const id = el.getAttribute('data-yt-id');
  if (!id) return;
  const title = el.getAttribute('data-yt-title') || 'YouTube';
  const ifr = document.createElement('iframe');
  ifr.src =
    'https://www.youtube-nocookie.com/embed/' +
    id +
    '?autoplay=1&mute=1&controls=0&loop=1&playlist=' +
    id +
    '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0';
  ifr.title = title;
  ifr.allow = 'autoplay; encrypted-media; picture-in-picture';
  ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  ifr.tabIndex = -1;
  ifr.setAttribute('aria-hidden', 'true');
  el.appendChild(ifr);
}

function whenIdle(fn: () => void): void {
  const ric = (globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(fn, { timeout: 2200 });
  } else if (document.readyState === 'complete') {
    setTimeout(fn, 1);
  } else {
    globalThis.addEventListener('load', () => setTimeout(fn, 1));
  }
}

function whenNear(el: HTMLElement): void {
  if (!('IntersectionObserver' in window)) {
    whenIdle(() => mountYt(el));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        mountYt(e.target as HTMLElement);
      });
    },
    { rootMargin: '240px 0px' },
  );
  io.observe(el);
}

function initYtFacade(): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || getSaveData()) return;
  document.querySelectorAll<HTMLElement>('[data-yt-bg]').forEach((el) => {
    if (el.getAttribute('data-yt-priority') === 'hero') whenIdle(() => mountYt(el));
    else whenNear(el);
  });
}

initStickyMbar();
initCtaTracking();
initPack60Preset();
initHeroVideoReducedMotion();
initYtFacade();
