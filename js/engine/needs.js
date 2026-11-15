// ─────────────────────────────────────────────────────────────
// วิเคราะห์ความต้องการ (Needs) + ตรวจสุขภาพการเงิน 8 ด้าน (แมนฮาร่า)
// หลักการ/สมมติฐาน (แสดงในแอปให้ลูกค้าเห็นได้):
//  • ทุนชีวิต = ค่าใช้จ่ายครอบครัวต่อปี (ไม่ระบุ = 70% ของรายได้) × จำนวนปีที่ครอบครัวต้องพึ่งพา + หนี้คงค้าง + ทุนการศึกษาบุตร − เงินออมที่ใช้ได้
//  • ทุนโรคร้ายแรง = รายได้ต่อปี × 3 (ชดเชยรายได้ช่วงรักษา/พักฟื้น) ขั้นต่ำ 500,000
//  • เงินสำรองฉุกเฉิน = ค่าใช้จ่ายต่อเดือน × 6
//  • ออม ≥ 10% ของรายได้ · งบเบี้ยประกันรวม 10–15% ของรายได้ (วัยเริ่มงาน 5–10%)
//  • เกษียณ: ใช้ 70% ของค่าใช้จ่ายปัจจุบัน × 12 × (85 − อายุเกษียณ) ไม่คิดเงินเฟ้อ/ผลตอบแทน (แบบง่าย)
// ─────────────────────────────────────────────────────────────

export const ASSUME = {
  ciYears: 3, ciMin: 500000, emergencyMonths: 6, savingRate: 0.10,
  eduPerChild: 500000, retireAge: 60, lifeTo: 85, retireReplace: 0.7,
  familyShare: 0.7, roomTarget: 3000, healthLimitTarget: 1000000, paTarget: 500000,
};

const num = (x) => (x == null || x === '' || isNaN(x) ? 0 : Number(x));

export function dependents(p) {
  return { spouse: p.marital === 'married', kids: num(p.kids), parents: num(p.parents) };
}

/** จำนวนปีที่ครอบครัวต้องพึ่งพารายได้ */
export function supportYears(p) {
  const d = dependents(p);
  if (d.kids > 0) {
    const youngest = num(p.youngestKidAge);
    return Math.min(20, Math.max(10, 22 - youngest));
  }
  if (d.spouse) return 5;
  if (d.parents > 0) return 5;
  return 0;
}

export function lifeNeed(p) {
  const annual = (num(p.monthlyExpense) || num(p.incomeMonthly) * ASSUME.familyShare) * 12;
  const yrs = supportYears(p);
  const edu = num(p.kids) * ASSUME.eduPerChild;
  const need = Math.max(0, annual * yrs + num(p.debt) + edu - num(p.liquidSavings));
  const have = num(p.lifeCover);
  return { need, have, gap: Math.max(0, need - have), years: yrs, annual, edu };
}
export function ciNeed(p) {
  const need = Math.max(ASSUME.ciMin, num(p.incomeMonthly) * 12 * ASSUME.ciYears);
  const have = num(p.ciCover);
  return { need, have, gap: Math.max(0, need - have) };
}

export const HEALTH_LEVELS = [
  ['none', 'ไม่มีเลย / มีแค่สิทธิรัฐ'],
  ['welfare', 'มีสวัสดิการบริษัท/ประกันกลุ่ม'],
  ['basic', 'มีประกันสุขภาพส่วนตัว (วงเงินต่ำ / แยกค่าใช้จ่าย)'],
  ['good', 'มีเหมาจ่ายวงเงินสูง (≥ 1 ล้าน)'],
];

function status(score) {
  if (score == null) return 'na';
  if (score >= 80) return 'good';
  if (score >= 40) return 'warn';
  return 'bad';
}
const pct = (have, need) => (need <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((have / need) * 100))));

/**
 * ตรวจสุขภาพการเงิน 8 ด้าน → ใช้วาดแมนฮาร่า
 * p: ข้อมูลลูกค้า + fhc fields
 */
