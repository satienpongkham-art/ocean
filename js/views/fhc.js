// ─── ตรวจสุขภาพการเงิน (ระบบภายใน) ───
//  • แบบเร็ว 6 ขั้น แตะเลือก (ใช้ตอนนั่งคุยกับลูกค้า หรือยื่นมือถือให้ลูกค้าแตะเอง)
//  • ผลลัพธ์พร้อมโชว์: วงคะแนน · แมนฮาร่า 8 ด้าน · 3 จุดที่ควรเติม · แพ็กเกจแนะนำ · ปุ่มนำเสนอ/ส่ง LINE
//  • ประวัติการตรวจ: เทียบก่อน–หลัง
//  • แบบละเอียด (ใส่ตัวเลขจริง) อยู่ที่ #/client/:id/fhc/detail
import { h, icon, field, inputEl, selectEl, readForm, toast, sheet, fmt, wizard, q, choices, numStepper, readControls, todayISO, dateTH, ageFrom } from '../ui.js';
import * as store from '../store.js';
import { healthCheck, HEALTH_LEVELS, fmtM, ASSUME } from '../engine/needs.js';
import { recommend } from '../engine/recommend.js';
import { PLANS, PLAN, CAT } from '../../data/plans.js';
import { TIER_LABEL } from '../../data/packages.js';
import { clientAge } from './clients.js';
import { lineChart } from '../charts.js';

// ── แมนฮาร่า ─────────────────────────────────────────────
const POS = ['life', 'health', 'ci', 'retire', null, 'accident', 'edu', 'saving', 'tax'];
const SUGGEST = {
  life: ['pay-life-plus', '20-pay-life', 'term'], health: ['health-happy', 'health-saver', 'health-starter'], ci: ['ci-plus', 'multipay-ci-plus', 'ci-procare'],
  accident: ['npa4600', 'npa3000'], saving: ['saving-sure', 'endowment-15-25'], retire: ['annuity-sure', 'saving-sure', 'protection-65'],
  edu: ['saving-sure', 'excellent'], tax: ['annuity-sure', 'saving-sure'],
};
const FRIENDLY = {
  life: 'ถ้ารายได้หยุด ครอบครัวยังไม่มีเงินก้อนพอดูแลต่อ', health: 'ถ้าป่วยหนัก ค่ารักษาอาจกินเงินเก็บ', ci: 'ยังไม่มีเงินก้อนไว้ใช้ช่วงรักษาโรคร้ายแรง',
  accident: 'ยังไม่มีความคุ้มครองอุบัติเหตุ', saving: 'เงินสำรองฉุกเฉินยังไม่ถึง 6 เดือน', retire: 'เงินหลังเกษียณยังไม่พอ',
  edu: 'ทุนการศึกษาลูกยังไม่ได้เตรียม', tax: 'ยังใช้สิทธิลดหย่อนภาษีจากเบี้ยประกันไม่เต็ม',
};

export function mandalaGrid(centerName, hc, { onCell } = {}) {
  const by = Object.fromEntries(hc.areas.map((a) => [a.key, a]));
  return h('div',
    h('div.mandala', POS.map((k) => {
      if (!k) return h('div.mcell.center', h('div.mt', centerName || 'ลูกค้า'), h('div.mv', hc.overall), h('div.ms', 'คะแนนรวม'));
      const a = by[k];
      return h('button.mcell.' + a.status, { onclick: () => (onCell ? onCell(a) : areaSheet(a)), 'aria-label': `${a.label} ${a.score ?? '-'} คะแนน` },
        h('div.mt', a.label), h('div.mv', a.score == null ? '—' : a.score), h('div.ms', { good: 'พร้อม', warn: 'ควรเติม', bad: 'ขาดมาก', na: 'ไม่เกี่ยว' }[a.status]));
    })),
    h('div.mandala-legend',
      h('span', h('i', { style: { background: 'var(--good-soft)' } }), 'พร้อม ≥80'),
      h('span', h('i', { style: { background: 'var(--warn-soft)' } }), 'ควรเติม 40–79'),
      h('span', h('i', { style: { background: 'var(--bad-soft)' } }), 'ขาดมาก <40'),
      h('span', h('i', { style: { background: 'var(--na-soft)' } }), 'ไม่เกี่ยวข้อง')));
}

