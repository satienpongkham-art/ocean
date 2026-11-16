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
setEmptyArt((ic) => illus(({ clients: 'family', user: 'person', heart: 'couple', cal: 'calendar', pen: 'story', star: 'person', line: 'money', clock: 'time', book: 'story' })[ic] || 'empty', { size: 96 }));
import { initBasket } from './basket.js';
import { initIsland } from './island.js';
import { initTilt } from './tilt.js';

const NAV = [
  { id: 'today', label: 'วันนี้', icon: 'today', href: '#/' },
  { id: 'plans', label: 'แผน', icon: 'plans', href: '#/plans' },
  { id: 'clients', label: 'ลูกค้า', icon: 'clients', href: '#/clients' },
  { id: 'studio', label: 'สตูดิโอ', icon: 'studio', href: '#/studio' },
  { id: 'work', label: 'งานขาย', icon: 'work', href: '#/work' },
];
NAV.splice(1, 2, NAV[2], NAV[1]); // วันนี้ · ลูกค้า · แผน · สตูดิโอ · งานขาย
const SIDE_SUB = {
  plans: [['#/plans', 'คลังแผน'], ['#/plans/stages', 'ชุดแผนตามช่วงวัย'], ['#/plans/ww', 'มี vs ไม่มีประกัน'], ['#/plans/build', 'ต่อชุดแผน'], ['#/plans/body', 'แผนที่ร่างกาย'], ['#/plans/path', 'เส้นทางชีวิต'], ['#/plans/finder', 'ตัวช่วยเลือกแผน'], ['#/plans/tools', 'เครื่องมือแผน'], ['#/plans/packages', 'แพ็กเกจ 3 ระดับ'], ['#/plans/advisor', 'แนะนำลูกค้า'], ['#/plans/compare', 'เทียบแผน'], ['#/plans/cases', 'ตัวอย่างเคส']],
  work: [['#/work', 'ท่อการขาย'], ['#/work/call', 'โหมดโทรรวด'], ['#/work/calendar', 'ปฏิทิน'], ['#/work/goals', 'เป้าหมาย & ตัวเลข'], ['#/work/sales', 'ยอดขาย'], ['#/work/review', 'ทบทวนสัปดาห์'], ['#/work/mandala', 'แมนฮาร่าเป้าหมาย']],
  studio: [['#/studio', 'งานของฉัน'], ['#/studio/library', 'คลัง 365 เรื่อง'], ['#/studio/poster', 'โปสเตอร์แผน'], ['#/studio/video', 'ตัดต่อคลิป'], ['#/studio/stats', 'ผลโพสต์'], ['#/brand', 'แบรนด์ของฉัน'], ['#/tools/content', 'ปฏิทินคอนเทนต์']],
  menu: [['#/menu', 'เมนูทั้งหมด'], ['#/settings', 'ตั้งค่า'], ['#/settings/look', 'สีจอและหน้าตา'], ['#/tools/calc', 'เครื่องคิด & ลิงก์ลูกค้า'], ['#/tools/tax', 'คำนวณภาษี'], ['#/tools/profile', 'โปรไฟล์'], ['#/tools/sync', 'ซิงก์ & สำรองข้อมูล']],
};

export const APP_VERSION = '5.9 · 18 พ.ย. 69';

export function profile() { return { ...DEFAULT_PROFILE, ...(store.getSettings().profile || {}) }; }