export function healthCheck(p) {
  const annual = num(p.incomeMonthly) * 12;
  const expense = num(p.monthlyExpense) || num(p.incomeMonthly) * 0.7;
  const areas = [];

  // 1) ชีวิต
  const L = lifeNeed(p);
  areas.push({
    key: 'life', label: 'ทุนชีวิต', cat: 'life',
    score: L.need === 0 ? (L.have > 0 ? 100 : null) : pct(L.have, L.need),
    have: L.have, need: L.need,
    text: L.need === 0 ? 'ยังไม่มีคนพึ่งพารายได้ — ทุนชีวิตใช้เป็นสัญญาหลักไว้แนบสุขภาพ' : `ต้องการ ${fmtM(L.need)} มี ${fmtM(L.have)}`,
  });

  // 2) สุขภาพ (ค่ารักษา)
  const hl = p.healthLevel || 'none';
  const hScore = { none: 0, welfare: 45, basic: 60, good: 100 }[hl] ?? 0;
  areas.push({
    key: 'health', label: 'ค่ารักษา', cat: 'health', score: hScore,
    text: { none: 'ยังไม่มีประกันสุขภาพของตัวเอง', welfare: 'มีแต่สวัสดิการ — หายเมื่อเปลี่ยนงาน/เกษียณ', basic: 'มีแล้วแต่วงเงินอาจไม่พอค่ารักษาใหญ่', good: 'มีเหมาจ่ายวงเงินสูงแล้ว' }[hl],
  });

  // 3) โรคร้ายแรง
  const C = ciNeed(p);
  areas.push({ key: 'ci', label: 'โรคร้ายแรง', cat: 'ci', score: annual ? pct(C.have, C.need) : null, have: C.have, need: C.need, text: `ควรมี ${fmtM(C.need)} (รายได้ 3 ปี) มี ${fmtM(C.have)}` });

  // 4) อุบัติเหตุ
  const pa = num(p.paCover);
  areas.push({ key: 'accident', label: 'อุบัติเหตุ', cat: 'accident', score: pct(pa, ASSUME.paTarget), have: pa, need: ASSUME.paTarget, text: pa ? `มีทุนอุบัติเหตุ ${fmtM(pa)}` : 'ยังไม่มีประกันอุบัติเหตุ' });

  // 5) เงินออม / สำรองฉุกเฉิน
  const em = num(p.liquidSavings); const emNeed = expense * ASSUME.emergencyMonths;
  const saveRate = annual ? (num(p.monthlySaving) * 12) / annual : 0;
  const sScore = Math.round(pct(em, emNeed) * 0.6 + Math.min(100, (saveRate / ASSUME.savingRate) * 100) * 0.4);
  areas.push({ key: 'saving', label: 'เงินออม', cat: 'saving', score: annual ? sScore : null, have: em, need: emNeed, text: `สำรอง ${fmtM(em)} / ควรมี ${fmtM(emNeed)} · ออม ${Math.round(saveRate * 100)}% ของรายได้` });

  // 6) เกษียณ
  const age = num(p.age);
  const yearsToRetire = Math.max(0, ASSUME.retireAge - age);
  const retNeed = expense * ASSUME.retireReplace * 12 * (ASSUME.lifeTo - ASSUME.retireAge);
  const retHave = num(p.retirementFund) + num(p.monthlyRetireSaving) * 12 * yearsToRetire;
  areas.push({ key: 'retire', label: 'เกษียณ', cat: 'annuity', score: age ? pct(retHave, retNeed) : null, have: retHave, need: retNeed, text: `ต้องใช้ ~${fmtM(retNeed)} (70% ของค่าใช้จ่าย × ${ASSUME.lifeTo - ASSUME.retireAge} ปี) คาดว่าจะมี ${fmtM(retHave)}` });

  // 7) การศึกษาบุตร
  const kids = num(p.kids);
  const eduNeed = kids * ASSUME.eduPerChild;
  areas.push({ key: 'edu', label: 'การศึกษาบุตร', cat: 'saving', score: kids ? pct(num(p.eduFund), eduNeed) : null, have: num(p.eduFund), need: eduNeed, text: kids ? `ลูก ${kids} คน ควรมีทุน ${fmtM(eduNeed)}` : 'ไม่มีบุตร' });

  // 8) ภาษี
  const taxable = annual > 310000; // คร่าว ๆ: เงินได้เกินนี้เริ่มเสียภาษี (หลังหักค่าใช้จ่าย+ส่วนตัว+ประกันสังคม)
  const used = num(p.taxLifeUsed);
  areas.push({ key: 'tax', label: 'ภาษี', cat: 'annuity', score: taxable ? pct(used, 100000) : null, have: used, need: 100000, text: taxable ? `ใช้สิทธิประกันชีวิต/สุขภาพแล้ว ${fmtM(used)} จาก 100,000` : 'รายได้ยังไม่ถึงเกณฑ์เสียภาษี' });

  for (const a of areas) a.status = status(a.score);
  const scored = areas.filter((a) => a.score != null);
  const overall = scored.length ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length) : 0;
  return { areas, overall };
}

export function fmtM(n) {
  n = Math.round(num(n));
  if (n >= 1e6) return (n / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้าน';
  return n.toLocaleString('th-TH');
}
