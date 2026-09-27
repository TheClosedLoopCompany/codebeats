// Troll: sneaky, cheeky, a little bit wrong. Tiptoeing pizzicato and bassoon in E minor, wood blocks,
// a kazoo that sings along, and pranks: wrong notes, boings, honks and the odd sudden silence.
import { rnd } from "../engine.js";

const LINES = { // [16th step, note] — the sneaky tiptoe line
  up: [[0, 52], [4, 55], [8, 57], [10, 58], [12, 59]],
  down: [[0, 59], [2, 58], [4, 57], [8, 55], [12, 52]],
  climb: [[0, 52], [4, 55], [8, 57], [10, 58], [12, 59], [14, 62]],
  creep: [[0, 64], [3, 63], [6, 62], [9, 61], [12, 59]],
  wait: [[0, 59], [4, 60], [8, 59], [12, 58]],
  end: [[0, 52], [8, 47], [12, 52]],
};
const BARS = [["up", 0], ["down", 0], ["climb", 0], ["creep", 0], ["up", 5], ["down", 5], ["wait", 0], ["end", 0]];

export default {
  name: "Troll",
  description: "Sneaky tiptoeing pizzicato and a kazoo in E minor — with wrong notes, boings and honks.",
  color: "#7bb33f",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 112, swing: .45 },
  params: {
    sneak: { label: "Pizzicato", min: 0, max: 2, step: .01, value: 1 },
    bassoon: { label: "Bassoon", min: 0, max: 2, step: .01, value: 1 },
    kazoo: { label: "Kazoo", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Wood blocks", min: 0, max: 2, step: .01, value: 1 },
    wrong: { label: "Wrong notes", min: 0, max: 1, step: .01, value: .12 },
    boings: { label: "Boings", min: 0, max: 1, step: .01, value: .4 },
    honks: { label: "Honks", min: 0, max: 1, step: .01, value: .3 },
    pauses: { label: "Sudden pauses", min: 0, max: 1, step: .01, value: .2 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, [line, shift] = BARS[bar], r = (n) => rnd(s * 131 + loop * 7717 + n);
    // Sudden pause: the last beat of some bars just... stops. Then carries on as if nothing happened.
    if (i >= 12 && bar < 7 && rnd(bar + loop * 8) < p.pauses * .5) return;
    const hit = LINES[line].find(([at]) => at === i);
    if (hit) {
      const m = hit[1] + shift + (r(1) < p.wrong ? (r(2) < .5 ? -1 : 1) : 0);
      v.pluck(t, m, { type: "triangle", vol: .06 * p.sneak, decay: .12, cutoff: 1400 });
      v.bass(t, m - 12, .6 * v.S, { type: "square", vol: .05 * p.bassoon, cutoff: 700 });
      if (loop % 2) v.lead(t, m + 12, 1.5 * v.S, { vol: .03 * p.kazoo, filterType: "bandpass", cutoff: 1100, q: 3, vibrato: 1.2, attack: .02 });
    }
    // Tiptoe percussion: soft kick, wood blocks on 2 and 4, dry closed hats.
    if (i === 0) v.kick(t, .3 * p.drums, { pitch: 130, decay: .15 });
    if (i === 4 || i === 12) v.click(t, .14 * p.drums, i === 4 ? 1100 : 1500, .04);
    if (i % 2 === 0) v.hat(t, .01 * p.drums);
    // Pranks.
    if (i === 14 && r(3) < p.boings * .5) v.glide(t, 60, 72 + Math.floor(r(4) * 7), 2 * v.S, { vol: .04, wobble: 9 });
    if (i === 6 && r(5) < p.honks * .3) for (const m of [40, 41]) v.bass(t, m, 2 * v.S, { type: "square", vol: .06, cutoff: 900 });
    if (s === 124) v.glide(t, 84, 48, 3 * v.S, { type: "triangle", vol: .04 }); // slide whistle down at the end of the loop
  },
};
