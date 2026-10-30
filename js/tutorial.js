'use strict';
// ── TUTORIAL: coach-mark popups ───────────────────────────────────
// Each chapter fires the first time its screen or game situation comes up: a dimmed screen with the
// relevant control spotlighted and a card explaining it, stepped through with Next. During a live game
// the action (and the play clock) holds while a tip is up. Seen chapters are remembered on the device;
// Settings can turn tips off or start them over, and some chapters (like Edge) can be opened on demand.

const Tutorial = (() => {
  const KEY = 'problitz.tut';
  let st = load(), cur = null, timer = 0;
  function load() { try { return { seen: {}, off: false, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) { return { seen: {}, off: false }; } }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage full */ } };

  const S = () => UI.S;
  const on = (screen, tab) => S().screen === screen && (!tab || S().tab === tab);
  const game = () => S().screen === 'game' && S().game;
  const calling = need => { const g = game(); return g && !g.done && g.mode === 'call' && g.need === need && !g.panelMin && !!document.querySelector('#callpanel.show .call-card'); };

  const EDGE = [
    { target: '.cc-edge', title: 'What the Edge number means', text: 'Edge sizes up how each type of play matches your players against theirs right now. Runs inside and outside: your blockers and back against their front. Quick passes: receivers against defensive backs, plus your QB\'s accuracy. Downfield: receiver speed against their deep coverage, your protection against their pass rush, and the weather. Screens: your back against their linebackers.' },
    { target: '.cc-edge', title: 'Reading the number', text: 'The numbers are relative to your other options on this snap, so they center around zero. Best look is +3 or more. Edge is +1 to +3, Even is near 0, and Tough is −1 or lower. Play action gets a bump once you\'ve been running the ball. Fatigue, injuries, home field and your coordinators all feed in.' },
    { target: '.cc-edge', title: 'A read, not a guarantee', text: 'Edge doesn\'t know which defense they\'ve called. A Best-look deep shot can still run into a perfect coverage call, and down, distance and the clock matter too. Use it to spot mismatches, then mix in the defense\'s tendencies shown above the plays. Tap ? on the play panel any time to see this again.' },
  ];

  // chapters, in priority order: the first unseen one whose moment has come is shown
  const CH = [
    { id: 'welcome', when: () => on('menu') && !(G && G.teams && G.teams.length), steps: [
      { target: '[data-a="newCareer"]', title: 'Welcome to Pro Blitz', text: 'You\'re the general manager of a brand-new pro football franchise. You\'ll draft, trade, sign free agents, hire coaches and call plays on game day. These tips walk you through it the first time each thing comes up. Tap New Career to begin.' },
    ] },
    { id: 'create', when: () => on('create'), steps: [
      { title: 'Build your franchise', text: 'Pick a city and nickname, then design a logo and colors. Your colors become the app\'s accent. Next choose a division, then a difficulty: Dynasty starts stacked, Contender is a playoff-caliber team, and Rebuild means thin depth and an aging core.' },
    ] },
    { id: 'draft', when: () => on('draft') && G && G.draft && !!document.querySelector('.clock-card'), steps: [
      { target: '.clock-card', title: 'The draft', text: 'This card shows who\'s on the clock. When it\'s someone else, the fast-forward button skips ahead to your next pick. When it\'s you, pick a player from the board, or tap Auto to take the best player for your needs.' },
      { target: '.seg', title: 'Board, Combine, My picks, Needs', text: 'The Board ranks prospects by your scouts\' view. Combine shows workout numbers. My picks lists your class so far, and Needs shows which positions your current starters are weakest at.' },
      { target: '[data-a="prospect"]', title: 'Scouting prospects', text: 'Tap a prospect for his card. A ~ before a rating means it\'s an estimate. Spend scouting points to narrow it. A fully scouted player also comes with a scouts\' note that hints whether he could boom or bust. When you\'re on the clock, the Draft button is on his card.' },
    ] },
    { id: 'draftDone', when: () => on('draftDone'), steps: [
      { title: 'Your draft class', text: 'BlitzBoard grades every team\'s draft. A rookie\'s true rating is revealed once he signs: better than your scouts said is a steal, worse is a bust. Two seasons later every class is re-graded on how the players actually turned out.' },
    ] },
    { id: 'camp', when: () => on('camp'), steps: [
      { title: 'Training camp', text: 'Camp is a series of sessions. Each time, choose a position group and an intensity. Harder sessions build more but risk injuries. Young, high-potential players gain the most, and a great camp can earn a badge. Finish camp to start the season.' },
    ] },
    { id: 'home', when: () => on('hub', 'home') && G && G.phase === 'season' && !!document.querySelector('.hero-card'), steps: [
      { target: '.hero-card', title: 'Your team at a glance', text: 'Record, overall rating, offense/defense ratings and your current streak. Overall comes from your starters at every position.' },
      { target: '[data-a="playGame"]', title: 'Play or sim', text: 'Play Game puts you on the sideline: the game plays out live and you call the plays. Sim gets you the result instantly. Your first live game comes with a walkthrough.' },
      { target: '[data-a="planSheet"]', title: 'Game plan', text: 'Your playbook and offensive and defensive tendencies. Your coordinators follow it whenever they call plays for you.' },
      { target: '[data-a="practiceSheet"]', title: 'Weekly practice', text: 'Choose a position group to get extra reps each week. Players develop week by week during the season: young players climb, veterans slowly decline, and badges come from milestones, breakout years and Player of the Week honors.' },
      { target: '.tabbar', title: 'Getting around', text: 'Roster has your depth chart and player cards. Season has the schedule, standings and stats. BlitzBoard is the league\'s fan forum, where every story lands. Franchise covers history, your coaching staff, rivalries, achievements and settings.' },
    ] },
    { id: 'owner', when: () => on('hub', 'home') && !!document.querySelector('.owner-card'), steps: [
      { target: '.owner-card', title: 'The Hot Seat', text: 'The owner set these goals for the season. Each one shows its progress: ✓ met, ✕ missed, ○ still in play. When the season ends, met goals raise your job security and misses lower it. If it hits zero, you\'re fired and pick a new job from the teams that call.' },
    ] },
    { id: 'roster', when: () => on('hub', 'roster'), steps: [
      { title: 'Roster & depth chart', text: 'Starters are listed first at each position. Tap any player for his ratings, badges, contract and stats. From his card you can move him up or down the depth chart, shop him in a trade or release him.' },
      { title: 'Archetypes', text: 'Every player has an archetype, like Pass Rusher, Possession Receiver or Box Safety. It\'s set when he enters the league and never changes. It decides which badges he can earn and which ratings he grows fastest in. His card shows the badges he has and the ones still to earn.' },
    ] },
    { id: 'season', when: () => on('hub', 'season'), steps: [
      { title: 'The season', text: 'Fourteen games, then four teams from each conference make the playoffs: two division winners and two wild cards. Win the conference title to reach the Blitz Bowl. This tab has the schedule, standings, power rankings and league leaders.' },
    ] },
    { id: 'forum', when: () => S().screen === 'hub' && S().tab === 'forum', steps: [
      { title: 'BlitzBoard', text: 'The league\'s fan forum. Every week brings scores, upsets, trades, injuries, Players of the Week and rivalry trash talk, and the fans have opinions about your moves. Threads about your team are highlighted.' },
    ] },
    { id: 'program', when: () => on('hub', 'program') && !!document.querySelector('.coach-row'), steps: [
      { target: '.coach-row', title: 'Coaching staff', text: 'Your coordinators lift their side of the ball on game day, most of all their specialty. Your development coach shapes how fast players grow. You can hire and fire coaches between seasons, and successful coordinators can get hired away.' },
      { target: '.ach-strip', title: 'Rivalries & achievements', text: 'Close games and playoff meetings heat up rivalries. Rivalry games get louder crowds and plenty of forum noise. Achievements are saved on this device and carry over to new careers.' },
    ] },

    // ── the first live game ──
    { id: 'game', when: () => { const g = game(); return g && !g.done && !!document.querySelector('.scorebug') && g.mode !== 'call'; }, steps: [
      { target: '.scorebug', title: 'Your first game', text: 'The scoreboard shows the score, quarter and clock, and the down and distance underneath. The colored bar along the bottom is each team\'s chance to win, updated after every play.' },
      { target: '#live', title: 'The field', text: 'Every play is acted out live: blocks, routes, tackles, broken tackles and turnovers. The play calls show up at the top of the field during the snap, and the result appears just under the field.' },
      { target: '#dock', title: 'Game controls', text: 'Plays opens the play-by-play, player stamina and stats. Pause and Speed control the action. Settings changes your game plan or hands play-calling to your coordinators. Sim skips to the final whistle.' },
    ] },
    { id: 'callOff', when: () => calling('off'), steps: [
      { target: '.call-head', title: 'Your call: offense', text: 'This line shows the down, distance, field position and clock. Watch the play clock: if it runs out, your offensive coordinator calls the play for you.' },
      { target: '.call-intel', title: 'Scouting the defense', text: 'How often they\'ve been blitzing, and what they showed on the last snap. Blitz-happy defenses are vulnerable to screens and quick passes.' },
      { target: '.call-card.sugg', title: 'The OC\'s pick', text: 'Your coordinator\'s suggestion for this situation. OC Picks pairs it with the best-looking play from each other family. The formation tabs list every play in your playbook, and Special has field goals and punts on fourth down.' },
      { target: '.cc-edge', title: 'The Edge number', text: 'Every play card shows an Edge: how well this type of play matches your players against theirs right now. Next: what the numbers mean.' },
      ...EDGE,
      { target: '.pb-flip', title: 'Flip and collapse', text: 'Flip mirrors the play to the other side of the field. The ▾ button shrinks this panel so you can watch the field, and it keeps a one-tap button for the coordinator\'s pick. Now tap a play to call it.' },
    ] },
    { id: 'callDef', when: () => calling('def'), steps: [
      { target: '.call-intel', title: 'Your call: defense', text: 'Their run/pass split so far, their last play, and their most dangerous player. Use it to guess what\'s coming.' },
      { target: '.pb-tabs', title: 'Zone, man or blitz', text: 'Zone keeps everything in front of you and stops big plays. Man coverage sticks to receivers but can get beaten deep. Blitzes send extra rushers for sacks but leave holes behind them. The DC\'s pick is a solid default.' },
    ] },
    { id: 'fourth', when: () => calling('off') && S().game.gs.down === 4 && !!document.querySelector('[data-a="gcall"][data-v="fg"], [data-a="gcall"][data-v="punt"]'), steps: [
      { target: '[data-a="gcall"][data-v="fg"], [data-a="gcall"][data-v="punt"]', title: 'Fourth down', text: 'Kick a field goal (the make chance is on the card), punt to pin them deep, or go for it with any offensive play. Turning it over on downs hands them the ball right there.' },
    ] },
    { id: 'final', when: () => { const g = game(); return g && g.done && !!document.querySelector('#finalcta.show'); }, steps: [
      { target: '#finalcta', title: 'Final whistle', text: 'Tap here for the box score and recap. After every week, players develop, badges are handed out, Players of the Week are named and the top three plays make the highlight reel on your home screen.' },
    ] },

    // ── the offseason ──
    { id: 'offseason', when: () => on('graduation'), steps: [
      { title: 'The offseason', text: 'Veterans retire, contracts expire and your staff may change. The coaching market is open until Week 1. Next comes free agency, then the draft, then camp. This screen recaps your roster\'s season.' },
    ] },
    { id: 'fa', when: () => on('fa'), steps: [
      { title: 'Free agency', text: 'Unsigned players ask for a salary and contract length. Offer close to their ask and they\'ll sign. Asking prices drop each day, but other teams sign players too. Every contract counts against the salary cap.' },
    ] },
    { id: 'trade', when: () => on('trade'), steps: [
      { title: 'Trades', text: 'Add players and draft picks to each side. The other team accepts if the value works for them, and they care about their needs and cap room as well as ratings. The trade deadline is in Week 9.' },
    ] },
  ];
  const CHAPTERS = Object.fromEntries(CH.map(c => [c.id, c]));

  // ── showing a chapter ──
  function check() {
    clearTimeout(timer);
    if (st.off || cur) return;
    // let the screen's own entrance animation settle before measuring anything
    timer = setTimeout(() => {
      if (st.off || cur || document.querySelector('#sheet-root .sheet-bg:not(.closing)')) return;
      const ch = CH.find(c => !st.seen[c.id] && safe(c.when));
      if (ch) open(ch, false);
    }, 450);
  }
  const safe = fn => { try { return !!fn(); } catch (e) { return false; } };
  // on-demand help (the ? on the play panel): shown even if seen before or tips are off
  function help(id) {
    if (cur) return;
    const ch = id === 'edge' ? { id: 'edge', steps: EDGE } : CHAPTERS[id];
    if (ch) open(ch, true);
  }
  function open(ch, manual) {
    // a step whose control isn't on screen (say, no game this week) still shows, just without the spotlight
    cur = { ch, steps: ch.steps, i: 0, manual };
    UI.holdGame(true);
    const root = document.getElementById('tut-root');
    root.classList.add('show');
    draw();
  }
  function draw() {
    const root = document.getElementById('tut-root'), s = cur.steps[cur.i], n = cur.steps.length;
    const el = s.target ? document.querySelector(s.target) : null;
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // the dimming is four panels around the spotlight (or one full panel when there's nothing to point at)
    root.innerHTML = `${el ? '<div class="tut-shade" data-s="t"></div><div class="tut-shade" data-s="b"></div><div class="tut-shade" data-s="l"></div><div class="tut-shade" data-s="r"></div><div class="tut-spot"></div>' : '<div class="tut-shade" style="inset:0"></div>'}
      <div class="tut-card" role="dialog" aria-live="polite">
        <div class="tut-k">${n > 1 ? `Tip ${cur.i + 1} of ${n}` : 'Tip'}</div>
        <div class="tut-t">${s.title}</div><div class="tut-x">${s.text}</div>
        <div class="tut-btns">${cur.manual ? '<span></span>' : '<button class="tut-skip" data-tut="off">Turn off tips</button>'}<button class="btn btn-primary btn-sm" data-tut="next">${cur.i < n - 1 ? 'Next' : 'Got it'}</button></div>
      </div>`;
    // keep the spotlight on its target while panels slide in and the screen settles underneath
    const want = cur, step = s;
    let last = '';
    const follow = () => {
      if (cur !== want || cur.steps[cur.i] !== step) return;
      const r = el ? el.getBoundingClientRect() : null, key = r ? `${r.left|0},${r.top|0},${r.width|0},${r.height|0}` : 'none';
      if (key !== last) { last = key; place(el); }
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }
  // spotlight the target and put the card on whichever side has more room
  function place(el) {
    const root = document.getElementById('tut-root');
    const card = root.querySelector('.tut-card'), spot = root.querySelector('.tut-spot');
    if (!card) return;
    const H = window.innerHeight, pad = 12;
    if (!el || !spot) { card.style.top = `${Math.max(pad, (H - card.offsetHeight) / 2)}px`; return; }
    const r = el.getBoundingClientRect(), m = 6;
    const top = Math.max(4, r.top - m), bot = Math.min(H - 4, r.bottom + m);
    const W = window.innerWidth, left = Math.max(4, r.left - m), right = Math.min(W - 4, r.right + m);
    Object.assign(spot.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${Math.max(20, bot - top)}px` });
    const box = (s, css) => Object.assign(root.querySelector(`.tut-shade[data-s="${s}"]`).style, css);
    box('t', { left: 0, right: 0, top: 0, height: `${top}px` });
    box('b', { left: 0, right: 0, top: `${bot}px`, bottom: 0 });
    box('l', { left: 0, width: `${left}px`, top: `${top}px`, height: `${bot - top}px` });
    box('r', { left: `${right}px`, right: 0, top: `${top}px`, height: `${bot - top}px` });
    const below = H - bot, above = top, ch = card.offsetHeight;
    let y = below >= ch + pad || below >= above ? bot + pad : top - pad - ch;
    card.style.top = `${U.clamp(y, pad, H - ch - pad)}px`;
  }
  function next() {
    if (!cur) return;
    if (cur.i < cur.steps.length - 1) { cur.i++; draw(); return; }
    close(true);
  }
  function close(done) {
    if (!cur) return;
    if (done && !cur.manual) { st.seen[cur.ch.id] = 1; persist(); }
    cur = null;
    const root = document.getElementById('tut-root');
    root.classList.remove('show'); root.innerHTML = '';
    UI.holdGame(false);
    check(); // another chapter may be waiting (e.g. the play panel right after the game intro)
  }
  function wire() {
    const root = document.getElementById('tut-root');
    // the overlay takes every tap while a tip is up; only its own buttons do anything
    root.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('[data-tut]');
      if (!b) return;
      Sfx.play('tap');
      if (b.dataset.tut === 'off') { st.off = true; persist(); close(false); return; }
      next();
    });
    window.addEventListener('resize', () => { if (cur) place(cur.steps[cur.i].target ? document.querySelector(cur.steps[cur.i].target) : null); });
  }

  return {
    check, help, wire,
    isOn: () => !st.off,
    setOn: v => { st.off = !v; persist(); if (v) check(); },
    reset: () => { st = { seen: {}, off: false }; persist(); },
  };
})();
