// Downloads: render a track offline with the current settings and save it as a WAV (or a ZIP of stems).
import { render, STEMS } from "./engine.js";
import { loudness, peak, wav, zip } from "./files.js";

export const SITE = "https://codebeats.theclosedloop.co/";
const SR = 48000, TAIL = 4; // seconds of ringing out after the last loop

export const credit = (track) =>
  `Music: "${track.name}" from codebeats by The Closed Loop Company (${SITE.replace(/\/$/, "")}), CC BY 4.0`;

// What to render, in loops, and which stretch of the result to keep.
// Length: whole loops (the intro included) nearest the requested minutes, then the tail.
// Seamless: two full cycles of the repeating loops, keeping the second. It starts with the first cycle's tail
// already ringing, exactly as it will when the file repeats, so there's no seam.
export function plan(track, p, { minutes, seamless }) {
  const L = track.steps * 60 / p.bpm / 4;
  if (seamless) {
    const { intro = 0, period } = track.loops;
    return { fromLoop: intro, loops: 2 * period, tail: 0, keepFrom: period * L, seconds: period * L, musicEnd: period * L };
  }
  const loops = Math.max(1, Math.round(minutes * 60 / L));
  return { fromLoop: 0, loops, tail: TAIL, keepFrom: 0, seconds: loops * L + TAIL, musicEnd: loops * L };
}

export const fmtTime = (s) => { s = Math.round(s); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`; };

// Render `track` with params `p` and save it. opts: { minutes, seamless, fadeIn, fadeOut, stems, link, onProgress }.
export async function download(track, p, opts) {
  const pl = plan(track, p, opts), stems = opts.stems ? STEMS : [];
  const jobs = [null, ...stems], progress = (i) => (f) => opts.onProgress?.((i + f) / jobs.length);
  const start = Math.round(pl.keepFrom * SR), length = Math.round(pl.seconds * SR);

  // Render the mix, then each stem the same way; keep the chosen stretch.
  const takes = [];
  for (const [i, stem] of jobs.entries()) {
    const buf = await render(track, p, { ...pl, only: stem && new Set([stem]), sampleRate: SR, onProgress: progress(i) });
    takes.push({ stem, channels: [0, 1].map((c) => buf.getChannelData(c).slice(start, start + length)) });
  }

  // Level everything with one gain, set by the mix: -14 LUFS (YouTube/Spotify), or -20 LUFS as a bed under a
  // voice-over. Capped so peaks stay below -1 dBFS. One shared gain keeps the stems adding up to the mix.
  const mix = takes[0].channels, target = p.voiceOver ? -20 : -14;
  const gain = Math.min(10 ** ((target - loudness(mix)) / 20), 10 ** (-1 / 20) / (peak(mix) || 1));

  // Fades (never on a seamless loop). The end always gets a few ms so the file can't stop on a click.
  const fadeIn = opts.fadeIn && !opts.seamless ? 1.5 * SR : 0;
  const fadeOutFrom = opts.seamless ? length : opts.fadeOut ? Math.max(0, Math.round((pl.musicEnd - 6) * SR)) : length - .05 * SR;
  const shape = (i) =>
    (i < fadeIn ? i / fadeIn : 1) * (i >= fadeOutFrom ? .5 + .5 * Math.cos(Math.PI * (i - fadeOutFrom) / (length - fadeOutFrom)) : 1);
  for (const { channels } of takes) for (const x of channels) for (let i = 0; i < length; i++) x[i] *= gain * shape(i);

  // Name and metadata. The comment carries the share link that reproduces these exact settings.
  const what = [`${Math.round(p.bpm)} bpm`, opts.seamless ? `seamless loop ${fmtTime(pl.seconds)}` : fmtTime(pl.seconds)];
  if (p.voiceOver) what.push("voice-over");
  const base = `codebeats - ${track.name} (${what.join(", ")})`;
  const info = (stem) => ({
    INAM: stem ? `${track.name} (${stem})` : track.name, IART: "The Closed Loop Company", IPRD: "codebeats",
    ICOP: `CC BY 4.0. Credit: ${credit(track)}`, ICMT: `Settings: ${opts.link}`, ISFT: "codebeats", ICRD: new Date().toISOString().slice(0, 10),
  });

  if (!opts.stems) return save(new Blob([wav(mix, SR, info())], { type: "audio/wav" }), `${base}.wav`);
  const files = takes
    .filter(({ stem, channels }) => !stem || peak(channels) > 1e-4) // skip stems this track doesn't use
    .map(({ stem, channels }) => ({ name: `${track.name} - ${stem || "mix"}.wav`, data: wav(channels, SR, info(stem)) }));
  const readme = `${credit(track)}\n\nSettings: ${opts.link}\n\nThe stems add up to the mix. Licensed under CC BY 4.0: ` +
    `https://creativecommons.org/licenses/by/4.0/ (use them anywhere, commercially too, as long as you give credit).\n`;
  files.push({ name: "CREDITS.txt", data: new TextEncoder().encode(readme) });
  return save(zip(files), `${base.slice(0, -1)}, stems).zip`);
}

function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// Rough file size, for the button.
export function estimate(track, p, opts) {
  const mb = plan(track, p, opts).seconds * SR * 4 / 1e6;
  return opts.stems ? mb * (1 + STEMS.length) : mb;
}
