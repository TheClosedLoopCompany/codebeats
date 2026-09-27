// Spooky: a music box slightly out of tune, a theremin sliding between notes,
// a thin high chord that won't settle, and the house creaking now and then.
import { rnd } from "../engine.js";

const BOX = [ // [16th step, note] per bar, 8 bars — A minor with creeping chromatics
  [[0, 81], [2, 84], [4, 88], [6, 87], [8, 88], [12, 84]],
  [[0, 83], [4, 80], [8, 81], [12, 76]],
  [[0, 81], [2, 84], [4, 88], [6, 87], [8, 88], [12, 91]],
  [[0, 89], [4, 88], [6, 87], [8, 86], [12, 85]],
  [[0, 81], [2, 84], [4, 88], [6, 87], [8, 88], [12, 84]],
  [[0, 83], [4, 80], [8, 81], [12, 76]],
  [[0, 84], [4, 83], [8, 82], [12, 81]],
  [[0, 80], [8, 81]],
];
const THEREMIN = { 0: [69, 12], 2: [72, 12], 4: [75, 12], 6: [71, 6], 7: [68, 12] }; // bar -> [note, length]

export default {
  name: "Spooky",
  description: "An out-of-tune music box, a sliding theremin, eerie high chords and creaking floorboards.",
  color: "#6b4fa0",
  steps: 128,
  loops: { intro: 0, period: 2 },
  defaults: { bpm: 70, reverb: 1.5 },
  params: {
    musicBox: { label: "Music box", min: 0, max: 2, step: .01, value: 1 },
    detune: { label: "Out of tune", min: 0, max: .5, step: .01, value: .18, unit: " st" },
    theremin: { label: "Theremin", min: 0, max: 2, step: .01, value: 1 },
    wobble: { label: "Theremin vibrato", min: 0, max: 3, step: .01, value: 1.8 },
    pad: { label: "Eerie chord", min: 0, max: 2, step: .01, value: 1 },
    drone: { label: "Drone", min: 0, max: 2, step: .01, value: 1 },
    creaks: { label: "Creaks", min: 0, max: 1, step: .01, value: .4 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4;
    const hit = BOX[bar].find(([at]) => at === i);
    if (hit) { // two bells, one a little flat: the music box's worn comb
      v.bell(t, hit[1], { vol: .04 * p.musicBox, decay: 1.4, ratio: 5, index: .8 });
      v.bell(t + .008, hit[1] - p.detune, { vol: .025 * p.musicBox, decay: 1.2, ratio: 5, index: .8 });
    }
    if (s % 32 === 0) {
      v.pad(t, [76, 77, 81], 32 * v.S, .006 * p.pad, 2500);
      v.bass(t, bar === 4 ? 39 : 33, 30 * v.S, { type: "sine", vol: .12 * p.drone, cutoff: 200 }); // A, then a tritone Eb
    }
    // Theremin sings on the second time round, sliding from its last note into the next.
    const th = THEREMIN[bar], prev = [69, 72, 75, 71, 68];
    if (loop % 2 && th && i === 0) {
      const from = prev[(Object.keys(THEREMIN).indexOf(String(bar)) + 4) % 5];
      v.lead(t, th[0], th[1] * v.S, { type: "sine", vol: .035 * p.theremin, vibrato: p.wobble, attack: .3, cutoff: 4000, from, slide: .4 });
    }
    // Creaks: a warbling low scrape, now and then.
    if (i === 9 && rnd(bar + loop * 8) < p.creaks * .4) v.glide(t, 43, 45 + rnd(bar * 5 + loop) * 3, .5, { type: "sawtooth", vol: .012, wobble: 23 });
    if (i % 4 === 0 && rnd(s * 13 + loop) < p.creaks * .1) v.click(t, .05, 800, .03);
  },
};
