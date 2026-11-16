// ─── ตัดต่อให้เลย: อัดหรือใส่คลิปแล้ว แอปทำต่อเองจนจบ ───
// ตัดช่วงเงียบ · ตัดเทคเสีย/คำเติม · คุมความยาว · เขียนซับ · ปรับเสียง/ภาพ · ครอปตามหน้า · จัดเอฟเฟกต์ · แคปชั่น
import { segList, visLen } from './engine.js';
import { autoAll } from './smart.js';
import { RISKY } from '../../data/studio.js';

export const STEPS = [['audio', 'ฟังเสียง หาช่วงพูด'], ['look', 'ปรับภาพ และหาตำแหน่งหน้า'], ['asr', 'เขียนซับ'], ['cut', 'ตัดช่วงเงียบ เทคเสีย คำเติม คุมความยาว'], ['deco', 'ใส่ซับ เอฟเฟกต์ เพลง ป้ายท้าย'], ['cap', 'เขียนแคปชั่นและแฮชแท็ก']];
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
  for (const r of speech) { if (r.a - t > 0.25) out.push({ clip: clip.id, a: +t.toFixed(2), b: +r.a.toFixed(2), why: 'silence', on: true }); t = Math.max(t, r.b); }
  if (hi - t > 0.25) out.push({ clip: clip.id, a: +t.toFixed(2), b: +hi.toFixed(2), why: 'silence', on: true });
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

/**
 * ทำทั้งหมด · env: { getBlob(clip), urls, onStep(key, text, p), target (วินาที|0), model, canCut, slideKinds, profile, A (audio.js), R (asr.js) }
 * แก้ P ในตัว คืนสรุป
 */
