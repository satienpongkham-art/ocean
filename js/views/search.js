// ─── ค้นหาทุกอย่างในช่องเดียว: ลูกค้า · แผน · เคส · ข้อโต้แย้ง · เมนู ───
import { h, icon, initials, empty } from '../ui.js';
import * as store from '../store.js';
import { PLANS, CAT } from '../../data/plans.js';
import { CASES } from '../../data/cases.js';
import { OBJECTIONS } from '../../data/objections.js';
import { PACKAGES } from '../../data/packages.js';

// คำสั่ง: [ชื่อ, คำค้น, ไอคอน, ลิงก์ หรือ ฟังก์ชัน]
const COMMANDS = [
  ['เพิ่มลูกค้าใหม่', 'เพิ่ม ลูกค้า รายชื่อ ใหม่ new', 'plus', '#/client/new'],
  ['ลงนัดใหม่', 'นัด appointment ปฏิทิน', 'cal', () => import('./common.js').then((m) => m.apptSheet())],
  ['บันทึกขายได้ / กรมธรรม์', 'ขาย ปิด กรมธรรม์ ยอด policy', 'star', () => import('./common.js').then((m) => m.policySheet())],
  ['บันทึกโทร +1 คะแนน', 'โทร call ทัก คะแนน', 'phone', () => import('./common.js').then((m) => m.logActivity('call', null))],
  ['โหมดโทรรวด', 'โทร รวด power hour สคริปต์', 'flame', '#/work/call'],
  ['ปฏิทิน', 'ปฏิทิน calendar วันเกิด นัด', 'cal', '#/work/calendar'],
  ['ตรวจสุขภาพการเงิน', 'ตรวจ การเงิน fhc แมนฮาร่า', 'grid', '#/check'],
  ['คำนวณภาษี', 'ภาษี ลดหย่อน tax', 'tax', '#/tools/tax'],
  ['Copayment ร่วมจ่าย', 'copay copayment ร่วมจ่าย มาตรฐานใหม่ สุขภาพ', 'info', '#/plans/copay'],
  ['ระยะรอคอย & ข้อยกเว้น', 'รอคอย ยกเว้น waiting โรค', 'clock', '#/plans/waiting'],
  ['แผนที่การแนบสัญญา', 'แนบ สัญญา rider จัดชุด', 'layers', '#/plans/attach'],
  ['ตารางเบี้ยจริง', 'ตาราง เบี้ย นำเข้า premium', 'tax', '#/tools/premiums'],
  ['เทียบกับสวัสดิการ', 'สวัสดิการ ประกันกลุ่ม ประกันสังคม บัตรทอง', 'shield', '#/tools/benefits'],
  ['คำศัพท์ภาษาง่าย', 'คำศัพท์ glossary ความหมาย', 'book', '#/tools/glossary'],
  ['ฝึกจำแผน', 'ฝึก quiz จำ แผน', 'bulb', '#/tools/train'],
  ['ซ้อมข้อโต้แย้ง', 'ข้อโต้แย้ง ซ้อม objection', 'chat', '#/tools/train?t=obj'],
  ['รับมือข้อโต้แย้ง (การ์ด)', 'ข้อโต้แย้ง objection การ์ด', 'chat', '#/tools/objections'],
  ['แคปชั่นโพสต์', 'แคปชั่น โพสต์ เฟซบุ๊ก ติ๊กต็อก ig', 'pen', '#/tools/captions'],
  ['เป้าหมาย & ตัวเลข', 'เป้า ค่าคอม เป้าหมาย', 'target', '#/work/goals'],
  ['ยอดขาย', 'ยอดขาย กรมธรรม์ ครบชำระ', 'line', '#/work/sales'],
  ['ท่อการขาย', 'ท่อ pipeline ขั้น', 'work', '#/work'],
  ['ต่อชุดแผน / จัดตามงบ', 'ต่อชุด เลโก้ งบ จัดแผน budget', 'layers', '#/plans/build'],
  ['แผนที่ร่างกาย', 'ร่างกาย หัวใจ มะเร็ง ไส้ติ่ง body', 'heart', '#/plans/body'],
  ['เส้นทางชีวิต', 'เส้นทาง ช่วงชีวิต แต่งงาน ลูก เกษียณ', 'compass', '#/plans/path'],
  ['เครื่องคิดเกษียณ', 'เกษียณ เงินเฟ้อ เครื่องคิด retire', 'cat-annuity', '#/tools/calc/retire'],
  ['ทุนการศึกษาลูก', 'การศึกษา ลูก ทุน education', 'cat-saving', '#/tools/calc/edu'],
  ['เงินสำรองฉุกเฉิน', 'เงินสำรอง ฉุกเฉิน เป้าออม emergency', 'shield', '#/tools/calc/emergency'],
  ['ออมเร็ว vs ช้า', 'ดอกเบี้ยทบต้น compound ออม', 'line', '#/tools/calc/grow'],
  ['แบบทดสอบลูกค้า + ลิงก์', 'แบบทดสอบ quiz ลิงก์ ไบโอ คนทั่วไป', 'link', '#/tools/calc'],
  ['สตูดิโอคอนเทนต์', 'สตูดิโอ ภาพหลายหน้า carousel โพสต์ คลิป', 'pen', '#/studio'],
  ['แบรนด์ของฉัน', 'แบรนด์ ไบโอ จุดยืน ภารกิจ 30 วัน personal branding', 'star', '#/brand'],
  ['ปฏิทินคอนเทนต์', 'คอนเทนต์ โพสต์ แบรนด์ content', 'cal', '#/tools/content'],
  ['ภาพทิปการเงิน', 'ทิป ภาพ โพสต์', 'pen', '#/tools/tipcard'],
  ['แชร์นามบัตร', 'นามบัตร card', 'share', () => import('../card.js').then((m) => m.shareCard())],
  ['ตัวช่วยเลือกแผน', 'เลือกแผน ตัวไหนดี finder แนะนำ', 'compass', '#/plans/finder'],
  ['โหมดลูกค้า', 'โหมดลูกค้า ยื่นมือถือ ซ่อนข้อมูล', 'user', () => import('../app.js').then((m) => m.setClientMode(true))],
  ['จำลองเหตุการณ์', 'จำลอง ป่วย มะเร็ง อุบัติเหตุ ต้องจ่ายเอง', 'flame', '#/tools/simulate'],
  ['รายชื่ออัจฉริยะ', 'รายชื่อ กรอง เงื่อนไข smart list', 'filter', '#/clients/lists'],
  ['มีอะไรใหม่', 'อัปเดต ใหม่ เวอร์ชัน changelog', 'info', () => import('../app.js').then((m) => m.showWhatsNew(m.APP_VERSION.split(' ')[0]))],
  ['ลูกค้าที่ยังไม่มีขั้นต่อไป', 'ขั้นต่อไป ตกหล่น ติดตาม', 'next', '#/clients?f=nonext'],
  ['เทียบแผน', 'เทียบ compare', 'plans', '#/plans/compare'],
  ['แนะนำลูกค้า', 'แนะนำ advisor แพ็กเกจ', 'compass', '#/plans/advisor'],
  ['การแสดงผล ธีม ตัวอักษร', 'ธีม สี ตัวอักษร โหมดมืด ระยะบรรทัด การเข้าถึง', 'today', '#/tools/display'],
  ['ซิงก์ & สำรองข้อมูล', 'ซิงก์ สำรอง google sheets', 'sync', '#/tools/sync'],
  ['ปุ่มลัดคีย์บอร์ด', 'คีย์บอร์ด ปุ่มลัด shortcut', 'key', () => import('../app.js').then((m) => m.showShortcuts())],
];
const POPULAR = ['เพิ่มลูกค้าใหม่', 'ลงนัดใหม่', 'โหมดโทรรวด', 'ตรวจสุขภาพการเงิน', 'Copayment ร่วมจ่าย', 'คำนวณภาษี'];
let lastQ = '';

