// Visualizers for the player bar. Each mode draws one frame of the current Player state onto a 2D canvas.
// Note-based modes read `player.events` (every scheduled note) and `player.steps` (when each 16th starts).

export const MODES = { roll: "Piano roll", grid: "Step grid", chord: "Chords", spectrum: "Spectrum", wave: "Waveform", off: "Off" };

const NOTE = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const ROWS = ["lead", "keys", "chords", "bass", "drums"];
const ALPHA = { lead: 1, keys: .7, bass: .9, chords: .35, drums: .55 };

export function draw(mode, g, w, h, player, playing, c) {
  const now = player.ac?.currentTime ?? 0, live = playing && player.cur;
  g.clearRect(0, 0, w, h);
  if (mode === "off") return;
  if (!live && mode !== "grid") return baseline(g, w, h, c);
  ({ roll, grid, chord, spectrum, wave })[mode](g, w, h, player, now, c, live);
}

function baseline(g, w, h, c) {
  g.fillStyle = c.line;
  g.fillRect(0, h / 2 - c.dpr / 2, w, c.dpr);
}

// Where the music is right now: the latest step that has started.
function position(player, now) {
  const st = player.steps || [];
  for (let i = st.length - 1; i >= 0; i--) if (st[i].t <= now) return st[i];
  return st[0];
}

// Piano roll: the last few seconds of notes scrolling left, pitch upwards, drums as ticks along the bottom.
const range = { lo: 48, hi: 72 };
function roll(g, w, h, player, now, c) {
  const past = 4, ahead = .25, x = (t) => (t - now + past) / (past + ahead) * w;
  const ev = player.events.filter((e) => e.t + e.len > now - past && e.t < now + ahead);
  const mel = ev.filter((e) => e.notes);
  let lo = Infinity, hi = -Infinity;
  for (const e of mel) for (const m of e.notes) { lo = Math.min(lo, m); hi = Math.max(hi, m); }
  if (mel.length) { // ease the pitch range towards what's on screen, at least two octaves
    const mid = (lo + hi) / 2, half = Math.max(12, (hi - lo) / 2 + 2);
    range.lo += (mid - half - range.lo) * .05; range.hi += (mid + half - range.hi) * .05;
  }
  const drumH = 6 * c.dpr, top = 2 * c.dpr, y = (m) => top + (h - drumH - 3 * c.dpr - top) * (1 - (m - range.lo) / (range.hi - range.lo));
  g.fillStyle = g.strokeStyle = c.accent;
  g.lineWidth = 2 * c.dpr;
  for (const e of mel) {
    g.globalAlpha = ALPHA[e.lane] * (e.t > now ? .3 : 1);
    if (e.kind === "glide") {
      g.beginPath(); g.moveTo(x(e.t), y(e.notes[0])); g.lineTo(x(e.t + e.len), y(e.notes[1])); g.stroke();
      continue;
    }
    const bh = (e.lane === "chords" ? 2 : 3) * c.dpr, bw = Math.max(2 * c.dpr, x(e.t + e.len) - x(e.t));
    for (const m of e.notes) g.fillRect(x(e.t), y(m) - bh / 2, bw, bh);
  }
  g.fillStyle = c.muted;
  for (const e of ev) if (!e.notes) {
    const th = drumH * (e.kind === "kick" ? 1 : e.kind === "snare" || e.kind === "clap" ? .7 : .4);
    g.globalAlpha = e.t > now ? .3 : .8;
    g.fillRect(x(e.t), h - th, 1.5 * c.dpr, th);
  }
  g.globalAlpha = 1;
  g.fillStyle = c.line;
  g.fillRect(x(now), 0, c.dpr, h);
}

// Step grid: the current bar as 16 steps, one row per part, lit as each note plays.
function grid(g, w, h, player, now, c, live) {
  const bar = player.cur?.track.bar ?? 16, pos = live && position(player, now), gap = 1.5 * c.dpr, cw = w / bar, rh = h / ROWS.length;
  const lit = new Map();
  if (pos) for (const e of player.events) {
    if (e.loop !== pos.loop || Math.floor(e.step / bar) !== Math.floor(pos.step / bar) || e.t > now || now - e.t > bar * player.cur.v.S) continue;
    const k = `${ROWS.indexOf(e.lane)},${e.step % bar}`;
    lit.set(k, Math.max(lit.get(k) || 0, ALPHA[e.lane]));
  }
  for (let r = 0; r < ROWS.length; r++) for (let s = 0; s < bar; s++) {
    const a = lit.get(`${r},${s}`);
    g.globalAlpha = a ?? (s % 4 === 0 ? .9 : .5);
    g.fillStyle = a ? c.accent : c.line;
    g.fillRect(s * cw + gap / 2, r * rh + gap / 2, cw - gap, rh - gap);
  }
  if (pos) {
    g.globalAlpha = .18; g.fillStyle = c.text;
    g.fillRect((pos.step % bar) * cw, 0, cw, h);
  }
  g.globalAlpha = 1;
}

