// ─── ระบบแนะนำ (ใส่ข้อมูลลูกค้า → แพ็กเกจ + เหตุผล) และ Case study ───
import { h, icon, field, inputEl, selectEl, readForm, copyText, fmt, ageFrom } from '../ui.js';
import * as store from '../store.js';
import { PLAN, CAT } from '../../data/plans.js';
import { TIER_LABEL } from '../../data/packages.js';
import { AGE_BANDS, CASES } from '../../data/cases.js';
import { recommend, storyLine } from '../engine/recommend.js';
import { HEALTH_LEVELS, fmtM, ASSUME } from '../engine/needs.js';
import { tabsPlans } from './plans.js';
import { tierCard } from './packages.js';

export const CONCERNS = [
  ['waste', 'ไม่อยากจ่ายทิ้ง'], ['cancer', 'กังวลมะเร็ง/ป่วยซ้ำ'], ['tax', 'อยากลดหย่อนภาษี'], ['retire', 'วางแผนเกษียณ'],
  ['kids', 'ทุนการศึกษาลูก'], ['motorbike', 'ขี่มอเตอร์ไซค์ประจำ'], ['senior', 'ทำให้พ่อแม่/ผู้สูงวัย'],
];

export function profileForm(v = {}, onSubmit, submitLabel = 'วิเคราะห์') {
  const f = h('form.form-grid', { onsubmit: (e) => { e.preventDefault(); const d = readForm(f); d.concerns = [...f.querySelectorAll('input[name="cc"]:checked')].map((x) => x.value); onSubmit(d); } },
    field('ชื่อเล่น', inputEl('nick', v.nick, { placeholder: 'เช่น น้องเอ' })),
    field('อายุ (ปี)', inputEl('age', v.age, { type: 'number', inputmode: 'numeric', min: 0, max: 99, required: true })),
    field('รายได้ต่อเดือน (บาท)', inputEl('incomeMonthly', v.incomeMonthly, { type: 'number', inputmode: 'numeric', min: 0, step: 1000 })),
    field('งบเบี้ยต่อเดือน (ถ้ามี)', inputEl('budgetMonthly', v.budgetMonthly, { type: 'number', inputmode: 'numeric', min: 0, step: 100 }), 'เว้นว่างได้'),
    field('สถานภาพ', selectEl('marital', v.marital || 'single', [['single', 'โสด'], ['married', 'สมรส/มีคู่']])),
    field('จำนวนลูก', inputEl('kids', v.kids ?? 0, { type: 'number', inputmode: 'numeric', min: 0, max: 10 })),
    field('อายุลูกคนเล็ก', inputEl('youngestKidAge', v.youngestKidAge, { type: 'number', inputmode: 'numeric', min: 0, max: 30 })),
    field('พ่อแม่ที่ดูแล (คน)', inputEl('parents', v.parents ?? 0, { type: 'number', inputmode: 'numeric', min: 0, max: 4 })),
    field('หนี้คงค้าง (บ้าน/รถ)', inputEl('debt', v.debt, { type: 'number', inputmode: 'numeric', min: 0, step: 10000 })),
    field('เงินออมที่ใช้ได้ทันที', inputEl('liquidSavings', v.liquidSavings, { type: 'number', inputmode: 'numeric', min: 0, step: 10000 })),
    field('ประกันสุขภาพตอนนี้', selectEl('healthLevel', v.healthLevel || 'none', HEALTH_LEVELS), null),
    field('ทุนประกันชีวิตที่มี', inputEl('lifeCover', v.lifeCover, { type: 'number', inputmode: 'numeric', min: 0, step: 50000 })),
    field('ทุนโรคร้ายแรงที่มี', inputEl('ciCover', v.ciCover, { type: 'number', inputmode: 'numeric', min: 0, step: 50000 })),
    field('ทุนอุบัติเหตุที่มี', inputEl('paCover', v.paCover, { type: 'number', inputmode: 'numeric', min: 0, step: 50000 })),
    h('div.full', h('div.small', { style: { color: 'var(--ink-2)', marginBottom: '6px' } }, 'ความกังวล / เป้าหมาย'),
      h('div.row.wrap', { style: { gap: '6px' } }, CONCERNS.map(([k, l]) => h('label.chip', h('input', { type: 'checkbox', name: 'cc', value: k, checked: (v.concerns || []).includes(k), style: { margin: 0 } }), l)))),
    h('div.full', h('button.btn.primary.block', { type: 'submit' }, icon('compass'), submitLabel)));
  return f;
}

