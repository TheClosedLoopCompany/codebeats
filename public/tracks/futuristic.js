// Synthwave in D minor: octave bass, echoing 16th arpeggio with a filter that opens and closes.
const CHORDS = [ // Dm9  Bbmaj7  Gm9  A7
  { root: 38, pad: [53, 57, 60, 64], arp: [62, 65, 69, 72] },
  { root: 34, pad: [53, 57, 58, 62], arp: [58, 62, 65, 69] },
  { root: 31, pad: [50, 53, 57, 58], arp: [55, 58, 62, 65] },
  { root: 33, pad: [52, 55, 57, 61], arp: [57, 61, 64, 67] },
];

export default {
  name: "Futuristic",
  description: "Synthwave in D minor: octave bass and an echoing arpeggio under a sweeping filter.",
  color: "#9b6cf0",
  steps: 128,
  loops: { intro: 1, period: 1 },
  defaults: { bpm: 100 },
  params: {
    sweep: { label: "Filter sweep", min: 0, max: 2, step: .01, value: 1 },
    arp: { label: "Arpeggio", min: 0, max: 2, step: .01, value: 1 },
    pad: { label: "Pad", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    zap: { label: "Laser zap", min: 0, max: 1, step: 1, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar >> 1], sweep = (.5 - .5 * Math.cos(2 * Math.PI * s / 128)) * p.sweep;
    if (s % 32 === 0) v.pad(t, c.pad, 32 * v.S, .015 * p.pad, 1100);
    if (i % 2 === 0) v.bass(t, c.root + (i % 4 ? 12 : 0), 1.5 * v.S, { vol: .09 * p.bass, cutoff: 500 + 700 * sweep });
    v.pluck(t, c.arp[[0, 1, 2, 3, 2, 1, 3, 2][i % 8]] + (i >= 8 ? 12 : 0), { vol: .025 * p.arp, decay: .15, cutoff: 700 + 2500 * sweep });
    if (loop || bar >= 2) { // drums come in after a two-bar intro
      if (i === 0 || i === 8 || i === 11) v.kick(t, .45 * p.drums);
      if (i === 4 || i === 12) v.snare(t, .12 * p.drums);
      v.hat(t, (i % 4 === 2 ? .025 : .01) * p.drums);
    }
    if (s === 120 && p.zap) v.zap(t);
  },
};
