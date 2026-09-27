// Island: sunny reggae in G. Steel drums sing the tune, the guitar skanks on every offbeat, the bass drops out on
// the one, and the drums play a one-drop. Dub mode thins everything out and lets the skank echo.
import { rnd } from "../engine.js";

const BARS = [ // G C D C, twice — bass root, skank voicing
  { root: 43, skank: [59, 62, 67] }, { root: 36, skank: [60, 64, 67] }, { root: 38, skank: [57, 62, 66] }, { root: 36, skank: [60, 64, 67] },
  { root: 43, skank: [59, 62, 67] }, { root: 36, skank: [60, 64, 67] }, { root: 38, skank: [57, 62, 66] }, { root: 36, skank: [60, 64, 67] },
];
const TUNE = [ // [16th step, note, length in 16ths] per bar
  [[0, 71, 2], [2, 74, 2], [4, 79, 4], [10, 78, 2], [12, 76, 4]],
  [[0, 76, 2], [2, 72, 2], [4, 76, 4], [8, 79, 2], [10, 76, 2], [12, 72, 4]],
  [[0, 74, 2], [2, 78, 2], [4, 81, 4], [8, 78, 2], [10, 74, 2], [12, 76, 4]],
  [[0, 72, 6], [8, 71, 2], [10, 69, 2], [12, 67, 4]],
  [[0, 79, 2], [2, 83, 2], [4, 81, 2], [6, 79, 2], [8, 76, 4], [12, 74, 4]],
  [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 4]],
  [[0, 78, 2], [2, 81, 2], [4, 78, 2], [6, 74, 2], [8, 72, 4], [12, 74, 4]],
  [[0, 72, 4], [4, 71, 4], [8, 67, 8]],
];
const PENTA = [67, 69, 71, 74, 76, 79, 81, 83, 86]; // G major pentatonic, for variations
const SCALE = [62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79, 81, 83, 84, 86]; // G major, for the harmony a third below
const BASS = [[2, 0, 3], [6, 7, 2], [8, 12, 1], [10, 7, 2], [14, 4, 2]]; // [step, interval, length]: nothing on the one

// Steel pan: FM at a 2:1 ratio puts energy on the octave and twelfth, like a pan's tuned overtones.
const pan = (v, t, m, vol) => v.bell(t, m, { vol, decay: .7, ratio: 2, index: 1.3 });

export default {
  name: "Island",
  description: "Sunny reggae in G: steel drums, offbeat guitar skank, a one-drop beat and optional dub echoes.",
  color: "#f07f3c",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 80, swing: .3, reverb: .9 },
  params: {
    steel: { label: "Steel drums", min: 0, max: 2, step: .01, value: 1 },
    vary: { label: "Tune variation", min: 0, max: 1, step: .01, value: .2 },
    harmony: { label: "Second pan", min: 0, max: 2, step: .01, value: .6 },
    skank: { label: "Guitar skank", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    dub: { label: "Dub mode", min: 0, max: 1, step: 1, value: 0 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = BARS[bar], r = (n) => rnd(s * 97 + loop * 6151 + n), dub = p.dub > 0;
    // Skank: a short strum on every "and"; in dub mode only some of them, each echoing away.
    if (i % 4 === 2 && (!dub || i === 6 || i === 14 || r(1) < .3)) {
      for (let e = 0; e < (dub ? 4 : 1); e++) {
        const vol = .035 * p.skank * .45 ** e;
        c.skank.forEach((m, n) => v.guitar(t + e * 3 * v.S + n * .008, m, { vol, decay: .14, bright: 1.3 }));
      }
    }
    // Bass: deep sine that rests on the one.
    for (const [at, iv, len] of BASS) if (at === i) v.bass(t, c.root + iv, len * v.S, { type: "sine", vol: .17 * p.bass, cutoff: 300 });
    // One-drop: kick and rimshot together on beat 3 only; hats on the 8ths, an open hat to lead into the next bar.
    if (i === 8) { v.kick(t, .45 * p.drums, { pitch: 110 }); v.click(t, .13 * p.drums, 1700, .03); }
    if (i % 2 === 0 && (!dub || i % 4 === 2)) v.hat(t, (i % 4 ? .018 : .01) * p.drums, i === 14 && bar % 2 === 1);
    if (bar === 7 && i >= 12 && !dub) v.snare(t, (.03 + .01 * (i - 12)) * p.drums);
    // Steel drums: the tune, with some notes swapped for pentatonic neighbours, long notes rolled.
    // Dub mode keeps only fragments of it.
    if (dub && (bar % 4 > 1 || r(2) < .4)) return;
    for (const [at, m0, len] of TUNE[bar]) if (at === i) {
      let m = m0;
      if (r(3) < p.vary) { const k = PENTA.indexOf(m); m = k < 0 ? m : PENTA[Math.max(0, Math.min(PENTA.length - 1, k + (r(4) < .5 ? -1 : 1)))]; }
      for (let h = 0; h < (len >= 4 ? len / 2 : 1); h++) pan(v, t + h * 2 * v.S, m, (h ? .025 : .05) * p.steel);
      const k = SCALE.indexOf(m);
      if (loop % 2 && k >= 2) pan(v, t, SCALE[k - 2], .03 * p.harmony);
    }
    if (!TUNE[bar].some(([at]) => at === i) && i % 2 === 0 && r(5) < p.vary * .25) pan(v, t, PENTA[Math.floor(r(6) * PENTA.length)], .03 * p.steel);
  },
};
