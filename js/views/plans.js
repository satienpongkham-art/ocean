// ─── คลังแผน v2: หมวดเป็นปุ่มใหญ่ → รายการบรรทัดเดียว → การ์ดแผนแบบแท็บ ───
import { h, icon, sheet, closeSheet, tabs, choices, points, kvlist, fmt } from '../ui.js';
import { PLANS, PLAN, CATEGORIES, CAT, TAX_LABEL, closingInfo, quickFacts, DATA_CHECKED } from '../../data/plans.js';
import { PACKAGES, TIER_LABEL } from '../../data/packages.js';
import { timelineChart, lineChart, legend } from '../charts.js';

const state = { q: '', age: '', kind: 'all' };
const TAX_SHORT = { life: 'หมวดชีวิต', health: 'หมวดสุขภาพ', annuity: 'หมวดบำนาญ', none: 'ไม่ได้', check: 'ตามเงื่อนไข' };

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
const catIcon = (cat) => icon('cat-' + cat);

function matches(p, cat) {
  if (cat && cat !== 'all' && p.cat !== cat) return false;
  if (state.kind === 'main' && p.kind !== 'main') return false;
  if (state.kind === 'rider' && p.kind !== 'rider') return false;
  if (state.kind === 'star' && !p.star) return false;
  if (state.age !== '') { const r = ageRange(p); const a = +state.age; if (r && (a < r.lo || a > r.hi)) return false; }
  const term = state.q.trim().toLowerCase();
  if (term) {
    const hay = [p.name, p.en, p.short, p.tagline, p.what, ...(p.bestFor || []), ...(p.highlights || [])].join(' ').toLowerCase();
    if (!term.split(/\s+/).every((t) => hay.includes(t))) return false;
  }
  return true;
}

function row(p) {
  const ci = closingInfo(p);
  return h('button.prow.cat-' + p.cat, { onclick: () => { location.hash = '#/plan/' + p.id; } },
    h('span.pi', catIcon(p.cat)),
    h('span.pt', h('b', p.short), h('span', p.tagline)),
    h('span.pr', ci && !ci.closed ? h('span.tag.red', `${ci.days} วัน`) : null, p.star && !(ci && !ci.closed) ? h('span.tag.line', 'แนะนำ') : null, icon('next')));
}

