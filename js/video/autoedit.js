// ─── ตัดต่อให้เลย: อัดหรือใส่คลิปแล้ว แอปทำต่อเองจนจบ ───
// ตัดช่วงเงียบ · ตัดเทคเสีย/คำเติม · คุมความยาว · เขียนซับ · ปรับเสียง/ภาพ · ครอปตามหน้า · จัดเอฟเฟกต์ · แคปชั่น
import { segList, visLen } from './engine.js';
import { autoAll } from './smart.js';
import { RISKY } from '../../data/studio.js';

export const STEPS = [['audio', 'ฟังเสียง หาช่วงพูด'], ['look', 'ปรับภาพ และหาตำแหน่งหน้า'], ['asr', 'ถอดเสียงทุกคำ พร้อมเวลา'], ['cut', 'หาจุดตัด'], ['deco', 'จัดซับและตกแต่ง'], ['cap', 'เขียนแคปชั่นและแฮชแท็ก']];
export const WHY = { silence: 'ช่วงเงียบ', retake: 'พูดซ้ำ/เทคเสีย', filler: 'คำเติม (เอ่อ อ่า)', length: 'ตัดให้พอดีความยาว', unclear: 'ฟังไม่ออก' };
const FILLER = /^(?:เอ่อ|เออ|อ่า|อา|อืม|เอิ่ม|อ้า|แบบ|แบบว่า|คือ|คือแบบ|อ่ะ|เอ่|ครับ|ค่ะ|คะ|นะ|ฮะ|โอเค|\s|[.,!?…])+$/;
const norm = (s) => s.replace(/[\s.,!?…"'“”()]/g, '');
function dice(a, b) { a = norm(a); b = norm(b); if (a.length < 2 || b.length < 2) return 0; const g = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; }; const A = g(a), B = g(b); let inter = 0; for (const [k, v] of A) inter += Math.min(v, B.get(k) || 0); return (2 * inter) / (a.length + b.length - 2); }

/** ภาพมืด/ซีดไหม → ฟิลเตอร์ปรับแสงสี (สุ่มดู 5 เฟรม) */
async function analyzeLook(url) {
  const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = url;
  await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 5000); });
  if (!v.videoWidth) return { look: '', landscape: false };
  const c = document.createElement('canvas'); c.width = 48; c.height = 48; const x = c.getContext('2d', { willReadFrequently: true }); let sum = 0, sq = 0, n = 0, sat = 0;
  for (let k = 1; k <= 5; k++) {
    await new Promise((r) => { v.onseeked = r; v.currentTime = v.duration * k / 6; setTimeout(r, 1500); });
    x.drawImage(v, 0, 0, 48, 48); const d = x.getImageData(0, 0, 48, 48).data;
    for (let i = 0; i < d.length; i += 4) { const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; sum += l; sq += l * l; n++; sat += (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255; }
  }
  const mean = sum / n, sd = Math.sqrt(sq / n - mean * mean), s = sat / n;
  const b = Math.max(0.92, Math.min(1.4, 0.5 / Math.max(0.05, mean))); const ct = sd < 0.16 ? 1.12 : sd < 0.22 ? 1.06 : 1; const st = s < 0.18 ? 1.18 : s < 0.28 ? 1.1 : 1;
  const look = [Math.abs(b - 1) > 0.03 ? `brightness(${b.toFixed(2)})` : '', ct !== 1 ? `contrast(${ct})` : '', st !== 1 ? `saturate(${st})` : ''].filter(Boolean).join(' ');
  const res = { look, landscape: v.videoWidth > v.videoHeight * 1.05, v };
  return res;
}
/** คลิปแนวนอน: หาตำแหน่งคนในแต่ละช่วง (ใช้ตัวตัดฉากหลังหา mask แล้วหาจุดกึ่งกลาง) */
async function trackFace(v) {
  const S = await import('./segment.js'); await S.load();
  const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d', { willReadFrequently: true });
  const centroid = (m) => { x.clearRect(0, 0, 64, 36); x.drawImage(m, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let wa = 0, sa = 0, wr = 0, sr = 0; for (let i = 0; i < d.length; i += 4) { const px = (i / 4) % 64; wa += d[i + 3] * px; sa += d[i + 3]; wr += d[i] * px; sr += d[i]; } const useA = sa > 0 && sa < 255 * 64 * 36 * 0.98; const w = useA ? wa / sa : sr > 0 ? wr / sr : 32; return w / 63; };
  const out = []; const step = Math.max(0.6, v.duration / 40);
  for (let t = 0.1; t < v.duration; t += step) { await new Promise((r) => { v.onseeked = r; v.currentTime = t; setTimeout(r, 1500); }); const cx = await S.maskOnce(v, centroid); if (cx != null && isFinite(cx)) out.push([+t.toFixed(2), +cx.toFixed(3)]); }
  // ทำให้นุ่มนวล (ไม่กระตุก)
  return out.map(([t], i) => { const w = out.slice(Math.max(0, i - 2), i + 3); return [t, +(w.reduce((a, p) => a + p[1], 0) / w.length).toFixed(3)]; });
}

/** สร้างช่วงที่ใช้จากคลิป + จุดตัด */
export function deriveSegs(P) {
  return P.clips.flatMap((c) => {
    const lo = c.in ?? 0, hi = c.out ?? c.dur ?? 0; if (!(hi > lo)) return [];
    const cuts = (P.cuts || []).filter((x) => x.on && x.clip === c.id).map((x) => [Math.max(lo, x.a), Math.min(hi, x.b)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
    const out = []; let t = lo;
    for (const [a, b] of cuts) { if (a > t + 0.15) out.push({ clip: c.id, a: +t.toFixed(2), b: +a.toFixed(2) }); t = Math.max(t, b); }
    if (hi > t + 0.15) out.push({ clip: c.id, a: +t.toFixed(2), b: +hi.toFixed(2) });
    return out;
  });
}
/** จุดตัดช่วงเงียบ = ส่วนที่ไม่ใช่ช่วงพูด */
export function silenceCuts(clip, speech) {
  const lo = clip.in ?? 0, hi = clip.out ?? clip.dur; const out = []; let t = lo;
  for (const r of speech) { if (r.a - t > 0.4) out.push({ clip: clip.id, a: +t.toFixed(2), b: +r.a.toFixed(2), why: 'silence', on: true }); t = Math.max(t, r.b); }
  if (hi - t > 0.4) out.push({ clip: clip.id, a: +t.toFixed(2), b: +hi.toFixed(2), why: 'silence', on: true });
  return out;
}

/** แคปชั่น + แฮชแท็ก + คำที่ควรตรวจ */
export function makeCaption(P, profile) {
  const lines = (P.script || '').split('\n').map((l) => l.replace(/\*/g, '').trim()).filter(Boolean);
  const text = lines.join(' ');
  const tags = ['#ประกัน', '#วางแผนการเงิน'];
  for (const [re, t] of [[/สุขภาพ|โรงพยาบาล|ค่ารักษา|แอดมิท/, '#ประกันสุขภาพ'], [/ภาษี|ลดหย่อน/, '#ลดหย่อนภาษี'], [/เกษียณ/, '#วางแผนเกษียณ'], [/ออม|เก็บเงิน/, '#ออมเงิน'], [/มะเร็ง|โรคร้าย/, '#โรคร้ายแรง'], [/ลูก|ครอบครัว/, '#ครอบครัว'], [/อุบัติเหตุ/, '#ประกันอุบัติเหตุ'], [/ลงทุน|ดอกเบี้ย|ทบต้น/, '#ความรู้การเงิน']]) if (re.test(text) && !tags.includes(t)) tags.push(t);
  tags.push('#รู้หรือไม่', '#สาระน่ารู้');
  const body = lines.slice(1, 4).map((l) => '• ' + l).join('\n');
  const sign = profile ? `\n\n— ${profile.name || ''}${profile.licenseLife ? ' · ใบอนุญาตเลขที่ ' + profile.licenseLife : ''}${profile.line ? ' · LINE ' + profile.line : ''}` : '';
  const caption = `${lines[0] || P.title}\n\n${body}\n\nสงสัยตรงไหน คอมเมนต์ถาม หรือทักมาคุยได้เลย${sign}\n\n${tags.slice(0, 7).join(' ')}`;
  const risks = (RISKY || []).map(([re, label, tip]) => { const m = text.match(re); return m ? { found: m[0], label, tip } : null; }).filter(Boolean);
  return { caption, risks };
}

/** ถอดเสียงทุกคลิป → คำพร้อมเวลา (เวลาในคลิปต้นฉบับ) · ใช้ซับสด/บทเป็นข้อความอ้างอิงถ้ามี */
async function sourceWords(P, clips, speech, env) {
  const { A, R, S, onStep = () => {} } = env; const out = {}; const dict = [...S.BUILTIN_DICT, ...R.userDict()];
  for (const c of clips) {
    const b = await env.getBlob(c); const pcm = await A.mono16(c.key, b);
    let chars = await R.transcribeChars(pcm, { model: env.model, onStatus: (t) => onStep('asr', t), onProgress: (p) => onStep('asr', null, p) });
    // ซับสดของ Google ตอนอัด (ถ้ามี) แม่นกว่าเรื่องตัวสะกด → ใช้เป็นข้อความ แล้วยืมเวลาจากเสียง
    const live = P.live?.[c.id]; if (live?.length && chars.length) { const al = S.alignText(live.map((x) => x.text).join(' '), chars); if (al.score > 0.5) chars = al.chars; }
    chars = S.applyDict(chars, dict);
    out[c.id] = S.snapToSpeech(S.wordsFromChars(chars), speech[c.id]);
  }
  return out;
}
const phrasesOf = (clip, words, gap = 0.45) => { const out = []; let cur = null; for (const w of words) { if (!cur || w.t0 - cur.e >= gap || w.sp && w.t0 - cur.e >= 0.2) { cur = { clip, text: '', s: w.t0, e: w.t1, words: [] }; out.push(cur); } cur.text += (w.sp && cur.words.length ? ' ' : '') + w.w; cur.e = w.t1; cur.words.push(w); } return out; };
/** คำ (เวลาต้นฉบับ) → ช่วงซับในเวลาของคลิปที่ส่งออก ตามช่วงที่ใช้อยู่ */
function buildSubs(P, src, dropped, env) {
  const { S, R } = env; const sl = segList(P); const ow = [];
  const toOut = (clip, v) => { const s = sl.find((x) => x.clip === clip && v >= x.a - 0.03 && v <= x.b + 0.03); return s ? s.o0 + Math.min(Math.max(v, s.a), s.b) - s.a : null; };
  let last = null; // คำก่อนหน้า (ต้นฉบับ) · br = ขึ้นช็อต/ประโยคใหม่: เปลี่ยนคลิป หรือเว้นเงียบจริง ≥ 0.6 วิ หรือมีการตัดคั่น
  for (const sg of sl) for (const w of src[sg.clip] || []) { if (dropped.has(w)) continue; const mid = (w.t0 + w.t1) / 2; if (mid < sg.a - 0.03 || mid > sg.b + 0.03) continue; const br = last && (last.clip !== sg.clip || w.t0 - last.t1 >= 0.6 || last.seg !== sg) ? 1 : 0; last = { clip: sg.clip, t1: w.t1, seg: sg }; ow.push({ ...w, br, t0: sg.o0 + Math.max(w.t0, sg.a) - sg.a, t1: sg.o0 + Math.min(w.t1, sg.b) - sg.a }); }
  void toOut;
  let chunks;
  if (env.useScript && (P.script || '').trim()) { // ใช้บทของเราเป็นซับ จับเวลาจากเสียง
    const hyp = ow.flatMap((w) => { const cs = [...w.w]; return cs.map((c, i) => ({ c, t0: w.t0 + (w.t1 - w.t0) * i / cs.length, t1: w.t0 + (w.t1 - w.t0) * (i + 1) / cs.length })); });
    const al = S.alignChunks(env.parseScript(P.script), hyp); chunks = al.chunks; P.alignScore = +al.score.toFixed(2);
  } else { chunks = R.markKeys(S.chunkWords(ow, { max: P.subMax || 18 })); P.script = lineText(chunks); }
  P.words = ow.map((w) => ({ w: w.w, t0: +w.t0.toFixed(2), t1: +w.t1.toFixed(2), sp: w.sp ? 1 : 0, ...(w.br ? { br: 1 } : {}) }));
  P.chunks = chunks.map((c) => ({ emoji: null, scene: 'cam', ...c }));
  return ow.length;
}
const lineText = (chunks) => { const L = []; for (const c of chunks) (L[c.line] ||= []).push(c.words.map((w) => (w.key ? `*${w.w.trim()}*` : w.w)).join('').trim()); return L.filter(Boolean).map((l) => l.join(' ')).join('\n'); };
/** แบ่งซับใหม่ตามความยาวที่เลือก (ใช้คำพร้อมเวลาที่เก็บไว้) */
export function rechunk(P, S, R) {
  if (!P.words?.length) return false;
  const ws = P.words.map((w) => ({ ...w, sp: !!w.sp, br: !!w.br })); P.chunks = R.markKeys(S.chunkWords(ws, { max: P.subMax || 18 })).map((c) => ({ emoji: null, scene: P.mode === 'voice' ? 'stage' : 'cam', ...c })); P.script = lineText(P.chunks); return true;
}

/**
 * ทำทั้งหมด · env: { getBlob(clip), urls, onStep(key, text, p), model, canCut, slideKinds, profile, A, R, S, parseScript,
 *   cutSilence (true), cutRetake (false), cutFiller (false), target (0 = ไม่จำกัด), useScript }
 * ค่าเริ่มต้น = เก็บทุกคำ ตัดแค่ช่วงเงียบ · แก้ P ในตัว คืนสรุป
 */
export async function autoEdit(P, env) {
  const { onStep = () => {}, A } = env; const sum = { cut: 0, retake: 0, filler: 0, length: 0, subs: 0, words: 0 };
  const clips = P.clips.filter((c) => env.urls[c.id]);
  // 1) ฟังเสียง
  onStep('audio', 'กำลังฟังเสียง…');
  const speech = {}; P.gain ||= {};
  for (const c of clips) { const b = await env.getBlob(c); speech[c.id] = await A.speechRanges(c.key, b, { gap: 0.3, pad: 0.06 }); P.gain[c.id] = await A.loudGain(c.key, b).catch(() => 1); }
  // 2) ภาพ
  onStep('look', 'กำลังปรับแสงสี…');
  P.looks ||= {}; P.tracks ||= {};
  if (P.mode === 'cam') for (const c of clips) {
    const r = await analyzeLook(env.urls[c.id]).catch(() => ({ look: '' })); P.looks[c.id] = r.look;
    if (r.landscape && r.v) { onStep('look', 'คลิปแนวนอน: กำลังหาตำแหน่งหน้าเพื่อครอปเป็นแนวตั้ง…'); P.tracks[c.id] = await trackFace(r.v).catch(() => null); }
  }
  // 3) ถอดเสียง: ได้ทุกคำพร้อมเวลา
  const src = await sourceWords(P, clips, speech, env);
  // 4) จุดตัด
  onStep('cut', 'กำลังหาจุดตัด…');
  const phr = clips.flatMap((c) => phrasesOf(c.id, src[c.id])); phr.forEach((x) => { x.drop = null; });
  const alive = () => phr.filter((x) => !x.drop);
  if (env.cutFiller) phr.forEach((x) => { if (FILLER.test(x.text) && x.e - x.s < 2.5) x.drop = 'filler'; });
  if (env.cutRetake) { const L = alive(); for (let i = 0; i < L.length; i++) for (let j = i + 1; j <= Math.min(L.length - 1, i + 2); j++) { if (L[j].clip !== L[i].clip || L[j].s - L[i].e > 6) break; const a = L[i].text, b = L[j].text; const pre = norm(a).slice(0, 6); if (dice(a, b) >= 0.55 || (norm(a).length >= 4 && norm(b).startsWith(pre) && norm(b).length >= norm(a).length * 0.7)) { L[i].drop = 'retake'; break; } } }
  if (env.target > 0) {
    const L = alive(); let tot = L.reduce((a, x) => a + (x.e - x.s) + 0.3, 0);
    const score = (x) => (/\d/.test(x.text) ? 3 : 0) + (/ประกัน|เงิน|ภาษี|สุขภาพ|ลูก|เกษียณ|คุ้มครอง|ค่ารักษา/.test(x.text) ? 2 : 0) + Math.min(2, visLen(x.text) / 20) - (x.e - x.s > 8 ? 1 : 0);
    const cand = L.slice(1, -1).sort((p, q) => score(p) - score(q));
    while (tot > env.target + 1.5 && cand.length) { const x = cand.shift(); x.drop = 'length'; tot -= (x.e - x.s) + 0.3; }
  }
  P.cuts = []; const dropped = new Set();
  for (const c of clips) {
    const mine = phr.filter((x) => x.clip === c.id);
    if (env.cutSilence !== false) {
      // ช่วงที่มีคำพูด (เผื่อจังหวะหายใจ) — ไม่ตัดกลางคำแน่นอนเพราะยึดเวลาของคำ
      const spoken = mine.map((x) => ({ a: Math.max(0, x.s - 0.16), b: x.e + 0.22 })); const merged = [];
      for (const r of (mine.length ? spoken : speech[c.id]).sort((p, q) => p.a - q.a)) { const l = merged[merged.length - 1]; if (l && r.a - l.b < 0.35) l.b = Math.max(l.b, r.b); else merged.push({ ...r }); }
      P.cuts.push(...silenceCuts(c, merged));
    }
    for (const x of mine.filter((y) => y.drop)) { P.cuts.push({ clip: c.id, a: +Math.max(0, x.s - 0.05).toFixed(2), b: +(x.e + 0.05).toFixed(2), why: x.drop, on: true, text: x.text }); x.words.forEach((w) => dropped.add(w)); }
  }
  P.cuts = P.cuts.map((x, i) => ({ id: 'k' + i, ...x }));
  P.silence = { on: env.cutSilence !== false, gap: 0.35 };
  P.segs = deriveSegs(P);
  // 5) ซับ (เวลาของคลิปที่ส่งออก) + ตกแต่ง
  onStep('deco', 'กำลังจัดซับและตกแต่ง…');
  sum.words = buildSubs(P, src, dropped, env);
  P.enhance = true; P.trimHead = true; P.trimTail = true;
  autoAll(P, { slideKinds: env.slideKinds || [], canCut: env.canCut });
  // 6) แคปชั่น
  onStep('cap', 'กำลังเขียนแคปชั่น…');
  const cap = makeCaption(P, env.profile); P.caption = cap.caption;
  for (const k of phr) { if (k.drop === 'retake') sum.retake++; if (k.drop === 'filler') sum.filler++; if (k.drop === 'length') sum.length++; }
  sum.subs = P.chunks.length; sum.cut = P.cuts.filter((x) => x.on).reduce((a, x) => a + x.b - x.a, 0);
  P.autoEdited = new Date().toISOString();
  return sum;
}
/** เขียนซับอย่างเดียว (ไม่แตะจุดตัด/การตกแต่ง) · ใช้กับปุ่ม "เขียนซับให้" และ "จับเวลาจากเสียง" */
export async function subtitleOnly(P, env) {
  const { A } = env; const clips = P.clips.filter((c) => env.urls[c.id]); const speech = {};
  for (const c of clips) { const b = await env.getBlob(c); speech[c.id] = await A.speechRanges(c.key, b, { gap: 0.3, pad: 0.06 }); }
  const src = await sourceWords(P, clips, speech, env);
  return buildSubs(P, src, new Set(), env);
}

/**
 * จัดจังหวะซับจากเสียงจริง (มีบทอยู่แล้ว): หาช่วงพูดในคลิปที่ส่งออก แล้ววางแต่ละบรรทัดลงช่วงพูดตามสัดส่วนความยาว
 * แม่นกว่าการเฉลี่ย เพราะซับจะไม่ขึ้นตอนเงียบ · คืน chunks ใหม่
 */
export async function alignToSpeech(P, getBlob, A) {
  const sl = segList(P); const ranges = [];
  for (const s of sl) { const b = await getBlob(s.clip); if (!b) continue; const rs = await A.speechRanges(s.key, b, { gap: 0.25, pad: 0.05 }); for (const r of rs) { const a = Math.max(r.a, s.a), e = Math.min(r.b, s.b); if (e - a > 0.12) ranges.push({ a: s.o0 + a - s.a, b: s.o0 + e - s.a }); } }
  if (!ranges.length) throw new Error('ไม่พบช่วงพูดในคลิป');
  const lines = [...new Set(P.chunks.map((c) => c.line))]; const lenOf = (ln) => P.chunks.filter((c) => c.line === ln).reduce((a, c) => a + visLen(c.text) + 1, 0);
  const totalChars = lines.reduce((a, ln) => a + lenOf(ln), 0); const totalSpeech = ranges.reduce((a, r) => a + r.b - r.a, 0);
  // เดินไปตามช่วงพูด: เวลาสะสมของคำพูด ↔ ตัวอักษรสะสม
  const at = (frac) => { let need = frac * totalSpeech; for (const r of ranges) { const d = r.b - r.a; if (need <= d) return r.a + need; need -= d; } return ranges[ranges.length - 1].b; };
  let acc = 0; const out = P.chunks.map((c) => ({ ...c }));
  for (const ln of lines) {
    for (const c of out.filter((x) => x.line === ln)) { const w = visLen(c.text) + 1; c.t0 = +at(acc / totalChars).toFixed(2); acc += w; c.t1 = +at(acc / totalChars).toFixed(2); }
    // บรรทัดใหม่มักเริ่มหลังช่วงเงียบ: ขยับจุดเริ่มไปที่ต้นช่วงพูดที่ใกล้ที่สุด
    const first = out.find((x) => x.line === ln); const near = ranges.find((r) => Math.abs(r.a - first.t0) < 0.45); if (near && near.a < first.t1 - 0.1) first.t0 = +near.a.toFixed(2);
  }
  return out;
}
