// Shared synth rack + scheduler. Every sound is synthesized live with Web Audio: no samples, no libraries.

export const hz = (m) => 440 * 2 ** ((m - 69) / 12); // MIDI note -> frequency
export const rnd = (n) => (Math.imul(n + 1, 2654435761) >>> 0) / 2 ** 32; // repeatable "random" in [0, 1) per integer

// Parameters every track gets. A track can override the defaults with `defaults: { bpm: 72, ... }`.
export const COMMON = {
  volume: { label: "Volume", min: 0, max: 1.5, step: .01, value: 1 },
  bpm: { label: "Tempo", min: 40, max: 180, step: 1, value: 100, unit: " bpm" },
  transpose: { label: "Transpose", min: -12, max: 12, step: 1, value: 0, unit: " st" },
  swing: { label: "Swing", min: 0, max: 1, step: .01, value: 0 },
  tone: { label: "Brightness", min: 0, max: 1, step: .01, value: 1 },
  reverb: { label: "Reverb", min: 0, max: 2, step: .01, value: 1 },
  echo: { label: "Echo", min: 0, max: 2, step: .01, value: 1 },
  voiceOver: { label: "Voice-over space", min: 0, max: 1, step: 1, value: 0 },
};

// Voice-over space: dips the frequencies speech lives in, so a voice sits on top of the music.
export function voiceEq(ac) {
  const a = ac.createBiquadFilter(), b = ac.createBiquadFilter();
  a.type = b.type = "peaking";
  a.frequency.value = 2500; a.Q.value = .9;
  b.frequency.value = 1000; b.Q.value = 1;
  a.connect(b);
  return {
    input: a, output: b,
    set(on, now) { a.gain.setTargetAtTime(on ? -5 : 0, now, .05); b.gain.setTargetAtTime(on ? -2 : 0, now, .05); },
  };
}
export const toneHz = (x) => 250 * (20000 / 250) ** x; // Brightness param -> low-pass cutoff

// Stems for downloads: every sound belongs to one.
export const STEMS = ["drums", "bass", "chords", "melody", "ambience"];
const stemOf = (kind) => kind === "bed" ? "ambience" : { chords: "chords", keys: "chords", lead: "melody", bass: "bass" }[LANES[kind]] || "drums";

// Small seeded random generator (mulberry32), so offline renders come out identical every time.
const seeded = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
};

// Which visualizer lane each melodic instrument draws in; everything else counts as drums.
const LANES = { pad: "chords", power: "chords", brass: "lead", wah: "keys", piano: "keys", keys: "keys", guitar: "keys", pluck: "lead", bell: "lead", flute: "lead", lead: "lead", glide: "lead", bass: "bass" };

