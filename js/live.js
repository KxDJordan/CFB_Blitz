'use strict';
// ── LIVE FIELD RENDERER ───────────────────────────────────────────
// Turns each engine play record (gs.lastPlay) into a real-time animation
// of all 22 players on a canvas. Offense always attacks up the screen.
// World units are yards: x = 0..53.3 across, y = 0..100 from the offense's goal.

const Live = (() => {
  const FW = 53.33, CX = FW / 2, VIEW_W = 40, R = 0.82;
  let cv = null, ctx = null, W = 0, H = 0, dpr = 1, sc = 10, raf = 0, last = 0;
  let gs = null, colors = null, logoImg = null;
  let script = null, speed = 1, paused = false;
  let cam = { x: CX, y: 30 };
  let pops = [], parts = [], shake = 0, flash = null;

  // ── geometry helpers ──
  const OFF_F = { QB: [0, -4.5], RB: [-1.8, -5.2], WR1: [-16, -1], WR2: [16, -1], WR3: [-10, -1.4], TE: [6.4, -1.2], LT: [-4.2, -1], LG: [-2.1, -1], C: [0, -1], RG: [2.1, -1], RT: [4.2, -1] };
  const DEF_F = {
    base: { DE1: [-5.2, 1.2], DT1: [-1.4, 1.2], DT2: [1.6, 1.2], DE2: [5.6, 1.2], LB1: [-5, 5], MLB: [0, 5.5], LB2: [5, 5], CB1: [-16, 6], CB2: [16, 6], S1: [-8, 12], S2: [8, 13] },
    blitz: { DE1: [-5.2, 1.2], DT1: [-1.4, 1.2], DT2: [1.6, 1.2], DE2: [5.6, 1.2], LB1: [-5, 4], MLB: [0.6, 3], LB2: [5, 4.5], CB1: [-16, 2.2], CB2: [16, 2.2], S1: [-9, 7], S2: [4, 12] },
    cover: { DE1: [-5.2, 1.2], DT1: [-1.4, 1.2], DT2: [1.6, 1.2], DE2: [5.6, 1.2], LB1: [-5.5, 6], MLB: [0, 6.5], LB2: [5.5, 6], CB1: [-16, 9], CB2: [16, 9], S1: [-9, 10], S2: [0, 16] },
    runstop: { DE1: [-5.2, 1.2], DT1: [-1.4, 1.2], DT2: [1.6, 1.2], DE2: [5.6, 1.2], LB1: [-4.5, 4], MLB: [0, 4], LB2: [4.5, 4], CB1: [-16, 5], CB2: [16, 5], S1: [-3, 7], S2: [3, 14] },
  };
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function posAt(a, t) {
    const k = a.kf;
    if (t <= k[0][0]) return [k[0][1], k[0][2]];
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i][0]) {
        const [t0, x0, y0] = k[i - 1], [t1, x1, y1] = k[i];
        const u = t1 === t0 ? 1 : ease((t - t0) / (t1 - t0));
        return [lerp(x0, x1, u), lerp(y0, y1, u)];
      }
    }
    const e = k[k.length - 1];
    return [e[1], e[2]];
  }
  // keyframe append, keeping time order
  function to(a, t, x, y) {
    const k = a.kf, lastK = k[k.length - 1];
    if (t <= lastK[0]) { lastK[1] = x; lastK[2] = y; return; }
    k.push([t, x, y]);
  }
  const hold = (a, t) => { const p = posAt(a, t); to(a, t, p[0], p[1]); };

  // ── colours ──
  function teamColors(g) {
    const t0 = L.team(g.t[0]), t1 = L.team(g.t[1]);
    const c = [t0, t1].map(t => ({ fill: t.logo.primary, stroke: t.logo.secondary, text: U.onColor(t.logo.primary) === '#ffffff' ? '#ffffff' : '#0b0f17' }));
    const A = U.hexToRgb(t0.logo.primary), B = U.hexToRgb(t1.logo.primary);
    if (Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 120) c[1] = { fill: '#f1f5f9', stroke: t1.logo.primary, text: t1.logo.primary };
    return c;
  }

  // ── mount / loop ──
  function mount(canvas, game) {
    cv = canvas; ctx = cv.getContext('2d'); gs = game;
    colors = teamColors(gs);
    logoImg = new Image();
    logoImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Logo.svg(L.team(gs.t[0]).logo, 200).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    resize();
    pops = []; parts = []; script = null;
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function unmount() { cancelAnimationFrame(raf); raf = 0; cv = null; script = null; }
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = W / VIEW_W;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!cv) return;
    if (script && !paused) {
      const prev = script.t;
      script.t = Math.min(script.dur, script.t + dt * speed);
      for (const e of script.events) if (!e.done && e.t <= script.t && e.t >= prev - 1e-6) { e.done = true; e.fn(); }
      if (script.t >= script.dur && !script.finished) {
        script.finished = true;
        const cb = script.onDone; script.onDone = null;
        if (cb) setTimeout(cb, 0);
      }
    }
    const vdt = paused ? 0 : dt * Math.min(speed, 2);
    // camera
    if (script) {
      const b = ballPos(script.t);
      const ty = b[1] + (script.camLead ?? 7), tx = U.clamp(b[0], VIEW_W / 2 - 2, FW - VIEW_W / 2 + 2);
      const k = 1 - Math.exp(-dt * 3.5);
      cam.y += (ty - cam.y) * k; cam.x += (tx - cam.x) * k;
    }
    for (const p of pops) p.age += vdt;
    pops = pops.filter(p => p.age < p.life);
    for (const p of parts) { p.x += p.vx * vdt; p.y += p.vy * vdt; p.vy -= p.g * vdt; p.age += vdt; }
    parts = parts.filter(p => p.age < p.life);
    shake *= Math.pow(0.02, dt);
    draw();
  }

  // ── screen transform ──
  const SX = x => (x - cam.x) * sc + W / 2;
  const SY = y => H * 0.64 - (y - cam.y) * sc;

  // ── drawing ──
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0.05) ctx.translate((Math.random() - 0.5) * shake * 8, (Math.random() - 0.5) * shake * 8);
    drawField();
    if (script) {
      const t = script.t;
      // trails
      for (const tr of script.trails || []) {
        if (t < tr.t0) continue;
        const a = script.actors[tr.key];
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        for (let s = Math.max(tr.t0, t - 0.6); s < Math.min(t, tr.t1); s += 0.06) {
          const p = posAt(a, s);
          ctx.beginPath(); ctx.arc(SX(p[0]), SY(p[1]), Math.max(0.1, sc * 0.28 * (1 - (t - s) / 0.6)), 0, Math.PI * 2); ctx.fill();
        }
      }
      const carrier = carrierAt(t);
      const list = Object.entries(script.actors).map(([k, a]) => ({ k, a, p: posAt(a, t) })).sort((u, v) => v.p[1] - u.p[1]);
      for (const { a, p } of list) drawShadow(p);
      for (const { k, a, p } of list) drawToken(a, p, k === carrier, t);
      drawBall(t);
    }
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(SX(p.x) - p.s / 2, SY(p.y) - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    for (const p of pops) drawPop(p);
    ctx.restore();
    if (flash) drawFlash();
  }
  function drawField() {
    const yTop = cam.y + (H * 0.64) / sc + 2, yBot = cam.y - (H * 0.36) / sc - 2;
    // sideline area
    ctx.fillStyle = '#0f3d22';
    ctx.fillRect(0, 0, W, H);
    // grass bands
    for (let y = Math.floor(yBot / 5) * 5; y < yTop; y += 5) {
      ctx.fillStyle = (Math.floor(y / 5) % 2 === 0) ? '#21753f' : '#1d6b39';
      if (y < 0 || y >= 100) continue;
      ctx.fillRect(SX(0), SY(y + 5), FW * sc, 5 * sc);
    }
    // end zones
    const ez = (y0, team, label) => {
      ctx.fillStyle = team.logo.primary;
      ctx.fillRect(SX(0), SY(y0 + 10), FW * sc, 10 * sc);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let i = 0; i < 12; i++) { ctx.fillRect(SX(i * 4.6), SY(y0 + 10), 2.3 * sc, 10 * sc); }
      ctx.save();
      ctx.fillStyle = U.onColor(team.logo.primary) === '#ffffff' ? 'rgba(255,255,255,.92)' : 'rgba(10,15,23,.85)';
      ctx.font = `700 ${Math.round(sc * 4.4)}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label.toUpperCase(), SX(CX), SY(y0 + 5));
      ctx.restore();
    };
    const off = L.team(gs.t[curO()]), def = L.team(gs.t[1 - curO()]);
    ez(100, def, def.mascot); ez(-10, off, off.mascot);
    // midfield logo
    if (logoImg && logoImg.complete && 50 > yBot && 50 < yTop) {
      ctx.globalAlpha = 0.28;
      const s = 11 * sc;
      ctx.drawImage(logoImg, SX(CX) - s / 2, SY(50) - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
    // lines
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    for (let y = 0; y <= 100; y += 5) {
      if (y < yBot || y > yTop) continue;
      ctx.lineWidth = y === 0 || y === 100 ? 3 : y % 10 === 0 ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(SX(0), SY(y)); ctx.lineTo(SX(FW), SY(y)); ctx.stroke();
    }
    // hashes
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
    for (let y = Math.max(1, Math.ceil(yBot)); y < Math.min(100, yTop); y++) {
      if (y % 5 === 0) continue;
      for (const hx of [20, FW - 20]) { ctx.beginPath(); ctx.moveTo(SX(hx - 0.5), SY(y)); ctx.lineTo(SX(hx + 0.5), SY(y)); ctx.stroke(); }
      for (const hx of [0.3, FW - 0.3]) { ctx.beginPath(); ctx.moveTo(SX(hx - 0.3), SY(y)); ctx.lineTo(SX(hx + 0.3), SY(y)); ctx.stroke(); }
    }
    // numbers
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.font = `700 ${Math.round(sc * 2.2)}px Oswald, Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let y = 10; y <= 90; y += 10) {
      if (y < yBot || y > yTop) continue;
      const n = String(y <= 50 ? y : 100 - y);
      for (const [nx, rot] of [[11, -Math.PI / 2], [FW - 11, Math.PI / 2]]) {
        ctx.save(); ctx.translate(SX(nx), SY(y)); ctx.rotate(rot); ctx.fillText(n, 0, 0); ctx.restore();
      }
    }
    // sidelines
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(SX(0), SY(-10)); ctx.lineTo(SX(0), SY(110)); ctx.moveTo(SX(FW), SY(-10)); ctx.lineTo(SX(FW), SY(110)); ctx.stroke();
    // goal posts (top end)
    if (110 > yBot && 110 < yTop + 4) {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(SX(CX - 3.1), SY(110)); ctx.lineTo(SX(CX + 3.1), SY(110)); ctx.moveTo(SX(CX), SY(110)); ctx.lineTo(SX(CX), SY(111.5)); ctx.stroke();
      ctx.fillStyle = '#facc15';
      for (const px of [CX - 3.1, CX + 3.1]) { ctx.beginPath(); ctx.arc(SX(px), SY(110), 3, 0, Math.PI * 2); ctx.fill(); }
    }
    // line of scrimmage & line to gain
    if (script && script.los != null) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(96,165,250,.9)';
      ctx.beginPath(); ctx.moveTo(SX(0), SY(script.los)); ctx.lineTo(SX(FW), SY(script.los)); ctx.stroke();
      if (script.ltg != null && script.ltg < 100) {
        ctx.strokeStyle = 'rgba(250,204,21,.92)';
        ctx.beginPath(); ctx.moveTo(SX(0), SY(script.ltg)); ctx.lineTo(SX(FW), SY(script.ltg)); ctx.stroke();
      }
    }
  }
  function drawShadow(p) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(SX(p[0]) + 2, SY(p[1]) + 3, sc * R, sc * R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawToken(a, p, isCarrier, t) {
    const c = colors[a.team];
    const x = SX(p[0]), y = SY(p[1]), r = sc * R;
    if (a.down && t >= a.down) { ctx.globalAlpha = 0.75; }
    if (isCarrier) {
      ctx.fillStyle = 'rgba(250,204,21,.28)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = c.fill;
    ctx.strokeStyle = isCarrier ? '#facc15' : c.stroke;
    ctx.lineWidth = isCarrier ? 2.4 : 1.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (a.num != null) {
      ctx.fillStyle = c.text;
      ctx.font = `700 ${Math.max(8, Math.round(r * 1.05))}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.num, x, y + 0.5);
    }
    ctx.globalAlpha = 1;
  }
  function ballSeg(t) {
    const segs = script.ball;
    for (const s of segs) if (t >= s.t0 && t <= s.t1) return s;
    return t < segs[0].t0 ? segs[0] : segs[segs.length - 1];
  }
  function ballPos(t) {
    if (!script || !script.ball.length) return [CX, cam.y - 7];
    const s = ballSeg(t);
    if (s.type === 'hold') { const p = posAt(script.actors[s.key], t); return [p[0] + 0.35, p[1] + 0.2]; }
    const u = U.clamp((t - s.t0) / (s.t1 - s.t0 || 1), 0, 1);
    return [lerp(s.from[0], s.to[0], u), lerp(s.from[1], s.to[1], u)];
  }
  function carrierAt(t) {
    if (!script || !script.ball.length) return null;
    const s = ballSeg(t);
    return s.type === 'hold' && s.glow ? s.key : null;
  }
  function drawBall(t) {
    if (!script.ball.length) return;
    const s = ballSeg(t), p = ballPos(t);
    let h = 0;
    if (s.type === 'air') { const u = U.clamp((t - s.t0) / (s.t1 - s.t0 || 1), 0, 1); h = Math.sin(Math.PI * u) * (s.h || 3); }
    const x = SX(p[0]), y = SY(p[1]);
    if (h > 0.1) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, sc * 0.35, sc * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
    const by = y - h * sc * 0.55, size = sc * (0.42 + h * 0.03);
    ctx.save(); ctx.translate(x, by); ctx.rotate(-0.6);
    ctx.fillStyle = '#8b4513'; ctx.strokeStyle = '#2b1306'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-size * 0.4, 0); ctx.lineTo(size * 0.4, 0); ctx.stroke();
    ctx.restore();
  }
  function drawPop(p) {
    const u = p.age / p.life;
    const x = SX(p.x), y = SY(p.y + u * 1.6) - sc * 1.6;
    ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : Math.min(1, u * 6);
    ctx.font = `700 ${p.big ? Math.round(sc * 1.9) : Math.round(sc * 1.25)}px Oswald, Impact, sans-serif`;
    const w = ctx.measureText(p.text).width + sc * 1.2, h = p.big ? sc * 2.6 : sc * 1.9;
    ctx.fillStyle = p.bg || 'rgba(8,12,20,.82)';
    roundRect(x - w / 2, y - h / 2, w, h, h / 2.4); ctx.fill();
    ctx.fillStyle = p.color || '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x, y + 0.5);
    ctx.globalAlpha = 1;
  }
  function drawFlash() {
    const u = (performance.now() - flash.t0) / 1600;
    if (u >= 1) { flash = null; return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = u < 0.15 ? u / 0.15 : u > 0.75 ? (1 - u) / 0.25 : 1;
    const s = u < 0.15 ? 0.7 + u * 2.4 : 1.06 - Math.min(0.06, (u - 0.15) * 0.4);
    ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.scale(s, s);
    ctx.font = `700 ${Math.round(W * 0.11)}px Oswald, Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(flash.text, 0, 0);
    ctx.fillStyle = flash.color; ctx.fillText(flash.text, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ── fx ──
  function pop(x, y, text, color, opts = {}) { pops.push({ x, y, text, color, age: 0, life: opts.life || 1.3, big: opts.big, bg: opts.bg }); }
  function burst(x, y, color = '#e2e8f0', n = 12) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(2, 7); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 6, age: 0, life: U.rand(0.35, 0.7), s: U.rand(2, 4), c: color }); }
  }
  function confetti(x, y, cols) {
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(4, 14); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 6, g: 10, age: 0, life: U.rand(0.9, 1.8), s: U.rand(3, 5), c: U.pick(cols) }); }
  }
  function bigText(text, color = '#ffffff') { flash = { text, color, t0: performance.now() }; }

  // ── script building ──
  function curO() { return script ? script.o : gs.poss; }
  function newScript(o, los, ltg) {
    return { o, los, ltg, actors: {}, ball: [], events: [], trails: [], t: 0, dur: 1, camLead: 7 };
  }
  function addActor(S, key, team, p, x, y) {
    S.actors[key] = { team, num: p && p.id >= 0 ? p.num : (p ? '' : null), kf: [[0, x, y]] };
    return S.actors[key];
  }
  function at(S, t, fn) { S.events.push({ t, fn }); }
  const P = id => (id != null && id >= 0 ? G.players[id] : null);
  function formation(S, det, dcall) {
    const o = det.o, d = 1 - o, F = DEF_F[dcall] || DEF_F.base;
    for (const [k, [dx, dy]] of Object.entries(OFF_F)) addActor(S, 'o' + k, o, P(det.O[k]) || { id: -1 }, CX + dx, det.los + dy);
    for (const [k, [dx, dy]] of Object.entries(F)) addActor(S, 'd' + k, d, P(det.D[k]) || { id: -1 }, CX + dx, det.los + dy);
  }
  const A_ = (S, k) => S.actors[k];

  // Pursuit for anyone without a scripted path: drift toward the end spot.
  function pursue(S, keys, endT, spot, tight = 3) {
    for (const k of keys) {
      const a = A_(S, k);
      if (!a || a.scripted) continue;
      const p0 = posAt(a, 0.3);
      const dx = spot[0] - p0[0], dy = spot[1] - p0[1], dd = Math.hypot(dx, dy) || 1;
      const reach = Math.max(0, dd - U.rand(tight, tight + 6));
      to(a, 0.35, p0[0], p0[1]);
      to(a, endT, p0[0] + dx / dd * reach, p0[1] + dy / dd * reach);
    }
  }

  function buildRun(det) {
    const S = newScript(det.o, det.los, det.los + (gs._togoAtSnap || 10));
    formation(S, det, det.dcall);
    const L0 = det.los, side = det.side;
    const qb = A_(S, 'oQB'), c = A_(S, 'oC');
    const carrierKey = 'o' + det.carrier;
    const rb = A_(S, carrierKey);
    // snap + mesh
    S.ball.push({ type: 'hold', key: 'oC', t0: 0, t1: 0.12 });
    to(qb, 0.4, CX + 0.4, L0 - 4.4);
    if (det.carrier !== 'QB') {
      to(rb, 0.45, CX + 0.2, L0 - 4.2);
      S.ball.push({ type: 'air', from: [CX, L0 - 1], to: [CX + 0.4, L0 - 4.3], t0: 0.12, t1: 0.3, h: 0.4 });
      S.ball.push({ type: 'hold', key: 'oQB', t0: 0.3, t1: 0.45 });
      to(qb, 0.9, CX + 1.5, L0 - 6);
    } else {
      S.ball.push({ type: 'air', from: [CX, L0 - 1], to: [CX + 0.4, L0 - 4.3], t0: 0.12, t1: 0.3, h: 0.4 });
    }
    rb.scripted = qb.scripted = true;
    const gapX = side === 'M' ? CX + U.rand(-1.6, 1.6) : side === 'L' ? CX - 8.5 : CX + 9;
    const tGap = side === 'M' ? 1.0 : 1.35;
    if (side !== 'M') to(rb, 0.95, gapX * 0.6 + CX * 0.4, L0 - 2.2);
    // blocks at the point of attack
    const blocked = new Set();
    for (const b of det.blocks) {
      const oa = A_(S, 'o' + b.o), da = A_(S, 'd' + b.d);
      if (!oa || !da) continue;
      oa.scripted = da.scripted = true; blocked.add(b.d);
      const dp = posAt(da, 0), mid = [(posAt(oa, 0)[0] + dp[0]) / 2, Math.min(dp[1] - 0.9, L0 + 1.5)];
      to(oa, 0.45, mid[0], mid[1] - 0.6); to(da, 0.45, mid[0], mid[1] + 0.6);
      const push = b.win ? U.rand(1.2, 2.4) : -U.rand(0.8, 1.6);
      to(oa, 1.6, mid[0] + (b.win ? 0 : (gapX - mid[0]) * 0.2), mid[1] - 0.6 + push);
      to(da, 1.6, mid[0] + (b.win ? 0 : (gapX - mid[0]) * 0.3), mid[1] + 0.6 + push);
      if (b.m >= 10) at(S, 0.9, () => pop(mid[0], mid[1] + 1, 'PANCAKE', '#86efac'));
      else if (b.m <= -10) at(S, 0.8, () => pop(mid[0], mid[1] + 1, 'SHED', '#fca5a5'));
    }
    // other linemen engage
    const engage = [['LT', 'DE1'], ['LG', 'DT1'], ['RG', 'DT2'], ['RT', 'DE2'], ['C', 'MLB'], ['TE', 'LB2'], ['WR1', 'CB1'], ['WR2', 'CB2'], ['WR3', 'S1']];
    for (const [ok, dk] of engage) {
      const oa = A_(S, 'o' + ok), da = A_(S, 'd' + dk);
      if (!oa || !da || oa.scripted || blocked.has(dk)) continue;
      oa.scripted = true;
      const dp = posAt(da, 0);
      if (ok.startsWith('WR')) { to(oa, 1.4, dp[0], dp[1] - 1.4); }
      else { const mid = [(posAt(oa, 0)[0] + dp[0]) / 2, dp[1] - 0.8]; to(oa, 0.45, mid[0], mid[1] - 0.5); to(oa, 1.8, mid[0], mid[1] + U.rand(-0.5, 0.8)); if (dk.startsWith('D')) { da.scripted = true; to(da, 0.45, mid[0], mid[1] + 0.6); to(da, 1.8, mid[0] + (gapX - mid[0]) * 0.15, mid[1] + 0.6); } }
    }
    // the run itself
    let t = tGap, y = L0;
    to(rb, t, gapX, L0 - 0.3);
    const yps = 6.5;
    const lv = det.levels || [];
    const carrierDone = (tt, endY, tacklerKey, fx) => {
      to(rb, tt, gapX + U.rand(-1.5, 1.5) * (side === 'M' ? 1 : 0.6), endY);
      if (tacklerKey) {
        const ta = A_(S, 'd' + tacklerKey);
        if (ta) { ta.scripted = true; const tp = posAt(ta, Math.max(0.3, tt - 1)); to(ta, Math.max(0.35, tt - 1), tp[0], tp[1]); to(ta, tt, gapX, endY + 0.7); }
      }
      if (fx) at(S, tt, fx);
      return tt;
    };
    let endT;
    const endY = L0 + det.yards;
    if (lv.length && !lv[0].win && lv[0].y < 0) {
      endT = carrierDone(t + 0.25, endY, det.tackler, () => { burst(gapX, endY); pop(gapX, endY + 1, 'STUFFED', '#fca5a5'); shake = 0.6; });
    } else {
      for (let i = 0; i < lv.length; i++) {
        const l = lv[i], yy = L0 + l.y;
        t += Math.max(0.3, (yy - y) / yps); y = yy;
        if (l.win) {
          to(rb, t, gapX + U.rand(-1.2, 1.2), yy);
          const dk = l.d, da = A_(S, 'd' + dk);
          if (da) { da.scripted = true; const p0 = posAt(da, 0.4); to(da, 0.4, p0[0], p0[1]); to(da, t, gapX + U.rand(-1, 1) - 1.2, yy + 0.4); to(da, t + 0.5, gapX - 2.5, yy - 1.5); da.down = t + 0.3; }
          const label = U.pick(['JUKE!', 'BROKE TACKLE', 'SPIN MOVE', 'STIFF ARM']);
          at(S, t, () => { pop(gapX, yy + 1.2, label, '#facc15'); burst(gapX, yy, '#facc15', 8); });
        }
      }
      const finalY = det.td ? 103 : endY;
      t += Math.max(0.3, (finalY - y) / yps);
      endT = carrierDone(t, finalY, det.td ? null : det.tackler, det.td ? null : () => { burst(gapX, finalY); shake = 0.35; if (det.fumble) pop(gapX, finalY + 1.5, 'FUMBLE!', '#fca5a5', { big: true }); });
    }
    S.ball.push({ type: 'hold', key: carrierKey, t0: det.carrier === 'QB' ? 0.3 : 0.45, t1: endT + 1, glow: true });
    S.trails.push({ key: carrierKey, t0: tGap, t1: endT });
    // others
    const spot = posAt(rb, endT);
    pursue(S, Object.keys(S.actors).filter(k => k[0] === 'd'), endT, spot, 1.5);
    pursue(S, Object.keys(S.actors).filter(k => k[0] === 'o'), endT, spot, 4);
    S.dur = endT + 0.9;
    finale(S, det, spot, endT);
    return S;
  }

  // Route waypoints relative to the receiver's start. inward = direction toward the ball.
  function routeKF(kind, start, depth, ready, inward) {
    const [sx, sy] = start, out = -inward;
    switch (kind) {
      case 'slant': return [[0.35, sx, sy + 2.5], [ready, sx + inward * 5, sy + depth], [ready + 1.4, sx + inward * 10, sy + depth + 3]];
      case 'flat': return [[ready, sx + out * 4, sy + Math.max(1, depth)], [ready + 1.4, sx + out * 9, sy + depth + 1]];
      case 'out': return [[ready - 0.25, sx, sy + depth + 0.5], [ready, sx + out * 2.5, sy + depth], [ready + 1.4, sx + out * 7, sy + depth - 0.5]];
      case 'stick': return [[ready, sx + inward * 0.5, sy + depth], [ready + 1.4, sx + inward * 1.5, sy + depth - 0.6]];
      case 'cross': return [[ready * 0.45, sx + inward * 2, sy + depth * 0.6], [ready, sx + inward * 10, sy + depth], [ready + 1.4, sx + inward * 20, sy + depth + 1]];
      case 'dig': return [[ready - 0.4, sx, sy + depth + 0.5], [ready, sx + inward * 4, sy + depth], [ready + 1.4, sx + inward * 13, sy + depth]];
      case 'seam': return [[ready, sx + inward * 1, sy + depth], [ready + 1.4, sx + inward * 1.5, sy + depth + 11]];
      case 'post': return [[ready - 0.6, sx, sy + depth - 6], [ready, sx + inward * 4, sy + depth], [ready + 1.4, sx + inward * 10, sy + depth + 9]];
      case 'corner': return [[ready - 0.6, sx, sy + depth - 6], [ready, sx + out * 4, sy + depth], [ready + 1.4, sx + out * 9, sy + depth + 8]];
      case 'go': return [[ready, sx + out * 0.5, sy + depth], [ready + 1.4, sx + out * 1, sy + depth + 12]];
      case 'screen': return [[ready, sx - 4.5, sy - 0.5], [ready + 1.4, sx - 5, sy + 1]];
      default: return [[ready, sx, sy + depth]];
    }
  }

  function buildPass(det) {
    const S = newScript(det.o, det.los, det.los + (gs._togoAtSnap || 10));
    formation(S, det, det.dcall);
    const L0 = det.los, qb = A_(S, 'oQB');
    qb.scripted = true;
    S.ball.push({ type: 'hold', key: 'oC', t0: 0, t1: 0.12 });
    S.ball.push({ type: 'air', from: [CX, L0 - 1], to: [CX, L0 - 4.4], t0: 0.12, t1: 0.3, h: 0.4 });
    // QB drop
    if (det.call === 'pa') { const rb = A_(S, 'oRB'); to(qb, 0.45, CX - 0.6, L0 - 4.6); to(rb, 0.5, CX - 0.2, L0 - 4.1); rb.scripted = true; to(rb, 1.0, CX + 1, L0 - 2.5); to(qb, 1.05, CX, L0 - 7.2); }
    else if (det.call === 'quick' || det.call === 'screen') to(qb, 0.55, CX, L0 - 5.6);
    else to(qb, 0.85, CX, L0 - 7.2);
    // pass protection: OL kick-slide
    for (const k of ['LT', 'LG', 'C', 'RG', 'RT']) {
      const a = A_(S, 'o' + k), p = posAt(a, 0);
      a.scripted = true;
      if (det.call === 'screen') { to(a, 0.7, p[0], L0 - 2); to(a, 1.3, p[0] - 5, L0 + 0.5); to(a, 2.6, p[0] - 6, L0 + 4); }
      else to(a, 0.6, p[0] * 1.04 - CX * 0.04, L0 - 2.2);
    }
    const qbSpot = t => posAt(qb, t);
    // rushers
    for (const r of det.rush) {
      const ra = A_(S, 'd' + r.r);
      if (!ra) continue;
      ra.scripted = true;
      const ba = r.b ? A_(S, 'o' + r.b) : null;
      if (ba && (r.b === 'RB' || r.b === 'TE')) { ba.scripted = true; const bp = posAt(ba, 0); to(ba, 0.6, (bp[0] + CX) / 2, L0 - 3.5); }
      if (ba) { const bp = posAt(ba, 0.6); to(ra, 0.55, bp[0] + U.rand(-0.3, 0.3), bp[1] + 1.1); }
      if (r.win && r.t < 9) {
        const tt = Math.min(r.t, (det.throwT ?? r.t) + 0.6);
        const isSacker = det.outcome === 'sack' && det.sacker === r.r;
        const target = isSacker ? qbSpot(det.sackT) : qbSpot(tt);
        to(ra, isSacker ? det.sackT : tt, target[0] + (isSacker ? 0.3 : U.rand(-1.2, 1.2)), target[1] + (isSacker ? 0.7 : 1.2));
        at(S, Math.max(0.6, tt - 0.5), () => { const p = posAt(ra, Math.max(0.6, tt - 0.5)); pop(p[0], p[1], r.b ? `BEAT ${r.b}` : 'UNBLOCKED', '#fca5a5'); });
      } else if (ba) {
        const bp = posAt(ba, 0.6);
        to(ra, 2.8, bp[0] + U.rand(-0.4, 0.4), bp[1] + 1.0);
      }
    }
    // routes
    const recKF = {};
    for (const r of det.routes) {
      const a = A_(S, 'o' + r.slot), st = posAt(a, 0);
      a.scripted = true;
      const inward = st[0] < CX ? 1 : -1;
      recKF[r.slot] = routeKF(r.kind, st, r.depth, r.ready, inward);
      if (det.target === r.slot && det.throwT != null && det.outcome !== 'sack') continue;
      for (const k of recKF[r.slot]) to(a, k[0], k[1], k[2]);
    }
    // non-route eligibles block / stay
    for (const k of ['WR1', 'WR2', 'WR3', 'TE', 'RB']) {
      const a = A_(S, 'o' + k);
      if (a.scripted) continue;
      a.scripted = true;
      const p = posAt(a, 0);
      if (k === 'RB' || k === 'TE') to(a, 0.7, (p[0] + CX) / 2, L0 - 3.6);
      else to(a, 2.5, p[0], p[1] + 6);
    }
    // throw
    let endT = 2.6, spot = qbSpot(2.6);
    const tgt = det.target ? A_(S, 'o' + det.target) : null;
    const route = det.target ? det.routes.find(r => r.slot === det.target) : null;
    if (det.outcome === 'sack') {
      const tt = det.sackT;
      to(qb, tt + 0.25, CX + U.rand(-0.6, 0.6), L0 + det.yards);
      S.ball.push({ type: 'hold', key: 'oQB', t0: 0.3, t1: tt + 2, glow: true });
      endT = tt + 0.3; spot = [CX, L0 + det.yards];
      at(S, tt, () => { burst(CX, L0 + det.yards, '#fca5a5', 16); shake = 1.1; pop(CX, L0 + det.yards + 1.5, 'SACK!', '#fca5a5', { big: true }); });
    } else if (det.outcome === 'scramble') {
      const ex = det.escapeT ?? 2.2, side = U.pick([-1, 1]);
      to(qb, ex, CX + side * 1.5, L0 - 6.5);
      const yEnd = det.td ? 103 : L0 + det.yards;
      to(qb, ex + 0.5, CX + side * 6, L0 - 2);
      endT = ex + 0.5 + Math.max(0.4, (yEnd - (L0 - 2)) / 6.2);
      to(qb, endT, CX + side * 9, yEnd);
      S.ball.push({ type: 'hold', key: 'oQB', t0: 0.3, t1: endT + 2, glow: true });
      S.trails.push({ key: 'oQB', t0: ex, t1: endT });
      at(S, ex, () => { const p = posAt(qb, ex); pop(p[0], p[1], 'SCRAMBLE', '#facc15'); });
      spot = [CX + side * 9, yEnd];
    } else if (det.outcome === 'throwaway') {
      const tt = det.throwT;
      S.ball.push({ type: 'hold', key: 'oQB', t0: 0.3, t1: tt });
      const from = qbSpot(tt), toP = [-3, from[1] + 8];
      S.ball.push({ type: 'air', from, to: toP, t0: tt, t1: tt + 0.8, h: 3 });
      S.ball.push({ type: 'air', from: toP, to: [-4, toP[1] + 1], t0: tt + 0.8, t1: tt + 1.4, h: 0.3 });
      endT = tt + 1.1; spot = from;
      at(S, tt + 0.2, () => pop(from[0], from[1], 'THROWN AWAY', '#cbd5e1'));
    } else {
      // a real throw
      const tt = det.throwT;
      S.ball.push({ type: 'hold', key: 'oQB', t0: 0.3, t1: tt });
      const kf = recKF[det.target];
      const readyK = kf.find(k => k[0] >= route.ready - 0.01) || kf[0];
      const catchP = [U.clamp(readyK[1] + (readyK[1] < CX ? -0.5 : 0.5) * Math.min(3, route.depth / 8), 1, FW - 1), L0 + route.depth];
      const from = qbSpot(tt);
      const flight = Math.max(0.35, dist(from, catchP) / 24 + 0.15);
      const ct = tt + flight;
      // target path to catch point
      for (const k of kf) if (k[0] < ct - 0.05 && k[2] < catchP[1] + 0.5) to(tgt, k[0], k[1], k[2]);
      to(tgt, ct, catchP[0], catchP[1]);
      const sepTxt = route.sep >= 0 ? `OPEN +${route.sep.toFixed(1)}` : `TIGHT ${route.sep.toFixed(1)}`;
      at(S, tt, () => { pop(catchP[0], catchP[1] + 1.5, sepTxt, route.sep >= 1.5 ? '#86efac' : '#fcd34d'); if (det.pressured) { const q = qbSpot(tt); pop(q[0], q[1] - 1.2, 'PRESSURE', '#fca5a5'); } });
      S.ball.push({ type: 'air', from, to: catchP, t0: tt, t1: ct, h: Math.min(9, 1.5 + route.depth * 0.22) });
      S.camLead = route.depth > 15 ? 4 : 7;
      // coverage defender shadows the target
      if (route.def) shadow(S, 'd' + route.def, tgt, route.sep, ct + 0.2);
      if (det.outcome === 'complete') {
        S.ball.push({ type: 'hold', key: 'o' + det.target, t0: ct, t1: 99, glow: true });
        let t = ct, y = catchP[1], x = catchP[0];
        for (const a of det.attempts || []) {
          const ay = L0 + a.at;
          t += Math.max(0.25, (ay - y) / 7); y = ay; x += U.rand(-1.5, 1.5);
          to(tgt, t, x, y);
          const da = A_(S, 'd' + a.d);
          if (a.win && da) {
            da.scripted = true;
            const p0 = posAt(da, Math.max(0.5, t - 1)); to(da, Math.max(0.5, t - 1), p0[0], p0[1]); to(da, t, x - 0.9, y + 0.6); to(da, t + 0.5, x - 2.5, y - 1); da.down = t + 0.3;
            const tx = x, ty2 = y;
            at(S, t, () => { pop(tx, ty2 + 1.2, U.pick(['BROKE TACKLE', 'MISSED TACKLE', 'JUKE!']), '#facc15'); burst(tx, ty2, '#facc15', 8); });
          }
        }
        const fy = det.td ? 103 : L0 + det.yards;
        t += Math.max(0.3, (fy - y) / 7);
        x = U.clamp(x + U.rand(-2, 2), 1.5, FW - 1.5);
        to(tgt, t, x, fy);
        endT = t; spot = [x, fy];
        S.trails.push({ key: 'o' + det.target, t0: ct, t1: t });
        if (det.tackler) {
          const ta = A_(S, 'd' + det.tackler);
          if (ta) { ta.scripted = true; const p0 = posAt(ta, Math.max(0.5, t - 1.2)); to(ta, Math.max(0.5, t - 1.2), p0[0], p0[1]); to(ta, t, x + 0.4, fy + 0.7); }
          at(S, t, () => { burst(x, fy); shake = 0.3; });
        }
      } else if (det.outcome === 'incomplete') {
        const miss = [catchP[0] + U.rand(-1.5, 1.5), catchP[1] + U.rand(0.8, 2)];
        S.ball.pop();
        S.ball.push({ type: 'air', from, to: miss, t0: tt, t1: ct, h: Math.min(9, 1.5 + route.depth * 0.22) });
        S.ball.push({ type: 'air', from: miss, to: [miss[0] + 1, miss[1] + 1.5], t0: ct, t1: ct + 0.5, h: 0.5 });
        endT = ct + 0.4; spot = catchP;
        at(S, ct, () => { pop(catchP[0], catchP[1] + 1.4, det.pbu ? 'PASS BROKEN UP' : 'INCOMPLETE', det.pbu ? '#fca5a5' : '#cbd5e1'); if (det.pbu) burst(catchP[0], catchP[1], '#fca5a5', 10); });
      } else if (det.outcome === 'int') {
        const pk = A_(S, 'd' + det.picker);
        pk.scripted = true;
        const p0 = posAt(pk, Math.max(0.4, ct - 1.2));
        to(pk, Math.max(0.4, ct - 1.2), p0[0], p0[1]);
        to(pk, ct, catchP[0] + 0.3, catchP[1] + 0.4);
        S.ball.push({ type: 'hold', key: 'd' + det.picker, t0: ct, t1: 99, glow: true });
        const ry = det.pick6 ? -8 : det.touchback ? catchP[1] + 0.4 : L0 + det.intEnd;
        const rt = ct + Math.max(0.4, Math.abs(catchP[1] - ry) / 7);
        to(pk, rt, catchP[0] + U.rand(-4, 4), ry);
        S.trails.push({ key: 'd' + det.picker, t0: ct, t1: rt });
        endT = rt; spot = posAt(pk, rt);
        at(S, ct, () => { pop(catchP[0], catchP[1] + 1.5, 'INTERCEPTED!', '#fca5a5', { big: true }); burst(catchP[0], catchP[1], '#fca5a5', 18); shake = 0.8; });
        S.camLead = 2;
      }
    }
    // coverage on every other route
    const covUntil = (det.throwT ?? 2.4) + 0.7;
    for (const r of det.routes) if (r.def && r.slot !== det.target && !A_(S, 'd' + r.def).scripted) shadow(S, 'd' + r.def, A_(S, 'o' + r.slot), r.sep, covUntil);
    if (det.outcome !== 'int' && det.outcome !== 'incomplete') S.camLead = 6;
    // everyone else
    pursue(S, Object.keys(S.actors).filter(k => k[0] === 'd'), endT, spot, 1.5);
    pursue(S, Object.keys(S.actors).filter(k => k[0] === 'o'), endT, spot, 4);
    for (const a of Object.values(S.actors)) hold(a, endT + 0.9);
    S.dur = endT + 0.9;
    finale(S, det, spot, endT);
    return S;
  }
  // Defender trails a receiver; positive separation = bigger cushion.
  function shadow(S, key, rec, sep, until) {
    const da = A_(S, key);
    if (!da) return;
    da.scripted = true;
    const d0 = posAt(da, 0), side = d0[0] < CX ? -1 : 1;
    const lag = U.clamp(0.6 + sep * 0.35, -0.8, 4.5);
    for (let t = 0.35; t <= until + 0.001; t += 0.3) {
      const rp = posAt(rec, t), rp2 = posAt(rec, t + 0.1);
      const vx = rp2[0] - rp[0], vy = rp2[1] - rp[1], vv = Math.hypot(vx, vy) || 1;
      to(da, t, rp[0] - vx / vv * lag + side * 0.5, rp[1] - vy / vv * lag + (sep < 0 ? 0.6 : 0));
    }
  }
  function finale(S, det, spot, endT) {
    const o = det.o;
    if (det.td || (det.outcome === 'int' && det.pick6)) {
      const scorer = det.pick6 ? 1 - o : o;
      const team = L.team(gs.t[scorer]);
      at(S, endT, () => { bigText('TOUCHDOWN', '#facc15'); confetti(spot[0], spot[1], [team.logo.primary, team.logo.secondary, '#facc15', '#ffffff']); shake = 0.6; });
    } else if (det.yards >= 20 && det.outcome !== 'int') {
      at(S, endT, () => pop(spot[0], spot[1] + 1.4, `+${det.yards} YDS`, '#86efac', { big: true }));
    } else if (det.yards != null && !(det.type === 'run' && det.yards <= 0) && det.outcome !== 'sack' && det.outcome !== 'int' && det.outcome !== 'incomplete' && det.outcome !== 'throwaway') {
      at(S, endT, () => pop(spot[0], spot[1] + 1.4, det.yards >= 0 ? `+${det.yards}` : `${det.yards}`, det.yards >= 0 ? '#ffffff' : '#fca5a5'));
    }
  }

  // ── special teams ──
  function squad(side, n = 11) {
    const ids = [];
    for (const pos of ['WR', 'CB', 'S', 'LB', 'RB', 'TE', 'DL', 'OL']) for (const id of gs.lu[side][pos]) if (ids.length < n) ids.push(id);
    return ids.map(id => G.players[id]);
  }
  function buildKickoff(det) {
    // Receiving team's frame: kicking team lines up at the receivers' 65.
    const S = newScript(det.o, null, null);
    const k = det.kickSide, r = det.o;
    const kick = squad(k), recv = squad(r);
    const landX = CX + U.rand(-6, 6), landY = det.land;
    kick.forEach((p, i) => addActor(S, 'k' + i, k, p, 5 + i * 4.3, 65.5));
    const retKey = 'r0';
    addActor(S, retKey, r, G.players[det.returner] || recv[0], landX, landY - 1);
    recv.slice(1, 11).forEach((p, i) => addActor(S, 'r' + (i + 1), r, p, 6 + (i % 5) * 10.5, 22 + Math.floor(i / 5) * 12));
    const hang = 2.6, kt = 0.6;
    S.ball.push({ type: 'hold', key: 'k5', t0: 0, t1: kt });
    to(A_(S, 'k5'), kt, 5 + 5 * 4.3, 65);
    S.ball.push({ type: 'air', from: [CX, 65], to: [landX, landY], t0: kt, t1: kt + hang, h: 14 });
    const ct = kt + hang;
    const end = det.touchback ? landY : Math.min(103, det.end);
    let endT = ct + 0.6;
    if (!det.touchback) endT = ct + Math.max(0.6, (end - landY) / 7.5);
    const ret = A_(S, retKey);
    to(ret, ct, landX, landY);
    S.ball.push({ type: 'hold', key: retKey, t0: ct, t1: 99, glow: !det.touchback });
    const ex = landX + U.rand(-8, 8);
    if (!det.touchback) { to(ret, endT, U.clamp(ex, 3, FW - 3), end); S.trails.push({ key: retKey, t0: ct, t1: endT }); }
    else at(S, ct + 0.2, () => pop(landX, landY + 2, 'TOUCHBACK', '#cbd5e1'));
    const spot = posAt(ret, endT);
    for (let i = 0; i < 11; i++) { const a = A_(S, 'k' + i); const p0 = posAt(a, 0); to(a, endT, p0[0] + (spot[0] - p0[0]) * U.rand(0.6, 0.95), p0[1] + (spot[1] - p0[1]) * U.rand(0.75, 0.97)); }
    for (let i = 1; i < 11; i++) { const a = A_(S, 'r' + i); const p0 = posAt(a, 0); to(a, endT, p0[0] + (spot[0] - p0[0]) * 0.3, p0[1] + U.rand(4, 12)); }
    S.camLead = 3;
    S.dur = endT + 0.8;
    if (det.end >= 100) at(S, endT, () => { const team = L.team(gs.t[r]); bigText('TOUCHDOWN', '#facc15'); confetti(spot[0], spot[1], [team.logo.primary, team.logo.secondary, '#facc15']); });
    else if (!det.touchback) at(S, endT, () => { burst(spot[0], spot[1]); pop(spot[0], spot[1] + 1.4, `${Math.round(det.end - landY)} YD RETURN`, '#ffffff'); });
    return S;
  }
  function buildPunt(det) {
    const S = newScript(det.o, det.los, null);
    const o = det.o, d = 1 - o, L0 = det.los;
    const cov = squad(o), rec = squad(d);
    cov.slice(0, 10).forEach((p, i) => addActor(S, 'c' + i, o, p, CX - 9 + (i < 7 ? i * 3 : (i - 7) * 18 - 18), L0 - 1));
    addActor(S, 'pk', o, G.players[det.kicker] || cov[10], CX, L0 - 13);
    rec.slice(1, 11).forEach((p, i) => addActor(S, 'x' + i, d, p, CX - 10 + (i % 5) * 5, L0 + 2 + Math.floor(i / 5) * 4));
    const landX = CX + U.rand(-5, 5), landY = det.land;
    addActor(S, 'ret', d, G.players[det.returner] || rec[0], landX, Math.min(L0 + 45, landY + 2));
    S.ball.push({ type: 'hold', key: 'c3', t0: 0, t1: 0.1 });
    S.ball.push({ type: 'air', from: [CX, L0 - 1], to: [CX, L0 - 13], t0: 0.1, t1: 0.55, h: 0.6 });
    S.ball.push({ type: 'hold', key: 'pk', t0: 0.55, t1: 1.0 });
    const hang = 2.5, ct = 1.0 + hang;
    S.ball.push({ type: 'air', from: [CX, L0 - 12], to: [landX, landY], t0: 1.0, t1: ct, h: 16 });
    const ret = A_(S, 'ret');
    to(ret, ct, landX, landY);
    let endT = ct + 0.5, end = det.end;
    if (det.touchback) { S.ball.push({ type: 'air', from: [landX, landY], to: [landX, landY + 3], t0: ct, t1: ct + 0.6, h: 1 }); at(S, ct, () => pop(landX, landY, 'TOUCHBACK', '#cbd5e1')); }
    else {
      S.ball.push({ type: 'hold', key: 'ret', t0: ct, t1: 99, glow: !det.fair });
      if (det.fair) at(S, ct, () => pop(landX, landY + 1.5, 'FAIR CATCH', '#cbd5e1'));
      else { endT = ct + Math.max(0.5, Math.abs(landY - (det.td ? -8 : end)) / 7.5); to(ret, endT, landX + U.rand(-6, 6), det.td ? -8 : end); S.trails.push({ key: 'ret', t0: ct, t1: endT }); }
    }
    const spot = posAt(ret, endT);
    for (let i = 0; i < 10; i++) { const a = A_(S, 'c' + i); const p0 = posAt(a, 0); to(a, endT, p0[0] + (spot[0] - p0[0]) * U.rand(0.5, 0.92), p0[1] + (spot[1] + 1.5 - p0[1]) * U.rand(0.7, 0.98)); }
    for (let i = 0; i < 10; i++) { const a = A_(S, 'x' + i); const p0 = posAt(a, 0); to(a, endT, p0[0] + U.rand(-2, 2), Math.max(spot[1], p0[1] + U.rand(4, 14))); }
    S.camLead = 2;
    S.dur = endT + 0.8;
    if (det.td) at(S, endT, () => { bigText('TOUCHDOWN', '#facc15'); });
    else if (!det.fair && !det.touchback) at(S, endT, () => burst(spot[0], spot[1]));
    return S;
  }
  function buildFG(det) {
    const S = newScript(det.o, det.los, null);
    const o = det.o, d = 1 - o, L0 = det.los;
    const line = squad(o, 9), rush = squad(d, 11);
    line.forEach((p, i) => addActor(S, 'l' + i, o, p, CX - 6 + i * 1.5, L0 - 1));
    addActor(S, 'h', o, null, CX, L0 - 7);
    addActor(S, 'kk', o, G.players[det.kicker] || null, CX - 1.4, L0 - 9.5);
    rush.forEach((p, i) => addActor(S, 'r' + i, d, p, CX - 8 + i * 1.6, L0 + 1.2));
    S.ball.push({ type: 'hold', key: 'l4', t0: 0, t1: 0.1 });
    S.ball.push({ type: 'air', from: [CX, L0 - 1], to: [CX, L0 - 7], t0: 0.1, t1: 0.5, h: 0.4 });
    S.ball.push({ type: 'hold', key: 'h', t0: 0.5, t1: 0.95 });
    to(A_(S, 'kk'), 0.9, CX - 0.3, L0 - 7.6);
    const off = det.good ? 0 : det.miss === 'wide left' ? -5 : det.miss === 'wide right' ? 5 : 0;
    const endY = det.good || det.miss !== 'short' ? 112 : 106;
    S.ball.push({ type: 'air', from: [CX, L0 - 7], to: [CX + off, endY], t0: 0.95, t1: 2.5, h: 10 });
    rush.forEach((p, i) => { const a = A_(S, 'r' + i); const p0 = posAt(a, 0); to(a, 0.4, p0[0], p0[1] - 0.6); to(a, 1.3, p0[0] + (CX - p0[0]) * 0.2, p0[1] - 1.5); });
    S.camLead = -2;
    at(S, 2.45, () => { pop(CX, 108, det.good ? 'IT\'S GOOD!' : 'NO GOOD', det.good ? '#86efac' : '#fca5a5', { big: true }); if (det.good) burst(CX, 110, '#facc15', 20); });
    S.dur = 3.3;
    return S;
  }
  function buildKneel(det) {
    const S = newScript(det.o, det.los, null);
    formation(S, det, 'base');
    S.ball.push({ type: 'hold', key: 'oC', t0: 0, t1: 0.15 });
    S.ball.push({ type: 'air', from: [CX, det.los - 1], to: [CX, det.los - 4.4], t0: 0.15, t1: 0.35, h: 0.3 });
    S.ball.push({ type: 'hold', key: 'oQB', t0: 0.35, t1: 99 });
    to(A_(S, 'oQB'), 0.9, CX, det.los - 5);
    at(S, 0.9, () => pop(CX, det.los - 3.5, 'VICTORY FORMATION', '#cbd5e1'));
    S.dur = 1.8;
    return S;
  }

  // ── public: play an engine play record ──
  function play(det, onDone) {
    if (!det) { onDone && onDone(); return; }
    let S;
    try {
      S = det.type === 'run' ? buildRun(det) : det.type === 'pass' ? buildPass(det) : det.type === 'kickoff' ? buildKickoff(det) : det.type === 'punt' ? buildPunt(det) : det.type === 'fg' ? buildFG(det) : det.type === 'kneel' ? buildKneel(det) : null;
    } catch (e) { console.error('Live build failed', e); S = null; }
    if (!S) { onDone && onDone(); return; }
    S.onDone = onDone;
    script = S;
  }
  // Static pre-snap look for the next play.
  function lineup() {
    if (!gs || gs.over) return;
    if (gs.phase === 'kickoff') {
      const S = newScript(1 - gs.kicker, null, null);
      squad(gs.kicker).forEach((p, i) => addActor(S, 'k' + i, gs.kicker, p, 5 + i * 4.3, 65.5));
      squad(1 - gs.kicker).forEach((p, i) => addActor(S, 'r' + i, 1 - gs.kicker, p, i ? 6 + ((i - 1) % 5) * 10.5 : CX, i ? 22 + Math.floor((i - 1) / 5) * 12 : 2));
      S.ball.push({ type: 'hold', key: 'k5', t0: 0, t1: 99 });
      S.dur = 0.01; S.camLead = 14;
      script = S;
      return;
    }
    const o = gs.poss, O = Engine.slots(gs, o, true), D = Engine.slots(gs, 1 - o, false);
    const det = { o, los: gs.ball, O: {}, D: {} };
    for (const k in O) det.O[k] = O[k].id;
    for (const k in D) det.D[k] = D[k].id;
    const S = newScript(o, gs.ball, gs.ball + gs.togo);
    formation(S, det, 'base');
    // jog in from a few yards away
    for (const a of Object.values(S.actors)) { const k = a.kf[0]; a.kf = [[0, k[1] + U.rand(-3, 3), k[2] + (k[2] > gs.ball ? 4 : -4)], [0.7, k[1], k[2]]]; }
    S.ball.push({ type: 'hold', key: 'oC', t0: 0, t1: 99 });
    S.dur = 0.75;
    script = S;
  }
  function setSpeed(s) { speed = s; }
  function setPaused(p) { paused = p; }
  function skip() { if (script) { script.t = script.dur - 0.001; } }

  return { mount, unmount, resize, play, lineup, setSpeed, setPaused, skip, bigText };
})();
