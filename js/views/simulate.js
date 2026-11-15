// ─── จำลองเหตุการณ์: ถ้าป่วย/นอนโรงพยาบาล/อุบัติเหตุ/ทุพพลภาพ/เสียชีวิต วันนี้ ต้องจ่ายเองเท่าไร ───
// ตัวเลขค่ารักษาเป็น "ประมาณการ" ตั้งต้น — แก้ได้ทุกช่อง เพื่อใช้คุยกับลูกค้า ไม่ใช่ใบเสนอราคา
import { h, icon, choices, fmt, copyText, more } from '../ui.js';
import * as store from '../store.js';
import { lifeNeed, ciNeed, fmtM } from '../engine/needs.js';
import { clientAge } from './clients.js';
import { profile } from '../app.js';

export const TIER = {
  gov: { name: 'โรงพยาบาลรัฐ', ipdDay: 6000, cancer: 500000, accident: 60000 },
  pri: { name: 'เอกชนทั่วไป', ipdDay: 20000, cancer: 2000000, accident: 200000 },
  prem: { name: 'เอกชนพรีเมียม', ipdDay: 40000, cancer: 3500000, accident: 350000 },
};
const HEALTH_LIMIT = { none: 0, welfare: 300000, basic: 500000, good: 1000000 };
export const SCENARIOS = [
  { id: 'ci', name: 'ป่วยมะเร็ง / โรคร้าย', icon: 'cat-ci' },
  { id: 'ipd', name: 'นอนโรงพยาบาล', icon: 'cat-hb' },
  { id: 'acc', name: 'อุบัติเหตุ ผ่าตัด', icon: 'cat-accident' },
  { id: 'tpd', name: 'ทุพพลภาพถาวร', icon: 'cat-senior' },
  { id: 'death', name: 'เสียชีวิต', icon: 'cat-life' },
];

/** คำนวณ: คืน { lines: [[ชื่อ, จำนวน]], cost, paid: [[จาก, จำนวน]], own } */
export function simulate(sc, x, cov) {
  const inc = +x.income || 0;
  const health = (cost) => Math.min(cost, +cov.health || 0);
  if (sc === 'ci') {
    const med = +x.cost, lost = inc * (+x.months || 0);
    const h1 = health(med); const ci = Math.min(+cov.ci || 0, med - h1 + lost);
    return { lines: [['ค่ารักษา', med], [`รายได้ที่หายไป ${x.months} เดือน`, lost]], cost: med + lost, paid: [['ประกันสุขภาพ', h1], ['เงินก้อนโรคร้ายแรง', ci]] };
  }
  if (sc === 'ipd') {
    const med = +x.dayCost * (+x.days || 0), lost = Math.round(inc / 30 * (+x.days || 0));
    const h1 = health(med); const hb = Math.min((+cov.hb || 0) * (+x.days || 0), med - h1 + lost);
    return { lines: [[`ค่ารักษา ${x.days} วัน`, med], ['รายได้ที่หายไป', lost]], cost: med + lost, paid: [['ประกันสุขภาพ', h1], ['ชดเชยรายวัน', hb]] };
  }
  if (sc === 'acc') {
    const med = +x.cost, lost = inc * (+x.months || 0);
    const h1 = health(med); const hb = Math.min((+cov.hb || 0) * 7, med - h1 + lost);
    return { lines: [['ค่าผ่าตัด/รักษา', med], [`หยุดงาน ${x.months} เดือน`, lost]], cost: med + lost, paid: [['ประกันสุขภาพ', h1], ['ชดเชยรายวัน (7 วัน)', hb]] };
  }
  if (sc === 'tpd') {
    const yrs = Math.max(0, 60 - (+x.age || 35)); const lost = inc * 12 * yrs;
    const pa = Math.min(+cov.pa || 0, lost); const life = Math.min(+cov.tpd || 0, lost - pa);
    return { lines: [[`รายได้ที่หายไปจนถึงอายุ 60 (${yrs} ปี)`, lost]], cost: lost, paid: [['อุบัติเหตุ (ทุพพลภาพ)', pa], ['ทุนที่จ่ายกรณีทุพพลภาพ', life]] };
  }
  const need = +x.familyNeed || 0;
  return { lines: [['ภาระที่ครอบครัวต้องใช้ (ค่าใช้จ่าย หนี้ การศึกษาลูก)', need]], cost: need, paid: [['ทุนประกันชีวิต', Math.min(+cov.life || 0, need)]] };
}
const own = (r) => Math.max(0, r.cost - r.paid.reduce((t, [, v]) => t + v, 0));

