// ─── ตัวตัดต่อคลิป: แบ่งสคริปต์เป็นซับทีละคำ · วาดเฟรม (ซูม ฉากตาราง ขาวดำ สติกเกอร์ ซับ 4 สไตล์) · เล่น/อัดเป็นไฟล์ ───
// ทุกอย่างทำในเครื่อง ไม่อัปโหลดคลิปไปที่ไหน
import { SFX } from './sfx.js';
import { emojiSrc } from '../../data/emoji.js';
import { update as segUpdate, mask as segMask, ready as segReady } from './segment.js';
import { getSig, drawSignature } from '../carousel.js';
import { profile } from '../app.js';
import { enAt } from './translate.js';

export const VSTYLES = {
  mini: { name: 'สัมภาษณ์มินิมอล', sub: 'ซับขาวบรรทัดเดียว คำเด่นสีแดง เรียบหรูแบบคลิปพอดแคสต์', stage: 'grid', sw: ['#1d2430', '#ff4040'] },
  neon: { name: 'Neon Pop', sub: 'ตัวขาว คำเด่นชมพูม่วงเรืองแสง ซ้อนเป็นแถว', stage: 'wall', sw: ['#9fb9c9', '#ff4fd8'] },
  grid: { name: 'Grid Stage', sub: 'ผนังตาราง ซับเหลืองเรืองแสงทีละคำ', stage: 'grid', sw: ['#ededed', '#ffe23d'] },
  aom: { name: 'AOM แดงขาว', sub: 'ป้ายแดง ตัวขาว คำเด่นสีทอง', stage: 'aom', sw: ['#fff8f3', '#a6192e'] },
  clean: { name: 'Clean', sub: 'มินิมอล ตัวขาวเงาบาง ด้านล่าง', stage: 'clean', sw: ['#f4f4f2', '#1b1717'] },
};
export const SCENES = { cam: 'หน้ากล้อง', stage: 'ฉากตาราง', bw: 'ขาวดำ', cut: 'ตัดฉากหลัง', slide: 'สไลด์', img: 'ภาพแทรก', poster: 'โปสเตอร์แผน' };
export const GRADES = { none: 'ไม่ปรับ', cine: 'โทนหนัง', warm: 'อุ่น', clean: 'สว่างสะอาด' };
const GRADE_F = { cine: 'contrast(1.1) saturate(0.88) brightness(0.96)', warm: 'sepia(0.14) saturate(1.12) contrast(1.04)', clean: 'brightness(1.05) contrast(1.03) saturate(1.06)' };
export const MOODS = { laugh: '😂 ตลก', sad: '😢 เศร้า', shock: '😱 ตกใจ', win: '🎉 ดีใจ', calm: '🙂 ปกติ' };
export const VSCENES = { stage: 'ฉากกราฟิก', slide: 'สไลด์', img: 'ภาพแทรก', poster: 'โปสเตอร์แผน' };
export const HOOKS = { auto: 'อัตโนมัติ', title: 'หัวข้อตัวใหญ่', money: 'ฝนธนบัตร', flash: 'แฟลช + สั่น', count: 'ตัวเลขนับขึ้น', none: 'ไม่ใส่' };
const LIGHT = new Set(['stage', 'cut', 'slide']);
const FONT = '"Kanit", "Sarabun", sans-serif';

// ── ฟอนต์ ──
let fontP = null;
export function loadFonts() {
  if (fontP) return fontP;
  if (!document.getElementById('gf-kanit-heavy')) { const l = document.createElement('link'); l.id = 'gf-kanit-heavy'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@600;700;800&display=swap'; document.head.append(l); }
  const go = () => Promise.all(['600', '700', '800'].map((w) => document.fonts.load(`${w} 80px Kanit`, 'กขคAa').catch(() => {})));
  return (fontP = Promise.race([new Promise((r) => setTimeout(r, 300)).then(go).then(go), new Promise((r) => setTimeout(r, 4000))]));
}

// ── สติกเกอร์ ──
const IMG = {};
export function emojiImg(code) {
  if (!code) return null;
  if (!IMG[code]) { const im = new Image(); im.decoding = 'async'; im.src = emojiSrc(code); IMG[code] = im; }
  return IMG[code];
}
export const preloadEmoji = (codes) => Promise.all([...new Set(codes.filter(Boolean))].map((c) => { const im = emojiImg(c); return im.complete ? null : new Promise((r) => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); setTimeout(r, 4000); }); }));

// ── สคริปต์ → ซับทีละช่วง ──
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const MARKS = /[ัิ-ฺ็-๎]/g;
export const visLen = (s) => s.replace(MARKS, '').length;
const words = (s) => (SEG ? [...SEG.segment(s)].map((x) => x.segment) : s.split(/(\s+)/).filter(Boolean));
export const MAX_CHUNK = 14;

/** บทจากสตูดิโอ ("[0–3 วิ] ...", "ข้อความบนจอ: ...") → เหลือเฉพาะประโยคที่พูด บรรทัดละประโยค */
export function speechFromScript(s = '') {
  return s.split('\n').map((l) => l.trim())
    .filter((l) => l && !/^(ข้อความบนจอ|เคล็ดลับ|แสดงภาพ)/.test(l))
    .map((l) => l.replace(/^\[[^\]]*\]\s*/, '').replace(/^(ประโยคเปิด|ปิดท้าย)(\s*\([^)]*\))?\s*/, '').replace(/["“”]/g, '').trim())
    .filter(Boolean).flatMap((l) => l.split(/\s+·\s+/)).join('\n');
}

/** แบ่งสคริปต์: ขึ้นบรรทัดใหม่ = ช็อตใหม่ · *คำ* = คำเด่น · ช่วงละไม่เกิน ~14 ตัวอักษร */
export function parseScript(text = '', old = []) {
  const out = [];
  text.split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line, li) => {
    const toks = line.split(/(\*[^*]+\*)/).filter(Boolean).flatMap((p) => (/^\*[^*]+\*$/.test(p) ? [{ w: p.slice(1, -1), key: true }] : words(p).map((w) => ({ w, key: false }))));
    let cur = [], len = 0;
    const push = () => { while (cur.length && !cur[cur.length - 1].w.trim()) cur.pop(); while (cur.length && !cur[0].w.trim()) cur.shift(); if (cur.length) out.push({ line: li, words: cur, text: cur.map((x) => x.w).join('') }); cur = []; len = 0; };
    for (const t of toks) {
      const sp = !t.w.trim(), tl = visLen(t.w);
      if (sp && len >= MAX_CHUNK * 0.55) { push(); continue; }
      if (!sp && cur.length && len + tl > MAX_CHUNK) push();
      cur.push(t); len += tl;
    }
    push();
    // ช่วงท้ายบรรทัดสั้นเกินไป (เช่น "ได้") รวมกับช่วงก่อนหน้า
    const L = out.length; if (L >= 2 && out[L - 1].line === li && out[L - 2].line === li && visLen(out[L - 1].text) <= 3 && visLen(out[L - 2].text) + visLen(out[L - 1].text) <= MAX_CHUNK + 5) { const a = out[L - 2], b = out.pop(); a.words = [...a.words, ...b.words]; a.text = a.words.map((x) => x.w).join(''); }
  });
  // เก็บจังหวะ/สติกเกอร์/ฉากเดิมไว้ ถ้าข้อความช่วงนั้นเหมือนเดิม
  return out.map((c, i) => { const o = old[i]; return o && o.text === c.text ? { ...c, t0: o.t0, t1: o.t1, emoji: o.emoji ?? null, scene: o.scene || 'cam', arc: !!o.arc, pos: o.pos || null, slide: o.slide ?? null, img: o.img ?? null } : { ...c, t0: null, t1: null, emoji: null, scene: 'cam' }; });
}
export const timed = (chunks) => chunks.length > 0 && chunks.every((c) => c.t0 != null && c.t1 != null);

/** จังหวะอัตโนมัติ: แบ่งเวลาตามความยาวคำ (ใช้เมื่อไม่ได้จิ้มเอง หรือไม่มีเสียง) */
export function autoTime(chunks, dur, start = 0.15) {
  const w = chunks.map((c, i) => visLen(c.text) + 3 + (i && c.line !== chunks[i - 1].line ? 3 : 0));
  const sum = w.reduce((a, b) => a + b, 0) || 1; const span = Math.max(0.5, dur - start - 0.4);
  let t = start;
  return chunks.map((c, i) => { const d = (w[i] / sum) * span; const r = { ...c, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }; t += d; return r; });
}
/** อ่านเงียบ (ไม่มีเสียง): ความยาวที่ควรใช้ (วินาที) */
export const readDur = (chunks, speed = 1) => Math.max(3, chunks.reduce((a, c) => a + 0.25 + visLen(c.text) * 0.085, 0.6) / speed);