export async function autoEdit(P, env) {
  const { onStep = () => {}, A, R } = env; const sum = { cut: 0, retake: 0, filler: 0, length: 0, subs: 0, bad: 0 };
  const clips = P.clips.filter((c) => env.urls[c.id]);
  // 1) ฟังเสียง
  onStep('audio', 'กำลังฟังเสียง…');
  const speech = {}; P.gain ||= {};
  for (const c of clips) { const b = await env.getBlob(c); speech[c.id] = await A.speechRanges(c.key, b, { gap: 0.35, pad: 0.1 }); P.gain[c.id] = await A.loudGain(c.key, b).catch(() => 1); }
  // 2) ภาพ
  onStep('look', 'กำลังปรับแสงสี…');
  P.looks ||= {}; P.tracks ||= {};
  if (P.mode === 'cam') for (const c of clips) {
    const r = await analyzeLook(env.urls[c.id]).catch(() => ({ look: '' })); P.looks[c.id] = r.look;
    if (r.landscape && r.v) { onStep('look', 'คลิปแนวนอน: กำลังหาตำแหน่งหน้าเพื่อครอปเป็นแนวตั้ง…'); P.tracks[c.id] = await trackFace(r.v).catch(() => null); }
  }
  // 3) ซับ: ซับสดจากการอัดในแอป (ถ้ามี) ไม่งั้นใช้ Whisper ถอดทีละช่วงพูด
  const tr = []; // [{clip, text, s, e, bad}] เวลาในคลิปต้นฉบับ
  for (const c of clips) {
    if (P.live?.[c.id]?.length) { for (const x of R.snapLive(P.live[c.id], speech[c.id])) tr.push({ clip: c.id, ...x }); continue; }
    const b = await env.getBlob(c); const pcm = await A.mono16(c.key, b);
    const ranges = speech[c.id].flatMap((r) => (r.b - r.a > 14 ? R.speechChunks(pcm.subarray(Math.floor(r.a * 16000), Math.floor(r.b * 16000))).map((q) => ({ a: q.a + r.a, b: q.b + r.a })) : [r]));
    const segs = await R.transcribe(pcm, { model: env.model, ranges, onStatus: (t) => onStep('asr', t), onProgress: (p) => onStep('asr', null, p) });
    for (const x of segs) tr.push({ clip: c.id, ...x });
  }
  // 4) จุดตัด
  onStep('cut', 'กำลังเลือกช่วงที่ดีที่สุด…');
  const keep = tr.map((x, i) => ({ ...x, i, drop: null }));
  keep.forEach((x) => { if (x.bad) x.drop = 'unclear'; else if (FILLER.test(x.text) && x.e - x.s < 2.5) x.drop = 'filler'; });
  const alive = () => keep.filter((x) => !x.drop);
  // เทคเสีย: ประโยคถัดไปคล้ายกันมาก = พูดใหม่ → ทิ้งอันก่อน
  { const L = alive(); for (let i = 0; i < L.length; i++) for (let j = i + 1; j <= Math.min(L.length - 1, i + 2); j++) { if (L[j].clip !== L[i].clip || L[j].s - L[i].e > 6) break; const a = L[i].text, b = L[j].text; const pre = norm(a).slice(0, 6); if (dice(a, b) >= 0.55 || (norm(a).length >= 4 && norm(b).startsWith(pre) && norm(b).length >= norm(a).length * 0.7)) { L[i].drop = 'retake'; break; } } }
  // คุมความยาว
  if (env.target > 0) {
    let L = alive(); let tot = L.reduce((a, x) => a + (x.e - x.s) + 0.15, 0);
    const score = (x) => (/\d/.test(x.text) ? 3 : 0) + (/ประกัน|เงิน|ภาษี|สุขภาพ|ลูก|เกษียณ|คุ้มครอง|ค่ารักษา/.test(x.text) ? 2 : 0) + Math.min(2, visLen(x.text) / 20) - (x.e - x.s > 8 ? 1 : 0);
    const cand = L.slice(1, -1).sort((p, q) => score(p) - score(q));
    while (tot > env.target + 1.5 && cand.length) { const x = cand.shift(); x.drop = 'length'; tot -= (x.e - x.s) + 0.15; }
  }
  // ช่วงที่ "ฟังไม่ออก" เก็บไว้ (ไม่ตัด) แต่บอกให้รู้ · ช่วงที่ตัดอื่น ๆ = จุดตัด
  P.cuts = [];
  for (const c of clips) {
    const mine = keep.filter((x) => x.clip === c.id);
    const spoken = mine.map((x) => ({ a: Math.max(0, x.s - 0.08), b: x.e + 0.1 })); // ช่วงพูดทั้งหมด (รวมเทคที่ตัด) เพื่อให้เอาคืนได้
    const base = mine.length ? spoken.sort((p, q) => p.a - q.a) : speech[c.id];
    P.cuts.push(...silenceCuts(c, base));
    for (const x of mine.filter((y) => y.drop && y.drop !== 'unclear')) P.cuts.push({ clip: c.id, a: +x.s.toFixed(2), b: +x.e.toFixed(2), why: x.drop, on: true, text: x.text });
  }
  P.cuts = P.cuts.map((x, i) => ({ id: 'k' + i, ...x }));
  P.silence = { on: true, gap: 0.35 };
  P.segs = deriveSegs(P);
  // 5) ซับในเวลาของคลิปที่ส่งออก
  onStep('deco', 'กำลังใส่ซับและเอฟเฟกต์…');
  const sl = segList(P);
  const toOut = (clip, v) => { const s = sl.find((x) => x.clip === clip && v >= x.a - 0.05 && v <= x.b + 0.05); return s ? s.o0 + Math.min(Math.max(v, s.a), s.b) - s.a : null; };
  const outSegs = alive().filter((x) => x.text).map((x) => ({ text: x.text, s: toOut(x.clip, x.s), e: toOut(x.clip, x.e) })).filter((x) => x.s != null && x.e != null && x.e > x.s);
  const r = R.segsToChunks(outSegs); P.script = r.script; P.chunks = r.chunks;
  P.enhance = true; P.trimHead = true; P.trimTail = true;
  autoAll(P, { slideKinds: env.slideKinds || [], canCut: env.canCut });
  // 6) แคปชั่น
  onStep('cap', 'กำลังเขียนแคปชั่น…');
  const cap = makeCaption(P, env.profile); P.caption = cap.caption;
  for (const k of keep) { if (k.drop === 'retake') sum.retake++; if (k.drop === 'filler') sum.filler++; if (k.drop === 'length') sum.length++; if (k.drop === 'unclear') sum.bad++; }
  sum.subs = P.chunks.length; sum.cut = P.cuts.filter((x) => x.on).reduce((a, x) => a + x.b - x.a, 0); sum.total = sl.reduce((a, s) => a + s.b - s.a, 0);
  P.autoEdited = new Date().toISOString();
  return sum;
}
