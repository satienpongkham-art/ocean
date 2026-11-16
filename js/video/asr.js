// ─── ถอดซับ ───
// 1) ซับสดตอนอัดในแอป: ระบบฟังเสียงภาษาไทยของ Chrome (ส่งเสียงไป Google) → จัดเวลาให้ตรงเสียงจริง
// 2) คลิปที่มีอยู่แล้ว: Whisper ในเครื่อง ถอดทีละช่วงพูดสั้น ๆ + กันวนคำซ้ำ
import { EMOJI } from '../../data/emoji.js';
import { parseScript, visLen } from './engine.js';

const TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6';
export const ASR_MODELS = {
  small: { id: 'onnx-community/whisper-small', name: 'แม่นกว่า (แนะนำ)', size: 'ประมาณ 250MB', sub: 'ภาษาไทยดีกว่า · ช้ากว่า' },
  base: { id: 'onnx-community/whisper-base', name: 'เร็ว', size: 'ประมาณ 80MB', sub: 'มือถือรุ่นเก่า · ผิดบ่อยกว่า' },
};
let pipe = null, pipeId = null;

// ── ทำความสะอาดผลถอดเสียง ──
const HALLU = /ขอบคุณที่รับชม|ติดตามช่อง|กดไลค์|กดติดตาม|subtitles? by|amara|ซับไตเติ้ลโดย|โปรดติดตาม/i;
export function cleanText(t = '') {
  let s = t.replace(/[[(（][^\])）]{0,30}[\])）]/g, ' ').replace(/[♪♫]/g, ' ').trim();
  for (let i = 0; i < 3; i++) s = s.replace(/(.{1,10}?)(?:\s*\1){3,}/g, '$1'); // คำ/พยางค์ซ้ำติดกันเกิน 3 ครั้ง → เหลือครั้งเดียว
  s = s.replace(/(\S+)(\s+\1){2,}/g, '$1').replace(/\s+/g, ' ').trim();
  return s;
}
/** ผลถอดเสียงน่าสงสัย (วนคำ / คำหลอน / สั้นผิดปกติเทียบกับความยาวเสียง) */
export function isBad(raw, clean, dur) {
  if (!clean || HALLU.test(clean)) return true;
  if (raw && clean.length < raw.trim().length * 0.5) return true;
  if (dur > 2.5 && visLen(clean) < 2) return true;
  const chars = clean.replace(/\s/g, ''); if (chars.length > 12 && new Set(chars).size / chars.length < 0.18) return true;
  return false;
}

// ── หาช่วงพูดจากเสียง 16kHz ──
export function speechChunks(pcm, sr = 16000, { gap = 0.35, pad = 0.15, maxLen = 14 } = {}) {
  const win = Math.round(sr * 0.02), n = Math.floor(pcm.length / win); const rms = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = i * win, e = j + win; j < e; j++) s += pcm[j] * pcm[j]; rms[i] = Math.sqrt(s / win); }
  const sorted = Float32Array.from(rms).sort(); const lo = sorted[Math.floor(n * 0.1)] || 0, hi = sorted[Math.floor(n * 0.92)] || 0; const thr = Math.max(0.004, lo + (hi - lo) * 0.16);
  const raw = []; let st = -1;
  for (let i = 0; i <= n; i++) { const on = i < n && rms[i] > thr; if (on && st < 0) st = i; if (!on && st >= 0) { raw.push([st, i]); st = -1; } }
  const merged = []; for (const r of raw) { const l = merged[merged.length - 1]; if (l && (r[0] - l[1]) * 0.02 < gap) l[1] = r[1]; else merged.push([...r]); }
  const out = [];
  for (let [a, b] of merged.filter((r) => (r[1] - r[0]) * 0.02 > 0.2)) {
    // ช่วงยาวเกิน แบ่งตรงจุดเสียงเบาที่สุด
    while ((b - a) * 0.02 > maxLen) { let best = a + Math.round(6 / 0.02), bv = 1e9; for (let i = a + Math.round(6 / 0.02); i < a + Math.round(maxLen / 0.02); i++) if (rms[i] < bv) { bv = rms[i]; best = i; } out.push([a, best]); a = best; }
    out.push([a, b]);
  }
  const dur = pcm.length / sr;
  return out.map(([a, b]) => ({ a: Math.max(0, a * 0.02 - pad), b: Math.min(dur, b * 0.02 + pad) }));
}

async function loadPipe(model, onStatus, onProgress) {
  const M = ASR_MODELS[model] || ASR_MODELS.small;
  if (pipe && pipeId === M.id) return pipe;
  onStatus?.('กำลังโหลดโมเดลถอดเสียง (' + M.size + ' ครั้งแรกเท่านั้น)…');
  const T = await import(/* @vite-ignore */ TF);
  T.env.allowLocalModels = false;
  const files = {};
  pipe = await T.pipeline('automatic-speech-recognition', M.id, {
    dtype: 'q8', device: 'wasm',
    progress_callback: (p) => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const v = Object.values(files); onProgress?.(v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0)); } },
  });
  pipeId = M.id; return pipe;
}

