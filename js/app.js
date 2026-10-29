'use strict';
// ── BOOT ──────────────────────────────────────────────────────────

// the real visible height, kept current (rotation, toolbars, returning to a home-screen app)
(function fitViewport() {
  const standalone = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  if (standalone) document.documentElement.classList.add('standalone');
  const set = () => {
    let h = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
    // home-screen apps fill the whole screen, but iOS may report innerHeight short by the status bar / home indicator
    if (standalone && screen.width && screen.height) {
      const portrait = window.innerHeight >= window.innerWidth;
      h = Math.max(h, portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height));
    }
    document.documentElement.style.setProperty('--app-h', `${h}px`);
  };
  set();
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', () => setTimeout(set, 250));
  window.addEventListener('pageshow', set);
  if (window.visualViewport) visualViewport.addEventListener('resize', set);
  // nudge the page back to the top if iOS scrolled the document (it can't scroll on purpose)
  window.addEventListener('scroll', () => { if (window.scrollY) window.scrollTo(0, 0); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') set(); });
})();

// TEMPORARY: home-screen sizing readout (tap to hide); remove once the bottom gap is fixed
(function viewportDebug() {
  if (!document.documentElement.classList.contains('standalone')) return;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;top:40%;z-index:9999;padding:8px 10px;border-radius:8px;background:rgba(220,38,38,.92);color:#fff;font:12px/1.35 monospace;white-space:pre';
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  const show = () => {
    const app = document.getElementById('app'), r = app ? app.getBoundingClientRect() : { top: 0, bottom: 0 };
    const ps = getComputedStyle(probe);
    box.textContent = `build 4\ninnerH ${innerHeight}  clientH ${document.documentElement.clientHeight}\n` +
      `vv ${window.visualViewport ? Math.round(visualViewport.height) : '-'}  screen ${screen.width}x${screen.height}\n` +
      `--app-h ${getComputedStyle(document.documentElement).getPropertyValue('--app-h')}\n` +
      `safe top ${ps.paddingTop} bot ${ps.paddingBottom}\napp ${Math.round(r.top)}..${Math.round(r.bottom)}`;
  };
  box.addEventListener('click', () => box.remove());
  window.addEventListener('load', () => { document.body.append(probe, box); show(); setTimeout(show, 600); });
  window.addEventListener('resize', show);
})();

(function boot() {
  if (L.hasSave() && !L.load()) {
    console.warn('Save could not be read; starting fresh.');
    G = null;
  }
  UI.wire();
  UI.render();
})();
