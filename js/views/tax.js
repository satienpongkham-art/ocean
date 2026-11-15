// ─── คำนวณภาษี & ภาษีที่ประหยัดได้จากเบี้ยประกัน ───
import { h, icon, field, inputEl, selectEl, readForm, fmt } from '../ui.js';
import * as store from '../store.js';
import { computeTax, compareWithInsurance, RULES } from '../engine/tax.js';

const money = (name, v, label, hint) => field(label, inputEl(name, v, { type: 'number', inputmode: 'numeric', min: 0, step: 1000 }), hint);

export function renderTax(q = {}) {
  const c = q.client ? store.get('clients', q.client) : null;
  const init = { income: c?.incomeMonthly ? c.incomeMonthly * 12 : 600000, socialSecurity: 9000, spouse: c?.marital === 'married' ? '0' : '0', children: c?.kids || 0, children2561: 0, parents: 0 };
  const out = h('div.stack');
  const draw = (v) => {
    const base = { ...v, spouse: v.spouse === '1' };
    const add = { life: v.addLife, healthSelf: v.addHealth, annuity: v.addAnnuity, parentHealth: v.addParent };
    const cmp = compareWithInsurance(base, add);
    const b = cmp.before, a = cmp.after;
    const totalAdd = (+v.addLife || 0) + (+v.addHealth || 0) + (+v.addAnnuity || 0) + (+v.addParent || 0);
    out.replaceChildren(
      h('div.card',
        h('div.small.muted', 'ภาษีที่ประหยัดได้จากเบี้ยที่ซื้อเพิ่ม'),
        h('div', { style: { fontFamily: 'var(--serif)', fontSize: '38px', fontWeight: 700, color: 'var(--good)', lineHeight: 1.2 } }, fmt(cmp.saved) + ' บาท'),
        totalAdd ? h('p.small', `จ่ายเบี้ยเพิ่ม ${fmt(totalAdd)} บาท ได้ภาษีคืน/ลดลง ${fmt(cmp.saved)} บาท ≈ ${fmt((cmp.saved / totalAdd) * 100, 1)}% ของเบี้ย`) : h('p.small.muted', 'ใส่เบี้ยที่จะซื้อเพิ่มด้านซ้าย เพื่อดูภาษีที่ลดลง'),
        h('div.kv', { style: { marginTop: '12px' } },
          h('div', h('span', 'ภาษีก่อนซื้อ'), h('b', fmt(b.tax))), h('div', h('span', 'ภาษีหลังซื้อ'), h('b', fmt(a.tax))),
          h('div', h('span', 'ฐานภาษีสูงสุด'), h('b', Math.round(b.marginal * 100) + '%')), h('div', h('span', 'อัตราภาษีจริง'), h('b', fmt(a.effective * 100, 2) + '%')))),
      h('div.card',
        h('div.card-h', h('h3', 'สิทธิประกันที่ยังเหลือ (หลังซื้อ)')),
        h('ul.list.small',
          h('li.row.between', h('span', 'ประกันชีวิต + สุขภาพ (รวม ≤100,000)'), h('b', fmt(a.ins.unusedLifeHealth))),
          h('li.row.between', h('span', `บำนาญ (≤15% ของเงินได้ ≤200,000)`), h('b', fmt(a.ins.unusedAnnuity))),
          h('li.row.between', h('span', 'สุขภาพพ่อแม่ (≤15,000)'), h('b', fmt(Math.max(0, RULES.parentHealthMax - a.ins.parentHealth)))))),
      h('div.card',
        h('div.card-h', h('h3', 'รายละเอียดการคำนวณ (หลังซื้อ)')),
        h('div.table-wrap', h('table.t', h('tbody',
          [['เงินได้ทั้งปี', a.income], ['หักค่าใช้จ่าย 50% (≤100,000)', -a.expense], ['ลดหย่อนส่วนตัว/ครอบครัว', -a.family],
            ['ประกันชีวิต', -a.ins.life], ['ประกันสุขภาพตนเอง', -a.ins.healthSelf], ['บำนาญ (ใช้ในสิทธิประกันชีวิต)', -a.ins.annuityInLife], ['บำนาญ (หมวดบำนาญ)', -a.ins.annuity],
            ['ประกันชีวิตคู่สมรส', -a.ins.spouseLife], ['ประกันสุขภาพพ่อแม่', -a.ins.parentHealth], ['ประกันสังคม/ดอกเบี้ยบ้าน/กองทุน/อื่น ๆ', -a.others],
            ['เงินได้สุทธิ', a.net], ['ภาษี', a.tax]].filter(([, x]) => x !== 0 || true).map(([l, x], i, arr) => h('tr', { style: i >= arr.length - 2 ? { fontWeight: 600 } : null }, h('td', l), h('td.r.num', fmt(x)))))))),
      h('p.source', `ประมาณการตามเกณฑ์กรมสรรพากร (เงินเดือน 40(1)) — เบี้ยประกันชีวิตต้องเป็นกรมธรรม์ 10 ปีขึ้นไป · สุขภาพตนเอง ≤25,000 รวมกับชีวิต ≤100,000 · บำนาญ ≤15% ของเงินได้ ≤200,000 และรวมกลุ่มเกษียณ ≤500,000 · ต้องแจ้งบริษัทประกันให้ส่งข้อมูลให้กรมสรรพากร · ยื่นจริงตามหนังสือรับรอง`));
  };
  const f = h('form.form-grid', { oninput: () => draw(readForm(f)), onsubmit: (e) => e.preventDefault() },
    h('div.full', h('div.section', { style: { marginTop: 0 } }, h('h2', 'ข้อมูลผู้เสียภาษี'))),
    money('income', init.income, 'เงินได้ทั้งปี (เงินเดือน+โบนัส)'),
    money('socialSecurity', init.socialSecurity, 'ประกันสังคมที่จ่ายทั้งปี', 'ตามจริงในสลิป'),
    field('คู่สมรสไม่มีเงินได้', selectEl('spouse', init.spouse, [['0', 'ไม่ใช่ / โสด'], ['1', 'ใช่']])),
    field('จำนวนบุตร', inputEl('children', init.children, { type: 'number', inputmode: 'numeric', min: 0 })),
    field('บุตรคนที่ 2+ เกิดตั้งแต่ 2561', inputEl('children2561', 0, { type: 'number', inputmode: 'numeric', min: 0 })),
    field('บิดามารดาที่อุปการะ (≤4)', inputEl('parents', 0, { type: 'number', inputmode: 'numeric', min: 0, max: 4 })),
    money('otherRetirement', 0, 'PVD / RMF / SSF / กบข. ที่ใช้สิทธิแล้ว'),
    money('homeLoanInterest', 0, 'ดอกเบี้ยบ้าน (≤100,000)'),
    money('otherDeductions', 0, 'ลดหย่อนอื่น ๆ'),
    h('div.full', h('div.section', h('h2', 'เบี้ยประกันที่มีอยู่แล้ว (ต่อปี)'))),
    money('life', 0, 'ประกันชีวิต'),
    money('healthSelf', 0, 'ประกันสุขภาพตนเอง'),
    money('annuity', 0, 'ประกันบำนาญ'),
    money('parentHealth', 0, 'ประกันสุขภาพพ่อแม่'),
    money('spouseLife', 0, 'ประกันชีวิตคู่สมรส (ไม่มีเงินได้)'),
    h('div.full', h('div.section', h('h2', 'เบี้ยที่จะซื้อเพิ่ม (ต่อปี)'))),
    money('addLife', 0, 'ประกันชีวิต / ออมทรัพย์'),
    money('addHealth', 0, 'ประกันสุขภาพตนเอง'),
    money('addAnnuity', 0, 'ประกันบำนาญ'),
    money('addParent', 0, 'ประกันสุขภาพพ่อแม่'));
  draw(readForm(f));
  return h('div', { 'data-title': 'คำนวณภาษี' },
    h('div.topbar', h('div', h('a.crumb', { href: c ? '#/client/' + c.id : '#/tools' }, icon('back'), c ? c.nick : 'เครื่องมือ'), h('h1', 'คำนวณภาษี'), h('div.sub', `ปีภาษี ${RULES.year} · ดูว่าเบี้ยประกันช่วยลดภาษีได้เท่าไหร่`))),
    h('div.grid.g2', { style: { alignItems: 'start' } }, h('div.card', f), out));
}
