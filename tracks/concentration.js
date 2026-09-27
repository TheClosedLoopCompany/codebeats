// Focus music: no hooks, nothing that asks for attention. A five-note ostinato cycling against the 8th-note grid
// (so it never quite repeats), slow chords, a faint heartbeat and a bed of brown-ish noise.
import { rnd } from "../engine.js";

const CHORDS = [ // Cmaj9  Am9  Fmaj7#11  G6/9 — four bars each
  { root: 36, pad: [52, 55, 59, 62], ost: [60, 64, 67, 71, 74] },
  { root: 33, pad: [55, 59, 60, 64], ost: [57, 60, 64, 67, 71] },
  { root: 41, pad: [53, 57, 60, 64], ost: [57, 60, 64, 65, 71] },
  { root: 43, pad: [50, 55, 59, 62], ost: [55, 59, 62, 67, 69] },
];

export default {
  name: "Concentration",
  description: "Steady, hook-free focus music: a slowly shifting ostinato, soft chords, optional noise bed.",
  color: "#4e9a7a",
  steps: 256,
  loops: { intro: 0, period: 2 },
  defaults: { bpm: 84, tone: .75, echo: 1.3 },
  params: {
    pulse: { label: "Ostinato", min: 0, max: 2, step: .01, value: 1 },
    pulseTone: { label: "Ostinato brightness", min: 400, max: 4000, step: 10, value: 1400, unit: " Hz" },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    heartbeat: { label: "Heartbeat", min: 0, max: 1, step: .01, value: .25 },
    noise: { label: "Noise bed", min: 0, max: 1, step: .01, value: .3 },
    bells: { label: "Occasional bells", min: 0, max: 1, step: .01, value: .3 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar >> 2];
    if (s % 64 === 0) {
      v.pad(t, c.pad, 64 * v.S, .012 * p.pad, 800);
      v.bass(t, c.root, 60 * v.S, { type: "sine", vol: .1, cutoff: 200 });
    }
    if (i % 2 === 0) v.pluck(t, c.ost[[0, 2, 1, 3, 4][(s >> 1) % 5]], { type: "triangle", vol: .03 * p.pulse, decay: .3, cutoff: p.pulseTone });
    if (i === 0 || i === 3) v.kick(t, (i ? .12 : .2) * p.heartbeat, { pitch: 90, decay: .2 });
    if (i % 4 === 2) v.hat(t, .006 * p.heartbeat);
    if (i === 8 && bar % 4 === 2 && rnd(bar + loop * 16) < p.bells) v.bell(t, c.ost[4] + 12, { vol: .025, decay: 3, ratio: 3, index: 1 });
    v.bed("brown", .12 * p.noise, { freq: 350 });
  },
};