function areaSheet(a) {
  const plans = (SUGGEST[a.key] || []).map((id) => PLAN[id]).filter(Boolean);
  sheet({
    title: a.label, sub: a.score == null ? 'ไม่เกี่ยวข้อง' : `คะแนน ${a.score}/100`,
    body: h('div.stack',
      h('p', a.text),
      a.need && !a.quick ? h('div.kv', h('div', h('span', 'มีอยู่'), h('b', fmtM(a.have))), h('div', h('span', 'ควรมี'), h('b', fmtM(a.need))), h('div', h('span', 'ขาด'), h('b', fmtM(Math.max(0, a.need - (a.have || 0)))))) : null,
      plans.length && a.status !== 'good' ? h('div', h('div.small.muted', { style: { marginBottom: '6px' } }, 'แผนที่ช่วยเติมช่องนี้'),
        h('div.row.wrap', { style: { gap: '6px' } }, plans.map((p) => h('a.chip', { href: '#/plan/' + p.id }, h('span.dot', { style: { background: `var(--c-${p.cat})` } }), p.short)))) : null),
  });
}

// ── ตัวเลือกแบบเร็ว ─────────────────────────────────────────
const INCOME = [['lt15', 'ต่ำกว่า 15,000', 12000, 0, 15000], ['15-30', '15,000–30,000', 22500, 15000, 30000], ['30-50', '30,000–50,000', 40000, 30000, 50000], ['50-100', '50,000–100,000', 75000, 50000, 100000], ['100+', 'มากกว่า 100,000', 130000, 100000, Infinity]];
const DEBT = [['0', 'ไม่มี', 0], ['lt500', 'ไม่ถึง 5 แสน', 300000], ['500-1m', '5 แสน – 1 ล้าน', 750000], ['1-3m', '1 – 3 ล้าน', 2000000], ['3m+', 'มากกว่า 3 ล้าน', 4000000]];
const BUDGET = [['500', 'ไม่เกิน 500'], ['1000', '1,000'], ['2000', '2,000'], ['3000', '3,000'], ['5000', '5,000+']];
const AMT = [['300000', '≤ 3 แสน'], ['500000', '5 แสน'], ['1000000', '1 ล้าน'], ['2000000', '2 ล้าน+']];
const HAVE = [
  ['welfare', 'สวัสดิการบริษัท', 'cat-health', '--c-health'], ['health', 'ประกันสุขภาพส่วนตัว', 'cat-health', '--c-health'],
  ['healthHigh', 'เหมาจ่ายวงเงิน ≥ 1 ล้าน', 'cat-health', '--c-health'], ['life', 'ประกันชีวิต', 'cat-life', '--c-life'],
  ['ci', 'ประกันโรคร้ายแรง', 'cat-ci', '--c-ci'], ['pa', 'ประกันอุบัติเหตุ', 'cat-accident', '--c-accident'],
  ['emergency', 'เงินสำรอง 6 เดือน', 'cat-saving', '--c-saving'], ['retire', 'ออมเพื่อเกษียณ', 'cat-annuity', '--c-annuity'],
  ['edu', 'ทุนการศึกษาลูก', 'book', '--c-saving'],
];
const CONCERNS = [['health', 'ค่ารักษาแพง'], ['cancer', 'โรคร้ายแรง'], ['income', 'รายได้หยุด'], ['family', 'คนข้างหลัง'], ['retire', 'เกษียณ'], ['tax', 'ภาษี'], ['kids', 'อนาคตลูก'], ['waste', 'ไม่อยากจ่ายทิ้ง']];
// ความกังวลแบบเร็ว → คีย์ที่ระบบแนะนำใช้
const CONCERN_MAP = { cancer: 'cancer', retire: 'retire', tax: 'tax', kids: 'kids', waste: 'waste' };

const bandOf = (list, v, idx = 3) => { if (v == null || v === '') return ''; const b = list.find((x) => +v >= x[idx] && +v < x[idx + 1]); return b ? b[0] : ''; };
const debtBand = (v) => { if (v == null || v === '') return ''; v = +v; return v <= 0 ? '0' : v < 500000 ? 'lt500' : v < 1000000 ? '500-1m' : v <= 3000000 ? '1-3m' : '3m+'; };

