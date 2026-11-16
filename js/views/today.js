// ─── หน้า "วันนี้" v2: นับถอยหลัง · วงคะแนน · งานสำคัญ 3 อย่าง · นัดวันนี้ · ทางลัด ───
import { h, icon, dateTH, todayISO, fmt, sheet, closeSheet, copyText } from '../ui.js';
import { todayContent } from './content.js';
import * as store from '../store.js';
import { PLANS, closingInfo } from '../../data/plans.js';
import { coach, pointsOn, countBy, weekRange, level, totalPoints, callQueue } from '../engine/work.js';
import { apptSheet, apptResultSheet } from './common.js';
import { profile } from '../app.js';
import { installCard, isStandalone } from '../pwa.js';
import { duePolicies } from './sales.js';
import { policyName } from './common.js';

let showAll = false;
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const bar = (pct) => h('div.hbar', h('i', { style: { width: Math.max(2, Math.min(100, pct * 100)) + '%' } }));

export function render(q = {}) {
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

  // ── หน้าแรกแบบช่องเรียง (Bento): จัดลำดับ/ซ่อนช่องได้ ──
  const tc = todayContent();
  const T = {
    goal: ['w2 hero-tile', () => h('div.hero',
      h('div.hero-top', h('div', h('div.hero-sub', dateTH(today, true)), h('h1', `${hello} คุณ${p.nick ? p.nick.replace(/^คุณ/, '') : (p.name || '').split(' ')[0]}`)),
        h('a.hero-btn', { href: '#/search', 'aria-label': 'ค้นหา' }, icon('search'))),
      h('a.hero-goal', { href: '#/work/sales' },
        h('div.row.between', h('span', `เป้าเบี้ยเดือน${MONTHS[+today.slice(5, 7) - 1]}`), h('b', `${fmt(monthPrem)} / ${fmt(monthTarget)}`)),
        bar(monthPrem / monthTarget),
        h('small', monthPrem >= monthTarget ? `ถึงเป้าแล้ว! ปิดได้ ${sold.length} เคส` : `อีก ${fmt(monthTarget - monthPrem)} บาท · ปิดแล้ว ${sold.length} เคส`)))],
    pts: ['', () => h('a.bt', { href: '#/work/goals' }, h('span.bt-l', icon('target'), 'คะแนนวันนี้'), h('b.bt-n', pts, h('small', '/' + target)), bar(pts / target))],
    level: ['', () => h('a.bt', { href: '#/work/goals' }, h('span.bt-l', icon('star'), 'เลเวล'), h('b.bt-n', 'Lv.' + lv.lv), bar(lv.pct))],
    week: ['', () => h('a.bt', { href: '#/work/review' }, h('span.bt-l', icon('line'), 'สัปดาห์นี้'), h('b.bt-n', wk.appt, h('small', ' นัด')), h('small.bt-s', `ปิด ${wk.close} · เสนอ ${wk.present}`))],
    call: ['accent', () => h('a.bt', { href: '#/work/call' }, h('span.bt-l', icon('flame'), 'โทรรวด'), h('b.bt-n', queue, h('small', ' คน')), h('small.bt-s', 'แตะเพื่อเริ่ม'))],
    tasks: ['w2 tall', () => h('div.bt', h('div.row.between', h('span.bt-l', icon('check'), 'งานสำคัญวันนี้'), h('span.small.muted', items.length + ' งาน')), tasks)],
    appts: ['w2', () => h('div.bt', h('div.row.between', h('span.bt-l', icon('cal'), 'นัดวันนี้'), h('button.btn.sm', { onclick: () => apptSheet() }, icon('plus'), 'นัด')),
      todays.length ? todays.map(apptEl) : h('p.small.muted', { style: { padding: '6px 0' } }, next ? 'วันนี้ว่าง · นัดถัดไป:' : 'วันนี้ยังไม่มีนัด'), !todays.length && next ? apptEl(next) : null)],
    content: ['w2', () => h('div.bt.bt-content', h('div.row.between', h('span.bt-l', icon('pen'), 'คอนเทนต์วันนี้'), h('a.small', { href: '#/tools/content' }, 'ปฏิทิน →')),
      tc ? [h('b.bt-hook', tc.hook), h('div.row', { style: { gap: '6px', marginTop: '8px' } }, h('button.btn.sm', { onclick: () => import('./content.js').then((m) => copyText(m.caption(tc))) }, icon('copy'), 'คัดลอกแคปชั่น'), h('a.btn.sm', { href: '#/tools/tipcard?t=' + encodeURIComponent(tc.hook) + '&b=' + encodeURIComponent(tc.points.join(' · ')) }, icon('pen'), 'ทำภาพ'))]
        : h('p.small.muted', 'วันนี้ไม่มีโพสต์ในแผน · ', h('a', { href: '#/tools/tipcard' }, 'ทำภาพทิป')))],
    brand: ['', () => { const bm = settings.brandMission || {}; const d = bm.start ? Math.min(30, Math.round((new Date(today) - new Date(bm.start)) / 864e5) + 1) : 0; const n = Object.values(bm.done || {}).filter(Boolean).length;
      return h('a.bt', { href: '#/brand' }, h('span.bt-l', icon('star'), 'แบรนด์ของฉัน'), h('b.bt-n', d ? d : '—', h('small', d ? '/30 วัน' : ' เริ่มภารกิจ')), bar(n / 30)); }],
    studio: ['', () => { const c = store.all('content'); const ready = c.filter((x) => x.status === 'ready').length;
      return h('a.bt', { href: '#/studio' }, h('span.bt-l', icon('pen'), 'สตูดิโอ'), h('b.bt-n', ready, h('small', ' พร้อมโพสต์')), h('small.bt-s', `${c.filter((x) => x.status === 'idea').length} ไอเดีย · ${c.filter((x) => x.status === 'doing').length} กำลังทำ`)); }],
    card: ['', () => h('button.bt', { onclick: () => import('../card.js').then((m) => m.shareCard()) }, h('span.bt-l', icon('share'), 'นามบัตร'), h('b.bt-n.sm', 'แชร์'), h('small.bt-s', 'ส่งให้ลูกค้าใหม่'))],
    plans: ['', () => h('a.bt', { href: '#/plans/build' }, h('span.bt-l', icon('layers'), 'ต่อชุดแผน'), h('b.bt-n.sm', 'เปิด'), h('small.bt-s', 'จัดตามงบได้'))],
    quick: ['w2', () => h('div.bt', h('span.bt-l', icon('grid'), 'ทางลัด'), h('div.quick',
      h('a', { href: '#/work/calendar' }, icon('cal'), 'ปฏิทิน'), h('a', { href: '#/check' }, icon('grid'), 'ตรวจการเงิน'), h('a', { href: '#/plans/body' }, icon('heart'), 'แผนที่ร่างกาย'),
      h('a', { href: '#/plans/path' }, icon('compass'), 'เส้นทางชีวิต'), h('a', { href: '#/clients/lists' }, icon('filter'), 'รายชื่ออัจฉริยะ'), h('a', { href: '#/tools/train' }, icon('bulb'), 'ฝึกจำแผน')))],
  };
  const NAMES = { goal: 'เป้าเดือนนี้', pts: 'คะแนนวันนี้', level: 'เลเวล', week: 'สัปดาห์นี้', call: 'โทรรวด', tasks: 'งานสำคัญ', appts: 'นัดวันนี้', content: 'คอนเทนต์วันนี้', card: 'นามบัตร', brand: 'แบรนด์ของฉัน', studio: 'สตูดิโอ', plans: 'ต่อชุดแผน', quick: 'ทางลัด' };
  const order = (settings.bento || []).filter((x) => T[x.id]);
  for (const id of Object.keys(T)) if (!order.some((x) => x.id === id)) order.push({ id, on: true });
  const editBento = () => {
    const st = order.map((x) => ({ ...x }));
    const list = h('div.bento-edit');
    const draw = () => list.replaceChildren(...st.map((x, i) => h('div.be-row', h('label.row', { style: { flex: 1 } }, h('input', { type: 'checkbox', checked: x.on, onchange: (e) => { x.on = e.target.checked; } }), NAMES[x.id]),
      h('button.icon-btn', { disabled: i === 0, 'aria-label': 'เลื่อนขึ้น ' + NAMES[x.id], onclick: () => { [st[i - 1], st[i]] = [st[i], st[i - 1]]; draw(); } }, icon('back')),
      h('button.icon-btn', { disabled: i === st.length - 1, 'aria-label': 'เลื่อนลง ' + NAMES[x.id], onclick: () => { [st[i + 1], st[i]] = [st[i], st[i + 1]]; draw(); } }, icon('next')))));
    draw();
    sheet({ title: 'จัดหน้าแรก', body: h('div.stack', h('p.small.muted', 'ติ๊กช่องที่อยากเห็น และเลื่อนลำดับขึ้น/ลง'), list,
      h('button.btn.primary.block', { onclick: () => { closeSheet(true); store.saveSettings({ bento: st }); } }, icon('check'), 'บันทึก'),
      h('button.btn.ghost.block', { onclick: () => { closeSheet(true); store.saveSettings({ bento: [] }); } }, 'คืนค่าเริ่มต้น')) });
  };
  // ค่าเริ่มต้น: เห็นแค่ 4 ช่องหลัก ที่เหลือพับไว้ (ถ้าจัดหน้าแรกเองแล้ว ใช้ตามที่จัด)
  const CORE = ['goal', 'tasks', 'appts', 'quick'];
  const custom = (settings.bento || []).length > 0;
  const tile = (x) => h('div.bx', { class: T[x.id][0] }, T[x.id][1]());
  const bento = h('div.bento', order.filter((x) => x.on && (custom || CORE.includes(x.id))).sort((a, b) => (custom ? 0 : CORE.indexOf(a.id) - CORE.indexOf(b.id))).map(tile));
  const rest = custom ? null : h('details.home-more', h('summary.more-btn', 'ดูตัวเลขและทางลัดอื่น ๆ'), h('div.bento', { style: { marginTop: '10px' } }, order.filter((x) => x.on && !CORE.includes(x.id)).map(tile)));
  if (q.edit) setTimeout(() => { history.replaceState(null, '', '#/'); editBento(); }, 80);

  // เช็กลิสต์ตั้งค่าครั้งแรก
  const steps = [
    ['โปรไฟล์: เลขใบอนุญาต / LINE ID', !!(p.licenseLife && p.line), '#/tools/profile'],
    ['ตั้งเป้ารายได้', !!settings.goal, '#/work/goals'],
    ['ซิงก์กับคอม (Google Sheets)', !!store.sync.config.url, '#/tools/sync'],
    ['ติดตั้งแอปบนมือถือ', isStandalone() || !!settings.installed, '#/settings/app'],
    ['เพิ่มลูกค้าคนแรก', clients.length > 0, '#/client/new'],
    ['ตรวจสุขภาพการเงินครั้งแรก', store.all('checks').length > 0, '#/check'],
  ];
  const doneN = steps.filter((x) => x[1]).length;
  if (isStandalone() && !settings.installed) setTimeout(() => store.saveSettings({ installed: true }), 0);
  const setup = settings.setupHidden || doneN === steps.length ? null : h('details.card.setup', h('summary',
    h('div.row.between', h('div', h('b', `ตั้งค่าแอปให้พร้อม ${doneN}/${steps.length}`), h('div.small.muted', 'แตะเพื่อดูรายการ · ทำครบแล้วการ์ดนี้จะหายไปเอง')), h('button.icon-btn', { 'aria-label': 'ซ่อนเช็กลิสต์', onclick: () => store.saveSettings({ setupHidden: true }) }, icon('close'))),
    h('div.setup-bar', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': steps.length, 'aria-valuenow': doneN }, h('i', { style: { width: (doneN / steps.length) * 100 + '%' } }))),
    h('ul.setup-list', steps.map(([t, ok, href]) => h('li', { class: ok ? 'ok' : '' }, h('a', { href }, h('span.sl-ic', { 'aria-hidden': 'true' }, ok ? icon('check') : ''), h('span', t), h('span.sr-only', ok ? ' (ทำแล้ว)' : ' (ยังไม่ได้ทำ)'), ok ? null : icon('next'))))));

  const sg = h('div'); import('../suggest.js').then((m) => sg.replaceWith(m.suggestCard())).catch(() => {});
  return h('div', { 'data-title': 'วันนี้' },
    installCard(),
    sg,
    setup,
    // แผนใกล้ปิดขาย: อยู่ในการ์ด "วันนี้โพสต์อะไรดี" แล้ว
    bento, rest,
    h('div.row', { style: { justifyContent: 'center', marginTop: '12px' } }, h('button.btn.ghost.sm', { onclick: editBento }, icon('grid'), 'จัดหน้าแรก')),
    !store.sync.config.url ? h('a.callout.warn', { href: '#/tools/sync', style: { display: 'block', marginTop: '12px', color: 'inherit', textDecoration: 'none' } }, 'ข้อมูลยังอยู่แค่เครื่องนี้ — แตะเพื่อตั้งค่าซิงก์กับคอม') : null);
}
