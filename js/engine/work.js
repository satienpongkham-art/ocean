// ─────────────────────────────────────────────────────────────
// งานขาย: ขั้นตอนท่อการขาย · คะแนนกิจกรรม · คำนวณย้อนจากเป้า · เกรดรายชื่อ · โค้ชวันนี้
// แนวคิดจาก Al Granum (One Card System, อัตราส่วน 10:3:1) และแนวปฏิบัติของสมาชิก MDRT
// ─────────────────────────────────────────────────────────────
import { todayISO, daysBetween, nextBirthday, ageFrom, isoDate } from '../ui.js';

/**
 * อายุประกัน — บริษัทประกันชีวิตไทยส่วนใหญ่นับ "เศษอายุเกิน 6 เดือน เป็น 1 ปี" (rule = 'nearest')
 * ตั้งเป็น 'last' ได้ถ้าแบบประกันนับอายุตามวันเกิดครั้งล่าสุด
 * คืนค่า: อายุประกันตอนนี้ วันที่อายุประกันจะขึ้นครั้งถัดไป และจำนวนวันที่เหลือ
 */
export function ageUp(birthday, rule = 'nearest', from = new Date()) {
  if (!birthday) return null;
  const b = new Date(birthday + 'T00:00:00'); if (isNaN(b)) return null;
  const t = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const shift = rule === 'last' ? 0 : 6;
  let y = t.getFullYear() - 1, n;
  do { n = new Date(y, b.getMonth() + shift, b.getDate()); y++; } while (n <= t);
  const to = (y - 1) - b.getFullYear() + (shift ? 1 : 0); // ปีของวันเกิดอ้างอิง − ปีเกิด (+1 เมื่อเกิน 6 เดือน)
  return { date: isoDate(n), days: Math.round((n - t) / 864e5), now: to - 1, to };
}
/** วันที่อายุประกันขึ้น (และวันเกิด) ที่ตกอยู่ในเดือนที่กำหนด — ใช้ในปฏิทิน */
export function anniversariesIn(birthday, year, month, shift = 0) {
  if (!birthday) return [];
  const b = new Date(birthday + 'T00:00:00'); if (isNaN(b)) return [];
  const out = [];
  for (const y of [year - 1, year, year + 1]) {
    const d = new Date(y, b.getMonth() + shift, b.getDate());
    if (d.getFullYear() === year && d.getMonth() === month && d >= b) out.push(isoDate(d));
  }
  return out;
}

/** เลเวลตัวแทนจากคะแนนกิจกรรมสะสม: Lv.2 = 25 · Lv.3 = 100 · Lv.4 = 225 … */
export function level(totalPts) {
  const lv = Math.floor(Math.sqrt(Math.max(0, totalPts) / 25)) + 1;
  const base = 25 * (lv - 1) ** 2, next = 25 * lv ** 2;
  return { lv, pts: totalPts, base, next, pct: (totalPts - base) / (next - base) };
}
export function totalPoints(activities) { return activities.reduce((s, a) => s + (ACT[a.type]?.pts || 0) * (a.count || 1), 0); }

/** คิวโหมดโทรรวด: ติดตามที่ถึงกำหนด → เกรด A/B/C → ติดต่อนานสุดก่อน */
export function callQueue(clients, today = todayISO()) {
  const due = (c) => !!(c.nextDate && c.nextDate <= today);
  return clients.filter((c) => !['paused', 'closed', 'delivered'].includes(c.stage) && (['lead', 'contacted', undefined, ''].includes(c.stage) || due(c)))
    .sort((a, b) => (due(b) - due(a)) || (grade(a) || 'Z').localeCompare(grade(b) || 'Z') || (a.lastContact || '').localeCompare(b.lastContact || ''));
}

