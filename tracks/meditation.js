// Meditation: no drums, everything smeared in reverb. Slow lydian chords, swells that rise like tape
// played backwards, shimmering chimes an octave up, and a breathy flute drifting through.
import { rnd } from "../engine.js";

const CHORDS = [ // two bars each: Emaj9  Amaj7#11  C#m9  B6/9
  { root: 40, pad: [56, 59, 63, 66] },
  { root: 45, pad: [56, 61, 63, 64] },
  { root: 37, pad: [56, 59, 63, 64] },
  { root: 35, pad: [54, 56, 61, 63] },
];
const FLUTE = { 0: [[0, 71, 14]], 2: [[0, 73, 6], [8, 76, 8]], 4: [[0, 75, 14]], 6: [[0, 73, 8], [8, 71, 8]] };

export default {
  name: "Meditation",
  description: "Drumless and drenched in reverb: lydian chords, backwards swells, shimmering chimes, soft flute.",
  color: "#f09ac0",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 64, reverb: 1.8, echo: 1.3, tone: .85 },
  params: {
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    swells: { label: "Backwards swells", min: 0, max: 2, step: .01, value: 1 },
    shimmer: { label: "Shimmer chimes", min: 0, max: 1, step: .01, value: .5 },
    flute: { label: "Flute", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    air: { label: "Air", min: 0, max: 1, step: .01, value: .25 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar >> 1];
    if (s % 32 === 0) {
      v.pad(t, c.pad, 32 * v.S, .014 * p.pad, 1400);
      v.bass(t, c.root, 30 * v.S, { type: "sine", vol: .1 * p.bass, cutoff: 200 });
    }
    // Backwards swell: a note that fades in over two beats and stops, like reversed tape.
    if (i === 8) v.lead(t, c.pad[(bar + loop) % 4] + 12, .01, { type: "triangle", vol: .03 * p.swells, attack: 8 * v.S, vibrato: 0, cutoff: 3000 });
    if (i % 2 === 1 && rnd(s + loop * 128) < p.shimmer * .3) v.bell(t, c.pad[Math.floor(rnd(s * 7 + loop) * 4)] + 24, { vol: .012, decay: 3, ratio: 3, index: .6 });
    const phrase = loop % 2 ? FLUTE[bar] : null;
    if (phrase) for (const [at, m, len] of phrase) if (at === i) v.flute(t, m, len * v.S, { vol: .035 * p.flute, vibrato: .4, breath: .5, attack: .4 });
    v.bed("air", .04 * p.air, { type: "bandpass", freq: 3000, q: .4 });
  },
};
