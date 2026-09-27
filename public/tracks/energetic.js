// Four-on-the-floor dance loop in A minor; the lead arpeggio comes and goes.
const CHORDS = [ // Am  F  C  G
  { root: 45, notes: [57, 60, 64] }, { root: 41, notes: [57, 60, 65] },
  { root: 48, notes: [55, 60, 64] }, { root: 43, notes: [55, 59, 62] },
];

export default {
  name: "Energetic",
  description: "Four-on-the-floor dance loop in A minor with a build-up every 8 bars.",
  color: "#e0565b",
  steps: 128,
  loops: { intro: 1, period: 2 },
  defaults: { bpm: 128 },
  params: {
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    bassCutoff: { label: "Bass filter", min: 200, max: 3000, step: 10, value: 900, unit: " Hz" },
    stabs: { label: "Chord stabs", min: 0, max: 2, step: .01, value: 1 },
    lead: { label: "Lead arpeggio", min: 0, max: 2, step: .01, value: 1 },
    riser: { label: "Build-up riser", min: 0, max: 1, step: 1, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, c = CHORDS[bar % 4];
    if (i % 4 === 0) v.kick(t, .5 * p.drums);
    if (i === 4 || i === 12) v.clap(t, .12 * p.drums);
    if (i % 4 === 2) v.hat(t, .04 * p.drums, true); else if (i % 2) v.hat(t, .02 * p.drums);
    if (i % 4) v.bass(t, c.root + (i % 4 === 2 ? 12 : 0), .7 * v.S, { vol: .09 * p.bass, cutoff: p.bassCutoff });
    if (i === 0) v.pad(t, c.notes, 16 * v.S, .01 * p.stabs, 2500);
    if (i % 4 === 2) for (const m of c.notes) v.pluck(t, m + 12, { type: "sawtooth", vol: .02 * p.stabs, decay: .15, cutoff: 2500 });
    if (bar >= 4 || loop % 2) {
      const arp = [...c.notes, ...c.notes.map((m) => m + 12)];
      v.pluck(t, arp[[0, 1, 2, 3, 4, 5, 4, 2][i % 8]] + 12, { vol: .025 * p.lead, decay: .12, cutoff: 3000 });
    }
    if (s === 0 && loop) v.crash(t);
    if (s === 112 && p.riser) v.riser(t, 16 * v.S);
  },
};
