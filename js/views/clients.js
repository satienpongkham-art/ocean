// ─── ลูกค้า: รายชื่อ · ฟอร์ม · โปรไฟล์ 360 ───
import { h, icon, field, inputEl, selectEl, readForm, toast, empty, dateTH, todayISO, ageFrom, nextBirthday, initials, fmt, sheet, closeSheet } from '../ui.js';
import * as store from '../store.js';
import { STAGES, STAGE, SOURCES, grade } from '../engine/work.js';
import { HEALTH_LEVELS, healthCheck, fmtM } from '../engine/needs.js';
import { resultView, CONCERNS } from './advisor.js';
import { apptSheet, apptResultSheet, activityButtons, setStage, gcalLink, logActivity } from './common.js';
import { mandalaGrid } from './fhc.js';

export const clientAge = (c) => ageFrom(c.birthday) ?? (c.age != null && c.age !== '' ? +c.age : null);
const SRC = Object.fromEntries(SOURCES);

let filt = { q: '', f: 'all', sort: 'next' };

function row(c) {
  const g = grade(c); const age = clientAge(c); const nb = nextBirthday(c.birthday);
  return h('div.client-row', { onclick: () => { location.hash = '#/client/' + c.id; }, role: 'link', tabindex: 0 },
    h('div.avatar', initials(c.nick)),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div.row', { style: { gap: '6px' } }, h('b', c.nick || '(ไม่มีชื่อ)'), g ? h('span.grade.' + g, g) : null, age != null ? h('span.small.muted', age + ' ปี') : null),
      h('div.xs.muted', [STAGE[c.stage || 'lead']?.name, c.occupation, c.nextDate ? 'ติดตาม ' + dateTH(c.nextDate) : null, nb && nb.days <= 14 ? `วันเกิดอีก ${nb.days} วัน` : null].filter(Boolean).join(' · '))),
    icon('next'));
}

