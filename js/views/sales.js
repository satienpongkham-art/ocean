// ─── ยอดขาย & กรมธรรม์ลูกค้า ───
import { h, icon, fmt, todayISO, daysBetween, dateTH, empty, tabs } from '../ui.js';
import * as store from '../store.js';
import { policySheet, policyRow } from './common.js';
import { lineChart, legend } from '../charts.js';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const sold = (p) => ['submitted', 'issued'].includes(p.status);

/** กรมธรรม์ที่ใกล้ครบชำระ (ใช้ในโค้ชวันนี้ด้วย) */
export function duePolicies(days = 14) {
  const t = todayISO();
  return store.all('policies').filter((p) => p.status === 'issued' && p.nextDue && daysBetween(t, p.nextDue) <= days && daysBetween(t, p.nextDue) >= -30)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

export function renderSales() {
  const all = store.all('policies');
  const s = store.getSettings();
  const rate = s.goal?.commissionRate ?? 0.3;
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  const inMonth = (p, yy, mm) => p.submitDate && +p.submitDate.slice(0, 4) === yy && +p.submitDate.slice(5, 7) - 1 === mm;
  const month = all.filter((p) => sold(p) && inMonth(p, y, m));
  const year = all.filter((p) => sold(p) && p.submitDate && +p.submitDate.slice(0, 4) === y);
  const sum = (arr) => arr.reduce((t, p) => t + (+p.premium || 0), 0);
  const series = [{ name: 'เบี้ยที่ยื่น/อนุมัติ', data: MONTHS.map((_, i) => sum(all.filter((p) => sold(p) && inMonth(p, y, i)))) }];
  const due = duePolicies(30);
  const target = s.goal?.incomeYear ? s.goal.incomeYear / Math.max(0.01, rate) : 0;

  const t = tabs([['all', 'ทั้งหมด'], ['pipe', 'กำลังเสนอ'], ['due', `ใกล้ครบชำระ (${due.length})`]], 'all', (k) => {
    const list = k === 'due' ? due : k === 'pipe' ? all.filter((p) => p.status === 'proposed') : [...all].sort((a, b) => (b.submitDate || '').localeCompare(a.submitDate || ''));
    return list.length ? h('div.plist', list.map((p) => policyRow(p, { showClient: true }))) : h('div.card', empty(k === 'due' ? 'ยังไม่มีกรมธรรม์ที่ใกล้ครบชำระ' : 'ยังไม่มีรายการ — เพิ่มจากหน้าลูกค้า หรือปุ่มด้านบน', 'doc'));
  });

  return h('div', { 'data-title': 'ยอดขาย' },
    h('div.topbar', h('div', h('h1', 'ยอดขาย'), h('div.sub', `ปี ${y + 543} · ค่าคอมคิดที่ ${Math.round(rate * 100)}% (แก้ได้ในหน้าเป้าหมาย)`)), h('button.btn.primary', { onclick: () => policySheet() }, icon('plus'), 'เพิ่ม')),
    h('div.kpis',
      h('div.kpi', h('span', `เบี้ยเดือน${MONTHS[m]}`), h('b', fmt(sum(month))), h('span', `${month.length} เคส`)),
      h('div.kpi', h('span', 'ค่าคอมเดือนนี้ (ประมาณ)'), h('b', fmt(sum(month) * rate))),
      h('div.kpi', h('span', 'เบี้ยทั้งปี'), h('b', fmt(sum(year))), h('span', `${year.length} เคส`)),
      h('div.kpi', h('span', 'ถึงเป้าแล้ว'), h('b', target ? Math.round((sum(year) / target) * 100) + '%' : '—'), h('span', target ? `เป้าเบี้ย ${fmt(target)}` : 'ตั้งเป้าในหน้าเป้าหมาย'))),
    h('div.card', { style: { marginTop: '12px' } }, h('div.card-h', h('h3', 'เบี้ยรายเดือน')), lineChart({ x: MONTHS, series }, { type: 'bar' }), legend(series)),
    h('div', { style: { marginTop: '12px' } }, t.bar, t.panel),
    h('p.xs.muted', { style: { marginTop: '10px' } }, 'นับยอดจากรายการที่สถานะ "ยื่นใบคำขอ" หรือ "อนุมัติ" ตามวันที่ยื่น · ค่าคอมเป็นการประมาณ ดูยอดจริงในระบบตัวแทน'));
}