const st = { sc: 'ci', tier: 'pri' };
export function renderSimulate(clientId) {
  const c = clientId ? store.get('clients', clientId) : null;
  const p = c ? { ...c, age: clientAge(c) } : {};
  const T = TIER[st.tier];
  const x = { income: +p.incomeMonthly || 30000, age: p.age ?? 35, cost: st.sc === 'acc' ? T.accident : T.cancer, months: st.sc === 'acc' ? 2 : 12, days: 7, dayCost: T.ipdDay, familyNeed: c ? lifeNeed(p).need || 3000000 : 3000000 };
  const lvl = c?.healthLevel || 'none';
  const covNow = { health: c?.benefits?.year || HEALTH_LIMIT[lvl], ci: +c?.ciCover || 0, hb: +c?.hbDaily || 0, pa: +c?.paCover || 0, tpd: 0, life: +c?.lifeCover || 0 };
  const sugg = { health: Math.max(covNow.health, st.tier === 'gov' ? 1000000 : st.tier === 'pri' ? 5000000 : 15000000), ci: Math.max(covNow.ci, c ? ciNeed(p).need : 1000000), hb: Math.max(covNow.hb, Math.round((x.income / 30) / 500) * 500 || 1000), pa: Math.max(covNow.pa, 1000000), tpd: covNow.tpd, life: Math.max(covNow.life, x.familyNeed) };
  const covNew = { ...sugg };

  const out = h('div', { 'aria-live': 'polite' });
  const draw = () => {
    const a = simulate(st.sc, x, covNow), b = simulate(st.sc, x, covNew);
    const oa = own(a), ob = own(b);
    const months = x.income ? oa / x.income : 0;
    const bar = (r, o) => { const tot = Math.max(1, r.cost); const pd = r.cost - o;
      return h('div.sim-bar', { role: 'img', 'aria-label': `ค่าใช้จ่าย ${fmt(r.cost)} บาท ประกันจ่าย ${fmt(pd)} บาท ต้องจ่ายเอง ${fmt(o)} บาท` },
        h('i.paid', { style: { width: (pd / tot) * 100 + '%' } }), h('i.own', { style: { width: (o / tot) * 100 + '%' } })); };
    out.replaceChildren(
      h('div.sim-headline', h('span', st.sc === 'death' ? `ถ้าเสียชีวิตวันนี้ ครอบครัว${c ? 'ของคุณ' + c.nick : ''}ต้องรับภาระเองประมาณ` : st.sc === 'tpd' ? `ถ้าทุพพลภาพวันนี้ รายได้ที่หายไปโดยไม่มีใครจ่ายแทนประมาณ` : `ถ้า${SCENARIOS.find((s) => s.id === st.sc).name}วันนี้${c ? ' คุณ' + c.nick : ''}ต้องจ่ายเองประมาณ`), h('b', fmt(oa) + ' บาท'),
        x.income && oa ? h('small', `≈ รายได้ ${months >= 1 ? fmt(months, months < 10 ? 1 : 0) + ' เดือน' : 'ไม่ถึง 1 เดือน'}`) : null),
      h('div.card.sim-card',
        h('div.sim-row', h('div.sim-lab', h('b', 'ตอนนี้'), h('span', 'ความคุ้มครองที่มี')), bar(a, oa), h('div.sim-own', h('span.bad', fmt(oa)), h('small', 'จ่ายเอง'))),
        h('div.sim-row', h('div.sim-lab', h('b', 'ถ้าเพิ่มแผน'), h('span', 'ตามค่าที่ตั้งด้านล่าง')), bar(b, ob), h('div.sim-own', h('span.good', fmt(ob)), h('small', 'จ่ายเอง'))),
        h('div.sim-legend', h('span', h('i.paid'), 'ประกันจ่าย'), h('span', h('i.own'), 'ต้องจ่ายเอง')),
        oa > ob ? h('div.callout.good', { style: { marginTop: '10px' } }, h('b', `ลดภาระลง ${fmt(oa - ob)} บาท`)) : null),
      h('div.card', h('b', 'รายละเอียดค่าใช้จ่าย'), h('div.kvlist', { style: { marginTop: '6px' } }, [...a.lines.map(([k, v]) => h('div', h('span', k), h('b', fmt(v)))), h('div', h('span', 'รวม'), h('b', fmt(a.cost)))]),
        h('div.small.muted', { style: { marginTop: '8px' } }, 'ตอนนี้ประกันจ่าย: ' + a.paid.map(([k, v]) => `${k} ${fmt(v)}`).join(' · '))));
  };
  const inp = (obj, k, label, step = 1000) => h('label.f', h('span', label), h('input.input', { type: 'number', inputmode: 'numeric', min: 0, step, value: obj[k], oninput: (e) => { obj[k] = +e.target.value || 0; draw(); } }));
  const params = {
    ci: [inp(x, 'cost', 'ค่ารักษาโดยประมาณ (บาท)', 50000), inp(x, 'months', 'หยุดงานกี่เดือน', 1), inp(x, 'income', 'รายได้ต่อเดือน (บาท)')],
    ipd: [inp(x, 'days', 'นอนกี่วัน', 1), inp(x, 'dayCost', 'ค่ารักษาต่อวัน (บาท)', 1000), inp(x, 'income', 'รายได้ต่อเดือน (บาท)')],
    acc: [inp(x, 'cost', 'ค่าผ่าตัด/รักษา (บาท)', 10000), inp(x, 'months', 'หยุดงานกี่เดือน', 1), inp(x, 'income', 'รายได้ต่อเดือน (บาท)')],
    tpd: [inp(x, 'age', 'อายุตอนนี้', 1), inp(x, 'income', 'รายได้ต่อเดือน (บาท)')],
    death: [inp(x, 'familyNeed', 'ภาระครอบครัว (บาท)', 100000)],
  }[st.sc];
  const covFields = { ci: [['health', 'วงเงินประกันสุขภาพ/ปี'], ['ci', 'เงินก้อนโรคร้ายแรง']], ipd: [['health', 'วงเงินประกันสุขภาพ/ปี'], ['hb', 'ชดเชยรายวัน (บาท/วัน)']], acc: [['health', 'วงเงินประกันสุขภาพ/ปี'], ['hb', 'ชดเชยรายวัน (บาท/วัน)']], tpd: [['pa', 'ทุนอุบัติเหตุ (ทุพพลภาพ)'], ['tpd', 'ทุนที่จ่ายกรณีทุพพลภาพ (TPD)']], death: [['life', 'ทุนประกันชีวิต']] }[st.sc];
  draw();
  const text = () => { const a = simulate(st.sc, x, covNow), b = simulate(st.sc, x, covNew);
    return `จำลองเหตุการณ์: ${SCENARIOS.find((s) => s.id === st.sc).name}${c ? ' (คุณ' + c.nick + ')' : ''}\nค่าใช้จ่ายรวมประมาณ ${fmt(a.cost)} บาท\nความคุ้มครองที่มีตอนนี้ → จ่ายเอง ${fmt(own(a))} บาท\nถ้าเพิ่มแผน → จ่ายเอง ${fmt(own(b))} บาท\n(ตัวเลขประมาณการเพื่อประกอบการวางแผน ไม่ใช่ใบเสนอราคา)\n— ${profile().name} ${profile().title}`; };

  return h('div', { 'data-title': 'จำลองเหตุการณ์' },
    h('div.back-row', h('a.icon-btn', { href: c ? '#/client/' + c.id : '#/plans/tools', 'aria-label': 'กลับ' }, icon('back')), h('div', { style: { flex: 1 } }, h('h1.serif', { style: { fontSize: '22px' } }, 'จำลองเหตุการณ์'), h('div.small.muted', c ? 'คุณ' + c.nick + ' · ตัวเลขประมาณการ แก้ได้ทุกช่อง' : 'ตัวเลขประมาณการ แก้ได้ทุกช่อง · เปิดจากหน้าลูกค้าจะดึงความคุ้มครองที่มีให้')),
      h('button.btn.sm', { onclick: () => copyText(text()), 'aria-label': 'คัดลอกข้อความสรุป' }, icon('copy'), 'ข้อความ')),
    h('div.sim-tabs', { role: 'tablist' }, SCENARIOS.map((s) => h('button', { role: 'tab', 'aria-selected': String(st.sc === s.id), class: st.sc === s.id ? 'on' : '', onclick: () => { st.sc = s.id; import('../app.js').then((m) => m.rerender()); } }, icon(s.icon), h('span', s.name)))),
    ['ci', 'ipd', 'acc'].includes(st.sc) ? h('div.q', { style: { marginTop: '12px' } }, h('span.ql', 'รักษาที่'), choices('tier', st.tier, Object.entries(TIER).map(([k, v]) => [k, v.name]), { onChange: (v) => { st.tier = v; import('../app.js').then((m) => m.rerender()); } })) : null,
    out,
    h('div.card', { style: { marginTop: '12px' } }, h('b', 'ถ้าเพิ่มแผน (ปรับได้)'), h('div.form-grid', { style: { marginTop: '8px' } }, covFields.map(([k, l]) => inp(covNew, k, l, k === 'hb' ? 500 : 100000))),
      h('div.small.muted', 'ตอนนี้มี: ' + covFields.map(([k, l]) => `${l} ${fmtM(covNow[k])}`).join(' · '))),
    more('ปรับสมมติฐานค่าใช้จ่าย', h('div.form-grid', params)),
    h('p.source', { style: { marginTop: '12px' } }, 'ค่ารักษาตั้งต้นเป็นประมาณการทั่วไป (รัฐ / เอกชน / พรีเมียม) แก้ให้ตรงกับโรงพยาบาลที่ลูกค้าใช้ได้ · วงเงินที่มีอยู่คิดจากข้อมูลลูกค้า (ระดับประกันสุขภาพ ทุนโรคร้าย ทุนชีวิต) · ไม่ใช่ใบเสนอราคาหรือการรับประกันผลประโยชน์'));
}
