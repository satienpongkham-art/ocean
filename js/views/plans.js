// ─── คลังแผนประกัน + การ์ดป๊อปอัปรายละเอียดแผน ───
import { h, icon, sheet, closeSheet, fmt, inputEl } from '../ui.js';
import { PLANS, PLAN, CATEGORIES, CAT, TAX_LABEL, closingInfo, quickFacts, DATA_CHECKED } from '../../data/plans.js';
import { PACKAGES, TIER_LABEL } from '../../data/packages.js';
import { timelineChart, lineChart, legend } from '../charts.js';

let state = { cat: 'all', q: '', age: '', kind: 'all' };

/** ช่วงอายุรับประกัน (ปี) จากข้อความ เช่น "15 วัน – 75 ปี" */
export function ageRange(p) {
  const rows = (p.specs || []).filter(([k, v]) => /^อายุ|^Term/.test(k) || /^อายุ/.test(v));
  let lo = Infinity, hi = -Infinity;
  for (const [, v] of rows) {
    for (const m of String(v).matchAll(/(\d+)\s*(วัน|เดือน)?\s*[–-]\s*(\d+)\s*ปี/g)) {
      lo = Math.min(lo, m[2] ? 0 : +m[1]); hi = Math.max(hi, +m[3]);
    }
  }
  return lo === Infinity ? null : { lo, hi };
}

function planCard(p) {
  const qf = quickFacts(p);
  const ci = closingInfo(p);
  return h('button.plan-card.cat-' + p.cat, { onclick: () => { location.hash = '#/plan/' + p.id; } },
    h('div.pc-top',
      h('span.pc-cat', CAT[p.cat].name + (p.kind === 'rider' ? ' · สัญญาเพิ่มเติม' : '')),
      h('span.row', { style: { gap: '4px' } },
        ci && !ci.closed ? h('span.tag.red', icon('clock'), `ปิดรับอีก ${ci.days} วัน`) : null,
        ci && ci.closed ? h('span.tag.bad', 'ปิดรับแล้ว') : null,
        p.star ? h('span.tag.line', 'แนะนำ') : null)),
    h('h3', p.short),
    h('div.pc-tag', p.tagline),
    h('div.pc-meta', qf.age ? h('span', 'อายุ ', h('b', qf.age)) : null, qf.pay ? h('span', h('b', qf.pay)) : null, qf.cover ? h('span', h('b', qf.cover)) : null));
}

