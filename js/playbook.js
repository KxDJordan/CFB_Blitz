'use strict';
// ── PLAYBOOK ──────────────────────────────────────────────────────
// Formations, named plays and play-art diagrams. Coordinates are yards:
// x across the field from the ball (+ = right), y from the line of
// scrimmage (+ = downfield). Every play can be flipped (mirrored).
// `cat` ties each play to the engine's call families (inside/outside/
// quick/pa/deep/screen · base/blitz/cover/runstop) for AI tendencies and
// the stat-sim used for games you don't watch.

const Playbook = (() => {
  const OL = { LT: [-3.4, -0.9], LG: [-1.7, -0.9], C: [0, -0.7], RG: [1.7, -0.9], RT: [3.4, -0.9] };
  const FORMS = {
    gun_doubles: { name: 'Shotgun Doubles', skill: { QB: [0, -5], RB: [1.5, -5.1], WR1: [-14, -0.8], WR3: [-8, -1.2], TE: [8, -1.2], WR2: [14, -0.8] } },
    gun_trips: { name: 'Shotgun Trips', skill: { QB: [0, -5], RB: [-1.5, -5.1], WR1: [-14, -0.8], TE: [5.3, -1.0], WR3: [9.5, -1.2], WR2: [15, -0.8] } },
    gun_bunch: { name: 'Shotgun Bunch', skill: { QB: [0, -5], RB: [-1.5, -5.1], WR1: [-14, -0.8], WR2: [9.2, -0.8], WR3: [10.8, -2.1], TE: [7.6, -2.1] } },
    single: { name: 'Singleback Ace', skill: { QB: [0, -1.3], RB: [0, -6.6], WR1: [-14, -0.8], WR3: [-8, -1.2], TE: [5.3, -1.0], WR2: [14, -0.8] } },
    pistol: { name: 'Pistol', skill: { QB: [0, -3.8], RB: [0, -6.9], WR1: [-14, -0.8], WR3: [-8.5, -1.2], TE: [5.3, -1.0], WR2: [14, -0.8] } },
    empty: { name: 'Empty Trey', skill: { QB: [0, -5], RB: [-9, -1.2], WR1: [-15, -0.8], TE: [5.3, -1.0], WR3: [9.5, -1.2], WR2: [15, -0.8] } },
    gun_wing: { name: 'Shotgun Wing', skill: { QB: [0, -5], RB: [-1.5, -5.1], WR1: [-14, -0.8], WR3: [-8.5, -1.2], TE: [4.6, -2.1], WR2: [14, -0.8] } },
    single_tight: { name: 'Singleback Tight', skill: { QB: [0, -1.3], RB: [0, -6.6], WR1: [-14, -0.8], WR3: [-5.8, -1.6], TE: [5.3, -1.0], WR2: [12, -0.8] } },
    iform: { name: 'I-Form Slot', skill: { QB: [0, -1.3], TE: [0, -4.3], RB: [0, -7.2], WR1: [-14, -0.8], WR3: [-8, -1.2], WR2: [14, -0.8] } },
    heavy: { name: 'Heavy', skill: { QB: [0, -1.3], RB: [0, -6.6], WR3: [-5.2, -1.0], TE: [5.3, -1.0], WR1: [-10, -0.8], WR2: [10, -0.8] } },
  };
  // offensive playbooks: which formations a team carries
  const BOOKS = {
    spread: { name: 'Spread', desc: 'Shotgun everything: spacing, tempo and the quick game.', forms: ['gun_doubles', 'gun_trips', 'gun_bunch', 'gun_wing', 'empty', 'pistol'] },
    pro: { name: 'Pro Style', desc: 'Under center, play action and a downhill run game.', forms: ['single', 'single_tight', 'iform', 'heavy', 'pistol', 'gun_doubles'] },
    multiple: { name: 'Multiple', desc: 'The whole book: every formation.', forms: null },
  };
  const inBook = (p, book) => { const b = BOOKS[book]; return !b || !b.forms || b.forms.includes(p.form); };
  const formPos = (fid, flip) => {
    const f = FORMS[fid], out = {};
    for (const [k, [x, y]] of Object.entries({ ...OL, ...f.skill })) out[k] = [flip ? -x : x, y];
    return out;
  };
  // a play can move a man within its formation (a stacked receiver, a slot backed off the line)
  const playPos = (play, flip) => {
    const out = formPos(play.form, flip);
    for (const [k, [x, y]] of Object.entries(play.align || {})) out[k] = [flip ? -x : x, y];
    return out;
  };

  // ── offense ──
  // routes: slot → [kind, depth]; prot: slots that stay in to block; reads: progression order
  // run: { carrier, hole (x of the aiming point), scheme }
  const R = (id, name, form, cat, desc, run) => ({ id, name, form, kind: 'run', cat, desc, run });
  const PS = (id, name, form, cat, desc, routes, reads, o = {}) => ({ id, name, form, kind: 'pass', cat, desc, routes, reads, prot: o.prot || [], drop: o.drop || 5, pa: !!o.pa, boot: !!o.boot, screen: o.screen || null, align: o.align || null });
  const OFF = [
    // Shotgun Doubles
    R('gd_iz', 'Inside Zone', 'gun_doubles', 'inside', 'Zone step, RB reads the backside A-gap.', { carrier: 'RB', hole: -1.8, scheme: 'zone' }),
    R('gd_draw', 'HB Draw', 'gun_doubles', 'inside', 'Sell pass, let the rush run past, hit it up the gut.', { carrier: 'RB', hole: 0.6, scheme: 'draw' }),
    PS('gd_mesh', 'Mesh', 'gun_doubles', 'quick', 'Two shallow crossers rub man coverage.', { WR1: ['go', 0], WR3: ['drag', 2.5], TE: ['drag', 5], WR2: ['curl', 11], RB: ['flat', 2] }, ['WR3', 'TE', 'RB', 'WR2']),
    PS('gd_smash', 'Smash', 'gun_doubles', 'quick', 'Hitch outside, corner from the slot — high-low the corner.', { WR1: ['hitch', 5], WR3: ['corner', 11], TE: ['corner', 11], WR2: ['hitch', 5], RB: ['block', 0] }, ['WR3', 'WR1', 'TE', 'WR2'], { prot: ['RB'] }),
    PS('gd_verts', 'Four Verticals', 'gun_doubles', 'deep', 'Everybody up the field — stretch the safeties.', { WR1: ['go', 0], WR3: ['seam', 0], TE: ['seam', 0], WR2: ['go', 0], RB: ['check', 2] }, ['WR3', 'TE', 'WR1', 'WR2', 'RB'], { drop: 7 }),
    // the slot starts off the ball so the bubble arcs behind the outside man, who climbs to his stalk block
    PS('gd_bubble', 'WR Bubble', 'gun_doubles', 'screen', 'Quick flip to the slot, outside man stalk-blocks.', { WR3: ['bubble', 0], WR1: ['stalk', 0], TE: ['go', 0], WR2: ['go', 0], RB: ['block', 0] }, ['WR3'], { prot: ['RB'], drop: 1, screen: 'WR3', align: { WR3: [-8.5, -2.6] } }),
    // Shotgun Trips
    R('gt_stretch', 'Stretch', 'gun_trips', 'outside', 'Outside zone to the trips side — press the edge, cut or bounce.', { carrier: 'RB', hole: 7, scheme: 'stretch' }),
    R('gt_counter', 'Counter', 'gun_trips', 'inside', 'Jab step away, backside guard pulls and kicks out.', { carrier: 'RB', hole: 2.8, scheme: 'counter' }),
    PS('gt_slants', 'Trips Slants', 'gun_trips', 'quick', 'Three slants to the trips side, back to the flat.', { WR1: ['slant', 0], TE: ['slant', 0], WR3: ['slant', 0], WR2: ['slant', 0], RB: ['flat', 2] }, ['WR3', 'WR2', 'TE', 'RB', 'WR1'], { drop: 3 }),
    PS('gt_flood', 'Flood', 'gun_trips', 'deep', 'Three levels to the sideline: go, out, flat.', { WR2: ['go', 0], WR3: ['out', 12], TE: ['flat', 3], WR1: ['dig', 14], RB: ['block', 0] }, ['WR3', 'TE', 'WR1', 'WR2'], { prot: ['RB'], drop: 7 }),
    PS('gt_dagger', 'Dagger', 'gun_trips', 'deep', 'Slot seam clears the safety, the X runs a deep dig underneath.', { WR3: ['seam', 0], WR1: ['dig', 15], TE: ['drag', 5], WR2: ['curl', 12], RB: ['block', 0] }, ['WR1', 'WR3', 'TE', 'WR2'], { prot: ['RB'], drop: 7 }),
    PS('gt_screen', 'HB Screen', 'gun_trips', 'screen', 'Let the rush in, linemen release and lead the back.', { RB: ['screen', 0], WR1: ['go', 0], TE: ['drag', 6], WR3: ['go', 0], WR2: ['go', 0] }, ['RB'], { drop: 7, screen: 'RB' }),
    // Shotgun Bunch
    R('gb_iz', 'Bunch Zone', 'gun_bunch', 'inside', 'Inside zone with the bunch sealing the edge.', { carrier: 'RB', hole: 1.8, scheme: 'zone' }),
    PS('gb_snag', 'Snag', 'gun_bunch', 'quick', 'Corner, snag and flat out of the bunch — a triangle read.', { WR2: ['corner', 10], WR3: ['snag', 5], TE: ['flat', 2], WR1: ['slant', 0], RB: ['block', 0] }, ['WR3', 'TE', 'WR2', 'WR1'], { prot: ['RB'], drop: 3 }),
    PS('gb_drive', 'Bunch Drive', 'gun_bunch', 'quick', 'Shallow drive with a dig over the top.', { TE: ['drag', 2.5], WR2: ['dig', 11], WR3: ['go', 0], WR1: ['curl', 10], RB: ['flat', 2] }, ['TE', 'WR2', 'RB', 'WR1'], { drop: 5 }),
    // Singleback
    R('sb_iz', 'HB Dive', 'single', 'inside', 'Downhill zone from under center.', { carrier: 'RB', hole: 1.4, scheme: 'zone' }),
    R('sb_power', 'Power O', 'single', 'inside', 'Down blocks, backside guard pulls through the hole.', { carrier: 'RB', hole: 2.8, scheme: 'power' }),
    R('sb_toss', 'HB Toss', 'single', 'outside', 'Pitch to the back and race the edge.', { carrier: 'RB', hole: 8.5, scheme: 'toss' }),
    R('sb_sneak', 'QB Sneak', 'single', 'inside', 'Wedge behind the center for a yard.', { carrier: 'QB', hole: 0.4, scheme: 'sneak' }),
    PS('sb_papost', 'PA Post', 'single', 'pa', 'Fake the dive, launch it to the post.', { WR1: ['post', 12], WR3: ['dig', 13], TE: ['seam', 0], WR2: ['comeback', 14], RB: ['block', 0] }, ['WR1', 'WR3', 'TE', 'WR2'], { prot: ['RB'], drop: 7, pa: true }),
    PS('sb_boot', 'PA Boot', 'single', 'pa', 'Fake left, QB rolls right — flat, drag and corner.', { TE: ['flat', 4], WR3: ['drag', 7], WR2: ['corner', 12], WR1: ['post', 14], RB: ['block', 0] }, ['TE', 'WR2', 'WR3', 'WR1'], { prot: ['RB'], drop: 6, pa: true, boot: true }),
    // Pistol
    R('pi_oz', 'Outside Zone', 'pistol', 'outside', 'Reach blocks to the left, RB presses then cuts.', { carrier: 'RB', hole: -6.5, scheme: 'stretch' }),
    R('pi_counter', 'Pistol Counter', 'pistol', 'inside', 'Misdirection with a pulling guard and tackle.', { carrier: 'RB', hole: -2.8, scheme: 'counter' }),
    PS('pi_shot', 'PA Shot', 'pistol', 'pa', 'Max protect play action — go and post.', { WR1: ['go', 0], WR2: ['post', 14], TE: ['block', 0], WR3: ['curl', 12], RB: ['block', 0] }, ['WR2', 'WR1', 'WR3'], { prot: ['RB', 'TE'], drop: 7, pa: true }),
    // Empty
    R('em_qbd', 'QB Draw', 'empty', 'inside', 'Spread them out, QB takes off up the middle.', { carrier: 'QB', hole: 0.8, scheme: 'qbdraw' }),
    PS('em_outs', 'Quick Outs', 'empty', 'quick', 'Five quick outs — ball out in two seconds.', { WR1: ['out', 5], RB: ['out', 4], TE: ['out', 5], WR3: ['out', 6], WR2: ['out', 5] }, ['WR3', 'RB', 'TE', 'WR1', 'WR2'], { drop: 3 }),
    PS('em_verts', 'Empty Verts', 'empty', 'deep', 'Five go routes — find the open seam.', { WR1: ['go', 0], RB: ['seam', 0], TE: ['seam', 0], WR3: ['seam', 0], WR2: ['go', 0] }, ['TE', 'RB', 'WR3', 'WR1', 'WR2'], { drop: 7 }),
    PS('em_mesh', 'Empty Mesh', 'empty', 'quick', 'Mesh with five out — someone is always open underneath.', { WR3: ['drag', 2.5], TE: ['drag', 5], WR1: ['go', 0], WR2: ['curl', 10], RB: ['whip', 4] }, ['WR3', 'TE', 'RB', 'WR2'], { drop: 3 }),
    // more from the base sets
    // stacked release: the man on the line fades to the sideline, the man off the line behind him fades inside
    PS('gd_fades', 'Double Fades', 'gun_doubles', 'deep', 'Stack release: outside fade on the line, inside fade off it — slants on the other side.', { WR1: ['fade', 0], WR3: ['fadein', 0], WR2: ['slant', 0], TE: ['slant', 0], RB: ['check', 2] }, ['WR1', 'WR3', 'TE', 'WR2'], { drop: 3, align: { WR3: [-12.3, -2.8] } }),
    PS('gt_wheel', 'Trips Wheel', 'gun_trips', 'deep', 'Back wheels up the sideline behind the trips clear-out.', { WR3: ['seam', 0], WR2: ['comeback', 14], TE: ['out', 8], WR1: ['dig', 12], RB: ['wheel', 0] }, ['WR3', 'RB', 'TE', 'WR1'], { drop: 5 }),
    PS('gb_angle', 'Bunch Angle', 'gun_bunch', 'quick', 'The bunch clears the flat for the back on an angle route.', { WR2: ['go', 0], WR3: ['out', 6], TE: ['corner', 10], WR1: ['slant', 0], RB: ['angle', 0] }, ['RB', 'WR3', 'TE', 'WR1'], { drop: 3 }),
    // Shotgun Wing
    R('gw_power', 'Wing Power', 'gun_wing', 'inside', 'The wing seals the edge, backside guard pulls up through the hole.', { carrier: 'RB', hole: 2.8, scheme: 'power' }),
    R('gw_stretch', 'Wing Stretch', 'gun_wing', 'outside', 'Wing reaches the end man, the back presses the edge.', { carrier: 'RB', hole: 7.5, scheme: 'stretch' }),
    PS('gw_ycross', 'Y Cross', 'gun_wing', 'deep', 'Wing runs a deep crosser under the clear-out.', { WR1: ['go', 0], WR3: ['curl', 10], TE: ['cross', 12], WR2: ['dig', 15], RB: ['check', 2] }, ['TE', 'WR3', 'WR2', 'RB'], { drop: 7 }),
    PS('gw_curlflat', 'Curl Flat', 'gun_wing', 'quick', 'High-low the flat defender: curls over flats.', { WR1: ['curl', 10], WR3: ['flat', 3], TE: ['stick', 5], WR2: ['curl', 10], RB: ['swing', 0] }, ['WR3', 'WR1', 'TE', 'RB'], { drop: 3 }),
    // Singleback Tight
    R('st_iz', 'Tight Zone', 'single_tight', 'inside', 'Inside zone toward the tight slot.', { carrier: 'RB', hole: -1.4, scheme: 'zone' }),
    R('st_toss', 'Tight Toss', 'single_tight', 'outside', 'Pitch to the short side behind the tight slot.', { carrier: 'RB', hole: -8, scheme: 'toss' }),
    PS('st_pacross', 'PA Crossers', 'single_tight', 'pa', 'Fake the zone, two crossers at different levels.', { WR3: ['drag', 6], TE: ['cross', 13], WR1: ['post', 14], WR2: ['comeback', 13], RB: ['block', 0] }, ['TE', 'WR3', 'WR1', 'WR2'], { prot: ['RB'], drop: 7, pa: true }),
    PS('st_hitchseam', 'Hitch Seam', 'single_tight', 'quick', 'Hitches outside, seams inside — take what Cover 3 gives.', { WR1: ['hitch', 6], WR2: ['hitch', 6], WR3: ['seam', 0], TE: ['seam', 0], RB: ['flat', 2] }, ['WR1', 'WR2', 'TE', 'WR3', 'RB'], { drop: 3 }),
    // I-Form (tight end at fullback)
    R('if_iso', 'Iso', 'iform', 'inside', 'The fullback leads through the hole and isolates the linebacker.', { carrier: 'RB', hole: 1.4, scheme: 'iso' }),
    R('if_toss', 'Strong Toss', 'iform', 'outside', 'Pitch wide, the fullback leads around the end.', { carrier: 'RB', hole: 8.5, scheme: 'toss' }),
    R('if_counter', 'I Counter', 'iform', 'inside', 'Counter step, guard and tackle pull back across.', { carrier: 'RB', hole: -2.8, scheme: 'counter' }),
    PS('if_boot', 'PA Bootleg', 'iform', 'pa', 'Fake the iso, QB boots out: fullback flat, drag, corner.', { TE: ['flat', 3], WR3: ['drag', 7], WR2: ['corner', 12], WR1: ['post', 14], RB: ['block', 0] }, ['TE', 'WR3', 'WR2', 'WR1'], { prot: ['RB'], drop: 6, pa: true, boot: true }),
    PS('if_pago', 'PA Go', 'iform', 'deep', 'Max-protect play action — post and go over the top.', { WR1: ['go', 0], WR2: ['post', 14], WR3: ['dig', 12], TE: ['block', 0], RB: ['block', 0] }, ['WR2', 'WR1', 'WR3'], { prot: ['RB', 'TE'], drop: 7, pa: true }),
    // Heavy (short yardage / goal line)
    R('hv_power', 'Heavy Power', 'heavy', 'inside', 'Two tight ends, the guard pulls — move the pile.', { carrier: 'RB', hole: 2.8, scheme: 'power' }),
    R('hv_iso', 'Heavy Zone', 'heavy', 'inside', 'Downhill zone behind the extra tight end.', { carrier: 'RB', hole: -1.4, scheme: 'zone' }),
    R('hv_sneak', 'Heavy Sneak', 'heavy', 'inside', 'Wedge behind the center for the last yard.', { carrier: 'QB', hole: 0.4, scheme: 'sneak' }),
    PS('hv_paflat', 'PA TE Flat', 'heavy', 'pa', 'Sell the run at the goal line, the tight end leaks to the flat.', { TE: ['flat', 3], WR3: ['corner', 6], WR1: ['fade', 0], WR2: ['fade', 0], RB: ['block', 0] }, ['TE', 'WR3', 'WR1', 'WR2'], { prot: ['RB'], drop: 6, pa: true }),
  ];

  // ── defense ──
  // zone landmarks (x, depth)
  const ZONES = {
    deepL: [-14, 17], deepM: [0, 19], deepR: [14, 17], halfL: [-10, 17], halfR: [10, 17],
    qL: [-16, 15], qML: [-6, 17], qMR: [6, 17], qR: [16, 15],
    flatL: [-16, 4], curlL: [-10, 9], hookL: [-4.5, 8], hookM: [0, 9], hookR: [4.5, 8], curlR: [10, 9], flatR: [16, 4],
    robber: [0, 11], tampa: [0, 13],
  };
  const ZKIND = z => (/^(deep|half|q)/.test(z) ? 'deep' : /^flat/.test(z) ? 'flat' : 'hook');
  // ── defensive formations ──
  // The defense always fields the same 11 slots (DE1 DT1 DT2 DE2 · LB1 MLB LB2 · CB1 CB2 · S1 S2); a formation
  // decides which position fills each one and where the front lines up. A Dime puts a third corner in the LB1 slot
  // and a third safety in LB2; a 3-4 stands a fourth linebacker up on the edge in DE1. Ratings follow the player, so
  // a corner in a linebacker's slot covers like a corner and fills the run like one.
  const BASE_POS = { DE1: 'DL', DT1: 'DL', DT2: 'DL', DE2: 'DL', LB1: 'LB', MLB: 'LB', LB2: 'LB', CB1: 'CB', CB2: 'CB', S1: 'S', S2: 'S' };
  const FRONT = { DE1: [-4.4, 1.0], DT1: [-1.1, 1.0], DT2: [1.3, 1.0], DE2: [4.6, 1.0], LB1: [-3.6, 4.5], MLB: [0, 5], LB2: [4.8, 4.2] };
  const DF = (name, short, desc, pos, front) => ({ name, short, desc, pos: { ...BASE_POS, ...pos }, front: { ...FRONT, ...front } });
  const DFORMS = {
    '43': DF('4-3 Base', '4-3', '4 DL · 3 LB · 2 CB · 2 S', {}, {}),
    '34': DF('3-4', '3-4', '3 DL · 4 LB · 2 CB · 2 S', { DE1: 'LB' },
      { DE1: [-6.4, 1.4], DT1: [-3.0, 1.0], DT2: [0.1, 1.0], DE2: [3.2, 1.0], LB1: [-2.1, 4.6], MLB: [2.2, 4.6], LB2: [6.6, 1.4] }),
    nickel: DF('Nickel 4-2-5', 'Nickel', '4 DL · 2 LB · 3 CB · 2 S', { LB1: 'CB' },
      { LB1: [-8, 4.2], MLB: [-1.3, 4.8], LB2: [2.4, 4.6] }),
    dime: DF('Dime 4-1-6', 'Dime', '4 DL · 1 LB · 3 CB · 3 S', { LB1: 'CB', LB2: 'S' },
      { LB1: [-8, 4.6], MLB: [0, 5.4], LB2: [6.4, 6.8] }),
    '335': DF('3-3-5 Stack', '3-3-5', '3 DL · 3 LB · 2 CB · 3 S', { DT2: 'LB', LB2: 'S' },
      { DE1: [-3.6, 1.0], DT1: [0, 1.0], DE2: [3.8, 1.0], DT2: [3.8, 4.4], LB1: [-3.8, 4.4], MLB: [0, 4.8], LB2: [7.4, 5.4] }),
    goal: DF('Goal Line 5-3', 'Goal Line', '5 DL · 3 LB · 2 CB · 1 S', { LB1: 'DL', S1: 'LB' },
      { DE1: [-5, 1.0], DT1: [-2.2, 1.0], LB1: [0, 1.0], DT2: [2.2, 1.0], DE2: [5, 1.0], MLB: [-1.6, 3.4], LB2: [2.6, 3.4] }),
  };
  // call-sheet order (number-like keys would otherwise sort first)
  const DFORM_ORDER = ['43', '34', 'nickel', 'dime', '335', 'goal'];
  const D = (id, name, form, cat, desc, a) => ({ id, name, form, cat, desc, a });
  const man = s => ['man', s], zone = z => ['zone', z], blitz = x => ['blitz', x];
  const RUSH4 = { DE1: 'rush', DT1: 'rush', DT2: 'rush', DE2: 'rush' };
  const DEF = [
    // 4-3
    D('c2', 'Cover 2', '43', 'base', 'Two deep halves, corners squat the flats.', { ...RUSH4, CB1: zone('flatL'), CB2: zone('flatR'), S1: zone('halfL'), S2: zone('halfR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('curlR') }),
    D('c3', 'Cover 3', '43', 'cover', 'Three deep, four under. Keep it in front.', { ...RUSH4, CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM'), S1: zone('flatL'), LB1: zone('hookL'), MLB: zone('hookR'), LB2: zone('flatR') }),
    D('c1', 'Cover 1 Man', '43', 'base', 'Man across, free safety in the middle, robber underneath.', { ...RUSH4, CB1: man('WR1'), CB2: man('WR2'), S1: man('WR3'), LB2: man('TE'), MLB: man('RB'), LB1: zone('robber'), S2: zone('deepM') }),
    D('c4', 'Cover 4', '43', 'cover', 'Quarters — four deep, eliminate the big play.', { ...RUSH4, CB1: zone('qL'), S1: zone('qML'), S2: zone('qMR'), CB2: zone('qR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('curlR') }),
    D('mike', 'Mike Blitz', '43', 'blitz', 'Mike shoots the A-gap, Cover 1 behind it.', { ...RUSH4, MLB: blitz(0.8), CB1: man('WR1'), CB2: man('WR2'), S1: man('WR3'), LB2: man('TE'), LB1: man('RB'), S2: zone('deepM') }),
    D('c0', 'Cover 0 Blitz', '43', 'blitz', 'Six rushers, no help. Get home or get burned.', { ...RUSH4, MLB: blitz(0.8), LB1: blitz(-2.6), CB1: man('WR1'), CB2: man('WR2'), S1: man('WR3'), S2: man('TE'), LB2: man('RB') }),
    D('fire', 'Fire Zone', '43', 'blitz', 'Two linebackers blitz, the end drops — 3 deep, 3 under.', { DE1: 'rush', DT1: 'rush', DT2: 'rush', DE2: zone('flatR'), LB1: blitz(-2.6), MLB: blitz(0.8), CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM'), S1: zone('hookL'), LB2: zone('hookR') }),
    D('box', 'Stack the Box', '43', 'runstop', 'Safety down, eight in the box. Man outside.', { ...RUSH4, CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), S1: ['box', 2.5], MLB: ['box', -0.8], LB2: man('TE'), S2: zone('deepM') }),
    D('c2man', 'Cover 2 Man', '43', 'base', 'Man underneath with two safeties over the top.', { ...RUSH4, CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), LB2: man('TE'), MLB: man('RB'), S1: zone('halfL'), S2: zone('halfR') }),
    D('tampa', 'Tampa 2', '43', 'cover', 'Cover 2 with the Mike running the deep middle.', { ...RUSH4, CB1: zone('flatL'), CB2: zone('flatR'), S1: zone('halfL'), S2: zone('halfR'), LB1: zone('curlL'), MLB: zone('tampa'), LB2: zone('curlR') }),
    D('c6', 'Cover 6', '43', 'cover', 'Quarters to one side, Cover 2 to the other.', { ...RUSH4, CB1: zone('qL'), S1: zone('qML'), S2: zone('halfR'), CB2: zone('flatR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('curlR') }),
    D('buzz', 'Cover 3 Buzz', '43', 'base', 'A safety buzzes down to the hook — eight near the box vs the run.', { ...RUSH4, CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM'), S1: zone('hookL'), LB1: zone('flatL'), MLB: zone('hookR'), LB2: zone('flatR') }),
    D('sblitz', 'Safety Blitz', '43', 'blitz', 'Strong safety off the edge, Cover 1 behind it.', { ...RUSH4, S1: blitz(-5.5), CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), LB2: man('TE'), MLB: man('RB'), S2: zone('deepM') }),
    D('cfire', 'Corner Fire', '43', 'blitz', 'The boundary corner blitzes, safeties rotate to three deep.', { ...RUSH4, CB1: blitz(-8), S1: zone('deepL'), S2: zone('deepM'), CB2: zone('deepR'), LB1: zone('flatL'), MLB: zone('hookM'), LB2: zone('curlR') }),
    // 3-4: DE1 and LB2 are the outside backers standing up on the edges
    D('34_c3', '3-4 Cover 3', '34', 'base', 'Weak OLB rushes, strong OLB drops to the flat — three deep behind it.', { DE1: 'rush', DT1: 'rush', DT2: 'rush', DE2: 'rush', LB2: zone('flatR'), LB1: zone('hookL'), MLB: zone('hookR'), S1: zone('flatL'), CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM') }),
    D('34_c2', '3-4 Cover 2', '34', 'cover', 'Both edges set the rush lanes, two safeties split the deep field.', { DE1: 'rush', DT1: 'rush', DT2: 'rush', DE2: 'rush', LB2: zone('curlR'), LB1: zone('curlL'), MLB: zone('hookM'), CB1: zone('flatL'), CB2: zone('flatR'), S1: zone('halfL'), S2: zone('halfR') }),
    D('34_olb', 'Double OLB Blitz', '34', 'blitz', 'Both outside backers come off the edges, Cover 1 behind them.', { DE1: 'rush', DT1: 'rush', DT2: 'rush', DE2: 'rush', LB2: blitz(6), CB1: man('WR1'), CB2: man('WR2'), S1: man('WR3'), LB1: man('TE'), MLB: man('RB'), S2: zone('deepM') }),
    D('34_zone', '3-4 Zone Blitz', '34', 'blitz', 'Inside backers blitz while the weak OLB and an end drop into zones.', { DE1: zone('flatL'), DT1: 'rush', DT2: 'rush', DE2: zone('hookR'), LB1: blitz(-2.2), MLB: blitz(1.2), LB2: 'rush', CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM'), S1: zone('hookL') }),
    D('34_okie', 'Okie Run Fit', '34', 'runstop', 'Five on the line, inside backers fit downhill, safety in the box.', { DE1: 'rush', DT1: 'rush', DT2: 'rush', DE2: 'rush', LB2: 'rush', MLB: ['box', 0.8], LB1: man('TE'), S1: man('WR3'), CB1: man('WR1'), CB2: man('WR2'), S2: zone('deepM') }),
    // Nickel: the third corner (LB1 slot) lines up over the slot receiver
    D('n_c2', 'Nickel Cover 2', 'nickel', 'base', 'Five DBs, two deep — the nickel takes the slot side curl.', { ...RUSH4, CB1: zone('flatL'), CB2: zone('flatR'), S1: zone('halfL'), S2: zone('halfR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('curlR') }),
    D('n_c1', 'Nickel Man', 'nickel', 'base', 'Nickel locks up the slot, free safety over the top, robber underneath.', { ...RUSH4, CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), LB2: man('TE'), MLB: man('RB'), S1: zone('robber'), S2: zone('deepM') }),
    D('n_c3', 'Nickel Cover 3', 'nickel', 'cover', 'Three deep with a corner\'s speed in the flat.', { ...RUSH4, CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM'), LB1: zone('flatL'), MLB: zone('hookL'), LB2: zone('hookR'), S1: zone('flatR') }),
    D('n_c4', 'Nickel Quarters', 'nickel', 'cover', 'Quarters with a nickel underneath — take away everything deep.', { ...RUSH4, CB1: zone('qL'), S1: zone('qML'), S2: zone('qMR'), CB2: zone('qR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('curlR') }),
    D('n_blitz', 'Nickel Blitz', 'nickel', 'blitz', 'The slot corner comes off the edge, Cover 1 behind it.', { ...RUSH4, LB1: blitz(-6.5), CB1: man('WR1'), CB2: man('WR2'), S1: man('WR3'), LB2: man('TE'), MLB: man('RB'), S2: zone('deepM') }),
    // Dime: one linebacker, a third corner (LB1) and a third safety (LB2)
    D('d_c1', 'Dime Man', 'dime', 'cover', 'Six DBs in man, a robber in the middle and a free safety deep.', { ...RUSH4, CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), LB2: man('TE'), MLB: man('RB'), S1: zone('robber'), S2: zone('deepM') }),
    D('d_c2m', 'Dime 2-Man', 'dime', 'cover', 'Man underneath, two safeties over the top — third and long.', { ...RUSH4, CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), LB2: man('TE'), MLB: man('RB'), S1: zone('halfL'), S2: zone('halfR') }),
    D('d_blitz', 'Dime Blitz', 'dime', 'blitz', 'Safety and Mike both come — six rushers, DBs locked up.', { ...RUSH4, S1: blitz(-5), MLB: blitz(0.8), CB1: man('WR1'), CB2: man('WR2'), LB1: man('WR3'), LB2: man('TE'), S2: zone('deepM') }),
    D('prevent', 'Prevent', 'dime', 'cover', 'Four deep, three under — nothing over the top.', { ...RUSH4, CB1: zone('qL'), S1: zone('qML'), S2: zone('qMR'), CB2: zone('qR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('curlR'), _soft: true }),
    // 3-3-5: three stacked backers (DT2 is the right stack), a spur safety (LB2) as the fifth DB
    D('335_c3', 'Stack Cover 3', '335', 'base', 'Three down, a stacked backer adds the fourth rusher — three deep.', { DE1: 'rush', DT1: 'rush', DE2: 'rush', DT2: blitz(2), LB1: zone('hookL'), MLB: zone('hookM'), LB2: zone('flatR'), S1: zone('flatL'), CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM') }),
    D('335_fire', 'Stack Fire', '335', 'blitz', 'Two stacked backers shoot the gaps, man across with a free safety.', { DE1: 'rush', DT1: 'rush', DE2: 'rush', DT2: blitz(2), LB1: blitz(-2.4), MLB: zone('hookM'), LB2: man('TE'), S1: man('WR3'), CB1: man('WR1'), CB2: man('WR2'), S2: zone('deepM') }),
    D('335_drop', 'Drop 8', '335', 'cover', 'Rush three, drop eight — a wall of zones underneath and three deep.', { DE1: 'rush', DT1: 'rush', DE2: 'rush', DT2: zone('curlR'), LB1: zone('curlL'), MLB: zone('hookM'), LB2: zone('flatR'), S1: zone('flatL'), CB1: zone('deepL'), CB2: zone('deepR'), S2: zone('deepM') }),
    // Goal line: a fifth lineman (LB1) and a third backer in the safety's spot (S1)
    D('goal', 'Goal Line', 'goal', 'runstop', 'Five down, everyone fills a gap — man on the receivers.', { ...RUSH4, LB1: 'rush', CB1: man('WR1'), CB2: man('WR2'), S2: man('WR3'), LB2: man('TE'), MLB: ['box', 0.6], S1: ['box', -2.4] }),
    D('gl_blitz', 'Goal Line Blitz', 'goal', 'blitz', 'Seven come — the backers shoot the A-gaps, no one behind.', { ...RUSH4, LB1: 'rush', MLB: blitz(-0.8), LB2: blitz(1.4), S1: man('TE'), CB1: man('WR1'), CB2: man('WR2'), S2: man('WR3') }),
    D('gl_zone', 'Goal Line Zone', 'goal', 'base', 'Five down, backers spot-drop to the flats and the goal post.', { ...RUSH4, LB1: 'rush', MLB: zone('hookM'), LB2: zone('flatR'), S1: zone('flatL'), CB1: man('WR1'), CB2: man('WR2'), S2: zone('deepM') }),
  ];
  // how likely the defensive coordinator is to be in each personnel package for the down and distance
  function formWeight(form, gs) {
    if (!gs) return 1;
    const toGoal = 100 - gs.ball, long = gs.togo >= 7, short = gs.togo <= 2;
    switch (form) {
      case 'goal': return toGoal <= 4 || (short && toGoal <= 8) ? 3 : 0;
      case 'dime': return long && gs.down >= 3 ? 2.2 : long ? 0.5 : short ? 0 : 0.15;
      case 'nickel': return long ? 1.4 : short ? 0.2 : 0.8;
      case '34': return 1;
      case '335': return long ? 0.8 : short ? 0.2 : 0.5;
      default: return short ? 1.3 : 1;
    }
  }

  // ── routes ──
  // waypoints relative to the receiver's start x, depth from the LOS; inn = direction toward the ball
  function routePts(kind, d, sx, inn) {
    const o = -inn, X = dx => sx + dx;
    switch (kind) {
      case 'go': return [[X(o * 0.6), 12], [X(o * 1.2), 42]];
      case 'seam': return [[X(inn * 1), 10], [X(inn * 1.6), 42]];
      case 'slant': return [[X(0), 1.6], [X(inn * 5), 5.5], [X(inn * 14), 10]];
      case 'hitch': return [[X(0), d], [X(inn * 0.6), d - 1]];
      case 'curl': return [[X(0), d], [X(inn * 1.2), d - 1.4]];
      case 'comeback': return [[X(0), d], [X(o * 2.2), d - 2.2]];
      case 'out': return [[X(0), d], [X(o * 6), d], [X(o * 13), d - 0.5]];
      case 'dig': return [[X(0), d], [X(inn * 6), d], [X(inn * 22), d]];
      case 'drag': return [[X(inn * 1.5), Math.min(1.5, d)], [X(inn * 8), d], [X(inn * 28), d + 0.5]];
      case 'post': return [[X(0), d], [X(inn * 5), d + 5], [X(inn * 13), d + 24]];
      case 'corner': return [[X(0), d], [X(o * 5), d + 5], [X(o * 11), d + 16]];
      case 'flat': return [[X(o * 1.5), 1], [X(o * 6), d], [X(o * 13), d + 1]];
      case 'snag': return [[X(inn * 2.6), d], [X(inn * 2.8), d - 0.6]];
      case 'stick': return [[X(0), d], [X(inn * 1), d - 0.6]];
      case 'check': return [[X(o * 2), 0], [X(o * 6), d], [X(o * 11), d + 1]];
      case 'bubble': return [[X(o * 2), -3.0], [X(o * 4.5), -3.1], [X(o * 7), -2.3]];
      case 'wheel': return [[X(o * 3.5), 0.5], [X(o * 6.5), 4], [X(o * 7.5), 30]];
      case 'fade': return [[X(o * 1.5), 6], [X(o * 3.5), 32]];
      case 'fadein': return [[X(inn * 1.4), 6], [X(inn * 2.4), 32]];
      case 'swing': return [[X(o * 3), -1.6], [X(o * 7), -0.6], [X(o * 10), 1]];
      case 'angle': return [[X(o * 2.5), 1.5], [X(inn * 2), 5], [X(inn * 6), 6]];
      case 'whip': return [[X(inn * 2.5), d], [X(o * 3), d], [X(o * 8), d]];
      case 'screen': return [[X(o * 4.5), -3.6], [X(o * 5.5), -2.8]];
      default: return [[X(0), Math.max(d, 1)]];
    }
  }
  const inward = (sx, slot) => (sx < -0.2 ? 1 : sx > 0.2 ? -1 : slot === 'RB' ? -1 : 1);
  // the run lane the back aims for, after any flip
  const hole = (play, flip) => (flip ? -play.run.hole : play.run.hole);

  // ── AI play selection ──
  const offById = id => OFF.find(p => p.id === id);
  const defById = id => DEF.find(p => p.id === id);
  function pickOff(cat, book) {
    const all = OFF.filter(p => p.cat === cat && p.run?.scheme !== 'sneak');
    const pool = all.filter(p => inBook(p, book));
    return U.pick(pool.length ? pool : all.length ? all : OFF);
  }
  function pickDef(cat, gs) {
    const pool = DEF.filter(p => p.cat === cat && (p.id !== 'prevent' || (gs && gs.qtr >= 4 && gs.clock < 150)));
    const w = pool.map(p => formWeight(p.form, gs));
    if (!w.some(x => x > 0)) { const ok = pool.filter(p => p.form !== 'goal'); return U.pick(ok.length ? ok : pool.length ? pool : DEF); }
    return U.wpick(pool, p => w[pool.indexOf(p)]);
  }
  // play type for the call sheet: blitzes, run stops, then man or zone by what the corners are doing
  const defType = p => (p.cat === 'blitz' ? 'blitz' : p.cat === 'runstop' ? 'runstop' : ['CB1', 'CB2'].every(k => p.a[k] && p.a[k][0] === 'man') ? 'man' : 'zone');

  // ── play art ──
  const RC = { WR1: '#facc15', WR2: '#f472b6', WR3: '#60a5fa', TE: '#34d399', RB: '#fb923c', QB: '#e2e8f0' };
  const VX = x => 60 + x * 3.05, VY = y => 60 - y * 2.55;
  const pts = arr => arr.map(([x, y]) => `${VX(x).toFixed(1)},${VY(Math.min(y, 21)).toFixed(1)}`).join(' ');
  function arrowHead(x0, y0, x1, y1, col, s = 3.4) {
    const a = Math.atan2(y1 - y0, x1 - x0), p = [[x1, y1], [x1 - s * Math.cos(a - 0.5), y1 - s * Math.sin(a - 0.5)], [x1 - s * Math.cos(a + 0.5), y1 - s * Math.sin(a + 0.5)]];
    return `<polygon points="${p.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${col}"/>`;
  }
  function line(path, col, w = 1.6, dash = '', head = true) {
    const P = path.map(([x, y]) => [VX(x), VY(Math.min(y, 21))]);
    let s = `<polyline points="${P.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    if (head && P.length > 1) { const [a, b] = P.slice(-2); s += arrowHead(a[0], a[1], b[0], b[1], col); }
    return s;
  }
  const blockT = (x, y, dx, dy, col = '#94a3b8') => {
    const x1 = x + dx, y1 = y + dy, a = Math.atan2(VY(y1) - VY(y), VX(x1) - VX(x)), nx = -Math.sin(a) * 2.4, ny = Math.cos(a) * 2.4;
    return `<line x1="${VX(x)}" y1="${VY(y)}" x2="${VX(x1)}" y2="${VY(y1)}" stroke="${col}" stroke-width="1.3"/><line x1="${VX(x1) + nx}" y1="${VY(y1) + ny}" x2="${VX(x1) - nx}" y2="${VY(y1) - ny}" stroke="${col}" stroke-width="1.3"/>`;
  };
  const frame = inner => `<svg class="pa-svg" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="80" rx="6" fill="#0f2a1c"/>${[5, 10, 15, 20].map(y => `<line x1="0" x2="120" y1="${VY(y)}" y2="${VY(y)}" stroke="rgba(255,255,255,.06)"/>`).join('')}<line x1="0" x2="120" y1="${VY(0)}" y2="${VY(0)}" stroke="rgba(148,197,255,.55)" stroke-width="1" stroke-dasharray="3 2"/>${inner}</svg>`;
  function svgOff(play, flip) {
    const F = playPos(play, flip), f = flip ? -1 : 1;
    let g = '';
    if (play.kind === 'run') {
      const h = hole(play, flip), sc = play.run.scheme, car = play.run.carrier;
      const play_ = h >= 0 ? 1 : -1;
      for (const k of Object.keys(OL)) {
        const [x, y] = F[k];
        if ((sc === 'power' || sc === 'counter') && k === (play_ > 0 ? 'LG' : 'RG')) g += line([[x, y], [x + play_ * 1.5, y - 1.3], [h - play_ * 0.6, 0.4]], '#cbd5e1', 1.3);
        else if (sc === 'counter' && k === (play_ > 0 ? 'LT' : 'RT')) g += line([[x, y], [x + play_ * 1.8, y - 1.5], [h + play_ * 0.5, 1.4]], '#cbd5e1', 1.3);
        else g += blockT(x, y, sc === 'stretch' || sc === 'toss' ? play_ * 1.2 : sc === 'power' ? -play_ * 0.8 : play_ * 0.5, 1.4);
      }
      for (const k of ['WR1', 'WR2', 'WR3', 'TE']) {
        const [x, y] = F[k];
        if (k === 'TE' && sc === 'iso') g += line([[x, y], [h, -0.2], [h + play_ * 0.3, 2.6]], '#cbd5e1', 1.4);
        else g += blockT(x, y, (x < 0 ? 0.6 : -0.6), 2.2);
      }
      const [cx, cy] = F[car];
      const track = sc === 'counter' ? [[cx, cy], [cx - play_ * 1.4, cy + 0.6], [h * 0.6, -1.5], [h, 1], [h + play_ * 1, 9]]
        : sc === 'toss' || sc === 'stretch' ? [[cx, cy], [h * 0.6, cy + 1.6], [h, -0.6], [h + play_ * 1.5, 8]]
          : sc === 'draw' || sc === 'qbdraw' ? [[cx, cy], [cx, cy - 0.6], [h, -0.5], [h, 9]]
            : [[cx, cy], [h, -0.6], [h, 9]];
      g += line(track, '#f97316', 2.4);
      if (car === 'RB' && sc !== 'toss') { const [qx, qy] = F.QB; g += `<circle cx="${VX((qx + h * 0.3))}" cy="${VY(qy + 0.4)}" r="1.4" fill="#f97316"/>`; }
    } else {
      for (const k of Object.keys(OL)) { const [x, y] = F[k]; g += blockT(x, y, 0, -1.3); }
      for (const k of play.prot) { const [x, y] = F[k]; g += blockT(x, y, 0, -1.1, '#e2e8f0'); }
      if (play.pa) { const [rx, ry] = F.RB, [qx] = F.QB; g += line([[rx, ry], [qx + (rx >= qx ? -1 : 1) * 1.2, ry + 1.4]], '#94a3b8', 1.1, '2 2', false); }
      for (const [slot, [kind, d]] of Object.entries(play.routes)) {
        if (kind === 'block') continue;
        const [sx, sy] = F[slot], inn = inward(sx, slot);
        if (kind === 'stalk') { g += blockT(sx, sy, inn * 0.4, 2.6); continue; }
        const P = [[sx, sy], ...routePts(kind, d, sx, inn)];
        const ri = play.reads.indexOf(slot);
        g += line(P, RC[slot], ri === 0 ? 2.1 : 1.6);
        if (ri >= 0) { const [x, y] = P[P.length - 1]; g += `<text x="${VX(x) + (x > sx ? 2 : -6)}" y="${VY(Math.min(y, 21)) + 3}" font-size="6" font-weight="700" fill="${RC[slot]}" font-family="Inter,sans-serif">${ri + 1}</text>`; }
      }
      if (play.boot) { const [qx, qy] = F.QB; g += line([[qx, qy], [qx + f * 3, qy - 2], [qx + f * 7, qy - 3]], '#e2e8f0', 1.4, '2 1.5'); }
    }
    for (const [k, [x, y]] of Object.entries(F)) {
      const isOL = k in OL;
      g += `<circle cx="${VX(x)}" cy="${VY(y)}" r="${isOL ? 2.3 : 2.6}" fill="${isOL ? '#334155' : (RC[k] || '#e2e8f0')}" stroke="#0b1220" stroke-width="0.8"/>`;
    }
    return frame(g);
  }
  // defense art is drawn against doubles
  function svgDef(play) {
    const O = formPos('gun_doubles', false);
    let g = '';
    const align = defAlign(play, O);
    for (const [k, asg] of Object.entries(play.a)) {
      if (k[0] === '_') continue;
      const [x, y] = align[k];
      if (asg === 'rush') g += line([[x, y], [x * 0.7, -1.2]], '#f87171', 1.4);
      else if (asg[0] === 'blitz') g += line([[x, y], [asg[1], 0.2], [asg[1] * 0.5, -3.2]], '#ef4444', 1.8);
      else if (asg[0] === 'man') { const [mx, my] = O[asg[1]]; g += line([[x, y], [mx, my + 0.6]], '#cbd5e1', 1, '1.6 1.6', false); }
      else if (asg[0] === 'box') g += line([[x, y], [asg[1], 0.6]], '#fb923c', 1.4);
      else if (asg[0] === 'zone') {
        const z = ZONES[asg[1]], kd = ZKIND(asg[1]);
        const col = kd === 'deep' ? '59,130,246' : kd === 'flat' ? '168,85,247' : '234,179,8';
        const rx = kd === 'deep' ? (asg[1].startsWith('q') ? 4.6 : asg[1].startsWith('half') ? 8 : 6.4) : kd === 'flat' ? 3.6 : 3.4, ry = kd === 'deep' ? 3.4 : 2.6;
        g += `<ellipse cx="${VX(z[0])}" cy="${VY(Math.min(z[1], 19.5))}" rx="${rx * 3.05}" ry="${ry * 2.55}" fill="rgba(${col},.32)" stroke="rgba(${col},.85)" stroke-width="0.8"/>`;
        g += line([[x, y], [z[0], Math.min(z[1], 19.5)]], `rgba(${col},.9)`, 1, '', false);
      }
    }
    for (const [k, [x, y]] of Object.entries(O)) g += `<circle cx="${VX(x)}" cy="${VY(y)}" r="2" fill="#475569"/>`;
    // defenders marked by position, so the personnel reads at a glance: line red, backers gold, DBs blue
    const pos = (DFORMS[play.form] || DFORMS['43']).pos, PCOL = { DL: '#fca5a5', LB: '#fde047', CB: '#93c5fd', S: '#93c5fd' };
    for (const [k, [x, y]] of Object.entries(align)) {
      const X = VX(x), Y = VY(y);
      g += `<path d="M${X - 2.2},${Y - 2.2}L${X + 2.2},${Y + 2.2}M${X + 2.2},${Y - 2.2}L${X - 2.2},${Y + 2.2}" stroke="${PCOL[pos[k]] || '#f8fafc'}" stroke-width="1.5" stroke-linecap="round"/>`;
    }
    return frame(g);
  }
  // pre-snap alignment for a defensive call against an offensive set (slot → [x, y])
  function defAlign(play, O) {
    const out = {}, front = (DFORMS[play.form] || DFORMS['43']).front;
    for (const [k, asg] of Object.entries(play.a)) {
      if (k[0] === '_') continue;
      const base = front[k] || null;
      if (k.startsWith('D')) { out[k] = base.slice(); continue; }
      if (asg[0] === 'man') {
        const [mx, my] = O[asg[1]] || [0, 0];
        if (base) { out[k] = [U.clamp(base[0] * 0.45 + mx * 0.55, -9, 9), base[1]]; continue; }
        const press = k.startsWith('CB') && play.cat === 'blitz';
        const depth = k.startsWith('CB') ? (press ? 1.6 : 5) : k.startsWith('S') ? 5.5 : 4.2;
        out[k] = [mx + (mx < 0 ? 0.7 : -0.7), Math.max(1.2, my + depth)];
      } else if (asg[0] === 'blitz') out[k] = [asg[1] * 0.9 + (base ? base[0] * 0.25 : 0), 3.0];
      else if (asg[0] === 'box') out[k] = [asg[1] * 1.5, 4.0];
      else if (asg[0] === 'zone') {
        const z = ZONES[asg[1]], kd = ZKIND(asg[1]);
        if (k.startsWith('CB')) { const wr = O[k === 'CB1' ? 'WR1' : 'WR2']; out[k] = [wr[0] + (wr[0] < 0 ? 0.8 : -0.8), kd === 'deep' ? 7 : kd === 'flat' ? 3.6 : 5]; }
        else if (k.startsWith('S')) out[k] = kd === 'deep' ? [z[0] * 0.7, Math.min(13, z[1] - 4)] : [z[0] * 0.8, 7];
        else out[k] = base ? [base[0], base[1] + (kd === 'flat' ? 0 : 0.3)] : [z[0] * 0.6, 4.5];
      } else out[k] = base ? base.slice() : [0, 5];
      if (play.id === 'prevent' && (k.startsWith('S') || k.startsWith('CB'))) out[k][1] += 4;
    }
    // spacing: no two defenders share a spot (linemen hold their gaps, everyone else slides)
    const keys = Object.keys(out), MIN = 1.8;
    for (let it = 0; it < 40; it++) {
      let moved = false;
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        const a = out[keys[i]], b = out[keys[j]];
        let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
        if (d >= MIN) continue;
        if (d < 1e-3) { dx = b[0] >= 0 ? 1 : -1; dy = 0; d = 1; }
        const fa = keys[i].startsWith('D') ? 0 : keys[j].startsWith('D') ? 1 : 0.5, push = MIN - d;
        // slide mostly sideways so depth assignments stay meaningful
        const ux = dx / d, uy = dy / d * 0.5, ul = Math.hypot(ux, uy) || 1;
        a[0] -= ux / ul * push * fa; a[1] -= uy / ul * push * fa;
        b[0] += ux / ul * push * (1 - fa); b[1] += uy / ul * push * (1 - fa);
        moved = true;
      }
      if (!moved) break;
    }
    for (const k of keys) { out[k][0] = U.clamp(out[k][0], -24, 24); out[k][1] = Math.max(0.9, out[k][1]); }
    return out;
  }

  return { FORMS, BOOKS, inBook, OFF, DEF, DFORMS, DFORM_ORDER, ZONES, ZKIND, OL, formPos, playPos, routePts, inward, hole, offById, defById, pickOff, pickDef, defType, svgOff, svgDef, defAlign };
})();
