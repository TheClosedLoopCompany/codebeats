// Jazz: a medium-swing quartet in F. Tenor sax, piano, upright bass and a ride cymbal, playing a 32-bar AABA tune
// the way a small group would: the head (bass in two over the A sections), a sax solo, a piano solo with the sax
// back in behind it, then the head again. The solos are improvised once from the changes and stay the same each time.
import { rnd } from "../engine.js";

// Chords, two per bar (half-bar grid). Quality: ^ maj7, m m7, 7 dom7, b9 dom7b9, o dim7.
const PC = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const Q = { // chord tones, scale (for lines), rootless piano voicing — all in semitones above the root
  "^": { tones: [0, 4, 7, 11], scale: [0, 2, 4, 7, 9, 11], voicing: [4, 7, 11, 14] },
  m: { tones: [0, 3, 7, 10], scale: [0, 2, 3, 5, 7, 9, 10], voicing: [3, 7, 10, 14] },
  7: { tones: [0, 4, 7, 10], scale: [0, 2, 4, 7, 9, 10], voicing: [4, 9, 10, 14] },
  b9: { tones: [0, 4, 7, 10], scale: [0, 1, 4, 5, 7, 8, 10], voicing: [4, 7, 10, 13] },
  o: { tones: [0, 3, 6, 9], scale: [0, 2, 3, 5, 6, 8, 9, 11], voicing: [0, 3, 6, 9] },
};
const A = "F^ F^ Bb7 Bb7 Am D7b9 Gm C7 F^ F^ Bb7 Bb7 Am Abo Gm C7";
const FORM = [A, A.replace(/Gm C7$/, "Cm F7"), "Bb^ Bb^ Bbm Eb7 Am Am D7b9 D7b9 Gm Gm C7 C7 Am D7b9 Gm C7", A].join(" ").split(" ").map((c) => {
  const [, root, q] = c.match(/^([A-G]b?)(.*)$/);
  return { name: c, root: PC[root], ...Q[q === "7b9" ? "b9" : q] };
});
const chordAt = (e) => FORM[(e >> 2) % 64]; // e: eighth note within the form (8 per bar)
const has = (list, c, m) => list.some((x) => (((m - c.root - x) % 12) + 12) % 12 === 0);

// The tune, per bar: [eighth in the bar, note, length in eighths]. Bars 1-8, the second A's last bar, the bridge.
const A_TUNE = [
  [[0, 60, 1], [1, 64, 1], [2, 65, 1], [3, 69, 5]],
  [[4, 68, 1], [5, 67, 1], [6, 65, 1], [7, 62, 1]],
  [[0, 64, 3], [3, 60, 1], [4, 66, 2], [6, 63, 2]],
  [[0, 62, 3], [3, 65, 1], [4, 64, 4]],
  [[1, 64, 1], [2, 65, 1], [3, 69, 1], [4, 72, 3], [7, 70, 1]],
  [[0, 68, 3], [3, 65, 1], [4, 67, 2], [6, 65, 2]],
  [[0, 64, 2], [2, 60, 2], [4, 59, 2], [6, 62, 2]],
  [[0, 58, 2], [2, 62, 1], [3, 65, 1], [4, 64, 3]],
];
const A2_END = [[0, 67, 2], [2, 63, 2], [4, 69, 1], [5, 67, 1], [6, 65, 1], [7, 63, 1]];
const BRIDGE = [
  [[0, 62, 4], [4, 65, 1], [5, 69, 1], [6, 72, 2]],
  [[0, 73, 3], [3, 70, 1], [4, 67, 2], [6, 65, 1], [7, 63, 1]],
  [[0, 64, 5], [5, 67, 1], [6, 69, 1], [7, 72, 1]],
  [[0, 70, 2], [2, 69, 2], [4, 66, 2], [6, 63, 2]],
  [[0, 62, 4], [4, 65, 1], [5, 67, 1], [6, 70, 2]],
  [[0, 69, 3], [3, 67, 1], [4, 64, 4]],
  [[0, 67, 2], [2, 64, 2], [4, 66, 1], [5, 69, 1], [6, 72, 1], [7, 70, 1]],
  [[0, 69, 2], [2, 65, 2], [4, 64, 2]],
];
const TUNE = [...A_TUNE, ...A_TUNE.slice(0, 7), A2_END, ...BRIDGE, ...A_TUNE];