export const STAGES = [
  { id: 'lead', name: 'รายชื่อ', hint: 'ยังไม่ได้ติดต่อ' },
  { id: 'contacted', name: 'ติดต่อแล้ว', hint: 'โทร/แชตแล้ว ยังไม่ได้นัด' },
  { id: 'appt', name: 'นัดแล้ว', hint: 'มีวันนัด' },
  { id: 'met', name: 'พบ / วิเคราะห์', hint: 'คุยแล้ว ทำตรวจสุขภาพการเงิน' },
  { id: 'proposed', name: 'เสนอแผน', hint: 'ส่งใบเสนอแล้ว รอตัดสินใจ' },
  { id: 'closed', name: 'ปิดการขาย', hint: 'เซ็นใบคำขอแล้ว' },
  { id: 'delivered', name: 'ส่งมอบแล้ว', hint: 'ส่งกรมธรรม์ + ขอรายชื่อแนะนำ' },
  { id: 'paused', name: 'พักไว้', hint: 'ยังไม่สนใจตอนนี้' },
];
export const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export const ACTIVITIES = [
  { id: 'call', name: 'โทร/ทักหา', pts: 1 },
  { id: 'talk', name: 'ได้คุย', pts: 1 },
  { id: 'appt', name: 'ได้นัด', pts: 2 },
  { id: 'meet', name: 'พบลูกค้า', pts: 3 },
  { id: 'present', name: 'เสนอแผน', pts: 4 },
  { id: 'close', name: 'ปิดการขาย', pts: 5 },
  { id: 'referral', name: 'ได้รายชื่อแนะนำ', pts: 2 },
  { id: 'service', name: 'บริการ/ส่งมอบ', pts: 1 },
];
export const ACT = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

export const SOURCES = [['warm', 'คนรู้จัก'], ['referral', 'แนะนำต่อ'], ['aia-lead', 'AIA Digital Lead'], ['social', 'โซเชียล'], ['event', 'งาน/กิจกรรม'], ['cold', 'อื่น ๆ']];

/** เกรดรายชื่อ A/B/C จาก 3 มิติ (1–3 คะแนน): ความสนิท · ความสามารถจ่าย · ติดต่อได้ง่าย */
export function grade(c) {
  const s = (+c.closeness || 0) + (+c.ability || 0) + (+c.access || 0);
  if (!s) return null;
  return s >= 8 ? 'A' : s >= 6 ? 'B' : 'C';
}

export function pointsOn(activities, date) {
  return activities.filter((a) => a.date === date).reduce((s, a) => s + (ACT[a.type]?.pts || 0) * (a.count || 1), 0);
}
export function countBy(activities, from, to) {
  const out = Object.fromEntries(ACTIVITIES.map((a) => [a.id, 0]));
  for (const a of activities) if (a.date >= from && a.date <= to) out[a.type] = (out[a.type] || 0) + (a.count || 1);
  return out;
}
export function weekRange(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // จันทร์ = 0
  const mon = new Date(x); mon.setDate(x.getDate() - dow);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const iso = (y) => { const z = new Date(y); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  return { from: iso(mon), to: iso(sun) };
}

/** อัตราส่วนจริงจากข้อมูล 90 วันล่าสุด (ถ้าน้อยเกินไปใช้ค่ามาตรฐาน 10:3:1) */
export function ratios(activities) {
  const since = new Date(); since.setDate(since.getDate() - 90);
  const from = since.toISOString().slice(0, 10);
  const c = countBy(activities, from, '9999-12-31');
  const contacts = c.call + c.talk;
  const enough = contacts >= 20 && c.appt >= 5;
  return enough
    ? { contactToAppt: c.appt / contacts, apptToClose: c.close / Math.max(1, c.appt), source: 'จากข้อมูลของคุณ 90 วันล่าสุด', c }
    : { contactToAppt: 0.3, apptToClose: 1 / 3, source: 'ค่ามาตรฐาน 10 : 3 : 1 (ยังมีข้อมูลไม่พอ)', c };
}

/** คำนวณย้อนจากเป้า: รายได้ที่ต้องการ → เคส → นัด → รายชื่อ */
export function reverseGoal({ incomeYear, avgPremium, commissionRate, workWeeks = 48, workDays = 5 }, r) {
  const commPerCase = (avgPremium || 0) * (commissionRate || 0);
  const casesYear = commPerCase ? Math.ceil(incomeYear / commPerCase) : 0;
  const apptsYear = Math.ceil(casesYear / r.apptToClose);
  const contactsYear = Math.ceil(apptsYear / r.contactToAppt);
  const per = (x) => ({ year: x, month: Math.ceil(x / 12), week: +(x / workWeeks).toFixed(1), day: +(x / workWeeks / workDays).toFixed(1) });
  return { commPerCase, premiumYear: casesYear * (avgPremium || 0), cases: per(casesYear), appts: per(apptsYear), contacts: per(contactsYear) };
}

/** จังหวะดูแลหลังการขาย (นับจากวันอนุมัติ/วันที่ลูกค้ารับกรมธรรม์) */
const addD = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const addM = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + n); return isoDate(d); };
export const CARE = [
  { id: 'deliver', name: 'ส่งมอบกรมธรรม์ + อธิบายความคุ้มครอง', from: 'issue', at: (x) => addD(x, 7) },
  { id: 'freelook', name: 'ครบ 15 วันพิจารณา — ถามว่ามีข้อสงสัยไหม', from: 'deliver', at: (x) => addD(x, 15) },
  { id: 'referral', name: 'ขอบคุณ + ขอรายชื่อแนะนำ', from: 'deliver', at: (x) => addD(x, 30) },
  { id: 'm6', name: 'ครบ 6 เดือน — ทักถาม อัปเดตข้อมูล/ผู้รับประโยชน์', from: 'deliver', at: (x) => addM(x, 6) },
  { id: 'y1', name: 'ครบรอบ 1 ปี — ทบทวนความคุ้มครอง + ตรวจการเงินซ้ำ', from: 'issue', at: (x) => addM(x, 12) },
];
export function milestones(pol) {
  if (pol.status !== 'issued') return [];
  const issue = pol.issueDate || pol.submitDate; if (!issue) return [];
  const done = pol.care || {};
  return CARE.map((m) => {
    const base = m.from === 'issue' ? issue : pol.deliverDate;
    if (!base) return null;
    return { ...m, date: m.at(base), done: m.id === 'deliver' ? !!pol.deliverDate || !!done.deliver : !!done[m.id] };
  }).filter(Boolean);
}
export function nextMilestone(pol) { return milestones(pol).find((m) => !m.done) || null; }

