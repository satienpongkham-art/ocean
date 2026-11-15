// รวมแผนทั้งหมด + หมวดหมู่ — ไฟล์นี้ไม่ต้องแก้ ให้แก้ในไฟล์ plans-*.js
import { LIFE_PLANS } from './plans-life.js';
import { CI_PLANS } from './plans-ci.js';
import { HEALTH_PLANS } from './plans-health.js';
import { ACCIDENT_PLANS } from './plans-accident.js';
import { SAVING_PLANS } from './plans-saving.js';

export const DATA_CHECKED = '2026-11-15'; // วันที่ตรวจข้อมูลกับ aia.co.th ล่าสุด

export const CATEGORIES = [
  { id: 'life', name: 'ประกันชีวิต', short: 'ชีวิต', desc: 'เงินก้อนให้ครอบครัว และเป็นสัญญาหลักไว้แนบสุขภาพ' },
  { id: 'health', name: 'ประกันสุขภาพ', short: 'สุขภาพ', desc: 'จ่ายค่ารักษาพยาบาล (สัญญาเพิ่มเติม)' },
  { id: 'ci', name: 'โรคร้ายแรง', short: 'โรคร้าย', desc: 'เงินก้อนเมื่อตรวจพบโรคร้ายแรง' },
  { id: 'hb', name: 'ชดเชยรายได้', short: 'ชดเชย', desc: 'เงินสดรายวันเมื่อนอนโรงพยาบาล' },
  { id: 'accident', name: 'อุบัติเหตุ', short: 'อุบัติเหตุ', desc: 'คุ้มครองอุบัติเหตุ ซื้อเดี่ยวได้ เบี้ยคงที่' },
  { id: 'saving', name: 'ออมทรัพย์', short: 'ออม', desc: 'ออมเงินพร้อมความคุ้มครอง ผลประโยชน์การันตี' },
  { id: 'annuity', name: 'บำนาญ', short: 'บำนาญ', desc: 'รายได้หลังเกษียณ ลดหย่อนภาษีหมวดบำนาญ' },
  { id: 'senior', name: 'ผู้สูงอายุ', short: 'สูงวัย', desc: 'สำหรับวัย 50+ ไม่ตรวจสุขภาพ' },
];
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// รวมและเรียง: แผนแนะนำ (star) ขึ้นก่อนในแต่ละหมวด
const order = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
export const PLANS = [...LIFE_PLANS, ...HEALTH_PLANS, ...CI_PLANS, ...ACCIDENT_PLANS, ...SAVING_PLANS]
  .sort((a, b) => (order[a.cat] - order[b.cat]) || ((b.star ? 1 : 0) - (a.star ? 1 : 0)));
export const PLAN = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export const TAX_LABEL = {
  life: 'ลดหย่อนหมวดประกันชีวิต (≤100,000)',
  health: 'ลดหย่อนหมวดประกันสุขภาพ (≤25,000 รวมกับชีวิต ≤100,000)',
  annuity: 'ลดหย่อนหมวดบำนาญ (≤15% ของเงินได้ ไม่เกิน 200,000)',
  none: 'ลดหย่อนภาษีไม่ได้',
  check: 'ลดหย่อนได้เฉพาะส่วนที่เข้าเงื่อนไข — ตรวจหมวดในหนังสือรับรองเบี้ย',
};

/** วันที่เหลือก่อนปิดรับ (ถ้ามี) */
export function closingInfo(plan, today = new Date()) {
  if (!plan || plan.closed) return plan && plan.closed ? { closed: true } : null;
  if (!plan.closing) return null;
  const end = new Date(plan.closing + 'T23:59:59');
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.ceil((end - t0) / 864e5) - 1;
  if (days < 0) return { closed: true, date: plan.closing };
  return { days, date: plan.closing };
}

/** สรุปข้อมูลสั้นสำหรับการ์ด: อายุรับ / ชำระ / คุ้มครอง */
export function quickFacts(p) {
  const spec = Object.fromEntries(p.specs || []);
  const age = spec['อายุรับประกัน'] || (p.specs || []).find(([k]) => k.startsWith('อายุ'))?.[1] || '';
  const tl = p.timeline || {};
  let pay = '';
  if (tl.payOptions) pay = 'จ่าย ' + tl.payOptions.join(' / ') + ' ปี';
  else if (tl.payYears) pay = 'จ่าย ' + tl.payYears + ' ปี';
  else if (tl.payToAge) pay = 'จ่ายถึงอายุ ' + tl.payToAge;
  else if (tl.yearly) pay = 'ปีต่อปี';
  else if (tl.rider) pay = 'สัญญาเพิ่มเติม';
  let cover = '';
  if (tl.coverToAge) cover = 'คุ้มครองถึง ' + tl.coverToAge;
  else if (tl.coverYears) cover = 'คุ้มครอง ' + tl.coverYears + ' ปี';
  else if (tl.coverSameAsPay) cover = 'คุ้มครองเท่าระยะจ่าย';
  else if (tl.renewToAge) cover = 'ต่ออายุถึง ' + tl.renewToAge;
  return { age: age.replace(/\s*\(.*\)/, ''), pay, cover };
}