function renderNav(active, path) {
  if (active === 'tools') active = 'menu';
  const tb = $('#tabbar'); tb.replaceChildren(); const p = profile();
  const me = (p.nick || p.name || 'A').replace(/^คุณ/, '').trim(); const meCh = 'เแโใไ'.includes(me.charAt(0)) ? me.charAt(1) : me.charAt(0);
  for (const n of NAV) tb.append(h('a', { href: n.href, class: n.id === active ? 'on' : '', 'aria-current': n.id === active ? 'page' : null }, h('span.pill', icon(n.icon)), n.label));
  tb.append(h('a.tb-me', { href: '#/menu', class: active === 'menu' ? 'on' : '', 'aria-current': active === 'menu' ? 'page' : null }, h('span.pill', h('span.tb-av', meCh)), 'เมนู'));
  const sb = $('#sidebar');
  const syncDot = h('span.sync-dot', { class: store.sync.state === 'ok' ? 'ok' : store.sync.state === 'busy' ? 'busy' : store.sync.state === 'err' ? 'err' : '' });
  sb.replaceChildren(
    h('div.brand', h('div.mark', meCh), h('div', h('b', p.brand || 'AOM CONNECT'), h('span', p.name))),
    h('a.side-link', { href: '#/search', class: active === 'search' ? 'on' : '' }, icon('search'), 'ค้นหา'),
    ...[...NAV, { id: 'menu', label: 'เมนู & ตั้งค่า', icon: 'menu', href: '#/menu' }].flatMap((n) => [
      h('a.side-link', { href: n.href, class: n.id === active ? 'on' : '' }, icon(n.icon), n.label),
      ...(n.id === active && SIDE_SUB[n.id] ? SIDE_SUB[n.id].map(([href, lab]) => h('a.side-link', { href, style: { paddingLeft: '38px', fontSize: '13.5px' }, class: '#' + path === href || (href.split('/').length > 2 && ('#' + path).startsWith(href + '/')) ? 'on' : '' }, lab)) : []),
    ]),
    h('div.side-foot', h('div.row', syncDot, store.sync.config.url ? (store.sync.state === 'err' ? 'ซิงก์ไม่สำเร็จ' : 'ซิงก์กับ Google Sheets') : 'เก็บข้อมูลในเครื่องนี้'), h('div', 'รหัสตัวแทน ' + (p.agentCode || '—')), h('div', 'เวอร์ชัน ' + APP_VERSION)),
  );
}

