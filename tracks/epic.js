// Epic: a cinematic build in D minor. Spiccato strings drive from the start, taiko drums join,
// brass swells in, and in the second half a heroic brass theme takes over.
const CHORDS = [ // two bars each: Dm  Bb  F  C | Dm  Bb  Gm  A
  { root: 38, notes: [50, 53, 57] }, { root: 34, notes: [50, 53, 58] },
  { root: 41, notes: [48, 53, 57] }, { root: 36, notes: [48, 52, 55] },
  { root: 38, notes: [50, 53, 57] }, { root: 34, notes: [50, 53, 58] },
  { root: 31, notes: [50, 55, 58] }, { root: 33, notes: [49, 52, 57] },
];
const THEME = [ // [16th step, note, length in 16ths] for bars 8–15
  [[0, 62, 6], [6, 69, 2], [8, 69, 8]],
  [[0, 67, 4], [4, 65, 4], [8, 64, 4], [12, 65, 4]],
  [[0, 62, 6], [6, 65, 2], [8, 70, 8]],
  [[0, 69, 12], [12, 67, 4]],
  [[0, 70, 6], [6, 69, 2], [8, 67, 8]],
  [[0, 74, 8], [8, 72, 4], [12, 70, 4]],
  [[0, 69, 12], [12, 73, 4]],
  [[0, 74, 16]],
];
const OSTINATO = [0, 0, 12, 0, 7, 0, 12, 7]; // semitones above the root, on 16ths

export default {
  name: "Epic",
  description: "Cinematic build in D minor: driving strings, taiko drums, brass swells and a heroic theme.",
  color: "#b8862f",
  steps: 256,
  loops: { intro: 1, period: 2 },
  defaults: { bpm: 84, reverb: 1.3, echo: .5 },
  params: {
    strings: { label: "String ostinato", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Taiko drums", min: 0, max: 2, step: .01, value: 1 },
    brass: { label: "Brass swells", min: 0, max: 2, step: .01, value: 1 },
    theme: { label: "Heroic theme", min: 0, max: 2, step: .01, value: 1 },
    choir: { label: "Choir pad", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Low end", min: 0, max: 2, step: .01, value: 1 },
    build: { label: "Slow build", min: 0, max: 1, step: 1, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar >> 1], full = !p.build || loop > 0;
    // Strings: spiccato 16ths from the first bar.
    v.pluck(t, c.root + 12 + OSTINATO[i % 8], { type: "sawtooth", vol: (i % 4 ? .022 : .032) * p.strings, decay: .12, cutoff: 1100 });
    if (i === 0 && bar % 2 === 0) v.bass(t, c.root - 12, 30 * v.S, { type: "sawtooth", vol: .08 * p.bass, cutoff: 250 });
    // Taiko: from bar 4 (or straight away without the build); a tom roll into the theme.
    if (full || bar >= 4) {
      const hitDrum = (vol) => { v.kick(t, vol * p.drums, { pitch: 80, decay: .6 }); v.hiss(t, { vol: vol * .15 * p.drums, decay: .3, type: "bandpass", freq: 220, q: 1 }); };
      if (i === 0 || i === 6) hitDrum(.6);
      else if (i === 3 || i === 10 || i === 12) hitDrum(.35);
      if (bar === 7 && i >= 8) hitDrum(.15 + .04 * (i - 8));
      if (i === 4 || i === 12) v.snare(t, .05 * p.drums, { freq: 900 });
    }
    // Brass + choir swell in on each chord.
    if (i === 0 && bar % 2 === 0 && (full || bar >= 4)) {
      for (const m of c.notes) v.brass(t, m, 28 * v.S, { vol: .018 * p.brass, attack: 1.2, bright: .8 });
      v.pad(t, c.notes.map((m) => m + 12), 32 * v.S, .008 * p.choir, 1800);
    }
    if (bar === 7 && i === 0) v.riser(t, 16 * v.S);
    if (s === 128) v.crash(t);
    // Theme: the second half, doubled an octave up from the second time round.
    if (bar >= 8) for (const [at, m, len] of THEME[bar - 8]) if (at === i) {
      v.brass(t, m, len * v.S, { vol: .035 * p.theme, section: 3, bright: 1.2 });
      if (loop % 2) v.brass(t, m + 12, len * v.S, { vol: .015 * p.theme, section: 2 });
    }
  },
};
