// ─── ปฏิทินรายเดือน: นัด · วันเกิด · อายุประกันขึ้น · ครบชำระเบี้ย · วันติดตาม ───
import { featureOn } from '../features.js';
import { h, icon, todayISO, isoDate, dateTH, empty } from '../ui.js';
import * as store from '../store.js';
import { anniversariesIn, milestones } from '../engine/work.js';
import { HOLIDAYS } from '../../data/holidays.js';
import { apptSheet, apptResultSheet, policyName } from './common.js';

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
export const KINDS = {
  appt: { name: 'นัด', color: 'var(--primary)', icon: 'cal' },
  follow: { name: 'ติดตาม', color: 'var(--c-life)', icon: 'phone' },
  ageup: { name: 'อายุประกันขึ้น', color: 'var(--accent)', icon: 'clock' },
  bday: { name: 'วันเกิด', color: 'var(--warn)', icon: 'cake' },
  due: { name: 'ครบชำระเบี้ย', color: 'var(--c-saving)', icon: 'doc' },
  care: { name: 'ดูแลหลังขาย', color: 'var(--good)', icon: 'heart' },
  holiday: { name: 'วันหยุด', color: 'var(--bad)', icon: 'star' },
};

let view = null; // { y, m, sel }

/** รวมเหตุการณ์ทั้งหมดของเดือน → { 'YYYY-MM-DD': [ {kind, title, sub, go, appt} ] } */
export function monthEvents(y, m) {
  const out = {};
  const add = (date, ev) => { (out[date] ||= []).push(ev); };
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
  const clients = store.all('clients');
  const cById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const rule = store.getSettings().ageRule;
  for (const a of store.all('appts')) {
    if (!a.date?.startsWith(ym) || a.status === 'cancel') continue;
    const c = cById[a.clientId];
    add(a.date, { kind: 'appt', title: `${a.time || 'ทั้งวัน'} · ${c ? c.nick : (a.title || 'นัด')}`, sub: [a.title || a.purpose, a.place].filter(Boolean).join(' · '), appt: a, done: a.status === 'done', sort: a.time || '99' });
  }
  for (const c of clients) {
    if (c.nextDate?.startsWith(ym)) add(c.nextDate, { kind: 'follow', title: `ติดตาม ${c.nick}`, sub: c.nextText || '', go: '#/client/' + c.id });
    for (const d of anniversariesIn(c.birthday, y, m)) add(d, { kind: 'bday', title: `วันเกิด ${c.nick}`, sub: `อายุครบ ${y - +c.birthday.slice(0, 4)} ปี`, go: '#/client/' + c.id });
    // แบบนับเศษเกิน 6 เดือน: อายุประกันขึ้นที่วันเกิด + 6 เดือน (แบบวันเกิดล่าสุด ใช้วันเกิดซึ่งแสดงอยู่แล้ว)
    if (c.stage !== 'paused' && rule !== 'last') for (const d of anniversariesIn(c.birthday, y, m, 6)) add(d, { kind: 'ageup', title: `${c.nick} อายุประกันขึ้น`, sub: 'ทำก่อนวันนี้ได้เบี้ยของอายุเดิม', go: '#/client/' + c.id });
  }
  for (const p of store.all('policies')) {
    for (const m of milestones(p)) if (!m.done && m.date.startsWith(ym)) { const c = cById[p.clientId]; add(m.date, { kind: 'care', title: `${c ? c.nick + ' · ' : ''}${m.name.split(' — ')[0]}`, sub: policyName(p), go: c ? '#/client/' + c.id : '#/work/sales' }); }
    if (p.status !== 'issued' || !p.nextDue?.startsWith(ym)) continue;
    const c = cById[p.clientId];
    add(p.nextDue, { kind: 'due', title: `${c ? c.nick + ' · ' : ''}${policyName(p)}`, sub: 'ครบกำหนดชำระเบี้ย', go: c ? '#/client/' + c.id : '#/work/sales' });
  }
  for (const [d, name] of Object.entries(HOLIDAYS)) if (d.startsWith(ym)) add(d, { kind: 'holiday', title: name, sub: 'วันหยุดราชการ — เลี่ยงนัดสำคัญ / ใช้ทำคอนเทนต์ตามเทศกาล', go: '#/tools/content' });
  for (const k in out) out[k].sort((a, b) => (a.kind === 'appt' ? 0 : 1) - (b.kind === 'appt' ? 0 : 1) || (a.sort || '').localeCompare(b.sort || ''));
  return out;
}

