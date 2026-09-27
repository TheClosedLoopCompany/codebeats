import { rnd } from "../engine.js";

// Slow D major: warm pad, soft bass, a music-box arpeggio drifting over it.
const CHORDS = [ // Dmaj9  Bm9  Gmaj7  A9 — bass root, pad voicing, arpeggio notes
  { root: 38, pad: [54, 57, 61, 64], arp: [62, 66, 69, 73, 76] },
  { root: 35, pad: [50, 54, 57, 61], arp: [59, 62, 66, 69, 73] },
  { root: 43, pad: [50, 54, 57, 59], arp: [62, 66, 67, 71, 74] },
  { root: 45, pad: [49, 52, 55, 59], arp: [61, 64, 67, 69, 71] },
];

export default {
  name: "Calm",
  description: "Warm pad, soft bass and a music-box arpeggio in D major.",
  color: "#6fb7c9",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 72 },
  params: {
    arp: { label: "Arpeggio density", min: 0, max: 1, step: .01, value: .75 },
    bellDecay: { label: "Bell ring", min: .3, max: 5, step: .1, value: 2, unit: " s" },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    padCutoff: { label: "Pad warmth", min: 300, max: 3000, step: 10, value: 900, unit: " Hz" },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, c = CHORDS[s >> 5], k = [0, 3, 6, 8, 11, 14].indexOf(i);
    if (s % 32 === 0) {
      v.pad(t, c.pad, 32 * v.S, .02 * p.pad, p.padCutoff);
      v.bass(t, c.root, 28 * v.S, { type: "triangle", vol: .12 * p.bass, cutoff: 300 });
    }
    if (k >= 0 && rnd(s + loop * 128) < p.arp) v.bell(t, c.arp[[0, 2, 1, 3, 2, 4][(k + (s >> 4)) % 6]], { vol: .04, decay: p.bellDecay });
  },
};
