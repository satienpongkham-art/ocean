// ─── หน้า "วันนี้" v2: นับถอยหลัง · วงคะแนน · งานสำคัญ 3 อย่าง · นัดวันนี้ · ทางลัด ───
import { h, icon, dateTH, todayISO } from '../ui.js';
import * as store from '../store.js';
import { PLANS, closingInfo } from '../../data/plans.js';
import { coach, pointsOn, countBy, weekRange } from '../engine/work.js';
import { apptSheet, apptResultSheet } from './common.js';
import { profile } from '../app.js';

let showAll = false;

function ring(value, target) {
  const r = 32, c = 2 * Math.PI * r, pct = Math.min(1, value / Math.max(1, target));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 76 76');
  svg.innerHTML = `<circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--paper-2)" stroke-width="8"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--primary)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c * pct} ${c}"/>`;
  return h('div.ring', svg, h('b', h('span', value, h('small', 'จาก ' + target))));
}

export function render() {
  const clients = store.all('clients');
  const appts = store.all('appts');
  const activities = store.all('activities');
  const settings = store.getSettings();
  const closingPlans = PLANS.map((p) => ({ plan: p, ...closingInfo(p) })).filter((x) => x.days != null && !x.closed);
  const items = coach({ clients, appts, activities, settings, closingPlans: [] }); // แผนใกล้ปิดแสดงเป็นแถบแยกแล้ว
  const today = todayISO();
  const target = +settings.dailyPoints || 20;
  const pts = pointsOn(activities, today);
  const wk = countBy(activities, weekRange().from, weekRange().to);
  const todays = appts.filter((a) => a.date === today && a.status === 'planned').sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const next = appts.filter((a) => a.date > today && a.status === 'planned').sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  const cById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const p = profile();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const noHealth = clients.filter((c) => (!c.healthLevel || c.healthLevel === 'none' || c.healthLevel === 'welfare') && c.stage !== 'paused').length;

  const taskEl = (it) => h('a.task', { class: it.kind, href: it.go }, h('span.ic', icon(it.icon)), h('span.tt', h('b', it.title), h('span', it.why)), icon('next'));
  const tasks = h('div');
  const drawTasks = () => tasks.replaceChildren(
    ...(items.length ? (showAll ? items : items.slice(0, 3)).map(taskEl) : [h('p.small.muted', { style: { padding: '8px 0' } }, 'ไม่มีงานค้าง — ลองโทรหาลูกค้าเกรด A สักคน')]),
    items.length > 3 ? h('button.more-btn', { onclick: () => { showAll = !showAll; drawTasks(); } }, showAll ? 'ย่อ' : `ดูทั้งหมด (${items.length})`) : null);
  drawTasks();

  const apptEl = (a) => {
    const c = cById[a.clientId];
    return h('div.task', h('span.ic', { style: { background: 'var(--primary-soft)', color: 'var(--primary)' } }, icon('cal')),
      h('span.tt', h('b', `${a.date === today ? '' : dateTH(a.date, true) + ' '}${a.time || 'ทั้งวัน'} · ${c ? c.nick : (a.title || 'นัด')}`), h('span', [a.purpose, a.place].filter(Boolean).join(' · '))),
      a.date <= today ? h('button.btn.sm', { onclick: () => apptResultSheet(a) }, 'บันทึกผล') : null);
  };

  return h('div', { 'data-title': 'วันนี้' },
    h('div.topbar', h('div', h('div.sub', dateTH(today, true)), h('h1', `${hello} คุณ${(p.name || '').split(' ')[0]}`)), h('button.btn.primary', { onclick: () => apptSheet() }, icon('plus'), 'นัด')),

    ...closingPlans.map((x) => h('a.countdown', { href: '#/plan/' + x.plan.id, style: { textDecoration: 'none', color: 'inherit', marginBottom: '12px' } },
      h('div.big', x.days), h('div', { style: { flex: 1 } }, h('b', `วัน ${x.plan.short} ปิดรับ`), h('div.small.muted', noHealth ? `ลูกค้า ${noHealth} คนยังไม่มีประกันสุขภาพของตัวเอง` : 'แตะเพื่อดูแผน')), icon('next'))),

    h('div.card', h('div.today-strip', ring(pts, target),
      h('div', h('div.small.muted', { style: { marginBottom: '6px' } }, 'คะแนนกิจกรรมวันนี้ · สัปดาห์นี้'),
        h('div.mini-stats', h('div', h('b', wk.appt), h('span', 'ได้นัด')), h('div', h('b', wk.meet + wk.present), h('span', 'พบ/เสนอ')), h('div', h('b', wk.close), h('span', 'ปิดได้')))))),

    h('div.section', h('h2', 'ทำอะไรก่อนดี'), h('div.card', { style: { paddingTop: '6px', paddingBottom: '6px' } }, tasks)),

    h('div.section', h('h2', 'นัดวันนี้'), h('div.card', { style: { paddingTop: '6px', paddingBottom: '6px' } },
      todays.length ? todays.map(apptEl) : h('p.small.muted', { style: { padding: '10px 0' } }, next ? 'วันนี้ว่าง · นัดถัดไป:' : 'วันนี้ยังไม่มีนัด'),
      !todays.length && next ? apptEl(next) : null)),

    h('div.section', h('h2', 'ทางลัด'), h('div.quick',
      h('a', { href: '#/work/call' }, icon('phone'), 'โทรนัด'),
      h('a', { href: '#/plans/advisor' }, icon('compass'), 'แนะนำแผน'),
      h('a', { href: '#/client/new' }, icon('plus'), 'รายชื่อใหม่'),
      h('a', { href: '#/plans' }, icon('plans'), 'ดูแผน'),
      h('a', { href: '#/tools/captions' }, icon('pen'), 'ทำโพสต์'),
      h('a', { href: '#/tools/tax' }, icon('tax'), 'ภาษี'))),

    !store.sync.config.url ? h('a.callout.warn', { href: '#/tools/sync', style: { display: 'block', marginTop: '16px', color: 'inherit', textDecoration: 'none' } }, 'ข้อมูลยังอยู่แค่เครื่องนี้ — แตะเพื่อตั้งค่าซิงก์กับคอม') : null);
}
