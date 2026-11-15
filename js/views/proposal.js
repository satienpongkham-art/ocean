// ─── ใบเสนอ 3 ทางเลือก: พื้นฐาน / ปานกลาง / เต็ม ให้ลูกค้าเลือก ───
import { h, icon, fmt, toast, todayISO } from '../ui.js';
import * as store from '../store.js';
import { PLAN, CAT } from '../../data/plans.js';
import { TIER_LABEL, resolveTier } from '../../data/packages.js';
import { recommend } from '../engine/recommend.js';
import { lookup } from '../engine/premium.js';
import { isClosed } from './packages.js';
import { clientAge } from './clients.js';

export function renderProposal(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const p = { ...c, age: clientAge(c) };
  const r = recommend(p);
  const col = (tk) => {
    const t = resolveTier(r.pkg, tk, isClosed);
    const items = t.items.filter((it) => PLAN[it.plan]);
    const prem = items.map((it) => lookup(store.get('premiums', it.plan), p.age, c.gender));
    const known = prem.filter(Boolean); const total = known.reduce((s, x) => s + x[0].value, 0);
    const chosen = c.proposal?.tier === tk;
    return h('div.prop-col', { class: [tk === r.tier ? 'rec' : '', chosen ? 'chosen' : ''].join(' ') },
      tk === r.tier ? h('span.prop-badge', 'แนะนำ') : null,
      h('h3', TIER_LABEL[tk]),
      h('div.prop-total', known.length ? h('b', fmt(total)) : h('b', '—'), h('small', known.length ? (known.length < items.length ? ` บาท/ปี (คิดได้ ${known.length}/${items.length} แผน)` : ' บาท/ปี') : ' ยังไม่มีตารางเบี้ย')),
      h('ul', items.map((it, i) => h('li.cat-' + PLAN[it.plan].cat, h('i', { 'aria-hidden': 'true' }), h('span', h('b', PLAN[it.plan].short), h('small', `${it.sa}${prem[i] ? ' · ' + fmt(prem[i][0].value) : ''}`))))),
      h('div.prop-acts',
        h('button.btn' + (chosen ? '.primary' : ''), { 'aria-pressed': String(chosen), onclick: () => { store.put('clients', { ...c, proposal: { tier: tk, date: todayISO(), items: items.map((it) => it.plan) } }); store.put('logs', { clientId: c.id, date: todayISO(), type: 'note', text: `ลูกค้าเลือกแผน${TIER_LABEL[tk]}: ${items.map((it) => PLAN[it.plan].short).join(', ')}` }); toast(`บันทึกว่าเลือก "${TIER_LABEL[tk]}" แล้ว`); } }, icon('check'), chosen ? 'ลูกค้าเลือกแบบนี้' : 'เลือกแบบนี้'),
        h('a.btn.ghost.sm', { href: `#/sheet/${items.map((it) => it.plan).join(',')}?c=${c.id}` }, icon('doc'), 'สรุปหน้าเดียว')));
  };
  return h('div', { 'data-title': 'ใบเสนอ 3 ทางเลือก' },
    h('div.back-row', h('a.icon-btn', { href: '#/client/' + id, 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1.serif', { style: { fontSize: '22px' } }, 'ใบเสนอ 3 ทางเลือก'), h('div.small.muted', `คุณ${c.nick} · ${r.pkg.name}`))),
    h('p.lead', { style: { margin: '6px 0 12px' } }, r.pkg.goal),
    h('div.prop-grid', ['basic', 'mid', 'max'].map(col)),
    h('div.card', { style: { marginTop: '12px' } }, h('b', 'ทำไมแนะนำชุดนี้'), h('ul.ticks', { style: { marginTop: '6px' } }, r.reasons.slice(0, 3).map((x) => h('li', x)))),
    h('p.source', { style: { marginTop: '10px' } }, 'เบี้ยคิดจากตารางที่นำเข้า (ถ้ามี) · เบี้ยจริงตามใบเสนอจากระบบ AIA'));
}