// ── ช่วงเวลา (เวลาทั้งหมดเป็น "เวลาในคลิปที่ส่งออก") ──
export const END_DUR = 2.4;
const T1 = (c) => c.t1 ?? c.t0 + 4;
const r2 = (v) => (v == null ? null : +v.toFixed(2));
/** ช่วงคลิปที่ใช้ตามลำดับ พร้อมเวลาเริ่ม/จบในคลิปที่ส่งออก */
export function segList(P) {
  const clips = Object.fromEntries((P.clips || []).map((c) => [c.id, c]));
  let o = 0;
  return (P.segs || []).filter((s) => clips[s.clip] && s.b > s.a + 0.05).map((s) => { const r = { ...s, key: clips[s.clip].key, o0: o, o1: o + (s.b - s.a) }; o = r.o1; return r; });
}
export function contentEnd(P, sl = segList(P)) {
  if (sl.length) return sl[sl.length - 1].o1;
  const T = P.chunks.filter((c) => c.t0 != null); return T.length ? T1(T[T.length - 1]) + 0.6 : 3;
}
/** [เริ่ม, จบเนื้อหา, จบทั้งคลิป(รวมป้ายท้าย)] */
export function window_(P, sl = segList(P)) {
  const end = contentEnd(P, sl); const T = P.chunks.filter((c) => c.t0 != null); const tail = P.endcard ? END_DUR : 0;
  if (!T.length) return [0, end, end + tail];
  const a = P.trimHead ? Math.max(0, T[0].t0 - 0.25) : 0;
  const b = Math.max(a + 0.5, P.trimTail ? Math.min(end, T1(T[T.length - 1]) + 0.7) : end);
  return [a, b, b + tail];
}
/** เมื่อช่วงคลิปเปลี่ยน (ตัดช่วงเงียบ/ตัดหัวท้าย/เรียงใหม่) ย้ายเวลาซับตามเนื้อเสียงเดิม */
export function remapTimes(chunks, oldSl, newSl) {
  if (!oldSl.length || !newSl.length) return chunks;
  const toSrc = (t) => { const s = oldSl.find((x) => t >= x.o0 && t < x.o1) || (t < oldSl[0].o0 ? oldSl[0] : oldSl[oldSl.length - 1]); return { clip: s.clip, v: s.a + Math.min(Math.max(t, s.o0), s.o1) - s.o0 }; };
  const toOut = (p) => { const cs = newSl.filter((x) => x.clip === p.clip); for (const x of cs) if (p.v >= x.a - 0.001 && p.v <= x.b + 0.001) return x.o0 + (p.v - x.a); const n = cs.find((x) => x.a > p.v); if (n) return n.o0; const l = cs[cs.length - 1]; return l ? l.o1 : 0; };
  const mp = (t) => r2(toOut(toSrc(t)));
  const out = chunks.map((c) => (c.t0 == null ? { ...c } : { ...c, t0: mp(c.t0), t1: mp(T1(c) - 0.001), words: c.words.map((w) => (w.t0 == null ? w : { ...w, t0: mp(w.t0), t1: mp(w.t1 - 0.001) })) }));
  return sanitize(out);
}
/** ย้ายเวลาของรายการคำ (ใช้กับ P.words) เมื่อช่วงคลิปเปลี่ยน */
export function remapWords(words, oldSl, newSl) { if (!words?.length) return words; const r = remapTimes(words.map((w) => ({ t0: w.t0, t1: w.t1, words: [], _w: w })), oldSl, newSl); return r.map((x) => ({ ...x._w, t0: x.t0, t1: Math.max(x.t1, x.t0 + 0.02) })); }
/** เวลาเรียงกัน ไม่ทับกัน ไม่สั้นเกิน */
export function sanitize(ch) {
  let prev = -1;
  for (const c of ch) { if (c.t0 == null) continue; if (c.t0 <= prev) c.t0 = r2(prev + 0.05); prev = c.t0; }
  ch.forEach((c, i) => { if (c.t0 == null) return; const n = ch.slice(i + 1).find((x) => x.t0 != null); if (c.t1 == null || c.t1 <= c.t0 + 0.15) c.t1 = r2(c.t0 + 0.6); if (n && c.t1 > n.t0) c.t1 = n.t0; });
  return ch;
}
/** ช่วงที่กำลังพูด (รวมช่วงซับที่ติดกัน) ใช้ลดเสียงเพลงตอนพูด */
export function speechSpans(ch) { const out = []; for (const c of ch) { if (c.t0 == null) continue; const l = out[out.length - 1]; if (l && c.t0 - l[1] < 0.4) l[1] = T1(c); else out.push([c.t0, T1(c)]); } return out; }
function activeIdx(ch, t) { for (let i = ch.length - 1; i >= 0; i--) { const c = ch[i]; if (c.t0 != null && c.t0 <= t) return T1(c) > t ? i : -1; } return -1; }
function lastStarted(ch, t) { for (let i = ch.length - 1; i >= 0; i--) if (ch[i].t0 != null && ch[i].t0 <= t) return i; return -1; }
const sceneOf = (P, c) => (P.mode === 'voice' ? (['slide', 'img', 'poster'].includes(c.scene) ? c.scene : 'stage') : (c.scene || 'cam'));

/** เหตุการณ์ในคลิป (ใช้ทั้งวาดภาพและวางเสียงประกอบ) */
export function timeline(P, sl = segList(P)) {
  const ch = P.chunks; const lines = {}; const segs = []; const stickers = []; const cuts = [];
  ch.forEach((c, i) => {
    if (c.t0 == null) return;
    const L = (lines[c.line] ||= { start: c.t0, end: T1(c), idx: [] }); L.end = T1(c); L.idx.push(i);
    const sc = sceneOf(P, c); const id = sc === 'slide' ? c.slide : sc === 'img' ? c.img : sc === 'poster' ? c.poster : null;
    const prev = segs[segs.length - 1];
    if (prev && prev.scene === sc && prev.id === id && Math.abs(prev.end - c.t0) < 0.35) { prev.end = T1(c); prev.idx.push(i); } else segs.push({ scene: sc, id, start: c.t0, end: T1(c), idx: [i] });
  });
  for (const L of Object.values(lines)) cuts.push(L.start);
  for (const s of segs) if (['cam', 'bw'].includes(s.scene)) cuts.push(s.start);
  if (P.zoom) for (const s of sl.slice(1)) cuts.push(s.o0); // จุดต่อคลิป/ตัดช่วงเงียบ = jump cut
  // สติกเกอร์: ค้างไว้จนจบบรรทัด/ฉาก หรือมีตัวใหม่
  ch.forEach((c, i) => {
    if (c.t0 == null || !c.emoji) return;
    const seg = segs.find((s) => s.idx.includes(i)); const L = lines[c.line];
    const sc = seg?.scene || 'cam'; const hold = sc === 'stage' || sc === 'slide';
    let at = c.t0; if (P.mode === 'cam' && hold && seg.idx[0] === i) at = c.t0 + 0.4;
    stickers.push({ code: c.emoji, at, end: hold ? seg.end : L.end, scene: sc, i });
  });
  stickers.forEach((s, k) => { const n = stickers[k + 1]; if (n && n.at < s.end) s.end = n.at; });
  return { lines, segs, stickers, cuts: [...new Set(cuts.map((v) => +v.toFixed(3)))].sort((a, b) => a - b) };
}

/** เอฟเฟกต์เปิดคลิปที่ใช้จริง (อัตโนมัติ = เลือกจากบรรทัดแรก) */
export function hookOf(P) {
  const h = P.hook || 'auto'; if (h !== 'auto') return h;
  const first = P.chunks.filter((c) => c.line === (P.chunks[0]?.line ?? 0)).map((c) => c.text).join('');
  if (/\d/.test(first)) return 'count';
  if (/เงิน|บาท|ล้าน|แพง|จ่าย|ค่า|รวย|หนี้/.test(first)) return 'money';
  if (visLen(first) >= 14) return 'title';
  return 'flash';
}
function countTarget(P) {
  const first = P.chunks.filter((c) => c.line === (P.chunks[0]?.line ?? 0)).map((c) => c.text).join('');
  const m = first.match(/(\d[\d,]*(?:\.\d+)?)\s*(%|เปอร์เซ็นต์|บาท|ล้าน|แสน|หมื่น|พัน|ปี|เดือน|วัน|เท่า|คน)?/); if (!m) return null;
  return { n: parseFloat(m[1].replace(/,/g, '')), dec: (m[1].split('.')[1] || '').length, unit: m[2] || '' };
}

export function sfxEvents(P, tl = timeline(P), win = window_(P)) {
  const explicit = P.chunks.filter((c) => c.t0 != null && c.sound).map((c) => ({ t: c.t0 + 0.02, n: c.sound, v: 0.95, p: 9 }));
  if (!P.sfx) return explicit.sort((a, b) => a.t - b.t);
  const ev = []; const [a, b] = win; const hk = hookOf(P);
  if (P.mode === 'cam' && P.zoom) for (const t of tl.cuts) ev.push({ t, n: 'whoosh', v: 0.55, p: 2 });
  for (const s of tl.segs) {
    if (P.mode === 'cam' && ['stage', 'slide', 'cut'].includes(s.scene)) { ev.push({ t: s.start, n: 'whoosh', v: 0.8, p: 3 }); ev.push({ t: s.start + (s.scene === 'cut' ? 0.05 : 0.38), n: 'boom', v: 0.55, p: 1 }); }
    if (s.scene === 'slide') ev.push({ t: s.start + (P.mode === 'cam' ? 0.4 : 0.02), n: 'pop', v: 0.8, p: 4 });
    if (s.scene === 'img') ev.push({ t: s.start, n: 'whoosh', v: 0.6, p: 3 });
  }
  for (const s of tl.stickers) ev.push({ t: s.at, n: 'pop', v: 0.85, p: 4 });
  P.chunks.forEach((c) => { if (c.t0 == null) return; if (c.words.some((w) => w.key)) ev.push({ t: c.t0 + 0.05, n: 'ding', v: 0.45, p: 2 }); else if (P.ticks) ev.push({ t: c.t0, n: 'tick', v: 0.6, p: 0 }); });
  if (hk === 'money') { ev.push({ t: a + 0.02, n: 'boom', v: 0.7, p: 1 }); ev.push({ t: a + 0.05, n: 'whoosh', v: 0.7, p: 5 }); }
  if (hk === 'flash') ev.push({ t: a + 0.01, n: 'boom', v: 0.8, p: 1 });
  if (hk === 'title') { ev.push({ t: a + 0.01, n: 'whoosh', v: 0.8, p: 5 }); ev.push({ t: a + 0.05, n: 'boom', v: 0.6, p: 1 }); }
  if (hk === 'count' && countTarget(P)) { for (let i = 0; i < 8; i++) ev.push({ t: a + i * 0.14, n: 'tick', v: 0.9, p: 0 }); ev.push({ t: a + 1.15, n: 'ding', v: 0.7, p: 6 }); }
  if (P.endcard) ev.push({ t: b + 0.05, n: 'ding', v: 0.55, p: 6 });
  const MS = { laugh: 'boing', sad: 'sad', shock: 'scratch', win: 'kaching' };
  P.chunks.forEach((c) => { if (c.t0 != null && !c.sound && MS[c.mood]) ev.push({ t: c.t0 + 0.02, n: MS[c.mood], v: 0.85, p: 8 }); });
  ev.push(...explicit);
  ev.sort((x, y) => x.t - y.t || y.p - x.p);
  const out = []; for (const e of ev) { const last = out[out.length - 1]; if (last && e.t - last.t < 0.09 && e.n !== 'boom' && last.n !== 'boom' && e.n !== 'tick') { if (e.p > last.p) out[out.length - 1] = e; continue; } out.push(e); }
  return out;
}

