'use strict';
// ── LIVE BROADCAST: physical player simulation ────────────────────
// Every player is a body with mass, top speed and acceleration from his
// ratings. Bodies collide, blockers physically engage defenders, rushers must
// shed blocks to get around them, and tackles happen on contact. The engine's
// stat-driven play record (gs.lastPlay) decides *what* happens; this module
// makes the 22 players act it out, viewed from an elevated broadcast camera.
//
// World units are yards. x = 0..53.3 across the field, y = 0..100 measured
// from the goal line of the team whose perspective the camera is using
// (the offense or the kicking team, which always attacks up the screen).

const Live = (() => {
  const FW = 53.33, CX = FW / 2, DT = 1 / 60;
  const CAM_H = 8.2, CAM_BACK = 15.5;
  let cv = null, ctx = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, F = 200, HOR = 30;
  let gs = null, kit = null, logoImg = null, crowd = null;
  let speed = 1, paused = false, acc = 0;
  let S = null; // current scene
  const cam = { x: CX, y: 30 };
  let pops = [], parts = [], shake = 0, flash = null, cut = null, readyCb = null;

  // ── formations (x offset from centre, y offset from line of scrimmage) ──
  const OFF_F = { QB: [0, -5], RB: [-1.7, -5.2], WR1: [-13, -0.8], WR2: [13, -0.8], WR3: [-8, -1.2], TE: [5.3, -1.0], LT: [-3.4, -0.9], LG: [-1.7, -0.9], C: [0, -0.7], RG: [1.7, -0.9], RT: [3.4, -0.9] };
  // Defensive alignments are built over the receivers they cover (WR1 -13, WR3 -8, TE +5.3, WR2 +13).
  const DEF_F = {
    base: { DE1: [-4.4, 1.0], DT1: [-1.1, 1.0], DT2: [1.3, 1.0], DE2: [4.6, 1.0], LB1: [-3.6, 4.5], MLB: [0, 5], LB2: [4.8, 4.2], CB1: [-12.4, 3.4], CB2: [12.4, 3.4], S1: [-7.6, 5], S2: [4, 12.5] },
    blitz: { DE1: [-4.4, 1.0], DT1: [-1.1, 1.0], DT2: [1.3, 1.0], DE2: [4.6, 1.0], LB1: [-3.6, 3.4], MLB: [0.6, 2.8], LB2: [4.8, 3.2], CB1: [-12.6, 1.6], CB2: [12.6, 1.6], S1: [-7.6, 4.5], S2: [2, 12] },
    cover: { DE1: [-4.4, 1.0], DT1: [-1.1, 1.0], DT2: [1.3, 1.0], DE2: [4.6, 1.0], LB1: [-4, 5.5], MLB: [0, 6], LB2: [4.6, 5.2], CB1: [-12.4, 5.5], CB2: [12.4, 5.5], S1: [-7.8, 6.5], S2: [0, 15] },
    runstop: { DE1: [-4.4, 1.0], DT1: [-1.1, 1.0], DT2: [1.3, 1.0], DE2: [4.6, 1.0], LB1: [-7.4, 4], MLB: [0, 3.8], LB2: [4.6, 3.6], CB1: [-12.5, 3], CB2: [12.5, 3], S1: [-2.5, 6.5], S2: [2, 13] },
  };


  // ── small math ──
  const hyp = Math.hypot;
  const d2 = (a, b) => hyp(a.x - b.x, a.y - b.y);
  const clampX = x => U.clamp(x, 1, FW - 1);
  const ang = (dx, dy) => Math.atan2(dy, dx);
  const P = id => (id != null && id >= 0 ? G.players[id] : null);

  // ── kits ──
  function makeKits() {
    const t = [L.team(gs.t[0]), L.team(gs.t[1])];
    const k = tm => ({
      jersey: tm.logo.primary, num: U.onColor(tm.logo.primary) === '#ffffff' ? '#ffffff' : '#0b0f17',
      pants: U.lum(tm.logo.secondary) > 0.35 ? tm.logo.secondary : '#e5e7eb', helmet: tm.logo.primary, stripe: tm.logo.secondary,
      dark: U.mix(tm.logo.primary, '#000000', 0.45),
    });
    kit = [k(t[0]), k(t[1])];
    const A = U.hexToRgb(t[0].logo.primary), B = U.hexToRgb(t[1].logo.primary);
    if (hyp(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 120) {
      kit[1] = { jersey: '#f8fafc', num: t[1].logo.primary, pants: '#f1f5f9', helmet: t[1].logo.primary, stripe: t[1].logo.secondary, dark: '#94a3b8' };
    }
  }

  // ── mount / loop ──
  function mount(canvas, game) {
    cv = canvas; ctx = cv.getContext('2d'); gs = game;
    makeKits();
    logoImg = new Image();
    logoImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Logo.svg(L.team(gs.t[0]).logo, 200).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    resize();
    initVisuals();
    pops = []; parts = []; S = null; cut = null; readyCb = null; acc = 0;
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function unmount() { cancelAnimationFrame(raf); raf = 0; cv = null; S = null; readyCb = null; cut = null; }
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = W / VIEW_W;
  }
  function buildCrowd() {
    if (!kit || W < 10) return;
    crowd = document.createElement('canvas');
    crowd.width = Math.round(W * 1.6 * dpr); crowd.height = Math.round(Math.max(20, HOR) * dpr);
    const c = crowd.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, crowd.height);
    g.addColorStop(0, '#05070d'); g.addColorStop(0.45, '#141b2b'); g.addColorStop(1, '#252e40');
    c.fillStyle = g; c.fillRect(0, 0, crowd.width, crowd.height);
    const cols = [kit[0].jersey, kit[1].jersey, '#e2e8f0', '#94a3b8', '#475569', '#cbd5e1'];
    for (let i = 0; i < crowd.width * crowd.height / 18; i++) {
      const y = Math.random() * crowd.height;
      if (y < crowd.height * 0.35) continue;
      c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      c.globalAlpha = 0.25 + Math.random() * 0.5;
      c.fillRect(Math.random() * crowd.width, y, 1.6 * dpr, 1.6 * dpr);
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) / 6 * crowd.width;
      const rg = c.createRadialGradient(x, crowd.height * 0.12, 0, x, crowd.height * 0.12, crowd.height * 0.6);
      rg.addColorStop(0, 'rgba(255,255,240,.55)'); rg.addColorStop(1, 'rgba(255,255,240,0)');
      c.fillStyle = rg; c.fillRect(x - crowd.height, 0, crowd.height * 2, crowd.height);
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!cv) return;
    if (cut) {
      cut.age += dt;
      if (!cut.mid && cut.age >= 0.22) { cut.mid = true; cut.fn(); }
      if (cut.age >= 0.6) cut = null;
    }
    if (S && !paused && !(cut && !cut.mid)) {
      acc += dt * speed;
      let n = 0;
      while (acc >= DT && n++ < 24) { step(); acc -= DT; }
      if (n >= 24) acc = 0;
    }
    if (readyCb && !paused && !cut && S && S.ready) { const cb = readyCb; readyCb = null; setTimeout(cb, 0); }
    updateCamera(dt);
    const vdt = paused ? 0 : dt * Math.min(speed, 2);
    for (const p of pops) p.age += vdt;
    pops = pops.filter(p => p.age < p.life);
    for (const p of parts) { p.x += p.vx * vdt; p.y += p.vy * vdt; p.z = Math.max(0, p.z + p.vz * vdt); p.vz -= 18 * vdt; p.age += vdt; }
    parts = parts.filter(p => p.age < p.life);
    shake *= Math.pow(0.03, dt);
    updateWeather(dt);
    draw();
  }
  function startCut(fn) { cut = { age: 0, mid: false, fn }; }

  // ════════════ SIMULATION ════════════
  function mkAgent(key, side, p, x, y, face) {
    const pl = p && p.id >= 0 ? p : null;
    const pos = pl ? pl.pos : (p && p.pos) || 'WR';
    const big = pos === 'OL' || pos === 'DL';
    const spd = pl ? pl.attrs.spd : 55, str = pl ? pl.attrs.str : 55;
    return {
      key, side, pid: pl ? pl.id : null, num: pl ? pl.num : '', pos, x, y, vx: 0, vy: 0,
      face: face ?? (side === S.o ? Math.PI / 2 : -Math.PI / 2), faceT: null,
      vmax: big ? 5.4 + spd * 0.034 : pos === 'QB' || pos === 'K' ? 6 + spd * 0.04 : 6.3 + spd * 0.05,
      acc: big ? 8 + str * 0.02 : 11 + spd * 0.05, mass: big ? 1.55 : (pos === 'LB' || pos === 'TE' || pos === 'RB') ? 1.15 : 1,
      r: big ? 0.52 : 0.43, wx: 0, wy: 0, brain: null, eng: null, down: 0, stayDown: false, stumble: 0, phase: Math.random() * 6,
      pose: null, ignore: null, blockT: null, blockOn: null, brainLock: false, celebrate: false, mark: [x, y],
    };
  }
  function newScene(o, los, ltg, kind) {
    S = { o, los, ltg, kind, ag: {}, list: [], t: 0, snapT: null, ball: { mode: 'none', x: CX, y: los ?? 35, z: 0 }, carrier: null, engs: [], ev: [], dead: false, deadT: 0, ready: false, onDone: null, focus: null, tk: null, dirUp: 1 };
    return S;
  }
  function add(key, side, p, x, y, face) { const a = mkAgent(key, side, p, x, y, face); S.ag[key] = a; S.list.push(a); return a; }
  const pt = () => (S.snapT == null ? -1 : S.t - S.snapT); // time since snap
  function at(t, fn) { S.ev.push({ t, fn, done: false }); }

  // steering helpers — each sets the agent's desired velocity
  function seek(a, x, y, frac = 1, arrive = 1.6) {
    const dx = x - a.x, dy = y - a.y, d = hyp(dx, dy);
    if (d < 0.04) { a.wx = 0; a.wy = 0; return d; }
    const vm = a.vmax * (a.boost ? 1.3 : 1);
    const sp = Math.min(vm * frac, (d / arrive) * vm * frac + 0.3);
    a.wx = dx / d * sp; a.wy = dy / d * sp;
    return d;
  }
  function stop(a) { a.wx = 0; a.wy = 0; }
  function lead(a, t, cap = 1.0) {
    const tt = Math.min(cap, d2(a, t) / Math.max(4, a.vmax));
    return [t.x + (t.vx || 0) * tt, t.y + (t.vy || 0) * tt];
  }
  function chase(a, t, keep = 0, frac = 1) {
    if (!t) return stop(a);
    const [px, py] = lead(a, t);
    if (keep > 0) {
      const d = d2(a, t);
      if (d < keep + 0.8) {
        const ux = (a.x - t.x) / (d || 1), uy = (a.y - t.y) / (d || 1);
        return seek(a, t.x + ux * keep, t.y + uy * keep, frac, 0.8);
      }
    }
    return seek(a, px, py, frac, 0.6);
  }
  function avoid(a, radius = 1.9, k = 3.2, only) {
    let ax = 0, ay = 0;
    for (const b of S.list) {
      if (b === a || b.down > 0 || (only && !only(b))) continue;
      const dx = a.x - b.x, dy = a.y - b.y, d = hyp(dx, dy);
      if (d < radius && d > 0.01) { const f = (radius - d) / radius * k; ax += dx / d * f; ay += dy / d * f; }
    }
    a.wx += ax * a.vmax / 4; a.wy += ay * a.vmax / 4;
    const s = hyp(a.wx, a.wy);
    if (s > a.vmax) { a.wx *= a.vmax / s; a.wy *= a.vmax / s; }
  }

  // engagements: two bodies locked together, moving as a pair.
  // Who drives whom is a strength contest; the engine's verdict decides who
  // ultimately wins the rep, the ratings decide how violently.
  const power = a => { const p = a.pid != null ? G.players[a.pid] : null; return p ? p.attrs.str * 0.6 + p.attrs.skl * 0.25 + p.attrs.awr * 0.15 : 50; };
  function engage(blk, def, o = {}) {
    if (blk.eng || def.eng || blk.down > 0 || def.down > 0) return null;
    const sd = power(blk) - power(def) + U.gauss(0, 3); // + = blocker stronger
    const e = { a: blk, d: def, t0: S.t, dir: o.dir || [0, 0], rate: o.rate ?? 0.3, shed: o.shed ?? null, onShed: o.onShed, pancake: o.pancake, win: o.win ?? null, sd, gap: (blk.r + def.r) * 0.92, jit: Math.random() * 6 };
    // lopsided matchups end violently
    if (e.win !== false && sd >= 13 && !e.pancake && e.shed == null) e.pancake = S.t + U.rand(0.7, 1.3);
    if (e.win === false && sd <= -11) e.bull = true;
    blk.eng = def.eng = e;
    S.engs.push(e);
    burst((blk.x + def.x) / 2, (blk.y + def.y) / 2, 'rgba(255,255,255,.55)', 4, 1.5);
    return e;
  }
  function release(e, shedDir) {
    if (!e || e.done) return;
    e.a.eng = e.d.eng = null;
    e.done = true;
    if (shedDir) {
      e.a.blockT = null; e.a.blockOn = null; e.a.brain = x => chase(x, S.carrier || e.d, 1.5, 0.5);
      if (e.bull) { e.a.down = 0.9; e.a.vx = -shedDir[0] * 1.5; e.a.vy = -(S.dirUp || 1) * 2.5; pop(e.d.x, e.d.y, 'BULL RUSH', '#fca5a5'); }
      else e.a.stumble = 0.55;
      e.d.vx += shedDir[0] * 3.2; e.d.vy += shedDir[1] * 3.2;
    }
  }
  function stepEngs() {
    for (const e of S.engs) {
      if (e.done) continue;
      const A = e.a, D = e.d;
      if (A.down > 0 || D.down > 0) { release(e); continue; }
      if (e.shed != null && S.t >= e.shed) {
        const side = Math.sign(D.x - A.x) || (Math.random() < 0.5 ? -1 : 1);
        release(e, [side, 0.4 * (S.dirUp || 1) * -1]);
        if (e.onShed) e.onShed(e);
        continue;
      }
      if (e.pancake && S.t >= e.pancake) { D.down = 1.6; D.vx = A.vx * 1.5; D.vy = A.vy * 1.5 + (S.dirUp || 1) * 1.5; release(e); pop(D.x, D.y, 'PANCAKE', '#86efac'); continue; }
      let nx = D.x - A.x, ny = D.y - A.y;
      const nl = hyp(nx, ny) || 1; nx /= nl; ny /= nl;
      // the stronger man moves the pile; even matchups rock back and forth
      const age = S.t - e.t0;
      const scale = U.clamp(0.7 + Math.abs(e.sd) * 0.03, 0.6, 1.5);
      let push = U.clamp(e.sd * 0.045, -0.95, 0.95);
      if (e.win === true) push = Math.max(push, 0.25);
      if (e.win === false) push = Math.min(push, e.bull ? -1.3 : -0.1);
      const tug = Math.abs(e.sd) < 7 ? Math.sin(age * 2.6 + e.jit) * 0.5 : 0;
      const jx = Math.sin(S.t * 5 + e.jit) * 0.15, jy = Math.cos(S.t * 4 + e.jit) * 0.12;
      const vx = e.dir[0] * e.rate * scale + nx * (push + tug) + jx;
      const vy = e.dir[1] * e.rate * scale + ny * (push + tug) + jy;
      const cx = (A.x + D.x) / 2 + vx * DT, cy = (A.y + D.y) / 2 + vy * DT;
      A.x = cx - nx * e.gap / 2; A.y = cy - ny * e.gap / 2;
      D.x = cx + nx * e.gap / 2; D.y = cy + ny * e.gap / 2;
      A.vx = D.vx = vx; A.vy = D.vy = vy;
      A.face = ang(nx, ny); D.face = ang(-nx, -ny);
      A.phase += DT * (3 + Math.abs(push) * 4); D.phase += DT * (3 + Math.abs(push) * 4);
    }
  }

  function step() {
    S.t += DT;
    for (const e of S.ev) if (!e.done && S.t >= e.t) { e.done = true; e.fn(); }
    for (const a of S.list) {
      a.wx = 0; a.wy = 0; a.boost = false;
      if (a.down > 0 || a.eng) continue;
      if (S.dead) postBrain(a); else if (a.brain) a.brain(a);
    }
    stepEngs();
    for (const a of S.list) {
      if (a.eng) continue;
      if (a.down > 0) {
        a.vx *= 0.86; a.vy *= 0.86; a.x += a.vx * DT; a.y += a.vy * DT;
        if (!a.stayDown) { a.down -= DT; if (a.down < 0) a.down = 0; }
        continue;
      }
      let wx = a.wx, wy = a.wy;
      if (a.stumble > 0) { a.stumble -= DT; wx *= 0.25; wy *= 0.25; }
      let dvx = wx - a.vx, dvy = wy - a.vy;
      const vmx = a.vmax * (a.boost ? 1.3 : 1);
      const dv = hyp(dvx, dvy), am = a.acc * (a.boost ? 1.6 : 1) * DT * (hyp(wx, wy) < hyp(a.vx, a.vy) ? 1.6 : 1);
      if (dv > am) { dvx *= am / dv; dvy *= am / dv; }
      a.vx += dvx; a.vy += dvy;
      const sp = hyp(a.vx, a.vy);
      if (sp > vmx * 1.05) { a.vx *= vmx * 1.05 / sp; a.vy *= vmx * 1.05 / sp; }
      a.x += a.vx * DT; a.y += a.vy * DT;
      a.x = U.clamp(a.x, -4, FW + 4);
      const target = sp > 0.7 ? ang(a.vx, a.vy) : a.faceT;
      if (target != null) {
        let df = target - a.face;
        while (df > Math.PI) df -= Math.PI * 2;
        while (df < -Math.PI) df += Math.PI * 2;
        a.face += U.clamp(df, -9 * DT, 9 * DT);
      }
      a.phase += DT * (1.2 + sp * 1.05);
    }
    const cr = S.carrier;
    if (cr && S.ball.mode === 'held' && hyp(cr.vx, cr.vy) > 3) { (cr.trail = cr.trail || []).push([cr.x, cr.y]); if (cr.trail.length > 18) cr.trail.shift(); }
    collide();
    checkContacts();
    stepBall();
    if (S.dead) {
      S.deadT += DT;
      if (S.deadT > 1.5 && S.onDone) { const cb = S.onDone; S.onDone = null; clearTimeout(S.watchdog); setTimeout(cb, 0); }
    } else if (S.readyFn) S.readyFn();
  }
  function collide() {
    const l = S.list, c = S.ball.mode === 'held' && !S.dead ? S.carrier : null;
    const scripted = S.tk ? new Set(S.tk.queue.map(q => q.a)) : null;
    for (let i = 0; i < l.length; i++) {
      const a = l[i];
      if (a.down > 0) continue;
      for (let j = i + 1; j < l.length; j++) {
        const b = l[j];
        if (b.down > 0 || (a.eng && a.eng === b.eng)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), min = a.r + b.r;
        if (d >= min || d < 1e-4) continue;
        // a blocker reaching his man starts the engagement
        if (a.blockT === b && !a.eng && !b.eng && a.blockOn) { a.blockOn(a, b); if (a.eng) continue; }
        if (b.blockT === a && !a.eng && !b.eng && b.blockOn) { b.blockOn(b, a); if (b.eng) continue; }
        if (c && (a === c || b === c) && S.tk) {
          const o = a === c ? b : a;
          // the runner squeezes past teammates and through the edges of blocks
          if (o.side === c.side || o.eng) continue;
          // a defender who isn't the one the engine picked dives and misses
          if (!scripted.has(o)) { whiff(c, o); continue; }
          // the engine's tackler can't end the run early — he rides along until the contact point
          const head = S.tk.queue[0];
          if (!head || head.a !== o || !S.tk.gate(head)) continue;
        }
        const ma = a.mass * (a.eng ? 1.6 : 1), mb = b.mass * (b.eng ? 1.6 : 1);
        const over = min - d, nx = dx / d, ny = dy / d;
        const wa = mb / (ma + mb), wb = ma / (ma + mb);
        a.x -= nx * over * wa; a.y -= ny * over * wa;
        b.x += nx * over * wb; b.y += ny * over * wb;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { a.vx += nx * rv * wa; a.vy += ny * rv * wa; b.vx -= nx * rv * wb; b.vy -= ny * rv * wb; }
      }
    }
  }
  function whiff(c, o) {
    o.down = 0.75; o.stayDown = false;
    o.face = ang(c.x - o.x, c.y - o.y);
    o.vx = (c.x - o.x) * 1.5 + c.vx * 0.3; o.vy = (c.y - o.y) * 1.5 + c.vy * 0.3;
    c.vx *= 0.88; c.vy *= 0.88;
    c.vx += (Math.sign(c.x - o.x) || 1) * 1.2;
    if (S.t - (S.lastWhiff || -9) > 1.1) { S.lastWhiff = S.t; pop(o.x, o.y, U.pick(['MISSED TACKLE', 'SHAKEN', 'WHIFF']), '#facc15', { life: 1 }); }
  }
  // after the whistle: slow down, drift toward the ball, get up
  function postBrain(a) {
    const b = ballPos();
    if (a.celebrate) { seek(a, a.x + Math.cos(S.t * 3 + a.phase) * 0.8, a.y + Math.sin(S.t * 3) * 0.4, 0.35); return; }
    const d = hyp(a.x - b.x, a.y - b.y);
    if (d > 3 && d < 15) seek(a, b.x + (a.x - b.x) / d * 2.6, b.y + (a.y - b.y) / d * 2.6, 0.3);
    else stop(a);
    a.faceT = ang(b.x - a.x, b.y - a.y);
  }

  // ── ball ──
  function holdBall(a) { S.ball = { mode: 'held', holder: a }; S.carrier = a; }
  function throwBall(from, to, dur, peak, onLand, z0 = 2.0, z1 = 1.3) {
    S.ball = { mode: 'air', fx: from.x, fy: from.y, fz: z0, tx: to[0], ty: to[1], tz: z1, t0: S.t, dur, peak, onLand };
    S.carrier = null;
  }
  function looseBall(x, y, z, vx, vy, vz) { S.ball = { mode: 'loose', x, y, z, vx, vy, vz }; S.carrier = null; }
  function ballPos() {
    const b = S.ball;
    if (b.mode === 'held') {
      const a = b.holder;
      return { x: a.x + Math.cos(a.face) * 0.28, y: a.y + Math.sin(a.face) * 0.28, z: a.down > 0 ? 0.25 : a.pose === 'kneel' ? 0.7 : 1.15 };
    }
    if (b.mode === 'air') {
      const u = U.clamp((S.t - b.t0) / b.dur, 0, 1);
      let dx = 0, dy = 0;
      if (wx && wx.wind > 6) { const dr = Math.sin(Math.PI * u) * wx.wind * 0.07 * Math.min(1, b.peak / 8); const v = windVec(); dx = v[0] * dr; dy = -v[1] * dr; }
      return { x: b.fx + (b.tx - b.fx) * u + dx, y: b.fy + (b.ty - b.fy) * u + dy, z: b.fz + (b.tz - b.fz) * u + Math.sin(Math.PI * u) * b.peak };
    }
    return { x: b.x ?? CX, y: b.y ?? 30, z: b.z ?? 0 };
  }
  function stepBall() {
    const b = S.ball;
    if (b.mode === 'air' && S.t - b.t0 >= b.dur) {
      const fn = b.onLand, p = ballPos();
      looseBall(p.x, p.y, p.z, (b.tx - b.fx) / b.dur * 0.25, (b.ty - b.fy) / b.dur * 0.25, -2);
      if (fn) fn();
    } else if (b.mode === 'loose') {
      b.x += b.vx * DT; b.y += b.vy * DT; b.z += b.vz * DT; b.vz -= 20 * DT;
      if (b.z <= 0) { b.z = 0; if (Math.abs(b.vz) > 2) b.vz = -b.vz * 0.4; else b.vz = 0; b.vx *= 0.8; b.vy *= 0.8; }
    }
  }
  function dead(fx) {
    if (S.dead) return;
    S.dead = true; S.deadT = 0;
    for (const e of S.engs) if (!e.done) release(e);
    if (fx) fx();
  }

  // ── contacts: scripted tackles / broken tackles ──
  function checkContacts() {
    if (S.dead || !S.tk) return;
    const c = S.carrier;
    if (!c || c.down > 0) return;
    const cur = S.tk.queue[0];
    if (!cur) return;
    const d = cur.a;
    if (d.down > 0) return;
    if (d.eng) release(d.eng);
    if (d2(d, c) < c.r + d.r + 0.15 && S.tk.gate(cur)) {
      S.tk.queue.shift();
      if (cur.win) {
        d.down = 1.1; d.vx = -c.vx * 0.3; d.vy = -c.vy * 0.3;
        const side = Math.sign(c.x - d.x) || 1;
        c.vx += side * 3.5; c.vy *= 0.6;
        pop(c.x, c.y, U.pick(['BROKE TACKLE', 'JUKE!', 'SPIN MOVE', 'STIFF ARM']), '#facc15');
        burst(c.x, c.y, 'rgba(250,204,21,.9)', 8);
      } else tackle(c, d);
    }
  }
  function tackle(c, d) {
    c.down = 9; c.stayDown = true; c.vx = d.vx * 0.5 + c.vx * 0.4; c.vy = d.vy * 0.5 + c.vy * 0.4; c.face = ang(c.vx || 0.01, c.vy || 0.01);
    d.down = 9; d.stayDown = true; d.vx = c.vx; d.vy = c.vy; d.face = c.face;
    shake = Math.max(shake, 0.5);
    burst(c.x, c.y, 'rgba(226,232,240,.9)', 14);
    const sc = S;
    setTimeout(() => { if (S !== sc) return; c.stayDown = false; c.down = 1.0; d.stayDown = false; d.down = 0.7; }, 900 / speed);
    if (S.fumble) {
      S.fumble = false;
      looseBall(c.x, c.y, 0.8, U.rand(-3, 3), U.rand(-2, 3), 3);
      pop(c.x, c.y, 'FUMBLE!', '#fca5a5', { big: true });
      setTimeout(() => { if (S === sc && S.ball.mode === 'loose') holdBall(d); }, 500 / speed);
    }
    dead(S.onTackle);
  }
  // Plan a ball-carrier run. The runner always runs; the engine-picked
  // defenders come up to meet him where the engine says contact happens.
  function runPlan(carrier, plan) {
    const dir = plan.dir || 1;
    plan.queue = (plan.attempts || []).filter(x => x.a).map(x => ({ a: x.a, at: x.at, win: x.win }));
    if (plan.tackler && !plan.td) plan.queue.push({ a: plan.tackler, at: plan.endY, win: false, final: true });
    plan.gate = q => (S.carrier.y - q.at) * dir >= -0.9;
    S.tk = plan;
    const scripted = new Set(plan.queue.map(q => q.a));
    carrier.brain = a => {
      const q = plan.queue[0];
      const aheadY = plan.td ? plan.endY : a.y + dir * 9;
      const tx = clampX(a.x + (plan.endX - a.x) * 0.3);
      seek(a, tx, aheadY, 1, 0.5);
      // weave around defenders who aren't the one making this play
      avoid(a, 1.7, 2.0, b => b.side !== a.side && !b.eng && (!q || b !== q.a));
      if (plan.td && (a.y - plan.goal) * dir > 0.5 && !S.dead) return touchdownFx(a);
      // safety net: if the tackler can't physically get there, the nearest defender drags him down
      if (!plan.td && (a.y - plan.endY) * dir > 3.5 && !S.dead) {
        let best = null, bd = 6;
        for (const d of S.list) if (d.side !== a.side && d.down <= 0) { const dd = d2(a, d); if (dd < bd) { bd = dd; best = d; } }
        if (best) { if (best.eng) release(best.eng); tackle(a, best); }
        else if ((a.y - plan.endY) * dir > 6) { a.down = 9; a.stayDown = true; dead(() => pop(a.x, a.y, 'DOWN', '#cbd5e1')); }
      }
    };
    for (const q of plan.queue) {
      q.a.blockT = null; q.a.brainLock = true;
      if (q.a.eng) release(q.a.eng);
      q.a.brain = a => {
        if (S.carrier !== carrier) return chase(a, carrier, 2);
        const head = plan.queue[0] === q;
        const toGo = (q.at - carrier.y) * dir;
        const behind = (a.y - carrier.y) * dir < -0.5;
        if (head && toGo < 1.4) { a.boost = true; return chase(a, carrier, 0, 1); }
        if (behind) { a.boost = head; return chase(a, carrier, head ? 1.0 : 2.4, 1); }
        // get square in front of the runner at the contact point
        const tReach = Math.max(0.25, toGo / Math.max(3, Math.abs(carrier.vy)));
        const mx = clampX(carrier.x + carrier.vx * Math.min(tReach, 1.4)), my = q.at + dir * 1.3;
        if (!head && d2(a, carrier) < 2.6) return seek(a, a.x + (a.x < carrier.x ? -2 : 2), a.y, 1, 0.5);
        a.boost = head && hyp(mx - a.x, my - a.y) / a.vmax > tReach;
        seek(a, mx, my, 1, 0.7);
        a.faceT = ang(carrier.x - a.x, carrier.y - a.y);
      };
    }
    // pursuit: defenders take angles from the side or behind — never parked in the runner's path
    for (const a of S.list) {
      if (a.side === carrier.side || scripted.has(a) || a.brainLock) continue;
      a.brain = b => {
        const cc = carrier, sp = hyp(cc.vx, cc.vy) || 1, side = Math.sign(b.x - cc.x) || 1;
        if ((b.y - cc.y) * dir > 2) return seek(b, clampX(cc.x + side * 2.8), cc.y + dir * 1.5, 0.97, 0.6);
        seek(b, cc.x - cc.vx / sp * 2.2 + side * 1.4, cc.y - cc.vy / sp * 2.2, 0.97, 0.6);
      };
    }
  }
  function touchdownFx(a) {
    a.celebrate = true;
    dead(() => {
      const team = L.team(gs.t[a.side]);
      bigText('TOUCHDOWN', '#facc15');
      confetti(a.x, a.y, [kit[a.side].jersey, team.logo.secondary, '#facc15', '#ffffff']);
      shake = 0.6;
      for (const m of S.list) if (m.side === a.side && d2(m, a) < 18) m.celebrate = true;
    });
  }
  // a player with no specific job: find the nearest free opponent and block him
  function blocker(a, exclude, rate = 0.25) {
    a.blockT = null;
    a.brain = b => {
      if (!b.blockT || b.blockT.eng || b.blockT.down > 0) {
        let best = null, bd = 9;
        for (const d of S.list) { if (d.side === b.side || d.eng || d.down > 0 || (exclude && exclude.has(d))) continue; const dd = d2(b, d); if (dd < bd) { bd = dd; best = d; } }
        b.blockT = best;
      }
      if (!b.blockT) return chase(b, S.carrier || b, 3, 0.5);
      const t = b.blockT, c = S.carrier;
      const px = c ? (t.x + c.x) / 2 : t.x, py = c ? (t.y + c.y) / 2 : t.y;
      seek(b, t.x * 0.7 + px * 0.3, t.y * 0.7 + py * 0.3, 0.95, 0.4);
    };
    a.blockOn = (b, d) => engage(b, d, { dir: [0, (S.dirUp || 1) * 0.6], rate, shed: S.t + U.rand(1.6, 3) });
  }

  // ════════════ SCENES ════════════
  const sideAgents = side => S.list.filter(a => a.side === side);
  function placeFormation(o, los, O, D, dcall, huddle) {
    for (const [k, [dx, dy]] of Object.entries(OFF_F)) {
      const a = add('o' + k, o, P(O[k]) || { id: -1, pos: k === 'QB' ? 'QB' : 'OL' }, CX + dx, los + dy, Math.PI / 2);
      a.mark = [CX + dx, los + dy];
    }
    for (const [k, [dx, dy]] of Object.entries(DEF_F[dcall] || DEF_F.base)) {
      const a = add('d' + k, 1 - o, P(D[k]) || { id: -1, pos: 'LB' }, CX + dx, los + dy, -Math.PI / 2);
      a.mark = [CX + dx, los + dy];
    }
    if (huddle) {
      const offs = sideAgents(o), defs = sideAgents(1 - o);
      offs.forEach((a, i) => { const t = (i / offs.length) * Math.PI * 2; a.x = CX + Math.cos(t) * 3.0; a.y = los - 9.5 + Math.sin(t) * 2.4; a.face = ang(CX - a.x, los - 9 - a.y); });
      defs.forEach((a, i) => { a.x = CX + (i % 6 - 2.5) * 2.1; a.y = los + 7 + Math.floor(i / 6) * 2.1; a.face = -Math.PI / 2; });
    }
  }
  function marksBrain(delay, frac) {
    return a => {
      if (S.t < delay) { a.faceT = a.side === S.o ? ang(CX - a.x, S.los - 9 - a.y) : -Math.PI / 2; return stop(a); }
      seek(a, a.mark[0], a.mark[1], frac, 1.1);
      if (hyp(a.x - a.mark[0], a.y - a.mark[1]) < 0.4) a.faceT = a.side === S.o ? Math.PI / 2 : -Math.PI / 2;
    };
  }
  const allSet = () => S.list.every(a => hyp(a.x - a.mark[0], a.y - a.mark[1]) < 0.6 && hyp(a.vx, a.vy) < 0.9);

  // Next-play setup: cut to the huddle, break, walk up to the line (or line up for a kickoff).
  function lineup() {
    if (!gs || gs.over) return;
    startCut(() => {
      if (gs.phase === 'kickoff') return kickoffFormation();
      const o = gs.poss, O = Engine.slots(gs, o, true), D = Engine.slots(gs, 1 - o, false);
      const ids = X => { const r = {}; for (const k in X) r[k] = X[k].id; return r; };
      newScene(o, gs.ball, gs.ball + gs.togo, 'lineup');
      placeFormation(o, gs.ball, ids(O), ids(D), 'base', true);
      for (const a of S.list) a.brain = marksBrain(a.side === o ? 0.6 : 0.35, 0.85);
      S.ball = { mode: 'spot', x: CX, y: gs.ball, z: 0.15 };
      S.focus = () => [CX, S.los + 3];
      S.readyFn = () => { if (!S.ready && ((S.t > 1.2 && allSet()) || S.t > 6)) S.ready = true; };
      cam.y = S.los + 3; cam.x = CX;
    });
  }
  function ready(fn) { readyCb = fn; }

  // ── scrimmage plays ──
  function presnap(det, start) {
    if (!S || S.kind !== 'lineup' || S.o !== det.o) {
      newScene(det.o, det.los, det.los + (gs._togoAtSnap || 10), 'play');
      placeFormation(det.o, det.los, det.O, det.D, det.dcall || 'base', false);
      cam.y = det.los + 4;
    }
    S.kind = 'play'; S.ready = false; S.readyFn = null;
    S.los = det.los; S.ltg = det.los + (gs._togoAtSnap || 10);
    // personnel on the field matches the engine's call
    for (const [k, id] of Object.entries(det.O || {})) { const a = S.ag['o' + k], p = P(id); if (a && p && a.pid !== id) { a.pid = id; a.num = p.num; } }
    for (const [k, id] of Object.entries(det.D || {})) { const a = S.ag['d' + k], p = P(id); if (a && p && a.pid !== id) { a.pid = id; a.num = p.num; } }
    // the defense shifts into its called look
    for (const [k, [dx, dy]] of Object.entries(DEF_F[det.dcall] || DEF_F.base)) { const a = S.ag['d' + k]; if (a) { a.mark = [CX + dx, det.los + dy]; a.brain = marksBrain(0, 0.7); } }
    for (const a of sideAgents(det.o)) a.brain = b => { seek(b, b.mark[0], b.mark[1], 0.5, 1); b.faceT = Math.PI / 2; };
    S.ball = { mode: 'spot', x: CX, y: det.los, z: 0.15 };
    S.focus = () => [CX, S.los + 4];
    const t0 = S.t;
    at(t0 + 0.55, () => pop(S.ag.oQB.x, S.ag.oQB.y, 'SET...', '#e2e8f0', { life: 0.6 }));
    at(t0 + 1.0, () => { S.snapT = S.t; pop(S.ag.oQB.x, S.ag.oQB.y, 'HUT!', '#ffffff', { life: 0.7 }); start(); });
  }
  const T = x => x * 1.12; // engine seconds → simulated seconds

  function finalePop(det) {
    const c = S.carrier;
    if (!c) return;
    if (det.type === 'run' && det.yards <= 0) pop(c.x, c.y, det.yards < 0 ? `STUFFED ${det.yards}` : 'NO GAIN', '#fca5a5');
    else if (det.yards >= 15) pop(c.x, c.y, `+${det.yards} YDS`, '#86efac', { big: true });
    else if (det.yards != null) pop(c.x, c.y, det.yards >= 0 ? `+${det.yards}` : `${det.yards}`, det.yards >= 0 ? '#ffffff' : '#fca5a5');
  }

  function runPlay(det) {
    presnap(det, () => {
      const L0 = det.los, o = det.o, A = k => S.ag[k];
      const qb = A('oQB'), car = A('o' + det.carrier) || A('oRB'), c = A('oC');
      S.dirUp = 1;
      throwBall(c, [qb.x, qb.y], 0.22, 0.2, () => holdBall(qb), 0.4, 1.1);
      const gapX = det.side === 'M' ? CX + U.rand(-1.2, 1.2) : det.side === 'L' ? CX - 7.5 : CX + 7.5;
      const endY = det.td ? 104 : L0 + det.yards;
      const endX = clampX(gapX + (det.side === 'M' ? U.rand(-2.5, 2.5) : (det.side === 'L' ? -1 : 1) * U.rand(1, 5)));
      const scripted = new Set();
      for (const l of det.levels || []) if (A('d' + l.d)) scripted.add(A('d' + l.d));
      if (det.tackler && A('d' + det.tackler)) scripted.add(A('d' + det.tackler));
      // QB hand-off, then carry out the fake
      if (car !== qb) {
        const mesh = [CX + (det.side === 'L' ? -0.8 : 0.8), L0 - 4.6];
        qb.brain = a => { if (pt() < 0.75) seek(a, mesh[0], mesh[1], 0.8, 0.6); else seek(a, CX + (det.side === 'L' ? 4 : -4), L0 - 6.5, 0.45); };
        car.brain = a => seek(a, mesh[0], mesh[1] + 0.2, 0.75, 0.5);
        at(S.snapT + 0.62, () => { holdBall(car); startCarry(); });
      } else at(S.snapT + 0.35, () => startCarry());
      function startCarry() {
        const lv = det.levels || [];
        const tacklerA = det.tackler ? A('d' + det.tackler) : null;
        const tfl = lv.length && !lv[0].win && lv[0].y < 0;
        S.fumble = !!det.fumble;
        if (tfl && tacklerA) {
          if (tacklerA.eng) release(tacklerA.eng, [0, -1]);
          return runPlan(car, { attempts: [], tackler: tacklerA, endY: L0 + det.yards, endX: car.x, td: false, goal: 100, dir: 1 });
        }
        const attempts = lv.filter(l => l.win).map(l => ({ a: A('d' + l.d), at: L0 + l.y, win: true }));
        car.brain = a => seek(a, gapX, L0 - 0.3, 1, 0.5);
        at(S.t + (det.side === 'M' ? 0.45 : 0.85), () => runPlan(car, { attempts, tackler: tacklerA, endY, endX, td: det.td, goal: 100, dir: 1 }));
      }
      // blocking at the point of attack
      const used = new Set();
      for (const b of det.blocks || []) {
        const ob = A('o' + b.o), db = A('d' + b.d);
        if (!ob || !db) continue;
        used.add(ob); used.add(db);
        const away = Math.sign(db.x - gapX) || 1;
        ob.blockT = db;
        ob.brain = a => seek(a, db.x - (db.x - gapX) * 0.15, db.y - 0.4, 1, 0.3);
        ob.blockOn = (a, d) => engage(a, d, b.win
          ? { win: true, dir: [away * 0.7, 0.75], rate: 1.0 + Math.max(0, b.m) * 0.04, pancake: b.m >= 10 ? S.t + 1.1 : null }
          : { win: false, dir: [0, -0.6], rate: 0.7, shed: S.t + (b.m <= -11 ? 0.25 : U.rand(0.5, 0.9)), onShed: e => { e.d.brain = x => chase(x, S.carrier || car, 1.6); pop(e.d.x, e.d.y, 'SHED', '#fca5a5'); } });
        db.brain = a => seek(a, a.x + (gapX - a.x) * 0.3, L0 - 0.5, 0.6);
      }
      for (const a of sideAgents(o)) if (a !== qb && a !== car && !used.has(a)) blocker(a, scripted, a.pos === 'OL' ? 0.55 : 0.25);
      for (const a of sideAgents(1 - o)) if (!used.has(a)) {
        a.brain = b => {
          if (pt() < 0.5) return seek(b, b.x + (gapX - b.x) * 0.15, b.y - (b.pos === 'DL' ? 0.6 : -0.3), 0.6);
          chase(b, S.carrier || car, scripted.has(b) ? 1.5 : 2.3, 0.9);
        };
      }
      S.focus = () => { const p = ballPos(); return [p.x, p.y + 4]; };
      S.onTackle = () => finalePop(det);
    });
  }

  // route waypoints (absolute), inward = toward the ball
  function route(kind, sx, sy, depth, inward, L0) {
    const out = -inward, Y = v => L0 + v;
    switch (kind) {
      case 'slant': return [[sx, Y(2)], [sx + inward * 5, Y(depth)], [sx + inward * 13, Y(depth + 4)]];
      case 'flat': return [[sx + out * 1.5, Y(1)], [sx + out * 6, Y(Math.max(1, depth))], [sx + out * 12, Y(depth + 1)]];
      case 'out': return [[sx, Y(depth)], [sx + out * 6, Y(depth)], [sx + out * 12, Y(depth - 0.5)]];
      case 'stick': return [[sx, Y(depth)], [sx + inward * 1, Y(depth - 0.6)]];
      case 'cross': return [[sx + inward * 2, Y(depth * 0.5)], [sx + inward * 10, Y(depth)], [sx + inward * 26, Y(depth + 1)]];
      case 'dig': return [[sx, Y(depth)], [sx + inward * 6, Y(depth)], [sx + inward * 18, Y(depth)]];
      case 'seam': return [[sx + inward * 1, Y(depth)], [sx + inward * 1.5, Y(depth + 18)]];
      case 'post': return [[sx, Y(depth - 6)], [sx + inward * 5, Y(depth)], [sx + inward * 12, Y(depth + 14)]];
      case 'corner': return [[sx, Y(depth - 6)], [sx + out * 5, Y(depth)], [sx + out * 11, Y(depth + 12)]];
      case 'go': return [[sx + out * 0.5, Y(depth)], [sx + out * 1, Y(depth + 22)]];
      case 'screen': return [[sx - 4.5, Y(-3.5)], [sx - 5, Y(-3)]];
      default: return [[sx, Y(depth)]];
    }
  }
  function pathBrain(pts) {
    let i = 0;
    return a => {
      while (i < pts.length - 1 && hyp(pts[i][0] - a.x, pts[i][1] - a.y) < 1.1) i++;
      const [x, y] = pts[i];
      if (i === pts.length - 1 && hyp(x - a.x, y - a.y) < 1.1) { a.faceT = -Math.PI / 2; return stop(a); }
      seek(a, clampX(x), y, 1, 0.25);
    };
  }

  function passPlay(det) {
    presnap(det, () => {
      const L0 = det.los, o = det.o, A = k => S.ag[k];
      const qb = A('oQB'), c = A('oC');
      S.dirUp = 1;
      throwBall(c, [qb.x, qb.y], 0.22, 0.25, () => holdBall(qb), 0.4, 1.1);
      const sackY = det.outcome === 'sack' ? L0 + det.yards : null;
      const dropY = sackY != null ? Math.min(L0 - 5.5, sackY) : det.call === 'quick' || det.call === 'screen' ? L0 - 6 : L0 - 7.6;
      const throwT = det.throwT != null ? T(det.throwT) + 0.15 : null;
      const sackT = det.sackT != null ? T(det.sackT) : null;
      qb.brainLock = true;
      qb.brain = a => {
        if (det.call === 'pa' && pt() < 0.55) return seek(a, CX - 0.9, L0 - 5, 0.8, 0.5);
        seek(a, CX, dropY, 0.85, 1.2);
        a.faceT = Math.PI / 2;
      };
      if (det.call === 'pa') { const rb = A('oRB'); rb.brainLock = true; rb.brain = a => (pt() < 0.7 ? seek(a, CX - 0.3, L0 - 4.4, 0.8, 0.4) : seek(a, CX + 2, L0 - 3, 0.6)); }
      // pass rush vs protection
      const assigned = new Set();
      for (const r of det.rush) {
        const ra = A('d' + r.r), ba = r.b ? A('o' + r.b) : null;
        if (!ra) continue;
        ra.brainLock = true;
        const isSacker = det.outcome === 'sack' && det.sacker === r.r;
        ra.brain = a => {
          if (S.carrier !== qb) return chase(a, S.carrier || { x: S.ball.tx ?? qb.x, y: S.ball.ty ?? qb.y }, 2.5, 0.7);
          if (isSacker && pt() >= sackT - 0.35) return chase(a, qb, 0, 1);
          return chase(a, qb, isSacker ? 1.2 : 1.6, 1);
        };
        if (ba) {
          assigned.add(ba);
          ba.blockT = ra;
          const setX = ba.mark[0] * 1.05 - CX * 0.05;
          ba.brain = a => {
            if (a.pos === 'OL' && pt() < 0.35) return seek(a, setX, L0 - 1.8, 0.8, 0.4);
            seek(a, ra.x * 0.5 + qb.x * 0.5, Math.min(ra.y - 0.5, L0 - 1.5), 0.9, 0.3);
          };
          const shedAt = r.win && r.t < 9 ? Math.max(0.5, T(r.t) - 0.95) : null;
          ba.blockOn = (a, d) => engage(a, d, {
            win: r.win && r.t < 3.6 ? false : null, dir: [0, -1], rate: r.win ? 0.9 : 0.35,
            shed: shedAt != null ? S.snapT + shedAt : (throwT != null ? S.snapT + throwT + U.rand(0.3, 0.8) : null),
            onShed: e => { if (shedAt != null && (r.r === det.presser || r.r === det.sacker) && r.t < 3.6) pop(e.d.x, e.d.y, r.b ? `BEAT ${r.b}` : 'FREE', '#fca5a5'); },
          });
        }
      }
      // routes & coverage
      const runners = [];
      for (const r of det.routes) {
        const a = A('o' + r.slot);
        if (!a) continue;
        const inward = a.x < CX ? 1 : -1;
        a.brainLock = true;
        a.brain = pathBrain(route(r.kind, a.x, a.y, r.depth, inward, L0));
        runners.push(a);
        const d = r.def ? A('d' + r.def) : null;
        if (!d) continue;
        d.brainLock = true;
        const cush0 = Math.max(1, d.y - a.y);
        const lag = U.clamp(0.45 + Math.tanh(r.sep / 6) * 1.25, -0.6, 1.8), lev = a.x < CX ? 0.55 : -0.55;
        d.vmax = Math.max(d.vmax, a.vmax * (1.03 - U.clamp(r.sep, -6, 8) * 0.006)); d.acc = Math.max(d.acc, a.acc * 0.97);
        const zone = det.dcall === 'cover';
        const zoneSpot = [d.x * 0.85 + CX * 0.15, L0 + (d.pos === 'CB' || d.key === 'dS2' ? 13 : 7.5)];
        d.brain = b => {
          if (zone && pt() < 0.7 && hyp(a.x - zoneSpot[0], a.y - zoneSpot[1]) > 6) return seek(b, zoneSpot[0], zoneSpot[1], 0.9, 1);
          // backpedal over the top early, close the cushion as the route develops, then
          // run in phase with the receiver — trailing only by the ratings-based margin
          const sp = hyp(a.vx, a.vy) || 1, t = pt();
          const cush = Math.max(0, cush0 - t * 5.5);
          const k = U.clamp((t - 0.35) / 0.9, 0, 1);
          const px = a.x + a.vx * 0.22, py = a.y + a.vy * 0.22;
          seek(b, px - a.vx / sp * lag * k + lev, py + cush - (a.vy / sp) * lag * k, 1, 0.25);
        };
      }
      for (const a of sideAgents(o)) if (!a.brainLock && !assigned.has(a)) {
        if (a.pos === 'OL') { const m = a.mark; a.brain = b => { seek(b, m[0], L0 - 1.9, 0.6, 0.5); b.faceT = Math.PI / 2; }; }
        else a.brain = b => seek(b, CX + (b.x < CX ? -2 : 2), L0 - 3.5, 0.7);
      }
      for (const a of sideAgents(1 - o)) if (!a.brainLock) {
        const spot = [a.x * 0.8 + CX * 0.2, L0 + (a.pos === 'S' ? 14 : a.pos === 'CB' ? 11 : 7)];
        a.brain = b => (S.ball.mode === 'air' ? seek(b, S.ball.tx, S.ball.ty, 0.95, 0.5) : S.carrier && S.carrier !== qb ? chase(b, S.carrier, 2.2) : seek(b, spot[0], spot[1], 0.8, 1));
      }
      S.focus = () => { const p = ballPos(); return S.ball.mode === 'air' ? [p.x, p.y + 2] : S.carrier === qb ? [CX, L0 + 6] : [p.x, p.y + 4]; };
      S.onTackle = () => finalePop(det);

      // ── the outcome the engine decided ──
      const tgt = det.target ? A('o' + det.target) : null;
      const tr = det.target ? det.routes.find(x => x.slot === det.target) : null;
      if (det.outcome === 'sack') {
        const sk = A('d' + det.sacker) || A('dDE1');
        S.tk = { queue: [{ a: sk, at: -999, win: false }], gate: () => pt() >= sackT - 0.35 };
        S.onTackle = () => pop(qb.x, qb.y, 'SACK!', '#fca5a5', { big: true });
        at(S.snapT + sackT + 1.3, () => { if (!S.dead) { if (sk.eng) release(sk.eng); sk.x = qb.x + 0.4; sk.y = qb.y + 0.5; tackle(qb, sk); } });
      } else if (det.outcome === 'scramble') {
        at(S.snapT + T(det.escapeT ?? 2.2), () => {
          pop(qb.x, qb.y, 'SCRAMBLE', '#facc15');
          const side = qb.x < CX ? -1 : 1, endY = det.td ? 104 : L0 + det.yards;
          qb.brain = a => {
            seek(a, clampX(CX + side * 9), endY + 1, 1, 0.4); avoid(a);
            if (det.td && a.y > 100.5) touchdownFx(a);
            else if (!det.td && a.y >= endY - 0.2 && !S.dead) { a.pose = 'kneel'; dead(() => pop(a.x, a.y, 'SLIDES', '#cbd5e1')); }
          };
          for (const d of sideAgents(1 - o)) { if (d.eng) release(d.eng); d.brain = b => chase(b, qb, 2.0); }
        });
      } else if (det.outcome === 'throwaway') {
        at(S.snapT + T(det.throwT || 2.5), () => {
          pop(qb.x, qb.y, 'THROWN AWAY', '#cbd5e1');
          throwBall(qb, [-3, qb.y + 12], 0.9, 3, () => dead());
        });
      } else if (tgt) {
        at(S.snapT + throwT, () => {
          if (S.carrier !== qb || S.dead) return;
          const dist0 = d2(qb, tgt);
          const flight = U.clamp(dist0 / 21 + 0.18, 0.35, 1.7);
          let cx = clampX(tgt.x + tgt.vx * flight * 0.8), cy = tgt.y + tgt.vy * flight * 0.8;
          if (tr.kind !== 'screen') {
            const minY = L0 + Math.max(0.5, tr.depth - 1);
            const maxY = det.outcome === 'complete' ? L0 + det.yards - 0.4 : 130;
            cy = U.clamp(cy, minY, Math.max(minY, maxY));
          }
          const peak = 0.8 + Math.min(5.5, dist0 * 0.11);
          if (det.pressured) pop(qb.x, qb.y, 'PRESSURE', '#fca5a5');
          pop(cx, cy, tr.sep >= 0 ? `OPEN +${tr.sep.toFixed(1)}` : `TIGHT ${tr.sep.toFixed(1)}`, tr.sep >= 1.5 ? '#86efac' : '#fcd34d');
          tgt.brain = a => seek(a, cx, cy, 1, 0.4);
          const covD = tr.def ? A('d' + tr.def) : null;
          if (det.outcome === 'complete') {
            if (covD) covD.brain = a => chase(a, S.ball.mode === 'air' ? { x: cx, y: cy } : tgt, 1.1);
            throwBall(qb, [cx, cy], flight, peak, () => {
              holdBall(tgt);
              burst(cx, cy, 'rgba(255,255,255,.6)', 5, 1.5);
              for (const r2 of runners) if (r2 !== tgt) blocker(r2, null, 0.3);
              const attempts = (det.attempts || []).filter(x => x.win).map(x => ({ a: A('d' + x.d), at: L0 + x.at, win: true }));
              runPlan(tgt, { attempts, tackler: det.tackler ? A('d' + det.tackler) : null, endY: det.td ? 104 : L0 + det.yards, endX: clampX(cx + U.rand(-4, 4) + (cx < CX ? -2 : 2)), td: det.td, goal: 100, dir: 1 });
            });
          } else if (det.outcome === 'incomplete') {
            const miss = [cx + U.rand(-1.3, 1.3), cy + U.rand(0.6, 1.8)];
            if (covD) covD.brain = a => seek(a, miss[0], miss[1] - 0.3, 1, 0.3);
            throwBall(qb, miss, flight, peak, () => {
              const b = S.ball;
              if (det.pbu && covD) { b.vx = U.rand(-4, 4); b.vy = U.rand(-2, 2); b.vz = 5; pop(miss[0], miss[1], 'BROKEN UP', '#fca5a5'); burst(miss[0], miss[1], 'rgba(252,165,165,.9)', 10); }
              else pop(miss[0], miss[1], 'INCOMPLETE', '#cbd5e1');
              at(S.t + 0.9, () => dead());
            }, 2.0, 1.2);
          } else if (det.outcome === 'int') {
            const pk = A('d' + det.picker) || covD;
            const ip = [cx + (pk.x - cx) * 0.25, cy + 0.7];
            pk.brain = a => seek(a, ip[0], ip[1], 1, 0.3);
            throwBall(qb, ip, flight, peak, () => {
              holdBall(pk);
              pop(ip[0], ip[1], 'INTERCEPTED!', '#fca5a5', { big: true });
              shake = 0.8; burst(ip[0], ip[1], 'rgba(252,165,165,.9)', 16);
              S.dirUp = -1;
              for (const d of sideAgents(1 - o)) if (d !== pk) blocker(d, null, 0.3);
              if (det.touchback) { pk.pose = 'kneel'; pk.brain = a => stop(a); at(S.t + 0.8, () => dead(() => pop(pk.x, pk.y, 'TOUCHBACK', '#cbd5e1'))); return; }
              const endY = det.pick6 ? -4 : L0 + (det.intEnd ?? det.yards);
              runPlan(pk, { attempts: [], tackler: det.pick6 ? null : tgt, endY, endX: clampX(pk.x + U.rand(-6, 6)), td: !!det.pick6, goal: 0, dir: -1 });
            });
          }
        });
      }
    });
  }
  function kneelPlay(det) {
    presnap(det, () => {
      const qb = S.ag.oQB;
      throwBall(S.ag.oC, [qb.x, qb.y], 0.22, 0.2, () => { holdBall(qb); qb.pose = 'kneel'; pop(qb.x, qb.y, 'VICTORY FORMATION', '#cbd5e1'); at(S.t + 1.0, () => dead()); }, 0.4, 1.1);
      for (const a of S.list) if (a !== qb) a.brain = b => seek(b, b.x, b.y + (b.side === S.o ? 0.3 : -0.3), 0.3);
      S.focus = () => [CX, S.los + 3];
    });
  }

  // ── special teams ──
  function squad(side, n = 11) {
    const ids = [];
    for (const pos of ['WR', 'CB', 'S', 'LB', 'RB', 'TE', 'DL', 'OL']) for (const id of gs.lu[side][pos]) if (ids.length < n && !ids.includes(id)) ids.push(id);
    return ids.map(id => G.players[id]);
  }
  const who = (side, pos) => { const id = gs.lu[side][pos][0]; return id != null ? G.players[id] : null; };
  // Kickoff: camera behind the kicking team, who kick "up" the field.
  function kickoffFormation() {
    const k = gs.kicker, r = 1 - k;
    newScene(k, 35, null, 'kickoff');
    squad(k, 10).forEach((p, i) => { const x = 4 + i * 5 + (i >= 5 ? 1.33 : 0); add('k' + i, k, p, x, 34, Math.PI / 2); });
    add('kK', k, who(k, 'K'), CX - 1.5, 27, Math.PI / 2);
    const spots = [[CX - 12, 48], [CX - 6, 47], [CX, 47], [CX + 6, 47], [CX + 12, 48], [CX - 9, 64], [CX - 3, 64], [CX + 3, 64], [CX + 9, 64], [CX, 82], [CX + 2, 97]];
    squad(r, 11).forEach((p, i) => add('r' + i, r, p, spots[i][0], spots[i][1], -Math.PI / 2));
    S.ball = { mode: 'spot', x: CX, y: 35, z: 0.25 };
    for (const a of S.list) a.brain = b => { seek(b, b.mark[0], b.mark[1], 0.5, 1); b.faceT = b.side === k ? Math.PI / 2 : -Math.PI / 2; };
    S.focus = () => [CX, 40];
    S.readyFn = () => { if (!S.ready && ((S.t > 0.6 && allSet()) || S.t > 3)) S.ready = true; };
    cam.y = 40; cam.x = CX;
  }
  function kickoffPlay(det) {
    if (!S || S.kind !== 'kickoff') kickoffFormation();
    S.kind = 'play'; S.ready = false; S.readyFn = null;
    const k = det.kickSide, r = det.o;
    const kicker = S.ag.kK;
    const land = 100 - det.land, landX = clampX(CX + U.rand(-8, 8));
    const endK = 100 - (det.end ?? 25);
    const recv = sideAgents(r), ret = recv[recv.length - 1];
    if (det.returner != null) { const p = P(det.returner); if (p) { ret.pid = p.id; ret.num = p.num; } }
    const cover = sideAgents(k).filter(a => a !== kicker);
    S.dirUp = -1;
    S.snapT = S.t;
    kicker.brain = a => (pt() < 1.0 ? seek(a, CX - 0.2, 34.6, 0.75, 0.3) : seek(a, CX, 55, 0.6));
    for (const a of cover) a.brain = b => (pt() < 0.3 ? stop(b) : seek(b, b.x * 0.75 + landX * 0.25, Math.min(land, 100) - 7, 1, 2.5));
    for (const a of recv) if (a !== ret) a.brain = b => (pt() < 1.1 ? stop(b) : seek(b, b.mark[0] * 0.7 + landX * 0.3, Math.max(b.mark[1], land - 20), 0.7));
    ret.brain = a => seek(a, landX, Math.min(land, 108), 0.85, 1);
    S.focus = () => { const p = ballPos(); if (S.ball.mode !== 'air') return [p.x, Math.min(p.y + 3, 106)]; const cy = U.avg(cover.map(c => c.y)); return [p.x * 0.5 + CX * 0.5, Math.min(p.y, land - 12, cy + 13) + 3]; };
    at(S.t + 1.0, () => {
      burst(CX, 35, 'rgba(255,255,255,.8)', 8);
      throwBall({ x: CX, y: 35 }, [landX, land], 3.9, 24, () => {
        holdBall(ret);
        if (det.touchback) {
          ret.pose = 'kneel'; ret.brain = a => stop(a);
          pop(ret.x, ret.y, 'TOUCHBACK', '#cbd5e1');
          for (const c of cover) c.brain = x => seek(x, x.x, Math.min(x.y + 4, 80), 0.4);
          at(S.t + 1.0, () => dead());
          return;
        }
        // return blocks: each blocker takes a coverage man; one is left free to make the tackle
        const free = cover.slice().sort((a, b) => Math.abs(a.x - landX) - Math.abs(b.x - landX))[1] || cover[0];
        const targets = cover.filter(c => c !== free).sort((a, b) => a.x - b.x);
        recv.filter(a => a !== ret).sort((a, b) => a.x - b.x).forEach((b, i) => {
          const t = targets[i % targets.length];
          b.blockT = t; b.brainLock = true;
          b.brain = x => seek(x, t.x * 0.75 + ret.x * 0.25, t.y * 0.75 + ret.y * 0.25, 1, 0.3);
          b.blockOn = (x, d) => engage(x, d, { dir: [Math.sign(d.x - ret.x) * 0.5, 0.3], rate: 0.5, shed: S.t + U.rand(1.6, 3.5) });
        });
        for (const c of cover) c.brain = x => chase(x, ret, c === free ? 0 : 1.2);
        S.onTackle = () => pop(ret.x, ret.y, `${Math.max(0, Math.round(land - endK))} YD RETURN`, '#ffffff');
        runPlan(ret, { attempts: [], tackler: det.end >= 100 ? null : free, endY: det.end >= 100 ? -4 : endK, endX: clampX(landX + U.rand(-10, 10)), td: det.end >= 100, goal: 0, dir: -1 });
      }, 0.3, 1.6);
    });
  }
  function puntPlay(det) {
    startCut(() => {
      const o = det.o, d = 1 - o, L0 = det.los;
      newScene(o, L0, null, 'play');
      const cov = squad(o, 10), kp = P(det.kicker) || who(o, 'K');
      [-6, -4, -2, 0, 2, 4, 6].forEach((x, i) => add('l' + i, o, cov[i], CX + x * 0.85, L0 - 0.8, Math.PI / 2));
      add('g0', o, cov[7], 4, L0 - 0.8, Math.PI / 2); add('g1', o, cov[8], FW - 4, L0 - 0.8, Math.PI / 2);
      add('pp', o, cov[9], CX + 1, L0 - 6, Math.PI / 2);
      const punter = add('pk', o, kp, CX, L0 - 14, Math.PI / 2);
      const rec = squad(d, 11);
      for (let i = 0; i < 6; i++) add('x' + i, d, rec[i], CX + (i - 2.5) * 1.9, L0 + 1.2, -Math.PI / 2);
      add('j0', d, rec[6], 4, L0 + 1.4, -Math.PI / 2); add('j1', d, rec[7], FW - 4, L0 + 1.4, -Math.PI / 2);
      add('x6', d, rec[8], CX - 6, L0 + 18, -Math.PI / 2);
      const landX = clampX(CX + U.rand(-7, 7)), land = Math.min(det.land, 106);
      const ret = add('ret', d, P(det.returner) || rec[9], landX, Math.min(land + 3, 108), -Math.PI / 2);
      S.ball = { mode: 'spot', x: CX, y: L0, z: 0.2 };
      cam.y = L0 + 6; cam.x = CX;
      for (const a of S.list) a.brain = b => stop(b);
      S.focus = () => { const p = ballPos(); if (S.ball.mode !== 'air') return [p.x, p.y + 6]; const cy = U.avg(S.list.filter(a => a.side === o && a.key !== 'pk').map(a => a.y)); return [p.x * 0.5 + CX * 0.5, Math.min(p.y, land - 12, cy + 14) + 4]; };
      at(0.8, () => {
        S.snapT = S.t; S.dirUp = 1;
        throwBall({ x: CX, y: L0 - 0.8 }, [punter.x, punter.y], 0.5, 0.6, () => holdBall(punter), 0.4, 1.1);
        const line = S.list.filter(a => a.key[0] === 'l'), rush = S.list.filter(a => a.key[0] === 'x' && a.key !== 'x6');
        line.forEach((b, i) => { const t = rush[i % rush.length]; b.blockT = t; b.brain = x => seek(x, t.x, t.y - 0.5, 0.8, 0.3); b.blockOn = (x, y) => engage(x, y, { dir: [0, -0.5], rate: 0.4, shed: S.snapT + 1.7 + Math.random() * 0.3 }); });
        for (const r of rush) r.brain = x => seek(x, CX, L0 - 12, 0.9);
        for (const [j, g] of [[S.ag.j0, S.ag.g0], [S.ag.j1, S.ag.g1]]) {
          j.blockT = g; j.brain = x => seek(x, g.x, g.y + 0.3, 1, 0.3);
          j.blockOn = (x, y) => engage(x, y, { dir: [0, 0.6], rate: 0.6, shed: S.snapT + U.rand(0.6, 1.1) });
          g.brain = x => seek(x, x.x * 0.8 + landX * 0.2, land - 6, 1);
        }
        S.ag.pp.brain = x => seek(x, CX, L0 - 8, 0.5);
        ret.brain = x => seek(x, landX, land, 0.8, 1);
      });
      at(1.55, () => {
        pop(punter.x, punter.y, 'PUNT', '#ffffff', { life: 0.6 });
        for (const l of S.list.filter(a => a.key[0] === 'l')) if (!l.eng) l.brain = x => seek(x, x.x * 0.8 + landX * 0.2, land - 8, 0.95);
        throwBall({ x: punter.x, y: punter.y }, [landX, land], 3.6, 19, () => {
          const coverTeam = S.list.filter(a => a.side === o && a !== punter);
          if (det.touchback) { const b = S.ball; b.vx = 0; b.vy = 4; b.vz = 3; pop(landX, land, 'TOUCHBACK', '#cbd5e1'); at(S.t + 1.0, () => dead()); return; }
          holdBall(ret);
          if (det.fair) { pop(ret.x, ret.y, 'FAIR CATCH', '#cbd5e1'); ret.brain = a => stop(a); for (const c of coverTeam) c.brain = x => chase(x, ret, 1.4, 0.6); at(S.t + 0.9, () => dead()); return; }
          const gunner = [S.ag.g0, S.ag.g1].sort((a, b) => d2(a, ret) - d2(b, ret))[0];
          for (const c of coverTeam) c.brain = x => chase(x, ret, c === gunner ? 0 : 1.4);
          for (const b of S.list.filter(a => a.side === d && a !== ret)) blocker(b, new Set([gunner]), 0.4);
          S.dirUp = -1;
          runPlan(ret, { attempts: [], tackler: det.td ? null : gunner, endY: det.td ? -4 : det.end, endX: clampX(landX + U.rand(-8, 8)), td: !!det.td, goal: 0, dir: -1 });
        }, 1.5, 1.6);
      });
    });
  }
  function fgPlay(det) {
    startCut(() => {
      const o = det.o, d = 1 - o, L0 = det.los;
      newScene(o, L0, null, 'play');
      squad(o, 9).forEach((p, i) => add('l' + i, o, p, CX + (i - 4) * 1.55, L0 - 0.8, Math.PI / 2));
      const holder = add('h', o, who(o, 'QB'), CX, L0 - 7, Math.PI);
      holder.pose = 'kneel';
      const k = add('kk', o, P(det.kicker) || who(o, 'K'), CX - 1.6, L0 - 9.6, Math.PI / 2);
      squad(d, 11).forEach((p, i) => add('r' + i, d, p, CX + (i - 5) * 1.5, L0 + 1.2, -Math.PI / 2));
      S.ball = { mode: 'spot', x: CX, y: L0, z: 0.2 };
      for (const a of S.list) a.brain = b => stop(b);
      cam.y = L0 + 2; cam.x = CX;
      S.focus = () => { const p = ballPos(); return [CX, Math.min(p.y + 5, 112)]; };
      at(0.8, () => {
        S.snapT = S.t;
        throwBall({ x: CX, y: L0 - 0.8 }, [CX, L0 - 6.8], 0.4, 0.3, () => { S.ball = { mode: 'spot', x: CX, y: L0 - 6.8, z: 0.3 }; }, 0.4, 0.3);
        const ln = S.list.filter(a => a.key[0] === 'l'), rs = S.list.filter(a => a.key[0] === 'r');
        rs.forEach(r => { r.brain = x => seek(x, CX, L0 - 6, 0.9); });
        ln.forEach((b, i) => { const t = rs[Math.min(rs.length - 1, i + 1)]; b.blockT = t; b.brain = x => seek(x, t.x, t.y - 0.4, 0.8, 0.3); b.blockOn = (x, y) => engage(x, y, { dir: [0, -0.3], rate: 0.3 }); });
        k.brain = x => (pt() < 0.5 ? stop(x) : seek(x, CX - 0.2, L0 - 7.5, 0.8, 0.2));
      });
      at(1.75, () => {
        const off = det.good ? 0 : det.miss === 'wide left' ? -5.5 : det.miss === 'wide right' ? 5.5 : 0;
        const endY = det.good || det.miss !== 'short' ? 113 : 107;
        throwBall({ x: CX, y: L0 - 6.8 }, [CX + off, endY], 1.7, det.good || det.miss !== 'short' ? 9.5 : 6, () => {
          pop(CX, 110, det.good ? "IT'S GOOD!" : 'NO GOOD', det.good ? '#86efac' : '#fca5a5', { big: true });
          if (det.good) burst(CX, 110, 'rgba(250,204,21,.9)', 22, 6);
          at(S.t + 0.5, () => dead());
        }, 0.3, 4);
        k.brain = x => seek(x, CX, L0 - 4, 0.4);
      });
    });
  }

  // ── public: act out an engine play record ──
  function play(det, onDone) {
    if (!det) { if (onDone) onDone(); return; }
    const attach = () => {
      if (!S) return onDone && onDone();
      S.onDone = onDone;
      const sc = S;
      S.watchdog = setTimeout(() => { if (S === sc && S.onDone) { const cb = S.onDone; S.onDone = null; cb(); } }, 40000 / Math.max(1, speed));
    };
    try {
      if (det.type === 'run') runPlay(det);
      else if (det.type === 'pass') passPlay(det);
      else if (det.type === 'kickoff') kickoffPlay(det);
      else if (det.type === 'punt') puntPlay(det);
      else if (det.type === 'fg') fgPlay(det);
      else if (det.type === 'kneel') kneelPlay(det);
      else { if (onDone) onDone(); return; }
    } catch (e) { console.error('Live play failed', e); if (onDone) onDone(); return; }
    if (cut && !cut.mid) { const fn = cut.fn; cut.fn = () => { fn(); attach(); }; } else attach();
  }

  // ════════════ CAMERA & RENDERING (top-down) ════════════
  // Offense always attacks up the screen; players are team-coloured bubbles.
  const VIEW_W = 36;
  let sc = 10;
  const SX = x => (x - cam.x) * sc + W / 2;
  const SY = y => H * 0.58 - (y - cam.y) * sc;
  function updateCamera(dt) {
    if (!S) return;
    const f = S.focus ? S.focus() : [CX, (S.los ?? 30) + 4];
    if (!isFinite(f[0]) || !isFinite(f[1])) { if (!S._nanWarned) { S._nanWarned = true; console.warn("camera focus NaN", S.kind, JSON.stringify({ ball: S.ball.mode, los: S.los, bx: S.ball.x, by: S.ball.y, tx: S.ball.tx, holder: S.ball.holder && S.ball.holder.key })); } return; }
    const k = 1 - Math.exp(-dt * 2.8);
    const half = (W / sc) / 2;
    cam.x += (U.clamp(f[0], Math.min(CX, half - 1.5), Math.max(CX, FW - half + 1.5)) - cam.x) * k;
    cam.y += (f[1] - 2 - cam.y) * k;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0.04) ctx.translate((Math.random() - 0.5) * shake * 6, (Math.random() - 0.5) * shake * 6);
    drawField();
    if (S) {
      // block links under the bubbles
      ctx.lineCap = 'round';
      for (const e of S.engs) {
        if (e.done) continue;
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(2, sc * 0.22);
        ctx.beginPath(); ctx.moveTo(SX(e.a.x), SY(e.a.y)); ctx.lineTo(SX(e.d.x), SY(e.d.y)); ctx.stroke();
      }
      const c = S.carrier && S.ball.mode === 'held' ? S.carrier : null;
      if (c && c.trail) {
        for (let i = 0; i < c.trail.length; i++) {
          const u = i / c.trail.length;
          ctx.fillStyle = 'rgba(250,204,21,' + (0.06 + u * 0.22) + ')';
          ctx.beginPath(); ctx.arc(SX(c.trail[i][0]), SY(c.trail[i][1]), Math.max(1, sc * 0.35 * u), 0, Math.PI * 2); ctx.fill();
        }
      }
      for (const a of S.list) if (a.down > 0) drawPlayer(a);
      for (const a of S.list) if (!(a.down > 0)) drawPlayer(a);
      drawBall(ballPos());
    }
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.c;
      const sz = Math.max(1.5, p.s * 0.5);
      ctx.fillRect(SX(p.x) - sz / 2, SY(p.y) - p.z * sc * 0.35 - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    if (wx) skyWeather();
    for (const p of pops) drawPop(p);
    ctx.restore();
    if (flash) drawFlash();
    if (cut) {
      const a = cut.age < 0.22 ? cut.age / 0.22 : Math.max(0, 1 - (cut.age - 0.22) / 0.38);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(5,8,14,' + a + ')'; ctx.fillRect(0, 0, W, H);
    }
  }
  function hline(y, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(SX(0), SY(y)); ctx.lineTo(SX(FW), SY(y)); ctx.stroke(); }
  // ── field & weather rendering ──
  let wx = null, turf = null, turfDark = null, decals = null, wxp = null;
  function initVisuals() {
    wx = gs.wx || { type: 'clear', temp: 65, wind: 0, dir: 0, time: 'day' };
    turf = makeTurf('#2b8a4b', '#226f3c', '#35a058');
    // deterministic per-game decals: worn turf, puddles, snow drifts
    const rnd = (() => { let s = (gs.t[0] * 131 + gs.t[1] * 17 + 7) % 2147483647; return () => (s = s * 16807 % 2147483647) / 2147483647; })();
    decals = { wear: [], puddles: [], drifts: [] };
    for (let i = 0; i < 26; i++) decals.wear.push({ x: CX + (rnd() - 0.5) * 16, y: 8 + rnd() * 84, rx: 1.2 + rnd() * 2.6, ry: 0.6 + rnd() * 1.4, a: rnd() * Math.PI });
    for (let i = 0; i < 22; i++) decals.puddles.push({ x: 3 + rnd() * (FW - 6), y: 3 + rnd() * 94, rx: 1.2 + rnd() * 3.2, ry: 0.5 + rnd() * 1.2, a: (rnd() - 0.5) * 0.6 });
    for (let i = 0; i < 40; i++) decals.drifts.push({ x: rnd() * FW, y: -8 + rnd() * 116, rx: 2 + rnd() * 6, ry: 1 + rnd() * 3, a: rnd() * Math.PI });
    wxp = { drops: [], flakes: [], streaks: [], leaves: [], splashes: [], tracks: [], fog: [], bolt: 0, boltT: U.rand(4, 9), trackT: 0 };
    const n = { rain: 150, storm: 280 }[wx.type] || 0;
    for (let i = 0; i < n; i++) wxp.drops.push({ x: Math.random(), y: Math.random(), l: U.rand(10, 22), v: U.rand(0.9, 1.4) });
    if (wx.type === 'snow') for (let i = 0; i < 170; i++) wxp.flakes.push({ x: Math.random(), y: Math.random(), r: U.rand(0.8, 2.6), v: U.rand(0.05, 0.13), ph: Math.random() * 6 });
    if (wx.type === 'wind' || wx.wind >= 14) for (let i = 0; i < 34; i++) wxp.streaks.push({ x: Math.random(), y: Math.random(), l: U.rand(30, 80), v: U.rand(0.5, 1.1) });
    if (wx.type === 'wind') for (let i = 0; i < 14; i++) wxp.leaves.push({ x: Math.random(), y: Math.random(), r: U.rand(0, 6), s: U.rand(2, 4), c: U.pick(['#b45309', '#d97706', '#a16207', '#92400e']) });
    if (wx.type === 'fog') for (let i = 0; i < 9; i++) wxp.fog.push({ x: Math.random(), y: Math.random(), r: U.rand(0.25, 0.55), v: U.rand(0.008, 0.02) });
  }
  function makeTurf(base, dark, light) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 1300; i++) {
      g.strokeStyle = Math.random() < 0.5 ? dark : light;
      g.globalAlpha = U.rand(0.12, 0.38);
      g.lineWidth = U.rand(0.6, 1.2);
      const x = Math.random() * 96, y = Math.random() * 96, l = U.rand(1.5, 3.5), a = -Math.PI / 2 + U.rand(-0.5, 0.5);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.globalAlpha = 1;
    return ctx.createPattern(c, 'repeat');
  }
  // wind as a screen-space unit vector in the current camera frame
  function windVec() {
    const th = wx.dir + ((S ? S.o : gs.poss) === 1 ? Math.PI : 0);
    return [Math.cos(th), -Math.sin(th)];
  }
  function updateWeather(dt) {
    if (!wxp) return;
    const [wxs, wys] = windVec(), wk = wx.wind / 20;
    for (const d of wxp.drops) { d.y += d.v * dt * 1.6; d.x += wxs * wk * dt * 0.5; if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); } if (d.x < -0.05) d.x = 1.05; if (d.x > 1.05) d.x = -0.05; }
    for (const f of wxp.flakes) { f.ph += dt * 2; f.y += f.v * dt; f.x += (Math.sin(f.ph) * 0.02 + wxs * wk * 0.12) * dt; if (f.y > 1.03) { f.y = -0.03; f.x = Math.random(); } if (f.x < -0.03) f.x = 1.03; if (f.x > 1.03) f.x = -0.03; }
    for (const s of wxp.streaks) { s.x += wxs * s.v * dt * 0.9; s.y += wys * s.v * dt * 0.9; if (s.x < -0.2 || s.x > 1.2 || s.y < -0.2 || s.y > 1.2) { s.x = wxs > 0 ? -0.15 : 1.15; s.y = Math.random(); if (Math.abs(wys) > 0.7) { s.y = wys > 0 ? -0.15 : 1.15; s.x = Math.random(); } } }
    for (const l of wxp.leaves) { l.x += wxs * dt * 0.35; l.y += wys * dt * 0.35 + Math.sin(l.r) * dt * 0.05; l.r += dt * 6; if (l.x < -0.1 || l.x > 1.1 || l.y < -0.1 || l.y > 1.1) { l.x = wxs > 0 ? -0.05 : 1.05; l.y = Math.random(); } }
    for (const f of wxp.fog) { f.x += f.v * dt * (wxs || 1); if (f.x > 1.4) f.x = -0.4; if (f.x < -0.4) f.x = 1.4; }
    // splashes on the turf
    if (wx.type === 'rain' || wx.type === 'storm') {
      const rate = wx.type === 'storm' ? 70 : 35;
      for (let i = 0; i < rate * dt; i++) wxp.splashes.push({ x: cam.x + U.rand(-20, 20), y: cam.y + U.rand(-24, 34), age: 0 });
      for (const s of wxp.splashes) s.age += dt;
      wxp.splashes = wxp.splashes.filter(s => s.age < 0.45);
    }
    // lightning
    if (wx.type === 'storm') {
      wxp.boltT -= dt;
      if (wxp.boltT <= 0) { wxp.bolt = 1; wxp.boltT = U.rand(5, 13); wxp.double = Math.random() < 0.55; }
      if (wxp.bolt > 0) { wxp.bolt -= dt * 3.2; if (wxp.bolt < 0.35 && wxp.double) { wxp.bolt = 0.85; wxp.double = false; } }
    }
    // footprints in the snow
    if (wx.type === 'snow' && S && !paused) {
      wxp.trackT += dt * speed;
      if (wxp.trackT > 0.12) {
        wxp.trackT = 0;
        for (const a of S.list) if (hyp(a.vx, a.vy) > 1.2 && a.down <= 0) wxp.tracks.push({ x: a.x, y: a.y, o: S.o, age: 0 });
        if (wxp.tracks.length > 2600) wxp.tracks.splice(0, wxp.tracks.length - 2600);
      }
      for (const t of wxp.tracks) t.age += dt * speed;
    }
  }
  function lineAlpha() { return wx && wx.type === 'snow' ? 0.55 : 0.85; }
  function fieldRect(x0, y0, x1, y1, fill) { ctx.fillStyle = fill; ctx.fillRect(SX(x0), SY(y1), (x1 - x0) * sc, (y1 - y0) * sc); }
  function drawField() {
    const yTop = cam.y + (H * 0.58) / sc + 2, yBot = cam.y - (H * 0.42) / sc - 2;
    const so = S ? S.o : gs.poss;
    const offT = L.team(gs.t[so]), defT = L.team(gs.t[1 - so]);
    // surrounding apron
    ctx.fillStyle = '#123f25'; ctx.fillRect(0, 0, W, H);
    // turf (textured, anchored to the field so it scrolls with the camera)
    ctx.save();
    ctx.translate(SX(0), SY(0));
    ctx.fillStyle = turf;
    ctx.fillRect(-12 * sc, -(yTop + 2) * sc, (FW + 24) * sc, (yTop - yBot + 4) * sc);
    ctx.restore();
    // mowed stripes
    for (let y = Math.floor(Math.max(-10, yBot) / 5) * 5; y < Math.min(110, yTop); y += 5) {
      if (y < 0 || y >= 100) continue;
      fieldRect(0, y, FW, y + 5, (y / 5) % 2 === 0 ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.07)');
    }
    // worn turf between the hashes
    for (const w of decals.wear) {
      if (w.y < yBot - 4 || w.y > yTop + 4) continue;
      const g = ctx.createRadialGradient(SX(w.x), SY(w.y), 0, SX(w.x), SY(w.y), w.rx * sc);
      g.addColorStop(0, 'rgba(130,110,60,.10)'); g.addColorStop(1, 'rgba(130,110,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(SX(w.x), SY(w.y), w.rx * sc, w.ry * sc, w.a, 0, Math.PI * 2); ctx.fill();
    }
    // team areas on the sidelines (between the 25s)
    const bench = (x0, x1, team, side) => {
      fieldRect(x0, 25, x1, 75, U.mix(team.logo.primary, '#0f3a22', 0.55));
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      for (let y = 26; y < 75; y += 2.2) {
        const bx = (x0 + x1) / 2 + Math.sin(y * 3.1 + side) * 0.9;
        ctx.fillStyle = kit[side === 0 ? so : 1 - so].jersey;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(SX(bx), SY(y), Math.max(2.5, sc * 0.42), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    bench(-10, -4.5, offT, 0); bench(FW + 4.5, FW + 10, defT, 1);
    // coaching box lines
    ctx.setLineDash([sc * 0.6, sc * 0.6]); ctx.strokeStyle = 'rgba(250,204,21,.6)'; ctx.lineWidth = 1.5;
    for (const bx of [-4, FW + 4]) { ctx.beginPath(); ctx.moveTo(SX(bx), SY(25)); ctx.lineTo(SX(bx), SY(75)); ctx.stroke(); }
    ctx.setLineDash([]);
    // white sideline border (6 ft)
    fieldRect(-2, -10, 0, 110, 'rgba(255,255,255,.88)');
    fieldRect(FW, -10, FW + 2, 110, 'rgba(255,255,255,.88)');
    // end zones
    const ez = (y0, team) => {
      if (y0 + 10 < yBot || y0 > yTop) return;
      fieldRect(0, y0, FW, y0 + 10, team.logo.primary);
      ctx.save();
      ctx.beginPath(); ctx.rect(SX(0), SY(y0 + 10), FW * sc, 10 * sc); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = sc * 0.9;
      for (let x = -12; x < FW + 12; x += 3) { ctx.beginPath(); ctx.moveTo(SX(x), SY(y0)); ctx.lineTo(SX(x + 10), SY(y0 + 10)); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      ctx.strokeRect(SX(1), SY(y0 + 9), (FW - 2) * sc, 8 * sc);
      ctx.save();
      ctx.fillStyle = U.onColor(team.logo.primary) === '#ffffff' ? 'rgba(255,255,255,.92)' : 'rgba(10,15,23,.85)';
      ctx.strokeStyle = team.logo.secondary; ctx.lineWidth = 2;
      ctx.font = `700 ${Math.round(sc * 4.8)}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(team.mascot.toUpperCase(), SX(CX), SY(y0 + 5));
      ctx.fillText(team.mascot.toUpperCase(), SX(CX), SY(y0 + 5));
      ctx.restore();
    };
    ez(100, defT); ez(-10, offT);
    // midfield logo
    if (logoImg && logoImg.complete && 50 > yBot && 50 < yTop) {
      ctx.globalAlpha = 0.34;
      const sz = 9 * sc;
      ctx.drawImage(logoImg, SX(CX) - sz / 2, SY(50) - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
    // weather on the ground (under the paint)
    groundWeather(yBot, yTop);
    const la = lineAlpha();
    // yard lines
    for (let y = 0; y <= 100; y += 5) if (y > yBot && y < yTop) hline(y, `rgba(255,255,255,${la})`, y === 0 || y === 100 ? 3.2 : y % 10 === 0 ? 1.8 : 1.2);
    // hashes, sideline ticks, PAT marks
    ctx.strokeStyle = `rgba(255,255,255,${la * 0.8})`; ctx.lineWidth = 1.2;
    for (let y = Math.max(1, Math.ceil(yBot)); y < Math.min(100, yTop); y++) {
      if (y % 5 === 0) continue;
      for (const hx of [20, FW - 20]) { ctx.beginPath(); ctx.moveTo(SX(hx - 0.5), SY(y)); ctx.lineTo(SX(hx + 0.5), SY(y)); ctx.stroke(); }
      for (const hx of [0.5, FW - 0.5]) { ctx.beginPath(); ctx.moveTo(SX(hx - 0.4), SY(y)); ctx.lineTo(SX(hx + 0.4), SY(y)); ctx.stroke(); }
    }
    for (const py of [3, 97]) if (py > yBot && py < yTop) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SX(CX - 0.5), SY(py)); ctx.lineTo(SX(CX + 0.5), SY(py)); ctx.stroke(); }
    // numbers with direction arrows
    ctx.fillStyle = `rgba(255,255,255,${la * 0.9})`;
    ctx.font = `700 ${Math.round(sc * 2.2)}px Oswald, Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let y = 10; y <= 90; y += 10) {
      if (y < yBot || y > yTop) continue;
      const n = String(y <= 50 ? y : 100 - y);
      for (const [nx, rot] of [[11.5, -Math.PI / 2], [FW - 11.5, Math.PI / 2]]) {
        ctx.save(); ctx.translate(SX(nx), SY(y)); ctx.rotate(rot); ctx.fillText(n, 0, 0); ctx.restore();
        if (y !== 50) {
          const dir = y < 50 ? -1 : 1, ay = y + dir * 1.9, ax = nx + (nx < CX ? -0.2 : 0.2);
          ctx.beginPath();
          ctx.moveTo(SX(ax), SY(ay + dir * 0.55)); ctx.lineTo(SX(ax - 0.4), SY(ay)); ctx.lineTo(SX(ax + 0.4), SY(ay));
          ctx.closePath(); ctx.fill();
        }
      }
    }
    // pylons
    ctx.fillStyle = '#f97316';
    for (const gy of [0, 10 * 0, 100]) for (const px of [0, FW]) ctx.fillRect(SX(px) - 3, SY(gy) - 3, 6, 6);
    for (const gy of [-10, 110]) for (const px of [0, FW]) ctx.fillRect(SX(px) - 3, SY(gy) - 3, 6, 6);
    // goal posts with padding
    for (const gy of [110, -10]) {
      if (gy < yBot - 2 || gy > yTop + 2) continue;
      const post = gy > 0 ? 1.4 : -1.4;
      ctx.fillStyle = offT === defT ? '#1e293b' : (gy > 0 ? defT : offT).logo.primary;
      ctx.fillRect(SX(CX) - sc * 0.45, SY(gy + post) - sc * 0.45, sc * 0.9, sc * 0.9);
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(SX(CX - 3.08), SY(gy)); ctx.lineTo(SX(CX + 3.08), SY(gy)); ctx.stroke();
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(SX(CX), SY(gy)); ctx.lineTo(SX(CX), SY(gy + post)); ctx.stroke();
      ctx.fillStyle = '#facc15';
      for (const px of [CX - 3.08, CX + 3.08]) { ctx.beginPath(); ctx.arc(SX(px), SY(gy), 2.6, 0, Math.PI * 2); ctx.fill(); }
    }
    // line of scrimmage & line to gain
    if (S && S.los != null && S.kind !== 'kickoff') {
      hline(S.los, 'rgba(96,165,250,.95)', 3);
      if (S.ltg != null && S.ltg < 100) hline(S.ltg, 'rgba(250,204,21,.95)', 3);
    }
  }
  function groundWeather(yBot, yTop) {
    const t = wx.type;
    if (t === 'rain' || t === 'storm') {
      fieldRect(-12, yBot, FW + 12, yTop, t === 'storm' ? 'rgba(20,40,70,.26)' : 'rgba(25,45,75,.17)');
      for (const p of decals.puddles) {
        if (p.y < yBot - 4 || p.y > yTop + 4) continue;
        const g = ctx.createRadialGradient(SX(p.x), SY(p.y), 0, SX(p.x), SY(p.y), p.rx * sc);
        g.addColorStop(0, 'rgba(170,200,230,.30)'); g.addColorStop(0.7, 'rgba(120,160,200,.18)'); g.addColorStop(1, 'rgba(120,160,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(SX(p.x), SY(p.y), p.rx * sc, p.ry * sc, p.a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(210,230,255,.45)'; ctx.lineWidth = 1;
      for (const s of wxp.splashes) {
        const u = s.age / 0.45;
        ctx.globalAlpha = 1 - u;
        ctx.beginPath(); ctx.ellipse(SX(s.x), SY(s.y), 1 + u * 5, 0.6 + u * 2.6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (t === 'snow') {
      fieldRect(-12, yBot, FW + 12, yTop, 'rgba(236,241,248,.62)');
      for (const d of decals.drifts) {
        if (d.y < yBot - 8 || d.y > yTop + 8) continue;
        const g = ctx.createRadialGradient(SX(d.x), SY(d.y), 0, SX(d.x), SY(d.y), d.rx * sc);
        g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(SX(d.x), SY(d.y), d.rx * sc, d.ry * sc, d.a, 0, Math.PI * 2); ctx.fill();
      }
      // tracks churned up by the players
      const o = S ? S.o : gs.poss;
      for (const tr of wxp.tracks) {
        const x = tr.o === o ? tr.x : FW - tr.x, y = tr.o === o ? tr.y : 100 - tr.y;
        if (y < yBot || y > yTop) continue;
        ctx.fillStyle = `rgba(90,120,100,${Math.max(0.08, 0.42 - tr.age * 0.004)})`;
        ctx.beginPath(); ctx.ellipse(SX(x), SY(y), sc * 0.28, sc * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (t === 'heat') {
      fieldRect(-12, yBot, FW + 12, yTop, 'rgba(180,150,60,.08)');
    }
  }
  // lighting & airborne weather drawn over everything on the field
  function skyWeather() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const time = wx.time, t = wx.type;
    if (time === 'night') {
      ctx.fillStyle = 'rgba(8,14,40,.20)'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,4,16,.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const [lx, ly] of [[0, 0.15], [1, 0.15], [0, 0.85], [1, 0.85]]) {
        const lg = ctx.createRadialGradient(lx * W, ly * H, 0, lx * W, ly * H, W * 0.75);
        lg.addColorStop(0, 'rgba(255,250,225,.10)'); lg.addColorStop(1, 'rgba(255,250,225,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (time === 'dusk') {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, 'rgba(255,140,60,.20)'); g.addColorStop(1, 'rgba(110,60,150,.18)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (t === 'clear' || t === 'heat') {
      const g = ctx.createRadialGradient(W * 0.95, -H * 0.05, 0, W * 0.95, -H * 0.05, W * 1.1);
      g.addColorStop(0, 'rgba(255,250,220,.16)'); g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (t === 'cloudy' || t === 'rain' || t === 'storm' || t === 'snow') { ctx.fillStyle = t === 'storm' ? 'rgba(20,26,40,.24)' : 'rgba(40,50,70,.12)'; ctx.fillRect(0, 0, W, H); }
    if (t === 'heat') { ctx.fillStyle = 'rgba(255,170,70,.07)'; ctx.fillRect(0, 0, W, H); }
    const [wxs, wys] = windVec(), wk = wx.wind / 20;
    if (wxp.drops.length) {
      ctx.strokeStyle = t === 'storm' ? 'rgba(200,220,255,.42)' : 'rgba(200,220,255,.32)'; ctx.lineWidth = 1;
      const sx = wxs * wk * 0.45;
      ctx.beginPath();
      for (const d of wxp.drops) { const x = d.x * W, y = d.y * H; ctx.moveTo(x, y); ctx.lineTo(x - sx * d.l, y - d.l); }
      ctx.stroke();
    }
    if (wxp.flakes.length) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (const f of wxp.flakes) { ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (wxp.streaks.length) {
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const s of wxp.streaks) { const x = s.x * W, y = s.y * H; ctx.moveTo(x, y); ctx.lineTo(x - wxs * s.l, y - wys * s.l); }
      ctx.stroke();
    }
    for (const l of wxp.leaves) {
      ctx.save(); ctx.translate(l.x * W, l.y * H); ctx.rotate(l.r);
      ctx.fillStyle = l.c; ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (t === 'fog') {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(205,212,224,.62)'); g.addColorStop(0.45, 'rgba(205,212,224,.28)'); g.addColorStop(1, 'rgba(205,212,224,.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const f of wxp.fog) {
        const rg = ctx.createRadialGradient(f.x * W, f.y * H, 0, f.x * W, f.y * H, f.r * W);
        rg.addColorStop(0, 'rgba(225,230,238,.30)'); rg.addColorStop(1, 'rgba(225,230,238,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
    }
    if (wxp.bolt > 0) { ctx.fillStyle = `rgba(235,240,255,${Math.min(0.75, wxp.bolt * 0.75)})`; ctx.fillRect(0, 0, W, H); }
  }

  function drawPlayer(a) {
    const x = SX(a.x), y = SY(a.y);
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
    const k = kit[a.side], r = Math.max(7.5, sc * 0.72);
    const carrier = S.carrier === a && S.ball.mode === 'held';
    if (a.down > 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-a.face);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2, 2, r * 1.35, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.jersey; ctx.strokeStyle = k.stripe; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    const so2 = wx ? { day: [2.6, 3], dusk: [5.5, 2.4], night: [0.6, 1.8] }[wx.time] : [1.5, 2];
    ctx.beginPath(); ctx.arc(x + so2[0], y + so2[1], r, 0, Math.PI * 2); ctx.fill();
    if (carrier) {
      ctx.fillStyle = 'rgba(250,204,21,.28)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.85, 0, Math.PI * 2); ctx.fill();
    }
    // facing nub
    const fa = -a.face;
    ctx.fillStyle = k.stripe;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(fa) * (r + 3.5), y + Math.sin(fa) * (r + 3.5));
    ctx.lineTo(x + Math.cos(fa + 0.55) * (r - 0.5), y + Math.sin(fa + 0.55) * (r - 0.5));
    ctx.lineTo(x + Math.cos(fa - 0.55) * (r - 0.5), y + Math.sin(fa - 0.55) * (r - 0.5));
    ctx.closePath(); ctx.fill();
    // bubble
    ctx.fillStyle = k.jersey;
    ctx.strokeStyle = carrier ? '#facc15' : k.stripe;
    ctx.lineWidth = carrier ? 2.6 : 1.8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (a.num !== '' && a.num != null) {
      ctx.fillStyle = k.num;
      ctx.font = `700 ${Math.round(r * 1.05)}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.num, x, y + 0.5);
    }
    if (a.pose === 'kneel') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
  }
  function drawBall(p) {
    if (!S || S.ball.mode === 'none') return;
    const held = S.ball.mode === 'held';
    const x = SX(p.x), gy = SY(p.y);
    const lift = held ? 0 : p.z * sc * 0.35;
    const size = Math.max(3.2, sc * 0.3) * (1 + (held ? 0 : p.z * 0.035));
    if (!held && p.z > 0.4) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, gy, size * 0.9, size * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    const bx = held ? x + Math.cos(-S.ball.holder.face) * sc * 0.45 : x, by = held ? gy + Math.sin(-S.ball.holder.face) * sc * 0.45 : gy - lift;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(S.ball.mode === 'air' ? -Math.atan2(S.ball.ty - S.ball.fy, S.ball.tx - S.ball.fx) : -0.6);
    ctx.fillStyle = '#8b4513'; ctx.strokeStyle = '#2b1306'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-size * 0.4, 0); ctx.lineTo(size * 0.4, 0); ctx.stroke();
    ctx.restore();
  }
  function drawPop(p) {
    const u = p.age / p.life;
    const x = SX(p.x), y = SY(p.y) - sc * 1.6 - u * 14;
    ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : Math.min(1, u * 6);
    const fs = p.big ? 17 : 12;
    ctx.font = `700 ${fs}px Oswald, Impact, sans-serif`;
    const w = ctx.measureText(p.text).width + fs * 0.9, h = fs * 1.55;
    ctx.fillStyle = 'rgba(8,12,20,.85)';
    roundRect(x - w / 2, y - h / 2, w, h, h / 2.4); ctx.fill();
    ctx.fillStyle = p.color || '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x, y + 0.5);
    ctx.globalAlpha = 1;
  }
  function drawFlash() {
    const u = (performance.now() - flash.t0) / 1700;
    if (u >= 1) { flash = null; return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = u < 0.15 ? u / 0.15 : u > 0.75 ? (1 - u) / 0.25 : 1;
    const s2 = u < 0.15 ? 0.7 + u * 2.4 : 1.06 - Math.min(0.06, (u - 0.15) * 0.4);
    ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.scale(s2, s2);
    ctx.font = `700 ${Math.round(W * 0.12)}px Oswald, Impact, sans-serif`;
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
  function pop(x, y, text, color, opts = {}) { pops.push({ x, y, text, color, age: 0, life: opts.life || 1.4, big: opts.big }); }
  function burst(x, y, color = 'rgba(226,232,240,.9)', n = 12, up = 3) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(1, 4); parts.push({ x, y, z: 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: U.rand(1, up), age: 0, life: U.rand(0.4, 0.8), s: U.rand(3, 6), c: color }); }
  }
  function confetti(x, y, cols) {
    for (let i = 0; i < 80; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(1, 6); parts.push({ x, y, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: U.rand(5, 12), age: 0, life: U.rand(1.2, 2.2), s: U.rand(4, 7), c: U.pick(cols) }); }
  }
  function bigText(text, color = '#ffffff') { flash = { text, color, t0: performance.now() }; }

  function setSpeed(s) { speed = s; }
  function setPaused(p) { paused = p; }
  function skip() { if (S) { S.onDone = null; if (!S.dead) dead(); } }
  function debug() { return { S, cut, bodies: S ? Object.fromEntries(S.list.map(a => [a.key, a])) : {} }; }

  return { mount, unmount, resize, play, lineup, ready, setSpeed, setPaused, skip, bigText, debug };
})();
