// ─── ค้นหาทุกอย่างในช่องเดียว: ลูกค้า · แผน · เคส · ข้อโต้แย้ง · เมนู ───
import { h, icon, initials } from '../ui.js';
import * as store from '../store.js';
import { PLANS, CAT } from '../../data/plans.js';
import { CASES } from '../../data/cases.js';
import { OBJECTIONS } from '../../data/objections.js';
import { PACKAGES } from '../../data/packages.js';

const MENUS = [
  ['คำนวณภาษี ลดหย่อน', '#/tools/tax', 'tax'], ['แคปชั่น โพสต์ เฟซบุ๊ก ติ๊กต็อก', '#/tools/captions', 'pen'], ['โทรนัด สคริปต์', '#/work/call', 'phone'],
  ['เป้าหมาย ตัวเลข ค่าคอม', '#/work/goals', 'target'], ['ยอดขาย กรมธรรม์', '#/work/sales', 'line'], ['ซิงก์ สำรองข้อมูล google sheets', '#/tools/sync', 'sync'],
  ['การแสดงผล ตัวอักษร โหมดมืด ติดตั้งแอป', '#/tools/display', 'user'], ['แมนฮาร่า เป้าหมาย', '#/work/mandala', 'grid'], ['เทียบแผน', '#/plans/compare', 'plans'], ['แนะนำลูกค้า', '#/plans/advisor', 'compass'],
];
let lastQ = '';

export function renderSearch(qs = {}) {
  if (qs.q != null) lastQ = qs.q;
  const out = h('div');
  const go = (href) => () => { location.hash = href; };
  const draw = () => {
    const t = lastQ.trim().toLowerCase();
    if (!t) { out.replaceChildren(h('p.small.muted', { style: { marginTop: '16px' } }, 'พิมพ์ชื่อลูกค้า ชื่อแผน หรือคำ เช่น "มะเร็ง" "ภาษี" "ขอคิดดู"')); return; }
    const has = (...xs) => t.split(/\s+/).every((w) => xs.join(' ').toLowerCase().includes(w));
    const clients = store.all('clients').filter((c) => has(c.nick, c.phone, c.occupation, c.notes)).slice(0, 8);
    const plans = PLANS.filter((p) => has(p.name, p.en, p.short, p.tagline, p.what, ...(p.highlights || []))).slice(0, 8);
    const pkgs = PACKAGES.filter((p) => has(p.name, p.persona, p.goal));
    const cases = CASES.filter((c) => has(c.title, c.profile, c.problem)).slice(0, 4);
    const objs = OBJECTIONS.filter((o) => has(o.say, o.tag, ...o.steps)).slice(0, 4);
    const menus = MENUS.filter(([k]) => has(k));
    const grp = (title, items) => items.length ? h('div.res-group', h('h2', `${title} (${items.length})`), h('div.plist', items)) : null;
    const row = (ic, title, sub, onclick, cat) => h('button.prow' + (cat ? '.cat-' + cat : ''), { onclick }, h('span.pi', typeof ic === 'string' ? icon(ic) : ic), h('span.pt', h('b', title), h('span', sub)), h('span.pr', icon('next')));
    const groups = [
      grp('ลูกค้า', clients.map((c) => row(h('b', initials(c.nick)), c.nick, [c.occupation, c.phone].filter(Boolean).join(' · ') || 'ลูกค้า', go('#/client/' + c.id)))),
      grp('แผนประกัน', plans.map((p) => row('cat-' + p.cat, p.short, p.tagline, go('#/plan/' + p.id), p.cat))),
      grp('แพ็กเกจ', pkgs.map((p) => row('package', p.name, p.goal, go('#/plans/packages?p=' + p.id)))),
      grp('ข้อโต้แย้ง', objs.map((o) => row('chat', '"' + o.say + '"', o.steps[2] || o.tip, go('#/tools/objections')))),
      grp('ตัวอย่างเคส', cases.map((c) => row('book', c.title.split(' — ')[0], c.title.split(' — ')[1] || '', go('#/plans/cases')))),
      grp('เมนู', menus.map(([k, href, ic]) => row(ic, k.split(' ')[0], href.replace('#/', ''), go(href)))),
    ].filter(Boolean);
    out.replaceChildren(...(groups.length ? groups : [h('div.card.empty', { style: { marginTop: '16px' } }, 'ไม่พบผลลัพธ์')]));
  };
  const inp = h('input.input', { type: 'search', placeholder: 'ค้นหาทุกอย่าง', value: lastQ, autofocus: true, oninput: (e) => { lastQ = e.target.value; history.replaceState(null, '', '#/search?q=' + encodeURIComponent(lastQ)); draw(); } });
  draw();
  setTimeout(() => inp.focus(), 50);
  return h('div', { 'data-title': 'ค้นหา' },
    h('div.back-row', h('button.icon-btn', { onclick: () => history.back(), 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, 'ค้นหา')),
    h('div.search.search-hero', icon('search'), inp),
    out);
}