function filterSheet(onApply) {
  const ageIn = h('input.input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, value: state.age, placeholder: 'เช่น 35' });
  const kind = choices('kind', state.kind, [['all', 'ทั้งหมด'], ['star', 'แผนแนะนำ'], ['main', 'สัญญาหลัก'], ['rider', 'สัญญาเพิ่มเติม']]);
  sheet({
    title: 'กรองแผน',
    body: h('div',
      h('div.q', h('span.ql', 'อายุลูกค้า'), ageIn, h('div.money-row', [5, 25, 35, 45, 55, 65].map((a) => h('button', { type: 'button', onclick: () => { ageIn.value = a; } }, a + ' ปี')))),
      h('div.q', h('span.ql', 'ประเภท'), kind),
      h('div.row', { style: { gap: '8px', marginTop: '6px' } },
        h('button.btn', { style: { flex: 1 }, onclick: () => { state.age = ''; state.kind = 'all'; closeSheet(true); onApply(); } }, 'ล้างตัวกรอง'),
        h('button.btn.primary', { style: { flex: 1 }, onclick: () => { state.age = ageIn.value; state.kind = kind.getValue(); closeSheet(true); onApply(); } }, 'ใช้ตัวกรอง'))),
  });
}

export function renderCatalog(q = {}, openId) {
  const cat = q.cat && CAT[q.cat] ? q.cat : null;
  const root = h('div', { 'data-title': cat ? CAT[cat].name : 'แผนประกัน' });
  const results = h('div');
  const filtered = () => state.age !== '' || state.kind !== 'all';
  const filterBtn = h('button.icon-btn.filter-btn', { style: { width: '48px', height: '48px', background: 'var(--card)', borderRadius: '12px' }, onclick: () => filterSheet(draw), 'aria-label': 'กรอง' }, icon('filter'), filtered() ? h('span.badge') : null);

  function draw() {
    filterBtn.querySelector('.badge')?.remove(); if (filtered()) filterBtn.append(h('span.badge'));
    const searching = state.q.trim() !== '' || filtered();
    if (!cat && !searching) { results.replaceChildren(home()); return; }
    const items = PLANS.filter((p) => matches(p, cat));
    const note = [state.age !== '' ? `อายุ ${state.age} ปี` : null, { star: 'แผนแนะนำ', main: 'สัญญาหลัก', rider: 'สัญญาเพิ่มเติม' }[state.kind]].filter(Boolean).join(' · ');
    results.replaceChildren(
      h('div.row.between', { style: { margin: '14px 2px 8px' } }, h('span.small.muted', `${items.length} แผน${note ? ' · ' + note : ''}`), filtered() ? h('button.btn.sm.ghost', { onclick: () => { state.age = ''; state.kind = 'all'; draw(); } }, 'ล้าง') : null),
      items.length ? h('div.plist', items.map(row)) : h('div.card.empty', 'ไม่พบแผนที่ตรงเงื่อนไข'));
  }

  function home() {
    const closing = PLANS.map((p) => ({ p, c: closingInfo(p) })).filter((x) => x.c && !x.c.closed);
    return h('div',
      ...closing.map(({ p, c }) => h('button.prow.cat-' + p.cat, { style: { borderRadius: '18px', marginTop: '14px', background: 'var(--accent-soft)' }, onclick: () => { location.hash = '#/plan/' + p.id; } },
        h('span.pi', { style: { background: 'var(--accent)', color: '#fff' } }, icon('clock')),
        h('span.pt', h('b', `${p.short} ปิดรับอีก ${c.days} วัน`), h('span', 'แตะเพื่อดูรายละเอียดก่อนแนะนำลูกค้า')), h('span.pr', icon('next')))),
      h('div.section', h('h2', 'เลือกหมวด'),
        h('div.cat-tiles', CATEGORIES.map((c) => h('button.cat-tile.cat-' + c.id, { onclick: () => { location.hash = '#/plans?cat=' + c.id; } },
          h('span.ci', catIcon(c.id)), h('div', h('b', c.name), h('span', `${PLANS.filter((p) => p.cat === c.id).length} แผน`)))))),
      h('div.section', h('h2', 'แผนที่แนะนำบ่อย'),
        h('div.hscroll', PLANS.filter((p) => p.star).map((p) => h('button.mini-plan.cat-' + p.cat, { onclick: () => { location.hash = '#/plan/' + p.id; } },
          h('small', CAT[p.cat].short), h('b', p.short), h('span', p.tagline))))),
      h('p.xs.muted', { style: { marginTop: '14px' } }, `ข้อมูลจาก aia.co.th · ตรวจเมื่อ ${thDate(DATA_CHECKED)}`));
  }

  const search = h('div.searchbar',
    h('div.search', icon('search'), h('input.input', { type: 'search', placeholder: cat ? `ค้นหาใน${CAT[cat].short}` : 'ค้นหาแผน เช่น เหมาจ่าย มะเร็ง', value: state.q, oninput: (e) => { state.q = e.target.value; draw(); } })),
    filterBtn);

  root.append(...[
    cat
      ? h('div.back-row.cat-' + cat, h('a.icon-btn', { href: '#/plans', 'aria-label': 'กลับ' }, icon('back')), h('span.ci', catIcon(cat)), h('div', h('h1.serif', { style: { fontSize: '22px' } }, CAT[cat].name), h('div.small.muted', CAT[cat].desc)))
      : h('div.topbar', h('div', h('h1', 'แผนประกัน'), h('div.sub', `AIA ช่องทางตัวแทน · ${PLANS.length} แผน`))),
    cat ? null : tabsPlans('catalog'),
    h('div', { style: { marginTop: '14px' } }, search),
    results].filter(Boolean));
  draw();
  if (openId && PLAN[openId]) setTimeout(() => openPlan(openId), 0);
  return root;
}

export function tabsPlans(active) {
  const t = [['catalog', 'คลังแผน', '#/plans'], ['packages', 'แพ็กเกจ', '#/plans/packages'], ['advisor', 'แนะนำลูกค้า', '#/plans/advisor'], ['cases', 'ตัวอย่างเคส', '#/plans/cases']];
  return h('div.seg', t.map(([id, l, href]) => h('button', { class: id === active ? 'on' : '', onclick: () => { location.hash = href; } }, l)));
}
const thDate = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getMonth()] + ' ' + (d.getFullYear() + 543); };
const sub = (t) => h('div.section', { style: { marginTop: '18px' } }, h('h2', t));
function table(t) {
  return h('div.table-wrap', h('table.t', h('thead', h('tr', t.cols.map((c, i) => h('th', { class: i ? 'r' : '' }, c)))), h('tbody', t.rows.map((r) => h('tr', r.map((c, i) => h('td', { class: i ? 'r num' : '' }, c)))))));
}

