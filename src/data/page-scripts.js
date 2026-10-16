(function(){
  // chowamy sticky CTA, gdy formularz jest na ekranie
  var bar=document.getElementById('mbar'), form=document.getElementById('kontakt');
  if(bar&&form&&'IntersectionObserver' in window){
    new IntersectionObserver(function(e){bar.classList.toggle('is-hidden',e[0].isIntersecting);},{threshold:.15}).observe(form);
  }
  // klik w CTA -> dataLayer (bez danych osobowych)
  document.addEventListener('click',function(ev){
    var a=ev.target.closest&&ev.target.closest('[data-cta]'); if(!a)return;
    window.dataLayer=window.dataLayer||[]; window.dataLayer.push({event:'lp_cta_click',cta_id:a.getAttribute('data-cta'),page:'abonament'});
  });
  // wideo w tle: szanujemy prefers-reduced-motion i oszczędzanie danych
  var v=document.querySelector('.hero__frame video');
  if(v){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches, sd=navigator.connection&&navigator.connection.saveData;
    if(rm||sd){v.removeAttribute('autoplay');v.pause();}}
})();

document.querySelectorAll('[data-cta="pack-60"]').forEach(function(b){b.addEventListener("click",function(){var s=document.getElementById("ab-package");if(s)s.value="60h";});});

(function () {
  function mount(el) {
    if (!el || el.dataset.ytMounted) return;
    el.dataset.ytMounted = '1';
    var id = el.getAttribute('data-yt-id');
    if (!id) return;
    var title = el.getAttribute('data-yt-title') || 'YouTube';
    var ifr = document.createElement('iframe');
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
  function whenIdle(fn) {
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2200 });
    else if (document.readyState === 'complete') setTimeout(fn, 1);
    else window.addEventListener('load', function () { setTimeout(fn, 1); });
  }
  function whenNear(el) {
    if (!('IntersectionObserver' in window)) {
      whenIdle(function () { mount(el); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          mount(e.target);
        });
      },
      { rootMargin: '240px 0px' }
    );
    io.observe(el);
  }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData) return;
  document.querySelectorAll('[data-yt-bg]').forEach(function (el) {
    if (el.getAttribute('data-yt-priority') === 'hero') whenIdle(function () { mount(el); });
    else whenNear(el);
  });
})();
