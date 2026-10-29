'use strict';
// ── LEAGUE: franchises, rosters, draft & picks, trades, schedule, playoffs, progression ──

let G = null;

const L = (() => {
  const SAVE_KEY = 'problitz.save.v1';
  const POS = DATA.POSITIONS;
  const SEA = DATA.SEASON;

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
  const divRecStr = t => `${t.rec.dw}-${t.rec.dl}`;
  const divName = t => DATA.DIVS[t.div].name;
  const blankRec = () => ({ w: 0, l: 0, cw: 0, cl: 0, dw: 0, dl: 0, pf: 0, pa: 0, streak: 0 });

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
  // ── development ──
  // Hidden growth rate: how fast a player turns reps into ratings. Higher potential
  // players tend to develop faster, but every potential band spans a range.
  function rollGrowth(pot) {
    return +U.clamp(U.gauss(0.75 + (pot - 60) / 40 * 0.55, 0.22), 0.4, 1.75).toFixed(2);
  }
  // Young players soak up coaching; veterans have mostly become who they are.
  const devMult = p => (p.age <= 22 ? 1.3 : p.age <= 23 ? 1.2 : p.age <= 24 ? 1.1 : p.age <= 25 ? 1 : p.age <= 26 ? 0.9 : p.age <= 27 ? 0.8 : p.age <= 28 ? 0.65 : 0.5);
  // Training adds fractional progress per attribute; it carries over until it adds up to a point.
  function grow(p, a, amt) {
    p.xp = p.xp || {};
    let x = (p.xp[a] || 0) + amt, d = 0;
    while (x >= 1 && p.attrs[a] < 99) { p.attrs[a]++; x--; d++; }
    p.xp[a] = Math.round(Math.min(x, 0.99) * 100) / 100;
    return d;
  }
  const FACES = 120;
  function pickFace(t) {
    const used = new Set(t ? roster(t).map(p => p.face) : []);
    const free = [];
    for (let i = 0; i < FACES; i++) if (!used.has(i)) free.push(i);
    return free.length ? U.pick(free) : U.ri(0, FACES - 1);
  }
  // age: years old; extra.exp: seasons in the league (defaults from age)
  function mkPlayer(pos, target, age, t, extra = {}) {
    const id = G.nextPid++;
    const w = DATA.OVR_W[pos];
    const attrs = {};
    for (const a of DATA.ATTRS) attrs[a] = Math.round(U.clamp(target + U.gauss(0, 4.5) + (w[a] < 0.12 ? U.rand(-14, 0) : 0), 25, 99));
    const p = {
      id, first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), pos, age, exp: extra.exp ?? Math.max(0, age - U.ri(21, 23)), attrs, ovr: 0, pot: 0,
      num: jerseyNum(t, pos), home: U.pick(DATA.TOWNS), college: U.pick(DATA.COLLEGES), teamId: t ? t.id : null, inj: 0,
      st: blankStats(), car: blankStats(), starts: 0, stars: extra.stars || 0,
    };
    p.ovr = calcOvr(p);
    // upside shrinks with age: a 22-year-old can still grow a lot, a 30-year-old is what he is
    const upside = age >= 29 ? U.rand(0, 2) : Math.max(0, 27 - age) * U.rand(0.6, 2.4) + U.rand(0, 3);
    p.pot = extra.pot ? Math.max(p.ovr + 2, extra.pot) : U.clamp(Math.round(p.ovr + upside), p.ovr, 99);
    if (!p.stars) p.stars = starsFor(p.ovr);
    if (extra.udfa) p.udfa = true;
    p.gr = rollGrowth(p.pot); p.xp = {}; p.ovr0 = p.ovr; p.face = pickFace(t);
    rollStickers(p);
    G.players[id] = p;
    if (t) t.roster.push(id);
    return p;
  }
  function addOvr(p, g) {
    const before = p.ovr;
    for (const a of DATA.ATTRS) p.attrs[a] = Math.round(U.clamp(p.attrs[a] + g + U.gauss(0, 0.8) + (a === 'spd' && g < 0 ? g * 0.4 : 0), 20, 99));
    p.ovr = calcOvr(p);
    return p.ovr - before;
  }
  function removePlayer(p) {
    const t = p.teamId != null ? team(p.teamId) : null;
    if (t) t.roster = t.roster.filter(id => id !== p.id);
    delete G.players[p.id];
  }
  // ── BADGES (internally "stickers") ──
  // Talent score blends potential, current rating and the draft grade.
  const talent = p => 0.6 * (p.pot - 60) / 40 + 0.4 * (p.ovr - 50) / 45 + (p.exp === 0 && p.stars ? (p.stars - 3) * 0.06 : 0);
  function tierRoll(sc) {
    const r = sc + U.gauss(0, 0.17);
    if (r > 0.9 && sc > 0.68) return 3;
    if (r > 0.72) return 2;
    if (r > 0.45) return 1;
    return 0;
  }
  function rollStickers(p) {
    const pool = DATA.stickersFor(p.pos);
    const sc = U.clamp(talent(p) + U.gauss(0, 0.08), 0, 1.15);
    let n = Math.round(U.clamp(sc * 4.4 + U.gauss(0, 0.6) - 0.9, 0, 4));
    if (p.udfa) n = Math.min(n, U.chance(0.35) ? 1 : 0);
    p.stk = U.shuffle(pool.slice()).slice(0, n).map(id => ({ id, tier: p.udfa ? 0 : tierRoll(sc) }));
  }
  // Upgrade an existing badge or earn a new one. Returns the change, or null.
  function growSticker(p, maxTier = 3) {
    p.stk = p.stk || [];
    const pool = DATA.stickersFor(p.pos).filter(id => !p.stk.some(x => x.id === id));
    const upg = p.stk.filter(x => x.tier < Math.min(maxTier, p.pot >= 88 ? 3 : 2)).sort((a, b) => a.tier - b.tier);
    if (pool.length && (p.stk.length < 2 || (p.stk.length < 4 && U.chance(0.4)) || !upg.length)) {
      if (p.stk.length >= 4) return null;
      const id = U.pick(pool);
      p.stk.push({ id, tier: 0 });
      return { id, tier: 0, kind: 'new' };
    }
    if (!upg.length) return null;
    const x = U.chance(0.6) ? upg[0] : U.pick(upg);
    x.tier++;
    return { id: x.id, tier: x.tier, kind: 'up' };
  }
  // A big season earns badges.
  const MILESTONES = {
    QB: s => s.py >= 3500 || s.ptd >= 28, RB: s => s.ry >= 1100 || s.rtd >= 12,
    WR: s => s.rcy >= 1000 || s.rctd >= 9, TE: s => s.rcy >= 650 || s.rctd >= 7,
    OL: (s, p, t) => p.starts >= 12 && t.rec.w >= 9, DL: s => s.sk >= 8 || s.tk >= 60,
    LB: s => s.tk >= 90 || s.sk >= 6, CB: s => s.int >= 4 || s.tk >= 60, S: s => s.int >= 4 || s.tk >= 75,
    K: s => s.fga >= 12 && s.fgm / s.fga >= 0.86,
  };
  function earnStickers(p, t, ovrJump) {
    const out = [];
    const hit = MILESTONES[p.pos] && MILESTONES[p.pos](p.st, p, t);
    if (hit && U.chance(U.clamp(0.55 + (p.pot - 70) * 0.012, 0.3, 0.9))) { const c = growSticker(p); if (c) out.push(c); }
    if (ovrJump >= 6 && U.chance(0.3)) { const c = growSticker(p, 2); if (c) out.push(c); }
    return out;
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
      const avg = h.length ? U.avg(h.map(p => p.ovr)) : 30;
      const short = (c[pos] || 0) < DATA.ROSTER_QUOTA[pos];
      out.push({ pos, avg: Math.round(avg), short, score: avg - (short ? 8 : 0) });
    }
    return out.sort((a, b) => a.score - b.score);
  }

  // ── career creation ──
  function newCareer(cfg) {
    G = {
      v: 1, league: 'pro', year: 2026, season: 1, phase: 'draft', week: 0, userTeamId: 0,
      teams: [], players: {}, nextPid: 1, schedule: [], poll: [], prevPoll: [],
      forum: [], forumUnread: 0, history: [], confChamps: [], champion: null, seeds: null,
      plan: { off: 'balanced', def: 'base' }, practice: 'OL', lastPractice: null,
      settings: { theme: cfg.theme || 'night', askFourth: true, callPlays: true, speed: 2 },
      draft: null, camp: null, off: null, threadSeq: 1, picks: [], pickCurve: null, draftOrder: null, trades: [],
    };
    const diff = DATA.DIFFICULTY.find(d => d.id === cfg.difficulty) || DATA.DIFFICULTY[1];
    const ai = cfg.aiTeams.slice(0, 15);
    const prestiges = U.shuffle([5, 4.5, 4.5, 4, 4, 3.5, 3.5, 3, 3, 2.5, 2.5, 2, 2, 1.5, 1]);
    const mk = (id, s, div, prestige, isUser) => ({
      id, name: s.name, mascot: s.mascot, abbr: s.abbr, logo: { ...s.logo, letter: (s.letter || s.name[0] || 'B').toUpperCase() },
      div, conf: DATA.DIVS[div].conf, prestige, roster: [], depth: {}, manual: {}, user: !!isUser, hist: [],
      rec: blankRec(), qw: 0,
    });
    // four divisions of four: the user's division gets three AI rivals, the rest fill the other twelve slots
    const udiv = cfg.div ?? 0;
    const slots = [];
    for (let d = 0; d < 4; d++) for (let i = 0; i < (d === udiv ? 3 : 4); i++) slots.push(d);
    G.teams.push(mk(0, cfg, udiv, diff.prestige, true));
    ai.forEach((s, i) => G.teams.push(mk(i + 1, s, slots[i], prestiges[i], false)));
    for (const t of G.teams) { genBaseRoster(t); rebuildDepth(t); }
    updatePoll();
    ensurePicks(G.year + 1);
    setupDraft('founding');
    Forum.draftOpen();
    save();
  }
  function genBaseRoster(t) {
    // pro parity: the gap between the best and worst rosters is smaller than in college
    const base = 61 + t.prestige * 2.8;
    for (const pos of POS) {
      const q = DATA.ROSTER_QUOTA[pos], s = DATA.STARTERS[pos];
      for (let i = 0; i < q; i++) {
        const st = i < s;
        const tgt = st ? base + U.gauss(0, 4) : base - 7 + U.gauss(0, 4);
        mkPlayer(pos, tgt, st ? U.ri(23, 32) : U.ri(22, 30), t);
      }
    }
  }

  // ── draft picks ──
  // Every team owns one pick per round of each upcoming draft; picks can be traded.
  function ensurePicks(y0) {
    for (const y of [y0, y0 + 1]) for (const t of G.teams) for (let r = 1; r <= SEA.ROUNDS; r++) {
      if (!G.picks.some(p => p.y === y && p.r === r && p.o === t.id)) G.picks.push({ y, r, o: t.id, own: t.id });
    }
  }
  const teamPicks = tid => G.picks.filter(p => p.own === tid).sort((a, b) => a.y - b.y || a.r - b.r);
  // the next draft to be held: after the season rolls over (offseason), it's this year's
  const nextDraftYear = () => (G.phase === 'graduation' || G.phase === 'draft' ? G.year : G.year + 1);
  // projected draft slot of a team: real order once the season is over, otherwise worst-first power rankings
  function projOrder(y) {
    if (G.draftOrder && y === nextDraftYear() && (G.phase === 'graduation' || G.phase === 'recap')) return G.draftOrder;
    return G.poll.slice().reverse();
  }
  function pickOverall(pk) {
    const ord = projOrder(pk.y), i = Math.max(0, ord.indexOf(pk.o));
    return (pk.r - 1) * G.teams.length + i + 1;
  }
  const pickLabel = pk => `${pk.y} Round ${pk.r}${pk.o !== pk.own ? ` (via ${team(pk.o).abbr})` : ''}`;
  // value of a pick: what a player taken in that slot has historically been worth
  function pickValue(pk) {
    const n = pickOverall(pk), c = G.pickCurve;
    const v = c && c.length ? c[Math.min(n, c.length) - 1] : 8.5 * Math.exp(-(n - 1) / 26) + 0.55;
    return v * (pk.y > nextDraftYear() ? 0.85 : 1);
  }

  // ── draft ──
  const STAR_OVR = { 5: [72, 79], 4: [65, 72], 3: [57, 66], 2: [50, 58] };
  // pro potentials: a first-round talent can become a star; most late picks top out as solid backups
  const STAR_POT = { 5: [77, 90], 4: [68, 82], 3: [58, 74], 2: [50, 66] };
  const prospectValue = p => p.ovr + (p.pot - p.ovr) * 0.35;
  function genProspects(n) {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const pos = U.wpick(POS, p => (p === 'K' ? 0.5 : DATA.ROSTER_QUOTA[p]));
      const r = Math.random();
      const stars = r < 0.05 ? 5 : r < 0.25 ? 4 : r < 0.68 ? 3 : 2;
      const p = mkPlayer(pos, U.ri(...STAR_OVR[stars]), U.ri(21, 23), null, { stars, pot: U.ri(...STAR_POT[stars]), exp: 0 });
      const cap = STAR_OVR[stars][1] + 1;
      while (p.ovr > cap) { for (const a of DATA.ATTRS) p.attrs[a]--; p.ovr = calcOvr(p); }
      p.pot = Math.max(p.pot, p.ovr + 2);
      p.gr = rollGrowth(p.pot); p.ovr0 = p.ovr;
      rollStickers(p);
      ids.push(p.id);
    }
    return ids.sort((a, b) => prospectValue(G.players[b]) - prospectValue(G.players[a]));
  }
  function setupDraft(kind) {
    const rounds = kind === 'founding' ? 8 : SEA.ROUNDS;
    const n = G.teams.length;
    const order = [], orig = [];
    if (kind === 'founding') {
      // inaugural draft: snake order, no pick ownership yet
      const base = U.shuffle(G.teams.map(t => t.id));
      for (let r = 0; r < rounds; r++) for (const id of (r % 2 ? base.slice().reverse() : base)) { order.push(id); orig.push(id); }
    } else {
      // worst record picks first; traded picks are made by their new owner
      const base = G.draftOrder || G.poll.slice().reverse();
      for (let r = 1; r <= rounds; r++) for (const id of base) {
        const pk = G.picks.find(p => p.y === G.year && p.r === r && p.o === id);
        order.push(pk ? pk.own : id); orig.push(id);
      }
    }
    G.draft = { kind, year: G.year, rounds, order, orig, idx: 0, pool: genProspects(n * rounds + 40), log: [] };
  }
  function draftCur() {
    const d = G.draft;
    if (!d || d.idx >= d.order.length) return null;
    const n = G.teams.length;
    return { teamId: d.order[d.idx], orig: d.orig ? d.orig[d.idx] : d.order[d.idx], round: Math.floor(d.idx / n) + 1, pick: (d.idx % n) + 1, overall: d.idx + 1 };
  }
  function draftPick(pid) {
    const d = G.draft, cur = draftCur();
    if (!cur || !d.pool.includes(pid)) return null;
    const p = G.players[pid], t = team(cur.teamId);
    d.pool = d.pool.filter(x => x !== pid);
    p.teamId = t.id; p.num = jerseyNum(t, p.pos); t.roster.push(pid);
    p.draft = { year: G.year, round: cur.round, pick: cur.overall, via: cur.orig !== cur.teamId ? cur.orig : null };
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
  // the pick value chart: smoothed trade value of the players taken at each slot
  function learnPickCurve() {
    const log = G.draft.log, n = G.teams.length * SEA.ROUNDS;
    const v = log.slice(0, n).map(e => tradeValue(G.players[e.pid]));
    const sm = v.map((_, i) => { const w = v.slice(Math.max(0, i - 3), i + 4); return U.avg(w); });
    // keep it monotone: a later pick is never worth more than an earlier one
    for (let i = 1; i < sm.length; i++) sm[i] = Math.min(sm[i], sm[i - 1]);
    G.pickCurve = G.pickCurve && G.pickCurve.length === sm.length ? sm.map((x, i) => +(G.pickCurve[i] * 0.5 + x * 0.5).toFixed(3)) : sm.map(x => +x.toFixed(3));
  }
  function finishDraft() {
    const d = G.draft;
    d.grades = draftGrades();
    learnPickCurve();
    Forum.draftRecap();
    for (const pid of d.pool) delete G.players[pid];
    d.pool = [];
    G.picks = G.picks.filter(p => p.y > d.year);
    ensurePicks(d.year + 1);
    // AI teams cut to 53 now; the user keeps up to 60 through camp
    for (const t of G.teams) { fillUDFA(t); trimRoster(t, t.user ? DATA.OFF_ROSTER_MAX : DATA.ROSTER_MAX); rebuildDepth(t); }
    G.phase = 'camp';
    G.camp = { session: 0, log: [] };
    save();
  }
  // undrafted free agents fill out every position group
  function fillUDFA(t, minOnly) {
    const c = posCounts(t);
    for (const pos of POS) {
      const need = minOnly ? DATA.STARTERS[pos] : DATA.ROSTER_QUOTA[pos];
      while ((c[pos] || 0) < need) {
        mkPlayer(pos, 44 + t.prestige * 2 + U.gauss(0, 3), U.ri(22, 23), t, { udfa: true, exp: 0 });
        c[pos] = (c[pos] || 0) + 1;
      }
    }
  }
  const keepValue = p => p.ovr + (p.age <= 25 ? (p.pot - p.ovr) * 0.5 : 0) - Math.max(0, p.age - 31) * 1.5;
  // who cut-down day would release, without releasing anyone
  function cutPreview(t, max = DATA.ROSTER_MAX) {
    const out = [], c = posCounts(t), left = roster(t);
    while (left.length - out.length > max) {
      const cands = left.filter(p => !out.includes(p) && p.pos !== 'K' && c[p.pos] > DATA.ROSTER_QUOTA[p.pos]).sort((a, b) => keepValue(a) - keepValue(b));
      if (!cands.length) break;
      out.push(cands[0]); c[cands[0].pos]--;
    }
    return out;
  }
  const rosterLimit = () => (G.phase === 'season' ? DATA.ROSTER_MAX : DATA.OFF_ROSTER_MAX);
  function trimRoster(t, max = DATA.ROSTER_MAX) {
    const cut = [];
    while (t.roster.length > max) {
      const c = posCounts(t);
      const cands = roster(t).filter(p => p.pos !== 'K' && c[p.pos] > DATA.ROSTER_QUOTA[p.pos]).sort((a, b) => keepValue(a) - keepValue(b));
      if (!cands.length) break;
      cut.push(sumP(cands[0]));
      removePlayer(cands[0]);
    }
    return cut;
  }

  // ── trades ──
  const POSV = { QB: 1.7, RB: 0.8, WR: 1, TE: 0.8, OL: 0.95, DL: 1, LB: 0.85, CB: 0.95, S: 0.85, K: 0.35 };
  // what a player is worth on the market: rating, upside (for the young), age and position
  function tradeValue(p) {
    const youth = U.clamp((27 - p.age) / 8, 0, 0.55);
    const eff = p.ovr + (p.pot - p.ovr) * youth - Math.max(0, p.age - 28) * 2.5;
    const badges = (p.stk || []).reduce((s, x) => s + x.tier + 1, 0);
    return Math.pow(2, (eff - 60) / 6) * POSV[p.pos] * (1 + badges * 0.02) * (p.inj > 2 ? 0.85 : 1);
  }
  const tradeOpen = () => G && ((G.phase === 'season' && G.week <= SEA.DEADLINE) || G.phase === 'camp' || G.phase === 'graduation');
  // how much a team values a player it would receive (fills a hole?) or give up (leaves one?)
  function sideValue(t, p, incoming, outgoingIds) {
    let v = tradeValue(p);
    const mates = depthHealthy(t, p.pos).filter(x => x.id !== p.id && !outgoingIds.has(x.id));
    const n = DATA.STARTERS[p.pos], last = mates[n - 1];
    if (incoming) {
      if (!last || p.ovr > last.ovr + 2) v *= 1.15;
      else if (mates.length >= DATA.ROSTER_QUOTA[p.pos] + 1) v *= 0.75;
    } else if (isStarter(t, p) && (!last || last.ovr < p.ovr - 6)) v *= 1.2;
    return v;
  }
  // offer: { a: user team id, b: AI team id, aP: [pids], bP: [pids], aK: [pick indexes], bK: [pick indexes] }
  function evalTrade(o) {
    const A = team(o.a), B = team(o.b);
    const aOut = new Set(o.aP), bOut = new Set(o.bP);
    const pk = i => G.picks[i];
    const bGets = o.aP.reduce((s, id) => s + sideValue(B, G.players[id], true, bOut), 0) + o.aK.reduce((s, i) => s + pickValue(pk(i)), 0);
    const bGives = o.bP.reduce((s, id) => s + sideValue(B, G.players[id], false, bOut), 0) + o.bK.reduce((s, i) => s + pickValue(pk(i)), 0);
    const aRoster = A.roster.length - o.aP.length + o.bP.length, bRoster = B.roster.length - o.bP.length + o.aP.length;
    const empty = !o.aP.length && !o.bP.length && !o.aK.length && !o.bK.length;
    const need = bGives * 1.08 + 0.25;
    let ok = !empty && bGets >= need, why = '';
    if (empty) why = 'Add players or picks to build an offer.';
    else if (!o.bP.length && !o.bK.length) why = `${B.name} would be getting something for nothing — ask for a player or pick back.`;
    else if (!ok) why = bGets >= bGives * 0.85 ? `${B.name} are close — add a little more.` : `${B.name} want a lot more for that.`;
    if (aRoster > rosterLimit()) { ok = false; why = `That puts you at ${aRoster}/${rosterLimit()} players — release someone first.`; }
    if (!tradeOpen()) { ok = false; why = G.phase === 'season' ? 'The trade deadline has passed.' : 'Trades are closed right now.'; }
    const thin = [];
    const c = posCounts(A);
    for (const id of o.aP) c[G.players[id].pos]--;
    for (const id of o.bP) c[G.players[id].pos] = (c[G.players[id].pos] || 0) + 1;
    for (const pos of POS) if ((c[pos] || 0) < DATA.STARTERS[pos]) thin.push(pos);
    return { ok, why, bGets, bGives, need, aRoster, bRoster, thin, fair: bGives > 0 ? bGets / need : 0 };
  }
  function movePlayer(p, to) {
    const from = team(p.teamId);
    from.roster = from.roster.filter(id => id !== p.id);
    p.teamId = to.id; p.num = jerseyNum(to, p.pos);
    to.roster.push(p.id);
  }
  function executeTrade(o, silent) {
    const A = team(o.a), B = team(o.b);
    const rec = {
      year: G.year, wk: G.phase === 'season' ? G.week : 0, phase: G.phase, a: o.a, b: o.b,
      aP: o.aP.map(id => sumP(G.players[id])), bP: o.bP.map(id => sumP(G.players[id])),
      aK: o.aK.map(i => ({ ...G.picks[i] })), bK: o.bK.map(i => ({ ...G.picks[i] })),
    };
    for (const id of o.aP) movePlayer(G.players[id], B);
    for (const id of o.bP) movePlayer(G.players[id], A);
    for (const i of o.aK) G.picks[i].own = o.b;
    for (const i of o.bK) G.picks[i].own = o.a;
    for (const t of [A, B]) {
      if (t.user) fillUDFA(t, true);
      else { fillUDFA(t); trimRoster(t); }
      rebuildDepth(t);
    }
    G.trades.unshift(rec);
    if (G.trades.length > 40) G.trades.length = 40;
    if (!silent) Forum.trade(rec);
    save();
    return rec;
  }
  const sumP = p => ({ pid: p.id, name: `${p.first} ${p.last}`, pos: p.pos, ovr: p.ovr, age: p.age });
  // AI front offices make their own deals: a contender buys a starter from a team with depth to spare
  function aiTrade() {
    const ai = G.teams.filter(t => !t.user);
    for (let tries = 0; tries < 8; tries++) {
      const A = U.pick(ai), nd = needs(A)[0];
      if (!nd || nd.pos === 'K') continue;
      const pos = nd.pos, aLast = depthHealthy(A, pos)[DATA.STARTERS[pos] - 1];
      const bar = aLast ? aLast.ovr + 3 : 0;
      const offers = [];
      for (const B of ai) {
        if (B === A) continue;
        const deep = depthHealthy(B, pos);
        if (deep.length <= DATA.STARTERS[pos]) continue;
        // only players B can spare: not one of their starters unless they're stacked there
        for (const p of deep.slice(DATA.STARTERS[pos] - 1)) if (p.ovr >= bar && (!isStarter(B, p) || deep.length >= DATA.ROSTER_QUOTA[pos] + 1)) offers.push({ B, p });
      }
      if (!offers.length) continue;
      const { B, p } = U.pick(offers);
      const want = sideValue(B, p, false, new Set()) * 1.08 + 0.25;
      // pay with picks first (closest single pick, then add a later one), else a surplus player
      const myPicks = G.picks.map((k, i) => ({ k, i })).filter(x => x.k.own === A.id).sort((x, y) => pickValue(y.k) - pickValue(x.k));
      let pay = myPicks.find(x => pickValue(x.k) >= want && pickValue(x.k) <= want * 1.6);
      const aK = [];
      if (pay) aK.push(pay.i);
      else {
        let sum = 0;
        for (const x of myPicks.slice().reverse()) { if (sum >= want) break; if (pickValue(x.k) < want) { aK.push(x.i); sum += pickValue(x.k); } }
        if (sum < want || aK.length > 3) continue;
      }
      return executeTrade({ a: A.id, b: B.id, aP: [], bP: [p.id], aK, bK: [] });
    }
    return null;
  }
  // a user can cut a player outright (there's no free-agent pool: he leaves the league)
  function release(pid) {
    const p = G.players[pid];
    if (!p || !isUser(p.teamId)) return false;
    const t = team(p.teamId);
    removePlayer(p);
    fillUDFA(t, true);
    rebuildDepth(t);
    save();
    return true;
  }

  // ── training ──
  function trainGroup(t, groupId, intensityId, scale, isCamp) {
    const g = DATA.groupById(groupId), I = DATA.INTENSITY.find(x => x.id === intensityId) || DATA.INTENSITY[1];
    const shares = [0.5, 0.3, 0.2], res = [];
    for (const p of roster(t)) {
      if (!g.pos.includes(p.pos) || p.inj > 0) continue;
      // room to grow shrinks as he approaches his potential
      const room = U.clamp((p.pot - p.ovr) / 10, 0, 1.4); // nothing left to unlock once he reaches his ceiling
      const pts = U.rand(1.2, 3.4) * I.mult * devMult(p) * room * (p.gr || 1) * scale;
      const before = p.ovr, deltas = {};
      g.attrs.forEach((a, i) => {
        const d = grow(p, a, Math.max(0, pts * shares[i] * 1.6 + U.gauss(0, 0.3) * scale));
        if (d) deltas[a] = d;
      });
      p.ovr = calcOvr(p);
      let injured = 0, stkUp = null;
      if (isCamp && U.chance(0.07 * I.mult * U.clamp((p.pot - 60) / 25, 0.4, 1.4))) stkUp = growSticker(p, 2);
      if (isCamp && U.chance(I.inj)) { injured = U.ri(1, 3); p.inj = Math.max(p.inj, injured); }
      res.push({ pid: p.id, before, after: p.ovr, deltas, injured, stkUp });
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
    // everyone gets a little from team reps; the focus group gets the extra work
    for (const t of G.teams) teamReps(t);
    const res = trainGroup(user(), G.practice, 'standard', 0.4, false);
    const up = res.filter(r => r.after > r.before);
    G.lastPractice = {
      groupId: G.practice, gain: U.sum(res.map(r => r.after - r.before)), n: res.length, improved: up.length,
      attrs: U.sum(res.map(r => U.sum(Object.values(r.deltas)))), top: up.slice(0, 3).map(r => ({ pid: r.pid, d: r.after - r.before })),
    };
    for (const t of G.teams) if (!t.user) trainGroup(t, U.pick(DATA.ALL_GROUPS).id, 'standard', 0.4, false);
  }
  function teamReps(t) {
    for (const p of roster(t)) {
      if (p.inj > 0) continue;
      const w = DATA.OVR_W[p.pos], top = DATA.ATTRS.slice().sort((a, b) => w[b] - w[a]).slice(0, 2);
      const room = U.clamp((p.pot - p.ovr) / 10, 0, 1.4); // nothing left to unlock once he reaches his ceiling
      for (const a of top) grow(p, a, U.rand(0.02, 0.07) * (p.gr || 1) * room * devMult(p));
      p.ovr = calcOvr(p);
    }
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
  // 14 games: home-and-home with the division (6), the other division in the conference (4),
  // and one division from the other conference (4). Division rematches close out the year.
  function buildSchedule() {
    const D = [0, 1, 2, 3].map(d => U.shuffle(G.teams.filter(t => t.div === d).map(t => t.id)));
    const rr = D.map(roundRobin);
    const divWeek = (r, flip) => D.flatMap((_, d) => rr[d][r].map(([h, a]) => (flip ? [a, h] : [h, a])));
    const cross = (X, Y, k) => X.map((x, i) => { const y = Y[(i + k) % 4]; return (i + k) % 2 ? [x, y] : [y, x]; });
    const confWeek = k => [...cross(D[0], D[1], k), ...cross(D[2], D[3], k)];
    const interWeek = k => [...cross(D[0], D[2], k), ...cross(D[1], D[3], k)];
    const plan = [['inter', 0], ['div', 0], ['conf', 0], ['inter', 1], ['div', 1], ['conf', 1], ['div', 2], ['inter', 2], ['conf', 2], ['divR', 0], ['inter', 3], ['conf', 3], ['divR', 1], ['divR', 2]];
    const sched = [[]];
    let gid = 0;
    const mkG = (wk, h, a, type) => ({ id: `${G.year}-${wk}-${gid++}`, wk, h, a, type, neutral: false, done: false });
    plan.forEach(([kind, k], i) => {
      const wk = i + 1;
      const pairs = kind === 'div' ? divWeek(k, false) : kind === 'divR' ? divWeek(k, true) : kind === 'conf' ? confWeek(k) : interWeek(k);
      sched[wk] = pairs.map(([h, a]) => mkG(wk, h, a, kind === 'divR' ? 'div' : kind));
    });
    for (let w = SEA.REG + 1; w <= SEA.FINAL; w++) sched[w] = [];
    G.schedule = sched;
  }
  const winPct = t => (t.rec.w + t.rec.l ? t.rec.w / (t.rec.w + t.rec.l) : 0);
  const byRecord = (a, b) => winPct(b) - winPct(a) || (b.rec.dw - b.rec.dl) - (a.rec.dw - a.rec.dl) || (b.rec.cw - b.rec.cl) - (a.rec.cw - a.rec.cl) || (b.rec.pf - b.rec.pa) - (a.rec.pf - a.rec.pa) || rank(a.id) - rank(b.id);
  const divStandings = div => G.teams.filter(t => t.div === div).sort(byRecord);
  const standings = conf => G.teams.filter(t => t.conf === conf).sort(byRecord);
  // seeds 1-2: division winners by record; 3-4: the best two records left (wild cards)
  function confSeeds(conf) {
    const winners = DATA.DIVS.filter(d => d.conf === conf).map(d => divStandings(d.id)[0]).sort(byRecord);
    const rest = standings(conf).filter(t => !winners.includes(t));
    return winners.concat(rest.slice(0, SEA.PLAYOFF - winners.length)).map(t => t.id);
  }
  const seedOf = id => { if (!G.seeds) return 0; for (const c of [0, 1]) { const i = G.seeds[c].indexOf(id); if (i >= 0) return i + 1; } return 0; };
  const userGame = () => (G.schedule[G.week] || []).find(g => g.h === G.userTeamId || g.a === G.userTeamId) || null;
  function gameLabel(g) {
    if (g.type === 'div') return `${DATA.DIVS[team(g.h).div].name} Division`;
    if (g.type === 'conf') return `${DATA.CONFS[team(g.h).conf].name} Conference`;
    if (g.type === 'inter') return 'Interconference';
    if (g.type === 'wc') return `${DATA.CONFS[g.conf].short} Wild Card`;
    if (g.type === 'cc') return `${DATA.CONFS[g.conf].name} Conference Championship`;
    return 'The Blitz Bowl';
  }
  const winnerOf = g => (g.hs > g.as ? g.h : g.a);
  // Game-day conditions — seasonal: heat early, snow from December into the playoffs.
  function genWeather(wk) {
    const early = wk <= 3, late = wk >= 10;
    const w = { clear: 0.38, cloudy: 0.18, rain: 0.13, storm: 0.05, fog: 0.06, wind: 0.09, snow: late ? 0.14 : 0, heat: early ? 0.12 : 0 };
    const type = U.wpick(Object.keys(w), k => w[k]);
    let temp = early ? U.ri(70, 90) : late ? U.ri(24, 50) : U.ri(48, 72);
    if (type === 'snow') temp = U.ri(14, 31);
    if (type === 'heat') temp = U.ri(92, 102);
    if (type === 'rain' || type === 'storm') temp -= 6;
    const wind = type === 'wind' ? U.ri(16, 28) : type === 'storm' ? U.ri(12, 24) : type === 'snow' ? U.ri(5, 18) : U.ri(0, 11);
    const time = U.wpick(['day', 'dusk', 'night'], t => ({ day: 0.5, dusk: 0.2, night: 0.3 }[t]));
    return { type, temp, wind, dir: U.rand(0, Math.PI * 2), time };
  }
  function weather(g) { if (!g.wx) g.wx = genWeather(g.wk || 1); return g.wx; }
  function weatherLine(wx) { return `${DATA.WEATHER[wx.type].label} · ${wx.temp}°F · Wind ${wx.wind} mph · ${DATA.WEATHER_TIME[wx.time]}`; }

  // ── power rankings ──
  function updatePoll() {
    G.prevPoll = G.poll.slice();
    const prev = {};
    G.prevPoll.forEach((id, i) => { prev[id] = i + 1; });
    const n = G.teams.length;
    const scored = G.teams.map(t => {
      const r = t.rec, gp = r.w + r.l;
      let s = power(t) * 0.9;
      if (gp) s += (r.w - r.l) * 5.5 + U.clamp((r.pf - r.pa) / gp, -28, 28) * 0.3 + (t.qw || 0) * 1.5;
      if (prev[t.id]) s += (n + 1 - prev[t.id]) * 0.25;
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
    // playoff games don't count toward the regular-season record
    if (g.wk <= SEA.REG) {
      W.rec.w++; Lo.rec.l++;
      if (g.type === 'div' || g.type === 'conf') { W.rec.cw++; Lo.rec.cl++; }
      if (g.type === 'div') { W.rec.dw++; Lo.rec.dl++; }
      H.rec.pf += g.hs; H.rec.pa += g.as; A.rec.pf += g.as; A.rec.pa += g.hs;
      if (rankBefore[Lo.id]) W.qw = (W.qw || 0) + 1;
    }
    W.rec.streak = W.rec.streak > 0 ? W.rec.streak + 1 : 1;
    Lo.rec.streak = Lo.rec.streak < 0 ? Lo.rec.streak - 1 : -1;
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
      neutral: g.neutral, weather: weather(g), userSide: g.h === G.userTeamId ? 0 : 1,
      askFourth: G.settings.askFourth, userCalls: G.settings.callPlays !== false, userPlan: G.plan, playoff: g.wk > SEA.REG,
    });
  }
  function finishWeek(userRes) {
    const wk = G.week, results = userRes ? [userRes] : [];
    for (const g of G.schedule[wk] || []) {
      if (g.done) continue;
      const gs = Engine.create(team(g.h), team(g.a), { neutral: g.neutral, weather: weather(g), playoff: g.wk > SEA.REG });
      Engine.simToEnd(gs);
      results.push(applyResult(g, gs));
    }
    for (const t of G.teams) for (const p of roster(t)) if (p.inj > 0) p.inj--;
    weeklyPractice();
    G.teams.forEach(rebuildDepth);
    const pollBefore = G.poll.slice();
    updatePoll();
    Forum.weekly(wk, results, pollBefore);
    // front offices work the phones until the deadline
    if (wk < SEA.DEADLINE && U.chance(0.35)) aiTrade();
    advanceWeek();
    save();
    return results;
  }
  function advanceWeek() {
    const wk = G.week;
    if (wk === SEA.REG) {
      G.seeds = { 0: confSeeds(0), 1: confSeeds(1) };
      G.schedule[SEA.WC] = [0, 1].flatMap(c => {
        const s = G.seeds[c];
        return [[s[0], s[3]], [s[1], s[2]]].map(([h, a], i) => ({ id: `${G.year}-${SEA.WC}-${c}${i}`, wk: SEA.WC, h, a, type: 'wc', conf: c, neutral: false, done: false }));
      });
    } else if (wk === SEA.WC) {
      G.schedule[SEA.CC] = [0, 1].map(c => {
        const w = G.schedule[SEA.WC].filter(g => g.conf === c).map(winnerOf).sort((a, b) => seedOf(a) - seedOf(b));
        return { id: `${G.year}-${SEA.CC}-${c}`, wk: SEA.CC, h: w[0], a: w[1], type: 'cc', conf: c, neutral: false, done: false };
      });
    } else if (wk === SEA.CC) {
      G.confChamps = G.schedule[SEA.CC].map(winnerOf);
      G.schedule[SEA.FINAL] = [{ id: `${G.year}-${SEA.FINAL}-0`, wk: SEA.FINAL, h: G.confChamps[0], a: G.confChamps[1], type: 'final', neutral: true, done: false }];
    } else if (wk === SEA.FINAL) {
      return endSeason();
    }
    G.week++;
  }

  // ── awards & season end ──
  const awardScore = p => { const s = p.st, t = team(p.teamId); return s.py / 25 + s.ptd * 4 - s.pint * 3 + s.ry / 10 + s.rtd * 6 + s.rcy / 10 + s.rctd * 6 + s.sk * 2.5 + s.int * 5 + s.tk * 0.15 + t.rec.w * 2.5; };
  function mvpList(n = 10, rookies) {
    return Object.values(G.players).filter(p => p.teamId != null && p.st.gp > 0 && (!rookies || p.exp === 0))
      .map(p => ({ p, score: awardScore(p) })).sort((a, b) => b.score - a.score).slice(0, n);
  }
  function seasonLine(p, s = p.st) {
    if (p.pos === 'QB') return `${s.py.toLocaleString()} yds · ${s.ptd} TD · ${s.pint} INT`;
    if (p.pos === 'RB') return `${s.ry.toLocaleString()} rush yds · ${s.rtd} TD`;
    if (p.pos === 'WR' || p.pos === 'TE') return `${s.rc} rec · ${s.rcy.toLocaleString()} yds · ${s.rctd} TD`;
    if (p.pos === 'K') return `${s.fgm}/${s.fga} FG`;
    if (p.pos === 'OL') return `${s.gp} games played`;
    return `${s.tk} tkl · ${s.sk} sacks · ${s.int} INT`;
  }
  const award = x => (x ? { pid: x.p.id, name: `${x.p.first} ${x.p.last}`, pos: x.p.pos, team: x.p.teamId, line: seasonLine(x.p) } : null);
  // how far a team got: 0 missed, 1 lost wild card, 2 lost conference title, 3 lost the Blitz Bowl, 4 champion
  function postDepth(id) {
    if (id === G.champion) return 4;
    if ((G.schedule[SEA.FINAL] || []).some(g => g.h === id || g.a === id)) return 3;
    if ((G.schedule[SEA.CC] || []).some(g => g.h === id || g.a === id)) return 2;
    if ((G.schedule[SEA.WC] || []).some(g => g.h === id || g.a === id)) return 1;
    return 0;
  }
  function endSeason() {
    const fin = G.schedule[SEA.FINAL][0];
    G.champion = winnerOf(fin);
    const ml = mvpList(5), rl = mvpList(1, true);
    G.awards = { mvp: award(ml[0]), roy: award(rl[0]), finalists: ml.map(x => x.p.id) };
    for (const t of G.teams) {
      t.hist.push({ year: G.year, w: t.rec.w, l: t.rec.l, cw: t.rec.cw, cl: t.rec.cl, dw: t.rec.dw, dl: t.rec.dl, rank: rank(t.id), seed: seedOf(t.id), po: postDepth(t.id), divWin: divStandings(t.div)[0] === t, champ: t.id === G.champion, cc: G.confChamps.includes(t.id) });
    }
    // next year's draft order: non-playoff teams worst-first, then by how deep they went
    G.draftOrder = G.teams.slice().sort((a, b) => postDepth(a.id) - postDepth(b.id) || winPct(a) - winPct(b) || (a.rec.pf - a.rec.pa) - (b.rec.pf - b.rec.pa)).map(t => t.id);
    const u = user();
    G.history.push({
      year: G.year, champ: G.champion, champName: fullName(team(G.champion)), runnerUp: fin.h === G.champion ? fin.a : fin.h,
      user: { w: u.rec.w, l: u.rec.l, rank: rank(u.id), po: postDepth(u.id), cc: G.confChamps.includes(u.id), champ: u.id === G.champion },
      mvp: G.awards.mvp ? { ...G.awards.mvp, teamName: team(G.awards.mvp.team).abbr } : null,
      roy: G.awards.roy ? { ...G.awards.roy, teamName: team(G.awards.roy.team).abbr } : null,
    });
    Forum.seasonEnd();
    G.phase = 'recap';
  }

  // Development by age: young players climb toward their potential, prime players hold, veterans slide.
  function progress(p) {
    const a = p.age, gap = p.pot - p.ovr, gr = p.gr || 1;
    let g;
    if (a <= 25) g = gap * U.rand(0.1, 0.25) * gr + 0.3;
    else if (a <= 27) g = gap * U.rand(0.03, 0.12) * gr + U.rand(-1, 0.3);
    else if (a <= 30) g = U.rand(-3.5, -0.5);
    else g = U.rand(-5.5, -2);
    if (gap > 0) g += (Math.min(p.starts, SEA.REG) / SEA.REG) * 0.6;
    const d = addOvr(p, g);
    if (a >= 28) p.pot = Math.max(p.ovr, Math.round(p.pot - U.rand(1, 3)));
    p.pot = Math.max(p.pot, p.ovr);
    return d;
  }
  // Retirement: rare before 30, likely in the mid-30s; kickers last a few years longer.
  function retires(p) {
    const a = p.age - (p.pos === 'K' ? 4 : 0);
    if (a >= 36) return true;
    if (a < 30) return p.ovr < 48 && U.chance(0.2);
    return U.chance(U.clamp(0.1 + (a - 30) * 0.13 + (p.ovr < 65 ? 0.15 : 0) - (p.ovr >= 82 ? 0.12 : 0), 0.03, 0.95));
  }
  function startOffseason() {
    const retired = [], risers = [], decliners = [], leagueRetired = [], stickers = [];
    for (const t of G.teams) {
      for (const p of roster(t)) {
        const sum = { name: `${p.first} ${p.last}`, pos: p.pos, ovr: p.ovr, age: p.age, exp: p.exp, teamId: t.id, line: seasonLine(p), num: p.num };
        for (const k of STAT_KEYS.concat('gp')) p.car[k] += p.st[k];
        if (retires(p)) {
          sum.car = seasonLine(p, p.car);
          if (t.user) retired.push(sum);
          if (p.ovr >= 74 || p.exp >= 10) leagueRetired.push(sum);
          removePlayer(p); continue;
        }
        const d = progress(p);
        for (const c of earnStickers(p, t, d)) stickers.push({ ...c, pid: p.id, name: `${p.first} ${p.last}`, pos: p.pos, teamId: t.id });
        p.age++; p.exp++; p.st = blankStats(); p.starts = 0; p.inj = 0;
        if (t.user && d > 0) risers.push({ pid: p.id, d });
        if (t.user && d < 0) decliners.push({ pid: p.id, d });
      }
      const h = t.hist[t.hist.length - 1];
      if (h) t.prestige = U.clamp(t.prestige * 0.7 + ((G.teams.length + 1 - h.rank) / G.teams.length) * 5 * 0.3 + (h.champ ? 0.4 : 0), 1, 5);
    }
    G.year++; G.season++;
    G.off = { stickers, retired, risers: risers.sort((a, b) => b.d - a.d).slice(0, 8), decliners: decliners.sort((a, b) => a.d - b.d).slice(0, 6), leagueRetired: leagueRetired.sort((a, b) => b.ovr - a.ovr) };
    G.teams.forEach(rebuildDepth);
    Forum.offseason();
    G.phase = 'graduation';
    // offseason dealing around the league
    for (let i = 0; i < 2; i++) if (U.chance(0.6)) aiTrade();
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
    // cut-down day: down to 53 before Week 1
    G.cuts = trimRoster(user());
    rebuildDepth(user());
    for (const t of G.teams) { t.rec = blankRec(); t.qw = 0; }
    for (const p of Object.values(G.players)) p.ovr0 = p.ovr;
    G.week = 1; G.champion = null; G.confChamps = []; G.awards = null; G.camp = null; G.draft = null; G.seeds = null;
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
      for (const p of Object.values(G.players)) {
        if (!p.stk) rollStickers(p);
        if (p.gr == null) { p.gr = rollGrowth(p.pot); p.xp = {}; }
        if (p.ovr0 == null) p.ovr0 = p.ovr;
        if (p.face == null) p.face = p.id % FACES;
      }
      G.picks = G.picks || []; G.trades = G.trades || [];
      return true;
    } catch (e) { return false; }
  }
  const hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } G = null; }

  return {
    rollStickers, growSticker, weather, weatherLine, team, user, player, roster, isUser, fullName, rank, ranked, recStr, confRecStr, divRecStr, divName,
    calcOvr, posCounts, rebuildDepth, depthHealthy, moveDepth, setAutoDepth, isStarter,
    units, power, powerFromUnits, offRating, defRating, ratings, groupAvg, needs,
    newCareer, draftCur, draftPick, draftAI, bestPickFor, finishDraft, prospectValue,
    rosterLimit, cutPreview, teamPicks, pickLabel, pickValue, pickOverall, nextDraftYear, tradeValue, tradeOpen, evalTrade, executeTrade, aiTrade, release,
    trainGroup, runCamp, buildSchedule, standings, divStandings, confSeeds, seedOf, postDepth, userGame, gameLabel, winnerOf,
    updatePoll, applyResult, createUserGame, finishWeek, mvpList, seasonLine,
    startOffseason, beginAnnualDraft, startSeason, leaders, teamLeader,
    save, load, hasSave, wipe,
  };
})();
