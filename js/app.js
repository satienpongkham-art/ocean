// ─── App shell: เมนู + router (hash) ───
import { h, icon, $, closeSheet, isSheetOpen, initials } from './ui.js';
import * as store from './store.js';
import { DEFAULT_PROFILE } from '../data/profile.js';
import { setBadge, hideSplash } from './pwa.js';
import { coach } from './engine/work.js';
import { setTextHook } from './ui.js';
import { glossify } from './glossary.js';
setTextHook(glossify);
import { setEmptyArt } from './ui.js';
import { illus } from './illus.js';
setEmptyArt(() => illus('empty', { size: 96 }));

const NAV = [
  { id: 'today', label: 'วันนี้', icon: 'today', href: '#/' },
  { id: 'plans', label: 'แผนประกัน', icon: 'plans', href: '#/plans' },
  { id: 'clients', label: 'ลูกค้า', icon: 'clients', href: '#/clients' },
  { id: 'work', label: 'งานขาย', icon: 'work', href: '#/work' },
  { id: 'tools', label: 'เครื่องมือ', icon: 'tools', href: '#/tools' },
];
const SIDE_SUB = {
  plans: [['#/plans', 'คลังแผน'], ['#/plans/build', 'ต่อชุดแผน'], ['#/plans/body', 'แผนที่ร่างกาย'], ['#/plans/path', 'เส้นทางชีวิต'], ['#/plans/finder', 'ตัวช่วยเลือกแผน'], ['#/plans/tools', 'เครื่องมือแผน'], ['#/plans/packages', 'แพ็กเกจ 3 ระดับ'], ['#/plans/advisor', 'แนะนำลูกค้า'], ['#/plans/compare', 'เทียบแผน'], ['#/plans/cases', 'ตัวอย่างเคส']],
  work: [['#/work', 'ท่อการขาย'], ['#/work/call', 'โหมดโทรรวด'], ['#/work/calendar', 'ปฏิทิน'], ['#/work/goals', 'เป้าหมาย & ตัวเลข'], ['#/work/sales', 'ยอดขาย'], ['#/work/review', 'ทบทวนสัปดาห์'], ['#/work/mandala', 'แมนฮาร่าเป้าหมาย']],
  tools: [['#/tools/tax', 'คำนวณภาษี'], ['#/tools/objections', 'รับมือข้อโต้แย้ง'], ['#/tools/train', 'ฝึกตัวเอง'], ['#/tools/content', 'ปฏิทินคอนเทนต์'], ['#/tools/tipcard', 'ภาพทิปการเงิน'], ['#/tools/captions', 'แคปชั่นโพสต์'], ['#/tools/profile', 'โปรไฟล์ตัวแทน'], ['#/tools/display', 'การแสดงผล & ติดตั้งแอป'], ['#/tools/sync', 'ซิงก์ & สำรองข้อมูล']],
};

