'use strict';
// ── LIVE BROADCAST: physical player simulation ────────────────────
// Every player is a body with mass, top speed and acceleration from his
// ratings. Bodies collide, blockers physically engage defenders, rushers must
// shed blocks to get around them, and tackles happen on contact. Scrimmage
// plays and kick returns are fully free: the engine only sets up the call
// (Engine.prepare), the players' ratings and positions decide what happens,
// and the result is handed back for the play-by-play (Engine.commit).
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
  // presentation: slow-motion beats, sack hit flash, crowd excitement, space taken by the play-call panel
  let slow = 0, hit = 0, excite = 0, inset = 0, insetCur = 0, logoImgs = [];

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
    const finish = () => kit.forEach(x => { x.hnum = U.onColor(x.helmet) === '#ffffff' ? '#ffffff' : '#0b0f17'; });
    const A = U.hexToRgb(t[0].logo.primary), B = U.hexToRgb(t[1].logo.primary);
    if (hyp(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 120) {
      kit[1] = { jersey: '#f8fafc', num: t[1].logo.primary, pants: '#f1f5f9', helmet: t[1].logo.primary, stripe: t[1].logo.secondary, dark: '#94a3b8' };
    }
    finish();
  }

  // ── mount / loop ──
  function mount(canvas, game) {
    cv = canvas; ctx = cv.getContext('2d'); gs = game;
    makeKits();
    logoImg = new Image();
    logoImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Logo.svg(L.team(gs.t[0]).logo, 200).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    logoImgs = [0, 1].map(i => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Logo.svg(L.team(gs.t[i]).logo, 200).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); return im; });
    slow = 0; hit = 0; excite = 0;
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
      acc += dt * speed * (slow > 0 ? 0.3 : 1);
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
    slow = Math.max(0, slow - dt); hit = Math.max(0, hit - dt * 2.4); excite = Math.max(0, excite - dt * 0.35);
    Sfx.crowd(paused ? 0 : Math.min(1, excite + (gs && gs.rival ? 0.3 : 0)));
    insetCur += (inset - insetCur) * (1 - Math.exp(-dt * 8));
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
      hx: new Array(64), hy: new Array(64), hi: 0, R: null, tkCD: 0, blockCD: 0, readT: 0,
    };
  }
  function newScene(o, los, ltg, kind) {
    S = { o, los, ltg, kind, ag: {}, list: [], t: 0, snapT: null, ball: { mode: 'none', x: CX, y: los ?? 35, z: 0 }, carrier: null, engs: [], ev: [], dead: false, deadT: 0, ready: false, onDone: null, focus: null, dirUp: 1, free: false, fp: null, det: null, result: null };
    return S;
  }
  function add(key, side, p, x, y, face) { const a = mkAgent(key, side, p, x, y, face); S.ag[key] = a; S.list.push(a); return a; }
  const pt = () => (S.snapT == null ? -1 : S.t - S.snapT); // time since snap
  function at(t, fn) { S.ev.push({ t, fn, done: false }); }

  // steering helpers — each sets the agent's desired velocity
  function seek(a, x, y, frac = 1, arrive = 1.6) {
    const dx = x - a.x, dy = y - a.y, d = hyp(dx, dy);
    if (d < 0.04) { a.wx = 0; a.wy = 0; return d; }
    const vm = a.vmax * (a.boost ? 1.3 : 1) * (a.vk || 1);
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
    if (blk.eng || def.eng || blk.down > 0 || def.down > 0 || (blk.blockCD || 0) > S.t) return null;
    // free blocks: the rating margin (+ = blocker better) drives the pile and the odds of a shed
    const sd = o.free ? o.m : power(blk) - power(def) + U.gauss(0, 3);
    const e = { a: blk, d: def, t0: S.t, dir: o.dir || [0, 0], rate: o.rate ?? 0.3, shed: o.shed ?? null, onShed: o.onShed, pancake: o.pancake, win: o.win ?? null, sd, gap: (blk.r + def.r) * 0.92, jit: Math.random() * 6, free: !!o.free, mode: o.mode, m: o.m };
    // lopsided matchups end violently
    if (!e.free && e.win !== false && sd >= 13 && !e.pancake && e.shed == null) e.pancake = S.t + U.rand(0.7, 1.3);
    if (e.win === false && sd <= -11) e.bull = true;
    if (e.free && e.mode === 'pass' && sd <= -12) e.bull = true;
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
      if (e.free) { e.a.blockT = null; e.a.blockCD = S.t + 0.6; }
      else { e.a.blockT = null; e.a.blockOn = null; e.a.brain = x => chase(x, S.carrier || e.d, 1.5, 0.5); }
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
      if (e.free) {
        const age = S.t - e.t0, F = S.fp, c = S.carrier;
        let lam = e.mode === 'pass' ? 0.1 * Math.exp(-e.m / 13) * (1 + age * 1.2) : 0.2 * Math.exp(-e.m / 18) * (1 + age * 0.35);
        if (e.mode !== 'pass' && c && F && c.side === A.side && (c.y - D.y) * F.cdir > 1.5) lam *= 2.5; // he's past — fight off to chase
        if (e.mode === 'pass' && F && F.mode !== 'pass' && !(F.draw && F.mode === 'mesh')) lam *= 4;
        if (Math.random() < lam * DT) {
          const side = Math.sign(D.x - A.x) || (Math.random() < 0.5 ? -1 : 1);
          release(e, [side, 0.4 * (S.dirUp || 1) * -1]);
          if (e.mode === 'pass' && F && F.mode === 'pass' && D.rushing) pop(D.x, D.y, `BEAT ${A.key.slice(1)}`, '#fca5a5', { life: 0.9 });
          continue;
        }
        if (e.m > 11 && Math.random() < (e.mode === 'pass' ? 0.04 : 0.3) * DT) { D.down = 1.4; D.vx = A.vx * 1.5; D.vy = A.vy * 1.5 + (S.dirUp || 1) * 1.2; release(e); pop(D.x, D.y, 'PANCAKE', '#86efac'); continue; }
      }
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
      a.wx = 0; a.wy = 0; a.boost = false; a.vk = 1;
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
      const vmx = a.vmax * (a.boost ? 1.3 : 1) * (a.vk || 1);
      const dv = hyp(dvx, dvy), am = a.acc * (a.boost ? 1.6 : 1) * DT * (hyp(wx, wy) < hyp(a.vx, a.vy) ? 1.6 : 1);
      if (dv > am) { dvx *= am / dv; dvy *= am / dv; }
      a.vx += dvx; a.vy += dvy;
      // end-line awareness: everyone but the ball carrier pulls up before running out the back
      if (S.free && S.fp && S.fp.L0 != null && a !== S.carrier && a.y > 104 && a.vy > 0) a.vy = Math.min(a.vy, Math.sqrt(2 * 18 * Math.max(0, 109.6 - a.y)));
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
    const cr = S.carrier, FP = S.fp;
    if (cr && FP && FP.L0 != null && !FP.bigShown && !S.dead && S.ball.mode === 'held' && (cr.y - FP.L0) * (FP.cdir || 1) >= 15) { FP.bigShown = true; slowMo(0.8); excite = Math.max(excite, 0.9); }
    if (S.snapT != null && !S.dead && FP && FP.L0 != null && Math.round(S.t / DT) % 6 === 0) for (const a of S.list) if (a.side === S.o && (a.pos === 'WR' || a.pos === 'TE' || a.pos === 'RB')) { (a.path = a.path || []).push([a.x, a.y]); if (a.path.length > 90) a.path.shift(); }
    if (cr && S.ball.mode === 'held' && hyp(cr.vx, cr.vy) > 3) { (cr.trail = cr.trail || []).push([cr.x, cr.y]); if (cr.trail.length > 18) cr.trail.shift(); }
    for (const a of S.list) { a.hi = (a.hi + 1) % 64; a.hx[a.hi] = a.x; a.hy[a.hi] = a.y; }
    collide();
    freeChecks();
    stepBall();
    record();
    if (S.dead) {
      S.deadT += DT;
      if (S.deadT > 1.5 && S.onDone) {
        const cb = S.onDone; S.onDone = null; clearTimeout(S.watchdog);
        let res = null;
        try { res = S.result ? S.result() : null; } catch (e) { console.error('Live result failed', e); }
        setTimeout(() => cb(res), 0);
      }
    } else if (S.readyFn) S.readyFn();
  }
  function collide() {
    const l = S.list, c = S.ball.mode === 'held' && !S.dead ? S.carrier : null;
    for (let i = 0; i < l.length; i++) {
      const a = l[i];
      if (a.down > 0) continue;
      for (let j = i + 1; j < l.length; j++) {
        const b = l[j];
        if (b.down > 0 || (a.eng && a.eng === b.eng)) continue;
        // before the snap teammates weave past each other on the way to their spots
        if (S.snapT == null && a.side === b.side) continue;
        // ...and a pulling lineman slips behind his own line
        if (a.side === b.side && (a.pulling || b.pulling) && a !== c && b !== c) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), min = a.r + b.r;
        if (d >= min || d < 1e-4) continue;
        // a blocker reaching his man starts the engagement
        if (a.blockT === b && !a.eng && !b.eng && a.blockOn && a !== c) { a.blockOn(a, b); if (a.eng) continue; }
        if (b.blockT === a && !a.eng && !b.eng && b.blockOn && b !== c) { b.blockOn(b, a); if (b.eng) continue; }
        if (c && (a === c || b === c)) {
          const o = a === c ? b : a;
          // the runner squeezes past his own men
          if (o.side === c.side) continue;
          // anyone who gets a hand on him tries to bring him down
          if (S.free && tryTackle(c, o, o.eng ? -2.4 : 0)) return;
          if (o.eng) continue;
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
    // long hang time is a kick; a real arc is a pass; snaps and pitches stay quiet
    if (dur >= 1.5) Sfx.play('kick'); else if (peak >= 0.8) Sfx.play('throw');
  }
  function looseBall(x, y, z, vx, vy, vz) { S.ball = { mode: 'loose', x, y, z, vx, vy, vz }; S.carrier = null; }
  // ── highlight recording: from the snap until a beat after the whistle, every player and the ball at 12 fps ──
  const REC_EVERY = 5, REC_MAX = 240;
  function record() {
    if (S.snapT == null || (S.dead && S.deadT > 1.2)) return;
    const R = S.rec || (S.rec = { f: [], side: S.list.map(a => a.side), n: 0 });
    if (R.n++ % REC_EVERY || R.f.length >= REC_MAX || R.side.length !== S.list.length) return;
    const r = v => Math.round(v * 10) / 10, b = ballPos(), fr = [r(b.x), r(b.y), r(b.z)];
    for (const a of S.list) fr.push(r(a.x), r(a.y));
    R.f.push(fr);
  }
  // hand the last play's recording to the caller (once)
  function takeClip() {
    if (!S || !S.rec || S.rec.f.length < 6) return null;
    const c = { t: gs.t.slice(), o: S.o, side: S.rec.side, f: S.rec.f, fps: 1 / (DT * REC_EVERY) };
    S.rec = null;
    return c;
  }
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
    Sfx.play('whistle', 0.5);
    const F0 = S.fp, c0 = S.carrier;
    if (F0 && F0.L0 != null && F0.kind !== 'ret' && c0 && c0.side === S.o && (F0.td || (c0.y - F0.L0) * (F0.cdir || 1) >= 20)) S.replay = performance.now();
    for (const e of S.engs) if (!e.done) release(e);
    if (fx) fx();
  }

  // ════════════ FREE PLAY ════════════
  // Nothing below is scripted: blocks, routes, reads, throws, catches, cuts and
  // tackles all come from the players' ratings and where they are on the field.
  // The result is reported back to the engine, which writes the play-by-play.
  const sig = z => 1 / (1 + Math.exp(-z));
  const soft = (x, c) => c * Math.tanh(x / c);
  // helmet stickers: magnitude (always on in its situation) and proc (chance) — both recorded for the log
  function stkM(a, id, cond = true) { const p = P(a.pid); return p && S.det ? Engine.stk.sm(gs, S.det, p, id, cond) : 0; }
  function stkQ(a, id, cond = true) { const p = P(a.pid), t = Engine.stk.tierOf(p, id); return t >= 0 && cond ? DATA.STICKERS[id].base * DATA.STICKER_TIERS[t].mult : 0; }
  function stkP(a, id, cond = true, scale = 1) {
    const p = P(a.pid);
    if (!p || !S.det || !Engine.stk.sp(gs, S.det, p, id, cond, scale)) return false;
    stkPop(a, id);
    return true;
  }
  function stkPop(a, id, minTier = 0) {
    const t = Engine.stk.tierOf(P(a.pid), id);
    if (t < minTier || t < 0 || (S.stkPops || 0) >= 2) return;
    S.stkPops = (S.stkPops || 0) + 1;
    pop(a.x, a.y + 0.6, '★ ' + DATA.STICKERS[id].name.toUpperCase(), DATA.STICKER_TIERS[t].color, { life: 1.8 });
  }
  const opps = a => S.list.filter(d => d.side !== a.side);
  const mates = a => S.list.filter(d => d.side === a.side);
  // where the ball is spotted: the front of the carrier
  const spotOf = c => c.y + (S.fp ? S.fp.cdir : 1) * 0.3;

  // ── tackling: every contact is a contest of the tackler's form vs the runner's elusiveness ──
  function tryTackle(c, d, mod = 0) {
    const F = S.fp;
    if (!F || d.tkCD > S.t || c.down > 0 || d.down > 0 || S.dead || F.over) return false;
    d.tkCD = S.t + 0.85;
    const dist = d2(c, d) || 1, nx = (c.x - d.x) / dist, ny = (c.y - d.y) / dist;
    const csp = hyp(c.vx, c.vy);
    const fromBehind = csp > 2 && (c.vx * nx + c.vy * ny) / csp > 0.55;
    let gang = 0;
    for (const x of S.list) if (x.side === d.side && x !== d && x.down <= 0 && !x.eng && d2(x, c) < 2.0) gang++;
    const sacking = F.qb === c && F.mode === 'pass';
    const beyond = F.L0 == null || (c.y - F.L0) * F.cdir > 0;
    let z = 1.75 + (d.R.tackle - c.R.elus) * 0.022 + Math.min(gang, 2) * 0.5 - (fromBehind ? 0.6 : 0) - Math.max(0, csp - 6) * 0.1 + mod;
    if (sacking) z += 1.2 - (c.R.elus - 55) * 0.02;
    const rp = P(c.pid), rb = rp && rp.pos === 'RB';
    const offS = (F.kind === 'run' && beyond ? stkM(c, 'wrecking', rb) : 0) + (F.caught ? stkM(c, 'yac') : 0) + (F.kind === 'run' && Engine.stk.shortYd(gs) ? stkM(c, 'hammer', rb) : 0);
    const defS = stkM(d, 'suretackle') + stkM(d, 'thumper', F.kind === 'run' && d.pos === 'LB') + stkM(d, 'sideline', F.kind === 'run' && Math.abs(c.x - CX) > 8);
    z += soft(offS, 3) * 0.14 - soft(defS, 3) * 0.14;
    // juke box: the first man at the second level grabs air
    if (rb && F.kind === 'run' && beyond && !F.juked) { F.juked = true; if (stkP(c, 'jukebox', true, 0.6)) z = -9; }
    if (sacking && stkP(c, 'escape', true, 0.5)) z = -9;
    if (Math.random() < sig(z)) { tackle(c, d); return true; }
    // broken tackle
    d.down = 0.3 + Math.random() * 0.3; d.stayDown = false;
    d.vx = -nx * 1.2 + c.vx * 0.25; d.vy = -ny * 1.2 + c.vy * 0.25;
    c.vx *= 0.74; c.vy *= 0.74;
    c.vx += (Math.sign(c.x - d.x) || 1) * 1.3;
    F.broke = (F.broke || 0) + (mod <= -0.6 ? 0 : 1);
    if (offS > 0 && soft(offS, 3) > 1) stkPop(c, rb ? 'wrecking' : 'yac', 2);
    if (S.t - (S.lastWhiff || -9) > 0.8) { S.lastWhiff = S.t; pop(c.x, c.y, sacking ? 'ESCAPES!' : U.pick(['BROKE TACKLE', 'JUKE!', 'SPIN MOVE', 'STIFF ARM', 'MISSED TACKLE']), '#facc15', { life: 1 }); }
    burst(c.x, c.y, 'rgba(250,204,21,.8)', 6);
    return false;
  }
  function tackle(c, d) {
    const F = S.fp;
    if (S.dead || (F && F.over)) return;
    if (d.eng) release(d.eng);
    if (c.eng) release(c.eng);
    const fwd = F ? F.cdir : (S.dirUp || 1);
    // momentum and strength decide which way the pile falls
    const lean = (c.R.str - d.R.str) * 0.03;
    c.down = 9; c.stayDown = true;
    c.vx = c.vx * 0.5 + d.vx * 0.3; c.vy = c.vy * 0.5 + d.vy * 0.3 + fwd * lean;
    c.face = ang(c.vx || 0.01, c.vy || 0.01);
    d.down = 9; d.stayDown = true; d.vx = c.vx; d.vy = c.vy; d.face = c.face;
    shake = Math.max(shake, 0.5);
    burst(c.x, c.y, 'rgba(226,232,240,.9)', 14);
    Sfx.play('tackle');
    if (F && F.qb === c && F.mode === 'pass') { hit = 1; shake = 1.1; slowMo(0.45); excite = Math.max(excite, 0.6); burst(c.x, c.y, 'rgba(255,255,255,.95)', 22, 5); pop(c.x, c.y + 1, 'SACK!', '#fca5a5', { big: true }); }
    const sc = S;
    setTimeout(() => { if (S !== sc) return; c.stayDown = false; c.down = 1.0; d.stayDown = false; d.down = 0.7; }, 900 / speed);
    if (!F) return dead(S.onTackle);
    F.tackler = d;
    // ball security
    if (!F.noFumble) {
      const grip = U.clamp(1 - stkM(c, 'irongrip'), 0.25, 1);
      let fp = (0.011 - (c.R.awr - 70) * 0.0003) * gs.wxm.fum * grip * (F.qb === c && F.mode === 'pass' ? 1.5 : 1);
      if (F.qb === c && F.mode === 'pass' && stkP(d, 'strip', true, 0.35)) fp = 1;
      else if (F.mode !== 'pass' && stkP(d, 'enforcer', true, 0.1 * grip)) fp = 1;
      if (Math.random() < fp) return fumble(c, d);
    }
    F.spotY = null;
    F.over = true;
    dead(() => { if (S.onTackle) S.onTackle(); });
  }
  function fumble(c, d) {
    const F = S.fp;
    F.loose = { t0: S.t, by: c };
    looseBall(c.x, c.y, 0.8, U.rand(-3, 3) + c.vx * 0.3, U.rand(-2, 3) * F.cdir + c.vy * 0.2, 3);
    pop(c.x, c.y, 'FUMBLE!', '#fca5a5', { big: true });
    slowMo(0.7); excite = Math.max(excite, 0.7);
    shake = 0.8;
    for (const a of S.list) { if (a.eng) release(a.eng); a.brain = looseBrain; }
  }
  // loose ball: everyone near it dives on it
  function looseBallStep() {
    const F = S.fp, b = S.ball;
    if (b.z > 0.7 && S.t - F.loose.t0 < 1.5) return;
    let best = null, bd = 9;
    for (const a of S.list) {
      if (a.down > 0 && !(a === F.loose.by && S.t - F.loose.t0 > 0.6)) continue;
      const dd = hyp(a.x - b.x, a.y - b.y);
      if (dd < bd) { bd = dd; best = a; }
    }
    const late = S.t - F.loose.t0 > 3;
    if (best && (bd < 0.9 || late) && (late || Math.random() < 0.18)) {
      F.recovered = best;
      F.spotY = b.y;
      F.over = true;
      best.down = 1.2; best.vx = 0; best.vy = 0;
      holdBall(best);
      const mine = best.side === F.offSide;
      pop(best.x, best.y, mine ? 'RECOVERED' : 'TURNOVER!', mine ? '#86efac' : '#fca5a5', { big: !mine });
      dead();
    }
  }
  const looseBrain = a => { const b = S.ball; if (hyp(a.x - b.x, a.y - b.y) < 14) seek(a, b.x, b.y, 1, 0.2); else stop(a); };

  // ── ball-carrier vision: look at 15 lanes, run the one that gets furthest before contact ──
  function pickLane(a) {
    const F = S.fp, dir = F.cdir, base = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const prev = a.lane ?? base;
    const opp = S.list.filter(d => d.side !== a.side && d.down < 0.3);
    let aim = null;
    if (F.aim && (S.t < F.aimUntil || (a.y - F.aim[1]) * dir < -0.6)) aim = ang(F.aim[0] - a.x, F.aim[1] - a.y);
    let best = base, bs = -1e9;
    for (let i = -7; i <= 7; i++) {
      const th = base + i * 0.19, ux = Math.cos(th), uy = Math.sin(th);
      let tC = 2.2;
      scan: for (let t = 0.12; t <= 2.2; t += 0.16) {
        const px = a.x + ux * a.vmax * t, py = a.y + uy * a.vmax * t;
        if (px < 0.4 || px > FW - 0.4) { tC = t; break; }
        for (const d of opp) {
          const lag = d.eng ? 0.65 : d.down > 0 ? d.down : 0;
          const reach = d.vmax * Math.max(0, t + 0.12 - lag) + 0.8;
          const ddx = px - d.x, ddy = py - d.y;
          if (ddx * ddx + ddy * ddy < reach * reach) { tC = t; break scan; }
        }
      }
      let s = uy * dir * a.vmax * tC + (tC >= 2.2 ? 2.5 : 0) - Math.abs(th - prev) * 1.5;
      if (aim != null) { let da = th - aim; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; s -= Math.abs(da) * (F.aimW ?? 3.2); }
      if (s > bs) { bs = s; best = th; }
    }
    return best;
  }
  function runnerBrain(a) {
    const F = S.fp;
    if (!a.visT || S.t >= a.visT) { a.visT = S.t + 0.05; a.lane = pickLane(a); }
    const open = F.L0 != null && (a.y - F.L0) * F.cdir > 5;
    let k = 0.94 * (a.secureT > S.t ? 0.72 : 1); // carrying the ball costs a step
    if (open && F.kind === 'run') k += soft(stkM(a, 'homerun', P(a.pid) && P(a.pid).pos === 'RB'), 5) * 0.012;
    if (F.mode === 'intret') k += stkM(a, 'pick6') * 0.8;
    a.wx = Math.cos(a.lane) * a.vmax * k; a.wy = Math.sin(a.lane) * a.vmax * k;
    // QB slides once he has his yards
    if (F.mode === 'scramble' && !F.over && (a.y - F.L0) >= 2) {
      for (const d of S.list) if (d.side !== a.side && d.down <= 0 && !d.eng && d2(a, d) < 1.7) { slide(a); return; }
    }
  }
  function slide(a) {
    const F = S.fp;
    F.slide = true; F.over = true; F.spotY = a.y + 0.6;
    a.down = 9; a.stayDown = true; a.vx *= 0.4; a.vy *= 0.4;
    pop(a.x, a.y, 'SLIDES', '#cbd5e1');
    dead();
  }

  // ── pursuit: take an angle to where the carrier will be ──
  function interceptPt(a, t) {
    const vx = t.vx || 0, vy = t.vy || 0;
    for (let tau = 0; tau <= 2.4; tau += 0.1) {
      const px = t.x + vx * tau, py = t.y + vy * tau;
      if (hyp(px - a.x, py - a.y) <= a.vmax * tau * 0.95 + 0.5) return [px, py];
    }
    return [t.x + vx * 2.4, t.y + vy * 2.4];
  }
  function pursue(a) {
    const c = S.carrier;
    if (!c || c.side === a.side) return stop(a);
    const [px, py] = interceptPt(a, c);
    a.vk = 1.05; // no ball to carry: pursuers close a little
    seek(a, clampX(px), py, 1, 0.25);
    a.faceT = ang(c.x - a.x, c.y - a.y);
  }

  // ── blocking: pick the most dangerous free defender in his area and get between him and the ball ──
  function pickBlock(a, mode) {
    const F = S.fp, ref = mode === 'pass' ? F.qb : (S.carrier || F.qb || a);
    let best = null, bs = 1e9;
    for (const d of S.list) {
      if (d.side === a.side || d.down > 0 || d.eng) continue;
      if (mode === 'pass' && !d.rushing) continue;
      const dd = d2(a, d);
      if (dd > (mode === 'pass' ? 4.8 : F.kind === 'ret' ? 30 : 7)) continue;
      if (mode !== 'pass' && (d.y - ref.y) * (F.cdir || 1) < -1.5) continue; // already behind the ball
      let claimed = false;
      for (const b of S.list) if (b !== a && b.side === a.side && b.blockT === d && d2(b, d) < dd) { claimed = true; break; }
      const s = dd + (claimed ? 5 : 0) + d2(d, ref) * 0.3;
      if (s < bs) { bs = s; best = d; }
    }
    return best;
  }
  function blockBrain(mode, home) {
    return a => {
      const F = S.fp, c = S.carrier;
      if ((a.blockCD || 0) > S.t) { if (c && mode !== 'pass') seek(a, a.x, a.y + F.cdir * 0.5, 0.4); return; }
      let t = a.blockT;
      if (!t || t.down > 0 || (t.eng && t.eng.a !== a) || d2(a, t) > (F.kind === 'ret' ? 30 : F.draw ? 12 : 8) || (mode === 'pass' && !t.rushing)) a.blockT = t = pickBlock(a, mode);
      if (!t) {
        if (mode === 'pass' && home) { seek(a, home[0], home[1], 0.7, 0.5); a.faceT = Math.PI / 2; }
        else if (c && c.side === a.side) seek(a, clampX(c.x + (a.x - c.x) * 0.4), c.y + F.cdir * 3.5, 0.85, 0.6);
        else stop(a);
        return;
      }
      const ref = mode === 'pass' ? F.qb : (c && c.side === a.side ? c : F.qb || a);
      const k = mode === 'pass' ? 0.62 : F.kind === 'ret' && d2(a, t) > 4 ? 0.95 : 0.78;
      seek(a, clampX(t.x * k + ref.x * (1 - k)), t.y * k + ref.y * (1 - k), 1, 0.3);
      a.faceT = ang(t.x - a.x, t.y - a.y);
    };
  }
  function setBlocker(a, mode, home) {
    a.brain = blockBrain(mode, home);
    a.blockOn = (b, d) => engageFree(b, d, mode);
  }
  function engageFree(blk, def, mode) {
    const F = S.fp;
    if (!F) return engage(blk, def, {});
    let m;
    if (mode === 'pass') {
      const lead = gs.score[def.side] > gs.score[1 - def.side] && gs.qtr >= 4;
      m = blk.R.pblk - def.R.rush
        + soft(stkQ(blk, 'brickwall') + stkQ(blk, 'anchor') * 0.5, 3)
        - soft(stkQ(def, 'bender', def.key === 'dDE1' || def.key === 'dDE2') + stkQ(def, 'bullrush') + stkQ(def, 'closer', lead) + stkQ(def, 'blitzer', !!def.blitz), 3.5);
    } else {
      m = blk.R.rblk - def.R.rdef + soft(stkQ(blk, 'grader') + stkQ(blk, 'puller', !!blk.pulling), 2.5) - soft(stkQ(def, 'stuffer'), 2.5);
      if (F.kind !== 'ret' && (blk.pos === 'WR' || blk.pos === 'RB' || blk.pos === 'CB' || blk.pos === 'S')) m -= 6;
    }
    m += U.gauss(0, 5);
    const away = F.hole != null ? (Math.sign(def.x - F.hole) || 1) : 0;
    return engage(blk, def, { free: true, mode, m, dir: mode === 'run' ? [away * 0.5, F.cdir * 0.6] : [0, 0] });
  }
  function touchdownFx(a) {
    a.celebrate = true;
    const team = L.team(gs.t[a.side]);
    bigText('TOUCHDOWN', '#facc15', a.side);
    slowMo(1.0); excite = 1;
    confetti(a.x, a.y, [kit[a.side].jersey, team.logo.secondary, '#facc15', '#ffffff']);
    shake = 0.6;
    for (const m of S.list) if (m.side === a.side && d2(m, a) < 18) m.celebrate = true;
  }
  // a player with no specific job: find the nearest free opponent and block him (kneels, field goals)
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

  // ── per-tick rules of the game ──
  function freeChecks() {
    const F = S.fp;
    if (!S.free || !F || S.dead || F.over) return;
    if (F.loose) return looseBallStep();
    const c = S.ball.mode === 'held' ? S.carrier : null;
    if (!c || c.down > 0) return;
    // out of bounds
    if (c.x < 0 || c.x > FW) {
      F.oob = true; F.over = true; F.spotY = spotOf(c);
      pop(clampX(c.x), c.y, 'OUT OF BOUNDS', '#cbd5e1');
      for (const d of S.list) if (d.side !== c.side) d.brain = b => seek(b, clampX(c.x), c.y, 0.4);
      return dead();
    }
    // touchdown
    if (F.goal != null && (c.y - F.goal) * F.cdir >= 0.3 && !(F.mode === 'pass' && c === F.qb)) {
      F.td = true; F.over = true; F.spotY = F.goal;
      return dead(() => touchdownFx(c));
    }
    // safety / touchback for the team running back into its own end zone is spotted at the 0
    // a QB who crosses the line can no longer throw
    if (F.mode === 'pass' && c === F.qb && c.y > F.L0 + 0.4) startScramble();
    // diving tackles: anyone within lunging range takes his shot
    for (const d of S.list) {
      if (d.side === c.side || d.down > 0 || d.eng || (d.tkCD || 0) > S.t) continue;
      const dd = d2(d, c);
      if (dd < 1.45 && dd > c.r + d.r) {
        const fx = Math.cos(d.face), fy = Math.sin(d.face);
        if (((c.x - d.x) * fx + (c.y - d.y) * fy) / dd > 0.2 && tryTackle(c, d, -0.3 - (dd - 0.95) * 1.2)) return;
      }
    }
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
  const allSet = () => S.list.every(a => hyp(a.x - a.mark[0], a.y - a.mark[1]) < 0.6 && hyp(a.vx, a.vy) < 0.9);

  // Next-play setup: cut to the huddles. Both teams stay huddled until the call is in,
  // then break straight into the called formation (or line up for a kickoff).
  function lineup() {
    if (!gs || gs.over) return;
    startCut(() => {
      if (gs.phase === 'kickoff') return kickoffFormation();
      const o = gs.poss, O = Engine.slots(gs, o, true), D = Engine.slots(gs, 1 - o, false);
      const ids = X => { const r = {}; for (const k in X) r[k] = X[k].id; return r; };
      newScene(o, gs.ball, gs.ball + gs.togo, 'lineup');
      placeFormation(o, gs.ball, ids(O), ids(D), 'base', true);
      const hy = { [o]: gs.ball - 9, [1 - o]: gs.ball + 7.8 };
      for (const a of S.list) a.brain = b => { stop(b); b.faceT = ang(CX - b.x, hy[b.side] - b.y); };
      S.ball = { mode: 'spot', x: CX, y: gs.ball, z: 0.15 };
      S.focus = () => [CX, S.los - 1];
      S.readyFn = () => { if (!S.ready && S.t > 0.8) S.ready = true; };
      cam.y = S.los + 3; cam.x = CX;
    });
  }
  function ready(fn) { readyCb = fn; }

  // ── scrimmage plays ──
  // Players shift from the huddle look into the called formation and the defense
  // aligns to it; then the snap starts a fully free play.
  function presnap(det, start) {
    if (!S || S.kind !== 'lineup' || S.o !== det.o) {
      newScene(det.o, det.los, det.los + (gs._togoAtSnap || 10), 'play');
      placeFormation(det.o, det.los, det.O, det.D, 'base', false);
      cam.y = det.los + 4;
    }
    S.kind = 'play'; S.ready = false; S.readyFn = null;
    S.los = det.los; S.ltg = det.los + (gs._togoAtSnap || 10);
    S.det = det; S.stkPops = 0;
    for (const [k, id] of Object.entries(det.O || {})) { const a = S.ag['o' + k], p = P(id); if (a && p && a.pid !== id) { a.pid = id; a.num = p.num; a.pos = p.pos; } }
    for (const [k, id] of Object.entries(det.D || {})) { const a = S.ag['d' + k], p = P(id); if (a && p && a.pid !== id) { a.pid = id; a.num = p.num; a.pos = p.pos; } }
    for (const a of S.list) rateAgent(a);
    const play = Playbook.offById(det.play), dplay = Playbook.defById(det.dplay);
    const F = Playbook.formPos(play.form, det.flip);
    const DA = Playbook.defAlign(dplay, F);
    for (const [k, [x, y]] of Object.entries(F)) { const a = S.ag['o' + k]; if (a) a.mark = [CX + x, det.los + y]; }
    for (const [k, [x, y]] of Object.entries(DA)) { const a = S.ag['d' + k]; if (a) a.mark = [clampX(CX + x), det.los + y]; }
    S.ball = { mode: 'spot', x: CX, y: det.los, z: 0.15 };
    S.focus = () => [CX, S.los + 4];
    breakHuddle(det.o, () => {
      pop(S.ag.oQB.x, S.ag.oQB.y, 'SET...', '#e2e8f0', { life: 0.6 });
      at(S.t + 0.5, () => { S.snapT = S.t; pop(S.ag.oQB.x, S.ag.oQB.y, 'HUT!', '#ffffff', { life: 0.7 }); start(play, dplay); });
    });
  }
  // Out of the huddle and up to the marks; set() fires once all 22 are on their spots and still.
  function breakHuddle(o, set) {
    for (const a of S.list) a.brain = b => {
      const d = seek(b, b.mark[0], b.mark[1], d2(b, { x: b.mark[0], y: b.mark[1] }) > 4 ? 0.9 : 0.6, 0.9);
      b.faceT = d < 1.5 || b.side !== o ? (b.side === o ? Math.PI / 2 : -Math.PI / 2) : null;
    };
    const t0 = S.t;
    let done = false;
    S.readyFn = () => {
      if (done || S.t - t0 < 0.4) return;
      const late = S.t - t0 > 7;
      if (!late && !S.list.every(a => hyp(a.x - a.mark[0], a.y - a.mark[1]) < 0.45 && hyp(a.vx, a.vy) < 0.8)) return;
      done = true;
      for (const a of S.list) { a.x = a.mark[0]; a.y = a.mark[1]; a.vx = 0; a.vy = 0; a.wx = 0; a.wy = 0; a.face = a.side === o ? Math.PI / 2 : -Math.PI / 2; a.brain = b => { stop(b); }; }
      set();
    };
  }
  function rateAgent(a) {
    const p = P(a.pid);
    a.R = Engine.ratings(gs, a.side, p || { id: -1, pos: a.pos, attrs: { spd: 45, str: 45, awr: 45, skl: 45 } });
    const big = a.pos === 'OL' || a.pos === 'DL';
    a.vmax = big ? 5.8 + a.R.spd * 0.028 : a.pos === 'QB' || a.pos === 'K' ? 6.4 + a.R.spd * 0.034 : 6.9 + a.R.spd * 0.041;
    a.acc = big ? 8 + a.R.str * 0.02 : 11 + a.R.spd * 0.05;
    a.tkCD = 0; a.blockCD = 0; a.readT = 99; a.rushing = false; a.blitz = false; a.job = null; a.route = null; a.wp = 0; a.lane = null; a.visT = 0; a.pulling = false;
  }
  // receiver position τ seconds ago (defenders react with a delay)
  function hist(a, tau) {
    const n = Math.min(63, Math.max(0, Math.round(tau / DT)));
    if (!a.hx || n === 0) return [a.x, a.y];
    const i = (a.hi - n + 64) % 64;
    return a.hx[i] == null ? [a.x, a.y] : [a.hx[i], a.hy[i]];
  }
  function newFP(det, play, dplay) {
    const F = {
      det, play, dplay, kind: play.kind, L0: det.los, o: det.o, offSide: det.o, cdir: 1, goal: 100,
      qb: S.ag.oQB, mode: play.kind === 'run' ? 'mesh' : 'pass', broke: 0, aim: null, aimUntil: 0, hole: null,
      routers: [], throwT: null, target: null, caught: false, res: {}, over: false,
    };
    S.fp = F; S.free = true; S.dirUp = 1;
    return F;
  }
  // defenders read run/pass with a delay that depends on awareness and their job
  function setReads(base, extra = {}) {
    for (const a of S.list) {
      if (a.side === S.o) continue;
      const j = a.job ? a.job.type : 'rush';
      // second-level players key the line during their read step; deep and man-cover DBs read late
      const lb = a.pos === 'LB';
      const jd = j === 'rush' ? 0.05 : j === 'blitz' ? 0.05 : j === 'box' ? 0.15 : j === 'man' ? (lb ? 0.4 : 0.5) : a.job && a.job.kd === 'deep' ? 0.45 : 0.3;
      a.readT = Math.min(a.readT, S.t + base + jd + Math.max(0, (85 - a.R.awr)) * 0.008 + U.rand(0, 0.12) + (extra[a.key] || 0));
    }
  }
  // ── defense ──
  function assignDefense(dplay, F) {
    // in the red zone everything compresses: deep zones sit on the end line, underneath zones shrink with them
    const zoneAbs = z => { const [x, y] = Playbook.ZONES[z], room = 108 - F.L0; return [clampX(CX + x), F.L0 + Math.min(y, Math.max(2, room * (y / 19)))]; };
    for (const [k, asg] of Object.entries(dplay.a)) {
      if (k[0] === '_') continue;
      const a = S.ag['d' + k];
      if (!a) continue;
      if (asg === 'rush') { a.job = { type: 'rush', edge: k === 'DE1' ? -1 : k === 'DE2' ? 1 : 0 }; a.rushing = true; }
      else if (asg[0] === 'blitz') { a.job = { type: 'blitz', gap: CX + asg[1] }; a.rushing = true; a.blitz = true; }
      else if (asg[0] === 'box') a.job = { type: 'box', x: CX + asg[1] };
      else if (asg[0] === 'man') {
        const r = S.ag['o' + asg[1]];
        const tau = U.clamp(0.24 + ((r ? r.R.route : 60) - a.R.cover) * 0.005 + U.gauss(0, 0.05)
          + (r ? (stkQ(r, 'routetech') + stkQ(r, 'burner') * 0.8 + stkQ(r, 'redzone', Engine.stk.redZone(gs))) * 0.05 : 0)
          - (stkQ(a, 'lockdown') + stkQ(a, 'covlb', r && (r.pos === 'TE' || r.pos === 'RB'))) * 0.06, 0.05, 0.62);
        a.job = { type: 'man', r, tau, cush: Math.max(0.8, a.y - (r ? r.y : a.y)), lev: (r && r.x < CX ? 0.7 : -0.7) };
      } else if (asg[0] === 'zone') {
        const kd = Playbook.ZKIND(asg[1]);
        const w = asg[1].startsWith('half') ? 13 : asg[1].startsWith('q') ? 7.5 : 9.5;
        const tau = U.clamp(0.32 - (a.R.cover - 70) * 0.006 - (stkQ(a, 'zonehawk', dplay.id === 'c3') + stkQ(a, 'centerfield', kd === 'deep')) * 0.06 + U.gauss(0, 0.04), 0.08, 0.6);
        a.job = { type: 'zone', z: asg[1], L: zoneAbs(asg[1]), kd, w, tau };
      } else a.job = { type: 'rush' };
      a.ballReact = U.clamp(0.26 - (a.R.awr - 70) * 0.006 + U.gauss(0, 0.05), 0.1, 0.5);
      // read step: linebackers, box players and underneath safeties shuffle half a step downhill while they read
      const keyer = a.job.type === 'box' || (a.pos === 'LB' && a.job.type !== 'rush' && a.job.type !== 'blitz') || (a.pos === 'S' && a.job.type === 'zone' && a.job.kd !== 'deep');
      a.readStep = keyer ? U.clamp(0.1 + (85 - a.R.awr) * 0.004 + U.rand(0, 0.05), 0.08, 0.28) : 0;
      a.stepPt = [a.x + (CX - a.x) * 0.04, a.y - 0.35];
      a.brain = defBrain;
    }
  }
  function defBrain(a) {
    const F = S.fp, c = S.carrier, j = a.job || { type: 'rush' };
    if (F.loose) return looseBrain(a);
    if (c && c.side === a.side) return stop(a);
    // the ball is out: break on it
    if (S.ball.mode === 'air' && F.throwT != null && !F.caught) {
      if (S.t >= F.throwT + a.ballReact) return playBall(a);
      return coverJob(a, j);
    }
    // an unblocked lineman at or outside the point of attack squeezes down the line instead of racing upfield
    // (the textbook answer to a down block) — which leaves him there for the puller to kick out
    if (F.kind === 'run' && (F.scheme === 'power' || F.scheme === 'counter') && a.pos === 'DL' && j.type === 'rush' && F.hole != null && S.t - S.snapT < 1.0) {
      const sd = Math.sign(F.hole - CX) || 1;
      if ((a.x - F.hole) * sd > -0.6 && !(c && c !== F.qb && d2(a, c) < 2.2)) {
        a.rushing = false;
        // close down, but keep outside leverage on the hole
        const out = Math.max(0.9, (a.x - F.hole) * sd * 0.6);
        seek(a, clampX(F.hole + sd * out), F.L0 - 0.3, 0.75, 0.4);
        a.faceT = -Math.PI / 2;
        return;
      }
    }
    // a run to the perimeter: the playside end keeps contain — he sets the edge outside the ball instead of chasing the quarterback
    if (F.kind === 'run' && a.pos === 'DL' && j.type === 'rush' && F.hole != null && Math.abs(F.hole - CX) > 5 && S.t - S.snapT < 1.1 && (!c || c === F.qb)) {
      const sd = Math.sign(F.hole - CX) || 1;
      if ((a.x - CX) * sd > 1.5) { a.rushing = false; seek(a, clampX(F.hole + sd * 0.8), F.L0 - 0.6, 0.9, 0.3); return; }
    }
    // the play is a run (or the QB took off): pursue once he's read it
    if (c && (c !== F.qb || F.mode === 'scramble' || F.mode === 'run') && S.t >= a.readT) return pursue(a);
    // read step: hold and shuffle downhill until he's read it (on a run, until he's keyed run)
    if (a.readStep) {
      const t = S.t - S.snapT;
      if (t < a.readStep || (F.kind === 'run' && !F.draw && S.t < a.readT && t < 1.0)) { seek(a, a.stepPt[0], a.stepPt[1], 0.3, 0.5); a.faceT = -Math.PI / 2; return; }
    }
    // read run before the handoff: flow downhill to the hole, deep men come up under control
    if (F.kind === 'run' && S.t >= a.readT && j.type !== 'rush' && j.type !== 'blitz') {
      const hx = F.hole ?? CX, deep = a.y - F.L0 > 9, wide = Math.abs(hx - CX) > 5;
      // shuffle to mirror the play at depth; fit downhill only once the back has the ball (pursuit above)
      // a run to the perimeter is obvious early: the playside underneath zone player sets the edge,
      // and the rest of the second level scrapes hard to beat it there
      const sd = Math.sign(hx - CX) || 1;
      if (wide && ((j.type === 'zone' && j.kd !== 'deep') || j.type === 'box') && (a.x - CX) * sd > 2) return seek(a, clampX(hx + sd * 1.2), F.L0 + 2.2, 1, 0.4);
      return seek(a, clampX(hx + (a.x - hx) * (deep ? 0.6 : wide ? 0.4 : 0.55)), Math.max(F.L0 + (deep ? 6 : 3.6), Math.min(a.y, F.L0 + 4.8)), wide ? 0.85 : 0.55, 0.6);
    }
    // play-action: the second level steps up to the fake
    if (F.fakeUntil && S.t < F.fakeUntil && (a.pos === 'LB' || j.type === 'box') && S.t - S.snapT < (a.biteT || 0)) return seek(a, a.x, F.L0 + 2, 0.6);
    coverJob(a, j);
  }
  function coverJob(a, j) {
    const F = S.fp;
    if (j.type === 'rush' || j.type === 'blitz') return rushBrain(a, j);
    if (j.type === 'box') {
      if (F.kind === 'pass' && S.t - S.snapT > 0.6) return zoneBrain(a, { L: [j.x, F.L0 + 6], kd: 'hook', tau: 0.35 });
      return seek(a, j.x, F.L0 + 1.8, 0.6, 0.5);
    }
    if (j.type === 'man') return manBrain(a, j);
    return zoneBrain(a, j);
  }
  function rushBrain(a, j) {
    const F = S.fp, qb = F.qb;
    a.rushing = true;
    if (j.type === 'blitz' && S.t - S.snapT < 0.5) return seek(a, j.gap, F.L0 + 0.2, 1, 0.2);
    let tx = qb.x, ty = qb.y;
    // ends keep contain: stay outside the quarterback until close
    if (j.edge && hyp(a.x - qb.x, a.y - qb.y) > 2.5) tx = qb.x + j.edge * 1.6;
    seek(a, clampX(tx), ty, 1, 0.2);
  }
  function manBrain(a, j) {
    const F = S.fp, r = j.r;
    if (!r) return zoneBrain(a, { L: [a.mark[0], F.L0 + 7], kd: 'hook', tau: 0.3 });
    // his man is blocking him on a run: that's his key — come off and play the run
    if (r.blocking && F.kind === 'run' && S.t - S.snapT > 0.15) { a.readT = Math.min(a.readT, S.t + 0.12); if (!S.carrier || S.carrier === F.qb) return seek(a, clampX(a.x + ((F.hole ?? CX) - a.x) * 0.3), Math.max(F.L0 + 2.5, a.y - 1), 0.8, 0.5); }
    // his man stayed in to block: green-dog it and go get the quarterback
    if (r.blocking && S.t - S.snapT > 0.7) { a.job = { type: 'rush' }; a.rushing = true; return; }
    const t = S.t - S.snapT;
    const [hx, hy] = hist(r, j.tau);
    // mirror the (delayed) receiver, backpedalling to keep a cushion on top of him
    const ant = U.clamp(0.55 + (a.R.cover - 60) * 0.012, 0.4, 1.1);
    const px = hx + r.vx * j.tau * ant, py = hy + r.vy * j.tau * ant;
    const cush = Math.max(0.9, j.cush - t * 1.5) * (r.vy > 1 ? 1 : 0.6);
    seek(a, clampX(px + j.lev * U.clamp(1 - (r.y - F.L0) / 14, 0, 1)), Math.min(py + cush, 109.3), 1, 0.22);
    a.faceT = ang(r.x - a.x, r.y - a.y);
  }
  function zoneBrain(a, j) {
    const F = S.fp, L = j.L, t = S.t - S.snapT;
    // underneath defenders drop to their landmark before they play routes, and never jump a back still in the backfield
    const dropping = j.kd !== 'deep' && t < (j.kd === 'hook' ? 0.75 : 0.6) - (a.R.awr - 70) * 0.004;
    let thr = null, ts = -1e9, deepY = -99;
    for (const r of F.routers) {
      if (r.blocking) continue;
      const ry = r.y - F.L0, dx = Math.abs(r.x - L[0]);
      let s;
      if (j.kd === 'deep') { if (dx > j.w + 2) continue; const [, hy0] = hist(r, j.tau); deepY = Math.max(deepY, hy0 + r.vy * 0.4); if (ry < 7 || dx > j.w) continue; s = ry - dx * 0.2; }
      else {
        const dd = hyp(r.x - L[0], r.y - L[1]);
        if (dd > 8.5 || ry > 16 || ry < (t < 1.2 ? 0.5 : -1)) continue;
        if (r.y > Math.max(a.y + 2.5, L[1] + 5)) continue; // he's run through the zone: the deep defenders have him
        s = -dd;
      }
      if (s > ts) { ts = s; thr = r; }
    }
    let tx = L[0], ty = L[1];
    if (thr) {
      const [hx, hy] = hist(thr, j.tau);
      if (j.kd === 'deep') { tx = hx * 0.75 + L[0] * 0.25; ty = Math.max(hy + 2.2, deepY + 2.5, F.L0 + 8); }
      else if (dropping) tx = hx * 0.3 + L[0] * 0.7;
      else { tx = hx * 0.7 + L[0] * 0.3; ty = U.clamp(hy - 0.4, F.L0 + 1.5, L[1] + 3); }
    }
    if (j.kd === 'deep' && !thr) ty = Math.max(ty, deepY + 2.5);
    seek(a, clampX(tx), Math.min(ty, 109.3), S.t - S.snapT < 0.5 ? 0.85 : 1, 0.4);
    a.faceT = ang(F.qb.x - a.x, F.qb.y - a.y);
  }
  // run to a spot the ball is coming down on: paced to get there as it lands (arriving `early` seconds
  // ahead), and never faster than he can still stop on it, so he doesn't run straight past the catch point
  function meetSpot(a, x, y, left, early = 0) {
    const gx = clampX(x), gy = Math.min(y, 109.4);
    const dx = gx - a.x, dy = gy - a.y, d = hyp(dx, dy);
    if (d < 0.15) { a.wx = 0; a.wy = 0; return d; }
    const brake = a.acc * 1.6; // the step's deceleration limit
    const sp = Math.min(a.vmax, Math.sqrt(2 * brake * d), d / Math.max(0.05, left - early) * 1.05 + 0.3);
    a.wx = dx / d * sp; a.wy = dy / d * sp;
    return d;
  }
  // in the air: go get the ball if he can (getting there a beat early to contest it), otherwise
  // sprint to the spot to make the tackle — either way pulling up on it rather than overrunning it
  function playBall(a) {
    const b = S.ball, left = Math.max(0, b.t0 + b.dur - S.t);
    const dd = hyp(b.tx - a.x, b.ty - a.y);
    meetSpot(a, b.tx, b.ty, dd / a.vmax < left + 0.35 || dd < 6 ? left : 0, 0.12);
    a.faceT = ang(b.tx - a.x, b.ty - a.y);
  }

  // ── offense ──
  function routeBrain(a) {
    const F = S.fp;
    if (F.loose) return looseBrain(a);
    const pts = a.route;
    if (S.ball.mode === 'air' && F.target === a) return trackBall(a);
    if (F.throwT != null && F.target !== a && S.ball.mode === 'air') return seek(a, S.ball.tx, S.ball.ty, 0.6, 1);
    while (a.wp < pts.length - 1 && hyp(pts[a.wp][0] - a.x, pts[a.wp][1] - a.y) < 1.0) { a.wp++; if (a.wp === 1) a.readyT = S.t; }
    const [x, y] = pts[a.wp];
    if (a.wp === pts.length - 1 && hyp(x - a.x, y - a.y) < 0.9) {
      if (a.readyT == null) a.readyT = S.t;
      // settle in the window, facing the quarterback
      a.faceT = ang(F.qb.x - a.x, F.qb.y - a.y);
      return seek(a, x, y, 0.4, 1.2);
    }
    // a route that ends on the back line is run under control so he can stop in time
    seek(a, clampX(x), y, 1, a.wp === pts.length - 1 && y >= BACK - 0.1 ? 2.6 : 0.2);
  }
  // adjust stride to arrive at the catch point with the ball
  function trackBall(a) {
    // off the release he runs to where the throw was meant to go, then reads the real flight as it develops:
    // his target slides from the aiming point to the landing spot (sharper receivers read it sooner),
    // so an under- or overthrow is a gradual adjustment instead of a late U-turn
    const b = S.ball, F = S.fp, left = Math.max(0.05, b.t0 + b.dur - S.t);
    const read = U.clamp((S.t - b.t0 - 0.12) / Math.max(0.25, b.dur * (0.62 - (a.R.awr - 70) * 0.006)), 0, 1);
    const ax = F.aimPt ? F.aimPt[0] : b.tx, ay = F.aimPt ? F.aimPt[1] : b.ty;
    meetSpot(a, ax + (b.tx - ax) * read, ay + (b.ty - ay) * read, left);
    a.faceT = ang(b.fx - a.x, b.fy - a.y);
  }
  const BACK = 108.5; // deepest a route or a drop goes: just inside the end line (110)
  // fit a route inside the end zone: anything past the back line runs to it, then settles there
  function fitRoute(pts) {
    const out = [];
    for (const [x, y] of pts) {
      const p = [x, Math.min(y, BACK)], q = out[out.length - 1];
      if (q && q[1] >= BACK - 0.01 && p[1] >= BACK - 0.01) { if (Math.abs(p[0] - q[0]) > 3) q[0] = q[0] + (p[0] - q[0]) * 0.5; continue; }
      out.push(p);
    }
    return out;
  }
  const flightT = (qb, dist) => dist / ballSpeed(qb) * (dist > 25 ? 1.1 : 1) + 0.1;
  // where a receiver will be in tf seconds if he keeps running his route
  // (runs the same steering + acceleration limits as the real body, so cuts cost time)
  function predict(a, tf) {
    if (!a.route) return [a.x + a.vx * tf, a.y + a.vy * tf];
    let x = a.x, y = a.y, vx = a.vx, vy = a.vy, i = a.wp;
    const h = 1 / 30, pts = a.route;
    for (let t = 0; t < tf; t += h) {
      while (i < pts.length - 1 && hyp(pts[i][0] - x, pts[i][1] - y) < 1.0) i++;
      const [px, py] = pts[i], dx = px - x, dy = py - y, d = hyp(dx, dy);
      let wx = 0, wy = 0;
      if (!(i === pts.length - 1 && d < 0.9) && d > 0.04) { const sp = Math.min(a.vmax, (d / 0.2) * a.vmax + 0.3); wx = dx / d * sp; wy = dy / d * sp; }
      let dvx = wx - vx, dvy = wy - vy;
      const dv = hyp(dvx, dvy), am = a.acc * h * (hyp(wx, wy) < hyp(vx, vy) ? 1.6 : 1);
      if (dv > am) { dvx *= am / dv; dvy *= am / dv; }
      vx += dvx; vy += dvy; x += vx * h; y += vy * h;
    }
    return [clampX(x), y];
  }
  function ballSpeed(qb) { return 17 + qb.R.str * 0.07; }
  // how open a receiver will be when the ball gets there (yards of cushion; < 0 = covered)
  function openness(r) {
    const F = S.fp, qb = F.qb, v = ballSpeed(qb);
    let tf = flightT(qb, d2(qb, r)), P2 = predict(r, tf);
    tf = flightT(qb, hyp(P2[0] - qb.x, P2[1] - qb.y)); P2 = predict(r, tf);
    tf = flightT(qb, hyp(P2[0] - qb.x, P2[1] - qb.y)); P2 = predict(r, tf);
    void v;
    let o = 9;
    for (const d of S.list) {
      if (d.side === r.side || d.down > 0.4) continue;
      const lag = (d.eng ? 0.9 : 0.3) + (d.ballReact || 0.3);
      const reach = d.vmax * Math.max(0, tf - lag) * 0.8 + 0.6;
      o = Math.min(o, hyp(d.x - P2[0], d.y - P2[1]) - reach);
      // underneath defender sitting in the throwing lane
      const sx = P2[0] - qb.x, sy = P2[1] - qb.y, L2 = sx * sx + sy * sy;
      if (L2 > 1 && !d.eng) {
        const u = ((d.x - qb.x) * sx + (d.y - qb.y) * sy) / L2;
        if (u > 0.15 && u < 0.9) {
          const perp = Math.abs((d.x - qb.x) * sy - (d.y - qb.y) * sx) / Math.sqrt(L2);
          if (perp < 1.2) o = Math.min(o, perp - 1.4);
        }
      }
    }
    const dist = hyp(P2[0] - qb.x, P2[1] - qb.y);
    return { o: o - Math.max(0, dist - 20) * 0.09, P: P2, tf, dist };
  }
  function qbBrain(a) {
    const F = S.fp, Q = F.qbp;
    if (F.loose) return looseBrain(a);
    if (F.mode !== 'pass') return;
    const t = S.t - S.snapT;
    if (S.carrier !== a) { seek(a, Q.drop[0], Q.drop[1], 0.7, 0.6); a.faceT = Math.PI / 2; return; }
    if (F.play.pa && t < 0.6) { seek(a, Q.mesh[0], Q.mesh[1], 0.8, 0.4); return; }
    // drop, then hang in the pocket and slide away from the heat
    let rush = null, rd = 99;
    for (const d of S.list) if (d.side !== a.side && d.down <= 0 && !d.eng) { const dd = d2(a, d); if (dd < rd) { rd = dd; rush = d; } }
    if (!Q.dropped) { if (seek(a, Q.drop[0], Q.drop[1], 0.95, 0.5) < 0.6) Q.dropped = true; }
    else if (rush && rd < 4) { seek(a, clampX(a.x - (rush.x - a.x) * 0.5), U.clamp(a.y + 0.4, F.L0 - 9, F.L0 - 2.5), 0.55, 0.6); }
    else seek(a, Q.drop[0], Q.drop[1], 0.3, 1);
    a.faceT = Math.PI / 2;
    if (t < Q.readStart || S.ball.mode !== 'held') return;
    const pressured = rd < 2.4;
    F.pressured = F.pressured || pressured;
    // screens: get it to the back once he's set up
    if (F.play.screen) {
      const r = S.ag['o' + F.play.screen];
      if (r && (r.readyT != null || t > Q.readStart + 0.9)) return throwTo(r, openness(r), pressured);
      return;
    }
    const reads = Q.reads.filter(r => !r.blocking);
    if (!reads.length) { if (t > 2.5) startScramble(); return; }
    if (S.t - Q.lastLook < 0.08) return;
    Q.lastLook = S.t;
    const ready = r => r.readyT != null || t > Q.readStart + 0.8;
    const cur = reads[Math.min(Q.ri, reads.length - 1)];
    const late = t - Q.readStart;
    const thr = 1.4 - late * 0.6 - (Q.ri >= reads.length - 1 ? 0.5 : 0);
    if (ready(cur)) { const op = openness(cur); if (op.o >= thr) return throwTo(cur, op, pressured); }
    // a wide-open man anywhere on the field
    if (Math.random() < 0.25 + a.R.awr * 0.004) {
      let best = null;
      for (const r of reads) if (ready(r)) { const op = openness(r); if (!best || op.o > best.op.o) best = { r, op }; }
      if (best && best.op.o >= 3.2) return throwTo(best.r, best.op, pressured);
      if (best && pressured && best.op.o >= -0.6) return throwTo(best.r, best.op, true);
    }
    if (S.t >= Q.riT + Q.dwell) { Q.ri = Math.min(Q.ri + 1, reads.length - 1); Q.riT = S.t; }
    // nothing there: take off, throw it away, or hang in
    const lane = !S.list.some(d => d.side !== a.side && d.down <= 0 && Math.abs(d.x - a.x) < 3.2 && d.y > a.y && d.y - a.y < 6 && !d.eng);
    if ((pressured && t > 1.6) || t > 3.6) {
      if (lane && Math.random() < 0.012 + (a.R.spd - 60) * 0.0012) return startScramble();
      if ((t > 3.8 || pressured) && Math.random() < 0.004 + a.R.awr * 0.00012) return throwAway(a);
    }
    if (t > 5.5) return lane ? startScramble() : throwAway(a);
  }
  function startScramble() {
    const F = S.fp, qb = F.qb;
    if (F.mode !== 'pass') return;
    F.mode = 'scramble'; F.cdir = 1;
    pop(qb.x, qb.y, 'SCRAMBLE', '#facc15');
    qb.brain = runnerBrain;
    for (const a of S.list) if (a.side !== qb.side) a.readT = Math.min(a.readT, S.t + 0.25 + Math.max(0, 80 - a.R.awr) * 0.006);
    for (const a of mates(qb)) if (a !== qb && !a.eng) setBlocker(a, 'run');
  }
  function throwAway(a) {
    const F = S.fp;
    F.mode = 'air'; F.res.outcome = 'throwaway'; F.throwT = S.t;
    pop(a.x, a.y, 'THROWN AWAY', '#cbd5e1');
    throwBall(a, [a.x < CX ? -3 : FW + 3, a.y + 14], 0.9, 3, () => { F.over = true; dead(); });
    S.carrier = null;
  }
  function throwTo(r, op, pressured) {
    const F = S.fp, qb = F.qb, p = P(qb.pid);
    const depth = op.P[1] - F.L0;
    const qbS = stkM(qb, 'dime', depth >= 15) + stkM(qb, 'iceveins', Engine.stk.clutch(gs)) + stkM(qb, 'trigger', F.play.cat === 'quick' || F.play.cat === 'screen') * 0.6 + (pressured ? stkM(qb, 'pocket') * 2.5 : 0);
    const wxp = Math.max(0, -Engine.stk.wxPass(gs, depth));
    let sig2 = (0.27 + op.dist * 0.029 + Math.max(0, op.dist - 18) * 0.035) * (1 + (72 - qb.R.acc) * 0.03) * (pressured ? 1.65 : 1) * (1 + wxp * 1.8) * (1 - soft(qbS, 0.35));
    sig2 = Math.max(0.08, sig2);
    // throw away from the nearest defender
    let nd = null, ndd = 99;
    for (const d of S.list) if (d.side !== qb.side && d.down <= 0) { const dd = hyp(d.x - op.P[0], d.y - op.P[1]); if (dd < ndd) { ndd = dd; nd = d; } }
    let tx = op.P[0], ty = op.P[1];
    if (nd && ndd < 4) { const k = U.clamp(0.25 + (qb.R.acc - 60) * 0.015, 0.1, 0.8) / Math.max(1, ndd); tx += (op.P[0] - nd.x) * k; ty += (op.P[1] - nd.y) * k; }
    const dx = op.P[0] - qb.x, dy = op.P[1] - qb.y, dl = hyp(dx, dy) || 1;
    const along = U.gauss(0, sig2 * 1.15), across = U.gauss(0, sig2 * 0.85);
    tx += dx / dl * along - dy / dl * across; ty += dy / dl * along + dx / dl * across;
    const flight = flightT(qb, hyp(tx - qb.x, ty - qb.y));
    F.mode = 'air'; F.throwT = S.t; F.target = r; F.aimPt = op.P; F.pressured = F.pressured || pressured;
    F.res.target = r.key.slice(1); F.res.air = ty - F.L0;
    if (pressured) pop(qb.x, qb.y, 'PRESSURE', '#fca5a5');
    throwBall(qb, [clampX(tx), ty], flight, 0.8 + Math.min(6, op.dist * 0.12), () => catchBall(r), 2.0, 1.4);
    for (const a of mates(qb)) if (a.blocking && !a.eng && a.pos !== 'OL') a.blockT = a.blockT || null;
  }
  // the ball arrives: receiver vs defender at the catch point
  function catchBall(r) {
    const F = S.fp, b = S.ball, bx = b.x, by = b.y;
    const dR = hyp(r.x - bx, r.y - by);
    let D = null, dD = 9;
    for (const d of S.list) if (d.side !== r.side && d.down <= 0) { const dd = hyp(d.x - bx, d.y - by); if (dd < dD) { dD = dd; D = d; } }
    if (r.x < 0 || r.x > FW || r.y > 110) { F.res.outcome = 'incomplete'; F.over = true; pop(clampX(bx), by, 'OUT OF BOUNDS', '#cbd5e1'); return at(S.t + 0.8, () => dead()); }
    const reachR = 1.3 + (r.R.skl - 60) * 0.005, reachD = D ? 1.05 + (D.R.skl - 60) * 0.004 : 0;
    const depth = by - F.L0;
    const rS = soft(stkM(r, 'gluehands', dD < 1.6) + stkM(r, 'redzone', Engine.stk.redZone(gs)) * 0.3, 0.3);
    const incomplete = (pbu, drop) => {
      F.res.outcome = 'incomplete'; F.res.pbu = pbu ? pbu.key.slice(1) : null; F.res.drop = !!drop; F.over = true;
      if (pbu) { b.vx = U.rand(-4, 4); b.vy = U.rand(-2, 2); b.vz = 5; pop(bx, by, 'BROKEN UP', '#fca5a5'); burst(bx, by, 'rgba(252,165,165,.9)', 10); }
      else pop(bx, by, drop ? 'DROPPED' : 'INCOMPLETE', '#cbd5e1');
      at(S.t + 0.8, () => dead());
    };
    // defender gets there first
    if (D && dD < reachD && dD <= dR + 0.2) {
      let pI = 0.18 + (D.R.skl - 70) * 0.006 + (dR > reachR ? 0.22 : 0) - dD * 0.12;
      if (stkP(D, 'ballhawk', true, 0.5)) pI += 0.3;
      if (depth >= 15 && dR < reachR && stkP(r, 'mossd', true, 0.4)) return caught(r, D);
      if (Math.random() < pI) return intercepted(D);
      if (dR < reachR && Math.random() < 0.22 + (r.R.skl - D.R.skl) * 0.01 + rS) return caught(r, D);
      return incomplete(D);
    }
    if (dR <= reachR) {
      const contest = D && dD < 1.8 ? (1.8 - dD) * 0.24 + (D.R.cover - r.R.route) * 0.004 : 0;
      const pc = 0.955 + (r.R.skl - 70) * 0.004 - contest * 1.2 - (dR / reachR) * 0.08 + rS;
      if (Math.random() < pc) { if (contest > 0.2 && rS > 0.1) stkPop(r, 'gluehands', 1); return caught(r, D); }
      return incomplete(contest > 0.15 ? D : null, contest <= 0.15);
    }
    if (D && dD < 1.5 && Math.random() < 0.07 + (D.R.skl - 70) * 0.003) return intercepted(D);
    incomplete(null);
  }
  function caught(r, D) {
    const F = S.fp;
    holdBall(r);
    r.vx *= 0.65; r.vy *= 0.65; r.secureT = S.t + 0.3; // securing the catch costs a step
    F.caught = true; F.mode = 'yac'; F.res.outcome = 'complete'; F.res.carrier = r.key.slice(1); F.catchY = r.y; F.cdir = 1;
    burst(r.x, r.y, 'rgba(255,255,255,.6)', 5, 1.5);
    Sfx.play('catch');
    r.brain = runnerBrain; r.route = null; r.lane = null;
    for (const a of S.list) {
      if (a === r) continue;
      if (a.side === r.side) { if (!a.eng) setBlocker(a, 'run'); }
      else a.readT = S.t;
    }
  }
  function intercepted(pk) {
    const F = S.fp;
    holdBall(pk);
    F.mode = 'intret'; F.res.outcome = 'int'; F.res.picker = pk.key.slice(1); F.cdir = -1; F.goal = 0; F.noFumble = true;
    pop(pk.x, pk.y, 'INTERCEPTED!', '#fca5a5', { big: true });
    slowMo(1.0); excite = Math.max(excite, 0.8);
    shake = 0.8; burst(pk.x, pk.y, 'rgba(252,165,165,.9)', 16);
    S.dirUp = -1;
    if (pk.y > 100) { F.res.touchback = true; F.over = true; pk.pose = 'kneel'; pk.brain = stop; at(S.t + 0.7, () => dead(() => pop(pk.x, pk.y, 'TOUCHBACK', '#cbd5e1'))); return; }
    pk.brain = runnerBrain; pk.lane = null;
    for (const a of S.list) {
      if (a === pk) continue;
      if (a.side === pk.side) { if (a.eng) release(a.eng); setBlocker(a, 'run'); }
      else { if (a.eng) release(a.eng); a.brain = pursue; }
    }
  }

  function passPlay(det, play, dplay) {
    const F = newFP(det, play, dplay), L0 = det.los, A = k => S.ag[k];
    const qb = A('oQB'), c = A('oC'), fl = det.flip ? -1 : 1;
    const under = qb.y > L0 - 2;
    if (under) holdBall(qb); else throwBall(c, [qb.x, qb.y], 0.25, 0.25, () => holdBall(qb), 0.4, 1.1);
    const dropD = { 1: 1, 3: 1.5, 5: 2.5, 6: 3, 7: 3.6 }[play.drop] || 2.5;
    const dropY = under ? L0 - 1.3 - dropD * 1.9 : L0 - 5 - dropD * 0.7;
    F.qbp = {
      drop: [play.boot ? clampX(CX + fl * 7) : CX, play.boot ? L0 - 6 : dropY],
      mesh: [CX + (A('oRB').x >= CX ? 0.8 : -0.8), under ? L0 - 4 : L0 - 5],
      readStart: ({ 1: 0.3, 3: 0.7, 5: 1.05, 6: 1.3, 7: 1.45 }[play.drop] || 1.05) + (play.pa ? 0.35 : 0) - stkQ(qb, 'trigger', play.cat === 'quick' || play.cat === 'screen') * 0.8,
      reads: play.reads.map(s => A('o' + s)).filter(Boolean), ri: 0, riT: 0, lastLook: 0,
      dwell: U.clamp(0.62 - (qb.R.awr - 70) * 0.007 - stkQ(qb, 'general') * 1.5, 0.28, 0.85),
    };
    F.qbp.riT = S.snapT + F.qbp.readStart;
    qb.brain = qbBrain;
    // protection
    for (const k of ['LT', 'LG', 'C', 'RG', 'RT']) { const a = A('o' + k); setBlocker(a, 'pass', [a.mark[0] + (a.mark[0] - CX) * 0.12, L0 - 1.6]); a.blocking = true; }
    for (const [slot, [kind, d]] of Object.entries(play.routes)) {
      const a = A('o' + slot);
      if (!a) continue;
      if (kind === 'block' || play.prot.includes(slot)) { setBlocker(a, 'pass', [a.x + (a.x < CX ? -0.5 : 0.5), L0 - 3]); a.blocking = true; continue; }
      if (kind === 'stalk') { setBlocker(a, 'run'); a.blocking = true; continue; }
      const sx = a.x - CX, inn = Playbook.inward(sx, slot);
      a.route = fitRoute(Playbook.routePts(kind, d, sx, inn).map(([x, y]) => [clampX(CX + x), L0 + y]));
      a.wp = 0; a.readyT = null;
      if (kind === 'go' || kind === 'seam') a.readyT = null;
      F.routers.push(a);
      if (kind === 'check') {
        // check-release: block first, release if nobody comes
        a.blocking = true;
        setBlocker(a, 'pass', [a.x, L0 - 3]);
        const blockB = a.brain;
        a.brain = b => {
          if (b.blocking && S.t - S.snapT > 1.2 && !b.eng) { b.blocking = false; b.blockT = null; }
          return b.blocking ? blockB(b) : routeBrain(b);
        };
      } else a.brain = routeBrain;
      if (play.pa && slot === 'RB') { const rb = a; const rb0 = a.brain; rb.brain = b => (S.t - S.snapT < 0.65 ? seek(b, F.qbp.mesh[0], F.qbp.mesh[1] + 0.3, 0.8, 0.4) : rb0(b)); }
    }
    if (play.screen === 'RB') at(S.snapT + 1.1, () => { for (const k of ['LT', 'LG', 'C', 'RG', 'RT']) { const a = A('o' + k); if (a.eng) release(a.eng); setBlocker(a, 'run'); } });
    if (play.pa) { F.fakeUntil = S.snapT + 1.4; for (const a of S.list) if (a.side !== S.o) a.biteT = U.clamp(0.25 + (85 - a.R.awr) * 0.02, 0.15, 1.1); }
    assignDefense(dplay, F);
    S.focus = () => { const p = ballPos(); return S.ball.mode === 'air' ? [p.x, p.y + 2] : S.carrier === qb ? [CX, L0 + 6] : [p.x, p.y + 4]; };
    S.onTackle = () => finalePop();
  }

  function runPlay(det, play, dplay) {
    const F = newFP(det, play, dplay), L0 = det.los, A = k => S.ag[k];
    const qb = A('oQB'), c = A('oC'), run = play.run, sc = run.scheme;
    const holeX = CX + Playbook.hole(play, det.flip), side = Math.sign(holeX - CX) || 1;
    F.hole = holeX; F.scheme = sc; F.draw = sc === 'draw';
    F.aimW = sc === 'draw' ? 1.0 : sc === 'zone' ? 2.0 : sc === 'toss' || sc === 'stretch' || sc === 'sneak' ? 3.2 : 2.5; // read plays let the back find the crease; gap plays hit the called hole
    const under = qb.y > L0 - 2;
    const car = run.carrier === 'QB' ? qb : A('oRB');
    if (under) holdBall(qb); else throwBall(c, [qb.x, qb.y], 0.25, 0.25, () => holdBall(qb), 0.4, 1.1);
    // the back's track to the mesh point and the aiming point at the line
    const aimY = sc === 'sneak' ? L0 + 1.5 : L0 - 0.4;
    const qy0 = qb.y; // draw: the QB shows pass with a short fixed drop, and the mesh is at the end of it
    const mesh = sc === 'toss' ? null : sc === 'stretch' ? [qb.x + side * 1.6, qb.y + 0.3] : sc === 'draw' ? [qb.x + side * 0.7, (under ? L0 - 3.6 : qy0) - 0.6] : [qb.x + side * 0.7, under ? L0 - 3.6 : qb.y + 0.2];
    const track = sc === 'counter' ? [[car.x - side * 0.9, car.y + 0.2], mesh] : sc === 'draw' ? [[car.x, car.y], mesh] : sc === 'toss' ? [[holeX - side * 2.5, L0 - 4.2]] : [mesh];
    let ti = 0;
    const handT = sc === 'draw' ? 0.65 : sc === 'counter' ? 0.62 : 0.45;
    const startRun = runner => {
      if (F.mode !== 'mesh') return;
      F.mode = 'run'; F.carrierKey = runner.key;
      if (runner !== qb) holdBall(runner);
      F.aim = [holeX, aimY]; F.aimUntil = S.t + 0.5;
      runner.brain = runnerBrain; runner.lane = null;
      if (sc === 'draw') {
        // the back reads the rush: he hits the widest crease the inside rushers have left
        const xs = S.list.filter(d => d.side !== S.o && d.pos === 'DL' && Math.abs(d.x - CX) < 6).map(d => d.x).concat([CX - 5, CX + 5]).sort((p, q) => p - q);
        let gx = holeX, gw = 0;
        for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > gw) { gw = xs[i] - xs[i - 1]; gx = (xs[i] + xs[i - 1]) / 2; }
        F.aim = [gx, aimY]; F.hole = gx;
        // the pass sets become run blocks: ride each rusher past the hole, away from where the back is going
        for (const ol of order) {
          const e = ol.eng;
          if (e && e.a === ol && e.mode === 'pass') {
            // he's already up the field: the blocker uses that momentum to turn him and wash him wide
            e.mode = 'run'; e.t0 = S.t;
            e.m = e.sd = ol.R.rblk - e.d.R.rdef + 4 + U.gauss(0, 5);
            e.dir = [(Math.sign(e.d.x - gx) || 1) * 1.0, -0.2]; e.rate = 1.1;
          }
          setBlocker(ol, 'run');
        }
        // whoever is uncovered climbs to the linebackers, who dropped into coverage and now come downhill
        for (const ol of order) {
          if (ol.eng || S.list.some(d => d.side !== S.o && d.pos === 'DL' && !d.eng && d2(ol, d) < 3)) continue;
          let best = null, bd = 12;
          for (const d of S.list) if (d.side !== S.o && d.pos === 'LB' && !d.eng && !order.some(o => o.blockT === d)) { const dd = d2(ol, d); if (dd < bd) { bd = dd; best = d; } }
          ol.blockT = best;
        }
      }
      setReads(0.05);
      if (runner !== qb) qb.brain = b => seek(b, clampX(CX - side * 5), L0 - 6.5, 0.55); // carry out the fake
    };
    if (car === qb) {
      const t0 = sc === 'qbdraw' ? 0.75 : 0.2;
      qb.brain = b => { if (S.carrier === b && S.t - S.snapT >= t0) return startRun(b); seek(b, CX, L0 - (sc === 'qbdraw' ? 6 : 1.6), 0.5); };
    } else {
      qb.brain = b => {
        if (sc === 'toss') { if (S.carrier === b && S.t - S.snapT > 0.3 && F.mode === 'mesh') { F.mode = 'pitch'; throwBall(b, predict(car, 0.4), 0.4, 0.6, () => { F.mode = 'mesh'; startRun(car); car.secureT = S.t + 0.3; }, 1.2, 1.1); } return seek(b, b.x - side * 0.6, b.y - 0.6, 0.4); }
        if (sc === 'draw' && S.t - S.snapT < 0.5) return seek(b, CX, (under ? L0 - 3.6 : qy0) - 1.1, 0.5, 0.3);
        seek(b, mesh[0] - side * 0.5, mesh[1], 0.6, 0.5);
      };
      car.brain = b => {
        if (F.mode !== 'mesh' && F.mode !== 'pitch') return;
        if (sc === 'draw' && S.t - S.snapT < 0.35) return seek(b, b.x, b.y, 0.2);
        const [tx, ty] = track[Math.min(ti, track.length - 1)];
        if (ti < track.length - 1 && hyp(tx - b.x, ty - b.y) < 0.8) ti++;
        // the back takes the ball moving: in the last beat before the exchange he runs through the mesh, downhill
        if (sc !== 'toss' && ti === track.length - 1 && S.t - S.snapT >= handT - (sc === 'draw' ? 0.1 : 0.25) && S.carrier === qb) seek(b, tx + (holeX - tx) * 0.3, ty + 1.6, 0.95, 0.05);
        else seek(b, tx, ty, 0.95, 0.3);
        if (sc !== 'toss' && S.carrier === qb && d2(b, qb) < 1.25 && S.t - S.snapT >= handT) startRun(b);
      };
      if (sc === 'toss') car.route = [[holeX - side * 2.5, L0 - 4.2], [holeX, L0 - 1]];
    }
    // blocking scheme
    const OLk = ['LT', 'LG', 'C', 'RG', 'RT'].map(k => A('o' + k));
    // gap schemes pull from the backside — by where the linemen stand, since a flipped play mirrors the labels
    const gap = sc === 'power' || sc === 'counter';
    const back = o => (o.x - CX) * side < 0;
    const pullers = gap ? [[A('oLG'), A('oRG')].find(back)].concat(sc === 'counter' ? [[A('oLT'), A('oRT')].find(back)] : []).filter(Boolean) : [];
    const cand = S.list.filter(d => d.side !== S.o && d.y - L0 < 7.5 && Math.abs(d.x - CX) < 11);
    const taken = new Set();
    const lean = sc === 'stretch' || sc === 'toss' ? 1.6 : gap ? -1.0 : 1.0;
    // on a gap scheme an attached playside tight end blocks down with the line, leaving the end man for the puller
    const te = A('oTE'), teDown = gap && te && te !== car && te.y > L0 - 3 && Math.abs(te.x - CX) < 8 && !back(te);
    const order = OLk.concat(teDown ? [te] : []).filter(o => !pullers.includes(o)).sort((a, b) => (b.x - a.x) * side);
    for (const ol of order) {
      let best = null, bs = 99;
      for (const d of cand) {
        if (taken.has(d)) continue;
        const cost = Math.abs(d.x - (ol.x + side * lean)) + Math.max(0, d.y - L0 - 1.5) * 0.55 + (d.pos === 'DL' ? 0 : 0.6);
        if (cost < bs) { bs = cost; best = d; }
      }
      if (best && bs >= 5.5) best = null;
      if (best) taken.add(best);
      if (sc === 'draw') {
        // draw: the line shows pass, inviting the rush upfield; the blocks turn into run blocks at the handoff
        setBlocker(ol, 'pass', [ol.mark[0] + (ol.mark[0] - CX) * 0.12, L0 - 0.8]);
        ol.blocking = true;
        continue;
      }
      setBlocker(ol, 'run');
      ol.blockT = best;
    }
    for (const k of ['TE', 'WR1', 'WR2', 'WR3', 'RB']) {
      const a = A('o' + k);
      if (!a || a === car || (teDown && a === te)) continue;
      setBlocker(a, 'run');
      a.blocking = true;
      if (k === 'TE' && a.y < L0 - 3) {
        // fullback: lead up through the hole, then take the first defender who shows
        const lead = blockBrain('run');
        a.brain = b => (S.t - S.snapT < 0.9 && !b.eng && b.y < L0 + 0.5 ? seek(b, holeX - side * 0.4, L0 + 0.6, 1, 0.3) : lead(b));
        continue;
      }
      if (k !== 'RB') { let best = null, bd = 99; for (const d of S.list) if (d.side !== S.o && !taken.has(d) && (k === 'TE' || d.pos !== 'DL')) { const dd = d2(a, d); if (dd < bd) { bd = dd; best = d; } } if (best && bd < 8) { a.blockT = best; taken.add(best); } }
      else a.brain = b => (S.t - S.snapT < 0.8 ? seek(b, holeX - side * 1.5, L0 - 1.5, 0.9) : blockBrain('run')(b));
    }
    // pullers go last: the guard kicks out the first free man at the point of attack, the counter tackle wraps up to the next
    pullers.forEach((p, i) => {
      p.pulling = true;
      setBlocker(p, 'run');
      let best = null, bs = 99;
      for (const d of cand) {
        if (taken.has(d)) continue;
        const dy = d.y - L0, cost = Math.abs(d.x - holeX) + Math.max(0, dy) * 0.45 + (i === 0 && dy > 2.5 ? 2.5 : 0) + ((d.x - holeX) * side < -2 ? 3 : 0);
        if (cost < bs) { bs = cost; best = d; }
      }
      if (best && bs < 8) { p.blockT = best; taken.add(best); }
      // pull flat behind the line at full speed until level with his man (or the hole), then turn up and hit him
      const pb = p.brain;
      let turned = false;
      p.brain = b => {
        const t = b.blockT, tx = t ? U.clamp(t.x, holeX - side * 1.5, holeX + side * 4) : holeX;
        if (!turned && !b.eng && (tx - b.x) * side > 1 && S.t - S.snapT < 1.1) return seek(b, tx - side * 0.6, L0 - 1.5, 1, 0.1);
        turned = true;
        pb(b);
      };
    });
    assignDefense(dplay, F);
    setReads(sc === 'draw' ? 0.7 : 0.3); // a draw sells pass: the defense reads it late
    S.focus = () => { const p = ballPos(); return [p.x, p.y + 4]; };
    S.onTackle = () => finalePop();
  }
  function finalePop() {
    const F = S.fp, c = S.carrier;
    if (!c || !F || F.L0 == null) return;
    const y = Math.round((F.recovered ? F.spotY : spotOf(c)) - F.L0);
    if (F.mode === 'intret') return;
    if (F.kind === 'run' && y <= 0) pop(c.x, c.y, y < 0 ? `STUFFED ${y}` : 'NO GAIN', '#fca5a5');
    else if (y >= 15) pop(c.x, c.y, `+${y} YDS`, '#86efac', { big: true });
    else pop(c.x, c.y, y >= 0 ? `+${y}` : `${y}`, y >= 0 ? '#ffffff' : '#fca5a5');
  }
  // what happened, in the engine's terms
  function snapResult() {
    const F = S.fp, r = { ...F.res };
    r.pressured = !!F.pressured; r.broke = F.broke || 0;
    const slot = a => (a ? a.key.slice(1) : null);
    if (r.outcome === 'incomplete' || r.outcome === 'throwaway') return r;
    if (r.outcome === 'int') {
      const pk = S.ag['d' + r.picker], y = F.spotY ?? spotOf(pk);
      r.td = !!F.td; r.endOpp = 100 - y;
      r.tackler = F.tackler ? slot(F.tackler) : null;
      return r;
    }
    const c = F.recovered && F.loose ? F.loose.by : S.carrier && S.carrier.side === F.offSide ? S.carrier : (F.loose && F.loose.by) || F.qb;
    const spotY = F.spotY != null ? F.spotY : spotOf(c);
    r.carrier = slot(c);
    r.yards = spotY - F.L0;
    r.td = !!F.td; r.oob = !!F.oob; r.slide = !!F.slide;
    r.tackler = F.tackler && F.tackler.side !== F.offSide ? slot(F.tackler) : null;
    if (F.loose) r.fumble = { lost: F.recovered && F.recovered.side !== F.offSide, rec: F.recovered ? slot(F.recovered) : null };
    if (F.caught) { r.outcome = 'complete'; r.yac = spotY - F.catchY; }
    else if (c === F.qb && F.mode === 'pass') { r.outcome = 'sack'; r.sacker = r.tackler; }
    else if (c === F.qb && F.mode === 'scramble') r.outcome = 'scramble';
    else r.outcome = 'run';
    if (r.outcome === 'run') {
      const x = F.hole != null ? F.hole - CX : 0;
      r.lane = Math.abs(x) > 6 ? (x < 0 ? ' around the left end' : ' around the right end') : Math.abs(x) > 2.2 ? (x < 0 ? ' off left tackle' : ' off right tackle') : ' up the middle';
    }
    return r;
  }
  function kneelPlay(det) {
    presnapPlain(det, () => {
      const qb = S.ag.oQB;
      throwBall(S.ag.oC, [qb.x, qb.y], 0.22, 0.2, () => { holdBall(qb); qb.pose = 'kneel'; pop(qb.x, qb.y, 'VICTORY FORMATION', '#cbd5e1'); at(S.t + 1.0, () => dead()); }, 0.4, 1.1);
      for (const a of S.list) if (a !== qb) a.brain = b => seek(b, b.x, b.y + (b.side === S.o ? 0.3 : -0.3), 0.3);
      S.focus = () => [CX, S.los + 3];
    });
  }
  function presnapPlain(det, start) {
    if (!S || S.kind !== 'lineup' || S.o !== det.o) {
      newScene(det.o, det.los, det.los + (gs._togoAtSnap || 10), 'play');
      placeFormation(det.o, det.los, det.O, det.D, 'base', false);
    }
    S.kind = 'play'; S.ready = false; S.readyFn = null;
    S.ball = { mode: 'spot', x: CX, y: det.los, z: 0.15 };
    breakHuddle(det.o, () => {
      pop(S.ag.oQB.x, S.ag.oQB.y, 'SET...', '#e2e8f0', { life: 0.6 });
      at(S.t + 0.45, () => { S.snapT = S.t; start(); });
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
    for (const a of cover) a.brain = b => (pt() < 0.6 ? stop(b) : seek(b, b.x * 0.75 + landX * 0.25, Math.min(land, 100) - 12, 0.8, 2.5));
    // the return unit drops back early and settles facing upfield, so it can attack the coverage at the catch
    for (const a of recv) if (a !== ret) a.brain = b => { if (pt() < 0.25) return stop(b); seek(b, b.mark[0] * 0.75 + landX * 0.25, Math.max(b.mark[1], land - (b.mark[1] < 55 ? 25 : 15)), 0.9, 2.2); b.faceT = -Math.PI / 2; };
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
        // deep in the end zone: take a knee
        if (ret.y > 103.2 && Math.random() < 0.85) {
          ret.pose = 'kneel'; ret.brain = a => stop(a);
          pop(ret.x, ret.y, 'TOUCHBACK', '#cbd5e1');
          for (const c of cover) c.brain = x => seek(x, x.x, Math.min(x.y + 4, 80), 0.4);
          S.result = () => ({ touchback: true });
          at(S.t + 1.0, () => dead());
          return;
        }
        startReturn(ret, cover.concat(kicker), recv.filter(a => a !== ret), land);
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
          S.dirUp = -1;
          startReturn(ret, coverTeam.concat(punter), S.list.filter(a => a.side === d && a !== ret), land);
        }, 1.5, 1.6);
      });
    });
  }
  // A free kick/punt return: the returner reads his blocks, coverage pursues and tackles.
  function startReturn(ret, cover, blockers, land) {
    for (const a of S.list) { const keepV = a.vmax; rateAgent(a); if (a.pos === 'K') a.vmax = keepV; }
    const F = { kind: 'ret', mode: 'ret', cdir: -1, goal: 0, L0: null, offSide: ret.side, noFumble: true, qb: null, res: {}, broke: 0, over: false, routers: [], hole: null };
    S.fp = F; S.free = true; S.dirUp = -1;
    ret.brain = runnerBrain; ret.lane = null;
    for (const c of cover) { if (c.eng) release(c.eng); c.readT = 0; c.brain = pursue; }
    // each blocker takes the nearest coverage man in his lane (greedy closest pairs); the kicker is usually left over
    for (const b of blockers) { if (b.eng) release(b.eng); setBlocker(b, 'run'); b.blockT = null; }
    const pairs = [];
    for (const b of blockers) for (const c of cover) pairs.push([Math.abs(b.x - c.x) * 1.4 + Math.abs(b.y - c.y) * 0.6, b, c]);
    pairs.sort((p, q) => p[0] - q[0]);
    const takenC = new Set();
    for (const [, b, c] of pairs) if (!b.blockT && !takenC.has(c)) { b.blockT = c; takenC.add(c); }
    S.onTackle = () => pop(ret.x, ret.y, `${Math.max(0, Math.round(land - spotOf(ret)))} YD RETURN`, '#ffffff');
    S.result = () => {
      const y = F.spotY != null ? F.spotY : spotOf(ret);
      return { end: 100 - y, td: !!F.td, tacklerPid: F.tackler ? F.tackler.pid : null, broke: F.broke || 0 };
    };
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
    if (!det) { if (onDone) onDone(null); return; }
    const attach = () => {
      if (!S) return onDone && onDone(null);
      S.onDone = onDone;
      S.det = det;
      const sc = S;
      S.watchdog = setTimeout(() => { if (S === sc && S.onDone) { const cb = S.onDone; S.onDone = null; cb(null); } }, 40000 / Math.max(1, speed));
    };
    try {
      if (det.type === 'snap') presnap(det, (pl, dp) => { (pl.kind === 'run' ? runPlay : passPlay)(det, pl, dp); S.result = snapResult; });
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
  const VIEW_W = 32;
  let sc = 10;
  const SX = x => (x - cam.x) * sc + W / 2;
  // the field's horizon line moves up when the play-call panel covers the bottom of the canvas
  const baseY = () => (H - insetCur) * (0.6 - 0.12 * Math.min(1, insetCur / 220));
  const SY = y => baseY() - (y - cam.y) * sc;
  function updateCamera(dt) {
    if (!S) return;
    const f = S.focus ? S.focus() : [CX, (S.los ?? 30) + 4];
    if (!isFinite(f[0]) || !isFinite(f[1])) { if (!S._nanWarned) { S._nanWarned = true; console.warn("camera focus NaN", S.kind, JSON.stringify({ ball: S.ball.mode, los: S.los, bx: S.ball.x, by: S.ball.y, tx: S.ball.tx, holder: S.ball.holder && S.ball.holder.key })); } return; }
    const k = 1 - Math.exp(-dt * 2.8);
    const half = (W / sc) / 2;
    cam.x += (U.clamp(f[0], Math.min(CX, half - 1.5), Math.max(CX, FW - half + 1.5)) - cam.x) * k;
    // don't wander far past the end lines: a few rows of stands, never a screen full of crowd
    let ty = f[1] - 2;
    const hiY = 116 - baseY() / sc, loY = -16 + (H - baseY()) / sc;
    if (hiY > loY) ty = U.clamp(ty, loY, hiY);
    cam.y += (ty - cam.y) * k;
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
      if (S.replay) drawReplay();
      drawBallTrail();
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
    if (hit > 0) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const hg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.9); hg.addColorStop(0, `rgba(255,255,255,${0.42 * hit})`); hg.addColorStop(1, `rgba(255,255,255,${0.08 * hit})`); ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H); }
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
    crowdTile = makeCrowd();
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
  // A tile of stadium seating seen from above: stepped rows, fans in both teams' colours (home-heavy).
  // 12 px per yard; one row per yard so the tile repeats seamlessly.
  let crowdTile = null;
  function makeCrowd() {
    const PX = 12, c = document.createElement('canvas');
    c.width = 24 * PX; c.height = 12 * PX;
    const g = c.getContext('2d');
    const h = L.team(gs.t[0]).logo, v = L.team(gs.t[1]).logo;
    const shirts = [h.primary, h.primary, h.primary, h.secondary, h.secondary, v.primary, v.secondary, '#e5e7eb', '#475569', '#1f2937'];
    const skin = ['#f3cfb1', '#e0ac85', '#c48a5f', '#9a6440', '#6e4428', '#4a2d1b'];
    for (let r = 0; r < 12; r++) {
      const y = r * PX;
      g.fillStyle = r % 2 ? '#2a3240' : '#222935'; g.fillRect(0, y, c.width, PX);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y + PX - 2, c.width, 2);          // step riser
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, y, c.width, 1);
      for (let x = 5; x < c.width; x += 0.8 * PX) {
        if (Math.random() < 0.1) continue;                                          // empty seat
        const cx = x + U.rand(-1.2, 1.2), cy = y + PX * 0.5 + U.rand(-0.8, 0.8);
        g.fillStyle = U.pick(shirts); g.beginPath(); g.ellipse(cx, cy + 1.6, 3.7, 2.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = U.pick(skin); g.beginPath(); g.arc(cx, cy - 0.6, 2, 0, Math.PI * 2); g.fill();
      }
    }
    return c;
  }
  // Behind each end line: apron, padded wall in home colours, then the stands rising away from the field.
  function drawEnds(yBot, yTop) {
    if (!crowdTile) return;
    const x0 = -18, x1 = FW + 18, home = L.team(gs.t[0]);
    for (const dir of [1, -1]) {
      const line = dir > 0 ? 110 : -10, wall = line + dir * 3.5, front = wall + dir * 0.9, far = line + dir * 45;
      if (dir > 0 ? wall > yTop : wall < yBot) continue;
      const lo = (a, b) => Math.min(a, b), hi = (a, b) => Math.max(a, b);
      // stands
      // rows shrink as they rise away from the field (a hint of perspective)
      const pat = ctx.createPattern(crowdTile, 'repeat');
      for (let b = 0, y0 = front; b < 10; b++) {
        const depth = 4.5, y1 = y0 + dir * depth, k2 = 1.18 - b * 0.07;
        ctx.save();
        ctx.beginPath(); ctx.rect(SX(x0), SY(hi(y0, y1)), (x1 - x0) * sc, depth * sc); ctx.clip();
        ctx.translate(SX(x0), SY(y0)); ctx.scale(sc / 12 * k2, sc / 12 * k2);
        ctx.fillStyle = pat;
        const hpx = depth * 12 / k2 + 12;
        ctx.fillRect(0, dir > 0 ? -hpx : 0, (x1 - x0) * 12 / k2, hpx);
        ctx.restore();
        y0 = y1;
      }
      // the crowd comes alive on big plays: a wave rolls across and camera flashes pop
      if (excite > 0.05) {
        const wave = x0 + ((performance.now() / 1000 * 22) % (x1 - x0));
        const wg = ctx.createLinearGradient(SX(wave - 5), 0, SX(wave + 5), 0);
        wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(0.5, `rgba(255,255,255,${0.16 * excite})`); wg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = wg; ctx.fillRect(SX(wave - 5), SY(hi(front, far)), 10 * sc, Math.abs(far - front) * sc);
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        for (let i = 0; i < 26 * excite; i++) { const fx = SX(x0 + Math.random() * (x1 - x0)), fy = SY(front + dir * Math.random() * 30); ctx.fillRect(fx, fy, 2, 2); }
      }
      // banners in team colours hung over the front rows
      for (let bx = x0 + 3, n = 0; bx < x1 - 4; bx += 11, n++) {
        const col = n % 2 ? home.logo.secondary : home.logo.primary, by0 = front + dir * 0.4, by1 = front + dir * 2.1;
        fieldRect(bx, lo(by0, by1), bx + 6, hi(by0, by1), col);
        ctx.fillStyle = U.onColor(col) === '#ffffff' ? 'rgba(255,255,255,.9)' : 'rgba(10,15,23,.85)';
        ctx.font = `700 ${Math.max(7, Math.round(sc * 0.9))}px Oswald, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(n % 3 === 1 ? home.mascot.toUpperCase() : home.abbr, SX(bx + 3), SY((by0 + by1) / 2));
      }
      // aisles with steps
      for (let ax = x0 + 6; ax < x1; ax += 15) {
        fieldRect(ax, lo(front, far), ax + 1.2, hi(front, far), '#4b5466');
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
        for (let y = front; dir > 0 ? y < far : y > far; y += dir) { ctx.beginPath(); ctx.moveTo(SX(ax), SY(y)); ctx.lineTo(SX(ax + 1.2), SY(y)); ctx.stroke(); }
      }
      // upper rows recede into shadow
      const g = ctx.createLinearGradient(0, SY(front), 0, SY(far));
      g.addColorStop(0, 'rgba(5,8,14,0)'); g.addColorStop(1, 'rgba(5,8,14,.6)');
      ctx.fillStyle = g; ctx.fillRect(SX(x0), SY(hi(front, far)), (x1 - x0) * sc, Math.abs(far - front) * sc);
      // apron between the end line and the wall
      fieldRect(x0, lo(line + dir * 2.2, wall), x1, hi(line + dir * 2.2, wall), 'rgba(40,46,58,.55)');
      // padded wall: home colours with a white trim line and the home abbreviation
      fieldRect(x0, lo(wall, front), x1, hi(wall, front), U.mix(home.logo.primary, '#000000', 0.15));
      fieldRect(x0, lo(wall, wall + dir * 0.12), x1, hi(wall, wall + dir * 0.12), 'rgba(255,255,255,.85)');
      ctx.fillStyle = U.onColor(home.logo.primary) === '#ffffff' ? 'rgba(255,255,255,.85)' : 'rgba(10,15,23,.8)';
      ctx.font = `700 ${Math.max(8, Math.round(sc * 0.62))}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let tx = x0 + 4; tx < x1; tx += 9) ctx.fillText(home.abbr, SX(tx), SY(wall + dir * 0.5));
      // shadow the wall casts onto the apron
      const sg = ctx.createLinearGradient(0, SY(wall), 0, SY(wall - dir * 1.2));
      sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.fillRect(SX(x0), SY(hi(wall, wall - dir * 1.2)), (x1 - x0) * sc, 1.2 * sc);
    }
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
    const yTop = cam.y + baseY() / sc + 2, yBot = cam.y - (H - baseY()) / sc - 2;
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
    // the stadium behind each end zone
    drawEnds(yBot, yTop);
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
      // NFL hashes: 18 ft 6 in apart, in line with the goalposts
      for (const hx of [CX - 3.08, CX + 3.08]) { ctx.beginPath(); ctx.moveTo(SX(hx - 0.5), SY(y)); ctx.lineTo(SX(hx + 0.5), SY(y)); ctx.stroke(); }
      for (const hx of [0.5, FW - 0.5]) { ctx.beginPath(); ctx.moveTo(SX(hx - 0.4), SY(y)); ctx.lineTo(SX(hx + 0.4), SY(y)); ctx.stroke(); }
    }
    for (const py of [2, 98]) if (py > yBot && py < yTop) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SX(CX - 0.5), SY(py)); ctx.lineTo(SX(CX + 0.5), SY(py)); ctx.stroke(); }
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
      // red zone: a faint red wash inside the 20
      if (S.los >= 80 && S.kind === 'play') {
        fieldRect(0, 80, FW, 100, 'rgba(239,68,68,.08)');
        ctx.save(); ctx.translate(SX(1.6), SY(90)); ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(254,202,202,.55)'; ctx.font = `700 ${Math.round(sc * 1.1)}px Oswald, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('RED ZONE', 0, 0); ctx.restore();
      }
      // line of scrimmage (blue) and the first-down line (broadcast yellow), each with a soft glow
      hline(S.los, 'rgba(96,165,250,.28)', 9); hline(S.los, 'rgba(147,197,253,1)', 3.2);
      if (S.ltg != null && S.ltg < 100) { hline(S.ltg, 'rgba(250,204,21,.25)', 10); hline(S.ltg, 'rgba(253,224,71,1)', 3.6); }
      if ((S.kind === 'play' || S.kind === 'lineup') && gs && gs.down && !gs.over && gs.phase === 'play') {
        const txt = gs.togo >= 100 - gs.ball ? `${['1ST', '2ND', '3RD', '4TH'][gs.down - 1]} & GOAL` : `${['1ST', '2ND', '3RD', '4TH'][gs.down - 1]} & ${gs.togo}`;
        ctx.font = `700 ${Math.round(Math.max(10, sc * 0.95))}px Oswald, Impact, sans-serif`;
        const tw = ctx.measureText(txt).width + 12, cx0 = Math.min(SX(FW) - tw - 4, W - tw - 6), cy0 = SY(S.los) - 9;
        ctx.fillStyle = gs.down >= 3 ? 'rgba(234,88,12,.92)' : 'rgba(15,23,42,.88)'; roundRect(cx0, cy0, tw, 18, 6); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, cx0 + tw / 2, cy0 + 9.5);
      }
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

  const topTier = pid => { const p = pid != null ? G.players[pid] : null; return p && p.stk && p.stk.length ? Math.max(...p.stk.map(s => s.tier)) : -1; };
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); }
  // top-down player: shoulder pads across the body, helmet out front, feet striding with speed
  function drawPlayer(a) {
    const x = SX(a.x), y = SY(a.y);
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
    const k = kit[a.side], carrier = S.carrier === a && S.ball.mode === 'held';
    const big = a.pos === 'OL' || a.pos === 'DL';
    let r = Math.max(9, sc * 0.84) * (big ? 1.08 : 1) * (carrier ? 1.12 : 1);
    if (a.celebrate) r *= 1 + Math.abs(Math.sin(performance.now() / 150 + a.phase)) * 0.14;
    const fa = -a.face, hr = r * 0.64;
    if (a.down > 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(fa);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ell(2, 2, r * 1.35, r * 0.72); ctx.fill();
      ctx.fillStyle = k.dark; ell(-r * 0.95, -r * 0.25, r * 0.45, r * 0.22); ctx.fill(); ell(-r * 0.95, r * 0.25, r * 0.45, r * 0.22); ctx.fill();
      ctx.fillStyle = k.jersey; ctx.strokeStyle = k.stripe; ctx.lineWidth = 1.4;
      ell(-r * 0.1, 0, r * 0.75, r * 0.72); ctx.fill(); ctx.stroke();
      ctx.fillStyle = k.helmet; ell(r * 0.85, 0, hr, hr); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    // shadow (direction depends on the time of day)
    const so2 = wx ? { day: [2.6, 3], dusk: [5.5, 2.4], night: [0.6, 1.8] }[wx.time] : [1.5, 2];
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ell(x + so2[0], y + so2[1], r * 1.05, r * 1.05); ctx.fill();
    if (carrier) {
      const pu = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.fillStyle = `rgba(250,204,21,${0.16 + pu * 0.16})`; ell(x, y, r * (1.75 + pu * 0.25), r * (1.75 + pu * 0.25)); ctx.fill();
      ctx.strokeStyle = 'rgba(250,204,21,.9)'; ctx.lineWidth = 2; ell(x, y, r * 1.42, r * 1.42); ctx.stroke();
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(fa);
    // feet
    const spd = hyp(a.vx, a.vy), st = Math.min(1, spd / 5.5) * Math.sin(a.phase * 5) * r * 0.42;
    ctx.fillStyle = k.dark;
    ell(-r * 0.1 + st, -r * 0.42, r * 0.3, r * 0.18); ctx.fill();
    ell(-r * 0.1 - st, r * 0.42, r * 0.3, r * 0.18); ctx.fill();
    // shoulder pads with stripes at the shoulders
    ctx.fillStyle = k.jersey; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2;
    ell(-r * 0.05, 0, r * 0.6, r * 1.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = k.stripe; ell(-r * 0.05, -r * 0.88, r * 0.24, r * 0.17); ctx.fill(); ell(-r * 0.05, r * 0.88, r * 0.24, r * 0.17); ctx.fill();
    // helmet, with a centre stripe over the back and a facemask on the front
    const hx = r * 0.14;
    ctx.fillStyle = k.helmet; ell(hx, 0, hr, hr); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = k.stripe; ctx.lineWidth = Math.max(1.4, hr * 0.24); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.92, 0); ctx.lineTo(hx - hr * 0.45, 0); ctx.stroke();
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = Math.max(1, hr * 0.17);
    ctx.beginPath(); ctx.arc(hx, 0, hr * 1.02, -0.85, 0.85); ctx.stroke();
    ctx.restore();
    if (carrier) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ell(x + Math.cos(fa) * hx, y + Math.sin(fa) * hx, hr + 1, hr + 1); ctx.stroke(); }
    // number on the helmet, kept upright
    if (a.num !== '' && a.num != null) {
      ctx.fillStyle = k.hnum || k.num;
      ctx.font = `700 ${Math.round(hr * 1.2)}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.num, x + Math.cos(fa) * hx, y + Math.sin(fa) * hx + 0.5);
    }
    const tt = topTier(a.pid);
    if (tt >= 2) { ctx.fillStyle = DATA.STICKER_TIERS[tt].color; ell(x + r * 0.8, y - r * 0.8, Math.max(2.4, r * 0.26), Math.max(2.4, r * 0.26)); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    if (a.pose === 'kneel') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ell(x, y, r + 4, r + 4); ctx.stroke(); }
  }
  // the ball in flight leaves a fading trail, with its track painted faintly on the turf
  function drawBallTrail() {
    const b = S.ball;
    if (b.mode !== 'air') { S.btrail = null; return; }
    const p = ballPos();
    const tr = S.btrail = S.btrail || [];
    if (!tr.length || hyp(tr[tr.length - 1].x - p.x, tr[tr.length - 1].y - p.y) > 0.4) tr.push({ x: p.x, y: p.y, z: p.z || 0 });
    if (tr.length > 26) tr.shift();
    if (b.fx != null && b.tx != null) {
      ctx.setLineDash([sc * 0.5, sc * 0.5]); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(SX(b.fx), SY(b.fy)); ctx.lineTo(SX(b.tx), SY(b.ty)); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let i = 0; i < tr.length; i++) {
      const u = i / tr.length, q = tr[i];
      ctx.fillStyle = `rgba(255,255,255,${0.05 + u * 0.35})`;
      ell(SX(q.x), SY(q.y) - q.z * sc * 0.35, Math.max(1, sc * 0.16 * u), Math.max(1, sc * 0.16 * u)); ctx.fill();
    }
  }
  // after a big play: the receivers' and runners' actual paths, like a broadcast telestrator
  function drawReplay() {
    const age = (performance.now() - S.replay) / 1000;
    if (age > 3.2) return;
    const al = age < 0.3 ? age / 0.3 : age > 2.6 ? (3.2 - age) / 0.6 : 1;
    ctx.globalAlpha = al;
    for (const a of S.list) {
      if (!a.path || a.path.length < 3) continue;
      const col = a === S.carrier ? '#facc15' : '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.beginPath(); a.path.forEach(([px, py], i) => (i ? ctx.lineTo(SX(px), SY(py)) : ctx.moveTo(SX(px), SY(py)))); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2.6;
      ctx.beginPath(); a.path.forEach(([px, py], i) => (i ? ctx.lineTo(SX(px), SY(py)) : ctx.moveTo(SX(px), SY(py)))); ctx.stroke();
      const [ex, ey] = a.path[a.path.length - 1], [qx, qy] = a.path[a.path.length - 3], th = Math.atan2(-(ey - qy), ex - qx);
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(SX(ex) + Math.cos(th) * 8, SY(ey) + Math.sin(th) * 8);
      ctx.lineTo(SX(ex) + Math.cos(th + 2.5) * 7, SY(ey) + Math.sin(th + 2.5) * 7);
      ctx.lineTo(SX(ex) + Math.cos(th - 2.5) * 7, SY(ey) + Math.sin(th - 2.5) * 7);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = al;
    ctx.font = '700 12px Oswald, Impact, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(8,12,20,.85)'; roundRect(10, H * 0.06, 74, 22, 8); ctx.fill();
    ctx.fillStyle = '#f87171'; ell(22, H * 0.06 + 11, 4, 4); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText('REPLAY', 31, H * 0.06 + 11.5);
    ctx.globalAlpha = 1;
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
    const xc = U.clamp(x, w / 2 + 4, W - w / 2 - 4);
    ctx.fillStyle = 'rgba(8,12,20,.85)';
    roundRect(xc - w / 2, y - h / 2, w, h, h / 2.4); ctx.fill();
    ctx.fillStyle = p.color || '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.text, xc, y + 0.5);
    ctx.globalAlpha = 1;
  }
  function drawFlash() {
    const u = (performance.now() - flash.t0) / 1700;
    if (u >= 1) { flash = null; return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flash.side != null) return drawTakeover(u);
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
  // the scoring team takes over the screen: a band in their colours sweeps in with the logo
  function drawTakeover(u) {
    const t = L.team(gs.t[flash.side]), p = t.logo.primary, s2 = t.logo.secondary;
    const inT = Math.min(1, u / 0.16), outT = u > 0.8 ? (u - 0.8) / 0.2 : 0;
    const ease = q => 1 - Math.pow(1 - q, 3);
    const dx = (1 - ease(inT)) * -W * 1.2 + ease(outT) * W * 1.2, bh = H * 0.2, cy = H * 0.42;
    ctx.save(); ctx.translate(W / 2 + dx, cy); ctx.rotate(-0.08);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-W, -bh / 2 + 6, W * 2, bh);
    ctx.fillStyle = p; ctx.fillRect(-W, -bh / 2, W * 2, bh);
    ctx.fillStyle = s2; ctx.fillRect(-W, -bh / 2, W * 2, bh * 0.08); ctx.fillRect(-W, bh / 2 - bh * 0.08, W * 2, bh * 0.08);
    const ls = bh * 0.8, li = logoImgs[flash.side];
    if (li && li.complete) ctx.drawImage(li, -W * 0.42 - ls / 2, -ls / 2, ls, ls);
    const on = U.onColor(p) === '#ffffff' ? '#ffffff' : '#0b0f17';
    ctx.fillStyle = on; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(W * 0.105)}px Oswald, Impact, sans-serif`;
    ctx.fillText(flash.text, W * 0.08, -bh * 0.1);
    ctx.font = `700 ${Math.round(W * 0.045)}px Oswald, Impact, sans-serif`;
    ctx.globalAlpha = 0.85; ctx.fillText(`${t.name.toUpperCase()} ${t.mascot.toUpperCase()}`, W * 0.08, bh * 0.26); ctx.globalAlpha = 1;
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ── fx ──
  // callouts that carry a sound
  const POP_SFX = {
    'HUT!': 'snap', 'SACK!': 'bigHit', 'FUMBLE!': 'turnover', 'INTERCEPTED!': 'turnover', 'TURNOVER!': 'turnover', 'RECOVERED': 'bigPlay',
    "IT'S GOOD!": 'fieldGoal', 'NO GOOD': 'noGood', 'PANCAKE': 'tackle', 'BROKEN UP': 'tackle',
    'BROKE TACKLE': 'bigPlay', 'JUKE!': 'bigPlay', 'SPIN MOVE': 'bigPlay', 'STIFF ARM': 'bigPlay', 'MISSED TACKLE': 'bigPlay', 'ESCAPES!': 'bigPlay',
  };
  function pop(x, y, text, color, opts = {}) {
    pops.push({ x, y, text, color, age: 0, life: opts.life || 1.4, big: opts.big });
    if (POP_SFX[text]) Sfx.play(POP_SFX[text], 0.25);
  }
  function burst(x, y, color = 'rgba(226,232,240,.9)', n = 12, up = 3) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(1, 4); parts.push({ x, y, z: 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: U.rand(1, up), age: 0, life: U.rand(0.4, 0.8), s: U.rand(3, 6), c: color }); }
  }
  function confetti(x, y, cols) {
    for (let i = 0; i < 80; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(1, 6); parts.push({ x, y, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: U.rand(5, 12), age: 0, life: U.rand(1.2, 2.2), s: U.rand(4, 7), c: U.pick(cols) }); }
  }
  function bigText(text, color = '#ffffff', side = null) {
    flash = { text, color, t0: performance.now(), side };
    if (text === 'TOUCHDOWN') Sfx.play('touchdown', 1);
  }
  function slowMo(sec) { slow = Math.max(slow, sec); }
  // how much of the canvas the play-call panel covers (px); the field shifts up to keep the line visible
  function setInset(px) { inset = Math.max(0, Math.min(px, H * 0.55)); }

  function setSpeed(s) { speed = s; }
  function setPaused(p) { paused = p; }
  function skip() { if (S) { S.onDone = null; if (!S.dead) dead(); } }
  function debug() { return { S, cut, bodies: S ? Object.fromEntries(S.list.map(a => [a.key, a])) : {} }; }

  return { mount, unmount, resize, play, lineup, ready, setSpeed, setPaused, skip, bigText, setInset, debug, takeClip };
})();
