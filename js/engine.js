'use strict';
// ── GAME ENGINE ───────────────────────────────────────────────────
// Snap-by-snap simulation driven by individual player matchups.
// Side 0 = home, side 1 = away. gs.ball = yards from the offense's own goal.
// step() resolves a snap statistically (simmed games). Watched games use
// prepare() → the free physical sim in live.js → commit(), so the log
// reports what actually happened on the field.

const Engine = (() => {
  const QLEN = 900;

  const OFF_CALLS = [
    { id: 'inside', label: 'Inside Run', kind: 'run', desc: 'Downhill between the tackles.' },
    { id: 'outside', label: 'Outside Run', kind: 'run', desc: 'Stretch it to the edge.' },
    { id: 'quick', label: 'Quick Pass', kind: 'pass', desc: 'Slants & flats. Beat the rush.' },
    { id: 'pa', label: 'Play Action', kind: 'pass', desc: 'Sell the run, hit it behind the LBs.' },
    { id: 'deep', label: 'Deep Shot', kind: 'pass', desc: 'Max protect. Take the top off.' },
    { id: 'screen', label: 'RB Screen', kind: 'pass', desc: 'Let them rush, dump it off.' },
  ];
  const DEF_CALLS = [
    { id: 'base', label: 'Base 4-3', desc: 'Sound gap control, safety help.' },
    { id: 'blitz', label: 'Mike Blitz', desc: 'Extra rusher. Man-up, no help.' },
    { id: 'cover', label: 'Cover 3', desc: 'Keep it in front. Soft vs run.' },
    { id: 'runstop', label: 'Stack the Box', desc: 'Safety down. Exposed deep.' },
  ];
  const OFF_SLOTS = { QB: ['QB', 0], RB: ['RB', 0], WR1: ['WR', 0], WR2: ['WR', 1], WR3: ['WR', 2], TE: ['TE', 0], LT: ['OL', 0], LG: ['OL', 1], C: ['OL', 2], RG: ['OL', 3], RT: ['OL', 4] };
  const DEF_SLOTS = { DE1: ['DL', 0], DT1: ['DL', 1], DT2: ['DL', 2], DE2: ['DL', 3], LB1: ['LB', 0], MLB: ['LB', 1], LB2: ['LB', 2], CB1: ['CB', 0], CB2: ['CB', 1], S1: ['S', 0], S2: ['S', 1] };
  const ROTATE = { RB: 1, WR: 1, DL: 1, LB: 1, CB: 1, TE: 1, S: 1 };

  // ── players & lineups ──
  const GHOST = pos => ({ id: -1, first: 'Practice', last: 'Squad', pos, num: 0, ovr: 42, attrs: { spd: 42, str: 42, awr: 42, skl: 42 } });
  function lineupFor(team) {
    const lu = {};
    for (const pos of DATA.POSITIONS) lu[pos] = L.depthHealthy(team, pos).map(p => p.id);
    return lu;
  }
  const avail = (gs, side, pos) => gs.lu[side][pos].filter(id => !gs.out[id]).map(id => G.players[id]).filter(Boolean);
  function who(gs, side, pos, idx = 0) { return avail(gs, side, pos)[idx] || null; }
  const stam = (gs, p) => (p.id < 0 ? 100 : gs.stam[p.id] ?? 100);
  // Builds the 11 on the field for one snap, rotating gassed starters out.
  function slots(gs, side, offense) {
    const map = offense ? OFF_SLOTS : DEF_SLOTS, out = {}, used = new Set();
    const groups = {};
    for (const [slot, [pos, i]] of Object.entries(map)) (groups[pos] = groups[pos] || []).push([slot, i]);
    for (const [pos, list] of Object.entries(groups)) {
      const pl = avail(gs, side, pos), n = list.length;
      const bench = pl.slice(n);
      for (const [slot, i] of list) {
        let p = pl[i] || null;
        if (p && ROTATE[pos] && stam(gs, p) < 58) {
          const sub = bench.find(b => !used.has(b.id) && stam(gs, b) >= 80 && b.ovr >= p.ovr - 12);
          if (sub) p = sub;
        }
        if (!p) p = GHOST(pos);
        used.add(p.id);
        out[slot] = p;
      }
    }
    return out;
  }
  // Effective attribute: fatigue + home field + the coaching staff's game-day edge.
  function A(gs, side, p, a) {
    const f = 0.82 + 0.18 * (stam(gs, p) / 100);
    return p.attrs[a] * f + (side === 0 && !gs.neutral ? 1.2 : 0) + (gs.cb ? gs.cb[side][p.pos] || 0 : 0);
  }
  // composite skills
  const passBlk = (gs, s, p) => A(gs, s, p, 'skl') * 0.6 + A(gs, s, p, 'str') * 0.3 + A(gs, s, p, 'awr') * 0.1;
  const runBlk = (gs, s, p) => A(gs, s, p, 'str') * 0.55 + A(gs, s, p, 'skl') * 0.35 + A(gs, s, p, 'awr') * 0.1;
  const passRush = (gs, s, p) => p.pos === 'DL' ? A(gs, s, p, 'skl') * 0.55 + A(gs, s, p, 'spd') * 0.25 + A(gs, s, p, 'str') * 0.2 : A(gs, s, p, 'spd') * 0.5 + A(gs, s, p, 'str') * 0.3 + A(gs, s, p, 'skl') * 0.2 - 6;
  const runDef = (gs, s, p) => A(gs, s, p, 'str') * 0.6 + A(gs, s, p, 'skl') * 0.25 + A(gs, s, p, 'awr') * 0.15;
  const routeR = (gs, s, p) => p.pos === 'TE' ? A(gs, s, p, 'skl') * 0.55 + A(gs, s, p, 'spd') * 0.3 + A(gs, s, p, 'awr') * 0.15 : p.pos === 'RB' ? A(gs, s, p, 'spd') * 0.5 + A(gs, s, p, 'skl') * 0.3 + A(gs, s, p, 'awr') * 0.2 - 4 : A(gs, s, p, 'skl') * 0.45 + A(gs, s, p, 'spd') * 0.4 + A(gs, s, p, 'awr') * 0.15;
  const coverR = (gs, s, p) => p.pos === 'LB' ? A(gs, s, p, 'spd') * 0.45 + A(gs, s, p, 'awr') * 0.35 + A(gs, s, p, 'skl') * 0.2 - 8 : p.pos === 'DL' ? 40 : A(gs, s, p, 'skl') * 0.5 + A(gs, s, p, 'spd') * 0.35 + A(gs, s, p, 'awr') * 0.15;
  const tackleR = (gs, s, p) => p.pos === 'LB' ? A(gs, s, p, 'skl') * 0.5 + A(gs, s, p, 'str') * 0.3 + A(gs, s, p, 'spd') * 0.2 : p.pos === 'DL' ? A(gs, s, p, 'str') * 0.5 + A(gs, s, p, 'skl') * 0.3 + A(gs, s, p, 'spd') * 0.2 : A(gs, s, p, 'awr') * 0.4 + A(gs, s, p, 'str') * 0.3 + A(gs, s, p, 'spd') * 0.3 - 2;
  const elusR = (gs, s, p) => p.pos === 'RB' ? A(gs, s, p, 'skl') * 0.5 + A(gs, s, p, 'spd') * 0.35 + A(gs, s, p, 'str') * 0.15 : p.pos === 'QB' ? A(gs, s, p, 'spd') * 0.7 + A(gs, s, p, 'str') * 0.3 - 4 : A(gs, s, p, 'spd') * 0.55 + A(gs, s, p, 'skl') * 0.2 + A(gs, s, p, 'str') * 0.25;
  const qbAcc = (gs, s, p) => A(gs, s, p, 'skl') * 0.7 + A(gs, s, p, 'awr') * 0.3;
  const sig = z => 1 / (1 + Math.exp(-z));
  // diminishing returns on rating gaps: typical edges (±8) count almost fully, a 30-point mismatch counts like ~13,
  // so elite-vs-weak matchups stay lopsided without turning every snap into a sure thing
  const GAPK = Number(globalThis.__GAPK) || 10;
  const gap = d => GAPK * Math.tanh(d / GAPK);

  function unitAvg(gs, side, pos, n) {
    const pl = avail(gs, side, pos), v = [];
    for (let i = 0; i < n; i++) v.push(pl[i] ? pl[i].ovr : 38);
    return U.avg(v);
  }
  function computeUnits(gs, side) {
    const u = {};
    for (const pos of DATA.POSITIONS) u[pos.toLowerCase()] = unitAvg(gs, side, pos, DATA.STARTERS[pos]) + (gs.cb ? gs.cb[side][pos] || 0 : 0);
    if (side === 0 && !gs.neutral) for (const k in u) u[k] += 1.2;
    gs.u[side] = u;
  }
  const nm = p => (p ? `${p.first[0]}. ${p.last}` : 'Backup');

  // ── stats ──
  const blankTS = () => ({ plays: 0, yds: 0, py: 0, ry: 0, fd: 0, to: 0, top: 0, sk: 0, pen: 0 });
  function st(gs, p, side) {
    if (!p || p.id < 0) return {};
    if (!gs.ps[p.id]) gs.ps[p.id] = { side, pa: 0, pc: 0, py: 0, ptd: 0, pint: 0, ra: 0, ry: 0, rtd: 0, rc: 0, rcy: 0, rctd: 0, tk: 0, sk: 0, int: 0, fgm: 0, fga: 0 };
    return gs.ps[p.id];
  }

  // ── game plans & play calling ──
  function aiPlan(gs, side) {
    const O = gs.u[side], D = gs.u[1 - side];
    const run = O.ol * 0.5 + O.rb * 0.5, pass = O.qb * 0.55 + O.wr * 0.45;
    const off = pass - run > 3 ? 'air' : run - pass > 3 ? 'ground' : 'balanced';
    const oppRun = D.ol * 0.5 + D.rb * 0.5, oppPass = D.qb * 0.55 + D.wr * 0.45;
    let def = 'base';
    if (O.dl > D.ol + 4) def = 'blitz';
    else if (oppPass - oppRun > 4) def = 'cover';
    else if (oppRun - oppPass > 4) def = 'runstop';
    return { off, def, book: off === 'air' ? 'spread' : off === 'ground' ? 'pro' : 'multiple' };
  }
  function aiAdjust(gs, side) {
    if (side === gs.userSide) return;
    const diff = gs.score[side] - gs.score[1 - side], p = gs.plan[side];
    if (gs.qtr >= 3 && diff <= -14) p.off = 'air';
    else if (gs.qtr >= 4 && diff >= 10) p.off = 'ground';
    if (gs.qtr >= 4 && diff >= 10) p.def = 'cover';
  }
  const PLAN_W = {
    ground: { inside: 0.34, outside: 0.22, quick: 0.14, pa: 0.14, deep: 0.08, screen: 0.08 },
    balanced: { inside: 0.25, outside: 0.16, quick: 0.21, pa: 0.14, deep: 0.13, screen: 0.11 },
    air: { inside: 0.17, outside: 0.11, quick: 0.27, pa: 0.15, deep: 0.16, screen: 0.14 },
  };
  function late(gs) { return !gs.ot && gs.qtr >= 4 && gs.clock < 300; }
  function aiOffCall(gs, side = gs.poss) {
    const w = { ...PLAN_W[gs.plan[side].off] };
    const diff = gs.score[side] - gs.score[1 - side];
    const mul = (k, m) => { w[k] *= m; };
    if (gs.down >= 3 && gs.togo >= 7) { mul('inside', 0.25); mul('outside', 0.35); mul('quick', 1.4); mul('deep', 1.6); mul('screen', 1.4); mul('pa', 0.6); }
    else if (gs.togo <= 2) { mul('inside', 2.2); mul('outside', 1.2); mul('deep', 0.5); mul('screen', 0.4); mul('pa', 1.2); }
    if (late(gs) && diff < 0) { mul('quick', 1.6); mul('deep', 1.7); mul('inside', 0.4); mul('outside', 0.4); }
    if (late(gs) && diff > 0) { mul('inside', 1.8); mul('outside', 1.5); mul('deep', 0.4); }
    if (!gs.ot && gs.qtr === 2 && gs.clock < 120) { mul('quick', 1.5); mul('deep', 1.4); mul('inside', 0.5); }
    const t = gs.tend[1 - side];
    if (t.n >= 6 && t.blitz / t.n > 0.3) { mul('screen', 1.6); mul('quick', 1.3); }
    const e = callEdges(gs, side);
    for (const k in w) w[k] *= U.clamp(1 + e[k] * 0.06, 0.5, 1.8);
    const rp = gs.wxm.runPass;
    w.deep *= rp * rp; w.pa *= rp; w.quick *= (1 + rp) / 2; w.screen *= (1 + rp) / 2;
    return U.wpick(Object.keys(w), k => w[k]);
  }
  function aiDefCall(gs, side = 1 - gs.poss) {
    const w = { base: 0.4, blitz: 0.2, cover: 0.2, runstop: 0.2 };
    w[gs.plan[side].def] += 0.3;
    const t = gs.tend[1 - side];
    if (gs.down >= 3 && gs.togo >= 7) { w.cover *= 1.8; w.blitz *= 1.4; w.runstop *= 0.3; }
    else if (gs.togo <= 2) { w.runstop *= 2.5; w.cover *= 0.4; }
    if (t.n >= 6) {
      const pr = t.pass / t.n;
      if (pr > 0.6) { w.cover *= 1.4; w.blitz *= 1.2; w.runstop *= 0.6; }
      if (pr < 0.4) { w.runstop *= 1.6; w.cover *= 0.7; }
    }
    if (late(gs) && gs.score[side] > gs.score[1 - side]) w.cover *= 1.8;
    return U.wpick(Object.keys(w), k => w[k]);
  }
  // Heuristic matchup edge for every offensive call (positive favours the offense).
  function callEdges(gs, side = gs.poss) {
    const d = 1 - side, O = slots(gs, side, true), D = slots(gs, d, false);
    const av = (arr, f, s) => U.avg(arr.map(k => f(gs, s, (s === side ? O : D)[k])));
    const pb = av(['LT', 'LG', 'C', 'RG', 'RT'], passBlk, side), pr = av(['DE1', 'DT1', 'DT2', 'DE2'], passRush, d);
    const inside = av(['LG', 'C', 'RG'], runBlk, side) - av(['DT1', 'DT2'], runDef, d) + (elusR(gs, side, O.RB) - tackleR(gs, d, D.MLB)) * 0.4;
    const outside = av(['LT', 'RT', 'TE'], runBlk, side) - av(['DE1', 'DE2'], runDef, d) + (A(gs, side, O.RB, 'spd') - U.avg([D.LB1, D.LB2].map(p => A(gs, d, p, 'spd')))) * 0.4;
    const quick = av(['WR1', 'WR2', 'WR3'], routeR, side) - av(['CB1', 'CB2', 'S1'], coverR, d) + (qbAcc(gs, side, O.QB) - 70) * 0.3;
    const deep = U.avg(['WR1', 'WR2'].map(k => A(gs, side, O[k], 'spd'))) - U.avg(['CB1', 'CB2', 'S2'].map(k => A(gs, d, D[k], 'spd'))) + (pb - pr) * 0.5 + (wxPass(gs, 20) - gs.wxm.pass) * 12 + gs.wxm.pass * 6;
    const screen = elusR(gs, side, O.RB) - U.avg(['LB1', 'MLB', 'LB2'].map(k => tackleR(gs, d, D[k]))) + (pr - pb) * 0.4;
    const pa = quick * 0.6 + inside * 0.4 + (gs.tend[side].run > gs.tend[side].pass ? 2 : 0);
    const r = x => Math.round(x * 10) / 10;
    return { inside: r(inside), outside: r(outside), quick: r(quick), pa: r(pa), deep: r(deep), screen: r(screen) };
  }

  // ── creation ──
  function create(home, away, opts = {}) {
    const gs = {
      t: [home.id, away.id], abbr: [home.abbr, away.abbr],
      lu: [lineupFor(home), lineupFor(away)], out: {}, u: [null, null], stam: {},
      score: [0, 0], qs: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
      qtr: 1, clock: QLEN, poss: 0, ball: 25, down: 1, togo: 10,
      stkLog: {}, wx: opts.weather || { type: 'clear', temp: 65, wind: 0, dir: 0, time: 'day' }, wxm: null,
      plan: [null, null], userSide: opts.userSide ?? -1, askFourth: !!opts.askFourth, userCalls: !!opts.userCalls, neutral: !!opts.neutral,
      log: [], ps: {}, ts: [blankTS(), blankTS()], injuries: [], tend: [{ run: 0, pass: 0, blitz: 0, n: 0, last: null }, { run: 0, pass: 0, blitz: 0, n: 0, last: null }],
      phase: 'kickoff', kicker: U.ri(0, 1), recv1: 0,
      ot: 0, otPoss: 0, otFirst: 0, otSide: 0, over: false, n: 0, lastPlay: null, tos: [3, 3],
      drive: { side: 0, start: 25, plays: 0, yds: 0, clk: QLEN, q: 1 }, wpH: [],
      cb: [Career.coachBonus(home), Career.coachBonus(away)], rival: !!opts.rival,
    };
    gs.recv1 = 1 - gs.kicker;
    gs.wxm = DATA.WEATHER[gs.wx.type] || DATA.WEATHER.clear;
    computeUnits(gs, 0); computeUnits(gs, 1);
    gs.pre = (L.powerFromUnits(gs.u[0]) - L.powerFromUnits(gs.u[1])) * 0.55;
    gs.plan = [aiPlan(gs, 0), aiPlan(gs, 1)];
    if (opts.userPlan && gs.userSide >= 0) gs.plan[gs.userSide] = { ...opts.userPlan };
    ev(gs, `${gs.abbr[gs.kicker]} wins the toss and defers. ${gs.abbr[gs.recv1]} will receive.`, 'info');
    gs.wpH.push(winProb(gs));
    return gs;
  }

  function ev(gs, text, kind = 'play', extra = {}) {
    const e = { n: gs.n++, q: gs.qtr, clk: gs.clock, text, kind, side: gs.poss, sc: gs.score.slice(), sit: gs.lastSit || null, ...extra };
    // big plays and scores remember their yardage and where they started (for the weekly highlight reel)
    if (gs._g && (kind === 'td' || kind === 'big')) { e.y = gs._g.y; e.los = gs._g.los; }
    gs.log.push(e);
    return e;
  }
  function spot(gs, side = gs.poss, ball = gs.ball) {
    if (ball === 50) return 'the 50';
    return ball < 50 ? `${gs.abbr[side]} ${ball}` : `${gs.abbr[1 - side]} ${100 - ball}`;
  }
  function downTxt(gs) { return `${U.ord(gs.down)} & ${gs.togo >= 100 - gs.ball ? 'Goal' : gs.togo}`; }
  function qName(q) { return q <= 4 ? `${U.ord(q)} Quarter` : `OT${q - 4}`; }
  const yd = n => `${n} yd${Math.abs(n) === 1 ? '' : 's'}`;
  function addPts(gs, side, pts) { gs.score[side] += pts; gs.qs[side][Math.min(gs.qtr, 5) - 1] += pts; }

  // ── weather ──
  // Wind component along the field for the offense (+ = tailwind) and across it.
  const tailwind = (gs, side = gs.poss) => gs.wx.wind * Math.cos(gs.wx.dir) * (side === 0 ? 1 : -1);
  const crosswind = gs => Math.abs(gs.wx.wind * Math.sin(gs.wx.dir));
  function wxPass(gs, depth) {
    const m = gs.wxm;
    let z = m.pass;
    if (depth >= 15) z += m.deep - Math.max(0, gs.wx.wind - 10) * 0.018 + Math.min(0, tailwind(gs)) * 0.006;
    return z;
  }
  const wet = gs => ['rain', 'storm', 'snow'].includes(gs.wx.type);

  // ── badges ──
  const TIER = DATA.STICKER_TIERS;
  function tierOf(p, id) { if (!p || !p.stk) return -1; const x = p.stk.find(y => y.id === id); return x ? x.tier : -1; }
  function fired(gs, det, p, id, t) {
    const key = p.id + ':' + id;
    gs.stkLog[key] = (gs.stkLog[key] || 0) + 1;
    if (!det) return;
    det.stk = det.stk || [];
    if (!det.stk.some(x => x.pid === p.id && x.id === id)) det.stk.push({ pid: p.id, id, tier: t, proc: DATA.STICKERS[id].kind === 'proc' });
  }
  // magnitude badge: returns its bonus (0 if the player doesn't have it / situation doesn't apply)
  function sm(gs, det, p, id, cond = true) {
    const t = tierOf(p, id);
    if (t < 0 || !cond) return 0;
    fired(gs, det, p, id, t);
    return DATA.STICKERS[id].base * TIER[t].mult;
  }
  // proc badge: rolls the tier's chance (scaled), true if it fires
  function sp(gs, det, p, id, cond = true, scale = 1) {
    const t = tierOf(p, id);
    if (t < 0 || !cond || !U.chance(TIER[t].proc * scale)) return false;
    fired(gs, det, p, id, t);
    return true;
  }
  // diminishing returns when several badges stack in the same contest
  const soft = (x, cap) => cap * Math.tanh(x / cap);
  // Swim Move: quick hands work best for quick rushers, and a Mirror blocker takes half of it away
  const swimOdds = (spd, mirrored) => U.clamp((spd - 55) / 30, 0.2, 1) * (mirrored ? 0.5 : 1) * 0.4;
  const clutch = gs => (gs.ot || gs.qtr >= 4) && Math.abs(gs.score[0] - gs.score[1]) <= 8;
  const redZone = gs => gs.ball >= 80;
  const shortYd = gs => (gs.down >= 3 && gs.togo <= 2) || gs.ball >= 95;
  // the most notable badge on a play, for the play-by-play
  // only badges from the side that won the play get the credit
  function stkNote(det, offWon) {
    const ids = new Set(Object.values((offWon ? det.O : det.D) || {}));
    const won = (det.stk || []).filter(x => ids.has(x.pid)).sort((a, b) => (b.proc - a.proc) || (b.tier - a.tier));
    det.stkShow = won.filter(x => x.proc || x.tier >= 1).slice(0, 2);
    if (!won.length) return '';
    const best = won[0];
    if (!best.proc && best.tier < 2) return '';
    return ` [${DATA.STICKERS[best.id].name}]`;
  }

  // ── fatigue ──
  const DRAIN = { QB: 0.6, RB: 1.3, WR: 1.6, TE: 1.5, OL: 1.8, DL: 2.1, LB: 1.8, CB: 1.6, S: 1.5, K: 0 };
  function fatigue(gs, O, D, extra = {}) {
    const onField = new Set();
    for (const p of [...Object.values(O), ...Object.values(D)]) {
      if (p.id < 0) continue;
      onField.add(p.id);
      const kt = Math.max(tierOf(p, 'bellcow'), tierOf(p, 'ironman'));
      const keep = kt < 0 ? 1 : 1 - 0.15 * TIER[kt].mult;
      gs.stam[p.id] = Math.max(0, stam(gs, p) - (DRAIN[p.pos] * gs.wxm.drain + (extra[p.id] || 0)) * U.clamp(keep, 0.4, 1) - U.rand(0, 0.6));
    }
    for (const side of [0, 1]) for (const pos of DATA.POSITIONS) for (const id of gs.lu[side][pos]) {
      if (!onField.has(id) && gs.stam[id] !== undefined) gs.stam[id] = Math.min(100, gs.stam[id] + 2.4);
    }
  }

  // ── possession changes ──
  function startDrive(gs) { gs.drive = { side: gs.poss, start: gs.ball, plays: 0, yds: 0, clk: gs.clock, q: gs.qtr }; }
  function changePoss(gs, side, ball) {
    if (gs.ot && otEnd(gs)) return;
    gs.poss = side; gs.ball = U.clamp(Math.round(ball), 1, 99);
    gs.down = 1; gs.togo = Math.min(10, 100 - gs.ball);
    gs.phase = 'play';
    startDrive(gs);
  }
  // NFL overtime: a 10-minute period opened by a kickoff. Each team is guaranteed a possession;
  // once both have had one, the game ends the moment a possession finishes with someone ahead.
  const OTLEN = 600;
  function startOT(gs) {
    ev(gs, 'End of regulation — we are headed to OVERTIME! Ten minutes, both teams get the ball.', 'qend');
    gs.ot = 1; gs.qtr = 5; gs.clock = OTLEN; gs.otDone = 0;
    gs.phase = 'kickoff'; gs.kicker = U.ri(0, 1);
    ev(gs, `${gs.abbr[1 - gs.kicker]} wins the toss and will receive.`, 'info');
  }
  function otEnd(gs) {
    gs.otDone = (gs.otDone || 0) + 1;
    if (gs.otDone >= 2 && gs.score[0] !== gs.score[1]) { finish(gs); return true; }
    return false;
  }
  function finish(gs) {
    gs.over = true; gs.phase = 'over';
    const w = gs.score[0] > gs.score[1] ? 0 : 1;
    ev(gs, `FINAL${gs.ot ? ` (${gs.ot > 1 ? gs.ot : ''}OT)` : ''}: ${gs.abbr[w]} ${gs.score[w]}, ${gs.abbr[1 - w]} ${gs.score[1 - w]}`, 'final');
  }

  // ── clock ──
  function runoff(gs, kind) {
    const o = gs.poss, diff = gs.score[o] - gs.score[1 - o];
    // NFL pace: the clock keeps running after first downs, so a normal snap burns ~36 seconds (about 63 plays a side)
    if (kind === 'inc') return U.ri(6, 9);
    // timeouts: three a half. A trailing offense stops the clock late in each half;
    // a defense down one score stops it when the leader tries to run it out.
    const tos = gs.tos || (gs.tos = [3, 3]), late2 = gs.qtr === 2 && gs.clock < 120, late4 = gs.qtr === 4 && gs.clock < 300;
    if (!gs.ot && gs.clock > 6 && (late2 || (late4 && diff < 0)) && tos[o] > 0 && U.chance(0.5)) {
      tos[o]--; ev(gs, `Timeout, ${gs.abbr[o]} (${tos[o]} left).`, 'info'); return U.ri(4, 7);
    }
    if (!gs.ot && gs.qtr === 4 && gs.clock < 200 && gs.clock > 6 && diff > 0 && diff <= 8 && tos[1 - o] > 0) {
      tos[1 - o]--; ev(gs, `Timeout, ${gs.abbr[1 - o]} (${tos[1 - o]} left).`, 'info'); return U.ri(4, 7);
    }
    if ((gs.qtr === 2 && gs.clock < 120) || (gs.qtr === 4 && gs.clock < 300 && diff < 0)) return U.ri(13, 21);
    if (gs.qtr === 4 && diff > 0 && gs.clock < 480) return U.ri(40, 45);
    return U.ri(31, 42);
  }
  function tick(gs, t) {
    const before = gs.clock;
    gs.clock -= t;
    if ((gs.qtr === 2 || gs.qtr === 4) && before > 120 && gs.clock < 120) { gs.clock = 120; ev(gs, 'Two-minute warning.', 'info'); }
    gs.ts[gs.poss].top += Math.max(0, before - Math.max(0, gs.clock));
  }
  function checkClock(gs) {
    if (gs.over || gs.clock > 0) return;
    gs.clock = 0;
    if (gs.ot) {
      if (gs.score[0] !== gs.score[1]) return finish(gs);
      // no ties: another period, same possession
      ev(gs, `End of OT${gs.ot} — still tied. Play continues.`, 'qend');
      gs.ot++; gs.qtr++; gs.clock = OTLEN;
      return;
    }
    if (gs.qtr === 2) {
      ev(gs, 'HALFTIME', 'half');
      gs.qtr = 3; gs.clock = QLEN; gs.phase = 'kickoff'; gs.kicker = gs.recv1; gs.tos = [3, 3];
      for (const id in gs.stam) gs.stam[id] = Math.min(100, gs.stam[id] + 35);
      aiAdjust(gs, 0); aiAdjust(gs, 1);
    } else if (gs.qtr === 4) {
      if (gs.score[0] === gs.score[1]) startOT(gs);
      else finish(gs);
    } else {
      ev(gs, `End of the ${qName(gs.qtr)}`, 'qend');
      gs.qtr++; gs.clock = QLEN;
      aiAdjust(gs, 0); aiAdjust(gs, 1);
    }
  }

  // ── scoring ──
  function touchdown(gs, side, text) {
    addPts(gs, side, 6);
    const diff = gs.score[side] - gs.score[1 - side];
    let pat;
    const goTwo = (gs.qtr >= 4 && (diff === -2 || diff === -5 || diff === -10) && gs.clock < 600);
    if (goTwo) {
      if (U.chance(0.46)) { addPts(gs, side, 2); pat = 'Two-point try is GOOD.'; } else pat = 'Two-point try fails.';
    } else {
      const k = who(gs, side, 'K');
      if (U.chance(0.94 + ((k ? k.ovr : 60) - 70) * 0.002 + (k ? sm(gs, null, k, 'automatic') : 0))) { addPts(gs, side, 1); pat = 'PAT good.'; } else pat = 'PAT is NO GOOD!';
    }
    gs.drive.td = true;
    ev(gs, `${text} TOUCHDOWN ${gs.abbr[side]}! ${pat}`, 'td', { scorer: side });
    if (gs.ot && otEnd(gs)) return;
    gs.phase = 'kickoff'; gs.kicker = side;
  }
  function safety(gs, text) {
    const d = 1 - gs.poss;
    addPts(gs, d, 2);
    ev(gs, `${text} SAFETY! ${gs.abbr[d]} adds two.`, 'td', { scorer: d });
    if (gs.ot && otEnd(gs)) return;
    gs.phase = 'kickoff'; gs.kicker = gs.poss;
  }

  // ── special teams ──
  // forceTB: the caller already decided it's a touchback (live games roll that before calling)
  function kickoff(gs, forceTB) {
    const k = gs.kicker, r = 1 - k;
    const ret = who(gs, r, U.pick(['RB', 'WR', 'CB']), 1) || who(gs, r, 'WR', 0) || GHOST('WR');
    const det = { type: 'kickoff', o: r, kickSide: k, returner: ret.id, land: U.ri(-6, 4) };
    gs.lastPlay = det;
    gs.poss = r;
    if (forceTB || U.chance(tbChance(gs, k))) {
      gs.ball = 35; det.touchback = true; det.land = U.ri(-8, -2);
      ev(gs, `${gs.abbr[k]} kicks off — touchback. ${gs.abbr[r]} ball at the 35.`, 'kick');
    } else if (U.chance(0.006)) {
      gs.ball = 100; det.end = 100; tick(gs, 12);
      touchdown(gs, r, `${nm(ret)} takes the kickoff ALL THE WAY BACK!`);
      return checkClock(gs);
    } else {
      gs.ball = U.clamp(Math.round(U.gauss(28, 6)), 10, 50);
      tick(gs, 6);
      ev(gs, `${nm(ret)} returns the kickoff to the ${spot(gs)}.`, 'kick');
    }
    det.end = gs.ball;
    gs.down = 1; gs.togo = 10; gs.phase = 'play';
    startDrive(gs);
    checkClock(gs);
  }
  // Touchback Machine raises the kicking side's touchback rate
  const tbChance = (gs, side) => { const kk = who(gs, side, 'K'); return 0.62 + (kk ? sm(gs, null, kk, 'touchback') : 0); };
  function punt(gs) {
    const o = gs.poss, d = 1 - o, k = who(gs, o, 'K') || GHOST('K');
    let dist = Math.round(U.gauss(41 + (k.ovr - 70) * 0.12 + tailwind(gs) * 0.28 - (wet(gs) ? 2 : 0) + sm(gs, null, k, 'bigleg') * 50, 5));
    if (gs.ball + dist >= 100 && gs.ball >= 50 && sp(gs, null, k, 'coffin')) dist = 100 - gs.ball - U.ri(2, 8);
    const land = gs.ball + dist;
    const ret = who(gs, d, 'WR', 1) || who(gs, d, 'CB', 0) || GHOST('WR');
    const det = { type: 'punt', o, los: gs.ball, land: Math.min(land, 108), returner: ret.id, kicker: k.id };
    gs.lastPlay = det;
    tick(gs, U.ri(6, 11));
    gs.ts[o].plays++;
    if (land >= 100) {
      det.touchback = true; det.end = 80;
      ev(gs, `${nm(k)} punts into the end zone. Touchback.`, 'punt');
      changePoss(gs, d, 20);
    } else {
      const hang = sm(gs, null, k, 'hangtime');
      let r = U.chance(0.38 + hang * 0.04) ? 0 : Math.max(0, Math.round(U.gauss(7, 6) - hang));
      if (U.chance(0.004)) {
        det.end = -1; det.td = true;
        ev(gs, `${nm(k)} punts ${dist} yds...`, 'punt');
        gs.poss = d; gs.ball = 100;
        touchdown(gs, d, `${nm(ret)} weaves through the coverage on the return!`);
        return checkClock(gs);
      }
      if (U.chance(0.015)) r += U.ri(15, 45);
      const nb = U.clamp(100 - land + r, 1, 99);
      det.end = 100 - nb; det.fair = r === 0;
      ev(gs, `${nm(k)} punts ${dist} yds. ${r === 0 ? `Fair catch by ${nm(ret)}` : `${nm(ret)} returns it ${yd(r)}`}.`, r >= 15 ? 'big' : 'punt');
      changePoss(gs, d, nb);
    }
    checkClock(gs);
  }
  function fgProb(gs, side = gs.poss) {
    const dist = 100 - gs.ball + 17, k = who(gs, side, 'K');
    let windAdj = tailwind(gs, side) * (dist > 35 ? 0.005 : 0.002) - crosswind(gs) * (dist > 30 ? 0.004 : 0.0015);
    let wxAdj = gs.wxm.fg;
    const aw = k ? Math.min(1, sm(gs, null, k, 'allweather')) : 0;
    windAdj *= 1 - aw; wxAdj *= 1 - aw;
    const stk = k ? sm(gs, null, k, 'bigleg', dist >= 45) + sm(gs, null, k, 'icecold', clutch(gs)) + sm(gs, null, k, 'automatic', dist <= 40) : 0;
    return U.clamp(0.99 - Math.max(0, dist - 22) * 0.017 + ((k ? k.ovr : 60) - 70) * 0.004 + wxAdj + windAdj + stk, 0.03, 0.99);
  }
  function fieldGoal(gs) {
    const o = gs.poss, d = 1 - o, k = who(gs, o, 'K') || GHOST('K'), s = st(gs, k, o);
    const dist = 100 - gs.ball + 17;
    const det = { type: 'fg', o, los: gs.ball, dist, kicker: k.id };
    gs.lastPlay = det;
    s.fga++; gs.ts[o].plays++;
    tick(gs, 5);
    if (U.chance(fgProb(gs))) {
      s.fgm++; det.good = true;
      addPts(gs, o, 3);
      gs.drive.fg = true;
      ev(gs, `${nm(k)} ${dist}-yd field goal is GOOD!`, 'fg', { scorer: o });
      if (!(gs.ot && otEnd(gs))) { gs.phase = 'kickoff'; gs.kicker = o; }
    } else {
      det.good = false; det.miss = U.pick(['wide left', 'wide right', 'short']);
      ev(gs, `${nm(k)} ${dist}-yd field goal attempt is NO GOOD — ${det.miss}.`, 'miss');
      changePoss(gs, d, Math.max(20, 100 - (gs.ball - 7)));
    }
    checkClock(gs);
  }

  // ── yardage bookkeeping ──
  function gain(gs, yds, text, opts = {}) {
    const o = gs.poss, d = 1 - o;
    const y = Math.min(yds, 100 - gs.ball);
    gs._g = { y, los: gs.ball };
    gs.ball += y;
    gs.ts[o].plays++; gs.ts[o].yds += y;
    if (opts.kind === 'pass') gs.ts[o].py += y; else if (opts.kind === 'run') gs.ts[o].ry += y;
    gs.drive.plays++; gs.drive.yds += y;
    if (opts.onYds) opts.onYds(y);
    tick(gs, runoff(gs, opts.inc || opts.oob ? 'inc' : 'play'));
    if (gs.ball >= 100) {
      if (opts.onTD) opts.onTD();
      touchdown(gs, o, text);
    } else if (gs.ball <= 0) {
      safety(gs, text);
    } else if (!opts.inc && y >= gs.togo) {
      gs.down = 1; gs.togo = Math.min(10, 100 - gs.ball); gs.ts[o].fd++;
      ev(gs, `${text} First down at the ${spot(gs)}.`, y >= 20 ? 'big' : 'play');
    } else {
      gs.down++; gs.togo -= y;
      if (gs.down > 4) {
        ev(gs, text, 'play');
        ev(gs, `Turnover on downs! ${gs.abbr[d]} takes over at the ${spot(gs, d, 100 - gs.ball)}.`, 'to');
        changePoss(gs, d, 100 - gs.ball);
      } else ev(gs, text, y >= 20 ? 'big' : opts.kind === 'sack' ? 'sack' : 'play');
    }
    checkClock(gs);
  }
  const idsOf = S => { const o = {}; for (const k in S) o[k] = S[k].id; return o; };
  const slotOf = (S, p) => Object.keys(S).find(k => S[k] === p);

  // ── RUN ──
  function resolveRun(gs, oc, dc) {
    const o = gs.poss, d = 1 - o, O = slots(gs, o, true), D = slots(gs, d, false);
    const side = oc === 'outside' ? (U.chance(0.5) ? 'L' : 'R') : 'M';
    const det = { type: 'run', call: oc, dcall: dc, o, los: gs.ball, O: idsOf(O), D: idsOf(D), side, carrier: 'RB', blocks: [] };
    const rb2 = who(gs, o, 'RB', 1);
    const rb = U.chance(0.1) && oc === 'inside' ? O.QB : rb2 && rb2 !== O.RB && rb2.ovr >= O.RB.ovr - 15 && U.chance(0.32) ? rb2 : O.RB;
    det.carrier = slotOf(O, rb);
    const mod = { runstop: -4, blitz: oc === 'inside' ? -1 : 2, cover: 4, base: 0 }[dc] + (oc === 'outside' && dc === 'runstop' ? -2 : 0);
    const pairs = side === 'M' ? [['LG', 'DT1'], ['RG', 'DT2'], ['C', dc === 'runstop' ? 'S1' : dc === 'blitz' ? 'LB1' : 'MLB']]
      : side === 'L' ? [['LT', 'DE1'], ['LG', 'LB1'], ['WR3', 'CB1']] : [['RT', 'DE2'], ['TE', 'LB2'], ['WR2', 'CB2']];
    let sum = 0, tfl = null;
    for (const [ok, dk] of pairs) {
      const ob = O[ok], db = D[dk];
      const off = ob.pos === 'WR' ? A(gs, o, ob, 'str') * 0.6 + A(gs, o, ob, 'awr') * 0.4 - 6 : runBlk(gs, o, ob);
      const def = db.pos === 'DL' ? runDef(gs, d, db) : tackleR(gs, d, db);
      const stkO = sm(gs, det, ob, 'grader', side === 'M') + sm(gs, det, ob, 'puller', side !== 'M' && ob.pos === 'OL') + sm(gs, det, ob, 'anchor', db.pos === 'DL') * 0.5
        + sm(gs, det, ob, 'pancake') * 0.6 + sm(gs, det, ob, 'sealer', side !== 'M');
      const stkD = sm(gs, det, db, 'stuffer') + sm(gs, det, db, 'eater', side === 'M') + sm(gs, det, db, 'longarm') * 0.5;
      const m = gap(off - def) * 0.58 + U.gauss(0, 9) + mod + soft(stkO, 2.5) - soft(stkD, 2.5);
      det.blocks.push({ o: ok, d: dk, m: Math.round(m), win: m >= 0 });
      sum += m;
      if (m < -11 + sm(gs, det, db, 'penetrator') && !tfl) tfl = dk;
    }
    const laneQ = sum / pairs.length / 10;
    let yards, tackler = null;
    const levels = [];
    if (dc === 'blitz' && oc === 'inside' && U.chance(0.22)) tfl = tfl || 'MLB';
    // Spin Move: he spins out of the backfield tackle
    if (tfl && sp(gs, det, rb, 'spin', true, 0.5)) tfl = null;
    if (tfl) {
      yards = -U.ri(1, 3); tackler = tfl;
      levels.push({ d: tfl, win: false, y: yards });
    } else {
      const g1 = Math.round(U.clamp(3.0 + laneQ * 2.4 + U.gauss(0, 1.4) + (side !== 'M' ? U.gauss(0.3, 1.8) : 0) + sm(gs, det, rb, 'hammer', shortYd(gs)) + sm(gs, det, rb, 'cutback', side === 'M'), -1, 7));
      const l2k = side === 'M' ? (dc === 'blitz' ? 'LB2' : 'MLB') : side === 'L' ? (det.blocks[1].win ? 'MLB' : 'LB1') : (det.blocks[1].win ? 'MLB' : 'LB2');
      const l2 = D[l2k];
      const m2 = gap(elusR(gs, o, rb) - tackleR(gs, d, l2)) * 0.5 + U.gauss(0, 10) + laneQ * 4 + ({ cover: 3, runstop: -3, blitz: 1, base: 0 }[dc]) + (side !== 'M' ? gap(A(gs, o, rb, 'spd') - A(gs, d, l2, 'spd')) * 0.3 : 0) + (l2k === 'MLB' && side !== 'M' ? 3 : 0)
        + soft(sm(gs, det, rb, 'wrecking'), 3) - soft(sm(gs, det, l2, 'thumper') + sm(gs, det, l2, 'sideline', side !== 'M') + sm(gs, det, l2, 'shedder', l2.pos === 'LB'), 3);
      const juke = m2 < 8 && sp(gs, det, rb, 'jukebox', true, 0.35);
      levels.push({ d: l2k, win: m2 >= 8 || juke, y: g1 });
      if (m2 < 8 && !juke) { yards = g1 + U.ri(0, 2); tackler = l2k; }
      else {
        const g2 = g1 + U.ri(2, 6);
        const l3k = dc === 'runstop' ? 'S2' : side === 'R' ? 'S2' : 'S1';
        const m3 = gap(elusR(gs, o, rb) - tackleR(gs, d, D[l3k])) * 0.5 + U.gauss(0, 10) - 11 + ({ runstop: 5, cover: -3, blitz: 2, base: 0 }[dc]) + sm(gs, det, rb, 'wrecking') * 0.4 - sm(gs, det, D[l3k], 'suretackle') * 0.6 - sm(gs, det, D[l3k], 'thumper') * 0.4;
        // Stiff Arm: the last man between him and daylight hits the turf
        const stiff = m3 < 0 && sp(gs, det, rb, 'stiffarm', true, 0.4);
        levels.push({ d: l3k, win: m3 >= 0 || stiff, y: g2 });
        if (m3 < 0 && !stiff) { yards = g2 + U.ri(0, 4); tackler = l3k; }
        else { yards = g2 + U.ri(8, 40) + Math.round(sm(gs, det, rb, 'homerun') * U.rand(0.5, 1.5)); tackler = side === 'R' ? 'CB2' : 'CB1'; }
      }
    }
    const s = st(gs, rb, o);
    s.ra++;
    det.levels = levels;
    det.yards = Math.min(yards, 100 - gs.ball);
    det.td = gs.ball + yards >= 100;
    det.tackler = det.td ? null : tackler;
    const dir = side === 'M' ? U.pick(['up the middle', 'through the A-gap', 'off the guard']) : side === 'L' ? U.pick(['around the left end', 'off left tackle']) : U.pick(['around the right end', 'off right tackle']);
    const blockNote = det.blocks.filter(b => b.m >= 10).map(b => `${nm(O[b.o])} pancakes ${nm(D[b.d])}`)[0];
    const fatX = { [rb.id]: 1.5 };
    // fumble on contact
    const grip = U.clamp(1 - sm(gs, null, rb, 'irongrip'), 0.25, 1);
    const fumP = (0.011 - (A(gs, o, rb, 'awr') - 70) * 0.0003) * (grip < 1 ? Math.min(1, gs.wxm.fum) * grip : gs.wxm.fum);
    const forced = !det.td && det.tackler && sp(gs, det, D[det.tackler], 'enforcer', true, 0.1 * grip);
    if (!det.td && det.tackler && (forced || U.chance(fumP))) {
      const rec = D[det.tackler];
      const y = U.clamp(yards, -3, 12);
      gs.ball += y; s.ry += y; gs.ts[o].ry += y; gs.ts[o].yds += y; gs.ts[o].plays++; gs.ts[o].to++;
      st(gs, rec, d).tk++;
      det.fumble = true; det.yards = y;
      tick(gs, runoff(gs, 'play'));
      ev(gs, `${nm(rb)} runs ${dir}... FUMBLE!${wet(gs) ? ' The slick ball squirts loose —' : ''} Recovered by ${nm(rec)}.`, 'to');
      if (gs.ball >= 100) gs.ball = 99;
      fatigue(gs, O, D, fatX);
      changePoss(gs, d, 100 - gs.ball);
      checkClock(gs);
      return det;
    }
    if (det.tackler) st(gs, D[det.tackler], d).tk++;
    if (tfl && det.tackler) sm(gs, det, D[det.tackler], 'stuffer');
    const broke = levels.filter(l => l.win).length;
    const tk = det.tackler ? ` (${nm(D[det.tackler])})` : '';
    const text = det.td ? `${nm(rb)} runs ${dir}${blockNote ? ` behind ${blockNote.split(' pancakes')[0]}` : ''} — ${broke >= 2 ? 'breaks free' : 'finds a crease'} for ${yd(det.yards)}!`
      : yards > 0 ? `${nm(rb)} runs ${dir} for ${yd(det.yards)}${tk}.${broke >= 2 ? ' Broke two tackles!' : blockNote ? ` ${blockNote}.` : ''}`
        : yards === 0 ? `${nm(rb)} is stuffed at the line${tk}.` : `${nm(rb)} is dropped for a loss of ${-yards} by ${nm(D[det.tackler])}.`;
    fatigue(gs, O, D, fatX);
    gain(gs, yards, text + stkNote(det, yards >= 4), { kind: 'run', onYds: y => { s.ry += y; }, onTD: () => { s.rtd++; } });
    if (det.tackler) injury(gs, D[det.tackler], d);
    injury(gs, rb, o);
    return det;
  }

  // ── PASS ──
  const ROUTES = {
    quick: [['WR1', 'slant', 6, 1.0], ['WR3', 'flat', 3, 0.9], ['WR2', 'out', 5, 1.1], ['TE', 'stick', 5, 1.2], ['RB', 'flat', 2, 1.3]],
    pa: [['TE', 'cross', 9, 1.8], ['WR1', 'dig', 14, 2.1], ['WR3', 'seam', 16, 2.2], ['WR2', 'post', 18, 2.4]],
    deep: [['WR3', 'corner', 20, 2.4], ['WR2', 'post', 24, 2.6], ['WR1', 'go', 34, 2.8]],
    screen: [['RB', 'screen', -2, 1.3]],
  };
  function resolvePass(gs, oc, dc) {
    const o = gs.poss, d = 1 - o, O = slots(gs, o, true), D = slots(gs, d, false);
    const det = { type: 'pass', call: oc, dcall: dc, o, los: gs.ball, O: idsOf(O), D: idsOf(D), rush: [], routes: [] };
    const qb = O.QB, qs = st(gs, qb, o);
    // protection
    const pairs = [['DE1', 'LT'], ['DT1', 'LG'], ['DT2', 'RG'], ['DE2', 'RT']];
    const blitzers = dc === 'blitz' ? ['MLB'].concat(U.chance(0.4) ? ['LB1'] : []) : [];
    const extra = oc === 'deep' ? ['RB', 'TE'] : oc === 'pa' ? ['RB'] : [];
    let help = 'C';
    const lead = gs.score[d] > gs.score[o] && gs.qtr >= 4;
    const rushStk = (rp, bp) => soft(rushStkRaw(rp, bp), 3.5);
    const rushStkRaw = (rp, bp) => sm(gs, det, rp, 'bender', (rp.pos === 'DL' && (rp === D.DE1 || rp === D.DE2)) || rp.pos === 'LB') + sm(gs, det, rp, 'bullrush') * (bp && tierOf(bp, 'anchor') >= 0 ? 0.3 : 1)
      + sm(gs, det, rp, 'closer', lead) + sm(gs, det, rp, 'blitzer', dc === 'blitz' && rp.pos !== 'DL') + sm(gs, det, rp, 'getoff') + sm(gs, det, rp, 'longarm')
      - (bp ? sm(gs, det, bp, 'brickwall') + sm(gs, det, bp, 'anchor') * 0.5 + sm(gs, det, bp, 'mirror') + sm(gs, det, bp, 'blitzpickup', rp.pos !== 'DL') : 0);
    // Swim Move: a quick rusher who lands it is past his man almost at once
    const swim = (x, rp, bp) => { if (sp(gs, det, rp, 'swim', true, swimOdds(A(gs, d, rp, 'spd'), bp && tierOf(bp, 'mirror') >= 0))) x.m = Math.max(x.m, 14); return x; };
    const rushRes = pairs.map(([r, b]) => swim({ r, b, m: gap(passRush(gs, d, D[r]) - passBlk(gs, o, O[b])) * 0.6 + U.gauss(0, 9) - (dc === 'cover' ? 2 : 0) + rushStk(D[r], O[b]) }, D[r], O[b]));
    const weakest = rushRes.filter(x => x.r.startsWith('DT')).sort((a, b) => b.m - a.m)[0];
    weakest.m -= 6; weakest.help = help;
    blitzers.forEach((bz, i) => {
      if (extra[i]) rushRes.push(swim({ r: bz, b: extra[i], m: gap(passRush(gs, d, D[bz]) - passBlk(gs, o, O[extra[i]])) * 0.9 + U.gauss(0, 9) + rushStk(D[bz], O[extra[i]]) }, D[bz], O[extra[i]]));
      else rushRes.push({ r: bz, b: null, m: 20 });
    });
    let pressT = 4.2, presser = null;
    for (const x of rushRes) {
      x.t = x.b === null ? U.clamp(1.9 - (A(gs, d, D[x.r], 'spd') - 70) * 0.01 + U.rand(0, 0.3), 1.4, 2.4) : x.m > 7 ? U.clamp(3.0 - (x.m - 7) * 0.06, 1.5, 3.0) : x.m > 0 ? 3.7 : 99;
      x.win = x.t < 99;
      if (x.t < pressT) { pressT = x.t; presser = x.r; }
    }
    if (oc === 'pa') pressT += 0.3;
    pressT += sm(gs, det, qb, 'trigger', oc === 'quick' || oc === 'screen' || dc === 'blitz') * 0.8;
    if (oc === 'screen') pressT = Math.max(pressT, 1.7);
    det.rush = rushRes.map(x => ({ r: x.r, b: x.b, win: x.win, t: x.t, m: Math.round(x.m) }));
    det.pressT = pressT; det.presser = presser;
    // routes & coverage
    const cov = { WR1: 'CB1', WR2: 'CB2', WR3: dc === 'runstop' ? 'LB1' : 'S1', TE: 'LB2', RB: dc === 'blitz' ? null : 'MLB' };
    if (dc === 'blitz' && blitzers.includes('LB1')) cov.WR3 = 'S1';
    const routes = ROUTES[oc].map(([slot, kind, depth, ready]) => {
      const rec = O[slot], dk = cov[slot];
      let sep;
      if (!dk) sep = 9 + U.gauss(0, 3);
      else {
        sep = gap(routeR(gs, o, rec) - coverR(gs, d, D[dk])) * 0.42 + 1.6 + U.gauss(0, 4.8);
        if (depth >= 15) sep += { base: -3, cover: -5, blitz: 2, runstop: 3 }[dc];
        else if (depth < 10) sep += { base: 0, cover: 2.5, blitz: 0, runstop: 1 }[dc];
        if (oc === 'pa') { if (dc !== 'cover') sep += 3; sep += sm(gs, det, qb, 'playaction') * 7.5; }
        const cd = D[dk];
        sep += soft(sm(gs, det, rec, 'routetech', depth < 15) + sm(gs, det, rec, 'burner', depth >= 15) + sm(gs, det, rec, 'redzone', redZone(gs)) + sm(gs, det, rec, 'release', dc !== 'cover' && depth < 15), 1);
        sep -= soft(sm(gs, det, cd, 'lockdown', dc !== 'cover') + sm(gs, det, cd, 'zonehawk', dc === 'cover') + sm(gs, det, cd, 'centerfield', depth >= 15)
          + sm(gs, det, cd, 'covlb', rec.pos === 'TE' || rec.pos === 'RB') + sm(gs, det, cd, 'press', dc !== 'cover' && depth < 15) + sm(gs, det, cd, 'robber', depth < 12) + sm(gs, det, cd, 'recovery', depth >= 15), 1.1);
      }
      return { slot, kind, depth, ready: ready + U.rand(-0.1, 0.1), def: dk, sep: Math.round(sep * 10) / 10 };
    });
    det.routes = routes;
    // QB read
    const awr = A(gs, o, qb, 'awr');
    const ready = routes.filter(r => r.ready <= pressT - 0.1);
    let target = null;
    for (const r of ready) {
      if (U.chance(U.clamp(0.25 - (awr - 70) * 0.01 - sm(gs, null, qb, 'general'), 0.02, 0.4))) continue;
      if (r.sep >= 1.5 - sm(gs, null, qb, 'fearless') * 3) { target = r; break; }
    }
    if (!target && ready.length) {
      const best = ready.slice().sort((a, b) => b.sep - a.sep)[0];
      if (best.sep > -2.5 || pressT < 4) target = best;
    }
    if (!target && !ready.length && pressT >= 4) target = routes.slice().sort((a, b) => b.sep - a.sep)[0];
    const fatX = {};
    const fin = (yds, text, opts) => { fatigue(gs, O, D, fatX); gain(gs, yds, text, opts); };
    // no throw: sack / scramble / throwaway
    if (!target) {
      let sackP = U.clamp(0.55 - (A(gs, o, qb, 'spd') - 60) * 0.012 - sm(gs, det, qb, 'pocket') * 0.6 + sm(gs, det, D[presser], 'sackfinish') * 0.03, 0.1, 0.8);
      if (sp(gs, det, qb, 'escape', true, 0.7)) sackP = 0;
      det.throwT = null;
      if (U.chance(sackP)) {
        const sk = D[presser], ss = st(gs, sk, d);
        ss.sk++; ss.tk++; gs.ts[d].sk++;
        const y = -U.ri(3, 10);
        Object.assign(det, { outcome: 'sack', yards: Math.max(y, -gs.ball), sacker: presser, sackT: pressT });
        if (sp(gs, det, sk, 'strip', true, 0.35)) return stripSack(gs, det, O, D, qb, sk, y, fatX);
        fin(y, `${nm(qb)} is SACKED by ${nm(sk)} for a loss of ${-y}.${stkNote(det, false)}`, { kind: 'sack' });
        injury(gs, qb, o, 0.004);
      } else if (U.chance(0.5)) {
        const y = Math.max(-3, Math.round(U.gauss(2 + (A(gs, o, qb, 'spd') - 65) * 0.12 + sm(gs, det, qb, 'scramble'), 3.5)));
        qs.ra++;
        Object.assign(det, { outcome: 'scramble', yards: Math.min(y, 100 - gs.ball), escapeT: pressT, td: gs.ball + y >= 100 });
        fin(y, `${nm(qb)} escapes the pocket and scrambles for ${yd(Math.min(y, 100 - gs.ball))}.`, { kind: 'run', onYds: v => { qs.ry += v; }, onTD: () => { qs.rtd++; } });
      } else {
        qs.pa++;
        Object.assign(det, { outcome: 'throwaway', yards: 0, throwT: pressT });
        fin(0, `${nm(qb)} feels ${nm(D[presser])} closing and throws it away.`, { kind: 'pass', inc: true });
      }
      return det;
    }
    if (pressT - Math.max(target.ready, 0.85) < 0.35 && presser && U.chance(0.3 - (A(gs, o, qb, 'awr') - 70) * 0.006 - sm(gs, det, qb, 'pocket') * 0.4 + sm(gs, det, D[presser], 'sackfinish') * 0.03) && !sp(gs, det, qb, 'escape', true, 0.5)) {
      const sk = D[presser], ss = st(gs, sk, d);
      ss.sk++; ss.tk++; gs.ts[d].sk++;
      const y = -U.ri(2, 9);
      Object.assign(det, { outcome: 'sack', yards: Math.max(y, -gs.ball), sacker: presser, sackT: pressT, target: target.slot });
      if (sp(gs, det, sk, 'strip', true, 0.35)) return stripSack(gs, det, O, D, qb, sk, y, fatX);
      fin(y, `${nm(qb)} is hit as he looks for ${nm(O[target.slot])} — SACKED by ${nm(sk)}!${stkNote(det, false)}`, { kind: 'sack' });
      return det;
    }
    const rec = O[target.slot], cdef = target.def ? D[target.def] : null;
    det.target = target.slot;
    det.throwT = Math.max(target.ready, 0.85) + U.rand(0, 0.15);
    const pressured = pressT - det.throwT < 0.35;
    det.pressured = pressured;
    const acc = qbAcc(gs, o, qb), dpt = target.depth, rec0 = O[target.slot];
    const cov0 = target.def ? D[target.def] : null;
    const qbStk = sm(gs, det, qb, 'dime', dpt >= 15) + sm(gs, det, qb, 'iceveins', clutch(gs)) + sm(gs, det, qb, 'trigger', oc === 'quick' || oc === 'screen') * 0.6
      + sm(gs, det, qb, 'cannon', dpt >= 15) + sm(gs, det, qb, 'fearless', target.sep < 1)
      + (pressured ? (sm(gs, det, qb, 'pocket') + sm(gs, det, qb, 'ontherun')) * 2.5 : 0);
    const recStk = sm(gs, det, rec0, 'gluehands', target.sep < 0) + sm(gs, det, rec0, 'redzone', redZone(gs)) * 0.2
      + sm(gs, det, rec0, 'deeptrack', dpt >= 20) + sm(gs, det, rec0, 'chainmover', gs.down === 3) + sm(gs, det, rec0, 'toetap', ['out', 'corner', 'go'].includes(target.kind));
    const pC = sig(0.1 + target.sep * 0.15 + gap(acc - 70) * 0.03 - Math.max(0, dpt) * 0.04 - (pressured ? 0.55 : 0) + (oc === 'screen' ? 1.2 : 0) + wxPass(gs, dpt) + soft(qbStk + recStk, 0.32));
    const hawk = (cov0 && target.sep < 1 && sp(gs, det, cov0, 'ballhawk', true, 0.5) ? 1.1 : 0) + (cov0 && dpt < 12 ? sm(gs, det, cov0, 'robber') * 0.8 : 0);
    const pI = sig(-4.4 - target.sep * 0.2 - gap(acc - 70) * 0.03 + dpt * 0.025 + (pressured ? 0.5 : 0) + gs.wxm.int + hawk);
    // Moss'd: a contested deep ball the receiver simply goes up and takes
    const mossd = dpt >= 15 && target.sep < 2 && sp(gs, det, O[target.slot], 'mossd', true, 0.35);
    qs.pa++;
    fatX[rec.id] = dpt >= 15 ? 1 : 0;
    const r = mossd ? 1 : Math.random();
    const where = { slant: 'on a slant', flat: 'in the flat', out: 'on an out', stick: 'on a stick route', cross: 'on a crosser', dig: 'on a dig', seam: 'up the seam', post: 'on a post', corner: 'to the corner', go: 'deep down the sideline', screen: 'on the screen' }[target.kind];
    if (r < pI && cdef) {
      const pk = target.depth >= 15 && dc !== 'blitz' ? D.S2 : cdef;
      qs.pint++; st(gs, pk, d).int++; gs.ts[o].to++; gs.ts[o].plays++;
      const at = gs.ball + Math.max(1, dpt);
      tick(gs, runoff(gs, 'play'));
      fatigue(gs, O, D, fatX);
      Object.assign(det, { outcome: 'int', picker: slotOf(D, pk), yards: dpt });
      if (at >= 100) {
        det.intEnd = 0; det.touchback = true;
        ev(gs, `${nm(qb)} throws for ${nm(rec)} ${where}... INTERCEPTED in the end zone by ${nm(pk)}! Touchback.`, 'to');
        changePoss(gs, d, 25);
      } else if (U.chance(0.04 + sm(gs, det, pk, 'pick6'))) {
        det.intEnd = -1; det.pick6 = true;
        ev(gs, `${nm(qb)} throws for ${nm(rec)} ${where}... PICKED OFF by ${nm(pk)}!`, 'to');
        gs.poss = d; gs.ball = 100;
        touchdown(gs, d, `${nm(pk)} takes it back to the house — PICK SIX!`);
      } else {
        const ret = U.ri(0, 22) + Math.round(sm(gs, det, pk, 'pick6') * 100);
        det.intEnd = dpt - ret;
        ev(gs, `${nm(qb)} throws for ${nm(rec)} ${where}... INTERCEPTED by ${nm(pk)}${target.sep < -3 ? ' who jumped the route' : ''}, returned ${yd(ret)}.${stkNote(det, false)}`, 'to');
        changePoss(gs, d, 100 - at + ret);
      }
      checkClock(gs);
      return det;
    }
    if (mossd || r < pI + pC * (1 - pI)) {
      // completion + run after catch
      let yac = (oc === 'screen' ? Math.max(0, U.gauss(3, 2.5)) : Math.max(0, target.sep * 0.25 + U.gauss(0.3, 1.2))) * gs.wxm.yac + sm(gs, det, rec, 'yac') * 0.15 + sm(gs, det, rec, 'screenpro', oc === 'screen');
      const chasers = [target.def || 'MLB', dpt >= 15 ? 'S2' : (cov.WR3 === 'S1' ? 'MLB' : 'S1'), dpt >= 15 ? (target.slot === 'WR2' ? 'CB2' : 'CB1') : 'S2'];
      const attempts = [];
      let tackler = null;
      for (let i = 0; i < 3; i++) {
        const dk = chasers[i], df = D[dk];
        const m = gap(elusR(gs, o, rec) - tackleR(gs, d, df)) * 0.5 + U.gauss(0, 11) + (i === 0 && target.sep > 4 ? 5 : 0) - i * 2 + soft(sm(gs, det, rec, 'yac'), 3) - soft(sm(gs, det, df, 'suretackle') + sm(gs, det, df, 'sideline', oc === 'screen'), 3);
        // Juke Box: the first man to arrive after the catch grabs air
        const juked = m <= 9 && i === 0 && sp(gs, det, rec, 'jukebox', true, 0.35);
        attempts.push({ d: dk, at: Math.round(dpt + yac), win: m > 9 || juked });
        if (m > 9 || juked) { yac += U.ri(2, 6); if (i === 2) yac += U.ri(6, 35) + Math.round(sm(gs, det, rec, 'homerun') * U.rand(0.5, 1.5)); }
        else { tackler = dk; yac += m > 0 ? U.ri(1, 3) : 0; break; }
      }
      const yds = Math.round(dpt + yac), ts = st(gs, rec, o);
      qs.pc++; ts.rc++;
      det.td = gs.ball + yds >= 100;
      Object.assign(det, { outcome: 'complete', yards: Math.min(yds, 100 - gs.ball), yac: Math.round(yac), attempts, tackler: det.td ? null : tackler });
      if (!det.td && tackler) st(gs, D[tackler], d).tk++;
      const broke = attempts.filter(a => a.win).length;
      const sepNote = target.sep >= 6 ? ` ${nm(rec)} was wide open` : target.sep < 0 ? ` Tight window on ${cdef ? nm(cdef) : 'coverage'}` : '';
      const pNote = pressured ? ' under pressure' : '';
      fin(yds, `${nm(qb)}${pNote} hits ${nm(rec)} ${where} for ${yd(Math.min(yds, 100 - gs.ball))}.${mossd ? ` ${nm(rec)} goes up and MOSSES the defender!` : sepNote ? sepNote + '.' : ''}${broke ? ` Broke ${broke} tackle${broke > 1 ? 's' : ''}!` : ''}${stkNote(det, true)}`, {
        kind: 'pass', onYds: y => { qs.py += y; ts.rcy += y; }, onTD: () => { qs.ptd++; ts.rctd++; },
      });
      injury(gs, rec, o);
    } else {
      const pbu = target.sep < 0 && cdef;
      Object.assign(det, { outcome: 'incomplete', yards: 0, pbu: pbu ? target.def : null });
      const incNote = stkNote(det, false);
      fin(0, pbu ? `${nm(qb)} throws for ${nm(rec)} ${where} — broken up by ${nm(cdef)}!${incNote}` : `${nm(qb)}${pressured ? ' under pressure,' : ''} throws ${where} for ${nm(rec)}... incomplete.`, { kind: 'pass', inc: true });
    }
    return det;
  }

  function stripSack(gs, det, O, D, qb, sk, y, fatX) {
    const o = gs.poss, d = 1 - o;
    const ss = st(gs, sk, d);
    gs.ts[o].to++; gs.ts[o].plays++;
    const spotY = Math.max(1, gs.ball + y);
    Object.assign(det, { outcome: 'sack', yards: Math.max(y, -gs.ball), sacker: det.sacker || slotOf(D, sk), sackT: det.sackT || det.pressT, fumble: true });
    tick(gs, runoff(gs, 'play'));
    fatigue(gs, O, D, fatX);
    gs.ball = spotY;
    ev(gs, `STRIP SACK! ${nm(sk)} rips the ball from ${nm(qb)} — ${gs.abbr[d]} recovers at the ${spot(gs)}! [Strip Sack]`, 'to');
    void ss;
    changePoss(gs, d, 100 - spotY);
    checkClock(gs);
    return det;
  }

  function injury(gs, p, side, rate = 0.0018) {
    if (!p || p.id < 0 || p.pos === 'K' || gs.out[p.id] || gs.over) return;
    if (!U.chance(rate)) return;
    gs.out[p.id] = true;
    const weeks = U.pick([1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 8]);
    gs.injuries.push({ pid: p.id, weeks, side });
    ev(gs, `Injury: ${p.pos} ${nm(p)} (${gs.abbr[side]}) is helped off the field.`, 'inj');
    computeUnits(gs, side);
  }

  // ── 4th down ──
  function maxFg(gs, side = gs.poss) { return 44 + (gs.u[side].k - 60) * 0.35; }
  function aiFourth(gs) {
    const o = gs.poss, diff = gs.score[o] - gs.score[1 - o], fgDist = 100 - gs.ball + 17;
    const inRange = fgDist <= maxFg(gs);
    if (gs.ot && diff < 0 && (gs.otDone || 0) >= 1) return diff >= -3 && inRange ? 'fg' : 'go';
    const lateG = gs.qtr === 4 && gs.clock < 360, veryLate = gs.qtr === 4 && gs.clock < 150;
    if (veryLate && diff < 0) return diff >= -3 && inRange ? 'fg' : 'go';
    if (lateG && diff < -8) return 'go';
    if (gs.togo <= 1 && gs.ball >= 40) return 'go';
    if (gs.togo <= 2 && gs.ball >= 55 && !inRange) return 'go';
    if (inRange) return 'fg';
    if (gs.ball >= 62 && gs.togo <= 4) return 'go';
    return 'punt';
  }
  function fourthInfo(gs) {
    const fgDist = 100 - gs.ball + 17;
    return { suggest: aiFourth(gs), fgDist, fgP: fgProb(gs), canFg: fgDist <= 62, canPunt: true };
  }
  const canKneel = gs => !gs.ot && gs.qtr === 4 && gs.score[gs.poss] > gs.score[1 - gs.poss] && gs.clock <= 120 && gs.down < 4;

  // Which call (if any) the user owes before the next snap.
  function needsCall(gs) {
    if (gs.over || gs.phase !== 'play' || gs.userSide < 0) return null;
    const userOff = gs.poss === gs.userSide;
    if (gs.userCalls) return userOff ? 'off' : 'def';
    if (userOff && gs.down === 4 && gs.askFourth) return 'off';
    return null;
  }
  function suggestOff(gs) {
    if (gs.down === 4) { const f = aiFourth(gs); if (f !== 'go') return f; }
    if (canKneel(gs)) return 'kneel';
    return aiOffCall(gs);
  }

  // ── playbook glue ──
  // A call may be a playbook play id or a call family; the stat-sim works on families.
  const catOf = id => { const p = Playbook.offById(id) || Playbook.defById(id); return p ? p.cat : id; };
  function norm(input) {
    const out = { ...input };
    if (out.off) out.off = catOf(out.off);
    if (out.def) out.def = catOf(out.def);
    return out;
  }

  // ── LIVE SNAPS ──
  // prepare() sets up a play for the physical simulation without resolving it;
  // the live renderer plays it out freely and commit() books what actually happened.
  // Field goals and kneels resolve immediately (det.live = false).
  function prepare(gs, input = {}) {
    if (gs.over) return null;
    gs._g = null;
    gs.lastSit = null; gs.lastPlay = null;
    if (gs.phase === 'kickoff') return prepKickoff(gs);
    const o = gs.poss, d = 1 - o, diff = gs.score[o] - gs.score[d];
    const fgDist = 100 - gs.ball + 17;
    const userOff = o === gs.userSide && input.off, userDef = d === gs.userSide && input.def;
    let oc = userOff ? input.off : null;
    if (!oc) {
      if (canKneel(gs)) oc = 'kneel';
      else if (!gs.ot && (gs.qtr === 2 || gs.qtr === 4) && gs.clock <= 9 && fgDist <= maxFg(gs) + 3 && (gs.qtr === 2 || (diff >= -3 && diff <= 0))) oc = 'fg';
      else if (gs.down === 4) { const f = aiFourth(gs); oc = f === 'go' ? aiOffCall(gs) : f; }
      else oc = aiOffCall(gs);
    }
    if (oc === 'kneel' || oc === 'fg') { step(gs, { off: oc, def: input.def }); if (gs.lastPlay) gs.lastPlay.live = false; return gs.lastPlay; }
    if (oc === 'punt') return prepPunt(gs);
    if (!userOff && oc === 'screen' && U.chance(0.45)) oc = 'quick';
    const play = Playbook.offById(oc) || Playbook.pickOff(oc, gs.plan[o] && gs.plan[o].book);
    const flip = userOff && input.flip != null ? !!input.flip : U.chance(0.5);
    const dplay = (userDef && Playbook.defById(input.def)) || Playbook.pickDef(userDef ? input.def : aiDefCall(gs), gs);
    const cat = play.cat, dc = dplay.cat;
    gs.lastSit = `${downTxt(gs)} at ${spot(gs)}`;
    const t = gs.tend[o];
    t[play.kind]++; t.n++; t.last = cat;
    const td = gs.tend[d];
    if (dc === 'blitz') td.blitz++;
    td.lastDef = dc;
    const O = slots(gs, o, true), D = slots(gs, d, false);
    const det = { type: 'snap', live: true, kind: play.kind, call: cat, dcall: dc, play: play.id, dplay: dplay.id, flip, o, los: gs.ball, togo: gs.togo, O: idsOf(O), D: idsOf(D), down: gs.lastSit };
    gs.lastPlay = det;
    return det;
  }
  function prepKickoff(gs) {
    const k = gs.kicker, r = 1 - k;
    // one roll decides it: a touchback is booked as one (and lands deep in the end zone), never a return relabelled as a touchback
    if (U.chance(tbChance(gs, gs.kicker))) { kickoff(gs, true); gs.lastPlay.live = false; gs.wpH.push(winProb(gs)); return gs.lastPlay; }
    const ret = who(gs, r, U.pick(['RB', 'WR', 'CB']), 1) || who(gs, r, 'WR', 0) || GHOST('WR');
    const det = { type: 'kickoff', live: true, o: r, kickSide: k, returner: ret.id, land: U.ri(-4, 7) };
    gs.lastPlay = det;
    return det;
  }
  function prepPunt(gs) {
    const o = gs.poss, d = 1 - o, k = who(gs, o, 'K') || GHOST('K');
    let dist = Math.round(U.gauss(41 + (k.ovr - 70) * 0.12 + tailwind(gs) * 0.28 - (wet(gs) ? 2 : 0) + sm(gs, null, k, 'bigleg') * 50, 5));
    if (gs.ball + dist >= 100 && gs.ball >= 50 && sp(gs, null, k, 'coffin')) dist = 100 - gs.ball - U.ri(2, 8);
    const land = gs.ball + dist;
    const ret = who(gs, d, 'WR', 1) || who(gs, d, 'CB', 0) || GHOST('WR');
    if (land >= 100 || U.chance(0.36 + sm(gs, null, k, 'hangtime') * 0.04)) {
      // touchback or fair catch: nothing to play out — resolve now
      const det = { type: 'punt', live: false, o, los: gs.ball, land: Math.min(land, 108), returner: ret.id, kicker: k.id };
      gs.lastPlay = det;
      tick(gs, U.ri(6, 11));
      gs.ts[o].plays++;
      if (land >= 100) { det.touchback = true; det.end = 80; ev(gs, `${nm(k)} punts into the end zone. Touchback.`, 'punt'); changePoss(gs, d, 20); }
      else { det.fair = true; det.end = land; ev(gs, `${nm(k)} punts ${dist} yds. Fair catch by ${nm(ret)}.`, 'punt'); changePoss(gs, d, U.clamp(100 - land, 1, 99)); }
      checkClock(gs);
      gs.wpH.push(winProb(gs));
      return det;
    }
    const det = { type: 'punt', live: true, o, los: gs.ball, land, dist, returner: ret.id, kicker: k.id };
    gs.lastPlay = det;
    return det;
  }

  // Book the outcome of a freely simulated play. `res` comes from the live sim;
  // if it's missing (watchdog), the play falls back to the stat-sim.
  function commit(gs, det, res) {
    if (!det || !det.live || gs.over) return;
    if (det.type === 'kickoff') return commitKick(gs, det, res);
    if (det.type === 'punt') return commitPunt(gs, det, res);
    if (!res) { const fb = det.kind === 'run' ? resolveRun(gs, det.call, det.dcall) : resolvePass(gs, det.call, det.dcall); Object.assign(det, fb, { type: 'snap', live: true }); gs.wpH.push(winProb(gs)); return; }
    const o = gs.poss, d = 1 - o;
    const P = id => (id != null && id >= 0 && G.players[id]) || GHOST('WR');
    const O = {}, Dd = {};
    for (const k in det.O) O[k] = P(det.O[k]);
    for (const k in det.D) Dd[k] = P(det.D[k]);
    const oP = k => (k ? O[k] : null), dP = k => (k ? Dd[k] : null);
    const play = Playbook.offById(det.play), dplay = Playbook.defById(det.dplay);
    const qb = O.QB, qs = st(gs, qb, o);
    const fatX = {};
    const tk = res.tackler ? dP(res.tackler) : null;
    const tkTxt = tk ? ` (${nm(tk)})` : '';
    const broke = res.broke ? ` Broke ${res.broke} tackle${res.broke > 1 ? 's' : ''}!` : '';
    const room = 100 - gs.ball;
    const Y = v => Math.min(Math.round(v), room);
    det.outcome = res.outcome; det.td = !!res.td;
    fatigue(gs, O, Dd, fatX);
    // fumble lost on a run/catch/sack: the defense takes over at the spot
    const lost = res.fumble && res.fumble.lost;
    if (res.outcome === 'int') {
      const pk = dP(res.picker), rec = oP(res.target);
      qs.pa++; qs.pint++; st(gs, pk, d).int++; gs.ts[o].to++; gs.ts[o].plays++;
      tick(gs, runoff(gs, 'play'));
      const where = `for ${nm(rec)}`;
      if (res.touchback) {
        ev(gs, `${nm(qb)} throws ${where}... INTERCEPTED in the end zone by ${nm(pk)}! Touchback.${stkNote(det, false)}`, 'to');
        changePoss(gs, d, 25);
      } else if (res.td) {
        ev(gs, `${nm(qb)} throws ${where}... PICKED OFF by ${nm(pk)}!`, 'to');
        gs.poss = d; gs.ball = 100;
        touchdown(gs, d, `${nm(pk)} takes it back to the house — PICK SIX!${stkNote(det, false)}`);
      } else {
        const end = U.clamp(Math.round(res.endOpp), 1, 99); // defense's own frame
        ev(gs, `${nm(qb)} throws ${where}... INTERCEPTED by ${nm(pk)}, returned to the ${spot(gs, d, end)}.${stkNote(det, false)}`, 'to');
        changePoss(gs, d, end);
      }
      checkClock(gs);
      gs.wpH.push(winProb(gs));
      return;
    }
    if (res.outcome === 'sack') {
      const sk = dP(res.sacker) || tk, ss = st(gs, sk, d);
      ss.sk++; ss.tk++; gs.ts[d].sk++;
      const y = Y(res.yards);
      det.yards = y;
      if (lost) {
        gs.ts[o].to++; gs.ts[o].plays++;
        tick(gs, runoff(gs, 'play'));
        const spotY = U.clamp(gs.ball + y, 1, 99);
        gs.ball = spotY;
        ev(gs, `STRIP SACK! ${nm(sk)} knocks the ball from ${nm(qb)} — ${gs.abbr[d]} recovers at the ${spot(gs)}!${stkNote(det, false)}`, 'to');
        changePoss(gs, d, 100 - spotY);
        checkClock(gs);
      } else gain(gs, y, `${nm(qb)} is SACKED by ${nm(sk)} for a loss of ${-y}.${stkNote(det, false)}`, { kind: 'sack' });
      injury(gs, qb, o, 0.004);
      gs.wpH.push(winProb(gs));
      return;
    }
    if (res.outcome === 'incomplete' || res.outcome === 'throwaway') {
      qs.pa++;
      const rec = oP(res.target), pbu = dP(res.pbu);
      det.yards = 0;
      const text = res.outcome === 'throwaway' ? `${nm(qb)} is flushed and throws it away.`
        : pbu ? `${nm(qb)} throws for ${nm(rec)} — broken up by ${nm(pbu)}!${stkNote(det, false)}`
          : res.drop ? `${nm(qb)} hits ${nm(rec)} in the hands... dropped.` : `${nm(qb)}${res.pressured ? ' under pressure,' : ''} throws for ${nm(rec)}... incomplete.`;
      gain(gs, 0, text, { kind: 'pass', inc: true });
      gs.wpH.push(winProb(gs));
      return;
    }
    // ball-carrier outcomes: run, scramble, complete
    const car = oP(res.carrier) || qb, cs = st(gs, car, o);
    const y = Y(res.yards);
    det.yards = y;
    if (tk && !res.td) st(gs, tk, d).tk++;
    const isPass = res.outcome === 'complete';
    if (isPass) { qs.pa++; qs.pc++; cs.rc++; } else cs.ra++;
    fatX[car.id] = 1.2;
    const playName = play ? play.name : '';
    if (lost) {
      const rec = dP(res.fumble.rec);
      gs.ball = U.clamp(gs.ball + y, 1, 99);
      if (isPass) { qs.py += y; cs.rcy += y; gs.ts[o].py += y; } else { cs.ry += y; gs.ts[o].ry += y; }
      gs.ts[o].yds += y; gs.ts[o].plays++; gs.ts[o].to++;
      tick(gs, runoff(gs, 'play'));
      ev(gs, `${isPass ? `${nm(qb)} hits ${nm(car)} for ${yd(y)}` : `${nm(car)} runs for ${yd(y)}`}... FUMBLE! Recovered by ${nm(rec)}.${stkNote(det, false)}`, 'to');
      changePoss(gs, d, 100 - gs.ball);
      checkClock(gs);
      gs.wpH.push(winProb(gs));
      return;
    }
    let text;
    const fumNote = res.fumble ? ' Fumbles — but the offense falls on it.' : '';
    const oob = res.oob ? ' Pushed out of bounds.' : '';
    if (isPass) {
      const rec = car;
      const air = Math.round(res.air || 0);
      text = `${nm(qb)}${res.pressured ? ' under pressure' : ''} hits ${nm(rec)} for ${yd(y)}${res.td ? '!' : tkTxt + '.'}${air >= 20 ? ` ${air} yards in the air.` : res.yac >= 10 ? ` ${Math.round(res.yac)} after the catch.` : ''}${broke}${oob}${fumNote}${stkNote(det, true)}`;
    } else if (res.outcome === 'scramble') {
      qs.ra = qs.ra || 0;
      text = `${nm(qb)} escapes the pocket and scrambles for ${yd(y)}${res.td ? '!' : tkTxt + '.'}${res.slide ? ' Slides to end it.' : ''}${oob}${fumNote}`;
    } else {
      const lane = res.lane || '';
      text = res.td ? `${nm(car)} takes the ${playName}${lane} — ${res.broke >= 2 ? 'breaks free' : 'finds a crease'} for ${yd(y)}!`
        : y > 0 ? `${nm(car)} ${playName ? `on the ${playName}` : 'runs'}${lane} for ${yd(y)}${tkTxt}.${broke}${oob}${fumNote}`
          : y === 0 ? `${nm(car)} is stuffed at the line${tkTxt}.${fumNote}` : `${nm(car)} is dropped for a loss of ${-y}${tkTxt}.${fumNote}`;
      text += stkNote(det, y >= 4);
    }
    gain(gs, y, text, {
      kind: isPass ? 'pass' : 'run', oob: res.oob,
      onYds: v => { if (isPass) { qs.py += v; cs.rcy += v; } else cs.ry += v; },
      onTD: () => { if (isPass) { qs.ptd++; cs.rctd++; } else cs.rtd++; },
    });
    if (tk) injury(gs, tk, d);
    injury(gs, car, o);
    void dplay;
    gs.wpH.push(winProb(gs));
  }
  function commitKick(gs, det, res) {
    if (!res) { kickoff(gs); gs.wpH.push(winProb(gs)); return; }
    const k = det.kickSide, r = det.o, ret = G.players[det.returner] || GHOST('WR');
    gs.poss = r;
    if (res.td) { gs.ball = 100; tick(gs, 12); touchdown(gs, r, `${nm(ret)} takes the kickoff ALL THE WAY BACK!`); gs.wpH.push(winProb(gs)); return checkClock(gs); }
    if (res.touchback) { gs.ball = 35; ev(gs, `${gs.abbr[k]} kicks into the end zone — ${nm(ret)} takes a knee. ${gs.abbr[r]} ball at the 35.`, 'kick'); }
    else {
      gs.ball = U.clamp(Math.round(res.end), 1, 99);
      tick(gs, 6);
      const tk = res.tacklerPid != null ? G.players[res.tacklerPid] : null;
      if (tk) st(gs, tk, k).tk++;
      ev(gs, `${nm(ret)} returns the kickoff to the ${spot(gs)}${tk ? ` (${nm(tk)})` : ''}.${res.broke ? ` Broke ${res.broke} tackle${res.broke > 1 ? 's' : ''}!` : ''}`, res.end >= 40 ? 'big' : 'kick');
    }
    det.end = gs.ball;
    gs.down = 1; gs.togo = 10; gs.phase = 'play';
    startDrive(gs);
    checkClock(gs);
    gs.wpH.push(winProb(gs));
  }
  function commitPunt(gs, det, res) {
    if (!res) { punt(gs); gs.wpH.push(winProb(gs)); return; }
    const o = det.o, d = 1 - o, k = G.players[det.kicker] || GHOST('K'), ret = G.players[det.returner] || GHOST('WR');
    tick(gs, U.ri(6, 11));
    gs.ts[o].plays++;
    if (res.td) {
      ev(gs, `${nm(k)} punts ${det.dist} yds...`, 'punt');
      gs.poss = d; gs.ball = 100;
      touchdown(gs, d, `${nm(ret)} weaves through the coverage on the return!`);
      gs.wpH.push(winProb(gs));
      return checkClock(gs);
    }
    const nb = U.clamp(Math.round(res.end), 1, 99);
    const r = Math.max(0, nb - (100 - Math.min(99, det.land)));
    ev(gs, `${nm(k)} punts ${det.dist} yds. ${nm(ret)} returns it ${yd(r)}.`, r >= 15 ? 'big' : 'punt');
    changePoss(gs, d, nb);
    checkClock(gs);
    gs.wpH.push(winProb(gs));
  }
  // composite ratings for the physical sim
  function ratings(gs, side, p) {
    if (!p) p = GHOST('WR');
    const a = k => A(gs, side, p, k);
    return {
      spd: a('spd'), str: a('str'), awr: a('awr'), skl: a('skl'),
      tackle: tackleR(gs, side, p), elus: elusR(gs, side, p), route: routeR(gs, side, p), cover: coverR(gs, side, p),
      pblk: passBlk(gs, side, p), rblk: runBlk(gs, side, p), rush: passRush(gs, side, p), rdef: runDef(gs, side, p), acc: qbAcc(gs, side, p),
    };
  }

  // ── main step ──
  // input: { off, def } — calls for the user's side; anything missing is AI-called.
  function step(gs, input = {}) {
    if (gs.over) return 'over';
    gs._g = null;
    input = norm(input);
    gs.lastSit = null; gs.lastPlay = null;
    if (gs.phase === 'kickoff') { kickoff(gs); gs.wpH.push(winProb(gs)); return gs.over ? 'over' : 'ok'; }
    const o = gs.poss, d = 1 - o, diff = gs.score[o] - gs.score[d];
    const fgDist = 100 - gs.ball + 17;
    const userOff = o === gs.userSide && input.off, userDef = d === gs.userSide && input.def;
    let oc = userOff ? input.off : null;
    if (!oc) {
      if (canKneel(gs)) oc = 'kneel';
      else if (!gs.ot && (gs.qtr === 2 || gs.qtr === 4) && gs.clock <= 9 && fgDist <= maxFg(gs) + 3 && (gs.qtr === 2 || (diff >= -3 && diff <= 0))) oc = 'fg';
      else if (gs.down === 4) { const f = aiFourth(gs); oc = f === 'go' ? aiOffCall(gs) : f; }
      else oc = aiOffCall(gs);
    }
    if (oc === 'kneel') {
      const qb = who(gs, o, 'QB') || GHOST('QB');
      gs.lastPlay = { type: 'kneel', o, los: gs.ball, O: idsOf(slots(gs, o, true)), D: idsOf(slots(gs, d, false)) };
      gs.ball = Math.max(1, gs.ball - 1); gs.down++; gs.togo++;
      tick(gs, 40);
      ev(gs, `${nm(qb)} takes a knee.`, 'play');
      checkClock(gs);
      return 'ok';
    }
    if (oc === 'punt') { punt(gs); gs.wpH.push(winProb(gs)); return gs.over ? 'over' : 'ok'; }
    if (oc === 'fg') { fieldGoal(gs); gs.wpH.push(winProb(gs)); return gs.over ? 'over' : 'ok'; }
    if (oc === 'punt') oc = aiOffCall(gs);
    const dc = userDef ? input.def : aiDefCall(gs);
    gs.lastSit = `${downTxt(gs)} at ${spot(gs)}`;
    const kind = OFF_CALLS.find(c => c.id === oc).kind;
    const t = gs.tend[o];
    t[kind]++; t.n++; t.last = oc;
    const td = gs.tend[d];
    if (dc === 'blitz') td.blitz++;
    td.lastDef = dc;
    const det = kind === 'run' ? resolveRun(gs, oc, dc) : resolvePass(gs, oc, dc);
    det.down = gs.lastSit;
    gs.lastPlay = det;
    gs.wpH.push(winProb(gs));
    return gs.over ? 'over' : 'ok';
  }

  function simToEnd(gs) {
    let guard = 0;
    while (!gs.over && guard++ < 2500) step(gs);
    return gs;
  }

  function winProb(gs) {
    if (gs.over) return gs.score[0] > gs.score[1] ? 1 : 0;
    const left = gs.ot ? 0.05 : U.clamp(((4 - gs.qtr) * QLEN + gs.clock) / (4 * QLEN), 0, 1);
    const diff = gs.score[0] - gs.score[1];
    const fieldEdge = gs.phase === 'play' ? ((gs.ball - 30) / 70) * 3.5 : 0;
    const poss = (gs.poss === 0 ? 1 : -1) * (1 + fieldEdge);
    const sd = 2.2 + 13 * Math.sqrt(left);
    return U.clamp(1 / (1 + Math.exp(-1.7 * (diff + gs.pre * left + poss) / sd)), 0.01, 0.99);
  }
  function preWinProb(homeTeam, awayTeam, neutral) {
    const d = L.power(homeTeam) - L.power(awayTeam) + (neutral ? 0 : 1.5);
    return U.clamp(1 / (1 + Math.exp(-d / 4.2)), 0.03, 0.97);
  }

  return {
    create, step, prepare, commit, ratings, simToEnd, winProb, preWinProb, fourthInfo, needsCall, suggestOff, aiDefCall, callEdges, canKneel,
    spot, downTxt, slots, stam, OFF_CALLS, DEF_CALLS,
    stk: { sm, sp, tierOf, clutch, redZone, shortYd, wxPass, swimOdds, tbChance },
  };
})();
