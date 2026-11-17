// ─── ถอดเสียงเป็นซับ (ทำในเครื่อง) ───
// ใช้โมเดล Whisper ที่ฝึกกับภาษาไทยโดยเฉพาะ + เวลาระดับตัวอักษร (cross-attention DTW) ผ่าน Transformers.js
// ทดสอบกับเสียงพูดไทยจริงแล้ว: ได้ข้อความครบประโยคและเวลาละเอียด 0.02 วินาที
import { EMOJI } from '../../data/emoji.js';
import { charsFromAsr, cleanChars, vlen } from './subs.js';

const TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6';
export const ASR_MODELS = {
  thsmall: { id: 'supersuphot/distill-whisper-th-small-timestamped', name: 'ไทย · เบา', size: 'ประมาณ 170MB', sub: 'เร็ว เหมาะกับมือถือ' },
  typhoon: { id: 'supersuphot/typhoon-whisper-turbo-timestamped', name: 'ไทย · แม่นที่สุด', size: 'ประมาณ 820MB', sub: 'แนะนำบนคอม · ศัพท์อังกฤษ/ตัวเลขดีกว่า' },
};
export const defaultModel = () => (matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory || 4) < 8 ? 'thsmall' : 'typhoon');
let pipe = null, pipeId = null;

async function loadPipe(model, onStatus, onProgress) {
  const M = ASR_MODELS[model] || ASR_MODELS.thsmall;
  if (pipe && pipeId === M.id) return pipe;
  onStatus?.('กำลังโหลดโมเดลถอดเสียงภาษาไทย (' + M.size + ' ครั้งแรกเท่านั้น)…');
  const T = await import(/* @vite-ignore */ TF);
  T.env.allowLocalModels = false;
  const files = {};
  if (pipe?.dispose) { try { await pipe.dispose(); } catch {} } pipe = null;
  pipe = await T.pipeline('automatic-speech-recognition', M.id, {
    dtype: 'q8', device: 'wasm',
    progress_callback: (p) => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const v = Object.values(files); onProgress?.(v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0)); } },
  });
  pipeId = M.id; return pipe;
}

/** หาช่วงพูดจากเสียง 16kHz (ระดับเสียง) → [{a,b}] วินาที */
export function speechChunks(pcm, sr = 16000, { gap = 0.35, pad = 0.15 } = {}) {
  const win = Math.round(sr * 0.02), n = Math.floor(pcm.length / win); const rms = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = i * win, e = j + win; j < e; j++) s += pcm[j] * pcm[j]; rms[i] = Math.sqrt(s / win); }
  const sorted = Float32Array.from(rms).sort(); const lo = sorted[Math.floor(n * 0.1)] || 0, hi = sorted[Math.floor(n * 0.92)] || 0; const thr = Math.max(0.004, lo + (hi - lo) * 0.16);
  const raw = []; let st = -1;
  for (let i = 0; i <= n; i++) { const on = i < n && rms[i] > thr; if (on && st < 0) st = i; if (!on && st >= 0) { raw.push([st, i]); st = -1; } }
  const merged = []; for (const r of raw) { const l = merged[merged.length - 1]; if (l && (r[0] - l[1]) * 0.02 < gap) l[1] = r[1]; else merged.push([...r]); }
  const dur = pcm.length / sr;
  return merged.filter((r) => (r[1] - r[0]) * 0.02 > 0.2).map(([a, b]) => ({ a: Math.max(0, a * 0.02 - pad), b: Math.min(dur, b * 0.02 + pad) }));
}
/** แบ่งเสียงเป็นหน้าต่าง ≤ 28 วิ โดยตัดตรงช่วงเงียบ (ไม่ตัดกลางคำ) */
function windows(pcm) {
  const dur = pcm.length / 16000; if (dur <= 29) return [[0, dur]];
  const sp = speechChunks(pcm, 16000, { gap: 0.25, pad: 0.1 }); const out = []; let a = 0;
  while (dur - a > 29) {
    const gaps = []; for (let i = 0; i < sp.length - 1; i++) { const g = (sp[i].b + sp[i + 1].a) / 2; if (g > a + 8 && g < a + 28) gaps.push([sp[i + 1].a - sp[i].b, g]); }
    const cut = gaps.length ? gaps.sort((x, y) => y[0] - x[0] || y[1] - x[1])[0][1] : a + 27;
    out.push([a, cut]); a = cut;
  }
  out.push([a, dur]); return out;
}
const looped = (text) => /(.{1,12}?)\1{4,}/s.test(text);

