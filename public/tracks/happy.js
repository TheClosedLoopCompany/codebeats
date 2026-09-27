// Bouncy C major pop: marimba tune, ukulele-ish offbeat chords, a glockenspiel joins every other time round.
const CHORDS = [ // C  G  Am  F
  { root: 36, notes: [60, 64, 67] }, { root: 43, notes: [59, 62, 67] },
  { root: 45, notes: [60, 64, 69] }, { root: 41, notes: [60, 65, 69] },
];
const TUNE = [ // [16th step, note] per bar, 8 bars
  [[0, 76], [2, 79], [4, 81], [6, 79], [8, 76], [12, 72]],
  [[0, 74], [2, 71], [4, 74], [6, 79], [10, 74]],
  [[0, 72], [2, 76], [4, 81], [6, 84], [8, 81], [10, 79], [12, 76]],
  [[0, 77], [4, 76], [6, 74], [8, 72], [12, 74]],
  [[0, 76], [2, 79], [4, 84], [8, 79], [10, 81], [12, 79]],
  [[0, 79], [2, 74], [4, 71], [6, 74], [8, 79], [12, 83]],
  [[0, 84], [2, 83], [4, 81], [6, 79], [8, 76], [10, 79], [12, 81]],
  [[0, 77], [2, 76], [4, 74], [8, 72]],
];

export default {
  name: "Happy",
  description: "Bouncy C major pop: marimba tune, offbeat ukulele chords, glockenspiel.",
  color: "#f2b632",
  steps: 128,
  loops: { intro: 0, period: 2 },
  defaults: { bpm: 116 },
  params: {
    melody: { label: "Marimba tune", min: 0, max: 2, step: .01, value: 1 },
    glock: { label: "Glockenspiel", min: 0, max: 2, step: .01, value: 1 },
    chords: { label: "Ukulele chords", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar % 4];
    if (i === 0 || i === 8) v.kick(t, .4 * p.drums);
    if (i === 4 || i === 12) v.snare(t, .09 * p.drums);
    if (i % 2 === 0) v.hat(t, (i % 4 ? .025 : .012) * p.drums);
    const b = { 0: 0, 3: 0, 6: 7, 8: 12, 10: 0, 14: 7 }[i];
    if (b !== undefined) v.bass(t, c.root + b, 1.2 * v.S, { type: "square", vol: .05 * p.bass, cutoff: 700 });
    if (i % 4 === 2) for (const m of c.notes) v.pluck(t, m, { type: "triangle", vol: .035 * p.chords, decay: .18, cutoff: 3000 });
    const note = TUNE[bar].find(([at]) => at === i)?.[1];
    if (note) {
      v.bell(t, note, { vol: .06 * p.melody, decay: .5, ratio: 4, index: 1.5 });
      if (loop % 2) v.bell(t, note + 12, { vol: .02 * p.glock, decay: .8 });
    }
  },
};
