// ─── App shell: เมนู + router (hash) ───
import { h, icon, $, closeSheet, isSheetOpen, initials } from './ui.js';
import * as store from './store.js';
import { DEFAULT_PROFILE } from '../data/profile.js';
import { setBadge, hideSplash } from './pwa.js';
import { coach } from './engine/work.js';

const NAV = [
  { id: 'today', label: 'วันนี้', icon: 'today', href: '#/' },
  { id: 'plans', label: 'แผนประกัน', icon: 'plans', href: '#/plans' },
  { id: 'clients', label: 'ลูกค้า', icon: 'clients', href: '#/clients' },
  { id: 'work', label: 'งานขาย', icon: 'work', href: '#/work' },
  { id: 'tools', label: 'เครื่องมือ', icon: 'tools', href: '#/tools' },
];
const SIDE_SUB = {
  plans: [['#/plans', 'คลังแผน'], ['#/plans/packages', 'แพ็กเกจ 3 ระดับ'], ['#/plans/advisor', 'แนะนำลูกค้า'], ['#/plans/compare', 'เทียบแผน'], ['#/plans/cases', 'ตัวอย่างเคส']],
  work: [['#/work', 'ท่อการขาย'], ['#/work/call', 'ชั่วโมงโทรนัด'], ['#/work/goals', 'เป้าหมาย & ตัวเลข'], ['#/work/sales', 'ยอดขาย'], ['#/work/review', 'ทบทวนสัปดาห์'], ['#/work/mandala', 'แมนฮาร่าเป้าหมาย']],
  tools: [['#/tools/tax', 'คำนวณภาษี'], ['#/tools/objections', 'รับมือข้อโต้แย้ง'], ['#/tools/captions', 'แคปชั่นโพสต์'], ['#/tools/profile', 'โปรไฟล์ตัวแทน'], ['#/tools/display', 'การแสดงผล & ติดตั้งแอป'], ['#/tools/sync', 'ซิงก์ & สำรองข้อมูล']],
};

export const APP_VERSION = '3.2 · 15 พ.ย. 69';

export function profile() { return { ...DEFAULT_PROFILE, ...(store.getSettings().profile || {}) }; }

function renderNav(active, path) {
  const tb = $('#tabbar'); tb.replaceChildren();
  for (const n of NAV) tb.append(h('a', { href: n.href, class: n.id === active ? 'on' : '', 'aria-current': n.id === active ? 'page' : null }, h('span.pill', icon(n.icon)), n.label));
  const sb = $('#sidebar'); const p = profile();
  const syncDot = h('span.sync-dot', { class: store.sync.state === 'ok' ? 'ok' : store.sync.state === 'busy' ? 'busy' : store.sync.state === 'err' ? 'err' : '' });
  sb.replaceChildren(
    h('div.brand', h('div.mark', initials(p.name || 'A')), h('div', h('b', p.name), h('span', p.title + ' · ' + (p.company || '')))),
    h('a.side-link', { href: '#/search', class: active === 'search' ? 'on' : '' }, icon('search'), 'ค้นหา'),
    ...NAV.flatMap((n) => [
      h('a.side-link', { href: n.href, class: n.id === active ? 'on' : '' }, icon(n.icon), n.label),
      ...(n.id === active && SIDE_SUB[n.id] ? SIDE_SUB[n.id].map(([href, lab]) => h('a.side-link', { href, style: { paddingLeft: '38px', fontSize: '13.5px' }, class: '#' + path === href ? 'on' : '' }, lab)) : []),
    ]),
    h('div.side-foot', h('div.row', syncDot, store.sync.config.url ? (store.sync.state === 'err' ? 'ซิงก์ไม่สำเร็จ' : 'ซิงก์กับ Google Sheets') : 'เก็บข้อมูลในเครื่องนี้'), h('div', 'รหัสตัวแทน ' + (p.agentCode || '—')), h('div', 'เวอร์ชัน ' + APP_VERSION)),
  );
}

