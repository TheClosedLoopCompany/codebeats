// Triumphant: a marching band in Bb. Oom-pah tuba and horn chords, a brass fanfare with glockenspiel doubling,
// snare drum with flams and rolls into the next phrase, bass drum and cymbal clashes.
const BARS = [ // chord (horns), tuba root and fifth. Bb Eb F Bb | Gm Eb F7 Bb
  { chord: [58, 62, 65], root: 46, fifth: 41 },
  { chord: [58, 63, 67], root: 39, fifth: 46 },
  { chord: [57, 60, 65], root: 41, fifth: 48 },
  { chord: [58, 62, 65], root: 46, fifth: 41 },
  { chord: [58, 62, 67], root: 43, fifth: 38 },
  { chord: [58, 63, 67], root: 39, fifth: 46 },
  { chord: [57, 60, 63], root: 41, fifth: 48 },
  { chord: [58, 62, 65], root: 46, fifth: 41 },
];
const FANFARE = [ // [16th step, note, length in 16ths] per bar
  [[0, 65, 3], [3, 65, 1], [4, 70, 4], [8, 74, 6], [14, 72, 2]],
  [[0, 70, 4], [4, 67, 4], [8, 75, 8]],
  [[0, 72, 3], [3, 72, 1], [4, 77, 6], [10, 75, 2], [12, 74, 4]],
  [[0, 70, 12]],
  [[0, 74, 3], [3, 74, 1], [4, 79, 4], [8, 77, 4], [12, 75, 4]],
  [[0, 75, 4], [4, 79, 4], [8, 82, 8]],
  [[0, 81, 4], [4, 77, 4], [8, 75, 4], [12, 72, 4]],
  [[0, 82, 12]],
];

export default {
  name: "Triumphant",
  description: "Marching band in Bb: brass fanfare, oom-pah tuba, snare rolls, glockenspiel and cymbals.",
  color: "#c9a227",
  steps: 128,
  loops: { intro: 1, period: 2 },
  defaults: { bpm: 112, reverb: 1.1, echo: .4 },
  params: {
    fanfare: { label: "Fanfare", min: 0, max: 2, step: .01, value: 1 },
    horns: { label: "Horn chords", min: 0, max: 2, step: .01, value: 1 },
    tuba: { label: "Tuba", min: 0, max: 2, step: .01, value: 1 },
    snare: { label: "Snare drum", min: 0, max: 2, step: .01, value: 1 },
    cymbals: { label: "Bass drum & cymbals", min: 0, max: 2, step: .01, value: 1 },
    glock: { label: "Glockenspiel", min: 0, max: 2, step: .01, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = BARS[bar];
    // Oom-pah: tuba on 1 and 3, horn chord on 2 and 4.
    if (i === 0 || i === 8) v.brass(t, i ? c.fifth : c.root, 3 * v.S, { vol: .06 * p.tuba, bright: .5, attack: .03, section: 1 });
    if (i === 4 || i === 12) for (const m of c.chord) v.brass(t, m, 1.5 * v.S, { vol: .016 * p.horns, bright: .8, attack: .02, section: 1 });
    // Fanfare (from the second phrase of the first loop on), glockenspiel doubling it every other time round.
    if (loop || bar >= 4) for (const [at, m, len] of FANFARE[bar]) if (at === i) {
      v.brass(t, m, len * v.S * .9, { vol: .035 * p.fanfare, bright: 1.3, attack: .04, section: 3 });
      if (loop % 2) v.bell(t, m + 12, { vol: .025 * p.glock, decay: 1, ratio: 3.5, index: 1.2 });
    }
    // Snare: soft 8ths, accented backbeat with a flam, a 32nd-note roll crescendo into bars 4 and 8.
    if (bar % 4 === 3 && i >= 8) for (const d of [0, .5]) v.snare(t + d * v.S, (.03 + .006 * (i - 8)) * p.snare, { freq: 2000 });
    else if (i === 4 || i === 12) { v.snare(t - .018, .03 * p.snare, { freq: 2000 }); v.snare(t, .1 * p.snare, { freq: 2000 }); }
    else if (i % 2 === 0) v.snare(t, .025 * p.snare, { freq: 2200 });
    // Bass drum on the beats, cymbals clash with it on 1 and 3.
    if (i % 4 === 0) v.kick(t, (i % 8 ? .25 : .4) * p.cymbals, { pitch: 80, decay: .35 });
    if (i === 0 || i === 8) v.hiss(t, { vol: (i || bar % 4 ? .015 : .04) * p.cymbals, decay: i || bar % 4 ? .4 : 1.2, freq: 4000 });
  },
};
