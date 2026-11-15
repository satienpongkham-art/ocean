// ─── แพ็กเกจ 3 ระดับ ───
import { h, icon } from '../ui.js';
import { PLAN, CAT, closingInfo } from '../../data/plans.js';
import { PACKAGES, TIER_LABEL, TIER_LEVEL, resolveTier } from '../../data/packages.js';
import { tabsPlans } from './plans.js';

export const isClosed = (id) => { const c = closingInfo(PLAN[id]); return !!(c && c.closed); };

export function tierCard(pkg, tk, { pick = false } = {}) {
  const t = resolveTier(pkg, tk, isClosed);
  return h('div.tier', { class: pick ? 'pick' : '' },
    h('div.tier-h', h('div', h('div.lvl', 'ระดับ'), h('b', TIER_LABEL[tk])), h('span.level-dots', [1, 2, 3].map((i) => h('i', { class: i <= TIER_LEVEL[tk] ? 'on' : '' })))),
    h('div', t.items.map((it) => {
      const p = PLAN[it.plan]; if (!p) return null;
      const ci = closingInfo(p);
      return h('div.tier-item.cat-' + p.cat,
        h('span.bar'),
        h('div', { style: { minWidth: 0 } },
          h('div.nm', { onclick: () => { location.hash = '#/plan/' + p.id; }, role: 'link', tabindex: 0 }, p.short,
            ci && !ci.closed ? h('span.tag.red', { style: { marginLeft: '6px' } }, `ปิดรับอีก ${ci.days} วัน`) : null),
          h('div.sa', it.sa),
          it.note ? h('div.xs.muted', it.note) : null,
          it.replaced ? h('div.xs', { style: { color: 'var(--accent)' } }, 'แทน Health Happy ที่ปิดรับแล้ว') : null));
    })),
    h('div.xs.muted', { style: { marginTop: 'auto' } }, 'เหมาะกับ: ' + t.fit));
}

export function renderPackages(q = {}) {
  let cur = PACKAGES.find((p) => p.id === q.p) || PACKAGES[0];
  const root = h('div', { 'data-title': 'แพ็กเกจ 3 ระดับ' });
  const body = h('div');
  const draw = () => {
    body.replaceChildren(
      h('div.card', { style: { marginTop: '12px' } },
        h('div.row.between.wrap', h('h2.serif', { style: { fontSize: '22px' } }, cur.name), h('span.tag', cur.budget)),
        h('p.muted', { style: { marginTop: '4px' } }, cur.persona),
        h('div.callout', { style: { marginTop: '10px' } }, h('b', 'เป้าหมาย: '), cur.goal),
        h('p', { style: { marginTop: '10px' } }, h('b', 'ทำไมต้องจับคู่แบบนี้: '), cur.why)),
      h('div.tiers', { style: { marginTop: '12px' } }, ['basic', 'mid', 'max'].map((tk) => tierCard(cur, tk))),
      h('p.source', { style: { marginTop: '10px' } }, 'ทุนในแพ็กเกจเป็นข้อเสนอเริ่มต้นตามหลักวางแผน ปรับตามรายได้/งบจริง · เบี้ยต้องออกใบเสนอจากระบบ AIA · แตะชื่อแผนเพื่อดูรายละเอียด'),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '12px' } },
        h('a.btn', { href: '#/plans/advisor' }, icon('compass'), 'ใช้ระบบแนะนำกับลูกค้า'),
        h('button.btn', { onclick: () => window.print() }, icon('print'), 'พิมพ์ / บันทึก PDF')),
    );
  };
  root.append(
    h('div.topbar', h('div', h('h1', 'แพ็กเกจ 3 ระดับ'), h('div.sub', 'พื้นฐาน · ปานกลาง · เต็มแม็กซ์ — จับคู่แผนตามเป้าหมายลูกค้า'))),
    tabsPlans('packages'),
    h('div.chips', { style: { marginTop: '14px' } }, PACKAGES.map((p) => h('button.chip', { class: p.id === cur.id ? 'on' : '', onclick: (e) => { cur = p; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); history.replaceState(null, '', '#/plans/packages?p=' + p.id); draw(); } }, p.name))),
    body);
  draw();
  return root;
}
