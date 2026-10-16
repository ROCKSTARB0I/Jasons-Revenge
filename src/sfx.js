// Every sound in the game, made on the fly: voices from a glottal buzz shaped
// by vocal-tract formants (screams, pleading, sobbing, choking), wet impacts,
// footsteps, the night outside. Spatialised against Jason's head.
let ac = null, bus = null, noiseBuf = null, verb = null, verbSend = null;
const L = { x: 0, y: 0, z: 0, yaw: 0 };
const R = Math.random;

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    bus = ac.createGain(); bus.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
    // the open air: a long, thin tail off the trees and the water
    verb = ac.createConvolver();
    const n = ac.sampleRate * 2.6, b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); for (let i = 0; i < n; i++) x[i] = (R() * 2 - 1) * Math.pow(1 - i / n, 3.5) * (i < 400 ? 0 : 1); }
    verb.buffer = b; verbSend = ac.createGain(); verbSend.gain.value = 0.22; verbSend.connect(verb).connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// where a sound comes from: pan, distance falloff, and the far ones muffled
function place(pos, vol = 1) {
  const g = ac.createGain();
  if (!pos) { g.gain.value = vol; g.connect(bus); return g; }
  const dx = pos.x - L.x, dz = pos.z - L.z, dist = Math.hypot(dx, dz, (pos.y ?? L.y) - L.y);
  const pan = ac.createStereoPanner(), lp = ac.createBiquadFilter();
  pan.pan.value = Math.max(-1, Math.min(1, Math.sin(Math.atan2(dx, -dz) + L.yaw)));
  lp.type = 'lowpass'; lp.frequency.value = Math.max(700, 16000 / (1 + dist * 0.18));
  g.gain.value = vol / (1 + dist * 0.22);
  g.connect(lp).connect(pan).connect(bus);
  const s = ac.createGain(); s.gain.value = Math.min(1, dist / 20); g.connect(s).connect(verbSend);
  return g;
}
function noise(dur, vol, f0, f1, type = 'lowpass', pos = null, delay = 0, q = 1) {
  if (!ac) return;
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; s.loop = true; s.loopStart = R();
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(place(pos)); s.start(t); s.stop(t + dur + 0.05);
}
function tone(type, f0, f1, dur, vol, pos = null, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(place(pos)); o.start(t); o.stop(t + dur + 0.05);
}

