// ─── แพ็กเกจ 3 ระดับ v2: เลือกชุด → สลับระดับ (มือถือดูทีละระดับ) ───
import { h, icon, choices } from '../ui.js';
import { PLAN, closingInfo } from '../../data/plans.js';
import { PACKAGES, TIER_LABEL, TIER_LEVEL, resolveTier } from '../../data/packages.js';
import { tabsPlans } from './plans.js';

export const isClosed = (id) => { const c = closingInfo(PLAN[id]); return !!(c && c.closed); };
const TIERS = ['basic', 'mid', 'max'];

export function tierCard(pkg, tk, { pick = false, show = false } = {}) {
  const t = resolveTier(pkg, tk, isClosed);
  return h('div.tier', { class: [pick ? 'pick' : '', show ? 'show' : ''].join(' ') },
    h('div.tier-h', h('div', h('div.lvl', pick ? 'แนะนำระดับ' : 'ระดับ'), h('b', TIER_LABEL[tk])), h('span.level-dots', [1, 2, 3].map((i) => h('i', { class: i <= TIER_LEVEL[tk] ? 'on' : '' })))),
    h('div', t.items.map((it) => {
      const p = PLAN[it.plan]; if (!p) return null;
      const ci = closingInfo(p);
      return h('div.tier-item.cat-' + p.cat, { onclick: () => { location.hash = '#/plan/' + p.id; }, style: { cursor: 'pointer' } },
        h('span.bar'),
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div.nm', p.short, ci && !ci.closed ? h('span.tag.red', { style: { marginLeft: '6px' } }, `${ci.days} วัน`) : null),
          h('div.sa', it.sa),
          it.replaced ? h('div.xs', { style: { color: 'var(--accent)' } }, 'แทน Health Happy ที่ปิดรับแล้ว') : null),
        icon('next'));
    })),
    h('div.xs.muted', { style: { marginTop: 'auto' } }, 'เหมาะกับ: ' + t.fit));
}

/** แสดง 3 ระดับ: มือถือมีปุ่มสลับ / จอใหญ่เห็นครบ */
export function tiersView(pkg, pick) {
  let cur = pick || 'mid';
  const grid = h('div.tiers.one');
  const paint = () => grid.replaceChildren(...TIERS.map((tk) => tierCard(pkg, tk, { pick: tk === pick, show: tk === cur })));
  paint();
  return h('div',
    h('div.tier-switch', { style: { marginBottom: '10px' } }, choices('tier', cur, TIERS.map((tk) => [tk, TIER_LABEL[tk] + (tk === pick ? ' ★' : '')]), { onChange: (v) => { cur = v; paint(); } })),
    grid);
}

export function renderPackages(q = {}) {
  let cur = PACKAGES.find((p) => p.id === q.p) || PACKAGES[0];
  const root = h('div', { 'data-title': 'แพ็กเกจ' });
  const body = h('div');
  const draw = () => {
    let showWhy = false;
    const why = h('div');
    const whyBtn = h('button.more-btn', { style: { color: 'var(--paper)', padding: '8px 0 0' }, onclick: () => { showWhy = !showWhy; why.replaceChildren(showWhy ? h('p', { style: { marginTop: '6px', fontSize: '14.5px' } }, cur.why) : ''); whyBtn.textContent = showWhy ? 'ซ่อนเหตุผล' : 'ทำไมต้องจับคู่แบบนี้?'; } }, 'ทำไมต้องจับคู่แบบนี้?');
    body.replaceChildren(
      h('div.pkg-head', { style: { marginTop: '12px' } }, h('h2', cur.name), h('p', cur.persona), h('div.goal', cur.goal), whyBtn, why),
      h('div', { style: { marginTop: '12px' } }, tiersView(cur, 'mid')),
      h('p.xs.muted', { style: { marginTop: '10px' } }, cur.budget + ' · ทุนเป็นข้อเสนอเริ่มต้น เบี้ยจริงตามใบเสนอ AIA'),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '12px' } }, h('a.btn', { href: '#/plans/advisor' }, icon('compass'), 'ใช้กับลูกค้า'), h('button.btn', { onclick: () => window.print() }, icon('print'), 'พิมพ์')));
  };
  root.append(
    h('div.topbar', h('div', h('h1', 'แพ็กเกจ 3 ระดับ'))),
    tabsPlans('packages'),
    h('div.chips', { style: { marginTop: '14px' } }, PACKAGES.map((p) => h('button.chip', { class: p.id === cur.id ? 'on' : '', onclick: (e) => { cur = p; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); history.replaceState(null, '', '#/plans/packages?p=' + p.id); draw(); } }, p.name))),
    body);
  draw();
  return root;
}
