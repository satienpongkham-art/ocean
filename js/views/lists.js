// ─── รายชื่ออัจฉริยะ: บันทึกเงื่อนไขกรองไว้ใช้ซ้ำ + เริ่มโทรรวดกับรายชื่อได้ทันที ───
import { h, icon, sheet, closeSheet, choices, toast, copyText, empty, todayISO, daysBetween } from '../ui.js';
import * as store from '../store.js';
import { STAGES, SOURCES, grade, ageUp, noNextStep, busyIds } from '../engine/work.js';
import { HEALTH_LEVELS } from '../engine/needs.js';
import { clientAge } from './clients.js';
import { rerender } from '../app.js';

const HL = Object.fromEntries(HEALTH_LEVELS);
export const PRESETS = [
  { id: 'p-nohealth', name: 'ยังไม่มีประกันสุขภาพของตัวเอง', icon: 'cat-health', rules: { health: ['none', 'welfare'] } },
  { id: 'p-kidsnolife', name: 'มีลูก แต่ทุนชีวิตน้อยกว่า 1 ล้าน', icon: 'cat-life', rules: { kids: 'yes', lifeMax: 999999 } },
  { id: 'p-noci', name: 'อายุ 30–55 ยังไม่มีโรคร้ายแรง', icon: 'cat-ci', rules: { ageMin: 30, ageMax: 55, noCI: true } },
  { id: 'p-ageup', name: 'อายุประกันขึ้นใน 30 วัน', icon: 'clock', rules: { ageUpDays: 30 } },
  { id: 'p-silent', name: 'เงียบเกิน 60 วัน', icon: 'chat', rules: { silentDays: 60 } },
  { id: 'p-nonext', name: 'ยังไม่มีขั้นต่อไป', icon: 'next', rules: { noNext: true } },
  { id: 'p-gradeA', name: 'เกรด A ที่ยังไม่ได้นัด', icon: 'star', rules: { grades: ['A'], stages: ['lead', 'contacted'] } },
];

/** ลูกค้าคนนี้ตรงเงื่อนไขไหม */
export function matches(c, r, ctx) {
  if (c.stage === 'paused' && !(r.stages || []).includes('paused')) return false;
  const age = clientAge(c);
  if (r.ageMin != null && r.ageMin !== '' && !(age >= +r.ageMin)) return false;
  if (r.ageMax != null && r.ageMax !== '' && !(age <= +r.ageMax)) return false;
  if (r.kids === 'yes' && !(+c.kids > 0)) return false;
  if (r.kids === 'no' && +c.kids > 0) return false;
  if (r.health?.length && !r.health.includes(c.healthLevel || 'none')) return false;
  if (r.noCI && +c.ciCover > 0) return false;
  if (r.lifeMax != null && r.lifeMax !== '' && (+c.lifeCover || 0) > +r.lifeMax) return false;
  if (r.stages?.length && !r.stages.includes(c.stage || 'lead')) return false;
  if (r.grades?.length && !r.grades.includes(grade(c) || '-')) return false;
  if (r.sources?.length && !r.sources.includes(c.source || 'cold')) return false;
  if (r.silentDays) { const last = (c.lastContact || c.createdAt || '').slice(0, 10); if (!last || daysBetween(last, ctx.today) < +r.silentDays) return false; }
  if (r.ageUpDays) { const au = ageUp(c.birthday, ctx.rule); if (!au || au.days > +r.ageUpDays) return false; }
  if (r.noNext && !noNextStep(c, ctx.busy)) return false;
  return true;
}
const ctxNow = () => ({ today: todayISO(), rule: store.getSettings().ageRule, busy: busyIds(store.all('appts')) });
export const allLists = () => [...PRESETS, ...(store.getSettings().smartLists || [])];
export function members(list) { const ctx = ctxNow(); return store.all('clients').filter((c) => matches(c, list.rules, ctx)); }

