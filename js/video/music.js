// ─── บีตเพลงประกอบ: แต่งด้วยโค้ดในเครื่อง (ไม่ใช้เพลงของใคร ไม่ติดลิขสิทธิ์) ───
export const GENRES = {
  chill: { name: 'ชิล', sub: 'โลไฟ เบา ๆ สบาย ๆ', bpm: 82 },
  upbeat: { name: 'สนุก', sub: 'จังหวะเร็ว สดใส', bpm: 112 },
  story: { name: 'เล่าเรื่อง', sub: 'ดีดสาย อบอุ่น', bpm: 92 },
  corp: { name: 'มืออาชีพ', sub: 'เปียโน มั่นใจ', bpm: 100 },
  serious: { name: 'จริงจัง', sub: 'แพดหนัก ๆ ซึ้ง', bpm: 70 },
};
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// คอร์ด (MIDI) 4 ห้องวนไป
const PROG = {
  chill: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]],
  upbeat: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
  story: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],
  corp: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]],
  serious: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
};

let noiseB = null;
function noise(ctx) { if (noiseB && noiseB.sampleRate === ctx.sampleRate) return noiseB; const n = ctx.sampleRate; noiseB = ctx.createBuffer(1, n, n); const d = noiseB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseB; }
function tone(ctx, out, f, t, dur, { type = 'sine', vol = 0.2, a = 0.01, r = 0.3, detune = 0 } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setValueAtTime(vol, t + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + r + 0.05);
}
function kick(ctx, out, t, v = 0.9) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18); const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g).connect(out); o.start(t); o.stop(t + 0.35); }
function hit(ctx, out, t, { f = 7000, type = 'highpass', v = 0.15, d = 0.05, q = 0.7 } = {}) { const s = ctx.createBufferSource(); s.buffer = noise(ctx); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02); }

/** แต่งเพลงยาว dur วินาที → AudioBuffer (สเตอริโอ 44.1kHz) */
export async function renderMusic(genre = 'chill', dur = 30) {
  const G = GENRES[genre] || GENRES.chill; const sr = 44100; dur = Math.min(180, Math.max(4, dur));
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ctx.destination);
  const master = ctx.createGain(); master.gain.setValueAtTime(0.0001, 0); master.gain.linearRampToValueAtTime(0.9, 0.6); master.gain.setValueAtTime(0.9, Math.max(0.7, dur - 1.2)); master.gain.linearRampToValueAtTime(0.0001, dur); master.connect(comp);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = genre === 'chill' ? 2600 : genre === 'serious' ? 1800 : 9000; lp.connect(master);
  const drums = ctx.createGain(); drums.gain.value = genre === 'serious' ? 0.5 : 1; drums.connect(master);
  const beat = 60 / G.bpm; const bar = beat * 4; const prog = PROG[genre] || PROG.chill;
  for (let b = 0, t0 = 0; t0 < dur; b++, t0 += bar) {
    const ch = prog[b % prog.length];
    // คอร์ด/แพด
    if (genre === 'serious') ch.forEach((n, i) => { tone(ctx, lp, NOTE(n), t0, bar, { type: 'sawtooth', vol: 0.035, a: 0.8, r: 0.8, detune: i % 2 ? 7 : -7 }); tone(ctx, lp, NOTE(n - 12), t0, bar, { type: 'sine', vol: 0.05, a: 0.6, r: 0.6 }); });
    else if (genre === 'chill') ch.forEach((n) => { tone(ctx, lp, NOTE(n), t0, bar * 0.9, { type: 'triangle', vol: 0.05, a: 0.04, r: 0.6 }); tone(ctx, lp, NOTE(n + 12), t0 + 0.01, bar * 0.6, { type: 'sine', vol: 0.018, a: 0.02, r: 0.5 }); });
    else if (genre === 'corp') for (let i = 0; i < 8; i++) { const n = ch[i % ch.length] + (i >= 4 ? 12 : 0); tone(ctx, lp, NOTE(n), t0 + i * beat / 2, beat * 0.45, { type: 'triangle', vol: 0.06, a: 0.005, r: 0.35 }); }
    else if (genre === 'story') for (let i = 0; i < 8; i++) { const n = ch[[0, 1, 2, 1, 0, 2, 1, 2][i] % ch.length] + 12; tone(ctx, lp, NOTE(n), t0 + i * beat / 2, 0.08, { type: 'triangle', vol: 0.07, a: 0.003, r: 0.45 }); }
    else { ch.forEach((n) => [0, 1.5, 2.5, 3.5].forEach((p) => tone(ctx, lp, NOTE(n + 12), t0 + p * beat, beat * 0.3, { type: 'square', vol: 0.014, a: 0.005, r: 0.12 }))); }
    // เบส
    const root = ch[0] - 24;
    if (genre === 'upbeat') for (let i = 0; i < 8; i++) tone(ctx, master, NOTE(root + (i % 2 ? 12 : 0)), t0 + i * beat / 2, beat * 0.4, { type: 'triangle', vol: 0.13, a: 0.005, r: 0.08 });
    else if (genre !== 'serious') { tone(ctx, master, NOTE(root), t0, beat * 1.8, { type: 'sine', vol: 0.16, a: 0.01, r: 0.2 }); tone(ctx, master, NOTE(root + 7), t0 + beat * 2, beat * 1.8, { type: 'sine', vol: 0.13, a: 0.01, r: 0.2 }); }
    else tone(ctx, master, NOTE(root), t0, bar, { type: 'sine', vol: 0.12, a: 0.3, r: 0.5 });
    // กลอง
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * beat;
      if (genre === 'upbeat') { kick(ctx, drums, t, 0.8); if (i % 2) hit(ctx, drums, t, { f: 1800, type: 'bandpass', v: 0.32, d: 0.14, q: 0.8 }); hit(ctx, drums, t + beat / 2, { v: 0.09 }); }
      else if (genre === 'chill') { if (i === 0 || i === 2.5) kick(ctx, drums, t, 0.55); if (i === 2) kick(ctx, drums, t + beat / 2, 0.4); if (i % 2) hit(ctx, drums, t, { f: 2200, type: 'bandpass', v: 0.12, d: 0.18, q: 0.5 }); hit(ctx, drums, t, { v: 0.05 }); hit(ctx, drums, t + beat / 2, { v: 0.035 }); }
      else if (genre === 'corp') { if (i % 2 === 0) kick(ctx, drums, t, 0.6); if (i % 2) hit(ctx, drums, t, { f: 1500, type: 'bandpass', v: 0.2, d: 0.1 }); hit(ctx, drums, t + beat / 2, { v: 0.05 }); }
      else if (genre === 'story') { if (i === 0 || i === 2) kick(ctx, drums, t, 0.45); hit(ctx, drums, t + beat / 2, { v: 0.04 }); }
      else if (i === 0) kick(ctx, drums, t, 0.5);
    }
  }
  return ctx.startRendering();
}
/** เลือกแนวเพลงให้อัตโนมัติจากสไตล์และเนื้อหา */
export function autoGenre(P) {
  const text = P.chunks.map((c) => c.text).join(' ');
  if (/ป่วย|เสียชีวิต|มะเร็ง|สูญเสีย|จากไป|โรคร้าย/.test(text)) return 'serious';
  return { neon: 'upbeat', grid: 'story', aom: 'corp', clean: 'chill' }[P.style] || 'chill';
}