// ── แท็บต่าง ๆ ของการ์ดแผน ────────────────────────────────
function tabSummary(p) {
  return h('div',
    h('p.lead', p.what),
    sub('เหมาะกับ'), h('div.fit', (p.bestFor || []).slice(0, 3).map((x) => h('span', x))),
    sub('จุดเด่น'), points(p.highlights || [], { kind: 'plain', limit: 3 }),
    p.pros?.length ? [sub('ทำไมแผนนี้ดี'), points(p.pros, { kind: 'good', limit: 3 })] : null,
    p.pairs?.length ? [sub('ขายคู่กับ'), h('div.row.wrap', { style: { gap: '6px' } }, p.pairs.filter((x) => PLAN[x]).map((x) => h('button.chip', { onclick: () => { location.hash = '#/plan/' + x; } }, h('span.dot', { style: { background: `var(--c-${PLAN[x].cat})` } }), PLAN[x].short)))] : null);
}

function tabCover(p) {
  const wrap = h('div');
  if (p.plans) {
    const cols = p.plans.cols.slice(1);
    const view = h('div', { style: { marginTop: '10px' } });
    const show = (i) => view.replaceChildren(kvlist(p.plans.rows.map((r) => [r[0], r[i + 1]])));
    wrap.append(h('div.small.muted', { style: { marginBottom: '8px' } }, 'เลือกแผนเพื่อดูความคุ้มครอง'), choices('pp', '0', cols.map((c, i) => [String(i), c]), { onChange: (v) => show(+v) }), view);
    show(0);
  }
  wrap.append(sub(p.plans ? 'สรุปผลประโยชน์' : 'ผลประโยชน์'), kvlist(p.benefits || []));
  // กราฟระยะเวลา
  const range = ageRange(p);
  let age = Math.min(Math.max(35, range?.lo ?? 0), range?.hi ?? 70);
  const chart = h('div');
  const out = h('b.small.nowrap', age + ' ปี');
  const drawTL = () => chart.replaceChildren(timelineChart(p.timeline || {}, { age, color: `var(--c-${p.cat})` }));
  drawTL();
  wrap.append(sub('ระยะจ่ายเบี้ย & ความคุ้มครอง'), h('div.card', chart,
    range ? h('div.row', { style: { marginTop: '6px', gap: '10px' } }, h('span.small.muted', 'ถ้าเริ่มที่อายุ'), h('input', { type: 'range', min: range.lo, max: range.hi, value: age, style: { flex: 1 }, oninput: (e) => { age = +e.target.value; out.textContent = age + ' ปี'; drawTL(); }, 'aria-label': 'อายุเริ่มต้น' }), out) : null));
  return wrap;
}

function tabPremium(p) {
  const wrap = h('div');
  if (p.premiumByAge) {
    const pb = p.premiumByAge; let band = 0, cls = 'class1';
    const big = h('div.big-num');
    const paint = () => { big.textContent = fmt(pb[cls][band]) + ' บาท/ปี'; };
    wrap.append(h('div.card',
      h('div.small.muted', 'เบี้ยตามอายุ (อัตราในโบรชัวร์)'), big,
      h('div.q', { style: { marginTop: '12px' } }, h('span.ql', 'อายุ'), choices('band', '0', [['0', '≤ 60'], ['1', '61–65'], ['2', '66–70'], ['3', '71–75']], { onChange: (v) => { band = +v; paint(); } })),
      h('div.q', { style: { marginBottom: 0 } }, h('span.ql', 'ขั้นอาชีพ'), choices('cls', 'class1', [['class1', 'ขั้น 1 (งานสำนักงาน)'], ['class2', 'ขั้น 2']], { onChange: (v) => { cls = v; paint(); } }))));
    paint();
  }
  if (p.example) wrap.append(h('div.card', { style: { marginTop: p.premiumByAge ? '12px' : 0 } }, h('div.small.muted', 'ตัวอย่างจากโบรชัวร์'), h('p', { style: { fontSize: '16px', marginTop: '4px' } }, p.example.text), h('div.source', p.example.source)));
  if (p.table) {
    wrap.append(sub(p.table.title), table(p.table));
    if (p.table.chart) wrap.append(h('div.card', { style: { marginTop: '10px' } }, lineChart(p.table.chart, { type: p.table.chart.series.length > 1 ? 'line' : 'bar' }), legend(p.table.chart.series)));
  }
  if (!p.example && !p.premiumByAge && !p.table) wrap.append(h('div.card', h('p', 'AIA ไม่ได้ระบุตัวอย่างเบี้ยของแผนนี้บนเว็บ'), h('p.small.muted', { style: { marginTop: '6px' } }, 'ดูจากโบรชัวร์ หรือออกใบเสนอในระบบ AIA')));
  wrap.append(h('div.callout.small', { style: { marginTop: '12px' } }, 'เบี้ยจริงขึ้นกับเพศ อายุ อาชีพ สุขภาพ — ใช้ใบเสนอจากระบบ AIA เสมอ'));
  const pk = PACKAGES.flatMap((pkg) => Object.entries(pkg.tiers).filter(([, t]) => t.items.some((it) => it.plan === p.id)).map(([tk]) => ({ pkg, tk })));
  if (pk.length) wrap.append(sub('อยู่ในแพ็กเกจ'), h('div.row.wrap', { style: { gap: '6px' } }, pk.map(({ pkg, tk }) => h('a.chip', { href: `#/plans/packages?p=${pkg.id}` }, `${pkg.name} · ${TIER_LABEL[tk]}`))));
  return wrap;
}

