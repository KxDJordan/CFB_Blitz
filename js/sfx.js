'use strict';
// ── SOUND ─────────────────────────────────────────────────────────
// Every sound is synthesised with Web Audio (no files to load). The on/off choice is per device,
// kept in localStorage like the theme. iOS only lets audio start from a completed tap (touchend/click,
// not touchstart), and parks it as 'interrupted' after the app is backgrounded, so every tap re-arms it.
// The ring/silent switch mutes web audio unless the player opts into playing through it.

const Sfx = (() => {
  const KEY = 'cfbblitz.sfx', LOUD_KEY = 'cfbblitz.sfxLoud';
  let on = localStorage.getItem(KEY) !== 'off', loud = localStorage.getItem(LOUD_KEY) === 'on';
  // iOS 17+: 'playback' plays through the silent switch, 'ambient' respects it (and mixes with your music)
  const session = () => { try { if (navigator.audioSession) navigator.audioSession.type = loud ? 'playback' : 'ambient'; } catch (e) { /* unsupported */ } };
  let ctx = null, master = null, noiseBuf = null;
  let crowd = null, crowdT = 0;
  const last = {};

  function init() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    session();
    ctx = new AC();
    ctx.resume().catch(() => {});
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.7;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a silent blip inside the gesture fully unlocks output on older iOS
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0);
  }
  ['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (on) init(); }, { passive: true, capture: true }));

  const ready = () => on && ctx && ctx.state === 'running';

  // ── building blocks ──
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, to = null, attack = 0.005 } = {}) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, attack, vol, dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(dur, { vol = 0.3, at = 0, type = 'lowpass', freq = 1000, to = null, q = 0.8, attack = 0.005 } = {}) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, attack, vol, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const notes = (seq, opts) => seq.forEach(([f, at, dur]) => tone(f, dur, { ...opts, at }));

  // ── the sounds ──
  const LIB = {
    tap: () => tone(1400, 0.035, { vol: 0.05, to: 900 }),
    toggle: () => { tone(880, 0.05, { vol: 0.08 }); tone(1320, 0.06, { vol: 0.08, at: 0.05 }); },
    snap: () => { noise(0.07, { vol: 0.35, freq: 900 }); tone(140, 0.08, { vol: 0.3, to: 70 }); },
    throw: () => noise(0.32, { vol: 0.16, type: 'bandpass', freq: 2600, to: 700, q: 1.4, attack: 0.04 }),
    kick: () => { tone(150, 0.16, { vol: 0.55, to: 45 }); noise(0.05, { vol: 0.3, freq: 2500 }); noise(0.5, { vol: 0.1, type: 'bandpass', freq: 1800, to: 500, q: 1.2, at: 0.04, attack: 0.05 }); },
    catch: () => { tone(260, 0.07, { vol: 0.25, to: 140 }); noise(0.04, { vol: 0.15, freq: 1600 }); },
    tackle: () => { noise(0.14, { vol: 0.35, freq: 700, to: 200 }); tone(90, 0.12, { vol: 0.3, to: 50 }); },
    bigHit: () => { noise(0.22, { vol: 0.6, freq: 1200, to: 150 }); tone(70, 0.2, { vol: 0.55, to: 38 }); crowdPop(0.5); },
    whistle: () => {
      const o1 = tone(2900, 0.32, { type: 'triangle', vol: 0.09, attack: 0.02 }), o2 = tone(3250, 0.32, { type: 'triangle', vol: 0.06, attack: 0.02 });
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 34; lg.gain.value = 120; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
      lfo.start(); lfo.stop(ctx.currentTime + 0.4);
    },
    touchdown: () => { crowdPop(1); notes([[523, 0, 0.16], [659, 0.14, 0.16], [784, 0.28, 0.16], [1047, 0.42, 0.55]], { type: 'sawtooth', vol: 0.12 }); notes([[262, 0.42, 0.55]], { type: 'square', vol: 0.06 }); },
    turnover: () => { crowdPop(0.7); notes([[440, 0, 0.14], [330, 0.13, 0.14], [220, 0.26, 0.3]], { type: 'square', vol: 0.08 }); },
    fieldGoal: () => { crowdPop(0.6); notes([[784, 0, 0.12], [988, 0.1, 0.12], [1319, 0.2, 0.35]], { type: 'triangle', vol: 0.2 }); },
    noGood: () => { tone(160, 0.4, { type: 'sawtooth', vol: 0.12, to: 110 }); noise(0.5, { vol: 0.12, type: 'bandpass', freq: 600, q: 0.6, attack: 0.08 }); },
    bigPlay: () => crowdPop(0.55),
    win: () => { crowdPop(0.9); notes([[392, 0, 0.14], [523, 0.13, 0.14], [659, 0.26, 0.14], [784, 0.39, 0.22], [659, 0.6, 0.12], [784, 0.72, 0.6]], { type: 'sawtooth', vol: 0.11 }); notes([[196, 0.72, 0.6], [262, 0.72, 0.6]], { type: 'triangle', vol: 0.12 }); },
    lose: () => notes([[392, 0, 0.3], [349, 0.28, 0.3], [311, 0.56, 0.7]], { type: 'triangle', vol: 0.16 }),
    champ: () => { crowdPop(1); notes([[523, 0, 0.18], [523, 0.18, 0.1], [523, 0.3, 0.1], [698, 0.42, 0.5], [880, 0.9, 0.2], [784, 1.08, 0.2], [1047, 1.26, 0.9]], { type: 'sawtooth', vol: 0.11 }); notes([[262, 0.42, 0.5], [349, 0.9, 0.36], [523, 1.26, 0.9]], { type: 'triangle', vol: 0.14 }); },
    onClock: () => { tone(988, 0.1, { type: 'square', vol: 0.07 }); tone(988, 0.1, { type: 'square', vol: 0.07, at: 0.16 }); },
    draft: () => { notes([[659, 0, 0.1], [988, 0.09, 0.3]], { type: 'triangle', vol: 0.2 }); crowdPop(0.35); },
    deal: () => notes([[1319, 0, 0.08], [1760, 0.07, 0.25]], { type: 'triangle', vol: 0.16 }),
    error: () => tone(180, 0.18, { type: 'square', vol: 0.06, to: 140 }),
    achievement: () => { notes([[784, 0, 0.09], [1047, 0.08, 0.09], [1319, 0.16, 0.09], [1568, 0.24, 0.4]], { type: 'triangle', vol: 0.17 }); notes([[2093, 0.24, 0.5]], { type: 'sine', vol: 0.05 }); },
  };
  // a short crowd swell layered under big moments
  function crowdPop(level) { noise(1.6 * level + 0.4, { vol: 0.22 * level, type: 'bandpass', freq: 900, q: 0.5, attack: 0.12 }); }

  function play(name, gap = 0.06) {
    if (!ready() || !LIB[name]) return;
    const now = ctx.currentTime;
    if (now - (last[name] || -9) < gap) return;
    last[name] = now;
    try { LIB[name](); } catch (e) { /* audio node limits: drop the sound */ }
  }

  // ── stadium crowd bed for live games: a steady murmur that swells with the action ──
  function crowdLevel(x) {
    if (!ready()) return;
    if (!crowd) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; s.loop = true;
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.4;
      g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(master); s.start();
      crowd = { g, f };
    }
    crowdT = ctx.currentTime;
    crowd.g.gain.setTargetAtTime(0.025 + 0.12 * x, crowdT, 0.25);
    crowd.f.frequency.setTargetAtTime(650 + 500 * x, crowdT, 0.3);
  }
  // the live loop feeds the crowd every frame; once it stops (left the game, app hidden), fade it out
  setInterval(() => { if (crowd && ctx && ctx.currentTime - crowdT > 0.3) crowd.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2); }, 250);

  function setOn(v) {
    on = !!v;
    localStorage.setItem(KEY, on ? 'on' : 'off');
    if (on) { init(); play('toggle'); } else if (crowd) crowd.g.gain.setValueAtTime(0, ctx.currentTime);
  }

  function setLoud(v) {
    loud = !!v;
    localStorage.setItem(LOUD_KEY, loud ? 'on' : 'off');
    session();
    if (on) { init(); play('toggle'); }
  }

  return { play, crowd: crowdLevel, isOn: () => on, setOn, isLoud: () => loud, setLoud };
})();