export function renderSearch(qs = {}) {
  if (qs.q != null) lastQ = qs.q;
  const out = h('div');
  const go = (href) => () => { location.hash = href; };
  const draw = () => {
    const t = lastQ.trim().toLowerCase();
    const grp = (title, items) => items.length ? h('div.res-group', h('h2', `${title} (${items.length})`), h('div.plist', items)) : null;
    const row = (ic, title, sub, onclick, cat) => h('button.prow' + (cat ? '.cat-' + cat : ''), { onclick }, h('span.pi', typeof ic === 'string' ? icon(ic) : ic), h('span.pt', h('b', title), h('span', sub)), h('span.pr', icon('next')));
    const run = (a) => () => (typeof a === 'string' ? go(a)() : a());
    const cmdRow = ([label, , ic, a]) => row(ic, label, 'คำสั่ง', run(a));
    if (!t) {
      let rec = []; try { rec = JSON.parse(localStorage.getItem('advdesk.v1.recent') || '[]').map((id) => store.get('clients', id)).filter(Boolean); } catch {}
      out.replaceChildren(
        rec.length ? h('div.res-group', h('h2', 'ลูกค้าที่เพิ่งเปิด'), h('div.plist', rec.map((c) => row(h('b', initials(c.nick)), c.nick, [c.occupation, c.phone].filter(Boolean).join(' · ') || 'ลูกค้า', go('#/client/' + c.id))))) : null,
        h('div.res-group', h('h2', 'คำสั่งยอดนิยม'), h('div.plist', COMMANDS.filter(([l]) => POPULAR.includes(l)).map(cmdRow))),
        h('p.small.muted', { style: { marginTop: '14px' } }, 'พิมพ์ชื่อลูกค้า ชื่อแผน คำสั่ง หรือคำ เช่น "นัด" "มะเร็ง" "ภาษี" · กด Enter เพื่อเปิดผลแรก · ลูกศรขึ้น/ลงเพื่อเลือก'));
      return;
    }
    const has = (...xs) => t.split(/\s+/).every((w) => xs.join(' ').toLowerCase().includes(w));
    const clients = store.all('clients').filter((c) => has(c.nick, c.phone, c.occupation, c.notes)).slice(0, 8);
    const plans = PLANS.filter((p) => has(p.name, p.en, p.short, p.tagline, p.what, ...(p.highlights || []))).slice(0, 8);
    const pkgs = PACKAGES.filter((p) => has(p.name, p.persona, p.goal));
    const cases = CASES.filter((c) => has(c.title, c.profile, c.problem)).slice(0, 4);
    const objs = OBJECTIONS.filter((o) => has(o.say, o.tag, ...o.steps)).slice(0, 4);
    const cmds = COMMANDS.filter(([l, k]) => has(l, k)).slice(0, 6);
    const groups = [
      grp('คำสั่ง', cmds.map(cmdRow)),
      grp('ลูกค้า', clients.map((c) => row(h('b', initials(c.nick)), c.nick, [c.occupation, c.phone].filter(Boolean).join(' · ') || 'ลูกค้า', go('#/client/' + c.id)))),
      grp('แผนประกัน', plans.map((p) => row('cat-' + p.cat, p.short, p.tagline, go('#/plan/' + p.id), p.cat))),
      grp('แพ็กเกจ', pkgs.map((p) => row('package', p.name, p.goal, go('#/plans/packages?p=' + p.id)))),
      grp('ข้อโต้แย้ง', objs.map((o) => row('chat', '"' + o.say + '"', o.steps[2] || o.tip, go('#/tools/objections')))),
      grp('ตัวอย่างเคส', cases.map((c) => row('book', c.title.split(' — ')[0], c.title.split(' — ')[1] || '', go('#/plans/cases')))),
    ].filter(Boolean);
    out.replaceChildren(...(groups.length ? groups : [h('div.card', { style: { marginTop: '16px' } }, empty('ไม่พบ "' + lastQ + '"', 'search', h('a.btn.primary', { href: '#/client/new', onclick: () => sessionStorage.setItem('prefill', JSON.stringify({ nick: lastQ.trim() })) }, icon('plus'), `เพิ่ม "${lastQ.trim()}" เป็นลูกค้าใหม่`), 'ลองคำที่สั้นลง หรือค้นด้วยเบอร์โทร'))]));
  };
  const inp = h('input.input', { type: 'search', placeholder: 'ค้นหาหรือสั่งงาน เช่น นัด, ภาษี, ชื่อลูกค้า', value: lastQ, autofocus: true, 'aria-label': 'ค้นหาหรือสั่งงาน', 'aria-controls': 'search-results',
    oninput: (e) => { lastQ = e.target.value; history.replaceState(null, '', '#/search?q=' + encodeURIComponent(lastQ)); draw(); },
    onkeydown: (e) => { const items = [...out.querySelectorAll('.prow')]; if (e.key === 'Enter' && items[0]) { e.preventDefault(); items[0].click(); } if (e.key === 'ArrowDown' && items[0]) { e.preventDefault(); items[0].focus(); } } });
  out.id = 'search-results';
  out.addEventListener('keydown', (e) => { const items = [...out.querySelectorAll('.prow')]; const i = items.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); i === 0 ? inp.focus() : items[i - 1].focus(); } });
  draw();
  setTimeout(() => inp.focus(), 50);
  return h('div', { 'data-title': 'ค้นหา' },
    h('div.back-row', h('button.icon-btn', { onclick: () => history.back(), 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, 'ค้นหา')),
    h('div.search.search-hero', icon('search'), inp),
    out);
}