/**
 * pcm (Float32Array 16kHz) → ตัวอักษรพร้อมเวลา [{c,t0,t1}] (ครบทุกคำที่ได้ยิน ไม่ตัดอะไรทิ้ง)
 * onStatus(text) · onProgress(0..1 | -1)
 */
export async function transcribeChars(pcm, { model = 'thsmall', onStatus, onProgress } = {}) {
  if (window.__ASR_CHARS) return cleanChars(charsFromAsr(await window.__ASR_CHARS(pcm)));
  const p = await loadPipe(model, onStatus, onProgress);
  const wins = windows(pcm); let out = [];
  for (let k = 0; k < wins.length; k++) {
    const [a, b] = wins[k]; const slice = pcm.subarray(Math.floor(a * 16000), Math.floor(b * 16000));
    onStatus?.(wins.length > 1 ? `กำลังฟังและเขียนซับ… ส่วน ${k + 1}/${wins.length}` : 'กำลังฟังและเขียนซับ… (ใช้เวลาประมาณ 2–4 เท่าของความยาวคลิป)'); onProgress?.(wins.length > 1 ? k / wins.length : -1);
    const opt = { language: 'thai', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30 };
    let r = await p(slice, opt);
    if (looped(r.text || '')) r = await p(slice, { ...opt, repetition_penalty: 1.2, no_repeat_ngram_size: 12 }); // วนคำ: ถอดใหม่แบบกันซ้ำ
    out = out.concat(charsFromAsr(r.chunks, a));
    if (out.length && k < wins.length - 1) out.push({ c: ' ', t0: b, t1: b });
  }
  onProgress?.(1);
  return cleanChars(out);
}

const NUM = /\d[\d,.]*\s*(?:%|เปอร์เซ็นต์|บาท|ล้าน|แสน|หมื่น|พัน|ปี|เดือน|วัน|เท่า|คน)?/;
const KWS = EMOJI.flatMap((e) => e[3].split('|')).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
/** หาคำเด่น 1 จุดต่อบรรทัด → ช่วงตัวอักษร [start, end) ในข้อความบรรทัด หรือ null */
function keySpan(text) {
  if (vlen(text) < 6) return null;
  const m = text.match(NUM); if (m && m[0].trim().length >= 2) return [m.index, m.index + m[0].trimEnd().length];
  const k = KWS.find((w) => text.includes(w)); if (k) { const i = text.indexOf(k); return [i, i + k.length]; }
  return null;
}
/** ใส่คำเด่นให้ทีละบรรทัด (ตัวเลข หรือคำเรื่องเงิน/ประกัน) — แก้ chunks ในตัว */
export function markKeys(chunks) {
  const lines = [...new Set(chunks.map((c) => c.line))];
  for (const ln of lines) {
    const cs = chunks.filter((c) => c.line === ln); if (cs.some((c) => c.words.some((w) => w.key))) continue;
    const text = cs.map((c) => c.text).join('\u0001'); const sp = keySpan(text.replace(/\u0001/g, ' ')); if (!sp) continue;
    let pos = 0; for (const c of cs) { for (const w of c.words) { const a = pos, b = pos + w.w.length; if (w.w.trim() && a < sp[1] && b > sp[0]) w.key = true; pos = b; } pos += 1; }
  }
  return chunks;
}
/** (ใช้กับแคปชั่นเดิม) ใส่ *คำเด่น* ในบรรทัดข้อความ */
export function autoKeys(line) { if (line.includes('*')) return line; const sp = keySpan(line); return sp ? line.slice(0, sp[0]) + '*' + line.slice(sp[0], sp[1]) + '*' + line.slice(sp[1]) : line; }

// ── พจนานุกรมคำแก้ของผู้ใช้ ("ผิด=ถูก" บรรทัดละคู่) ──
const DKEY = 'advdesk.v1.subdict';
export const getDictText = () => { try { return localStorage.getItem(DKEY) || ''; } catch { return ''; } };
export const setDictText = (t) => { try { localStorage.setItem(DKEY, t); } catch {} };
export const userDict = () => getDictText().split('\n').map((l) => l.split('=').map((x) => x.trim())).filter((p) => p.length === 2 && p[0] && p[1]);
