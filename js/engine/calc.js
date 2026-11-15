// ─── สูตรการเงินมาตรฐาน (ใช้ทั้งเครื่องคิดในแอปและหน้าสำหรับคนทั่วไป) ───
// ทุกตัวเลขผลตอบแทน/เงินเฟ้อเป็น "สมมติฐาน" ที่ผู้ใช้ตั้งเอง ไม่ใช่การรับประกัน

/** มูลค่าในอนาคตของการออมรายเดือน (ฝากต้นเดือน) */
export function fvMonthly(monthly, ratePct, years) {
  const n = Math.round(years * 12), r = ratePct / 100 / 12;
  if (n <= 0) return 0;
  if (!r) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}
/** ต้องออมเดือนละเท่าไรถึงได้ target ใน years ปี */
export function monthlyFor(target, ratePct, years, have = 0) {
  const n = Math.round(years * 12), r = ratePct / 100 / 12;
  const left = target - have * (r ? Math.pow(1 + r, n) : 1);
  if (left <= 0) return 0; if (n <= 0) return left;
  return r ? left / (((Math.pow(1 + r, n) - 1) / r) * (1 + r)) : left / n;
}
/** เทียบเริ่มออมอายุ A กับ B ถึงอายุ end */
export function compoundCompare({ monthly, rate, startA, startB, end }) {
  const a = fvMonthly(monthly, rate, end - startA), b = fvMonthly(monthly, rate, end - startB);
  return { a, b, diff: a - b, paidA: monthly * 12 * (end - startA), paidB: monthly * 12 * (end - startB) };
}
/** เกษียณแบบคิดเงินเฟ้อ */
export function retirement({ age, retireAge = 60, lifeTo = 85, monthlyNow, inflation = 3, returnPre = 4, returnPost = 3, have = 0 }) {
  const yrs = Math.max(0, retireAge - age), yrsRet = Math.max(0, lifeTo - retireAge);
  const monthlyAtRetire = monthlyNow * Math.pow(1 + inflation / 100, yrs);
  // เงินก้อนที่ต้องมีวันเกษียณ = มูลค่าปัจจุบันของรายจ่ายที่โตตามเงินเฟ้อ คิดลดด้วยผลตอบแทนหลังเกษียณ
  const real = (1 + returnPost / 100) / (1 + inflation / 100) - 1; const n = yrsRet * 12; const rm = Math.pow(1 + real, 1 / 12) - 1;
  const need = rm ? monthlyAtRetire * (1 - Math.pow(1 + rm, -n)) / rm : monthlyAtRetire * n;
  const save = monthlyFor(need, returnPre, yrs, have);
  return { yrs, yrsRet, monthlyAtRetire, need, save };
}
/** ทุนการศึกษาลูก: ค่าใช้จ่ายต่อปีวันนี้ → ปรับเงินเฟ้อการศึกษา รวมทุกปีที่เรียน */
export function education({ childAge, startAge, years, costPerYear, inflation = 5, returnPct = 3 }) {
  let total = 0; const until = Math.max(0, startAge - childAge);
  for (let i = 0; i < years; i++) total += costPerYear * Math.pow(1 + inflation / 100, until + i);
  return { until, total, save: monthlyFor(total, returnPct, Math.max(until + years / 2, 0.5)) };
}
/** เงินสำรองฉุกเฉิน */
export function emergency({ expense, months = 6, have = 0, perMonth = 0 }) {
  const target = expense * months; const left = Math.max(0, target - have);
  return { target, left, pct: target ? Math.min(1, have / target) : 0, monthsToGo: perMonth > 0 ? Math.ceil(left / perMonth) : null };
}
/** 50/30/20 */
export const split503020 = (salary) => ({ needs: salary * 0.5, wants: salary * 0.3, save: salary * 0.2 });
