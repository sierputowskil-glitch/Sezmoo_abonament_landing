/**
 * LP client: sticky mbar, data-cta → dataLayer lp_cta_click,
 * self-hosted muted background videos (no YouTube iframe).
 *
 * Videos use data-src so MP4s do not compete with lazy images on first paint.
 * On Save-Data / cellular / slow effectiveType: play control only.
 * On Wi‑Fi: one clip at a time, after window load / idle — never attach all
 * scope sources from CookieYes retries (that starved the page bottom).
 */

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  type?: string;
  downlink?: number;
};

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

/** Save-Data, cellular, slow effectiveType, or very low downlink → manual play. */
function preferManualVideo(): boolean {
  const conn = getConnection();
  if (!conn) return false;
  if (conn.saveData) return true;
  const type = (conn.type || '').toLowerCase();
  if (type === 'cellular') return true;
  const eff = (conn.effectiveType || '').toLowerCase();
  if (eff === 'slow-2g' || eff === '2g' || eff === '3g') return true;
  return typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1.5;
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
  const wrap = v.closest('[data-bg-video]');
  wrap?.classList.add('is-playing');
  wrap?.querySelector('.bg-video-play')?.remove();
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

/** Abort offscreen downloads so images can use the connection. */
function releaseOffscreenVideoBandwidth(except?: HTMLVideoElement): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (v === except) return;
    if (isInViewport(v) && !v.paused) return;
    const src = v.getAttribute('src');
    if (!src) return;
    if (!v.getAttribute('data-src')) v.setAttribute('data-src', src);
    v.removeAttribute('src');
    v.pause();
    try {
      v.load();
    } catch {
      /* ignore */
    }
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
  void attempt.then(() => markPlaying(v)).catch(() => {
    showPlayControl(v.closest('[data-bg-video]') as HTMLElement | null);
  });
}

function playBgVideo(wrap: HTMLElement): void {
  const v = wrap.querySelector('video');
  if (!(v instanceof HTMLVideoElement)) return;
  armMutedInline(v);
  releaseOffscreenVideoBandwidth(v);
  attachSrc(v);
  v.addEventListener('playing', () => markPlaying(v));
  v.addEventListener('canplay', () => tryPlayBgVideo(v), { once: true });
  v.addEventListener('loadeddata', () => tryPlayBgVideo(v), { once: true });
  tryPlayBgVideo(v);
}

/** Park src on data-src so the MP4 is not fetched until the user hits play. */
function deferVideoSrc(v: HTMLVideoElement): void {
  const src = v.getAttribute('src');
  if (src) {
    if (!v.getAttribute('data-src')) v.setAttribute('data-src', src);
    v.removeAttribute('src');
    try {
      v.load();
    } catch {
      /* ignore */
    }
  }
  v.removeAttribute('autoplay');
  v.autoplay = false;
  v.preload = 'none';
}

/** Manual play for Save-Data / LTE / blocked autoplay — runs inside a user gesture. */
function showPlayControl(wrap: HTMLElement | null): void {
  if (!wrap || wrap.classList.contains('is-playing')) return;
  if (wrap.querySelector('.bg-video-play')) return;
  const v = wrap.querySelector('video');
  if (!(v instanceof HTMLVideoElement)) return;

  armMutedInline(v);
  deferVideoSrc(v);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bg-video-play';
  btn.setAttribute('aria-label', 'Odtwórz wideo');
  btn.innerHTML =
    '<span class="bg-video-play__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>';
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    armMutedInline(v);
    releaseOffscreenVideoBandwidth(v);
    attachSrc(v);
    pauseOffscreenBgVideos(v);
    void v.play().then(() => markPlaying(v)).catch(() => {});
  });
  wrap.appendChild(btn);
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
    { rootMargin: '80px 0px' },
  );
  io.observe(el);
}

/**
 * Retry play only — never attachSrc. CookieYes / GTM mutations used to call this
 * and pull every scope MP4 at once (~10MB), leaving image placeholders white.
 */
function kickVisiblePaused(): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (!v.getAttribute('src')) return;
    if (!isInViewport(v)) return;
    if (v.paused) tryPlayBgVideo(v);
    else markPlaying(v);
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
 * first autoplay window. Retry play on already-sourced clips only.
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
}

function prepareManualPlay(wrap: HTMLElement): void {
  const v = wrap.querySelector('video');
  if (!(v instanceof HTMLVideoElement)) return;
  armMutedInline(v);
  deferVideoSrc(v);
  v.addEventListener('playing', () => markPlaying(v));
  showPlayControl(wrap);
}

function afterImagesHaveHeadroom(fn: () => void): void {
  const start = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fn, { timeout: 1800 });
    } else {
      setTimeout(fn, 400);
    }
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

function initBgVideos(): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const constrained = preferManualVideo();

  if (reduce || constrained) {
    // No autoplay — poster + play. MP4 stays on data-src until tap (faster LTE paint).
    document.querySelectorAll<HTMLElement>('[data-bg-video]').forEach((wrap) => {
      prepareManualPlay(wrap);
    });
    return;
  }

  initGestureUnlock();
  initLateAutoplayRetries();

  document.querySelectorAll<HTMLElement>('[data-bg-video]').forEach((wrap) => {
    if (wrap.getAttribute('data-bg-video-priority') === 'hero') {
      afterImagesHaveHeadroom(() => playBgVideo(wrap));
      return;
    }
    // Scope clips: only when near, and only after load so works/team images win first.
    afterImagesHaveHeadroom(() => {
      whenNear(wrap, () => playBgVideo(wrap));
    });
  });
}

initStickyMbar();
initCtaTracking();
initPack60Preset();
initBgVideos();