// ---------------------------------------------------------------- voices
const VOWEL = { a: [800, 1200, 2600], e: [500, 1900, 2600], i: [300, 2300, 3100], o: [480, 850, 2500], u: [330, 800, 2400], ae: [700, 1700, 2500] };
// one vocal sound. contour: [[time, pitch multiplier], ...]; vowels move across the formants over the duration
function vox(out, t, dur, f0, contour, vowels, vol, rough = 0.2, breath = 0.15) {
  const src = ac.createOscillator(); src.type = 'sawtooth';
  const f = src.frequency; f.setValueAtTime(f0 * contour[0][1], t);
  for (const [ct, m] of contour.slice(1)) f.linearRampToValueAtTime(f0 * m, t + ct * dur);
  // tremble and jitter: terror in the voice
  const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.5 + R() * 3; vg.gain.value = f0 * 0.025 * (1 + rough * 2); vib.connect(vg).connect(f);
  const jit = ac.createBufferSource(), jg = ac.createGain(), jf = ac.createBiquadFilter(); jit.buffer = noiseBuf; jit.loop = true; jf.type = 'lowpass'; jf.frequency.value = 40; jg.gain.value = f0 * rough * 0.12; jit.connect(jf).connect(jg).connect(f);
  // breath noise mixed into the source
  const br = ac.createBufferSource(), bg = ac.createGain(), bf = ac.createBiquadFilter(); br.buffer = noiseBuf; br.loop = true; bf.type = 'highpass'; bf.frequency.value = 900; bg.gain.value = breath;
  const sum = ac.createGain(); sum.gain.value = 1;
  src.connect(sum); br.connect(bf).connect(bg).connect(sum);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(vol, t + Math.min(0.06, dur * 0.15));
  env.gain.setValueAtTime(vol * 0.9, t + dur * 0.75); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const v0 = VOWEL[vowels[0]], v1 = VOWEL[vowels[1] ?? vowels[0]];
  [0, 1, 2].forEach(k => {
    const bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = 'bandpass'; bp.Q.value = [6, 8, 10][k];
    bp.frequency.setValueAtTime(v0[k] * (f0 > 400 ? 1.12 : 1), t); bp.frequency.linearRampToValueAtTime(v1[k] * (f0 > 400 ? 1.12 : 1), t + dur);
    g.gain.value = [1, 0.6, 0.3][k];
    sum.connect(bp).connect(g).connect(env);
  });
  // a little of the raw buzz for edge
  const raw = ac.createGain(); raw.gain.value = 0.04 + rough * 0.06; sum.connect(raw).connect(env);
  env.connect(out);
  for (const n of [src, vib, jit, br]) { n.start(t); n.stop(t + dur + 0.05); }
}
// gasping breaths, wet choking
function breathy(out, t, dur, vol, f = 1200) {
  const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.05);
}
// ev: scream, shriek, plead, help, sob, gasp, choke, hurt, die, dismember, burning, whimper
function voice(ev, pos, female = false, vol = 1) {
  if (!ac) return null;
  const out = place(pos, 0.9 * vol), t = ac.currentTime + 0.02;
  const f0 = (female ? 290 : 150) * (0.9 + R() * 0.2), hi = female ? 2.3 : 2.1;
  let end = 1;
  switch (ev) {
    case 'scream': {   // the full-throated one
      const d = 1.4 + R() * 0.9;
      vox(out, t, d, f0, [[0, 1.6], [0.12, hi * 1.05], [0.6, hi], [1, hi * 0.75]], ['a', 'ae'], 0.55, 0.45, 0.25); end = d; break;
    }
    case 'shriek': { const d = 0.6 + R() * 0.3; vox(out, t, d, f0, [[0, 2], [0.2, hi * 1.25], [1, hi * 0.9]], ['i', 'e'], 0.5, 0.5, 0.3); end = d; break; }
    case 'dismember': case 'burning': {
      const d = 2.2 + R();
      vox(out, t, d, f0, [[0, 1.8], [0.1, hi * 1.15], [0.45, hi * 1.05], [0.55, hi * 1.2], [1, hi * 0.6]], ['a', 'o'], 0.6, 0.65, 0.35);
      breathy(out, t + d, 0.5, 0.15, 900); end = d + 0.5; break;
    }
    case 'plead': {   // "no, no, no--" : short falling syllables, voice cracking
      const n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const st = t + i * (0.28 + R() * 0.08); vox(out, st, 0.22, f0, [[0, 1.5], [1, 1.1]], ['o', 'u'], 0.35, 0.35, 0.3); }
      breathy(out, t + n * 0.3, 0.6, 0.12, 1400); end = n * 0.3 + 0.6; break;
    }
    case 'help': {   // "heeelp!" called out
      vox(out, t, 0.75, f0, [[0, 1.4], [0.2, 1.75], [0.85, 1.6], [1, 1.2]], ['e', 'e'], 0.45, 0.3, 0.2);
      vox(out, t + 0.95, 0.9, f0, [[0, 1.5], [0.25, 1.9], [1, 1.3]], ['e', 'o'], 0.45, 0.35, 0.2);
      end = 2; break;
    }
    case 'sob': case 'whimper': {
      for (let i = 0; i < 4; i++) { breathy(out, t + i * 0.32, 0.15, 0.12, 1300); vox(out, t + i * 0.32 + 0.12, 0.18, f0, [[0, 1.3], [1, 1]], ['u', 'e'], 0.16, 0.5, 0.4); }
      end = 1.4; break;
    }
    case 'gasp': { breathy(out, t, 0.35, 0.3, 1600); vox(out, t + 0.05, 0.25, f0, [[0, 1.2], [1, 1.5]], ['a', 'a'], 0.12, 0.2, 0.6); end = 0.4; break; }
    case 'choke': {   // throttled: wet, strangled gurgles
      for (let i = 0; i < 6; i++) { const st = t + i * 0.16 + R() * 0.05; vox(out, st, 0.1, f0 * 0.8, [[0, 1], [1, 0.8]], ['u', 'o'], 0.18, 0.9, 0.5); breathy(out, st + 0.08, 0.08, 0.1, 500); }
      end = 1.1; break;
    }
    case 'hurt': { const d = 0.4 + R() * 0.3; vox(out, t, d, f0, [[0, 1.4], [0.2, 1.9], [1, 1.2]], ['a', 'a'], 0.45, 0.4, 0.2); end = d; break; }
    case 'die': {   // the last of it going out of them
      vox(out, t, 1.3, f0, [[0, 1.2], [0.3, 1.1], [1, 0.6]], ['a', 'o'], 0.25, 0.6, 0.45);
      for (let i = 0; i < 3; i++) breathy(out, t + 1.2 + i * 0.5, 0.4, 0.08 / (i + 1), 500);
      end = 2.6; break;
    }
    default: { vox(out, t, 0.5, f0, [[0, 1.3], [1, 1]], ['a'], 0.3); end = 0.5; }
  }
  const line = { end: ac.currentTime + end, stop() { out.gain.setTargetAtTime(0, ac.currentTime, 0.03); line.end = 0; } };
  return line;
}

