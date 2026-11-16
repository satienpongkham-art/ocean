// ─── วิเคราะห์เสียงในเครื่อง: หาช่วงพูด/ช่วงเงียบ · เตรียมเสียง 16kHz ให้ตัวถอดซับ ───
const cache = new Map(); // key → { buf: AudioBuffer, mono16?: Float32Array }

async function decode(key, blob) {
  if (cache.has(key)) return cache.get(key);
  const ab = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const buf = await ctx.decodeAudioData(ab);
  const v = { buf }; cache.set(key, v); return v;
}
export const forget = (key) => cache.delete(key);

/** ช่วงที่มีเสียงพูด [{a,b}] (วินาที) · gap = ความยาวเงียบขั้นต่ำที่จะตัด · pad = เผื่อหัวท้าย */
export async function speechRanges(key, blob, { gap = 0.45, pad = 0.12 } = {}) {
  const { buf } = await decode(key, blob);
  const sr = buf.sampleRate, win = Math.round(sr * 0.02); const n = Math.floor(buf.length / win);
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  const rms = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (const d of chans) for (let j = i * win, e = j + win; j < e; j++) s += d[j] * d[j]; rms[i] = Math.sqrt(s / (win * chans.length)); }
  const sorted = Float32Array.from(rms).sort(); const lo = sorted[Math.floor(n * 0.1)] || 0, hi = sorted[Math.floor(n * 0.92)] || 0;
  const thr = Math.max(0.004, lo + (hi - lo) * 0.16);
  const out = []; let start = -1;
  for (let i = 0; i <= n; i++) {
    const on = i < n && rms[i] > thr;
    if (on && start < 0) start = i;
    if (!on && start >= 0) { out.push({ a: start * 0.02, b: i * 0.02 }); start = -1; }
  }
  // รวมช่วงที่เงียบสั้นกว่า gap · ทิ้งเสียงสั้นมาก (เสียงคลิก)
  const merged = [];
  for (const r of out) { const last = merged[merged.length - 1]; if (last && r.a - last.b < gap) last.b = r.b; else merged.push({ ...r }); }
  const dur = buf.duration;
  return merged.filter((r) => r.b - r.a > 0.18).map((r) => ({ a: +Math.max(0, r.a - pad).toFixed(2), b: +Math.min(dur, r.b + pad).toFixed(2) }));
}

/** เสียงโมโน 16kHz ของคลิป (สำหรับถอดซับ) */
export async function mono16(key, blob) {
  const v = await decode(key, blob); if (v.mono16) return v.mono16;
  const len = Math.ceil(v.buf.duration * 16000);
  const ctx = new OfflineAudioContext(1, len, 16000); const s = ctx.createBufferSource(); s.buffer = v.buf; s.connect(ctx.destination); s.start();
  const r = await ctx.startRendering(); v.mono16 = r.getChannelData(0); return v.mono16;
}
/** ต่อเสียงตามลำดับช่วงที่ใช้ในคลิป (เวลาเท่ากับเวลาในคลิปที่ส่งออก) */
export async function outputPCM(segs, getBlob) {
  const parts = []; let total = 0;
  for (const s of segs) { const blob = await getBlob(s.clip); if (!blob) continue; const m = await mono16(s.key, blob); const p = m.subarray(Math.floor(s.a * 16000), Math.floor(s.b * 16000)); parts.push(p); total += p.length; }
  const out = new Float32Array(total); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** ความดังของเสียงพูด → ตัวคูณให้ดังเท่ากันทุกคลิป (เป้า RMS ≈ 0.1) */
export async function loudGain(key, blob) {
  const { buf } = await decode(key, blob); const d = buf.getChannelData(0); const step = Math.max(1, Math.floor(d.length / 200000));
  const v = []; for (let i = 0; i < d.length; i += step) v.push(Math.abs(d[i]));
  v.sort((a, b) => a - b); const loud = v.slice(Math.floor(v.length * 0.6)); const rms = Math.sqrt(loud.reduce((a, x) => a + x * x, 0) / Math.max(1, loud.length));
  return +Math.max(0.6, Math.min(3, 0.1 / Math.max(1e-4, rms))).toFixed(2);
}