/** แสดงผลการแนะนำ (ใช้ซ้ำในหน้าลูกค้า) */
export function resultView(p) {
  const r = recommend(p);
  const line = storyLine(p, r);
  return h('div.stack',
    h('div.card',
      h('div.row.between.wrap', h('div', h('div.small.muted', 'แนะนำแพ็กเกจ'), h('h2.serif', { style: { fontSize: '22px' } }, `${r.pkg.name} · ${TIER_LABEL[r.tier]}`)),
        h('button.btn.sm', { onclick: () => copyText(textSummary(p, r)) }, icon('copy'), 'คัดลอกสรุป')),
      h('p', { style: { marginTop: '8px' } }, line),
      h('div.section', h('h2', 'ทำไมถึงแนะนำแบบนี้'), h('ul.ticks', r.reasons.map((x) => h('li', x)))),
      r.budgetHint ? h('div.callout', { style: { marginTop: '10px' } }, h('b', 'งบเบี้ยที่เหมาะสม: '), `${fmt(r.budgetHint.lo)} – ${fmt(r.budgetHint.hi)} บาท/เดือน `, h('span.muted.small', '(ตามหลัก 10–15% ของรายได้)')) : null),
    r.gaps.length ? h('div.card', h('div.card-h', h('h3', 'ช่องว่างความคุ้มครอง')), h('ul.list', r.gaps.map((g) => h('li', h('div.row', { style: { alignItems: 'flex-start' } }, h('span.tag', { style: { color: `var(--c-${g.cat})` } }, CAT[g.cat]?.short || g.cat), h('span.small', g.text)))))) : null,
    h('div.tiers', ['basic', 'mid', 'max'].map((tk) => tierCard(r.pkg, tk, { pick: tk === r.tier }))),
    h('div.card',
      h('div.card-h', h('h3', `${r.band.label}: ${r.band.title}`)),
      h('p.small', r.band.why),
      h('ul.dots.small', { style: { marginTop: '6px' } }, r.band.focus.map((x) => h('li', x)))),
    r.cases.length ? h('div.section', h('h2', 'Case study ที่ใกล้เคียง'), h('div.grid.g2', r.cases.map(caseCard))) : null,
    h('p.source', `สมมติฐาน: ทุนชีวิต = ค่าใช้จ่ายครอบครัว/ปี (ไม่ระบุ = 70% ของรายได้) × ปีที่ครอบครัวพึ่งพา (มีลูก: จนลูกคนเล็กอายุ 22 · 10–20 ปี · มีคู่/พ่อแม่: 5 ปี) + หนี้ + ทุนการศึกษาลูกละ ${fmt(ASSUME.eduPerChild)} − เงินออม · ทุนโรคร้าย = รายได้ 3 ปี (ขั้นต่ำ ${fmt(ASSUME.ciMin)}) · ใช้ประกอบการคุยเท่านั้น`));
}

function textSummary(p, r) {
  const lines = [storyLine(p, r), '', 'เหตุผล:', ...r.reasons.map((x) => '• ' + x), '', 'ช่องว่าง:', ...r.gaps.map((g) => '• ' + g.text), '', `แพ็กเกจ ${r.pkg.name} ระดับ${TIER_LABEL[r.tier]}:`];
  for (const it of r.pkg.tiers[r.tier].items) lines.push(`• ${PLAN[it.plan]?.short} — ${it.sa}`);
  lines.push('', 'หมายเหตุ: เบี้ยจริงตามใบเสนอจากระบบ AIA');
  return lines.join('\n');
}

