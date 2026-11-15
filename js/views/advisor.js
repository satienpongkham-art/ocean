// ─── แนะนำลูกค้า v2: กรอก 3 ขั้นด้วยปุ่มแตะ → ผลสรุปสั้น + แท็บรายละเอียด ───
import { h, icon, copyText, fmt, ageFrom, wizard, q, choices, numStepper, moneyInput, readControls, tabs, points, toast } from '../ui.js';
import * as store from '../store.js';
import { PLAN, CAT } from '../../data/plans.js';
import { TIER_LABEL } from '../../data/packages.js';
import { AGE_BANDS, CASES } from '../../data/cases.js';
import { recommend, storyLine } from '../engine/recommend.js';
import { HEALTH_LEVELS, fmtM, ASSUME } from '../engine/needs.js';
import { tabsPlans } from './plans.js';
import { tiersView } from './packages.js';

export const CONCERNS = [
  ['waste', 'ไม่อยากจ่ายทิ้ง'], ['cancer', 'กลัวมะเร็ง/ป่วยซ้ำ'], ['tax', 'ลดหย่อนภาษี'], ['retire', 'วางแผนเกษียณ'],
  ['kids', 'ทุนการศึกษาลูก'], ['motorbike', 'ขี่มอเตอร์ไซค์'], ['senior', 'ทำให้พ่อแม่'],
];
const INCOME = [[15000, '15k'], [25000, '25k'], [35000, '35k'], [50000, '50k'], [80000, '80k'], [120000, '120k']];
const COVER = [[0, 'ไม่มี'], [300000, '3 แสน'], [500000, '5 แสน'], [1000000, '1 ล้าน'], [2000000, '2 ล้าน']];

/** ขั้นตอนกรอกข้อมูลความต้องการ (ใช้ซ้ำในฟอร์มลูกค้า) */
export const needSteps = [
  {
    title: 'ข้อมูลพื้นฐาน',
    render: (d) => h('div',
      q('ชื่อเล่น', h('input.input', { name: 'nick', value: d.nick || '', placeholder: 'เช่น น้องเอ' })),
      q('อายุ', h('input.input', { name: 'age', type: 'number', inputmode: 'numeric', min: 0, max: 99, value: d.age ?? '', placeholder: 'ปี' })),
      q('รายได้ต่อเดือน (บาท)', moneyInput('incomeMonthly', d.incomeMonthly, INCOME))),
    read: (n, d) => Object.assign(d, readControls(n)),
  },
  {
    title: 'ครอบครัว & ภาระ',
    render: (d) => h('div',
      q('สถานภาพ', choices('marital', d.marital || 'single', [['single', 'โสด'], ['married', 'มีคู่']])),
      q('จำนวนลูก', numStepper('kids', d.kids ?? 0, { max: 10 })),
      q('อายุลูกคนเล็ก', h('input.input', { name: 'youngestKidAge', type: 'number', inputmode: 'numeric', min: 0, value: d.youngestKidAge ?? '', placeholder: 'ถ้ามีลูก' })),
      q('ดูแลพ่อแม่ (คน)', numStepper('parents', d.parents ?? 0, { max: 4 })),
      q('หนี้บ้าน/รถ คงค้าง', moneyInput('debt', d.debt, [[0, 'ไม่มี'], [500000, '5 แสน'], [1000000, '1 ล้าน'], [3000000, '3 ล้าน']]))),
    read: (n, d) => Object.assign(d, readControls(n)),
  },
  {
    title: 'ความคุ้มครองที่มี',
    render: (d) => h('div',
      q('ประกันสุขภาพตอนนี้', choices('healthLevel', d.healthLevel || 'none', [['none', 'ไม่มี'], ['welfare', 'สวัสดิการบริษัท'], ['basic', 'มี แต่วงเงินน้อย'], ['good', 'เหมาจ่ายวงเงินสูง']])),
      q('ทุนประกันชีวิตที่มี', moneyInput('lifeCover', d.lifeCover, COVER)),
      q('ทุนโรคร้ายแรงที่มี', moneyInput('ciCover', d.ciCover, COVER)),
      q('ความกังวล (เลือกได้หลายข้อ)', choices('concerns', d.concerns || [], CONCERNS, { multi: true })),
      q('งบเบี้ยต่อเดือน (ถ้ามี)', moneyInput('budgetMonthly', d.budgetMonthly, [[1000, '1,000'], [2000, '2,000'], [3000, '3,000'], [5000, '5,000']]))),
    read: (n, d) => Object.assign(d, readControls(n)),
  },
];

