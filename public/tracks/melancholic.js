// Melancholic: bittersweet, not tragic. A fingerpicked guitar in B minor, brushed half-time drums,
// a warm bass, and a whistled tune that joins on the second time round. Like a rainy evening looking back.
const BARS = [ // guitar thumb notes (root, fifth), treble notes, bass root. Bm G D A | Bm G D F#7
  { thumb: [47, 54], top: [59, 62, 66], root: 35 },
  { thumb: [43, 50], top: [59, 62, 67], root: 31 },
  { thumb: [50, 45], top: [57, 62, 66], root: 38 },
  { thumb: [45, 52], top: [57, 61, 64], root: 33 },
  { thumb: [47, 54], top: [59, 62, 66], root: 35 },
  { thumb: [43, 50], top: [59, 62, 67], root: 31 },
  { thumb: [50, 45], top: [57, 62, 66], root: 38 },
  { thumb: [42, 49], top: [58, 61, 64], root: 30 },
];
const TUNE = [ // [16th step, note, length in 16ths] per bar
  [[4, 74, 2], [6, 76, 2], [8, 78, 8]],
  [[0, 79, 4], [4, 78, 4], [8, 74, 8]],
  [[4, 74, 2], [6, 76, 2], [8, 78, 4], [12, 81, 4]],
  [[0, 76, 12]],
  [[4, 74, 2], [6, 76, 2], [8, 78, 8]],
  [[0, 83, 4], [4, 81, 4], [8, 79, 8]],
  [[0, 78, 4], [4, 76, 4], [8, 74, 8]],
  [[0, 73, 8], [8, 70, 8]],
];
const PICK = { 0: 2, 3: 1, 6: 2, 10: 0, 11: 1, 14: 2 }; // 16th step -> treble string (Travis-style pattern)

export default {
  name: "Melancholic",
  description: "Fingerpicked guitar in B minor, brushed drums, a whistled tune — a rainy evening looking back.",
  color: "#8a6f9e",
  steps: 128,
  loops: { intro: 1, period: 1 },
  defaults: { bpm: 86, swing: .2, tone: .7 },
  params: {
    guitar: { label: "Guitar", min: 0, max: 2, step: .01, value: 1 },
    ring: { label: "Guitar sustain", min: .4, max: 4, step: .1, value: 1.6, unit: " s" },
    melody: { label: "Whistle", min: 0, max: 2, step: .01, value: 1 },
    vibrato: { label: "Whistle vibrato", min: 0, max: 2, step: .01, value: .8 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Brushes", min: 0, max: 2, step: .01, value: 1 },
    wobble: { label: "Tape wobble", min: 0, max: 40, step: 1, value: 6, unit: " ct" },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = BARS[bar], g = { vol: .05 * p.guitar, decay: p.ring };
    // Guitar: thumb alternates root and fifth on the beats; fingers fill in between.
    if (i % 4 === 0) v.guitar(t, c.thumb[(i >> 2) % 2], { ...g, vol: g.vol * 1.1, bright: .7 });
    if (PICK[i] !== undefined) v.guitar(t + .004, c.top[PICK[i]], g);
    // Bass: root on 1 and 3, a chromatic step into the next chord.
    if (i === 0 || i === 8) v.bass(t, c.root, 6 * v.S, { type: "triangle", vol: .11 * p.bass, cutoff: 500 });
    if (i === 14) { const next = BARS[(bar + 1) % 8].root; v.bass(t, next + (next > c.root ? -1 : 1), 1.5 * v.S, { type: "triangle", vol: .07 * p.bass, cutoff: 500 }); }
    // Brushes: half-time — soft kick, a long brushed snare on 3, a swish on every 8th. Enter after four bars.
    if (loop || bar >= 4) {
      if (i === 0 || i === 10) v.kick(t, .25 * p.drums, { pitch: 100 });
      if (i === 8) v.hiss(t, { vol: .05 * p.drums, decay: .35, type: "bandpass", freq: 2500, q: .6 });
      if (i % 2 === 0) v.hiss(t, { vol: (i % 4 ? .012 : .006) * p.drums, decay: .12, type: "bandpass", freq: 6000, q: .8 });
    }
    // Whistle joins from the second time round.
    if (loop) for (const [at, m, len] of TUNE[bar]) if (at === i) v.flute(t, m, len * v.S, { vol: .04 * p.melody, vibrato: p.vibrato, breath: .15, attack: .05 });
  },
};
