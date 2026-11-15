// ─── ส่วนที่ใช้ร่วมกัน: นัดหมาย · บันทึกกิจกรรม · ลิงก์ Google Calendar ───
import { h, icon, sheet, closeSheet, field, inputEl, selectEl, readForm, toast, todayISO, dateTH } from '../ui.js';
import * as store from '../store.js';
import { ACTIVITIES, ACT, STAGE } from '../engine/work.js';
import { haptic } from '../pwa.js';

export function gcalLink({ title, date, time, minutes = 60, place, details }) {
  const d = (date || todayISO()).replace(/-/g, '');
  let dates;
  if (time) {
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(2000, 0, 1, hh, mm); const end = new Date(start.getTime() + minutes * 60000);
    const t = (x) => String(x.getHours()).padStart(2, '0') + String(x.getMinutes()).padStart(2, '0') + '00';
    dates = `${d}T${t(start)}/${d}T${t(end)}`;
  } else {
    const nx = new Date(date + 'T00:00:00'); nx.setDate(nx.getDate() + 1);
    dates = `${d}/${nx.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }
  const u = new URLSearchParams({ action: 'TEMPLATE', text: title || 'นัดลูกค้า', dates, ctz: 'Asia/Bangkok' });
  if (place) u.set('location', place);
  if (details) u.set('details', details);
  return 'https://calendar.google.com/calendar/render?' + u.toString();
}

/** บันทึกกิจกรรม (นับคะแนน) + log ในประวัติลูกค้า */
export function logActivity(type, clientId, note = '') {
  haptic();
  store.put('activities', { type, clientId: clientId || null, date: todayISO(), count: 1 });
  if (clientId) {
    store.put('logs', { clientId, date: todayISO(), type, text: note || ACT[type]?.name || type });
    const c = store.get('clients', clientId);
    if (c) store.put('clients', { ...c, lastContact: new Date().toISOString() });
  }
  toast(`+${ACT[type]?.pts || 0} คะแนน · ${ACT[type]?.name || ''}`);
}

export function setStage(c, stage) {
  if (!c || c.stage === stage) return;
  store.put('clients', { ...c, stage, stageAt: new Date().toISOString() });
  store.put('logs', { clientId: c.id, date: todayISO(), type: 'stage', text: `ย้ายไปขั้น "${STAGE[stage]?.name || stage}"` });
}

/** ฟอร์มนัดหมาย (ป๊อปอัป) */
export function apptSheet({ clientId, appt } = {}) {
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const a = appt || { date: todayISO(), time: '', clientId };
  const f = h('form.form-grid', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = readForm(f);
      const isNew = !a.id;
      const saved = store.put('appts', { ...a, ...d, status: a.status || 'planned' });
      if (isNew) {
        const c = d.clientId && store.get('clients', d.clientId);
        if (c) {
          store.put('activities', { type: 'appt', clientId: c.id, date: todayISO(), count: 1 });
          if (['lead', 'contacted', undefined, ''].includes(c.stage)) setStage(store.get('clients', c.id), 'appt');
        }
      }
      closeSheet(true);
      toast(isNew ? 'บันทึกนัดแล้ว' : 'แก้ไขนัดแล้ว');
      const c = saved.clientId && store.get('clients', saved.clientId);
      showApptDone(saved, c);
    },
  },
    field('ลูกค้า', selectEl('clientId', a.clientId || '', [['', '— ไม่ระบุ —'], ...clients.map((c) => [c.id, c.nick])]), null),
    field('หัวข้อ', inputEl('title', a.title, { placeholder: 'เช่น คุยแผนสุขภาพ' })),
    field('วันที่', inputEl('date', a.date, { type: 'date', required: true })),
    field('เวลา', inputEl('time', a.time, { type: 'time' })),
    field('สถานที่ / ช่องทาง', inputEl('place', a.place, { placeholder: 'ร้านกาแฟ / Zoom / บ้านลูกค้า' })),
    field('จุดประสงค์', selectEl('purpose', a.purpose || 'แนะนำตัว/เก็บข้อมูล', [['แนะนำตัว/เก็บข้อมูล', 'แนะนำตัว / เก็บข้อมูล'], ['ตรวจสุขภาพการเงิน', 'ตรวจสุขภาพการเงิน'], ['เสนอแผน', 'เสนอแผน'], ['ปิดการขาย/เซ็นใบคำขอ', 'ปิดการขาย / เซ็นใบคำขอ'], ['ส่งมอบกรมธรรม์', 'ส่งมอบกรมธรรม์'], ['บริการ/ติดตาม', 'บริการ / ติดตาม']])),
    h('div.full', field('บันทึก', h('textarea.input', { name: 'note' }, a.note || ''))),
    h('div.full.row', { style: { gap: '8px' } },
      h('button.btn.primary', { type: 'submit', style: { flex: 1 } }, icon('check'), 'บันทึกนัด'),
      a.id ? h('button.btn.danger', { type: 'button', onclick: () => { if (confirm('ลบนัดนี้?')) { store.remove('appts', a.id); closeSheet(true); } } }, icon('trash')) : null));
  sheet({ title: a.id ? 'แก้ไขนัด' : 'เพิ่มนัดหมาย', body: f });
}

function showApptDone(a, c) {
  const title = (a.title || a.purpose || 'นัด') + (c ? ' — ' + c.nick : '');
  sheet({
    title: 'บันทึกนัดแล้ว',
    body: h('div.stack',
      h('div.callout.good', `${dateTH(a.date, true)} ${a.time || ''} · ${title}`),
      h('p.small.muted', 'เพิ่มลง Google Calendar เพื่อให้มือถือแจ้งเตือนก่อนถึงเวลานัด'),
      h('a.btn.primary.block', { href: gcalLink({ title, date: a.date, time: a.time, place: a.place, details: [a.purpose, a.note].filter(Boolean).join('\n') }), target: '_blank', rel: 'noopener' }, icon('cal'), 'เพิ่มลง Google Calendar'),
      h('button.btn.block', { onclick: () => closeSheet(true) }, 'เสร็จ')),
  });
}

/** ปิดนัด: บันทึกผล */
export function apptResultSheet(a) {
  const c = a.clientId && store.get('clients', a.clientId);
  const f = h('form.stack', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = readForm(f);
      store.put('appts', { ...a, status: d.status, result: d.result });
      if (d.status === 'done') {
        logActivity('meet', a.clientId, 'พบลูกค้า: ' + (d.result || a.purpose || ''));
        if (d.presented) store.put('activities', { type: 'present', clientId: a.clientId || null, date: todayISO(), count: 1 });
        if (c && d.nextStage) setStage(store.get('clients', c.id), d.nextStage);
      }
      closeSheet(true);
    },
  },
    field('ผล', selectEl('status', 'done', [['done', 'พบแล้ว'], ['cancel', 'ยกเลิก / เลื่อน']])),
    h('label.row.small', h('input', { type: 'checkbox', name: 'presented' }), 'ได้เสนอแผนในนัดนี้ (+4 คะแนน)'),
    c ? field('ย้ายขั้นลูกค้าเป็น', selectEl('nextStage', '', [['', '— ไม่เปลี่ยน —'], ['met', 'พบ / วิเคราะห์'], ['proposed', 'เสนอแผน'], ['closed', 'ปิดการขาย'], ['delivered', 'ส่งมอบแล้ว'], ['paused', 'พักไว้']])) : null,
    field('สรุปสั้น ๆ', h('textarea.input', { name: 'result', placeholder: 'คุยเรื่องอะไร ลูกค้าสนใจอะไร ต้องทำอะไรต่อ' })),
    h('button.btn.primary.block', { type: 'submit' }, icon('check'), 'บันทึกผล'));
  sheet({ title: 'บันทึกผลนัด', sub: (c?.nick || '') + ' · ' + dateTH(a.date), body: f });
}

export function activityButtons(clientId) {
  return h('div.row.wrap', { style: { gap: '6px' } }, ACTIVITIES.filter((a) => a.id !== 'appt').map((a) =>
    h('button.btn.sm', { onclick: () => logActivity(a.id, clientId) }, a.name, h('span.muted.xs', '+' + a.pts))));
}

// ── กรมธรรม์ / ยอดขาย ──────────────────────────────────────
import { PLANS, PLAN, CATEGORIES } from '../../data/plans.js';
import { choices, readControls, q, fmt } from '../ui.js';

export const POLICY_STATUS = [['proposed', 'เสนอแล้ว'], ['submitted', 'ยื่นใบคำขอ'], ['issued', 'อนุมัติ/ออกกรมธรรม์'], ['lapsed', 'ขาดอายุ/ยกเลิก']];
export const STATUS_COLOR = { proposed: 'var(--warn)', submitted: 'var(--c-life)', issued: 'var(--good)', lapsed: 'var(--na)' };
export const PAY_MODE = [['year', 'รายปี'], ['half', 'ราย 6 เดือน'], ['quarter', 'ราย 3 เดือน'], ['month', 'รายเดือน']];
export const policyName = (p) => (p.planId && PLAN[p.planId] ? PLAN[p.planId].short : p.name || 'กรมธรรม์');

export function policySheet({ clientId, policy } = {}) {
  const pol = policy || { clientId, status: 'proposed', mode: 'year', submitDate: todayISO() };
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const planSel = h('select.input', { name: 'planId' }, h('option', { value: '' }, '— อื่น ๆ (พิมพ์ชื่อด้านล่าง) —'),
    CATEGORIES.map((c) => h('optgroup', { label: c.name }, PLANS.filter((p) => p.cat === c.id).map((p) => h('option', { value: p.id, selected: pol.planId === p.id }, p.short)))));
  const body = h('div',
    !clientId ? q('ลูกค้า', h('select.input', { name: 'clientId' }, h('option', { value: '' }, '—'), clients.map((c) => h('option', { value: c.id, selected: pol.clientId === c.id }, c.nick)))) : null,
    q('แผน', planSel),
    q('ชื่อแผน (ถ้าไม่มีในรายการ)', h('input.input', { name: 'name', value: pol.name || '', placeholder: 'เช่น กรมธรรม์บริษัทอื่น' })),
    q('ทุนประกัน', h('input.input', { name: 'sa', type: 'number', inputmode: 'numeric', value: pol.sa ?? '' })),
    q('เบี้ยต่อปี (บาท)', h('input.input', { name: 'premium', type: 'number', inputmode: 'numeric', value: pol.premium ?? '' }), 'จากใบเสนอในระบบ AIA'),
    q('งวดชำระ', choices('mode', pol.mode || 'year', PAY_MODE)),
    q('สถานะ', choices('status', pol.status || 'proposed', POLICY_STATUS)),
    q('วันที่ยื่น / เสนอ', h('input.input', { name: 'submitDate', type: 'date', value: pol.submitDate || '' })),
    q('ครบกำหนดชำระงวดถัดไป', h('input.input', { name: 'nextDue', type: 'date', value: pol.nextDue || '' }), 'แอปจะเตือนล่วงหน้า 14 วัน'),
    q('บันทึก', h('input.input', { name: 'note', value: pol.note || '' })));
  const save = () => {
    const d = readControls(body);
    const cid = clientId || d.clientId;
    const wasSold = ['submitted', 'issued'].includes(pol.status);
    const saved = store.put('policies', { ...pol, ...d, clientId: cid });
    const sold = ['submitted', 'issued'].includes(saved.status);
    if (sold && !wasSold && cid) {
      store.put('activities', { type: 'close', clientId: cid, date: todayISO(), count: 1 });
      const c = store.get('clients', cid); if (c && !['closed', 'delivered'].includes(c.stage)) setStage(c, 'closed');
      haptic(30); toast('ยินดีด้วย! บันทึกการปิดการขาย +5 คะแนน');
    } else toast('บันทึกแล้ว');
    closeSheet(true);
  };
  sheet({ title: policy ? 'แก้ไขกรมธรรม์' : 'เพิ่มกรมธรรม์ / ยอดขาย', body: h('div', body,
    h('div.row', { style: { gap: '8px' } }, h('button.btn.primary', { style: { flex: 1 }, onclick: save }, icon('check'), 'บันทึก'),
      policy ? h('button.btn.danger', { onclick: () => { if (confirm('ลบรายการนี้?')) { store.remove('policies', pol.id); closeSheet(true); } } }, icon('trash')) : null)) });
}

export function policyRow(p, { showClient = false } = {}) {
  const c = showClient && p.clientId ? store.get('clients', p.clientId) : null;
  const plan = p.planId && PLAN[p.planId];
  return h('button.prow' + (plan ? '.cat-' + plan.cat : ''), { onclick: () => policySheet({ clientId: p.clientId, policy: p }) },
    h('span.pi', icon(plan ? 'cat-' + plan.cat : 'doc')),
    h('span.pt', h('b', (c ? c.nick + ' · ' : '') + policyName(p)),
      h('span', h('i.status-dot', { style: { background: STATUS_COLOR[p.status] || 'var(--na)' } }), [Object.fromEntries(POLICY_STATUS)[p.status], p.premium ? fmt(p.premium) + '/ปี' : null, p.nextDue ? 'ครบชำระ ' + dateTH(p.nextDue) : null].filter(Boolean).join(' · '))),
    h('span.pr', icon('next')));
}

// ── ปุ่ม + ลอย: บันทึกด่วนจากทุกหน้า ─────────────────────
export function quickSheet() {
  const go = (href) => { closeSheet(true); location.hash = href; };
  const log = (type) => { closeSheet(true); logActivity(type, null); };
  const items = [
    ['phone', 'โทร / ทัก', '+1 คะแนน', () => log('call')],
    ['cal', 'นัดใหม่', 'ลงนัด + Google Calendar', () => { closeSheet(true); apptSheet(); }],
    ['star', 'ขายได้', 'บันทึกกรมธรรม์', () => { closeSheet(true); policySheet(); }],
    ['plus', 'รายชื่อใหม่', 'เพิ่มลูกค้า', () => go('#/client/new')],
    ['clients', 'พบลูกค้า', '+3 คะแนน', () => log('meet')],
    ['link', 'ได้รายชื่อแนะนำ', '+2 คะแนน', () => log('referral')],
    ['flame', 'โหมดโทรรวด', 'โทรทีละคน', () => go('#/work/call')],
    ['grid', 'ตรวจการเงิน', 'แบบเร็ว 6 ขั้น', () => go('#/check')],
  ];
  sheet({ title: 'บันทึกด่วน', body: h('div.quick-grid', items.map(([ic, t, d, fn]) => h('button', { onclick: fn }, h('span.qi', icon(ic)), h('b', t), h('span', d)))) });
}
