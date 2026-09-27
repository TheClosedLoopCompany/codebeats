// Tense: thriller underscore. A low F# pulsing in 8ths, a clock ticking, a string cluster that creeps
// upwards bar by bar, sudden hits — and it never, ever resolves.
import { rnd } from "../engine.js";

export default {
  name: "Tense",
  description: "Thriller suspense: a pulsing low note, a ticking clock, rising string clusters, sudden hits.",
  color: "#8c9aa6",
  steps: 256,
  loops: { intro: 0, period: 2 },
  defaults: { bpm: 100, reverb: 1.2, tone: .8 },
  params: {
    pulse: { label: "Low pulse", min: 0, max: 2, step: .01, value: 1 },
    clock: { label: "Ticking clock", min: 0, max: 2, step: .01, value: 1 },
    strings: { label: "String cluster", min: 0, max: 2, step: .01, value: 1 },
    heartbeat: { label: "Heartbeat", min: 0, max: 1, step: .01, value: .5 },
    hits: { label: "Sudden hits", min: 0, max: 1, step: 1, value: 1 },
    riser: { label: "Risers", min: 0, max: 1, step: 1, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, group = bar >> 2;
    const hit = p.hits && ((bar === 7 && i === 0) || (bar === 15 && i === 8) || (bar === 11 && i === 4 && loop % 2));
    // Pulse: F# in 8ths, leaning on the G above it every fourth bar. Drops out for a beat after a hit.
    if (i % 2 === 0) v.bass(t, bar % 4 === 3 && i >= 8 ? 31 : 30, .7 * v.S, { type: "sawtooth", vol: (i % 4 ? .07 : .1) * p.pulse, cutoff: 280 + 40 * group });
    // Clock: dry ticks on the 8ths, a tock on the beat.
    if (i % 2 === 0) v.click(t, (i % 4 ? .05 : .08) * p.clock, i % 4 ? 4500 : 3000, .005);
    if (i % 2) v.hat(t, .004 * p.clock);
    if ((i === 0 || i === 3) && bar % 2 === 0) v.kick(t, (i ? .15 : .25) * p.heartbeat, { pitch: 70, decay: .25 });
    // Cluster: three semitones stacked, swelling in over four bars, a whole step higher each time.
    if (s % 64 === 0) {
      const base = 62 + group * 2 + (loop % 2);
      for (const m of [base, base + 1, base + 2, base + 13]) v.lead(t, m, 56 * v.S, { vol: .01 * p.strings, attack: 48 * v.S, vibrato: .2, cutoff: 2200 });
    }
    if (p.riser && ((bar === 6 && i === 0) || (bar === 14 && i === 8))) v.riser(t, 16 * v.S);
    if (hit) {
      v.kick(t, .7, { pitch: 60, decay: .9 }); v.crash(t);
      v.power(t, 30, 8 * v.S, { vol: .035, drive: .5 });
      for (const m of [42, 43]) v.brass(t, m, 6 * v.S, { vol: .03, attack: .02, section: 3 });
    }
    if (i === 6 && rnd(bar + loop * 16) < .12) v.glide(t, 88, 86, 4 * v.S, { vol: .008 }); // a stray, sour whistle
  },
};
