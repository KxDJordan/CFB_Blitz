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
    winFan: ['WE ARE SO BACK. {WM} football is a lifestyle.', 'Told y\'all all week. {S}. Never in doubt.', 'That second half was a clinic. Coaching staff deserves an extension.', 'Somebody check on the {LM} fans, they\'ve gone quiet', 'Defense was flying around today. This team is different.', 'Not our cleanest game but a W is a W.', 'Clear your January calendar. We are going places.', '{P} is HIM. Put some respect on that name.', 'My voice is gone. Worth it.', 'Can we play every week like that please', 'Bandwagon is filling up fast. Get on now.', 'That\'s a complete team win. Offense, defense, special teams.', 'Every week this team finds a new way to win.', 'Coaches had a great game plan and the players executed it.', 'Somebody frame that box score.', 'The {WM} are a problem and the league knows it.'],
    loseFan: ['I need a week off from this team.', 'Same old {LM}. Every. Single. Year.', 'That play-calling in the 4th was criminal.', 'Offensive line got bullied all game. Fix it.', 'Don\'t panic. Long season. ...okay maybe panic a little.', 'Refs didn\'t lose us that game but they sure didn\'t help.', 'Turnovers killed us. You can\'t give a good team extra possessions.', 'I\'m turning off the TV and going outside. Goodbye.', 'Front office needs to make a trade. We were outmanned.', 'We\'ll be back. This one stings though.', 'Penalties, drops, missed tackles. Death by a thousand cuts.', 'Third-down defense was a disaster all game.', 'We had chances. Didn\'t take a single one.', 'Fine. It\'s fine. Everything is fine.', 'Effort was there. Execution wasn\'t.', 'Can we run the ball more than twice a quarter please?'],
    neutral: ['Watched this one from the couch and it did not disappoint.', 'Neither team looked complete honestly.', 'The talent gap was obvious from the first drive.', 'People are going to overreact to this result. It\'s one game.', 'This conference is wide open this year.', 'Good game, but both secondaries need work.', 'Has anyone noticed the {WM} quietly getting better every week?', 'Big win for {W}. That\'s a playoff-caliber win.', 'Hot take: {L} are still the better team.', 'I had {L} in my pick\'em. Pain.', 'Coaching made the difference in this one.', 'Neutral fan here, that was fun to watch.', 'The box score doesn\'t tell the whole story.', '{W} are trending up. Write it down.', 'Both teams left points on the field.', 'Not a great look for the {LM} defense.'],
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
    welcome: ['Welcome to the league! Can\'t wait to see what the {UM} bring.', 'New franchise, new rivalries. Let\'s go.', 'Give them two years and they\'ll be a problem.', 'Love the logo, not gonna lie.', 'Expansion teams usually struggle. Prove me wrong.', 'Already bought the jersey. No regrets.', 'Building through the draft is the right call.', 'Can\'t wait for the first home game.', 'The {UM}? Great name. Instant classic.', 'Watch them steal a few games this year.'],
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

  // ── situational banks ──
  // Each game is read for what actually happened — a comeback, a shutout, five sacks, a snow game, a streak, a star's
  // big day — and most replies come from those moments: the winners' fans (w), the losers' fans (l) and everyone else (n).
  // {vars}: W/L names, WM/LM mascots, S score, DEF fourth-quarter deficit, TOT combined points, TO giveaways, RY/PY
  // winner's rushing/passing yards, SK sacks, STRK win streak, SKID losing streak, REC/LREC records, WX weather,
  // QB/RB/WR/DP the stars and QBL/RBL/WRL/DPL their lines, LS the loser's score, LST the loser's best player, RIV the rival.
  const SIT = {
    comeback: {
      w: ['Down {DEF} going into the fourth and we STILL win. This team has a heartbeat.', 'I turned it off at the end of the third. I am a fraud and I apologize to the {WM}.', 'Never. Out. Of. It. That fourth quarter was the most fun I\'ve had all year.', 'Whatever the coaches said between the 3rd and 4th, bottle it.', 'Comeback kids. Stop scaring me like this though.', '{QB} in the fourth quarter is a different human being.'],
      l: ['Up {DEF} in the fourth. UP {DEF}. I need to lie down.', 'Prevent defense prevents you from winning. Every time.', 'We played not to lose and we lost. Textbook.', 'Blowing a {DEF}-point lead in one quarter should come with a fine.', 'Three quarters of good football doesn\'t count for anything apparently.', 'How do you go conservative with that lead? HOW?'],
      n: ['{W} were dead in the water after three. What a finish.', 'That {DEF}-point fourth-quarter comeback is the story of the week.', 'This is why you never leave early.', 'Coaching malpractice on one side, guts on the other.', '{L} fans are going to see that fourth quarter in their sleep.'],
    },
    shutout: {
      w: ['ZERO. Put a zero on the board and frame it.', 'Defense pitched a shutout. Give that coordinator a raise.', 'They couldn\'t find the end zone with a map. Or the field goal posts.', 'A shutout in this league is ridiculous. {WM} D is elite.', 'Shoutout to the secondary, nobody got open all day.'],
      l: ['Zero points. ZERO. Fire the OC into the sun.', 'Did our offense even get on the bus?', 'I\'ve seen better offense at a flag football league.', 'Not one point. I don\'t even know what to say.', 'Shut out. Embarrassing doesn\'t cover it.'],
      n: ['Getting shut out in this league takes real effort.', '{W} defense is legit. That\'s not a fluke.', 'Somebody check on the {LM} offensive coordinator.', 'Doughnut on the scoreboard for the {LM}. Brutal.'],
    },
    shootout: {
      w: ['{TOT} combined points and we had the last word. My heart can\'t take it.', 'Defense optional, apparently. Still a W.', 'Fantasy owners are eating good tonight.', 'Never been so stressed during a win.'],
      l: ['You can\'t give up {WS} and expect to win. Our defense was a turnstile.', 'Scored enough to win most weeks. Didn\'t matter.', 'If we\'d made ONE stop.', 'Offense did its job. Defense took the day off.'],
      n: ['{TOT} points?? Nobody was tackling anybody.', 'That one was basically a track meet.', 'Every defensive coordinator who watched that is in pain.', 'Video-game scoreboard. Loved every minute.'],
    },
    slugfest: {
      w: ['Ugly win. Still counts. Defense carried us.', 'Old-school football. Field position, defense, a couple of kicks.', 'Not pretty but I\'ll take a {S} win every week.', 'Winning ugly is a skill too.'],
      l: ['Our offense could not have found the end zone with GPS.', 'Defense played well enough to win. Offense wasted it.', '{LS} points. In this league. Wow.', 'Somebody please draft a quarterback.'],
      n: ['{TOT} total points. Both offenses should be embarrassed.', 'Defensive struggle. Some of you will call it boring. I loved it.', 'That game set offense back about 50 years.'],
    },
    giveaways: {
      w: ['Defense forced {TO} turnovers. That\'s the game right there.', 'Takeaways win games. {TO} of them today.', 'Ball hawks everywhere. They were giving it away and we said thank you.'],
      l: ['{TO} turnovers. You can\'t beat anybody turning it over {TO} times.', 'Ball security drills. Every day. Until it\'s fixed.', 'We beat ourselves. {TO} giveaways.', 'Protect the football! It\'s not complicated!'],
      n: ['{TO} turnovers by the {LM} is the whole story.', 'Can\'t win the turnover battle that badly and expect to win.'],
    },
    ground: {
      w: ['{RY} rushing yards. We just lined up and ran it down their throats.', 'O-line moved people all day. Pay the big guys.', 'When you can run it like that, the play-action is free.', 'Ground and pound is BACK.'],
      l: ['Gave up {RY} on the ground. Did we even have linebackers out there?', 'Everybody knew the run was coming and we still couldn\'t stop it.', 'Run defense was a disaster. Somebody fill a gap.'],
      n: ['{RY} rushing yards is a beatdown at the line of scrimmage.', '{W} owned the trenches today, simple as that.'],
    },
    air: {
      w: ['{PY} through the air. Air raid is real.', 'Our QB carved them up. Defense had no answers.', 'Receivers open by a mile all day long.'],
      l: ['{PY} passing yards allowed. Is the secondary on strike?', 'Couldn\'t get near the quarterback and couldn\'t cover anyone.', 'Zone, man, blitz, nothing worked. Cooked.'],
      n: ['{PY} passing yards is a clinic.', 'That secondary is going to be watching a long film session.'],
    },
    sacks: {
      w: ['{SK} SACKS. Their QB is going to feel that tomorrow.', 'The pass rush lived in the backfield.', 'Edge rushers ate. That\'s how you win.'],
      l: ['{SK} sacks allowed. The O-line needs to be benched. All five.', 'Our QB is going to need a new spine.', 'Somebody block somebody. Please.'],
      n: ['{SK} sacks is a pass rush you have to game-plan around.', 'That {WM} front four is a problem.'],
    },
    ot: {
      w: ['OVERTIME WINNERS. I aged ten years.', 'Extra football, extra joy. What a game.', 'Coin flip, drive, win. Beautiful.'],
      l: ['Lost in overtime. Nothing hurts like that.', 'So close. Overtime losses hit different.', 'We had the ball with a chance to win it and we blew it.'],
      n: ['Overtime thriller. Football at its best.', 'Both teams deserved that one, honestly.'],
    },
    nail: {
      w: ['{S}. Won by a hair and I don\'t care.', 'Close games are character builders. We have character.', 'Clutch when it mattered.'],
      l: ['Lost by a field goal or less. Every little mistake mattered.', 'One play. One play changes that game.', 'That\'s the kind of loss that keeps you up at night.'],
      n: ['Coin-flip game, could\'ve gone either way.', 'Nail-biter. My nails are gone.'],
    },
    blowout: {
      w: ['{S}. That wasn\'t a game, that was a statement.', 'Pulled the starters in the fourth. Dominance.', 'We were up so big I started watching the other games.'],
      l: ['{S}. I want my three hours back.', 'That wasn\'t a loss, that was an embarrassment.', 'Changed the channel at halftime. Glad I did.', 'Outcoached, outplayed, outclassed.'],
      n: ['That margin says a lot about where both teams are.', 'Mercy rule when?'],
    },
    hot: {
      w: ['{STRK} straight! Nobody wants to see us right now.', 'Win streak at {STRK}. Book the playoff tickets.', '{STRK} in a row and we haven\'t played our best game yet.', 'This team is ROLLING. {REC}.'],
      l: ['Ran into a buzzsaw. {W} are on a {STRK}-game heater.'],
      n: ['{W} have won {STRK} straight. Are they the best team in the league?', 'Nobody is hotter than the {WM} right now.', '{STRK}-game win streak. That\'s not luck anymore.'],
    },
    skid: {
      w: [],
      l: ['That\'s {SKID} straight losses. Something has to change.', '{SKID}-game skid. I don\'t even recognize this team.', 'Lost {SKID} in a row. Bench everyone. Start the backups. Something.', '{LREC}. How did we get here?'],
      n: ['{L} have dropped {SKID} straight. The wheels are off.', 'Somebody throw the {LM} a life raft.'],
    },
    unbeatenFalls: {
      w: ['WE BROKE THE STREAK. Undefeated no more!', 'Somebody had to hand them their first loss. Proud it was us.'],
      l: ['Perfect season over. Okay. Still one of the best teams in the league.', 'Had to lose sometime. Better now than in January.', 'Exposed. Or just a bad day? Ask me in two weeks.'],
      n: ['The unbeaten {LM} finally go down. {W} with the statement win.', 'So much for the perfect season.'],
    },
    firstWin: {
      w: ['FIRST WIN OF THE SEASON. I\'M CRYING.', 'We did it! We actually won a football game!', 'Off the schneid! Parade on Main Street.'],
      l: ['Losing to a winless team. Lowest point of the season.', 'Gave {W} their first win. Unforgivable.'],
      n: ['{W} finally get in the win column. Good for them.', 'Somebody\'s survivor pool died on that one.'],
    },
    winless: {
      w: [],
      l: ['{LREC}. Tank for the top pick at this point.', 'Still winless. I\'m running out of things to say.', 'At least the draft position is looking great.'],
      n: ['Still no wins for the {LM}. Rough year.', 'The {LM} are in the running for the top pick.'],
    },
    weather: {
      w: ['Played in the {WX} and didn\'t care. Tough team.', 'Bad-weather football and we were built for it.', 'Bad weather, ground game, W. Recipe.'],
      l: ['Can\'t blame the {WX}. Both teams played in it.', 'Our offense froze. Literally and figuratively.', 'Every ball on the ground in the {WX}. Ugh.'],
      n: ['Love a bad-weather game. Pure football.', 'The {WX} turned it into a different sport.', 'You could barely see the field in the {WX}.'],
    },
    rival: {
      w: ['BEAT {RIV}! Best day of the year.', 'Bragging rights are ours for 365 days.', 'Our record doesn\'t matter. We beat {RIV}.', 'Their fans have been quiet all day. I love it.'],
      l: ['Losing to {RIV} ruins my whole year.', 'I can\'t go to work tomorrow. My coworker is a {RIV} fan.', 'Next year. Mark it down. Next year.'],
      n: ['Rivalry game delivered. Best atmosphere of the week.', 'Throw the records out for this one.'],
    },
    playoffW: {
      w: ['WE\'RE MOVING ON! One step closer.', 'Playoff win! This is what we waited all year for.', 'Win and advance. That\'s all that matters now.'],
      l: [],
      n: ['{W} survive and advance.', '{W} look like a real contender right now.'],
    },
    playoffL: {
      w: [],
      l: ['Season over. Proud of the run but this hurts.', 'One and done. Offseason starts now. Fix the roster.', 'Hard to end it like that after the year we had.', 'Thank you to the seniors. We\'ll be back.'],
      n: ['{L} go home. Rough end to a good season.', 'That\'s the end of the road for the {LM}.'],
    },
    qbStar: {
      w: ['{QB} was surgical: {QBL}.', '{QBL}. {QB} is HIM.', '{QB} made every throw. Elite day.', 'Give {QB} the keys to the city.'],
      l: [],
      n: ['{QB} lit them up: {QBL}.', '{QB} is putting together an MVP case.'],
    },
    rbStar: {
      w: ['{RB} ran like a man possessed: {RBL}.', 'Feed {RB}. Every snap. Forever.', '{RB} broke their spirit.'],
      l: ['Nobody could tackle {RB}. Nobody.'],
      n: ['{RB} with {RBL}. Bell cow back.', '{RB} is the best back in the league right now.'],
    },
    wrStar: {
      w: ['{WR} was open all day: {WRL}.', 'Throw it up to {WR}. He\'s always open.', '{WR} = WR1 in this league.'],
      l: ['Who was covering {WR}? Anybody?'],
      n: ['{WR} put up {WRL}. Matchup nightmare.'],
    },
    defStar: {
      w: ['{DP} wrecked the game: {DPL}.', '{DP} was in their backfield all day.', 'Defensive Player of the Year. {DP}. Done.'],
      l: ['Our line couldn\'t block {DP} if their lives depended on it.'],
      n: ['{DP} with {DPL}. Game-wrecker.'],
    },
    wastedStar: {
      w: [],
      l: ['{LST} did everything he could. Rest of the team let him down.', 'Wasted a monster day from {LST}.'],
      n: ['Tough to lose when {LST} plays like that.'],
    },
  };
  // tailored banks for the other threads ({P} player, {POS}, {WK} weeks, {Y}/{TD} yards and scores, {LN} stat line)
  const TAIL = {
    injPos: {
      QB: ['Losing your QB for {WK} weeks... the season might hinge on the backup now.', 'Backup quarterback time. Pray for us.', 'Without {P} under center this offense is in real trouble.', 'Every QB injury is a franchise-level injury.'],
      RB: ['Next back up. Running backs are replaceable, right? ...right?', 'Run game takes a big hit without {P}.', 'Time to see what the backup back can do.'],
      WR: ['Our QB just lost his favorite target.', 'Receiver depth is about to get tested.', 'Who stretches the field now without {P}?'],
      TE: ['Losing the tight end hurts the run game and the passing game.', 'Red zone just got a lot harder without {P}.'],
      OL: ['Losing an offensive lineman is underrated. The whole line has to shuffle.', 'Protect the QB! ...with who?', 'Next man up on the O-line. Gulp.'],
      DL: ['Front four just got a lot thinner.', 'Pass rush takes a hit without {P}.', 'Run defense is going to feel that one.'],
      LB: ['Losing the guy who calls the defense is brutal.', 'Linebacker depth getting tested. Not great.'],
      CB: ['Secondary was already thin. Uh oh.', 'Opposing QBs are licking their chops.', 'Who covers the other team\'s WR1 now?'],
      S: ['No safety net back there anymore. Literally.', 'Losing {P} leaves the deep middle wide open.'],
      K: ['Kicker injury? Somebody check the waiver wire.'],
    },
    injShort: ['{WK} week{S} isn\'t too bad. He\'ll be back before you know it.', 'Could\'ve been way worse. Short stint.', 'Rest up, get healthy, come back strong.'],
    injLong: ['{WK} weeks?! That\'s a massive chunk of the season.', 'Season-altering injury. Front office needs to make a move.', 'Out {WK} weeks... I\'m not ready to talk about it.', 'This one stings. Long road back.'],
    injStar: ['One of the best players in the league. Huge blow for everyone.', 'League\'s worse without {P} on the field.', 'Their whole season just changed.'],
    perf: {
      pass: ['{Y} passing yards and {TD} touchdowns. Video game numbers.', 'Picked the defense apart all day: {LN}.', '{P} saw everything before the snap. Surgical.', 'Defenses better start blitzing {P}. Or praying.'],
      rush: ['{Y} rushing yards. Nobody could get a hand on him.', 'Ran through, around and over people: {LN}.', 'Feed {P} the ball 30 times a game. Simple.', 'That O-line opened holes you could drive a bus through, and {P} hit every one.'],
      rec: ['{Y} receiving yards. Simply uncoverable.', 'Every time the ball went his way, something happened: {LN}.', 'Double-team {P}? Triple-team? Doesn\'t matter.', '{P} is the most dangerous pass catcher in the league.'],
      def: ['{LN}. He lived in the backfield.', 'Offensive coordinators are going to have to game-plan around {P}.', 'Defensive Player of the Year talk starts now.', 'A one-man wrecking crew: {LN}.'],
    },
    pollMove: ['Biggest riser this week: {RISER}. Deserved.', '{FALLER} dropping that far is an overreaction.', '{FALLER} fans are going to be furious about that drop.', '{RISER} climbing fast. Statement week.', 'The {RISER} jump is the right call. They\'re for real.'],
    pollMine: ['#{UR}? Disrespect. We should be higher.', '#{UR} feels right. Earn the rest.', 'Climbing the rankings. Keep stacking wins.'],
    pollOut: ['Outside the top 10 again. Prove them wrong.', 'Rankings don\'t matter. Wins do.'],
    mvpNonQB: ['A {POS} leading the MVP race? Love to see it.', 'Finally a non-QB getting MVP love.', 'Voters will find a way to give it to a quarterback anyway.'],
    tradeBlock: ['BLOCKBUSTER. Didn\'t think anyone would pull the trigger on {P}.', 'An {OVR}-overall player on the move. This changes the league.', 'Trade of the year. Easy.'],
    tradeVet: ['{P} is {AGE}. Contender buying a vet for one more run.', 'Buying a {AGE}-year-old is risky. Win now or bust.', 'Veteran presence matters in January.'],
    tradeYoung: ['{P} is only {AGE}. That\'s a long-term piece.', 'Buying young talent is how you build a dynasty.', 'The ceiling on {P} is sky-high.'],
    tradePicks: ['Pick swaps are boring until those picks turn into stars.', 'Somebody is stockpiling draft capital.', 'Future picks for future picks. Ask me in three years.'],
    faBig: ['${SAL}M a year?! That\'s a lot of money for one player.', 'Big contract, big expectations for {P}.', 'Cap space was burning a hole in their pocket.'],
    faOld: ['{P} is {AGE}. Hope that contract doesn\'t age badly.', 'Paying for what he was, not what he is.', 'Veteran deal for a contender. I get it.'],
    faStar: ['Best player on the market and they got him. Huge.', '{P} is a difference-maker. Great signing.'],
    draftGood: ['{G} grade! Front office nailed it.', 'Best class in the league and it isn\'t close.', 'Scouts earned their paychecks this year.', 'Our future is bright. {G} is right.'],
    draftBad: ['A {G}? Who was running the war room?', 'Reached on half these guys. {G} is generous.', 'I\'ll reserve judgment... no I won\'t. Bad class.', 'Grades are meaningless, but {G} still stings.'],
  };
  // how each storyline reads in the opening post
  const STORY = {
    comeback: 'Came back from {DEF} down in the fourth quarter', shutout: 'Shutout', shootout: '{TOT}-point shootout', slugfest: 'Defensive slugfest — {TOT} points total',
    giveaways: '{L} turned it over {TO} times', ground: '{RY} rushing yards for {W}', air: '{PY} passing yards for {W}', sacks: '{SK} sacks by the {WM} defense',
    ot: 'Decided in overtime', nail: 'Decided by {M} point{MS}', blowout: '{M}-point blowout', hot: '{W} have won {STRK} straight', skid: '{L} have lost {SKID} straight',
    unbeatenFalls: '{L} suffer their first loss', firstWin: '{W} get their first win of the season', winless: '{L} fall to {LREC}', weather: 'Played in the {WX}',
    rival: 'Rivalry game', playoffW: '{W} advance', playoffL: '{L} are eliminated',
  };
  // read a finished game for its storylines (and the names and numbers the replies need)
  function gameCtx(r) {
    const g = r.g, box = g.box || {}, ts = box.ts || [{}, {}], qs = box.qs || [[0], [0]];
    const wSide = g.hs > g.as ? 0 : 1, TW = ts[wSide] || {}, TL = ts[1 - wSide] || {};
    const sum3 = s => (qs[s] || []).slice(0, 3).reduce((a, b) => a + (b || 0), 0);
    const def = sum3(1 - wSide) - sum3(wSide), margin = r.ws - r.ls, tot = r.ws + r.ls;
    const wx = L.weather(g), wxWord = { snow: 'snow', rain: 'rain', storm: 'storm', wind: 'wind' }[wx.type];
    const best = (side, kind) => r.top.find(x => x.side === side && x.kind === kind && G.players[x.pid]);
    const qb = best(wSide, 'pass'), rb = best(wSide, 'rush'), wr = best(wSide, 'rec'), dp = best(wSide, 'def');
    const lstar = r.top.find(x => x.side !== wSide && G.players[x.pid] && x.val >= 180);
    const nm = x => (x ? pname(G.players[x.pid]) : '');
    const riv = (r.W.user || r.Lo.user) && Career.rivalGame(g);
    const v = {
      W: r.W.name, L: r.Lo.name, WM: r.W.mascot, LM: r.Lo.mascot, S: scoreStr(r), DEF: def, TOT: tot, M: margin, MS: margin === 1 ? '' : 's', WS: r.ws, LS: r.ls,
      TO: TL.to || 0, RY: TW.ry || 0, PY: TW.py || 0, SK: TW.sk || 0, STRK: r.W.rec.streak, SKID: -r.Lo.rec.streak, REC: L.recStr(r.W), LREC: L.recStr(r.Lo),
      WX: wxWord || '', QB: nm(qb), QBL: qb ? qb.line : '', RB: nm(rb), RBL: rb ? rb.line : '', WR: nm(wr), WRL: wr ? wr.line : '', DP: nm(dp), DPL: dp ? dp.line : '',
      RIV: riv ? (r.W.user ? r.Lo.name : r.W.name) : '',
    };
    const lsBest = lstar ? nm(lstar) : '';
    if (lsBest) v.LST = lsBest;
    const reg = g.wk <= SEA.REG, tags = [];
    if (def > 0) tags.push('comeback');
    if (r.ls === 0) tags.push('shutout');
    else if (tot <= 24) tags.push('slugfest');
    if (tot >= 66) tags.push('shootout');
    if ((TL.to || 0) >= 3) tags.push('giveaways');
    if ((TW.ry || 0) >= 190) tags.push('ground');
    if ((TW.py || 0) >= 320) tags.push('air');
    if ((TW.sk || 0) >= 5) tags.push('sacks');
    if (r.ot) tags.push('ot'); else if (margin <= 3) tags.push('nail');
    if (margin >= 28) tags.push('blowout');
    if (r.W.rec.streak >= 4) tags.push('hot');
    if (r.Lo.rec.streak <= -3 && r.Lo.rec.w > 0) tags.push('skid');
    if (reg && r.Lo.rec.l === 1 && r.Lo.rec.w >= 4) tags.push('unbeatenFalls');
    if (reg && r.W.rec.w === 1 && r.W.rec.l >= 2) tags.push('firstWin');
    if (reg && r.Lo.rec.w === 0 && r.Lo.rec.l >= 3) tags.push('winless');
    if (wxWord) tags.push('weather');
    if (riv) tags.push('rival');
    if (!reg) tags.push('playoffW', 'playoffL');
    if (qb && (qb.y >= 300 || qb.td >= 3)) tags.push('qbStar');
    if (rb && (rb.y >= 130 || rb.td >= 2)) tags.push('rbStar');
    if (wr && (wr.y >= 120 || wr.td >= 2)) tags.push('wrStar');
    if (dp && (dp.sk >= 2 || dp.int >= 2)) tags.push('defStar');
    if (lsBest) tags.push('wastedStar');
    return { tags, v };
  }
  // the storylines as bullet points for an opening post
  const storyLines = ctx => ctx.tags.filter(t => STORY[t]).map(t => `• ${U.fill(STORY[t], ctx.v)}`).join('\n');
  // replies for a game: mostly its storylines, with some general reactions mixed in
  function gameReplies(n, r, ctx, opts = {}) {
    const pools = (opts.extra || []).slice(), { W, Lo } = r, wFan = opts.wFan ?? 1, lFan = opts.lFan ?? 1;
    for (const t of ctx.tags) {
      const b = SIT[t];
      if (!b) continue;
      if (b.w.length) pools.push({ w: 3 * wFan, team: W, lines: b.w });
      if (b.l.length) pools.push({ w: 3 * lFan, team: Lo, lines: b.l });
      if (b.n.length) pools.push({ w: 2, lines: b.n });
    }
    pools.push({ w: 1.2 * wFan, team: W, lines: R.winFan }, { w: 1.2 * lFan, team: Lo, lines: R.loseFan }, { w: 1, lines: R.neutral });
    return replies(n, pools, { ...ctx.v, P: ctx.v.QB || ctx.v.RB || ctx.v.WR || ctx.v.DP || 'our QB', N: '' });
  }

  function replies(n, pools, vars) {
    // never more replies than there are different things to say
    n = Math.min(n, new Set(pools.filter(p => p.w > 0).flatMap(p => p.lines)).size);
    const ago = agoList(n), out = [], used = new Set();
    for (let i = 0; i < n; i++) {
      // no reply repeats within a thread
      let pool, line;
      // (and none that would show a {placeholder} this thread has no value for)
      for (let k = 0; k < 40; k++) { pool = U.wpick(pools, p => p.w); line = U.pick(pool.lines); if (!used.has(line) && !/\{[A-Z]+\}/.test(U.fill(line, vars))) break; }
      used.add(line);
      const a = pool.team === undefined ? neutralFan() : fan(pool.team);
      out.push({ a, text: U.fill(line, vars), likes: Math.max(0, Math.round(U.rand(2, 260) / (1 + i * 0.25))), ago: ago[i] });
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
      const ctx = gameCtx(r), story = storyLines(ctx), has = t => ctx.tags.includes(t);
      let covered = false;

      if (mine) {
        const won = r.W.id === uid, opp = won ? r.Lo : r.W;
        const verb = has('comeback') ? U.pick(['rally past', 'storm back to beat', 'come back on']) : margin >= 28 ? U.pick(['demolish', 'steamroll', 'bury']) : margin <= 3 ? U.pick(['survive', 'edge', 'escape']) : U.pick(['beat', 'take down', 'handle']);
        const body = `FINAL: ${r.W.name} ${r.ws}, ${r.Lo.name} ${r.ls}${r.ot ? ' in overtime' : ''}.` + (story ? `\n\nStorylines:\n${story}` : '') + `\n\nTop performers:\n` +
          r.top.slice(0, 4).map(x => { const p = G.players[x.pid]; return p ? `• ${p.pos} ${pname(p)} (${L.team(p.teamId).abbr}): ${x.line}` : ''; }).join('\n') +
          `\n\nConditions: ${L.weatherLine(L.weather(r.g))}` +
          (wk <= SEA.REG ? `\n\n${u.name} moves to ${L.recStr(u)} on the season.` : '');
        thread(is, {
          tag: 'GAME THREAD', mine: true, heat: 90, a: fan(u), teams: [r.W.id, r.Lo.id],
          title: won ? `[Post-Game] ${u.name} ${u.mascot} ${verb} ${opp.name}, ${scoreStr(r)}` : `[Post-Game] ${opp.name} ${verb} ${u.name}, ${scoreStr(r)}`,
          body,
          // your fans do most of the talking in your game thread
          replies: gameReplies(10, r, ctx, won ? { wFan: 2 } : { lFan: 2 }),
        });
      }
      // upset (by the power rankings)
      if (rL && (!rW || rW > rL + 3)) {
        covered = true;
        thread(is, {
          tag: 'UPSET', heat: 95 - rL * 2 + (mine ? 5 : 0), teams: [r.W.id, r.Lo.id], a: fan(r.W),
          title: !rW ? `UPSET ALERT: ${r.W.name} stun the #${rL} ${r.Lo.name}, ${scoreStr(r)}` : `#${rW} ${r.W.name} knock off #${rL} ${r.Lo.name}, ${scoreStr(r)}`,
          body: `Nobody saw this coming. The ${r.W.name} ${r.W.mascot} (${L.recStr(r.W)}) took down ${r.Lo.name} (${L.recStr(r.Lo)}) ${scoreStr(r)}.${sp ? ` ${pname(sp)} led the way with ${star.line}.` : ''}` + (story ? `\n\n${story}` : '') + `\n\nWhere do the ${r.Lo.mascot} go from here?`,
          replies: gameReplies(8, r, ctx, { extra: [{ w: 5, team: r.W, lines: R.upsetW }, { w: 5, team: r.Lo, lines: R.upsetL }, { w: 4, lines: R.upsetN }] }),
        });
      } else if (r.ot || (margin <= 3 && r.ws + r.ls >= 55) || (margin <= 3 && rW && rL)) {
        covered = true;
        thread(is, {
          tag: 'INSTANT CLASSIC', heat: 70 + (rW && rL ? 10 : 0), teams: [r.W.id, r.Lo.id],
          title: `INSTANT CLASSIC: ${r.W.name} outlast ${r.Lo.name} ${scoreStr(r)}`,
          body: `What a game. ${r.ws + r.ls} combined points${r.ot ? `, ${r.ot > 1 ? r.ot + ' overtime periods' : 'overtime'}` : ''} and a finish nobody will forget.` + (story ? `\n\n${story}` : ''),
          replies: gameReplies(7, r, ctx),
        });
      } else if (margin >= 35) {
        covered = true;
        thread(is, {
          tag: 'BLOWOUT', heat: 55 + (rW ? 8 : 0), teams: [r.W.id, r.Lo.id],
          title: `${r.W.name} hang ${r.ws} on ${r.Lo.name} in a ${r.ws}-${r.ls} rout`,
          body: `Total domination. ${r.W.name} led wire to wire.` + (story ? `\n\n${story}` : ''),
          replies: gameReplies(6, r, ctx),
        });
      }
      // the week's other big storylines get their own threads (one per game, the biggest first)
      if (!mine && !covered) {
        const pick = has('comeback') && ctx.v.DEF >= 10 ? 'comeback' : has('unbeatenFalls') ? 'unbeatenFalls' : has('shutout') ? 'shutout' : has('hot') && r.W.rec.streak >= 6 ? 'hot' : has('skid') && r.Lo.rec.streak <= -5 ? 'skid' : has('firstWin') ? 'firstWin' : null;
        const S2 = {
          comeback: ['COMEBACK', 74, `${r.W.name} erase a ${ctx.v.DEF}-point fourth-quarter deficit to stun ${r.Lo.name}, ${scoreStr(r)}`],
          unbeatenFalls: ['UNBEATEN NO MORE', 80, `The perfect season is over: ${r.W.name} hand ${r.Lo.name} their first loss, ${scoreStr(r)}`],
          shutout: ['SHUTOUT', 62, `${r.W.name} blank ${r.Lo.name} ${r.ws}-0`],
          hot: ['STREAK', 60, `${r.W.name} make it ${r.W.rec.streak} straight wins (${L.recStr(r.W)})`],
          skid: ['STREAK', 56, `The ${r.Lo.name} skid reaches ${-r.Lo.rec.streak} games after a ${scoreStr(r)} loss to ${r.W.name}`],
          firstWin: ['DISCUSSION', 54, `Finally! ${r.W.name} pick up their first win of the season, ${scoreStr(r)}`],
        }[pick];
        if (S2) thread(is, { tag: S2[0], heat: S2[1] + (rW || rL ? 8 : 0), teams: [r.W.id, r.Lo.id], a: fan(pick === 'skid' ? r.Lo : r.W), title: S2[2], body: story || '', replies: gameReplies(6, r, ctx) });
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
        replies: replies(6, [{ w: 3, team: t, lines: TAIL.perf[x.kind] }, { w: 2, lines: TAIL.perf[x.kind] }, { w: 1, team: t, lines: R.perf }, { w: 1, lines: R.perf }], { P: pname(p), N: p.num, Y: x.y || 0, TD: x.td || 0, LN: x.line }),
      });
    }

    // power rankings (regular season only)
    const t1 = L.team(G.poll[0]), t2 = L.team(G.poll[1]), t3 = L.team(G.poll[2]);
    if (wk <= SEA.REG) {
      const newOne = pollBefore[0] !== G.poll[0];
      const uR = L.ranked(uid);
      // the week's biggest climber and faller (in or out of the top 10)
      const was = id => { const i = pollBefore.indexOf(id); return i < 0 ? 26 : i + 1; }, now = id => { const i = G.poll.indexOf(id); return i < 0 ? 26 : i + 1; };
      const moves = G.teams.map(t => ({ t, d: was(t.id) - now(t.id) })).filter(m => now(m.t.id) <= 10 || was(m.t.id) <= 10);
      const riser = moves.slice().sort((a, b) => b.d - a.d)[0], faller = moves.slice().sort((a, b) => a.d - b.d)[0];
      const pv = { T1: t1.name, T2: t2.name, M3: t3.mascot, RISER: riser && riser.d > 0 ? riser.t.name : t2.name, FALLER: faller && faller.d < 0 ? faller.t.name : t3.name, UR: uR || '' };
      thread(is, {
        tag: 'POWER RANKINGS', heat: newOne ? 85 : 62, a: MOD,
        title: newOne ? `NEW #1: ${t1.name} take over the top spot in the BlitzBoard Power Rankings` : `BlitzBoard Power Rankings after ${label}: ${t1.name} stay on top`,
        body: top10Body(pollBefore) + (riser && riser.d >= 3 ? `\n\nBiggest riser: ${riser.t.name} (▲${riser.d})` : '') + (faller && faller.d <= -3 ? `\nBiggest fall: ${faller.t.name} (▼${-faller.d})` : '') + (uR ? `\n\n${u.name} check in at #${uR}.` : `\n\n${u.name} are outside the top 10 this week.`),
        replies: replies(7, [{ w: 2, lines: R.poll }, { w: (riser && riser.d >= 3) || (faller && faller.d <= -3) ? 3 : 0.5, lines: TAIL.pollMove }, { w: 2, team: u, lines: uR ? TAIL.pollMine : TAIL.pollOut }], pv),
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
        // reactions to who it is, how long he's out, and whether he's one of the league's best
        replies: replies(5, [
          { w: 3, team: t, lines: TAIL.injPos[i.p.pos] || R.injury },
          { w: 2, team: t, lines: i.weeks >= 5 ? TAIL.injLong : TAIL.injShort },
          { w: i.p.ovr >= 80 ? 2 : 0, lines: TAIL.injStar },
          { w: 1, team: t, lines: R.injury }, { w: 1, lines: R.injury },
        ], { M: t.mascot, P: pname(i.p), POS: i.p.pos, WK: i.weeks, S: i.weeks > 1 ? 's' : '' }),
      });
    }

    // hot seat
    if (wk >= 5 && wk <= SEA.REG) {
      const cold = G.teams.filter(t => t.rec.l >= 4 && t.rec.w <= t.rec.l - 3).sort((a, b) => a.rec.w - b.rec.w)[0];
      if (cold && U.chance(0.55)) {
        thread(is, {
          tag: 'HOT SEAT', heat: 50 + (cold.user ? 25 : 0), teams: [cold.id], a: fan(cold),
          title: cold.user ? `Real talk: is the ${cold.name} head coach on the hot seat?` : `Hot seat watch: how much longer does the ${cold.name} staff have?`,
          body: `The ${cold.name} sit at ${L.recStr(cold)}${cold.rec.streak <= -2 ? `, losers of ${-cold.rec.streak} straight,` : ''} and the fanbase is restless. Is it the coaching or the roster?`,
          replies: replies(5, [{ w: 2, team: cold, lines: R.hotseat }, { w: 2, lines: R.hotseat }, { w: cold.rec.streak <= -3 ? 2 : 0, team: cold, lines: SIT.skid.l }], { REC: L.recStr(cold), LREC: L.recStr(cold), SKID: -cold.rec.streak, L: cold.name, LM: cold.mascot }),
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
          replies: replies(5, [{ w: 2, lines: R.mvp }, { w: lead.pos !== 'QB' ? 2 : 0, lines: TAIL.mvpNonQB }], { P: pname(lead), POS: lead.pos }),
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
      replies: (() => { const gr = g[u.id] ? g[u.id].grade : 'B', good = /^[AB]/.test(gr), bad = /^[DF]/.test(gr);
        return replies(7, [{ w: 2, team: u, lines: R.draft }, { w: 1, lines: R.draft }, { w: good ? 3 : 0, team: u, lines: TAIL.draftGood }, { w: bad ? 3 : 0, team: u, lines: TAIL.draftBad }], { M: u.mascot, G: gr }); })(),
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
      replies: replies(6, [
        { w: 2, team: bt, lines: R.fa }, { w: 2, lines: R.fa },
        { w: big.sal >= 20 ? 2.5 : 0, lines: TAIL.faBig },
        { w: big.age >= 31 ? 2.5 : 0, lines: TAIL.faOld },
        { w: big.ovr >= 80 ? 2 : 0, team: bt, lines: TAIL.faStar },
      ], { P: big.name, AGE: big.age, SAL: big.sal }),
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
      // the reaction depends on who moved: a blockbuster, an aging vet, a young riser, or nothing but picks
      replies: replies(7, [
        { w: 2, team: A, lines: R.tradeWin }, { w: 2, team: B, lines: R.tradeLose.concat(R.tradeWin) }, { w: 1.5, lines: R.tradeN },
        { w: star && star.ovr >= 82 ? 3 : 0, lines: TAIL.tradeBlock },
        { w: star && star.age >= 30 ? 2.5 : 0, lines: TAIL.tradeVet },
        { w: star && star.age <= 24 ? 2.5 : 0, lines: TAIL.tradeYoung },
        { w: !star ? 3 : 0, lines: TAIL.tradePicks },
      ], star ? { P: star.name, AGE: star.age, OVR: star.ovr } : {}),
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
