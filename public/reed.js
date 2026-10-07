// AudioWorklet: the tenor sax's tone generator. A sax is a conical tube, and a cone driven by a reed makes the
// mouthpiece pressure jump between two levels: a short "open" pulse and a longer "closed" stretch each cycle
// (a clarinet's cylinder gives a square wave instead — odd harmonics only, which is why it sounds hollow).
// The pulse lasts about the same time whatever the note (a little under a millisecond: it's the reed closing), so
// it takes up more of the cycle the higher the note; that fixed width is what puts the sax's formant-like humps in
// the same place on every note. It gives the full, reedy harmonic series. Blowing harder sharpens the pulse
// edges (brighter, edgier) and pushes it into soft saturation (rasp); soft playing rounds it off, breathier.
// Air rushes through the reed each time it opens, so the breath noise comes in bursts locked to the cycle.
// Everything follows the one breath pressure: loudness, brightness, rasp, the air noise and the vibrato, which is
// a pulsing of the breath as much as of the pitch. That's what makes a wind tone sound alive — the parts moving
// together. Random, independent wobbles sound synthetic instead, so the only randomness here is slow and small:
// each cycle's length jitters very slightly, pitch drifts, and the breath wanders a few percent over a second or so.
//
// Parameters: `freq` (Hz) and `pressure` (breath: below ~.35 silent, ~.65 mezzo-forte, ~.9 full) are what the player
// automates; `vibrato` (cents) and `breath` (air noise, 0-1) set the expression.

// Band-limited step (polyBLEP): smooths the jumps of the pulse so it doesn't alias.
const blep = (t, dt) => {
  if (t < dt) { const x = t / dt; return x + x - x * x - 1; }
  if (t > 1 - dt) { const x = (t - 1) / dt; return x * x + x + x + 1; }
  return 0;
};

class Reed extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "freq", defaultValue: 220, minValue: 20, maxValue: 3000 },
      { name: "pressure", defaultValue: 0, minValue: 0, maxValue: 1.5 },
      { name: "vibrato", defaultValue: 0, minValue: 0, maxValue: 200, automationRate: "k-rate" },
      { name: "breath", defaultValue: .3, minValue: 0, maxValue: 1, automationRate: "k-rate" },
    ];
  }

  constructor(options) {
    super();
    this.phase = 0; this.jit = 1; this.odd = 0; // oscillator, this cycle's jitter, alternate-cycle flag (for rasp)
    this.l1 = 0; this.l2 = 0; // tone low-pass (two poles)
    this.n1 = 0; this.n2 = 0; // breath noise band-pass
    this.dx = 0; this.dy = 0; // DC blocker
    this.amp = 0; this.bright = 0; // smoothed loudness and brightness
    this.ph = 0; this.rate = 5.2; // vibrato
    this.drift = 0; // slow random pitch drift (cents)
    this.wander = 0; this.wanderTo = 0; this.wait = 0; // the breath's slow wander
    this.seed = (options?.processorOptions?.seed ?? 1) >>> 0 || 1;
    this.alive = true;
    if (this.port) this.port.onmessage = () => { this.alive = false; };
  }

  rand() { // xorshift in [-1, 1), so offline renders come out the same every time
    let x = this.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x >>> 0;
    return this.seed / 4294967296 * 2 - 1;
  }

  process(_, outputs, p) {
    const out = outputs[0][0];
    if (!out) return this.alive;
    const F = p.freq, P = p.pressure, vib = p.vibrato[0], air = p.breath[0], sr = sampleRate;
    for (let i = 0; i < out.length; i++) {
      const pressure = P.length > 1 ? P[i] : P[0];
      // Expression: vibrato (pitch and breath together, like a jaw vibrato), slow drift and wander.
      this.ph += this.rate / sr; if (this.ph >= 1) { this.ph -= 1; this.rate = 5 + .25 * (this.rand() + 1); }
      const lfo = Math.sin(2 * Math.PI * this.ph);
      this.drift += (this.rand() * 4 - this.drift) * .00002;
      if (--this.wait <= 0) { this.wanderTo = this.rand(); this.wait = sr * (.4 + .4 * (this.rand() + 1)); }
      this.wander += (this.wanderTo - this.wander) * 2 / sr;
      const f = (F.length > 1 ? F[i] : F[0]) * 2 ** ((vib * lfo + this.drift) / 1200) * this.jit;
      // How the breath pressure translates: nothing below ~.35, then louder and brighter the harder it's blown.
      const blow = pressure * (1 + .03 * this.wander + .006 * vib * lfo);
      const a = Math.max(0, Math.min(1.4, (blow - .35) / .4)), b = Math.max(0, Math.min(1.3, (blow - .4) / .4));
      this.amp += (a * Math.sqrt(a) - this.amp) * .01; this.bright += (b - this.bright) * .004;
      // The pulse: about .9 ms long, a touch shorter (brighter) blown hard; between an eighth and .42 of the cycle.
      const dt = Math.min(.5, f / sr), duty = Math.max(.12, Math.min(.42, .0009 * f * (1 - .12 * Math.min(1, this.bright))));
      this.phase += dt;
      if (this.phase >= 1) { this.phase -= 1; this.jit = 1 + .0015 * this.rand(); this.odd ^= 1; }
      let x = (this.phase < duty ? 1 - duty : -duty) + .5 * blep(this.phase, dt) - .5 * blep((this.phase - duty + 1) % 1, dt);
      // Softer means rounder: a low-pass whose cutoff climbs with brightness (2 poles).
      const fc = Math.min(.95, f * (1.5 + 26 * this.bright * this.bright) / sr * 2 * Math.PI), g = fc / (1 + fc);
      this.l1 += (x - this.l1) * g; this.l2 += (this.l1 - this.l2) * g; x = this.l2;
      // Blown hard, the reed saturates, and alternate cycles differ slightly: the edge and grit of a honk.
      const drive = 1 + 2.5 * this.bright * this.bright;
      x = Math.tanh(x * drive * (1 + .05 * this.bright * (this.odd ? 1 : -1))) / Math.tanh(drive * .6);
      // Breath: band-passed noise, strongest while the reed is open; more of it when playing softly (subtone).
      const noise = this.rand();
      this.n1 += (noise - this.n1) * .35; this.n2 += (this.n1 - this.n2) * .08;
      const gate = this.phase < duty + .08 ? 1 : .25;
      x += (this.n1 - this.n2) * air * gate * (1.6 - .6 * Math.min(1, this.bright));
      // Out, DC removed.
      const y = x * this.amp;
      this.dy = y - this.dx + .995 * this.dy; this.dx = y;
      out[i] = .45 * this.dy;
    }
    return this.alive;
  }
}

registerProcessor("reed", Reed);