// ---------------------------------------------------------------- the night
const amb = { on: false };
function ambience(fearFn) {
  if (amb.on) return; amb.on = true;
  const brown = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate), d = brown.getChannelData(0);
  let b = 0; for (let i = 0; i < d.length; i++) { b = b * 0.985 + (R() * 2 - 1) * 0.015; d[i] = b * 4; }
  const loop = (filterType, f, vol) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = brown; s.loop = true; fl.type = filterType; fl.frequency.value = f; g.gain.value = vol; s.connect(fl).connect(g).connect(ac.destination); s.start(); return { fl, g }; };
  amb.wind = loop('bandpass', 380, 0.25); amb.wind.fl.Q.value = 0.5;
  amb.lap = loop('lowpass', 650, 0);
  // crickets: a carpet of chirps from all around
  const cricket = () => {
    if (!amb.on) return;
    const t = ac.currentTime, p = ac.createStereoPanner(); p.pan.value = R() * 2 - 1; p.connect(ac.destination);
    const f = 4200 + R() * 900, n = 2 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) { const o = ac.createOscillator(), g = ac.createGain(), st = t + i * 0.055; o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.008 * amb.crickets, st + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.035); o.connect(g).connect(p); o.start(st); o.stop(st + 0.04); }
    setTimeout(cricket, 120 + R() * 380);
  };
  amb.crickets = 1; cricket(); setTimeout(cricket, 200); setTimeout(cricket, 330);
  const loon = () => {
    if (!amb.on) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner(); p.pan.value = R() * 1.6 - 0.8;
    o.type = 'sine'; o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(880, t + 0.7); o.frequency.linearRampToValueAtTime(820, t + 1.8); o.frequency.linearRampToValueAtTime(940, t + 2.4); o.frequency.linearRampToValueAtTime(600, t + 3.2);
    const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 6; vg.gain.value = 12; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + 3.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.3); g.gain.setValueAtTime(0.04, t + 2.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
    o.connect(g).connect(p).connect(ac.destination); p.connect(verbSend); o.start(t); o.stop(t + 3.4);
    setTimeout(loon, 25000 + R() * 40000);
  };
  setTimeout(loon, 9000);
  const owl = () => {
    if (!amb.on) return;
    const t = ac.currentTime, p = ac.createStereoPanner(); p.pan.value = R() * 2 - 1; p.connect(ac.destination);
    for (const [dt, len] of [[0, 0.35], [0.5, 0.18], [0.75, 0.5]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(390, t + dt); o.frequency.linearRampToValueAtTime(340, t + dt + len); g.gain.setValueAtTime(0.0001, t + dt); g.gain.linearRampToValueAtTime(0.028, t + dt + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + len); o.connect(g).connect(p); o.start(t + dt); o.stop(t + dt + len + 0.05); }
    setTimeout(owl, 18000 + R() * 30000);
  };
  setTimeout(owl, 15000);
  // twigs snapping somewhere in the trees
  const twig = () => { if (!amb.on) return; const x = L.x + (R() - 0.5) * 40, z = L.z + (R() - 0.5) * 40; noise(0.04, 0.25, 3000, 1500, 'bandpass', { x, y: 0, z }); if (R() < 0.5) noise(0.03, 0.2, 2500, 1200, 'bandpass', { x, y: 0, z }, 0.09); setTimeout(twig, 6000 + R() * 14000); };
  setTimeout(twig, 5000);
}
function updateAmbience(nearShore, quiet) {
  if (!amb.on) return;
  const t = ac.currentTime;
  amb.wind.g.gain.setTargetAtTime(0.14 + Math.sin(t * 0.13) * 0.08 + Math.sin(t * 0.41) * 0.04, t, 0.6);
  amb.wind.fl.frequency.setTargetAtTime(300 + Math.sin(t * 0.21) * 140, t, 0.6);
  amb.lap.g.gain.setTargetAtTime(nearShore * (0.06 + Math.max(0, Math.sin(t * 1.3)) * 0.1), t, 0.2);
  amb.crickets = quiet;   // they go quiet when something is close
}

