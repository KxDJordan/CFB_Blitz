'use strict';
// ── LEAGUE: careers, rosters, draft, schedule, polls, progression ──

let G = null;

const L = (() => {
  const SAVE_KEY = 'cfbblitz.save.v1';
  const POS = DATA.POSITIONS;

  // ── accessors ──
  const team = id => G.teams[id];
  const user = () => G.teams[G.userTeamId];
  const player = id => G.players[id];
  const roster = t => t.roster.map(id => G.players[id]).filter(Boolean);
  const isUser = id => id === G.userTeamId;
  const fullName = t => `${t.name} ${t.mascot}`;
  const rank = id => G.poll.indexOf(id) + 1;
  const ranked = id => { const r = rank(id); return r > 0 && r <= 10 ? r : 0; };
  const recStr = t => `${t.rec.w}-${t.rec.l}`;
  const confRecStr = t => `${t.rec.cw}-${t.rec.cl}`;

  // ── players ──
  function blankStats() {
    return { gp: 0, pa: 0, pc: 0, py: 0, ptd: 0, pint: 0, ra: 0, ry: 0, rtd: 0, rc: 0, rcy: 0, rctd: 0, tk: 0, sk: 0, int: 0, fgm: 0, fga: 0 };
  }
  function calcOvr(p) {
    const w = DATA.OVR_W[p.pos];
    let o = 0;
    for (const a of DATA.ATTRS) o += w[a] * p.attrs[a];
    return Math.round(U.clamp(o, 20, 99));
  }
  const starsFor = o => (o >= 72 ? 5 : o >= 65 ? 4 : o >= 57 ? 3 : o >= 50 ? 2 : 1);
  function jerseyNum(t, pos) {
    const used = new Set(t ? roster(t).map(p => p.num) : []);
    const [a, b] = DATA.NUMBERS[pos];
    const opts = [];
    for (let n = a; n <= b; n++) if (!used.has(n)) opts.push(n);
    if (opts.length) return U.pick(opts);
    for (let n = 1; n < 100; n++) if (!used.has(n)) return n;
    return U.ri(1, 99);
  }
  function mkPlayer(pos, target, cls, t, extra = {}) {
    const id = G.nextPid++;
    const w = DATA.OVR_W[pos];
    const attrs = {};
    for (const a of DATA.ATTRS) attrs[a] = Math.round(U.clamp(target + U.gauss(0, 4.5) + (w[a] < 0.12 ? U.rand(-14, 0) : 0), 25, 99));
    const p = {
      id, first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), pos, cls, attrs, ovr: 0, pot: 0,
      num: jerseyNum(t, pos), home: U.pick(DATA.TOWNS), teamId: t ? t.id : null, inj: 0,
      st: blankStats(), car: blankStats(), starts: 0, stars: extra.stars || 0,
    };
    p.ovr = calcOvr(p);
    p.pot = extra.pot ? Math.max(p.ovr + 2, extra.pot) : U.clamp(Math.round(p.ovr + U.rand(3, 20) - cls * 4), p.ovr, 99);
    if (!p.stars) p.stars = starsFor(p.ovr - cls * 3);
    if (extra.walkOn) p.walkOn = true;
    G.players[id] = p;
    if (t) t.roster.push(id);
    return p;
  }
  function addOvr(p, g) {
    const before = p.ovr;
    for (const a of DATA.ATTRS) p.attrs[a] = Math.round(U.clamp(p.attrs[a] + g + U.gauss(0, 0.8), 20, 99));
    p.ovr = calcOvr(p);
    return p.ovr - before;
  }
  function removePlayer(p) {
    const t = p.teamId != null ? team(p.teamId) : null;
    if (t) t.roster = t.roster.filter(id => id !== p.id);
    delete G.players[p.id];
  }
  function posCounts(t) {
    const c = {};
    for (const p of roster(t)) c[p.pos] = (c[p.pos] || 0) + 1;
    return c;
  }

  // ── depth chart ──
  function rebuildDepth(t) {
    t.depth = t.depth || {}; t.manual = t.manual || {};
    const byPos = {};
    for (const pos of POS) byPos[pos] = [];
    for (const p of roster(t)) byPos[p.pos].push(p);
    for (const pos of POS) {
      const ids = byPos[pos].map(p => p.id);
      if (t.manual[pos] && t.depth[pos]) {
        const keep = t.depth[pos].filter(id => ids.includes(id));
        const add = byPos[pos].filter(p => !keep.includes(p.id)).sort((a, b) => b.ovr - a.ovr).map(p => p.id);
        t.depth[pos] = keep.concat(add);
      } else {
        t.depth[pos] = byPos[pos].sort((a, b) => b.ovr - a.ovr).map(p => p.id);
      }
    }
  }
  const depthHealthy = (t, pos) => (t.depth[pos] || []).map(id => G.players[id]).filter(p => p && p.inj <= 0);
  function moveDepth(t, pos, pid, dir) {
    const arr = t.depth[pos], i = arr.indexOf(pid), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return false;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    t.manual[pos] = true;
    return true;
  }
  function setAutoDepth(t, pos) { t.manual[pos] = false; rebuildDepth(t); }
  function isStarter(t, p) { return depthHealthy(t, p.pos).slice(0, DATA.STARTERS[p.pos]).includes(p); }

  // ── ratings ──
  function units(t) {
    const u = {};
    for (const pos of POS) {
      const h = depthHealthy(t, pos), n = DATA.STARTERS[pos], v = [];
      for (let i = 0; i < n; i++) v.push(h[i] ? h[i].ovr : 38);
      u[pos.toLowerCase()] = U.avg(v);
    }
    return u;
  }
  const PW = { qb: 0.15, rb: 0.07, wr: 0.11, te: 0.04, ol: 0.16, dl: 0.15, lb: 0.10, cb: 0.10, s: 0.08, k: 0.04 };
  function powerFromUnits(u) { let s = 0; for (const k in PW) s += PW[k] * u[k]; return s; }
  const power = t => powerFromUnits(units(t));
  const offRating = u => u.qb * 0.3 + u.rb * 0.13 + u.wr * 0.22 + u.te * 0.08 + u.ol * 0.27;
  const defRating = u => u.dl * 0.33 + u.lb * 0.24 + u.cb * 0.24 + u.s * 0.19;
  function ratings(t) {
    const u = units(t);
    return { u, off: Math.round(offRating(u)), def: Math.round(defRating(u)), ovr: Math.round(powerFromUnits(u)) };
  }
  function groupAvg(t, groupId) {
    const g = DATA.groupById(groupId);
    const ps = roster(t).filter(p => g.pos.includes(p.pos));
    return { avg: Math.round(U.avg(ps.map(p => p.ovr))), count: ps.length };
  }
  function needs(t) {
    const c = posCounts(t), out = [];
    for (const pos of POS) {
      const h = depthHealthy(t, pos).slice(0, DATA.STARTERS[pos]);
      const avg = U.avg(h.map(p => p.ovr));
      const short = (c[pos] || 0) < DATA.ROSTER_QUOTA[pos];
      out.push({ pos, avg: Math.round(avg), short, score: avg - (short ? 8 : 0) });
    }
    return out.sort((a, b) => a.score - b.score);
  }

  // ── career creation ──
  function newCareer(cfg) {
    G = {
      v: 1, year: 2026, season: 1, phase: 'draft', week: 0, userTeamId: 0,
      teams: [], players: {}, nextPid: 1, schedule: [], poll: [], prevPoll: [],
      forum: [], forumUnread: 0, history: [], confChamps: [], champion: null,
      plan: { off: 'balanced', def: 'base' }, practice: 'OL', lastPractice: null,
      settings: { theme: cfg.theme || 'night', askFourth: true, callPlays: true, speed: 2 },
      draft: null, camp: null, off: null, threadSeq: 1,
    };
    const diff = DATA.DIFFICULTY.find(d => d.id === cfg.difficulty) || DATA.DIFFICULTY[1];
    const ai = cfg.aiSchools.slice(0, 15);
    const prestiges = U.shuffle([5, 4.5, 4.5, 4, 4, 3.5, 3.5, 3, 3, 2.5, 2.5, 2, 2, 1.5, 1]);
    const mk = (id, s, conf, prestige, isUser) => ({
      id, name: s.name, mascot: s.mascot, abbr: s.abbr, logo: { ...s.logo, letter: (s.letter || s.name[0] || 'B').toUpperCase() },
      conf, prestige, roster: [], depth: {}, manual: {}, user: !!isUser, hist: [],
      rec: { w: 0, l: 0, cw: 0, cl: 0, pf: 0, pa: 0, streak: 0 }, qw: 0,
    });
    G.teams.push(mk(0, cfg, cfg.conf, diff.prestige, true));
    ai.forEach((s, i) => {
      const conf = i < 7 ? cfg.conf : 1 - cfg.conf;
      G.teams.push(mk(i + 1, s, conf, prestiges[i], false));
    });
    for (const t of G.teams) { genBaseRoster(t); rebuildDepth(t); }
    updatePoll();
    setupDraft('founding');
    Forum.draftOpen();
    save();
  }
  function genBaseRoster(t) {
    const base = 50 + t.prestige * 4.2;
    for (const pos of POS) {
      const q = DATA.ROSTER_QUOTA[pos], s = DATA.STARTERS[pos];
      for (let i = 0; i < q; i++) {
        const tgt = i < s ? base + U.gauss(0, 4) : base - 7 + U.gauss(0, 4);
        mkPlayer(pos, tgt, U.ri(0, 3), t);
      }
    }
  }

  // ── draft ──
  const STAR_OVR = { 5: [72, 79], 4: [65, 72], 3: [57, 66], 2: [50, 58] };
  const STAR_POT = { 5: [88, 99], 4: [80, 93], 3: [70, 87], 2: [62, 80] };
  const prospectValue = p => p.ovr + (p.pot - p.ovr) * 0.35;
  function genProspects(n) {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const pos = U.wpick(POS, p => (p === 'K' ? 0.5 : DATA.ROSTER_QUOTA[p]));
      const r = Math.random();
      const stars = r < 0.05 ? 5 : r < 0.25 ? 4 : r < 0.68 ? 3 : 2;
      const p = mkPlayer(pos, U.ri(...STAR_OVR[stars]), 0, null, { stars, pot: U.ri(...STAR_POT[stars]) });
      const cap = STAR_OVR[stars][1] + 1;
      while (p.ovr > cap) { for (const a of DATA.ATTRS) p.attrs[a]--; p.ovr = calcOvr(p); }
      p.pot = Math.max(p.pot, p.ovr + 2);
      ids.push(p.id);
    }
    return ids.sort((a, b) => prospectValue(G.players[b]) - prospectValue(G.players[a]));
  }
  function setupDraft(kind) {
    const rounds = kind === 'founding' ? 8 : 6;
    const base = kind === 'founding' ? U.shuffle(G.teams.map(t => t.id)) : G.poll.slice().reverse();
    const order = [];
    for (let r = 0; r < rounds; r++) order.push(...(kind === 'founding' && r % 2 ? base.slice().reverse() : base));
    G.draft = { kind, year: G.year, rounds, order, idx: 0, pool: genProspects(G.teams.length * rounds + 36), log: [] };
  }
  function draftCur() {
    const d = G.draft;
    if (!d || d.idx >= d.order.length) return null;
    const n = G.teams.length;
    return { teamId: d.order[d.idx], round: Math.floor(d.idx / n) + 1, pick: (d.idx % n) + 1, overall: d.idx + 1 };
  }
  function draftPick(pid) {
    const d = G.draft, cur = draftCur();
    if (!cur || !d.pool.includes(pid)) return null;
    const p = G.players[pid], t = team(cur.teamId);
    d.pool = d.pool.filter(x => x !== pid);
    p.teamId = t.id; p.num = jerseyNum(t, p.pos); t.roster.push(pid);
    p.draft = { year: G.year, round: cur.round, pick: cur.overall };
    d.log.push({ ...cur, pid });
    d.idx++;
    rebuildDepth(t);
    return cur;
  }
  function startersAvg(t, pos) {
    const h = depthHealthy(t, pos).slice(0, DATA.STARTERS[pos]);
    return h.length < DATA.STARTERS[pos] ? 0 : U.avg(h.map(p => p.ovr));
  }
  function bestPickFor(t, noise = 5) {
    const counts = posCounts(t);
    let best = null, bv = -1e9;
    for (const pid of G.draft.pool.slice(0, 60)) {
      const p = G.players[pid];
      let v = prospectValue(p) + U.rand(0, noise);
      const c = counts[p.pos] || 0, q = DATA.ROSTER_QUOTA[p.pos];
      if (c < q) v += 6;
      const sa = startersAvg(t, p.pos);
      if (p.ovr > sa) v += (p.ovr - sa) * 0.5;
      if (p.pos === 'K' && c >= 1) v -= 25;
      if (c >= q + 2) v -= 10;
      if (v > bv) { bv = v; best = pid; }
    }
    return best;
  }
  function draftAI() {
    const cur = draftCur();
    if (!cur || isUser(cur.teamId)) return null;
    const pid = bestPickFor(team(cur.teamId));
    draftPick(pid);
    return { ...cur, pid };
  }
  function draftGrades() {
    const by = {};
    for (const e of G.draft.log) (by[e.teamId] = by[e.teamId] || []).push(prospectValue(G.players[e.pid]));
    const vals = Object.entries(by).map(([id, v]) => ({ id: +id, v: U.avg(v) }));
    const m = U.avg(vals.map(x => x.v)), sd = Math.sqrt(U.avg(vals.map(x => (x.v - m) ** 2))) || 1;
    const grade = z => (z > 1.3 ? 'A+' : z > 0.8 ? 'A' : z > 0.4 ? 'A-' : z > 0.1 ? 'B+' : z > -0.2 ? 'B' : z > -0.5 ? 'B-' : z > -0.9 ? 'C+' : z > -1.3 ? 'C' : 'D');
    const out = {};
    for (const x of vals) out[x.id] = { grade: grade((x.v - m) / sd), v: x.v };
    return out;
  }
  function finishDraft() {
    const d = G.draft;
    d.grades = draftGrades();
    Forum.draftRecap();
    for (const pid of d.pool) delete G.players[pid];
    d.pool = [];
    for (const t of G.teams) { fillWalkOns(t); trimRoster(t); rebuildDepth(t); }
    G.phase = 'camp';
    G.camp = { session: 0, log: [] };
    save();
  }
  function fillWalkOns(t) {
    const c = posCounts(t);
    for (const pos of POS) {
      while ((c[pos] || 0) < DATA.ROSTER_QUOTA[pos]) {
        mkPlayer(pos, 44 + t.prestige * 2 + U.gauss(0, 3), U.ri(0, 1), t, { walkOn: true });
        c[pos] = (c[pos] || 0) + 1;
      }
    }
  }
  function trimRoster(t) {
    while (t.roster.length > DATA.ROSTER_MAX) {
      const c = posCounts(t);
      const cands = roster(t).filter(p => p.pos !== 'K' && c[p.pos] > DATA.ROSTER_QUOTA[p.pos]).sort((a, b) => (a.ovr + a.pot * 0.3) - (b.ovr + b.pot * 0.3));
      if (!cands.length) break;
      removePlayer(cands[0]);
    }
  }

  // ── training ──
  function trainGroup(t, groupId, intensityId, scale, isCamp) {
    const g = DATA.groupById(groupId), I = DATA.INTENSITY.find(x => x.id === intensityId) || DATA.INTENSITY[1];
    const shares = [0.5, 0.3, 0.2], res = [];
    for (const p of roster(t)) {
      if (!g.pos.includes(p.pos) || p.inj > 0) continue;
      const youth = [1.25, 1.1, 0.95, 0.8][p.cls];
      const potF = U.clamp((p.pot - p.ovr) / 12, 0.25, 1.4);
      const pts = U.rand(1.2, 3.4) * I.mult * youth * potF * scale;
      const before = p.ovr, deltas = {};
      g.attrs.forEach((a, i) => {
        const d = Math.max(0, Math.round(pts * shares[i] * 1.6 + U.gauss(0, 0.5) * scale));
        if (d) { p.attrs[a] = Math.min(99, p.attrs[a] + d); deltas[a] = d; }
      });
      p.ovr = calcOvr(p);
      let injured = 0;
      if (isCamp && U.chance(I.inj)) { injured = U.ri(1, 3); p.inj = Math.max(p.inj, injured); }
      res.push({ pid: p.id, before, after: p.ovr, deltas, injured });
    }
    return res.sort((a, b) => (b.after - b.before) - (a.after - a.before) || b.after - a.after);
  }
  function runCamp(groupId, intensityId) {
    const res = trainGroup(user(), groupId, intensityId, 1, true);
    for (const t of G.teams) if (!t.user) trainGroup(t, U.pick(DATA.ALL_GROUPS).id, 'standard', 1, true);
    G.camp.log.push({
      session: G.camp.session, groupId, intensityId,
      avg: U.avg(res.map(r => r.after - r.before)), inj: res.filter(r => r.injured).length,
    });
    G.camp.session++;
    G.teams.forEach(rebuildDepth);
    save();
    return res;
  }
  function weeklyPractice() {
    const res = trainGroup(user(), G.practice, 'standard', 0.28, false);
    G.lastPractice = { groupId: G.practice, gain: U.sum(res.map(r => r.after - r.before)), n: res.length };
    for (const t of G.teams) if (!t.user) trainGroup(t, U.pick(DATA.ALL_GROUPS).id, 'standard', 0.28, false);
  }

  // ── schedule ──
  function roundRobin(ids) {
    const n = ids.length, arr = ids.slice(), rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        games.push((r + i) % 2 ? [a, b] : [b, a]);
      }
      rounds.push(games);
      arr.splice(1, 0, arr.pop());
    }
    return rounds;
  }
  function buildSchedule() {
    const A = U.shuffle(G.teams.filter(t => t.conf === 0).map(t => t.id));
    const B = U.shuffle(G.teams.filter(t => t.conf === 1).map(t => t.id));
    const confRounds = [roundRobin(A), roundRobin(B)];
    const sched = [[]];
    let gid = 0;
    const mkG = (wk, h, a, type) => ({ id: `${G.year}-${wk}-${gid++}`, wk, h, a, type, neutral: false, done: false });
    const nonConf = k => A.map((a, i) => { const b = B[(i + k * 2 + 1) % 8]; return (i + k) % 2 ? [a, b] : [b, a]; });
    const ncWeeks = { 1: 0, 2: 1, 3: 2, 11: 3 };
    for (let wk = 1; wk <= 11; wk++) {
      if (ncWeeks[wk] !== undefined) sched[wk] = nonConf(ncWeeks[wk]).map(([h, a]) => mkG(wk, h, a, 'nc'));
      else {
        const r = wk - 4;
        sched[wk] = [...confRounds[0][r], ...confRounds[1][r]].map(([h, a]) => mkG(wk, h, a, 'conf'));
      }
    }
    sched[12] = []; sched[13] = []; sched[14] = [];
    G.schedule = sched;
  }
  function standings(conf) {
    return G.teams.filter(t => t.conf === conf).sort((a, b) =>
      (b.rec.cw - b.rec.cl) - (a.rec.cw - a.rec.cl) ||
      (b.rec.w - b.rec.l) - (a.rec.w - a.rec.l) ||
      (b.rec.pf - b.rec.pa) - (a.rec.pf - a.rec.pa) ||
      rank(a.id) - rank(b.id));
  }
  const userGame = () => (G.schedule[G.week] || []).find(g => g.h === G.userTeamId || g.a === G.userTeamId) || null;
  function gameLabel(g) {
    if (g.type === 'conf') return `${DATA.CONFS[team(g.h).conf].name} Conference`;
    if (g.type === 'nc') return g.wk === 11 ? 'Rivalry Week' : 'Non-Conference';
    if (g.type === 'ccg') return `${DATA.CONFS[g.conf].name} Championship`;
    if (g.type === 'semi') return 'CFP Semifinal';
    return 'National Championship';
  }
  const winnerOf = g => (g.hs > g.as ? g.h : g.a);

  // ── polls ──
  function updatePoll() {
    G.prevPoll = G.poll.slice();
    const prev = {};
    G.prevPoll.forEach((id, i) => { prev[id] = i + 1; });
    const n = G.teams.length;
    const scored = G.teams.map(t => {
      const r = t.rec, gp = r.w + r.l;
      let s = power(t) * 0.9;
      if (gp) s += (r.w - r.l * 1.3) * 6 + U.clamp((r.pf - r.pa) / gp, -28, 28) * 0.22 + (t.qw || 0) * 2.5;
      if (prev[t.id]) s += (n + 1 - prev[t.id]) * 0.35;
      return { id: t.id, s };
    });
    G.poll = scored.sort((a, b) => b.s - a.s).map(x => x.id);
  }

  // ── results ──
  const STAT_KEYS = Object.keys(blankStats()).filter(k => k !== 'gp');
  function topPerformers(gs) {
    const out = [];
    for (const [pid, s] of Object.entries(gs.ps)) {
      const p = G.players[pid];
      if (!p) continue;
      if (s.pa >= 8) out.push({ pid: +pid, side: s.side, kind: 'pass', val: s.py + s.ptd * 20 - s.pint * 15, line: `${s.pc}/${s.pa}, ${s.py} yds, ${s.ptd} TD${s.pint ? `, ${s.pint} INT` : ''}`, y: s.py, td: s.ptd });
      if (s.ra >= 5) out.push({ pid: +pid, side: s.side, kind: 'rush', val: s.ry + s.rtd * 20, line: `${s.ra} car, ${s.ry} yds, ${s.rtd} TD`, y: s.ry, td: s.rtd });
      if (s.rc >= 2) out.push({ pid: +pid, side: s.side, kind: 'rec', val: s.rcy + s.rctd * 20, line: `${s.rc} rec, ${s.rcy} yds, ${s.rctd} TD`, y: s.rcy, td: s.rctd });
      if (s.tk + s.sk + s.int > 0) out.push({ pid: +pid, side: s.side, kind: 'def', val: s.tk * 8 + s.sk * 25 + s.int * 35, line: `${s.tk} tkl${s.sk ? `, ${s.sk} sack${s.sk > 1 ? 's' : ''}` : ''}${s.int ? `, ${s.int} INT` : ''}`, sk: s.sk, int: s.int });
    }
    return out.sort((a, b) => b.val - a.val);
  }
  function applyResult(g, gs) {
    const H = team(g.h), A = team(g.a);
    const rankBefore = { [H.id]: ranked(H.id), [A.id]: ranked(A.id) };
    g.hs = gs.score[0]; g.as = gs.score[1]; g.done = true; g.ot = gs.ot;
    const W = g.hs > g.as ? H : A, Lo = W === H ? A : H;
    W.rec.w++; Lo.rec.l++;
    if (g.type === 'conf') { W.rec.cw++; Lo.rec.cl++; }
    H.rec.pf += g.hs; H.rec.pa += g.as; A.rec.pf += g.as; A.rec.pa += g.hs;
    W.rec.streak = W.rec.streak > 0 ? W.rec.streak + 1 : 1;
    Lo.rec.streak = Lo.rec.streak < 0 ? Lo.rec.streak - 1 : -1;
    if (rankBefore[Lo.id]) W.qw = (W.qw || 0) + 1;
    // player stats
    const played = new Set();
    [0, 1].forEach(side => {
      for (const pos of POS) gs.lu[side][pos].slice(0, DATA.STARTERS[pos]).forEach(id => { played.add(+id); const p = G.players[id]; if (p) p.starts++; });
    });
    for (const [pid, s] of Object.entries(gs.ps)) {
      const p = G.players[pid];
      if (!p) continue;
      played.add(+pid);
      for (const k of STAT_KEYS) p.st[k] += s[k] || 0;
    }
    for (const pid of played) { const p = G.players[pid]; if (p) p.st.gp++; }
    for (const inj of gs.injuries) { const p = G.players[inj.pid]; if (p) p.inj = Math.max(p.inj, inj.weeks + 1); }
    const top = topPerformers(gs);
    g.box = {
      ts: gs.ts, qs: gs.qs,
      top: top.slice(0, 6).map(x => ({ pid: x.pid, side: x.side, kind: x.kind, line: x.line })),
    };
    return { g, W, Lo, ws: Math.max(g.hs, g.as), ls: Math.min(g.hs, g.as), rankBefore, top, injuries: gs.injuries, ot: gs.ot };
  }

  function createUserGame(g) {
    return Engine.create(team(g.h), team(g.a), {
      neutral: g.neutral, userSide: g.h === G.userTeamId ? 0 : 1,
      askFourth: G.settings.askFourth, userCalls: G.settings.callPlays !== false, userPlan: G.plan,
    });
  }
  function finishWeek(userRes) {
    const wk = G.week, results = userRes ? [userRes] : [];
    for (const g of G.schedule[wk] || []) {
      if (g.done) continue;
      const gs = Engine.create(team(g.h), team(g.a), { neutral: g.neutral });
      Engine.simToEnd(gs);
      results.push(applyResult(g, gs));
    }
    for (const t of G.teams) for (const p of roster(t)) if (p.inj > 0) p.inj--;
    weeklyPractice();
    G.teams.forEach(rebuildDepth);
    const pollBefore = G.poll.slice();
    updatePoll();
    Forum.weekly(wk, results, pollBefore);
    advanceWeek();
    save();
    return results;
  }
  function advanceWeek() {
    const wk = G.week;
    if (wk === 11) {
      G.schedule[12] = [0, 1].map(c => {
        const s = standings(c);
        return { id: `${G.year}-12-${c}`, wk: 12, h: s[0].id, a: s[1].id, type: 'ccg', conf: c, neutral: true, done: false };
      });
    } else if (wk === 12) {
      G.confChamps = G.schedule[12].map(winnerOf);
      const p = G.poll;
      G.schedule[13] = [[p[0], p[3]], [p[1], p[2]]].map(([h, a], i) => ({ id: `${G.year}-13-${i}`, wk: 13, h, a, type: 'semi', neutral: true, done: false, seeds: [i ? 2 : 1, i ? 3 : 4] }));
    } else if (wk === 13) {
      const [a, b] = G.schedule[13].map(winnerOf);
      G.schedule[14] = [{ id: `${G.year}-14-0`, wk: 14, h: a, a: b, type: 'final', neutral: true, done: false }];
    } else if (wk === 14) {
      return endSeason();
    }
    G.week++;
  }

  // ── awards & season end ──
  function heismanList(n = 10) {
    return Object.values(G.players).filter(p => p.teamId != null && p.st.gp > 0).map(p => {
      const s = p.st, t = team(p.teamId);
      const score = s.py / 25 + s.ptd * 4 - s.pint * 3 + s.ry / 10 + s.rtd * 6 + s.rcy / 10 + s.rctd * 6 + s.sk * 2.5 + s.int * 5 + t.rec.w * 2.5;
      return { p, score };
    }).sort((a, b) => b.score - a.score).slice(0, n);
  }
  function seasonLine(p, s = p.st) {
    if (p.pos === 'QB') return `${s.py.toLocaleString()} yds · ${s.ptd} TD · ${s.pint} INT`;
    if (p.pos === 'RB') return `${s.ry.toLocaleString()} rush yds · ${s.rtd} TD`;
    if (p.pos === 'WR' || p.pos === 'TE') return `${s.rc} rec · ${s.rcy.toLocaleString()} yds · ${s.rctd} TD`;
    if (p.pos === 'K') return `${s.fgm}/${s.fga} FG`;
    if (p.pos === 'OL') return `${s.gp} games started`;
    return `${s.tk} tkl · ${s.sk} sacks · ${s.int} INT`;
  }
  function endSeason() {
    const fin = G.schedule[14][0];
    G.champion = winnerOf(fin);
    const hl = heismanList(5);
    const h = hl[0];
    G.awards = { heisman: h ? { pid: h.p.id, name: `${h.p.first} ${h.p.last}`, pos: h.p.pos, team: h.p.teamId, line: seasonLine(h.p) } : null, finalists: hl.map(x => x.p.id) };
    for (const t of G.teams) {
      t.hist.push({ year: G.year, w: t.rec.w, l: t.rec.l, cw: t.rec.cw, cl: t.rec.cl, rank: rank(t.id), champ: t.id === G.champion, cc: G.confChamps.includes(t.id) });
    }
    const u = user();
    G.history.push({
      year: G.year, champ: G.champion, champName: fullName(team(G.champion)),
      user: { w: u.rec.w, l: u.rec.l, rank: rank(u.id), cc: G.confChamps.includes(u.id), champ: u.id === G.champion },
      heisman: G.awards.heisman ? { ...G.awards.heisman, teamName: team(G.awards.heisman.team).abbr } : null,
    });
    Forum.seasonEnd();
    G.phase = 'recap';
  }

  function progress(p) {
    const gap = p.pot - p.ovr;
    let g = gap > 0 ? gap * U.rand(0.12, 0.3) : U.rand(-2, 0.5);
    g += [1.5, 1, 0.5, 0][p.cls] || 0;
    g += (Math.min(p.starts, 14) / 14) * 1.5;
    return addOvr(p, g);
  }
  function startOffseason() {
    const departed = [], declared = [], risers = [], leagueDeclared = [];
    for (const t of G.teams) {
      for (const p of roster(t)) {
        const sum = { name: `${p.first} ${p.last}`, pos: p.pos, ovr: p.ovr, cls: p.cls, teamId: t.id, line: seasonLine(p), num: p.num };
        if (p.cls >= 3) { if (t.user) departed.push(sum); removePlayer(p); continue; }
        if (p.cls === 2 && p.ovr >= 80 && U.chance(0.45)) {
          if (t.user) declared.push(sum);
          leagueDeclared.push(sum);
          removePlayer(p); continue;
        }
        for (const k of STAT_KEYS.concat('gp')) p.car[k] += p.st[k];
        const d = progress(p);
        p.cls++; p.st = blankStats(); p.starts = 0; p.inj = 0;
        if (t.user && d > 0) risers.push({ pid: p.id, d });
      }
      const h = t.hist[t.hist.length - 1];
      if (h) t.prestige = U.clamp(t.prestige * 0.7 + ((G.teams.length + 1 - h.rank) / G.teams.length) * 5 * 0.3 + (h.champ ? 0.4 : 0), 1, 5);
    }
    G.year++; G.season++;
    G.off = { departed, declared, risers: risers.sort((a, b) => b.d - a.d).slice(0, 8), leagueDeclared: leagueDeclared.sort((a, b) => b.ovr - a.ovr) };
    G.teams.forEach(rebuildDepth);
    Forum.offseason();
    G.phase = 'graduation';
    save();
  }
  function beginAnnualDraft() {
    setupDraft('annual');
    G.phase = 'draft';
    Forum.draftOpen();
    save();
  }
  function startSeason() {
    if (G.camp) Forum.campReport(G.camp.log);
    for (const t of G.teams) { t.rec = { w: 0, l: 0, cw: 0, cl: 0, pf: 0, pa: 0, streak: 0 }; t.qw = 0; }
    G.week = 1; G.champion = null; G.confChamps = []; G.awards = null; G.camp = null; G.draft = null;
    buildSchedule();
    G.poll = [];
    updatePoll();
    G.phase = 'season';
    Forum.preseason();
    save();
  }

  // ── leaders ──
  function leaders(key, n = 5, filter) {
    return Object.values(G.players).filter(p => p.teamId != null && p.st[key] > 0 && (!filter || filter(p))).sort((a, b) => b.st[key] - a.st[key]).slice(0, n);
  }
  function teamLeader(t, key) {
    return roster(t).filter(p => p.st[key] > 0).sort((a, b) => b.st[key] - a.st[key])[0] || null;
  }

  // ── persistence ──
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { console.warn('Save failed', e); }
  }
  function load() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return false;
      G = JSON.parse(s);
      return true;
    } catch (e) { return false; }
  }
  const hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } G = null; }

  return {
    team, user, player, roster, isUser, fullName, rank, ranked, recStr, confRecStr,
    calcOvr, posCounts, rebuildDepth, depthHealthy, moveDepth, setAutoDepth, isStarter,
    units, power, powerFromUnits, offRating, defRating, ratings, groupAvg, needs,
    newCareer, draftCur, draftPick, draftAI, bestPickFor, finishDraft, prospectValue,
    trainGroup, runCamp, buildSchedule, standings, userGame, gameLabel, winnerOf,
    updatePoll, applyResult, createUserGame, finishWeek, heismanList, seasonLine,
    startOffseason, beginAnnualDraft, startSeason, leaders, teamLeader,
    save, load, hasSave, wipe,
  };
})();
