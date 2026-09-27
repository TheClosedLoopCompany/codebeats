// Sad: no beat, no piano. A lone breathy flute sighs over a dark D minor pad and a low drone,
// with a few glassy notes falling like tears. Everything very slow and very far away.
import { rnd } from "../engine.js";

const BARS = [ // one chord per bar: drone root + pad voicing. Dm9  Bbmaj7  Gm9  A7sus4 → A7(b9)
  { root: 38, pad: [53, 57, 60, 64] }, null,
  { root: 34, pad: [53, 57, 58, 62] }, null,
  { root: 31, pad: [50, 53, 57, 58] }, null,
  { root: 33, pad: [50, 52, 55, 57] },
  { root: 33, pad: [49, 52, 55, 58] },
];
const TUNE = [ // [16th step, note, length in 16ths] per bar: falling "sigh" figures
  [[0, 77, 6], [6, 76, 10]],
  [[4, 74, 4], [8, 72, 4], [12, 69, 4]],
  [[0, 74, 8], [8, 77, 8]],
  [[0, 76, 14]],
  [[0, 74, 6], [6, 70, 10]],
  [[4, 69, 4], [8, 67, 8]],
  [[0, 69, 8], [8, 74, 8]],
  [[0, 73, 8], [8, 70, 8]],
];
const chordAt = (bar) => { while (!BARS[bar]) bar--; return BARS[bar]; };

export default {
  name: "Sad",
  description: "A lone breathy flute sighing over a dark D minor pad and a low drone. No beat.",
  color: "#5a7fa8",
  steps: 128,
  loops: { intro: 0, period: 2 },
  defaults: { bpm: 54, reverb: 1.6, echo: .7, tone: .7 },
  params: {
    melody: { label: "Flute", min: 0, max: 2, step: .01, value: 1 },
    vibrato: { label: "Flute vibrato", min: 0, max: 2, step: .01, value: .5 },
    breath: { label: "Breathiness", min: 0, max: 1, step: .01, value: .4 },
    doubling: { label: "Low doubling", min: 0, max: 2, step: .01, value: .6 },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    drone: { label: "Drone", min: 0, max: 2, step: .01, value: 1 },
    tears: { label: "Glass tears", min: 0, max: 1, step: .01, value: .3 },
    air: { label: "Room air", min: 0, max: 1, step: .01, value: .3 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = chordAt(bar);
    if (i === 0 && BARS[bar]) {
      const bars = bar === 6 || bar === 7 ? 1 : 2;
      v.pad(t, c.pad, bars * 16 * v.S, .014 * p.pad, 700);
      v.bass(t, c.root, (bars * 16 - 3) * v.S, { type: "sine", vol: .13 * p.drone, cutoff: 200 });
    }
    for (const [at, m, len] of TUNE[bar]) if (at === i) {
      v.flute(t, m, len * v.S, { vol: .05 * p.melody, vibrato: p.vibrato, breath: p.breath, attack: .25 });
      if (loop % 2) v.flute(t, m - 12, len * v.S, { vol: .035 * p.doubling, vibrato: p.vibrato * .5, breath: p.breath * .5, attack: .4 });
    }
    if (i % 4 === 2 && rnd(s + loop * 128) < p.tears * .35) v.bell(t, c.pad[Math.floor(rnd(s * 3 + loop) * 4)] + 24, { vol: .012, decay: 3, ratio: 5.5, index: .6 });
    v.bed("air", .05 * p.air, { freq: 600 });
  },
};