function describe(r) {
  const out = [];
  if (r.ageMin || r.ageMax) out.push(`อายุ ${r.ageMin || 0}–${r.ageMax || '∞'}`);
  if (r.kids === 'yes') out.push('มีลูก'); if (r.kids === 'no') out.push('ไม่มีลูก');
  if (r.health?.length) out.push('สุขภาพ: ' + r.health.map((x) => HL[x].split(' ')[0]).join('/'));
  if (r.noCI) out.push('ไม่มีโรคร้าย'); if (r.lifeMax) out.push('ทุนชีวิต ≤ ' + (+r.lifeMax).toLocaleString('th-TH'));
  if (r.stages?.length) out.push('ขั้น: ' + r.stages.map((x) => STAGES.find((s) => s.id === x)?.name).join('/'));
  if (r.grades?.length) out.push('เกรด ' + r.grades.join('/'));
  if (r.sources?.length) out.push('ที่มา: ' + r.sources.map((x) => Object.fromEntries(SOURCES)[x]).join('/'));
  if (r.silentDays) out.push(`เงียบ ≥ ${r.silentDays} วัน`); if (r.ageUpDays) out.push(`อายุประกันขึ้นใน ${r.ageUpDays} วัน`); if (r.noNext) out.push('ยังไม่มีขั้นต่อไป');
  return out.join(' · ') || 'ทุกคน';
}

export function renderLists() {
  const lists = allLists();
  return h('div', { 'data-title': 'รายชื่ออัจฉริยะ' },
    h('div.back-row', h('a.icon-btn', { href: '#/clients', 'aria-label': 'กลับ' }, icon('back')), h('div', { style: { flex: 1 } }, h('h1.serif', { style: { fontSize: '22px' } }, 'รายชื่ออัจฉริยะ'), h('div.small.muted', 'เงื่อนไขที่บันทึกไว้ อัปเดตรายชื่อให้เองทุกครั้งที่เปิด')),
      h('button.btn.primary.sm', { onclick: () => builder() }, icon('plus'), 'สร้าง')),
    h('div.plist', { style: { marginTop: '10px' } }, lists.map((l) => { const n = members(l).length;
      return h('a.prow', { href: '#/clients/list/' + l.id }, h('span.pi', icon(l.icon || 'filter')), h('span.pt', h('b', l.name), h('span', describe(l.rules))), h('span.pr', h('span.tag' + (n ? '.good' : ''), n + ' คน'), icon('next'))); })));
}

export function renderSmartList(id) {
  const l = allLists().find((x) => x.id === id);
  if (!l) { location.hash = '#/clients/lists'; return null; }
  const list = members(l);
  const custom = !l.id.startsWith('p-');
  const go = () => import('./work.js').then((m) => m.startPowerHour(list.map((c) => c.id), l.name));
  return h('div', { 'data-title': l.name },
    h('div.back-row', h('a.icon-btn', { href: '#/clients/lists', 'aria-label': 'กลับ' }, icon('back')), h('div', { style: { flex: 1, minWidth: 0 } }, h('h1.serif', { style: { fontSize: '21px' } }, l.name), h('div.small.muted', describe(l.rules))),
      custom ? h('button.icon-btn', { 'aria-label': 'แก้เงื่อนไข', onclick: () => builder(l) }, icon('pen')) : h('button.icon-btn', { 'aria-label': 'คัดลอกเป็นรายชื่อของฉัน', title: 'คัดลอกไปแก้', onclick: () => builder({ ...l, id: null, name: l.name + ' (ของฉัน)' }) }, icon('copy'))),
    list.length ? h('div.row', { style: { gap: '8px', margin: '10px 0' } },
      h('button.btn.primary', { style: { flex: 1 }, onclick: go }, icon('flame'), `โทรรวด ${list.length} คน`),
      h('button.btn', { onclick: () => copyText(list.map((c) => [c.nick, c.phone].filter(Boolean).join(' ')).join('\n')) }, icon('copy'), 'คัดลอก')) : null,
    list.length ? h('div.plist', list.map((c) => { const g = grade(c); const age = clientAge(c);
      return h('a.prow', { href: '#/client/' + c.id }, h('span.avatar', c.nick?.[0] || '?'), h('span.pt', h('b', c.nick, g ? h('span.grade.' + g, { style: { marginLeft: '6px' } }, g) : null), h('span', [age != null ? age + ' ปี' : null, STAGES.find((s) => s.id === (c.stage || 'lead'))?.name, c.phone].filter(Boolean).join(' · '))), h('span.pr', icon('next'))); }))
      : h('div.card', empty('ยังไม่มีใครตรงเงื่อนไขนี้', 'check', custom ? h('button.btn', { onclick: () => builder(l) }, icon('pen'), 'แก้เงื่อนไข') : null, 'เมื่อข้อมูลลูกค้าเปลี่ยน รายชื่อจะอัปเดตเอง')));
}