// Everything that happens in one time round, keyed by the 16th step it starts on. Offbeat eighths are marked
// `sw` so they can be swung at play time (the Swing slider); `len` is in straight 16ths, `off` a nudge in 16ths.
const at = (map, e, ev) => { // triplets (fractional e) are placed from the eighth before them, unswung
  const step = Math.floor(e) * 2, L = ev.len8 ?? 1;
  const item = { sw: e % 1 === 0 && e % 2 === 1, swEnd: (e + L) % 1 === 0 && (e + L) % 2 === 1, len: L * 2, off: (e % 1) * 2, e, ...ev };
  (map.get(step) || map.set(step, []).get(step)).push(item);
};
const stream = (seed) => { let n = seed * 7919; return () => rnd(n++); };

// An improvised line over the changes: mostly eighth-note runs by scale step, chord tones landing on the beats,
// chromatic passing tones into the next chord, the odd arpeggio leap and triplet turn, phrases that breathe.
function improvise(map, seed, { lo, hi, voice, from = 0, to = 256, climb = 0 }) {
  const r = stream(seed);
  let e = from + 1 + Math.floor(r() * 3), cur = Math.round((lo + hi) / 2), dir = 1;
  const nearest = (m, c, list, d) => { for (let k = d; Math.abs(k) < 12; k += d) if (has(list, c, m + k)) return m + k; return m; };
  while (e < to - 2) {
    const top = hi + Math.round(climb * (e - from) / (to - from)), len = 5 + Math.floor(r() * 11);
    // Sometimes open a phrase with a held note: a chord colour, with vibrato.
    if (r() < .18) {
      const c = chordAt(e), L = 3 + Math.floor(r() * 4);
      cur = nearest(cur, c, c.tones, r() < .5 ? 1 : -1);
      at(map, e, { voice, m: cur, len8: L, acc: 1 }); e += L;
    }
    for (let k = 0; k < len && e < to - 1; k++) {
      const c = chordAt(e), next = chordAt(e + 1);
      if (cur >= top - 1) dir = -1; else if (cur <= lo + 1) dir = 1; else if (r() < .17) dir = -dir;
      let m, top8 = false;
      if (r() < .12) m = nearest(cur + dir * 2, c, c.tones, dir); // arpeggio leap
      else if (e % 2 && Math.abs(nearest(cur, next, next.tones, dir) - cur) === 2) m = cur + dir; // chromatic passing
      else {
        m = nearest(cur, c, c.scale, dir);
        if (e % 2 === 0 && !has(c.tones, c, m) && r() < .7) m = nearest(m, c, c.scale, dir); // chord tone on the beat
      }
      if (m > top + 2) m -= 12; else if (m < lo - 2) m += 12;
      top8 = dir === 1 && m >= top - 3;
      // A triplet turn around a chord tone, on a beat.
      if (e % 2 === 0 && r() < .07 && k < len - 2) {
        const tgt = nearest(m, c, c.tones, 1);
        [tgt + 1, tgt - 1, tgt].forEach((x, j) => at(map, e + j * 2 / 3, { voice, m: x, len8: 2 / 3, acc: j === 2 ? 1 : .8 }));
        cur = tgt; e += 2; continue;
      }
      const quarter = r() < .12;
      at(map, e, { voice, m, len8: quarter ? 2 : 1, acc: e % 2 ? 1.15 : top8 ? 1.2 : .85 });
      cur = m; e += quarter ? 2 : 1;
    }
    // Land on a chord tone and let it ring (sometimes with a fall-off), then rest.
    const c = chordAt(e), L = 2 + Math.floor(r() * 3);
    cur = nearest(cur, c, c.tones, dir);
    if (cur > top) cur -= 12; if (cur < lo) cur += 12;
    at(map, e, { voice, m: cur, len8: L, acc: 1.1, fall: r() < .3 ? 3 : 0 });
    e += L + 2 + Math.floor(r() * 5);
  }
}

