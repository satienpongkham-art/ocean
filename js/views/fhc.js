// ─── ตรวจสุขภาพการเงิน (Financial Health Check) + แมนฮาร่า 8 ด้านของลูกค้า ───
import { h, icon, field, inputEl, selectEl, readForm, toast, sheet, fmt } from '../ui.js';
import * as store from '../store.js';
import { healthCheck, HEALTH_LEVELS, fmtM, ASSUME } from '../engine/needs.js';
import { CATEGORIES, PLANS, CAT } from '../../data/plans.js';
import { clientAge } from './clients.js';

// ตำแหน่งในตาราง 3×3 (ตรงกลาง = ลูกค้า)
const POS = ['life', 'health', 'ci', 'retire', null, 'accident', 'edu', 'saving', 'tax'];
const SUGGEST = {
  life: ['pay-life-plus', '20-pay-life', 'term'], health: ['health-happy', 'health-saver', 'health-starter'], ci: ['ci-plus', 'multipay-ci-plus', 'ci-procare'],
  accident: ['npa4600', 'npa3000'], saving: ['saving-sure', 'endowment-15-25'], retire: ['annuity-sure', 'saving-sure', 'protection-65'],
  edu: ['saving-sure', 'excellent'], tax: ['annuity-sure', 'saving-sure'],
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
  const plans = (SUGGEST[a.key] || []).map((id) => PLANS.find((p) => p.id === id)).filter(Boolean);
  sheet({
    title: a.label, sub: a.score == null ? 'ไม่เกี่ยวข้อง' : `คะแนน ${a.score}/100`,
    body: h('div.stack',
      h('p', a.text),
      a.need ? h('div.kv', h('div', h('span', 'มีอยู่'), h('b', fmtM(a.have))), h('div', h('span', 'ควรมี'), h('b', fmtM(a.need))), h('div', h('span', 'ขาด'), h('b', fmtM(Math.max(0, a.need - (a.have || 0)))))) : null,
      plans.length && a.status !== 'good' ? h('div', h('div.small.muted', { style: { marginBottom: '6px' } }, 'แผนที่ช่วยเติมช่องนี้'),
        h('div.row.wrap', { style: { gap: '6px' } }, plans.map((p) => h('a.chip', { href: '#/plan/' + p.id }, h('span.dot', { style: { background: `var(--c-${p.cat})` } }), p.short)))) : null),
  });
}

const money = (name, v, label, hint) => field(label, inputEl(name, v, { type: 'number', inputmode: 'numeric', min: 0, step: 1000 }), hint);

export function renderFHC(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const out = h('div');
  const age = clientAge(c);
  const draw = (data) => {
    const hc = healthCheck({ ...data, age });
    out.replaceChildren(
      h('div.card', mandalaGrid(data.nick, hc)),
      h('div.card', h('div.card-h', h('h3', 'สรุปรายด้าน')),
        h('ul.list', hc.areas.map((a) => h('li.row.between', { style: { alignItems: 'flex-start' } },
          h('div', h('b.small', a.label), h('div.xs.muted', a.text)),
          h('span.tag.' + ({ good: 'good', warn: 'warn', bad: 'bad', na: '' }[a.status]), a.score == null ? '—' : a.score))))),
      h('p.source', `สมมติฐาน: สำรองฉุกเฉิน ${ASSUME.emergencyMonths} เดือน · ออม ≥${ASSUME.savingRate * 100}% · โรคร้าย = รายได้ ${ASSUME.ciYears} ปี · เกษียณ ${ASSUME.retireAge} ใช้เงิน ${ASSUME.retireReplace * 100}% ของค่าใช้จ่ายถึงอายุ ${ASSUME.lifeTo} (ไม่คิดเงินเฟ้อ/ผลตอบแทน) · การศึกษาบุตรคนละ ${fmt(ASSUME.eduPerChild)} · อุบัติเหตุ ${fmt(ASSUME.paTarget)}`));
  };
  const f = h('form.form-grid', {
    oninput: () => draw({ ...c, ...readForm(f) }),
    onsubmit: (e) => { e.preventDefault(); store.put('clients', { ...c, ...readForm(f), fhcAt: new Date().toISOString() }); toast('บันทึกผลตรวจแล้ว'); location.hash = '#/client/' + id; },
  },
    h('div.full', h('div.section', { style: { marginTop: 0 } }, h('h2', 'รายได้ & ค่าใช้จ่าย'))),
    money('incomeMonthly', c.incomeMonthly, 'รายได้ต่อเดือน'),
    money('monthlyExpense', c.monthlyExpense, 'ค่าใช้จ่ายต่อเดือน', 'ไม่ใส่ = ประมาณ 70% ของรายได้'),
    money('monthlySaving', c.monthlySaving, 'ออมต่อเดือน'),
    money('liquidSavings', c.liquidSavings, 'เงินออมที่ถอนได้ทันที'),
    money('debt', c.debt, 'หนี้คงค้างทั้งหมด'),
    field('จำนวนลูก', inputEl('kids', c.kids ?? 0, { type: 'number', inputmode: 'numeric', min: 0 })),
    field('อายุลูกคนเล็ก', inputEl('youngestKidAge', c.youngestKidAge, { type: 'number', inputmode: 'numeric', min: 0 })),
    field('สถานภาพ', selectEl('marital', c.marital || 'single', [['single', 'โสด'], ['married', 'สมรส/มีคู่']])),
    h('div.full', h('div.section', h('h2', 'ความคุ้มครอง'))),
    money('lifeCover', c.lifeCover, 'ทุนประกันชีวิต (รวมทุกกรมธรรม์ + ประกันกลุ่ม)'),
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
  return h('div', { 'data-title': 'ตรวจสุขภาพการเงิน ' + c.nick },
    h('div.topbar', h('div', h('a.crumb', { href: '#/client/' + id }, icon('back'), c.nick), h('h1', 'ตรวจสุขภาพการเงิน'), h('div.sub', 'กรอกแล้วแมนฮาร่าอัปเดตทันที — แตะช่องเพื่อดูแผนที่ช่วยเติม'))),
    h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' } }, h('div.card', f), out));
}
