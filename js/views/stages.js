// ─── ชุดแผนตามช่วงวัย + เทียบ "มี กับ ไม่มีประกัน" จากบิลจริง ───
import { h, icon, fmt, toast } from '../ui.js';
import { PLANS, PLAN, CAT } from '../../data/plans.js';
import { STAGES } from '../../data/facts.js';
import { illus } from '../illus.js';
import { setBasket } from '../basket.js';
import { rerender } from '../app.js';

const pickOf = {}; // เก็บแผนที่เลือกในแต่ละช่วงวัย
const defPlan = (cat) => (PLANS.find((p) => p.cat === cat && p.star) || PLANS.find((p) => p.cat === cat))?.id;
const back = (t, sub) => h('div', h('div.back-row', h('a.icon-btn', { href: '#/plans', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, t)), sub ? h('p.muted', { style: { margin: '0 0 12px' } }, sub) : null);
export function renderStages() {
  return h('div', { 'data-title': 'ชุดแผนตามช่วงวัย' }, back('ชุดแผนตามช่วงวัย', 'เลือกช่วงวัยของลูกค้า ได้ชุดความคุ้มครองตั้งต้น ปรับแผนในแต่ละหมวดได้ แล้วเปิดคิดเบี้ยหรือทำสรุปต่อ'),
    h('div.sg-list', STAGES.map((s) => { const sel = (pickOf[s.id] ||= Object.fromEntries(s.needs.map(([c]) => [c, defPlan(c)]))); const ids = () => s.needs.map(([c]) => sel[c]).filter(Boolean);
      return h('div.card.sg-i', h('div.sg-h', illus(s.art, { size: 92 }), h('div', h('span.sg-age', s.age), h('h2', s.name), h('p', s.why))),
        h('div.sg-needs', s.needs.map(([c, why]) => { const opts = PLANS.filter((p) => p.cat === c); return h('div.sg-n.cat-' + c, h('span.sg-ic', icon('cat-' + c)), h('div', h('b', CAT[c].name), h('small', why),
          opts.length ? h('select.input.sm-sel', { 'aria-label': 'แผนในหมวด ' + CAT[c].name, onchange: (e) => { sel[c] = e.target.value; } }, opts.map((p) => h('option', { value: p.id, selected: sel[c] === p.id }, p.short + (p.kind === 'rider' ? ' (แนบ)' : '')))) : h('small.muted', 'ยังไม่มีแผนในหมวดนี้'))); })),
        h('div.row.wrap', { style: { gap: '8px' } }, h('button.btn.primary', { style: { flex: 1 }, onclick: () => { setBasket(ids()); location.hash = '#/plans/build?basket=1'; } }, icon('grid'), 'ต่อชุด & คิดเบี้ย'),
          h('a.btn', { style: { flex: 1 }, href: '#/sheet/' + ids().join(','), onclick: (e) => { e.currentTarget.href = '#/sheet/' + ids().join(','); } }, icon('doc'), 'สรุปหน้าเดียว'))); })),
    h('p.source', 'เป็นแนวทางตั้งต้นตามช่วงวัย ความเหมาะสมจริงขึ้นกับรายได้ ภาระ และสุขภาพของแต่ละคน · สัญญาเพิ่มเติมต้องแนบกับสัญญาหลัก'));
}

const ww = { bill: 180000, paid: 150000, prem: 25000, what: 'ผ่าตัดไส้ติ่ง นอนโรงพยาบาล 3 คืน' };
export function renderWW() {
  const own = Math.max(0, ww.bill - ww.paid); const yrs = ww.prem ? ww.bill / ww.prem : 0; const mx = Math.max(1, ww.bill);
  const num = (k, l, hint) => h('label.f', h('span', l), h('input.input', { type: 'number', inputmode: 'numeric', min: 0, step: 1000, value: ww[k], onchange: (e) => { ww[k] = +e.target.value || 0; rerender(); } }), hint ? h('small.muted', hint) : null);
  const toPost = () => import('./studio.js').then((m) => { const x = m.createItem({ cat: 'protect', tag: 'เคสจริง', topic: 'ค่ารักษาพยาบาล', slides: [
    { kind: 'cover', kicker: 'จากบิลจริง (ไม่ระบุชื่อ)', title: `${ww.what} ค่าใช้จ่ายเท่าไร?`, body: 'มีประกัน กับ ไม่มีประกัน จ่ายต่างกันแค่ไหน', art: 'heart' },
    { kind: 'stat', kicker: 'ค่ารักษาตามบิล', value: fmt(ww.bill), title: 'บาท', body: ww.what },
    { kind: 'bar', title: 'เงินที่ต้องจ่ายเอง', bars: [{ l: 'ไม่มีประกัน', v: ww.bill }, { l: 'มีประกันสุขภาพ', v: own }], unit: 'บาท', hi: 0, note: 'จากบิลจริง 1 เคส ผลของแต่ละคนขึ้นกับแผนและเงื่อนไขกรมธรรม์' },
    { kind: 'stat', kicker: 'ค่ารักษาครั้งนี้ เท่ากับเบี้ยประกัน', value: yrs.toFixed(1) + ' ปี', title: `ที่เบี้ยปีละ ${fmt(ww.prem)} บาท`, body: 'เราจ่ายเบี้ยก้อนเล็ก เพื่อไม่ต้องจ่ายก้อนใหญ่ในวันที่ไม่ได้เลือก' },
    { kind: 'cta', title: 'อยากรู้ว่าแผนของคุณจ่ายได้เท่าไร?', body: 'ส่งกรมธรรม์มาให้ช่วยดูได้ ไม่มีค่าใช้จ่ายในการปรึกษา' }] }, { title: `มี vs ไม่มีประกัน: ${ww.what}`, pillar: 'protect' }); location.hash = '#/studio/' + x.id; });
  return h('div', { 'data-title': 'มี vs ไม่มีประกัน' }, back('มี กับ ไม่มีประกัน', 'ใส่ตัวเลขจากบิลจริงและยอดที่ประกันจ่ายจริง เพื่อให้ลูกค้าเห็นภาพ (ไม่ใส่ชื่อผู้ป่วย)'),
    h('div.card', h('label.f', h('span', 'เหตุการณ์'), h('input.input', { value: ww.what, onchange: (e) => { ww.what = e.target.value; rerender(); } })),
      h('div.form-grid', num('bill', 'ค่ารักษาตามบิล (บาท)'), num('paid', 'ประกันจ่าย (บาท)', 'จากใบแจ้งผลเคลม หรือประเมินตามตารางผลประโยชน์'), num('prem', 'เบี้ยประกันสุขภาพต่อปี (บาท)'))),
    h('div.card.ww-res', { style: { marginTop: '12px' } }, h('div.ww-row', h('span', 'ไม่มีประกัน จ่ายเอง'), h('b', fmt(ww.bill)), h('i', { style: { width: '100%' } })),
      h('div.ww-row.ok', h('span', 'มีประกัน จ่ายเอง'), h('b', fmt(own)), h('i', { style: { width: Math.max(2, own / mx * 100) + '%' } })),
      h('p', `ประกันช่วยจ่าย ${fmt(Math.min(ww.paid, ww.bill))} บาท คิดเป็น ${Math.round(Math.min(ww.paid, ww.bill) / mx * 100)}% ของบิล`, ww.prem ? ` · ค่ารักษาครั้งนี้เท่ากับเบี้ย ${yrs.toFixed(1)} ปี` : '')),
    h('div.row.wrap', { style: { gap: '8px', marginTop: '12px' } }, h('button.btn.primary', { style: { flex: 1 }, onclick: toPost }, icon('pen'), 'ทำเป็นโพสต์'), h('a.btn', { style: { flex: 1 }, href: '#/plans/stages' }, 'ดูชุดแผนตามช่วงวัย')),
    h('p.source', 'ใช้ตัวเลขจริงที่ได้รับอนุญาตให้ใช้เท่านั้น และไม่เปิดเผยตัวตนของผู้ป่วย · ความคุ้มครองเป็นไปตามเงื่อนไขกรมธรรม์'));
}
