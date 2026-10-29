'use strict';
// ── BOOT ──────────────────────────────────────────────────────────

// the real visible height, kept current (rotation, toolbars, returning to a home-screen app)
(function fitViewport() {
  const set = () => document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
  set();
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', () => setTimeout(set, 250));
  window.addEventListener('pageshow', set);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') set(); });
})();

(function boot() {
  if (L.hasSave() && !L.load()) {
    console.warn('Save could not be read; starting fresh.');
    G = null;
  }
  UI.wire();
  UI.render();
})();