export function renderList(q = {}) {
  if (q.f) filt.f = q.f;
  const root = h('div', { 'data-title': 'ลูกค้า' });
  const list = h('div');
  const all = store.all('clients');
  const draw = () => {
    const t = filt.q.trim().toLowerCase();
    let items = all.filter((c) => {
      if (t && ![c.nick, c.phone, c.occupation, c.notes].join(' ').toLowerCase().includes(t)) return false;
      switch (filt.f) {
        case 'A': case 'B': case 'C': return grade(c) === filt.f;
        case 'nohealth': return !c.healthLevel || c.healthLevel === 'none' || c.healthLevel === 'welfare';
        case 'follow': return c.nextDate && c.nextDate <= todayISO();
        case 'bday': { const nb = nextBirthday(c.birthday); return nb && nb.days <= 30; }
        case 'customers': return ['closed', 'delivered'].includes(c.stage);
        default: return true;
      }
    });
    items.sort((a, b) => {
      if (filt.sort === 'name') return (a.nick || '').localeCompare(b.nick || '', 'th');
      if (filt.sort === 'grade') return (grade(a) || 'Z').localeCompare(grade(b) || 'Z');
      if (filt.sort === 'new') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return (a.nextDate || '9999').localeCompare(b.nextDate || '9999');
    });
    list.replaceChildren(...(items.length ? items.map(row) : [empty(all.length ? 'ไม่พบรายชื่อตามเงื่อนไข' : 'ยังไม่มีรายชื่อ — เริ่มจากลิสต์ 100 รายชื่อคนรู้จัก', 'clients', all.length ? null : h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อแรก'))]));
  };
  const counts = { all: all.length, A: 0, B: 0, C: 0 };
  for (const c of all) { const g = grade(c); if (g) counts[g]++; }
  root.append(
    h('div.topbar', h('div', h('h1', 'ลูกค้า & รายชื่อ'), h('div.sub', `${all.length} รายชื่อ · A ${counts.A} · B ${counts.B} · C ${counts.C} · เป้าหมาย 100 รายชื่อ`)),
      h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่ม')),
    h('div.card',
      h('div.row.wrap', { style: { gap: '8px', marginBottom: '10px' } },
        h('div.search', { style: { flex: '1 1 220px' } }, icon('search'), h('input.input', { type: 'search', placeholder: 'ค้นหาชื่อเล่น เบอร์ อาชีพ', value: filt.q, oninput: (e) => { filt.q = e.target.value; draw(); } })),
        h('select.input', { style: { width: '150px' }, onchange: (e) => { filt.sort = e.target.value; draw(); }, 'aria-label': 'เรียง' }, [['next', 'เรียง: นัดติดตาม'], ['grade', 'เรียง: เกรด'], ['name', 'เรียง: ชื่อ'], ['new', 'เรียง: ล่าสุด']].map(([v, l]) => h('option', { value: v, selected: filt.sort === v }, l)))),
      h('div.chips', { style: { marginBottom: '6px' } }, [['all', 'ทั้งหมด'], ['follow', 'ถึงกำหนดติดตาม'], ['A', 'เกรด A'], ['B', 'เกรด B'], ['C', 'เกรด C'], ['nohealth', 'ยังไม่มีประกันสุขภาพ'], ['bday', 'วันเกิดใน 30 วัน'], ['customers', 'ลูกค้าแล้ว']].map(([v, l]) =>
        h('button.chip', { class: filt.f === v ? 'on' : '', onclick: (e) => { filt.f = v; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, l))),
      list),
    h('div.meter', { style: { marginTop: '12px' } }, h('i', { style: { width: Math.min(100, all.length) + '%' } })),
    h('p.xs.muted', { style: { marginTop: '4px' } }, `ลิสต์รายชื่อ ${all.length}/100 — คนสำเร็จเริ่มจากเขียนรายชื่อคนรู้จักให้ครบ 100 แล้วจัดเกรด A/B/C`));
  draw();
  return root;
}

const score3 = (name, v, label) => field(label, selectEl(name, v || '', [['', '—'], ['3', '3 มาก'], ['2', '2 ปานกลาง'], ['1', '1 น้อย']]));

export function renderForm(id) {
  const c = id ? store.get('clients', id) : { stage: 'lead', source: 'warm' };
  if (id && !c) { location.hash = '#/clients'; return null; }
  const others = store.all('clients').filter((x) => x.id !== id).sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const f = h('form.form-grid', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = readForm(f);
      d.concerns = [...f.querySelectorAll('input[name="cc"]:checked')].map((x) => x.value);
      if (!d.nick) { toast('กรุณาใส่ชื่อเล่น'); return; }
      const prevStage = c.stage;
      const saved = store.put('clients', { ...c, ...d, stageAt: d.stage !== prevStage ? new Date().toISOString() : c.stageAt });
      toast('บันทึกแล้ว');
      location.hash = '#/client/' + saved.id;
    },
  },
    h('div.full', h('div.section', { style: { marginTop: 0 } }, h('h2', 'ข้อมูลทั่วไป (ใช้ชื่อเล่นเท่านั้น)'))),
    field('ชื่อเล่น *', inputEl('nick', c.nick, { required: true, autocomplete: 'off' })),
    field('เพศ', selectEl('gender', c.gender || '', [['', '—'], ['m', 'ชาย'], ['f', 'หญิง']])),
    field('วันเกิด', inputEl('birthday', c.birthday, { type: 'date' }), 'ใช้คำนวณอายุและเตือนวันเกิด'),
    field('หรือ อายุ (ปี)', inputEl('age', c.age, { type: 'number', inputmode: 'numeric', min: 0, max: 99 })),
    field('โทรศัพท์', inputEl('phone', c.phone, { type: 'tel', inputmode: 'tel' })),
    field('LINE ID', inputEl('line', c.line)),
    field('อาชีพ', inputEl('occupation', c.occupation)),
    field('รายได้ต่อเดือน', inputEl('incomeMonthly', c.incomeMonthly, { type: 'number', inputmode: 'numeric', step: 1000 })),

    h('div.full', h('div.section', h('h2', 'ครอบครัว & ภาระ'))),
    field('สถานภาพ', selectEl('marital', c.marital || 'single', [['single', 'โสด'], ['married', 'สมรส/มีคู่']])),
    field('จำนวนลูก', inputEl('kids', c.kids ?? 0, { type: 'number', inputmode: 'numeric', min: 0 })),
    field('อายุลูกคนเล็ก', inputEl('youngestKidAge', c.youngestKidAge, { type: 'number', inputmode: 'numeric', min: 0 })),
    field('พ่อแม่ที่ดูแล (คน)', inputEl('parents', c.parents ?? 0, { type: 'number', inputmode: 'numeric', min: 0, max: 4 })),
    field('หนี้คงค้าง', inputEl('debt', c.debt, { type: 'number', inputmode: 'numeric', step: 10000 })),
    field('งบเบี้ยต่อเดือนที่สะดวก', inputEl('budgetMonthly', c.budgetMonthly, { type: 'number', inputmode: 'numeric', step: 100 })),

    h('div.full', h('div.section', h('h2', 'ความคุ้มครองที่มีอยู่'))),
    field('ประกันสุขภาพ', selectEl('healthLevel', c.healthLevel || 'none', HEALTH_LEVELS)),
    field('ทุนประกันชีวิต', inputEl('lifeCover', c.lifeCover, { type: 'number', inputmode: 'numeric', step: 50000 })),
    field('ทุนโรคร้ายแรง', inputEl('ciCover', c.ciCover, { type: 'number', inputmode: 'numeric', step: 50000 })),
    field('ทุนอุบัติเหตุ', inputEl('paCover', c.paCover, { type: 'number', inputmode: 'numeric', step: 50000 })),
    h('div.full', field('กรมธรรม์ที่มี (บริษัท/แผน/ทุน/เบี้ย)', h('textarea.input', { name: 'policies', placeholder: 'เช่น AIA 20 Pay Life 500,000 เบี้ย 11,000/ปี ครบรอบ มี.ค.' }, c.policies || ''))),
    h('div.full', h('div.small', { style: { color: 'var(--ink-2)', marginBottom: '6px' } }, 'ความกังวล / เป้าหมาย'),
      h('div.row.wrap', { style: { gap: '6px' } }, CONCERNS.map(([k, l]) => h('label.chip', h('input', { type: 'checkbox', name: 'cc', value: k, checked: (c.concerns || []).includes(k), style: { margin: 0 } }), l)))),

    h('div.full', h('div.section', h('h2', 'จัดเกรดรายชื่อ & สถานะ'))),
    score3('closeness', c.closeness, 'ความสนิท'),
    score3('ability', c.ability, 'ความสามารถจ่ายเบี้ย'),
    score3('access', c.access, 'ติดต่อ/นัดได้ง่าย'),
    field('ที่มา', selectEl('source', c.source || 'warm', SOURCES)),
    field('แนะนำโดย', selectEl('referredBy', c.referredBy || '', [['', '—'], ...others.map((o) => [o.id, o.nick])])),
    field('ขั้นตอน', selectEl('stage', c.stage || 'lead', STAGES.map((s) => [s.id, s.name]))),
    field('นัดติดตามครั้งถัดไป', inputEl('nextDate', c.nextDate, { type: 'date' })),
    field('ต้องทำอะไร', inputEl('nextText', c.nextText, { placeholder: 'เช่น ส่งใบเสนอ Health Happy' })),
    h('div.full', field('บันทึก', h('textarea.input', { name: 'notes' }, c.notes || ''))),
    h('div.full.row', { style: { gap: '8px' } },
      h('button.btn.primary', { type: 'submit', style: { flex: 1 } }, icon('check'), 'บันทึก'),
      h('a.btn', { href: id ? '#/client/' + id : '#/clients' }, 'ยกเลิก')));
  return h('div', { 'data-title': id ? 'แก้ไข ' + c.nick : 'เพิ่มรายชื่อ' },
    h('div.topbar', h('div', h('a.crumb', { href: '#/clients' }, icon('back'), 'ลูกค้า'), h('h1', id ? 'แก้ไข ' + c.nick : 'เพิ่มรายชื่อใหม่'))),
    h('div.card', f));
}

export function renderDetail(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const age = clientAge(c); const g = grade(c); const nb = nextBirthday(c.birthday);
  const appts = store.all('appts').filter((a) => a.clientId === id).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  const logs = store.all('logs').filter((l) => l.clientId === id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const referred = store.all('clients').filter((x) => x.referredBy === id);
  const refBy = c.referredBy && store.get('clients', c.referredBy);
  const hc = healthCheck({ ...c, age });
  const p = { ...c, age };

  const stageSel = h('select.input', { style: { width: 'auto' }, onchange: (e) => setStage(c, e.target.value), 'aria-label': 'ขั้นตอน' }, STAGES.map((s) => h('option', { value: s.id, selected: (c.stage || 'lead') === s.id }, s.name)));

  return h('div', { 'data-title': c.nick },
    h('div.topbar',
      h('div.row', { style: { gap: '12px' } }, h('div.avatar.lg', initials(c.nick)),
        h('div', h('a.crumb', { href: '#/clients' }, icon('back'), 'ลูกค้า'), h('h1', { style: { fontSize: '24px' } }, c.nick, g ? h('span.grade.' + g, { style: { marginLeft: '8px', verticalAlign: 'middle' } }, g) : null),
          h('div.sub', [age != null ? age + ' ปี' : null, c.occupation, c.incomeMonthly ? 'รายได้ ' + fmt(c.incomeMonthly) + '/เดือน' : null, SRC[c.source]].filter(Boolean).join(' · ')))),
      h('a.btn', { href: `#/client/${id}/edit` }, icon('pen'), 'แก้ไข')),

    h('div.card',
      h('div.row.wrap', { style: { gap: '8px' } },
        c.phone ? h('a.btn', { href: 'tel:' + c.phone.replace(/[^\d+]/g, ''), onclick: () => logActivity('call', id) }, icon('phone'), 'โทร') : null,
        c.line ? h('a.btn', { href: 'https://line.me/R/ti/p/~' + encodeURIComponent(c.line), target: '_blank', rel: 'noopener' }, icon('chat'), 'LINE') : null,
        h('button.btn', { onclick: () => apptSheet({ clientId: id }) }, icon('cal'), 'นัดหมาย'),
        h('a.btn', { href: `#/client/${id}/fhc` }, icon('grid'), 'ตรวจสุขภาพการเงิน'),
        h('a.btn', { href: `#/tools/tax?client=${id}` }, icon('tax'), 'ภาษี')),
      h('div.row.wrap', { style: { marginTop: '12px', gap: '8px' } }, h('span.small.muted', 'ขั้นตอน'), stageSel,
        nb ? h('span.tag', icon('cake'), `วันเกิด ${dateTH(c.birthday)} (อีก ${nb.days} วัน)`) : null),
      c.nextDate ? h('div.callout', { style: { marginTop: '10px' } }, h('b', 'ติดตาม ' + dateTH(c.nextDate, true) + ': '), c.nextText || '—',
        h('button.btn.sm.ghost', { style: { marginLeft: '6px' }, onclick: () => store.put('clients', { ...c, nextDate: '', nextText: '' }) }, icon('check'), 'เสร็จแล้ว')) : null),

    h('div.section', h('h2', 'บันทึกกิจกรรม (นับคะแนน)'), h('div.card', activityButtons(id),
      c.stage === 'delivered' ? h('label.row.small', { style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: !!c.askedReferral, onchange: (e) => store.put('clients', { ...c, askedReferral: e.target.checked }) }), 'ขอรายชื่อแนะนำแล้ว') : null)),

    h('div.section', h('h2', 'แมนฮาร่า 8 ด้าน'), h('div.card',
      h('div.row.between', { style: { marginBottom: '10px' } }, h('span.small', 'คะแนนรวม ', h('b', hc.overall + '/100')), h('a.btn.sm', { href: `#/client/${id}/fhc` }, 'กรอกข้อมูลเพิ่ม')),
      mandalaGrid(c.nick, hc))),

    h('div.section', h('h2', 'แผนที่แนะนำ'), resultView(p)),

    h('div.section', h('h2', 'นัดหมาย'), h('div.card',
      h('div.row.between', { style: { marginBottom: '6px' } }, h('span.small.muted', appts.length + ' นัด'), h('button.btn.sm', { onclick: () => apptSheet({ clientId: id }) }, icon('plus'), 'เพิ่มนัด')),
      appts.length ? h('ul.list', appts.map((a) => h('li.row.between',
        h('div', h('b.small', dateTH(a.date, true) + ' ' + (a.time || '')), h('div.xs.muted', [a.title || a.purpose, a.place, a.result].filter(Boolean).join(' · '))),
        h('div.row', { style: { gap: '4px' } },
          a.status === 'planned' ? h('button.btn.sm', { onclick: () => apptResultSheet(a) }, 'บันทึกผล') : h('span.tag.' + (a.status === 'done' ? 'good' : 'warn'), a.status === 'done' ? 'พบแล้ว' : 'ยกเลิก'),
          h('a.icon-btn', { href: gcalLink({ title: (a.title || a.purpose || 'นัด') + ' — ' + c.nick, date: a.date, time: a.time, place: a.place }), target: '_blank', rel: 'noopener', 'aria-label': 'เพิ่มลง Google Calendar' }, icon('cal')),
          h('button.icon-btn', { onclick: () => apptSheet({ appt: a }), 'aria-label': 'แก้ไข' }, icon('pen')))))) : h('p.small.muted', 'ยังไม่มีนัด'))),

    h('div.section', h('h2', 'สายรายชื่อแนะนำ'), h('div.card',
      refBy ? h('p.small', 'แนะนำโดย ', h('a', { href: '#/client/' + refBy.id }, refBy.nick)) : null,
      referred.length ? h('p.small', `แนะนำต่อ ${referred.length} คน: `, ...referred.flatMap((x, i) => [i ? ', ' : '', h('a', { href: '#/client/' + x.id }, x.nick)])) : h('p.small.muted', 'ยังไม่มีรายชื่อที่แนะนำต่อ'),
      h('a.btn.sm', { href: '#/client/new', style: { marginTop: '8px' }, onclick: () => sessionStorage.setItem('refBy', id) }, icon('plus'), 'เพิ่มรายชื่อที่ ' + c.nick + ' แนะนำ'))),

    h('div.section', h('h2', 'ประวัติ'), h('div.card',
      quickNote(id),
      logs.length ? h('ul.list', logs.slice(0, 40).map((l) => h('li.small', h('span.muted.xs', dateTH(l.date) + ' · '), l.text))) : h('p.small.muted', 'ยังไม่มีประวัติ'))),

    c.notes || c.policies ? h('div.section', h('h2', 'บันทึก & กรมธรรม์'), h('div.card', c.policies ? h('p.small', { style: { whiteSpace: 'pre-wrap' } }, c.policies) : null, c.notes ? h('p.small', { style: { whiteSpace: 'pre-wrap', marginTop: '8px' } }, c.notes) : null)) : null,

    h('div.section', h('button.btn.danger', { onclick: () => { if (confirm(`ลบ ${c.nick} และประวัติทั้งหมด?`)) { for (const l of logs) store.remove('logs', l.id); for (const a of appts) store.remove('appts', a.id); store.remove('clients', id); location.hash = '#/clients'; } } }, icon('trash'), 'ลบรายชื่อนี้')),
  );
}

function quickNote(clientId) {
  const inp = h('input.input', { placeholder: 'จดสั้น ๆ แล้วกด Enter', 'aria-label': 'บันทึกสั้น' });
  const f = h('form.row', { style: { marginBottom: '8px' }, onsubmit: (e) => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; inp.blur(); store.put('logs', { clientId, date: todayISO(), type: 'note', text: t }); inp.value = ''; } }, inp, h('button.btn', { type: 'submit' }, 'จด'));
  return f;
}

// เพิ่มรายชื่อที่ถูกแนะนำ: เติม referredBy อัตโนมัติ
window.addEventListener('hashchange', () => {
  if (location.hash === '#/client/new') {
    const ref = sessionStorage.getItem('refBy');
    if (ref) setTimeout(() => { const s = document.querySelector('select[name="referredBy"]'); const src = document.querySelector('select[name="source"]'); if (s) s.value = ref; if (src) src.value = 'referral'; sessionStorage.removeItem('refBy'); }, 60);
  }
});