function haveFrom(c) {
  const s = new Set(c.haveKeys || []);
  if (!c.haveKeys) {
    if (c.healthLevel === 'welfare') s.add('welfare');
    if (c.healthLevel === 'basic') s.add('health');
    if (c.healthLevel === 'good') { s.add('health'); s.add('healthHigh'); }
    if (+c.lifeCover > 0) s.add('life'); if (+c.ciCover > 0) s.add('ci'); if (+c.paCover > 0) s.add('pa');
    if (c.hasEmergency) s.add('emergency'); if (c.hasRetire) s.add('retire'); if (c.hasEdu) s.add('edu');
  }
  return [...s];
}

/** แปลงคำตอบแบบเร็ว → ฟิลด์ลูกค้า */
function applyQuick(c, d) {
  const out = { ...c, quick: true };
  for (const k of ['nick', 'gender', 'marital', 'kids', 'youngestKidAge', 'parents']) if (d[k] !== undefined && d[k] !== '') out[k] = d[k];
  if (d.age !== undefined && d.age !== '' && d.age != null) out.age = d.age;
  if (d.incomeBand) { const b = INCOME.find((x) => x[0] === d.incomeBand); if (b && !(+c.incomeMonthly >= b[3] && +c.incomeMonthly < b[4])) out.incomeMonthly = b[2]; out.incomeBand = d.incomeBand; }
  if (d.debtBand) { const b = DEBT.find((x) => x[0] === d.debtBand); if (b && debtBand(c.debt) !== d.debtBand) out.debt = b[2]; out.debtBand = d.debtBand; }
  const hv = new Set(d.haveKeys || []); out.haveKeys = [...hv];
  out.healthLevel = hv.has('healthHigh') ? 'good' : hv.has('health') ? 'basic' : hv.has('welfare') ? 'welfare' : 'none';
  out.lifeCover = hv.has('life') ? (+d.lifeAmt || +c.lifeCover || 500000) : 0;
  out.ciCover = hv.has('ci') ? (+d.ciAmt || +c.ciCover || 500000) : 0;
  out.paCover = hv.has('pa') ? (+d.paAmt || +c.paCover || 500000) : 0;
  out.hasEmergency = hv.has('emergency'); out.hasRetire = hv.has('retire'); out.hasEdu = hv.has('edu');
  out.worries = d.worries || [];
  out.concerns = [...new Set([...(c.concerns || []).filter((x) => !Object.values(CONCERN_MAP).includes(x)), ...(d.worries || []).map((w) => CONCERN_MAP[w]).filter(Boolean)])];
  if (d.budget) out.budgetMonthly = +d.budget;
  return out;
}

function haveTiles(selected, onChange) {
  const sel = new Set(selected);
  const wrap = h('div.htiles', { 'data-name': 'haveKeys' });
  const paint = () => [...wrap.children].forEach((b) => b.classList.toggle('on', sel.has(b.dataset.v)));
  for (const [k, label, ic, color] of HAVE) wrap.append(h('button.htile', { type: 'button', 'data-v': k, onclick: () => { sel.has(k) ? sel.delete(k) : sel.add(k); paint(); onChange && onChange([...sel]); } },
    h('span.hi', { style: { background: `var(${color})` } }, icon(ic)), label));
  paint();
  wrap.getValue = () => [...sel];
  return wrap;
}