export function caseCard(c) {
  return h('div.card',
    h('div.row.between', h('span.tag', c.age + ' ปี'), h('span.xs.muted', c.source)),
    h('h3', { style: { marginTop: '8px', fontSize: '16px' } }, c.title),
    h('p.small.muted', { style: { marginTop: '4px' } }, c.profile),
    h('p.small', { style: { marginTop: '8px' } }, h('b', 'ปัญหา: '), c.problem),
    h('div', { style: { marginTop: '8px' } }, c.solution.map((s) => h('div.small', h('a', { href: '#/plan/' + s.plan }, PLAN[s.plan]?.short || s.plan), ' — ', s.detail))),
    h('p.small', { style: { marginTop: '8px' } }, h('b', 'ผลลัพธ์: '), c.result),
    h('div.callout.good.small', { style: { marginTop: '8px' } }, h('b', 'ทำไมต้องแผนนี้: '), c.why));
}

export function renderAdvisor(q = {}) {
  const root = h('div', { 'data-title': 'ระบบแนะนำ' });
  const out = h('div', { style: { marginTop: '14px' } });
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const withAge = (c) => (c ? { ...c, age: ageFrom(c.birthday) ?? c.age } : null);
  let current = withAge(q.client ? store.get('clients', q.client) : null);
  const formWrap = h('div');
  const drawForm = () => formWrap.replaceChildren(profileForm(current || {}, (d) => { current = { ...(current || {}), ...d }; out.replaceChildren(resultView(current)); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  drawForm();
  root.append(
    h('div.topbar', h('div', h('h1', 'ระบบแนะนำ'), h('div.sub', 'ใส่ข้อมูลลูกค้า → ได้แพ็กเกจ ระดับ และเหตุผลที่อธิบายให้ลูกค้าฟังได้ทันที'))),
    tabsPlans('advisor'),
    h('div.card', { style: { marginTop: '14px' } },
      clients.length ? h('div.row.wrap', { style: { marginBottom: '12px', gap: '8px' } }, h('span.small.muted', 'ดึงข้อมูลจากลูกค้า:'),
        h('select.input', { style: { width: 'auto', minWidth: '180px' }, onchange: (e) => { current = withAge(e.target.value ? store.get('clients', e.target.value) : null); drawForm(); out.replaceChildren(); if (current) out.replaceChildren(resultView(current)); } },
          h('option', { value: '' }, '— กรอกเอง —'), clients.map((c) => h('option', { value: c.id, selected: current?.id === c.id }, c.nick)))) : null,
      formWrap),
    out);
  if (current) out.replaceChildren(resultView(current));
  return root;
}

export function renderCases() {
  const root = h('div', { 'data-title': 'Case study' });
  root.append(
    h('div.topbar', h('div', h('h1', 'Case study ตามช่วงวัย'), h('div.sub', 'ตัวละครและตัวเลขเบี้ยจากกรณีตัวอย่างในโบรชัวร์ทางการของ AIA'))),
    tabsPlans('cases'),
    ...AGE_BANDS.map((b) => {
      const cs = CASES.filter((c) => c.band === b.id);
      return h('div.section',
        h('h2', `${b.label} · ${b.title}`),
        h('div.card', h('p', b.why), h('ul.dots.small', { style: { marginTop: '6px' } }, b.focus.map((x) => h('li', x))), h('a.btn.sm', { href: '#/plans/packages?p=' + b.package, style: { marginTop: '10px' } }, icon('package'), 'ดูแพ็กเกจที่เหมาะ')),
        cs.length ? h('div.grid.g2', { style: { marginTop: '10px' } }, cs.map(caseCard)) : null);
    }));
  return root;
}
