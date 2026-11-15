// ─────────────────────────────────────────────────────────────
// คำนวณภาษีเงินได้บุคคลธรรมดา (เงินเดือน 40(1)) และผลของเบี้ยประกันต่อภาษี
// อ้างอิง: กรมสรรพากร "ผู้มีเงินได้มีสิทธิหักลดหย่อนอะไรได้บ้าง?" (rd.go.th, ปรับปรุง 30 ก.ค. 2567)
//          + FAQ เบี้ยประกันสุขภาพผู้มีเงินได้ (ไม่เกิน 25,000 รวมกับประกันชีวิตไม่เกิน 100,000)
// ใช้เพื่อประมาณการ — ยื่นจริงตามแบบ ภ.ง.ด.90/91 และหนังสือรับรองจากบริษัทประกัน
// ─────────────────────────────────────────────────────────────

export const RULES = {
  year: 2569,
  expenseRate: 0.5, expenseMax: 100000,       // ค่าใช้จ่ายเงินเดือน 50% ไม่เกิน 100,000
  personal: 60000, spouseNoIncome: 60000,
  child: 30000, child2From2561: 60000,         // บุตรคนที่ 2 เป็นต้นไปที่เกิดตั้งแต่ปี 2561 คนละ 60,000
  parentEach: 30000,                           // บิดามารดาอายุ 60+ เงินได้ไม่เกิน 30,000 คนละ 30,000 (สูงสุด 4 คน)
  lifeMax: 100000,                             // เบี้ยประกันชีวิต (กรมธรรม์ 10 ปีขึ้นไป)
  healthSelfMax: 25000,                        // เบี้ยประกันสุขภาพตนเอง (รวมกับชีวิตไม่เกิน 100,000)
  lifeHealthCombinedMax: 100000,
  spouseLifeMax: 10000,                        // เบี้ยประกันชีวิตคู่สมรสไม่มีเงินได้
  parentHealthMax: 15000,                      // เบี้ยประกันสุขภาพบิดามารดา (รวมทุกคน)
  annuityRate: 0.15, annuityMax: 200000,       // บำนาญ 15% ของเงินได้ ไม่เกิน 200,000
  retirementGroupMax: 500000,                  // บำนาญ + PVD + RMF + SSF + กบข. + กอช. ฯลฯ รวมไม่เกิน 500,000
  homeLoanInterestMax: 100000,
  brackets: [
    [150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15],
    [1000000, 0.20], [2000000, 0.25], [5000000, 0.30], [Infinity, 0.35],
  ],
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const n = (x) => (x == null || isNaN(x) ? 0 : Math.max(0, Number(x)));

/** ภาษีตามขั้นบันได */
export function taxOnNet(net) {
  let tax = 0, prev = 0;
  const steps = [];
  for (const [cap, rate] of RULES.brackets) {
    const part = clamp(net - prev, 0, cap - prev);
    if (part > 0) { tax += part * rate; steps.push({ from: prev, to: Math.min(net, cap), rate, tax: part * rate }); }
    prev = cap;
    if (net <= cap) break;
  }
  return { tax: Math.round(tax * 100) / 100, steps };
}
export function marginalRate(net) {
  let prev = 0;
  for (const [cap, rate] of RULES.brackets) { if (net <= cap) return rate; prev = cap; }
  return 0.35;
}

/**
 * ลดหย่อนกลุ่มประกัน
 * - ประกันสุขภาพตนเอง ≤ 25,000 และ (ชีวิต + สุขภาพ) ≤ 100,000
 * - เบี้ยบำนาญ: ถ้ายังใช้สิทธิประกันชีวิตไม่เต็ม 100,000 นำเบี้ยบำนาญมาใช้ในส่วนนั้นก่อนได้
 *   ส่วนที่เหลือหักในหมวดบำนาญ ≤ 15% ของเงินได้ ≤ 200,000 และรวมกลุ่มเกษียณ ≤ 500,000
 */
export function insuranceDeductions({ income, life = 0, healthSelf = 0, spouseLife = 0, parentHealth = 0, annuity = 0, otherRetirement = 0 }) {
  income = n(income);
  const healthD = Math.min(n(healthSelf), RULES.healthSelfMax);
  const lifeD = Math.min(n(life), RULES.lifeMax, RULES.lifeHealthCombinedMax - healthD);
  const room = Math.max(0, RULES.lifeHealthCombinedMax - healthD - lifeD);
  const annuityInLife = Math.min(n(annuity), room);
  const annuityLeft = n(annuity) - annuityInLife;
  const retireRoom = Math.max(0, RULES.retirementGroupMax - n(otherRetirement));
  const annuityD = Math.min(annuityLeft, RULES.annuityRate * income, RULES.annuityMax, retireRoom);
  const spouseD = Math.min(n(spouseLife), RULES.spouseLifeMax);
  const parentD = Math.min(n(parentHealth), RULES.parentHealthMax);
  return {
    life: lifeD, healthSelf: healthD, annuityInLife, annuity: annuityD, spouseLife: spouseD, parentHealth: parentD,
    total: lifeD + healthD + annuityInLife + annuityD + spouseD + parentD,
    unusedLifeHealth: Math.max(0, RULES.lifeHealthCombinedMax - healthD - lifeD - annuityInLife),
    unusedAnnuity: Math.max(0, Math.min(RULES.annuityRate * income, RULES.annuityMax, retireRoom) - annuityD),
  };
}

/**
 * คำนวณภาษีทั้งปี
 * input: { income(เงินได้ทั้งปี), withheld?, spouse(bool ไม่มีเงินได้), children, children2561 (บุตรคนที่2+ เกิดตั้งแต่ 2561),
 *          parents (จำนวน 0–4), socialSecurity, homeLoanInterest, otherRetirement (PVD/RMF/SSF/กบข.), otherDeductions,
 *          life, healthSelf, spouseLife, parentHealth, annuity }
 */
export function computeTax(input) {
  const income = n(input.income);
  const expense = Math.min(income * RULES.expenseRate, RULES.expenseMax);
  const kids1 = Math.max(0, n(input.children) - n(input.children2561));
  const family =
    RULES.personal +
    (input.spouse ? RULES.spouseNoIncome : 0) +
    kids1 * RULES.child + n(input.children2561) * RULES.child2From2561 +
    Math.min(n(input.parents), 4) * RULES.parentEach;
  const ins = insuranceDeductions({ ...input, income });
  const otherRetirementD = Math.min(n(input.otherRetirement), RULES.retirementGroupMax);
  const others = n(input.socialSecurity) + Math.min(n(input.homeLoanInterest), RULES.homeLoanInterestMax) + otherRetirementD + n(input.otherDeductions);
  const totalDeduct = expense + family + ins.total + others;
  const net = Math.max(0, income - totalDeduct);
  const { tax, steps } = taxOnNet(net);
  return { income, expense, family, ins, others, totalDeduct, net, tax, steps, marginal: marginalRate(net), effective: income ? tax / income : 0 };
}

/** เปรียบเทียบ "ก่อน" กับ "หลัง" ซื้อประกันเพิ่ม */
export function compareWithInsurance(base, add) {
  const before = computeTax(base);
  const after = computeTax({
    ...base,
    life: n(base.life) + n(add.life), healthSelf: n(base.healthSelf) + n(add.healthSelf),
    annuity: n(base.annuity) + n(add.annuity), parentHealth: n(base.parentHealth) + n(add.parentHealth),
  });
  return { before, after, saved: Math.round((before.tax - after.tax) * 100) / 100 };
}

/** เบี้ยที่ยังใช้สิทธิได้อีก และภาษีที่จะประหยัดได้ถ้าใช้เต็ม */
export function roomLeft(base) {
  const r = computeTax(base);
  const full = compareWithInsurance(base, { life: r.ins.unusedLifeHealth, annuity: r.ins.unusedAnnuity });
  return { lifeHealthRoom: r.ins.unusedLifeHealth, annuityRoom: r.ins.unusedAnnuity, maxSaving: full.saved, marginal: r.marginal };
}
