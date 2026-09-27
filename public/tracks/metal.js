// Metal: drop-D. Distorted power chords chugging on palm mutes, a tritone that won't resolve,
// double kick, crashes, and a screaming lead with a whammy dive on the second time round.
const O = "open", M = "mute";
const RIFFS = { // [16th step, note, open/mute, length in 16ths]
  a: [[0, 38, O, 2], [2, 38, M], [3, 38, M], [4, 41, O, 2], [6, 38, M], [7, 38, M], [8, 44, O, 2], [10, 43, O, 2], [12, 38, M], [13, 38, M], [14, 41, O, 1], [15, 40, O, 1]],
  b: [[0, 38, O, 2], [2, 38, M], [3, 38, M], [4, 38, M], [5, 38, M], [6, 46, O, 2], [8, 45, O, 2], [10, 44, O, 2], [12, 43, O, 4]],
  c: [[0, 38, O, 4], [4, 39, O, 4], [8, 40, O, 4], [12, 41, O, 2], [14, 43, O, 2]],
  stop: [[0, 38, O, 3], [3, 38, O, 3], [6, 44, O, 2]], // band hits, then a drum fill
};
const BARS = ["a", "b", "a", "c", "a", "b", "a", "stop"];
const SCREAM = [[0, 74, 6], [6, 75, 2], [8, 80, 8]]; // D, Eb, Ab: over bars 0, 2, 4

export default {
  name: "Metal",
  description: "Drop-D: distorted chugging riffs, double kick, and a screaming lead with a whammy dive.",
  color: "#d23a2a",
  steps: 128,
  loops: { intro: 0, period: 2 },
  defaults: { bpm: 150, reverb: .6, echo: .5 },
  params: {
    guitar: { label: "Guitars", min: 0, max: 2, step: .01, value: 1 },
    drive: { label: "Distortion", min: 0, max: 1, step: .05, value: .6 },
    tightness: { label: "Palm-mute tightness", min: 0, max: 1, step: .01, value: .6 },
    bass: { label: "Bass", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
    doubleKick: { label: "Double kick", min: 0, max: 1, step: 1, value: 1 },
    scream: { label: "Screaming lead", min: 0, max: 2, step: .01, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, riff = BARS[bar], hit = RIFFS[riff].find(([at]) => at === i);
    if (hit) {
      const [, m, how, len = 1] = hit;
      v.power(t, m, len * v.S, { vol: .045 * p.guitar, drive: p.drive, mute: how === M, tightness: p.tightness });
      v.bass(t, m, (how === M ? .6 : len) * v.S, { type: "square", vol: .09 * p.bass, cutoff: 450 });
    }
    // Drums: kick with every guitar hit (every 16th on the "b" riff when double kick is on), snare backbeat, ride 8ths.
    if (riff === "stop") {
      if (hit) { v.kick(t, .6 * p.drums); v.crash(t); }
      if (i >= 8) v.snare(t, (.06 + .01 * (i - 8)) * p.drums); // fill that builds into the loop
    } else {
      if (hit || (riff === "b" && p.doubleKick)) v.kick(t, .55 * p.drums, { decay: .15 });
      if (i === 4 || i === 12) v.snare(t, .16 * p.drums, { freq: 1500 });
      if (i % 2 === 0) v.hat(t, (i % 4 ? .02 : .035) * p.drums, i === 0);
      if (i === 0 && bar % 4 === 0) v.crash(t);
    }
    // Scream: from the second time round, a lead over the "a" riffs; a whammy dive before the stop.
    if (loop % 2 && riff === "a") for (const [at, m, len] of SCREAM) if (at === i) {
      v.lead(t, m + 12 * (bar === 6), len * v.S, { vol: .035 * p.scream, cutoff: 3500, q: 2, vibrato: 1.6, attack: .01 });
    }
    if (loop % 2 && s === 108) v.glide(t, 86, 50, 4 * v.S, { type: "sawtooth", vol: .03 * p.scream, wobble: 7 });
  },
};