/**
 * pcm: Float32Array 16kHz → [{text, s, e}] (วินาที นับจากต้น pcm)
 * ranges: ช่วงพูด (ถ้าไม่ส่ง จะหาให้) · ถอดทีละช่วงเพื่อไม่ให้วนคำ · ช่วงที่ถอดไม่ได้คืน {text:'', bad:true}
 */
export async function transcribe(pcm, { model = 'small', ranges, onStatus, onProgress } = {}) {
  ranges ||= speechChunks(pcm);
  if (window.__ASR) return window.__ASR(pcm, ranges); // ใช้ตอนทดสอบ
  const p = await loadPipe(model, onStatus, onProgress);
  const out = [];
  for (let k = 0; k < ranges.length; k++) {
    const { a, b } = ranges[k]; const dur = b - a; const slice = pcm.subarray(Math.floor(a * 16000), Math.floor(b * 16000));
    onStatus?.(`กำลังฟังและเขียนซับ… ช่วง ${k + 1}/${ranges.length}`); onProgress?.(k / ranges.length);
    const opt = { language: 'thai', task: 'transcribe', return_timestamps: false, no_repeat_ngram_size: 4, repetition_penalty: 1.15, max_new_tokens: Math.min(220, Math.ceil(dur * 14) + 8) };
    let raw = (await p(slice, opt)).text || ''; let txt = cleanText(raw);
    if (isBad(raw, txt, dur)) { raw = (await p(slice, { ...opt, do_sample: true, temperature: 0.4, top_k: 30 })).text || ''; txt = cleanText(raw); }
    out.push(isBad(raw, txt, dur) ? { text: '', s: a, e: b, bad: true } : { text: txt, s: a, e: b });
  }
  onProgress?.(1);
  return out;
}

/** ซับสดจาก Chrome (เวลาโดยประมาณ) → จัดให้ตรงช่วงเสียงพูดจริง */
export function snapLive(live, speech) {
  return live.filter((x) => x.text?.trim()).map((x) => {
    let s = x.s, e = x.e;
    const st = speech.filter((r) => r.a >= s - 1.4 && r.a <= s + 0.4).sort((p, q) => Math.abs(p.a - s) - Math.abs(q.a - s))[0]; if (st) s = st.a;
    const en = speech.filter((r) => r.b >= e - 1.6 && r.b <= e + 0.4 && r.b > s).sort((p, q) => Math.abs(p.b - e) - Math.abs(q.b - e))[0]; if (en) e = en.b;
    return { text: cleanText(x.text), s: Math.max(0, s), e: Math.max(s + 0.4, e) };
  }).sort((a, b) => a.s - b.s).map((x, i, arr) => (arr[i + 1] && x.e > arr[i + 1].s ? { ...x, e: arr[i + 1].s } : x));
}

const NUM = /\d[\d,.]*\s*(?:%|เปอร์เซ็นต์|บาท|ล้าน|แสน|หมื่น|พัน|ปี|เดือน|วัน|เท่า|คน)?/;
const KWS = EMOJI.flatMap((e) => e[3].split('|')).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
/** ใส่ *คำเด่น* ให้อัตโนมัติ บรรทัดละไม่เกิน 1 คำ (ตัวเลข หรือคำสำคัญเรื่องเงิน/ประกัน) */
export function autoKeys(line) {
  if (line.includes('*') || visLen(line) < 6) return line;
  const m = line.match(NUM); if (m && m[0].trim().length >= 2) return line.replace(m[0].trim(), `*${m[0].trim()}*`);
  const k = KWS.find((w) => line.includes(w)); return k ? line.replace(k, `*${k}*`) : line;
}
/** ผลถอดเสียง [{text,s,e}] (เวลาในคลิปที่ส่งออก) → บท + ช่วงซับพร้อมเวลา */
export function segsToChunks(segs) {
  const lines = []; const spans = [];
  for (const s of segs.filter((x) => x.text)) {
    const parts = []; let cur = '';
    for (const w of s.text.split(/\s+/)) { if (cur && visLen(cur + w) > 34) { parts.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) parts.push(cur);
    const tot = parts.reduce((a, p) => a + visLen(p), 0) || 1; let t = s.s;
    for (const p of parts) { const d = (s.e - s.s) * visLen(p) / tot; lines.push(autoKeys(p)); spans.push([t, t + d]); t += d; }
  }
  const script = lines.join('\n');
  const chunks = parseScript(script);
  for (let li = 0; li < lines.length; li++) {
    const cs = chunks.filter((c) => c.line === li); const [a, b] = spans[li]; const tot = cs.reduce((x, c) => x + visLen(c.text) + 1, 0) || 1; let t = a;
    for (const c of cs) { const d = (b - a) * (visLen(c.text) + 1) / tot; c.t0 = +t.toFixed(2); c.t1 = +(t + d).toFixed(2); t += d; }
  }
  return { script, chunks };
}
