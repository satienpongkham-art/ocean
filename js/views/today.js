// ─── หน้า "วันนี้": โค้ชวันนี้ · นัด · คะแนนกิจกรรม · แผนใกล้ปิดรับ ───
import { h, icon, dateTH, todayISO, empty } from '../ui.js';
import * as store from '../store.js';
import { PLANS, closingInfo } from '../../data/plans.js';
import { coach, pointsOn, countBy, weekRange } from '../engine/work.js';
import { apptSheet, apptResultSheet } from './common.js';
import { profile } from '../app.js';

export function render() {
  const clients = store.all('clients');
  const appts = store.all('appts');
  const activities = store.all('activities');
  const settings = store.getSettings();
  const closingPlans = PLANS.map((p) => ({ plan: p, ...closingInfo(p) })).filter((x) => x.days != null && !x.closed);
  const items = coach({ clients, appts, activities, settings, closingPlans });
  const today = todayISO();
  const target = +settings.dailyPoints || 20;
  const pts = pointsOn(activities, today);
  const wk = weekRange();
  const wc = countBy(activities, wk.from, wk.to);
  const wkPts = activities.filter((a) => a.date >= wk.from && a.date <= wk.to).reduce((s, a) => s + ({ call: 1, talk: 1, appt: 2, meet: 3, present: 4, close: 5, referral: 2, service: 1 }[a.type] || 0) * (a.count || 1), 0);
  const todays = appts.filter((a) => a.date === today && a.status === 'planned').sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const upcoming = appts.filter((a) => a.date > today && a.status === 'planned').sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 5);
  const cById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const p = profile();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';

  const apptRow = (a) => {
    const c = cById[a.clientId];
    return h('li.row.between',
      h('div', { style: { minWidth: 0 } }, h('b.small', (a.date === today ? '' : dateTH(a.date, true) + ' ') + (a.time || 'ทั้งวัน')), ' ', h('span.small', c ? c.nick : (a.title || 'นัด')),
        h('div.xs.muted', [a.title, a.purpose, a.place].filter(Boolean).join(' · '))),
      a.date <= today ? h('button.btn.sm', { onclick: () => apptResultSheet(a) }, 'บันทึกผล') : (c ? h('a.btn.sm.ghost', { href: '#/client/' + c.id }, icon('next')) : null));
  };

  return h('div', { 'data-title': 'วันนี้' },
    h('div.topbar',
      h('div', h('div.sub', dateTH(today, true)), h('h1', `${hello} คุณ${(p.name || '').split(' ')[0]}`)),
      h('button.btn.primary', { onclick: () => apptSheet() }, icon('plus'), 'นัดใหม่')),

    ...closingPlans.map((x) => h('a.countdown', { href: '#/plan/' + x.plan.id, style: { textDecoration: 'none', color: 'inherit', marginBottom: '12px' } },
      h('div.big', x.days), h('div', h('b', `วันก่อน ${x.plan.short} ปิดรับใบคำขอ`), h('div.small.muted', `กำหนด ${dateTH(x.date)} (ตามข่าว — ยืนยันกับระบบตัวแทน) · แตะเพื่อดูแผน`)))),

    h('div.stats', { style: { marginTop: '4px' } },
      h('div.stat', h('span', 'คะแนนวันนี้'), h('b', `${pts}`, h('small', ` / ${target}`)), h('div.meter', h('i', { style: { width: Math.min(100, (pts / target) * 100) + '%' } }))),
      h('div.stat', h('span', 'คะแนนสัปดาห์นี้'), h('b', wkPts, h('small', ` / ${target * 5}`)), h('div.meter', h('i', { style: { width: Math.min(100, (wkPts / (target * 5)) * 100) + '%' } }))),
      h('div.stat', h('span', 'นัดสัปดาห์นี้'), h('b', wc.appt + wc.meet), h('small', `ได้นัด ${wc.appt} · พบ ${wc.meet}`)),
      h('div.stat', h('span', 'ปิดการขายสัปดาห์นี้'), h('b', wc.close), h('small', `เสนอแผน ${wc.present} ครั้ง`))),

    h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: '14px', alignItems: 'start' } },
      h('div.card',
        h('div.card-h', h('h2', 'โค้ชวันนี้'), h('span.xs.muted', 'เรียงตามความสำคัญ')),
        items.length ? h('div', items.slice(0, 10).map((it) => h('a.coach-item', { class: it.kind, href: it.go, style: { textDecoration: 'none', color: 'inherit' } },
          h('div.ic', icon(it.icon)), h('div', h('div', { style: { fontWeight: 600, fontSize: '14.5px' } }, it.title), h('div.why', it.why))))) : empty('ไม่มีงานค้าง — เพิ่มรายชื่อหรือโทรหาลูกค้าเกรด A', 'check')),
      h('div.stack',
        h('div.card',
          h('div.card-h', h('h2', 'นัดวันนี้'), h('a.small', { href: '#/work' }, 'ท่อการขาย')),
          todays.length ? h('ul.list', todays.map(apptRow)) : h('p.small.muted', 'ไม่มีนัดวันนี้'),
          upcoming.length ? h('div', h('div.xs.muted', { style: { margin: '10px 0 2px' } }, 'ถัดไป'), h('ul.list', upcoming.map(apptRow))) : null),
        h('div.card',
          h('div.card-h', h('h2', 'ทางลัด')),
          h('div.grid', { style: { gridTemplateColumns: '1fr 1fr', gap: '8px' } },
            h('a.btn', { href: '#/work/call' }, icon('phone'), 'โทรนัด'),
            h('a.btn', { href: '#/plans/advisor' }, icon('compass'), 'แนะนำแผน'),
            h('a.btn', { href: '#/client/new' }, icon('plus'), 'รายชื่อใหม่'),
            h('a.btn', { href: '#/tools/captions' }, icon('pen'), 'แคปชั่น'),
            h('a.btn', { href: '#/tools/tax' }, icon('tax'), 'ภาษี'),
            h('a.btn', { href: '#/tools/objections' }, icon('chat'), 'ข้อโต้แย้ง'))))),
    !store.sync.config.url ? h('div.callout.warn', { style: { marginTop: '14px' } }, 'ข้อมูลยังเก็บแค่ในเครื่องนี้ — ', h('a', { href: '#/tools/sync' }, 'ตั้งค่าซิงก์ Google Sheets'), ' เพื่อให้มือถือและคอมเห็นข้อมูลเดียวกัน') : null);
}
