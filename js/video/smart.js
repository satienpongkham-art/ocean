// ─── จัดให้อัตโนมัติ: เลือกสติกเกอร์ ฉาก ตัวหนังสือโค้ง เอฟเฟกต์เปิด เพลง ป้ายท้าย ให้เหมาะกับบท · แม่แบบคลิป ───
import { suggestEmoji } from '../../data/emoji.js';
import { visLen } from './engine.js';

const NEG = /ไม่มี|ไม่ได้|ไม่พอ|ปัญหา|เสียเงิน|แพง|ยากมาก|ลำบาก|เจ็บ|ป่วย|หมดตัว|เสี่ยง|เชื่อว่า|เข้าใจผิด/;
const NUMRE = /\d/;
const lineText = (P, ln) => P.chunks.filter((c) => c.line === ln).map((c) => c.text).join('');

/**
 * opts: { slides: จำนวนสไลด์ที่ใช้ได้ (จากงานในสตูดิโอ) , slideKinds: ['stat',...], canCut: เครื่องแรงพอตัดฉากหลังไหม }
 * คืนข้อความสรุปสิ่งที่เลือกให้
 */
export function autoAll(P, { slideKinds = [], canCut = false } = {}) {
  const lines = [...new Set(P.chunks.map((c) => c.line))];
  const did = { stickers: 0, stage: 0, bw: 0, slide: 0, cut: 0, arc: 0 };
  P.chunks.forEach((c) => { c.emoji = null; c.scene = P.mode === 'voice' ? 'stage' : 'cam'; c.arc = false; c.slide = null; if (c.scene !== 'img') c.img = c.img || null; });
  // 1) สติกเกอร์: บรรทัดละ 1 ตัว ที่ช่วงแรกที่มีคำเข้าเค้า
  for (const ln of lines) { const cs = P.chunks.filter((c) => c.line === ln); const c = cs.find((x) => suggestEmoji(x.text)) || null; const code = c ? suggestEmoji(c.text) : suggestEmoji(lineText(P, ln)); if (code) { (c || cs[0]).emoji = code; did.stickers++; } }
  // 2) สไลด์ตัวเลข/กราฟ จากงานในสตูดิโอ (บรรทัดที่มีตัวเลข)
  const good = slideKinds.map((k, i) => [k, i]).filter(([k]) => ['stat', 'bar', 'line', 'donut', 'table', 'timeline', 'versus'].includes(k)).map(([, i]) => i);
  let si = 0;
  // 3) ฉาก
  lines.forEach((ln, k) => {
    const cs = P.chunks.filter((c) => c.line === ln); const txt = lineText(P, ln);
    if (k === 0) return; // บรรทัดแรก = หน้าตรง ๆ ดึงคนดู
    if (good.length && NUMRE.test(txt) && si < good.length) { cs.forEach((c) => { c.scene = 'slide'; c.slide = good[si]; }); si++; did.slide++; return; }
    if (P.mode === 'voice') return;
    if (NEG.test(txt) && P.style !== 'grid' && did.bw < 2) { cs.forEach((c) => { c.scene = 'bw'; }); did.bw++; return; }
    if (k % 3 === 1 && cs.some((c) => c.emoji)) { cs.forEach((c) => { c.scene = 'stage'; }); did.stage++; return; }
    if (canCut && !did.cut && k >= 2 && k < lines.length - 1) { cs.forEach((c) => { c.scene = 'cut'; }); did.cut++; }
  });
  // 4) ตัวหนังสือโค้งรอบหัว 1 บรรทัด (Neon) — บรรทัดสั้น ไม่ใช่บรรทัดแรก และเป็นฉากหน้ากล้อง
  if (P.style === 'neon' && P.mode === 'cam') {
    const ln = lines.find((l, k) => k > 0 && P.chunks.filter((c) => c.line === l).every((c) => c.scene === 'cam') && visLen(lineText(P, l)) <= 22 && P.chunks.filter((c) => c.line === l).length <= 2);
    if (ln != null) { P.chunks.filter((c) => c.line === ln).forEach((c) => { c.arc = true; }); did.arc = 1; }
  }
  // 5) แม่แบบ: กฎของแม่แบบมาก่อน
  for (const r of P.tplRules || []) { const cs = P.chunks.filter((c) => c.line === r.line); if (!cs.length) continue; if (r.scene && !(P.mode === 'voice' && r.scene !== 'stage')) cs.forEach((c) => { c.scene = r.scene; }); if (r.emoji) { cs.forEach((c) => { c.emoji = null; }); cs[0].emoji = r.emoji; } }
  P.hook = 'auto'; P.music = P.music && P.music !== 'off' ? P.music : 'auto'; P.endcard = true; P.autoDone = true;
  const parts = [did.stickers && `สติกเกอร์ ${did.stickers}`, did.stage && `ฉากตาราง ${did.stage}`, did.bw && `ขาวดำ ${did.bw}`, did.slide && `สไลด์ ${did.slide}`, did.cut && 'ตัดฉากหลัง 1', did.arc && 'ตัวโค้ง 1'].filter(Boolean);
  return parts.length ? 'จัดให้แล้ว: ' + parts.join(' · ') + ' · เอฟเฟกต์เปิด เพลง ป้ายท้าย' : 'จัดให้แล้ว';
}

