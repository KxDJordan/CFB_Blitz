'use strict';
// ── BLITZBOARD: the league's fan forum ────────────────────────────
// Every week the biggest stories become threads with fan replies.

const Forum = (() => {
  const SEA = DATA.SEASON;
  const ADJ = ['Gridiron', 'Tailgate', 'Redzone', 'Blitz', 'Endzone', 'Hashmark', 'Sideline', 'Sunday', 'Pigskin', 'Audible', 'Shotgun', 'Pistol', 'Primetime', 'Spread', 'Wildcat', 'HurryUp', 'TwoMinute', 'Goalline', 'Playaction', 'Nickel'];
  const NOUN = ['Guru', 'King', 'Prophet', 'Junkie', 'Nerd', 'Dad', 'Legend', 'Truther', 'Scout', 'Hawk', 'Wizard', 'Baron', 'Fanatic', 'Oracle', 'Grinder', 'Enjoyer', 'Analyst', 'Historian', 'CapGuy', 'GM'];
  const MOD = { n: 'BlitzBoard_Mod', f: null, role: 'mod' };
  const INSIDERS = ['ProInsiderPete', 'TheFilmRoomFred', 'SidelineSource', 'DraftDayRay', 'FrontOfficeFiles'];
  const insider = () => ({ n: U.pick(INSIDERS), f: null, role: 'insider' });

  function handle(t) {
    if (t && Math.random() < 0.55) {
      const m = t.mascot.replace(/\s/g, ''), n = t.name.replace(/[\s.]/g, '');
      return U.pick([`${m}Til${U.pick(['IDie', 'TheEnd', 'Death'])}`, `${t.abbr}_${U.pick(['Faithful', 'Diehard', 'SeasonTix', 'Nation', 'Truther', 'Dad'])}${U.ri(1, 99)}`, `${n}${U.pick(['Fan', 'Hive', 'Ultra', 'Mom', 'Tailgater'])}${U.ri(1, 999)}`, `Real${m}Fan`, `${U.pick(['Old', 'Big', 'Lil', 'Proud', 'Salty'])}${m.replace(/s$/, '')}`]);
    }
    return `${U.pick(ADJ)}${U.pick(NOUN)}${U.chance(0.6) ? U.ri(1, 99) : ''}`;
  }
  const fan = t => ({ n: handle(t), f: t ? t.id : null });
  const neutralFan = () => {
    const t = U.chance(0.6) ? U.pick(G.teams) : null;
    return { n: handle(t), f: t ? t.id : null };
  };
  const agoList = n => {
    const out = [];
    let m = U.ri(4, 30);
    for (let i = 0; i < n; i++) { out.push(m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`); m += U.ri(5, 90); }
    return out.reverse();
  };
  const rk = (id, r) => (r ? `#${r} ` : '');

  // ── reply banks ──
  const R = {
    winFan: ['WE ARE SO BACK. {WM} football is a lifestyle.', 'Told y\'all all week. {S}. Never in doubt.', 'That second half was a clinic. Coaching staff deserves an extension.', 'Somebody check on the {LM} fans, they\'ve gone quiet', 'Defense was flying around today. This team is different.', 'Not our cleanest game but a W is a W.', 'Clear your January calendar. We are going places.', '{P} is HIM. Put some respect on that name.', 'My voice is gone. Worth it.', 'Can we play every week like that please'],
    loseFan: ['I need a week off from this team.', 'Same old {LM}. Every. Single. Year.', 'That play-calling in the 4th was criminal.', 'Offensive line got bullied all game. Fix it.', 'Don\'t panic. Long season. ...okay maybe panic a little.', 'Refs didn\'t lose us that game but they sure didn\'t help.', 'Turnovers killed us. You can\'t give a good team extra possessions.', 'I\'m turning off the TV and going outside. Goodbye.', 'Front office needs to make a trade. We were outmanned.', 'We\'ll be back. This one stings though.'],
    neutral: ['Watched this one from the couch and it did not disappoint.', 'Neither team looked complete honestly.', 'The talent gap was obvious from the first drive.', 'People are going to overreact to this result. It\'s one game.', 'This conference is wide open this year.', 'Good game, but both secondaries need work.', 'Has anyone noticed the {WM} quietly getting better every week?', 'Big win for {W}. That\'s a playoff-caliber win.', 'Hot take: {L} are still the better team.', 'I had {L} in my pick\'em. Pain.'],
    upsetW: ['HAHAHA WHO WAS IN THE TOP 10 AGAIN??', 'Respect the {WM}. Respect us.', 'Any given Sunday, baby.', 'They doubted us all week. Look at the scoreboard.', 'Tell the power rankings guys to wake up.'],
    upsetL: ['Unacceptable. Losing to {W} is unacceptable.', 'We were looking ahead and it cost us. Classic trap game.', 'Fire everyone. (I\'ll calm down tomorrow.)', 'Overrated and now everybody knows it.', 'That ranking was a lie and we all knew it.'],
    upsetN: ['This is why you play the games.', 'Called it. Nobody listened. Never do.', 'Sunday chaos, my favorite.', 'Nobody is safe on the road in this league.', 'Somebody\'s survivor pool just went up in flames.'],
    perf: ['That stat line is video game numbers.', 'Pay the man. Whatever he wants.', '{P} is the best player in the league and it isn\'t close.', 'Defenses gonna have nightmares about #{N}.', 'Put him in the MVP conversation right now.', 'I watched every snap. It was even better than the numbers.', 'He\'s been doing this all season and nobody talks about it.', 'Respect from a rival fan. That was special.'],
    poll: ['{T1} at #1 is correct, fight me.', 'How is {T2} not higher?? Who makes these?', 'Power rankings are pure vibes.', 'Top 4 looks right to me.', 'Way too high on the {M3}. They haven\'t played anyone.', 'Whoever writes these needs to watch the games.', 'Love seeing new faces in the top 10.'],
    injury: ['Huge loss. Prayers up for a quick recovery.', 'That changes the whole outlook for the {M}.', 'Next man up. Depth is going to be tested.', 'Season might hinge on how fast he gets back.', 'Brutal timing with the schedule coming up. Make a trade.'],
    hotseat: ['The owner has to make a move.', 'Give the man one more year. The draft classes are getting better.', 'Fans voting with their feet. Stadium was half empty.', 'Coaching isn\'t the problem, the roster is.', 'We\'ve heard "next year" for too long.'],
    mvp: ['{P} has my vote, not even close.', 'QB bias is real in this race.', 'Don\'t sleep on the defensive guys.', 'Still a lot of football left to play.', 'If {P} keeps this pace it\'s over.'],
    draft: ['Love this class. Front office cooked.', 'Reaching for need in round 1 is always a mistake.', 'Grades don\'t mean anything until they play.', 'The {M} got a steal and nobody\'s talking about it.', 'Ask me in three years.', 'That run on linemen in round 2 was wild.'],
    camp: ['Camp reports are always glowing. Show me on Sunday.', 'Love the commitment to the trenches.', 'Intense camp = injuries. Be careful.', 'This is the kind of offseason that wins divisions.', 'Heard the joint practices were chippy. Good.'],
    champ: ['DYNASTY TALK STARTS NOW.', 'What a run. Congrats to the champs.', 'Best team won. No arguments.', 'I\'ll never forget this season.', 'Already counting down to next year.'],
    welcome: ['Welcome to the league! Can\'t wait to see what the {UM} bring.', 'New franchise, new rivalries. Let\'s go.', 'Give them two years and they\'ll be a problem.', 'Love the logo, not gonna lie.', 'Expansion teams usually struggle. Prove me wrong.'],
    tradeWin: ['Front office just won the offseason. LETS GO.', 'Finally a GM who goes and gets guys.', 'That\'s a fleecing. Somebody check on the other side.', 'Instant upgrade. This changes our ceiling.', 'Love it. Win-now move.'],
    tradeLose: ['Hated that guy leaving, but I get it.', 'We better have a plan for those picks.', 'What did we just do?', 'Selling at the deadline... rebuild confirmed.', 'This trade will age badly. Mark my words.'],
    tradeN: ['Both sides can talk themselves into this one.', 'Picks are lottery tickets. Proven talent wins.', 'Winner of this trade gets decided in three years.', 'Interesting price. Didn\'t think he\'d go that cheap.', 'Contender move. I respect it.'],
    fa: ['Finally spending money. About time.', 'Overpaid. Mark it down.', 'That contract is a bargain for what he brings.', 'Front office is going all in this year.', 'Love the signing, hate the years.', 'Fit matters more than the name. This fits.'],
    combine: ['Tape > 40 times. Every year people forget.', 'That 40 time just made somebody a lot of money.', 'Bench reps are overrated for a corner.', 'The football IQ score is the one I actually care about.', 'Workout warrior alert.'],
    retire: ['Hall of Fame career. Thank you for everything.', 'One of the best to ever do it here.', 'Enjoy retirement, legend.', 'Feels like he played forever. End of an era.', 'Never got the ring he deserved.'],
    rival: ['I don\'t care about our record. Beat {R}.', 'Circle it on the calendar. Every year.', 'Their fans are the worst in the league and I will not be taking questions.', 'Last time still keeps me up at night.', 'Bragging rights on the line. My whole office is split on this one.', 'If we lose this one I\'m changing my name and moving.', 'Series record says it all. {SR}.', 'Best rivalry in the league and it\'s not close.'],
    coach: ['Huge loss for the staff. That scheme was the whole identity.', 'Can\'t blame him — head coach jobs don\'t come around often.', 'Who replaces him? That\'s the question for the front office.', 'Good for him honestly. Earned it.', 'Coaching tree is getting deep. That\'s a good sign for the program.', 'This is what happens when you win — everybody wants your people.'],
    regrade: ['Hindsight is 20/20 but some of these picks aged terribly.', 'Told everyone that late-round guy was a steal. Nobody listened.', 'Draft grades on draft day are useless. This is the real report card.', 'That first-rounder has been a disaster. Hate to say it.', 'Scouting department deserves a raise after that class.', 'Some front offices just know how to find talent.'],
    pow: ['Absolutely took over that game. Deserved.', '{P} is the best player nobody talks about.', 'Fantasy league just got won.', 'Put that tape in the Hall of Fame.', 'The other team will be seeing him in their nightmares.', 'Weekly reminder that {P} is a problem.'],
    reel: ['Number one is not even close. Rewatched it ten times.', 'The broadcast booth lost their minds on that one.', 'How did he even get out of that?', 'Defense deserves a spot on the list too.', 'This week\'s top 3 is elite.'],
  };

  function replies(n, pools, vars) {
    const ago = agoList(n), out = [];
    for (let i = 0; i < n; i++) {
      const pool = U.wpick(pools, p => p.w);
      const a = pool.team === undefined ? neutralFan() : fan(pool.team);
      out.push({ a, text: U.fill(U.pick(pool.lines), vars), likes: Math.max(0, Math.round(U.rand(2, 260) / (1 + i * 0.25))), ago: ago[i] });
    }
    return out;
  }

  // ── issues & threads ──
  function issue(key, label, kind) {
    let is = G.forum.find(x => x.key === key);
    if (!is) {
      is = { key, label, kind, year: G.year, threads: [] };
      G.forum.unshift(is);
      if (G.forum.length > 36) G.forum.length = 36;
    }
    return is;
  }
  // the issue covering "right now": this week's during the season, otherwise the current offseason phase
  function currentIssue() {
    if (G.phase === 'season') return issue(`wk-${G.year}-${G.week}`, DATA.WEEK_LABEL(G.week), 'week');
    if (G.phase === 'camp') return issue(`camp-${G.year}`, `Training Camp ${G.year}`, 'camp');
    return issue(`off-${G.year}`, `Offseason ${G.year}`, 'offseason');
  }
  function thread(is, t) {
    const heat = t.heat || 50;
    const th = {
      id: G.threadSeq++, tag: t.tag, title: t.title, body: t.body || '', a: t.a || neutralFan(),
      ago: t.ago || `${U.ri(1, 11)}h`, likes: Math.round(heat * U.rand(8, 22)), views: Math.round(heat * U.rand(180, 520)),
      replies: t.replies || [], pinned: !!t.pinned, hot: heat >= 75, mine: !!t.mine, teams: t.teams || [], heat,
    };
    th.count = th.replies.length + U.ri(heat, heat * 4);
    is.threads.push(th);
    G.forumUnread++;
    return th;
  }
  function sortIssue(is) {
    is.threads.sort((a, b) => (b.pinned - a.pinned) || (b.mine - a.mine) || b.heat - a.heat);
  }
  const pname = p => `${p.first} ${p.last}`;
  const scoreStr = r => `${r.ws}-${r.ls}${r.ot ? ` (${r.ot > 1 ? r.ot : ''}OT)` : ''}`;
  const grade = p => DATA.GRADE[p.stars] || DATA.GRADE[2];

  function top10Body(prevPoll) {
    const prev = {};
    (prevPoll || []).forEach((id, i) => { prev[id] = i + 1; });
    return G.poll.slice(0, 10).map((id, i) => {
      const t = L.team(id), p = prev[id];
      const mv = !p ? '(NEW)' : p > i + 1 ? `(▲${p - i - 1})` : p < i + 1 ? `(▼${i + 1 - p})` : '(—)';
      return `${i + 1}. ${t.name} ${t.mascot} ${L.recStr(t)} ${mv}`;
    }).join('\n');
  }
  const seedLines = c => G.seeds[c].map((id, i) => { const t = L.team(id); return `${i + 1}. ${t.name} ${t.mascot} (${L.recStr(t)})${i < 2 ? ' — division champs' : ' — wild card'}`; }).join('\n');

  // ── weekly news ──
  function weekly(wk, results, pollBefore) {
    const label = DATA.WEEK_LABEL(wk);
    const is = issue(`wk-${G.year}-${wk}`, label, 'week');
    const u = L.user();
    const uid = u.id;
    if (!results.length) return;

    // megathread
    thread(is, {
      tag: 'MEGATHREAD', pinned: true, a: MOD, heat: 60,
      title: `${label} Scoreboard & Discussion Megathread`,
      body: `All the finals from ${label}. Keep it civil, keep it fun.\n\n` + results.map(r => `${r.W.name} ${r.ws}, ${r.Lo.name} ${r.ls}${r.ot ? ' (OT)' : ''}`).join('\n'),
      replies: replies(5, [{ w: 1, lines: R.neutral }], { W: results[0].W.name, L: results[0].Lo.name, WM: results[0].W.mascot, LM: results[0].Lo.mascot }),
    });

    for (const r of results) {
      const v = { W: r.W.name, L: r.Lo.name, WM: r.W.mascot, LM: r.Lo.mascot, S: scoreStr(r) };
      const star = r.top.find(x => G.players[x.pid] && L.team(G.players[x.pid].teamId) === r.W) || r.top[0];
      const sp = star ? G.players[star.pid] : null;
      if (sp) { v.P = pname(sp); v.N = sp.num; }
      const mine = r.W.id === uid || r.Lo.id === uid;
      const rW = r.rankBefore[r.W.id], rL = r.rankBefore[r.Lo.id];
      const margin = r.ws - r.ls;

      if (mine) {
        const won = r.W.id === uid, opp = won ? r.Lo : r.W;
        const verb = margin >= 28 ? U.pick(['demolish', 'steamroll', 'bury']) : margin <= 3 ? U.pick(['survive', 'edge', 'escape']) : U.pick(['beat', 'take down', 'handle']);
        const body = `FINAL: ${r.W.name} ${r.ws}, ${r.Lo.name} ${r.ls}${r.ot ? ' in overtime' : ''}.\n\nTop performers:\n` +
          r.top.slice(0, 4).map(x => { const p = G.players[x.pid]; return p ? `• ${p.pos} ${pname(p)} (${L.team(p.teamId).abbr}): ${x.line}` : ''; }).join('\n') +
          `\n\nConditions: ${L.weatherLine(L.weather(r.g))}` +
          (wk <= SEA.REG ? `\n\n${u.name} moves to ${L.recStr(u)} on the season.` : '');
        thread(is, {
          tag: 'GAME THREAD', mine: true, heat: 90, a: fan(u), teams: [r.W.id, r.Lo.id],
          title: won ? `[Post-Game] ${u.name} ${u.mascot} ${verb} ${opp.name}, ${scoreStr(r)}` : `[Post-Game] ${opp.name} ${verb} ${u.name}, ${scoreStr(r)}`,
          body,
          replies: replies(9, [{ w: 4, team: u, lines: won ? R.winFan : R.loseFan }, { w: 2, team: opp, lines: won ? R.loseFan : R.winFan }, { w: 2, lines: R.neutral }],
            { ...v, WM: r.W.mascot, LM: r.Lo.mascot }),
        });
      }
      // upset (by the power rankings)
      if (rL && (!rW || rW > rL + 3)) {
        thread(is, {
          tag: 'UPSET', heat: 95 - rL * 2 + (mine ? 5 : 0), teams: [r.W.id, r.Lo.id], a: fan(r.W),
          title: !rW ? `UPSET ALERT: ${r.W.name} stun the #${rL} ${r.Lo.name}, ${scoreStr(r)}` : `#${rW} ${r.W.name} knock off #${rL} ${r.Lo.name}, ${scoreStr(r)}`,
          body: `Nobody saw this coming. The ${r.W.name} ${r.W.mascot} (${L.recStr(r.W)}) took down ${r.Lo.name} (${L.recStr(r.Lo)}) ${scoreStr(r)}.${sp ? ` ${pname(sp)} led the way with ${star.line}.` : ''}\n\nWhere do the ${r.Lo.mascot} go from here?`,
          replies: replies(7, [{ w: 2, team: r.W, lines: R.upsetW }, { w: 2, team: r.Lo, lines: R.upsetL }, { w: 2, lines: R.upsetN }], v),
        });
      } else if (r.ot || (margin <= 3 && r.ws + r.ls >= 55) || (margin <= 3 && rW && rL)) {
        thread(is, {
          tag: 'INSTANT CLASSIC', heat: 70 + (rW && rL ? 10 : 0), teams: [r.W.id, r.Lo.id],
          title: `INSTANT CLASSIC: ${r.W.name} outlast ${r.Lo.name} ${scoreStr(r)}`,
          body: `What a game. ${r.ws + r.ls} combined points${r.ot ? `, ${r.ot > 1 ? r.ot + ' overtime periods' : 'overtime'}` : ''} and a finish nobody will forget.`,
          replies: replies(6, [{ w: 2, team: r.W, lines: R.winFan }, { w: 1, team: r.Lo, lines: R.loseFan }, { w: 2, lines: R.neutral }], v),
        });
      } else if (margin >= 35) {
        thread(is, {
          tag: 'BLOWOUT', heat: 55 + (rW ? 8 : 0), teams: [r.W.id, r.Lo.id],
          title: `${r.W.name} hang ${r.ws} on ${r.Lo.name} in a ${r.ws}-${r.ls} rout`,
          body: `Total domination. ${r.W.name} led wire to wire.`,
          replies: replies(5, [{ w: 2, team: r.W, lines: R.winFan }, { w: 1, team: r.Lo, lines: R.loseFan }, { w: 2, lines: R.neutral }], v),
        });
      }
    }

    // individual performances
    const allTop = results.flatMap(r => r.top).filter(x => G.players[x.pid]);
    const big = allTop.filter(x => (x.kind === 'pass' && (x.y >= 340 || x.td >= 4)) || (x.kind === 'rush' && (x.y >= 170 || x.td >= 3)) || (x.kind === 'rec' && (x.y >= 160 || x.td >= 3)) || (x.kind === 'def' && (x.sk >= 3 || x.int >= 2)))
      .sort((a, b) => b.val - a.val).slice(0, 2);
    for (const x of big) {
      const p = G.players[x.pid], t = L.team(p.teamId);
      thread(is, {
        tag: 'PERFORMANCE', heat: 72 + (t.user ? 10 : 0), mine: false, teams: [t.id], a: fan(t),
        title: `${p.pos} ${pname(p)} (${t.abbr}) was UNSTOPPABLE: ${x.line}`,
        body: `${pname(p)} put the ${t.mascot} on his back this week. #${p.num}, ${p.age} years old, ${DATA.expLabel(p).toLowerCase()} in the league out of ${p.college}.\n\nSeason so far: ${L.seasonLine(p)}.`,
        replies: replies(6, [{ w: 2, team: t, lines: R.perf }, { w: 3, lines: R.perf }], { P: pname(p), N: p.num }),
      });
    }

    // power rankings (regular season only)
    const t1 = L.team(G.poll[0]), t2 = L.team(G.poll[1]), t3 = L.team(G.poll[2]);
    if (wk <= SEA.REG) {
      const newOne = pollBefore[0] !== G.poll[0];
      const uR = L.ranked(uid);
      thread(is, {
        tag: 'POWER RANKINGS', heat: newOne ? 85 : 62, a: MOD,
        title: newOne ? `NEW #1: ${t1.name} take over the top spot in the BlitzBoard Power Rankings` : `BlitzBoard Power Rankings after ${label}: ${t1.name} stay on top`,
        body: top10Body(pollBefore) + (uR ? `\n\n${u.name} check in at #${uR}.` : `\n\n${u.name} are outside the top 10 this week.`),
        replies: replies(6, [{ w: 1, lines: R.poll }], { T1: t1.name, T2: t2.name, M3: t3.mascot }),
      });
    }

    // injuries
    const inj = results.flatMap(r => r.injuries).map(i => ({ ...i, p: G.players[i.pid] }))
      .filter(i => i.p && i.weeks >= 2 && (i.p.ovr >= 72 || L.isUser(i.p.teamId))).sort((a, b) => b.p.ovr - a.p.ovr).slice(0, 2);
    for (const i of inj) {
      const t = L.team(i.p.teamId);
      thread(is, {
        tag: 'INJURY', heat: 58 + (t.user ? 15 : 0) + (i.p.ovr >= 80 ? 8 : 0), a: insider(), teams: [t.id], mine: false,
        title: `Report: ${t.abbr} ${i.p.pos} ${pname(i.p)} expected to miss ${i.weeks} week${i.weeks > 1 ? 's' : ''}`,
        body: `Sources tell BlitzBoard that ${pname(i.p)} (${i.p.ovr} OVR) suffered an injury during ${label} action and will be sidelined for roughly ${i.weeks} week${i.weeks > 1 ? 's' : ''}.`,
        replies: replies(4, [{ w: 2, team: t, lines: R.injury }, { w: 1, lines: R.injury }], { M: t.mascot }),
      });
    }

    // hot seat
    if (wk >= 5 && wk <= SEA.REG) {
      const cold = G.teams.filter(t => t.rec.l >= 4 && t.rec.w <= t.rec.l - 3).sort((a, b) => a.rec.w - b.rec.w)[0];
      if (cold && U.chance(0.55)) {
        thread(is, {
          tag: 'HOT SEAT', heat: 50 + (cold.user ? 25 : 0), teams: [cold.id], a: fan(cold),
          title: cold.user ? `Real talk: is the ${cold.name} head coach on the hot seat?` : `Hot seat watch: how much longer does the ${cold.name} staff have?`,
          body: `The ${cold.name} sit at ${L.recStr(cold)} and the fanbase is restless. Is it the coaching or the roster?`,
          replies: replies(5, [{ w: 2, team: cold, lines: R.hotseat }, { w: 2, lines: R.hotseat }], {}),
        });
      }
    }

    // undefeated watch
    if (wk >= 5 && wk <= SEA.REG) {
      const perfect = G.teams.filter(t => t.rec.l === 0 && t.rec.w > 0);
      if (perfect.length && perfect.length <= 4) {
        thread(is, {
          tag: 'DISCUSSION', heat: 52 + perfect.length, a: neutralFan(),
          title: `Perfect season watch: ${perfect.length} team${perfect.length > 1 ? 's' : ''} still unbeaten after ${label}`,
          body: perfect.map(t => `• ${t.name} ${t.mascot} (${L.recStr(t)})`).join('\n') + '\n\nCan anyone run the table?',
          replies: replies(4, [{ w: 1, lines: R.neutral }], { W: perfect[0].name, L: perfect[perfect.length - 1].name, WM: perfect[0].mascot }),
        });
      }
    }

    // MVP race
    if ([5, 9, 12].includes(wk)) {
      const hl = L.mvpList(5);
      if (hl.length) {
        const lead = hl[0].p;
        thread(is, {
          tag: 'MVP RACE', heat: 68, a: neutralFan(),
          title: `MVP Ladder: ${pname(lead)} (${L.team(lead.teamId).abbr}) leads the race after ${label}`,
          body: hl.map((x, i) => `${i + 1}. ${x.p.pos} ${pname(x.p)}, ${L.team(x.p.teamId).name} — ${L.seasonLine(x.p)}`).join('\n'),
          replies: replies(5, [{ w: 1, lines: R.mvp }], { P: pname(lead) }),
        });
      }
    }

    // playoff picture & postseason storylines
    if (wk === SEA.REG && G.seeds) {
      const inField = [0, 1].some(c => G.seeds[c].includes(uid));
      thread(is, {
        tag: 'PLAYOFFS', heat: 92, a: MOD, pinned: true,
        title: 'The playoff field is SET',
        body: [0, 1].map(c => `${DATA.CONFS[c].long}\n${seedLines(c)}`).join('\n\n') + '\n\nWild Card Round: 1 vs 4, 2 vs 3 in each conference.' + (inField ? `\n\nThe ${u.name} ${u.mascot} are IN.` : `\n\nThe ${u.name} ${u.mascot} miss the playoffs.`),
        replies: replies(6, [{ w: 1, lines: R.poll }], { T1: t1.name, T2: t2.name, M3: t3.mascot }),
      });
    }
    if (wk === SEA.WC) {
      thread(is, {
        tag: 'PLAYOFFS', heat: 88, a: MOD, pinned: true,
        title: 'Conference Championship matchups are set',
        body: (G.schedule[SEA.CC] || []).map(g => `${DATA.CONFS[g.conf].long}: ${L.team(g.a).name} at ${L.team(g.h).name}`).join('\n'),
        replies: replies(5, [{ w: 1, lines: R.neutral }], { W: t1.name, L: t2.name, WM: t1.mascot }),
      });
    }
    if (wk === SEA.CC) {
      for (const r of results) {
        thread(is, {
          tag: 'CHAMPIONS', heat: 86 + (r.W.user ? 10 : 0), teams: [r.W.id], a: fan(r.W), mine: r.W.user,
          title: `The ${r.W.name} ${r.W.mascot} are your ${DATA.CONFS[r.g.conf].name} Conference champions!`,
          body: `${r.W.name} beat ${r.Lo.name} ${scoreStr(r)} and punch their ticket to the Blitz Bowl.`,
          replies: replies(5, [{ w: 3, team: r.W, lines: R.champ }, { w: 1, team: r.Lo, lines: R.loseFan }], { LM: r.Lo.mascot }),
        });
      }
      const [a, b] = G.confChamps.map(id => L.team(id));
      if (a && b) {
        thread(is, {
          tag: 'BLITZ BOWL', heat: 95, a: MOD, pinned: true,
          title: `It's ${a.name} vs ${b.name} in the Blitz Bowl`,
          body: `The ${DATA.CONFS[0].name} champs (${L.recStr(a)}) take on the ${DATA.CONFS[1].name} champs (${L.recStr(b)}). One game for the title.`,
          replies: replies(6, [{ w: 1, team: a, lines: R.winFan }, { w: 1, team: b, lines: R.winFan }, { w: 1, lines: R.neutral }], { WM: a.mascot, LM: b.mascot, P: '', S: '' }),
        });
      }
    }
    sortIssue(is);
  }

  // ── season events ──
  function preseason() {
    const is = issue(`pre-${G.year}`, `Preseason ${G.year}`, 'preseason');
    const u = L.user(), uR = L.ranked(u.id);
    thread(is, {
      tag: 'POWER RANKINGS', heat: 80, a: MOD, pinned: true,
      title: `BlitzBoard Preseason Power Rankings for ${G.year}`,
      body: top10Body([]).replace(/ \(NEW\)/g, ''),
      replies: replies(6, [{ w: 1, lines: R.poll }], { T1: L.team(G.poll[0]).name, T2: L.team(G.poll[1]).name, M3: L.team(G.poll[2]).mascot }),
    });
    thread(is, {
      tag: 'PREVIEW', heat: 88, a: fan(u), mine: true, teams: [u.id],
      title: `${G.year} ${u.name} ${u.mascot} season preview: ${uR ? `can the #${uR} ${u.mascot} win the ${L.divName(u)}?` : 'is this the year they make the playoffs?'}`,
      body: `Ratings heading into the season — OFF ${L.ratings(u).off}, DEF ${L.ratings(u).def}.\n\nWeek 1: ${(() => { const g = G.schedule[1].find(x => x.h === u.id || x.a === u.id); return g ? `${g.h === u.id ? 'vs' : '@'} ${L.team(g.h === u.id ? g.a : g.h).name}` : 'TBD'; })()}\n\nPredictions?`,
      replies: replies(8, [{ w: 3, team: u, lines: R.winFan.concat(R.camp) }, { w: 2, lines: R.neutral }], { WM: u.mascot, LM: 'opponent', S: '', P: 'our QB', W: u.name, L: 'everyone' }),
    });
    const qbs = Object.values(G.players).filter(p => p.teamId != null && p.pos === 'QB' && L.isStarter(L.team(p.teamId), p)).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
    thread(is, {
      tag: 'MVP RACE', heat: 64, a: neutralFan(),
      title: 'Way-too-early MVP favorites',
      body: qbs.map((p, i) => `${i + 1}. QB ${pname(p)}, ${L.team(p.teamId).name} (${p.ovr} OVR)`).join('\n'),
      replies: replies(4, [{ w: 1, lines: R.mvp }], { P: qbs[0] ? pname(qbs[0]) : 'the favorite' }),
    });
    sortIssue(is);
  }

  function draftOpen() {
    const d = G.draft;
    const is = issue(`draft-${G.year}`, `Draft ${G.year}`, 'draft');
    const u = L.user();
    if (d.kind === 'founding') {
      thread(is, {
        tag: 'NEWS', heat: 96, a: MOD, pinned: true, mine: true, teams: [u.id],
        title: `Welcome to the ${L.divName(u)}, ${u.name} ${u.mascot}!`,
        body: `The league officially welcomes its newest franchise. The ${u.mascot} will build their first roster in the Inaugural Draft — ${d.rounds} rounds, snake order.\n\nWelcome aboard, GM.`,
        replies: replies(8, [{ w: 1, lines: R.welcome }], { UM: u.mascot }),
      });
    } else {
      const traded = d.order.filter((id, i) => id !== d.orig[i]).length;
      if (traded) thread(is, {
        tag: 'DRAFT', heat: 60, a: insider(),
        title: `${traded} picks have changed hands heading into the ${G.year} Draft`,
        body: d.order.map((id, i) => ({ id, o: d.orig[i], i })).filter(x => x.id !== x.o).slice(0, 12).map(x => `#${x.i + 1}: ${L.team(x.id).abbr} (via ${L.team(x.o).abbr})`).join('\n'),
        replies: replies(3, [{ w: 1, lines: R.draft }], { M: U.pick(G.teams).mascot }),
      });
    }
    const top = d.pool.slice(0, 8).map(id => G.players[id]);
    thread(is, {
      tag: 'DRAFT', heat: 78, a: insider(),
      title: `${G.year} Draft Big Board: ${pname(top[0])} headlines the class`,
      body: top.map((p, i) => `${i + 1}. ${p.pos} ${pname(p)}, ${p.college} — ${grade(p)}`).join('\n'),
      replies: replies(5, [{ w: 1, lines: R.draft }], { M: U.pick(G.teams).mascot }),
    });
    sortIssue(is);
  }

  function draftRecap() {
    const d = G.draft;
    const is = issue(`draft-${G.year}`, `Draft ${G.year}`, 'draft');
    const u = L.user();
    const g = d.grades;
    const first = d.log[0], fp = G.players[first.pid];
    thread(is, {
      tag: 'DRAFT', heat: 80, a: insider(), teams: [first.teamId],
      title: `${L.team(first.teamId).name} make ${fp.pos} ${pname(fp)} the #1 overall pick`,
      body: `${pname(fp)} (${fp.college}, ${fp.ovr} OVR, ${grade(fp)}) goes first overall.`,
      replies: replies(4, [{ w: 1, team: L.team(first.teamId), lines: R.winFan }, { w: 2, lines: R.draft }], { WM: L.team(first.teamId).mascot, LM: 'rivals', P: pname(fp), M: L.team(first.teamId).mascot, S: '' }),
    });
    const steal = d.log.filter(e => e.overall > 40).map(e => ({ e, p: G.players[e.pid] })).sort((a, b) => L.prospectValue(b.p) - L.prospectValue(a.p))[0];
    if (steal) {
      const t = L.team(steal.e.teamId);
      thread(is, {
        tag: 'DISCUSSION', heat: 66 + (t.user ? 10 : 0), teams: [t.id],
        title: `Steal of the draft? ${t.name} land ${steal.p.pos} ${pname(steal.p)} at pick #${steal.e.overall}`,
        body: `${grade(steal.p)} out of ${steal.p.college}, ${steal.p.ovr} OVR with ${U.potGrade(steal.p.pot)} potential. How did he slide that far?`,
        replies: replies(4, [{ w: 1, lines: R.draft }], { M: t.mascot }),
      });
    }
    const mine = d.log.filter(e => e.teamId === u.id).map(e => ({ e, p: G.players[e.pid] }));
    thread(is, {
      tag: 'DRAFT GRADE', heat: 90, mine: true, a: fan(u), teams: [u.id],
      title: `${u.name} draft class reaction thread — BlitzBoard grade: ${g[u.id] ? g[u.id].grade : 'B'}`,
      body: mine.length ? mine.map(x => `R${x.e.round} #${x.e.overall}: ${x.p.pos} ${pname(x.p)}, ${x.p.college} (${x.p.ovr})`).join('\n') : 'No picks this year — the front office traded them all away.',
      replies: replies(7, [{ w: 3, team: u, lines: R.draft }, { w: 1, lines: R.draft }], { M: u.mascot }),
    });
    thread(is, {
      tag: 'DRAFT GRADE', heat: 70, a: insider(),
      title: `Instant draft grades for all ${G.teams.length} teams`,
      body: G.teams.slice().sort((a, b) => (g[b.id] ? g[b.id].v : 0) - (g[a.id] ? g[a.id].v : 0)).map(t => `${t.name}: ${g[t.id] ? g[t.id].grade : '—'}`).join('\n'),
      replies: replies(5, [{ w: 1, lines: R.draft }], { M: U.pick(G.teams).mascot }),
    });
    sortIssue(is);
  }

  function campReport(log) {
    if (!log || !log.length) return;
    const is = issue(`camp-${G.year}`, `Training Camp ${G.year}`, 'camp');
    const u = L.user();
    for (const e of log) {
      const g = DATA.groupById(e.groupId), I = DATA.INTENSITY.find(x => x.id === e.intensityId);
      thread(is, {
        tag: 'CAMP REPORT', heat: 70 + e.session, mine: true, a: insider(), teams: [u.id],
        title: `${DATA.CAMP_SESSIONS[e.session].name}: ${u.name} put the ${g.label} through ${I.label.toLowerCase()} work`,
        body: `Observers say the ${g.label} (${g.sub.toLowerCase()}) improved by an average of +${e.avg.toFixed(1)} OVR.${e.inj ? ` ${e.inj} player${e.inj > 1 ? 's' : ''} came out of it banged up.` : ' No injuries reported.'}`,
        replies: replies(4, [{ w: 2, team: u, lines: R.camp }, { w: 1, lines: R.camp }], {}),
      });
    }
    sortIssue(is);
  }

  function seasonEnd() {
    const is = issue(`wk-${G.year}-${SEA.FINAL}`, DATA.WEEK_LABEL(SEA.FINAL), 'week');
    const c = L.team(G.champion), u = L.user();
    thread(is, {
      tag: 'CHAMPIONS', heat: 99, pinned: true, a: MOD, teams: [c.id], mine: c.user,
      title: `THE ${c.name.toUpperCase()} ${c.mascot.toUpperCase()} WIN THE ${G.year} BLITZ BOWL`,
      body: `${c.name} finish ${L.recStr(c)} in the regular season and run the table in the playoffs.${c.user ? `\n\nFrom expansion franchise to champions — what a ride for ${u.name}.` : ''}`,
      replies: replies(8, [{ w: 3, team: c, lines: R.champ }, { w: 2, lines: R.champ.concat(R.neutral) }], { W: c.name, WM: c.mascot, L: 'the field', LM: 'rivals' }),
    });
    for (const [key, title] of [['mvp', 'Most Valuable Player'], ['roy', 'Rookie of the Year']]) {
      const h = G.awards[key];
      if (!h) continue;
      const ht = L.team(h.team);
      thread(is, {
        tag: key === 'mvp' ? 'MVP' : 'AWARDS', heat: (key === 'mvp' ? 88 : 72) + (ht.user ? 8 : 0), a: MOD, teams: [ht.id],
        title: `${h.name} (${ht.abbr}) named ${G.year} ${title}`,
        body: `The ${ht.name} ${h.pos} takes home the league's ${title} award.\n\nSeason: ${h.line}`,
        replies: replies(5, [{ w: 2, team: ht, lines: R.perf }, { w: 2, lines: R.mvp }], { P: h.name, N: '' }),
      });
    }
    sortIssue(is);
  }

  function offseason() {
    const is = issue(`off-${G.year}`, `Offseason ${G.year}`, 'offseason');
    const o = G.off, u = L.user();
    const big = (o.stickers || []).filter(x => x.tier >= 2 || x.teamId === u.id).sort((a, b) => b.tier - a.tier).slice(0, 12);
    if (big.length) {
      thread(is, {
        tag: 'NEWS', heat: 74, a: insider(),
        title: `Badge Report: ${big.filter(x => x.tier === 3).length} players earn Elite badges this offseason`,
        body: 'Badges earned on the field last season:\n\n' + big.map(x => `• ${DATA.STICKER_TIERS[x.tier].label} ${DATA.STICKERS[x.id].name} — ${x.pos} ${x.name} (${L.team(x.teamId).abbr})`).join('\n'),
        replies: replies(4, [{ w: 1, lines: R.draft }], { M: u.mascot }),
      });
    }
    if (o.leagueRetired.length) {
      thread(is, {
        tag: 'RETIREMENT', heat: 80, a: insider(),
        title: `${o.leagueRetired.length} notable veterans hang up their cleats`,
        body: o.leagueRetired.slice(0, 10).map(p => `• ${p.pos} ${p.name} (${L.team(p.teamId).abbr}) — age ${p.age}, ${p.exp + 1} seasons · career: ${p.car}`).join('\n'),
        replies: replies(4, [{ w: 1, lines: R.retire }], {}),
      });
    }
    if ((o.walked || []).length) {
      thread(is, {
        tag: 'FREE AGENCY', heat: 76, a: insider(),
        title: `${o.walked.length} players set to hit free agency after their teams pass on new deals`,
        body: o.walked.sort((a, b) => b.ovr - a.ovr).slice(0, 10).map(p => `• ${p.pos} ${p.name} (${p.ovr} OVR, age ${p.age}) — formerly ${L.team(p.teamId).abbr}`).join('\n'),
        replies: replies(4, [{ w: 1, lines: R.fa }], {}),
      });
    }
    const cls = (G.nextClass || []).map(id => G.players[id]).filter(Boolean);
    if (cls.length) {
      const fast = cls.slice().sort((a, b) => a.comb.forty - b.comb.forty).slice(0, 3), strong = cls.slice().sort((a, b) => b.comb.bench - a.comb.bench)[0], smart = cls.slice().sort((a, b) => b.comb.iq - a.comb.iq)[0];
      thread(is, {
        tag: 'COMBINE', heat: 72, a: insider(),
        title: `Combine standouts: ${fast[0].pos} ${pname(fast[0])} blazes a ${fast[0].comb.forty} forty`,
        body: 'Fastest 40s:\n' + fast.map(p => `• ${p.pos} ${pname(p)}, ${p.college} — ${p.comb.forty}s`).join('\n') + `\n\nMost bench reps: ${strong.pos} ${pname(strong)} (${strong.comb.bench})\nTop football IQ: ${smart.pos} ${pname(smart)} (${smart.comb.iq})\n\nScouts have ${DATA.SCOUT_PTS.annual} visits to spend before the draft.`,
        replies: replies(4, [{ w: 1, lines: R.combine }], {}),
      });
    }
    thread(is, {
      tag: 'DISCUSSION', heat: 84, mine: true, a: fan(u), teams: [u.id],
      title: o.retired.length ? `${u.name} lose ${o.retired.length} veteran${o.retired.length > 1 ? 's' : ''} to retirement — who steps up in ${G.year}?` : `No retirements in ${u.name} this year — is this roster ready to contend?`,
      body: (o.retired.length ? o.retired.sort((a, b) => b.ovr - a.ovr).slice(0, 8).map(p => `• ${p.pos} ${p.name} (${p.ovr}, age ${p.age})`).join('\n') + '\n\n' : '') + 'The draft is next. Trade up, trade down, or stand pat?',
      replies: replies(6, [{ w: 3, team: u, lines: R.draft }, { w: 1, lines: R.neutral }], { M: u.mascot, W: u.name, L: 'rivals', WM: u.mascot }),
    });
    sortIssue(is);
  }

  // ── free agency ──
  function freeAgency(signed, day) {
    const is = issue(`fa-${G.year}`, `Free Agency ${G.year}`, 'offseason');
    if (!signed.length) return;
    const u = L.user(), top = signed.slice().sort((a, b) => b.sal - a.sal);
    const big = top[0], bt = L.team(big.team);
    thread(is, {
      tag: 'FREE AGENCY', heat: 70 + Math.max(0, big.ovr - 70) + (signed.some(x => x.team === u.id) ? 15 : 0), a: insider(), teams: [...new Set(signed.map(x => x.team))],
      title: `Free agency Day ${day}: ${big.pos} ${big.name} signs with ${bt.name} (${big.yrs} yr${big.yrs > 1 ? 's' : ''}, $${big.sal}M/yr)`,
      body: top.slice(0, 12).map(x => `• ${L.team(x.team).abbr}: ${x.pos} ${x.name} (${x.ovr}, age ${x.age}) — ${x.yrs} yr${x.yrs > 1 ? 's' : ''}, $${x.sal}M/yr`).join('\n'),
      replies: replies(5, [{ w: 2, team: bt, lines: R.fa }, { w: 2, lines: R.fa }], {}),
    });
    sortIssue(is);
  }

  // ── trades ──
  const assetList = (P, K) => P.map(p => `${p.pos} ${p.name} (${p.ovr} OVR, age ${p.age})`).concat(K.map(k => `${k.y} Round ${k.r} pick${k.o !== k.own ? ` (orig. ${L.team(k.o).abbr})` : ''}`));
  function trade(rec) {
    const is = currentIssue();
    const A = L.team(rec.a), B = L.team(rec.b);
    const mine = A.user || B.user;
    const star = rec.aP.concat(rec.bP).sort((x, y) => y.ovr - x.ovr)[0];
    const aGets = assetList(rec.bP, rec.bK), bGets = assetList(rec.aP, rec.aK);
    thread(is, {
      tag: 'TRADE', heat: (star ? 60 + Math.max(0, star.ovr - 70) : 55) + (mine ? 25 : 0), a: insider(), teams: [A.id, B.id], mine,
      title: star ? `TRADE: ${star.pos} ${star.name} is headed to ${rec.bP.some(p => p.pid === star.pid) ? A.name : B.name}` : `TRADE: ${A.name} and ${B.name} swap picks`,
      body: `${A.name} ${A.mascot} receive:\n${aGets.map(x => `• ${x}`).join('\n') || '• —'}\n\n${B.name} ${B.mascot} receive:\n${bGets.map(x => `• ${x}`).join('\n') || '• —'}`,
      replies: replies(6, [{ w: 2, team: A, lines: R.tradeWin }, { w: 2, team: B, lines: R.tradeLose.concat(R.tradeWin) }, { w: 2, lines: R.tradeN }], {}),
    });
    sortIssue(is);
  }

  // a one-off story in the current issue (rivalries, coaching moves, draft re-grades, weekly honours);
  // pools name a reply bank above, optionally voiced by one team's fans
  function news(t) {
    const is = currentIssue();
    thread(is, {
      tag: t.tag, title: t.title, body: t.body || '', heat: t.heat || 60, teams: t.teams || [], mine: !!t.mine,
      a: t.by === 'mod' ? MOD : insider(),
      replies: replies(t.n || 5, (t.pools || [{ w: 1, lines: 'neutral' }]).map(p => ({ w: p.w, team: p.team, lines: R[p.lines] || R.neutral })), t.vars || {}),
    });
    sortIssue(is);
  }

  return { weekly, preseason, draftOpen, draftRecap, campReport, seasonEnd, offseason, trade, freeAgency, news };
})();
