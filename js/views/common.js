// ─── ส่วนที่ใช้ร่วมกัน: นัดหมาย · บันทึกกิจกรรม · ลิงก์ Google Calendar ───
import { h, icon, sheet, closeSheet, field, inputEl, selectEl, readForm, toast, todayISO, dateTH } from '../ui.js';
import * as store from '../store.js';
import { ACTIVITIES, ACT, STAGE } from '../engine/work.js';
import { haptic } from '../pwa.js';
import { snap, offerUndo, removeWithUndo } from '../undo.js';

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
export function logActivity(type, clientId, note = '', { silent = false } = {}) {
  haptic();
  const before = clientId ? snap([['clients', clientId]]) : [];
  const act = store.put('activities', { type, clientId: clientId || null, date: todayISO(), count: 1 });
  const made = [{ coll: 'activities', id: act.id, before: null }];
  if (clientId) {
    const lg = store.put('logs', { clientId, date: todayISO(), type, text: note || ACT[type]?.name || type });
    made.push({ coll: 'logs', id: lg.id, before: null });
    const c = store.get('clients', clientId);
    if (c) store.put('clients', { ...c, lastContact: new Date().toISOString() });
  }
  const snaps = [...made, ...before];
  if (!silent) offerUndo(`+${ACT[type]?.pts || 0} คะแนน · ${ACT[type]?.name || ''}`, snaps);
  return snaps;
}

/** ย้ายขั้นลูกค้า (มีปุ่มเลิกทำ) — undo: false เมื่อเป็นการย้ายอัตโนมัติ */
export function setStage(c, stage, { undo = true } = {}) {
  if (!c || c.stage === stage) return null;
  const before = snap([['clients', c.id]]);
  store.put('clients', { ...c, stage, stageAt: new Date().toISOString() });
  const lg = store.put('logs', { clientId: c.id, date: todayISO(), type: 'stage', text: `ย้ายไปขั้น "${STAGE[stage]?.name || stage}"` });
  const snaps = [...before, { coll: 'logs', id: lg.id, before: null }];
  if (undo) offerUndo(`${c.nick} → ${STAGE[stage]?.name || stage}`, snaps);
  return snaps;
}

/** ฟอร์มนัดหมาย (ป๊อปอัป) */
export function apptSheet({ clientId, appt } = {}) {
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const a = appt || { date: todayISO(), time: '', clientId };
  // ไม่ถามซ้ำ: สถานที่และเวลาที่ใช้บ่อย
  const past = store.all('appts');
  const top = (key, n) => Object.entries(past.reduce((m, x) => { if (x[key]) m[x[key]] = (m[x[key]] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k]) => k);
  const topPlaces = top('place', 6);
  const topTimes = [...new Set([...top('time', 3), '10:00', '12:00', '18:30'])].slice(0, 4).sort();
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
          if (['lead', 'contacted', undefined, ''].includes(c.stage)) setStage(store.get('clients', c.id), 'appt', { undo: false });
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
    h('div.full.chips.wrap', { 'aria-label': 'เวลาที่ใช้บ่อย' }, topTimes.map((t) => h('button.chip', { type: 'button', onclick: (e) => { f.elements.time.value = t; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === e.currentTarget)); } }, t))),
    field('สถานที่ / ช่องทาง', inputEl('place', a.place, { placeholder: 'ร้านกาแฟ / Zoom / บ้านลูกค้า', list: 'recent-places', autocomplete: 'off' })),
    h('datalist#recent-places', topPlaces.map((x) => h('option', { value: x }))),
    topPlaces.length ? h('div.full.chips.wrap', { 'aria-label': 'สถานที่ที่ใช้บ่อย' }, topPlaces.slice(0, 4).map((x) => h('button.chip', { type: 'button', onclick: () => { f.elements.place.value = x; } }, x))) : null,
    field('จุดประสงค์', selectEl('purpose', a.purpose || 'แนะนำตัว/เก็บข้อมูล', [['แนะนำตัว/เก็บข้อมูล', 'แนะนำตัว / เก็บข้อมูล'], ['ตรวจสุขภาพการเงิน', 'ตรวจสุขภาพการเงิน'], ['เสนอแผน', 'เสนอแผน'], ['ปิดการขาย/เซ็นใบคำขอ', 'ปิดการขาย / เซ็นใบคำขอ'], ['ส่งมอบกรมธรรม์', 'ส่งมอบกรมธรรม์'], ['บริการ/ติดตาม', 'บริการ / ติดตาม']])),
    h('div.full', field('บันทึก', h('textarea.input', { name: 'note' }, a.note || ''))),
    h('div.full.row', { style: { gap: '8px' } },
      h('button.btn.primary', { type: 'submit', style: { flex: 1 } }, icon('check'), 'บันทึกนัด'),
      a.id ? h('button.btn.danger', { type: 'button', 'aria-label': 'ลบนัด', onclick: () => { closeSheet(true); removeWithUndo('ลบนัดแล้ว', [['appts', a.id]]); } }, icon('trash')) : null));
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