// A small synth rack for one track, feeding `out`. `v.S` (length of a 16th note) is kept current by the Player.
// `random` replaces Math.random (for repeatable renders); `only`, a Set of stem names, silences everything else.
export function instruments(ac, out, { random = Math.random, only } = {}) {
  const gain = (v) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const filter = (type, freq, q = .7) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
  const osc = (type, freq, t, end, dest) => {
    const o = ac.createOscillator();
    if (typeof type === "string") o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = freq; o.connect(dest); o.start(t); o.stop(end); return o;
  };
  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = random() * 2 - 1;
  const noise = (t, end, dest) => {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.connect(dest); src.start(t, rnd(Math.round(t * 1000)) * 2); // offset from the note time, so stems match the mix
    if (end) src.stop(end);
    return src;
  };
  // Attack to `peak`, hold, then fade out; returns the time the voice is silent.
  const env = (g, t, attack, peak, hold, release) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(0, t + attack + hold, release / 4);
    return t + attack + hold + release;
  };

  // Reverb: a decaying burst of stereo noise as the impulse response. Echo: dotted-eighth delay.
  // Each channel sends to them; `revIn` / `echoIn` scale all sends at once (the Reverb / Echo params).
  const rev = ac.createConvolver(), ir = ac.createBuffer(2, ac.sampleRate * 3, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (random() * 2 - 1) * (1 - i / d.length) ** 4; }
  rev.buffer = ir; rev.connect(out);
  const revIn = gain(1), echoIn = gain(1), echo = ac.createDelay(2), damp = filter("lowpass", 2500);
  revIn.connect(rev); echoIn.connect(echo);
  echo.connect(damp).connect(gain(.35)).connect(echo); damp.connect(out);
  const bus = (wet, echoes = 0) => {
    const g = gain(1); g.connect(out); g.connect(gain(wet)).connect(revIn);
    if (echoes) g.connect(gain(echoes)).connect(echoIn);
    return g;
  };
  const ch = { pad: bus(.5), lead: bus(.3, .3), keys: bus(.35, .12), bass: bus(.05), drums: bus(.1), snare: bus(.35), air: bus(.2), dist: bus(.12) };

  // Tape wobble: one slow LFO bending the pitch of keys and pads (the `wobble` param, in cents).
  const wobble = gain(0), wobbleLfo = osc("sine", .45, ac.currentTime, 1e9, wobble);
  const wobbly = (o) => { wobble.connect(o.detune); o.onended = () => wobble.disconnect(o.detune); return o; };

  // Soft piano-ish tone: a few decaying harmonics. Guitar: the spectrum of a string plucked near the bridge.
  const pianoWave = ac.createPeriodicWave(new Float32Array(8), new Float32Array([0, 1, .55, .22, .14, .07, .04, .02]));
  // Narrow pulse wave (25% duty): the nasal, reedy tone behind the wah.
  const pulseWave = ac.createPeriodicWave(new Float32Array(32), Float32Array.from({ length: 32 }, (_, n) => n && Math.sin(Math.PI * n * .25) * 2 / (Math.PI * n)));
  const guitarWave = ac.createPeriodicWave(new Float32Array(17), Float32Array.from({ length: 17 }, (_, n) => n && Math.abs(Math.sin(n * Math.PI * .18)) / n ** 1.1));

  // Distortion curves (soft clipping, harder with more drive), cached per drive amount.
  const curves = {};
  const curve = (drive) => curves[drive] ??= Float32Array.from({ length: 1024 }, (_, i) => {
    const k = 1 + drive * 40, x = i / 511.5 - 1;
    return Math.tanh(k * x) / Math.tanh(k);
  });

  const beds = {}; // looping noise layers (rain, vinyl hiss, ...), created on first use
  let transpose = 0, lastS;
  const f = (m) => hz(m + transpose);

  const v = {
    S: .15,
    // Called by the Player whenever params may have changed.
    fx(p) {
      const now = ac.currentTime;
      transpose = p.transpose;
      revIn.gain.setTargetAtTime(p.reverb, now, .05);
      echoIn.gain.setTargetAtTime(p.echo, now, .05);
      wobble.gain.setTargetAtTime(p.wobble ?? 0, now, .05);
      if (this.S !== lastS) echo.delayTime.setTargetAtTime(Math.min(2, 3 * (lastS = this.S)), now, .05);
    },
    dispose() {
      wobbleLfo.stop();
      for (const b of Object.values(beds)) b.src.stop();
    },

    // Two detuned saws per note through a soft low-pass, swelling in and out.
    pad(t, notes, len, vol, cutoff) {
      const g = gain(0), fl = filter("lowpass", cutoff); fl.connect(g).connect(ch.pad);
      const end = env(g, t, len * .4, vol, len * .4, len * .5);
      for (const m of notes) for (const d of [-8, 8]) wobbly(osc("sawtooth", f(m), t, end, fl)).detune.value = d;
    },
    // Plucked synth: a bright attack whose filter closes quickly.
    pluck(t, m, { type = "square", vol = .05, decay = .25, cutoff = 1800 } = {}) {
      const g = gain(0), fl = filter("lowpass", cutoff * 3, 2); fl.connect(g).connect(ch.lead);
      fl.frequency.setTargetAtTime(cutoff * .4, t, decay / 3);
      osc(type, f(m), t, env(g, t, .004, vol, 0, decay), fl);
    },
    // FM bell / mallet: a sine whose pitch is wobbled by a second sine at `ratio` times the note.
    bell(t, m, { vol = .06, decay = 1.2, ratio = 3.5, index = 2 } = {}) {
      const g = gain(0), mod = gain(0); g.connect(ch.lead);
      const end = env(g, t, .003, vol, 0, decay);
      mod.gain.setValueAtTime(f(m) * index, t); mod.gain.setTargetAtTime(0, t, decay / 6);
      mod.connect(osc("sine", f(m), t, end, g).frequency);
      osc("sine", f(m) * ratio, t, end, mod);
    },
    // Piano: harmonic-rich tone, slightly detuned pair, filter closing as the note decays.
    piano(t, m, { vol = .07, decay = 1.8 } = {}) {
      const g = gain(0), fl = filter("lowpass", Math.min(12000, f(m) * 8)); fl.connect(g).connect(ch.keys);
      fl.frequency.setTargetAtTime(f(m) * 2.5, t, decay / 5);
      const end = env(g, t, .004, vol, 0, decay);
      for (const d of [-3, 3]) osc(pianoWave, f(m), t, end, fl).detune.value = d;
    },
    // Electric piano (Rhodes-ish): FM sine with a short metallic "tine" on top. Follows the tape wobble.
    keys(t, m, len, { vol = .05, bright = 1 } = {}) {
      const g = gain(0), mod = gain(0); g.connect(ch.keys);
      const end = env(g, t, .006, vol, len, .5);
      mod.gain.setValueAtTime(f(m) * 1.3 * bright, t); mod.gain.setTargetAtTime(f(m) * .15 * bright, t, .12);
      mod.connect(wobbly(osc("sine", f(m), t, end, g)).frequency);
      osc("sine", f(m), t, end, mod);
      const tine = gain(0); tine.connect(ch.keys);
      osc("sine", f(m) * 7, t, env(tine, t, .002, vol * .12 * bright, 0, .15), tine);
    },
    // Fingerpicked nylon-ish guitar: bright pluck that mellows quickly. Follows the tape wobble.
    guitar(t, m, { vol = .06, decay = 1.6, bright = 1 } = {}) {
      const g = gain(0), fl = filter("lowpass", Math.min(15000, f(m) * 12 * bright), .5); fl.connect(g).connect(ch.keys);
      fl.frequency.setTargetAtTime(f(m) * 1.5, t, decay / 6);
      const end = env(g, t, .002, vol, 0, decay);
      for (const d of [-4, 4]) wobbly(osc(guitarWave, f(m), t, end, fl)).detune.value = d;
    },
    // Breathy flute / whistle: sine + a touch of triangle, delayed vibrato, band-passed breath noise.
    flute(t, m, len, { vol = .05, vibrato = .6, breath = .3, attack = .12 } = {}) {
      const g = gain(0), depth = gain(0); g.connect(ch.lead);
      const end = env(g, t, attack, vol, len, .4);
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(vibrato * 20, t + .6);
      osc("sine", 5, t, end, depth);
      for (const [type, level] of [["sine", 1], ["triangle", .25]]) {
        const lg = gain(level); lg.connect(g); depth.connect(osc(type, f(m), t, end, lg).detune);
      }
      const bf = filter("bandpass", f(m) * 2, 4); bf.connect(gain(breath * .6)).connect(g); noise(t, end, bf);
    },
    // A note sliding from one pitch to another: slide whistles, boings. `wobble` adds a fast warble (Hz).
    glide(t, from, to, len, { type = "sine", vol = .05, wobble = 0 } = {}) {
      const g = gain(0); g.connect(ch.lead);
      const o = osc(type, f(from), t, env(g, t, .01, vol, len, .08), g);
      o.frequency.setValueAtTime(f(from), t); o.frequency.exponentialRampToValueAtTime(f(to), t + len);
      if (wobble) { const d = gain(60); osc("sine", wobble, t, t + len + .1, d); d.connect(o.detune); }
    },
    // Distorted power chord (root, fifth, octave). Palm-muted: short, with the filter clamped down by `tightness`.
    power(t, m, len, { vol = .05, drive = 1, mute = false, tightness = .5 } = {}) {
      const pre = gain(1), sh = ac.createWaveShaper(), g = gain(0);
      const fl = filter("lowpass", mute ? 500 + 1500 * (1 - tightness) : 3200, 1.2);
      sh.curve = curve(drive); sh.oversample = "2x";
      pre.connect(sh).connect(fl).connect(g).connect(ch.dist);
      const end = env(g, t, .003, vol, mute ? 0 : len, mute ? .09 : .15);
      for (const [n, d] of [[0, -7], [0, 7], [7, 0], [12, 4]]) osc("sawtooth", f(m + n), t, end, pre).detune.value = d;
    },
    // Brass: saws whose filter opens as the note swells (the "blat"), with a little vibrato. `section` stacks detuned players.
    brass(t, m, len, { vol = .04, bright = 1, attack = .06, section = 2 } = {}) {
      const g = gain(0), fl = filter("lowpass", 300, 1.5); fl.connect(g).connect(ch.lead);
      fl.frequency.setValueAtTime(300, t); fl.frequency.linearRampToValueAtTime(f(m) * 4 * bright + 400, t + attack + .05);
      fl.frequency.setTargetAtTime(f(m) * 2.5 * bright + 300, t + attack + .1, .3);
      const end = env(g, t, attack, vol, len, .2), depth = gain(0);
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(12, t + .4);
      osc("sine", 5.5, t, end, depth);
      for (let k = 0; k < section; k++) { const o = osc("sawtooth", f(m), t, end, fl); o.detune.value = (k - (section - 1) / 2) * 9; depth.connect(o.detune); }
    },
    // Wah guitar / clav: bright pulse through a resonant band-pass that sweeps open and shut with each hit.
    wah(t, m, len, { vol = .04, from = 400, to = 2200, q = 6 } = {}) {
      const g = gain(0), fl = filter("bandpass", from, q); fl.connect(g).connect(ch.keys);
      fl.frequency.setValueAtTime(from, t); fl.frequency.exponentialRampToValueAtTime(to, t + len * .4);
      fl.frequency.exponentialRampToValueAtTime(from, t + len);
      osc(pulseWave, f(m), t, env(g, t, .004, vol, len * .6, .08), fl);
    },
    // Duck channels (sidechain "pump"): drop to 1 - depth at `t` and swell back over `len`.
    duck(t, depth, len, names = ["pad"]) {
      for (const n of names) { ch[n].gain.setValueAtTime(1 - depth, t); ch[n].gain.linearRampToValueAtTime(1, t + len); }
    },
    // Bowed / sung / kazoo line: slow attack, delayed vibrato. A band-pass filter makes it nasal.
    lead(t, m, len, { vol = .04, type = "sawtooth", cutoff = 1600, q = 1, filterType = "lowpass", vibrato = .5, attack = .12, from, slide = .15 } = {}) {
      const g = gain(0), fl = filter(filterType, cutoff, q); fl.connect(g).connect(ch.lead);
      const end = env(g, t, attack, vol, len, .5), depth = gain(0);
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(vibrato * 25, t + .5);
      osc("sine", 5.3, t, end, depth);
      for (const d of type === "sawtooth" ? [-6, 6] : [0]) {
        const o = osc(type, f(m), t, end, fl); o.detune.value = d; depth.connect(o.detune);
        if (from !== undefined) { o.frequency.setValueAtTime(f(from), t); o.frequency.exponentialRampToValueAtTime(f(m), t + slide); }
      }
    },
    bass(t, m, len, { type = "sawtooth", vol = .1, cutoff = 500 } = {}) {
      const g = gain(0), fl = filter("lowpass", cutoff, 3); fl.connect(g).connect(ch.bass);
      osc(type, f(m), t, env(g, t, .005, vol, len, .08), fl);
    },
    kick(t, vol = .5, { pitch = 150, decay = .3 } = {}) {
      const g = gain(0); g.connect(ch.drums);
      osc("sine", pitch, t, env(g, t, .002, vol, .02, decay), g).frequency.exponentialRampToValueAtTime(42, t + .12);
    },
    // Hats, snares, claps, crashes and clicks are filtered noise with different envelopes.
    hiss(t, { vol, decay, type = "highpass", freq = 7000, q = 1, to = ch.drums }) {
      const g = gain(0), fl = filter(type, freq, q); fl.connect(g).connect(to);
      noise(t, env(g, t, .002, vol, 0, decay), fl);
    },
    hat(t, vol = .03, open = false) { this.hiss(t, { vol, decay: open ? .25 : .05 }); },
    snare(t, vol = .12, { freq = 1200 } = {}) {
      this.hiss(t, { vol, decay: .2, freq, to: ch.snare });
      const g = gain(0); g.connect(ch.snare);
      osc("triangle", 185, t, env(g, t, .002, vol, 0, .1), g);
    },
    clap(t, vol = .12) {
      for (const [d, decay] of [[0, .02], [.012, .02], [.024, .18]]) this.hiss(t + d, { vol, decay, type: "bandpass", freq: 1300, to: ch.snare });
    },
    // Tiny tick: vinyl pops, rain drops, rim clicks, shakers.
    click(t, vol = .05, freq = 3000, decay = .004) { this.hiss(t, { vol, decay, type: "bandpass", freq, q: 2, to: ch.air }); },
    crash(t) { this.hiss(t, { vol: .05, decay: 2, freq: 5000, to: ch.snare }); },
    // Noise sweeping upwards into the next loop.
    riser(t, len) {
      const g = gain(0), fl = filter("bandpass", 300, 2); fl.connect(g).connect(ch.snare);
      fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(8000, t + len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + len); g.gain.linearRampToValueAtTime(0, t + len + .05);
      noise(t, t + len + .05, fl);
    },
    // Laser "pew", echoed by the delay.
    zap(t, vol = .05) {
      const g = gain(0); g.connect(ch.lead);
      osc("sine", 2000, t, env(g, t, .005, vol, .1, .3), g).frequency.exponentialRampToValueAtTime(150, t + .35);
    },
    // Continuous noise layer (rain, hiss, room tone). Call it every step with the current level; it glides there.
    bed(name, vol, { type = "lowpass", freq = 800, q = .5 } = {}) {
      if (only && !only.has("ambience")) return;
      let b = beds[name];
      if (!b) {
        const g = gain(0), fl = filter(type, freq, q); fl.connect(g).connect(ch.air);
        b = beds[name] = { g, src: noise(ac.currentTime, 0, fl) };
      }
      b.g.gain.setTargetAtTime(vol, Math.max(ac.currentTime, this.at ?? 0), .3); // `at`: the step being scheduled
    },
  };

  // Report every note to `v.onNote` for the visualizers. Only the outermost call counts:
  // a snare that plays through hiss() is one snare, not a snare plus a hiss.
  let depth = 0;
  const describe = (kind, a) => {
    const t = a[0], o = a.find((x) => x && typeof x === "object" && !Array.isArray(x)) || {};
    if (!LANES[kind]) return { t, len: .1, lane: "drums", kind, vol: typeof a[1] === "number" ? a[1] : o.vol ?? .05 };
    const notes = Array.isArray(a[1]) ? a[1] : kind === "glide" ? [a[1], a[2]] : kind === "power" ? [a[1], a[1] + 7, a[1] + 12] : [a[1]];
    const len = kind === "glide" ? a[3] : typeof a[2] === "number" ? a[2] : o.decay ?? .25;
    return { t, len, lane: LANES[kind], kind, notes: notes.map((m) => m + transpose), vol: kind === "pad" ? a[3] : o.vol ?? .05 };
  };
  for (const [kind, fn] of Object.entries(v)) {
    if (typeof fn !== "function" || ["fx", "dispose", "bed", "duck"].includes(kind)) continue;
    v[kind] = function (...a) {
      if (!depth && only && !only.has(stemOf(kind))) return;
      if (!depth && v.onNote) { const e = describe(kind, a); if (e.vol > 0) v.onNote(e); }
      depth++;
      try { return fn.apply(this, a); } finally { depth--; }
    };
  }
  return v;
}