function quickSteps(isNew) {
  return [
    {
      title: 'เริ่มจากข้อมูลพื้นฐาน',
      valid: (d) => { if (isNew && !d.nick) { toast('ใส่ชื่อเล่นลูกค้าก่อนนะครับ'); return false; } return true; },
      render: (d) => h('div',
        isNew ? q('ชื่อเล่นลูกค้า', h('input.input', { name: 'nick', value: d.nick || '', placeholder: 'เช่น น้องมิว', autocomplete: 'off' })) : null,
        q('อายุ', h('input.input', { name: 'age', type: 'number', inputmode: 'numeric', min: 0, max: 99, value: d.age ?? '', placeholder: 'ปี' })),
        q('เพศ', choices('gender', d.gender || '', [['m', 'ชาย'], ['f', 'หญิง']]))),
      read: (n, d) => Object.assign(d, readControls(n)),
    },
    {
      title: 'รายได้ต่อเดือนประมาณเท่าไหร่?',
      render: (d) => h('div', h('p.small.muted', { style: { marginBottom: '12px' } }, 'ไม่ต้องเป๊ะ เลือกช่วงที่ใกล้ที่สุด'), choices('incomeBand', d.incomeBand || bandOf(INCOME, d.incomeMonthly), INCOME.map((x) => [x[0], x[1]]))),
      read: (n, d) => Object.assign(d, readControls(n)),
    },
    {
      title: 'ครอบครัว',
      render: (d) => h('div',
        q('สถานภาพ', choices('marital', d.marital || 'single', [['single', 'โสด'], ['married', 'มีคู่']])),
        q('จำนวนลูก', numStepper('kids', d.kids ?? 0, { max: 10 })),
        q('อายุลูกคนเล็ก', h('input.input', { name: 'youngestKidAge', type: 'number', inputmode: 'numeric', min: 0, value: d.youngestKidAge ?? '', placeholder: 'ถ้ามีลูก' })),
        q('ดูแลพ่อแม่', numStepper('parents', d.parents ?? 0, { max: 4 }))),
      read: (n, d) => Object.assign(d, readControls(n)),
    },
    {
      title: 'มีหนี้บ้าน / รถ / อื่น ๆ ไหม?',
      render: (d) => h('div', h('p.small.muted', { style: { marginBottom: '12px' } }, 'ยอดคงค้างโดยประมาณ'), choices('debtBand', d.debtBand || debtBand(d.debt), DEBT.map((x) => [x[0], x[1]]))),
      read: (n, d) => Object.assign(d, readControls(n)),
    },
    {
      title: 'ตอนนี้มีอะไรแล้วบ้าง?',
      render: (d) => {
        const amt = h('div');
        const drawAmt = (keys) => amt.replaceChildren(...[['life', 'lifeAmt', 'ทุนประกันชีวิตรวม', d.lifeCover], ['ci', 'ciAmt', 'ทุนโรคร้ายแรงรวม', d.ciCover], ['pa', 'paAmt', 'ทุนอุบัติเหตุ', d.paCover]]
          .filter(([k]) => keys.includes(k)).map(([, name, label, cur]) => q(label, choices(name, d[name] || (cur ? String(AMT.reduce((b, x) => Math.abs(+x[0] - +cur) < Math.abs(+b[0] - +cur) ? x : b)[0]) : ''), AMT))));
        const keys = d.haveKeys || haveFrom(d);
        drawAmt(keys);
        return h('div', h('p.small.muted', { style: { marginBottom: '12px' } }, 'แตะได้หลายข้อ — ไม่มีเลยก็กดถัดไปได้'), haveTiles(keys, drawAmt), h('div', { style: { marginTop: '16px' } }, amt));
      },
      read: (n, d) => Object.assign(d, readControls(n)),
    },
    {
      title: 'กังวลเรื่องอะไรที่สุด?',
      render: (d) => h('div',
        q('เลือกได้หลายข้อ', choices('worries', d.worries || [], CONCERNS, { multi: true })),
        q('งบเบี้ยที่สบายใจต่อเดือน', choices('budget', d.budget || (d.budgetMonthly ? String(d.budgetMonthly) : ''), BUDGET))),
      read: (n, d) => Object.assign(d, readControls(n)),
    },
  ];
}

// ── ผลลัพธ์ ─────────────────────────────────────────────
function level(score) {
  if (score >= 80) return ['ดีมาก', 'ความคุ้มครองครบเกือบทุกด้าน', 'var(--good)'];
  if (score >= 60) return ['พอใช้ — ยังมีช่องว่าง', 'พื้นฐานดีแล้ว แต่ยังมีบางด้านที่ควรเติม', 'var(--warn)'];
  if (score >= 40) return ['ควรปรับปรุง', 'ถ้าเกิดเรื่องใหญ่ เงินเก็บอาจไม่พอ', 'var(--warn)'];
  return ['เสี่ยง', 'ยังขาดความคุ้มครองหลายด้านที่สำคัญ', 'var(--bad)'];
}
function scoreRing(score, color) {
  const r = 44, c = 2 * Math.PI * r;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 104 104'); svg.setAttribute('width', '104'); svg.setAttribute('height', '104');
  svg.innerHTML = `<circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--paper-2)" stroke-width="11"/><circle class="arc" cx="52" cy="52" r="${r}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="0 ${c}" style="transition:stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)"/>`;
  const num = h('b', '0');
  requestAnimationFrame(() => setTimeout(() => {
    svg.querySelector('.arc').setAttribute('stroke-dasharray', `${(c * score) / 100} ${c}`);
    const t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / 900); num.textContent = Math.round(score * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  }, 60));
  return h('div.score-ring', svg, h('div.sr-num', num, h('small', 'จาก 100')));
}
export function gapsOf(hc, n = 3) {
  return hc.areas.filter((a) => a.score != null && a.status !== 'good').sort((a, b) => a.score - b.score).slice(0, n);
}

