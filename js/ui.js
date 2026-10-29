'use strict';
// ── UI: screens, components, live game, interactions ──────────────

const UI = (() => {
  const S = {
    screen: 'menu', tab: 'home', rosterPos: 'ALL', seasonTab: 'schedule', scoresWeek: null,
    forumIssue: null, forumThread: null, forumSort: 'hot', forumBack: null,
    create: null, draft: { pos: 'ALL', view: 'board', fast: false },
    camp: { side: null, group: null, intensity: 'standard', result: null },
    game: null, final: null, lastKey: '', trade: null, tradeBack: null,
  };
  const esc = U.esc;
  const $app = () => document.getElementById('app');

  // ── icons ──
  const sv = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
  const I = {
    home: sv('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    roster: sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.7.2 4.8 2.3 5.4 5.8"/>'),
    cal: sv('<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 14h3v3h-3z"/>'),
    forum: sv('<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>'),
    shield: sv('<path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="m9 12 2 2 4-4"/>'),
    back: sv('<path d="M15 18l-6-6 6-6"/>'),
    chev: sv('<path d="M9 18l6-6-6-6"/>', 'style="width:18px;height:18px;opacity:.6"'),
    gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    play: sv('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
    ff: sv('<path d="M3 5v14l8-7zM12 5v14l8-7z" fill="currentColor" stroke="none"/>'),
    pause: sv('<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none"/>'),
    lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    up: sv('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    down: sv('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
    msg: sv('<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.6A8.5 8.5 0 1 1 21 12z"/>'),
    eye: sv('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    vote: sv('<path d="M12 4 4 14h5v6h6v-6h5z"/>'),
    share: sv('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>'),
    trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    dumbbell: sv('<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>'),
    dice: sv('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/>'),
    x: sv('<path d="M18 6 6 18M6 6l12 12"/>'),
    refresh: sv('<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>'),
    sword: sv('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>'),
    wall: sv('<path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/>'),
    menu: sv('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    flame: sv('<path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2-6 1 1.5 1.5 2.5 2 3 .5-2.5 0-4.5 1-7z"/>'),
  };
  const WXI = {
    clear: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    night: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    cloudy: '<path d="M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.2 4.4 4.4 0 0 0 7 18z"/>',
    rain: '<path d="M7 14.5h10.5a3.6 3.6 0 0 0 .5-7.15A5.4 5.4 0 0 0 7.6 6.6 4 4 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    storm: '<path d="M7 13.5h10.5a3.6 3.6 0 0 0 .5-7.15A5.4 5.4 0 0 0 7.6 5.6 4 4 0 0 0 7 13.5z"/><path d="M12.5 13.5l-2 4h3l-2 4"/>',
    snow: '<path d="M7 13.5h10.5a3.6 3.6 0 0 0 .5-7.15A5.4 5.4 0 0 0 7.6 5.6 4 4 0 0 0 7 13.5z"/><path d="M8 17.5h.01M12 19h.01M16 17.5h.01M10 21h.01M14 21.5h.01" stroke-width="2.6"/>',
    fog: '<path d="M4 9h16M3 13h18M5 17h14M8 21h8"/>',
    wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
    heat: '<path d="M10 14.8V4.5a2 2 0 1 1 4 0v10.3a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  };
  const wxIcon = (wx, size = 18) => { const k = wx.time === 'night' && wx.type === 'clear' ? 'night' : wx.type; return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="wx-ico wx-${wx.type}">${WXI[k]}</svg>`; };
  // arrow showing where the wind blows, relative to the offense driving up the screen
  const windArrow = (wx, poss) => { const th = wx.dir + (poss === 1 ? Math.PI : 0); const deg = 90 - th * 180 / Math.PI; return `<svg viewBox="0 0 24 24" width="12" height="12" style="transform:rotate(${deg}deg)" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M6 10l6-6 6 6"/></svg>`; };
  const TROPHY = `<svg class="trophy-svg" viewBox="0 0 64 64"><path fill="currentColor" d="M18 6h28v12c0 9-6 16-14 16s-14-7-14-16z"/><path fill="none" stroke="currentColor" stroke-width="4" d="M18 10H9v5c0 6 4 10 10 10M46 10h9v5c0 6-4 10-10 10"/><path fill="currentColor" d="M28 33h8v10h-8zM20 46h24l2 8H18z"/><path fill="#fff" opacity=".35" d="M24 9h5v13c0 4 1 7 3 9-5-1-8-5-8-11z"/></svg>`;

  // ── small components ──
  const logo = (t, size = 40, cls = '') => `<span class="logo ${cls}" style="width:${size}px;height:${size}px">${Logo.svg(t.logo, size)}</span>`;
  const teamVars = t => `--team-1:${t.logo.primary};--team-2:${t.logo.secondary}`;
  // pro football: no poll numbers next to names (power rankings live in their own tab); playoff seeds show instead
  const rk = id => { const sd = G && G.seeds && G.week > DATA.SEASON.REG ? L.seedOf(id) : 0; return sd ? `<span class="rk">${sd}</span>` : ''; };
  const ovr = o => `<span class="ovr ${U.ovrClass(o)}">${o}</span>`;
  const stars = n => `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, 5 - n))}</span></span>`;
  const gradeTag = p => `<span class="tag grade-tag g${p.stars}">${DATA.GRADE_SHORT[p.stars] || 'D3'}</span>`;
  const ageExp = p => `Age ${p.age} · ${DATA.expLabel(p)}`;
  const SEA = DATA.SEASON;
  const posCls = pos => (pos === 'K' ? 'pos-st' : DATA.OFFENSE.includes(pos) ? 'pos-off' : 'pos-def');
  const posBadge = pos => `<span class="pos-badge ${posCls(pos)}">${pos}</span>`;
  // player face from the portrait sprite (12 x 10 grid), ringed in team colours, jersey number tag
  const FACE_COLS = 12, FACE_ROWS = 10;
  const jersey = (p, size = 40) => {
    const t = p.teamId != null ? L.team(p.teamId) : null;
    const f = p.face ?? p.id % 120, c = f % FACE_COLS, r = Math.floor(f / FACE_COLS);
    const ring = t ? t.logo.primary : '#64748b', ring2 = t ? t.logo.secondary : '#cbd5e1';
    const num = p.num != null && size >= 34 ? `<b class="face-num" style="background:${ring};color:${U.onColor(ring)};border-color:${ring2}">${p.num}</b>` : '';
    return `<span class="face" style="--fs:${size}px;--ring:${ring};--ring2:${ring2};background-position:${(c / (FACE_COLS - 1) * 100).toFixed(3)}% ${(r / (FACE_ROWS - 1) * 100).toFixed(3)}%">${num}</span>`;
  };
  // ratings gained since the season kicked off
  const seasonGain = p => (p.ovr0 != null ? p.ovr - p.ovr0 : 0);
  const gainTag = p => { const g = seasonGain(p); return g > 0 ? `<span class="tag t-good gain-tag">▲${g}</span>` : ''; };
  const pname = p => `${esc(p.first)} ${esc(p.last)}`;
  const tname = t => esc(t.name);
  const tfull = t => esc(`${t.name} ${t.mascot}`);
  const planLabel = (k, id) => DATA.PLANS[k].find(p => p.id === id).short;

  // ── helmet stickers ──
  const stkChip = (s, big) => { const d = DATA.STICKERS[s.id], t = DATA.STICKER_TIERS[s.tier]; return `<span class="stk stk-${t.id}${big ? ' big' : ''}" title="${d.name} — ${t.label}">${d.glyph}</span>`; };
  const stkRow = p => (p.stk && p.stk.length ? `<span class="stk-row">${p.stk.slice().sort((a, b) => b.tier - a.tier).map(s => stkChip(s)).join('')}</span>` : '');
  function stkList(p, empty) {
    if (!p.stk || !p.stk.length) return `<div class="small muted mb12">${empty || 'No badges yet — big seasons and hard camps earn them.'}</div>`;
    return '<div class="stk-list">' + p.stk.slice().sort((a, b) => b.tier - a.tier).map(s => {
      const d = DATA.STICKERS[s.id], t = DATA.STICKER_TIERS[s.tier];
      const ladder = DATA.STICKER_TIERS.map((x, i) => `<i class="${i <= s.tier ? 'on ' + x.id : ''}${i === s.tier ? ' cur' : ''}">${d.kind === 'proc' ? Math.round(x.proc * 100) + '%' : x.mult + '×'}</i>`).join('');
      return `<div class="stk-item">${stkChip(s, true)}<div class="grow"><div class="stk-name">${d.name} <span class="stk-tier stk-t-${t.id}">${t.label}</span><span class="stk-kind">${d.kind === 'proc' ? 'Trigger' : 'Boost'}</span></div><div class="small muted">${d.desc}</div><div class="stk-ladder">${ladder}</div></div></div>`;
    }).join('') + '</div>';
  }
  function ring(val, label, color) {
    const r = 36, c = 2 * Math.PI * r, pct = U.clamp((val - 40) / 59, 0.02, 1);
    return `<div class="ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="7"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg><div class="rv"><div><b>${val}</b><span>${label}</span></div></div></div>`;
  }
  const unitRow = (label, v) => `<div class="unit-row"><span class="muted">${label}</span><div class="bar"><i style="width:${U.clamp((v - 35) / 64 * 100, 3, 100)}%"></i></div><b class="${U.ovrClass(v)}">${Math.round(v)}</b></div>`;

  // ── theme ──
  function accentFor(t, theme) {
    const p = t.logo.primary, s = t.logo.secondary;
    if (theme === 'day') {
      if (U.lum(p) < 0.55) return p;
      if (U.lum(s) < 0.55) return s;
      return U.mix(p, '#000000', 0.45);
    }
    if (U.lum(p) >= 0.06) return p;
    if (U.lum(s) >= 0.06 && U.lum(s) < 0.85) return s;
    return U.mix(p, '#ffffff', 0.5);
  }
  function cdist(a, b) { const A = U.hexToRgb(a), B = U.hexToRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
  // Two readable, distinguishable colors for a matchup (user team keeps its accent).
  function duo(t1, t2) {
    const theme = document.body.dataset.theme || 'night';
    let c1 = accentFor(t1, theme), c2 = accentFor(t2, theme);
    if (cdist(c1, c2) < 110) {
      const fixIdx = t1.user ? 1 : 0, t = fixIdx ? t2 : t1, other = fixIdx ? c1 : c2;
      const alt = [t.logo.secondary, t.logo.primary].find(c => cdist(c, other) >= 110 && U.lum(c) > 0.03 && U.lum(c) < 0.9);
      const pickC = alt || '#64748b';
      if (fixIdx) c2 = pickC; else c1 = pickC;
    }
    return [c1, c2];
  }
  function applyTheme() {
    const theme = (G && G.settings.theme) || localStorage.getItem('cfbblitz.theme') || 'night';
    document.body.dataset.theme = theme;
    const root = document.documentElement.style;
    let a = '#f97316', a2 = '#fbbf24';
    if (G && G.teams && G.teams.length && S.screen !== 'menu' && S.screen !== 'create') {
      const u = L.user(); a = accentFor(u, theme); a2 = u.logo.secondary;
    } else if (S.screen === 'create' && S.create) {
      a = accentFor({ logo: S.create.logo }, theme); a2 = S.create.logo.secondary;
    }
    root.setProperty('--accent', a); root.setProperty('--accent-2', a2); root.setProperty('--on-accent', U.onColor(a));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'day' ? '#eef2f7' : theme === 'turf' ? '#06140d' : '#090e19';
  }

  // ── toast & sheets ──
  function toast(msg, ms = 2400) {
    const root = document.getElementById('toast-root');
    root.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = msg;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
  }
  function sheet(html, opts = {}) {
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="sheet-bg ${opts.center ? 'center' : ''}" data-sheetbg="${opts.locked ? 'locked' : ''}"><div class="sheet" role="dialog" aria-modal="true">${opts.center ? '' : '<div class="grabber"></div>'}${html}</div></div>`;
    lockBehindSheet(true);
  }
  function closeSheet() { document.getElementById('sheet-root').innerHTML = ''; lockBehindSheet(false); }
  // while a sheet is up, the screen underneath must not receive taps or swipes
  function lockBehindSheet(on) {
    document.body.classList.toggle('sheet-open', on);
    const app = document.getElementById('app');
    if (app) app.inert = on;
  }
  function confirmSheet(title, body, okLabel, okAct, danger) {
    sheet(`<div class="h-lg mb8">${title}</div><p class="muted" style="margin:0 0 16px">${body}</p><div class="btn-row"><button class="btn" data-a="closeSheet">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="${okAct}">${okLabel}</button></div>`, { center: true });
  }

  // ── render ──
  function render() {
    const app = $app();
    const key = `${S.screen}:${S.tab}:${S.forumThread || ''}:${S.forumIssue || ''}`;
    const sc = app.querySelector('.scroll, .bb-scroll');
    const keep = sc && S.lastKey === key ? sc.scrollTop : 0;
    const same = S.lastKey === key;
    applyTheme();
    app.innerHTML = (SCREENS[S.screen] || SCREENS.menu)();
    if (same && app.firstElementChild) app.firstElementChild.style.animation = 'none';
    const sc2 = app.querySelector('.scroll, .bb-scroll');
    if (sc2) sc2.scrollTop = keep;
    S.lastKey = key;
    if (S.screen === 'draft') scheduleDraft();
    if (S.screen === 'game') gameMount();
  }
  function screenForPhase() {
    return { draft: 'draft', camp: 'camp', season: 'hub', recap: 'recap', graduation: 'graduation' }[G.phase] || 'hub';
  }
  function phaseLabel() {
    if (!G) return '';
    return {
      draft: `${G.year} Draft`, camp: `${G.year} Training Camp`,
      season: `${G.year} · ${DATA.WEEK_LABEL(G.week)}`, recap: `${G.year} Season Recap`, graduation: `${G.year} Offseason`,
    }[G.phase] || '';
  }

  const SCREENS = {};

  // ════════════════ MENU ════════════════
  SCREENS.menu = () => {
    let cont = '';
    if (G && G.teams && G.teams.length) {
      const u = L.user();
      cont = `<button class="continue-card" data-a="continue">${logo(u, 50)}<div class="grow"><div class="kicker" style="color:#94a3b8">Continue career</div><div style="font:700 19px/1.1 var(--f-display);text-transform:uppercase;margin-top:4px">${tfull(u)}</div><div class="small" style="color:#cbd5e1;margin-top:2px">${phaseLabel()} · ${L.recStr(u)}</div></div>${I.chev}</button>`;
    }
    return `<div class="screen menu">
      <div class="menu-bg"><div class="lights"></div><div class="turf"></div><div class="fade"></div><div class="glow"></div><img class="ball-hero" src="icon-ball.svg" alt=""></div>
      <div class="menu-content">
        <div class="brand"><div class="brand-kicker">Pro Football GM</div><h1 class="wordmark">PRO<span>BLITZ</span></h1><div class="brand-tag">Draft. Trade. Build a dynasty.</div></div>
        ${cont}
        <button class="btn btn-primary btn-lg btn-block" data-a="newCareer">${I.play} New Career</button>
        <button class="btn btn-ghost btn-block" data-a="settings">${I.gear} Settings</button>
      </div>
      <div class="menu-foot">Saves automatically on this device</div>
    </div>`;
  };

  // ════════════════ CREATE ════════════════
  function suggestAbbr(name) {
    const words = name.trim().toUpperCase().replace(/[^A-Z ]/g, '').split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    let a = words.length === 1 ? words[0].slice(0, 3) : words.map(w => w[0]).join('').slice(0, 3);
    if (a.length < 3 && words.length > 1) a = (a + words[words.length - 1].slice(1)).slice(0, 3);
    return a;
  }
  function initCreate() {
    const pal = DATA.COLORS;
    S.create = {
      step: 0, name: '', mascot: '', abbr: '', abbrEdited: false,
      logo: { shape: 'shield', icon: 'bolt', primary: pal[0].hex, secondary: pal[15].hex, letter: 'B' },
      div: 0, difficulty: 'contender', aiTeams: U.shuffle(DATA.FRANCHISES.slice()).slice(0, 15), theme: (G && G.settings.theme) || localStorage.getItem('cfbblitz.theme') || 'night',
    };
  }
  function createPreview() {
    const c = S.create;
    const nm = c.name.trim() || 'Your City', ms = c.mascot.trim() || 'Nickname';
    return `<div class="pv-logo">${Logo.svg({ ...c.logo, letter: (c.name.trim()[0] || 'B').toUpperCase() }, c.step === 1 ? 120 : 96)}</div>
      <div><div class="h-lg">${esc(nm)}</div><div class="muted" style="font:600 15px/1.2 var(--f-display);text-transform:uppercase;letter-spacing:.08em;margin-top:2px">${esc(ms)} · ${esc(c.abbr || suggestAbbr(nm) || 'ABC')}</div></div>`;
  }
  function brandEditor(lg) {
    const letter = lg.letter || 'B';
    return `<div class="section-title" style="margin-top:6px"><h3>Shape</h3><button class="link" data-a="logoRandom">Randomize</button></div>
      <div class="pick-grid">${Object.entries(Logo.SHAPES).map(([k]) => `<button class="pick-tile ${lg.shape === k ? 'on' : ''}" data-a="logoSet" data-v="shape:${k}">${Logo.svg({ ...lg, shape: k, letter }, 56)}</button>`).join('')}</div>
      <div class="section-title"><h3>Emblem</h3></div>
      <div class="pick-grid">${Object.entries(Logo.ICONS).map(([k]) => `<button class="pick-tile ${lg.icon === k ? 'on' : ''}" data-a="logoSet" data-v="icon:${k}">${Logo.svg({ ...lg, icon: k, letter }, 56)}</button>`).join('')}</div>
      <div class="section-title"><h3>Primary color</h3></div>
      <div class="swatches">${DATA.COLORS.map(c => `<button class="swatch ${lg.primary === c.hex ? 'on' : ''}" style="background:${c.hex}" title="${c.name}" data-a="logoSet" data-v="primary:${c.hex}"></button>`).join('')}</div>
      <div class="section-title"><h3>Secondary color</h3></div>
      <div class="swatches">${DATA.COLORS.map(c => `<button class="swatch ${lg.secondary === c.hex ? 'on' : ''}" style="background:${c.hex}" title="${c.name}" data-a="logoSet" data-v="secondary:${c.hex}"></button>`).join('')}</div>`;
  }
  SCREENS.create = () => {
    const c = S.create, step = c.step;
    let body = '';
    if (step === 0) {
      const ideas = [['Riverside', 'Rebels'], ['Brooklyn', 'Bridgemen'], ['Las Vegas', 'Aces'], ['Toronto', 'Huskies'], ['Mexico City', 'Aztecs'], ['London', 'Monarchs']];
      body = `<div class="card">
        <label class="field-lbl">City</label>
        <input class="input" data-bind="name" maxlength="16" placeholder="e.g. Riverside" value="${esc(c.name)}" autocomplete="off">
        <div class="form-grid mt12">
          <div><label class="field-lbl">Nickname</label><input class="input" data-bind="mascot" maxlength="14" placeholder="e.g. Rebels" value="${esc(c.mascot)}" autocomplete="off"></div>
          <div><label class="field-lbl">Abbr.</label><input class="input" data-bind="abbr" maxlength="4" placeholder="${esc(suggestAbbr(c.name) || 'RIV')}" value="${esc(c.abbr)}" style="text-transform:uppercase" autocomplete="off"></div>
        </div>
      </div>
      <div class="section-title"><h3>Need inspiration?</h3></div>
      <div class="chips">${ideas.map(([n, m]) => `<button class="chip" data-a="idea" data-v="${n}|${m}">${n} ${m}</button>`).join('')}</div>`;
    } else if (step === 1) {
      body = `<div class="card">${brandEditor({ ...c.logo, letter: (c.name.trim()[0] || 'B').toUpperCase() })}</div>`;
    } else {
      // same slotting as L.newCareer: the user's division takes three AI teams, the others four each
      const slotOf = []; for (let d = 0; d < 4; d++) for (let i = 0; i < (d === c.div ? 3 : 4); i++) slotOf.push(d);
      const mates = c.aiTeams.filter((_, i) => slotOf[i] === c.div), confMates = c.aiTeams.filter((_, i) => slotOf[i] !== c.div && DATA.DIVS[slotOf[i]].conf === DATA.DIVS[c.div].conf);
      body = `<div class="section-title" style="margin-top:4px"><h3>Division</h3></div>
        <div class="plan-chips c4 mb12">${DATA.DIVS.map(d => `<button class="plan-chip ${c.div === d.id ? 'on' : ''}" data-a="cfgSet" data-v="div:${d.id}">${d.name}</button>`).join('')}</div>
        <div class="tiny muted mb12">16 teams · 14-game season · division winners + 2 wild cards per conference make the playoffs.</div>
        <div class="card" style="padding:12px 14px"><div class="kicker">Your division rivals</div><div class="logo-strip">${mates.map(s => `<span title="${esc(s.name + ' ' + s.mascot)}">${logo({ logo: { ...s.logo, letter: s.name[0] } }, 34)}</span>`).join('')}</div>
        <div class="kicker mt12">Rest of the ${DATA.CONFS[DATA.DIVS[c.div].conf].long}</div><div class="logo-strip">${confMates.map(s => `<span title="${esc(s.name + ' ' + s.mascot)}">${logo({ logo: { ...s.logo, letter: s.name[0] } }, 30)}</span>`).join('')}</div></div>
        <div class="section-title"><h3>Franchise status</h3></div>
        ${DATA.DIFFICULTY.map(d => `<button class="opt-card ${c.difficulty === d.id ? 'on' : ''}" data-a="cfgSet" data-v="difficulty:${d.id}"><span class="radio"></span><div class="grow"><div class="oc-t">${d.label} <span class="tag ${d.id === 'dynasty' ? 't-good' : d.id === 'rebuild' ? 't-bad' : 't-accent'}">${d.tag}</span></div><div class="oc-d">${d.desc}</div></div></button>`).join('')}
        <div class="section-title"><h3>Theme</h3></div>
        ${themePicker(c.theme)}`;
    }
    const titles = ['Name your franchise', 'Design your logo', 'Set the stage'];
    return `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-a="${step ? 'createBack' : 'toMenu'}">${I.back}</button><div class="tb-title"><div class="t1">${titles[step]}</div><div class="t2">Step ${step + 1} of 3</div></div></div>
      <div class="steps">${[0, 1, 2].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="scroll no-tabs">
        <div class="card preview-card" id="cpv">${createPreview()}</div>
        ${body}
      </div>
      <div class="bottom-cta">${step < 2 ? `<button class="btn btn-primary btn-lg" data-a="createNext">Continue ${I.chev}</button>` : `<button class="btn btn-primary btn-lg" data-a="createFinish">Enter the Inaugural Draft ${I.chev}</button>`}</div>
    </div>`;
  };
  function themePicker(cur) {
    const T = [['night', 'Night Game', ['#090e19', '#172238', '#f97316']], ['day', 'Day Game', ['#eef2f7', '#ffffff', '#1f4fbf']], ['turf', 'Turf', ['#06140d', '#11291d', '#22c55e']]];
    return `<div class="theme-opts">${T.map(([id, n, c]) => `<button class="theme-opt ${cur === id ? 'on' : ''}" data-a="theme" data-v="${id}"><div class="sw">${c.map(x => `<i style="background:${x}"></i>`).join('')}</div>${n}</button>`).join('')}</div>`;
  }

  // ════════════════ HUB ════════════════
  function hubTopbar() {
    const u = L.user(), r = L.ranked(u.id);
    const sd = G.seeds ? L.seedOf(u.id) : 0;
    return `<div class="topbar">${logo(u, 38)}<div class="tb-title"><div class="t1">${tfull(u)}</div><div class="t2">${L.recStr(u)} · ${L.divRecStr(u)} ${esc(L.divName(u))}${sd ? ` · ${DATA.CONFS[u.conf].short} #${sd} seed` : r ? ` · #${r} power` : ''}</div></div><span class="pill accent-pill">${DATA.WEEK_SHORT(G.week)}</span></div>`;
  }
  function tabbar() {
    const T = [['home', 'Home', I.home], ['roster', 'Roster', I.roster], ['season', 'Season', I.cal], ['forum', 'BlitzBoard', I.forum], ['program', 'Franchise', I.shield]];
    return `<nav class="tabbar">${T.map(([id, l, ic]) => `<button class="tab ${S.tab === id ? 'on' : ''}" data-a="tab" data-v="${id}">${ic}${l}${id === 'forum' && G.forumUnread && S.tab !== 'forum' ? `<span class="badge">${Math.min(G.forumUnread, 99)}</span>` : ''}</button>`).join('')}</nav>`;
  }
  SCREENS.hub = () => {
    if (S.tab === 'forum') return `<div class="screen bb">${forumView()}${tabbar()}</div>`;
    const body = { home: homeTab, roster: rosterTab, season: seasonTab, program: programTab }[S.tab]();
    return `<div class="screen">${hubTopbar()}<div class="scroll">${body}</div>${tabbar()}</div>`;
  };

  // ── home ──
  function heroCard(u) {
    const rt = L.ratings(u), r = L.ranked(u.id), st = u.rec.streak;
    const dpos = L.divStandings(u.div).indexOf(u) + 1;
    return `<div class="hero-card" style="${teamVars(u)}"><div class="hero-stripe"></div>
      <div class="hero-in">${logo(u, 76, 'hero-logo')}<div class="grow"><div class="kicker" style="color:rgba(255,255,255,.75)">${G.year} Season · ${esc(L.divName(u))}</div><div class="hero-name">${tfull(u)}</div><div class="hero-sub">${U.ord(dpos)} in the ${esc(L.divName(u))} · #${L.rank(u.id)} in power rankings</div></div></div>
      <div class="hero-stats"><div class="hero-stat"><b>${L.recStr(u)}</b><span>Record</span></div><div class="hero-stat"><b>${rt.ovr}</b><span>Overall</span></div><div class="hero-stat"><b>${rt.off}/${rt.def}</b><span>Off/Def</span></div><div class="hero-stat"><b>${st ? (st > 0 ? 'W' : 'L') + Math.abs(st) : '—'}</b><span>Streak</span></div></div>
    </div>`;
  }
  function planPicker(cur, act) {
    const book = cur.book || 'multiple';
    return `<div class="kicker mb8">Playbook</div><div class="plan-chips c3 mb12">${Object.entries(Playbook.BOOKS).map(([id, b]) => `<button class="plan-chip ${book === id ? 'on' : ''}" data-a="${act}" data-v="book:${id}">${b.name}</button>`).join('')}</div>
      <div class="kicker mb8">Offense</div><div class="plan-chips c3 mb12">${DATA.PLANS.off.map(p => `<button class="plan-chip ${cur.off === p.id ? 'on' : ''}" data-a="${act}" data-v="off:${p.id}">${p.label}</button>`).join('')}</div>
      <div class="kicker mb8">Defense</div><div class="plan-chips c4">${DATA.PLANS.def.map(p => `<button class="plan-chip ${cur.def === p.id ? 'on' : ''}" data-a="${act}" data-v="def:${p.id}">${p.short}</button>`).join('')}</div>
      <div class="tiny muted mt8">${Playbook.BOOKS[book].name}: ${Playbook.BOOKS[book].desc} ${DATA.PLANS.off.find(p => p.id === cur.off).desc} ${DATA.PLANS.def.find(p => p.id === cur.def).desc}</div>`;
  }
  function nextGameCard() {
    const u = L.user(), g = L.userGame(), wk = G.week;
    if (!g) {
      const inField = G.seeds && [0, 1].some(c => G.seeds[c].includes(u.id));
      const why = wk > SEA.REG ? (inField ? 'Your playoff run is over.' : 'You missed the playoffs.') : 'Bye week.';
      const games = G.schedule[wk] || [];
      return `<div class="card"><div class="card-h"><span class="kicker">${DATA.WEEK_LABEL(wk)}</span><span class="tag">No game</span></div>
        <div class="h-md mb8">${why}</div><p class="muted small" style="margin:0 0 12px">Watch the rest of the league settle it.</p>
        ${games.map(x => `<div class="flex mb8">${logo(L.team(x.h), 26)}<span class="small grow">${rk(x.h)}${tname(L.team(x.h))} vs ${rk(x.a)}${tname(L.team(x.a))}</span>${logo(L.team(x.a), 26)}</div>`).join('')}
        <button class="btn btn-primary btn-block mt8" data-a="simWeek">${I.ff} Sim ${DATA.WEEK_LABEL(wk)}</button></div>`;
    }
    const home = g.h === u.id, opp = L.team(home ? g.a : g.h);
    const wp = Engine.preWinProb(L.team(g.h), L.team(g.a), g.neutral), my = Math.round((home ? wp : 1 - wp) * 100);
    const ur = L.ratings(u), or = L.ratings(opp), [, oc] = duo(u, opp);
    const vs = (a, b, l1, l2) => `<div class="vs-label">${l1} vs ${l2}</div><div class="vs-bar"><b class="${U.ovrClass(a)}">${a}</b><div class="vb"><i style="width:${a / (a + b) * 100}%;background:var(--accent)"></i><i style="width:${b / (a + b) * 100}%;background:${oc}"></i></div><b class="${U.ovrClass(b)}">${b}</b></div>`;
    return `<div class="card"><div class="card-h"><span class="kicker">${DATA.WEEK_LABEL(wk)}</span><span class="tag ${g.wk <= SEA.REG ? '' : 't-gold'}">${esc(L.gameLabel(g))}</span></div>
      <div class="matchup">
        <div class="mt">${logo(u, 64)}<div class="mt-name">${rk(u.id)}${tname(u)}</div><div class="mt-rec">${L.recStr(u)}</div></div>
        <div class="vs">${g.neutral ? 'N' : home ? 'VS' : '@'}</div>
        <div class="mt" data-a="team" data-v="${opp.id}">${logo(opp, 64)}<div class="mt-name">${rk(opp.id)}${tname(opp)}</div><div class="mt-rec">${L.recStr(opp)}</div></div>
      </div>
      ${(() => { const wx = L.weather(g), W = DATA.WEATHER[wx.type]; return `<div class="wx-row wx-${wx.type}">${wxIcon(wx, 26)}<div class="grow"><div class="wx-t">${W.label} · ${wx.temp}°F · Wind ${wx.wind} mph</div><div class="wx-d">${DATA.WEATHER_TIME[wx.time]} — ${W.desc}</div></div></div>`; })()}
      <div class="wp-bar"><div style="width:${my}%;background:var(--accent);color:var(--on-accent)">${my}%</div><div style="width:${100 - my}%;background:var(--surface-3);justify-content:flex-end">${100 - my}%</div></div>
      <div class="tiny muted center">Projected win chance</div>
      ${vs(ur.off, or.def, 'Your offense', 'their defense')}
      ${vs(ur.def, or.off, 'Your defense', 'their offense')}
      <div class="divider"></div>
      <div class="kicker mb8" style="color:var(--text)">Game plan</div>
      ${planPicker(G.plan, 'setPlan')}
      <div class="btn-row mt16"><button class="btn btn-primary btn-lg" data-a="playGame">${I.play} Play Game</button><button class="btn btn-lg fit" style="flex:0 0 auto" data-a="quickSim">${I.ff} Sim</button></div>
    </div>`;
  }
  function practiceCard() {
    const g = DATA.groupById(G.practice), side = DATA.sideOfGroup(G.practice), lp = G.lastPractice;
    const ga = L.groupAvg(L.user(), G.practice);
    return `<div class="card"><div class="card-h"><span class="kicker">${I.dumbbell.replace('<svg', '<svg style="width:15px;height:15px"')} Weekly practice focus</span><button class="link" data-a="practiceSheet">Change</button></div>
      <div class="flex"><div class="gc-ico" style="width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:var(--surface-3);font:700 13px/1 var(--f-display)">${g.id === 'WRTE' ? 'WR' : g.id === 'BACKS' ? 'LB' : g.id}</div>
      <div class="grow"><div style="font-weight:700">${g.label} <span class="tag ${side === 'offense' ? 'pos-off' : 'pos-def'}">${side}</span></div><div class="small muted">${g.sub} · avg ${ga.avg} OVR</div></div></div>
      ${lp ? `<div class="small muted mt12">Last week: ${DATA.groupById(lp.groupId).label} added <b class="good">+${lp.attrs ?? lp.gain}</b> attribute points${lp.improved != null ? ` · <b class="good">${lp.improved}</b> of ${lp.n} players moved up in OVR` : ''}.</div>${(lp.top || []).length ? `<div class="flex mt8" style="gap:10px;flex-wrap:wrap">${lp.top.map(x => { const q = L.player(x.pid); return q ? `<button class="chip-btn" data-a="player" data-v="${q.id}">${jersey(q, 26)}<span class="small">${esc(q.last)} <b class="good">+${x.d}</b></span></button>` : ''; }).join('')}</div>` : ''}` : ''}
    </div>`;
  }
  function forumTeaser() {
    const is = G.forum[0];
    if (!is) return '';
    const th = is.threads.filter(t => !t.pinned).slice(0, 3);
    return `<div class="section-title"><h3>Trending on BlitzBoard</h3><button class="link" data-a="tab" data-v="forum">Open</button></div>
      <div class="card flush"><div class="list">${th.map(t => `<button class="row tap" style="text-align:left;width:100%" data-a="openThread" data-v="${is.key}|${t.id}"><span class="bb-tag ${t.tag.split(' ')[0]}" style="flex-shrink:0">${esc(t.tag)}</span><div class="grow"><div class="r1" style="white-space:normal;font-size:13.5px;line-height:1.3">${esc(t.title)}</div><div class="r2">${t.count} replies · ${t.ago} ago</div></div></button>`).join('')}</div></div>`;
  }
  function leadersCard(t) {
    const cats = [['py', 'Passing', p => `${p.st.py} yds · ${p.st.ptd} TD`], ['ry', 'Rushing', p => `${p.st.ry} yds · ${p.st.rtd} TD`], ['rcy', 'Receiving', p => `${p.st.rcy} yds · ${p.st.rctd} TD`], ['tk', 'Tackles', p => `${p.st.tk} tkl · ${p.st.sk} sk`]];
    const rows = cats.map(([k, l, f]) => { const p = L.teamLeader(t, k); return p ? `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 36)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">${l} · ${f(p)}</div></div>${posBadge(p.pos)}</button>` : ''; }).join('');
    if (!rows) return '';
    return `<div class="section-title"><h3>Team leaders</h3></div><div class="card flush"><div class="list">${rows}</div></div>`;
  }
  function injuryCard(t) {
    const inj = L.roster(t).filter(p => p.inj > 0).sort((a, b) => b.ovr - a.ovr);
    if (!inj.length) return '';
    return `<div class="section-title"><h3>Injury report</h3></div><div class="card flush"><div class="list">${inj.map(p => `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 36)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">${p.pos} · ${p.ovr} OVR</div></div><span class="tag t-bad">Out ${p.inj}w</span></button>`).join('')}</div></div>`;
  }
  function homeTab() {
    const u = L.user();
    return heroCard(u) + nextGameCard() + tradeCard() + practiceCard() + forumTeaser() + leadersCard(u) + injuryCard(u);
  }

  // ── roster ──
  function rosterTab() {
    const u = L.user(), rt = L.ratings(u), uu = rt.u;
    const posList = S.rosterPos === 'ALL' ? DATA.POSITIONS : [S.rosterPos];
    const rows = posList.map(pos => {
      const ids = u.depth[pos] || [];
      const nS = DATA.STARTERS[pos];
      const healthy = L.depthHealthy(u, pos).slice(0, nS);
      const header = `<div class="flex between" style="padding:12px 14px 6px"><span class="kicker">${DATA.POS_NAME[pos]}s · ${ids.length}</span><span class="tiny ${u.manual[pos] ? 'accent' : 'dim'}">${u.manual[pos] ? 'Manual depth' : 'Auto depth'}</span></div>`;
      return `<div class="card flush">${header}<div class="list">${ids.map((id, i) => {
        const p = G.players[id], st = healthy.includes(p);
        return `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 40)}<div class="grow"><div class="r1">${pname(p)} ${st ? '<span class="tag t-accent">ST</span>' : ''}${p.inj > 0 ? `<span class="tag t-bad">Out ${p.inj}w</span>` : ''}${p.udfa && p.exp === 0 ? '<span class="tag">UDFA</span>' : ''}${gainTag(p)}${stkRow(p)}</div><div class="r2">${pos}${i + 1} · ${ageExp(p)} · POT ${U.potGrade(p.pot)}</div></div>${ovr(p.ovr)}</button>`;
      }).join('')}</div></div>`;
    }).join('');
    return `<div class="card"><div class="rings">${ring(rt.off, 'OFF', '#60a5fa')}${ring(rt.ovr, 'OVR', 'var(--accent)')}${ring(rt.def, 'DEF', '#f87171')}</div>
      <div class="divider"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:18px">${['qb', 'rb', 'wr', 'te', 'ol'].map((k, i) => unitRow(k.toUpperCase(), uu[k]) + unitRow(['dl', 'lb', 'cb', 's', 'k'][i].toUpperCase(), uu[['dl', 'lb', 'cb', 's', 'k'][i]])).join('')}</div>
      <div class="tiny muted mt8">${L.roster(u).length}/${L.rosterLimit()} players · tap a player to adjust the depth chart</div>
      <button class="btn btn-block mt12" data-a="openTrade">${I.refresh} Trade Center${L.tradeOpen() ? '' : ' · window closed'}</button></div>
      <div class="chips">${['ALL', ...DATA.POSITIONS].map(p => `<button class="chip ${S.rosterPos === p ? 'on' : ''}" data-a="rosterPos" data-v="${p}">${p}</button>`).join('')}</div>
      ${rows}`;
  }

  function playerSheet(pid) {
    const p = G.players[pid];
    if (!p) return;
    const t = p.teamId != null ? L.team(p.teamId) : null;
    const mine = t && t.user;
    const depth = t ? (t.depth[p.pos] || []) : [];
    const di = depth.indexOf(p.id);
    const status = p.inj > 0 ? `Out ${p.inj}w` : t && L.isStarter(t, p) ? 'Starter' : t ? 'Reserve' : 'Prospect';
    const canTrade = t && L.tradeOpen() && G.phase !== 'draft';
    const s = p.st, c = p.car;
    const statGrid = st => {
      const items = [];
      if (st.pa) items.push(['CMP', `${st.pc}/${st.pa}`], ['PASS YDS', st.py], ['PASS TD', st.ptd], ['INT', st.pint]);
      if (st.ra) items.push(['CAR', st.ra], ['RUSH YDS', st.ry], ['RUSH TD', st.rtd], ['YPC', (st.ry / st.ra).toFixed(1)]);
      if (st.rc) items.push(['REC', st.rc], ['REC YDS', st.rcy], ['REC TD', st.rctd], ['YPR', (st.rcy / st.rc).toFixed(1)]);
      if (st.tk || st.sk || st.int) items.push(['TKL', st.tk], ['SACKS', st.sk], ['INT', st.int], ['GP', st.gp]);
      if (st.fga) items.push(['FGM', st.fgm], ['FGA', st.fga], ['FG%', Math.round(st.fgm / st.fga * 100) + '%'], ['GP', st.gp]);
      if (!items.length && st.gp) items.push(['GP', st.gp], ['', ''], ['', ''], ['', '']);
      return items.length ? `<div class="kv">${items.slice(0, 8).map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>` : '<div class="small muted">No stats recorded yet.</div>';
    };
    const hasCar = c && Object.values(c).some(v => v > 0);
    sheet(`<div class="pc-head" style="${t ? teamVars(t) : '--team-1:#334155;--team-2:#64748b'}">${jersey(p, 64)}<div style="min-width:0"><div class="pc-name">${pname(p)}</div><div class="small" style="opacity:.85;margin-top:4px">${DATA.POS_NAME[p.pos]} · #${p.num} · Age ${p.age}</div><div class="tiny" style="opacity:.7;margin-top:2px">${esc(p.college)}${t ? ` · ${tfull(t)}` : ''}</div></div><div class="pc-ovr"><b>${p.ovr}</b><span>OVR</span></div></div>
      ${G.phase === 'season' || G.phase === 'post' ? `<div class="small mb8" style="margin-top:-2px">${seasonGain(p) > 0 ? `<b class="good">+${seasonGain(p)} OVR</b> this season` : '<span class="muted">No OVR change yet this season</span>'}<span class="muted"> · started at ${p.ovr0 ?? p.ovr}</span></div>` : ''}
      <div class="kv mb12"><div><b>${U.potGrade(p.pot)}</b><span>Potential</span></div><div><b style="font-size:14px;line-height:18px">${DATA.expLabel(p)}</b><span>Experience</span></div><div><b>${L.tradeValue(p).toFixed(1)}</b><span>Trade value</span></div><div><b style="font-size:14px;line-height:18px">${status}</b><span>Status</span></div></div>
      <div class="card" style="padding:12px 14px">${DATA.ATTRS.map(a => { const lbl = DATA.attrLabel(p.pos, a); const v = p.attrs[a]; return `<div class="attr"><span class="muted">${DATA.ATTR_LONG[a === 'skl' ? lbl : a]}</span><div class="bar"><i style="width:${v}%"></i></div><b class="${U.ovrClass(v)}">${v}</b></div>`; }).join('')}</div>
      <div class="kicker mb8">Badges</div>${stkList(p)}
      <div class="kicker mb8">${G.year} season</div>${statGrid(s)}
      ${hasCar ? `<div class="kicker mb8 mt16">Career (prior seasons)</div>${statGrid(c)}` : ''}
      ${p.draft ? `<div class="small muted mt12">Drafted ${p.draft.year} · Round ${p.draft.round}, pick #${p.draft.pick}${p.draft.via != null && L.team(p.draft.via) ? ` (via ${esc(L.team(p.draft.via).abbr)})` : ''} · ${esc(p.college)}</div>` : p.udfa ? `<div class="small muted mt12">Undrafted free agent out of ${esc(p.college)}</div>` : ''}
      ${canTrade && !mine ? `<button class="btn btn-primary btn-block mt12" data-a="tradeFor" data-v="${p.id}">${I.refresh} Trade for ${pname(p)}</button>` : ''}
      ${mine ? `<div class="divider"></div><div class="flex between mb8"><div><div style="font-weight:700">Depth chart: ${p.pos}${di + 1}</div><div class="tiny muted">${DATA.STARTERS[p.pos]} starter${DATA.STARTERS[p.pos] > 1 ? 's' : ''} at ${p.pos} · ${t.manual[p.pos] ? 'manual order' : 'auto by OVR'}</div></div>${t.manual[p.pos] ? `<button class="btn btn-sm" data-a="autoDepth" data-v="${p.pos}|${p.id}">Reset to auto</button>` : ''}</div>
        <div class="btn-row"><button class="btn" data-a="depth" data-v="${p.id}|-1" ${di <= 0 ? 'disabled' : ''}>${I.up} Move up</button><button class="btn" data-a="depth" data-v="${p.id}|1" ${di >= depth.length - 1 ? 'disabled' : ''}>${I.down} Move down</button></div>
        <div class="btn-row mt8">${canTrade ? `<button class="btn" data-a="tradeAway" data-v="${p.id}">${I.refresh} Shop in a trade</button>` : ''}${G.phase !== 'draft' ? `<button class="btn btn-danger" data-a="askRelease" data-v="${p.id}">Release</button>` : ''}</div>` : ''}`);
  }

  function teamSheet(id) {
    const t = L.team(id), rt = L.ratings(t);
    const top = L.roster(t).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
    const games = [];
    for (let w = 1; w <= SEA.FINAL; w++) { const g = (G.schedule[w] || []).find(x => x.h === id || x.a === id); if (g) games.push(g); }
    sheet(`<div class="hero-card" style="${teamVars(t)};margin-bottom:12px"><div class="hero-stripe"></div><div class="hero-in">${logo(t, 64, 'hero-logo')}<div class="grow"><div class="kicker" style="color:rgba(255,255,255,.75)">${esc(L.divName(t))} · ${DATA.CONFS[t.conf].long}</div><div class="hero-name" style="font-size:22px">${tfull(t)}</div><div class="hero-sub">${L.recStr(t)} · #${L.rank(id)} in power rankings</div></div></div>
      <div class="hero-stats"><div class="hero-stat"><b>${rt.ovr}</b><span>OVR</span></div><div class="hero-stat"><b>${rt.off}</b><span>OFF</span></div><div class="hero-stat"><b>${rt.def}</b><span>DEF</span></div><div class="hero-stat"><b>${t.hist.filter(h => h.champ).length}</b><span>Titles</span></div></div></div>
      <div class="kicker mb8">Top players</div><div class="card flush"><div class="list">${top.map(p => `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 36)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">${p.pos} · Age ${p.age} · ${L.seasonLine(p)}</div></div>${ovr(p.ovr)}</button>`).join('')}</div></div>
      ${!t.user && L.tradeOpen() && G.phase !== 'draft' ? `<button class="btn btn-primary btn-block mb12" data-a="tradeWith" data-v="${t.id}">${I.refresh} Propose a trade</button>` : ''}
      ${games.length ? `<div class="kicker mb8">Schedule</div><div class="card flush"><div class="list">${games.map(g => schedRow(g, id)).join('')}</div></div>` : ''}`);
  }

  // ── season ──
  function schedRow(g, tid) {
    const home = g.h === tid, opp = L.team(home ? g.a : g.h);
    let res = '';
    if (g.done) {
      const my = home ? g.hs : g.as, th = home ? g.as : g.hs, w = my > th;
      res = `<span style="font:700 15px/1 var(--f-display)" class="${w ? 'good' : 'bad'}">${w ? 'W' : 'L'} ${my}-${th}${g.ot ? ' OT' : ''}</span>`;
    } else {
      const wp = Engine.preWinProb(L.team(g.h), L.team(g.a), g.neutral);
      res = `<span class="tiny muted">${Math.round((home ? wp : 1 - wp) * 100)}% win</span>`;
    }
    return `<button class="row tap ${g.wk === G.week && G.phase === 'season' ? 'me' : ''}" style="width:100%;text-align:left" data-a="${g.done ? 'box' : 'team'}" data-v="${g.done ? g.id : opp.id}"><span class="tiny dim" style="width:46px;flex-shrink:0;font-weight:700">${DATA.WEEK_SHORT(g.wk)}</span>${logo(opp, 32)}<div class="grow"><div class="r1"><span class="muted small">${g.neutral ? 'vs' : home ? 'vs' : '@'}</span> ${rk(opp.id)}${tname(opp)}</div><div class="r2">${esc(L.gameLabel(g))} · ${L.recStr(opp)}</div></div>${res}</button>`;
  }
  function seasonTab() {
    const tabs = [['schedule', 'Schedule'], ['scores', 'Scores'], ['standings', 'Standings'], ['poll', 'Power'], ['leaders', 'Leaders']];
    let body = '';
    const u = L.user();
    if (S.seasonTab === 'schedule') {
      const rows = [];
      for (let w = 1; w <= SEA.FINAL; w++) {
        const g = (G.schedule[w] || []).find(x => x.h === u.id || x.a === u.id);
        if (g) rows.push(schedRow(g, u.id));
        else if (w > SEA.REG) rows.push(`<div class="row"><span class="tiny dim" style="width:46px;flex-shrink:0;font-weight:700">${DATA.WEEK_SHORT(w)}</span><div class="grow"><div class="r1 muted">${DATA.WEEK_LABEL(w)}</div><div class="r2">${w < G.week || (G.schedule[w] || []).length ? 'Did not qualify' : 'To be determined'}</div></div></div>`);
      }
      body = `<div class="card flush"><div class="list">${rows.join('')}</div></div>`;
    } else if (S.seasonTab === 'scores') {
      const played = [];
      for (let w = 1; w <= SEA.FINAL; w++) if ((G.schedule[w] || []).some(g => g.done)) played.push(w);
      if (!played.length) body = `<div class="empty">${I.cal}No games played yet this season.</div>`;
      else {
        const wk = S.scoresWeek && played.includes(S.scoresWeek) ? S.scoresWeek : played[played.length - 1];
        body = `<div class="chips">${played.map(w => `<button class="chip ${w === wk ? 'on' : ''}" data-a="scoresWeek" data-v="${w}">${DATA.WEEK_SHORT(w)}</button>`).join('')}</div>
          <div class="card flush"><div class="list">${G.schedule[wk].filter(g => g.done).map(g => {
            const H = L.team(g.h), A = L.team(g.a), hw = g.hs > g.as;
            return `<button class="row tap ${g.h === u.id || g.a === u.id ? 'me' : ''}" style="width:100%;text-align:left;display:block" data-a="box" data-v="${g.id}">
              <div class="flex" style="${hw ? '' : 'opacity:.6'}">${logo(H, 24)}<span class="grow small" style="font-weight:${hw ? 700 : 500}">${tname(H)}</span><b class="num" style="font-family:var(--f-display);font-size:17px">${g.hs}</b></div>
              <div class="flex" style="margin-top:6px;${!hw ? '' : 'opacity:.6'}">${logo(A, 24)}<span class="grow small" style="font-weight:${!hw ? 700 : 500}">${tname(A)}</span><b class="num" style="font-family:var(--f-display);font-size:17px">${g.as}</b></div>
              <div class="tiny dim" style="margin-top:6px">Final${g.ot ? ' / OT' : ''} · ${esc(L.gameLabel(g))}</div></button>`;
          }).join('')}</div></div>`;
      }
    } else if (S.seasonTab === 'standings') {
      // division tables, with the current (or final) playoff seeds marked
      const seeds = { 0: G.seeds ? G.seeds[0] : L.confSeeds(0), 1: G.seeds ? G.seeds[1] : L.confSeeds(1) };
      const seedTag = t => { const i = seeds[t.conf].indexOf(t.id); return i < 0 ? '' : `<span class="tag ${i < 2 ? 't-accent' : ''}" title="${i < 2 ? 'Division leader' : 'Wild card'}">${i < 2 ? 'DIV' : 'WC'} ${i + 1}</span>`; };
      body = DATA.CONFS.map(c => `<div class="section-title"><h3>${c.long}</h3><span class="tiny muted">${G.seeds ? 'Playoff seeds' : 'If the season ended today'}</span></div>` + DATA.DIVS.filter(d => d.conf === c.id).map(d => `<div class="card flush"><div class="kicker" style="padding:10px 14px 0">${esc(d.name)}</div><table class="tbl tbl-stand"><thead><tr><th>Team</th><th>W-L</th><th>Div</th><th>Diff</th></tr></thead><tbody>${L.divStandings(d.id).map(t => { const df = t.rec.pf - t.rec.pa; return `<tr class="${t.user ? 'me' : ''}" data-a="team" data-v="${t.id}"><td><div class="flex">${logo(t, 22)}<span class="st-name">${esc(t.abbr)} <span class="muted">${esc(t.mascot)}</span></span>${seedTag(t)}</div></td><td><b>${L.recStr(t)}</b></td><td>${L.divRecStr(t)}</td><td class="${df > 0 ? 'good' : df < 0 ? 'bad' : ''}">${df > 0 ? '+' : ''}${df}</td></tr>`; }).join('')}</tbody></table></div>`).join('')).join('') + '<div class="tiny muted center">Division winners are seeds 1-2, the next two best records are wild cards. Wild Card Round: 1 vs 4, 2 vs 3.</div>';
    } else if (S.seasonTab === 'poll') {
      const prev = {};
      G.prevPoll.forEach((id, i) => { prev[id] = i + 1; });
      body = `<div class="card flush"><div class="list">${G.poll.map((id, i) => {
        const t = L.team(id), p = prev[id];
        const mv = !p || !G.prevPoll.length ? '<span class="tiny dim">—</span>' : p > i + 1 ? `<span class="tiny good">▲${p - i - 1}</span>` : p < i + 1 ? `<span class="tiny bad">▼${i + 1 - p}</span>` : '<span class="tiny dim">—</span>';
        return `<button class="row tap ${t.user ? 'me' : ''} ${i === 9 ? '' : ''}" style="width:100%;text-align:left;${i === 10 ? 'border-top:2px dashed var(--line-strong)' : ''}" data-a="team" data-v="${id}"><span style="width:26px;font:700 18px/1 var(--f-display);color:${i < 4 ? 'var(--gold)' : i < 10 ? 'var(--text)' : 'var(--dim)'}">${i + 1}</span>${logo(t, 34)}<div class="grow"><div class="r1">${tfull(t)}</div><div class="r2">${L.recStr(t)} · ${esc(L.divName(t))}</div></div><span style="width:32px;text-align:right">${mv}</span>${ovr(L.ratings(t).ovr)}</button>`;
      }).join('')}</div></div><div class="tiny muted center">BlitzBoard's weekly power rankings. Playoff spots come from the standings.</div>`;
    } else {
      const cats = [['py', 'Passing yards'], ['ptd', 'Passing TD'], ['ry', 'Rushing yards'], ['rtd', 'Rushing TD'], ['rcy', 'Receiving yards'], ['sk', 'Sacks'], ['int', 'Interceptions'], ['tk', 'Tackles']];
      body = cats.map(([k, l]) => {
        const ls = L.leaders(k, 5);
        if (!ls.length) return '';
        return `<div class="section-title"><h3>${l}</h3></div><div class="card flush"><div class="list">${ls.map((p, i) => `<button class="row tap ${L.isUser(p.teamId) ? 'me' : ''}" style="width:100%;text-align:left" data-a="player" data-v="${p.id}"><span style="width:18px;font:700 15px/1 var(--f-display)" class="dim">${i + 1}</span>${logo(L.team(p.teamId), 28)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">${p.pos} · ${tname(L.team(p.teamId))}</div></div><b style="font:700 18px/1 var(--f-display)">${p.st[k].toLocaleString()}</b></button>`).join('')}</div></div>`;
      }).join('') || `<div class="empty">${I.trophy}Leaders appear after week 1.</div>`;
    }
    return `<div class="chips">${tabs.map(([id, l]) => `<button class="chip ${S.seasonTab === id ? 'on' : ''}" data-a="seasonTab" data-v="${id}">${l}</button>`).join('')}</div>${body}`;
  }

  // ── box score ──
  function boxHTML(g) {
    const H = L.team(g.h), A = L.team(g.a), b = g.box;
    if (!b) return '';
    const nq = b.qs[0][4] || b.qs[1][4] ? 5 : 4;
    const line = `<div class="card flush"><table class="tbl linescore"><thead><tr><th>Team</th>${[1, 2, 3, 4].map(q => `<th>${q}</th>`).join('')}${nq === 5 ? '<th>OT</th>' : ''}<th>T</th></tr></thead><tbody>${[[H, 0, g.hs], [A, 1, g.as]].map(([t, s, tot]) => `<tr><td><div class="flex">${logo(t, 20)}${esc(t.abbr)}</div></td>${b.qs[s].slice(0, nq).map(v => `<td>${v}</td>`).join('')}<td><b>${tot}</b></td></tr>`).join('')}</tbody></table></div>`;
    const ts = b.ts, [cH, cA] = duo(H, A);
    const cmp = (label, a, c, fmt = v => v) => { const tot = (a + c) || 1; return `<div class="cmp-row"><b>${fmt(a)}</b><span class="cl">${label}</span><b>${fmt(c)}</b><div class="cb"><i style="width:${a / tot * 100}%;background:${cH}"></i><i style="width:${c / tot * 100}%;background:${cA}"></i></div></div>`; };
    const stats = `<div class="card"><div class="flex between mb8"><div class="flex">${logo(H, 22)}<b>${esc(H.abbr)}</b></div><span class="kicker">Team stats</span><div class="flex"><b>${esc(A.abbr)}</b>${logo(A, 22)}</div></div>
      ${cmp('Total yards', ts[0].yds, ts[1].yds)}${cmp('Passing', ts[0].py, ts[1].py)}${cmp('Rushing', ts[0].ry, ts[1].ry)}${cmp('First downs', ts[0].fd, ts[1].fd)}${cmp('Turnovers', ts[0].to, ts[1].to)}${cmp('Sacks', ts[0].sk, ts[1].sk)}${cmp('Possession', ts[0].top, ts[1].top, v => U.clock(v))}</div>`;
    const tops = `<div class="kicker mb8">Top performers</div><div class="card flush"><div class="list">${b.top.map(x => { const p = G.players[x.pid]; if (!p) return ''; return `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 34)}<div class="grow"><div class="r1">${pname(p)} <span class="tiny muted">${esc(L.team(p.teamId).abbr)}</span></div><div class="r2">${x.line}</div></div>${posBadge(p.pos)}</button>`; }).join('')}</div></div>`;
    return line + stats + tops;
  }
  function boxSheet(gid) {
    let g = null;
    for (const wk of G.schedule) if (wk) { g = wk.find(x => x.id === gid); if (g) break; }
    if (!g) return;
    const H = L.team(g.h), A = L.team(g.a);
    sheet(`<div class="kicker center">${DATA.WEEK_LABEL(g.wk)} · ${esc(L.gameLabel(g))}</div>
      <div class="final-score"><div class="fs-t">${logo(H, 52)}${tname(H)}</div><div class="flex" style="gap:14px"><span class="fs-s ${g.hs < g.as ? 'lose' : ''}">${g.hs}</span><span class="dim">–</span><span class="fs-s ${g.as < g.hs ? 'lose' : ''}">${g.as}</span></div><div class="fs-t">${logo(A, 52)}${tname(A)}</div></div>
      <div class="center tiny muted mb12">FINAL${g.ot ? ' / OT' : ''}${g.wx ? ` · ${DATA.WEATHER[g.wx.type].label}, ${g.wx.temp}°F, wind ${g.wx.wind} mph` : ''}</div>${boxHTML(g)}`);
  }

  // ── program ──
  function programTab() {
    const u = L.user();
    const titles = u.hist.filter(h => h.champ).length, ccs = u.hist.filter(h => h.cc).length;
    const mvps = G.history.filter(h => h.mvp && h.mvp.team === u.id).length;
    const RES = ['—', 'Lost Wild Card', 'Lost Conf. Title', 'Lost Blitz Bowl', 'Champions'];
    const best = u.hist.slice().sort((a, b) => (b.w - b.l) - (a.w - a.l))[0];
    return `<div class="hero-card" style="${teamVars(u)}"><div class="hero-stripe"></div><div class="hero-in">${logo(u, 84, 'hero-logo')}<div class="grow"><div class="kicker" style="color:rgba(255,255,255,.75)">Est. ${G.history.length ? G.history[0].year : G.year} · ${esc(u.abbr)}</div><div class="hero-name">${tfull(u)}</div><div class="hero-sub">Season ${G.season} · ${esc(L.divName(u))}</div></div></div>
      <div class="hero-stats"><div class="hero-stat"><b>${titles}</b><span>Titles</span></div><div class="hero-stat"><b>${ccs}</b><span>Conf</span></div><div class="hero-stat"><b>${mvps}</b><span>MVPs</span></div><div class="hero-stat"><b>${best ? `${best.w}-${best.l}` : '—'}</b><span>Best</span></div></div></div>
      <button class="btn btn-block mb12" data-a="brandSheet">${I.shield} Edit logo & colors</button>
      <div class="section-title"><h3>Franchise history</h3></div>
      ${u.hist.length ? `<div class="card flush"><table class="tbl"><thead><tr><th>Season</th><th>Record</th><th>Div</th><th>Seed</th><th>Result</th></tr></thead><tbody>${u.hist.slice().reverse().map(h => `<tr><td><b>${h.year}</b></td><td>${h.w}-${h.l}</td><td>${h.dw ?? '-'}-${h.dl ?? '-'}${h.divWin ? ' <span class="tag t-accent">DIV</span>' : ''}</td><td>${h.seed ? '#' + h.seed : '—'}</td><td>${h.champ ? '<span class="tag t-gold">Champions</span>' : h.po ? `<span class="tag">${RES[h.po]}</span>` : '<span class="dim">Missed</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card"><div class="small muted">Your first season is underway. History is written in January.</div></div>'}
      ${G.history.length ? `<div class="section-title"><h3>League champions</h3></div><div class="card flush"><div class="list">${G.history.slice().reverse().map(h => { const c = L.team(h.champ); return `<div class="row">${logo(c, 30)}<div class="grow"><div class="r1">${h.year} · ${tfull(c)}</div><div class="r2">MVP: ${h.mvp ? `${esc(h.mvp.name)} (${esc(h.mvp.teamName)})` : '—'}</div></div></div>`; }).join('')}</div></div>` : ''}
      <div class="section-title"><h3>Settings</h3></div>
      <div class="card">${themePicker(G.settings.theme)}
        <div class="divider"></div>
        <div class="flex between"><div><div style="font-weight:700">Call every play</div><div class="small muted">Pick the offensive & defensive call each snap in live games</div></div><button class="toggle ${G.settings.callPlays !== false ? 'on' : ''}" data-a="toggleCalls" aria-label="Toggle play calling"></button></div>
        <div class="divider"></div>
        <div class="flex between"><div><div style="font-weight:700">4th-down decisions</div><div class="small muted">When coordinators call plays, still ask me on 4th down</div></div><button class="toggle ${G.settings.askFourth ? 'on' : ''}" data-a="toggleFourth" aria-label="Toggle 4th down prompts"></button></div>
        <div class="divider"></div>
        <div class="flex between"><div><div style="font-weight:700">Default game speed</div><div class="small muted">Live game playback</div></div><div class="speed" style="background:var(--surface-2);border-color:var(--line)">${[1, 2, 4].map(s => `<button class="${G.settings.speed === s ? 'on' : ''}" style="${G.settings.speed === s ? 'background:var(--surface-3);color:var(--text)' : ''}" data-a="defSpeed" data-v="${s}">${s}x</button>`).join('')}</div></div>
      </div>
      <div class="btn-row"><button class="btn" data-a="toMenu">Main menu</button><button class="btn btn-danger" data-a="askWipe">New career</button></div>`;
  }

  // ════════════════ FORUM (BlitzBoard) ════════════════
  function avatar(a, lg) {
    if (a.f != null && L.team(a.f)) return `<span class="bb-av ${lg ? 'lg' : ''}" style="background:transparent">${Logo.svg(L.team(a.f).logo, lg ? 36 : 22)}</span>`;
    let h = 0;
    for (const ch of a.n) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const bg = a.role === 'mod' ? '#16a34a' : a.role === 'insider' ? '#2563eb' : `hsl(${h} 55% 45%)`;
    return `<span class="bb-av ${lg ? 'lg' : ''}" style="background:${bg}">${esc(a.n.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase())}</span>`;
  }
  const role = a => (a.role ? `<span class="bb-role ${a.role}">${a.role === 'mod' ? 'MOD' : 'INSIDER'}</span>` : '');
  const kfmt = n => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));
  function forumView() {
    const issues = G.forum;
    const is = issues.find(x => x.key === S.forumIssue) || issues[0];
    const thr = S.forumThread && is ? is.threads.find(t => t.id === S.forumThread) : null;
    const slug = thr ? `f/${is.key}/t/${thr.id}` : is ? `f/${is.key}` : '';
    const backAct = thr ? 'forumBack' : S.screen === 'forum' ? 'forumExit' : '';
    const chrome = `<div class="browser">${backAct ? `<button class="bb-iconbtn" data-a="${backAct}">${I.back}</button>` : ''}<div class="urlbar">${I.lock}<span><b>blitzboard.net</b>/${esc(slug)}</span></div><button class="bb-iconbtn" data-a="forumTop">${I.refresh}</button></div>`;
    if (!is) return chrome + `<div class="bb-scroll"><div class="empty">${I.forum}Nothing posted yet.</div></div>`;
    if (thr) return chrome + `<div class="bb-scroll"><div class="bb-body">${threadView(thr)}</div></div>`;
    const sorted = is.threads.slice().sort((a, b) => S.forumSort === 'new' ? (b.pinned - a.pinned) || b.id - a.id : S.forumSort === 'top' ? (b.pinned - a.pinned) || b.likes - a.likes : (b.pinned - a.pinned) || (b.mine - a.mine) || b.heat - a.heat);
    const u = L.user();
    return chrome + `<div class="bb-scroll">
      <div class="bb-head"><div class="bb-brand"><div class="bb-mark">B</div><div><div class="bb-name">Blitz<span>Board</span></div><div class="bb-tagline">The #1 pro football community</div></div><div class="bb-online"><i></i>${kfmt(U.ri(8000, 24000))} online</div></div>
        <nav class="bb-nav">${issues.slice(0, 10).map((x, i) => `<button class="${x === is ? 'on' : ''}" data-a="forumIssue" data-v="${x.key}">${esc(x.label)}${i === 0 && x !== is ? '<span class="new-dot"></span>' : ''}</button>`).join('')}</nav></div>
      <div class="bb-body">
        ${G.poll.length ? `<div class="bb-widget"><div class="bb-widget-h"><span>BlitzBoard Power Rankings</span><span>${esc(is.label)}</span></div><div class="bb-poll">${G.poll.slice(0, 10).map((id, i) => { const t = L.team(id); return `<button class="bb-poll-item ${t.user ? 'me' : ''}" data-a="team" data-v="${id}"><span class="n">#${i + 1}</span>${Logo.svg(t.logo, 38)}<span style="max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.abbr)}</span></button>`; }).join('')}</div></div>` : ''}
        <div class="bb-sort">${[['hot', 'Hot'], ['new', 'New'], ['top', 'Top']].map(([k, l]) => `<span class="${S.forumSort === k ? 'on' : ''}" data-a="forumSort" data-v="${k}">${l}</span>`).join('')}</div>
        ${sorted.map(t => `<button class="bb-thread ${t.pinned ? 'pinned' : ''} ${t.mine || (t.teams || []).includes(u.id) ? 'mine' : ''}" data-a="openThread" data-v="${is.key}|${t.id}">
          <div class="bb-votes">${I.vote.replace('<svg', '<svg class="up"')}${kfmt(t.likes)}</div>
          <div class="bb-tmain"><div class="bb-meta"><span class="bb-tag ${t.tag.split(' ')[0]}">${esc(t.tag)}</span>${t.pinned ? '<span class="bb-hot" style="color:#16a34a">PINNED</span>' : t.hot ? `<span class="bb-hot">${I.flame.replace('<svg', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px"')} HOT</span>` : ''}</div>
          <div class="bb-title">${esc(t.title)}</div>
          <div class="bb-foot"><span>${avatar(t.a)}<span class="who" style="color:var(--bb-text)">${esc(t.a.n)}</span></span><span>${I.msg}${kfmt(t.count)}</span><span>${I.eye}${kfmt(t.views)}</span><span>${t.ago}</span></div></div></button>`).join('')}
      </div></div>`;
  }
  function threadView(t) {
    return `<div class="bb-post"><div class="bb-meta">${avatar(t.a, true)}<div><div><span class="who">${esc(t.a.n)}</span> ${role(t.a)}</div><div>${t.ago} ago · ${kfmt(t.views)} views</div></div></div>
      <div style="margin-top:10px"><span class="bb-tag ${t.tag.split(' ')[0]}">${esc(t.tag)}</span></div>
      <div class="bb-title">${esc(t.title)}</div>
      <div class="bb-post-body">${esc(t.body)}</div>
      <div class="bb-foot" style="margin-top:14px"><span>${I.vote.replace('<svg', '<svg style="color:var(--bb-brand)"')}${kfmt(t.likes)}</span><span>${I.msg}${kfmt(t.count)} comments</span><span>${I.share}Share</span></div></div>
      <div class="bb-comment-box">${I.msg.replace('<svg', '<svg style="width:16px;height:16px"')}Add a comment...</div>
      <div class="bb-post" style="padding:4px 14px"><div class="bb-widget-h" style="margin:10px 0 0">Top comments</div>
      ${t.replies.map(r => `<div class="bb-reply">${avatar(r.a)}<div class="grow"><div class="bb-meta" style="margin:0"><span class="who">${esc(r.a.n)}</span>${r.a.f != null && L.team(r.a.f) ? `<span>· ${esc(L.team(r.a.f).abbr)} fan</span>` : ''}<span>· ${r.ago}</span></div><div class="bb-reply-text">${esc(r.text)}</div><div class="bb-reply-acts"><span>${I.vote}${r.likes}</span><span>Reply</span></div></div></div>`).join('')}
      <div class="tiny" style="color:var(--bb-muted);text-align:center;padding:12px">View ${Math.max(0, t.count - t.replies.length)} more comments</div></div>`;
  }
  SCREENS.forum = () => `<div class="screen bb">${forumView()}</div>`;

  // ════════════════ DRAFT ════════════════
  let draftTimer = null;
  function scheduleDraft() {
    clearTimeout(draftTimer);
    if (S.screen !== 'draft' || !G || G.phase !== 'draft') return;
    const cur = L.draftCur();
    if (!cur) {
      L.finishDraft();
      S.screen = 'draftDone';
      render();
      return;
    }
    if (L.isUser(cur.teamId)) {
      if (S.draft.fast) { S.draft.fast = false; toast(`${I.flame.replace('<svg', '<svg style="width:16px;height:16px;color:var(--accent)"')} You're on the clock!`); U.vibrate(30); render(); }
      return;
    }
    draftTimer = setTimeout(() => { if (S.screen === 'draft') { L.draftAI(); render(); } }, S.draft.fast ? 60 : 480);
  }
  SCREENS.draft = () => {
    const d = G.draft, cur = L.draftCur(), u = L.user();
    if (!cur) return `<div class="screen"><div class="scroll no-tabs"><div class="empty">Finalizing the draft...</div></div></div>`;
    const ct = L.team(cur.teamId), mine = L.isUser(cur.teamId);
    const recent = d.log.slice(-14).reverse();
    const myPicks = d.log.filter(e => e.teamId === u.id);
    const nextMine = d.order.indexOf(u.id, d.idx);
    let body = '';
    if (S.draft.view === 'board') {
      const pool = d.pool.map(id => G.players[id]).filter(p => S.draft.pos === 'ALL' || p.pos === S.draft.pos).slice(0, 70);
      body = `<div class="chips">${['ALL', ...DATA.POSITIONS].map(p => `<button class="chip ${S.draft.pos === p ? 'on' : ''}" data-a="draftPos" data-v="${p}">${p}</button>`).join('')}</div>
        <div class="card flush"><div class="list">${pool.map(p => `<div class="row prospect tap" data-a="prospect" data-v="${p.id}"><span class="tiny dim num" style="width:20px;font-weight:700">${d.pool.indexOf(p.id) + 1}</span>${jersey(p, 38)}<div class="grow"><div class="r1">${pname(p)} ${stkRow(p)}</div><div class="r2">${posBadge(p.pos)} ${gradeTag(p)} POT ${U.potGrade(p.pot)} · ${esc(p.college)}</div></div>${ovr(p.ovr)}${mine ? `<button class="btn btn-primary pick-btn" data-a="draftPick" data-v="${p.id}">Draft</button>` : ''}</div>`).join('') || '<div class="empty">No prospects left at this position.</div>'}</div></div>`;
    } else if (S.draft.view === 'mine') {
      body = myPicks.length ? `<div class="card flush"><div class="list">${myPicks.map(e => { const p = G.players[e.pid]; return `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 38)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">Rd ${e.round} · #${e.overall} · ${esc(p.college)} · POT ${U.potGrade(p.pot)}</div></div>${posBadge(p.pos)}${ovr(p.ovr)}</button>`; }).join('')}</div></div>` : `<div class="empty">${I.roster}You haven't made a pick yet.</div>`;
    } else {
      const nd = L.needs(u);
      body = `<div class="card"><div class="kicker mb8">Biggest needs</div><div class="needs">${nd.slice(0, 4).map(n => `<span class="tag t-bad">${n.pos} · ${n.avg}</span>`).join('')}</div><div class="tiny muted mt8">Ranked by your current starters' average OVR.</div></div>
        <div class="card flush"><table class="tbl"><thead><tr><th>Pos</th><th>Starters</th><th>Depth</th><th>Need</th></tr></thead><tbody>${DATA.POSITIONS.map(pos => { const n = nd.find(x => x.pos === pos); const cnt = (u.depth[pos] || []).length; return `<tr><td><b>${pos}</b></td><td class="${U.ovrClass(n.avg)}">${n.avg}</td><td>${cnt}/${DATA.ROSTER_QUOTA[pos]}</td><td>${nd.indexOf(n) < 3 ? '<span class="tag t-bad">High</span>' : nd.indexOf(n) < 6 ? '<span class="tag">Med</span>' : '<span class="tag t-good">Low</span>'}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
    return `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-a="openForum">${I.forum}</button><div class="tb-title"><div class="t1">${d.kind === 'founding' ? 'Inaugural Draft' : `${d.year} Draft`}</div><div class="t2">Rd ${cur.round}/${d.rounds} · Pick ${cur.overall} of ${d.order.length}</div></div><button class="icon-btn" data-a="toMenu">${I.menu}</button></div>
      <div class="scroll no-tabs">
        <div class="clock-card ${mine ? 'mine' : ''}">${logo(ct, 56)}<div class="grow"><div class="otc"><span class="dot"></span>On the clock</div><div style="font:700 20px/1.1 var(--f-display);text-transform:uppercase;margin-top:4px">${tfull(ct)}</div>${cur.orig !== cur.teamId ? `<div class="tiny muted">Pick via ${tfull(L.team(cur.orig))}</div>` : ''}<div class="small muted">${mine ? 'Your pick — choose a prospect below' : `Picking... ${nextMine >= 0 ? `you're up in ${nextMine - d.idx} pick${nextMine - d.idx === 1 ? '' : 's'}` : 'your picks are done'}`}</div></div>
          ${mine ? `<button class="btn btn-sm" data-a="autoPick">Auto</button>` : `<button class="btn btn-sm" data-a="draftFast" ${S.draft.fast ? 'disabled' : ''}>${I.ff}${nextMine >= 0 ? '' : ' Finish'}</button>`}</div>
        ${recent.length ? `<div class="ticker">${recent.map(e => { const p = G.players[e.pid], t = L.team(e.teamId); return `<div class="tick ${t.user ? 'me' : ''}"><b>#${e.overall}</b>${logo(t, 24)}<div style="min-width:0"><div class="tn">${pname(p)}</div><div class="tiny muted">${p.pos} · ${p.ovr} · ${esc(t.abbr)}</div></div></div>`; }).join('')}</div>` : ''}
        <div class="seg"><button class="${S.draft.view === 'board' ? 'on' : ''}" data-a="draftView" data-v="board">Big Board</button><button class="${S.draft.view === 'mine' ? 'on' : ''}" data-a="draftView" data-v="mine">My Class (${myPicks.length})</button><button class="${S.draft.view === 'needs' ? 'on' : ''}" data-a="draftView" data-v="needs">Needs</button></div>
        ${body}
      </div></div>`;
  };
  function prospectSheet(pid) {
    const p = G.players[pid], cur = L.draftCur();
    const mine = cur && L.isUser(cur.teamId);
    sheet(`<div class="pc-head" style="--team-1:#1e293b;--team-2:var(--accent)">${jersey(p, 60)}<div style="min-width:0"><div class="pc-name">${pname(p)}</div><div class="small" style="opacity:.85;margin-top:4px">${DATA.POS_NAME[p.pos]} · ${esc(p.college)}</div><div class="tiny" style="opacity:.7;margin-top:4px">Age ${p.age} · hometown ${esc(p.home)}</div></div><div class="pc-ovr"><b>${p.ovr}</b><span>OVR</span></div></div>
      <div class="kv mb12"><div><b>${U.potGrade(p.pot)}</b><span>Potential</span></div><div><b style="font-size:13px;line-height:18px">${DATA.GRADE_SHORT[p.stars]}</b><span>Grade</span></div><div><b>${p.age}</b><span>Age</span></div><div><b>#${G.draft.pool.indexOf(p.id) + 1}</b><span>Board</span></div></div>
      <div class="small muted mb12">Scouting report: <b>${DATA.GRADE[p.stars]}</b> · ${esc(p.college)}</div>
      <div class="card" style="padding:12px 14px">${DATA.ATTRS.map(a => { const lbl = DATA.attrLabel(p.pos, a); const v = p.attrs[a]; return `<div class="attr"><span class="muted">${DATA.ATTR_LONG[a === 'skl' ? lbl : a]}</span><div class="bar"><i style="width:${v}%"></i></div><b class="${U.ovrClass(v)}">${v}</b></div>`; }).join('')}</div>
      <div class="kicker mb8">Badges</div>${stkList(p, 'No badges coming out of college.')}
      <div class="small muted mb12">Would start at ${p.pos}? ${p.ovr > (L.depthHealthy(L.user(), p.pos)[DATA.STARTERS[p.pos] - 1] || { ovr: 0 }).ovr ? '<b class="good">Yes — instant starter</b>' : '<b>Depth piece for now</b>'}</div>
      ${mine ? `<button class="btn btn-primary btn-lg btn-block" data-a="draftPick" data-v="${p.id}">Draft ${pname(p)}</button>` : '<div class="small muted center">Wait for your pick to select a player.</div>'}`);
  }
  SCREENS.draftDone = () => {
    const d = G.draft, u = L.user(), g = d.grades[u.id];
    const mine = d.log.filter(e => e.teamId === u.id);
    return `<div class="screen"><div class="topbar"><div class="tb-title"><div class="t1">Draft complete</div><div class="t2">${d.kind === 'founding' ? 'Inaugural Draft' : `${d.year} Draft`}</div></div><button class="icon-btn" data-a="openForum">${I.forum}</button></div>
      <div class="scroll no-tabs">
        <div class="card result-hero"><div class="kicker">BlitzBoard draft grade</div><div class="big" style="color:var(--accent)">${g ? g.grade : 'B'}</div><div class="h-md mt8">${tfull(u)}</div><div class="small muted">${mine.length} rookie${mine.length === 1 ? '' : 's'}${mine.length ? ` · class avg ${Math.round(U.avg(mine.map(e => G.players[e.pid].ovr)))} OVR` : ''}</div></div>
        <div class="card flush"><div class="list">${mine.map(e => { const p = G.players[e.pid]; return `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 38)}<div class="grow"><div class="r1">${pname(p)} ${L.isStarter(u, p) ? '<span class="tag t-accent">Starter</span>' : ''}</div><div class="r2">Rd ${e.round} #${e.overall} · ${esc(p.college)} · POT ${U.potGrade(p.pot)}</div></div>${posBadge(p.pos)}${ovr(p.ovr)}</button>`; }).join('')}</div></div>
        <div class="small muted center">Undrafted free agents have filled out the rest of the roster.</div>
      </div>
      <div class="bottom-cta"><button class="btn btn-primary btn-lg" data-a="toCamp">${I.dumbbell} Go to Training Camp</button></div></div>`;
  };

  // ════════════════ CAMP ════════════════
  SCREENS.camp = () => {
    const c = G.camp, u = L.user(), sc = S.camp;
    const done = c.session >= DATA.CAMP_SESSIONS.length;
    const dots = `<div class="session-dots">${DATA.CAMP_SESSIONS.map((_, i) => `<i class="${i < c.session ? 'done' : i === c.session && !done ? 'cur' : ''}"></i>`).join('')}</div>`;
    let body = '', cta = '';
    if (sc.result) {
      const r = sc.result, g = DATA.groupById(r.groupId);
      const tot = r.res.reduce((s, x) => s + x.after - x.before, 0);
      const best = r.res[0];
      body = `<div class="card result-hero"><div class="kicker">${DATA.CAMP_SESSIONS[r.session].name} · ${g.label}</div><div class="big">+${(tot / Math.max(1, r.res.length)).toFixed(1)}</div><div class="small muted">avg OVR gain</div>
        <div class="stat-trio"><div><b>${r.res.length}</b><span>Trained</span></div><div><b class="good">+${best ? best.after - best.before : 0}</b><span>Best gain</span></div><div><b class="${r.res.some(x => x.injured) ? 'bad' : ''}">${r.res.filter(x => x.injured).length}</b><span>Injuries</span></div></div></div>
        <div class="card flush"><div class="list">${r.res.map(x => { const p = G.players[x.pid]; return `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 38)}<div class="grow"><div class="r1">${pname(p)} ${x.injured ? `<span class="tag t-bad">Hurt ${x.injured}w</span>` : ''}${x.stkUp ? `<span class="tag t-gold">${x.stkUp.kind === 'new' ? 'New sticker' : 'Sticker ↑'} · ${DATA.STICKERS[x.stkUp.id].name}</span>` : ''}</div><div class="attr-deltas">${Object.entries(x.deltas).map(([a, d]) => `<span>+${d} ${DATA.attrLabel(p.pos, a)}</span>`).join('') || '<span style="background:var(--surface-3);color:var(--muted)">No change</span>'}</div></div><div style="text-align:right"><div class="tiny muted">${x.before} →</div>${ovr(x.after)}</div></button>`; }).join('')}</div></div>`;
      cta = `<button class="btn btn-primary btn-lg" data-a="campNext">${done ? 'Finish Camp' : `Next: ${DATA.CAMP_SESSIONS[c.session].name}`} ${I.chev}</button>`;
    } else if (done) {
      body = `<div class="card result-hero">${TROPHY.replace('trophy-svg', 'trophy-svg" style="color:var(--accent)')}<div class="h-lg">Camp is in the books</div><div class="small muted mt8">Your team is ready for the ${G.year} season.</div></div>
        <div class="card flush"><div class="list">${c.log.map(e => `<div class="row"><span class="tag t-good">${DATA.CAMP_SESSIONS[e.session].name.split(' ')[0]}</span><div class="grow"><div class="r1">${DATA.groupById(e.groupId).label}</div><div class="r2">${DATA.INTENSITY.find(i => i.id === e.intensityId).label} · ${e.inj} injur${e.inj === 1 ? 'y' : 'ies'}</div></div><span class="delta">+${e.avg.toFixed(1)} avg</span></div>`).join('')}</div></div>
        <div class="card"><div class="rings">${(() => { const rt = L.ratings(u); return ring(rt.off, 'OFF', '#60a5fa') + ring(rt.ovr, 'OVR', 'var(--accent)') + ring(rt.def, 'DEF', '#f87171'); })()}</div></div>${cutCard(u)}`;
      cta = `<button class="btn btn-primary btn-lg" data-a="startSeason">${I.play} Kick Off the ${G.year} Season</button>`;
    } else {
      const sess = DATA.CAMP_SESSIONS[c.session];
      const groups = sc.side ? DATA.TRAINING[sc.side] : [];
      body = `<div class="card"><div class="kicker">Session ${c.session + 1} of ${DATA.CAMP_SESSIONS.length}</div><div class="h-lg mt8">${sess.name}</div><div class="small muted mt8">${sess.desc} Pick one position group to focus on — everyone else runs the standard program.</div><button class="link mt8" data-a="openTrade">${I.refresh} Trade Center</button></div>
        <div class="section-title"><h3>1 · Choose a side</h3></div>
        <div class="side-cards"><button class="side-card off-side ${sc.side === 'offense' ? 'on' : ''}" data-a="campSide" data-v="offense">${I.sword}<div class="sc-t">Offense</div><div class="tiny muted">OL · WR/TE · RB</div></button><button class="side-card def-side ${sc.side === 'defense' ? 'on' : ''}" data-a="campSide" data-v="defense">${I.wall}<div class="sc-t">Defense</div><div class="tiny muted">DL · Backs · Corners</div></button></div>
        ${sc.side ? `<div class="section-title"><h3>2 · Position group</h3></div>${groups.map(g => { const ga = L.groupAvg(u, g.id); return `<button class="group-card ${sc.group === g.id ? 'on' : ''}" data-a="campGroup" data-v="${g.id}"><span class="gc-ico">${g.id === 'WRTE' ? 'WR' : g.id === 'BACKS' ? 'LB' : g.id}</span><div class="grow"><div style="font-weight:700">${g.label}</div><div class="small muted">${g.sub} · ${ga.count} players</div><div class="tiny dim" style="margin-top:2px">Trains ${g.attrs.map(a => a === 'skl' ? 'skill' : DATA.ATTR_LONG[a].toLowerCase()).join(', ')}</div></div>${ovr(ga.avg)}<span class="radio" style="${sc.group === g.id ? 'border-color:var(--accent)' : ''}">${sc.group === g.id ? '<i style="width:10px;height:10px;border-radius:50%;background:var(--accent);display:block"></i>' : ''}</span></button>`; }).join('')}` : ''}
        ${sc.group ? `<div class="section-title"><h3>3 · Intensity</h3></div><div class="seg">${DATA.INTENSITY.map(i => `<button class="${sc.intensity === i.id ? 'on' : ''}" data-a="campInt" data-v="${i.id}">${i.label}</button>`).join('')}</div><div class="small muted center">${DATA.INTENSITY.find(i => i.id === sc.intensity).desc}</div>` : ''}`;
      cta = `<button class="btn btn-primary btn-lg" data-a="runCamp" ${sc.group ? '' : 'disabled'}>${I.dumbbell} Run ${sess.name}</button>`;
    }
    return `<div class="screen"><div class="topbar"><button class="icon-btn" data-a="openForum">${I.forum}</button><div class="tb-title"><div class="t1">Training Camp ${G.year}</div><div class="t2">${tfull(u)} · OVR ${L.ratings(u).ovr}</div></div><button class="icon-btn" data-a="toMenu">${I.menu}</button></div>
      <div class="scroll no-tabs">${dots}${body}</div><div class="bottom-cta">${cta}</div></div>`;
  };
  // cut-down day preview: who goes when the roster drops to 53 at kickoff
  function cutCard(u) {
    const cut = L.cutPreview(u);
    if (!cut.length) return `<div class="small muted center mb12">${L.roster(u).length}/${DATA.ROSTER_MAX} players — no cuts needed before Week 1.</div>`;
    return `<div class="section-title"><h3>Cut-down day</h3><span class="tiny muted">${L.roster(u).length} → ${DATA.ROSTER_MAX}</span></div><div class="small muted mb8">These players will be released when the season kicks off. Release someone else (tap a player) to keep them.</div>
      <div class="card flush"><div class="list">${cut.map(p => `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 34)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">${p.pos} · ${ageExp(p)} · POT ${U.potGrade(p.pot)}</div></div>${ovr(p.ovr)}</button>`).join('')}</div></div>`;
  }
  function practiceSheet() {
    const u = L.user();
    const groups = side => DATA.TRAINING[side].map(g => { const ga = L.groupAvg(u, g.id); return `<button class="group-card ${G.practice === g.id ? 'on' : ''}" data-a="setPractice" data-v="${g.id}"><span class="gc-ico">${g.id === 'WRTE' ? 'WR' : g.id === 'BACKS' ? 'LB' : g.id}</span><div class="grow"><div style="font-weight:700">${g.label}</div><div class="small muted">${g.sub}</div></div>${ovr(ga.avg)}</button>`; }).join('');
    sheet(`<div class="h-lg">Weekly practice</div><div class="small muted mb12" style="margin-top:4px">The focus group gets extra reps after every game this season.</div>
      <div class="kicker mb8" style="color:#60a5fa">Offense</div>${groups('offense')}<div class="kicker mb8 mt12" style="color:#f87171">Defense</div>${groups('defense')}`);
  }

  // ════════════════ LIVE GAME ════════════════
  // Real-time, stat-driven playback: every snap is resolved by player
  // matchups in the engine and animated on the canvas by Live.
  const CLOCK_SECS = { 1: 15, 2: 10, 4: 7, 8: 6 };
  function startLiveGame() {
    const g = L.userGame();
    if (!g) return;
    const gs = L.createUserGame(g);
    S.game = { g, gs, speed: G.settings.speed || 2, paused: false, done: false, auto: G.settings.callPlays === false, mode: 'feed', tab: 'feed', need: null, clock: 0, clockIv: null, wait: null, halfPending: false, halfShown: false, resume: null };
    gs.userCalls = !S.game.auto;
    S.screen = 'game';
    render();
  }
  SCREENS.game = () => {
    const { g } = S.game;
    const H = L.team(g.h), A = L.team(g.a), [c0, c1] = duo(H, A);
    const sbTeam = (t, side) => `<div class="sb-team ${side ? 'away' : ''}" style="--tc:${t.logo.primary}">${logo(t, 30)}<div><div class="sb-abbr">${rk(t.id)}${esc(t.abbr)}</div><div class="sb-rec">${L.recStr(t)}</div></div><i class="poss-dot" id="pd${side}"></i><div class="sb-score num" id="sc${side}">0</div></div>`;
    return `<div class="screen game">
      <div class="scorebug"><div class="sb-main">${sbTeam(H, 0)}<div class="sb-mid"><div class="sb-q" id="sbq">1ST</div><div class="sb-clock" id="sbc">15:00</div></div>${sbTeam(A, 1)}</div>
        <div class="sb-sit" id="sbsit">Kickoff</div>
        <div class="sb-wp"><i id="wp0" style="background:${c0}"></i><i id="wp1" style="background:${c1}"></i></div></div>
      <div class="field-area">
        <canvas id="live"></canvas>
        <div class="live-tag" id="livetag"></div>
        <div class="field-ticker" id="lastplay"></div>
        <div class="callpanel" id="callpanel"></div>
        <div class="final-cta" id="finalcta"></div>
      </div>
      <nav class="gbar" id="dock"></nav>
    </div>`;
  };
  function dockHTML() {
    const st = S.game;
    const b = (act, icon, label, extra = '') => `<button class="gbar-btn ${extra}" data-a="${act}">${icon}<span>${label}</span></button>`;
    const spd = `<b class="gbar-spd">${st.speed}x</b>`;
    return b('gpbp', I.msg, 'Plays')
      + b('gpause', st.paused ? I.play : I.pause, st.paused ? 'Play' : 'Pause', st.paused ? 'on' : '')
      + b('gspeedNext', spd, 'Speed')
      + b('gplanSheet', I.gear, 'Settings')
      + b('gsim', I.ff, 'Sim', st.done ? 'off' : '')
      + b('gmenu', I.menu, 'Menu');
  }
  function gameMount() {
    const st = S.game;
    document.getElementById('dock').innerHTML = dockHTML();
    Live.mount(document.getElementById('live'), st.gs);
    Live.setSpeed(st.speed);
    Live.setPaused(st.paused);
    Live.lineup();
    gameUpdate();
    renderPanel();
    later(gNext, 900);
  }
  function later(fn, ms) {
    const st = S.game;
    clearTimeout(st.wait);
    st.wait = setTimeout(() => { if (S.game !== st || S.screen !== 'game') return; if (st.paused) { st.resume = fn; return; } fn(); }, ms / st.speed);
  }

  // ── flow ──
  function gNext() {
    const st = S.game, gs = st.gs;
    if (!st || st.done) return;
    if (gs.over) return endLiveGame();
    if (st.halfPending) { st.halfPending = false; st.halfShown = true; return halftimeSheet(); }
    gs.userCalls = !st.auto;
    const need = Engine.needsCall(gs);
    if (need) return showCall(need);
    snap({});
  }
  function snap(input) {
    const st = S.game, gs = st.gs;
    stopClock();
    st.need = null; st.mode = 'feed';
    renderPanel();
    // Wait until everyone has jogged back and set before the ball is snapped.
    Live.ready(() => { if (S.game === st && !st.done && S.screen === 'game') runSnap(input); });
  }
  function runSnap(input) {
    const st = S.game, gs = st.gs;
    gs._togoAtSnap = gs.togo;
    const before = gs.log.length;
    // the engine only sets the play up; the live sim plays it out and the result is booked after
    const det = Engine.prepare(gs, input);
    const tag = document.getElementById('livetag');
    if (tag && det && det.type === 'snap') {
      const op = Playbook.offById(det.play), dp = Playbook.defById(det.dplay);
      tag.innerHTML = `<span>${esc(gs.abbr[det.o])}: ${esc(op.name)}</span><span>${esc(gs.abbr[1 - det.o])}: ${esc(dp.name)}</span>`;
      tag.classList.add('show');
    } else if (tag) tag.classList.remove('show');
    Live.play(det, res => {
      if (S.game !== st || st.done) return;
      if (det && det.live) Engine.commit(gs, det, res);
      afterPlay(before);
    });
  }
  function afterPlay(before) {
    const st = S.game;
    if (!st || st.done || S.screen !== 'game') return;
    const gs = st.gs, fresh = gs.log.slice(before);
    gameUpdate(fresh);
    if (fresh.some(e => e.kind === 'half') && !st.halfShown) st.halfPending = true;
    if (gs.over) return later(endLiveGame, 600);
    Live.lineup();
    later(gNext, st.auto ? 500 : 350);
  }

  // ── play calling ──
  function showCall(need) {
    const st = S.game;
    st.need = need; st.mode = 'call'; st.pbTab = 'picks'; st.flip = false;
    const tk = document.getElementById('lastplay'); if (tk) tk.classList.remove('show');
    renderPanel();
    startClock();
    U.vibrate(10);
  }
  function startClock() {
    const st = S.game;
    stopClock();
    st.clock = CLOCK_SECS[st.speed] || 10;
    const total = st.clock;
    st.clockIv = setInterval(() => {
      if (S.game !== st || st.paused) return;
      st.clock -= 0.1;
      const el = document.getElementById('pclock');
      if (el) {
        el.querySelector('b').textContent = Math.max(0, Math.ceil(st.clock));
        el.style.setProperty('--p', Math.max(0, st.clock / total));
        el.classList.toggle('hurry', st.clock <= 3);
      }
      if (st.clock <= 0) { stopClock(); autoCall(); }
    }, 100);
  }
  function stopClock() { const st = S.game; if (st && st.clockIv) { clearInterval(st.clockIv); st.clockIv = null; } }
  // the coordinator's pick, as a playbook play (cached for this snap)
  function suggestion() {
    const st = S.game, gs = st.gs, key = `${st.need}:${gs.n}:${gs.down}:${gs.ball}`;
    if (st.suggKey === key && st.sugg) return st.sugg;
    let v;
    if (st.need === 'off') { const c = Engine.suggestOff(gs), bk = myBook(); v = ['punt', 'fg', 'kneel'].includes(c) ? c : bestOf(Playbook.OFF.filter(p => p.cat === c && p.run?.scheme !== 'sneak' && Playbook.inBook(p, bk)), gs).id; }
    else v = Playbook.pickDef(Engine.aiDefCall(gs, gs.userSide), gs).id;
    st.suggKey = key; st.sugg = v;
    return v;
  }
  const myBook = () => { const gs = S.game.gs; return (gs.plan[gs.userSide] && gs.plan[gs.userSide].book) || 'multiple'; };
  // within a call family, prefer short-yardage plays when it's short and shots when it's long
  function bestOf(list, gs) {
    const sc = p => (p.kind === 'run' && gs.togo <= 2 ? (p.run.scheme === 'zone' || p.run.scheme === 'power' ? 2 : 0) : 0) + (p.kind === 'pass' && gs.togo >= 8 ? (p.cat === 'deep' ? 1 : 0) : 0) + Math.random();
    return list.slice().sort((a, b) => sc(b) - sc(a))[0] || Playbook.OFF[0];
  }
  function autoCall() {
    const st = S.game;
    if (!st.need) return;
    const v = st.sugg || suggestion();
    toast(`Play clock expired — coordinator called ${callName(v)}`);
    makeCall(v);
  }
  function callName(id) {
    const p = Playbook.offById(id) || Playbook.defById(id);
    if (p) return p.name;
    const c = Engine.OFF_CALLS.find(x => x.id === id) || Engine.DEF_CALLS.find(x => x.id === id);
    return c ? c.label : { punt: 'Punt', fg: 'Field Goal', kneel: 'Kneel' }[id] || id;
  }
  function makeCall(v) {
    const st = S.game;
    if (!st.need) return;
    const input = st.need === 'off' ? { off: v, flip: !!st.flip } : { def: v };
    snap(input);
  }
  function edgeTag(v) {
    const cls = v >= 3 ? 'e-big' : v >= 1 ? 'e-good' : v > -1 ? 'e-even' : 'e-bad';
    const lbl = v >= 3 ? 'Best look' : v >= 1 ? 'Edge' : v > -1 ? 'Even' : 'Tough';
    return `<span class="cc-edge ${cls}">${lbl} ${v > 0 ? '+' : ''}${v.toFixed(1)}</span>`;
  }
  function callPanel() {
    const st = S.game, gs = st.gs, us = gs.userSide, need = st.need;
    st.sugg = suggestion();
    const sit = `${Engine.downTxt(gs)} · ${esc(gs.abbr[gs.poss])} ball at ${esc(Engine.spot(gs))} · ${gs.qtr <= 4 ? `Q${gs.qtr} ${U.clock(gs.clock)}` : `OT${gs.qtr - 4}`}`;
    const clock = `<div class="pclock" id="pclock" style="--p:1"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle class="pc-fg" cx="20" cy="20" r="17"/></svg><b>${Math.ceil(st.clock || CLOCK_SECS[st.speed])}</b></div>`;
    let cards = '', intel = '', tabs = '', extra = '';
    const tab = st.pbTab || 'picks';
    const tabBtn = (id, label) => `<button class="pb-tab ${tab === id ? 'on' : ''}" data-a="gpbTab" data-v="${id}">${label}</button>`;
    const CAT = { inside: 'Inside run', outside: 'Outside run', quick: 'Quick pass', pa: 'Play action', deep: 'Downfield', screen: 'Screen', base: 'Base', blitz: 'Blitz', cover: 'Coverage', runstop: 'Run stop' };
    if (need === 'off') {
      const raw = Engine.callEdges(gs, us), t = gs.tend[1 - us];
      const mean = U.avg(Object.values(raw)), e = {};
      for (const k in raw) e[k] = (raw[k] - mean) * 0.7;
      const blitzPct = gs.tend[us].n ? Math.round(t.blitz / gs.tend[us].n * 100) : 0;
      intel = `Defense: blitzing ${blitzPct}% of snaps${t.lastDef ? ` · last look: ${CAT[t.lastDef] || callName(t.lastDef)}` : ''}`;
      const special = [];
      if (gs.down === 4 || Engine.canKneel(gs)) {
        const f = Engine.fourthInfo(gs);
        if (f.canFg) special.push({ id: 'fg', label: 'Field Goal', desc: `${f.fgDist} yds · ${Math.round(f.fgP * 100)}% make` });
        if (f.canPunt && gs.down === 4) special.push({ id: 'punt', label: 'Punt', desc: 'Flip the field.' });
        if (Engine.canKneel(gs)) special.push({ id: 'kneel', label: 'Victory Formation', desc: 'Take a knee, burn clock.' });
      }
      const bk = myBook(), forms = Playbook.BOOKS[bk].forms || Object.keys(Playbook.FORMS);
      tabs = tabBtn('picks', 'OC Picks') + (special.length ? tabBtn('st', 'Special') : '') + forms.map(id => tabBtn(id, Playbook.FORMS[id].name.replace('Shotgun ', 'Gun ').replace('Singleback ', 'Single '))).join('');
      let list;
      if (tab === 'st' && special.length) list = null;
      else if (tab === 'picks') {
        // the coordinator's pick plus the best-looking play from each other family
        if (st.picksKey !== st.suggKey) {
          const fam = {};
          for (const p of U.shuffle(Playbook.OFF.filter(q => Playbook.inBook(q, bk)))) { if (p.run?.scheme === 'sneak' && gs.togo > 2) continue; if (!fam[p.cat]) fam[p.cat] = p; }
          const sp0 = Playbook.offById(st.sugg);
          st.picks = Object.values(fam).filter(p => !sp0 || p.cat !== sp0.cat).sort((a, b) => e[b.cat] - e[a.cat]).slice(0, 4).map(p => p.id);
          st.picksKey = st.suggKey;
        }
        const sp = Playbook.offById(st.sugg);
        list = st.picks.map(Playbook.offById);
        if (sp) list.unshift(sp);
      } else list = Playbook.OFF.filter(p => p.form === tab);
      const flip = !!st.flip;
      const card = p => `<button class="call-card pb-card k-${p.kind} ${st.sugg === p.id ? 'sugg' : ''}" data-a="gcall" data-v="${p.id}">${Playbook.svgOff(p, flip)}<div class="cc-top"><span class="cc-kind">${CAT[p.cat]}</span>${st.sugg === p.id ? '<span class="cc-pick">OC PICK</span>' : ''}</div><div class="cc-name">${esc(p.name)}</div><div class="cc-form">${esc(Playbook.FORMS[p.form].name)}</div>${edgeTag(e[p.cat] || 0)}</button>`;
      const stCard = c => `<button class="call-card k-st ${st.sugg === c.id ? 'sugg' : ''}" data-a="gcall" data-v="${c.id}"><div class="cc-top"><span class="cc-kind">SPECIAL</span>${st.sugg === c.id ? '<span class="cc-pick">OC PICK</span>' : ''}</div><div class="cc-name">${c.label}</div><div class="cc-desc">${c.desc}</div></button>`;
      cards = list ? (tab === 'picks' ? special.map(stCard).join('') : '') + list.map(card).join('') : special.map(stCard).join('');
      extra = `<button class="pb-flip ${flip ? 'on' : ''}" data-a="gflip">⇄ Flip</button>`;
    } else {
      const t = gs.tend[1 - us];
      const pr = t.n ? Math.round(t.pass / t.n * 100) : 50;
      const O = Engine.slots(gs, 1 - us, true);
      const threat = ['WR1', 'WR2', 'RB', 'TE', 'QB'].map(k => O[k]).filter(p => p.id >= 0).sort((a, b) => b.ovr - a.ovr)[0];
      intel = `Offense: pass ${pr}% · run ${100 - pr}%${t.last ? ` · last: ${CAT[t.last] || callName(t.last)}` : ''}${threat ? ` · top threat ${threat.pos} ${esc(threat.last)} (${threat.ovr})` : ''}`;
      const groups = { picks: null, zone: ['c2', 'c3', 'c4', 'c6', 'tampa', 'buzz', 'prevent'], man: ['c1', 'c2man', 'box', 'goal'], blitz: ['mike', 'c0', 'fire', 'sblitz', 'cfire'] };
      tabs = tabBtn('picks', 'DC Picks') + tabBtn('zone', 'Zone') + tabBtn('man', 'Man') + tabBtn('blitz', 'Blitz');
      const ids = groups[tab] || null;
      let list = ids ? ids.map(Playbook.defById) : Playbook.DEF.slice();
      if (!ids) { const sp = Playbook.defById(st.sugg); list = [sp, ...list.filter(p => p !== sp)]; }
      cards = list.map(p => `<button class="call-card pb-card k-def ${st.sugg === p.id ? 'sugg' : ''}" data-a="gcall" data-v="${p.id}">${Playbook.svgDef(p)}<div class="cc-top"><span class="cc-kind">${CAT[p.cat]}</span>${st.sugg === p.id ? '<span class="cc-pick">DC PICK</span>' : ''}</div><div class="cc-name">${esc(p.name)}</div><div class="cc-form">${esc(p.desc)}</div></button>`).join('');
    }
    return `<div class="call-head"><div class="grow"><div class="kicker" style="color:var(--accent)">Your call · ${need === 'off' ? 'Offense' : 'Defense'}</div><div class="call-sit">${sit}</div></div>${extra}${clock}</div>
      <div class="call-intel">${intel}</div><div class="pb-tabs">${tabs}</div><div class="call-scroll">${cards}</div>`;
  }
  function fatiguePanel() {
    const st = S.game, gs = st.gs, us = gs.userSide;
    const unit = (pos, n) => (gs.lu[us][pos] || []).filter(id => !gs.out[id]).slice(0, n).map(id => G.players[id]).filter(Boolean);
    const groups = [['Offense', [['QB', 1], ['RB', 2], ['WR', 4], ['TE', 1], ['OL', 5]]], ['Defense', [['DL', 5], ['LB', 3], ['CB', 3], ['S', 2]]]];
    return groups.map(([lbl, list]) => `<div class="kicker" style="margin:10px 4px 6px">${lbl}</div>` + list.map(([pos, n]) => unit(pos, n).map((p, i) => {
      const s = Math.round(Engine.stam(gs, p));
      const col = s >= 75 ? 'var(--good)' : s >= 58 ? 'var(--warn)' : 'var(--bad)';
      return `<div class="fat-row"><span class="pos-badge ${posCls(p.pos)}">${p.pos}${i + 1}</span><span class="grow small" style="font-weight:600">${pname(p)}</span>${s < 58 && i < DATA.STARTERS[pos] ? '<span class="tag t-bad">Rotating</span>' : ''}<div class="fat-bar"><i style="width:${s}%;background:${col}"></i></div><b class="num small">${s}</b></div>`;
    }).join('')).join('')).join('') + `<div class="tiny muted" style="padding:8px 4px">Stamina drains every snap and lowers ratings. Starters below 58 rotate out when a fresh backup is available.</div>`;
  }
  function renderPanel() {
    const st = S.game, el = document.getElementById('callpanel');
    if (!el) return;
    if (st.mode === 'call') { el.innerHTML = callPanel(); el.classList.add('show'); el.querySelector('.call-scroll').scrollLeft = 0; }
    else el.classList.remove('show');
  }
  // Play-by-play / stamina / stats sheet
  function pbpSheet() {
    const st = S.game;
    const tab = st.tab || 'feed';
    const body = tab === 'feed' ? '<div class="feed sheet-feed" id="feed"></div>' : tab === 'fatigue' ? fatiguePanel() : liveStats();
    sheet(`<div class="flex between mb12"><div class="h-lg">Game Center</div><button class="icon-btn" data-a="closeSheet">${I.x}</button></div>
      <div class="gtabs"><button class="${tab === 'feed' ? 'on' : ''}" data-a="gtab" data-v="feed">Play-by-play</button><button class="${tab === 'fatigue' ? 'on' : ''}" data-a="gtab" data-v="fatigue">Stamina</button><button class="${tab === 'box' ? 'on' : ''}" data-a="gtab" data-v="box">Stats</button></div>
      <div class="gpanel-body pbp-body">${body}</div>`);
    if (tab === 'feed') fillFeed();
  }
  function stkFired() {
    const gs = S.game.gs, rows = Object.entries(gs.stkLog || {}).map(([k, n]) => { const [pid, id] = k.split(':'); const p = G.players[pid]; return p ? { p, id, n, tier: (p.stk.find(x => x.id === id) || { tier: 0 }).tier } : null; })
      .filter(Boolean).filter(x => DATA.STICKERS[x.id].kind === 'proc' || x.tier >= 1).sort((a, b) => (b.tier - a.tier) || (b.n - a.n)).slice(0, 8);
    if (!rows.length) return '';
    return `<div class="kicker" style="margin:10px 4px 4px">Badges fired</div>${rows.map(x => `<div class="flex small" style="padding:4px 2px">${stkChip({ id: x.id, tier: x.tier })}<span class="grow">${pname(x.p)} <span class="muted">${esc(L.team(x.p.teamId).abbr)} · ${DATA.STICKERS[x.id].name}</span></span><b class="num">×${x.n}</b></div>`).join('')}`;
  }
  function liveStats() {
    const gs = S.game.gs, ts = gs.ts;
    const row = (l, a, b) => `<div class="cmp-row"><b>${a}</b><span class="cl">${l}</span><b>${b}</b></div>`;
    const top = Object.entries(gs.ps).map(([id, s]) => ({ p: G.players[id], s })).filter(x => x.p);
    const lead = (k, f) => { const x = top.filter(y => y.s[k] > 0).sort((a, b) => b.s[k] - a.s[k])[0]; return x ? `<div class="flex small" style="padding:4px 2px"><span class="pos-badge ${posCls(x.p.pos)}">${x.p.pos}</span><span class="grow">${pname(x.p)} <span class="muted">${esc(gs.abbr[x.s.side])}</span></span><span class="muted">${f(x.s)}</span></div>` : ''; };
    return `<div style="padding:4px 4px 0">${row('Total yards', ts[0].yds, ts[1].yds)}${row('Passing', ts[0].py, ts[1].py)}${row('Rushing', ts[0].ry, ts[1].ry)}${row('First downs', ts[0].fd, ts[1].fd)}${row('Turnovers', ts[0].to, ts[1].to)}${row('Sacks', ts[0].sk, ts[1].sk)}</div>
      ${stkFired()}
      <div class="kicker" style="margin:10px 4px 4px">Leaders</div>${lead('py', s => `${s.pc}/${s.pa} · ${s.py} yds · ${s.ptd} TD`)}${lead('ry', s => `${s.ra} car · ${s.ry} yds`)}${lead('rcy', s => `${s.rc} rec · ${s.rcy} yds`)}${lead('tk', s => `${s.tk} tkl · ${s.sk} sk`)}`;
  }
  function playEl(gs, e) {
    const icons = { td: 'TD', fg: 'FG', to: 'TO', miss: 'NG', big: '+', sack: 'SK', inj: '✚', punt: 'P', kick: 'K' };
    const t = L.team(gs.t[e.side]);
    const ic = icons[e.kind];
    const pi = ic ? `<span class="pi">${ic}</span>` : `<span class="pi" style="background:${t.logo.primary};color:${U.onColor(t.logo.primary)}">${esc(t.abbr.slice(0, 3))}</span>`;
    const qn = e.q <= 4 ? `Q${e.q}` : `OT${e.q - 4}`;
    const sub = ['half', 'qend', 'final', 'info'].includes(e.kind) ? '' : `<div class="ps">${qn} ${e.q <= 4 ? U.clock(e.clk) : ''}${e.sit ? ` · ${esc(e.sit)}` : ''}</div>`;
    return `<div class="play k-${e.kind}">${pi}<div class="pt">${sub}${esc(e.text)}</div></div>`;
  }
  function fillFeed() {
    const gs = S.game.gs, f = document.getElementById('feed');
    if (f) f.innerHTML = gs.log.slice(-40).reverse().map(e => playEl(gs, e)).join('');
  }
  function gameUpdate(fresh = []) {
    const st = S.game, gs = st.gs;
    const $ = id => document.getElementById(id);
    if (!$('sc0')) return;
    [0, 1].forEach(s => {
      const el = $('sc' + s);
      if (+el.textContent !== gs.score[s]) { el.textContent = gs.score[s]; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      $('pd' + s).classList.toggle('on', !gs.over && gs.phase === 'play' && gs.poss === s);
    });
    $('sbq').textContent = gs.over ? 'FINAL' : gs.qtr <= 4 ? ['1ST', '2ND', '3RD', '4TH'][gs.qtr - 1] : `OT${gs.qtr - 4}`;
    $('sbc').textContent = gs.over ? (gs.ot ? 'OT' : '0:00') : U.clock(gs.clock);
    const wchip = `<span class="wx-chip">${wxIcon(gs.wx, 14)}${gs.wx.temp}°<span class="wx-w">${windArrow(gs.wx, gs.phase === 'kickoff' ? gs.kicker : gs.poss)}${gs.wx.wind}</span></span>`;
    $('sbsit').innerHTML = (gs.over ? 'Final' : gs.phase === 'kickoff' ? `${esc(gs.abbr[gs.kicker])} kicking off` : `<span class="dd">${Engine.downTxt(gs)}</span><span>${esc(gs.abbr[gs.poss])} ball at ${esc(Engine.spot(gs))}</span>`) + wchip;
    const wp = Math.round(Engine.winProb(gs) * 100);
    $('wp0').style.width = wp + '%'; $('wp1').style.width = (100 - wp) + '%';
    const lastReal = fresh.filter(e => !['info', 'qend'].includes(e.kind)).pop() || fresh[fresh.length - 1];
    if (lastReal) {
      const tk = $('lastplay');
      tk.innerHTML = `<span class="lp-k k-${lastReal.kind}">${{ td: 'TD', fg: 'FG', to: 'TURNOVER', sack: 'SACK', big: 'BIG PLAY', miss: 'NO GOOD', inj: 'INJURY' }[lastReal.kind] || esc(gs.abbr[lastReal.side])}</span><span class="lp-t">${esc(lastReal.text)}</span>`;
      tk.classList.add('show');
      clearTimeout(st.tickT);
      st.tickT = setTimeout(() => tk.classList.remove('show'), 4200 / Math.max(1, Math.min(st.speed, 2)));
    }
    if (document.getElementById('feed')) fillFeed();
    if (fresh.some(e => e.kind === 'td')) U.vibrate(40);
  }
  function halftimeSheet() {
    const st = S.game, gs = st.gs, ts = gs.ts, us = gs.userSide;
    st.paused = true; Live.setPaused(true);
    sheet(`<div class="center"><div class="kicker">Halftime</div><div class="final-score" style="margin:10px 0"><div class="fs-t">${logo(L.team(gs.t[0]), 44)}${esc(gs.abbr[0])}</div><div class="flex" style="gap:12px"><span class="fs-s">${gs.score[0]}</span><span class="dim">–</span><span class="fs-s">${gs.score[1]}</span></div><div class="fs-t">${logo(L.team(gs.t[1]), 44)}${esc(gs.abbr[1])}</div></div></div>
      <div class="kv mb12"><div><b>${ts[us].yds}</b><span>Your yds</span></div><div><b>${ts[1 - us].yds}</b><span>Their yds</span></div><div><b>${ts[us].to}</b><span>Your TO</span></div><div><b>${ts[1 - us].to}</b><span>Their TO</span></div></div>
      <div class="small muted mb12">Everyone gets a breather — stamina recovers at the half. Your coordinators call plays from this plan when you're on auto.</div>
      <div id="htplan">${planPicker(gs.plan[us], 'gplan')}</div>
      <button class="btn btn-primary btn-lg btn-block mt16" data-a="secondHalf">${I.play} Start 2nd Half</button>`, { center: true, locked: true });
  }
  function simLiveToEnd() {
    const st = S.game;
    stopClock(); clearTimeout(st.wait);
    closeSheet();
    st.done = false; Live.skip();
    const before = st.gs.log.length;
    let guard = 0;
    while (!st.gs.over && guard++ < 2500) Engine.step(st.gs);
    st.mode = 'feed'; st.need = null;
    renderPanel();
    gameUpdate(st.gs.log.slice(before));
    endLiveGame();
  }
  function endLiveGame() {
    const st = S.game;
    if (!st || st.done) return;
    st.done = true;
    stopClock(); clearTimeout(st.wait);
    const res = L.applyResult(st.g, st.gs);
    L.finishWeek(res);
    S.final = { g: st.g, res };
    const dock = document.getElementById('dock');
    if (dock) dock.innerHTML = dockHTML();
    const won = res.W.user;
    const cta = document.getElementById('finalcta');
    if (cta) { cta.innerHTML = `<button class="btn btn-primary btn-lg" data-a="gameFinal">${won ? 'Victory' : 'Final'} · ${esc(res.W.abbr)} ${res.ws}–${res.ls} ${I.chev}</button>`; cta.classList.add('show'); }
    Live.bigText(won ? 'VICTORY' : 'FINAL', won ? '#facc15' : '#e2e8f0');
    toast(won ? `${I.trophy.replace('<svg', '<svg style="width:16px;height:16px;color:var(--gold)"')} Victory! ${esc(res.W.abbr)} ${res.ws}–${res.ls}` : `Final: ${esc(res.W.abbr)} ${res.ws}–${res.ls}`);
    U.vibrate(won ? [30, 60, 30] : 20);
  }

  SCREENS.final = () => {
    const { g, res } = S.final, u = L.user();
    const won = res.W.user, H = L.team(g.h), A = L.team(g.a);
    const wk = g.wk;
    const others = (G.schedule[wk] || []).filter(x => x.id !== g.id && x.done);
    const label = won ? (g.type === 'final' ? 'Blitz Bowl Champions!' : g.type === 'cc' ? 'Conference Champions!' : g.type === 'wc' ? 'Playoff Win!' : res.rankBefore[res.Lo.id] ? 'Statement Win' : 'Victory') : g.wk > SEA.REG ? 'Season Over' : (res.ws - res.ls <= 3 ? 'Heartbreaker' : 'Defeat');
    return `<div class="screen"><div class="topbar"><div class="tb-title"><div class="t1">${DATA.WEEK_LABEL(wk)}</div><div class="t2">${esc(L.gameLabel(g))}</div></div></div>
      <div class="scroll no-tabs">
        <div class="card final-hero" style="${won ? `background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 18%,var(--surface)),var(--surface))` : ''}"><div class="fh-k">FINAL${g.ot ? ' / OT' : ''}</div><div class="fh-r ${won ? '' : 'muted'}">${label}</div>
          <div class="final-score"><div class="fs-t">${logo(H, 60)}${tname(H)}</div><div class="flex" style="gap:14px"><span class="fs-s ${g.hs < g.as ? 'lose' : ''}">${g.hs}</span><span class="dim">–</span><span class="fs-s ${g.as < g.hs ? 'lose' : ''}">${g.as}</span></div><div class="fs-t">${logo(A, 60)}${tname(A)}</div></div>
          <div class="small muted">${g.wk > SEA.REG ? (won ? `${tname(u)} advance` : `${tname(u)} are eliminated`) : `${tname(u)} ${won ? 'improve' : 'fall'} to ${L.recStr(u)}`}</div></div>
        ${boxHTML(g)}
        ${others.length ? `<div class="section-title"><h3>Around the league</h3><button class="link" data-a="finalForum">BlitzBoard</button></div><div class="card flush"><div class="list">${others.map(x => { const W = L.team(L.winnerOf(x)), Lo = L.team(L.winnerOf(x) === x.h ? x.a : x.h); return `<button class="row tap" style="width:100%;text-align:left" data-a="box" data-v="${x.id}">${logo(W, 26)}<div class="grow"><div class="r1">${tname(W)} <b class="num">${Math.max(x.hs, x.as)}</b>, ${tname(Lo)} <span class="num muted">${Math.min(x.hs, x.as)}</span></div></div>${x.ot ? '<span class="tag">OT</span>' : ''}</button>`; }).join('')}</div></div>` : ''}
      </div>
      <div class="bottom-cta"><button class="btn btn-primary btn-lg" data-a="finalContinue">Continue ${I.chev}</button></div></div>`;
  };

  // ════════════════ RECAP & OFFSEASON ════════════════
  SCREENS.recap = () => {
    const c = L.team(G.champion), u = L.user();
    const uh = u.hist[u.hist.length - 1];
    const confetti = c.user ? `<div class="confetti">${Array.from({ length: 26 }, (_, i) => `<i style="left:${U.ri(0, 100)}%;background:${[u.logo.primary, u.logo.secondary, '#fbbf24'][i % 3]};animation-duration:${U.rand(2.5, 5).toFixed(1)}s;animation-delay:-${U.rand(0, 5).toFixed(1)}s"></i>`).join('')}</div>` : '';
    const finish = ['Missed the playoffs', 'Lost in the Wild Card Round', 'Lost the Conference Championship', 'Lost the Blitz Bowl', 'Blitz Bowl Champions'][uh.po || 0] + (uh.divWin && uh.po < 4 ? ' · Division champs' : '');
    const awardCard = (h, title) => { if (!h) return ''; const ht = L.team(h.team), hp = G.players[h.pid]; return `<div class="card"><div class="kicker mb8" style="color:var(--gold)">${title}</div><div class="flex">${hp ? jersey(hp, 48) : ''}<div class="grow"><div style="font-weight:700;font-size:16px">${esc(h.name)}</div><div class="small muted">${h.pos} · ${tname(ht)}</div><div class="small mt8">${esc(h.line)}</div></div>${logo(ht, 40)}</div></div>`; };
    return `<div class="screen"><div class="topbar"><button class="icon-btn" data-a="openForum">${I.forum}</button><div class="tb-title"><div class="t1">${G.year} Season in review</div><div class="t2">${tfull(u)}</div></div><button class="icon-btn" data-a="toMenu">${I.menu}</button></div>
      <div class="scroll no-tabs">
        <div class="trophy-hero">${confetti}${TROPHY}<div class="kicker" style="color:var(--gold)">${G.year} Blitz Bowl Champions</div><div style="margin:12px auto 8px;width:max-content">${logo(c, 80)}</div><div class="h-lg">${tfull(c)}</div><div class="small muted mt8">${L.recStr(c)} · ${DATA.CONFS[c.conf].long} champions</div></div>
        <div class="card"><div class="kicker mb8">Your season</div><div class="flex">${logo(u, 54)}<div class="grow"><div class="h-md">${finish}</div><div class="small muted">${uh.w}-${uh.l} (${uh.dw}-${uh.dl} division)${uh.seed ? ` · ${DATA.CONFS[u.conf].short} #${uh.seed} seed` : ''} · #${uh.rank} in final power rankings</div></div></div></div>
        ${awardCard(G.awards && G.awards.mvp, 'Most Valuable Player')}${awardCard(G.awards && G.awards.roy, 'Rookie of the Year')}
        <div class="section-title"><h3>Final Power Rankings</h3></div>
        <div class="card flush"><div class="list">${G.poll.slice(0, 10).map((id, i) => { const t = L.team(id); return `<div class="row ${t.user ? 'me' : ''}"><span style="width:24px;font:700 17px/1 var(--f-display)">${i + 1}</span>${logo(t, 30)}<div class="grow"><div class="r1">${tfull(t)}</div><div class="r2">${L.recStr(t)}</div></div>${t.id === G.champion ? '<span class="tag t-gold">Champs</span>' : ''}</div>`; }).join('')}</div></div>
      </div>
      <div class="bottom-cta"><button class="btn btn-primary btn-lg" data-a="startOffseason">Begin the Offseason ${I.chev}</button></div></div>`;
  };
  SCREENS.graduation = () => {
    const o = G.off, u = L.user();
    const list = (arr, empty) => arr.length ? `<div class="card flush"><div class="list">${arr.map(p => `<div class="row">${Logo.jersey(p.num, u.logo.primary, u.logo.secondary, 36)}<div class="grow"><div class="r1">${esc(p.name)}</div><div class="r2">${p.pos} · age ${p.age} · ${p.exp + 1} seasons · ${esc(p.car || p.line)}</div></div>${ovr(p.ovr)}</div>`).join('')}</div></div>` : `<div class="card"><div class="small muted">${empty}</div></div>`;
    const devList = arr => `<div class="card flush"><div class="list">${arr.map(r => { const p = G.players[r.pid]; return p ? `<button class="row tap" style="width:100%;text-align:left" data-a="player" data-v="${p.id}">${jersey(p, 36)}<div class="grow"><div class="r1">${pname(p)}</div><div class="r2">${p.pos} · ${ageExp(p)}</div></div><span class="delta ${r.d < 0 ? 'neg' : ''}">${r.d > 0 ? '+' : ''}${r.d}</span>${ovr(p.ovr)}</button>` : ''; }).join('')}</div></div>`;
    const nd = L.needs(u), picks = L.teamPicks(u.id).filter(k => k.y === G.year);
    return `<div class="screen"><div class="topbar"><button class="icon-btn" data-a="openForum">${I.forum}</button><div class="tb-title"><div class="t1">Offseason ${G.year}</div><div class="t2">Retirements, development & the draft</div></div><button class="icon-btn" data-a="toMenu">${I.menu}</button></div>
      <div class="scroll no-tabs">
        <div class="card"><div class="stat-trio" style="margin:0"><div><b>${o.retired.length}</b><span>Retired</span></div><div><b>${picks.length}</b><span>Draft picks</span></div><div><b>${L.roster(u).length}</b><span>Under contract</span></div></div>
          <button class="btn btn-block mt12" data-a="openTrade">${I.refresh} Trade Center</button></div>
        <div class="section-title"><h3>Biggest risers</h3><span class="tiny muted">Offseason development</span></div>
        ${o.risers.length ? devList(o.risers) : '<div class="card"><div class="small muted">No major jumps this year.</div></div>'}
        ${(o.decliners || []).length ? `<div class="section-title"><h3>Slowing down</h3><span class="tiny muted">Father Time is undefeated</span></div>${devList(o.decliners)}` : ''}
        ${(() => { const mine = (o.stickers || []).filter(x => x.teamId === u.id); return mine.length ? `<div class="section-title"><h3>Badges earned</h3><span class="tiny muted">from last season</span></div><div class="card flush"><div class="list">${mine.map(x => `<div class="row">${stkChip(x, true)}<div class="grow"><div class="r1">${esc(x.name)} <span class="tiny muted">${x.pos}</span></div><div class="r2">${x.kind === 'new' ? 'Earned' : 'Upgraded to'} ${DATA.STICKER_TIERS[x.tier].label} ${DATA.STICKERS[x.id].name}</div></div></div>`).join('')}</div></div>` : ''; })()}
        <div class="section-title"><h3>Retirements</h3></div>${list(o.retired.sort((a, b) => b.ovr - a.ovr), 'Nobody on your roster retired.')}
        <div class="section-title"><h3>Your ${G.year} draft picks</h3></div>
        <div class="card flush"><div class="list">${picks.length ? picks.map(k => `<div class="row"><span class="tag t-accent">R${k.r}</span><div class="grow"><div class="r1">Pick #${L.pickOverall(k)}${k.o !== k.own ? ` <span class="tiny muted">via ${esc(L.team(k.o).abbr)}</span>` : ''}</div><div class="r2">Trade value ${L.pickValue(k).toFixed(1)}</div></div></div>`).join('') : '<div class="row"><div class="small muted">No picks this year.</div></div>'}</div></div>
        <div class="card"><div class="kicker mb8">Draft priorities</div><div class="needs">${nd.slice(0, 5).map(n => `<span class="tag t-bad">${n.pos} · ${n.avg}${n.short ? ' · thin' : ''}</span>`).join('')}</div></div>
      </div>
      <div class="bottom-cta"><button class="btn btn-primary btn-lg" data-a="beginDraft">Enter the ${G.year} Draft ${I.chev}</button></div></div>`;
  };

  // ════════════════ TRADE CENTER ════════════════
  function tradeCard() {
    if (!L.tradeOpen()) return '';
    const last = G.trades[0];
    return `<div class="card"><div class="card-h"><span class="kicker">${I.refresh.replace('<svg', '<svg style="width:15px;height:15px"')} Trade Center</span><span class="tag">${G.phase === 'season' ? `Deadline after Wk ${SEA.DEADLINE}` : 'Window open'}</span></div>
      <div class="small muted mb12">${last ? `Latest: ${esc(L.team(last.a).abbr)} ↔ ${esc(L.team(last.b).abbr)}${(last.aP.concat(last.bP)[0]) ? ` · ${last.aP.concat(last.bP)[0].pos} ${esc(last.aP.concat(last.bP)[0].name)}` : ''}` : 'Shop players and picks with the other 15 front offices.'}</div>
      <button class="btn btn-block" data-a="openTrade">Make a trade ${I.chev}</button></div>`;
  }
  function newOffer(b) { return { b, aP: new Set(), bP: new Set(), aK: new Set(), bK: new Set(), view: 'theirs', pos: 'ALL' }; }
  const offerOf = T => ({ a: G.userTeamId, b: T.b, aP: [...T.aP], bP: [...T.bP], aK: [...T.aK], bK: [...T.bK] });
  // the cheapest thing you could add that gets the deal done
  function sweetener(T) {
    const base = offerOf(T), ev = L.evalTrade(base);
    if (ev.ok || !L.tradeOpen() || (!T.bP.size && !T.bK.size)) return null;
    const cands = [];
    for (const p of L.roster(L.user())) if (!T.aP.has(p.id)) cands.push({ kind: 'p', id: p.id, v: L.tradeValue(p), label: `${p.pos} ${pname(p)}` });
    G.picks.forEach((k, i) => { if (k.own === G.userTeamId && !T.aK.has(i)) cands.push({ kind: 'k', id: i, v: L.pickValue(k), label: esc(L.pickLabel(k)) }); });
    cands.sort((x, y) => x.v - y.v);
    // up to three additions: the cheapest single asset that closes the gap, otherwise the biggest one that doesn't overshoot, and repeat
    const picked = [];
    const withAdds = list => { const o = offerOf(T); for (const c of list) { if (c.kind === 'p') o.aP.push(c.id); else o.aK.push(c.id); } return o; };
    for (let round = 0; round < 3; round++) {
      const left = cands.filter(c => !picked.includes(c));
      const fin = left.find(c => L.evalTrade(withAdds(picked.concat(c))).ok);
      if (fin) { picked.push(fin); return { list: picked, label: picked.map(c => c.label).join(' + ') }; }
      const ev = L.evalTrade(withAdds(picked)), gap = ev.need - ev.bGets;
      const step = left.filter(c => c.v < gap).pop() || left[left.length - 1];
      if (!step) break;
      picked.push(step);
    }
    return null;
  }
  SCREENS.trade = () => {
    const u = L.user(), T = S.trade, B = L.team(T.b), open = L.tradeOpen();
    const ev = L.evalTrade(offerOf(T));
    const partners = G.teams.filter(t => !t.user);
    const assetRow = (p, set, side) => `<button class="row tap ${set.has(p.id) ? 'me' : ''}" style="width:100%;text-align:left" data-a="tradeToggle" data-v="${side}|p|${p.id}">${jersey(p, 34)}<div class="grow"><div class="r1">${pname(p)} ${p.inj > 0 ? `<span class="tag t-bad">Out ${p.inj}w</span>` : ''}${stkRow(p)}</div><div class="r2">${p.pos} · ${ageExp(p)} · POT ${U.potGrade(p.pot)} · value ${L.tradeValue(p).toFixed(1)}</div></div>${ovr(p.ovr)}<span class="trade-check">${set.has(p.id) ? '✓' : '+'}</span></button>`;
    const pickRow = (k, i, set, side) => `<button class="row tap ${set.has(i) ? 'me' : ''}" style="width:100%;text-align:left" data-a="tradeToggle" data-v="${side}|k|${i}"><span class="tag t-accent" style="width:34px;text-align:center">R${k.r}</span><div class="grow"><div class="r1">${esc(L.pickLabel(k))}</div><div class="r2">${k.y === L.nextDraftYear() ? `Projected #${L.pickOverall(k)}` : 'Future pick'} · value ${L.pickValue(k).toFixed(1)}</div></div><span class="trade-check">${set.has(i) ? '✓' : '+'}</span></button>`;
    const chips = (side) => {
      const P = side === 'a' ? T.aP : T.bP, K = side === 'a' ? T.aK : T.bK;
      const items = [...P].map(id => { const p = G.players[id]; return p ? `<button class="chip on" data-a="tradeToggle" data-v="${side}|p|${id}">${p.pos} ${esc(p.last)} ${p.ovr} ✕</button>` : ''; })
        .concat([...K].map(i => `<button class="chip on" data-a="tradeToggle" data-v="${side}|k|${i}">${G.picks[i].y} R${G.picks[i].r} ✕</button>`));
      return items.length ? items.join('') : '<span class="tiny muted">Nothing yet</span>';
    };
    const pct = U.clamp(ev.fair * 100, 0, 140);
    const meterCol = ev.ok ? 'var(--good, #22c55e)' : ev.fair > 0.85 ? '#f59e0b' : '#ef4444';
    const sw = !ev.ok && open ? sweetener(T) : null;
    const listSrc = T.view === 'mine' ? L.roster(u) : L.roster(B);
    const shown = listSrc.filter(p => T.pos === 'ALL' || p.pos === T.pos).sort((a, b) => b.ovr - a.ovr);
    let list;
    if (T.view === 'picks') {
      const mine = G.picks.map((k, i) => ({ k, i })).filter(x => x.k.own === u.id), theirs = G.picks.map((k, i) => ({ k, i })).filter(x => x.k.own === B.id);
      list = `<div class="kicker" style="padding:4px 4px 8px">Your picks</div><div class="card flush"><div class="list">${mine.map(x => pickRow(x.k, x.i, T.aK, 'a')).join('') || '<div class="row small muted">None</div>'}</div></div>
        <div class="kicker" style="padding:4px 4px 8px">${tname(B)} picks</div><div class="card flush"><div class="list">${theirs.map(x => pickRow(x.k, x.i, T.bK, 'b')).join('') || '<div class="row small muted">None</div>'}</div></div>`;
    } else {
      list = `<div class="chips">${['ALL', ...DATA.POSITIONS].map(p => `<button class="chip ${T.pos === p ? 'on' : ''}" data-a="tradePos" data-v="${p}">${p}</button>`).join('')}</div>
        <div class="card flush"><div class="list">${shown.map(p => assetRow(p, T.view === 'mine' ? T.aP : T.bP, T.view === 'mine' ? 'a' : 'b')).join('') || '<div class="row small muted">No players at this position.</div>'}</div></div>`;
    }
    const recent = G.trades.slice(0, 6);
    return `<div class="screen"><div class="topbar"><button class="icon-btn" data-a="tradeExit">${I.back}</button><div class="tb-title"><div class="t1">Trade Center</div><div class="t2">${open ? (G.phase === 'season' ? `Deadline: after Week ${SEA.DEADLINE}` : 'Offseason trade window') : 'Trade window closed'} · ${L.roster(u).length}/${L.rosterLimit()} players</div></div></div>
      <div class="scroll no-tabs">
        <div class="logo-strip trade-partners">${partners.map(t => `<button class="tp ${t.id === T.b ? 'on' : ''}" data-a="tradePartner" data-v="${t.id}">${logo(t, 34)}<span>${esc(t.abbr)}</span></button>`).join('')}</div>
        <div class="card"><div class="flex between mb8"><div class="flex">${logo(B, 30)}<div><div style="font-weight:700">${tfull(B)}</div><div class="tiny muted">${L.recStr(B)} · ${esc(L.divName(B))} · needs ${L.needs(B).slice(0, 3).map(n => n.pos).join(', ')}</div></div></div><button class="link" data-a="team" data-v="${B.id}">Team</button></div>
          <div class="trade-sides"><div><div class="kicker mb8">You send</div><div class="chips" style="margin:0">${chips('a')}</div></div><div><div class="kicker mb8">You receive</div><div class="chips" style="margin:0">${chips('b')}</div></div></div>
          <div class="trade-meter mt12"><i style="width:${(pct / 1.4).toFixed(1)}%;background:${meterCol}"></i><b style="left:${(100 / 1.4).toFixed(1)}%"></b></div>
          <div class="small mt8 ${ev.ok ? 'good' : 'muted'}">${ev.ok ? `${tname(B)} would accept this deal.` : esc(ev.why)}</div>
          ${ev.thin.length && (T.aP.size || T.bP.size) ? `<div class="tiny muted mt8">You'd be short at ${ev.thin.join(', ')} — an undrafted free agent fills in.</div>` : ''}
          ${sw ? `<button class="btn btn-sm mt8" data-a="tradeSweeten" data-v="${sw.list.map(c => c.kind + ':' + c.id).join(',')}">They'd take it if you add ${sw.label}</button>` : ''}
          <div class="btn-row mt12"><button class="btn" data-a="tradeClear">Clear</button><button class="btn btn-primary" data-a="tradePropose" ${ev.ok ? '' : 'disabled'}>Propose trade</button></div></div>
        <div class="seg"><button class="${T.view === 'theirs' ? 'on' : ''}" data-a="tradeView" data-v="theirs">Their roster</button><button class="${T.view === 'mine' ? 'on' : ''}" data-a="tradeView" data-v="mine">Your roster</button><button class="${T.view === 'picks' ? 'on' : ''}" data-a="tradeView" data-v="picks">Draft picks</button></div>
        ${list}
        ${recent.length ? `<div class="section-title"><h3>Recent trades</h3></div><div class="card flush"><div class="list">${recent.map(r => { const a = L.team(r.a), b = L.team(r.b), got = x => x.P.map(p => `${p.pos} ${esc(p.name)}`).concat(x.K.map(k => `${k.y} R${k.r}`)).join(', ') || '—'; return `<div class="row">${logo(a, 26)}<div class="grow"><div class="r1">${esc(a.abbr)} get ${got({ P: r.bP, K: r.bK })}</div><div class="r2">${esc(b.abbr)} get ${got({ P: r.aP, K: r.aK })} · ${r.wk ? `Wk ${r.wk}` : 'Offseason'} ${r.year}</div></div>${logo(b, 26)}</div>`; }).join('')}</div></div>` : ''}
      </div></div>`;
  };

  // ════════════════ ACTIONS ════════════════
  const A = {};
  A.closeSheet = () => closeSheet();
  A.toMenu = () => { if (S.game) { clearTimeout(S.game.wait); clearInterval(S.game.clockIv); Live.unmount(); S.game = null; } if (G) L.save(); S.screen = 'menu'; closeSheet(); render(); };
  A.continue = () => { S.screen = screenForPhase(); S.tab = 'home'; render(); };
  A.newCareer = () => {
    if (G && G.teams && G.teams.length) return confirmSheet('Start a new career?', 'Your current save will be replaced. This cannot be undone.', 'Start fresh', 'confirmNew', true);
    A.confirmNew();
  };
  A.confirmNew = () => { closeSheet(); initCreate(); S.screen = 'create'; render(); };
  A.settings = () => sheet(`<div class="h-lg mb12">Settings</div><div class="kicker mb8">Theme</div>${themePicker((G && G.settings.theme) || localStorage.getItem('cfbblitz.theme') || 'night')}<div class="small muted mt12">Your team colors become the accent color once your franchise is created.</div>`);
  A.theme = v => {
    localStorage.setItem('cfbblitz.theme', v);
    if (G && G.settings) { G.settings.theme = v; L.save(); }
    if (S.create) S.create.theme = v;
    const sheetOpen = document.getElementById('sheet-root').innerHTML;
    render();
    if (sheetOpen && S.screen === 'menu') A.settings();
  };

  // create
  A.createBack = () => { S.create.step--; render(); };
  A.createNext = () => {
    const c = S.create;
    if (c.step === 0) {
      if (!c.name.trim() || !c.mascot.trim()) { toast('Give your franchise a city and a nickname.'); return; }
      if (!c.abbr.trim()) c.abbr = suggestAbbr(c.name);
      c.abbr = c.abbr.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'USR';
      if (c.aiTeams.some(s => s.abbr === c.abbr)) c.abbr = (c.abbr.slice(0, 2) + 'X').slice(0, 4);
    }
    c.step++; render();
  };
  A.idea = v => { const [n, m] = v.split('|'); Object.assign(S.create, { name: n, mascot: m, abbr: suggestAbbr(n), abbrEdited: false }); render(); };
  A.logoSet = v => {
    const [k, val] = v.split(':');
    const lg = S.brandCtx === 'program' ? L.user().logo : S.create.logo;
    lg[k] = val;
    if (S.brandCtx === 'program') { L.save(); render(); A.brandSheet(); } else render();
  };
  A.logoRandom = () => {
    const lg = S.brandCtx === 'program' ? L.user().logo : S.create.logo;
    const cols = U.shuffle(DATA.COLORS.slice());
    let p = cols[0].hex, s = cols.find(c => Math.abs(U.lum(c.hex) - U.lum(p)) > 0.25).hex;
    Object.assign(lg, { shape: U.pick(Object.keys(Logo.SHAPES)), icon: U.pick(Object.keys(Logo.ICONS)), primary: p, secondary: s });
    if (S.brandCtx === 'program') { L.save(); render(); A.brandSheet(); } else render();
  };
  A.cfgSet = v => { const [k, val] = v.split(':'); S.create[k] = k === 'div' ? +val : val; render(); };
  A.createFinish = () => {
    const c = S.create;
    localStorage.setItem('cfbblitz.theme', c.theme);
    L.newCareer({ name: c.name.trim(), mascot: c.mascot.trim(), abbr: c.abbr, logo: { ...c.logo }, letter: c.name.trim()[0], div: c.div, difficulty: c.difficulty, aiTeams: c.aiTeams, theme: c.theme });
    S.brandCtx = null; S.create = null;
    S.draft = { pos: 'ALL', view: 'board', fast: false };
    S.screen = 'draft';
    render();
    toast('Welcome, GM. The Inaugural Draft is underway.');
  };
  A.bind = el => {
    const c = S.create;
    if (!c) return;
    const k = el.dataset.bind;
    c[k] = el.value;
    if (k === 'abbr') c.abbrEdited = !!el.value;
    if (k === 'name' && !c.abbrEdited) { c.abbr = ''; const ab = document.querySelector('[data-bind="abbr"]'); if (ab) ab.placeholder = suggestAbbr(el.value) || 'RIV'; }
    const pv = document.getElementById('cpv');
    if (pv) pv.innerHTML = createPreview();
  };

  // hub
  A.tab = v => { S.tab = v; if (v === 'forum') { G.forumUnread = 0; S.forumThread = null; L.save(); } closeSheet(); render(); };
  A.setPlan = v => { const [k, val] = v.split(':'); G.plan[k] = val; L.save(); render(); };
  A.practiceSheet = () => practiceSheet();
  A.setPractice = v => { G.practice = v; L.save(); closeSheet(); render(); toast(`Practice focus: ${DATA.groupById(v).label}`); };
  A.playGame = () => startLiveGame();
  A.quickSim = () => {
    const g = L.userGame();
    if (!g) return;
    const gs = L.createUserGame(g);
    gs.askFourth = false;
    Engine.simToEnd(gs);
    const res = L.applyResult(g, gs);
    L.finishWeek(res);
    S.final = { g, res };
    S.screen = 'final';
    render();
  };
  A.simWeek = () => {
    const wk = G.week;
    L.finishWeek(null);
    if (G.phase === 'recap') { S.screen = 'recap'; render(); return; }
    render();
    toast(`${DATA.WEEK_LABEL(wk)} is final — check BlitzBoard`);
  };
  A.player = v => playerSheet(+v);
  A.team = v => teamSheet(+v);
  A.box = v => boxSheet(v);
  A.depth = v => { const [pid, dir] = v.split('|').map(Number); const p = G.players[pid]; const u = L.user(); if (L.moveDepth(u, p.pos, pid, dir)) { L.save(); render(); playerSheet(pid); } };
  A.autoDepth = v => { const [pos, pid] = v.split('|'); L.setAutoDepth(L.user(), pos); L.save(); render(); playerSheet(+pid); };
  A.rosterPos = v => { S.rosterPos = v; render(); };
  A.seasonTab = v => { S.seasonTab = v; render(); };
  A.scoresWeek = v => { S.scoresWeek = +v; render(); };
  A.brandSheet = () => { S.brandCtx = 'program'; const u = L.user(); sheet(`<div class="center mb12">${Logo.svg(u.logo, 110)}<div class="h-md mt8">${tfull(u)}</div></div>${brandEditor(u.logo)}`); };
  A.toggleCalls = () => { G.settings.callPlays = G.settings.callPlays === false; L.save(); render(); };
  A.toggleFourth = () => { G.settings.askFourth = !G.settings.askFourth; L.save(); render(); };
  A.defSpeed = v => { G.settings.speed = +v; L.save(); render(); };
  A.askWipe = () => confirmSheet('Start a new career?', 'This permanently deletes your current franchise and all of its history.', 'Delete & restart', 'confirmWipe', true);
  A.confirmWipe = () => { L.wipe(); closeSheet(); initCreate(); S.screen = 'create'; render(); };

  // forum
  A.forumIssue = v => { S.forumIssue = v; S.forumThread = null; render(); };
  A.openThread = v => {
    const [key, id] = v.split('|');
    S.forumIssue = key; S.forumThread = +id;
    if (S.screen === 'hub') { S.tab = 'forum'; G.forumUnread = 0; }
    closeSheet(); render();
  };
  A.forumBack = () => { S.forumThread = null; render(); };
  A.forumTop = () => { const sc = $app().querySelector('.bb-scroll'); if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' }); };
  A.forumSort = v => { S.forumSort = v; render(); };
  A.openForum = () => { S.forumBack = S.screen; S.forumThread = null; S.forumIssue = null; G.forumUnread = 0; S.screen = 'forum'; render(); };
  A.forumExit = () => { S.screen = S.forumBack || screenForPhase(); render(); };
  A.finalForum = () => { S.screen = 'hub'; S.tab = 'forum'; S.forumIssue = null; S.forumThread = null; G.forumUnread = 0; render(); };

  // draft
  A.draftPos = v => { S.draft.pos = v; render(); };
  A.draftView = v => { S.draft.view = v; render(); };
  A.prospect = (v, el, e) => { if (e.target.closest('[data-a="draftPick"]')) return; prospectSheet(+v); };
  A.draftPick = v => {
    const cur = L.draftCur();
    if (!cur || !L.isUser(cur.teamId)) return;
    const p = G.players[+v];
    L.draftPick(+v);
    L.save();
    closeSheet();
    toast(`Selected ${p.pos} ${pname(p)}`);
    U.vibrate(20);
    render();
  };
  A.autoPick = () => { const pid = L.bestPickFor(L.user(), 0); if (pid) A.draftPick(pid); };
  A.draftFast = () => { S.draft.fast = true; render(); };
  A.toCamp = () => { S.camp = { side: null, group: null, intensity: 'standard', result: null }; S.screen = 'camp'; render(); };

  // camp
  A.campSide = v => { S.camp.side = v; if (S.camp.group && DATA.sideOfGroup(S.camp.group) !== v) S.camp.group = null; render(); };
  A.campGroup = v => { S.camp.group = v; render(); };
  A.campInt = v => { S.camp.intensity = v; render(); };
  A.runCamp = () => {
    const sc = S.camp, session = G.camp.session;
    const res = L.runCamp(sc.group, sc.intensity);
    sc.result = { res, groupId: sc.group, session };
    S.lastKey = '';
    render();
    const inj = res.filter(r => r.injured).length;
    if (inj) toast(`${inj} player${inj > 1 ? 's' : ''} picked up a knock in camp`);
  };
  A.campNext = () => { S.camp = { side: null, group: null, intensity: 'standard', result: null }; S.lastKey = ''; render(); };
  A.startSeason = () => { L.startSeason(); S.screen = 'hub'; S.tab = 'home'; render(); const n = (G.cuts || []).length; toast(n ? `Cut-down day: ${n} player${n > 1 ? 's' : ''} released. The ${G.year} season is here.` : `The ${G.year} season is here. Preseason power rankings are out on BlitzBoard.`); };

  // game
  A.gplan = v => {
    const [k, val] = v.split(':');
    const gs = S.game.gs;
    gs.plan[gs.userSide][k] = val;
    G.plan[k] = val;
    const ht = document.getElementById('htplan');
    if (ht) ht.innerHTML = planPicker(gs.plan[gs.userSide], 'gplan');
  };
  A.gplanSheet = () => {
    const gs = S.game.gs;
    sheet(`<div class="h-lg">Game plan</div><div class="small muted mb12" style="margin-top:4px">Your coordinators call plays from this plan on auto, and their suggestions lean on it when you call.</div><div id="htplan">${planPicker(gs.plan[gs.userSide], 'gplan')}</div>
      <div class="divider"></div><div class="flex between"><div><div style="font-weight:700">Call every play</div><div class="small muted">Off = coordinators call, you watch (4th downs still ask if enabled)</div></div><button class="toggle ${S.game.auto ? '' : 'on'}" data-a="gauto"></button></div>
      <div class="divider"></div><div class="flex between"><div><div style="font-weight:700">4th-down decisions</div><div class="small muted">On auto-call, still ask me on 4th down</div></div><button class="toggle ${G.settings.askFourth ? 'on' : ''}" data-a="gfourth"></button></div>`);
  };
  A.gauto = () => {
    const st = S.game;
    st.auto = !st.auto;
    G.settings.callPlays = !st.auto; L.save();
    st.gs.userCalls = !st.auto;
    const tg = document.querySelector('.sheet [data-a="gauto"]');
    if (tg) tg.classList.toggle('on', !st.auto);
    if (st.auto && st.need) { stopClock(); makeCall(st.sugg || suggestion()); }
    toast(st.auto ? 'Auto-call on — your coordinators have the headset' : 'You have the headset — call every snap');
  };
  A.gcall = v => makeCall(v);
  A.gpbTab = v => { const st = S.game; st.pbTab = v; renderPanel(); };
  A.gflip = () => { const st = S.game; st.flip = !st.flip; renderPanel(); };
  A.gfourth = () => { G.settings.askFourth = !G.settings.askFourth; S.game.gs.askFourth = G.settings.askFourth; L.save(); const tg = document.querySelector('.sheet [data-a="gfourth"]'); if (tg) tg.classList.toggle('on', G.settings.askFourth); };
  A.gtab = v => { S.game.tab = v; pbpSheet(); };
  A.gpbp = () => pbpSheet();
  A.gpause = () => A.gspeed('pause');
  A.gspeedNext = () => { const order = [1, 2, 4, 8]; A.gspeed(String(order[(order.indexOf(S.game.speed) + 1) % order.length])); toast(`Game speed ${S.game.speed}x`, 900); };
  A.gmenu = () => {
    const st = S.game;
    sheet(`<div class="h-lg mb12">Game menu</div>
      <div class="menu-list">
        <button class="menu-item" data-a="gmenuPause">${st.paused ? I.play : I.pause}<span>${st.paused ? 'Resume game' : 'Pause game'}</span></button>
        <button class="menu-item" data-a="gpbp">${I.msg}<span>Play-by-play & stats</span></button>
        <button class="menu-item" data-a="gplanSheet">${I.gear}<span>Game plan & play calling</span></button>
        <button class="menu-item" data-a="gsim">${I.ff}<span>Sim to the final whistle</span></button>
        <button class="menu-item danger" data-a="gquit">${I.back}<span>Exit to main menu</span></button>
      </div>`);
  };
  A.gmenuPause = () => { A.gspeed('pause'); closeSheet(); };
  A.gquit = () => confirmSheet('Leave this game?', 'The game will not count. You can play it again from the Home screen.', 'Leave game', 'toMenu', true);
  A.gspeed = v => {
    const st = S.game;
    if (v === 'pause') st.paused = !st.paused;
    else { st.speed = +v; st.paused = false; }
    Live.setSpeed(st.speed); Live.setPaused(st.paused);
    const dk = document.getElementById('dock'); if (dk) dk.innerHTML = dockHTML();
    if (!st.paused && st.resume) { const fn = st.resume; st.resume = null; fn(); }
  };
  A.gsim = () => { if (!S.game.done) simLiveToEnd(); };
  A.secondHalf = () => { closeSheet(); const st = S.game; st.paused = false; Live.setPaused(false); document.getElementById('dock').innerHTML = dockHTML(); later(gNext, 300); };
  A.gameFinal = () => { Live.unmount(); S.game = null; S.screen = 'final'; render(); };
  A.finalContinue = () => {
    S.final = null;
    if (G.phase === 'recap') { S.screen = 'recap'; render(); return; }
    S.screen = 'hub'; S.tab = 'home'; render();
    if (G.forumUnread) toast(`${I.forum.replace('<svg', '<svg style="width:16px;height:16px;color:var(--accent)"')} New posts on BlitzBoard`);
  };

  // offseason
  A.startOffseason = () => { L.startOffseason(); S.screen = 'graduation'; render(); };
  // trade center
  const openTradeWith = (b, fn) => { S.tradeBack = S.tradeBack && S.screen === 'trade' ? S.tradeBack : { screen: S.screen, tab: S.tab }; S.trade = newOffer(b); if (fn) fn(S.trade); closeSheet(); S.screen = 'trade'; render(); };
  A.openTrade = () => { const best = G.teams.filter(t => !t.user).sort((a, b) => L.rank(a.id) - L.rank(b.id))[0]; openTradeWith(S.trade ? S.trade.b : best.id); };
  A.tradeWith = v => openTradeWith(+v);
  A.tradeFor = v => { const p = G.players[+v]; openTradeWith(p.teamId, T => { T.bP.add(p.id); T.view = 'mine'; }); };
  A.tradeAway = v => { const p = G.players[+v]; const b = G.teams.filter(t => !t.user).sort((x, y) => (L.needs(x).findIndex(n => n.pos === p.pos)) - (L.needs(y).findIndex(n => n.pos === p.pos)))[0]; openTradeWith(b.id, T => { T.aP.add(p.id); T.view = 'theirs'; }); };
  A.tradePartner = v => { const T = S.trade; S.trade = { ...newOffer(+v), aP: T.aP, aK: T.aK, view: T.view, pos: T.pos }; render(); };
  A.tradeView = v => { S.trade.view = v; render(); };
  A.tradePos = v => { S.trade.pos = v; render(); };
  A.tradeToggle = v => { const [side, kind, id] = v.split('|'); const set = S.trade[side + (kind === 'p' ? 'P' : 'K')]; const k = +id; if (set.has(k)) set.delete(k); else set.add(k); render(); };
  A.tradeSweeten = v => { for (const x of v.split(',')) { const [k, id] = x.split(':'); (k === 'p' ? S.trade.aP : S.trade.aK).add(+id); } render(); };
  A.tradeClear = () => { S.trade = newOffer(S.trade.b); render(); };
  A.tradePropose = () => {
    const o = offerOf(S.trade), ev = L.evalTrade(o);
    if (!ev.ok) { toast(esc(ev.why)); return; }
    L.executeTrade(o);
    const B = L.team(o.b);
    S.trade = newOffer(o.b);
    render();
    toast(`${I.refresh.replace('<svg', '<svg style="width:16px;height:16px;color:var(--accent)"')} Deal done with ${esc(B.name)}`);
    U.vibrate(25);
  };
  A.tradeExit = () => { const b = S.tradeBack || { screen: 'hub', tab: 'roster' }; S.screen = b.screen === 'trade' ? 'hub' : b.screen; S.tab = b.tab || 'home'; S.tradeBack = null; render(); };
  A.askRelease = v => { const p = G.players[+v]; S.releasePid = +v; confirmSheet(`Release ${pname(p)}?`, `${p.pos} · ${p.ovr} OVR · age ${p.age}. He'll leave the league and can't be brought back.`, 'Release', 'confirmRelease', true); };
  A.confirmRelease = () => { const p = G.players[S.releasePid]; const name = p ? pname(p) : ''; L.release(S.releasePid); closeSheet(); render(); toast(`Released ${name}`); };

  A.beginDraft = () => { L.beginAnnualDraft(); S.draft = { pos: 'ALL', view: 'board', fast: false }; S.screen = 'draft'; render(); };

  // ── event wiring ──
  function wire() {
    document.addEventListener('click', e => {
      const bg = e.target.classList && e.target.classList.contains('sheet-bg');
      if (bg && e.target.dataset.sheetbg !== 'locked') { closeSheet(); return; }
      const el = e.target.closest('[data-a]');
      if (!el) return;
      const fn = A[el.dataset.a];
      if (fn) { e.preventDefault(); fn(el.dataset.v, el, e); }
    });
    document.addEventListener('input', e => { const el = e.target.closest('[data-bind]'); if (el) A.bind(el); });
    // iOS: stop swipes from leaking past an open sheet (backdrop, or the sheet already at its scroll limit)
    let touchY = 0;
    document.addEventListener('touchstart', e => { touchY = e.touches[0] ? e.touches[0].clientY : 0; }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!document.body.classList.contains('sheet-open') || !e.touches[0]) return;
      const sh = e.target.closest && e.target.closest('.sheet');
      if (!sh) { if (e.cancelable) e.preventDefault(); return; }
      const dy = e.touches[0].clientY - touchY;
      const atTop = sh.scrollTop <= 0, atBottom = sh.scrollTop + sh.clientHeight >= sh.scrollHeight - 1;
      const sideways = e.target.closest('.gtabs, .pb-tabs, .call-scroll, .stk-row');
      if (!sideways && ((dy > 0 && atTop) || (dy < 0 && atBottom)) && e.cancelable) e.preventDefault();
    }, { passive: false });
    window.addEventListener('resize', () => { if (S.screen === 'game') Live.resize(); });
    const persist = () => { if (G) L.save(); };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
  }

  return { S, render, wire, toast };
})();
