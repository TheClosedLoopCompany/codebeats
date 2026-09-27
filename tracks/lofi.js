// Lo-fi hip hop: swung boom-bap drums, a wobbly Rhodes on a descending jazz loop, vinyl crackle.
import { rnd } from "../engine.js";

const CHORDS = [ // Fmaj9  Em7  Dm9  Cmaj7 — one bar each, twice round
  { root: 41, keys: [52, 55, 57, 60, 64], mel: [72, 76, 79, 81] },
  { root: 40, keys: [50, 55, 59, 62], mel: [71, 74, 76, 79] },
  { root: 38, keys: [48, 53, 57, 60, 64], mel: [69, 72, 74, 77] },
  { root: 36, keys: [52, 55, 59, 62], mel: [67, 71, 72, 76] },
];

export default {
  name: "Lo-fi",
  description: "Swung boom-bap, a wobbly Rhodes on a descending jazz loop, vinyl crackle.",
  color: "#c98a5e",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 76, swing: .6, tone: .45, reverb: .8, echo: .6 },
  params: {
    keys: { label: "Rhodes", min: 0, max: 2, step: .01, value: 1 },
    wobble: { label: "Tape wobble", min: 0, max: 40, step: 1, value: 12, unit: " ct" },
    melody: { label: "Noodling", min: 0, max: 1, step: .01, value: .35 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    vinyl: { label: "Vinyl crackle", min: 0, max: 1, step: .01, value: .5 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar % 4], r = (n) => rnd(s * 31 + loop * 4099 + n);
    // Drums: lazy kick, snare on 2 and 4, hats with uneven velocity and the odd ghost note.
    if (i === 0 || i === 7 || (i === 10 && bar % 2)) v.kick(t, .4 * p.drums, { pitch: 110, decay: .35 });
    if (i === 4 || i === 12) v.snare(t, .07 * p.drums, { freq: 1800 });
    if (i % 2 === 0) v.hat(t, (.012 + .01 * r(1)) * p.drums);
    else if (r(2) < .15) v.hat(t, .006 * p.drums);
    // Bass: round sine following the root, with a pickup into the next bar.
    if (i === 0) v.bass(t, c.root, 5 * v.S, { type: "sine", vol: .14 * p.bass, cutoff: 400 });
    if (i === 10) v.bass(t, c.root + 7, 3 * v.S, { type: "sine", vol: .1 * p.bass, cutoff: 400 });
    if (i === 14) v.bass(t, CHORDS[(bar + 1) % 4].root - 1, 1.5 * v.S, { type: "sine", vol: .08 * p.bass, cutoff: 400 });
    // Rhodes: chord on the one, a pushed re-hit before beat 3; lightly strummed.
    if (i === 0 || i === 7) c.keys.forEach((m, n) => v.keys(t + n * .012, m, (i ? 5 : 6) * v.S, { vol: (i ? .018 : .026) * p.keys, bright: .8 }));
    // Noodling: occasional high Rhodes notes from the chord's pentatonic shape.
    if (i % 2 === 0 && i !== 0 && r(3) < p.melody * .4) v.keys(t, c.mel[Math.floor(r(4) * 4)], 2 * v.S, { vol: .02, bright: 1.2 });
    // Vinyl: constant hiss plus random pops.
    v.bed("hiss", .012 * p.vinyl, { type: "highpass", freq: 5000 });
    if (r(5) < p.vinyl * .5) v.click(t + r(6) * v.S, .08 * p.vinyl * r(7), 1500 + 4000 * r(8), .002);
  },
};
