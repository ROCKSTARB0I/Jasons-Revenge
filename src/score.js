// The score: a horror string section, generated live. Low cellos sawing out a
// two-note ostinato that quickens as a chase heats up, violins trembling on a
// dissonant cluster, odd pizzicato plucks in the quiet, and short stabbing
// stingers when someone sees you or dies.
let ac = null, out = null, verbIn = null, master = null;
let tension = 0, target = 0, timer = null, next = { ost: 0, pizz: 0, stab: 0, pad: 0 }, ostStep = 0;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);   // midi -> Hz

function impulse(secs) {
  const n = Math.floor(ac.sampleRate * secs), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (t < 0.01 ? t * 100 : 1); } }
  return b;
}
// one bowed string section note: detuned saws through a body resonance
function bow(t, freq, dur, vol, o = {}) {
  if (ac.state !== 'running') return;
  const attack = o.attack ?? 0.25, release = o.release ?? 0.5, voices = Math.min(2, o.voices ?? 2);
  const g = ac.createGain(), lp = ac.createBiquadFilter(), body = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = o.bright ?? Math.min(6000, freq * 6); lp.Q.value = 0.7;
  body.type = 'peaking'; body.frequency.value = o.formant ?? 900; body.gain.value = 5; body.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // tremolo: the bow scrubbing back and forth
  if (o.trem) { const tr = ac.createOscillator(), tg = ac.createGain(), tw = ac.createGain(); tr.frequency.value = o.trem; tg.gain.value = 0.5; tw.gain.value = 0.5; tr.connect(tg).connect(tw.gain); tr.start(t); tr.stop(t + dur); lp.connect(tw).connect(body); }
  else lp.connect(body);
  body.connect(g); g.connect(out); g.connect(verbIn);
  for (let i = 0; i < voices; i++) {
    const osc = ac.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.value = freq * (1 + (i - (voices - 1) / 2) * 0.0045);
    if (o.vib !== 0 && dur > 1.5) { const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 5 + Math.random(); vg.gain.value = freq * (o.vib ?? 0.004); v.connect(vg).connect(osc.frequency); v.start(t); v.stop(t + dur + 0.05); }
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(freq * o.slide, t + dur);
    osc.connect(lp); osc.start(t); osc.stop(t + dur + 0.05);
  }
}
// a plucked string
function pizz(t, freq, vol) {
  const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = freq;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(freq * 8, t); lp.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(lp).connect(g); g.connect(out); g.connect(verbIn);
  o.start(t); o.stop(t + 0.65);
}
// a hard, short chord from the whole section
function stab(t, notes, vol = 0.07) {
  for (const m of notes) bow(t, hz(m), 0.32, vol, { attack: 0.006, release: 0.25, bright: 7000, vib: 0, voices: 2 });
  const n = ac.createBufferSource(), nb = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * Math.min(1, i / 120);   // eased in, or it clicks
  const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = vol * 1.2;
  n.buffer = nb; n.connect(f).connect(g); g.connect(out); g.connect(verbIn); n.start(t);
}
const STABS = [[76, 77, 82], [64, 70, 71], [79, 80, 85], [71, 72, 78], [88, 89, 94]];

