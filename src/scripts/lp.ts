/**
 * LP client: sticky mbar, data-cta → dataLayer lp_cta_click,
 * self-hosted muted background videos (no YouTube iframe).
 *
 * Prod differs from local: GTM + CookieYes mount late and can block the first
 * muted autoplay attempt. Retries after load / consent UI / gesture.
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

/** iOS/WebKit: muted + playsInline must be JS properties, not only HTML attributes. */
function armMutedInline(v: HTMLVideoElement): void {
  v.muted = true;
  v.defaultMuted = true;
  v.volume = 0;
  v.playsInline = true;
  v.autoplay = true;
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('autoplay', '');
}

function markPlaying(v: HTMLVideoElement): void {
  v.closest('[data-bg-video]')?.classList.add('is-playing');
}

function attachSrc(v: HTMLVideoElement): void {
  const lazy = v.getAttribute('data-src');
  if (!lazy) return;
  if (!v.getAttribute('src') && !v.querySelector('source')) {
    v.src = lazy;
  }
  v.removeAttribute('data-src');
}

function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

/** iOS often allows only one decoder — free slots for the visible clip. */
function pauseOffscreenBgVideos(except?: HTMLVideoElement): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (v === except || v.paused) return;
    if (!isInViewport(v)) v.pause();
  });
}

function tryPlayBgVideo(v: HTMLVideoElement): void {
  armMutedInline(v);
  if (!v.paused) {
    markPlaying(v);
    return;
  }
  pauseOffscreenBgVideos(v);
  const attempt = v.play();
  if (attempt === undefined) return;
  void attempt.then(() => markPlaying(v)).catch(() => {});
}

function playBgVideo(wrap: HTMLElement): void {
  const v = wrap.querySelector('video');
  if (!(v instanceof HTMLVideoElement)) return;
  armMutedInline(v);
  attachSrc(v);
  v.addEventListener('playing', () => markPlaying(v));
  v.addEventListener('canplay', () => tryPlayBgVideo(v), { once: true });
  v.addEventListener('loadeddata', () => tryPlayBgVideo(v), { once: true });
  tryPlayBgVideo(v);
}

function whenNear(el: HTMLElement, fn: () => void): void {
  if (!('IntersectionObserver' in window)) {
    fn();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        fn();
      });
    },
    { rootMargin: '160px 0px' },
  );
  io.observe(el);
}

function kickVisiblePaused(): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (!v.getAttribute('src') && v.getAttribute('data-src')) attachSrc(v);
    if (v.paused && isInViewport(v)) tryPlayBgVideo(v);
    else if (!v.paused) markPlaying(v);
  });
}

/** Low Power Mode / CookieYes first tap: play() must run inside a user gesture. */
function initGestureUnlock(): void {
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', kickVisiblePaused, opts);
  window.addEventListener('touchstart', kickVisiblePaused, opts);
  window.addEventListener('click', kickVisiblePaused, opts);
}

/**
 * Prod-only delay: CookieYes (via GTM) mounts after first paint and can steal the
 * first autoplay window. Retry a few times after load / when the bar is dismissed.
 */
function initLateAutoplayRetries(): void {
  const delays = [400, 1200, 2500, 5000];
  const run = () => kickVisiblePaused();
  if (document.readyState === 'complete') {
    delays.forEach((ms) => setTimeout(run, ms));
  } else {
    window.addEventListener(
      'load',
      () => delays.forEach((ms) => setTimeout(run, ms)),
      { once: true },
    );
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });

  if (!('MutationObserver' in window)) return;
  const mo = new MutationObserver(() => run());
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
  });
  setTimeout(() => mo.disconnect(), 15000);
}

function initBgVideos(): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || getSaveData()) {
    document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
      v.removeAttribute('autoplay');
      v.removeAttribute('data-src');
      v.removeAttribute('src');
      v.pause();
    });
    return;
  }

  initGestureUnlock();
  initLateAutoplayRetries();

  document.querySelectorAll<HTMLElement>('[data-bg-video]').forEach((wrap) => {
    if (wrap.getAttribute('data-bg-video-priority') === 'hero') {
      playBgVideo(wrap);
      return;
    }
    whenNear(wrap, () => playBgVideo(wrap));
  });
}

initStickyMbar();
initCtaTracking();
initPack60Preset();
initBgVideos();
