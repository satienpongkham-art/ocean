// ─── ตัวช่วยเลือกแผน 3 คำถาม ───
import { h, icon, choices } from '../ui.js';
import { PLANS, CAT } from '../../data/plans.js';
import { attachInfo } from '../../data/rules.js';
import { PLAN } from '../../data/plans.js';
import { ageRange } from './plans.js';
import { illus } from '../illus.js';

const AT = attachInfo(PLANS, PLAN);
const CONCERNS = [['med', 'ค่ารักษาพยาบาล', ['health']], ['ci', 'โรคร้ายแรง', ['ci']], ['income', 'รายได้หายตอนป่วย', ['hb', 'ci']], ['family', 'ดูแลครอบครัวถ้าไม่อยู่', ['life']],
  ['save', 'ออมเงิน / เกษียณ', ['saving', 'annuity']], ['acc', 'อุบัติเหตุ', ['accident']], ['tax', 'ลดหย่อนภาษี', ['annuity', 'life', 'health']]];
const BUDGET = [['s', 'ไม่เกิน 500/เดือน'], ['m', '500–1,500'], ['l', '1,500–3,000'], ['x', '3,000 ขึ้นไป']];
const st = { concerns: [], budget: 'm', welfare: 'none', age: 35 };

export function pick({ concerns, budget, welfare, age }) {
  const cats = concerns.flatMap((k) => CONCERNS.find((c) => c[0] === k)?.[2] || []);
  const score = (p) => {
    let s = 0; const ci = cats.indexOf(p.cat); if (ci < 0) return -1; s += 6 - Math.min(ci, 4);
    if (p.star) s += 2;
    if (['s', 'm'].includes(budget) && ['saving', 'annuity'].includes(p.cat)) s -= 4;
    if (budget === 's' && ['hb', 'accident', 'ci'].includes(p.cat)) s += 1;
    if (welfare === 'group' && p.cat === 'ci') s += 1;
    const r = ageRange(p); if (r && (age < r.lo || age > r.hi)) return -1;
    return s;
  };
  const ranked = PLANS.map((p) => ({ p, s: score(p) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s);
  const out = []; const used = new Set();
  for (const x of ranked) { if (out.length >= 3) break; if (used.has(x.p.cat) && ranked.some((y) => !used.has(y.p.cat) && y.s >= 0 && !out.includes(y))) continue; out.push(x); used.add(x.p.cat); }
  for (const x of ranked) { if (out.length >= 3) break; if (!out.includes(x)) out.push(x); }
  return out.map((x) => x.p);
}

export function renderFinder() {
  const res = h('div', { 'aria-live': 'polite' });
  const draw = () => {
    if (!st.concerns.length) { res.replaceChildren(h('p.small.muted', { style: { marginTop: '12px' } }, 'เลือกเรื่องที่กังวลอย่างน้อย 1 ข้อ แล้วผลจะขึ้นทันที')); return; }
    const list = pick(st);
    res.replaceChildren(h('div.section', h('h2', `แผนที่น่าจะเหมาะ ${list.length} แผน`),
      list.length ? h('div.find-list', list.map((p, i) => h('a.find-card.cat-' + p.cat, { href: '#/plan/' + p.id },
        h('span.fc-n', i + 1), illus(p.cat, { size: 64 }),
        h('div', h('div.small', { style: { color: 'var(--cc)', fontWeight: 600 } }, CAT[p.cat].name), h('b', p.short), h('p.small', p.tagline),
          h('p.small.muted', 'เหตุผล: ' + (p.bestFor?.[0] || '')), p.kind === 'rider' ? h('p.xs.muted', 'แนบกับ: ' + AT.mustText(p)) : null), icon('next')))) : h('p.small.muted', 'ไม่พบแผนที่รับอายุนี้ในหมวดที่เลือก')),
      h('p.source', 'เป็นการคัดเบื้องต้นจากข้อมูลแผน — ตรวจสุขภาพการเงินจะได้คำแนะนำที่ละเอียดกว่า'));
  };
  draw();
  return h('div', { 'data-title': 'ตัวช่วยเลือกแผน' },
    h('div.back-row', h('a.icon-btn', { href: '#/plans/tools', 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1.serif', { style: { fontSize: '22px' } }, 'ตัวช่วยเลือกแผน'), h('div.small.muted', '3 คำถาม · ใช้ตอนลูกค้าถามว่า "ตัวไหนดี"'))),
    h('div.card', { style: { marginTop: '8px' } },
      h('div.q', h('span.ql', '1. กังวลเรื่องอะไรที่สุด (เลือกได้ 2 ข้อ)'), choices('cc', st.concerns, CONCERNS.map(([k, l]) => [k, l]), { multi: true, onChange: (v) => { st.concerns = v.slice(-2); draw(); } })),
      h('div.q', h('span.ql', '2. งบเบี้ยต่อเดือน'), choices('bg', st.budget, BUDGET, { onChange: (v) => { st.budget = v; draw(); } })),
      h('div.q', h('span.ql', '3. มีสวัสดิการอยู่แล้วไหม'), choices('wf', st.welfare, [['none', 'ไม่มี / สิทธิรัฐ'], ['group', 'มีประกันกลุ่มบริษัท'], ['own', 'มีประกันส่วนตัวแล้ว']], { onChange: (v) => { st.welfare = v; draw(); } })),
      h('label.row.small', 'อายุลูกค้า', h('input.input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, value: st.age, style: { width: '90px' }, oninput: (e) => { st.age = +e.target.value || 0; draw(); } }))),
    res);
}