// Tracks vary from one time round to the next, but most only in a short cycle: `loops: { intro, period }` means
// `intro` one-off loops, then `period` distinct loops repeating. The scheduler hands tracks the loop's place in
// that cycle, so the same number always sounds the same (random details included). No `loops`: never repeats.
export const variation = (track, n) => {
  const { intro = 0, period = Infinity } = track.loops || {};
  return n < intro ? n : intro + (n - intro) % period;
};
export const variations = (track) => track.loops ? (track.loops.intro || 0) + track.loops.period : Infinity;

// Look-ahead scheduler: every 50 ms, queue the 16th-note steps due in the next 250 ms.
// `p` is a live params object: the UI mutates it and the next scheduled step picks the change up.
export class Player {
  ensure() {
    if (!this.ac) {
      const ac = this.ac = new AudioContext();
      this.toneFilter = ac.createBiquadFilter();
      this.toneFilter.type = "lowpass"; this.toneFilter.Q.value = .5;
      const comp = ac.createDynamicsCompressor();
      this.eq = voiceEq(ac);
      this.analyser = ac.createAnalyser(); this.analyser.fftSize = 2048;
      this.toneFilter.connect(this.eq.input);
      this.eq.output.connect(comp).connect(this.analyser).connect(ac.destination);
    }
    this.ac.resume();
    return this.ac;
  }

