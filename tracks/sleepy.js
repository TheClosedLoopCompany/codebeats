// Sleepy: a lullaby in G, 3/4 (12 sixteenths per bar). A music box over a soft harp-like arpeggio and pad,
// a slow heartbeat, a few twinkles. "Drift off" fades everything out and darkens it over the chosen minutes.
import { rnd } from "../engine.js";

const BARS = [ // chord tones for the arpeggio, bass root. G G D7 D7 C G D7 G
  { arp: [55, 59, 62], root: 43 }, { arp: [55, 59, 62], root: 43 },
  { arp: [54, 57, 60], root: 38 }, { arp: [54, 57, 60], root: 38 },
  { arp: [55, 60, 64], root: 36 }, { arp: [55, 59, 62], root: 43 },
  { arp: [54, 57, 60], root: 38 }, { arp: [55, 59, 62], root: 43 },
];
const TUNE = [ // [16th step, note] per bar
  [[0, 67], [4, 71], [8, 74]],
  [[0, 74], [6, 72], [8, 71]],
  [[0, 69], [4, 72], [8, 76]],
  [[0, 74], [8, 72]],
  [[0, 72], [4, 76], [8, 79]],
  [[0, 79], [6, 76], [8, 74]],
  [[0, 72], [4, 71], [8, 69]],
  [[0, 67]],
];

export default {
  name: "Sleepy",
  description: "Lullaby in 3/4: music box, soft arpeggios, a slow heartbeat — and a timer to drift off.",
  color: "#b3a6e0",
  steps: 96,
  loops: { intro: 0, period: 2 },
  bar: 12, // 3/4: twelve 16ths per bar (for the step grid)
  defaults: { bpm: 66, reverb: 1.4, tone: .6, echo: .6 },
  params: {
    musicBox: { label: "Music box", min: 0, max: 2, step: .01, value: 1 },
    harp: { label: "Arpeggio", min: 0, max: 2, step: .01, value: 1 },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    heartbeat: { label: "Heartbeat", min: 0, max: 1, step: .01, value: .4 },
    twinkle: { label: "Twinkles", min: 0, max: 1, step: .01, value: .3 },
    drift: { label: "Drift off", min: 0, max: 30, step: 1, value: 0, unit: " min" },
  },
  play(v, s, t, loop, p) {
    const i = s % 12, bar = Math.floor(s / 12), c = BARS[bar];
    if (v.driftStart === undefined || p.drift !== v.lastDrift) { v.driftStart = t; v.lastDrift = p.drift; } // restarts on play or slider change
    const fade = p.drift ? Math.max(0, 1 - (t - v.driftStart) / (p.drift * 60)) : 1;
    if (!fade) return;
    if (i === 0) {
      v.bass(t, c.root, 10 * v.S, { type: "sine", vol: .07 * fade, cutoff: 200 });
      if (bar % 2 === 0) v.pad(t, c.arp.map((m) => m + 12), 24 * v.S, .008 * p.pad * fade, 400 + 600 * fade);
    }
    // Harp-like arpeggio rising through the chord on the off-beats.
    if (i % 4 === 2) v.pluck(t, c.arp[i >> 2] + 12, { type: "triangle", vol: .02 * p.harp * fade, decay: .8, cutoff: 800 + 1200 * fade });
    // Music box tune; the second time round an octave higher.
    const note = TUNE[bar].find(([at]) => at === i)?.[1];
    if (note) v.bell(t, note + 12 * (loop % 2), { vol: .045 * p.musicBox * fade, decay: 2.5, ratio: 5, index: 1 });
    // Heartbeat: lub-dub on the downbeat.
    if (i === 0 || i === 2) v.kick(t, (i ? .1 : .15) * p.heartbeat * fade, { pitch: 70, decay: .2 });
    if (i % 2 === 1 && rnd(s + loop * 96) < p.twinkle * .12) v.bell(t, c.arp[Math.floor(rnd(s * 5 + loop) * 3)] + 36, { vol: .01 * fade, decay: 2, ratio: 7, index: .5 });
  },
};