export function renderCatalog(q = {}, openId) {
  if (q.cat) state.cat = q.cat;
  const root = h('div', { 'data-title': 'คลังแผนประกัน' });
  const listEl = h('div.grid.g3');
  const countEl = h('span.muted.small');

  const draw = () => {
    const term = state.q.trim().toLowerCase();
    const age = state.age === '' ? null : +state.age;
    const items = PLANS.filter((p) => {
      if (state.cat !== 'all' && p.cat !== state.cat) return false;
      if (state.kind === 'main' && p.kind !== 'main') return false;
      if (state.kind === 'rider' && p.kind !== 'rider') return false;
      if (state.kind === 'star' && !p.star) return false;
      if (age != null) { const r = ageRange(p); if (r && (age < r.lo || age > r.hi)) return false; }
      if (term) {
        const hay = [p.name, p.en, p.short, p.tagline, p.what, ...(p.bestFor || []), ...(p.highlights || [])].join(' ').toLowerCase();
        if (!term.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    countEl.textContent = `${items.length} แผน`;
    listEl.replaceChildren(...(items.length ? items.map(planCard) : [h('div.empty', { style: { gridColumn: '1/-1' } }, 'ไม่พบแผนที่ตรงเงื่อนไข')]));
  };

  const chips = h('div.chips', { role: 'tablist' },
    [['all', 'ทั้งหมด', null], ...CATEGORIES.map((c) => [c.id, c.short, c.id])].map(([id, lab, cat]) =>
      h('button.chip', { class: state.cat === id ? 'on' : '', onclick: (e) => { state.cat = id; [...chips.children].forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } },
        cat ? h('span.dot', { style: { background: `var(--c-${cat})` } }) : null, lab)));

  root.append(
    h('div.topbar', h('div', h('h1', 'คลังแผนประกัน'), h('div.sub', `AIA ช่องทางตัวแทน · ${PLANS.length} แผน · ข้อมูลตรวจกับ aia.co.th เมื่อ ${thDate(DATA_CHECKED)}`))),
    tabsPlans('catalog'),
    h('div.stack', { style: { marginTop: '14px' } },
      h('div.row.wrap', { style: { gap: '8px' } },
        h('div.search', { style: { flex: '1 1 240px' } }, icon('search'), h('input.input', { type: 'search', placeholder: 'ค้นหา เช่น เหมาจ่าย, มะเร็ง, ลดหย่อน, เกษียณ', value: state.q, oninput: (e) => { state.q = e.target.value; draw(); } })),
        h('input.input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, placeholder: 'อายุลูกค้า', value: state.age, style: { width: '120px' }, oninput: (e) => { state.age = e.target.value; draw(); }, 'aria-label': 'กรองตามอายุลูกค้า' }),
        h('select.input', { style: { width: '160px' }, onchange: (e) => { state.kind = e.target.value; draw(); }, 'aria-label': 'ประเภท' },
          [['all', 'ทุกประเภท'], ['star', 'เฉพาะแผนแนะนำ'], ['main', 'สัญญาหลัก'], ['rider', 'สัญญาเพิ่มเติม']].map(([v, l]) => h('option', { value: v, selected: state.kind === v }, l)))),
      chips,
      h('div.row.between', countEl, h('span.muted.xs', 'แตะการ์ดเพื่อดูรายละเอียดเต็ม')),
      listEl));
  draw();
  if (openId && PLAN[openId]) setTimeout(() => openPlan(openId), 0);
  return root;
}

export function tabsPlans(active) {
  const tabs = [['catalog', 'คลังแผน', '#/plans'], ['packages', 'แพ็กเกจ', '#/plans/packages'], ['advisor', 'ระบบแนะนำ', '#/plans/advisor'], ['cases', 'Case study', '#/plans/cases']];
  return h('div.seg', tabs.map(([id, l, href]) => h('button', { class: id === active ? 'on' : '', onclick: () => { location.hash = href; } }, l)));
}
const thDate = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getMonth()] + ' ' + (d.getFullYear() + 543); };

function kvTable(rows, cls = '') {
  return h('div.table-wrap', h('table.t' + cls, h('tbody', rows.map(([k, v]) => h('tr', h('th', { style: { width: '42%', position: 'static' } }, k), h('td', v))))));
}
function gridTable(t, cls = '') {
  return h('div.table-wrap', h('table.t' + cls, h('thead', h('tr', t.cols.map((c, i) => h('th', { class: i ? 'r' : '' }, c)))), h('tbody', t.rows.map((r) => h('tr', r.map((c, i) => h('td', { class: i ? 'r num' : '' }, c)))))));
}
function block(title, ...body) { return h('div.section', h('h2', title), ...body); }

/** การ์ดป๊อปอัปรายละเอียดแผน */
export function openPlan(id) {
  const p = PLAN[id]; if (!p) return;
  const ci = closingInfo(p);
  const qf = quickFacts(p);
  const pk = PACKAGES.flatMap((pkg) => Object.entries(pkg.tiers).filter(([, t]) => t.items.some((it) => it.plan === id)).map(([tk]) => ({ pkg, tk })));

  // กราฟระยะเวลา + ปรับอายุตัวอย่าง
  const tlWrap = h('div');
  const range = ageRange(p);
  let sampleAge = Math.min(Math.max(35, range?.lo ?? 0), range?.hi ?? 70);
  const drawTL = () => tlWrap.replaceChildren(timelineChart(p.timeline || {}, { age: sampleAge, color: `var(--c-${p.cat})` }));
  drawTL();
  let ageOut;

  const body = h('div.cat-' + p.cat,
    h('div.hero-plan',
      h('div.row.wrap', { style: { gap: '6px', marginBottom: '8px' } },
        h('span.tag', { style: { color: `var(--c-${p.cat})` } }, CAT[p.cat].name),
        h('span.tag', p.kind === 'rider' ? 'สัญญาเพิ่มเติม (ต้องแนบแบบหลัก)' : 'สัญญาหลัก'),
        p.vitality ? h('span.tag', 'AIA Vitality') : null,
        p.star ? h('span.tag.line', 'แผนแนะนำ') : null),
      h('p.what', p.what),
      h('div.kv',
        h('div', h('span', 'อายุรับประกัน'), h('b', qf.age || '—')),
        h('div', h('span', 'ชำระเบี้ย'), h('b', qf.pay || '—')),
        h('div', h('span', 'คุ้มครอง'), h('b', qf.cover || '—')),
        h('div', h('span', 'ภาษี'), h('b', { title: TAX_LABEL[p.tax] }, { life: 'หมวดชีวิต', health: 'หมวดสุขภาพ', annuity: 'หมวดบำนาญ', none: 'ไม่ได้', check: 'ตามเงื่อนไข' }[p.tax] || '—')))),

    ci && !ci.closed ? h('div.callout.red', { style: { marginTop: '12px' } }, h('b', `ปิดรับใบคำขออีก ${ci.days} วัน`), ` (กำหนด ${thDate(ci.date)} ตามข่าว — ยืนยันกับระบบตัวแทนอีกครั้ง)`) : null,
    ci && ci.closed ? h('div.callout.warn', { style: { marginTop: '12px' } }, 'แผนนี้ปิดรับใบคำขอแล้ว — ใช้เพื่ออ้างอิงสำหรับลูกค้าเดิม') : null,

    block('เหมาะกับใคร', h('ul.ticks', (p.bestFor || []).map((x) => h('li', x)))),
    block('จุดเด่น (ตามที่ AIA ระบุ)', h('ul.dots', (p.highlights || []).map((x) => h('li', x)))),
    p.pros?.length ? block('ทำไมแผนนี้ถึงดี', h('ul.ticks', p.pros.map((x) => h('li', x)))) : null,
    p.watch?.length ? block('ข้อควรรู้ก่อนเสนอ', h('ul.warns', p.watch.map((x) => h('li', x)))) : null,

    p.plans ? block(p.plans.title, gridTable(p.plans, '.compare')) : null,

    block('ระยะเวลาจ่ายเบี้ย & คุ้มครอง',
      h('div.card', tlWrap,
        range ? h('div.row', { style: { marginTop: '8px', gap: '10px' } },
          h('span.small.muted.nowrap', 'อายุตัวอย่าง'),
          h('input', { type: 'range', min: range.lo, max: range.hi, value: sampleAge, style: { flex: 1 }, oninput: (e) => { sampleAge = +e.target.value; ageOut.textContent = sampleAge + ' ปี'; drawTL(); }, 'aria-label': 'อายุตัวอย่าง' }),
          (ageOut = h('b.small.nowrap', sampleAge + ' ปี'))) : null)),

    p.example ? block('ตัวอย่างเบี้ย / ผลประโยชน์', h('div.callout', p.example.text), h('div.source', 'ที่มา: ' + p.example.source + ' — เบี้ยจริงขึ้นกับเพศ อายุ อาชีพ สุขภาพ ใช้ใบเสนอจากระบบ AIA')) : null,
    p.table ? block(p.table.title, gridTable(p.table), p.table.chart ? h('div.card', { style: { marginTop: '10px' } }, lineChart(p.table.chart, { type: p.table.chart.series.length > 1 ? 'line' : 'bar' }), legend(p.table.chart.series), h('div.source', p.table.chart.unit)) : null) : null,
    p.premiumTable ? block(p.premiumTable.title, gridTable(p.premiumTable), h('div.source', p.premiumTable.source)) : null,

    block('ตารางผลประโยชน์โดยย่อ', kvTable(p.benefits || [])),
    block('เงื่อนไขการรับประกัน', kvTable(p.specs || [])),

    p.pairs?.length ? block('จับคู่กับ', h('div.row.wrap', { style: { gap: '6px' } }, p.pairs.filter((x) => PLAN[x]).map((x) => h('button.chip', { onclick: () => { location.hash = '#/plan/' + x; } }, h('span.dot', { style: { background: `var(--c-${PLAN[x].cat})` } }), PLAN[x].short)))) : null,
    pk.length ? block('อยู่ในแพ็กเกจ', h('div.row.wrap', { style: { gap: '6px' } }, pk.map(({ pkg, tk }) => h('a.chip', { href: `#/plans/packages?p=${pkg.id}` }, `${pkg.name} · ${TIER_LABEL[tk]}`)))) : null,

    h('div.section.row.wrap', { style: { gap: '8px' } },
      h('a.btn.primary', { href: p.url, target: '_blank', rel: 'noopener' }, icon('ext'), 'หน้าแผนบน aia.co.th'),
      p.brochure ? h('a.btn', { href: p.brochure, target: '_blank', rel: 'noopener' }, icon('doc'), 'โบรชัวร์ (PDF)') : null,
      h('a.btn', { href: `#/tools/captions?plan=${p.id}` }, icon('pen'), 'ทำแคปชั่นแผนนี้')),
    h('p.source', { style: { marginTop: '14px' } }, 'ข้อมูลเบื้องต้นเพื่อประกอบการนำเสนอ ความคุ้มครองและเงื่อนไขเป็นไปตามกรมธรรม์ · ' + TAX_LABEL[p.tax]),
  );

  sheet({
    title: p.short,
    sub: h('span', p.name),
    body,
    onClose: () => { if (location.hash.startsWith('#/plan/')) history.length > 1 ? history.back() : (location.hash = '#/plans'); },
  });
}
