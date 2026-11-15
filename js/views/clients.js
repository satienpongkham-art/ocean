// ─── ลูกค้า v2: รายชื่อ · ฟอร์มทีละขั้น · โปรไฟล์แบบแท็บ ───
import { h, icon, toast, empty, dateTH, todayISO, ageFrom, nextBirthday, initials, fmt, sheet, closeSheet, wizard, q, choices, readControls, tabs, kvlist, more } from '../ui.js';
import * as store from '../store.js';
import { STAGES, STAGE, SOURCES, ACTIVITIES, grade, ageUp, noNextStep, busyIds } from '../engine/work.js';
import { HEALTH_LEVELS, healthCheck, fmtM } from '../engine/needs.js';
import { resultView, needSteps } from './advisor.js';
import { apptSheet, apptResultSheet, setStage, gcalLink, logActivity, policySheet, policyRow, nextStepSheet, nextStepPicker, applyNext } from './common.js';
import { mandalaGrid, historyView } from './fhc.js';
import { removeWithUndo } from '../undo.js';

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

const rerenderList = () => { location.hash = '#/clients?f=' + filt.f; window.dispatchEvent(new HashChangeEvent('hashchange')); };
export function renderList(qs = {}) {
  if (qs.f) filt.f = qs.f;
  const root = h('div', { 'data-title': 'ลูกค้า' });
  const list = h('div');
  const all = store.all('clients');
  const busy = busyIds(store.all('appts'));
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
        case 'nonext': return noNextStep(c, busy);
        default: return true;
      }
    }).sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999') || (grade(a) || 'Z').localeCompare(grade(b) || 'Z'));
    list.replaceChildren(items.length ? h('div.plist', items.map(row)) : h('div.card', all.length
      ? empty(filt.f === 'nonext' ? 'ทุกคนมีขั้นต่อไปแล้ว เยี่ยมมาก!' : 'ไม่พบรายชื่อ', filt.f === 'nonext' ? 'check' : 'search', filt.f !== 'all' || filt.q ? h('button.btn', { onclick: () => { filt.f = 'all'; filt.q = ''; rerenderList(); } }, 'ดูทั้งหมด') : null, filt.q ? `ไม่มีชื่อหรือเบอร์ที่ตรงกับ "${filt.q}"` : null)
      : empty('เริ่มจากเพิ่มคนรู้จักทีละคน', 'clients', h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อแรก'), 'ใส่แค่ชื่อเล่นก็บันทึกได้ ข้อมูลอื่นค่อยเติมทีหลัง')));
  };
  root.append(
    h('div.topbar', h('div', h('h1', 'ลูกค้า'), h('div.sub', `${all.length}/100 รายชื่อ`)), h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่ม')),
    h('div.search', icon('search'), h('input.input', { type: 'search', placeholder: 'ค้นหาชื่อเล่น เบอร์', 'aria-label': 'ค้นหาลูกค้า', value: filt.q, oninput: (e) => { filt.q = e.target.value; draw(); } })),
    h('a.smart-entry', { href: '#/clients/lists' }, icon('filter'), h('span', h('b', 'รายชื่ออัจฉริยะ'), h('small', 'กรองตามเงื่อนไข แล้วโทรรวดกับรายชื่อนั้น')), icon('next')),
    h('div.chips', { style: { margin: '12px -16px 12px' } }, [['all', 'ทั้งหมด'], ['follow', 'ต้องติดตาม'], ['nonext', 'ยังไม่มีขั้นต่อไป'], ['A', 'เกรด A'], ['nohealth', 'ยังไม่มีประกันสุขภาพ'], ['bday', 'วันเกิดใกล้นี้'], ['customers', 'ลูกค้าแล้ว']].map(([v, l]) =>
      h('button.chip', { class: filt.f === v ? 'on' : '', onclick: (e) => { filt.f = v; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, l))),
    list);
  draw();
  return root;
}

// ── ฟอร์มทีละขั้น ────────────────────────────────────────
export function renderForm(id) {
  let pre = {}; try { pre = JSON.parse(sessionStorage.getItem('prefill') || '{}'); } catch {}
  const c = id ? store.get('clients', id) : { stage: 'lead', source: sessionStorage.getItem('refBy') ? 'referral' : 'warm', referredBy: sessionStorage.getItem('refBy') || '', ...pre };
  if (id && !c) { location.hash = '#/clients'; return null; }
  sessionStorage.removeItem('refBy'); sessionStorage.removeItem('prefill');
  const data = { ...c, age: c.age ?? (c.birthday ? ageFrom(c.birthday) : '') };
  const others = store.all('clients').filter((x) => x.id !== id).sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const save = (d) => {
    if (!d.nick) { toast('ใส่ชื่อเล่นก่อนนะครับ'); return; }
    const saved = store.put('clients', { ...c, ...d, stageAt: d.stage !== c.stage ? new Date().toISOString() : c.stageAt });
    toast('บันทึกแล้ว'); location.hash = '#/client/' + saved.id;
  };
  const s1 = {
    title: 'ข้อมูลติดต่อ',
    valid: (d) => !!d.nick,
    error: 'ใส่ชื่อเล่นก่อน (ช่องที่มีเครื่องหมาย *)',
    render: (d) => {
      const body = h('div',
        q('ชื่อเล่น *', h('input.input', { name: 'nick', value: d.nick || '', autocomplete: 'off', placeholder: 'เช่น พี่บี', required: true, 'aria-required': 'true' })),
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
  const t = h('textarea.input', { placeholder: 'คุยอะไร ลูกค้าสนใจอะไร', 'aria-label': 'บันทึก', required: true });
  const ns = nextStepPicker(store.get('clients', id), { required: false, allowPause: false });
  sheet({ title: 'จดบันทึก', body: h('form.stack', { onsubmit: (e) => { e.preventDefault(); const v = t.value.trim(); if (!v) return; const nx = ns.read(); if (nx === null) return; closeSheet(true); store.put('logs', { clientId: id, date: todayISO(), type: 'note', text: v }); if (nx.nextDate) applyNext(id, nx); toast('จดแล้ว'); } }, t, more('ตั้งขั้นต่อไปด้วย', ns.node), h('button.btn.primary.block', { type: 'submit' }, icon('check'), 'บันทึก')) });
  setTimeout(() => t.focus(), 250);
}

// ── แก้ข้อมูลในหน้าลูกค้าได้ทันที (แตะที่ช่อง) ──
const EDIT = {
  phone: { label: 'เบอร์โทร', type: 'tel' }, line: { label: 'LINE ID' }, occupation: { label: 'อาชีพ' },
  incomeMonthly: { label: 'รายได้/เดือน', type: 'number', fmt: (v) => (v ? fmt(v) : '—') },
  birthday: { label: 'วันเกิด', type: 'date', fmt: (v) => (v ? dateTH(v) : '—') },
  healthLevel: { label: 'ประกันสุขภาพ', select: () => HEALTH_LEVELS, fmt: (v) => HL[v || 'none'] },
  lifeCover: { label: 'ทุนชีวิต', type: 'number', fmt: (v) => fmtM(v) }, ciCover: { label: 'ทุนโรคร้าย', type: 'number', fmt: (v) => fmtM(v) },
  paCover: { label: 'ทุนอุบัติเหตุ', type: 'number', fmt: (v) => fmtM(v) },
};
function editRow(c, key) {
  const def = EDIT[key];
  const show = () => (def.fmt ? def.fmt(c[key]) : (c[key] || '—'));
  const row = h('div.erow');
  const view = () => row.replaceChildren(h('span', def.label), h('button.ev', { type: 'button', 'aria-label': `${def.label}: ${show()} — แตะเพื่อแก้`, onclick: edit }, h('b', show()), icon('pen')));
  const edit = () => {
    const inp = def.select
      ? h('select.input', { 'aria-label': def.label }, def.select().map(([v, l]) => h('option', { value: v, selected: (c[key] || 'none') === v }, l)))
      : h('input.input', { type: def.type || 'text', inputmode: def.type === 'number' ? 'numeric' : def.type === 'tel' ? 'tel' : null, value: c[key] ?? '', 'aria-label': def.label });
    const commit = () => { const v = def.type === 'number' ? (inp.value === '' ? null : +inp.value) : inp.value.trim(); if (v !== (c[key] ?? '')) { c = store.put('clients', { ...store.get('clients', c.id), [key]: v }); toast('บันทึก ' + def.label + ' แล้ว'); } view(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { e.preventDefault(); view(); } });
    row.replaceChildren(h('span', def.label), h('div.eedit', inp, h('button.btn.sm.primary', { type: 'button', onclick: commit, 'aria-label': 'บันทึก' }, icon('check')), h('button.btn.sm', { type: 'button', onclick: view, 'aria-label': 'ยกเลิก' }, icon('close'))));
    inp.focus(); if (inp.select && def.type !== 'date') try { inp.select(); } catch {}
  };
  view();
  return row;
}

export function renderDetail(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  try { const r = JSON.parse(localStorage.getItem('advdesk.v1.recent') || '[]').filter((x) => x !== id); r.unshift(id); localStorage.setItem('advdesk.v1.recent', JSON.stringify(r.slice(0, 6))); } catch {}
  const age = clientAge(c); const g = grade(c); const nb = nextBirthday(c.birthday); const au = ageUp(c.birthday, store.getSettings().ageRule);
  const p = { ...c, age };
  const stageIdx = STAGES.findIndex((s) => s.id === (c.stage || 'lead'));

  const overview = () => h('div',
    h('div.section', { style: { marginTop: 0 } }, h('h2', 'ขั้นตอน'), h('div.stage-line', STAGES.filter((s) => s.id !== 'paused').map((s, i) => h('button', { class: i === stageIdx ? 'on' : i < stageIdx ? 'done' : '', onclick: () => setStage(c, s.id) }, s.name)))),
    au && au.days <= 45 && !['paused'].includes(c.stage) ? h('div.callout.red', { style: { marginTop: '12px' } }, h('b', `อายุประกันขึ้นอีก ${au.days} วัน`), ` — ทำก่อน ${dateTH(au.date)} ได้เบี้ยของอายุ ${au.now} ซึ่งถูกกว่า`) : null,
    c.nextDate ? h('div.next-card', { style: { marginTop: '12px' } }, icon('clock'), h('div.t', h('span.small.muted', 'ขั้นต่อไป '), h('b', dateTH(c.nextDate, true)), ' · ', c.nextText || 'ติดตาม'), h('button.btn.sm', { onclick: () => { store.put('clients', { ...c, nextDate: '', nextText: '' }); nextStepSheet(store.get('clients', id), 'ทำเสร็จแล้ว ขั้นต่อไปคืออะไร?'); } }, icon('check'), 'เสร็จ'))
      : noNextStep(c, busyIds(store.all('appts'))) ? h('button.next-card.empty-next', { style: { marginTop: '12px' }, onclick: () => nextStepSheet(c) }, icon('plus'), h('div.t', h('b', 'ยังไม่มีขั้นต่อไป'), h('div.small', 'แตะเพื่อตั้ง — ไม่ให้ลูกค้าตกหล่น'))) : null,
    h('div.section', h('h2', 'บันทึกกิจกรรม (แตะ = +คะแนน)'), h('div.act-grid', ACTIVITIES.filter((a) => a.id !== 'appt').map((a) => h('button', { onclick: () => logActivity(a.id, id) }, h('b', a.name), '+' + a.pts)))),
    c.stage === 'delivered' ? h('label.row.small', { style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: !!c.askedReferral, onchange: (e) => store.put('clients', { ...c, askedReferral: e.target.checked }) }), 'ขอรายชื่อแนะนำแล้ว') : null,
    h('div.section', h('h2', 'ข้อมูล ', h('small.muted', '(แตะช่องเพื่อแก้)')), h('div.kvlist.editable',
      editRow(c, 'phone'), editRow(c, 'occupation'), editRow(c, 'healthLevel'), editRow(c, 'birthday'),
      h('div.erow', h('span', 'อายุประกัน'), h('b', au ? `${au.now} → ${au.to} ปี · ${dateTH(au.date)} (อีก ${au.days} วัน)` : 'ใส่วันเกิดเพื่อคำนวณ'))),
      more('ดูข้อมูลทั้งหมด', h('div.kvlist.editable',
        editRow(c, 'line'), editRow(c, 'incomeMonthly'), editRow(c, 'lifeCover'), editRow(c, 'ciCover'), editRow(c, 'paCover'),
        h('div.erow', h('span', 'อายุ'), h('b', age != null ? age + ' ปี' : '—')),
        h('div.erow', h('span', 'ครอบครัว'), h('b', [c.marital === 'married' ? 'มีคู่' : 'โสด', c.kids ? `ลูก ${c.kids}` : null, c.parents ? `ดูแลพ่อแม่ ${c.parents}` : null].filter(Boolean).join(' · '))),
        h('div.erow', h('span', 'ที่มา'), h('b', SRC[c.source] || '—'))))),
    h('div.row', { style: { gap: '8px', marginTop: '12px' } },
      h('a.btn', { href: `#/client/${id}/simulate`, style: { flex: 1 } }, icon('flame'), 'จำลองเหตุการณ์'),
      h('a.btn', { href: `#/client/${id}/benefits`, style: { flex: 1 } }, icon('shield'), 'เทียบสวัสดิการ')),
    c.notes || c.policies ? h('div.section', h('h2', 'บันทึก'), h('div.card', h('p.small', { style: { whiteSpace: 'pre-wrap' } }, [c.policies, c.notes].filter(Boolean).join('\n\n')))) : null,
    referrals(c),
    h('div.row', { style: { gap: '8px', marginTop: '18px' } }, h('a.btn', { href: `#/client/${id}/edit`, style: { flex: 1 } }, icon('pen'), 'แก้ไขข้อมูล'),
      h('button.btn.danger', { onclick: () => del(c) }, icon('trash'))));

  const mandala = () => { const hc = healthCheck(p); return h('div',
    h('div.row', { style: { gap: '8px', marginBottom: '12px' } }, h('a.btn.primary', { href: `#/client/${id}/fhc`, style: { flex: 1 } }, icon('grid'), 'ตรวจแบบเร็ว'), h('a.btn', { href: `#/client/${id}/fhc/detail`, style: { flex: 1 } }, icon('pen'), 'แบบละเอียด')),
    h('div.card', mandalaGrid(c.nick, hc)),
    h('div.section', h('h2', 'ประวัติการตรวจ (ก่อน–หลัง)'), historyView(id))); };
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

  const pols = () => {
    const list = store.all('policies').filter((x) => x.clientId === id).sort((a, b) => (b.submitDate || '').localeCompare(a.submitDate || ''));
    return h('div', h('button.btn.primary.block', { onclick: () => policySheet({ clientId: id }) }, icon('plus'), 'เพิ่มกรมธรรม์ / ยอดขาย'),
      list.length ? h('div.plist', { style: { marginTop: '12px' } }, list.map((x) => policyRow(x))) : h('p.small.muted', { style: { marginTop: '12px' } }, 'บันทึกแผนที่เสนอ/ขายได้ แอปจะนับยอดขายและเตือนก่อนครบชำระเบี้ย'));
  };
  const t = tabs([['ov', 'ภาพรวม'], ['md', 'แมนฮาร่า'], ['rec', 'แผนที่แนะนำ'], ['pol', 'กรมธรรม์'], ['ap', 'นัด & ประวัติ']], detailTab[id] || 'ov',
    (k) => ({ ov: overview, md: mandala, rec: () => resultView(p), pol: pols, ap: appts })[k](), { onChange: (k) => { detailTab[id] = k; } });

  const detail = h('div', { 'data-title': c.nick },
    h('div.back-row', { style: { marginBottom: '6px' } }, h('a.icon-btn', { href: '#/clients', 'aria-label': 'กลับ' }, icon('back')), h('span.small.muted', { style: { flex: 1 } }, 'ลูกค้า'), h('a.btn.sm', { href: '#/present/' + id }, icon('compass'), 'นำเสนอลูกค้า')),
    h('div.client-head', h('div.avatar.lg', initials(c.nick)), h('div', h('h1', c.nick, g ? h('span.grade.' + g, { style: { marginLeft: '8px', verticalAlign: 'middle' } }, g) : null), h('div.meta', [age != null ? age + ' ปี' : null, c.occupation, STAGE[c.stage || 'lead']?.name].filter(Boolean).join(' · ')))),
    h('div.icon-actions',
      h('a', { href: c.phone ? 'tel:' + c.phone.replace(/[^\d+]/g, '') : '#', class: c.phone ? '' : 'off', onclick: () => c.phone && logActivity('call', id) }, h('span.ii', icon('phone')), 'โทร'),
      h('a', { href: c.line ? 'https://line.me/R/ti/p/~' + encodeURIComponent(c.line) : '#', target: '_blank', rel: 'noopener', class: c.line ? '' : 'off' }, h('span.ii', icon('chat')), 'LINE'),
      h('button', { onclick: () => apptSheet({ clientId: id }) }, h('span.ii', icon('cal')), 'นัด'),
      h('button', { onclick: () => noteSheet(id) }, h('span.ii', icon('note')), 'จด')),
    h('div', { style: { marginTop: '14px' } }, t.bar, t.panel));
  if (!matchMedia('(min-width: 1100px)').matches) return detail;
  // จอคอม: รายชื่อซ้าย · รายละเอียดขวา
  return h('div.split', { 'data-title': c.nick }, listPane(id), h('div.split-main', detail));
}

let paneQ = '';
function listPane(activeId) {
  const listEl = h('div.pane-list', { role: 'list' });
  const draw = () => {
    const t = paneQ.trim().toLowerCase();
    const items = store.all('clients').filter((x) => !t || [x.nick, x.phone, x.occupation].join(' ').toLowerCase().includes(t))
      .sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999') || (a.nick || '').localeCompare(b.nick || '', 'th'));
    listEl.replaceChildren(...items.map((x) => { const g = grade(x);
      return h('a.pane-row', { href: '#/client/' + x.id, role: 'listitem', class: x.id === activeId ? 'on' : '', 'aria-current': x.id === activeId ? 'page' : null },
        h('span.avatar', initials(x.nick)), h('span.pt', h('b', x.nick, g ? h('span.grade.' + g, { style: { marginLeft: '6px' } }, g) : null), h('span', [STAGE[x.stage || 'lead']?.name, x.nextDate ? 'ติดตาม ' + dateTH(x.nextDate) : null].filter(Boolean).join(' · ')))); }));
  };
  draw();
  return h('aside.split-side', { 'aria-label': 'รายชื่อลูกค้า' },
    h('div.row.between', h('b', `ลูกค้า (${store.all('clients').length})`), h('a.btn.sm', { href: '#/client/new' }, icon('plus'), 'เพิ่ม')),
    h('div.search', { style: { margin: '8px 0' } }, icon('search'), h('input.input', { type: 'search', value: paneQ, placeholder: 'ค้นหา', 'aria-label': 'ค้นหาลูกค้า', oninput: (e) => { paneQ = e.target.value; draw(); } })),
    h('a.small', { href: '#/clients/lists' }, 'รายชื่ออัจฉริยะ →'),
    listEl);
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
  const targets = [['clients', c.id], ...store.all('logs').filter((x) => x.clientId === c.id).map((l) => ['logs', l.id]), ...store.all('appts').filter((x) => x.clientId === c.id).map((a) => ['appts', a.id])];
  location.hash = '#/clients';
  removeWithUndo(`ลบ ${c.nick} แล้ว`, targets);
}