// Walking bass: root on the chord change, then chord and scale tones heading for the next root, and an approach
// note (a half step either side, or its fifth) on the last beat. The first `twoUntil` bars go in half notes instead (a two-feel).
function walk(map, seed, twoUntil = 0) {
  const r = stream(seed), spans = [];
  for (let h = 0; h < 64; h++) {
    const same = spans.length && FORM[spans.at(-1).h].name === FORM[h].name;
    if (same) spans.at(-1).n += 2; else spans.push({ h, n: 2 });
  }
  let cur = 41;
  const near = (pc, around) => { let m = around - (((around - pc) % 12) + 12) % 12; if (around - m > 6) m += 12; return m > 50 ? m - 12 : m < 29 ? m + 12 : m; };
  spans.forEach(({ h, n }, k) => {
    const c = FORM[h], nx = FORM[spans[(k + 1) % spans.length].h], b0 = h * 2;
    for (let j = 0; j < n; j++) {
      const b = b0 + j, e = b * 2;
      if (b < twoUntil * 4 && b % 2) continue;
      let m;
      if (j === 0) m = near(c.root, cur);
      else if (b < twoUntil * 4) m = near(c.root + 7, cur); // two-feel: the fifth on beat 3
      else if (j === n - 1) {
        const tgt = near(nx.root, cur), x = r();
        m = x < .45 ? tgt - 1 : x < .8 ? tgt + 1 : near(nx.root + 7, cur);
      } else {
        const tgt = near(nx.root, cur), d = tgt > cur ? 1 : tgt < cur ? -1 : r() < .5 ? 1 : -1;
        m = cur + d; while (!has(j % 2 ? c.scale : c.tones, c, m) || m === cur) m += d;
        if (m > 50 || m < 29) m -= d * 12;
      }
      const two = b < twoUntil * 4;
      at(map, e, { voice: "bass", m, len8: two ? 3.6 : 1.8, acc: j === 0 ? 1.1 : 1 });
      // Now and then a ghosted skip note ("da-DUM") into the beat.
      if (!two && j > 0 && r() < .1) at(map, e - 1, { voice: "bass", m: cur, len8: .8, acc: .45 });
      cur = m;
    }
  });
}

// Piano comping: rootless voicings, each moved as little as possible from the last. Rhythms are chosen per bar;
// a hit on the last offbeat anticipates the next bar's chord.
const VOICINGS = (() => {
  let prev = [53, 57, 60, 64];
  return FORM.map((c) => {
    const pcs = c.voicing.map((x) => (c.root + x) % 12);
    let best, score = Infinity;
    for (let rot = 0; rot < 4; rot++) for (let base = 48; base <= 62; base++) {
      const v = []; let m = base;
      for (let j = 0; j < 4; j++) { const pc = pcs[(rot + j) % 4]; while (m % 12 !== pc) m++; v.push(m); m++; }
      if (v[0] !== base || v[3] > 74) continue;
      const d = v.reduce((a, x, j) => a + Math.abs(x - prev[j]), 0);
      if (d < score) { score = d; best = v; }
    }
    return (prev = best);
  });
})();
const COMP = [[0, 3], [3, 7], [0, 5], [2, 7], [1, 4], [3, 6], [0], [7]];
function comp(map, seed, soft = 1) {
  const r = stream(seed);
  for (let bar = 0; bar < 32; bar++) {
    for (const pos of COMP[Math.floor(r() * (bar % 8 === 7 ? 6 : COMP.length))]) {
      const e = bar * 8 + pos, h = ((e + (pos === 7 ? 1 : 0)) >> 2) % 64;
      at(map, e, { voice: "piano", notes: VOICINGS[h], len8: pos % 2 ? 1 : 2, acc: soft * (pos % 2 ? 1 : .85) });
    }
  }
}

// Guide tones (thirds and sevenths, voice-led) held as long notes: the sax playing background behind the piano.
function guide(map, fromBar, toBar) {
  let cur = 64;
  for (let h = fromBar * 2; h < toBar * 2; h++) {
    const c = FORM[h];
    let best = cur, d = 99;
    for (const x of [3, 4, 10, 11]) if (has(c.tones, c, c.root + x)) for (let m = 56; m <= 68; m++) if ((((m - c.root - x) % 12) + 12) % 12 === 0 && Math.abs(m - cur) < d) { d = Math.abs(m - cur); best = m; }
    at(map, h * 4, { voice: "sax", m: (cur = best), len8: 3.8, acc: .6, soft: true });
  }
}

// Sax articulation, the way swing is phrased: tongue the offbeats and slur them into the next downbeat
// ("doo-BAH"), slur within triplet turns, tongue anything after a gap. Held notes often scoop up into pitch.
function phrase(map, seed) {
  const r = stream(seed), notes = [...map.values()].flat().filter((ev) => ev.voice === "sax").sort((a, b) => a.e - b.e);
  notes.forEach((ev, k) => {
    const prev = notes[k - 1], joined = prev && Math.abs(prev.e + prev.len8 - ev.e) < .01;
    ev.tongue = !joined || ev.sw || !(prev.sw || prev.len8 < 1) || ev.len8 > 2;
    ev.scoop = (ev.len8 >= 3 || !joined) && r() < .55 ? 40 + 50 * r() : 0;
  });
}