export const sfx = {
  init: ctx, get ctx() { return ac; },
  setListener(x, y, z, yaw) { L.x = x; L.y = y; L.z = z; L.yaw = yaw; },
  voice, ambience, updateAmbience,
  now: () => ac ? ac.currentTime : 0,
  // blades and bodies
  chop(heavy, pos) { noise(0.05, 0.4, 5000, 2000, 'bandpass', pos); noise(0.25, heavy ? 0.9 : 0.6, 1100, 140, 'lowpass', pos, 0.01); tone('sine', heavy ? 110 : 150, 45, 0.2, heavy ? 0.7 : 0.4, pos); noise(0.35, 0.3, 700, 200, 'bandpass', pos, 0.05, 2); },
  stab(pos) { noise(0.32, 0.6, 800, 160, 'lowpass', pos); noise(0.2, 0.25, 1600, 600, 'bandpass', pos, 0.06, 3); tone('sine', 140, 60, 0.2, 0.35, pos); },
  slurp(pos) { noise(0.4, 0.35, 900, 300, 'bandpass', pos, 0, 4); },
  punch(pos) { tone('sine', 120, 45, 0.16, 0.8, pos); noise(0.07, 0.5, 1600, 300, 'lowpass', pos); },
  crack(pos) { noise(0.045, 0.8, 3200, 1600, 'bandpass', pos, 0, 3); tone('square', 900, 220, 0.03, 0.15, pos); },
  crunch(pos) { for (let i = 0; i < 5; i++) noise(0.06, 0.6, 2600, 700, 'bandpass', pos, i * 0.03, 2); noise(0.4, 0.7, 700, 90, 'lowpass', pos); },
  rip(pos) { noise(0.55, 0.7, 1900, 280, 'bandpass', pos, 0, 1.5); noise(0.45, 0.6, 500, 80, 'lowpass', pos); for (let i = 0; i < 3; i++) noise(0.03, 0.4, 3000, 1500, 'bandpass', pos, 0.1 + i * 0.08, 3); },
  splat(pos) { noise(0.3, 0.6, 700, 120, 'lowpass', pos); tone('sine', 120, 45, 0.2, 0.35, pos); },
  thud(pos) { tone('sine', 95, 40, 0.2, 0.7, pos); noise(0.1, 0.4, 600, 120, 'lowpass', pos); },
  bodyfall(pos) { tone('sine', 80, 35, 0.3, 0.6, pos); noise(0.18, 0.4, 500, 100, 'lowpass', pos); noise(0.12, 0.2, 2000, 800, 'bandpass', pos, 0.05); },
  // world
  clank(pos) { tone('square', 680, 600, 0.12, 0.18, pos); tone('triangle', 1360, 1300, 0.3, 0.14, pos); noise(0.05, 0.4, 5000, 2000, 'highpass', pos); },
  zap(pos) { for (let i = 0; i < 7; i++) noise(0.04, 0.4, 6000, 3000, 'highpass', pos, i * 0.05 + R() * 0.03); },
  hiss(pos) { noise(2.5, 0.3, 5000, 1500, 'highpass', pos); },
  powerDown(pos) { tone('sawtooth', 120, 25, 1.8, 0.3, pos); noise(0.8, 0.3, 300, 60, 'lowpass', pos); },
  bubble(pos) { tone('sine', 300 + R() * 300, 900, 0.06, 0.15, pos); },
  splash(pos, big = false) { noise(big ? 0.6 : 0.25, big ? 0.6 : 0.25, 1400, 250, 'lowpass', pos); if (big) noise(0.3, 0.3, 3000, 800, 'bandpass', pos, 0.08); },
  step(pos, vol = 0.12, soft = false) { noise(0.07, vol, soft ? 300 : 500, 120, 'lowpass', pos); if (!soft) noise(0.03, vol * 0.4, 2500, 1200, 'bandpass', pos, 0.01, 2); },
  impact() { tone('sine', 90, 40, 0.25, 0.9); noise(0.12, 0.6, 2000, 300); },
  gunshot(pos) { noise(0.35, 1.3, 3500, 200, 'lowpass', pos); tone('sine', 160, 40, 0.3, 1.0, pos); noise(1.6, 0.2, 800, 100, 'lowpass', pos, 0.15); },
  whiz() { tone('sine', 2200, 900, 0.12, 0.08); },
  heartbeat() { for (let i = 0; i < 5; i++) { tone('sine', 60, 40, 0.12, 0.6, null, i * 0.9); tone('sine', 55, 38, 0.14, 0.45, null, i * 0.9 + 0.22); } },
  draw() { noise(0.3, 0.3, 6500, 2500, 'bandpass', null, 0, 2); },
  holster() { noise(0.12, 0.2, 2000, 800, 'bandpass'); tone('sine', 300, 200, 0.05, 0.1); },
  dial(pos) { for (let i = 0; i < 7; i++) tone('square', 900, 900, 0.05, 0.05, pos, i * 0.35); },
  crank(pos) { for (let i = 0; i < 5; i++) { noise(0.18, 0.35, 400, 120, 'lowpass', pos, i * 0.22); tone('sawtooth', 70, 50, 0.15, 0.12, pos, i * 0.22); } },
  engine(pos) { tone('sawtooth', 50, 120, 3, 0.25, pos); noise(3, 0.25, 500, 900, 'lowpass', pos); },
  breath(pos, female) { if (!ac) return; const o = place(pos, 0.8); breathy(o, ac.currentTime, 0.5, 0.12, female ? 1500 : 1100); breathy(o, ac.currentTime + 0.6, 0.45, 0.1, female ? 1300 : 900); },
  door(pos) { noise(0.5, 0.2, 400, 200, 'bandpass', pos, 0, 6); tone('sawtooth', 180, 140, 0.4, 0.04, pos); },
  radio(pos) { noise(0.09, 0.3, 2400, 1800, 'bandpass', pos); noise(0.5, 0.12, 1600, 1200, 'bandpass', pos, 0.1); },
  siren(on) {
    if (!ac) return;
    if (on && !this._siren) {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 2000;
      g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.5);
      let t = ac.currentTime; for (let i = 0; i < 12; i++) { o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(1200, t + 0.6); o.frequency.linearRampToValueAtTime(600, t + 1.3); t += 1.3; }
      o.connect(f).connect(g).connect(bus); o.start(); this._siren = { o, g };
    } else if (!on && this._siren) { const { o, g } = this._siren; g.gain.setTargetAtTime(0, ac.currentTime, 0.4); o.stop(ac.currentTime + 2); this._siren = null; }
  },
  tick() { tone('square', 1100, 1100, 0.03, 0.06); },
  // ---- the wet stuff
  // a squelch: several sticky pops through a resonant, shifting filter, over a low give
  squelch(pos, amt = 1) {
    for (let i = 0; i < 4 + Math.floor(amt * 4); i++) noise(0.05 + R() * 0.08, 0.35 * amt, 300 + R() * 700, 150 + R() * 300, 'bandpass', pos, i * (0.03 + R() * 0.04), 6 + R() * 6);
    tone('sine', 90 + R() * 30, 40, 0.25, 0.4 * amt, pos);
    for (let i = 0; i < 3; i++) tone('sine', 500 + R() * 600, 200, 0.03, 0.12 * amt, pos, 0.05 + R() * 0.2);
  },
  // guts sliding out and slopping down: a heavy wet mass with a wobble to it, then dripping
  slop(pos) {
    if (!ac) return;
    const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), am = ac.createOscillator(), amg = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.9); f.Q.value = 4;
    am.frequency.value = 14 + R() * 8; amg.gain.value = 0.35; am.connect(amg).connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    s.connect(f).connect(g).connect(place(pos)); s.start(t); s.stop(t + 1.05); am.start(t); am.stop(t + 1.05);
    this.squelch(pos, 0.8); tone('sine', 70, 35, 0.4, 0.5, pos, 0.35);
    for (let i = 0; i < 6; i++) this.drip(pos, 0.6 + i * (0.15 + R() * 0.2));
  },
  drip(pos, delay = 0) { tone('sine', 700 + R() * 500, 1400 + R() * 600, 0.04, 0.07, pos, delay); },
  // meat tearing: fibrous, stringy, wet
  tear(pos) {
    for (let i = 0; i < 9; i++) noise(0.03 + R() * 0.05, 0.3, 1500 + R() * 2500, 600, 'bandpass', pos, i * 0.045 + R() * 0.02, 4);
    noise(0.6, 0.45, 600, 100, 'lowpass', pos); this.squelch(pos, 0.7);
  },
  // a blade working around inside someone
  grind(pos) { for (let i = 0; i < 5; i++) noise(0.08, 0.25, 400 + R() * 400, 200, 'bandpass', pos, i * 0.07, 8); noise(0.1, 0.15, 3000, 1500, 'bandpass', pos, 0.1, 4); },
  // blood gushing out
  gush(pos) { noise(0.8, 0.3, 600, 250, 'bandpass', pos, 0, 2); for (let i = 0; i < 4; i++) noise(0.1, 0.18, 400 + R() * 300, 200, 'bandpass', pos, 0.1 + i * 0.15, 8); },
};
