// ─── ชุดแผนที่กำลังคุย (ตะกร้า) — ใช้ร่วมทุกหน้า: หน้าแผน · ต่อชุด · เทียบ · สรุปหน้าเดียว ───
import { h, icon, toast, sheet, closeSheet } from './ui.js';
import { PLAN, CAT } from '../data/plans.js';
import { haptic } from './pwa.js';

const KEY = 'advdesk.v1.basket';
export function getBasket() { try { const b = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ids: (b.ids || []).filter((id) => PLAN[id]), clientId: b.clientId || null }; } catch { return { ids: [], clientId: null }; } }
function save(b) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch {} document.dispatchEvent(new Event('basket')); }
export const inBasket = (id) => getBasket().ids.includes(id);
export function toggleBasket(id) {
  const b = getBasket();
  if (b.ids.includes(id)) { b.ids = b.ids.filter((x) => x !== id); save(b); toast('เอาออกจากชุดแผนแล้ว'); return false; }
  b.ids.push(id); save(b); haptic(15); toast(`ใส่ชุดแผนแล้ว (${b.ids.length} แผน)`); return true;
}
export function setBasket(ids, clientId) { const b = getBasket(); save({ ids: [...new Set(ids)].filter((id) => PLAN[id]), clientId: clientId === undefined ? b.clientId : clientId }); }
export function clearBasket() { save({ ids: [], clientId: null }); }

/** ปุ่มเพิ่ม/เอาออก ใช้ในหน้าแผน */
export function basketButton(id, cls = 'btn') {
  const b = h('button.' + cls.split(' ').join('.'), { 'aria-pressed': 'false' });
  const paint = () => { const on = inBasket(id); b.setAttribute('aria-pressed', String(on)); b.replaceChildren(icon(on ? 'check' : 'plus'), on ? 'อยู่ในชุดแผนแล้ว' : 'ใส่ชุดแผนที่กำลังคุย'); };
  b.onclick = () => { toggleBasket(id); paint(); };
  paint(); return b;
}

function openBasket() {
  const b = getBasket();
  const list = h('div.plist', b.ids.map((id) => { const p = PLAN[id]; return h('div.prow', { style: { cursor: 'default' } },
    h('span.pi', { style: { background: `color-mix(in srgb, var(--c-${p.cat}) 16%, var(--card))`, color: `var(--c-${p.cat})` } }, icon('cat-' + p.cat)),
    h('a.pt', { href: '#/plan/' + id, onclick: () => closeSheet(true) }, h('b', p.short), h('span', CAT[p.cat].short + (p.kind === 'rider' ? ' · แนบ' : ' · หลัก'))),
    h('span.pr', h('button.icon-btn', { 'aria-label': 'เอา ' + p.short + ' ออก', onclick: () => { toggleBasket(id); closeSheet(true); if (getBasket().ids.length) openBasket(); } }, icon('close')))); }));
  const go = (href) => { closeSheet(true); location.hash = href; };
  sheet({ title: 'ชุดแผนที่กำลังคุย', sub: `${b.ids.length} แผน · ใช้ต่อได้ทุกหน้า`, body: h('div.stack',
    b.ids.length ? list : h('p.muted', 'ยังไม่มีแผนในชุด — เปิดหน้าแผนแล้วกด "ใส่ชุดแผนที่กำลังคุย"'),
    b.ids.length ? h('div.bk-acts',
      h('button.btn.primary', { onclick: () => go('#/plans/build?basket=1') }, icon('grid'), 'ต่อชุด & คิดเบี้ยรวม'),
      h('button.btn', { onclick: () => { try { localStorage.setItem('advdesk.v1.compare', JSON.stringify(b.ids.slice(0, 3))); } catch {} document.dispatchEvent(new Event('compare')); go('#/plans/compare'); } }, icon('layers'), b.ids.length > 3 ? 'เทียบ 3 แผนแรก' : 'เทียบแผน'),
      h('button.btn', { onclick: () => go('#/sheet/' + b.ids.join(',')) }, icon('doc'), 'สรุปหน้าเดียว'),
      h('button.btn.ghost', { onclick: () => { const keep = getBasket(); clearBasket(); closeSheet(true); toast('ล้างชุดแผนแล้ว', { action: { label: 'เลิกทำ', fn: () => save(keep) } }); } }, icon('trash'), 'ล้างชุด')) : null) });
}

// ชิปลอย แสดงเมื่อมีแผนในชุด
let chip = null;
function paint() {
  const n = getBasket().ids.length;
  if (!chip) { chip = h('button.basket-chip', { onclick: openBasket }); document.body.append(chip); }
  let off = false; try { off = JSON.parse(localStorage.getItem('advdesk.v1.settings') || '{}').main?.features?.basket === false; } catch {}
  chip.hidden = !n || off;
  chip.replaceChildren(icon('plans'), h('span', 'ชุดแผน'), h('b', String(n)));
  chip.setAttribute('aria-label', `ชุดแผนที่กำลังคุย ${n} แผน`);
}
export function initBasket() { paint(); document.addEventListener('basket', paint); window.addEventListener('storage', (e) => { if (e.key === KEY) paint(); }); }
