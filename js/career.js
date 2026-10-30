'use strict';
// ── CAREER: achievements, rivalries, coaching staffs, draft busts & steals, weekly honours & highlight reel ──
// League code calls in at its milestones (a game is booked, a week ends, the season ends, the offseason
// starts); everything here lives in the save (G) except achievements, which are kept per device so they
// carry across careers.

const Career = (() => {
  const SEA = DATA.SEASON;
  const OFF = DATA.OFFENSE, DEF = DATA.POSITIONS.filter(p => p !== 'K' && !OFF.includes(p));
  const pn = p => `${p.first} ${p.last}`;
  const uid = () => G.userTeamId;

  // ════════════ ACHIEVEMENTS ════════════
  const ACH = [
    { id: 'first_win', icon: '🏈', name: 'Opening Statement', desc: 'Win your first game.' },
    { id: 'statement', icon: '💥', name: 'Statement Win', desc: 'Win a game by 30 or more.' },
    { id: 'shutout', icon: '🧱', name: 'Pitch a Shutout', desc: 'Hold an opponent scoreless.' },
    { id: 'comeback', icon: '🔄', name: 'Never Say Die', desc: 'Win after trailing by 14 or more.' },
    { id: 'ot', icon: '⏱️', name: 'Sudden Death', desc: 'Win a game in overtime.' },
    { id: 'div', icon: '🎌', name: 'Division Crown', desc: 'Win your division.' },
    { id: 'perfect', icon: '💯', name: 'Perfection', desc: 'Go undefeated in the regular season.' },
    { id: 'champ', icon: '🏆', name: 'Blitz Bowl Champions', desc: 'Win the Blitz Bowl.' },
    { id: 'repeat', icon: '✌️', name: 'Back-to-Back', desc: 'Win the Blitz Bowl two years running.' },
    { id: 'dynasty', icon: '👑', name: 'Dynasty', desc: 'Win three titles in one career.' },
    { id: 'underdog', icon: '🔥', name: 'From the Ashes', desc: 'Win a title in a career started on Rebuild.' },
    { id: 'worst_first', icon: '📈', name: 'Worst to First', desc: 'Win your division a year after finishing last in it.' },
    { id: 'mvp', icon: '⭐', name: 'MVP Factory', desc: 'Have the league MVP on your roster.' },
    { id: 'homegrown', icon: '🌱', name: 'Homegrown Star', desc: 'A player you drafted wins MVP.' },
    { id: 'steal', icon: '💎', name: 'Diamond in the Rough', desc: 'A player you drafted in round 3 or later reaches 80 OVR.' },
    { id: 'pow', icon: '🎖️', name: 'Player of the Week', desc: 'One of your players is named Player of the Week.' },
    { id: 'reel', icon: '🎬', name: 'Top of the Reel', desc: 'Make the #1 play of the week.' },
    { id: 'rival_sweep', icon: '😤', name: 'Bragging Rights', desc: 'Sweep your top rival in the regular season.' },
    { id: 'rival_po', icon: '⚔️', name: 'Bad Blood', desc: 'Knock a rival out of the playoffs.' },
    { id: 'trader', icon: '🔁', name: 'Wheeler Dealer', desc: 'Complete 10 trades in one career.' },
    { id: 'splash', icon: '💰', name: 'Splash Signing', desc: 'Sign a free agent rated 80 or better.' },
    { id: 'coach_tree', icon: '🌳', name: 'Coaching Tree', desc: 'Have a coordinator hired away as a head coach.' },
    { id: 'staff', icon: '📋', name: 'Dream Staff', desc: 'Have three coaches rated 4 stars or better at once.' },
    { id: 'lifer', icon: '🗓️', name: 'Lifer', desc: 'Complete 10 seasons with one franchise.' },
    { id: 'second_chance', icon: '🔥', name: 'Second Chance', desc: 'Get fired on the Hot Seat, then win the Blitz Bowl with your next team.' },
  ];
  const ACH_KEY = 'problitz.ach';
  let onUnlock = null;
  const store = () => { try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; } catch (e) { return {}; } };
  function unlock(id) {
    if (!G) return;
    G.ach = G.ach || {};
    if (G.ach[id]) return;
    G.ach[id] = G.year;
    const s = store();
    const first = !s[id];
    if (first) {
      s[id] = { at: new Date().toISOString().slice(0, 10), team: L.fullName(L.user()), year: G.year };
      try { localStorage.setItem(ACH_KEY, JSON.stringify(s)); } catch (e) { /* storage full */ }
    }
    const a = ACH.find(x => x.id === id);
    if (a && onUnlock) onUnlock(a, first);
  }
  const achList = () => { const s = store(); return ACH.map(a => ({ ...a, got: s[a.id] || null, career: !!(G && G.ach && G.ach[a.id]) })); };

  // ════════════ COACHING STAFF ════════════
  const ROLES = [
    { id: 'oc', name: 'Offensive Coordinator', short: 'OC' },
    { id: 'dc', name: 'Defensive Coordinator', short: 'DC' },
    { id: 'dev', name: 'Player Development', short: 'DEV' },
  ];
  const TRAITS = {
    airraid: { role: 'oc', name: 'Air Raid', desc: 'QBs, receivers and tight ends play up on game day.', pos: ['QB', 'WR', 'TE'] },
    ground: { role: 'oc', name: 'Ground & Pound', desc: 'Running backs and the offensive line play up on game day.', pos: ['RB', 'OL'] },
    qbguru: { role: 'oc', name: 'QB Whisperer', desc: 'Quarterbacks play up and develop much faster.', pos: ['QB'] },
    pressure: { role: 'dc', name: 'Pressure Package', desc: 'The defensive line and linebackers play up on game day.', pos: ['DL', 'LB'] },
    nofly: { role: 'dc', name: 'No-Fly Zone', desc: 'Cornerbacks and safeties play up on game day.', pos: ['CB', 'S'] },
    teacher: { role: 'dc', name: 'Defensive Teacher', desc: 'Linebackers and safeties play up; every defender develops faster.', pos: ['LB', 'S'] },
    youth: { role: 'dev', name: 'Youth Movement', desc: 'Players 24 and under develop much faster.' },
    vets: { role: 'dev', name: 'Veteran Care', desc: 'Players 28 and older decline far more slowly.' },
    medic: { role: 'dev', name: 'Sports Science', desc: 'Fewer camp injuries and quicker recoveries.' },
    eval: { role: 'dev', name: 'Talent Evaluator', desc: '+4 scouting points each spring; boom-or-bust signs show after two visits.' },
  };
  const traitsFor = role => Object.keys(TRAITS).filter(k => TRAITS[k].role === role);
  const stars = c => U.clamp(Math.round(c.r), 1, 5);
  function genCoach(role, r) {
    G.coachSeq = (G.coachSeq || 1);
    return { id: G.coachSeq++, first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), role, r: +U.clamp(r, 1, 5).toFixed(2), trait: U.pick(traitsFor(role)), age: U.ri(34, 58), seasons: 0, titles: 0 };
  }
  // what a franchise can attract: a famous coordinator wants a winner (or a big promotion)
  const reach = t => t.prestige + 1.6;
  function initStaff() {
    for (const t of G.teams) {
      t.staff = t.staff || {};
      for (const r of ROLES) if (!t.staff[r.id]) t.staff[r.id] = genCoach(r.id, U.gauss(1.4 + t.prestige * 0.55, 0.55));
    }
  }
  // game-day boost per position: a little for the whole unit, more for the coordinator's specialty
  function coachBonus(t) {
    const b = {};
    for (const pos of DATA.POSITIONS) b[pos] = 0;
    if (!t || !t.staff) return b;
    const add = (c, group) => {
      if (!c) return;
      const tr = TRAITS[c.trait] || {};
      for (const pos of group) b[pos] += 0.15 * c.r + ((tr.pos || []).includes(pos) ? 0.35 * c.r : 0);
    };
    add(t.staff.oc, OFF); add(t.staff.dc, DEF);
    for (const pos in b) b[pos] = +b[pos].toFixed(2);
    return b;
  }
  // development speed in practice, camp and the offseason
  function devMult(t, p) {
    if (!t || !t.staff) return 1;
    const { oc, dc, dev } = t.staff;
    let m = 1;
    if (dev) { m += 0.03 * dev.r; if (dev.trait === 'youth' && p.age <= 24) m += 0.06 * dev.r; }
    if (oc && oc.trait === 'qbguru' && p.pos === 'QB') m += 0.07 * oc.r;
    if (dc && dc.trait === 'teacher' && DEF.includes(p.pos)) m += 0.05 * dc.r;
    return m;
  }
  const devTrait = (t, id) => !!(t && t.staff && t.staff.dev && t.staff.dev.trait === id);
  const vetMult = t => (devTrait(t, 'vets') ? 1 - 0.08 * t.staff.dev.r : 1);
  const injMult = t => (devTrait(t, 'medic') ? 1 - 0.1 * t.staff.dev.r : 1);
  const quickHeal = t => devTrait(t, 'medic') && U.chance(0.08 * t.staff.dev.r);
  const scoutBonus = t => (devTrait(t, 'eval') ? 4 : 0);
  const marketOpen = () => G.phase !== 'season' && G.phase !== 'recap' && !!G.coachPool;

  // three open candidates per job (one big name), plus a rising coach your franchise can always land
  function openMarket() {
    G.coachPool = [];
    const top = reach(L.user());
    for (const r of ROLES) {
      for (let i = 0; i < 3; i++) G.coachPool.push(genCoach(r.id, U.gauss(i === 0 ? 4.2 : 3, 0.9)));
      G.coachPool.push(genCoach(r.id, U.rand(Math.max(1, top - 1.4), Math.min(5, top - 0.05))));
    }
  }
  function interested(c, t = L.user()) { return c.r <= reach(t); }
  function hire(cid) {
    if (!marketOpen()) return { ok: false, why: 'Coaches can only be hired in the offseason.' };
    const c = G.coachPool.find(x => x.id === cid), t = L.user();
    if (!c) return { ok: false, why: 'He has already taken another job.' };
    if (!interested(c, t)) return { ok: false, why: `${pn(c)} wants a bigger job. Win more to raise your prestige.` };
    G.coachPool = G.coachPool.filter(x => x !== c);
    t.staff[c.role] = c;
    if (ROLES.every(r => t.staff[r.id] && stars(t.staff[r.id]) >= 4)) unlock('staff');
    L.save();
    return { ok: true, c };
  }
  function fire(role) {
    if (!marketOpen()) return { ok: false, why: 'Staff changes happen in the offseason.' };
    const t = L.user(), c = t.staff[role];
    if (!c) return { ok: false };
    t.staff[role] = null;
    L.save();
    return { ok: true, c };
  }
  // after the season: coordinators grow with success, the best get hired away, the oldest retire
  function staffSeasonEnd() {
    for (const t of G.teams) {
      const h = t.hist[t.hist.length - 1];
      for (const r of ROLES) {
        const c = t.staff && t.staff[r.id];
        if (!c) continue;
        c.seasons++;
        if (h && h.champ) c.titles++;
        const d = (h ? (h.champ ? 0.35 : h.po >= 2 ? 0.25 : h.po ? 0.15 : 0) - (h.w / Math.max(1, h.w + h.l) < 0.36 ? 0.2 : 0) : 0) + U.gauss(0, 0.1);
        c.r = +U.clamp(c.r + d, 1, 5).toFixed(2);
      }
    }
  }
  function staffOffseason() {
    const moves = [];
    for (const t of G.teams) {
      const h = t.hist[t.hist.length - 1];
      for (const r of ROLES) {
        const c = t.staff && t.staff[r.id];
        if (!c) continue;
        c.age++;
        if (c.age >= 70 || (c.age >= 64 && U.chance(0.3))) { t.staff[r.id] = null; moves.push({ c, t, why: 'retire' }); continue; }
        if (r.id !== 'dev' && c.r >= 3.4 && h && (h.po || h.w >= 9) && U.chance(0.16 + 0.12 * (c.r - 3.4) + (h.champ ? 0.15 : 0))) {
          t.staff[r.id] = null;
          const dest = U.pick(['a college powerhouse', 'an expansion club overseas', 'a rival league franchise', 'his alma mater']);
          moves.push({ c, t, why: 'poached', dest });
        }
      }
    }
    for (const m of moves) {
      if (m.why !== 'poached') continue;
      const mine = m.t.user;
      Forum.news({
        tag: 'COACHING', heat: mine ? 82 : 48, teams: [m.t.id], mine,
        title: `${m.t.name} ${ROLES.find(r => r.id === m.c.role).short} ${pn(m.c)} hired as head coach`,
        body: `${pn(m.c)} (${'★'.repeat(stars(m.c))}, ${TRAITS[m.c.trait].name}) leaves the ${m.t.name} ${m.t.mascot} after ${m.c.seasons} season${m.c.seasons === 1 ? '' : 's'} to take over ${m.dest}.`,
        pools: [{ w: 2, team: m.t, lines: 'coach' }, { w: 1, lines: 'coach' }],
      });
      if (mine) unlock('coach_tree');
    }
    openMarket();
    return moves.filter(m => m.t.user);
  }
  // nobody starts a season shorthanded: AI clubs promote from within, you get the best candidate still interested
  function staffSeasonStart() {
    for (const t of G.teams) {
      t.staff = t.staff || {};
      for (const r of ROLES) {
        if (t.staff[r.id]) continue;
        if (t.user && G.coachPool) {
          const c = G.coachPool.filter(x => x.role === r.id && interested(x, t)).sort((a, b) => b.r - a.r)[0];
          if (c) { G.coachPool = G.coachPool.filter(x => x !== c); t.staff[r.id] = c; continue; }
        }
        t.staff[r.id] = genCoach(r.id, U.gauss(1.2 + t.prestige * 0.55, 0.5));
      }
    }
    G.coachPool = null;
    const u = L.user();
    if (ROLES.every(r => u.staff[r.id] && stars(u.staff[r.id]) >= 4)) unlock('staff');
  }

  // ════════════ RIVALRIES (from the user's point of view) ════════════
  const RIVAL_MIN = 25;
  const rivalLevel = h => (h >= 80 ? 'Bad Blood' : h >= 50 ? 'Heated' : h >= RIVAL_MIN ? 'Rivalry' : '');
  function initRivals() {
    G.rivals = G.rivals || {};
    const u = L.user();
    if (Object.keys(G.rivals).length) return;
    const div = G.teams.filter(t => t.div === u.div && !t.user).sort((a, b) => Math.abs(a.prestige - u.prestige) - Math.abs(b.prestige - u.prestige));
    if (div[0]) G.rivals[div[0].id] = { heat: 32, w: 0, l: 0, games: [], why: 'Division neighbors who can\'t stand each other' };
  }
  const rivalOf = id => (G.rivals && G.rivals[id] && G.rivals[id].heat >= RIVAL_MIN ? G.rivals[id] : null);
  function topRival() {
    if (!G.rivals) return null;
    const e = Object.entries(G.rivals).filter(([, r]) => r.heat >= RIVAL_MIN).sort((a, b) => b[1].heat - a[1].heat)[0];
    return e ? { id: +e[0], ...e[1] } : null;
  }
  const rivalList = () => Object.entries(G.rivals || {}).map(([id, r]) => ({ id: +id, ...r })).filter(r => r.heat >= 10).sort((a, b) => b.heat - a.heat);
  function rivalGame(g) {
    if (!g || (g.h !== uid() && g.a !== uid())) return null;
    return rivalOf(g.h === uid() ? g.a : g.h);
  }
  function rivalryAfterGame(g, res) {
    G.rivals = G.rivals || {};
    const opp = g.h === uid() ? g.a : g.h, ot = L.team(opp);
    const r = G.rivals[opp] || (G.rivals[opp] = { heat: 0, w: 0, l: 0, games: [] });
    const won = res.W.id === uid(), margin = res.ws - res.ls, po = g.wk > SEA.REG;
    const wasRival = r.heat >= RIVAL_MIN;
    let h = 3 + (g.type === 'div' ? 4 : 0) + (margin <= 7 ? 6 : 0) + (res.ot ? 4 : 0) + (po ? (g.type === 'final' ? 30 : 18) : 0) + (won ? 0 : 3);
    if (Math.abs(ot.prestige - L.user().prestige) <= 0.6) h += 2;
    r.heat = Math.min(100, r.heat + h);
    if (won) r.w++; else r.l++;
    r.games.unshift({ y: G.year, wk: g.wk, us: won ? res.ws : res.ls, them: won ? res.ls : res.ws, po });
    if (r.games.length > 8) r.games.length = 8;
    if (!wasRival && r.heat >= RIVAL_MIN) {
      r.why = po ? 'A playoff meeting nobody will forget' : margin <= 7 ? 'One close game too many' : 'Too many meetings, too much history';
      Forum.news({
        tag: 'RIVALRY', heat: 74, teams: [opp, uid()], mine: true,
        title: `It's official: ${L.user().name} vs ${ot.name} is a rivalry now`,
        body: `${r.why}. The series stands ${r.w}-${r.l}.`,
        pools: [{ w: 2, team: L.user(), lines: 'rival' }, { w: 2, team: ot, lines: 'rival' }], vars: { R: ot.name, SR: `${r.w}-${r.l}` },
      });
    }
    if (won && po && wasRival) unlock('rival_po');
  }
  // the week before a rivalry game, the board fills up
  function rivalryHype() {
    if (G.phase !== 'season') return;
    const g = L.userGame(), r = rivalGame(g);
    if (!r || r.hyped === `${G.year}-${G.week}`) return;
    r.hyped = `${G.year}-${G.week}`;
    const opp = L.team(g.h === uid() ? g.a : g.h), u = L.user();
    Forum.news({
      tag: 'RIVALRY WEEK', heat: 70 + Math.round(r.heat / 5), teams: [opp.id, u.id], mine: true,
      title: `${rivalLevel(r.heat).toUpperCase()}: ${u.name} vs ${opp.name} — ${DATA.WEEK_LABEL(G.week)}`,
      body: `All-time series: ${u.name} ${r.w}-${r.l}.${r.games[0] ? ` Last meeting: ${r.games[0].us > r.games[0].them ? `${u.name} won` : `${opp.name} won`} ${Math.max(r.games[0].us, r.games[0].them)}-${Math.min(r.games[0].us, r.games[0].them)}.` : ''}`,
      pools: [{ w: 2, team: u, lines: 'rival' }, { w: 2, team: opp, lines: 'rival' }], vars: { R: opp.name, SR: `${r.w}-${r.l}` }, n: 6,
    });
  }

  // ════════════ DRAFT: hidden boom / bust arcs, then re-grades two years on ════════════
  function rollArc(p) {
    const r = Math.random();
    const k = r < 0.13 ? 'boom' : r < 0.28 ? 'bust' : null;
    if (k) p.arc = { k, d: U.ri(6, 13), n: 2 };
    const h = Math.random();
    p.hint = k === 'boom' ? (h < 0.7 ? 'up' : h < 0.8 ? 'down' : null) : k === 'bust' ? (h < 0.7 ? 'down' : h < 0.8 ? 'up' : null) : (h < 0.1 ? 'up' : h < 0.2 ? 'down' : null);
  }
  const HINT = {
    up: 'Off-the-charts work ethic. Could blow past his projection.',
    down: 'Red flags on his tape and in his medicals. Real bust risk.',
    none: 'No red flags, no surprises expected.',
  };
  function hintFor(p) {
    const need = devTrait(L.user(), 'eval') ? 2 : 3;
    if ((p.sc || 0) < need) return null;
    return { k: p.hint || 'none', text: HINT[p.hint || 'none'] };
  }
  // the arc plays out over his first two offseasons
  function applyArc(p) {
    const a = p.arc;
    if (!a || !a.n || p.teamId == null) return;
    const amt = Math.ceil(a.d / 2);
    if (a.k === 'boom') { p.pot = Math.min(99, p.pot + amt); p.gr = +Math.min(1.9, (p.gr || 1) + 0.12).toFixed(2); }
    else { p.pot = Math.max(p.ovr, p.pot - amt); p.gr = +Math.max(0.35, (p.gr || 1) * 0.85).toFixed(2); }
    a.n--;
  }
  const GRADE = z => (z > 1.3 ? 'A+' : z > 0.8 ? 'A' : z > 0.4 ? 'A-' : z > 0.1 ? 'B+' : z > -0.2 ? 'B' : z > -0.5 ? 'B-' : z > -0.9 ? 'C+' : z > -1.3 ? 'C' : 'D');
  function rememberDraft(d) {
    G.draftHist = G.draftHist || {};
    const g = {};
    for (const id in d.grades) g[id] = d.grades[id].grade;
    G.draftHist[d.year] = g;
  }
  function reviewDraft(year) {
    const cls = Object.values(G.players).filter(p => p.draft && p.draft.year === year && p.teamId != null).sort((a, b) => a.draft.pick - b.draft.pick);
    if (cls.length < 12) return null;
    // what a pick in that slot "should" be by now: the class's own smoothed OVR curve, never rising with later picks
    const exp = cls.map((p, i) => U.avg(cls.slice(Math.max(0, i - 8), i + 9).map(x => x.ovr)));
    for (let i = 1; i < exp.length; i++) exp[i] = Math.min(exp[i], exp[i - 1]);
    const rows = cls.map((p, i) => ({ p, v: p.ovr - exp[i] }));
    const n = G.teams.length;
    const steals = rows.filter(x => x.p.draft.pick > n && x.v >= 5).sort((a, b) => b.v - a.v).slice(0, 3);
    const busts = rows.filter(x => x.p.draft.pick <= n && x.v <= -5).sort((a, b) => a.v - b.v).slice(0, 3);
    for (const x of steals) x.p.dl = 'steal';
    for (const x of busts) x.p.dl = 'bust';
    const by = {};
    for (const x of rows) { const t = x.p.draft.by ?? x.p.teamId; (by[t] = by[t] || []).push(x.v); }
    const vals = Object.entries(by).map(([id, v]) => ({ id: +id, v: U.avg(v) }));
    const m = U.avg(vals.map(x => x.v)), sd = Math.sqrt(U.avg(vals.map(x => (x.v - m) ** 2))) || 1;
    const grades = {};
    for (const x of vals) grades[x.id] = GRADE((x.v - m) / sd);
    const sum = x => ({ pid: x.p.id, name: pn(x.p), pos: x.p.pos, pick: x.p.draft.pick, round: x.p.draft.round, team: x.p.teamId, by: x.p.draft.by ?? x.p.teamId, ovr: x.p.ovr, v: Math.round(x.v) });
    const rev = { year, steals: steals.map(sum), busts: busts.map(sum), grades, orig: (G.draftHist || {})[year] || {} };
    G.draftReviews = [rev].concat(G.draftReviews || []).slice(0, 12);
    const u = L.user(), ug = grades[u.id], og = rev.orig[u.id];
    const st = rev.steals[0], bu = rev.busts[0];
    Forum.news({
      tag: 'DRAFT', heat: 62 + (ug ? 10 : 0), teams: [u.id], mine: !!ug,
      title: `Two years later: re-grading the ${year} draft`,
      body: [st ? `Biggest steal: ${st.name} (${st.pos}, pick #${st.pick}, ${L.team(st.by).abbr}) — now ${st.ovr} OVR.` : '', bu ? `Biggest bust: ${bu.name} (${bu.pos}, pick #${bu.pick}, ${L.team(bu.by).abbr}) — stuck at ${bu.ovr} OVR.` : '', ug ? `${u.name}: ${og ? `${og} on draft day → ` : ''}${ug} today.` : ''].filter(Boolean).join('\n\n'),
      pools: [{ w: 3, lines: 'regrade' }, { w: 1, team: u, lines: 'regrade' }],
    });
    return rev;
  }

  // ════════════ WEEKLY: highlights & Player of the Week ════════════
  // how much a single logged play deserves the reel
  function playScore(e) {
    const t = e.text || '';
    let s = 0, tag = '';
    if (e.kind === 'td') {
      if (/SAFETY/.test(t)) { s = 32; tag = 'SAFETY'; }
      else {
        const ret = /INTERCEPT|FUMBLE|return|RETURN|recover/i.test(t);
        s = 34 + (e.y || 0) * 0.9 + (ret ? 34 : 0);
        tag = ret ? (/INTERCEPT/i.test(t) ? 'PICK-SIX' : 'RETURN TD') : (e.y || 0) >= 40 ? 'LONG TD' : 'TOUCHDOWN';
      }
    } else if (e.kind === 'big') { s = 8 + (e.y || 0) * 0.8; tag = 'BIG PLAY'; }
    else if (e.kind === 'to' && /INTERCEPT|FUMBLE|strip/i.test(t)) { s = 28; tag = /INTERCEPT/i.test(t) ? 'INTERCEPTION' : 'TAKEAWAY'; }
    else if (e.kind === 'fg') { const m = t.match(/(\d+)-yd/); const d = m ? +m[1] : 30; if (d >= 50) { s = 20 + (d - 50) * 2.5; tag = `${d}-YD FG`; } }
    if (!s) return null;
    const close = Math.abs(e.sc[0] - e.sc[1]) <= 8;
    if (e.q >= 4 && close) s *= 1.4;
    if (e.q > 4) s *= 1.25;
    // the go-ahead score in the final two minutes (or any overtime score)
    if ((e.kind === 'td' || e.kind === 'fg') && e.scorer != null && (e.q > 4 || (e.q === 4 && e.clk <= 120))) {
      const me = e.sc[e.scorer], them = e.sc[1 - e.scorer];
      if (me > them && me - them <= 8) { s += 45; tag = 'GAME-WINNER'; }
    }
    return { s, tag };
  }
  function gamePlays(g, gs) {
    const out = [];
    for (const e of gs.log) {
      const r = playScore(e);
      if (!r) continue;
      const side = e.scorer != null ? e.scorer : e.side;
      const clip = (gs.clips || []).find(c => c.ns.includes(e.n));
      out.push({ gid: g.id, h: g.h, a: g.a, team: gs.t[side], q: e.q, clk: e.clk, text: e.text, kind: e.kind, sc: e.sc, y: e.y || 0, los: e.los ?? null, side, s: +r.s.toFixed(1), tag: r.tag, clip: clip ? clip.clip : null });
    }
    return out.sort((a, b) => b.s - a.s).slice(0, 3);
  }
  function weekWrap(wk, results) {
    const plays = results.flatMap(r => r.hl || []).sort((a, b) => b.s - a.s).slice(0, 3);
    let off = null, def = null;
    for (const r of results) for (const x of r.top || []) {
      const p = G.players[x.pid];
      if (!p) continue;
      const v = x.val * (L.team(p.teamId) === r.W ? 1.12 : 1);
      const c = { pid: p.id, name: pn(p), pos: p.pos, team: p.teamId, line: x.line, opp: r.W.id === p.teamId ? r.Lo.id : r.W.id, v };
      if (x.kind === 'def') { if (!def || v > def.v) def = c; } else if (!off || v > off.v) off = c;
    }
    // the honour itself, and sometimes a badge for the performance
    for (const c of [off, def]) if (c) {
      const p = G.players[c.pid];
      p.pow = (p.pow || 0) + 1;
      if (U.chance(0.35)) L.logBadge(p, L.growSticker(p, 2), wk, 'pow');
    }
    G.reel = { year: G.year, wk, plays, pow: { off, def } };
    G.powLog = [{ y: G.year, wk, off, def }].concat(G.powLog || []).slice(0, 60);
    if (off || def) {
      const teams = [off, def].filter(Boolean).map(c => c.team), mine = teams.includes(uid());
      Forum.news({
        tag: 'HONORS', heat: 58 + (mine ? 18 : 0), teams, mine, by: 'mod',
        title: `${DATA.WEEK_LABEL(wk)} honors: ${[off, def].filter(Boolean).map(c => c.name).join(' and ')}`,
        body: [off ? `Offensive Player of the Week: ${off.name} (${L.team(off.team).abbr} ${off.pos}) — ${off.line} vs ${L.team(off.opp).name}.` : '', def ? `Defensive Player of the Week: ${def.name} (${L.team(def.team).abbr} ${def.pos}) — ${def.line} vs ${L.team(def.opp).name}.` : '', plays.length ? `Top plays of the week:\n${plays.map((p, i) => `${i + 1}. ${p.tag} — ${p.text}`).join('\n')}` : ''].filter(Boolean).join('\n\n'),
        pools: [{ w: 2, lines: 'pow' }, { w: 1, lines: 'reel' }], vars: { P: (off || def).name },
      });
      if (mine) unlock('pow');
    }
    if (plays[0] && plays[0].team === uid()) unlock('reel');
    ownerCheckIn(wk);
  }

  // ════════════ HOT SEAT: owner goals and job security (opt-in when the career starts) ════════════
  // Each preseason the owner sets two or three goals scaled to the roster. Hitting them builds job security,
  // missing them drains it, and at zero the GM is fired and picks a new job from the clubs that come calling.
  const hotOn = () => !!(G && G.hotSeat);
  const GOAL_W = { wins: 1, playoffs: 0.8, deep: 0.8, title: 0.8, division: 0.6, rival: 0.5, develop: 0.6, scoring: 0.5, defense: 0.5 };
  const secLabel = s => (s >= 70 ? 'Secure' : s >= 45 ? 'Stable' : s >= 25 ? 'Warm seat' : 'Hot seat');
  const hot = () => G.hot || (G.hot = { sec: 50, log: [], jobs: [{ team: uid(), from: G.year }], goals: null, year: 0 });
  function setGoals() {
    if (!hotOn()) return;
    const u = L.user(), r = L.rank(u.id) || 8, H = hot();
    // a team the polls rank r-th is "expected" around 11.5 - 0.55(r-1) wins; the owner asks for one fewer
    const goals = [{ k: 'wins', n: U.clamp(Math.round(11.5 - (r - 1) * 0.55 - 1), 3, 13) }];
    goals.push(r <= 2 && u.prestige >= 4.2 ? { k: 'title' } : r <= 4 ? { k: 'deep' } : r <= 8 ? { k: 'playoffs' } : { k: 'develop' });
    const rv = topRival();
    const meets = rv && G.schedule.some(w => (w || []).some(g => (g.h === rv.id && g.a === u.id) || (g.a === rv.id && g.h === u.id)));
    const pool = (r <= 8 ? ['division', 'scoring', 'defense'] : ['scoring', 'defense', 'develop']).filter(k => !goals.some(g => g.k === k));
    const extra = meets && U.chance(0.5) ? { k: 'rival', rid: rv.id } : { k: U.pick(pool) };
    goals.push(extra);
    H.goals = goals; H.year = G.year;
    Forum.news({
      tag: 'HOT SEAT', heat: 70, teams: [u.id], mine: true,
      title: `${u.name} owner lays out expectations for ${G.year}`,
      body: `Sources say the owner has made it clear what this season needs to look like:\n\n${goals.map(g => `• ${goalLabel(g)}`).join('\n')}\n\nJob security: ${secLabel(H.sec)}.`,
      pools: [{ w: 2, team: u, lines: 'loseFan' }, { w: 1, lines: 'neutral' }],
    });
  }
  function goalLabel(g) {
    switch (g.k) {
      case 'wins': return `Win at least ${g.n} games`;
      case 'playoffs': return 'Make the playoffs';
      case 'deep': return 'Reach the conference championship';
      case 'title': return 'Win the Blitz Bowl';
      case 'division': return 'Win the division';
      case 'rival': return `Beat the ${L.team(g.rid).name} ${L.team(g.rid).mascot}`;
      case 'develop': return 'Develop a young player (+4 OVR, age 24 or under)';
      case 'scoring': return 'Top-5 offense (points scored)';
      default: return 'Top-5 defense (fewest points allowed)';
    }
  }
  // live progress: state is 'met', 'missed' or 'open' (still in play); final settles everything open at season's end
  function goalStatus(g, final = G.phase !== 'season') {
    const u = L.user(), rec = u.rec, left = Math.max(0, SEA.REG - rec.w - rec.l), h = u.hist[u.hist.length - 1];
    const ended = final && h && h.year === G.year, out = { label: goalLabel(g), prog: '', state: 'open' };
    const seeded = G.seeds ? L.seedOf(u.id) > 0 : null; // known once the regular season is over
    const rankOf = (key, low) => G.teams.slice().sort((a, b) => (low ? a.rec[key] - b.rec[key] : b.rec[key] - a.rec[key])).indexOf(u) + 1;
    switch (g.k) {
      case 'wins':
        out.prog = `${rec.w} of ${g.n} wins`;
        out.state = rec.w >= g.n ? 'met' : rec.w + left < g.n ? 'missed' : 'open';
        break;
      case 'playoffs': case 'deep': case 'title': case 'division': {
        const need = { playoffs: 1, deep: 2, title: 4 }[g.k];
        if (ended) out.state = (g.k === 'division' ? h.divWin : h.po >= need) ? 'met' : 'missed';
        else if (seeded === false) out.state = 'missed';
        else if (g.k === 'division') { const lead = L.divStandings(u.div)[0] === u; out.prog = lead ? 'Leading the division' : 'Chasing the division lead'; if (G.seeds) out.state = lead ? 'met' : 'missed'; }
        else if (g.k === 'playoffs' && seeded) out.state = 'met';
        else out.prog = seeded ? `${DATA.CONFS[u.conf].short} #${L.seedOf(u.id)} seed` : L.confSeeds(u.conf).includes(u.id) ? 'In playoff position' : 'Outside the playoff picture';
        break;
      }
      case 'rival': {
        const r = G.rivals && G.rivals[g.rid], games = r ? r.games.filter(x => x.y === G.year) : [];
        const wins = games.filter(x => x.us > x.them).length;
        const sched = G.schedule.flat().filter(x => x && ((x.h === g.rid && x.a === u.id) || (x.a === g.rid && x.h === u.id)));
        out.prog = `${wins}-${games.length - wins} this season`;
        out.state = wins ? 'met' : sched.every(x => x.done) || ended ? 'missed' : 'open';
        break;
      }
      case 'develop': {
        const best = L.roster(u).filter(p => p.age <= 24).reduce((m, p) => Math.max(m, p.ovr - (p.ovr0 ?? p.ovr)), 0);
        out.prog = `Best young riser: +${best}`;
        out.state = best >= 4 ? 'met' : ended ? 'missed' : 'open';
        break;
      }
      default: {
        const rk = g.k === 'scoring' ? rankOf('pf') : rankOf('pa', true);
        out.prog = `Ranked #${rk}`;
        if (ended || G.seeds) out.state = rk <= 5 ? 'met' : 'missed';
      }
    }
    return out;
  }
  // the owner's verdict on the season, right after the Blitz Bowl
  function judgeSeason() {
    if (!hotOn() || !G.hot || G.hot.year !== G.year || !G.hot.goals) return;
    const H = G.hot, u = L.user(), h = u.hist[u.hist.length - 1];
    let d = 0;
    const res = H.goals.map(g => {
      const st = goalStatus(g, true), met = st.state === 'met', w = GOAL_W[g.k] || 0.5;
      d += met ? 12 * w : -20 * w;
      if (g.k === 'wins' && !met) d -= Math.min(10, (g.n - u.rec.w) * 2.5); // falling well short hurts more
      return { label: st.label, met };
    });
    if (h && h.champ) d += 25;
    d = Math.round(d);
    H.sec = U.clamp(H.sec + d, 0, 100);
    H.log.unshift({ y: G.year, team: u.id, d, sec: H.sec, res });
    H.goals = null;
    if (h && h.champ && H.firedOnce) unlock('second_chance');
    if (H.sec > 0) return;
    // fired: the clubs that come calling are the ones that need a new GM most
    const offers = U.shuffle(G.teams.filter(t => t.id !== u.id).sort((a, b) => (a.rec.w - b.rec.w) || (a.prestige - b.prestige)).slice(0, 6)).slice(0, 3).map(t => t.id);
    G.fired = { y: G.year, from: u.id, offers };
    Forum.news({
      tag: 'HOT SEAT', heat: 95, teams: [u.id], mine: true, by: 'mod',
      title: `${u.name} ${u.mascot} fire their general manager`,
      body: `After ${u.hist.length} season${u.hist.length === 1 ? '' : 's'}, the owner has seen enough. ${res.filter(x => !x.met).map(x => x.label).join(', ') || 'The results'} — the goals weren't met, and the front office is being cleaned out.`,
      pools: [{ w: 3, team: u, lines: 'loseFan' }, { w: 1, lines: 'neutral' }], n: 6,
    });
  }
  // take over another franchise after a firing; the old club carries on as an AI team
  function takeJob(id) {
    if (!G.fired || !G.fired.offers.includes(id)) return false;
    const old = L.user(), nt = L.team(id), H = hot();
    old.user = false; nt.user = true; G.userTeamId = id;
    G.rivals = {}; initRivals();
    H.sec = 50; H.goals = null; H.firedOnce = true;
    H.jobs.push({ team: id, from: G.year + 1 });
    G.fired = null;
    Forum.news({
      tag: 'NEWS', heat: 80, teams: [id], mine: true,
      title: `${nt.name} ${nt.mascot} name a new general manager`,
      body: `Fresh off being let go by the ${old.name} ${old.mascot}, the new GM takes over a ${L.recStr(nt)} club. The owner wants results quickly.`,
      pools: [{ w: 2, team: nt, lines: 'winFan' }, { w: 1, lines: 'neutral' }],
    });
    L.save();
    return true;
  }
  // midseason: a struggling GM hears about it
  function ownerCheckIn(wk) {
    if (!hotOn() || wk !== 7 || !G.hot || !G.hot.goals) return;
    const u = L.user(), behind = G.hot.goals.some(g => { const s = goalStatus(g, false); return s.state === 'missed' || (g.k === 'wins' && u.rec.w < g.n * wk / SEA.REG - 1); });
    if (!behind && G.hot.sec >= 40) return;
    Forum.news({
      tag: 'HOT SEAT', heat: 82, teams: [u.id], mine: true,
      title: `Owner "disappointed" with the ${u.name} ${u.mascot} at the halfway mark`,
      body: `With the team at ${L.recStr(u)}, sources describe an owner growing impatient. Job security: ${secLabel(G.hot.sec)}.`,
      pools: [{ w: 3, team: u, lines: 'loseFan' }, { w: 1, lines: 'neutral' }],
    });
  }

  // ════════════ MILESTONE HOOKS (called from league.js) ════════════
  function onGame(g, gs, res) {
    res.hl = gamePlays(g, gs);
    if (g.h !== uid() && g.a !== uid()) return;
    rivalryAfterGame(g, res);
    const side = g.h === uid() ? 0 : 1, won = res.W.id === uid();
    if (gs.score[1 - side] === 0) unlock('shutout');
    if (!won) return;
    unlock('first_win');
    if (res.ws - res.ls >= 30) unlock('statement');
    if (res.ot) unlock('ot');
    const worst = Math.max(0, ...gs.log.map(e => (e.sc ? e.sc[1 - side] - e.sc[side] : 0)));
    if (worst >= 14) unlock('comeback');
  }
  function seasonEnd() {
    const u = L.user(), h = u.hist[u.hist.length - 1], prev = u.hist[u.hist.length - 2];
    if (h.divWin) unlock('div');
    if (h.l === 0 && h.w >= SEA.REG) unlock('perfect');
    if (h.champ) unlock('champ');
    // titles count for the GM, not the franchise: G.history records the user's own result each year
    const mine = G.history.map(x => x.user && x.user.champ);
    if (h.champ && mine.length >= 2 && mine[mine.length - 2]) unlock('repeat');
    if (mine.filter(Boolean).length >= 3) unlock('dynasty');
    if (h.champ && G.difficulty === 'rebuild') unlock('underdog');
    if (h.divWin && prev && prev.dpos === 4) unlock('worst_first');
    const mvp = G.awards && G.awards.mvp;
    if (mvp && mvp.team === u.id) {
      unlock('mvp');
      const p = G.players[mvp.pid];
      if (p && p.draft && p.draft.by === u.id) unlock('homegrown');
    }
    const since = G.hot && G.hot.jobs.length ? G.hot.jobs[G.hot.jobs.length - 1].from : G.year - u.hist.length + 1;
    if (G.year - since + 1 >= 10) unlock('lifer');
    const tr = topRival();
    if (tr) {
      const reg = tr.games.filter(x => x.y === G.year && !x.po);
      if (reg.length >= 2 && reg.every(x => x.us > x.them)) unlock('rival_sweep');
    }
    staffSeasonEnd();
    judgeSeason();
  }
  function offseason() {
    for (const r of Object.values(G.rivals || {})) r.heat = Math.round(r.heat * 0.78);
    const staffNews = staffOffseason();
    G.scoutPts = (G.scoutPts || 0) + scoutBonus(L.user());
    if (G.draftHist && G.draftHist[G.year - 2] && !(G.draftReviews || []).some(r => r.year === G.year - 2)) reviewDraft(G.year - 2);
    if (L.roster(L.user()).some(p => p.draft && p.draft.by === uid() && p.draft.round >= 3 && p.ovr >= 80)) unlock('steal');
    G.staffNews = staffNews.map(m => ({ name: pn(m.c), role: m.c.role, why: m.why, dest: m.dest || '' }));
  }
  function onTrade(rec) {
    if (rec.a !== uid() && rec.b !== uid()) return;
    G.userTrades = (G.userTrades || 0) + 1;
    if (G.userTrades >= 10) unlock('trader');
  }
  function onSign(p, t) { if (t.user && p.ovr >= 80) unlock('splash'); }
  // new careers and saves from before these systems
  function ensure() {
    if (!G) return;
    G.ach = G.ach || {};
    initStaff();
    initRivals();
    if (G.phase !== 'season' && G.phase !== 'recap' && !G.coachPool) openMarket();
  }

  return {
    achList, setOnUnlock: fn => { onUnlock = fn; },
    ROLES, TRAITS, stars, coachBonus, devMult, vetMult, injMult, quickHeal, marketOpen, interested, hire, fire, staffSeasonStart,
    rivalLevel, rivalList, rivalGame, rivalryHype,
    rollArc, applyArc, hintFor, rememberDraft,
    setGoals, goalStatus, secLabel, takeJob,
    onGame, weekWrap, seasonEnd, offseason, onTrade, onSign, ensure,
  };
})();