const routes = [
  [/^\/?$/, 'today', () => import('./views/today.js').then((m) => m.render())],
  [/^\/plans\/?$/, 'plans', (q) => import('./views/plans.js').then((m) => m.renderCatalog(q))],
  [/^\/plans\/packages$/, 'plans', (q) => import('./views/packages.js').then((m) => m.renderPackages(q))],
  [/^\/plans\/advisor$/, 'plans', (q) => import('./views/advisor.js').then((m) => m.renderAdvisor(q))],
  [/^\/plans\/cases$/, 'plans', () => import('./views/advisor.js').then((m) => m.renderCases())],
  [/^\/plans\/compare$/, 'plans', () => import('./views/compare.js').then((m) => m.renderCompare())],
  [/^\/search$/, 'search', (q) => import('./views/search.js').then((m) => m.renderSearch(q))],
  [/^\/present\/([\w-]+)$/, 'clients', (q, id) => import('./views/present.js').then((m) => m.renderPresent(id, q))],
  [/^\/work\/sales$/, 'work', () => import('./views/sales.js').then((m) => m.renderSales())],
  [/^\/tools\/display$/, 'tools', () => import('./views/tools.js').then((m) => m.renderDisplay())],
  [/^\/plan\/([\w-]+)$/, 'plans', (q, id) => import('./views/plans.js').then((m) => m.renderCatalog(q, id))],
  [/^\/clients\/?$/, 'clients', (q) => import('./views/clients.js').then((m) => m.renderList(q))],
  [/^\/client\/new$/, 'clients', (q) => import('./views/clients.js').then((m) => m.renderForm(null, q))],
  [/^\/client\/([\w-]+)\/edit$/, 'clients', (q, id) => import('./views/clients.js').then((m) => m.renderForm(id, q))],
  [/^\/client\/([\w-]+)\/fhc$/, 'clients', (q, id) => import('./views/fhc.js').then((m) => m.renderFHC(id))],
  [/^\/client\/([\w-]+)$/, 'clients', (q, id) => import('./views/clients.js').then((m) => m.renderDetail(id))],
  [/^\/work\/?$/, 'work', () => import('./views/work.js').then((m) => m.renderPipeline())],
  [/^\/work\/call$/, 'work', () => import('./views/work.js').then((m) => m.renderCall())],
  [/^\/work\/goals$/, 'work', () => import('./views/work.js').then((m) => m.renderGoals())],
  [/^\/work\/review$/, 'work', () => import('./views/work.js').then((m) => m.renderReview())],
  [/^\/work\/mandala$/, 'work', () => import('./views/mandala.js').then((m) => m.renderAgentMandala())],
  [/^\/tools\/?$/, 'tools', () => import('./views/tools.js').then((m) => m.renderTools())],
  [/^\/tools\/tax$/, 'tools', (q) => import('./views/tax.js').then((m) => m.renderTax(q))],
  [/^\/tools\/objections$/, 'tools', () => import('./views/tools.js').then((m) => m.renderObjections())],
  [/^\/tools\/captions$/, 'tools', (q) => import('./views/captions.js').then((m) => m.renderCaptions(q))],
  [/^\/tools\/profile$/, 'tools', () => import('./views/tools.js').then((m) => m.renderProfile())],
  [/^\/tools\/sync$/, 'tools', () => import('./views/tools.js').then((m) => m.renderSync())],
];

let current = '';
export async function route() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  if (isSheetOpen() && !/^\/plan\//.test(path)) closeSheet(true);
  for (const [re, nav, fn] of routes) {
    const m = path.match(re);
    if (m) {
      renderNav(nav, path);
      document.body.classList.toggle('presenting', /^\/present\//.test(path));
      const samePage = current.split('?')[0] === path;
      current = raw;
      try {
        const node = await fn(q, ...m.slice(1));
        if (node) { const v = $('#view'); v.replaceChildren(node); }
        if (!samePage && !/^\/plan\//.test(path)) window.scrollTo(0, 0);
        document.title = (node?.dataset?.title ? node.dataset.title + ' · ' : '') + 'Advisor Desk';
        hideSplash(); updateBadge();
      } catch (e) {
        console.error(e);
        $('#view').replaceChildren(h('div.card', h('b', 'เกิดข้อผิดพลาด'), h('p.muted.small', String(e.message || e))));
      }
      return;
    }
  }
  location.hash = '#/';
}
export function rerender() { route(); }

/** ตัวเลขบนไอคอนแอป = งานสำคัญวันนี้ */
function updateBadge() {
  try {
    const items = coach({ clients: store.all('clients'), appts: store.all('appts'), activities: store.all('activities'), settings: store.getSettings(), closingPlans: [] });
    setBadge(items.filter((i) => i.pri >= 60).length);
  } catch {}
}
setTimeout(hideSplash, 2500);

window.addEventListener('hashchange', route);
store.onChange(() => {
  // อัปเดตหน้าปัจจุบันเมื่อข้อมูลเปลี่ยน (ยกเว้นตอนกำลังพิมพ์ฟอร์ม)
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  if (isSheetOpen()) return;
  route();
});
store.onSync(() => { const raw = location.hash.slice(1) || '/'; const p = raw.split('?')[0]; const nav = (routes.find(([re]) => re.test(p)) || [])[1] || 'today'; renderNav(nav, p); });

route();
if (store.sync.config.url) store.syncNow().catch(() => {});

// ติดตั้งเป็นแอป (PWA) + ใช้ออฟไลน์
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // มีเวอร์ชันใหม่ → service worker ตัวใหม่เข้าควบคุม → รีโหลดหน้า 1 ครั้งให้เห็นของใหม่ทันที
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {}));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}); });
}