// ── ขั้นต่อไป: ทุกครั้งที่บันทึกผล ต้องรู้ว่าจะทำอะไรต่อ เมื่อไร ──
export const NEXT_OPTIONS = ['โทรติดตาม', 'ส่งใบเสนอ', 'นัดเสนอแผน', 'นัดเซ็นใบคำขอ', 'ส่งมอบกรมธรรม์', 'ทักถามข่าว'];
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
export function nextStepPicker(c, { required = true, allowPause = true } = {}) {
  const st = { text: c?.nextText || '', date: c?.nextDate && c.nextDate > todayISO() ? c.nextDate : '', pause: false };
  const txt = h('input.input', { value: st.text, placeholder: 'หรือพิมพ์เอง เช่น ส่งตัวอย่างแผน CI', 'aria-label': 'ขั้นต่อไป', oninput: (e) => { st.text = e.target.value; paint(); } });
  const dt = h('input.input', { type: 'date', value: st.date, min: todayISO(), 'aria-label': 'วันที่', oninput: (e) => { st.date = e.target.value; paint(); } });
  const opts = h('div.chips.wrap'); const days = h('div.chips.wrap');
  const err = h('div', { 'aria-live': 'polite' });
  const paint = () => {
    opts.replaceChildren(...NEXT_OPTIONS.map((o) => h('button.chip', { type: 'button', class: st.text === o ? 'on' : '', 'aria-pressed': String(st.text === o), onclick: () => { st.text = o; txt.value = o; paint(); } }, o)));
    days.replaceChildren(...[[1, 'พรุ่งนี้'], [3, 'อีก 3 วัน'], [7, '1 สัปดาห์'], [14, '2 สัปดาห์'], [30, '1 เดือน']].map(([n, l]) => { const v = plusDays(n); return h('button.chip', { type: 'button', class: st.date === v ? 'on' : '', 'aria-pressed': String(st.date === v), onclick: () => { st.date = v; dt.value = v; paint(); } }, l); }));
  };
  paint();
  const node = h('fieldset.next-step', h('legend', required ? 'ขั้นต่อไป *' : 'ขั้นต่อไป (ถ้ามี)'), opts, txt,
    h('div.small.muted', { style: { margin: '10px 0 4px' } }, 'เมื่อไหร่'), days, dt,
    allowPause ? h('label.row.small', { style: { marginTop: '10px' } }, h('input', { type: 'checkbox', onchange: (e) => { st.pause = e.target.checked; node.classList.toggle('paused', st.pause); } }), 'ยังไม่มีขั้นต่อไป — พักรายชื่อนี้ไว้ก่อน') : null,
    err);
  const read = () => {
    if (st.pause) return { pause: true };
    if (!st.text && !st.date) { if (!required) return {}; err.replaceChildren(h('div.err', { role: 'alert' }, h('b', '! '), 'เลือกขั้นต่อไปและวันที่ หรือติ๊ก "พักรายชื่อ"')); txt.focus(); return null; }
    if (!st.date) { err.replaceChildren(h('div.err', { role: 'alert' }, h('b', '! '), 'เลือกวันที่ของขั้นต่อไป')); dt.focus(); return null; }
    return { nextText: st.text || 'ติดตาม', nextDate: st.date };
  };
  return { node, read };
}
/** บันทึกขั้นต่อไปลงลูกค้า */
export function applyNext(clientId, r) {
  const c = store.get('clients', clientId); if (!c || !r) return;
  if (r.pause) { store.put('clients', { ...c, nextDate: '', nextText: '' }); setStage(store.get('clients', clientId), 'paused', { undo: false }); return; }
  if (r.nextDate) store.put('clients', { ...c, nextDate: r.nextDate, nextText: r.nextText });
}
export function nextStepSheet(c, title = 'ขั้นต่อไปคืออะไร?') {
  const ns = nextStepPicker(c);
  sheet({ title, sub: c.nick, body: h('div.stack', ns.node, h('button.btn.primary.block', { onclick: () => { const r = ns.read(); if (!r) return; applyNext(c.id, r); closeSheet(true); toast(r.pause ? 'พักรายชื่อไว้แล้ว' : 'ตั้งขั้นต่อไปแล้ว'); } }, icon('check'), 'บันทึก')) });
}

