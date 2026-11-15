// ─── เลิกทำ (Undo): จำสภาพข้อมูลก่อนเปลี่ยน แล้วให้กด "เลิกทำ" ได้ภายในไม่กี่วินาที ───
import * as store from './store.js';
import { toast } from './ui.js';

/** จำสภาพของระเบียน [[coll, id], ...] ก่อนแก้ */
export function snap(targets) { return targets.map(([coll, id]) => ({ coll, id, before: store.get(coll, id) })); }

/** คืนสภาพ: ระเบียนที่เคยมี → ใส่กลับ · ที่ไม่เคยมี (สร้างใหม่) → ลบ */
export function restore(snaps) {
  for (const s of snaps) { if (s.before) store.put(s.coll, { ...s.before }); else store.remove(s.coll, s.id); }
}

/** แสดงข้อความพร้อมปุ่มเลิกทำ */
export function offerUndo(msg, snaps, after) {
  toast(msg, { action: { label: 'เลิกทำ', fn: () => { restore(snaps); toast('เลิกทำแล้ว'); after && after(); } } });
}

/** ลบแบบเลิกทำได้: removeWithUndo('ลบนัดแล้ว', [['appts', id]]) */
export function removeWithUndo(msg, targets, after) {
  const snaps = snap(targets);
  for (const [coll, id] of targets) store.remove(coll, id);
  offerUndo(msg, snaps, after);
}