const routes = [
  [/^\/?$/, 'today', (q) => import('./views/today.js').then((m) => m.render(q))],
  [/^\/plans\/?$/, 'plans', (q) => import('./views/plans.js').then((m) => m.renderCatalog(q))],
  [/^\/plans\/packages$/, 'plans', (q) => import('./views/packages.js').then((m) => m.renderPackages(q))],
  [/^\/plans\/advisor$/, 'plans', (q) => import('./views/advisor.js').then((m) => m.renderAdvisor(q))],
  [/^\/plans\/cases$/, 'plans', () => import('./views/advisor.js').then((m) => m.renderCases())],
  [/^\/plans\/compare$/, 'plans', () => import('./views/compare.js').then((m) => m.renderCompare())],
  [/^\/search$/, 'search', (q) => import('./views/search.js').then((m) => m.renderSearch(q))],
  [/^\/present\/([\w-]+)$/, 'clients', (q, id) => import('./views/present.js').then((m) => m.renderPresent(id, q))],
  [/^\/work\/sales$/, 'work', () => import('./views/sales.js').then((m) => m.renderSales())],
  [/^\/tools\/display$/, 'menu', () => import('./views/menu.js').then((m) => m.renderLook())],
  [/^\/plan\/([\w-]+)$/, 'plans', (q, id) => import('./views/planpage.js').then((m) => m.renderPlanPage(id))],
  [/^\/(menu|tools)\/?$/, 'menu', () => import('./views/menu.js').then((m) => m.renderMenu())],
  [/^\/settings$/, 'menu', () => import('./views/menu.js').then((m) => m.renderSettings())],
  [/^\/settings\/look$/, 'menu', () => import('./views/menu.js').then((m) => m.renderLook())],
  [/^\/settings\/access$/, 'menu', () => import('./views/menu.js').then((m) => m.renderAccess())],
  [/^\/settings\/notify$/, 'menu', () => import('./views/menu.js').then((m) => m.renderNotify())],
  [/^\/settings\/features$/, 'menu', () => import('./views/menu.js').then((m) => m.renderFeatures())],
  [/^\/settings\/security$/, 'menu', () => import('./views/menu.js').then((m) => m.renderSecurity())],
  [/^\/settings\/app$/, 'menu', () => import('./views/menu.js').then((m) => m.renderApp())],
  [/^\/work\/report$/, 'work', (q) => import('./views/report.js').then((m) => m.renderReport(q))],
  [/^\/studio$/, 'studio', () => import('./views/studio.js').then((m) => m.renderStudio())],
  [/^\/studio\/library$/, 'studio', () => import('./views/studio2.js').then((m) => m.renderLibrary())],
  [/^\/studio\/stats$/, 'studio', () => import('./views/studio2.js').then((m) => m.renderStats())],
  [/^\/studio\/playbook$/, 'studio', () => import('./views/studio2.js').then((m) => m.renderPlaybook())],
  [/^\/studio\/sign$/, 'studio', () => import('./views/studio2.js').then((m) => m.renderSign())],
  [/^\/studio\/covers$/, 'studio', () => import('./views/studio2.js').then((m) => m.renderCovers())],
  [/^\/studio\/poster$/, 'studio', (q) => import('./views/poster.js').then((m) => m.renderPosters(q))],
  [/^\/studio\/video$/, 'studio', (q) => import('./views/video.js').then((m) => m.renderVideos(q))],
  [/^\/studio\/video\/([\w-]+)$/, 'studio', (q, id) => import('./views/video.js').then((m) => m.renderVideoEditor(id, q))],
  [/^\/studio\/([\w-]+)$/, 'studio', (q, id) => import('./views/studio.js').then((m) => m.renderStudioItem(id))],
  [/^\/p\/quiz$/, 'public', (q) => import('./views/public.js').then((m) => m.renderQuiz(q))],
  [/^\/p\/calc$/, 'public', (q) => import('./views/public.js').then((m) => m.renderCalc(null, q))],
  [/^\/p\/calc\/(\w+)$/, 'public', (q, t) => import('./views/public.js').then((m) => m.renderCalc(t, q))],
  [/^\/tools\/calc$/, 'tools', () => import('./views/public.js').then((m) => m.renderCalc(null, {}, true))],
  [/^\/tools\/calc\/(\w+)$/, 'tools', (q, t) => import('./views/public.js').then((m) => m.renderCalc(t, {}, true))],
  [/^\/tools\/quiz$/, 'tools', () => import('./views/public.js').then((m) => m.renderQuiz({}, true))],
  [/^\/tools\/timemachine$/, 'tools', () => import('./views/timemachine.js').then((m) => m.renderTimeMachine())],
  [/^\/tools\/data$/, 'menu', () => import('./views/facts.js').then((m) => m.renderFacts())],
  [/^\/plans\/stages$/, 'plans', () => import('./views/stages.js').then((m) => m.renderStages())],
  [/^\/plans\/ww$/, 'plans', () => import('./views/stages.js').then((m) => m.renderWW())],
  [/^\/brand$/, 'studio', () => import('./views/brand.js').then((m) => m.renderBrand())],
  [/^\/plans\/body$/, 'plans', () => import('./views/planviz.js').then((m) => m.renderBody())],
  [/^\/plans\/build$/, 'plans', (q) => import('./views/planviz.js').then((m) => m.renderBuilder(q))],
  [/^\/plans\/path$/, 'plans', (q) => import('./views/planviz.js').then((m) => m.renderPath(q))],
  [/^\/tools\/content$/, 'studio', () => import('./views/content.js').then((m) => m.renderContent())],
  [/^\/tools\/tipcard$/, 'studio', (q) => import('./views/content.js').then((m) => m.renderTipCard(q))],
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
  [/^\/tools\/tax$/, 'tools', (q) => import('./views/tax.js').then((m) => m.renderTax(q))],
  [/^\/tools\/objections$/, 'tools', () => import('./views/tools.js').then((m) => m.renderObjections())],
  [/^\/tools\/captions$/, 'tools', (q) => import('./views/captions.js').then((m) => m.renderCaptions(q))],
  [/^\/tools\/profile$/, 'tools', () => import('./views/tools.js').then((m) => m.renderProfile())],
  [/^\/tools\/sync$/, 'tools', () => import('./views/tools.js').then((m) => m.renderSync())],
];

