// ─── เทียบแผน (สูงสุด 3 แผน) ───
import { h, icon, toast } from '../ui.js';
import { PLAN, CAT, PLANS, TAX_LABEL, quickFacts } from '../../data/plans.js';
import { haptic } from '../pwa.js';

const KEY = 'advdesk.v1.compare';
export function getCompare() { try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter((id) => PLAN[id]); } catch { return []; } }
function setCompare(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} document.dispatchEvent(new Event('compare')); }
export function toggleCompare(id) {
  const a = getCompare();
  if (a.includes(id)) { setCompare(a.filter((x) => x !== id)); toast('เอาออกจากการเทียบแล้ว'); return false; }
  if (a.length >= 3) { toast('เทียบได้สูงสุด 3 แผน'); return false; }
  setCompare([...a, id]); haptic(); toast(`เพิ่มในการเทียบแล้ว (${a.length + 1}/3)`); return true;
}

/** แถบลอยด้านล่าง เมื่อมีแผนรอเทียบ */
export function compareBar() {
  const wrap = h('div');
  const paint = () => {
    const a = getCompare();
    wrap.replaceChildren(a.length ? h('div.compare-bar',
      h('div.t', h('b', `เทียบ ${a.length} แผน`), h('div.xs', { style: { opacity: .75 } }, a.map((id) => PLAN[id].short).join(' · '))),
      h('a.btn.sm', { href: '#/plans/compare' }, 'เทียบเลย'),
      h('button.x', { 'aria-label': 'ล้าง', onclick: () => setCompare([]) }, icon('close'))) : '');
  };
  paint();
  const on = () => paint(); document.addEventListener('compare', on);
  window.addEventListener('hashchange', () => document.removeEventListener('compare', on), { once: true });
  return wrap;
}

export function renderCompare() {
  const ids = getCompare();
  const root = h('div', { 'data-title': 'เทียบแผน' });
  const picker = h('select.input', { onchange: (e) => { if (e.target.value) { toggleCompare(e.target.value); window.dispatchEvent(new HashChangeEvent('hashchange')); } } },
    h('option', { value: '' }, '＋ เพิ่มแผนเพื่อเทียบ'), PLANS.filter((p) => !ids.includes(p.id)).map((p) => h('option', { value: p.id }, `${CAT[p.cat].short} · ${p.short}`)));
  const row = (label, v) => h('div.cmp-row', h('span', label), v || '—');
  root.append(
    h('div.back-row', h('a.icon-btn', { href: '#/plans', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, 'เทียบแผน')),
    ids.length < 3 ? picker : null,
    ids.length ? h('div.cmp-wrap', { style: { marginTop: '12px' } }, h('div.cmp', { style: { gridTemplateColumns: `repeat(${ids.length}, minmax(${ids.length > 2 ? 210 : 150}px, 1fr))` } }, ids.map((id) => {
      const p = PLAN[id]; const qf = quickFacts(p);
      return h('div.cmp-col.cat-' + p.cat,
        h('div.row.between', h('span.xs', { style: { color: `var(--c-${p.cat})`, fontWeight: 600 } }, CAT[p.cat].name), h('button.icon-btn', { style: { width: '30px', height: '30px' }, 'aria-label': 'เอาออก', onclick: () => { toggleCompare(id); window.dispatchEvent(new HashChangeEvent('hashchange')); } }, icon('close'))),
        h('h3', p.short), h('p.small.muted', { style: { minHeight: '3em' } }, p.tagline),
        row('ประเภท', p.kind === 'rider' ? 'สัญญาเพิ่มเติม' : 'สัญญาหลัก'),
        row('อายุรับ', qf.age), row('จ่ายเบี้ย', qf.pay), row('คุ้มครอง', qf.cover),
        row('จุดเด่น', h('ul.dots', { style: { margin: '4px 0 0', paddingLeft: '16px' } }, (p.highlights || []).slice(0, 3).map((x) => h('li', x)))),
        row('ข้อควรรู้', h('ul.dots', { style: { margin: '4px 0 0', paddingLeft: '16px' } }, (p.watch || []).slice(0, 2).map((x) => h('li', x)))),
        row('ตัวอย่างเบี้ย', p.example?.text || (p.premiumByAge ? `อายุ ≤60: ${p.premiumByAge.class1[0].toLocaleString()} บาท/ปี` : '—')),
        row('ภาษี', TAX_LABEL[p.tax]),
        h('a.btn.sm.block', { href: '#/plan/' + p.id, style: { marginTop: '10px' } }, 'ดูรายละเอียด'));
    }))) : h('div.card', { style: { marginTop: '12px' } }, h('p', 'ยังไม่ได้เลือกแผน'), h('p.small.muted', { style: { marginTop: '6px' } }, 'เปิดการ์ดแผนแล้วกดปุ่ม "เทียบ" หรือเลือกจากช่องด้านบน')));
  return root;
}