export function checksOf(clientId) { return store.all('checks').filter((x) => x.clientId === clientId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')); }

function saveCheck(client, hc) {
  const snap = Object.fromEntries(hc.areas.map((a) => [a.key, a.score]));
  store.put('checks', { clientId: client.id, date: todayISO(), score: hc.overall, areas: snap });
  if (!client.nextDate) store.put('clients', { ...store.get('clients', client.id), nextDate: todayISO(), nextText: 'ส่งสรุปผลตรวจ + แผนแนะนำ' });
  store.put('logs', { clientId: client.id, date: todayISO(), type: 'fhc', text: `ตรวจสุขภาพการเงิน: ${hc.overall}/100` });
}

export function resultView(p, { client, prev, onSave, onRedo } = {}) {
  const hc = healthCheck(p);
  const [lv, lvText, lvColor] = level(hc.overall);
  const gaps = gapsOf(hc);
  const r = recommend(p);
  const items = r.pkg.tiers[r.tier].items;
  return h('div.fhc-result',
    h('div.card.sr-card', scoreRing(hc.overall, lvColor), h('div', h('div.small.muted', 'สุขภาพการเงินของ' + (p.nick ? 'คุณ' + p.nick : 'ลูกค้า')), h('div.sr-level', { style: { color: lvColor } }, lv), h('div.small', lvText),
      prev ? h('div.sr-delta', { class: hc.overall >= prev.score ? 'up' : 'down' }, `ครั้งก่อน ${prev.score} → ตอนนี้ ${hc.overall} (${hc.overall >= prev.score ? '+' : ''}${hc.overall - prev.score})`) : null)),
    h('div.section', h('h2', 'ภาพรวม 8 ด้าน (แตะเพื่อดูรายละเอียด)'), h('div.card', mandalaGrid(p.nick, hc))),
    gaps.length ? h('div.section', h('h2', `${gaps.length} จุดที่ควรเติม`), h('div.gap-list', gaps.map((g, i) => h('button.gap', { onclick: () => areaSheet(g) },
      h('span.gn', i + 1), h('span.gt', h('b', g.label), h('span', FRIENDLY[g.key] || g.text)), h('span.gs.' + g.status, g.score))))) : h('div.callout.good', { style: { marginTop: '16px' } }, 'ทุกด้านอยู่ในเกณฑ์ดี 👍'),
    h('div.section', h('h2', 'แพ็กเกจที่แนะนำ'), h('div.card',
      h('div.row.between', h('b', { style: { fontSize: '17px' } }, `${r.pkg.name} · ${TIER_LABEL[r.tier]}`), r.budgetHint ? h('span.small.muted', `${fmt(r.budgetHint.lo)}–${fmt(r.budgetHint.hi)}/เดือน`) : null),
      h('div.row.wrap', { style: { gap: '6px', marginTop: '10px' } }, items.map((it) => PLAN[it.plan] ? h('a.chip', { href: '#/plan/' + it.plan }, h('span.dot', { style: { background: `var(--c-${PLAN[it.plan].cat})` } }), PLAN[it.plan].short) : null)),
      h('p.small.muted', { style: { marginTop: '10px' } }, r.reasons[0]))),
    h('div.fhc-actions',
      client ? [
        h('a.btn.primary', { href: '#/present/' + client.id }, icon('compass'), 'นำเสนอเต็มจอ'),
        h('button.btn.line-btn', { onclick: async () => { const m = await import('./present.js'); m.shareImage(p, r, r.tier); } }, icon('upload'), 'ส่งภาพทาง LINE'),
        h('button.btn', { onclick: async () => { const m = await import('./present.js'); const { copyText } = await import('../ui.js'); copyText(`ผลตรวจสุขภาพการเงิน: ${hc.overall ?? '—'}/100\n` + gapsOf(hc).slice(0, 3).map((g) => '• ' + g.label + ' — ' + (FRIENDLY[g.key] || g.text)).join('\n') + '\n\n' + m.shareText(p, r, r.tier)); } }, icon('copy'), 'คัดลอกข้อความสรุป'),
        h('a.btn', { href: `#/client/${client.id}/fhc/detail` }, icon('pen'), 'ใส่ตัวเลขละเอียด'),
        h('a.btn', { href: '#/client/' + client.id }, icon('user'), 'ไปหน้าลูกค้า'),
      ] : h('button.btn.primary', { onclick: onSave }, icon('check'), 'บันทึกเป็นลูกค้า'),
      onRedo ? h('button.btn.ghost', { onclick: onRedo }, icon('sync'), 'ตรวจใหม่') : null),
    h('p.xs.muted', { style: { marginTop: '12px' } }, 'ประเมินจากคำตอบแบบเร็ว — ใส่ตัวเลขละเอียดเพื่อความแม่นยำ · ใช้ประกอบการคุยเท่านั้น'));
}

/** ตรวจสุขภาพการเงินแบบเร็ว (ลูกค้าเดิม หรือคนใหม่) */
let shown = null; // ผลล่าสุดที่กำลังแสดง (คงไว้เมื่อหน้ารีเฟรชจากการบันทึก/ซิงก์)
export function renderCheck(id) {
  const client = id ? store.get('clients', id) : null;
  if (id && !client) { location.hash = '#/clients'; return null; }
  const area = h('div');
  const base = client ? { ...client, age: clientAge(client) ?? '' } : {};
  const key = id || 'new';
  if (shown && shown.key !== key) shown = null;
  const start = () => {
    shown = null;
    area.replaceChildren(wizard(quickSteps(!client), { ...base, haveKeys: client ? haveFrom(client) : [] }, {
      doneLabel: 'ดูผลตรวจ', autosave: 'fhc-' + key,
      onCancel: () => history.back(),
      onDone: (d) => {
        const merged = applyQuick(client || {}, d);
        const p = { ...merged, age: merged.age ?? clientAge(merged) };
        if (client) {
          const prev = checksOf(client.id).slice(-1)[0];
          shown = { key, p, prev };
          const saved = store.put('clients', merged);
          saveCheck(saved, healthCheck(p));
          showResult();
        } else {
          shown = { key, p, merged };
          showResult();
        }
        window.scrollTo({ top: 0 });
      },
    }));
  };
  function showResult() {
    if (client) area.replaceChildren(resultView(shown.p, { client: store.get('clients', id) || client, prev: shown.prev, onRedo: start }));
    else area.replaceChildren(resultView(shown.p, { onRedo: start, onSave: () => {
      const saved = store.put('clients', { ...shown.merged, stage: 'met', source: 'warm' });
      saveCheck(saved, healthCheck(shown.p)); shown = null; toast('บันทึกเป็นลูกค้าแล้ว'); location.hash = `#/client/${saved.id}`;
    } }));
  }
  if (shown) showResult(); else start();
  return h('div', { 'data-title': 'ตรวจสุขภาพการเงิน' },
    h('div.back-row', h('a.icon-btn', { href: client ? '#/client/' + id : '#/', 'aria-label': 'กลับ' }, icon('back')),
      h('div', h('h1', { style: { fontFamily: 'var(--serif)', fontSize: '22px' } }, 'ตรวจสุขภาพการเงิน'), h('div.small.muted', client ? 'คุณ' + client.nick + ' · แบบเร็ว 1–2 นาที' : 'ลูกค้าใหม่ · แบบเร็ว 1–2 นาที'))),
    area);
}

/** ประวัติการตรวจ (ใช้ในหน้าลูกค้า) */
export function historyView(clientId) {
  const list = checksOf(clientId);
  if (!list.length) return h('p.small.muted', 'ยังไม่เคยตรวจ — กด "ตรวจแบบเร็ว" ด้านบน');
  const first = list[0], last = list[list.length - 1];
  return h('div',
    list.length > 1 ? h('div.callout.good', { style: { marginBottom: '10px' } }, h('b', `ครั้งแรก ${first.score} → ล่าสุด ${last.score}`), ` (${last.score - first.score >= 0 ? '+' : ''}${last.score - first.score} คะแนน)`) : null,
    list.length > 1 ? h('div.card', lineChart({ x: list.map((c) => dateTH(c.date).replace(/ \d+$/, '')), series: [{ name: 'คะแนน', data: list.map((c) => c.score) }] })) : null,
    h('div.plist', { style: { marginTop: '10px' } }, [...list].reverse().map((c, i, arr) => {
      const before = arr[i + 1];
      return h('div.prow', { style: { cursor: 'default' } }, h('span.pi', { style: { background: 'var(--primary-soft)', color: 'var(--primary)' } }, h('b', c.score)),
        h('span.pt', h('b', dateTH(c.date, true)), h('span', before ? `${c.score - before.score >= 0 ? '+' : ''}${c.score - before.score} จากครั้งก่อน` : 'ครั้งแรก')));
    })));
}

// ── แบบละเอียด (ใส่ตัวเลขจริง) ─────────────────────────────
const money = (name, v, label, hint) => field(label, inputEl(name, v, { type: 'number', inputmode: 'numeric', min: 0, step: 1000 }), hint);

export function renderFHCDetail(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const out = h('div');
  const age = clientAge(c);
  const draw = (data) => {
    const hc = healthCheck({ ...data, age });
    out.replaceChildren(h('div.card', mandalaGrid(data.nick, hc)),
      h('p.source', `สมมติฐาน: สำรองฉุกเฉิน ${ASSUME.emergencyMonths} เดือน · ออม ≥${ASSUME.savingRate * 100}% · โรคร้าย = รายได้ ${ASSUME.ciYears} ปี · เกษียณ ${ASSUME.retireAge} ใช้เงิน ${ASSUME.retireReplace * 100}% ของค่าใช้จ่ายถึงอายุ ${ASSUME.lifeTo} · การศึกษาบุตรคนละ ${fmt(ASSUME.eduPerChild)} · อุบัติเหตุ ${fmt(ASSUME.paTarget)}`));
  };
  const f = h('form.form-grid', {
    oninput: () => draw({ ...c, ...readForm(f) }),
    onsubmit: (e) => { e.preventDefault(); const d = { ...c, ...readForm(f), fhcAt: new Date().toISOString() }; const saved = store.put('clients', d); saveCheck(saved, healthCheck({ ...saved, age })); toast('บันทึกผลตรวจแล้ว'); location.hash = '#/client/' + id; },
  },
    h('div.full', h('div.section', { style: { marginTop: 0 } }, h('h2', 'รายได้ & ค่าใช้จ่าย'))),
    money('incomeMonthly', c.incomeMonthly, 'รายได้ต่อเดือน'),
    money('monthlyExpense', c.monthlyExpense, 'ค่าใช้จ่ายต่อเดือน', 'ไม่ใส่ = ประมาณ 70% ของรายได้'),
    money('monthlySaving', c.monthlySaving, 'ออมต่อเดือน'),
    money('liquidSavings', c.liquidSavings, 'เงินออมที่ถอนได้ทันที'),
    money('debt', c.debt, 'หนี้คงค้างทั้งหมด'),
    h('div.full', h('div.section', h('h2', 'ความคุ้มครอง'))),
    money('lifeCover', c.lifeCover, 'ทุนประกันชีวิต (รวมประกันกลุ่ม)'),
    field('ประกันสุขภาพ', selectEl('healthLevel', c.healthLevel || 'none', HEALTH_LEVELS)),
    money('ciCover', c.ciCover, 'ทุนโรคร้ายแรง'),
    money('paCover', c.paCover, 'ทุนอุบัติเหตุ'),
    h('div.full', h('div.section', h('h2', 'เกษียณ · การศึกษา · ภาษี'))),
    money('retirementFund', c.retirementFund, 'เงินเพื่อเกษียณที่มีแล้ว', 'PVD / RMF / ประกันบำนาญ ฯลฯ'),
    money('monthlyRetireSaving', c.monthlyRetireSaving, 'ออมเพื่อเกษียณต่อเดือน'),
    money('eduFund', c.eduFund, 'ทุนการศึกษาลูกที่เตรียมแล้ว'),
    money('taxLifeUsed', c.taxLifeUsed, 'ใช้สิทธิประกันชีวิต/สุขภาพแล้วต่อปี', 'สูงสุด 100,000'),
    h('div.full', h('button.btn.primary.block', { type: 'submit' }, icon('check'), 'บันทึกผลตรวจ')));
  draw(c);
  return h('div', { 'data-title': 'ตรวจละเอียด ' + c.nick },
    h('div.back-row', h('a.icon-btn', { href: '#/client/' + id, 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1', { style: { fontFamily: 'var(--serif)', fontSize: '22px' } }, 'ตรวจแบบละเอียด'), h('div.small.muted', 'คุณ' + c.nick + ' · ใส่ตัวเลขจริง แมนฮาร่าอัปเดตทันที'))),
    h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' } }, h('div.card', f), out));
}

// ทางเข้าเดิม
export const renderFHC = renderCheck;
