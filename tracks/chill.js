// Chill: sunny downtempo in Ab major. Kalimba phrases over a pumping pad, round sub bass,
// rimshot and shaker, and waves washing in and out.
import { rnd } from "../engine.js";

const CHORDS = [ // Abmaj9  Fm9  Dbmaj9  Eb6/9 — two bars each
  { root: 44, pad: [55, 58, 60, 63], shift: 0 },
  { root: 41, pad: [56, 60, 63, 67], shift: -1 },
  { root: 37, pad: [53, 56, 60, 63], shift: -2 },
  { root: 39, pad: [55, 58, 60, 65], shift: 1 },
];
const PENTA = [68, 70, 72, 75, 77, 80, 82, 84, 87]; // Ab major pentatonic
const RHYTHM = [0, 3, 6, 10, 12]; // kalimba figure, the same every bar; the notes change

export default {
  name: "Chill",
  description: "Sunny downtempo in Ab: kalimba over a pumping pad, round sub bass, shaker and waves.",
  color: "#3fb5a3",
  steps: 128,
  loops: { intro: 0, period: 4 },
  defaults: { bpm: 98, swing: .25, reverb: 1.1 },
  params: {
    kalimba: { label: "Kalimba", min: 0, max: 2, step: .01, value: 1 },
    busy: { label: "Kalimba notes", min: 0, max: 1, step: .01, value: .7 },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    pump: { label: "Pad pump", min: 0, max: .9, step: .01, value: .5 },
    bass: { label: "Sub bass", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    waves: { label: "Waves", min: 0, max: 1, step: .01, value: .4 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar >> 1];
    if (s % 32 === 0) v.pad(t, c.pad, 32 * v.S, .016 * p.pad, 1600);
    if (i % 4 === 0) v.duck(t, p.pump, 3.5 * v.S, ["pad"]);
    // Kick on 1 and the "and" of 3; rim on 2 and 4; shaker 16ths leaning on the offbeats.
    if (i === 0 || i === 10) v.kick(t, .4 * p.drums, { pitch: 120 });
    if (i === 4 || i === 12) v.click(t, .1 * p.drums, 1700, .03);
    v.hiss(t, { vol: (i % 4 === 2 ? .02 : .007) * p.drums, decay: .045, type: "bandpass", freq: 7000, q: 1.2 });
    // Sub bass.
    const b = { 0: [0, 5], 7: [7, 2], 10: [0, 4] }[i];
    if (b) v.bass(t, c.root + b[0] - 12, b[1] * v.S, { type: "sine", vol: .16 * p.bass, cutoff: 300 });
    // Kalimba: a phrase per two bars, chosen by the bar and the loop, shifted to sit on the chord.
    const k = RHYTHM.indexOf(i);
    if (k >= 0 && rnd(bar * 16 + i + loop * 7) < p.busy) {
      const n = Math.floor(rnd((bar >> 1) * 97 + k + (loop % 2) * 13) * 6) + 1 + c.shift;
      v.bell(t, PENTA[Math.max(0, Math.min(8, n))], { vol: .05 * p.kalimba, decay: .9, ratio: 4, index: .7 });
    }
    // Waves: noise that swells and recedes every two bars.
    v.bed("waves", .09 * p.waves * (.55 - .45 * Math.cos(2 * Math.PI * s / 32)), { freq: 900 });
  },
};