let current = '';
let vtBusy = false;
// ── โหมดลูกค้า: ซ่อนข้อมูลส่วนตัว ก่อนยื่นมือถือให้ลูกค้าดู ──
const CLIENT_OK = [/^\/plans/, /^\/plans\/(body|build|path)/, /^\/plan\//, /^\/sheet\//, /^\/present\//, /^\/proposal\//, /^\/client\/[\w-]+\/simulate$/, /^\/tools\/(glossary|simulate|calc|quiz)/, /^\/p\//];
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
      document.body.classList.toggle('public', nav === 'public');
      document.body.classList.toggle('no-fab', /^\/(present\/|check|client\/new|client\/[\w-]+\/(edit|fhc)|work\/call|work\/report|studio|brand|menu|plan\/|plans\/(stages|ww)|tools\/?$|settings)/.test(path));
      const samePage = current.split('?')[0] === path;
      current = raw;
      try {
        const skT = samePage ? 0 : setTimeout(() => { $('#view').replaceChildren(h('div.skel', { 'aria-hidden': 'true' }, h('i.s-h'), h('i.s-c'), h('i.s-r'), h('i.s-r'), h('i.s-c'))); }, 220);
        const node = await fn(q, ...m.slice(1)); clearTimeout(skT);
        decorate(node, path);
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
          import('./anim.js').then((m) => m.animateNumbers($('#view'))).catch(() => {});
          setTimeout(() => import('./coach.js').then((m) => m.coach(path)).catch(() => {}), 1100);
          $('#view').classList.add('entering'); clearTimeout(window.__entT); window.__entT = setTimeout(() => $('#view').classList.remove('entering'), 1200);
          // ย้ายโฟกัสไปที่หัวเรื่องของหน้าใหม่ (โปรแกรมอ่านหน้าจอรู้ว่าเปลี่ยนหน้าแล้ว)
          setTimeout(() => { const v = $('#view'); if (v.contains(document.activeElement) || isSheetOpen()) return; const hd = v.querySelector('h1'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }, 60);
        }
        document.title = (node?.dataset?.title ? node.dataset.title + ' · ' : '') + 'AOM CONNECT';
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

// ภาพประกอบหัวหน้า (ลายเส้นเดียวกับหมวดแผน) — ใส่ให้หน้าหลัก ๆ อัตโนมัติ
const ART = [[/^\/clients\/?$/, 'family'], [/^\/work\/calendar$/, 'calendar'], [/^\/brand$/, 'person'], [/^\/work\/sales$/, 'money'], [/^\/work\/goals$/, 'person'], [/^\/tools\/sync$/, 'time'], [/^\/work\/?$/, 'couple'], [/^\/work\/review$/, 'person'], [/^\/tools\/content$/, 'story'], [/^\/clients\/lists$/, 'family'], [/^\/check$/, 'person'], [/^\/tools\/tax$/, 'money'], [/^\/plans\/advisor$/, 'couple']];
function decorate(node, path) {
  try {
    if (/^\/plans\/?$/.test(path) && !clientMode()) { const tb = node?.querySelector?.('.topbar'); if (tb && !node.querySelector('.pl-cta')) tb.after(h('div.pl-cta',
      h('a', { href: '#/plans/stages' }, illus('family', { size: 64 }), h('span', h('b', 'ชุดแผนตามช่วงวัย'), h('small', 'เลือกวัย ได้ชุดตั้งต้นทันที'))),
      h('a', { href: '#/plans/ww' }, illus('health', { size: 64 }), h('span', h('b', 'มี vs ไม่มีประกัน'), h('small', 'เทียบจากบิลจริง'))))); }
    const cm = path.match(/^\/client\/([\w-]+)$/); const head = cm && node?.querySelector?.('.client-head');
    if (head && !node.querySelector('.c-stats')) { const id = cm[1]; const pol = store.all('policies').filter((x) => x.clientId === id && ['submitted', 'issued'].includes(x.status)); const prem = pol.reduce((t, x) => t + (+x.premium || 0), 0);
      const logs = store.all('logs').filter((x) => x.clientId === id).map((x) => x.date || (x.createdAt || '').slice(0, 10)).sort(); const last = logs.at(-1); const days = last ? Math.max(0, Math.round((Date.now() - Date.parse(last)) / 864e5)) : null;
      const up = store.all('appts').filter((x) => x.clientId === id && x.status === 'planned').length;
      head.classList.add('social'); head.after(h('div.c-stats', [[pol.length, 'กรมธรรม์'], [prem ? Math.round(prem / 1000) + 'k' : '—', 'เบี้ย/ปี'], [days == null ? '—' : days === 0 ? 'วันนี้' : days + ' วัน', 'คุยล่าสุด'], [up, 'นัดที่รออยู่']].map(([v, l]) => h('div', h('b', v), h('span', l))))); }
  } catch (e) { console.error(e); }
  const hit = ART.find(([re]) => re.test(path)); const tb = node?.querySelector?.(':scope > .topbar'); if (!hit || !tb || tb.querySelector('.tb-art')) return;
  const art = illus(hit[1], { size: 72 }); art.classList.add('tb-art');
  const first = tb.firstElementChild; first.after(art);
}

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
  if (typing || e.ctrlKey || e.metaKey || e.altKey || isSheetOpen() || document.body.classList.contains('public')) return;
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
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !['checkbox', 'radio', 'range', 'button', 'file'].includes(a.type)) return;
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
initBasket();
initIsland();
initTilt();
import('./lock.js').then((m) => m.initLock());
setTimeout(() => { if (document.body.classList.contains('public')) return; import('./morning.js').then((m) => { let fresh = false; try { fresh = !localStorage.getItem('advdesk.v1.seenVersion0'); localStorage.setItem('advdesk.v1.seenVersion0', '1'); } catch {} if (fresh && !store.all('clients').length) m.onboarding(); else m.morningBrief(); }); }, 1600);
// การ์ดแผน → หน้าแผน: ขยายต่อเนื่อง (View Transition แบบตั้งชื่อ)
document.addEventListener('click', (e) => { const a = e.target.closest?.('a[href^="#/plan/"], button.prow[class*="cat-"], button.mini-plan'); if (!a || document.querySelector('#view .pp-hero')) return; document.querySelectorAll('[data-morph]').forEach((x) => { x.style.viewTransitionName = ''; delete x.dataset.morph; }); a.style.viewTransitionName = 'pp-hero'; a.dataset.morph = '1'; }, true);
setTimeout(() => { try { if (store.storageUsage().total > 3.5 * 1048576) store.compact({ keepSnaps: 2 }); store.snapshotDaily(); } catch {} }, 4000);
import('./gestures.js').then((m) => m.initGestures()).catch(() => {});
route();
// แสดง "มีอะไรใหม่" ครั้งเดียวหลังอัปเดตเวอร์ชัน
setTimeout(() => {
  const v = APP_VERSION.split(' ')[0];
  let seen = null; try { seen = localStorage.getItem('advdesk.v1.seenVersion'); localStorage.setItem('advdesk.v1.seenVersion', v); } catch {}
  if (seen && seen !== v && !isSheetOpen() && !document.body.classList.contains('public')) showWhatsNew(v);
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