function tabWatch(p) {
  return h('div',
    p.watch?.length ? points(p.watch, { kind: 'warn' }) : h('p.muted', 'ไม่มีข้อควรระวังเพิ่มเติม'),
    sub('เงื่อนไขการรับประกัน'), kvlist(p.specs || []),
    sub('ลดหย่อนภาษี'), h('p.small', TAX_LABEL[p.tax]),
    h('p.source', { style: { marginTop: '14px' } }, 'ข้อมูลเบื้องต้นเพื่อประกอบการนำเสนอ ความคุ้มครองและเงื่อนไขเป็นไปตามกรมธรรม์'));
}

/** การ์ดป๊อปอัปรายละเอียดแผน (แบบแท็บ) */
export function openPlan(id) {
  const p = PLAN[id]; if (!p) return;
  const ci = closingInfo(p);
  const qf = quickFacts(p);
  const t = tabs([['sum', 'สรุป'], ['cover', 'ความคุ้มครอง'], ['prem', 'เบี้ย'], ['watch', 'ข้อควรรู้']], 'sum', (k) => ({ sum: tabSummary, cover: tabCover, prem: tabPremium, watch: tabWatch })[k](p), { sticky: true, onChange: () => { const b = document.querySelector('.sheet.plan .sheet-body'); if (b && b.scrollTop > 160) b.scrollTop = 150; } });

  const head = h('div.plan-head.cat-' + p.cat, h('span.ci', catIcon(p.cat)), h('div', h('div.xs', { style: { color: `var(--c-${p.cat})`, fontWeight: 600 } }, CAT[p.cat].name + (p.kind === 'rider' ? ' · สัญญาเพิ่มเติม' : ' · สัญญาหลัก')), h('h2', p.short), h('div.tl', p.tagline)));
  const body = h('div.cat-' + p.cat,
    h('div.facts', h('div.fact', h('span', 'อายุรับ'), h('b', qf.age || '—')), h('div.fact', h('span', 'จ่ายเบี้ย'), h('b', qf.pay || '—')), h('div.fact', h('span', 'คุ้มครอง'), h('b', (qf.cover || '—').replace('คุ้มครอง', '').trim() || '—'))),
    ci && !ci.closed ? h('div.close-banner', icon('clock'), `ปิดรับใบคำขออีก ${ci.days} วัน (${thDate(ci.date)})`) : null,
    ci && ci.closed ? h('div.callout.warn', { style: { marginTop: '10px' } }, 'ปิดรับใบคำขอแล้ว — ใช้อ้างอิงลูกค้าเดิม') : null,
    h('div', { style: { marginTop: '8px' } }, t.bar, t.panel));

  const panel = sheet({
    title: head, body, cls: 'plan',
    onClose: () => { if (location.hash.startsWith('#/plan/')) history.length > 1 ? history.back() : (location.hash = '#/plans'); },
  });
  panel.append(h('div.sheet-actions',
    h('a.btn.primary', { href: p.url, target: '_blank', rel: 'noopener' }, icon('ext'), 'หน้า AIA'),
    p.brochure ? h('a.btn', { href: p.brochure, target: '_blank', rel: 'noopener' }, icon('doc'), 'โบรชัวร์') : null,
    h('a.btn', { href: `#/tools/captions?plan=${p.id}` }, icon('pen'), 'ทำโพสต์')));
}