function evRow(ev) {
  const k = KINDS[ev.kind];
  const inner = [h('span.ic', { style: { background: `color-mix(in srgb, ${k.color} 14%, var(--card))`, color: k.color } }, icon(k.icon)),
    h('span.tt', h('b', ev.title), h('span', [k.name, ev.sub].filter(Boolean).join(' · ')))];
  if (ev.appt) {
    const a = ev.appt;
    return h('div.task', ...inner, a.status === 'planned' && a.date <= todayISO() ? h('button.btn.sm', { onclick: () => apptResultSheet(a) }, 'บันทึกผล')
      : h('button.icon-btn', { onclick: () => apptSheet({ appt: a }), 'aria-label': 'แก้ไขนัด' }, icon('pen')));
  }
  return h('a.task', { href: ev.go }, ...inner, icon('next'));
}

export function renderCalendar() {
  const t = new Date();
  if (!view) view = { y: t.getFullYear(), m: t.getMonth(), sel: todayISO() };
  const { y, m } = view;
  const ev = monthEvents(y, m);
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // จันทร์เป็นวันแรก
  const days = new Date(y, m + 1, 0).getDate();
  const today = todayISO();
  const go = (dm) => { const d = new Date(y, m + dm, 1); view = { y: d.getFullYear(), m: d.getMonth(), sel: dm === 0 ? today : isoDate(d) }; rerender(); };
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('div.cal-cell.pad'));
  for (let d = 1; d <= days; d++) {
    const iso = isoDate(new Date(y, m, d));
    const list = ev[iso] || [];
    const kinds = [...new Set(list.map((e) => e.kind))];
    cells.push(h('button.cal-cell', { class: [iso === today ? 'today' : '', iso === view.sel ? 'sel' : '', list.length ? 'has' : '', HOLIDAYS[iso] ? 'hol' : ''].join(' '), title: HOLIDAYS[iso] || null, onclick: () => { view.sel = iso; rerender(); }, 'aria-label': dateTH(iso) + (list.length ? ` มี ${list.length} รายการ` : '') },
      h('span.cd', d),
      h('span.cal-dots', kinds.slice(0, 4).map((k) => h('i', { style: { background: KINDS[k].color } }))),
      h('span.cal-lab', list.slice(0, 2).map((e) => h('em', { style: { '--kc': KINDS[e.kind].color } }, e.title.replace(/^ทั้งวัน · /, ''))))));
  }
  const selList = ev[view.sel] || [];
  const counts = Object.fromEntries(Object.keys(KINDS).map((k) => [k, Object.values(ev).flat().filter((e) => e.kind === k).length]));

  return h('div', { 'data-title': 'ปฏิทิน' },
    h('div.topbar', h('div', h('h1', 'ปฏิทิน'), h('div.sub', 'นัด วันเกิด อายุประกันขึ้น ครบชำระเบี้ย และวันติดตาม รวมไว้ที่เดียว')), h('button.btn.primary', { onclick: () => apptSheet({ appt: { date: view.sel >= today ? view.sel : today, time: '' } }) }, icon('plus'), 'นัด')),
    workTabs('cal'),
    h('div.card.cal', { style: { marginTop: '14px' } },
      h('div.cal-head', h('button.icon-btn', { onclick: () => go(-1), 'aria-label': 'เดือนก่อน' }, icon('back')),
        h('h2', `${MONTHS[m]} ${y + 543}`),
        h('div.row', { style: { gap: '6px' } }, h('button.btn.sm', { onclick: () => go(0) }, 'วันนี้'), h('button.icon-btn', { onclick: () => go(1), 'aria-label': 'เดือนถัดไป' }, icon('next')))),
      h('div.cal-grid', DOW.map((d) => h('div.cal-dow', d)), cells),
      h('div.cal-legend', Object.entries(KINDS).map(([k, v]) => h('span', h('i', { style: { background: v.color } }), `${v.name} ${counts[k]}`)))),
    h('div.section', h('h2', dateTH(view.sel, true) + (view.sel === today ? ' · วันนี้' : '')),
      h('div.card', { style: { paddingTop: '4px', paddingBottom: '4px' } }, selList.length ? selList.map(evRow) : empty('วันนี้ว่าง', 'cal', view.sel >= today ? h('button.btn.primary', { onclick: () => apptSheet({ appt: { date: view.sel, time: '' } }) }, icon('plus'), 'ลงนัดวันนี้') : null))));
}

// ใช้แถบเมนูเดียวกับหน้างานขาย
import { rerender } from '../app.js';
function workTabs(active) {
  const t = [['pipe', 'ท่อการขาย', '#/work'], ['call', 'โทรรวด', '#/work/call'], ['cal', 'ปฏิทิน', '#/work/calendar'], ['goals', 'เป้าหมาย', '#/work/goals'], ['sales', 'ยอดขาย', '#/work/sales'], ['review', 'ทบทวนสัปดาห์', '#/work/review'], ['mandala', 'แมนฮาร่า', '#/work/mandala']].filter(([id]) => !['call', 'review', 'mandala'].includes(id) || featureOn(id));
  return h('div.seg', t.map(([id, l, href]) => h('button', { class: id === active ? 'on' : '', onclick: () => { location.hash = href; } }, l)));
}
