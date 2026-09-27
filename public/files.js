// File formats for downloads, written by hand so the site needs no libraries: WAV (with metadata), ZIP, and a
// loudness meter to level the result.

// Integrated loudness in LUFS (ITU-R BS.1770 / EBU R128): K-weighting, 400 ms blocks every 100 ms,
// an absolute gate at -70 LUFS and a relative gate 10 LU below the ungated level. Channels: Float32Arrays at 48 kHz.
export function loudness(channels) {
  const SR = 48000, block = .4 * SR, hop = .1 * SR, n = channels[0].length;
  // The two K-weighting biquads (high shelf, then high-pass), BS.1770 coefficients for 48 kHz.
  const stages = [
    [[1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, .73248077421585]],
    [[1, -2, 1], [-1.99004745483398, .99007225036621]],
  ];
  const energy = new Float64Array(n + 1); // running sum of K-weighted squares over all channels
  for (const x of channels) {
    let acc = 0;
    const y = Float64Array.from(x);
    for (const [[b0, b1, b2], [a1, a2]] of stages) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < n; i++) {
        const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = y[i]; y2 = y1; y1 = v; y[i] = v;
      }
    }
    for (let i = 0; i < n; i++) { acc += y[i] * y[i]; energy[i + 1] += acc; }
  }
  const lk = (z) => -.691 + 10 * Math.log10(z), mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const blocks = [];
  for (let i = 0; i + block <= n; i += hop) blocks.push((energy[i + block] - energy[i]) / block);
  const loud = blocks.filter((z) => lk(z) > -70);
  if (!loud.length) return -Infinity;
  const gate = lk(mean(loud)) - 10;
  return lk(mean(loud.filter((z) => lk(z) > gate)));
}

export const peak = (channels) => Math.max(...channels.map((x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));

// 16-bit PCM WAV. `info` becomes a RIFF LIST/INFO chunk (title, artist, copyright, ...), which editors and
// players show as the file's metadata. Keys are the four-letter INFO ids: INAM, IART, ICOP, ICMT, IPRD, ISFT, ICRD.
export function wav(channels, sampleRate, info = {}) {
  const enc = new TextEncoder(), n = channels[0].length, nc = channels.length;
  const fields = Object.entries(info).filter(([, v]) => v).map(([id, text]) => {
    const body = enc.encode(text + "\0");
    return { id, body, size: body.length + (body.length % 2) }; // chunks are padded to an even length
  });
  const listSize = fields.length ? 4 + fields.reduce((a, f) => a + 8 + f.size, 0) : 0;
  const dataSize = n * nc * 2, total = 12 + 24 + (listSize ? 8 + listSize : 0) + 8 + dataSize;
  const buf = new ArrayBuffer(total), dv = new DataView(buf), bytes = new Uint8Array(buf);
  let o = 0;
  const str = (s) => { for (const c of s) dv.setUint8(o++, c.charCodeAt(0)); };
  const u32 = (v) => { dv.setUint32(o, v, true); o += 4; }, u16 = (v) => { dv.setUint16(o, v, true); o += 2; };
  str("RIFF"); u32(total - 8); str("WAVE");
  str("fmt "); u32(16); u16(1); u16(nc); u32(sampleRate); u32(sampleRate * nc * 2); u16(nc * 2); u16(16);
  if (listSize) {
    str("LIST"); u32(listSize); str("INFO");
    for (const f of fields) { str(f.id); u32(f.body.length); bytes.set(f.body, o); o += f.size; }
  }
  str("data"); u32(dataSize);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = Math.max(-1, Math.min(1, channels[c][i]));
    dv.setInt16(o, Math.round(v * 32767), true); o += 2;
  }
  return bytes;
}

// ZIP archive without compression ("stored"): WAV audio barely compresses anyway, and this keeps it tiny.
// files: [{ name, data: Uint8Array }]. Returns a Blob.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = (d) => { let c = ~0; for (let i = 0; i < d.length; i++) c = CRC_TABLE[(c ^ d[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };

export function zip(files) {
  const enc = new TextEncoder(), now = new Date(), parts = [], central = [];
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let offset = 0;
  const header = (size, fill) => { const b = new DataView(new ArrayBuffer(size)); fill(b); return new Uint8Array(b.buffer); };
  for (const { name, data } of files) {
    const nm = enc.encode(name), crc = crc32(data);
    // Shared fields: version, flags (bit 11: UTF-8 names), method 0 (stored), time, date, crc, sizes, name length.
    const common = (b, at) => {
      b.setUint16(at, 20, true); b.setUint16(at + 2, 0x0800, true); b.setUint16(at + 4, 0, true);
      b.setUint16(at + 6, time, true); b.setUint16(at + 8, date, true); b.setUint32(at + 10, crc, true);
      b.setUint32(at + 14, data.length, true); b.setUint32(at + 18, data.length, true); b.setUint16(at + 22, nm.length, true);
    };
    parts.push(header(30, (b) => { b.setUint32(0, 0x04034b50, true); common(b, 4); }), nm, data);
    central.push(header(46, (b) => {
      b.setUint32(0, 0x02014b50, true); b.setUint16(4, 20, true); common(b, 6); b.setUint32(42, offset, true);
    }), nm);
    offset += 30 + nm.length + data.length;
  }
  const size = central.reduce((a, p) => a + p.length, 0);
  const end = header(22, (b) => {
    b.setUint32(0, 0x06054b50, true); b.setUint16(8, files.length, true); b.setUint16(10, files.length, true);
    b.setUint32(12, size, true); b.setUint32(16, offset, true);
  });
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