// Chords: the harmony sounding right now, named, plus where we are in the loop.
const SHAPES = [["maj7", [0, 4, 7, 11]], ["m7", [0, 3, 7, 10]], ["7", [0, 4, 7, 10]], ["m7♭5", [0, 3, 6, 10]], ["6", [0, 4, 7, 9]],
  ["m6", [0, 3, 7, 9]], ["", [0, 4, 7]], ["m", [0, 3, 7]], ["sus4", [0, 5, 7]], ["sus2", [0, 2, 7]], ["dim", [0, 3, 6]], ["5", [0, 7]]];
function chordName(pcs, bass) {
  let best = "", score = -Infinity;
  for (let r = 0; r < 12; r++) for (const [q, iv] of SHAPES) {
    if (!iv.every((i) => pcs.has((r + i) % 12))) continue;
    const extra = [...pcs].filter((p) => !iv.includes((p - r + 12) % 12)).length;
    const sc = iv.length * 10 + (r === bass ? 6 : 0) - extra * 3;
    if (sc > score) { score = sc; best = NOTE[r] + q + (bass !== undefined && bass !== r ? "/" + NOTE[bass] : ""); }
  }
  return best || [...pcs].map((p) => NOTE[p]).join(" ");
}
function chord(g, w, h, player, now, c) {
  const pcs = new Set(), together = new Map(); // lead notes that start at the same moment are a chord (e.g. horn sections)
  for (const e of player.events) if (e.lane === "lead" && e.notes && e.t <= now && now < e.t + Math.max(e.len, .2)) together.set(e.t, [...(together.get(e.t) || []), ...e.notes]);
  for (const ns of together.values()) if (new Set(ns.map((m) => ((m % 12) + 12) % 12)).size > 1) for (const m of ns) pcs.add(((m % 12) + 12) % 12);
  let bass;
  for (const e of player.events) {
    if (!e.notes || e.t > now) continue;
    if (e.lane === "bass" && now - e.t < 2) bass = ((e.notes[0] % 12) + 12) % 12;
    if ((e.lane === "chords" || e.lane === "keys") && now < e.t + Math.max(e.len, .2)) for (const m of e.notes) pcs.add(((m % 12) + 12) % 12);
  }
  if (bass !== undefined) pcs.add(bass);
  const pos = position(player, now), steps = player.cur.track.steps;
  g.textBaseline = "middle";
  g.fillStyle = c.text;
  g.font = `600 ${Math.round(h * .5)}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = "center";
  g.fillText(pcs.size ? chordName(pcs, bass) : "—", w / 2, h / 2);
  g.textAlign = "left";
  if (!pos) return;
  g.fillStyle = c.muted;
  g.font = `${Math.round(h * .26)}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = "right";
  const bar = player.cur.track.bar ?? 16;
  g.fillText(`bar ${Math.floor(pos.step / bar) + 1}/${Math.ceil(steps / bar)} · beat ${((pos.step % bar) >> 2) + 1} · loop ${pos.loop + 1}`, w - 4 * c.dpr, h / 2);
  g.textAlign = "left";
}

// Spectrum: loudness per frequency band, bass on the left, 30 Hz to 16 kHz on a log scale.
let freq;
function spectrum(g, w, h, player, now, c) {
  const an = player.analyser, n = 56, gap = 2 * c.dpr;
  freq ??= new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(freq);
  g.fillStyle = c.accent;
  for (let i = 0; i < n; i++) {
    const f = 30 * (16000 / 30) ** (i / (n - 1)), bin = Math.min(freq.length - 1, Math.round(f / (player.ac.sampleRate / 2) * freq.length));
    const v = (freq[bin] / 255) ** 1.6, bh = Math.max(c.dpr, v * h);
    g.fillRect(i * w / n + gap / 2, h - bh, w / n - gap, bh);
  }
}

// Waveform: an oscilloscope of the final mix (the last ~40 ms of sound).
let wave_;
function wave(g, w, h, player, now, c) {
  wave_ ??= new Float32Array(player.analyser.fftSize);
  player.analyser.getFloatTimeDomainData(wave_);
  g.strokeStyle = c.accent; g.lineWidth = 1.5 * c.dpr;
  g.beginPath();
  for (let x = 0; x < w; x++) {
    const y = h / 2 - wave_[Math.floor(x / w * wave_.length)] * h * 1.4;
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}