/** ลูกค้าที่ยังไม่มีขั้นต่อไป (ยังอยู่ในการขาย แต่ไม่ได้ตั้งวันติดตาม) */
export const noNextStep = (c, busy = new Set()) => !['paused', 'delivered', 'closed'].includes(c.stage) && !c.nextDate && !busy.has(c.id);
export const busyIds = (appts, today = todayISO()) => new Set(appts.filter((a) => a.status === 'planned' && a.date >= today).map((a) => a.clientId));

/** โค้ชวันนี้: รายการสิ่งที่ควรทำ เรียงตามความสำคัญ */
export function coach({ clients, appts, activities, settings, closingPlans = [], policies = [] }) {
  const today = todayISO();
  const items = [];
  const cById = Object.fromEntries(clients.map((c) => [c.id, c]));

  for (const a of appts) {
    if (a.status === 'done' || a.status === 'cancel') continue;
    const d = daysBetween(today, a.date);
    const c = cById[a.clientId];
    if (d === 0) items.push({ pri: 100, kind: 'hot', icon: 'cal', title: `นัดวันนี้ ${a.time || ''} — ${c?.nick || a.title || 'ลูกค้า'}`, why: [a.purpose, a.place].filter(Boolean).join(' · ') || 'เตรียมแผนและเอกสารให้พร้อม', go: c ? `#/client/${c.id}` : '#/work' });
    else if (d === 1) items.push({ pri: 70, kind: '', icon: 'cal', title: `พรุ่งนี้ ${a.time || ''} — ${c?.nick || a.title || 'ลูกค้า'}`, why: 'ส่งข้อความยืนยันนัดวันนี้', go: c ? `#/client/${c.id}` : '#/work' });
    else if (d < 0) items.push({ pri: 80, kind: 'hot', icon: 'clock', title: `นัดที่ผ่านมาแล้วยังไม่บันทึกผล — ${c?.nick || 'ลูกค้า'}`, why: `นัดเมื่อ ${a.date} — กดบันทึกผลเพื่อให้สถิติถูกต้อง`, go: c ? `#/client/${c.id}` : '#/work' });
  }

  for (const c of clients) {
    if (c.nextDate) {
      const d = daysBetween(today, c.nextDate);
      if (d <= 0) items.push({ pri: d < 0 ? 85 : 75, kind: d < 0 ? 'hot' : '', icon: 'phone', title: `ติดตาม ${c.nick}${c.nextText ? ' — ' + c.nextText : ''}`, why: d < 0 ? `เลยกำหนดมา ${-d} วัน` : 'ถึงกำหนดวันนี้', go: `#/client/${c.id}` });
    }
    const nb = nextBirthday(c.birthday);
    if (nb && nb.days <= 7) items.push({ pri: nb.days === 0 ? 90 : 60, kind: nb.days === 0 ? 'good' : '', icon: 'cake', title: nb.days === 0 ? `วันนี้วันเกิด ${c.nick} (${nb.turning} ปี)` : `อีก ${nb.days} วัน วันเกิด ${c.nick}`, why: 'ส่งคำอวยพร = จังหวะคุยเรื่องเบี้ยที่จะขึ้นตามอายุใหม่', go: `#/client/${c.id}` });
    const au = c.stage !== 'paused' ? ageUp(c.birthday, settings.ageRule) : null;
    if (au && au.days <= 21) {
      const hot = ['met', 'proposed'].includes(c.stage);
      items.push({ pri: hot ? (au.days <= 7 ? 82 : 72) : 56, kind: hot ? 'hot' : '', icon: 'clock', title: `${c.nick} อายุประกันขึ้นอีก ${au.days} วัน (${au.now} → ${au.to})`, why: `ทำก่อนวันที่ ${au.date.slice(8)}/${au.date.slice(5, 7)} ได้เบี้ยของอายุ ${au.now} ซึ่งถูกกว่า`, go: `#/client/${c.id}` });
    }
    if (c.stage === 'proposed') {
      const last = (c.stageAt || c.updatedAt || '').slice(0, 10);
      const d = last ? daysBetween(last, today) : 0;
      if (d >= 5) items.push({ pri: 65, kind: '', icon: 'flame', title: `${c.nick} เสนอแผนไปแล้ว ${d} วัน`, why: 'โทรถามข้อสงสัย — เปิดการ์ดข้อโต้แย้ง "ขอคิดดูก่อน"', go: `#/client/${c.id}` });
    }
    if (c.stage === 'delivered' && !c.askedReferral) items.push({ pri: 55, kind: 'good', icon: 'link', title: `ขอรายชื่อแนะนำจาก ${c.nick}`, why: 'ลูกค้าที่เพิ่งได้รับกรมธรรม์คือคนที่พร้อมแนะนำต่อมากที่สุด', go: `#/client/${c.id}` });
    if (grade(c) === 'A' && ['lead', 'contacted'].includes(c.stage || 'lead')) {
      const last = (c.lastContact || c.createdAt || '').slice(0, 10);
      const d = last ? daysBetween(last, today) : 99;
      if (d >= 14) items.push({ pri: 50, kind: '', icon: 'star', title: `รายชื่อเกรด A: ${c.nick} ยังไม่ได้นัด`, why: d >= 99 ? 'ยังไม่เคยติดต่อ' : `ติดต่อล่าสุด ${d} วันก่อน`, go: `#/client/${c.id}` });
    }
  }

  for (const p of closingPlans) {
    const noHealth = clients.filter((c) => (!c.healthLevel || c.healthLevel === 'none' || c.healthLevel === 'welfare') && c.stage !== 'paused' && (ageFrom(c.birthday) ?? c.age ?? 30) <= 75);
    items.push({ pri: 95, kind: 'hot', icon: 'clock', title: `${p.plan.short} ปิดรับอีก ${p.days} วัน`, why: noHealth.length ? `ลูกค้า ${noHealth.length} คนยังไม่มีประกันสุขภาพของตัวเอง: ${noHealth.slice(0, 4).map((c) => c.nick).join(', ')}${noHealth.length > 4 ? '…' : ''}` : 'แจ้งลูกค้าที่สนใจก่อนปิดรับ', go: '#/clients?f=nohealth' });
  }

  const busy = busyIds(appts, today);
  const nn = clients.filter((c) => noNextStep(c, busy));
  if (nn.length) items.push({ pri: 45, kind: '', icon: 'next', title: `${nn.length} คนยังไม่มีขั้นต่อไป`, why: nn.slice(0, 4).map((c) => c.nick).join(', ') + (nn.length > 4 ? '…' : '') + ' — ตั้งวันติดตาม ไม่ให้ใครตกหล่น', go: '#/clients?f=nonext' });

  for (const pol of policies) {
    const m = nextMilestone(pol); if (!m) continue;
    const d = daysBetween(today, m.date);
    if (d <= 3 && d >= -45) { const c = cById[pol.clientId]; items.push({ pri: d <= 0 ? 68 : 58, kind: 'good', icon: 'heart', title: `${c?.nick || 'ลูกค้า'}: ${m.name.split(' — ')[0]}`, why: (d < 0 ? `เลยกำหนด ${-d} วัน` : d === 0 ? 'ถึงกำหนดวันนี้' : `อีก ${d} วัน`) + ' · ดูแลหลังการขาย', go: c ? `#/client/${c.id}` : '#/work/sales' }); }
  }

  const target = +settings.dailyPoints || 20;
  const pts = pointsOn(activities, today);
  if (pts < target) items.push({ pri: 40, kind: '', icon: 'target', title: `กิจกรรมวันนี้ ${pts}/${target} คะแนน`, why: `ขาดอีก ${target - pts} คะแนน — เช่น โทร ${Math.ceil((target - pts) / 2)} สาย ได้คุย/ได้นัด`, go: '#/work/call' });

  return items.sort((a, b) => b.pri - a.pri);
}
