// ─── ลูกค้า v2: รายชื่อ · ฟอร์มทีละขั้น · โปรไฟล์แบบแท็บ ───
import { h, icon, toast, empty, dateTH, todayISO, ageFrom, nextBirthday, initials, fmt, sheet, closeSheet, wizard, q, choices, readControls, tabs, kvlist } from '../ui.js';
import * as store from '../store.js';
import { STAGES, STAGE, SOURCES, ACTIVITIES, grade } from '../engine/work.js';
import { HEALTH_LEVELS, healthCheck, fmtM } from '../engine/needs.js';
import { resultView, needSteps } from './advisor.js';
import { apptSheet, apptResultSheet, setStage, gcalLink, logActivity } from './common.js';
import { mandalaGrid } from './fhc.js';

export const clientAge = (c) => ageFrom(c.birthday) ?? (c.age != null && c.age !== '' ? +c.age : null);
const SRC = Object.fromEntries(SOURCES);
const HL = Object.fromEntries(HEALTH_LEVELS);

let filt = { q: '', f: 'all' };

function row(c) {
  const g = grade(c); const age = clientAge(c); const nb = nextBirthday(c.birthday);
  const sub = [STAGE[c.stage || 'lead']?.name, age != null ? age + ' ปี' : null, c.nextDate ? 'ติดตาม ' + dateTH(c.nextDate) : null, nb && nb.days <= 14 ? `วันเกิดอีก ${nb.days} วัน` : null].filter(Boolean).join(' · ');
  return h('button.prow', { onclick: () => { location.hash = '#/client/' + c.id; } },
    h('span.avatar', initials(c.nick)),
    h('span.pt', h('b', c.nick || '(ไม่มีชื่อ)', g ? h('span.grade.' + g, { style: { marginLeft: '6px' } }, g) : null), h('span', sub)),
    h('span.pr', icon('next')));
}

