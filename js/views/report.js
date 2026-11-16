// ─── รายงานประจำเดือน (พิมพ์หรือบันทึกเป็น PDF ได้) ───
import { h, icon, fmt, todayISO } from '../ui.js';
import * as store from '../store.js';
import { profile, rerender } from '../app.js';
import { countBy } from '../engine/work.js';
import { policyName } from './common.js';

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
let ym = null;
export function renderReport() {
  if (!ym) ym = todayISO().slice(0, 7);
  const [y, m] = ym.split('-').map(Number); const p = profile(); const s = store.getSettings();
  const from = `${ym}-01`; const to = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  const cs = Object.fromEntries(store.all('clients').map((c) => [c.id, c]));
  const sold = store.all('policies').filter((x) => ['submitted', 'issued'].includes(x.status) && (x.submitDate || x.issueDate || '').startsWith(ym));
  const prem = sold.reduce((t, x) => t + (+x.premium || 0), 0);
  const goal = { incomeYear: 600000, commissionRate: 0.3, ...(s.goal || {}) };
  const act = countBy(store.all('activities'), from, to);
  const appts = store.all('appts').filter((a) => (a.date || '').startsWith(ym));
  const newC = store.all('clients').filter((c) => (c.createdAt || '').startsWith(ym)).length;
  const posted = store.all('content').filter((c) => (c.postedAt || '').startsWith(ym)).length;
  const rows = [['โทร', act.call || 0], ['ได้นัด', act.appt || 0], ['พบลูกค้า', act.meet || 0], ['เสนอแผน', act.present || 0], ['ปิดการขาย', act.close || 0], ['ขอแนะนำต่อ', act.referral || 0]];
  const mx = Math.max(1, ...rows.map((r) => r[1]));
  const go = (d) => { const dt = new Date(y, m - 1 + d, 1); ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; rerender(); };
  return h('div', { 'data-title': 'รายงานประจำเดือน' },
    h('div.back-row.no-print', h('a.icon-btn', { href: '#/menu', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px', flex: 1 } }, 'รายงานประจำเดือน')),
    h('div.row.no-print', { style: { gap: '8px', marginBottom: '12px' } }, h('button.icon-btn', { onclick: () => go(-1), 'aria-label': 'เดือนก่อน' }, icon('back')), h('b', { style: { flex: 1, textAlign: 'center' } }, `${MONTHS[m - 1]} ${y + 543}`), h('button.icon-btn', { onclick: () => go(1), 'aria-label': 'เดือนถัดไป' }, icon('next'))),
    h('div.rp-sheet',
      h('div.rp-head', h('div', h('div.bn', p.brand || 'AOM CONNECT'), h('h2', `สรุปผลงาน ${MONTHS[m - 1]} ${y + 543}`)), h('small', p.name, h('br'), [p.title, p.agentCode ? 'รหัส ' + p.agentCode : ''].filter(Boolean).join(' · '))),
      h('div.rp-kpis', h('div.rp-kpi', h('span', 'เบี้ยที่ปิดได้'), h('b', fmt(prem))), h('div.rp-kpi', h('span', 'จำนวนเคส'), h('b', sold.length)), h('div.rp-kpi', h('span', 'ค่าคอมโดยประมาณ'), h('b', fmt(prem * (goal.commissionRate || 0.3)))), h('div.rp-kpi', h('span', 'เทียบเป้าเดือน'), h('b', Math.round(prem / (goal.incomeYear / Math.max(0.01, goal.commissionRate) / 12) * 100) + '%'))),
      h('div', h('h3', { style: { margin: '0 0 8px', fontFamily: 'var(--serif)', fontWeight: 500 } }, 'กิจกรรม'), h('div.rp-bars', rows.map(([l, n]) => h('div', h('span', l), h('i', { style: { width: (n / mx) * 100 + '%' } }), h('b', n)))),
        h('p.small.muted', { style: { marginTop: '8px' } }, `นัดทั้งหมด ${appts.length} ครั้ง (เสร็จ ${appts.filter((a) => a.status === 'done').length}) · ลูกค้าใหม่ ${newC} คน · โพสต์คอนเทนต์ ${posted} ชิ้น`)),
      h('div', h('h3', { style: { margin: '0 0 8px', fontFamily: 'var(--serif)', fontWeight: 500 } }, 'เคสที่ปิดได้'), sold.length ? h('table.rp-tbl', h('thead', h('tr', h('th', 'วันที่'), h('th', 'ลูกค้า'), h('th', 'แผน'), h('th.r', 'เบี้ย/ปี'))),
        h('tbody', sold.sort((a, b) => (a.submitDate || '').localeCompare(b.submitDate || '')).map((x) => h('tr', h('td', (x.submitDate || x.issueDate || '').slice(8)), h('td', cs[x.clientId]?.nick || '—'), h('td', policyName(x)), h('td.r', fmt(+x.premium || 0)))))) : h('p.small.muted', 'เดือนนี้ยังไม่มีเคสที่บันทึก')),
      h('p.xs.muted', `จัดทำจากข้อมูลในแอป ณ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} · ค่าคอมเป็นการประมาณจากอัตราที่ตั้งไว้`)),
    h('div.sticky-act.no-print', h('button.btn.primary', { onclick: () => window.print() }, icon('print'), 'พิมพ์ / บันทึกเป็น PDF')));
}