// ── วาดเฟรม ──
const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const back = (p) => { p = Math.min(1, Math.max(0, p)); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const ZOOM = [[1, 0, 0], [1.16, -0.035, 0.02], [1.07, 0.03, 0], [1.24, 0, 0.04]];

const bgCache = {};
function stageBg(kind, W, H) {
  const key = kind + W + 'x' + H; if (bgCache[key]) return bgCache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  if (kind === 'grid') {
    let g = x.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.78); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#ececec'); g.addColorStop(1, '#8f8f8f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const s = W / 5.2; x.lineWidth = Math.max(2, W / 360);
    for (let i = -1; i * s < W + s; i++) { const X = W / 2 + (i - 2.5) * s; x.strokeStyle = 'rgba(40,40,40,.2)'; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, H); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(X + x.lineWidth, 0); x.lineTo(X + x.lineWidth, H); x.stroke(); }
    for (let j = 0; j * s < H + s; j++) { const Y = j * s - s * 0.3; x.strokeStyle = 'rgba(40,40,40,.2)'; x.beginPath(); x.moveTo(0, Y); x.lineTo(W, Y); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(0, Y + x.lineWidth); x.lineTo(W, Y + x.lineWidth); x.stroke(); }
    g = x.createRadialGradient(W * 0.5, H * 0.45, H * 0.3, W * 0.5, H * 0.45, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  } else if (kind === 'wall') {
    let g = x.createRadialGradient(W * 0.5, H * 0.34, 0, W * 0.5, H * 0.34, H * 0.8); g.addColorStop(0, '#eef5f9'); g.addColorStop(0.4, '#adc6d5'); g.addColorStop(1, '#4f6878');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createLinearGradient(0, H * 0.6, 0, H); g.addColorStop(0, 'rgba(10,20,30,0)'); g.addColorStop(1, 'rgba(10,20,30,.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  } else if (kind === 'aom') {
    x.fillStyle = '#fff8f3'; x.fillRect(0, 0, W, H);
    for (const [cx, cy, r, a] of [[W * 0.95, H * 0.1, W * 0.6, 0.13], [W * 0.02, H * 0.92, W * 0.7, 0.1], [W * 0.5, H * 0.45, W * 0.55, 0.05]]) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(166,25,46,${a})`); g.addColorStop(1, 'rgba(166,25,46,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.fillStyle = 'rgba(166,25,46,.09)'; const s = W / 18; for (let i = 1; i < 18; i++) for (let j = 1; j < 32; j++) { x.beginPath(); x.arc(i * s, j * s, W / 300, 0, 7); x.fill(); }
  } else {
    const g = x.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, H * 0.75); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e4e3df'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  return (bgCache[key] = c);
}

let CUR = {};
const interp = (tr, t) => { if (!tr?.length) return 0.5; if (t <= tr[0][0]) return tr[0][1]; for (let i = 1; i < tr.length; i++) if (t <= tr[i][0]) { const [a, va] = tr[i - 1], [b, vb] = tr[i]; return va + (vb - va) * (t - a) / Math.max(0.01, b - a); } return tr[tr.length - 1][1]; };
function drawMedia(x, W, H, media, z, ox, oy, bw) {
  const vw = media?.videoWidth, vh = media?.videoHeight;
  if (!vw || media.readyState < 2) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2a30'); g.addColorStop(1, '#111114'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (!media) { x.save(); x.fillStyle = 'rgba(255,255,255,.45)'; x.font = `500 ${W * 0.042}px ${FONT}`; x.textAlign = 'center'; x.fillText('ยังไม่มีคลิป · อัดหรือเลือกในขั้นที่ 1', W / 2, H * 0.47); x.restore(); }
    return; }
  const P = CUR.P || {}; const cid = media._clip; const enh = P.enhance !== false;
  const s0 = Math.max(W / vw, H / vh); const dw = vw * s0, dh = vh * s0;
  let X0 = (W - dw) / 2; const tr = enh ? P.tracks?.[cid] : null;
  if (tr?.length && dw > W * 1.05) X0 = Math.min(0, Math.max(W - dw, W / 2 - interp(tr, media.currentTime) * dw));
  const m = (z - 1) / 2 * 0.92; ox = Math.max(-m, Math.min(m, ox)); oy = Math.max(-m, Math.min(m, oy));
  const f = [enh ? P.looks?.[cid] || '' : '', GRADE_F[P.grade] || '', bw ? 'grayscale(1) contrast(1.12) brightness(.96)' : ''].filter(Boolean).join(' ');
  x.save(); if (f) x.filter = f;
  x.translate(W * (0.5 + ox), H * (0.4 + oy)); x.scale(z, z); x.translate(-W * 0.5, -H * 0.4);
  x.drawImage(media, X0, (H - dh) / 2, dw, dh); x.restore();
}
function rrect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }

/** ตัวหนังสือมีขอบ + เรืองแสง */
function glowText(x, s, X, Y, o) {
  x.lineJoin = 'round'; x.miterLimit = 2;
  if (o.glow) { x.save(); x.shadowColor = o.glow; x.shadowBlur = o.blur; x.fillStyle = o.glow; x.fillText(s, X, Y); x.fillText(s, X, Y); x.restore(); }
  if (o.shadow) { x.save(); x.shadowColor = o.shadow; x.shadowBlur = o.sblur || 16; x.shadowOffsetY = o.soff || 4; x.fillStyle = o.fill; x.fillText(s, X, Y); x.restore(); }
  if (o.stroke) { x.strokeStyle = o.stroke; x.lineWidth = o.sw; x.strokeText(s, X, Y); }
  x.fillStyle = o.fill; x.fillText(s, X, Y);
  if (o.inner) { x.strokeStyle = o.inner; x.lineWidth = Math.max(1, o.sw * 0.12); x.strokeText(s, X, Y); }
}

function drawSticker(x, W, H, st, t, P, scene, textTop) {
  const im = emojiImg(st.code); if (!im || !im.complete || !im.naturalWidth) return;
  const p = (t - st.at) / 0.3; if (p < 0) return;
  const out = st.end - t < 0.12 ? Math.max(0, (st.end - t) / 0.12) : 1;
  const sc = back(p) * (0.6 + 0.4 * out);
  let cx, cy, size; const big = scene === 'stage';
  if (big) { cx = W * 0.5; cy = H * 0.4; size = W * 0.46; }
  else if (scene === 'slide') { cx = W * 0.84; cy = H * 0.13; size = W * 0.2; }
  else if (scene === 'cut') { cx = W * 0.82; cy = H * 0.36; size = W * 0.22; }
  else if (P.style === 'grid') { cx = W * 0.5; cy = H * 0.17; size = W * 0.2; }
  else if (P.style === 'neon') { cx = W * 0.8; cy = Math.max(H * 0.1, (textTop ?? H * 0.3) - W * 0.06); size = W * 0.17; }
  else { cx = W * 0.8; cy = H * 0.2; size = W * 0.18; }
  cy += Math.sin(t * 2.3) * H * 0.006;
  x.save(); x.globalAlpha = out;
  if (big) { x.fillStyle = 'rgba(0,0,0,.16)'; x.beginPath(); x.ellipse(cx, cy + size * 0.55, size * 0.36 * sc, size * 0.06 * sc, 0, 0, 7); x.fill(); }
  x.translate(cx, cy); x.rotate(Math.sin(t * 1.7) * 0.06 + (1 - Math.min(1, p)) * -0.35); x.scale(sc, sc);
  x.shadowColor = 'rgba(0,0,0,.28)'; x.shadowBlur = size * 0.08; x.shadowOffsetY = size * 0.04;
  x.drawImage(im, -size / 2, -size / 2, size, size); x.restore();
}

/** แถวคำ (คำเด่นใหญ่กว่า) ขึ้นทีละคำ */
function rowLayout(x, words, S, maxW) {
  const parts = words.map((w) => ({ ...w, size: w.key ? S * 1.32 : S }));
  const measure = () => { let tot = 0; for (const p of parts) { x.font = `800 ${p.size}px ${FONT}`; p.w = x.measureText(p.w0 ?? p.w).width; tot += p.w; } return tot; };
  for (const p of parts) p.w0 = p.w;
  let tot = measure(); if (tot > maxW) { const k = maxW / tot; for (const p of parts) p.size *= k; tot = measure(); }
  return { parts, tot, h: Math.max(...parts.map((p) => p.size)) };
}
const POSY = { top: 0.2, mid: 0.5, low: 0.74 };
const textY = (P, c, mode, def) => (c?.pos && POSY[c.pos] ? POSY[c.pos] : mode === 'slide' ? 0.83 : mode === 'cut' ? 0.2 : def);

/** สีตัวหนังสือตามสไตล์ */
function paint(P, light, key, size) {
  if (P.style === 'neon') {
    return key ? (x, y) => { const g = x.createLinearGradient(0, y - size * 0.9, 0, y + size * 0.1); g.addColorStop(0, '#ffd3f9'); g.addColorStop(0.5, '#ff5fe0'); g.addColorStop(1, '#c64dff'); return { fill: g, glow: 'rgba(214,70,255,.9)', blur: size * 0.5, stroke: 'rgba(60,0,70,.55)', sw: size * 0.1, inner: 'rgba(255,255,255,.7)' }; }
      : () => ({ fill: '#ffffff', stroke: 'rgba(20,24,40,.6)', sw: size * 0.13, shadow: 'rgba(0,0,0,.35)', sblur: size * 0.3, soff: size * 0.05 });
  }
  if (P.style === 'grid') return () => ({ fill: key ? '#fff3a0' : '#ffe23d', glow: 'rgba(255,150,0,.95)', blur: size * 0.5, stroke: '#3a2200', sw: size * 0.16 });
  if (P.style === 'aom') return () => ({ fill: key ? '#ffd36b' : '#ffffff', stroke: '#a6192e', sw: size * 0.22, shadow: 'rgba(80,0,10,.35)', sblur: size * 0.3, soff: size * 0.05 });
  return () => (light ? { fill: key ? '#a6192e' : '#1b1717' } : { fill: key ? '#ffd36b' : '#ffffff', shadow: 'rgba(0,0,0,.7)', sblur: size * 0.35, soff: size * 0.04, stroke: 'rgba(0,0,0,.35)', sw: size * 0.08 });
}

// ── ตัวหนังสือโค้งรอบหัว ──
const GSEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
const graphemes = (s) => (GSEG ? [...GSEG.segment(s)].map((g) => g.segment) : [...s]);
function drawArc(x, W, H, P, ch, tl, t, ci, mode) {
  const L = tl.lines[ch[ci].line]; const rows = L.idx.filter((i) => ch[i].t0 <= t && ch[i].arc).slice(-2);
  const cx = W * 0.5, cy = H * 0.37; const light = LIGHT.has(mode);
  rows.forEach((i, ri) => {
    const c = ch[i]; let S = W * 0.085; const R = W * 0.3 + ri * S * 1.18;
    const gl = c.words.flatMap((w) => graphemes(w.w).map((g) => ({ g, key: w.key })));
    const meas = () => { let tot = 0; for (const q of gl) { x.font = `800 ${q.key ? S * 1.25 : S}px ${FONT}`; q.w = x.measureText(q.g).width; q.size = q.key ? S * 1.25 : S; tot += q.w; } return tot; };
    let tot = meas(); const maxA = Math.PI * 0.85; if (tot / R > maxA) { S *= maxA * R / tot; tot = meas(); }
    let th = Math.PI * 1.33 - tot / R / 2; const n = gl.length; const reveal = Math.min(1, (t - c.t0) / 0.35);
    const exitP = L.end - t < 0.14 ? Math.max(0, (L.end - t) / 0.14) : 1;
    x.save(); x.textBaseline = 'alphabetic'; x.textAlign = 'center'; x.globalAlpha = exitP;
    gl.forEach((q, k) => {
      const a = th + q.w / 2 / R; th += q.w / R; if (k / n > reveal) return;
      x.save(); x.translate(cx + R * Math.cos(a), cy + R * Math.sin(a)); x.rotate(a + Math.PI / 2); x.font = `800 ${q.size}px ${FONT}`;
      glowText(x, q.g, 0, 0, paint(P, light, q.key, q.size)(x, 0)); x.restore();
    });
    x.restore();
  });
}

function drawNeon(x, W, H, P, ch, tl, t, mode, ci, measureOnly = false) {
  const L = tl.lines[ch[ci].line]; const lineNo = Object.keys(tl.lines).indexOf(String(ch[ci].line));
  const rows = L.idx.filter((i) => ch[i].t0 <= t && !ch[i].arc).slice(-3);
  if (!rows.length) return null;
  const S = W * 0.096; const maxW = W * 0.86;
  const lays = rows.map((i) => ({ i, ...rowLayout(x, ch[i].words, S, maxW) }));
  const gap = S * 0.12; const total = lays.reduce((a, l) => a + l.h * 1.05 + gap, -gap);
  const def = mode === 'stage' ? 0.72 : [0.24, 0.6, 0.3, 0.64][lineNo % 4];
  let y = H * textY(P, ch[ci], mode, def) - total / 2; const top = y;
  if (measureOnly) return top;
  const exitP = L.end - t < 0.14 ? (L.end - t) / 0.14 : 1;
  x.save(); x.textBaseline = 'alphabetic'; x.globalAlpha = Math.max(0, exitP);
  for (const l of lays) {
    const c = ch[l.i]; const n = l.parts.filter((p) => p.w0.trim()).length || 1; const step = Math.min(0.11, ((T1(c) - c.t0) * 0.5) / n);
    let X = (W - l.tot) / 2; let k = 0; y += l.h * 1.0;
    for (const p of l.parts) {
      const word = p.w0; if (!word.trim()) { X += p.w; continue; }
      const at = p.t0 != null ? Math.max(c.t0, p.t0 - 0.04) : c.t0 + k * step; k++; const q = (t - at) / 0.13; if (q <= 0) { X += p.w; continue; }
      const sc = 0.55 + 0.45 * back(q); const a = Math.min(1, q * 1.6);
      x.save(); x.globalAlpha *= a; x.translate(X + p.w / 2, y - p.size * 0.35); x.scale(sc, sc); x.translate(-(X + p.w / 2), -(y - p.size * 0.35));
      x.font = `800 ${p.size}px ${FONT}`;
      glowText(x, word, X, y, paint(P, false, p.key, p.size)(x, y));
      x.restore(); X += p.w;
    }
    y += gap;
  }
  x.restore();
  return top;
}

function drawSingle(x, W, H, P, c, t, mode) {
  const st = P.style; const k = c.words.some((w) => w.key); const light = LIGHT.has(mode); let ret = null;
  x.save(); x.textBaseline = 'middle'; x.textAlign = 'left';
  if (st === 'mini') {
    let S = W * 0.058; const segs = c.words.map((w) => ({ s: w.w, key: w.key }));
    const meas = () => { x.font = `600 ${S}px ${FONT}`; return segs.reduce((a, g) => a + x.measureText(g.s).width, 0); };
    let w = meas(); if (w > W * 0.86) { S *= W * 0.86 / w; w = meas(); }
    const Y = H * textY(P, c, mode, mode === 'split' ? 0.5 : LIGHT.has(mode) ? 0.74 : 0.6); x.globalAlpha = Math.min(1, (t - c.t0) / 0.08); ret = { Y, S };
    let X = (W - w) / 2;
    const tw = c.words.filter((w) => w.t0 != null); const act = P.karaoke && tw.length ? ([...tw].reverse().find((w) => w.t0 <= t + 0.03) || tw[0]) : null;
    c.words.forEach((wd, k) => { const g = segs[k]; const col = act === wd ? '#ffd21f' : g.key ? '#ff4040' : '#ffffff'; x.save(); x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = S * 0.45; x.shadowOffsetY = S * 0.04; x.fillStyle = col; x.fillText(g.s, X, Y); x.restore(); x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = Math.max(1, S * 0.05); x.strokeText(g.s, X, Y); x.fillStyle = col; x.fillText(g.s, X, Y); X += x.measureText(g.s).width; });
  } else if (st === 'grid') {
    let S = W * (k ? 0.112 : 0.1); x.font = `800 ${S}px ${FONT}`; let w = x.measureText(c.text).width; if (w > W * 0.9) { S *= W * 0.9 / w; x.font = `800 ${S}px ${FONT}`; w = x.measureText(c.text).width; }
    const q = (t - c.t0) / 0.18; const sc = q < 1 ? 0.8 + 0.2 * back(q) : 1; const Y = H * textY(P, c, mode, mode === 'stage' ? 0.72 : 0.6);
    ret = { Y, S }; x.translate(W / 2, Y); x.scale(sc, sc); x.globalAlpha = Math.min(1, q * 2 + 0.2);
    glowText(x, c.text, -w / 2, 0, { fill: '#ffe23d', glow: 'rgba(255,150,0,.95)', blur: S * 0.5, stroke: '#3a2200', sw: S * 0.16 });
  } else if (st === 'aom') {
    const S0 = W * 0.078; let S = S0; const segs = c.words.map((w) => ({ s: w.w, key: w.key }));
    const meas = () => { x.font = `700 ${S}px ${FONT}`; return segs.reduce((a, g) => a + x.measureText(g.s).width, 0); };
    let w = meas(); if (w > W * 0.8) { S *= W * 0.8 / w; w = meas(); }
    const q = ease((t - c.t0) / 0.2); const Y = H * textY(P, c, mode, mode === 'stage' ? 0.72 : 0.74) + (1 - q) * S * 0.6; const padX = S * 0.55, ph = S * 1.55; ret = { Y: Y + ph * 0.18, S };
    x.globalAlpha = q; x.fillStyle = '#a6192e'; x.shadowColor = 'rgba(80,0,10,.35)'; x.shadowBlur = S * 0.4; x.shadowOffsetY = S * 0.1;
    rrect(x, (W - w) / 2 - padX, Y - ph / 2, w + padX * 2, ph, ph * 0.28); x.fill(); x.shadowColor = 'transparent';
    let X = (W - w) / 2; for (const g of segs) { x.fillStyle = g.key ? '#ffd36b' : '#ffffff'; x.fillText(g.s, X, Y + S * 0.04); X += x.measureText(g.s).width; }
  } else {
    let S = W * 0.074; const segs = c.words.map((w) => ({ s: w.w, key: w.key }));
    const meas = () => { x.font = `700 ${S}px ${FONT}`; return segs.reduce((a, g) => a + x.measureText(g.s).width, 0); };
    let w = meas(); if (w > W * 0.86) { S *= W * 0.86 / w; w = meas(); }
    const q = Math.min(1, (t - c.t0) / 0.12); const Y = H * textY(P, c, mode, mode === 'stage' ? 0.72 : 0.76); x.globalAlpha = q; ret = { Y, S };
    let X = (W - w) / 2;
    for (const g of segs) { glowText(x, g.s, X, Y, paint(P, light, g.key, S)(x, Y)); X += x.measureText(g.s).width; }
  }
  x.restore(); return ret;
}

// ── ซับภาษาอังกฤษ (ทีละประโยค แสดงตลอดบรรทัด) ──
export const enLine = (P, t) => enAt(P, t)?.en || null;
export function remapEn(segs, oldSl, newSl) { if (!segs?.length) return segs; return remapTimes(segs.map((s) => ({ ...s, words: [] })), oldSl, newSl).map(({ words, ...s }) => s).filter((s) => s.t1 > s.t0 + 0.1); }
function wrapEn(x, s, maxW, font) {
  x.font = font; const ws = s.split(/\s+/); const out = []; let cur = ''; for (const w of ws) { const nx = cur ? cur + ' ' + w : w; if (cur && x.measureText(nx).width > maxW) { out.push(cur); cur = w; } else cur = nx; } if (cur) out.push(cur);
  if (out.length === 2) { let best = null; for (let k = 1; k < ws.length; k++) { const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' '); const m = Math.max(x.measureText(a).width, x.measureText(b).width); if (m <= maxW && (!best || m < best[0])) best = [m, a, b]; } if (best) return [best[1], best[2]]; }
  return out;
}
function drawEn(x, W, H, P, ci, t, mode, under) {
  const e = enAt(P, t); if (!e) return false; const s = e.en; const ch = P.chunks;
  const main = !under; let S = W * (main ? 0.05 : 0.038); let font, rows;
  for (let k = 0; k < 6; k++) { font = `${main ? 600 : 500} ${S}px ${FONT}`; rows = wrapEn(x, s, W * 0.84, font); if (rows.length <= 2) break; S *= 0.9; }
  const lh = S * 1.25; const light = LIGHT.has(mode) && !main && P.mode !== 'cam'; let y = under?.top != null ? under.top - S * 0.9 - (rows.length - 1) * lh : main ? H * textY(P, ch[ci], mode, mode === 'split' ? 0.5 : LIGHT.has(mode) ? 0.74 : 0.6) - (rows.length - 1) * lh / 2 : under ? under.Y + under.S * 0.62 + S * 0.75 : H * 0.86;
  if (!main && under?.top == null && y + (rows.length - 1) * lh > H * 0.95) y = (under ? under.Y - under.S * 0.75 : H * 0.86) - S * 0.6 - (rows.length - 1) * lh;
  x.save(); x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = Math.min(1, (t - e.t0) / 0.12, (e.t1 + 0.05 - t) / 0.08) * (main ? 1 : 0.94);
  rows.forEach((r, i) => { const Y = y + i * lh; if (light) { x.save(); x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = S * 0.4; x.fillStyle = '#2b2b30'; x.fillText(r, W / 2, Y); x.restore(); return; } x.save(); x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = S * 0.5; x.shadowOffsetY = S * 0.05; x.fillStyle = '#ffffff'; x.fillText(r, W / 2, Y); x.restore(); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = Math.max(1, S * 0.05); x.strokeText(r, W / 2, Y); x.fillStyle = '#ffffff'; x.fillText(r, W / 2, Y); });
  x.restore(); return true;
}

// ── เอฟเฟกต์เปิดคลิป ──
function rnd(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function drawMoney(x, W, H, dt) {
  if (dt < 0 || dt > 2.4) return; const bill = emojiImg('1f4b5'), fly = emojiImg('1f4b8');
  x.save(); x.globalAlpha = dt > 1.9 ? Math.max(0, 1 - (dt - 1.9) / 0.5) : 1;
  for (let i = 0; i < 24; i++) {
    const im = i % 4 === 0 ? fly : bill; if (!im?.complete || !im.naturalWidth) continue;
    const size = W * (0.16 + rnd(i * 3) * 0.12); const sp = H * (0.75 + rnd(i * 5) * 0.7);
    const X = rnd(i) * W + Math.sin(dt * 3 + i) * W * 0.04; const Y = -size - rnd(i * 7) * H * 0.55 + dt * sp;
    if (Y > H + size) continue;
    x.save(); x.translate(X, Y); x.rotate(rnd(i * 11) * 6 + dt * (rnd(i * 13) - 0.5) * 5); x.drawImage(im, -size / 2, -size / 2, size, size); x.restore();
  }
  x.restore();
}
function drawCount(x, W, H, P, dt, cy = 0.42) {
  const tg = countTarget(P); if (!tg || dt < 0 || dt > 1.7) return false;
  const v = tg.n * ease(Math.min(1, dt / 1.1)); const txt = v.toLocaleString('th-TH', { minimumFractionDigits: tg.dec, maximumFractionDigits: tg.dec }) + (tg.unit ? ' ' + tg.unit : '');
  let S = W * 0.15; x.save(); x.font = `800 ${S}px ${FONT}`; let w = x.measureText(txt).width; if (w > W * 0.88) { S *= W * 0.88 / w; x.font = `800 ${S}px ${FONT}`; w = x.measureText(txt).width; }
  const pop = dt > 1.1 && dt < 1.3 ? 1 + 0.08 * Math.sin((dt - 1.1) / 0.2 * Math.PI) : 1; const fade = dt > 1.45 ? Math.max(0, 1 - (dt - 1.45) / 0.25) : 1;
  x.globalAlpha = fade; x.textBaseline = 'middle'; x.translate(W / 2, H * cy); x.scale(pop, pop);
  const g = x.createLinearGradient(0, -S * 0.6, 0, S * 0.4); g.addColorStop(0, '#fff6c2'); g.addColorStop(0.5, '#ffd23d'); g.addColorStop(1, '#ff9d00');
  glowText(x, txt, -w / 2, 0, { fill: g, glow: 'rgba(255,170,0,.9)', blur: S * 0.45, stroke: '#3a2200', sw: S * 0.12 });
  x.restore(); return true;
}

// ── ฉากตัดคนออกจากฉากหลัง ──
let offC = null;
function off(W, H) { if (!offC || offC.width !== W || offC.height !== H) { offC = document.createElement('canvas'); offC.width = W; offC.height = H; } return offC; }
function drawCutout(x, W, H, media, mask, p) {
  const vw = media?.videoWidth, vh = media?.videoHeight; if (!vw || media.readyState < 2) return false;
  if (!mask) { // ยังไม่ได้ mask: แสดงเป็นการ์ดไปก่อน
    const cw = W * 0.62, chh = cw * 16 / 9; x.save(); rrect(x, (W - cw) / 2, H - chh - H * 0.02, cw, chh, 40); x.clip(); x.translate((W - cw) / 2, H - chh - H * 0.02); x.scale(cw / W, chh / H); drawMedia(x, W, H, media, 1, 0, 0, false); x.restore(); return true;
  }
  const o = off(W, H), ox = o.getContext('2d'); ox.save(); ox.clearRect(0, 0, W, H);
  const s0 = Math.max(W / vw, H / vh) * 0.92; const dw = vw * s0, dh = vh * s0; const X = (W - dw) / 2, Y = H - dh + H * 0.02;
  ox.drawImage(mask, X, Y, dw, dh); ox.globalCompositeOperation = 'source-in'; ox.drawImage(media, X, Y, dw, dh); ox.restore();
  const sc = 1 + 0.08 * (1 - ease(p / 0.3));
  x.save(); x.translate(W / 2, H); x.scale(sc, sc); x.translate(-W / 2, -H);
  x.shadowColor = 'rgba(255,255,255,.95)'; x.shadowBlur = W * 0.012; x.drawImage(o, 0, 0);
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = W * 0.04; x.shadowOffsetY = W * 0.015; x.drawImage(o, 0, 0); x.restore();
  return true;
}
function cardShrink(x, W, H, media, p) {
  if (p >= 1.55 || !media) return;
  const e = ease(Math.min(1, p)); const cw = W * 0.46, chh = cw * 16 / 9; const tx = (W - cw) / 2, ty = H * 0.18;
  const fade = p > 1 ? 1 - (p - 1) / 0.55 : 1; const shr = p > 1 ? 1 - 0.25 * (p - 1) / 0.55 : 1;
  let X = tx * e, Y = ty * e, w = W + (cw - W) * e, hh = H + (chh - H) * e;
  if (p > 1) { const mx = X + w / 2, my = Y + hh / 2; w *= shr; hh *= shr; X = mx - w / 2; Y = my - hh / 2; }
  x.save(); x.globalAlpha = Math.max(0, fade); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 40 * e; x.shadowOffsetY = 14 * e;
  rrect(x, X, Y, w, hh, 48 * e); x.fillStyle = '#000'; x.fill(); x.shadowColor = 'transparent'; x.clip();
  x.translate(X, Y); x.scale(w / W, hh / H); drawMedia(x, W, H, media, 1, 0, 0, false); x.restore();
}
function drawSlideCard(x, W, H, img, p) {
  if (!img || p < 0) return; const sc = back(p / 0.35) ; const w = W * 0.8, h = w * (img.height / img.width); const cy = H * 0.42;
  x.save(); x.translate(W / 2, cy); x.scale(sc, sc); x.rotate((1 - Math.min(1, p / 0.35)) * -0.08);
  x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = W * 0.04; x.shadowOffsetY = W * 0.015; rrect(x, -w / 2, -h / 2, w, h, W * 0.03); x.fillStyle = '#fff'; x.fill(); x.shadowColor = 'transparent'; x.clip();
  x.drawImage(img, -w / 2, -h / 2, w, h); x.restore();
}
function drawImgScene(x, W, H, img, p, dur) {
  if (!img?.naturalWidth) { x.fillStyle = '#222'; x.fillRect(0, 0, W, H); return; }
  const z = 1.02 + 0.1 * Math.min(1, p / Math.max(1, dur)); const s0 = Math.max(W / img.naturalWidth, H / img.naturalHeight) * z; const dw = img.naturalWidth * s0, dh = img.naturalHeight * s0;
  x.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const g = x.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
}

// ── ป้ายท้ายคลิป ──
/** วาดป้ายท้ายคลิปล่วงหน้า (ชื่อ ใบอนุญาต LINE ลายเซ็น) → canvas 1080×1920 */
export async function renderEndcard(P) {
  await loadFonts(); const W = 1080, H = 1920; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const pr = profile(); const st = P.style; x.drawImage(stageBg(VSTYLES[st]?.stage || 'grid', W, H), 0, 0);
  const dark = st === 'neon'; const ink = dark ? '#ffffff' : '#1b1717'; const acc = st === 'neon' ? '#ff4fd8' : st === 'grid' ? '#e0a800' : '#a6192e';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `600 40px ${FONT}`; x.fillStyle = dark ? 'rgba(255,255,255,.85)' : acc; x.fillText((pr.brand || 'AOM CONNECT').toUpperCase().split('').join(' '), W / 2, H * 0.26);
  let S = 104; x.font = `800 ${S}px ${FONT}`; const nm = pr.name || ''; let w = x.measureText(nm).width; if (w > W * 0.86) { S *= W * 0.86 / w; x.font = `800 ${S}px ${FONT}`; }
  glowText(x, nm, W / 2, H * 0.36, dark ? { fill: '#fff', glow: 'rgba(214,70,255,.8)', blur: 40 } : { fill: ink });
  x.font = `500 46px ${FONT}`; x.fillStyle = dark ? 'rgba(255,255,255,.9)' : '#4a4444'; x.fillText([pr.title, pr.company].filter(Boolean).join(' · ') || 'ที่ปรึกษาด้านประกันชีวิต', W / 2, H * 0.43);
  let y = H * 0.5;
  if (pr.licenseLife) { x.font = `500 40px ${FONT}`; x.fillText('ใบอนุญาตตัวแทนประกันชีวิตเลขที่ ' + pr.licenseLife, W / 2, y); y += 70; }
  if (pr.line) { x.font = `700 54px ${FONT}`; x.fillStyle = ink; x.fillText('LINE ' + pr.line, W / 2, y + 10); y += 90; }
  // ปุ่มชวนทัก
  const cta = 'ทักมาคุยกันได้เลย'; x.font = `700 56px ${FONT}`; const cw = x.measureText(cta).width + 120; const cy = Math.max(y + 60, H * 0.62);
  x.fillStyle = acc; rrect(x, (W - cw) / 2, cy - 55, cw, 110, 55); x.fill(); x.fillStyle = st === 'grid' ? '#1b1717' : '#fff'; x.fillText(cta, W / 2, cy + 3);
  const sig = getSig(); if (sig) await drawSignature(x, sig, W * 0.2, cy + 120, W * 0.6, 200, dark ? '#ffffff' : '#3b3b3b');
  return c;
}

// ── สไตล์มินิมอล: แบ่งจอ · การ์ดความรู้ · ป้ายชื่อ · เครดิต ──
function drawSplit(x, W, H, media, im, label, p) {
  const top = Math.round(H * 0.46);
  x.save(); x.beginPath(); x.rect(0, 0, W, top); x.clip(); x.drawImage(stageBg('grid', W, H), 0, -H * 0.1);
  if (im) {
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; const lh = label ? W * 0.085 : 0;
    const maxW = W * 0.84, maxH = top * 0.84 - lh; const k = Math.min(maxW / iw, maxH / ih); const w = iw * k, hh = ih * k; const e = Math.min(1, back(p / 0.35));
    const X = (W - w) / 2, Y = top * 0.06 + (maxH - hh) / 2 + (1 - e) * W * 0.03;
    x.globalAlpha = Math.min(1, p / 0.18); x.save(); x.shadowColor = 'rgba(0,0,0,.22)'; x.shadowBlur = W * 0.03; x.shadowOffsetY = W * 0.01; rrect(x, X, Y, w, hh, W * 0.018); x.fillStyle = '#fff'; x.fill(); x.restore();
    x.save(); rrect(x, X, Y, w, hh, W * 0.018); x.clip(); x.drawImage(im, X, Y, w, hh); x.restore();
    if (label) { const S = fitLabel(x, label, W * 0.06, W * 0.84); x.textAlign = 'center'; x.textBaseline = 'middle'; glowText(x, label, W / 2, Y + hh + lh * 0.55, { fill: '#ffd21f', stroke: '#2a2000', sw: S * 0.14, shadow: 'rgba(0,0,0,.35)', sblur: S * 0.3, soff: S * 0.05 }); }
  }
  x.restore();
  const vw = media?.videoWidth, vh = media?.videoHeight; x.save(); x.beginPath(); x.rect(0, top, W, H - top); x.clip();
  if (vw && media.readyState >= 2) { const BH = H - top; const k = Math.max(W / vw, BH / vh); const dw = vw * k, dh = vh * k; const P = CUR.P || {}; const f = [P.enhance !== false ? P.looks?.[media._clip] || '' : '', GRADE_F[P.grade] || ''].filter(Boolean).join(' '); if (f) x.filter = f; x.drawImage(media, (W - dw) / 2, top + (BH - dh) * 0.3, dw, dh); }
  else { x.fillStyle = '#16181d'; x.fillRect(0, top, W, H - top); }
  x.restore();
}
function fitLabel(x, s, size, maxW) { let S = size; x.font = `italic 800 ${S}px ${FONT}`; while (x.measureText(s).width > maxW && S > 14) { S -= 2; x.font = `italic 800 ${S}px ${FONT}`; } return S; }
function drawTerm(x, W, H, term, p, out) {
  const a = Math.min(1, p / 0.18) * out; if (a <= 0) return; x.save(); x.globalAlpha = a; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  const S = fitLabel(x, term.t, W * 0.115, W * 0.86); const sc = 0.88 + 0.12 * Math.min(1, back(p / 0.3)); x.translate(W / 2, H * 0.17); x.scale(sc, sc);
  glowText(x, term.t, 0, 0, { fill: '#ffd21f', stroke: '#2a2000', sw: S * 0.12, shadow: 'rgba(0,0,0,.45)', sblur: S * 0.25, soff: S * 0.05 });
  const d = '(' + term.d + ')'; let s2 = W * 0.036; x.font = `600 ${s2}px ${FONT}`; const ws = words(d); const L = []; let cur = '';
  for (const w of ws) { if (cur && x.measureText(cur + w).width > W * 0.84) { L.push(cur.trim()); cur = w; } else cur += w; } if (cur.trim()) L.push(cur.trim());
  L.slice(0, 2).forEach((l, i) => glowText(x, l, 0, s2 * 1.6 + i * s2 * 1.35, { fill: '#ffffff', shadow: 'rgba(0,0,0,.85)', sblur: s2 * 0.5, soff: s2 * 0.06 }));
  x.restore();
}
function drawCredit(x, W, H) {
  const pr = profile(); const s = `${(pr.brand || 'AOM CONNECT').toUpperCase()} · ${pr.titleEn || 'Financial Advisor'}`;
  x.save(); x.font = `500 ${W * 0.026}px ${FONT}`; x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.72)'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = W * 0.01; x.fillText('— ' + s + ' —', W / 2, H * 0.705); x.restore();
}

/** วาด 1 เฟรม ณ เวลา t (เวลาในคลิปที่ส่งออก) · ext: { win, mask, slides, imgs, posters, endcard } */
export function drawFrame(x, P, t, media, tl = timeline(P), ext = {}) {
  const W = x.canvas.width, H = x.canvas.height; const ch = P.chunks; const win = ext.win || window_(P); CUR = { P };
  const ci = activeIdx(ch, t); const ls = lastStarted(ch, t);
  let seg = tl.segs.filter((s) => s.start <= t).pop() || null; if (seg && t >= seg.end + 0.3) seg = null;
  const scene = seg?.scene || (P.mode === 'voice' ? 'stage' : 'cam');
  const hk = hookOf(P); const dt = t - win[0];
  x.save(); x.clearRect(0, 0, W, H);
  // สั่นจอ (เปิดคลิป)
  if ((hk === 'flash' || hk === 'money') && dt >= 0 && dt < 0.5) { const a = W * 0.012 * (1 - dt / 0.5); x.translate((rnd(Math.floor(t * 60)) - 0.5) * 2 * a, (rnd(Math.floor(t * 60) + 7) - 0.5) * 2 * a); }
  { const mc = ci >= 0 ? ch[ci] : null; if (mc?.mood === 'laugh' && t - mc.t0 < 0.5) { const a = W * 0.01 * (1 - (t - mc.t0) / 0.5); x.translate((rnd(Math.floor(t * 50)) - 0.5) * 2 * a, (rnd(Math.floor(t * 50) + 3) - 0.5) * 2 * a); } if (mc?.mood === 'shock' && t - mc.t0 < 0.2) { const z = 1 + 0.06 * (1 - (t - mc.t0) / 0.2); x.translate(W / 2, H * 0.4); x.scale(z, z); x.translate(-W / 2, -H * 0.4); } }
  const bgKind = VSTYLES[P.style]?.stage || 'grid';
  const split = P.mode === 'cam' && P.style === 'mini' && ['slide', 'img', 'poster'].includes(scene);
  const segC = seg ? ch[seg.idx[0]] : null;
  if (split) drawSplit(x, W, H, media, scene === 'slide' ? ext.slides?.[seg?.id] : scene === 'img' ? ext.imgs?.[seg?.id] : ext.posters?.[seg?.id], (ci >= 0 ? ch[ci].label : null) || segC?.label || null, t - (seg?.start ?? t));
  else if (scene === 'poster') { x.drawImage(stageBg(bgKind, W, H), 0, 0); const d = P.mode === 'cam' ? 0.4 : 0; if (P.mode === 'cam' && seg) cardShrink(x, W, H, media, (t - seg.start) / 0.4); drawSlideCard(x, W, H, ext.posters?.[seg?.id], t - (seg?.start ?? t) - d); }
  else if (scene === 'stage') { x.drawImage(stageBg(bgKind, W, H), 0, 0); if (P.mode === 'cam' && seg) cardShrink(x, W, H, media, (t - seg.start) / 0.4); }
  else if (scene === 'slide') { x.drawImage(stageBg(bgKind, W, H), 0, 0); const d = P.mode === 'cam' ? 0.4 : 0; if (P.mode === 'cam' && seg) cardShrink(x, W, H, media, (t - seg.start) / 0.4); drawSlideCard(x, W, H, ext.slides?.[seg?.id], t - (seg?.start ?? t) - d); }
  else if (scene === 'cut') { x.drawImage(stageBg(bgKind, W, H), 0, 0); if (!drawCutout(x, W, H, media, ext.mask, t - (seg?.start ?? t))) drawMedia(x, W, H, media, 1, 0, 0, false); }
  else if (scene === 'img') drawImgScene(x, W, H, ext.imgs?.[seg?.id], t - (seg?.start ?? t), seg ? seg.end - seg.start : 3);
  else {
    let z = 1, ox = 0, oy = 0;
    if (P.zoom) {
      const cut = tl.cuts.filter((c) => c <= t).pop(); const n = cut == null ? 0 : tl.cuts.indexOf(cut);
      [z, ox, oy] = ZOOM[n % ZOOM.length]; const pp = cut == null ? 1 : (t - cut) / 0.16; if (pp < 1) z *= 1 + 0.06 * (1 - ease(pp));
    }
    drawMedia(x, W, H, media, z, ox, oy, scene === 'bw');
    if (scene === 'bw') { const g = x.createRadialGradient(W / 2, H * 0.42, H * 0.25, W / 2, H * 0.42, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  }
  if (P.grade === 'cine' && !split && ['cam', 'bw'].includes(scene)) { const g = x.createRadialGradient(W / 2, H * 0.42, H * 0.3, W / 2, H * 0.42, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,10,20,.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  if (hk === 'money') drawMoney(x, W, H, dt);
  const counting = hk === 'count' && !!countTarget(P) && dt >= 0 && dt <= 1.7;
  // ซับ + สติกเกอร์
  const st = tl.stickers.filter((s) => s.at <= t && t < s.end && s.scene === scene).pop();
  const mode = split ? 'split' : scene;
  const titling = hk === 'title' && dt >= 0 && dt < 1.7;
  const skipText = (counting || titling) && ci >= 0 && ch[ci].line === ch[0].line;
  const lang = P.subLang || 'th'; const enOnly = lang === 'en' && !!enLine(P, t); let under = null;
  if (enOnly && !skipText) { if (st && ci >= 0) drawSticker(x, W, H, st, t, P, scene, null); drawEn(x, W, H, P, ci, t, mode, null); }
  else if (ci >= 0 && !skipText && ch[ci].arc) { if (st) drawSticker(x, W, H, st, t, P, scene, null); drawArc(x, W, H, P, ch, tl, t, ci, scene); }
  else if (ci >= 0 && !skipText && P.style === 'neon') {
    const textTop = drawNeon(x, W, H, P, ch, tl, t, scene, ci, true); under = { top: textTop };
    if (st) drawSticker(x, W, H, st, t, P, scene, textTop);
    drawNeon(x, W, H, P, ch, tl, t, scene, ci);
  } else {
    if (st) drawSticker(x, W, H, st, t, P, scene, null);
    if (ci >= 0 && !skipText) under = drawSingle(x, W, H, P, ch[ci], t, mode);
  }
  if (lang === 'both' && !skipText) drawEn(x, W, H, P, ci, t, mode, ci >= 0 && !ch[ci].arc ? under : null);
  // การ์ดความรู้ / ป้ายชื่อ (ไม่แสดงตอนแบ่งจอ)
  if (!split) {
    const tc = ch.filter((c) => c.term && c.t0 != null && c.t0 <= t && t < c.t0 + 3.2).pop();
    if (tc) { const nx = ch.find((c) => c.term && c.t0 > tc.t0); const end = Math.min(tc.t0 + 3.2, nx ? nx.t0 : 1e9); drawTerm(x, W, H, tc.term, t - tc.t0, end - t < 0.2 ? Math.max(0, (end - t) / 0.2) : 1); }
    else if (ci >= 0 && ch[ci].label) { const S = fitLabel(x, ch[ci].label, W * 0.07, W * 0.84); x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = Math.min(1, (t - ch[ci].t0) / 0.15); glowText(x, ch[ci].label, W / 2, H * 0.17, { fill: '#ffd21f', stroke: '#2a2000', sw: S * 0.13, shadow: 'rgba(0,0,0,.4)', sblur: S * 0.3, soff: S * 0.05 }); x.restore(); }
  }
  if (P.style === 'mini' && P.credit !== false && t < win[1]) drawCredit(x, W, H);
  if (titling) drawTitle(x, W, H, P, P.coverTitle || ch.filter((c) => c.line === ch[0]?.line).map((c) => c.text).join(' '), dt);
  if (counting) drawCount(x, W, H, P, dt, scene === 'stage' || scene === 'slide' ? 0.7 : 0.42);
  // แฟลชขาว
  if (hk === 'flash' && dt >= 0 && dt < 0.28) { x.fillStyle = `rgba(255,255,255,${0.85 * (1 - dt / 0.28)})`; x.fillRect(-W, -H, W * 3, H * 3); }
  x.restore();
  // ป้ายท้าย
  if (P.endcard && ext.endcard && t >= win[1]) { const p = Math.min(1, (t - win[1]) / 0.3); x.save(); x.globalAlpha = p; x.drawImage(ext.endcard, 0, 0, W, H); x.restore(); }
  return { ci, ls, scene };
}

/** หัวข้อตัวใหญ่กลางจอ 1.7 วินาทีแรก */
function drawTitle(x, W, H, P, title, dt) {
  if (!title) return; const inP = ease(dt / 0.25), out = dt > 1.45 ? Math.max(0, 1 - (dt - 1.45) / 0.25) : 1;
  let S = W * 0.105; x.save(); x.font = `800 ${S}px ${FONT}`; const ws = words(title); const L = []; let cur = '';
  for (const w of ws) { if (cur && x.measureText(cur + w).width > W * 0.84) { L.push(cur.trim()); cur = w; } else cur += w; }
  if (cur.trim()) L.push(cur.trim()); const lines3 = L.slice(0, 3); const lh = S * 1.2; const y0 = H * 0.42 - (lines3.length - 1) * lh / 2;
  x.globalAlpha = out; x.fillStyle = `rgba(0,0,0,${0.35 * inP})`; x.fillRect(0, 0, W, H);
  x.textAlign = 'left'; x.textBaseline = 'middle';
  lines3.forEach((l, i) => { const w = x.measureText(l).width; const y = y0 + i * lh + (1 - inP) * S * 0.5; glowText(x, l, (W - w) / 2, y, paint({ ...P, style: P.style === 'clean' ? 'neon' : P.style }, false, i === lines3.length - 1, S)(x, y)); });
  x.restore();
}

/** ปกคลิป: เฟรม ณ เวลา t + หัวข้อตัวใหญ่ด้านบน */
export function drawCover(x, P, t, media, title, tl, ext) {
  drawFrame(x, P, t, media, tl, { ...ext, endcard: null });
  const W = x.canvas.width, H = x.canvas.height; if (!title) return;
  const wordsArr = words(title); const lines2 = []; let cur = ''; let S = W * 0.11;
  x.save(); x.font = `800 ${S}px ${FONT}`;
  for (const w of wordsArr) { if (cur && x.measureText(cur + w).width > W * 0.86) { lines2.push(cur.trim()); cur = w; } else cur += w; }
  if (cur.trim()) lines2.push(cur.trim());
  const L = lines2.slice(0, 3); const lh = S * 1.22; let y = H * 0.16 - (L.length - 1) * lh / 2;
  const bg = x.createLinearGradient(0, 0, 0, H * 0.42); bg.addColorStop(0, 'rgba(0,0,0,.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bg; x.fillRect(0, 0, W, H * 0.42);
  x.textAlign = 'left'; x.textBaseline = 'middle';
  L.forEach((l, i) => { const w = x.measureText(l).width; glowText(x, l, (W - w) / 2, y + i * lh, paint({ ...P, style: P.style === 'clean' ? 'neon' : P.style }, false, i === L.length - 1, S)(x, y + i * lh)); });
  x.restore();
}

// ── เล่น / อัดไฟล์ ──
const MIMES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export const pickMime = () => (typeof MediaRecorder === 'undefined' ? null : MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || null);

/** ตัวเล่น: นาฬิกาหลักเป็นของตัวเอง สลับช่วงคลิปด้วยตัวเล่น 2 ตัว (เตรียมช่วงถัดไปไว้ล่วงหน้า ตัดต่อเนียน) */
export class Player {
  constructor(canvas, P, urls = {}, kind = 'video') {
    this.cv = canvas; this.x = canvas.getContext('2d'); this.P = P; this.urls = urls; this.kind = kind;
    this.pool = []; this.active = null; this.k = -1; this.playing = false; this.t = 0; this.rate = 1; this.sfxOn = true;
    this.ext = { slides: {}, imgs: {}, endcard: null }; this.onTime = null; this.onEnd = null;
    this.refresh();
  }
  refresh() { this.sl = segList(this.P); this.win = window_(this.P, this.sl); this.tl = timeline(this.P, this.sl); this.ev = sfxEvents(this.P, this.tl, this.win); }
  setUrls(urls) { this.urls = urls; for (const e of this.pool) { e._clip = null; e._k = -1; e.pause(); } this.active = null; this.k = -1; this.refresh(); }
  el(i) {
    if (!this.pool[i]) { const e = document.createElement(this.kind); e.playsInline = true; e.preload = 'auto'; e.crossOrigin = 'anonymous'; e._k = -1; this.pool[i] = e; if (this.ctx) this.wire(e); }
    return this.pool[i];
  }
  wire(e) { const s = this.ctx.createMediaElementSource(e); e._g = this.ctx.createGain(); e._g.gain.value = 0; s.connect(e._g).connect(this.voiceIn); }
  applyEnhance() {
    if (!this.ctx) return; const on = this.P.enhance !== false; if (this._enh === on) return; this._enh = on;
    try { this.voiceIn.disconnect(); } catch {}
    if (on) this.voiceIn.connect(this.vHp); else this.voiceIn.connect(this.master);
  }
  clipGain(e) { return this.P.enhance !== false ? (this.P.gain?.[e._clip] ?? 1) : 1; }
  other() { const a = this.el(0), b = this.el(1); return this.active === a ? b : a; }
  audio() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.recDest = ctx.createMediaStreamDestination(); this.master.connect(this.recDest);
    this.sfxGain = ctx.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.master);
    // เสียงพูด: ตัดเสียงลมต่ำ ๆ + คุมความดังให้สม่ำเสมอ
    this.voiceIn = ctx.createGain(); this.vHp = ctx.createBiquadFilter(); this.vHp.type = 'highpass'; this.vHp.frequency.value = 85;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.25;
    const mk = ctx.createGain(); mk.gain.value = 1.4; this.vHp.connect(comp).connect(mk).connect(this.master); this._enh = null; this.applyEnhance();
    this.pool.forEach((e) => this.wire(e));
    return ctx;
  }
  segAt(t) { return this.sl.findIndex((s) => t >= s.o0 && t < s.o1); }
  async load(e, k, t) {
    const s = this.sl[k]; const url = this.urls[s.clip]; if (!url) return false;
    if (e._clip !== s.clip) { e._clip = s.clip; e._k = -1; e.src = url; await new Promise((r) => { const ok = () => { e.removeEventListener('loadeddata', ok); e.removeEventListener('error', ok); r(); }; e.addEventListener('loadeddata', ok); e.addEventListener('error', ok); setTimeout(ok, 6000); }); }
    const want = s.a + Math.max(0, t - s.o0);
    if (Math.abs(e.currentTime - want) > 0.04) await new Promise((r) => { const done = () => { e.removeEventListener('seeked', done); r(); }; e.addEventListener('seeked', done); e.currentTime = want; setTimeout(done, 1500); });
    e._k = k; return true;
  }
  now() { return this.playing ? (this.ctx.currentTime - this.clock0) * this.rate : this.t; }
  draw(t = this.now(), fromMask = false) {
    this.t = t;
    const k = this.tl.segs.find((s) => s.start <= t && t < s.end + 0.3);
    if (!fromMask && k?.scene === 'cut' && segReady() && this.active) segUpdate(this.active, () => { if (!this.playing) this.draw(this.t, true); });
    const r = drawFrame(this.x, this.P, t, this.active, this.tl, { ...this.ext, win: this.win, mask: segMask() });
    this.onTime?.(t, r); return r;
  }
  async seek(t) {
    t = Math.max(0, Math.min(t, this.win[2])); this.t = t; const k = this.segAt(t);
    if (k >= 0) { const s = this.sl[k]; const e = this.active && this.active._clip === s.clip ? this.active : this.el(0); await this.load(e, k, t); this.active = e; this.k = k; }
    this.draw(t);
  }
  prepNext() {
    const n = this.k + 1; if (n <= 0 || n >= this.sl.length) return; const o = this.other(); if (o._k === n && o._ready) return;
    o._ready = false; const tk = (this._prep = {}); this.load(o, n, this.sl[n].o0).then((ok) => { if (this._prep === tk) { o._ready = ok; o.pause(); } });
  }
  activate(e) { if (this.active && this.active !== e) { this.active.pause(); if (this.active._g) this.active._g.gain.value = 0; } this.active = e; if (e._g) e._g.gain.value = this.clipGain(e); e.playbackRate = this.rate; e.play().catch(() => {}); }
  setMusic(buf) { this.musicBuf = buf; }
  startMusic(from) {
    this.stopMusic(); if (!this.musicBuf || !this.P.music || this.P.music === 'off' || !this.ctx) return;
    const ctx = this.ctx, a = this.win[0], now = ctx.currentTime; const off0 = Math.max(0, from - a); if (off0 >= this.musicBuf.duration) return;
    const v = this.P.musicVol ?? 0.35, lo = v * 0.32; const g = this.musicGain.gain; g.cancelScheduledValues(now);
    const spans = this.sl.length ? speechSpans(this.P.chunks) : [];
    g.setValueAtTime(spans.some(([s, e]) => from >= s && from < e) ? lo : v, now);
    for (const [s, e] of spans) { if (e <= from) continue; if (s > from) g.setTargetAtTime(lo, now + (s - from) / this.rate - 0.04, 0.05); g.setTargetAtTime(v, now + (e - from) / this.rate + 0.08, 0.15); }
    const src = ctx.createBufferSource(); src.buffer = this.musicBuf; src.playbackRate.value = this.rate; src.connect(this.musicGain);
    src.start(now + Math.max(0, (a - from) / this.rate), off0); this.msrc = src;
  }
  stopMusic() { try { this.msrc?.stop(); } catch {} this.msrc = null; }
  async play(from = this.t, { to = this.win[2], sfx = this.sfxOn, rate = 1, music = true } = {}) {
    const ctx = this.audio(); await ctx.resume().catch(() => {}); this.applyEnhance();
    this.rate = rate; this.to = to; this.sfxNow = sfx; this.sfxGain.gain.value = this.P.sfxVol ?? 0.8;
    const k = this.segAt(from); this.k = k;
    if (k >= 0) { const s = this.sl[k]; const e = this.active && this.active._clip === s.clip ? this.active : this.el(0); await this.load(e, k, from); this.activate(e); }
    for (const e of this.pool) if (e !== this.active || k < 0) { e.pause(); if (e._g) e._g.gain.value = 0; }
    this.clock0 = ctx.currentTime - from / rate; this.playing = true; this.sched = from - 0.001;
    this.prepNext(); if (music) this.startMusic(from);
    const loop = () => {
      if (!this.playing) return;
      const t = this.now(); const k2 = this.segAt(t);
      if (k2 !== this.k) {
        this.k = k2;
        if (k2 < 0) { this.active?.pause(); }
        else {
          const o = this.other();
          if (o._k === k2 && o._ready) { const s = this.sl[k2]; const want = s.a + (t - s.o0); if (Math.abs(o.currentTime - want) > 0.1) o.currentTime = want; this.activate(o); this.prepNext(); }
          else { const tk = (this._prep = {}); this.load(o, k2, t).then(() => { if (this._prep === tk && this.playing && this.k === k2) { this.activate(o); this.prepNext(); } }); }
        }
      } else if (k2 >= 0 && this.active && this.active._k === k2 && !this.active.seeking) {
        const s = this.sl[k2]; const want = s.a + (t - s.o0);
        if (Math.abs(this.active.currentTime - want) > 0.3) this.active.currentTime = want;
        else if (this.active.paused) this.active.play().catch(() => {});
      }
      if (this.sfxNow) { const ahead = t + 0.12 * rate; for (const e of this.ev) if (e.t > this.sched && e.t <= ahead) { const when = ctx.currentTime + Math.max(0, (e.t - t) / rate); if (e.n.startsWith('my:')) { const b = this.ext.sounds?.[e.n.slice(3)]; if (b) { const src = ctx.createBufferSource(); src.buffer = b; const g = ctx.createGain(); g.gain.value = e.v; src.connect(g).connect(this.sfxGain); src.start(when); } } else SFX[e.n]?.(ctx, this.sfxGain, when, e.v); } this.sched = Math.max(this.sched, ahead); }
      this.draw(t);
      if (t >= this.to - 0.01) { this.pause(); this.onEnd?.(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  pause() { if (this.playing) this.t = this.now(); this.playing = false; cancelAnimationFrame(this.raf); for (const e of this.pool) e.pause(); this.stopMusic(); }
  /** อัดเป็นไฟล์วิดีโอ (เล่นจริง 1 รอบตามเวลา) */
  async record(onProgress) {
    const mime = pickMime(); if (!mime || !this.cv.captureStream) throw new Error('เครื่องนี้อัดวิดีโอจากแอปไม่ได้ ลองใช้ Chrome เวอร์ชันล่าสุด');
    this.refresh(); this.audio(); await this.ctx.resume().catch(() => {});
    const [a, , end] = this.win; await this.seek(a);
    const stream = this.cv.captureStream(30); for (const tr of this.recDest.stream.getAudioTracks()) stream.addTrack(tr);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: this.cv.width >= 1080 ? 9_000_000 : 5_000_000, audioBitsPerSecond: 160_000 });
    const parts = []; rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    const prevEnd = this.onEnd; const prevTime = this.onTime; this.onTime = (t, r) => { prevTime?.(t, r); onProgress?.(Math.min(1, (t - a) / (end - a))); };
    rec.start(250);
    await new Promise((res) => { this.onEnd = res; this.play(a, { to: end, sfx: true, rate: 1 }); });
    this.draw(end); await new Promise((r) => setTimeout(r, 150));
    rec.stop(); await stopped; this.onTime = prevTime; this.onEnd = prevEnd; stream.getVideoTracks().forEach((t) => t.stop());
    return new Blob(parts, { type: mime.split(';')[0] });
  }
  destroy() { this.pause(); for (const e of this.pool) { e.removeAttribute('src'); e.load?.(); } try { this.ctx?.close(); } catch {} }
}