export function renderList(qs = {}) {
  if (qs.f) filt.f = qs.f;
  const root = h('div', { 'data-title': 'ลูกค้า' });
  const list = h('div');
  const all = store.all('clients');
  const draw = () => {
    const t = filt.q.trim().toLowerCase();
    const items = all.filter((c) => {
      if (t && ![c.nick, c.phone, c.occupation, c.notes].join(' ').toLowerCase().includes(t)) return false;
      switch (filt.f) {
        case 'A': return grade(c) === 'A';
        case 'nohealth': return !c.healthLevel || c.healthLevel === 'none' || c.healthLevel === 'welfare';
        case 'follow': return c.nextDate && c.nextDate <= todayISO();
        case 'bday': { const nb = nextBirthday(c.birthday); return nb && nb.days <= 30; }
        case 'customers': return ['closed', 'delivered'].includes(c.stage);
        default: return true;
      }
    }).sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999') || (grade(a) || 'Z').localeCompare(grade(b) || 'Z'));
    list.replaceChildren(items.length ? h('div.plist', items.map(row)) : h('div.card', empty(all.length ? 'ไม่พบรายชื่อ' : 'เริ่มจากเพิ่มคนรู้จักทีละคน', 'clients', all.length ? null : h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อแรก'))));
  };
  root.append(
    h('div.topbar', h('div', h('h1', 'ลูกค้า'), h('div.sub', `${all.length}/100 รายชื่อ`)), h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่ม')),
    h('div.search', icon('search'), h('input.input', { type: 'search', placeholder: 'ค้นหาชื่อเล่น เบอร์', value: filt.q, oninput: (e) => { filt.q = e.target.value; draw(); } })),
    h('div.chips', { style: { margin: '12px -16px 12px' } }, [['all', 'ทั้งหมด'], ['follow', 'ต้องติดตาม'], ['A', 'เกรด A'], ['nohealth', 'ยังไม่มีประกันสุขภาพ'], ['bday', 'วันเกิดใกล้นี้'], ['customers', 'ลูกค้าแล้ว']].map(([v, l]) =>
      h('button.chip', { class: filt.f === v ? 'on' : '', onclick: (e) => { filt.f = v; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, l))),
    list);
  draw();
  return root;
}

// ── ฟอร์มทีละขั้น ────────────────────────────────────────
export function renderForm(id) {
  const c = id ? store.get('clients', id) : { stage: 'lead', source: sessionStorage.getItem('refBy') ? 'referral' : 'warm', referredBy: sessionStorage.getItem('refBy') || '' };
  if (id && !c) { location.hash = '#/clients'; return null; }
  sessionStorage.removeItem('refBy');
  const data = { ...c, age: c.age ?? (c.birthday ? ageFrom(c.birthday) : '') };
  const others = store.all('clients').filter((x) => x.id !== id).sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const save = (d) => {
    if (!d.nick) { toast('ใส่ชื่อเล่นก่อนนะครับ'); return; }
    const saved = store.put('clients', { ...c, ...d, stageAt: d.stage !== c.stage ? new Date().toISOString() : c.stageAt });
    toast('บันทึกแล้ว'); location.hash = '#/client/' + saved.id;
  };
  const s1 = {
    title: 'ข้อมูลติดต่อ',
    valid: (d) => { if (!d.nick) { toast('ใส่ชื่อเล่นก่อนนะครับ'); return false; } return true; },
    render: (d) => {
      const body = h('div',
        q('ชื่อเล่น *', h('input.input', { name: 'nick', value: d.nick || '', autocomplete: 'off', placeholder: 'เช่น พี่บี' })),
        q('เบอร์โทร', h('input.input', { name: 'phone', type: 'tel', inputmode: 'tel', value: d.phone || '' })),
        q('LINE ID', h('input.input', { name: 'line', value: d.line || '' })),
        q('วันเกิด', h('input.input', { name: 'birthday', type: 'date', value: d.birthday || '' }), 'ใช้เตือนวันเกิด · ถ้าไม่รู้ใส่อายุในขั้นถัดไป'),
        q('อาชีพ', h('input.input', { name: 'occupation', value: d.occupation || '' })),
        h('button.more-btn', { type: 'button', onclick: () => { Object.assign(d, readControls(body)); save(d); } }, 'บันทึกแค่นี้ก่อน →'));
      return body;
    },
    read: (n, d) => Object.assign(d, readControls(n)),
  };
  const s4 = {
    title: 'เกรด & ติดตาม',
    render: (d) => h('div',
      q('ความสนิท', choices('closeness', d.closeness || '', [['3', 'สนิทมาก'], ['2', 'พอรู้จัก'], ['1', 'ไม่ค่อยสนิท']])),
      q('ความสามารถจ่ายเบี้ย', choices('ability', d.ability || '', [['3', 'สูง'], ['2', 'กลาง'], ['1', 'น้อย']])),
      q('นัดได้ง่ายไหม', choices('access', d.access || '', [['3', 'ง่าย'], ['2', 'พอได้'], ['1', 'ยาก']])),
      q('มาจากไหน', choices('source', d.source || 'warm', SOURCES)),
      others.length ? q('แนะนำโดย', h('select.input', { name: 'referredBy' }, h('option', { value: '' }, '—'), others.map((o) => h('option', { value: o.id, selected: d.referredBy === o.id }, o.nick)))) : null,
      q('ขั้นตอนตอนนี้', choices('stage', d.stage || 'lead', STAGES.map((s) => [s.id, s.name]))),
      q('นัดติดตามครั้งถัดไป', h('input.input', { name: 'nextDate', type: 'date', value: d.nextDate || '' })),
      q('ต้องทำอะไร', h('input.input', { name: 'nextText', value: d.nextText || '', placeholder: 'เช่น ส่งใบเสนอ' })),
      q('บันทึก / กรมธรรม์ที่มี', h('textarea.input', { name: 'notes' }, d.notes || ''))),
    read: (n, d) => Object.assign(d, readControls(n)),
  };
  // ขั้น 2–3 ใช้ร่วมกับหน้าแนะนำ (ตัดช่องชื่อ/อายุ/รายได้ที่ซ้ำออก แล้วใส่อายุ+รายได้ไว้ขั้น 2)
  const s2 = { ...needSteps[1], title: 'อายุ รายได้ ครอบครัว', render: (d) => h('div', needSteps[0].render(d).children[1], needSteps[0].render(d).children[2], needSteps[1].render(d)) };
  const s3 = needSteps[2];
  return h('div', { 'data-title': id ? 'แก้ไข ' + c.nick : 'เพิ่มรายชื่อ' },
    h('div.back-row', h('a.icon-btn', { href: id ? '#/client/' + id : '#/clients', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, id ? 'แก้ไข ' + c.nick : 'เพิ่มรายชื่อ')),
    wizard([s1, s2, s3, s4], data, { onDone: save, doneLabel: 'บันทึก' }));
}

// ── โปรไฟล์ลูกค้าแบบแท็บ ──────────────────────────────────
const detailTab = {};
function noteSheet(id) {
  const t = h('textarea.input', { placeholder: 'คุยอะไร ลูกค้าสนใจอะไร ต้องทำอะไรต่อ' });
  sheet({ title: 'จดบันทึก', body: h('form.stack', { onsubmit: (e) => { e.preventDefault(); const v = t.value.trim(); if (!v) return; closeSheet(true); store.put('logs', { clientId: id, date: todayISO(), type: 'note', text: v }); toast('จดแล้ว'); } }, t, h('button.btn.primary.block', { type: 'submit' }, icon('check'), 'บันทึก')) });
  setTimeout(() => t.focus(), 250);
}

export function renderDetail(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const age = clientAge(c); const g = grade(c); const nb = nextBirthday(c.birthday);
  const p = { ...c, age };
  const stageIdx = STAGES.findIndex((s) => s.id === (c.stage || 'lead'));

  const overview = () => h('div',
    h('div.section', { style: { marginTop: 0 } }, h('h2', 'ขั้นตอน'), h('div.stage-line', STAGES.filter((s) => s.id !== 'paused').map((s, i) => h('button', { class: i === stageIdx ? 'on' : i < stageIdx ? 'done' : '', onclick: () => setStage(c, s.id) }, s.name)))),
    c.nextDate ? h('div.next-card', { style: { marginTop: '12px' } }, icon('clock'), h('div.t', h('b', dateTH(c.nextDate, true)), ' · ', c.nextText || 'ติดตาม'), h('button.btn.sm', { onclick: () => store.put('clients', { ...c, nextDate: '', nextText: '' }) }, 'เสร็จ')) : null,
    h('div.section', h('h2', 'บันทึกกิจกรรม (แตะ = +คะแนน)'), h('div.act-grid', ACTIVITIES.filter((a) => a.id !== 'appt').map((a) => h('button', { onclick: () => logActivity(a.id, id) }, h('b', a.name), '+' + a.pts)))),
    c.stage === 'delivered' ? h('label.row.small', { style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: !!c.askedReferral, onchange: (e) => store.put('clients', { ...c, askedReferral: e.target.checked }) }), 'ขอรายชื่อแนะนำแล้ว') : null,
    h('div.section', h('h2', 'ข้อมูล'), kvlist([
      ['อายุ', age != null ? age + ' ปี' : '—'], ['อาชีพ', c.occupation || '—'], ['รายได้/เดือน', c.incomeMonthly ? fmt(c.incomeMonthly) : '—'],
      ['ครอบครัว', [c.marital === 'married' ? 'มีคู่' : 'โสด', c.kids ? `ลูก ${c.kids}` : null, c.parents ? `ดูแลพ่อแม่ ${c.parents}` : null].filter(Boolean).join(' · ')],
      ['ประกันสุขภาพ', HL[c.healthLevel || 'none']], ['ทุนชีวิต / โรคร้าย', `${fmtM(c.lifeCover)} / ${fmtM(c.ciCover)}`],
      ['วันเกิด', nb ? `${dateTH(c.birthday)} (อีก ${nb.days} วัน)` : '—'], ['ที่มา', SRC[c.source] || '—'],
    ])),
    c.notes || c.policies ? h('div.section', h('h2', 'บันทึก'), h('div.card', h('p.small', { style: { whiteSpace: 'pre-wrap' } }, [c.policies, c.notes].filter(Boolean).join('\n\n')))) : null,
    referrals(c),
    h('div.row', { style: { gap: '8px', marginTop: '18px' } }, h('a.btn', { href: `#/client/${id}/edit`, style: { flex: 1 } }, icon('pen'), 'แก้ไขข้อมูล'),
      h('button.btn.danger', { onclick: () => del(c) }, icon('trash'))));

  const mandala = () => { const hc = healthCheck(p); return h('div', h('div.card', mandalaGrid(c.nick, hc)), h('a.btn.primary.block', { href: `#/client/${id}/fhc`, style: { marginTop: '12px' } }, icon('grid'), 'กรอกตรวจสุขภาพการเงิน')); };
  const appts = () => {
    const list = store.all('appts').filter((a) => a.clientId === id).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const logs = store.all('logs').filter((l) => l.clientId === id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return h('div',
      h('button.btn.primary.block', { onclick: () => apptSheet({ clientId: id }) }, icon('plus'), 'เพิ่มนัด'),
      list.length ? h('div.plist', { style: { marginTop: '12px' } }, list.map((a) => h('div.prow', { style: { cursor: 'default' } },
        h('span.pi', { style: { background: 'var(--primary-soft)', color: 'var(--primary)' } }, icon('cal')),
        h('span.pt', h('b', dateTH(a.date, true) + ' ' + (a.time || '')), h('span', [a.title || a.purpose, a.place, a.result].filter(Boolean).join(' · '))),
        h('span.pr', a.status === 'planned' ? h('button.btn.sm', { onclick: () => apptResultSheet(a) }, 'บันทึกผล') : h('span.tag.' + (a.status === 'done' ? 'good' : 'warn'), a.status === 'done' ? 'พบแล้ว' : 'ยกเลิก'),
          h('a.icon-btn', { href: gcalLink({ title: (a.title || a.purpose || 'นัด') + ' — ' + c.nick, date: a.date, time: a.time, place: a.place }), target: '_blank', rel: 'noopener', 'aria-label': 'Google Calendar' }, icon('cal')))))) : null,
      h('div.section', h('h2', 'ประวัติ'), logs.length ? h('div.card', h('ul.list', logs.slice(0, 50).map((l) => h('li.small', h('span.muted.xs', dateTH(l.date) + ' · '), l.text)))) : h('p.small.muted', 'ยังไม่มีประวัติ')));
  };

  const t = tabs([['ov', 'ภาพรวม'], ['md', 'แมนฮาร่า'], ['rec', 'แผนที่แนะนำ'], ['ap', 'นัด & ประวัติ']], detailTab[id] || 'ov',
    (k) => ({ ov: overview, md: mandala, rec: () => resultView(p), ap: appts })[k](), { onChange: (k) => { detailTab[id] = k; } });

  return h('div', { 'data-title': c.nick },
    h('div.back-row', { style: { marginBottom: '6px' } }, h('a.icon-btn', { href: '#/clients', 'aria-label': 'กลับ' }, icon('back')), h('span.small.muted', 'ลูกค้า')),
    h('div.client-head', h('div.avatar.lg', initials(c.nick)), h('div', h('h1', c.nick, g ? h('span.grade.' + g, { style: { marginLeft: '8px', verticalAlign: 'middle' } }, g) : null), h('div.meta', [age != null ? age + ' ปี' : null, c.occupation, STAGE[c.stage || 'lead']?.name].filter(Boolean).join(' · ')))),
    h('div.icon-actions',
      h('a', { href: c.phone ? 'tel:' + c.phone.replace(/[^\d+]/g, '') : '#', class: c.phone ? '' : 'off', onclick: () => c.phone && logActivity('call', id) }, h('span.ii', icon('phone')), 'โทร'),
      h('a', { href: c.line ? 'https://line.me/R/ti/p/~' + encodeURIComponent(c.line) : '#', target: '_blank', rel: 'noopener', class: c.line ? '' : 'off' }, h('span.ii', icon('chat')), 'LINE'),
      h('button', { onclick: () => apptSheet({ clientId: id }) }, h('span.ii', icon('cal')), 'นัด'),
      h('button', { onclick: () => noteSheet(id) }, h('span.ii', icon('note')), 'จด')),
    h('div', { style: { marginTop: '14px' } }, t.bar, t.panel));
}

function referrals(c) {
  const kids = store.all('clients').filter((x) => x.referredBy === c.id);
  const by = c.referredBy && store.get('clients', c.referredBy);
  return h('div.section', h('h2', 'สายรายชื่อแนะนำ'), h('div.card',
    by ? h('p.small', 'แนะนำโดย ', h('a', { href: '#/client/' + by.id }, by.nick)) : null,
    kids.length ? h('p.small', `แนะนำต่อ ${kids.length} คน: `, ...kids.flatMap((x, i) => [i ? ', ' : '', h('a', { href: '#/client/' + x.id }, x.nick)])) : h('p.small.muted', 'ยังไม่มีคนที่แนะนำต่อ'),
    h('a.btn.sm', { href: '#/client/new', style: { marginTop: '8px' }, onclick: () => sessionStorage.setItem('refBy', c.id) }, icon('plus'), 'เพิ่มคนที่ ' + c.nick + ' แนะนำ')));
}

function del(c) {
  if (!confirm(`ลบ ${c.nick} และประวัติทั้งหมด?`)) return;
  for (const l of store.all('logs').filter((x) => x.clientId === c.id)) store.remove('logs', l.id);
  for (const a of store.all('appts').filter((x) => x.clientId === c.id)) store.remove('appts', a.id);
  store.remove('clients', c.id); location.hash = '#/clients';
}
