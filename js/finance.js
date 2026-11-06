'use strict';
// ── FINANCE: fans, attendance, sponsorships, the stadium and each franchise's salary cap ──
// Every team runs a business. Home crowds (seats × demand × ticket price), merchandise (fans and stars),
// sponsor deals and the league's equal TV share add up to a season's revenue, and next year's salary cap
// follows it: a packed, popular, well-sponsored franchise can carry a bigger payroll than an empty one.
// AI front offices play by the same rules (ticket prices, upgrades and sponsor picks are automatic).
// Everything lives in the save on t.fin; t.cap is the team's cap for the current league year.

const Fin = (() => {
  const SEA = DATA.SEASON;
  const CAP_BASE = DATA.CAP, CAP_MIN = CAP_BASE - 40, CAP_MAX = CAP_BASE + 40;
  // a league-average franchise brings in about REV_BASE a year; each $1M above or below moves the cap target CAP_K
  const REV_BASE = 250, CAP_K = 0.55, CAP_KEEP = 0.35; // CAP_KEEP: how much of this year's cap carries into next year's
  const TV = 120, TV_PO = 3;
  const SEATS_MIN = 50000, SEATS_MAX = 85000, SEATS_STEP = 4000, SEATS_COST = 35;
  const AMEN_MAX = 5, amenCost = lvl => 15 * (lvl + 1);
  const opsCost = t => +(45 + t.fin.seats / 1000 * 0.35 + t.fin.amen * 4).toFixed(1);

  const PRICES = [
    { id: 'value', label: 'Value', price: 80, demand: 0.12, fans: 0.35, desc: 'Cheap seats fill the stands and win fans over.' },
    { id: 'std', label: 'Standard', price: 110, demand: 0, fans: 0, desc: 'Market price.' },
    { id: 'premium', label: 'Premium', price: 145, demand: -0.15, fans: -0.45, desc: 'More per seat, fewer bodies, grumbling fans.' },
    { id: 'luxury', label: 'Luxury', price: 190, demand: -0.32, fans: -0.9, desc: 'Top dollar. Only a packed, winning stadium can take it.' },
  ];
  const priceOf = t => PRICES.find(p => p.id === t.fin.price) || PRICES[1];
  const perHead = t => priceOf(t).price + 25 + t.fin.amen * 4; // ticket + concessions/parking ($)

  // ── sponsorship slots and the (fictional) brands that bid on them ──
  const SLOTS = [
    { id: 'naming', label: 'Stadium naming rights', short: 'Naming', base: 20, yrs: [5, 8] },
    { id: 'patch', label: 'Jersey patch', short: 'Patch', base: 13, yrs: [3, 5] },
    { id: 'partner', label: 'Official partner', short: 'Partner', base: 7, yrs: [1, 3] },
  ];
  const BRANDS = {
    naming: ['Ironclad Insurance', 'Summit Bank', 'Vantage Telecom', 'Northstar Energy', 'Crescent Credit Union', 'Apex Motors', 'Harborline Logistics', 'Bluepeak Health', 'Keystone Financial', 'Meridian Air'],
    patch: ['Torrent Energy', 'Fleetway Freight', 'Quikbyte Delivery', 'Ridgeback Trucks', 'Lumen Wireless', 'Corvex Software', 'Pinnacle Rentals', 'Stratus Cloud', 'Brightwave Solar', 'Halcyon Hotels'],
    partner: ['Sizzle Wings', 'Golden Hops Lager', 'PeakFuel Sports Drink', 'Coastline Auto Group', 'Cobalt Wireless', 'Big Rig BBQ', 'Ace Hardware Co.', 'Riverbend Casino', 'Fresh Fields Market', 'Gridiron Pizza'],
  };
  const VENUE = ['Stadium', 'Field', 'Park', 'Dome', 'Arena'];
  // performance bonuses a sponsor can attach, with how hard they are (scales the payout)
  const GOALS = {
    wins8: { label: 'Win 8+ games', diff: 0.8, met: (t, h) => h.w >= 8 },
    playoffs: { label: 'Make the playoffs', diff: 1, met: (t, h) => h.po >= 1 },
    sellouts: { label: 'Sell out 5+ home games', diff: 0.9, met: t => t.fin.yr.sellouts >= 5 },
    wins10: { label: 'Win 10+ games', diff: 1.3, met: (t, h) => h.w >= 10 },
    divWin: { label: 'Win the division', diff: 1.5, met: (t, h) => !!h.divWin },
    cc: { label: 'Reach the Blitz Bowl', diff: 2.2, met: (t, h) => !!h.cc },
    champ: { label: 'Win the Blitz Bowl', diff: 3.2, met: (t, h) => !!h.champ },
  };
  // "if they make the playoffs" / "if they reach the Blitz Bowl"
  const goalPhrase = k => { const l = GOALS[k].label; return l[0].toLowerCase() + l.slice(1); };
  const EASY = ['wins8', 'sellouts', 'playoffs'], MID = ['playoffs', 'wins10', 'divWin', 'sellouts'], HARD = ['divWin', 'cc', 'champ'];
  const VARIANTS = [
    { id: 'safe', label: 'Guaranteed', g: 1.12, b: 0.15, pool: EASY },
    { id: 'balanced', label: 'Balanced', g: 1, b: 0.45, pool: MID },
    { id: 'incentive', label: 'Incentive-heavy', g: 0.72, b: 1.0, pool: HARD },
  ];

  const fans = t => t.fin.fans;
  // how much sponsors want you: fan base first, then prestige
  const appeal = t => 0.45 + t.fin.fans / 100 * 0.75 + (t.prestige - 1) / 4 * 0.3;
  const capOf = t => (t && t.cap) || CAP_BASE;
  const blankYear = () => ({ year: G.year, gate: 0, games: [], sellouts: 0, po: 0 });

  function init(t) {
    if (t.fin) return;
    const p = t.prestige;
    t.fin = {
      fans: Math.round(U.clamp(25 + p * 10 + U.gauss(0, 5), 15, 85)),
      price: 'std', seats: U.clamp(Math.round((54 + p * 3 + U.gauss(0, 3)) / 2) * 2000, 56000, 74000),
      amen: U.clamp(Math.round(p / 2 - 0.5 + U.rand(-0.5, 0.5)), 0, 2), funds: Math.round(20 + p * 5),
      spons: { naming: null, patch: null, partner: null }, offers: null, yr: blankYear(), hist: [], venue: U.pick(VENUE),
    };
    if (!t.cap) t.cap = CAP_BASE;
  }

  // ── sponsor offers ──
  function makeOffer(t, slot, v, taken) {
    const s = SLOTS.find(x => x.id === slot);
    const brand = U.pick(BRANDS[slot].filter(b => !taken.has(b))) || U.pick(BRANDS[slot]);
    taken.add(brand);
    const ap = appeal(t) * U.rand(0.9, 1.1);
    const k = v.pool.filter(g => g !== 'champ' || t.prestige >= 3.5 || v.id !== 'incentive');
    const goal = U.pick(k.length ? k : v.pool);
    const sal = +(s.base * ap * v.g).toFixed(1);
    return { id: `${slot}-${v.id}`, slot, brand, variant: v.id, sal, yrs: U.ri(s.yrs[0], s.yrs[1]), bonus: { k: goal, amt: +(s.base * ap * v.b * GOALS[goal].diff).toFixed(1) }, countered: false };
  }
  function genOffers(t) {
    const taken = new Set(Object.values(t.fin.spons).filter(Boolean).map(d => d.brand));
    const out = {};
    for (const s of SLOTS) if (!t.fin.spons[s.id]) out[s.id] = VARIANTS.map(v => makeOffer(t, s.id, v, taken));
    return out;
  }
  // what an offer is "worth" to a front office that guesses its odds of the bonus
  const goalOdds = (t, k) => U.clamp({ wins8: 0.55, sellouts: t.fin.fans / 100, playoffs: 0.4, wins10: 0.3, divWin: 0.25, cc: 0.12, champ: 0.06 }[k] + (t.prestige - 3) * 0.06, 0.03, 0.9);
  const offerEV = (t, o) => o.sal + o.bonus.amt * goalOdds(t, o.bonus.k);
  function sign(t, o) {
    t.fin.spons[o.slot] = { slot: o.slot, brand: o.brand, variant: o.variant, sal: o.sal, yrs: o.yrs, left: o.yrs, bonus: o.bonus, signed: G.year };
    if (t.fin.offers) delete t.fin.offers[o.slot];
    if (t.user) {
      Forum.news({
        tag: 'BUSINESS', heat: o.slot === 'naming' ? 75 : 55, teams: [t.id], mine: true,
        title: o.slot === 'naming' ? `${t.name} home is now ${o.brand} ${t.fin.venue}` : `${o.brand} signs on as ${t.name} ${SLOTS.find(s => s.id === o.slot).label.toLowerCase()} sponsor`,
        body: `The ${t.name} ${t.mascot} have agreed a ${o.yrs}-year deal worth $${o.sal}M a year${o.bonus.amt ? `, with a $${o.bonus.amt}M bonus in any season they ${goalPhrase(o.bonus.k)}` : ''}. That money goes straight into the revenue that sets next year's salary cap.`,
        pools: [{ w: 2, team: t, lines: 'winFan' }, { w: 1, lines: 'neutral' }], n: 4,
      });
    }
  }
  function aiSponsors(t) {
    const offers = genOffers(t);
    for (const slot in offers) sign(t, offers[slot].slice().sort((a, b) => offerEV(t, b) - offerEV(t, a))[0]);
  }

  // ── user actions ──
  const offseasonOpen = () => G && G.phase !== 'season' && G.phase !== 'recap';
  function accept(slot, id) {
    const t = L.user(), o = t.fin.offers && (t.fin.offers[slot] || []).find(x => x.id === id);
    if (!o) return { ok: false, why: 'That offer is gone.' };
    if (t.fin.spons[slot]) return { ok: false, why: 'That slot is already under contract.' };
    sign(t, o); L.save();
    return { ok: true, o };
  }
  // the odds a sponsor takes a counter for 15% more guaranteed money: popular franchises have leverage
  const counterOdds = t => +U.clamp(0.3 + (appeal(t) - 1) * 0.6, 0.15, 0.8).toFixed(2);
  function counter(slot, id) {
    const t = L.user(), list = t.fin.offers && t.fin.offers[slot], o = list && list.find(x => x.id === id);
    if (!o || o.countered) return { ok: false, why: 'You already countered that offer.' };
    if (U.chance(counterOdds(t))) {
      o.sal = +(o.sal * 1.15).toFixed(1); o.countered = true; L.save();
      return { ok: true, o };
    }
    t.fin.offers[slot] = list.filter(x => x !== o);
    L.save();
    return { ok: false, walked: true, why: `${o.brand} walked away from the table.` };
  }
  function setPrice(id) { const t = L.user(); if (PRICES.some(p => p.id === id)) { t.fin.price = id; L.save(); } }
  function upgrades(t = L.user()) {
    const f = t.fin;
    return [
      { id: 'seats', label: `Expand seating (+${(SEATS_STEP / 1000).toFixed(0)}k seats)`, desc: `${f.seats.toLocaleString()} → ${Math.min(SEATS_MAX, f.seats + SEATS_STEP).toLocaleString()} seats. More tickets to sell; harder to sell out.`, cost: SEATS_COST, maxed: f.seats >= SEATS_MAX },
      { id: 'amen', label: `Fan amenities (level ${f.amen + 1})`, desc: 'Better food, screens and comfort: more people want to come, they spend more, and fans grow faster.', cost: amenCost(f.amen), maxed: f.amen >= AMEN_MAX },
    ];
  }
  function buy(id, t = L.user()) {
    const up = upgrades(t).find(u => u.id === id);
    if (!up || up.maxed) return { ok: false, why: 'Nothing left to build there.' };
    if (t.user && !offseasonOpen()) return { ok: false, why: 'Construction happens in the offseason.' };
    if (t.fin.funds < up.cost) return { ok: false, why: `You need $${up.cost}M in franchise funds (you have $${t.fin.funds.toFixed(1)}M).` };
    t.fin.funds = +(t.fin.funds - up.cost).toFixed(1);
    if (id === 'seats') t.fin.seats = Math.min(SEATS_MAX, t.fin.seats + SEATS_STEP); else t.fin.amen++;
    if (t.user) L.save();
    return { ok: true };
  }

  // ── game day ──
  const WX_HIT = { storm: 0.08, snow: 0.05, rain: 0.04, heat: 0.02 };
  // the crowd for a game (decided once, so the live stands and the box score agree)
  function attendance(g) {
    if (g.att) return g.att;
    const H = L.team(g.h), A = L.team(g.a);
    if (g.neutral) {
      const seats = 72000;
      return (g.att = { n: seats, seats, full: true, rate: 1 });
    }
    const f = H.fin, rec = H.rec, gp = rec.w + rec.l, wx = L.weather(g);
    let d = 0.55 + f.fans / 100 * 0.5 + f.amen * 0.035 + priceOf(H).demand - (WX_HIT[wx.type] || 0) + U.gauss(0, 0.025);
    if (gp) d += (rec.w / gp - 0.5) * 0.25;
    if (g.wk > SEA.REG) d += 0.25;
    if (Career.rivalGame(g)) d += 0.08;
    if (A.fin.fans >= 70) d += 0.04;
    const rate = U.clamp(d, 0.25, 1), n = Math.round(f.seats * rate / 10) * 10;
    return (g.att = { n, seats: f.seats, full: d >= 1, rate: +rate.toFixed(3) });
  }
  const crowdFill = g => (g ? attendance(g).rate : 0.9);
  // gains come slowly near the top and losses slowly near the bottom, so fan bases settle instead of pinning at 0 or 100
  function bumpFans(t, d) {
    const f = t.fin.fans, k = d > 0 ? U.clamp((105 - f) / 55, 0.15, 1.2) : U.clamp((f + 5) / 55, 0.3, 1.2);
    t.fin.fans = +U.clamp(f + d * k, 5, 100).toFixed(1);
  }
  function onGame(g, res) {
    const H = L.team(g.h), A = L.team(g.a), att = attendance(g);
    if (g.neutral) {
      // the Blitz Bowl: a sold-out neutral site, gate split down the middle
      for (const t of [H, A]) { const gate = att.n * 160 / 2 / 1e6; t.fin.yr.gate += gate; t.fin.yr.po++; t.fin.yr.games.push({ wk: g.wk, opp: t === H ? A.id : H.id, n: att.n, seats: att.seats, full: true, gate: +gate.toFixed(2), home: false }); }
    } else {
      const gate = att.n * perHead(H) / 1e6;
      H.fin.yr.gate += gate;
      if (att.full) H.fin.yr.sellouts++;
      H.fin.yr.games.push({ wk: g.wk, opp: A.id, n: att.n, seats: att.seats, full: att.full, gate: +gate.toFixed(2), home: true });
      if (g.wk > SEA.REG) { H.fin.yr.po++; A.fin.yr.po++; }
      // game day itself: price and amenities nudge the home crowd's loyalty
      bumpFans(H, priceOf(H).fans + H.fin.amen * 0.06 + (att.full ? 0.1 : 0));
    }
    const W = res.W, Lo = res.Lo, po = g.wk > SEA.REG, margin = res.ws - res.ls;
    bumpFans(W, 1.2 + (po ? 2 : 0) + (Career.rivalGame(g) ? 0.8 : 0) + (res.rankBefore[Lo.id] ? 0.6 : 0));
    bumpFans(Lo, -1.3 - (margin >= 21 ? 0.5 : 0) - (po ? 0.5 : 0));
  }
  // a season's revenue so far, and the full-season estimate (remaining home games at the season's average gate)
  function homeLeft(t) {
    let n = 0;
    for (let wk = G.week; wk <= SEA.REG; wk++) for (const g of G.schedule[wk] || []) if (!g.done && g.h === t.id) n++;
    return n;
  }
  function merch(t) {
    const stars = L.roster(t).filter(p => p.ovr >= 85).length;
    return +(t.fin.fans * 0.45 + Math.min(10, stars * 2)).toFixed(1);
  }
  const sponsorPay = t => +Object.values(t.fin.spons).filter(Boolean).reduce((s, d) => s + d.sal, 0).toFixed(1);
  function ledger(t, final) {
    const y = t.fin.yr, homes = y.games.filter(x => x.home);
    let gate = y.gate;
    if (!final && G.phase === 'season') { const avg = homes.length ? y.gate / homes.length : t.fin.seats * 0.8 * perHead(t) / 1e6; gate += avg * homeLeft(t); }
    const tv = TV + y.po * TV_PO, m = merch(t), sp = sponsorPay(t), bonus = final ? y.bonus || 0 : 0;
    const rev = gate + tv + m + sp + bonus, ops = opsCost(t), pay = L.payroll(t);
    const att = homes.length ? Math.round(homes.reduce((s, x) => s + x.n, 0) / homes.length) : 0;
    return { gate: +gate.toFixed(1), tv, merch: m, spons: sp, bonus: +bonus.toFixed(1), rev: +rev.toFixed(1), ops, payroll: pay, profit: +(rev - pay - ops).toFixed(1), att, sellouts: y.sellouts, homes: homes.length };
  }
  const capTarget = rev => U.clamp(CAP_BASE + (rev - REV_BASE) * CAP_K, CAP_MIN, CAP_MAX);
  const nextCapFor = (t, rev) => +U.clamp(capOf(t) * CAP_KEEP + capTarget(rev) * (1 - CAP_KEEP), CAP_MIN, CAP_MAX).toFixed(1);
  const projectedCap = t => (t.fin.nextCap != null && G.phase === 'recap' ? t.fin.nextCap : nextCapFor(t, ledger(t).rev));

  // ── season milestones (called by the league) ──
  function seasonStart() {
    for (const t of G.teams) {
      // anything the user left unsigned goes to the best guaranteed offer still on the table
      if (t.user && t.fin.offers) for (const slot in t.fin.offers) { const best = t.fin.offers[slot].slice().sort((a, b) => b.sal - a.sal)[0]; if (best && !t.fin.spons[slot]) sign(t, best); }
      t.fin.offers = null;
      if (!t.user) aiPrice(t);
      t.fin.yr = blankYear();
    }
  }
  function aiPrice(t) {
    const last = t.fin.hist[t.fin.hist.length - 1];
    t.fin.price = t.fin.fans < 38 ? 'value' : t.fin.fans >= 80 && last && last.sellouts >= 5 ? 'luxury' : t.fin.fans >= 66 ? 'premium' : 'std';
  }
  // after the Blitz Bowl: bonuses, merch, the books for the year, and next year's cap
  function seasonEnd() {
    for (const t of G.teams) {
      const h = t.hist[t.hist.length - 1], y = t.fin.yr;
      y.bonus = 0; y.earned = [];
      for (const d of Object.values(t.fin.spons)) if (d && d.bonus && d.bonus.amt && GOALS[d.bonus.k].met(t, h)) { y.bonus += d.bonus.amt; y.earned.push({ brand: d.brand, amt: d.bonus.amt, label: GOALS[d.bonus.k].label }); }
      bumpFans(t, h.champ ? 6 : h.cc ? 3 : h.po >= 1 ? 1.5 : -2.5);
      const lg = ledger(t, true);
      t.fin.funds = +(t.fin.funds + lg.profit).toFixed(1);
      t.fin.nextCap = nextCapFor(t, lg.rev);
      t.fin.hist.push({ year: G.year, ...lg, fans: Math.round(t.fin.fans), cap: capOf(t), nextCap: t.fin.nextCap, earned: y.earned });
      if (t.fin.hist.length > 30) t.fin.hist.shift();
    }
  }
  // the new league year: caps take effect, deals tick down, fans drift back toward the franchise's stature
  function newYear() {
    for (const t of G.teams) {
      if (t.fin.nextCap != null) t.cap = t.fin.nextCap;
      t.fin.nextCap = null;
      for (const s of SLOTS) { const d = t.fin.spons[s.id]; if (d && --d.left <= 0) t.fin.spons[s.id] = null; }
      bumpFans(t, (25 + t.prestige * 10 - t.fin.fans) * 0.2);
      if (t.user) t.fin.offers = genOffers(t);
      else {
        aiSponsors(t);
        // AI owners build when the money is there
        for (const id of t.fin.amen < 3 ? ['amen', 'seats'] : ['seats', 'amen']) { const up = upgrades(t).find(u => u.id === id); if (!up.maxed && t.fin.funds >= up.cost + 25) { buy(id, t); break; } }
      }
    }
  }
  function capReport() {
    const s = G.teams.slice().sort((a, b) => capOf(b) - capOf(a)), u = L.user(), top = s[0], bot = s[s.length - 1];
    Forum.news({
      tag: 'NEWS', heat: 65, teams: [u.id, top.id], mine: true,
      title: `League sets ${G.year} salary caps: ${top.name} lead at $${capOf(top)}M`,
      body: `Caps follow each franchise's revenue: gate, sponsors, merchandise and TV.\n\n• Highest: ${top.name} $${capOf(top)}M\n• Lowest: ${bot.name} $${capOf(bot)}M\n• ${u.name}: $${capOf(u)}M (#${s.indexOf(u) + 1} of ${s.length})`,
      pools: [{ w: 1, team: top, lines: 'winFan' }, { w: 1, team: bot, lines: 'loseFan' }, { w: 1, lines: 'neutral' }], n: 4,
    });
  }

  // new careers and saves from before finances: every franchise gets a business; the user gets offers if it's
  // the offseason, otherwise the previous front office's deals are already in place
  function ensure() {
    if (!G || !G.teams) return;
    const fresh = G.teams.some(t => !t.fin);
    for (const t of G.teams) init(t);
    if (!fresh) return;
    for (const t of G.teams) {
      if (t.user && offseasonOpen()) { if (!t.fin.offers && Object.values(t.fin.spons).some(x => !x)) t.fin.offers = genOffers(t); }
      else if (Object.values(t.fin.spons).every(x => !x)) aiSponsors(t);
    }
  }
  const pendingOffers = () => { const t = G && L.user(); return t && t.fin && t.fin.offers ? Object.values(t.fin.offers).filter(l => l.length).length : 0; };
  const stadiumName = t => (t.fin.spons.naming ? `${t.fin.spons.naming.brand} ${t.fin.venue}` : `${t.name} ${t.fin.venue}`);
  const fanLabel = f => (f >= 85 ? 'Fanatical' : f >= 70 ? 'Loyal' : f >= 50 ? 'Steady' : f >= 30 ? 'Fickle' : 'Apathetic');

  return {
    PRICES, SLOTS, GOALS, goalPhrase, CAP_MIN, CAP_MAX, capOf, priceOf, perHead, appeal, counterOdds, offseasonOpen,
    init, ensure, attendance, crowdFill, onGame, ledger, projectedCap, seasonStart, seasonEnd, newYear, capReport,
    accept, counter, setPrice, upgrades, buy, pendingOffers, stadiumName, fanLabel, fans, opsCost,
  };
})();