/** ปิดนัด: บันทึกผล */
export function apptResultSheet(a) {
  const c = a.clientId && store.get('clients', a.clientId);
  const ns = c ? nextStepPicker(c) : null;
  const f = h('form.stack', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = readForm(f);
      const nx = ns && d.status === 'done' ? ns.read() : null;
      if (ns && d.status === 'done' && !nx) return;
      store.put('appts', { ...a, status: d.status, result: d.result });
      if (d.status === 'done') {
        logActivity('meet', a.clientId, 'พบลูกค้า: ' + (d.result || a.purpose || ''));
        if (d.presented) store.put('activities', { type: 'present', clientId: a.clientId || null, date: todayISO(), count: 1 });
          if (c && d.nextStage) setStage(store.get('clients', c.id), d.nextStage, { undo: false });
        if (c && nx) applyNext(c.id, nx);
      }
      closeSheet(true);
    },
  },
    field('ผล', selectEl('status', 'done', [['done', 'พบแล้ว'], ['cancel', 'ยกเลิก / เลื่อน']])),
    h('label.row.small', h('input', { type: 'checkbox', name: 'presented' }), 'ได้เสนอแผนในนัดนี้ (+4 คะแนน)'),
    c ? field('ย้ายขั้นลูกค้าเป็น', selectEl('nextStage', '', [['', '— ไม่เปลี่ยน —'], ['met', 'พบ / วิเคราะห์'], ['proposed', 'เสนอแผน'], ['closed', 'ปิดการขาย'], ['delivered', 'ส่งมอบแล้ว'], ['paused', 'พักไว้']])) : null,
    field('สรุปสั้น ๆ', h('textarea.input', { name: 'result', placeholder: 'คุยเรื่องอะไร ลูกค้าสนใจอะไร' })),
    ns ? ns.node : null,
    h('button.btn.primary.block', { type: 'submit' }, icon('check'), 'บันทึกผล'));
  if (ns) f.addEventListener('change', (e) => { if (e.target.name === 'status') ns.node.hidden = e.target.value !== 'done'; });
  sheet({ title: 'บันทึกผลนัด', sub: (c?.nick || '') + ' · ' + dateTH(a.date), body: f });
}

export function activityButtons(clientId) {
  return h('div.row.wrap', { style: { gap: '6px' } }, ACTIVITIES.filter((a) => a.id !== 'appt').map((a) =>
    h('button.btn.sm', { onclick: () => logActivity(a.id, clientId) }, a.name, h('span.muted.xs', '+' + a.pts))));
}

// ── กรมธรรม์ / ยอดขาย ──────────────────────────────────────
import { PLANS, PLAN, CATEGORIES } from '../../data/plans.js';
import { choices, readControls, q, fmt, more } from '../ui.js';
import { lookup as lookupPrem } from '../engine/premium.js';
import { milestones, nextMilestone } from '../engine/work.js';

