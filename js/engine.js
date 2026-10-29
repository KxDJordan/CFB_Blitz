'use strict';
// ── GAME ENGINE ───────────────────────────────────────────────────
// Snap-by-snap simulation driven by individual player matchups.
// Side 0 = home, side 1 = away. gs.ball = yards from the offense's own goal.
// Every scrimmage play produces gs.lastPlay — a detailed record the live
// renderer turns into an animated play.

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
  const GHOST = pos => ({ id: -1, first: 'Walk', last: 'On', pos, num: 0, ovr: 42, attrs: { spd: 42, str: 42, awr: 42, skl: 42 } });
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
  // Effective attribute: fatigue + home field.
  function A(gs, side, p, a) {
    const f = 0.82 + 0.18 * (stam(gs, p) / 100);
    return p.attrs[a] * f + (side === 0 && !gs.neutral ? 1.2 : 0);
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

  function unitAvg(gs, side, pos, n) {
    const pl = avail(gs, side, pos), v = [];
    for (let i = 0; i < n; i++) v.push(pl[i] ? pl[i].ovr : 38);
    return U.avg(v);
  }
  function computeUnits(gs, side) {
    const u = {};
    for (const pos of DATA.POSITIONS) u[pos.toLowerCase()] = unitAvg(gs, side, pos, DATA.STARTERS[pos]);
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
    return { off, def };
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
      wx: opts.weather || { type: 'clear', temp: 65, wind: 0, dir: 0, time: 'day' }, wxm: null,
      plan: [null, null], userSide: opts.userSide ?? -1, askFourth: !!opts.askFourth, userCalls: !!opts.userCalls, neutral: !!opts.neutral,
      log: [], ps: {}, ts: [blankTS(), blankTS()], injuries: [], tend: [{ run: 0, pass: 0, blitz: 0, n: 0, last: null }, { run: 0, pass: 0, blitz: 0, n: 0, last: null }],
      phase: 'kickoff', kicker: U.ri(0, 1), recv1: 0,
      ot: 0, otPoss: 0, otFirst: 0, otSide: 0, over: false, n: 0, lastPlay: null,
      drive: { side: 0, start: 25, plays: 0, yds: 0, clk: QLEN, q: 1 }, wpH: [],
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

  // ── fatigue ──
  const DRAIN = { QB: 0.6, RB: 1.3, WR: 1.6, TE: 1.5, OL: 1.8, DL: 2.1, LB: 1.8, CB: 1.6, S: 1.5, K: 0 };
  function fatigue(gs, O, D, extra = {}) {
    const onField = new Set();
    for (const p of [...Object.values(O), ...Object.values(D)]) {
      if (p.id < 0) continue;
      onField.add(p.id);
      gs.stam[p.id] = Math.max(0, stam(gs, p) - DRAIN[p.pos] * gs.wxm.drain - (extra[p.id] || 0) - U.rand(0, 0.6));
    }
    for (const side of [0, 1]) for (const pos of DATA.POSITIONS) for (const id of gs.lu[side][pos]) {
      if (!onField.has(id) && gs.stam[id] !== undefined) gs.stam[id] = Math.min(100, gs.stam[id] + 2.4);
    }
  }

  // ── possession changes ──
  function startDrive(gs) { gs.drive = { side: gs.poss, start: gs.ball, plays: 0, yds: 0, clk: gs.clock, q: gs.qtr }; }
  function changePoss(gs, side, ball) {
    if (gs.ot) return otNext(gs);
    gs.poss = side; gs.ball = U.clamp(Math.round(ball), 1, 99);
    gs.down = 1; gs.togo = Math.min(10, 100 - gs.ball);
    gs.phase = 'play';
    startDrive(gs);
  }
  function beginOT(gs, side) {
    gs.otSide = side; gs.poss = side; gs.ball = 75; gs.down = 1; gs.togo = 10; gs.phase = 'play';
    startDrive(gs);
    ev(gs, `OT${gs.ot}: ${gs.abbr[side]} takes over at the ${gs.abbr[1 - side]} 25.`, 'info');
  }
  function otNext(gs) {
    gs.otPoss++;
    if (gs.otPoss % 2 === 0) {
      if (gs.score[0] !== gs.score[1]) return finish(gs);
      gs.ot++; gs.qtr++;
      if (gs.ot > 7) {
        const w = gs.u[0].k >= gs.u[1].k ? 0 : 1;
        addPts(gs, w, 3);
        ev(gs, `${gs.abbr[w]} finally ends the marathon with a field goal!`, 'fg');
        return finish(gs);
      }
      return beginOT(gs, gs.ot % 2 ? gs.otFirst : 1 - gs.otFirst);
    }
    beginOT(gs, 1 - gs.otSide);
  }
  function finish(gs) {
    gs.over = true; gs.phase = 'over';
    const w = gs.score[0] > gs.score[1] ? 0 : 1;
    ev(gs, `FINAL${gs.ot ? ` (${gs.ot > 1 ? gs.ot : ''}OT)` : ''}: ${gs.abbr[w]} ${gs.score[w]}, ${gs.abbr[1 - w]} ${gs.score[1 - w]}`, 'final');
  }

  // ── clock ──
  function runoff(gs, kind) {
    if (gs.ot) return 0;
    const o = gs.poss, diff = gs.score[o] - gs.score[1 - o];
    if (kind === 'inc') return U.ri(5, 8);
    if ((gs.qtr === 2 && gs.clock < 120) || (gs.qtr === 4 && gs.clock < 300 && diff < 0)) return U.ri(11, 19);
    if (gs.qtr === 4 && diff > 0 && gs.clock < 480) return U.ri(38, 44);
    return U.ri(25, 37);
  }
  function tick(gs, t) {
    if (gs.ot) return;
    gs.clock -= t;
    gs.ts[gs.poss].top += Math.min(t, Math.max(0, gs.clock + t));
  }
  function checkClock(gs) {
    if (gs.ot || gs.over || gs.clock > 0) return;
    gs.clock = 0;
    if (gs.qtr === 2) {
      ev(gs, 'HALFTIME', 'half');
      gs.qtr = 3; gs.clock = QLEN; gs.phase = 'kickoff'; gs.kicker = gs.recv1;
      for (const id in gs.stam) gs.stam[id] = Math.min(100, gs.stam[id] + 35);
      aiAdjust(gs, 0); aiAdjust(gs, 1);
    } else if (gs.qtr === 4) {
      if (gs.score[0] === gs.score[1]) {
        ev(gs, 'End of regulation — we are headed to OVERTIME!', 'qend');
        gs.ot = 1; gs.qtr = 5; gs.otFirst = U.ri(0, 1); gs.otPoss = 0;
        beginOT(gs, gs.otFirst);
      } else finish(gs);
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
    const goTwo = gs.ot >= 3 || (gs.qtr >= 4 && (diff === -2 || diff === -5 || diff === -10) && gs.clock < 600);
    if (goTwo) {
      if (U.chance(0.46)) { addPts(gs, side, 2); pat = 'Two-point try is GOOD.'; } else pat = 'Two-point try fails.';
    } else {
      const k = who(gs, side, 'K');
      if (U.chance(0.955 + ((k ? k.ovr : 60) - 70) * 0.002)) { addPts(gs, side, 1); pat = 'PAT good.'; } else pat = 'PAT is NO GOOD!';
    }
    gs.drive.td = true;
    ev(gs, `${text} TOUCHDOWN ${gs.abbr[side]}! ${pat}`, 'td', { scorer: side });
    if (gs.ot) return otNext(gs);
    gs.phase = 'kickoff'; gs.kicker = side;
  }
  function safety(gs, text) {
    const d = 1 - gs.poss;
    addPts(gs, d, 2);
    ev(gs, `${text} SAFETY! ${gs.abbr[d]} adds two.`, 'td', { scorer: d });
    if (gs.ot) return otNext(gs);
    gs.phase = 'kickoff'; gs.kicker = gs.poss;
  }

  // ── special teams ──
  function kickoff(gs) {
    const k = gs.kicker, r = 1 - k;
    const ret = who(gs, r, U.pick(['RB', 'WR', 'CB']), 1) || who(gs, r, 'WR', 0) || GHOST('WR');
    const det = { type: 'kickoff', o: r, kickSide: k, returner: ret.id, land: U.ri(-6, 4) };
    gs.lastPlay = det;
    gs.poss = r;
    if (U.chance(0.62)) {
      gs.ball = 25; det.touchback = true; det.land = U.ri(-8, -2);
      ev(gs, `${gs.abbr[k]} kicks off — touchback. ${gs.abbr[r]} ball at the 25.`, 'kick');
    } else if (U.chance(0.006)) {
      gs.ball = 100; det.end = 100; tick(gs, 12);
      touchdown(gs, r, `${nm(ret)} takes the kickoff ALL THE WAY BACK!`);
      return checkClock(gs);
    } else {
      gs.ball = U.clamp(Math.round(U.gauss(24, 6)), 8, 48);
      tick(gs, 6);
      ev(gs, `${nm(ret)} returns the kickoff to the ${spot(gs)}.`, 'kick');
    }
    det.end = gs.ball;
    gs.down = 1; gs.togo = 10; gs.phase = 'play';
    startDrive(gs);
    checkClock(gs);
  }
  function punt(gs) {
    const o = gs.poss, d = 1 - o, k = who(gs, o, 'K') || GHOST('K');
    const dist = Math.round(U.gauss(41 + (k.ovr - 70) * 0.12 + tailwind(gs) * 0.28 - (wet(gs) ? 2 : 0), 5));
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
      let r = U.chance(0.38) ? 0 : Math.max(0, Math.round(U.gauss(7, 6)));
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
    const windAdj = tailwind(gs, side) * (dist > 35 ? 0.005 : 0.002) - crosswind(gs) * (dist > 30 ? 0.004 : 0.0015);
    return U.clamp(0.99 - Math.max(0, dist - 22) * 0.017 + ((k ? k.ovr : 60) - 70) * 0.004 + gs.wxm.fg + windAdj, 0.03, 0.99);
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
      if (gs.ot) otNext(gs);
      else { gs.phase = 'kickoff'; gs.kicker = o; }
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
    gs.ball += y;
    gs.ts[o].plays++; gs.ts[o].yds += y;
    if (opts.kind === 'pass') gs.ts[o].py += y; else if (opts.kind === 'run') gs.ts[o].ry += y;
    gs.drive.plays++; gs.drive.yds += y;
    if (opts.onYds) opts.onYds(y);
    tick(gs, runoff(gs, opts.inc ? 'inc' : 'play'));
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
    const rb = U.chance(0.1) && oc === 'inside' ? O.QB : O.RB;
    det.carrier = slotOf(O, rb);
    const mod = { runstop: -4, blitz: oc === 'inside' ? -1 : 2, cover: 4, base: 0 }[dc] + (oc === 'outside' && dc === 'runstop' ? -2 : 0);
    const pairs = side === 'M' ? [['LG', 'DT1'], ['RG', 'DT2'], ['C', dc === 'runstop' ? 'S1' : dc === 'blitz' ? 'LB1' : 'MLB']]
      : side === 'L' ? [['LT', 'DE1'], ['LG', 'LB1'], ['WR3', 'CB1']] : [['RT', 'DE2'], ['TE', 'LB2'], ['WR2', 'CB2']];
    let sum = 0, tfl = null;
    for (const [ok, dk] of pairs) {
      const ob = O[ok], db = D[dk];
      const off = ob.pos === 'WR' ? A(gs, o, ob, 'str') * 0.6 + A(gs, o, ob, 'awr') * 0.4 - 6 : runBlk(gs, o, ob);
      const def = db.pos === 'DL' ? runDef(gs, d, db) : tackleR(gs, d, db);
      const m = (off - def) * 0.7 + U.gauss(0, 9) + mod;
      det.blocks.push({ o: ok, d: dk, m: Math.round(m), win: m >= 0 });
      sum += m;
      if (m < -11 && !tfl) tfl = dk;
    }
    const laneQ = sum / pairs.length / 10;
    let yards, tackler = null;
    const levels = [];
    if (dc === 'blitz' && oc === 'inside' && U.chance(0.22)) tfl = tfl || 'MLB';
    if (tfl) {
      yards = -U.ri(1, 3); tackler = tfl;
      levels.push({ d: tfl, win: false, y: yards });
    } else {
      const g1 = Math.round(U.clamp(1.7 + laneQ * 2.4 + U.gauss(0, 1.4) + (side !== 'M' ? U.gauss(0.3, 1.8) : 0), -1, 7));
      const l2k = side === 'M' ? (dc === 'blitz' ? 'LB2' : 'MLB') : side === 'L' ? (det.blocks[1].win ? 'MLB' : 'LB1') : (det.blocks[1].win ? 'MLB' : 'LB2');
      const l2 = D[l2k];
      const m2 = (elusR(gs, o, rb) - tackleR(gs, d, l2)) * 0.6 + U.gauss(0, 10) + laneQ * 4 + ({ cover: 3, runstop: -3, blitz: 1, base: 0 }[dc]) + (side !== 'M' ? (A(gs, o, rb, 'spd') - A(gs, d, l2, 'spd')) * 0.3 : 0) + (l2k === 'MLB' && side !== 'M' ? 3 : 0);
      levels.push({ d: l2k, win: m2 >= 8, y: g1 });
      if (m2 < 8) { yards = g1 + U.ri(0, 2); tackler = l2k; }
      else {
        const g2 = g1 + U.ri(2, 6);
        const l3k = dc === 'runstop' ? 'S2' : side === 'R' ? 'S2' : 'S1';
        const m3 = (elusR(gs, o, rb) - tackleR(gs, d, D[l3k])) * 0.6 + U.gauss(0, 10) - 11 + ({ runstop: 5, cover: -3, blitz: 2, base: 0 }[dc]);
        levels.push({ d: l3k, win: m3 >= 0, y: g2 });
        if (m3 < 0) { yards = g2 + U.ri(0, 4); tackler = l3k; }
        else { yards = g2 + U.ri(8, 40); tackler = side === 'R' ? 'CB2' : 'CB1'; }
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
    if (!det.td && det.tackler && U.chance((0.011 - (A(gs, o, rb, 'awr') - 70) * 0.0003) * gs.wxm.fum)) {
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
    const broke = levels.filter(l => l.win).length;
    const tk = det.tackler ? ` (${nm(D[det.tackler])})` : '';
    const text = det.td ? `${nm(rb)} runs ${dir}${blockNote ? ` behind ${blockNote.split(' pancakes')[0]}` : ''} — ${broke >= 2 ? 'breaks free' : 'finds a crease'} for ${yd(det.yards)}!`
      : yards > 0 ? `${nm(rb)} runs ${dir} for ${yd(det.yards)}${tk}.${broke >= 2 ? ' Broke two tackles!' : blockNote ? ` ${blockNote}.` : ''}`
        : yards === 0 ? `${nm(rb)} is stuffed at the line${tk}.` : `${nm(rb)} is dropped for a loss of ${-yards} by ${nm(D[det.tackler])}.`;
    fatigue(gs, O, D, fatX);
    gain(gs, yards, text, { kind: 'run', onYds: y => { s.ry += y; }, onTD: () => { s.rtd++; } });
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
    const rushRes = pairs.map(([r, b]) => ({ r, b, m: (passRush(gs, d, D[r]) - passBlk(gs, o, O[b])) * 0.7 + U.gauss(0, 9) - (dc === 'cover' ? 2 : 0) }));
    const weakest = rushRes.filter(x => x.r.startsWith('DT')).sort((a, b) => b.m - a.m)[0];
    weakest.m -= 6; weakest.help = help;
    blitzers.forEach((bz, i) => {
      if (extra[i]) rushRes.push({ r: bz, b: extra[i], m: passRush(gs, d, D[bz]) - passBlk(gs, o, O[extra[i]]) * 0.9 + U.gauss(0, 9) });
      else rushRes.push({ r: bz, b: null, m: 20 });
    });
    let pressT = 4.2, presser = null;
    for (const x of rushRes) {
      x.t = x.b === null ? U.clamp(1.9 - (A(gs, d, D[x.r], 'spd') - 70) * 0.01 + U.rand(0, 0.3), 1.4, 2.4) : x.m > 7 ? U.clamp(3.0 - (x.m - 7) * 0.06, 1.5, 3.0) : x.m > 0 ? 3.7 : 99;
      x.win = x.t < 99;
      if (x.t < pressT) { pressT = x.t; presser = x.r; }
    }
    if (oc === 'pa') pressT += 0.3;
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
        sep = (routeR(gs, o, rec) - coverR(gs, d, D[dk])) * 0.6 + U.gauss(0, 7);
        if (depth >= 15) sep += { base: -3, cover: -5, blitz: 2, runstop: 3 }[dc];
        else if (depth < 10) sep += { base: 0, cover: 2.5, blitz: 0, runstop: 1 }[dc];
        if (oc === 'pa' && dc !== 'cover') sep += 3;
      }
      return { slot, kind, depth, ready: ready + U.rand(-0.1, 0.1), def: dk, sep: Math.round(sep * 10) / 10 };
    });
    det.routes = routes;
    // QB read
    const awr = A(gs, o, qb, 'awr');
    const ready = routes.filter(r => r.ready <= pressT - 0.1);
    let target = null;
    for (const r of ready) {
      if (U.chance(U.clamp(0.25 - (awr - 70) * 0.01, 0.05, 0.4))) continue;
      if (r.sep >= 1.5) { target = r; break; }
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
      const sackP = U.clamp(0.55 - (A(gs, o, qb, 'spd') - 60) * 0.012, 0.15, 0.75);
      det.throwT = null;
      if (U.chance(sackP)) {
        const sk = D[presser], ss = st(gs, sk, d);
        ss.sk++; ss.tk++; gs.ts[d].sk++;
        const y = -U.ri(3, 10);
        Object.assign(det, { outcome: 'sack', yards: Math.max(y, -gs.ball), sacker: presser, sackT: pressT });
        fin(y, `${nm(qb)} is SACKED by ${nm(sk)} for a loss of ${-y}.`, { kind: 'sack' });
        injury(gs, qb, o, 0.004);
      } else if (U.chance(0.5)) {
        const y = Math.max(-3, Math.round(U.gauss(2 + (A(gs, o, qb, 'spd') - 65) * 0.12, 3.5)));
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
    if (pressT - Math.max(target.ready, 0.85) < 0.35 && presser && U.chance(0.3 - (A(gs, o, qb, 'awr') - 70) * 0.006)) {
      const sk = D[presser], ss = st(gs, sk, d);
      ss.sk++; ss.tk++; gs.ts[d].sk++;
      const y = -U.ri(2, 9);
      Object.assign(det, { outcome: 'sack', yards: Math.max(y, -gs.ball), sacker: presser, sackT: pressT, target: target.slot });
      fin(y, `${nm(qb)} is hit as he looks for ${nm(O[target.slot])} — SACKED by ${nm(sk)}!`, { kind: 'sack' });
      return det;
    }
    const rec = O[target.slot], cdef = target.def ? D[target.def] : null;
    det.target = target.slot;
    det.throwT = Math.max(target.ready, 0.85) + U.rand(0, 0.15);
    const pressured = pressT - det.throwT < 0.35;
    det.pressured = pressured;
    const acc = qbAcc(gs, o, qb), dpt = target.depth;
    const pC = sig(0.05 + target.sep * 0.12 + (acc - 70) * 0.03 - Math.max(0, dpt) * 0.04 - (pressured ? 0.55 : 0) + (oc === 'screen' ? 1.2 : 0) + wxPass(gs, dpt));
    const pI = sig(-4.4 - target.sep * 0.2 - (acc - 70) * 0.03 + dpt * 0.025 + (pressured ? 0.5 : 0) + gs.wxm.int);
    qs.pa++;
    fatX[rec.id] = dpt >= 15 ? 1 : 0;
    const r = Math.random();
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
      } else if (U.chance(0.04)) {
        det.intEnd = -1; det.pick6 = true;
        ev(gs, `${nm(qb)} throws for ${nm(rec)} ${where}... PICKED OFF by ${nm(pk)}!`, 'to');
        gs.poss = d; gs.ball = 100;
        touchdown(gs, d, `${nm(pk)} takes it back to the house — PICK SIX!`);
      } else {
        const ret = U.ri(0, 22);
        det.intEnd = dpt - ret;
        ev(gs, `${nm(qb)} throws for ${nm(rec)} ${where}... INTERCEPTED by ${nm(pk)}${target.sep < -3 ? ' who jumped the route' : ''}, returned ${yd(ret)}.`, 'to');
        changePoss(gs, d, 100 - at + ret);
      }
      checkClock(gs);
      return det;
    }
    if (r < pI + pC * (1 - pI)) {
      // completion + run after catch
      let yac = (oc === 'screen' ? Math.max(0, U.gauss(3, 2.5)) : Math.max(0, target.sep * 0.25 + U.gauss(0.3, 1.2))) * gs.wxm.yac;
      const chasers = [target.def || 'MLB', dpt >= 15 ? 'S2' : (cov.WR3 === 'S1' ? 'MLB' : 'S1'), dpt >= 15 ? (target.slot === 'WR2' ? 'CB2' : 'CB1') : 'S2'];
      const attempts = [];
      let tackler = null;
      for (let i = 0; i < 3; i++) {
        const dk = chasers[i], df = D[dk];
        const m = (elusR(gs, o, rec) - tackleR(gs, d, df)) * 0.6 + U.gauss(0, 11) + (i === 0 && target.sep > 4 ? 5 : 0) - i * 2;
        attempts.push({ d: dk, at: Math.round(dpt + yac), win: m > 9 });
        if (m > 9) { yac += U.ri(2, 6); if (i === 2) yac += U.ri(6, 35); }
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
      fin(yds, `${nm(qb)}${pNote} hits ${nm(rec)} ${where} for ${yd(Math.min(yds, 100 - gs.ball))}.${sepNote ? sepNote + '.' : ''}${broke ? ` Broke ${broke} tackle${broke > 1 ? 's' : ''}!` : ''}`, {
        kind: 'pass', onYds: y => { qs.py += y; ts.rcy += y; }, onTD: () => { qs.ptd++; ts.rctd++; },
      });
      injury(gs, rec, o);
    } else {
      const pbu = target.sep < 0 && cdef;
      Object.assign(det, { outcome: 'incomplete', yards: 0, pbu: pbu ? target.def : null });
      fin(0, pbu ? `${nm(qb)} throws for ${nm(rec)} ${where} — broken up by ${nm(cdef)}!` : `${nm(qb)}${pressured ? ' under pressure,' : ''} throws ${where} for ${nm(rec)}... incomplete.`, { kind: 'pass', inc: true });
    }
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
    if (gs.ot) return diff < -3 ? 'go' : inRange ? 'fg' : 'go';
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
    return { suggest: aiFourth(gs), fgDist, fgP: fgProb(gs), canFg: fgDist <= 62, canPunt: !gs.ot };
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

  // ── main step ──
  // input: { off, def } — calls for the user's side; anything missing is AI-called.
  function step(gs, input = {}) {
    if (gs.over) return 'over';
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
    if (oc === 'punt' && !gs.ot) { punt(gs); gs.wpH.push(winProb(gs)); return gs.over ? 'over' : 'ok'; }
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
    create, step, simToEnd, winProb, preWinProb, fourthInfo, needsCall, suggestOff, aiDefCall, callEdges, canKneel,
    spot, downTxt, qName, nm, slots, stam, QLEN, OFF_CALLS, DEF_CALLS,
  };
})();
