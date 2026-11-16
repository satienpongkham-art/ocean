// ─── ถอดซับจากเสียงในเครื่อง (Whisper ผ่าน Transformers.js) — ไม่ส่งเสียงไปเซิร์ฟเวอร์ ───
// โหลดโมเดลครั้งแรกจากอินเทอร์เน็ต แล้วเบราว์เซอร์เก็บแคชไว้ใช้ครั้งต่อไป
import { EMOJI } from '../../data/emoji.js';
import { parseScript, visLen } from './engine.js';

const TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6';
export const ASR_MODELS = {
  small: { id: 'onnx-community/whisper-small', name: 'แม่นกว่า', size: 'ประมาณ 250MB', sub: 'แนะนำบนคอม · ภาษาไทยดีกว่า' },
  base: { id: 'onnx-community/whisper-base', name: 'เร็ว', size: 'ประมาณ 80MB', sub: 'มือถือรุ่นเก่า · อาจผิดมากกว่า' },
};
let pipe = null, pipeId = null;

/** pcm: Float32Array 16kHz → [{text, s, e}] */
export async function transcribe(pcm, { model = 'small', onStatus, onProgress } = {}) {
  if (window.__ASR) return window.__ASR(pcm); // ใช้ตอนทดสอบ
  const M = ASR_MODELS[model] || ASR_MODELS.small;
  if (!pipe || pipeId !== M.id) {
    onStatus?.('กำลังโหลดโมเดลถอดเสียง (' + M.size + ' ครั้งแรกเท่านั้น)…');
    const T = await import(/* @vite-ignore */ TF);
    T.env.allowLocalModels = false;
    const files = {};
    pipe = await T.pipeline('automatic-speech-recognition', M.id, {
      dtype: 'q8', device: 'wasm',
      progress_callback: (p) => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const v = Object.values(files); onProgress?.(v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0)); } },
    });
    pipeId = M.id;
  }
  onStatus?.('กำลังฟังและเขียนซับ… (คลิป 30 วินาที ใช้เวลาประมาณ 20 วินาที–2 นาที)'); onProgress?.(-1);
  const out = await pipe(pcm, { language: 'thai', task: 'transcribe', return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
  const dur = pcm.length / 16000;
  const segs = (out.chunks || []).map((c) => ({ text: (c.text || '').trim(), s: c.timestamp?.[0] ?? 0, e: c.timestamp?.[1] ?? dur })).filter((c) => c.text);
  return segs.length ? segs : [{ text: (out.text || '').trim(), s: 0, e: dur }];
}

const NUM = /\d[\d,.]*\s*(?:%|เปอร์เซ็นต์|บาท|ล้าน|แสน|หมื่น|พัน|ปี|เดือน|วัน|เท่า|คน)?/;
const KWS = EMOJI.flatMap((e) => e[3].split('|')).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
/** ใส่ *คำเด่น* ให้อัตโนมัติ บรรทัดละไม่เกิน 1 คำ (ตัวเลข หรือคำสำคัญเรื่องเงิน/ประกัน) */
export function autoKeys(line) {
  if (line.includes('*') || visLen(line) < 6) return line;
  const m = line.match(NUM); if (m && m[0].trim().length >= 2) return line.replace(m[0].trim(), `*${m[0].trim()}*`);
  const k = KWS.find((w) => line.includes(w)); return k ? line.replace(k, `*${k}*`) : line;
}
/** ผลถอดเสียง → บท + ช่วงซับพร้อมเวลา */
export function segsToChunks(segs) {
  const lines = []; const spans = [];
  for (const s of segs) {
    // ประโยคยาวเกินไป แบ่งตามช่องว่างให้เป็นหลายบรรทัด (หลายช็อต)
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