export const POLICY_STATUS = [['proposed', 'เสนอแล้ว'], ['submitted', 'ยื่นใบคำขอ'], ['issued', 'อนุมัติ/ออกกรมธรรม์'], ['lapsed', 'ขาดอายุ/ยกเลิก']];
export const STATUS_COLOR = { proposed: 'var(--warn)', submitted: 'var(--c-life)', issued: 'var(--good)', lapsed: 'var(--na)' };
export const PAY_MODE = [['year', 'รายปี'], ['half', 'ราย 6 เดือน'], ['quarter', 'ราย 3 เดือน'], ['month', 'รายเดือน']];
export const policyName = (p) => (p.planId && PLAN[p.planId] ? PLAN[p.planId].short : p.name || 'กรมธรรม์');

export function policySheet({ clientId, policy } = {}) {
  const pol = policy || { clientId, status: 'proposed', mode: 'year', submitDate: todayISO() };
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const planSel = h('select.input', { name: 'planId' }, h('option', { value: '' }, '— อื่น ๆ (พิมพ์ชื่อด้านล่าง) —'),
    CATEGORIES.map((c) => h('optgroup', { label: c.name }, PLANS.filter((p) => p.cat === c.id).map((p) => h('option', { value: p.id, selected: pol.planId === p.id }, p.short)))));
  const premIn = h('input.input', { name: 'premium', type: 'number', inputmode: 'numeric', value: pol.premium ?? '' });
  const hint = h('small.muted');
  // ไม่ถามซ้ำ: มีตารางเบี้ยที่นำเข้า + รู้อายุลูกค้า → เติมเบี้ยให้
  const fillPrem = () => {
    const cid = clientId || body.querySelector('[name=clientId]')?.value; const c = cid && store.get('clients', cid);
    const t = planSel.value && store.get('premiums', planSel.value); if (!c || !t) { hint.textContent = ''; return; }
    const age = c.birthday ? Math.floor((Date.now() - new Date(c.birthday)) / 31557600000) : (c.age ? +c.age : null);
    const r = lookupPrem(t, age, c.gender);
    if (r) { hint.textContent = `ตามตารางที่นำเข้า (อายุ ${age}): ${r.map((x) => x.col + ' ' + fmt(x.value)).join(' · ')}`; if (!premIn.value) premIn.value = r[0].value; } else hint.textContent = '';
  };
  planSel.addEventListener('change', fillPrem);
  const care = milestones({ ...pol, status: 'issued', issueDate: pol.issueDate || pol.submitDate });
  const careBox = h('div', care.length ? care.map((m) => h('label.care-row', { class: m.done ? 'done' : '' },
    h('input', { type: 'checkbox', checked: m.done, 'data-care': m.id }), h('span', h('b', m.name), h('small', (m.id === 'deliver' ? 'ภายใน ' : '') + dateTH(m.date))))) : h('p.small.muted', 'ใส่วันอนุมัติและวันส่งมอบ แล้วแอปจะเตือนจังหวะดูแลลูกค้าให้'));
  const body = h('div',
    !clientId ? q('ลูกค้า', h('select.input', { name: 'clientId', onchange: fillPrem }, h('option', { value: '' }, '—'), clients.map((c) => h('option', { value: c.id, selected: pol.clientId === c.id }, c.nick)))) : null,
    q('แผน', planSel),
    q('เบี้ยต่อปี (บาท)', premIn, h('span', hint, hint.textContent ? null : 'จากใบเสนอในระบบ AIA')),
    q('สถานะ', choices('status', pol.status || 'proposed', POLICY_STATUS)),
    q('วันที่ยื่น / เสนอ', h('input.input', { name: 'submitDate', type: 'date', value: pol.submitDate || '' })),
    q('ครบกำหนดชำระงวดถัดไป', h('input.input', { name: 'nextDue', type: 'date', value: pol.nextDue || '' }), 'แอปจะเตือนล่วงหน้า 14 วัน'),
    more('ดูแลหลังการขาย (เมื่ออนุมัติแล้ว)',
      h('div.form-grid', h('label.f', h('span', 'วันที่อนุมัติ'), h('input.input', { name: 'issueDate', type: 'date', value: pol.issueDate || '' })),
        h('label.f', h('span', 'วันที่ลูกค้ารับกรมธรรม์'), h('input.input', { name: 'deliverDate', type: 'date', value: pol.deliverDate || '' }))),
      careBox),
    more('รายละเอียดเพิ่ม',
      q('ชื่อแผน (ถ้าไม่มีในรายการ)', h('input.input', { name: 'name', value: pol.name || '', placeholder: 'เช่น กรมธรรม์บริษัทอื่น' })),
      q('ทุนประกัน', h('input.input', { name: 'sa', type: 'number', inputmode: 'numeric', value: pol.sa ?? '' })),
      q('งวดชำระ', choices('mode', pol.mode || 'year', PAY_MODE)),
      q('ผู้รับประโยชน์', h('input.input', { name: 'beneficiary', value: pol.beneficiary || '', placeholder: 'เช่น แม่ / คู่สมรส' })),
      q('บันทึก', h('input.input', { name: 'note', value: pol.note || '' }))));
  setTimeout(fillPrem, 0);
  const save = () => {
    const d = readControls(body);
    const careMap = { ...(pol.care || {}) }; body.querySelectorAll('[data-care]').forEach((el) => { careMap[el.dataset.care] = el.checked; delete d[el.name]; });
    d.care = careMap;
    const cid = clientId || d.clientId;
    const wasSold = ['submitted', 'issued'].includes(pol.status);
    const saved = store.put('policies', { ...pol, ...d, clientId: cid });
    const sold = ['submitted', 'issued'].includes(saved.status);
    if (sold && !wasSold && cid) {
      store.put('activities', { type: 'close', clientId: cid, date: todayISO(), count: 1 });
      const c = store.get('clients', cid); if (c && !['closed', 'delivered'].includes(c.stage)) setStage(c, 'closed', { undo: false });
      haptic(30); toast('ยินดีด้วย! บันทึกการปิดการขาย +5 คะแนน');
    } else toast('บันทึกแล้ว');
    closeSheet(true);
  };
  sheet({ title: policy ? 'แก้ไขกรมธรรม์' : 'เพิ่มกรมธรรม์ / ยอดขาย', body: h('div', body,
    h('div.row', { style: { gap: '8px' } }, h('button.btn.primary', { style: { flex: 1 }, onclick: save }, icon('check'), 'บันทึก'),
      policy ? h('button.btn.danger', { 'aria-label': 'ลบรายการ', onclick: () => { closeSheet(true); removeWithUndo('ลบรายการแล้ว', [['policies', pol.id]]); } }, icon('trash')) : null)) });
}

