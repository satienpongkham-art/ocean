// ─── ภาพแทรกอัตโนมัติ: ได้ยินคำเรื่องโรงพยาบาล เงินเก็บ ครอบครัว เกษียณ… ขึ้นภาพประกอบ (วาดในแอป) ตรงช่วงนั้น ───
// เลือกตำแหน่งแบบนักตัดต่อ: ไม่ทับฮุก 2 วิแรกและช่วงปิดท้าย · เว้นห่างกัน · ชอบช่วงที่ไม่ได้มองกล้อง (เช่น ก้มอ่านโน้ต)
import { drawArt, ARTS_PEOPLE } from '../art.js';
export { ARTS_PEOPLE };

export const BROLL = [
  [/โรงพยาบาล|ป่วย|หมอ|ค่ารักษา|แอดมิท|นอนโรงพยาบาล|ผ่าตัด|สุขภาพ|โรคร้าย|มะเร็ง/, 'p-care'],
  [/ครอบครัว|ลูก|พ่อแม่|คุณแม่|คุณพ่อ|ภรรยา|สามี|คนที่รัก|คนข้างหลัง/, 'p-family'],
  [/เกษียณ|บำนาญ|วัยเกษียณ|สูงวัย|ผู้สูงอายุ|แก่ตัว|ตอนแก่/, 'p-elder'],
  [/ลงทุน|ผลตอบแทน|งอกเงย|ดอกเบี้ย|เงินปันผล|หุ้น|กองทุน|ทบต้น/, 'p-grow'],
  [/ออม|เก็บเงิน|เงินเก็บ|ประหยัด|เงินสำรอง|ออมทรัพย์/, 'p-saver'],
  [/เงินเดือน|มนุษย์เงินเดือน|ทำงาน|ออฟฟิศ|รายได้|เจ้าของกิจการ|ธุรกิจ/, 'p-work'],
  [/สงสัย|ไม่รู้|คำถาม|ทำไม|ยังไง|อย่างไร|จริงไหม|ใช่ไหม/, 'p-think'],
];
export const guessArt = (text) => BROLL.find(([re]) => re.test(text))?.[1] || null;

const cache = new Map();
/** ภาพประกอบ 1080×1080 (แคชไว้) */
export function artCanvas(key, accent = '#a6192e') {
  const k = key + accent; if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 1080; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#fdf7f4'); g.addColorStop(1, '#f4e7e3'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
  drawArt(x, key, 540, 560, 900, { accent, bg2: '#f6e3df' });
  cache.set(k, c); return c;
}

/**
 * วางภาพแทรกให้อัตโนมัติ (แก้ P.chunks ในตัว) · away = ช่วงไม่ได้มองกล้อง [{t0,t1}] · คืนจำนวนที่วาง
 * กติกา: ช่วงพูดหน้ากล้องเท่านั้น · ไม่ใช่บรรทัดแรก/ช่วงสุดท้าย · ยาว 0.8–3 วิ · ห่างกันอย่างน้อย 5 วิ · ไม่เกิน 1 ภาพต่อ ~8 วิ (สูงสุด 4)
 */
export function autoBroll(P, away = []) {
  const ch = P.chunks; if (!ch.length || ch[0].t0 == null) return 0;
  ch.forEach((c) => { if (c.scene === 'art' && c.autoArt) { c.scene = P.mode === 'voice' ? 'stage' : 'cam'; c.art = null; c.autoArt = false; } });
  const end = ch[ch.length - 1].t1 ?? 0; const max = Math.min(4, Math.max(1, Math.floor(end / 8)));
  const firstLine = ch[0].line; const free = (c) => (c.scene || 'cam') === (P.mode === 'voice' ? 'stage' : 'cam') && !c.term && !c.label;
  const cand = [];
  ch.forEach((c, i) => {
    if (c.t0 == null || c.line === firstLine || i === ch.length - 1 || c.t0 < 2 || !free(c)) return;
    const key = guessArt(c.text); const ov = away.reduce((a, r) => a + Math.max(0, Math.min(r.t1, c.t1) - Math.max(r.t0, c.t0)), 0);
    if (!key && ov < 0.6) return;
    cand.push({ i, key: key || guessArt(ch.filter((x) => x.line === c.line).map((x) => x.text).join('')) || 'p-think', score: (key ? 2 : 0) + Math.min(2, ov * 1.5) + (c.t1 - c.t0 >= 1 ? 0.5 : 0) });
  });
  cand.sort((a, b) => b.score - a.score); const used = []; const keys = new Set();
  for (const k of cand) {
    if (used.length >= max) break; const c = ch[k.i]; if (used.some((u) => Math.abs(ch[u].t0 - c.t0) < 5)) continue;
    if (keys.has(k.key) && cand.some((o) => !keys.has(o.key) && o !== k && !used.includes(o.i))) continue; // ชอบภาพไม่ซ้ำกัน
    c.scene = 'art'; c.art = k.key; c.autoArt = true;
    const n = ch[k.i + 1]; if (n && n.line === c.line && free(n) && (n.t1 - c.t0) <= 3) { n.scene = 'art'; n.art = k.key; n.autoArt = true; }
    used.push(k.i); keys.add(k.key);
  }
  return used.length;
}