// The three times round: head, sax solo, piano solo (sax back in for the last A).
const ROUNDS = [0, 1, 2].map((n) => {
  const map = new Map();
  if (n === 0) TUNE.forEach((bar, b) => bar.forEach(([pos, m, L]) => at(map, b * 8 + pos, { voice: "sax", m, len8: L, acc: pos % 2 ? 1.1 : .95, head: true })));
  if (n === 1) improvise(map, 11, { lo: 55, hi: 69, voice: "sax", climb: 4 });
  if (n === 2) { improvise(map, 23, { lo: 67, hi: 82, voice: "keys", climb: 3 }); guide(map, 24, 32); }
  phrase(map, 60 + n);
  walk(map, 5 + n, n === 0 ? 16 : 0);
  comp(map, 40 + n, n === 2 ? .6 : 1);
  return map;
});

export default {
  name: "Jazz",
  description: "Medium swing in F: tenor sax, piano, walking upright bass and ride cymbal — the head, then solos.",
  color: "#c9a227",
  steps: 512,
  loops: { intro: 0, period: 3 },
  defaults: { bpm: 132, swing: .7, tone: .8, reverb: .6, echo: 0 },
  params: {
    sax: { label: "Tenor sax", min: 0, max: 2, step: .01, value: 1 },
    breath: { label: "Sax breath", min: 0, max: 1, step: .01, value: .35 },
    vibrato: { label: "Sax vibrato", min: 0, max: 2, step: .01, value: .8 },
    piano: { label: "Piano", min: 0, max: 2, step: .01, value: 1 },
    bass: { label: "Upright bass", min: 0, max: 2, step: .01, value: 1 },
    drums: { label: "Drums", min: 0, max: 2, step: .01, value: 1 },
  },
  play(v, s, t, loop, p) {
    const i = s % 16, bar = s >> 4, d = p.swing * 2 * v.S / 3, r = (n) => rnd(s * 53 + loop * 7001 + n);
    for (const ev of ROUNDS[loop].get(s) || []) {
      const t0 = t + (ev.sw ? d : 0) + ev.off * v.S, len = ev.len * v.S + (ev.swEnd ? d : 0) - (ev.sw ? d : 0);
      // Sax: laid back behind the beat, never quite the same amount twice.
      if (ev.voice === "sax") v.sax(t0 + .014 + .008 * (rnd(ev.e * 97 + ev.m) - .5), ev.m, len, {
        vol: .05 * ev.acc * p.sax, dyn: ev.acc * (ev.soft ? .55 : 1), breath: p.breath * (ev.soft ? 1.5 : 1), vibrato: p.vibrato,
        tongue: ev.tongue, scoop: ev.scoop, fall: ev.fall, swell: ev.soft ? .05 : .12,
      });
      if (ev.voice === "keys") v.piano(t0, ev.m, { vol: .05 * ev.acc * p.piano, decay: Math.max(.5, len * 2) });
      if (ev.voice === "piano") ev.notes.forEach((m, j) => v.piano(t0 + .006 * (rnd(ev.e * 13) - .3) + j * .006, m, { vol: .03 * ev.acc * p.piano, decay: ev.len > 2 ? 1 : .6 }));
      if (ev.voice === "bass") v.upright(t0, ev.m, len * .9, { vol: .085 * ev.acc * p.bass, bright: ev.acc });
    }
    // Drums. Ride: "ding, ding-da ding, ding-da" (quarters, with a swung skip note into 2 and 4); hi-hat foot on 2 and 4;
    // the bass drum barely there ("feathered"); snare chatter that gets busier in the solos; a fill every eight bars.
    const head = loop === 0 && bar < 16, dr = p.drums * (head ? .75 : 1);
    if (i % 4 === 0) v.ride(t, (i % 8 ? .026 : .02) * dr);
    if (i === 6 || i === 14) v.ride(t + d, .014 * dr, { decay: 1 });
    if (i === 4 || i === 12) v.hiss(t, { vol: .03 * dr, decay: .04, type: "bandpass", freq: 3800, q: 1.2 });
    if (i % 4 === 0) v.kick(t, .07 * dr, { pitch: 80, decay: .25 });
    if (bar % 8 === 7 && i >= 8) {
      if (i === 8 || i === 12) for (let j = 0; j < 3; j++) if (r(j) < .75) v.snare(t + j * 4 * v.S / 3, (.03 + .03 * j) * dr, { freq: 1400 });
    } else if (!head && i % 2 === 0) {
      const off = i % 4 === 2;
      if (r(1) < (loop ? .14 : .07)) v.snare(t + (off ? d : 0), (.012 + .02 * r(2)) * dr, { freq: 1600 });
      if (i === 14 && r(3) < .12) v.kick(t + d, .2 * dr, { pitch: 90 }); // a "bomb" under the anticipation
    }
    if (s === 0) { v.ride(t, .04 * dr, { bell: 1 }); v.hiss(t, { vol: .025 * dr, decay: 2.5, freq: 4500 }); }
  },
};
