'use strict';
// ── UTILITIES ─────────────────────────────────────────────────────

const U = {
  rand(a = 0, b = 1) { return a + Math.random() * (b - a); },
  ri(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  chance(p) { return Math.random() < p; },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  gauss(m = 0, s = 1) {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  wpick(items, wfn) {
    const ws = items.map(wfn);
    const tot = ws.reduce((x, y) => x + y, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  },
  sum(a) { return a.reduce((x, y) => x + y, 0); },
  avg(a) { return a.length ? U.sum(a) / a.length : 0; },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  clock(s) {
    s = Math.max(0, Math.round(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
  ord(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  },
  fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)); },

  // colour helpers
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  },
  mix(a, b, t) {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    return U.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  },
  lum(h) {
    const c = U.hexToRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  },
  onColor(h) { return U.lum(h) > 0.22 ? '#0b0f17' : '#ffffff'; },
  ovrClass(o) { return o >= 85 ? 'o-elite' : o >= 75 ? 'o-good' : o >= 65 ? 'o-mid' : o >= 55 ? 'o-low' : 'o-bad'; },
  potGrade(p) {
    return p >= 95 ? 'A+' : p >= 90 ? 'A' : p >= 86 ? 'A-' : p >= 82 ? 'B+' : p >= 78 ? 'B' : p >= 74 ? 'B-' : p >= 70 ? 'C+' : p >= 66 ? 'C' : 'D';
  },
  vibrate(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } },
};
