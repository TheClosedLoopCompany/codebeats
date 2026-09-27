// Generative, curious, in D lydian. A 16-step motif is grown from the seed, played on a mallet and answered
// a few scale steps higher on a pluck; every time round, some of its notes mutate. Never the same twice.
import { rnd } from "../engine.js";

const SCALE = [62, 64, 66, 68, 69, 71, 73, 74, 76, 78, 80, 81]; // D lydian from D4
const CHORDS = [ // Dmaj7  E/D  Bm7  Asus2 — two bars each
  { root: 38, pad: [54, 57, 61, 62] },
  { root: 38, pad: [52, 56, 59, 64] },
  { root: 35, pad: [50, 54, 57, 59] },
  { root: 33, pad: [52, 57, 59, 64] },
];
let motif = [], motifSeed, motifLoop; // motif[step] = scale index, or -1 for a rest

const note = (seed, n) => rnd(seed * 7919 + n) < .45 ? -1 : Math.floor(rnd(seed * 104729 + n) * 8);

export default {
  name: "Creative",
  description: "Generative lydian motifs that mutate every loop — playful, curious, never the same twice.",
  color: "#e07bb5",
  steps: 128,
  defaults: { bpm: 104, echo: 1.2 },
  params: {
    seed: { label: "Seed", min: 1, max: 99, step: 1, value: 7 },
    mutation: { label: "Mutation per loop", min: 0, max: 1, step: .01, value: .25 },
    answer: { label: "Answer phrase", min: 0, max: 2, step: .01, value: 1 },
    leaps: { label: "Octave leaps", min: 0, max: 1, step: .01, value: .15 },
    drums: { label: "Percussion", min: 0, max: 2, step: .01, value: 1 },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar >> 1], seed = p.seed;
    if (motifSeed !== seed) { motif = Array.from({ length: 16 }, (_, n) => note(seed, n)); motifSeed = seed; motifLoop = loop; }
    if (s === 0 && loop !== motifLoop) { // mutate once per loop
      motifLoop = loop;
      motif = motif.map((m, n) => rnd(seed * 31 + loop * 977 + n) < p.mutation ? note(seed + loop * 13, n) : m);
    }
    const r = (n) => rnd(seed * 65537 + loop * 4099 + s * 17 + n);
    if (s % 32 === 0) v.pad(t, c.pad, 32 * v.S, .008 * p.pad, 1500);
    if (i === 0 || i === 6 || i === 10) v.bass(t, c.root + (i === 6 ? 7 : 0), 2 * v.S, { type: "triangle", vol: .09, cutoff: 600 });
    const deg = motif[i];
    if (deg >= 0) {
      const leap = r(1) < p.leaps ? 12 : 0;
      if (bar % 2 === 0) v.bell(t, SCALE[deg] + leap, { vol: .05, decay: .6, ratio: 3 + (bar >> 1) % 3, index: 1.5 });
      else if (r(2) < .8) v.pluck(t, SCALE[Math.min(deg + 2, SCALE.length - 1)] + leap, { type: "triangle", vol: .03 * p.answer, decay: .3, cutoff: 2500 });
    }
    // Percussion: kick pattern and rim clicks picked by the seed, a shaker on the 16ths.
    const kicks = [[0, 8], [0, 6, 10], [0, 3, 8, 11], [0, 10]][Math.floor(rnd(seed + (bar >> 2)) * 4)];
    if (kicks.includes(i)) v.kick(t, .35 * p.drums);
    if ((i === 4 || i === 12) || (i === 14 && r(3) < .3)) v.click(t, .12 * p.drums, 1800, .03);
    v.hat(t, (i % 4 === 2 ? .014 : .005 + .006 * r(4)) * p.drums);
  },
};