export function policyRow(p, { showClient = false } = {}) {
  const c = showClient && p.clientId ? store.get('clients', p.clientId) : null;
  const plan = p.planId && PLAN[p.planId];
  return h('button.prow' + (plan ? '.cat-' + plan.cat : ''), { onclick: () => policySheet({ clientId: p.clientId, policy: p }) },
    h('span.pi', icon(plan ? 'cat-' + plan.cat : 'doc')),
    h('span.pt', h('b', (c ? c.nick + ' · ' : '') + policyName(p)),
      h('span', h('i.status-dot', { style: { background: STATUS_COLOR[p.status] || 'var(--na)' }, 'aria-hidden': 'true' }), [Object.fromEntries(POLICY_STATUS)[p.status], p.premium ? fmt(p.premium) + '/ปี' : null, p.nextDue ? 'ครบชำระ ' + dateTH(p.nextDue) : null].filter(Boolean).join(' · ')),
      nextMilestone(p) ? h('span.care-next', icon('heart'), `${nextMilestone(p).name.split(' — ')[0]} · ${dateTH(nextMilestone(p).date)}`) : null),
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
    ['user', 'โหมดลูกค้า', 'ซ่อนข้อมูลก่อนยื่นมือถือ', () => { closeSheet(true); import('../app.js').then((m) => m.setClientMode(true)); }],
  ];
  sheet({ title: 'บันทึกด่วน', body: h('div.quick-grid', items.map(([ic, t, d, fn]) => h('button', { onclick: fn }, h('span.qi', icon(ic)), h('b', t), h('span', d)))) });
}