export const APP_VERSION = '5.3 · 15 พ.ย. 69';

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
  [/^\/plan\/([\w-]+)$/, 'plans', (q, id) => import('./views/planpage.js').then((m) => m.renderPlanPage(id))],
  [/^\/plans\/body$/, 'plans', () => import('./views/planviz.js').then((m) => m.renderBody())],
  [/^\/plans\/build$/, 'plans', (q) => import('./views/planviz.js').then((m) => m.renderBuilder(q))],
  [/^\/plans\/path$/, 'plans', (q) => import('./views/planviz.js').then((m) => m.renderPath(q))],
  [/^\/tools\/content$/, 'tools', () => import('./views/content.js').then((m) => m.renderContent())],
  [/^\/tools\/tipcard$/, 'tools', (q) => import('./views/content.js').then((m) => m.renderTipCard(q))],
  [/^\/plans\/finder$/, 'plans', () => import('./views/finder.js').then((m) => m.renderFinder())],
  [/^\/proposal\/([\w-]+)$/, 'clients', (q, id) => import('./views/proposal.js').then((m) => m.renderProposal(id))],
  [/^\/clients\/?$/, 'clients', (q) => import('./views/clients.js').then((m) => m.renderList(q))],
  [/^\/client\/new$/, 'clients', (q) => import('./views/clients.js').then((m) => m.renderForm(null, q))],
  [/^\/client\/([\w-]+)\/edit$/, 'clients', (q, id) => import('./views/clients.js').then((m) => m.renderForm(id, q))],
  [/^\/client\/([\w-]+)\/fhc\/detail$/, 'clients', (q, id) => import('./views/fhc.js').then((m) => m.renderFHCDetail(id))],
  [/^\/client\/([\w-]+)\/fhc$/, 'clients', (q, id) => import('./views/fhc.js').then((m) => m.renderCheck(id))],
  [/^\/check$/, 'clients', () => import('./views/fhc.js').then((m) => m.renderCheck(null))],
  [/^\/client\/([\w-]+)$/, 'clients', (q, id) => import('./views/clients.js').then((m) => m.renderDetail(id))],
  [/^\/work\/?$/, 'work', () => import('./views/work.js').then((m) => m.renderPipeline())],
  [/^\/plans\/tools$/, 'plans', () => import('./views/plantools.js').then((m) => m.renderPlanTools())],
  [/^\/plans\/attach$/, 'plans', () => import('./views/plantools.js').then((m) => m.renderAttach())],
  [/^\/plans\/copay$/, 'plans', () => import('./views/plantools.js').then((m) => m.renderCopay())],
  [/^\/plans\/waiting$/, 'plans', (q) => import('./views/plantools.js').then((m) => m.renderWaiting(q))],
  [/^\/tools\/premiums$/, 'tools', () => import('./views/plantools.js').then((m) => m.renderPremiums())],
  [/^\/tools\/benefits$/, 'tools', () => import('./views/plantools.js').then((m) => m.renderBenefits(null))],
  [/^\/client\/([\w-]+)\/benefits$/, 'clients', (q, id) => import('./views/plantools.js').then((m) => m.renderBenefits(id))],
  [/^\/tools\/glossary$/, 'tools', (q) => import('./views/plantools.js').then((m) => m.renderGlossary(q))],
  [/^\/sheet\/([\w,-]+)$/, 'plans', (q, ids) => import('./views/plantools.js').then((m) => m.renderSheet(ids, q))],
  [/^\/clients\/lists$/, 'clients', () => import('./views/lists.js').then((m) => m.renderLists())],
  [/^\/clients\/list\/([\w-]+)$/, 'clients', (q, id) => import('./views/lists.js').then((m) => m.renderSmartList(id))],
  [/^\/client\/([\w-]+)\/simulate$/, 'clients', (q, id) => import('./views/simulate.js').then((m) => m.renderSimulate(id))],
  [/^\/tools\/simulate$/, 'tools', () => import('./views/simulate.js').then((m) => m.renderSimulate(null))],
  [/^\/share$/, 'clients', () => import('./views/share.js').then((m) => m.renderShare())],
  [/^\/work\/calendar$/, 'work', () => import('./views/calendar.js').then((m) => m.renderCalendar())],
  [/^\/tools\/train$/, 'tools', (q) => import('./views/train.js').then((m) => m.renderTrain(q))],
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
let vtBusy = false;
// ── โหมดลูกค้า: ซ่อนข้อมูลส่วนตัว ก่อนยื่นมือถือให้ลูกค้าดู ──
const CLIENT_OK = [/^\/plans/, /^\/plans\/(body|build|path)/, /^\/plan\//, /^\/sheet\//, /^\/present\//, /^\/proposal\//, /^\/client\/[\w-]+\/simulate$/, /^\/tools\/(glossary|simulate)$/];
export const clientMode = () => sessionStorage.getItem('clientMode') === '1';
export function setClientMode(on) {
  sessionStorage.setItem('clientMode', on ? '1' : '0');
  document.body.classList.toggle('client-mode', on);
  renderClientBar();
  if (on && !CLIENT_OK.some((re) => re.test(location.hash.slice(1).split('?')[0]))) location.hash = '#/plans'; else route();
}
function renderClientBar() {
  document.querySelector('.cm-bar')?.remove();
  if (!clientMode()) return;
  let timer = null;
  const exitBtn = h('button.cm-exit', { 'aria-label': 'ออกจากโหมดลูกค้า: กดค้าง 1 วินาที',
    onpointerdown: () => { exitBtn.classList.add('hold'); timer = setTimeout(() => setClientMode(false), 1000); },
    onpointerup: () => { clearTimeout(timer); exitBtn.classList.remove('hold'); }, onpointerleave: () => { clearTimeout(timer); exitBtn.classList.remove('hold'); },
    onkeydown: (e) => { if (e.key === 'Enter') setClientMode(false); } }, icon('close'), 'ออก (กดค้าง)');
  document.body.append(h('div.cm-bar', { role: 'region', 'aria-label': 'โหมดลูกค้า' }, h('span.cm-dot'), h('b', 'โหมดลูกค้า'),
    h('a', { href: '#/plans' }, 'แผน'), h('a', { href: '#/plans/finder' }, 'เลือกแผน'), exitBtn));
}
export async function route() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  if (isSheetOpen()) closeSheet(true);
  // โหมดลูกค้า: เปิดได้เฉพาะหน้าที่ไม่มีข้อมูลส่วนตัวของคนอื่น
  if (clientMode() && !CLIENT_OK.some((re) => re.test(path))) { location.hash = '#/plans'; return; }
  for (const [re, nav, fn] of routes) {
    const m = path.match(re);
    if (m) {
      renderNav(nav, path);
      document.body.classList.toggle('presenting', /^\/present\//.test(path));
      document.body.classList.toggle('no-fab', /^\/(present\/|check|client\/new|client\/[\w-]+\/(edit|fhc)|work\/call)/.test(path));
      const samePage = current.split('?')[0] === path;
      current = raw;
      try {
        const node = await fn(q, ...m.slice(1));
        if (node) {
          const v = $('#view');
          const swap = () => v.replaceChildren(node);
          const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
          if (!samePage && !calm && document.startViewTransition && !vtBusy) {
            vtBusy = true;
            const vt = document.startViewTransition(swap);
            for (const pr of [vt.ready, vt.finished, vt.updateCallbackDone]) pr.catch(() => {});
            vt.finished.catch(() => {}).finally(() => { vtBusy = false; });
          } else swap();
        }
        if (!samePage) {
          window.scrollTo(0, 0);
          // ย้ายโฟกัสไปที่หัวเรื่องของหน้าใหม่ (โปรแกรมอ่านหน้าจอรู้ว่าเปลี่ยนหน้าแล้ว)
          setTimeout(() => { const v = $('#view'); if (v.contains(document.activeElement) || isSheetOpen()) return; const hd = v.querySelector('h1'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }, 60);
        }
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
    const items = coach({ clients: store.all('clients'), appts: store.all('appts'), activities: store.all('activities'), settings: store.getSettings(), closingPlans: [], policies: store.all('policies') });
    setBadge(items.filter((i) => i.pri >= 60).length);
  } catch {}
}
setTimeout(hideSplash, 2500);

export function showWhatsNew(v) {
  import('./changelog.js').then(({ CHANGELOG }) => import('./ui.js').then(({ sheet, closeSheet }) => {
    const cur = CHANGELOG.find((x) => x.v === v) || CHANGELOG[0];
    sheet({ title: `อัปเดตเป็นเวอร์ชัน ${cur.v} แล้ว`, sub: 'มีอะไรใหม่', body: h('div.stack', h('ul.whatsnew', cur.items.map((t) => h('li', t))), h('button.btn.primary.block', { onclick: () => closeSheet(true) }, 'เข้าใจแล้ว')) });
  }));
}

// ── ปุ่มลัดคีย์บอร์ด ──
const SHORTCUTS = [['/', 'ค้นหา / สั่งงาน'], ['Ctrl + K', 'ค้นหา / สั่งงาน'], ['N', 'เพิ่มลูกค้าใหม่'], ['A', 'ลงนัดใหม่'], ['T', 'หน้าวันนี้'], ['C', 'ปฏิทิน'], ['P', 'โหมดโทรรวด'], ['L', 'รายชื่อลูกค้า'], ['?', 'ดูปุ่มลัดทั้งหมด'], ['Esc', 'ปิดหน้าต่าง']];
export function showShortcuts() {
  import('./ui.js').then(({ sheet }) => sheet({ title: 'ปุ่มลัดคีย์บอร์ด', body: h('dl.keys', SHORTCUTS.map(([k, v]) => [h('dt', h('kbd', k)), h('dd', v)])) }));
}
document.addEventListener('keydown', (e) => {
  const tgt = e.target; const typing = tgt && (/INPUT|TEXTAREA|SELECT/.test(tgt.tagName) || tgt.isContentEditable);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); location.hash = '#/search'; return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || isSheetOpen()) return;
  const k = e.key;
  const go = { '/': '#/search', n: '#/client/new', N: '#/client/new', t: '#/', T: '#/', c: '#/work/calendar', C: '#/work/calendar', p: '#/work/call', P: '#/work/call', l: '#/clients', L: '#/clients' }[k];
  if (go) { e.preventDefault(); location.hash = go; return; }
  if (k === 'a' || k === 'A') { e.preventDefault(); import('./views/common.js').then((m) => m.apptSheet()); return; }
  if (k === '?') { e.preventDefault(); showShortcuts(); }
});
// ปุ่ม + ลอย (บันทึกด่วน) อยู่ทุกหน้า
document.body.append(h('button.fab', { 'aria-label': 'บันทึกด่วน', onclick: () => import('./views/common.js').then((m) => m.quickSheet()) }, icon('plus')));

window.addEventListener('hashchange', route);
store.onChange(() => {
  // อัปเดตหน้าปัจจุบันเมื่อข้อมูลเปลี่ยน (ยกเว้นตอนกำลังพิมพ์ฟอร์ม)
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  if (isSheetOpen()) return;
  route();
});
store.onSync(() => { const raw = location.hash.slice(1) || '/'; const p = raw.split('?')[0]; const nav = (routes.find(([re]) => re.test(p)) || [])[1] || 'today'; renderNav(nav, p); });

// รับข้อความที่แชร์มาจากแอปอื่น (Web Share Target: ./?title=&text=&url=)
{ const sp = new URLSearchParams(location.search);
  if (sp.has('text') || sp.has('title') || sp.has('url')) {
    sessionStorage.setItem('shared', JSON.stringify({ title: sp.get('title') || '', text: sp.get('text') || '', url: sp.get('url') || '' }));
    history.replaceState(null, '', location.pathname + '#/share');
  } }
if (clientMode()) { document.body.classList.add('client-mode'); renderClientBar(); }
route();
// แสดง "มีอะไรใหม่" ครั้งเดียวหลังอัปเดตเวอร์ชัน
setTimeout(() => {
  const v = APP_VERSION.split(' ')[0];
  let seen = null; try { seen = localStorage.getItem('advdesk.v1.seenVersion'); localStorage.setItem('advdesk.v1.seenVersion', v); } catch {}
  if (seen && seen !== v && !isSheetOpen()) showWhatsNew(v);
}, 900);
if (store.sync.config.url) store.syncNow().catch(() => {});

// ติดตั้งเป็นแอป (PWA) + ใช้ออฟไลน์
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // มีเวอร์ชันใหม่ → service worker ตัวใหม่เข้าควบคุม → รีโหลดหน้า 1 ครั้งให้เห็นของใหม่ทันที
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => {
    r.addEventListener('updatefound', () => { if (hadController) import('./ui.js').then(({ toast }) => toast('กำลังอัปเดตแอปเป็นเวอร์ชันล่าสุด…')); });
    r.update();
  }).catch(() => {}));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}); });
}