function schedule() {
  if (ac.state !== 'running') { next.ost = next.pad = next.trem = next.pizz = 0; return; }
  const now = ac.currentTime + 0.02, ahead = now + 0.25;
  if (COUNSELOR.has(mood)) { master.gain.setTargetAtTime(0.6, now, 0.5); scheduleMood(now, ahead); return; }
  moodT += 0.1; scheduleJason(now);
  tension += (target - tension) * 0.08;
  const T = tension;
  master.gain.setTargetAtTime(0.55, now, 0.5);
  // a held low cluster underneath everything (tritone + minor second), always there, always uneasy
  if (now >= next.pad) {
    const len = 9;
    bow(now + 0.05, hz(28), len, 0.035 + T * 0.03, { attack: 3, release: 3, bright: 500, formant: 250 });
    bow(now + 0.05, hz(34), len, 0.022 + T * 0.025, { attack: 3.5, release: 3, bright: 600, formant: 300 });
    if (T > 0.35) bow(now + 0.05, hz(29), len, 0.02 * T, { attack: 4, release: 3, bright: 700, formant: 300 });
    next.pad = now + len - 3;
  }
  // the creeping two-note ostinato in the cellos: faster and harder as they run
  if (T > 0.12) {
    const beat = 0.62 - T * 0.4;
    while (next.ost < ahead) {
      const t = Math.max(next.ost, now + 0.01);
      const hi = ostStep % 2;
      bow(t, hz(hi ? 41 : 40), beat * 0.7, 0.05 + T * 0.08 + (hi ? 0 : 0.02), { attack: 0.012, release: beat * 0.4, bright: 1200 + T * 1800, formant: 400, vib: 0, voices: 3 });
      if (T > 0.6) bow(t, hz(hi ? 53 : 52), beat * 0.6, 0.03 * T, { attack: 0.01, release: beat * 0.3, bright: 3000, formant: 900, vib: 0, voices: 2 });
      ostStep++; next.ost = t + beat;
    }
  } else next.ost = now;
  // violins trembling high on a cluster, rising with the chase
  if (T > 0.38 && now >= next.trem) {
    const len = 4 + Math.random() * 3, base = 76 + Math.floor(T * 6);
    for (const m of [base, base + 1, base + 6]) bow(now + 0.05, hz(m), len, 0.012 + T * 0.022, { attack: 1.2, release: 1.4, trem: 11 + Math.random() * 3, bright: 6000, formant: 2500, slide: T > 0.75 ? 1.06 : undefined });
    next.trem = now + len - 1.2;
  }
  next.trem ??= 0;
  // in the quiet: a lone pluck, low and wrong
  if (T < 0.5 && now >= next.pizz) {
    pizz(now + 0.05, hz(pick([33, 34, 39, 40, 45, 46])), 0.05);
    if (Math.random() < 0.4) pizz(now + 0.35, hz(pick([46, 51, 52])), 0.035);
    next.pizz = now + 3 + Math.random() * 7;
  }
  // in the thick of it: stabs out of nowhere
  if (T > 0.72 && now >= next.stab) { stab(now + 0.05, pick(STABS), 0.045 + T * 0.03); next.stab = now + 1.2 + Math.random() * 2.5; }
}
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- more voices for the moods
// a celeste: a struck bell tone, glassy, with an inharmonic partial (the counselors' theme)
function bell(t, freq, vol, len = 2.4) {
  for (const [m, v] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = freq * m;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len / m);
    o.connect(g); g.connect(out); g.connect(verbIn); o.start(t); o.stop(t + len / m + 0.05);
  }
}
// a heartbeat in the low end: lub-dub
function thump(t, vol) {
  for (const [dt2, v] of [[0, 1], [0.22, 0.7]]) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(62, t + dt2); o.frequency.exponentialRampToValueAtTime(36, t + dt2 + 0.18);
    g.gain.setValueAtTime(0.0001, t + dt2); g.gain.linearRampToValueAtTime(vol * v, t + dt2 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dt2 + 0.28);
    o.connect(g); g.connect(out); o.start(t + dt2); o.stop(t + dt2 + 0.32);
  }
}
// a dry tick, like a clock or a fingernail on wood
function tick(t, vol, f = 3200) {
  const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.03, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * Math.min(1, i / 30);
  const fl = ac.createBiquadFilter(), g = ac.createGain(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 3; g.gain.value = vol;
  n.buffer = b; n.connect(fl).connect(g); g.connect(out); n.start(t);
}
// the counselors' theme: a slow, wrong little lullaby in a minor key
const THEME = [69, 72, 71, 64, 69, 72, 76, 75, 69, 72, 71, 64, 65, 64, 63, 64];
let themeI = 0;
const COUNSELOR = new Set(['explore', 'near', 'chase', 'hide', 'task', 'witness', 'safe']);
let mood = 'hunt', moodT = 0, intensity = 0, moodNext = { bell: 0, beat: 0, tick: 0, swell: 0, drone: 0 };
function scheduleMood(now, ahead) {
  const I = intensity, M = mood, nx = moodNext;
  moodT += 0.1;
  // a quiet floor under all of it: a low drone that never resolves
  if (now >= nx.drone) { bow(now + 0.05, hz(M === 'safe' ? 45 : 33), 10, M === 'hide' ? 0.012 : 0.022 + I * 0.02, { attack: 3, release: 3, bright: 450, formant: 220 }); nx.drone = now + 7; }
  if (M === 'explore' || M === 'hide') {
    // the lullaby, a note at a time, far apart; hiding: hardly there at all
    if (now >= nx.bell) { const n = THEME[themeI++ % THEME.length]; bell(now + 0.05, hz(n + (M === 'hide' ? 12 : 0)), M === 'hide' ? 0.012 : 0.03, 3); nx.bell = now + (M === 'hide' ? 2.6 : 1.3) + (themeI % 4 === 0 ? 1.6 : 0); }
    if (M === 'hide' && now >= nx.beat) { thump(now + 0.05, 0.05 + I * 0.12); nx.beat = now + Math.max(0.42, 1.25 - I * 0.8); }
  }
  if (M === 'near') {
    // he's close and you don't know where: heartbeat, and the strings creeping up underneath
    if (now >= nx.beat) { thump(now + 0.05, 0.1 + I * 0.1); nx.beat = now + Math.max(0.5, 1.0 - I * 0.45); }
    if (now >= nx.swell) { for (const m of [52, 53]) bow(now + 0.05, hz(m + Math.round(I * 3)), 5, 0.012 + I * 0.025, { attack: 3.5, release: 1, trem: 7 + I * 6, bright: 2500, formant: 900 }); nx.swell = now + 4; }
    if (now >= nx.bell && Math.random() < 0.5) { bell(now + 0.05, hz(pick([81, 82, 87])), 0.012, 1.8); nx.bell = now + 2.5; }
  }
  if (M === 'chase') {
    // running for your life: driving low strings, heartbeat racing, stabs
    const beat = 0.24 - I * 0.06;
    while (nx.tick < ahead) { const t = Math.max(nx.tick, now + 0.01); bow(t, hz(ostStep % 2 ? 41 : 40), beat * 0.8, 0.07 + I * 0.05, { attack: 0.01, release: beat * 0.4, bright: 2600, formant: 450, vib: 0, voices: 2 }); if (ostStep % 4 === 0) thump(t, 0.14); ostStep++; nx.tick = t + beat; }
    if (now >= nx.swell) { for (const m of [76, 77, 83]) bow(now + 0.05, hz(m), 3, 0.02 + I * 0.02, { attack: 0.8, release: 1, trem: 13, bright: 6500, formant: 2500, slide: 1.05 }); nx.swell = now + 2.6; }
    if (now >= nx.bell && Math.random() < 0.6) { stab(now + 0.05, pick(STABS), 0.05 + I * 0.03); nx.bell = now + 1.2 + Math.random() * 1.8; }
  } else nx.tick = Math.max(nx.tick, now);
  if (M === 'task') {
    // fixing something, starting the car, dialling: a clock ticking, getting faster
    const beat = Math.max(0.16, 0.5 - I * 0.34);
    if (now >= nx.beat) { tick(now + 0.05, 0.08 + I * 0.08); pizz(now + 0.05, hz(ostStep++ % 2 ? 45 : 44), 0.03 + I * 0.03); nx.beat = now + beat; }
    if (now >= nx.swell) { bow(now + 0.05, hz(64 + Math.round(I * 5)), 3, 0.015 + I * 0.02, { attack: 2, release: 0.8, trem: 9, bright: 4000, formant: 1500 }); nx.swell = now + 2.5; }
  }
  if (M === 'witness' && moodT < 0.3) { stab(now + 0.05, [64, 65, 70, 76, 77], 0.1); bow(now + 0.05, hz(88), 2, 0.035, { attack: 0.01, release: 1.6, slide: 0.45, bright: 7000, vib: 0 }); for (const m of [40, 41, 46]) bow(now + 0.3, hz(m), 6, 0.05, { attack: 0.1, release: 4, bright: 1500, slide: 0.94 }); }
  if (M === 'safe' && moodT < 0.3) { for (const m of [57, 64, 69, 73]) bow(now + 0.05, hz(m), 8, 0.03, { attack: 2.5, release: 4, bright: 3000, formant: 900 }); for (let i = 0; i < 4; i++) bell(now + 0.5 + i * 0.6, hz([69, 73, 76, 81][i]), 0.03, 4); }
}
// Jason's own extra cues on top of the hunt: closing in on someone, the kill
function scheduleJason(now) {
  const nx = moodNext;
  if (mood === 'close') {
    // creeping up on someone who hasn't seen you: a heavy pulse, breath held in the strings
    if (now >= nx.beat) { thump(now + 0.05, 0.08 + intensity * 0.1); nx.beat = now + Math.max(0.55, 1.1 - intensity * 0.5); }
    if (now >= nx.swell) { bow(now + 0.05, hz(28), 4, 0.04 + intensity * 0.03, { attack: 2.5, release: 1, bright: 400, trem: 4 }); for (const m of [64, 65]) bow(now + 0.05, hz(m), 4, 0.008 + intensity * 0.02, { attack: 3, release: 0.8, trem: 12, bright: 5000, formant: 2000 }); nx.swell = now + 3.5; }
  }
  if (mood === 'kill' && moodT < 0.3) { stab(now + 0.05, [52, 53, 58, 64, 65], 0.11); for (let i = 1; i < 4; i++) stab(now + 0.05 + i * 0.32, pick(STABS), 0.07); bow(now + 0.05, hz(28), 5, 0.08, { attack: 0.02, release: 3, bright: 900, slide: 0.8 }); }
}

export const score = {
  // dest: where the music goes (the game's limiter); verb: the game's one reverb, shared
  start(audioCtx, dest, verb) {
    if (ac) return;
    ac = audioCtx;
    master = ac.createGain(); master.gain.value = 0; master.connect(dest ?? ac.destination);
    out = ac.createGain(); out.gain.value = 1; out.connect(master);
    verbIn = ac.createGain(); verbIn.gain.value = 1.4; verbIn.connect(verb ?? master);
    Object.assign(next, { ost: ac.currentTime, pizz: ac.currentTime + 2, stab: 0, pad: 0, trem: 0 });
    timer = setInterval(schedule, 100);
  },
  // 0 = nothing happening, 1 = someone screaming right in front of you
  set tension(v) { target = Math.max(0, Math.min(1, v)); },
  get tension() { return tension; },
  // someone has seen you: a single violent stab
  stinger(big = false) {
    if (!ac) return;
    const t = ac.currentTime + 0.02;
    stab(t, big ? [64, 65, 70, 76, 77] : pick(STABS), big ? 0.09 : 0.07);
    if (big) bow(t, hz(88), 1.6, 0.03, { attack: 0.01, release: 1.2, slide: 0.5, bright: 7000, vib: 0 });   // the screech sliding down
  },
  set volume(v) { if (out) out.gain.value = v; },
  // what's going on, for the music: Jason mode 'hunt' | 'close' | 'kill'; counselor mode 'explore' | 'near' | 'chase' | 'hide' | 'task' | 'witness' | 'safe'
  setMood(m, i = 0) { if (m !== mood) { mood = m; moodT = 0; if (ac) { const t = ac.currentTime; moodNext.beat = Math.min(moodNext.beat, t + 0.3); moodNext.swell = 0; } } intensity = Math.max(0, Math.min(1, i)); },
  get mood() { return mood; },
};
