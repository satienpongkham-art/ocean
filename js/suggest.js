// ─── วันนี้โพสต์อะไรดี: แนะนำ 3 อย่างตามวันปิดขาย ช่วงเวลา วันสำคัญ และหมวดประจำวัน ───
import { h, icon } from './ui.js';
import { PLANS, PLAN, closingInfo } from '../data/plans.js';
import { HOLIDAYS } from '../data/holidays.js';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// หมวดโปสเตอร์ประจำวัน (อา–ส)
const DAY_PLANS = [['saving-sure', 'annuity-sure'], ['pay-life-plus', '20-pay-life'], ['health-happy', 'health-saver'], ['ci-plus', 'multipay-ci-plus'], ['hb-extra', 'npa4600'], ['ci-procare', 'health-starter'], ['senior-happy', 'lifetime-income']];

export function suggestions(today = new Date()) {
  const out = [];
  // 1) แผนที่ใกล้ปิดขาย (ภายใน 21 วัน)
  for (const p of PLANS) { const c = closingInfo(p, today); if (c && !c.closed && c.days <= 21) out.push({ kind: 'poster', icon: 'flame', title: `โปสเตอร์ "${p.short}" ก่อนปิดขาย`, why: c.days === 0 ? 'ปิดรับวันนี้!' : `เหลืออีก ${c.days} วัน (${new Date(c.date + 'T12:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`, href: `#/studio/poster?plan=${p.id}&layout=urgent`, pri: 8 + (21 - c.days) / 7 }); }
  // 2) ช่วงลดหย่อนภาษีปลายปี (ต.ค.–ธ.ค.)
  const m = today.getMonth();
  if (m >= 9) out.push({ kind: 'poster', icon: 'tax', title: 'ลดหย่อนภาษีก่อนสิ้นปี', why: `อีก ${Math.ceil((new Date(today.getFullYear(), 11, 31) - today) / 864e5)} วันจะหมดปีภาษี · โปสเตอร์ประกันบำนาญ`, href: '#/studio/poster?plan=annuity-sure&layout=why', pri: 6 });
  // 3) วันสำคัญใน 3 วันข้างหน้า
  for (let i = 0; i <= 3; i++) { const d = new Date(today); d.setDate(d.getDate() + i); const hd = HOLIDAYS[iso(d)]; if (hd) { out.push({ kind: 'idea', icon: 'cal', title: `โพสต์รับ${hd}`, why: i === 0 ? 'วันนี้' : `อีก ${i} วัน · ชวนคิดเรื่องคนที่รัก/การวางแผน`, href: '#/studio/library', pri: 5 - i }); break; } }
  // 4) โปสเตอร์แผนประจำวัน
  const pick = DAY_PLANS[today.getDay()].map((id) => PLAN[id]).find((p) => p && !p.closed);
  if (pick) out.push({ kind: 'poster', icon: 'star', title: `โปสเตอร์ ${pick.short}`, why: pick.tagline, href: `#/studio/poster?plan=${pick.id}`, pri: 3 });
  // 5) เรื่องของวันจากคลัง (ภาพหลายหน้า) + คลิปแม่แบบ
  out.push({ kind: 'carousel', icon: 'book', title: 'ภาพหลายหน้า: เรื่องของวันนี้', why: 'จากคลัง 365 เรื่อง พร้อมแคปชั่น', href: '#/studio', pri: 2 });
  out.push({ kind: 'clip', icon: 'play', title: 'คลิปสั้น 30 วิ', why: ['ความเชื่อ vs ความจริง', '3 ข้อที่ต้องรู้', 'ถาม-ตอบ', 'ตัวเลขช็อก', 'เล่าเคสลูกค้า'][today.getDay() % 5] + ' · อัดในแอป ตัดให้อัตโนมัติ', href: '#/studio/video', pri: 1.5 });
  return out.sort((a, b) => b.pri - a.pri).slice(0, 3);
}

/** การ์ด "วันนี้โพสต์อะไรดี" */
export function suggestCard() {
  const list = suggestions();
  return h('div.sg-card', h('div.sg-h', h('b', 'วันนี้โพสต์อะไรดี'), h('a.small', { href: '#/studio' }, 'สตูดิโอ ›')),
    h('div.sg-list', list.map((s) => h('a.sg-i', { href: s.href }, h('span.sg-ic', icon(s.icon)), h('span.sg-t', h('b', s.title), h('small', s.why)), icon('next')))));
}
