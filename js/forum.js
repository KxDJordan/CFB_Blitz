'use strict';
// ── BLITZBOARD: the league's fan forum ────────────────────────────
// Every week the biggest stories become threads with fan replies.

const Forum = (() => {
  const ADJ = ['Gridiron', 'Tailgate', 'Redzone', 'Blitz', 'Endzone', 'Hashmark', 'Sideline', 'Saturday', 'Pigskin', 'Audible', 'Shotgun', 'Pistol', 'Option', 'Spread', 'Wildcat', 'HurryUp', 'TwoMinute', 'Goalline', 'Playaction', 'Nickel'];
  const NOUN = ['Guru', 'King', 'Prophet', 'Junkie', 'Nerd', 'Dad', 'Legend', 'Truther', 'Scout', 'Hawk', 'Wizard', 'Baron', 'Fanatic', 'Oracle', 'Grinder', 'Enjoyer', 'Analyst', 'Historian'];
  const MOD = { n: 'BlitzBoard_Mod', f: null, role: 'mod' };
  const INSIDERS = ['CFBInsiderPete', 'TheFilmRoomFred', 'SidelineSource', 'RecruitingRay'];
  const insider = () => ({ n: U.pick(INSIDERS), f: null, role: 'insider' });

  function handle(t) {
    if (t && Math.random() < 0.55) {
      const m = t.mascot.replace(/\s/g, ''), n = t.name.replace(/\s/g, '');
      return U.pick([`${m}Til${U.pick(['IDie', 'TheEnd', 'Death'])}`, `${t.abbr}_${U.pick(['Faithful', 'Diehard', 'Alum', 'Nation', 'Truther', 'Dad'])}${U.ri(1, 99)}`, `${n}${U.pick(['Fan', 'Hive', 'Ultra', 'Mom', 'Grad'])}${U.ri(1, 999)}`, `Real${m}Fan`, `${U.pick(['Old', 'Big', 'Lil', 'Proud', 'Salty'])}${m.replace(/s$/, '')}`]);
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
  const tn = t => t.name;
  const rk = (id, r) => (r ? `#${r} ` : '');

  // ── reply banks ──
  const R = {
    winFan: ['WE ARE SO BACK. {WM} football is a lifestyle.', 'Told y\'all all week. {S}. Never in doubt.', 'That second half was a clinic. Coaching staff deserves a raise.', 'Somebody check on the {LM} fans, they\'ve gone quiet', 'Defense was flying around today. This team is different.', 'Not our cleanest game but a W is a W.', 'Book the tickets. We are going places this year.', '{P} is HIM. Put some respect on that name.', 'My voice is gone. Worth it.', 'Can we play every week like that please'],
    loseFan: ['I need a week off from this team.', 'Same old {LM}. Every. Single. Year.', 'That play-calling in the 4th was criminal.', 'Offensive line got bullied all game. Fix it.', 'Don\'t panic. Long season. ...okay maybe panic a little.', 'Refs didn\'t lose us that game but they sure didn\'t help.', 'Turnovers killed us. You can\'t give a good team extra possessions.', 'I\'m turning off the TV and going outside. Goodbye.', 'Recruiting has to get better. We were outmanned.', 'We\'ll be back. This one stings though.'],
    neutral: ['Watched this one from the couch and it did not disappoint.', 'Neither team looked complete honestly.', 'The talent gap was obvious from the first drive.', 'People are going to overreact to this result. It\'s one game.', 'This conference is wide open this year.', 'Good game, but both secondaries need work.', 'Has anyone noticed the {WM} quietly getting better every week?', 'Big win for {W}. That\'s a résumé builder.', 'Hot take: {L} are still the better team.', 'I had {L} in my pick\'em. Pain.'],
    upsetW: ['HAHAHA WHO WAS RANKED AGAIN??', 'Respect the {WM}. Respect us.', 'Storm the field, we earned it.', 'They doubted us all week. Look at the scoreboard.', 'Tell the pollsters to wake up.'],
    upsetL: ['Unacceptable. Losing to {W} is unacceptable.', 'We were looking ahead and it cost us. Classic trap game.', 'Fire everyone. (I\'ll calm down tomorrow.)', 'Overrated and now everybody knows it.', 'That ranking was a lie and we all knew it.'],
    upsetN: ['This is why you play the games.', 'Called it. Nobody listened. Never do.', 'Saturday chaos, my favorite.', 'Ranked teams on the road in this league just aren\'t safe.', 'Somebody\'s bracket just went up in flames.'],
    perf: ['That stat line is video game numbers.', 'Somebody get this kid an agent. Oh wait.', '{P} is the best player in the league and it isn\'t close.', 'Defenses gonna have nightmares about #{N}.', 'Put him on the Heisman list right now.', 'I watched every snap. It was even better than the numbers.', 'He\'s been doing this all season and nobody talks about it.', 'Respect from a rival fan. That was special.'],
    poll: ['{T1} at #1 is correct, fight me.', 'How is {T2} not higher?? Who votes on this?', 'This poll is pure vibes.', 'Top 4 looks right to me.', 'Way too high on the {M3}. They haven\'t played anyone.', 'Ranking committee needs to watch the games.', 'Love seeing new faces in the top 10.'],
    injury: ['Huge loss. Prayers up for a quick recovery.', 'That changes the whole outlook for the {M}.', 'Next man up. Depth is going to be tested.', 'Season might hinge on how fast he gets back.', 'Brutal timing with the schedule coming up.'],
    hotseat: ['The administration has to make a move.', 'Give the man one more year. Recruiting is improving.', 'Fans voting with their feet. Stadium was half empty.', 'Coaching isn\'t the problem, the roster is.', 'We\'ve heard "next year" for too long.'],
    heisman: ['{P} has my vote, not even close.', 'QB bias is real in this race.', 'Don\'t sleep on the defensive guys.', 'Still a lot of football left to play.', 'If {P} keeps this pace it\'s over.'],
    draft: ['Love this class. Front office cooked.', 'Reaching for need in round 1 is always a mistake.', 'Grades don\'t mean anything until they play.', 'The {M} got a steal and nobody\'s talking about it.', 'Ask me in three years.', 'That run on linemen in round 2 was wild.'],
    camp: ['Camp reports are always glowing. Show me on Saturday.', 'Love the commitment to the trenches.', 'Intense camp = injuries. Be careful.', 'This is the kind of offseason that wins conferences.', 'Heard the scrimmages were chippy. Good.'],
    champ: ['DYNASTY TALK STARTS NOW.', 'What a run. Congrats to the champs.', 'Best team won. No arguments.', 'I\'ll never forget this season.', 'Already counting down to next year.'],
    welcome: ['Welcome to the league! Can\'t wait to see what the {UM} bring.', 'New program, new rivalries. Let\'s go.', 'Give them two years and they\'ll be a problem.', 'Love the logo, not gonna lie.', 'Expansion teams usually struggle. Prove me wrong.'],
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

  function top10Body(prevPoll) {
    const prev = {};
    (prevPoll || []).forEach((id, i) => { prev[id] = i + 1; });
    return G.poll.slice(0, 10).map((id, i) => {
      const t = L.team(id), p = prev[id];
      const mv = !p ? '(NEW)' : p > i + 1 ? `(▲${p - i - 1})` : p < i + 1 ? `(▼${i + 1 - p})` : '(—)';
      return `${i + 1}. ${t.name} ${t.mascot} ${L.recStr(t)} ${mv}`;
    }).join('\n');
  }

  // ── weekly news ──
  function weekly(wk, results, pollBefore) {
    const label = DATA.WEEK_LABEL(wk);
    const is = issue(`wk-${G.year}-${wk}`, label, 'week');
    const u = L.user();
    const uid = u.id;

    // megathread
    thread(is, {
      tag: 'MEGATHREAD', pinned: true, a: MOD, heat: 60,
      title: `${label} Scoreboard & Discussion Megathread`,
      body: `All the finals from ${label}. Keep it civil, keep it fun.\n\n` + results.map(r => `${rk(r.W.id, r.rankBefore[r.W.id])}${r.W.name} ${r.ws}, ${rk(r.Lo.id, r.rankBefore[r.Lo.id])}${r.Lo.name} ${r.ls}${r.ot ? ' (OT)' : ''}`).join('\n'),
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
          `\n\n${u.name} moves to ${L.recStr(u)} on the season.`;
        thread(is, {
          tag: 'GAME THREAD', mine: true, heat: 90, a: fan(u), teams: [r.W.id, r.Lo.id],
          title: won ? `[Post-Game] ${u.name} ${u.mascot} ${verb} ${opp.name}, ${scoreStr(r)}` : `[Post-Game] ${opp.name} ${verb} ${u.name}, ${scoreStr(r)}`,
          body,
          replies: replies(9, [{ w: 4, team: u, lines: won ? R.winFan : R.loseFan }, { w: 2, team: opp, lines: won ? R.loseFan : R.winFan }, { w: 2, lines: R.neutral }],
            { ...v, WM: r.W.mascot, LM: r.Lo.mascot }),
        });
      }
      // upset
      if (rL && (!rW || rW > rL + 3)) {
        thread(is, {
          tag: 'UPSET', heat: 95 - rL * 2 + (mine ? 5 : 0), teams: [r.W.id, r.Lo.id], a: fan(r.W),
          title: !rW ? `UPSET ALERT: Unranked ${r.W.name} stuns #${rL} ${r.Lo.name}, ${scoreStr(r)}` : `#${rW} ${r.W.name} knocks off #${rL} ${r.Lo.name}, ${scoreStr(r)}`,
          body: `Nobody saw this coming. ${r.W.name} ${r.W.mascot} (${L.recStr(r.W)}) took down ${r.Lo.name} (${L.recStr(r.Lo)}) ${scoreStr(r)}.${sp ? ` ${pname(sp)} led the way with ${star.line}.` : ''}\n\nWhere do the ${r.Lo.mascot} go from here?`,
          replies: replies(7, [{ w: 2, team: r.W, lines: R.upsetW }, { w: 2, team: r.Lo, lines: R.upsetL }, { w: 2, lines: R.upsetN }], v),
        });
      } else if (r.ot || (margin <= 3 && r.ws + r.ls >= 55) || (margin <= 3 && rW && rL)) {
        thread(is, {
          tag: 'INSTANT CLASSIC', heat: 70 + (rW && rL ? 10 : 0), teams: [r.W.id, r.Lo.id],
          title: `INSTANT CLASSIC: ${rk(0, rW)}${r.W.name} outlasts ${rk(0, rL)}${r.Lo.name} ${scoreStr(r)}`,
          body: `What a game. ${r.ws + r.ls} combined points${r.ot ? `, ${r.ot > 1 ? r.ot + ' overtimes' : 'overtime'}` : ''} and a finish nobody will forget.`,
          replies: replies(6, [{ w: 2, team: r.W, lines: R.winFan }, { w: 1, team: r.Lo, lines: R.loseFan }, { w: 2, lines: R.neutral }], v),
        });
      } else if (margin >= 35) {
        thread(is, {
          tag: 'BLOWOUT', heat: 55 + (rW ? 8 : 0), teams: [r.W.id, r.Lo.id],
          title: `${rk(0, rW)}${r.W.name} hangs ${r.ws} on ${r.Lo.name} in a ${r.ws}-${r.ls} rout`,
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
        body: `${pname(p)} put the ${t.mascot} on his back this week. ${DATA.CLASS_LONG[p.cls]}, #${p.num}, out of ${p.home}.\n\nSeason so far: ${L.seasonLine(p)}.`,
        replies: replies(6, [{ w: 2, team: t, lines: R.perf }, { w: 3, lines: R.perf }], { P: pname(p), N: p.num }),
      });
    }

    // poll
    const newOne = pollBefore[0] !== G.poll[0];
    const t1 = L.team(G.poll[0]), t2 = L.team(G.poll[1]), t3 = L.team(G.poll[2]);
    const uR = L.ranked(uid);
    thread(is, {
      tag: 'POLL', heat: newOne ? 85 : 62, a: MOD,
      title: newOne ? `NEW #1: ${t1.name} takes over the top spot in the BlitzBoard Top 10` : `BlitzBoard Top 10 after ${label}: ${t1.name} stays on top`,
      body: top10Body(pollBefore) + (uR ? `\n\n${u.name} checks in at #${uR}.` : `\n\n${u.name} is outside the Top 10 this week.`),
      replies: replies(6, [{ w: 1, lines: R.poll }], { T1: t1.name, T2: t2.name, M3: t3.mascot }),
    });

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
    if (wk >= 5 && wk <= 11) {
      const cold = G.teams.filter(t => t.rec.l >= 4 && t.rec.w <= t.rec.l - 3).sort((a, b) => a.rec.w - b.rec.w)[0];
      if (cold && U.chance(0.55)) {
        thread(is, {
          tag: 'HOT SEAT', heat: 50 + (cold.user ? 25 : 0), teams: [cold.id], a: fan(cold),
          title: cold.user ? `Real talk: is ${cold.name}'s head coach on the hot seat?` : `Hot seat watch: how much longer does ${cold.name}'s staff have?`,
          body: `${cold.name} sits at ${L.recStr(cold)} and the fanbase is restless. Is it the coaching or the roster?`,
          replies: replies(5, [{ w: 2, team: cold, lines: R.hotseat }, { w: 2, lines: R.hotseat }], {}),
        });
      }
    }

    // undefeated watch
    if (wk >= 5 && wk <= 11) {
      const perfect = G.teams.filter(t => t.rec.l === 0 && t.rec.w > 0);
      if (perfect.length && perfect.length <= 5) {
        thread(is, {
          tag: 'DISCUSSION', heat: 52 + perfect.length, a: neutralFan(),
          title: `Undefeated watch: ${perfect.length} team${perfect.length > 1 ? 's' : ''} still perfect after ${label}`,
          body: perfect.map(t => `• ${t.name} ${t.mascot} (${L.recStr(t)})`).join('\n') + '\n\nWho finishes the regular season unbeaten?',
          replies: replies(4, [{ w: 1, lines: R.neutral }], { W: perfect[0].name, L: perfect[perfect.length - 1].name, WM: perfect[0].mascot }),
        });
      }
    }

    // heisman watch
    if ([4, 7, 10].includes(wk)) {
      const hl = L.heismanList(5);
      if (hl.length) {
        const lead = hl[0].p;
        thread(is, {
          tag: 'HEISMAN', heat: 68, a: neutralFan(),
          title: `Heisman Watch: ${pname(lead)} (${L.team(lead.teamId).abbr}) leads the race after ${label}`,
          body: hl.map((x, i) => `${i + 1}. ${x.p.pos} ${pname(x.p)}, ${L.team(x.p.teamId).name} — ${L.seasonLine(x.p)}`).join('\n'),
          replies: replies(5, [{ w: 1, lines: R.heisman }], { P: pname(lead) }),
        });
      }
    }

    // postseason storylines
    if (wk === 11) {
      thread(is, {
        tag: 'POSTSEASON', heat: 80, a: MOD, pinned: false,
        title: 'Championship Weekend is set!',
        body: (G.schedule[12] && G.schedule[12].length ? '' : '') + [0, 1].map(c => { const s = L.standings(c); return `${DATA.CONFS[c].long}: ${s[0].name} vs ${s[1].name}`; }).join('\n'),
        replies: replies(4, [{ w: 1, lines: R.neutral }], { W: t1.name, L: t2.name, WM: t1.mascot }),
      });
    }
    if (wk === 12) {
      for (const r of results) {
        thread(is, {
          tag: 'CHAMPIONS', heat: 82 + (r.W.user ? 10 : 0), teams: [r.W.id], a: fan(r.W), mine: r.W.user,
          title: `${r.W.name} ${r.W.mascot} are your ${DATA.CONFS[r.g.conf].name} Champions!`,
          body: `${r.W.name} beat ${r.Lo.name} ${scoreStr(r)} to claim the ${DATA.CONFS[r.g.conf].long} crown.`,
          replies: replies(5, [{ w: 3, team: r.W, lines: R.champ }, { w: 1, team: r.Lo, lines: R.loseFan }], { LM: r.Lo.mascot }),
        });
      }
      const p = G.poll.slice(0, 4).map(id => L.team(id));
      thread(is, {
        tag: 'PLAYOFF', heat: 92, a: MOD, pinned: true,
        title: 'The College Football Playoff field is SET',
        body: `Semifinal 1: #1 ${p[0].name} vs #4 ${p[3].name}\nSemifinal 2: #2 ${p[1].name} vs #3 ${p[2].name}` + (p.includes(u) ? `\n\n${u.name} is IN.` : `\n\n${u.name} misses the cut.`),
        replies: replies(6, [{ w: 1, lines: R.poll }], { T1: p[0].name, T2: L.team(G.poll[4]).name, M3: p[3].mascot }),
      });
    }
    if (wk === 13) {
      const [a, b] = results.map(r => r.W);
      if (a && b) {
        thread(is, {
          tag: 'PLAYOFF', heat: 94, a: MOD, pinned: true,
          title: `It's ${a.name} vs ${b.name} for the National Championship`,
          body: `The semifinals are in the books. One game left.`,
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
      tag: 'POLL', heat: 80, a: MOD, pinned: true,
      title: `BlitzBoard Preseason Top 10 for ${G.year}`,
      body: top10Body([]).replace(/ \(NEW\)/g, ''),
      replies: replies(6, [{ w: 1, lines: R.poll }], { T1: L.team(G.poll[0]).name, T2: L.team(G.poll[1]).name, M3: L.team(G.poll[2]).mascot }),
    });
    thread(is, {
      tag: 'PREVIEW', heat: 88, a: fan(u), mine: true, teams: [u.id],
      title: `${G.year} ${u.name} ${u.mascot} season preview: ${uR ? `can the #${uR} ${u.mascot} live up to the hype?` : 'is this the year they break through?'}`,
      body: `Ratings heading into the season — OFF ${L.ratings(u).off}, DEF ${L.ratings(u).def}.\n\nOpener: ${(() => { const g = G.schedule[1].find(x => x.h === u.id || x.a === u.id); return g ? `${g.h === u.id ? 'vs' : '@'} ${L.team(g.h === u.id ? g.a : g.h).name}` : 'TBD'; })()}\n\nPredictions?`,
      replies: replies(8, [{ w: 3, team: u, lines: R.winFan.concat(R.camp) }, { w: 2, lines: R.neutral }], { WM: u.mascot, LM: 'opponent', S: '', P: 'our QB', W: u.name, L: 'everyone' }),
    });
    const qbs = Object.values(G.players).filter(p => p.teamId != null && p.pos === 'QB' && L.isStarter(L.team(p.teamId), p)).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
    thread(is, {
      tag: 'HEISMAN', heat: 64, a: neutralFan(),
      title: 'Way-too-early Heisman favorites',
      body: qbs.map((p, i) => `${i + 1}. QB ${pname(p)}, ${L.team(p.teamId).name} (${p.ovr} OVR)`).join('\n'),
      replies: replies(4, [{ w: 1, lines: R.heisman }], { P: qbs[0] ? pname(qbs[0]) : 'the favorite' }),
    });
    sortIssue(is);
  }

  function draftOpen() {
    const d = G.draft;
    const is = issue(`draft-${G.year}`, `Signing Day Draft ${G.year}`, 'draft');
    const u = L.user();
    if (d.kind === 'founding') {
      thread(is, {
        tag: 'NEWS', heat: 96, a: MOD, pinned: true, mine: true, teams: [u.id],
        title: `Welcome to the ${DATA.CONFS[u.conf].long}, ${u.name} ${u.mascot}!`,
        body: `The league officially welcomes its newest program. The ${u.mascot} will build their first recruiting class in the Inaugural Signing Day Draft — ${d.rounds} rounds, snake order.\n\nWelcome aboard, Coach.`,
        replies: replies(8, [{ w: 1, lines: R.welcome }], { UM: u.mascot }),
      });
    }
    const top = d.pool.slice(0, 8).map(id => G.players[id]);
    thread(is, {
      tag: 'RECRUITING', heat: 78, a: insider(),
      title: `Signing Day Draft ${G.year} Big Board: ${pname(top[0])} headlines the class`,
      body: top.map((p, i) => `${i + 1}. ${p.pos} ${pname(p)} — ${'★'.repeat(p.stars)} — ${p.home}`).join('\n'),
      replies: replies(5, [{ w: 1, lines: R.draft }], { M: U.pick(G.teams).mascot }),
    });
    sortIssue(is);
  }

  function draftRecap() {
    const d = G.draft;
    const is = issue(`draft-${G.year}`, `Signing Day Draft ${G.year}`, 'draft');
    const u = L.user();
    const g = d.grades;
    const first = d.log[0], fp = G.players[first.pid];
    thread(is, {
      tag: 'RECRUITING', heat: 80, a: insider(), teams: [first.teamId],
      title: `${L.team(first.teamId).name} make ${fp.pos} ${pname(fp)} the #1 overall pick`,
      body: `${pname(fp)} (${'★'.repeat(fp.stars)}, ${fp.ovr} OVR) out of ${fp.home} goes first overall.`,
      replies: replies(4, [{ w: 1, team: L.team(first.teamId), lines: R.winFan }, { w: 2, lines: R.draft }], { WM: L.team(first.teamId).mascot, LM: 'rivals', P: pname(fp), M: L.team(first.teamId).mascot, S: '' }),
    });
    const steal = d.log.filter(e => e.overall > 40).map(e => ({ e, p: G.players[e.pid] })).sort((a, b) => L.prospectValue(b.p) - L.prospectValue(a.p))[0];
    if (steal) {
      const t = L.team(steal.e.teamId);
      thread(is, {
        tag: 'DISCUSSION', heat: 66 + (t.user ? 10 : 0), teams: [t.id],
        title: `Steal of the draft? ${t.name} land ${steal.p.pos} ${pname(steal.p)} at pick #${steal.e.overall}`,
        body: `${'★'.repeat(steal.p.stars)} prospect, ${steal.p.ovr} OVR with ${U.potGrade(steal.p.pot)} potential. How did he slide that far?`,
        replies: replies(4, [{ w: 1, lines: R.draft }], { M: t.mascot }),
      });
    }
    const mine = d.log.filter(e => e.teamId === u.id).map(e => ({ e, p: G.players[e.pid] }));
    thread(is, {
      tag: 'DRAFT GRADE', heat: 90, mine: true, a: fan(u), teams: [u.id],
      title: `${u.name} draft class reaction thread — BlitzBoard grade: ${g[u.id] ? g[u.id].grade : 'B'}`,
      body: mine.map(x => `R${x.e.round} #${x.e.overall}: ${x.p.pos} ${pname(x.p)} ${'★'.repeat(x.p.stars)} (${x.p.ovr})`).join('\n'),
      replies: replies(7, [{ w: 3, team: u, lines: R.draft }, { w: 1, lines: R.draft }], { M: u.mascot }),
    });
    thread(is, {
      tag: 'DRAFT GRADE', heat: 70, a: insider(),
      title: `Instant draft grades for all ${G.teams.length} programs`,
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
    const is = issue(`wk-${G.year}-14`, DATA.WEEK_LABEL(14), 'week');
    const c = L.team(G.champion), u = L.user();
    thread(is, {
      tag: 'CHAMPIONS', heat: 99, pinned: true, a: MOD, teams: [c.id], mine: c.user,
      title: `${c.name.toUpperCase()} ${c.mascot.toUpperCase()} ARE THE ${G.year} NATIONAL CHAMPIONS`,
      body: `${c.name} finish ${L.recStr(c)} and hoist the trophy.${c.user ? `\n\nFrom expansion dreams to national champions — what a ride for ${u.name}.` : ''}`,
      replies: replies(8, [{ w: 3, team: c, lines: R.champ }, { w: 2, lines: R.champ.concat(R.neutral) }], { W: c.name, WM: c.mascot, L: 'the field', LM: 'rivals' }),
    });
    const h = G.awards.heisman;
    if (h) {
      const ht = L.team(h.team);
      thread(is, {
        tag: 'HEISMAN', heat: 88 + (ht.user ? 8 : 0), a: MOD, teams: [ht.id],
        title: `${h.name} (${ht.abbr}) wins the ${G.year} Heisman Trophy`,
        body: `The ${ht.name} ${h.pos} takes home college football's top individual honor.\n\nSeason: ${h.line}`,
        replies: replies(5, [{ w: 2, team: ht, lines: R.perf }, { w: 2, lines: R.heisman }], { P: h.name, N: '' }),
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
        title: `Sticker Report: ${big.filter(x => x.tier === 3).length} players earn Elite helmet stickers this offseason`,
        body: 'Helmet stickers earned on the field last season:\n\n' + big.map(x => `• ${DATA.STICKER_TIERS[x.tier].label} ${DATA.STICKERS[x.id].name} — ${x.pos} ${x.name} (${L.team(x.teamId).abbr})`).join('\n'),
        replies: replies(4, [{ w: 1, lines: R.draft }], { M: u.mascot }),
      });
    }
    if (o.leagueDeclared.length) {
      thread(is, {
        tag: 'NEWS', heat: 80, a: insider(),
        title: `${o.leagueDeclared.length} underclassmen declare early for the pros`,
        body: o.leagueDeclared.slice(0, 10).map(p => `• ${p.pos} ${p.name} (${L.team(p.teamId) ? L.team(p.teamId).abbr : ''}) — ${p.ovr} OVR`).join('\n'),
        replies: replies(4, [{ w: 1, lines: R.neutral }], { W: 'they', L: 'everyone', WM: 'pros' }),
      });
    }
    thread(is, {
      tag: 'DISCUSSION', heat: 84, mine: true, a: fan(u), teams: [u.id],
      title: `${u.name} lose ${o.departed.length + o.declared.length} players — who steps up in ${G.year}?`,
      body: o.departed.concat(o.declared).sort((a, b) => b.ovr - a.ovr).slice(0, 8).map(p => `• ${p.pos} ${p.name} (${p.ovr})`).join('\n') + '\n\nThe draft is next. What are the biggest needs?',
      replies: replies(6, [{ w: 3, team: u, lines: R.draft }, { w: 1, lines: R.neutral }], { M: u.mascot, W: u.name, L: 'rivals', WM: u.mascot }),
    });
    sortIssue(is);
  }

  return { weekly, preseason, draftOpen, draftRecap, campReport, seasonEnd, offseason };
})();
