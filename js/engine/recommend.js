// ─────────────────────────────────────────────────────────────
// ระบบแนะนำ (กฎ ไม่ใช้ AI): ข้อมูลลูกค้า → แพ็กเกจ + ระดับ + เหตุผลเป็นประโยค
// ─────────────────────────────────────────────────────────────
import { PACKAGES, TIER_LABEL } from '../../data/packages.js';
import { AGE_BANDS, CASES } from '../../data/cases.js';
import { lifeNeed, ciNeed, fmtM, supportYears } from './needs.js';

const num = (x) => (x == null || x === '' || isNaN(x) ? 0 : Number(x));

export function ageBand(age) {
  age = num(age);
  if (age >= 60) return AGE_BANDS.find((b) => b.id === '60+');
  if (age >= 50) return AGE_BANDS.find((b) => b.id === '50-60');
  if (age >= 40) return AGE_BANDS.find((b) => b.id === '40-50');
  if (age >= 30) return AGE_BANDS.find((b) => b.id === '30-40');
  return AGE_BANDS.find((b) => b.id === '20-30');
}

/** เลือกแพ็กเกจ + ระดับ พร้อมเหตุผล */
export function recommend(p) {
  const age = num(p.age);
  const inc = num(p.incomeMonthly);
  const concerns = new Set(p.concerns || []);
  const hasDeps = p.marital === 'married' || num(p.kids) > 0 || num(p.parents) > 0;
  const reasons = [];
  let pkgId;

  if (age > 0 && age < 18) { pkgId = 'kids'; reasons.push(`อายุ ${age} ปี — ใช้แผนสำหรับเด็ก เน้นค่ารักษาเหมาจ่ายและล็อกสุขภาพก่อนมีประวัติป่วย`); }
  else if (age >= 50 && (concerns.has('senior') || age >= 60)) { pkgId = 'parents'; reasons.push(`อายุ ${age} ปี — กลุ่มที่ทำประกันทั่วไปยาก จึงเน้นแบบไม่ตรวจสุขภาพ + อุบัติเหตุ`); }
  else if (concerns.has('waste')) { pkgId = 'no-waste'; reasons.push('ลูกค้ากังวลเรื่อง "จ่ายทิ้ง" — ใช้ CI ProCare ที่ไม่ป่วยก็ได้ทุนคืน'); }
  else if ((concerns.has('retire') || concerns.has('tax')) && age >= 30 && inc >= 40000) { pkgId = 'retire-tax'; reasons.push(`รายได้ ${fmtM(inc)} บาท/เดือน และต้องการวางแผนเกษียณ/ภาษี — ใช้ประกันออม + บำนาญลดหย่อนได้ 2 หมวด`); }
  else if (hasDeps) { pkgId = 'family-pillar'; reasons.push(depText(p) + ' — รายได้ของลูกค้าคือหลักประกันของบ้าน'); }
  else if ((p.healthLevel === 'welfare' || p.healthLevel === 'good') && age >= 25) { pkgId = 'has-welfare'; reasons.push('มีสวัสดิการอยู่แล้ว — เติมเฉพาะช่องว่างใหญ่ (โรคร้ายแรง วงเงินหลักล้าน) ในเบี้ยไม่สูง'); }
  else if (age <= 32) { pkgId = 'first-jobber'; reasons.push(`อายุ ${age || '—'} ปี ยังไม่มีภาระ — ช่วงที่เบี้ยถูกและสมัครง่ายที่สุด`); }
  else { pkgId = 'family-pillar'; reasons.push('วางฐานความคุ้มครองครบ: ชีวิต สุขภาพ โรคร้าย อุบัติเหตุ'); }

  // ระดับตามรายได้/งบ
  let tier;
  const budget = num(p.budgetMonthly);
  const share = inc ? budget / inc : 0;
  if (budget && inc) {
    tier = share >= 0.13 ? 'max' : share >= 0.08 ? 'mid' : 'basic';
    reasons.push(`งบที่ตั้งไว้ ${fmtM(budget)} บาท/เดือน (${Math.round(share * 100)}% ของรายได้) → เหมาะกับระดับ${TIER_LABEL[tier]}`);
  } else if (inc) {
    const lo = pkgId === 'first-jobber' ? 25000 : 30000;
    tier = inc >= 60000 ? 'max' : inc >= lo ? 'mid' : 'basic';
    reasons.push(`รายได้ ${fmtM(inc)} บาท/เดือน → เริ่มที่ระดับ${TIER_LABEL[tier]} (ปรับขึ้น/ลงได้)`);
  } else tier = 'mid';

  // ช่องว่างที่ต้องเติม
  const L = lifeNeed(p), C = ciNeed(p);
  const gaps = [];
  if (L.need > 0) gaps.push({ cat: 'life', text: `ทุนชีวิตควรมี ${fmtM(L.need)} บาท (ค่าใช้จ่ายครอบครัว ${fmtM(L.annual)}/ปี × ${L.years} ปี${num(p.debt) ? ' + หนี้ ' + fmtM(p.debt) : ''}${L.edu ? ' + ทุนการศึกษา ' + fmtM(L.edu) : ''}${num(p.liquidSavings) ? ' − เงินออม ' + fmtM(p.liquidSavings) : ''}) มีแล้ว ${fmtM(L.have)} → ขาด ${fmtM(L.gap)}`, gap: L.gap });
  if (inc) gaps.push({ cat: 'ci', text: `ทุนโรคร้ายแรงควรมี ${fmtM(C.need)} บาท (รายได้ 3 ปีไว้ใช้ช่วงรักษา) มีแล้ว ${fmtM(C.have)} → ขาด ${fmtM(C.gap)}`, gap: C.gap });
  const hl = p.healthLevel || 'none';
  if (hl !== 'good') gaps.push({ cat: 'health', text: { none: 'ยังไม่มีประกันสุขภาพของตัวเอง — สำคัญที่สุด ควรทำก่อนอย่างอื่น', welfare: 'มีแต่สวัสดิการบริษัท — หายไปเมื่อลาออก/เกษียณ และวงเงินต่อครั้งมักจำกัด', basic: 'มีประกันสุขภาพแต่วงเงินต่ำ — ค่ารักษาโรคร้าย/ผ่าตัดใหญ่อาจเกิน' }[hl], gap: 1 });
  if (!num(p.paCover)) gaps.push({ cat: 'accident', text: 'ยังไม่มีประกันอุบัติเหตุ' + (concerns.has('motorbike') ? ' — ใช้รถจักรยานยนต์ประจำ ควรเลือกแผนที่คุ้มครองจักรยานยนต์เต็มทุน (เช่น AIANPA3000 / 4600)' : ''), gap: 1 });

  const budgetHint = inc ? {
    lo: Math.round(inc * (pkgId === 'first-jobber' ? 0.05 : 0.10)), hi: Math.round(inc * (pkgId === 'first-jobber' ? 0.10 : 0.15)),
  } : null;

  const band = ageBand(age);
  const cases = CASES.filter((c) => c.band === band.id || Math.abs(c.age - age) <= 5).slice(0, 3);
  const pkg = PACKAGES.find((x) => x.id === pkgId);
  return { pkg, tier, reasons, gaps, budgetHint, band, cases, years: supportYears(p) };
}

function depText(p) {
  const parts = [];
  if (p.marital === 'married') parts.push('มีคู่สมรส');
  if (num(p.kids)) parts.push(`ลูก ${num(p.kids)} คน`);
  if (num(p.parents)) parts.push(`ดูแลพ่อแม่ ${num(p.parents)} คน`);
  return parts.join(' · ');
}

/** ประโยคสรุปสำหรับอ่านให้ลูกค้าฟัง */
export function storyLine(p, r) {
  const name = p.nick || 'ลูกค้า';
  const head = `${name} อายุ ${num(p.age) || '—'} ปี${num(p.incomeMonthly) ? ' รายได้ ' + fmtM(p.incomeMonthly) + ' บาท/เดือน' : ''}`;
  return `${head} — แนะนำแพ็กเกจ "${r.pkg.name}" ระดับ${TIER_LABEL[r.tier]} เพราะ${r.reasons[0].replace(/^[^—]*— /, '')}`;
}