/** ผลการแนะนำ v2 */
export function resultView(p) {
  const r = recommend(p);
  const top = h('div.pkg-head',
    h('div.xs', { style: { opacity: .75 } }, 'แนะนำสำหรับ ' + (p.nick || 'ลูกค้า')),
    h('h2', `${r.pkg.name}`),
    h('p', `ระดับ${TIER_LABEL[r.tier]}` + (r.budgetHint ? ` · งบ ${fmt(r.budgetHint.lo)}–${fmt(r.budgetHint.hi)} บาท/เดือน` : '')),
    h('div.goal', r.reasons[0]));
  const t = tabs([['plan', 'แผนที่แนะนำ'], ['why', 'เหตุผล'], ['gap', 'ช่องว่าง'], ['case', 'ตัวอย่างเคส']], 'plan', (k) => {
    if (k === 'plan') return tiersView(r.pkg, r.tier);
    if (k === 'why') return h('div', points(r.reasons, { kind: 'good' }), h('div.card', { style: { marginTop: '12px' } }, h('b', `${r.band.label}: ${r.band.title}`), h('p.small', { style: { marginTop: '4px' } }, r.band.why)));
    if (k === 'gap') return r.gaps.length ? h('div.plist', r.gaps.map((g) => h('div.prow.cat-' + g.cat, { style: { cursor: 'default', alignItems: 'flex-start' } }, h('span.pi', icon('cat-' + g.cat)), h('span.pt', h('b', CAT[g.cat]?.name || g.cat), h('span', { style: { whiteSpace: 'normal' } }, g.text))))) : h('p.muted', 'ไม่พบช่องว่างสำคัญ');
    return r.cases.length ? h('div.grid.g2', r.cases.map(caseCard)) : h('p.muted', 'ยังไม่มีเคสใกล้เคียง');
  });
  return h('div',
    top,
    h('div', { style: { marginTop: '10px' } }, t.bar, t.panel),
    h('div.row', { style: { gap: '8px', marginTop: '14px' } }, h('button.btn', { onclick: () => copyText(textSummary(p, r)) }, icon('copy'), 'คัดลอกสรุปส่งลูกค้า')),
    h('p.xs.muted', { style: { marginTop: '10px' } }, `ทุนชีวิตคิดจากค่าใช้จ่ายครอบครัว (~70% ของรายได้) × ปีที่ต้องดูแล + หนี้ + ทุนการศึกษา − เงินออม · ทุนโรคร้าย = รายได้ 3 ปี · ใช้ประกอบการคุยเท่านั้น`));
}

function textSummary(p, r) {
  const lines = [storyLine(p, r), '', 'เหตุผล:', ...r.reasons.map((x) => '• ' + x), '', 'ช่องว่าง:', ...r.gaps.map((g) => '• ' + g.text), '', `แพ็กเกจ ${r.pkg.name} ระดับ${TIER_LABEL[r.tier]}:`];
  for (const it of r.pkg.tiers[r.tier].items) lines.push(`• ${PLAN[it.plan]?.short} — ${it.sa}`);
  lines.push('', 'หมายเหตุ: เบี้ยจริงตามใบเสนอจากระบบ AIA');
  return lines.join('\n');
}

