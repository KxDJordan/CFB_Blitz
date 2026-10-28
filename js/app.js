'use strict';
// ── BOOT ──────────────────────────────────────────────────────────

(function boot() {
  if (L.hasSave() && !L.load()) {
    console.warn('Save could not be read; starting fresh.');
    G = null;
  }
  UI.wire();
  UI.render();
})();