/** ฟอร์มสร้าง/แก้รายชื่อ */
function builder(l) {
  const r = { ...(l?.rules || {}) };
  const name = h('input.input', { value: l?.name || '', placeholder: 'เช่น คุณแม่ลูกเล็ก ยังไม่มี CI', required: true, 'aria-label': 'ชื่อรายชื่อ' });
  const count = h('b', { 'aria-live': 'polite' });
  const recount = () => { const ctx = ctxNow(); count.textContent = store.all('clients').filter((c) => matches(c, r, ctx)).length + ' คน'; };
  const num = (k, ph) => h('input.input', { type: 'number', inputmode: 'numeric', min: 0, value: r[k] ?? '', placeholder: ph, style: { width: '96px' }, 'aria-label': ph, oninput: (e) => { r[k] = e.target.value === '' ? null : +e.target.value; recount(); } });
  const multi = (k, opts) => choices(k, r[k] || [], opts, { multi: true, onChange: (v) => { r[k] = v; recount(); } });
  const body = h('div.stack',
    h('label.f', h('span', 'ชื่อรายชื่อ *'), name),
    h('div.q', h('span.ql', 'ช่วงอายุ'), h('div.row', { style: { gap: '8px' } }, num('ageMin', 'ตั้งแต่'), '–', num('ageMax', 'ถึง'))),
    h('div.q', h('span.ql', 'ลูก'), choices('kids', r.kids || 'any', [['any', 'ไม่สนใจ'], ['yes', 'มีลูก'], ['no', 'ไม่มีลูก']], { onChange: (v) => { r.kids = v === 'any' ? null : v; recount(); } })),
    h('div.q', h('span.ql', 'ประกันสุขภาพตอนนี้'), multi('health', HEALTH_LEVELS.map(([k, v]) => [k, v.split(' (')[0]]))),
    h('label.row.small', h('input', { type: 'checkbox', checked: !!r.noCI, onchange: (e) => { r.noCI = e.target.checked; recount(); } }), 'ยังไม่มีทุนโรคร้ายแรง'),
    h('div.q', h('span.ql', 'ทุนชีวิตไม่เกิน (บาท)'), num('lifeMax', 'เช่น 1000000')),
    h('div.q', h('span.ql', 'ขั้นในท่อการขาย'), multi('stages', STAGES.map((s) => [s.id, s.name]))),
    h('div.q', h('span.ql', 'เกรด'), multi('grades', [['A', 'A'], ['B', 'B'], ['C', 'C']])),
    h('div.q', h('span.ql', 'ที่มา'), multi('sources', SOURCES)),
    h('div.q', h('span.ql', 'ไม่ได้ติดต่อเกิน (วัน)'), num('silentDays', 'เช่น 60')),
    h('div.q', h('span.ql', 'อายุประกันขึ้นภายใน (วัน)'), num('ageUpDays', 'เช่น 30')),
    h('label.row.small', h('input', { type: 'checkbox', checked: !!r.noNext, onchange: (e) => { r.noNext = e.target.checked; recount(); } }), 'ยังไม่มีขั้นต่อไป'),
    h('div.callout.small', 'ตรงเงื่อนไขตอนนี้ ', count),
    h('div.row', { style: { gap: '8px' } },
      h('button.btn.primary', { style: { flex: 1 }, onclick: () => {
        if (!name.value.trim()) { name.reportValidity(); return; }
        const lists = store.getSettings().smartLists || [];
        const rec = { id: l?.id || 's-' + Date.now().toString(36), name: name.value.trim(), icon: 'filter', rules: r };
        store.saveSettings({ smartLists: l?.id ? lists.map((x) => (x.id === l.id ? rec : x)) : [...lists, rec] });
        closeSheet(true); toast('บันทึกรายชื่อแล้ว'); location.hash = '#/clients/list/' + rec.id;
      } }, icon('check'), 'บันทึก'),
      l?.id && !l.id.startsWith('p-') ? h('button.btn.danger', { 'aria-label': 'ลบรายชื่อนี้', onclick: () => { if (!confirm('ลบรายชื่ออัจฉริยะนี้? (ข้อมูลลูกค้าไม่หาย)')) return; store.saveSettings({ smartLists: (store.getSettings().smartLists || []).filter((x) => x.id !== l.id) }); closeSheet(true); location.hash = '#/clients/lists'; } }, icon('trash')) : null));
  recount();
  sheet({ title: l?.id ? 'แก้รายชื่ออัจฉริยะ' : 'สร้างรายชื่ออัจฉริยะ', body });
}