  // Start `track` at a given 16th `step` of loop number `loop` (0 = the first time round).
  play(track, p, { step = 0, loop = 0 } = {}) {
    this.stop();
    const ac = this.ensure(), out = ac.createGain();
    out.connect(this.toneFilter);
    const v = instruments(ac, out), cur = this.cur = { track, p, out, v, step: 0, loop: 0 };
    // For the visualizers: every scheduled note, and when each step starts.
    this.events = []; this.steps = [];
    v.onNote = (e) => this.events.push({ ...e, step: cur.step, loop: cur.loop });
    let s = loop * track.steps + step, t = ac.currentTime + .1;
    const tick = () => {
      if (t < ac.currentTime) t = ac.currentTime + .05; // fell behind: skip ahead rather than cram notes
      const old = ac.currentTime - 10;
      if (this.events.length > 2000) this.events = this.events.filter((e) => e.t + e.len > old);
      if (this.steps.length > 256) this.steps = this.steps.slice(-128);
      while (t < ac.currentTime + .25) {
        v.S = 60 / p.bpm / 4; v.fx(p);
        const swing = s % 2 ? p.swing * v.S / 3 : 0; // delay every off-16th, up to a triplet feel
        cur.step = s % track.steps; cur.loop = variation(track, Math.floor(s / track.steps));
        this.steps.push({ t: t + swing, step: cur.step, loop: cur.loop });
        v.at = t + swing;
        track.play(v, cur.step, t + swing, cur.loop, p);
        t += v.S; s++;
      }
    };
    this.update();
    tick();
    cur.timer = setInterval(tick, 50);
  }

