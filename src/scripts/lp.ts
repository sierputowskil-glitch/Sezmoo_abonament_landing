/**
 * LP client: sticky mbar, data-cta → dataLayer lp_cta_click,
 * self-hosted muted background videos (no YouTube iframe).
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

const blockedBgVideos = new Set<HTMLVideoElement>();
let gestureUnlockBound = false;

/** iOS/WebKit: muted + playsInline must be JS properties, not only HTML attributes. */
function armMutedInline(v: HTMLVideoElement): void {
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.autoplay = true;
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('autoplay', '');
}

function unlockBgVideosOnGesture(): void {
  if (gestureUnlockBound) return;
  gestureUnlockBound = true;
  const kick = () => {
    blockedBgVideos.forEach((v) => {
      armMutedInline(v);
      void v.play().then(() => blockedBgVideos.delete(v)).catch(() => {});
    });
  };
  const opts: AddEventListenerOptions = { once: true, passive: true };
  document.addEventListener('pointerdown', kick, opts);
  document.addEventListener('touchstart', kick, opts);
  document.addEventListener('click', kick, opts);
}

function tryPlayBgVideo(v: HTMLVideoElement): void {
  armMutedInline(v);
  const attempt = v.play();
  if (attempt === undefined) return;
  void attempt.catch((err: unknown) => {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') return;
    blockedBgVideos.add(v);
    unlockBgVideosOnGesture();
  });
}

function playBgVideo(wrap: HTMLElement): void {
  const v = wrap.querySelector('video');
  if (!(v instanceof HTMLVideoElement)) return;
  const lazy = v.getAttribute('data-src');
  if (lazy && !v.getAttribute('src')) {
    armMutedInline(v);
    v.src = lazy;
    v.removeAttribute('data-src');
  }

  if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    tryPlayBgVideo(v);
    return;
  }
  v.addEventListener('canplay', () => tryPlayBgVideo(v), { once: true });
  tryPlayBgVideo(v);
}

/** Defer work until LCP is painted so hero MP4 does not contend with the poster. */
function afterLcp(fn: () => void): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    const start = () => fn();
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 2000 });
    } else {
      setTimeout(start, 200);
    }
  };

  try {
    if (performance.getEntriesByType('largest-contentful-paint').length > 0) {
      run();
      return;
    }
    const po = new PerformanceObserver((list) => {
      if (!list.getEntries().length) return;
      po.disconnect();
      run();
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* PerformanceObserver / LCP unsupported */
  }

  window.addEventListener('load', () => setTimeout(run, 300), { once: true });
  setTimeout(run, 3000);
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

  document.querySelectorAll<HTMLElement>('[data-bg-video]').forEach((wrap) => {
    if (wrap.getAttribute('data-bg-video-priority') === 'hero') {
      afterLcp(() => playBgVideo(wrap));
      return;
    }
    whenNear(wrap, () => playBgVideo(wrap));
  });
}

initStickyMbar();
initCtaTracking();
initPack60Preset();
initBgVideos();