// ── แม่แบบคลิป ── (ไม่มีคำลงท้ายครับ/ค่ะ ใช้ได้ทุกคน)
export const TEMPLATES = [
  { id: 'myth', name: 'ความเชื่อ vs ความจริง', sub: 'แก้ความเข้าใจผิด', style: 'neon',
    fields: [['belief', 'ความเชื่อผิด ๆ', 'ประกันสุขภาพ ซื้อตอนป่วยก็ได้'], ['truth', 'ความจริง', 'ป่วยแล้วอาจซื้อไม่ได้'], ['why', 'เพราะอะไร', 'บริษัทพิจารณาสุขภาพก่อนรับประกัน'], ['todo', 'ควรทำอะไร', 'ทำตอนยังแข็งแรง เบี้ยถูกกว่าด้วย']],
    build: (f) => [`หลายคนเชื่อว่า ${f.belief}`, `แต่ความจริงคือ *${f.truth}*`, `เพราะ${f.why}`, `สิ่งที่ควรทำคือ ${f.todo}`, 'สงสัยตรงไหน ทักมาคุยกันได้เลย'],
    rules: [{ line: 0, scene: 'bw', emoji: '274c' }, { line: 1, scene: 'stage', emoji: '2705' }, { line: 2, emoji: '1f4a1' }, { line: 3, emoji: '1f4dd' }, { line: 4, emoji: '1f4ac' }] },
  { id: 'three', name: '3 ข้อที่ต้องรู้', sub: 'สั้น เข้าใจง่าย คนชอบเซฟ', style: 'grid',
    fields: [['topic', 'เรื่องอะไร', 'ซื้อประกันสุขภาพ'], ['p1', 'ข้อ 1', 'ดูค่าห้องให้พอกับ รพ. ที่ใช้'], ['p2', 'ข้อ 2', 'เช็กระยะรอคอย'], ['p3', 'ข้อ 3', 'อ่านข้อยกเว้นให้ครบ']],
    build: (f) => [`3 เรื่องที่ต้องรู้ก่อน${f.topic}`, `ข้อแรก *${f.p1}*`, `ข้อสอง *${f.p2}*`, `ข้อสาม *${f.p3}*`, 'เซฟไว้ แล้วส่งให้คนที่คุณรัก'],
    rules: [{ line: 0, emoji: '2757' }, { line: 1, scene: 'stage', emoji: '1f449' }, { line: 2, emoji: '1f50d' }, { line: 3, scene: 'stage', emoji: '1f4c4' }, { line: 4, emoji: '2764-fe0f' }] },
  { id: 'case', name: 'เล่าเคสลูกค้า', sub: 'ใช้นามสมมติเสมอ', style: 'aom',
    fields: [['name', 'นามสมมติ', 'พี่เอ'], ['situation', 'เกิดอะไรขึ้น', 'ผ่าตัดไส้ติ่งด่วน ค่ารักษาแสนกว่าบาท'], ['result', 'ผลลัพธ์', 'ประกันจ่ายให้เกือบทั้งหมด'], ['lesson', 'อยากฝากอะไร', 'มีประกันไว้ ไม่ต้องควักเงินเก็บ']],
    build: (f) => [`เคสจริงของ${f.name} (นามสมมติ)`, f.situation, `สุดท้าย *${f.result}*`, `สิ่งที่อยากฝากคือ ${f.lesson}`, 'อยากเช็กความคุ้มครองของตัวเอง ทักมาได้เลย'],
    rules: [{ line: 0, emoji: '1f3a4' }, { line: 1, scene: 'bw', emoji: '1f3e5' }, { line: 2, scene: 'stage', emoji: '1f6e1-fe0f' }, { line: 3, emoji: '1f4a1' }, { line: 4, emoji: '1f4ac' }] },
  { id: 'qa', name: 'ถาม-ตอบ', sub: 'ตอบคำถามที่เจอบ่อย', style: 'clean',
    fields: [['question', 'คำถาม', 'ลดหย่อนภาษีจากประกันได้เท่าไร'], ['answer', 'คำตอบสั้น ๆ', 'ประกันชีวิตสูงสุด 100,000 บาท'], ['extra', 'ข้อมูลเพิ่ม', 'ประกันสุขภาพลดได้อีก 25,000 บาท']],
    build: (f) => [`คำถามที่เจอบ่อย ${f.question}`, `คำตอบคือ *${f.answer}*`, f.extra, 'มีคำถามอื่น คอมเมนต์ไว้ได้เลย'],
    rules: [{ line: 0, emoji: '2753' }, { line: 1, scene: 'stage', emoji: '2705' }, { line: 2, emoji: '1f9fe' }, { line: 3, emoji: '1f4ac' }] },
  { id: 'number', name: 'ตัวเลขช็อก', sub: 'เปิดด้วยตัวเลขนับขึ้น', style: 'neon',
    fields: [['number', 'ตัวเลข', '1,500,000 บาท'], ['meaning', 'ตัวเลขนี้คืออะไร', 'ค่ารักษามะเร็งเฉลี่ยต่อคอร์ส'], ['action', 'ทางออก', 'เตรียมความคุ้มครองโรคร้ายแรงไว้ก่อน']],
    build: (f) => [`รู้ไหม *${f.number}*`, `คือ${f.meaning}`, `ทางออกคือ ${f.action}`, 'ทักมาคุยกันได้เลย'],
    rules: [{ line: 0, emoji: '1f631' }, { line: 1, scene: 'bw', emoji: '1f4b8' }, { line: 2, scene: 'stage', emoji: '1f511' }, { line: 3, emoji: '1f4ac' }], hook: 'count' },
];
