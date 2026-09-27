// Groovy: funk in E. A wah clav scratching 16ths, slap bass with octave pops, tight drums with ghost notes,
// and a horn section stabbing at the end of every other bar.
import { rnd } from "../engine.js";

const BARS = [ // clav voicing, horn stab voicing, bass shift. E9 E9 E9 E9 A9 A9 E9 B7#9
  { v: [56, 62, 66, 71], horns: [68, 71, 74], shift: 0 },
  { v: [56, 62, 66, 71], horns: [68, 71, 74], shift: 0 },
  { v: [56, 62, 66, 71], horns: [68, 71, 74], shift: 0 },
  { v: [56, 62, 66, 71], horns: [68, 71, 74], shift: 0 },
  { v: [55, 59, 61, 64], horns: [67, 71, 73], shift: 5 },
  { v: [55, 59, 61, 64], horns: [67, 71, 73], shift: 5 },
  { v: [56, 62, 66, 71], horns: [68, 71, 74], shift: 0 },
  { v: [57, 62, 63, 69], horns: [69, 74, 75], shift: 7 },
];
const BASS = [[0, 40], [3, 52, 1], [4, 40], [6, 50], [7, 52, 1], [10, 40], [11, 43], [12, 45], [14, 47, 1]]; // [step, note, pop?]
const CHORD_HITS = [0, 3, 7, 10, 14];

export default {
  name: "Groovy",
  description: "Funk in E: wah clav on the 16ths, slap bass, horn stabs and a tight pocket.",
  color: "#e8743b",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 100, swing: .15, reverb: .7 },
  params: {
    clav: { label: "Wah clav", min: 0, max: 2, step: .01, value: 1 },
    wah: { label: "Wah range", min: 800, max: 4000, step: 50, value: 2200, unit: " Hz" },
    bass: { label: "Slap bass", min: 0, max: 2, step: .01, value: 1 },
    horns: { label: "Horns", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    ghosts: { label: "Ghost notes", min: 0, max: 1, step: .01, value: .5 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = BARS[bar], r = (n) => rnd(s * 71 + loop * 5003 + n);
    // Clav: chord hits on the syncopation, muted scratches on the other 8ths.
    if (CHORD_HITS.includes(i)) for (const m of c.v) v.wah(t, m, 1.5 * v.S, { vol: .012 * p.clav, to: p.wah });
    else if (i % 2 === 0) v.wah(t, c.v[0], .4 * v.S, { vol: .008 * p.clav, from: 300, to: p.wah * .6 });
    // Slap bass: thumb notes round and short, pops bright.
    for (const [at, m, pop] of BASS) if (at === i) v.bass(t, m + c.shift, (pop ? .5 : .8) * v.S, { type: "sawtooth", vol: (pop ? .09 : .12) * p.bass, cutoff: pop ? 3000 : 1100 });
    // Drums: kick pattern alternates per bar, backbeat, ghost snares, 16th hats with an open hat on the "and" of 4.
    if ((bar % 2 ? [0, 6, 10] : [0, 10, 11]).includes(i)) v.kick(t, .5 * p.drums, { decay: .2 });
    if (i === 4 || i === 12) v.snare(t, .13 * p.drums, { freq: 1600 });
    else if ([7, 9, 15].includes(i) && r(1) < p.ghosts) v.snare(t, .025 * p.drums, { freq: 1800 });
    if (i === 14) v.hat(t, .03 * p.drums, true);
    else v.hat(t, (i % 2 ? .01 : .022) * p.drums);
    // Horn stabs: "bap ... bap-bap" at the end of every other bar, a long fall-off chord on the turnaround.
    if (bar % 2 && [6, 10, 11].includes(i)) for (const m of c.horns) v.brass(t, m, .8 * v.S, { vol: .02 * p.horns, bright: 1.4, attack: .01, section: 3 });
    if (bar === 7 && i === 14) for (const m of c.horns) v.brass(t, m, 2 * v.S, { vol: .022 * p.horns, bright: 1.2, attack: .02, section: 3 });
  },
};
