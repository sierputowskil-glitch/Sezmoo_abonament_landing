/**
 * LP client: sticky mbar, data-cta → dataLayer lp_cta_click,
 * self-hosted muted background videos (no YouTube iframe).
 *
 * Policy:
 * - Save-Data / reduced-motion / slow-2g|2g → poster + play (no MP4 until tap)
 * - Wi‑Fi / LTE / unknown (iOS): autoplay AFTER eager images settle
 * - One clip downloading at a time; offscreen hero yields bandwidth on scroll
 */

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

/** Save-Data or truly slow nets only — never gate on cellular (breaks iOS/LTE autoplay). */
function preferManualVideo(): boolean {
  const conn = getConnection();
  if (!conn) return false;
  if (conn.saveData) return true;
  const eff = (conn.effectiveType || '').toLowerCase();
  if (eff === 'slow-2g' || eff === '2g') return true;
  return typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1.0;
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

function pauseOffscreenBgVideos(except?: HTMLVideoElement): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (v === except || v.paused) return;
    if (!isInViewport(v)) v.pause();
  });
}

/** Abort offscreen MP4 downloads so images can use the pipe. */
function releaseOffscreenVideoBandwidth(except?: HTMLVideoElement): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (v === except) return;
    if (isInViewport(v) && !v.paused) return;
    const src = v.getAttribute('src');
    if (!src) return;
    if (!v.getAttribute('data-src')) v.setAttribute('data-src', src);
    v.removeAttribute('src');
    try {
      v.pause();
    } catch {
      /* ignore */
    }
    try {
      v.load();
    } catch {
      /* ignore */
    }
    v.closest('[data-bg-video]')?.classList.remove('is-playing');
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

function kickVisiblePaused(): void {
  document.querySelectorAll<HTMLVideoElement>('[data-bg-video] video').forEach((v) => {
    if (!v.getAttribute('src')) return;
    if (!isInViewport(v)) return;
    if (v.paused) tryPlayBgVideo(v);
    else markPlaying(v);
  });
}

function initGestureUnlock(): void {
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', kickVisiblePaused, opts);
  window.addEventListener('touchstart', kickVisiblePaused, opts);
  window.addEventListener('click', kickVisiblePaused, opts);
}

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

/**
 * Wi‑Fi / LTE autoplay gate: all eager (+ LCP) images load+decode first,
 * then MP4 may start. Timeout so a hung image never blocks forever.
 */
function whenEagerImagesReady(fn: () => void, timeoutMs = 4000): void {
  const imgs = [
    ...document.querySelectorAll<HTMLImageElement>(
      'img[loading="eager"], img[fetchpriority="high"]',
    ),
  ];

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    fn();
  };

  const settle = async (img: HTMLImageElement) => {
    if (!(img.complete && img.naturalWidth > 0)) {
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }
    if (typeof img.decode === 'function') {
      try {
        await img.decode();
      } catch {
        /* ignore decode errors */
      }
    }
  };

  const timer = window.setTimeout(done, timeoutMs);
  void Promise.all(imgs.map(settle)).then(() => {
    window.clearTimeout(timer);
    done();
  });
}

/** Drop hero MP4 when scrolled away so lazy team images can finish. */
function initScrollBandwidthYield(): void {
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const heroVid = document.querySelector<HTMLVideoElement>(
          '[data-bg-video-priority="hero"] video',
        );
        if (!heroVid?.getAttribute('src')) return;
        if (isInViewport(heroVid)) return;
        releaseOffscreenVideoBandwidth();
      });
    },
    { passive: true },
  );
}

function initBgVideos(): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || preferManualVideo()) {
    document.querySelectorAll<HTMLElement>('[data-bg-video]').forEach(prepareManualPlay);
    return;
  }

  // Wi‑Fi / LTE / unknown: images first, then autoplay.
  initGestureUnlock();
  initLateAutoplayRetries();
  initScrollBandwidthYield();

  whenEagerImagesReady(() => {
    document.querySelectorAll<HTMLElement>('[data-bg-video]').forEach((wrap) => {
      if (wrap.getAttribute('data-bg-video-priority') === 'hero') {
        playBgVideo(wrap);
        return;
      }
      // Scope: start only when near — and only after images (gate above).
      whenNear(wrap, () => playBgVideo(wrap));
    });
  });
}

initStickyMbar();
initCtaTracking();
initPack60Preset();
initBgVideos();
