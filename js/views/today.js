// ─── หน้า "วันนี้" v2: นับถอยหลัง · วงคะแนน · งานสำคัญ 3 อย่าง · นัดวันนี้ · ทางลัด ───
import { h, icon, dateTH, todayISO, fmt } from '../ui.js';
import * as store from '../store.js';
import { PLANS, closingInfo } from '../../data/plans.js';
import { coach, pointsOn, countBy, weekRange, level, totalPoints, callQueue } from '../engine/work.js';
import { apptSheet, apptResultSheet } from './common.js';
import { profile } from '../app.js';
import { installCard } from '../pwa.js';
import { duePolicies } from './sales.js';
import { policyName } from './common.js';

let showAll = false;
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const bar = (pct) => h('div.hbar', h('i', { style: { width: Math.max(2, Math.min(100, pct * 100)) + '%' } }));

export function render() {
  const clients = store.all('clients');
  const appts = store.all('appts');
  const activities = store.all('activities');
  const settings = store.getSettings();
  const closingPlans = PLANS.map((p) => ({ plan: p, ...closingInfo(p) })).filter((x) => x.days != null && !x.closed);
  const today = todayISO();
  const items = coach({ clients, appts, activities, settings, closingPlans: [], policies: store.all('policies') }); // แผนใกล้ปิดแสดงเป็นแถบแยกแล้ว
  for (const pol of duePolicies(14)) { const c = clients.find((x) => x.id === pol.clientId); const d = Math.round((new Date(pol.nextDue) - new Date(today)) / 864e5); items.push({ pri: d <= 3 ? 88 : 62, kind: d <= 3 ? 'hot' : '', icon: 'doc', title: `${c?.nick || 'ลูกค้า'}: ${policyName(pol)} ครบชำระ${d < 0 ? 'เลยมา ' + -d + ' วัน' : d === 0 ? 'วันนี้' : 'อีก ' + d + ' วัน'}`, why: 'แจ้งลูกค้าล่วงหน้า กันกรมธรรม์ขาดอายุ', go: c ? '#/client/' + c.id : '#/work/sales' }); }
  items.sort((a, b) => b.pri - a.pri);
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

  // เป้าเดือนนี้: เบี้ยที่ต้องขาย = รายได้ต่อปี ÷ อัตราค่าคอม ÷ 12
  const goal = { incomeYear: 600000, commissionRate: 0.3, ...(settings.goal || {}) };
  const monthTarget = goal.incomeYear / Math.max(0.01, goal.commissionRate || 0.3) / 12;
  const ym = today.slice(0, 7);
  const sold = store.all('policies').filter((x) => ['submitted', 'issued'].includes(x.status) && (x.submitDate || '').startsWith(ym));
  const monthPrem = sold.reduce((t, x) => t + (+x.premium || 0), 0);
  const lv = level(totalPoints(activities));
  const queue = callQueue(clients).length;

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

  const hero = h('div.hero',
    h('div.hero-top', h('div', h('div.hero-sub', dateTH(today, true)), h('h1', `${hello} คุณ${(p.name || '').split(' ')[0]}`)),
      h('a.hero-btn', { href: '#/search', 'aria-label': 'ค้นหา' }, icon('search'))),
    h('a.hero-goal', { href: '#/work/sales' },
      h('div.row.between', h('span', `เป้าเบี้ยเดือน${MONTHS[+today.slice(5, 7) - 1]}`), h('b', `${fmt(monthPrem)} / ${fmt(monthTarget)}`)),
      bar(monthPrem / monthTarget),
      h('small', monthPrem >= monthTarget ? `ถึงเป้าแล้ว! ปิดได้ ${sold.length} เคส` : `อีก ${fmt(monthTarget - monthPrem)} บาท · ปิดแล้ว ${sold.length} เคส`)),
    h('div.hero-stats',
      h('a', { href: '#/work/goals' }, h('span', 'คะแนนวันนี้'), h('b', pts, h('small', '/' + target)), bar(pts / target)),
      h('a', { href: '#/work/goals' }, h('span', 'เลเวล'), h('b', 'Lv.' + lv.lv), bar(lv.pct)),
      h('a', { href: '#/work/review' }, h('span', 'สัปดาห์นี้'), h('b', wk.appt, h('small', ' นัด')), h('small.hs-sub', `ปิด ${wk.close} · เสนอ ${wk.present}`))),
    h('div.hero-acts',
      h('a.hero-cta', { href: '#/work/call' }, icon('flame'), queue ? `โทรรวด · ${queue} คน` : 'โทรรวด'),
      h('a.hero-chip', { href: '#/work/calendar' }, icon('cal'), 'ปฏิทิน'),
      h('button.hero-chip', { onclick: () => apptSheet() }, icon('plus'), 'นัด')));

  return h('div', { 'data-title': 'วันนี้' },
    installCard(),
    hero,

    ...closingPlans.map((x) => h('a.countdown', { href: '#/plan/' + x.plan.id, style: { textDecoration: 'none', color: 'inherit', marginTop: '12px' } },
      h('div.big', x.days), h('div', { style: { flex: 1 } }, h('b', `วัน ${x.plan.short} ปิดรับ`), h('div.small.muted', noHealth ? `ลูกค้า ${noHealth} คนยังไม่มีประกันสุขภาพของตัวเอง` : 'แตะเพื่อดูแผน')), icon('next'))),

    h('div.section', h('h2', 'งานสำคัญวันนี้'), h('div.card', { style: { paddingTop: '6px', paddingBottom: '6px' } }, tasks)),

    h('div.section', h('h2', 'นัดวันนี้'), h('div.card', { style: { paddingTop: '6px', paddingBottom: '6px' } },
      todays.length ? todays.map(apptEl) : h('p.small.muted', { style: { padding: '10px 0' } }, next ? 'วันนี้ว่าง · นัดถัดไป:' : 'วันนี้ยังไม่มีนัด'),
      !todays.length && next ? apptEl(next) : null)),

    h('div.section', h('h2', 'ทางลัด'), h('div.quick',
      h('a', { href: '#/work/calendar' }, icon('cal'), 'ปฏิทิน'),
      h('a', { href: '#/tools/train' }, icon('bulb'), 'ฝึกจำแผน'),
      h('a', { href: '#/check' }, icon('grid'), 'ตรวจการเงิน'),
      h('a', { href: '#/plans/advisor' }, icon('compass'), 'แนะนำแผน'),
      h('a', { href: '#/plans' }, icon('plans'), 'ดูแผน'),
      h('a', { href: '#/tools/captions' }, icon('pen'), 'ทำโพสต์'))),

    !store.sync.config.url ? h('a.callout.warn', { href: '#/tools/sync', style: { display: 'block', marginTop: '16px', color: 'inherit', textDecoration: 'none' } }, 'ข้อมูลยังอยู่แค่เครื่องนี้ — แตะเพื่อตั้งค่าซิงก์กับคอม') : null);
}
