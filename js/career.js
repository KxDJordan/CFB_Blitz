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
    if (h.champ && prev && prev.champ) unlock('repeat');
    if (u.hist.filter(x => x.champ).length >= 3) unlock('dynasty');
    if (h.champ && G.difficulty === 'rebuild') unlock('underdog');
    if (h.divWin && prev && prev.dpos === 4) unlock('worst_first');
    const mvp = G.awards && G.awards.mvp;
    if (mvp && mvp.team === u.id) {
      unlock('mvp');
      const p = G.players[mvp.pid];
      if (p && p.draft && p.draft.by === u.id) unlock('homegrown');
    }
    if (u.hist.length >= 10) unlock('lifer');
    const tr = topRival();
    if (tr) {
      const reg = tr.games.filter(x => x.y === G.year && !x.po);
      if (reg.length >= 2 && reg.every(x => x.us > x.them)) unlock('rival_sweep');
    }
    staffSeasonEnd();
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
    onGame, weekWrap, seasonEnd, offseason, onTrade, onSign, ensure,
  };
})();