export function caseCard(c) {
  let open = false;
  const more = h('div');
  const btn = h('button.more-btn', { onclick: () => { open = !open; more.replaceChildren(open ? h('div', h('p.small', { style: { marginTop: '6px' } }, h('b', 'ปัญหา: '), c.problem), h('p.small', { style: { marginTop: '6px' } }, h('b', 'ผลลัพธ์: '), c.result), h('div.callout.good.small', { style: { marginTop: '8px' } }, c.why), h('div.source', c.source)) : ''); btn.textContent = open ? 'ย่อ' : 'อ่านเคสนี้'; } }, 'อ่านเคสนี้');
  return h('div.card',
    h('div.row', { style: { gap: '8px' } }, h('span.tag', c.age + ' ปี'), h('b', { style: { fontSize: '15.5px' } }, c.title.split(' — ')[0])),
    h('p.small.muted', { style: { marginTop: '4px' } }, c.title.split(' — ')[1] || c.profile),
    h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } }, c.solution.map((s) => h('a.chip', { href: '#/plan/' + s.plan }, PLAN[s.plan]?.short || s.plan))),
    h('p.small', { style: { marginTop: '8px' } }, c.solution[0].detail),
    btn, more);
}

let lastInput = null;
export function renderAdvisor(qs = {}) {
  const root = h('div', { 'data-title': 'แนะนำลูกค้า' });
  const area = h('div', { style: { marginTop: '14px' } });
  const withAge = (c) => (c ? { ...c, age: ageFrom(c.birthday) ?? c.age } : null);
  const fromClient = qs.client ? withAge(store.get('clients', qs.client)) : null;
  const showResult = (d) => {
    lastInput = d;
    area.replaceChildren(h('button.btn.ghost', { onclick: () => startWizard(d) }, icon('pen'), 'แก้ข้อมูล'), resultView(d),
      !d.id ? h('button.btn.primary.block', { style: { marginTop: '12px' }, onclick: () => { const c = store.put('clients', { ...d, stage: 'lead', source: 'warm' }); toast('บันทึกเป็นรายชื่อแล้ว'); location.hash = '#/client/' + c.id; } }, icon('plus'), 'บันทึกเป็นรายชื่อลูกค้า') : null);
    window.scrollTo({ top: 0 });
  };
  const startWizard = (d = {}) => area.replaceChildren(wizard(needSteps, { ...d }, { onDone: showResult, doneLabel: 'ดูผลแนะนำ' }));
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  root.append(
    h('div.topbar', h('div', h('h1', 'แนะนำลูกค้า'), h('div.sub', 'ตอบ 3 ขั้น → ได้แพ็กเกจพร้อมเหตุผล'))),
    tabsPlans('advisor'),
    clients.length ? h('div.row', { style: { marginTop: '14px', gap: '8px' } }, h('span.small.muted.nowrap', 'ใช้ข้อมูลลูกค้า'),
      h('select.input', { style: { flex: 1 }, onchange: (e) => { const c = withAge(store.get('clients', e.target.value)); if (c) showResult(c); else startWizard(); } },
        h('option', { value: '' }, '— กรอกใหม่ —'), clients.map((c) => h('option', { value: c.id, selected: fromClient?.id === c.id }, c.nick)))) : null,
    area);
  if (fromClient) showResult(fromClient); else startWizard(lastInput && !lastInput.id ? lastInput : {});
  return root;
}

export function renderCases() {
  const root = h('div', { 'data-title': 'ตัวอย่างเคส' });
  const t = tabs(AGE_BANDS.map((b) => [b.id, b.label]), '30-40', (id) => {
    const b = AGE_BANDS.find((x) => x.id === id);
    const cs = CASES.filter((c) => c.band === b.id);
    return h('div',
      h('div.pkg-head', h('h2', b.title), h('p', b.why), h('a.btn.sm', { href: '#/plans/packages?p=' + b.package, style: { marginTop: '10px', background: 'var(--paper)', color: 'var(--ink)', border: 0 } }, icon('package'), 'ดูแพ็กเกจที่เหมาะ')),
      h('div.section', h('h2', 'ควรมีอะไร'), points(b.focus, { kind: 'plain' })),
      cs.length ? h('div.section', h('h2', `เคสจากโบรชัวร์ AIA (${cs.length})`), h('div.grid.g2', cs.map(caseCard))) : null);
  });
  root.append(h('div.topbar', h('div', h('h1', 'ตัวอย่างเคสตามช่วงวัย'))), tabsPlans('cases'), h('div', { style: { marginTop: '10px' } }, t.bar, t.panel));
  return root;
}