  // Pause freezes the audio clock itself: notes already queued wait, and carry on exactly where they were.
  pause() { this.ac?.suspend(); }
  resume() { this.ac?.resume(); }

  // Apply params that act on the whole mix right away rather than per note.
  update() {
    if (!this.cur) return;
    const { p, out, v } = this.cur, now = this.ac.currentTime;
    out.gain.setTargetAtTime(p.volume, now, .05);
    this.toneFilter.frequency.setTargetAtTime(toneHz(p.tone), now, .05);
    this.eq.set(p.voiceOver, now);
    v.fx(p);
  }

  stop() {
    if (!this.cur) return;
    const { out, v, timer } = this.cur;
    clearInterval(timer);
    out.gain.setTargetAtTime(0, this.ac.currentTime, .15);
    setTimeout(() => { out.disconnect(); v.dispose(); }, 1500);
    this.cur = null;
  }
}

// Offline rendering for downloads: the same notes, rendered faster than real time into a buffer.
// Plays `loops` loops starting at loop number `fromLoop`, then `tail` seconds of ringing out. Returns the
// stereo AudioBuffer. The mix is left linear (no compressor), so stems rendered with `only` add up to it.
export async function render(track, p, { fromLoop = 0, loops = 1, tail = 0, only, sampleRate = 48000, onProgress } = {}) {
  const S = 60 / p.bpm / 4, steps = loops * track.steps, seconds = steps * S + tail;
  const ac = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const tone = ac.createBiquadFilter(), eq = voiceEq(ac);
  tone.type = "lowpass"; tone.Q.value = .5; tone.frequency.value = toneHz(p.tone);
  tone.connect(eq.input); eq.output.connect(ac.destination); eq.set(p.voiceOver, 0);
  const v = instruments(ac, tone, { random: seeded(1), only });
  v.S = S; v.fx(p);
  // Schedule a couple of seconds ahead of the renderer, pausing it every second to queue more,
  // so a long render never holds every note of the piece at once.
  let s = 0;
  const schedule = (until) => {
    for (; s < steps && s * S < until; s++) {
      const t = s * S + (s % 2 ? p.swing * S / 3 : 0);
      v.at = t;
      track.play(v, s % track.steps, t, variation(track, fromLoop + Math.floor(s / track.steps)), p);
    }
  };
  const every = 1;
  const pauseAt = (t) => ac.suspend(t).then(() => {
    schedule(t + 2); onProgress?.(t / seconds);
    if (t + every < seconds) pauseAt(t + every);
    ac.resume();
  });
  schedule(2);
  if (every < seconds) pauseAt(every);
  const buffer = await ac.startRendering();
  onProgress?.(1);
  return buffer;
}
