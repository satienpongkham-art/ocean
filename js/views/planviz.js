// ─── แผนแบบภาพ: แผนที่ร่างกาย · ต่อชุดแผน (+ จัดตามงบ) · เส้นทางชีวิต ───
import { h, icon, choices, fmt, toast, T } from '../ui.js';
import * as store from '../store.js';
import { PLANS, PLAN, CAT } from '../../data/plans.js';
import { lookup } from '../engine/premium.js';
import { ageRange } from './plans.js';
import { rerender } from '../app.js';
import { clientAge } from './clients.js';
import { haptic } from '../pwa.js';
import { getBasket, setBasket } from '../basket.js';

const back = (href, title, sub) => h('div.back-row', h('a.icon-btn', { href, 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1.serif', { style: { fontSize: '22px' } }, title), sub ? h('div.small.muted', sub) : null));
const HOW = { health: 'จ่ายค่ารักษาตามจริงตามวงเงินของแผน', ci: 'จ่ายเงินก้อนตามทุน เมื่อตรวจพบตามนิยามโรคในกรมธรรม์', hb: 'จ่ายเงินชดเชยรายวัน (และเพิ่มเมื่อผ่าตัด/ICU)', accident: 'ค่ารักษาจากอุบัติเหตุ + เงินกรณีทุพพลภาพ/เสียชีวิต', life: 'ทุนประกันให้ครอบครัว', saving: 'ทุนประกันให้ครอบครัว + เงินคืนตามสัญญา', senior: 'ทุนประกันให้ครอบครัว', annuity: '—' };
const star = (list) => list.sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));
const matchKw = (p, kw) => (kw && [p.tagline, p.what, ...(p.highlights || []), ...(p.benefits || []).map((x) => x.join(' '))].join(' ').match(kw) ? 1 : 0);

// ── 1) แผนที่ร่างกาย ────────────────────────────────────────
const SPOTS = [
  { id: 'brain', x: 106, y: 27, name: 'สมอง', event: 'หลอดเลือดสมอง / เนื้องอกในสมอง', cats: ['ci', 'health', 'hb'], kw: /สมอง|หลอดเลือด/ },
  { id: 'eye', x: 88, y: 46, name: 'ตา', event: 'ต้อกระจก / ต้อเนื้อ (ผ่าตัด)', cats: ['health', 'hb'], kw: /ต้อ/, wait: 'ต้อเนื้อหรือต้อกระจก' },
  { id: 'heart', x: 110, y: 118, name: 'หัวใจ', event: 'โรคหัวใจ / กล้ามเนื้อหัวใจตาย', cats: ['ci', 'health', 'hb'], kw: /หัวใจ/ },
  { id: 'lung', x: 84, y: 112, name: 'ปอด / เต้านม', event: 'มะเร็งปอด / มะเร็งเต้านม', cats: ['ci', 'health', 'hb'], kw: /มะเร็ง/, wait: 'เนื้องอก ถุงน้ำ หรือมะเร็งทุกชนิด' },
  { id: 'belly', x: 100, y: 160, name: 'ช่องท้อง', event: 'ไส้ติ่งอักเสบ / ผ่าตัดช่องท้อง', cats: ['health', 'hb'], kw: /ผ่าตัด/ },
  { id: 'kidney', x: 120, y: 172, name: 'ไต', event: 'ไตวาย / ล้างไต / นิ่ว', cats: ['ci', 'health'], kw: /ไต|ล้างไต/, wait: 'นิ่วทุกชนิด' },
  { id: 'leg', x: 86, y: 300, name: 'กระดูก', event: 'กระดูกหักจากอุบัติเหตุ', cats: ['accident', 'health', 'hb'], kw: /อุบัติเหตุ|กระดูก/ },
  { id: 'bed', x: 150, y: 230, name: 'ทั้งตัว', event: 'นอนโรงพยาบาลทั่วไป (ไข้เลือดออก ปอดอักเสบ)', cats: ['health', 'hb'], kw: /นอน|ค่าห้อง/ },
  { id: 'life', x: 50, y: 230, name: 'ครอบครัว', event: 'เสียชีวิต / ทุพพลภาพถาวร', cats: ['life', 'accident', 'ci'], kw: /เสียชีวิต|ทุพพลภาพ/ },
];
let spotSel = 'heart';
export function renderBody() {
  const s = SPOTS.find((x) => x.id === spotSel);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 400'); svg.setAttribute('class', 'body-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'ภาพร่างกาย แตะจุดเพื่อดูความคุ้มครอง');
  svg.innerHTML = `<g fill="var(--paper-2)" stroke="var(--ink-3)" stroke-width="2" stroke-linejoin="round">
    <circle cx="100" cy="42" r="26"/><path d="M90 66h20v12H90z"/>
    <path d="M62 82q38-12 76 0l8 92q-4 6-12 4l-6-60v86l6 128q-4 8-18 6l-12-118-12 118q-14 2-18-6l6-128v-86l-6 60q-8 2-12-4z"/></g>
    <g fill="none" stroke="var(--ink-3)" stroke-width="1.6" opacity=".55"><path d="M100 90v120M82 140q18 8 36 0"/></g>`;
  for (const p of SPOTS) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'spot' + (p.id === spotSel ? ' on' : '')); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', p.name + ': ' + p.event);
    g.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="15" class="halo"/><circle cx="${p.x}" cy="${p.y}" r="8" class="dot"/>${['bed', 'life'].includes(p.id) ? `<text x="${p.x}" y="${p.y + 30}" text-anchor="middle" class="spot-t">${p.name}</text>` : ''}`;
    const pick = () => { spotSel = p.id; haptic(10); rerender(); };
    g.addEventListener('click', pick); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    svg.append(g);
  }
  const list = (cat) => star(PLANS.filter((p) => p.cat === cat)).sort((a, b) => matchKw(b, s.kw) - matchKw(a, s.kw)).slice(0, 3);
  return h('div', { 'data-title': 'แผนที่ร่างกาย' },
    back('#/plans/tools', 'แผนที่ร่างกาย', 'แตะจุดบนร่างกาย ดูว่าแผนแบบไหนช่วยเรื่องนั้น'),
    h('div.body-wrap',
      h('div.body-fig', svg, h('div.chips.wrap.body-chips', SPOTS.map((p) => h('button.chip', { class: p.id === spotSel ? 'on' : '', 'aria-pressed': String(p.id === spotSel), onclick: () => { spotSel = p.id; rerender(); } }, p.name)))),
      h('div.body-panel', { 'aria-live': 'polite' },
        h('div.small.muted', s.name), h('h2', s.event),
        s.wait ? h('div.callout.warn', { style: { marginTop: '8px' } }, h('b', 'ระยะรอคอย 120 วัน '), `(${s.wait}) ตามประกันสุขภาพแบบมาตรฐาน`) : null,
        ...s.cats.map((cat) => h('div.bp-cat.cat-' + cat, h('div.bp-h', icon('cat-' + cat), h('b', CAT[cat].name), h('span', T(HOW[cat]))),
          h('div.bp-plans', list(cat).map((p) => h('span.bp-pl', h('a.chip', { href: '#/plan/' + p.id }, p.short), h('button.bp-add', { 'aria-label': 'ใส่ ' + p.short + ' ในชุดแผน', 'aria-pressed': String(getBasket().ids.includes(p.id)), onclick: (e) => { import('../basket.js').then((m) => { const on = m.toggleBasket(p.id); e.currentTarget?.setAttribute?.('aria-pressed', String(on)); rerender(); }); } }, icon(getBasket().ids.includes(p.id) ? 'check' : 'plus'))))))),
        h('p.source', 'ความคุ้มครองจริงขึ้นกับนิยามโรค เงื่อนไข และระยะรอคอยในกรมธรรม์แต่ละแบบ'))));
}

// ── 2) ต่อชุดแผน + จัดตามงบ ─────────────────────────────────
const AREAS = [['med', 'ค่ารักษา', 'cat-health'], ['ci', 'โรคร้าย', 'cat-ci'], ['inc', 'รายได้ตอนป่วย', 'cat-hb'], ['fam', 'ครอบครัว', 'cat-life'], ['acc', 'อุบัติเหตุ', 'cat-accident'], ['save', 'ออม/เกษียณ', 'cat-saving'], ['tax', 'ลดหย่อนภาษี', 'tax']];
export function coverage(ids) {
  const ps = ids.map((id) => PLAN[id]).filter(Boolean); const has = (c) => ps.some((p) => p.cat === c);
  return { med: has('health') ? 100 : 0, ci: has('ci') ? 100 : 0, inc: has('hb') ? 100 : has('ci') ? 50 : 0, fam: ps.some((p) => ['life', 'saving', 'senior'].includes(p.cat) || p.id === 'ci-procare' || p.id === 'ci-supercare') ? 100 : 0,
    acc: has('accident') ? 100 : has('health') ? 40 : 0, save: has('saving') || has('annuity') ? 100 : 0, tax: ps.some((p) => ['life', 'health', 'annuity'].includes(p.tax)) ? 100 : 0 };
}
const bld = { ids: ['20-pay-life', 'health-happy'], cat: 'health', age: 35, g: 'f', mode: 'build', budget: 2000, pct: 10, income: 30000, pri: ['med', 'ci', 'inc'] };
const AREA_CATS = { med: ['health'], ci: ['ci'], inc: ['hb'], fam: ['life'], acc: ['accident'], save: ['saving', 'annuity'] };

/** จัดตามงบ: เลือกแผนที่มีตารางเบี้ยจริง เติมตามลำดับความสำคัญจนเต็มงบ */
export function fitBudget({ budgetYear, pri, age, g }) {
  const price = (id) => { const r = lookup(store.get('premiums', id), age, g) || (PLAN[id].premiumByAge ? lookup({ cols: ['อายุ', 'ขั้น 1'], rows: PLAN[id].premiumByAge.bands.map((b, i, arr) => [(i ? arr[i - 1] + 1 : 0) + '-' + b, PLAN[id].premiumByAge.class1[i]]) }, age) : null); return r ? r[0].value : null; };
  const okAge = (p) => { const r = ageRange(p); return !r || (age >= r.lo && age <= r.hi); };
  const out = []; let left = budgetYear; const missing = [];
  const needMain = pri.some((k) => ['med', 'ci', 'inc'].includes(k));
  if (needMain) {
    const mains = star(PLANS.filter((p) => p.kind === 'main' && p.cat === 'life' && okAge(p))).map((p) => ({ p, v: price(p.id) })).filter((x) => x.v != null).sort((a, b) => a.v - b.v);
    if (mains.length && mains[0].v <= left) { out.push({ id: mains[0].p.id, v: mains[0].v, why: 'สัญญาหลัก (จำเป็นสำหรับแนบสุขภาพ/โรคร้าย)' }); left -= mains[0].v; }
    else missing.push('สัญญาหลัก (ประกันชีวิต)');
  }
  for (const k of pri) {
    const cands = star(PLANS.filter((p) => AREA_CATS[k]?.includes(p.cat) && okAge(p))).map((p) => ({ p, v: price(p.id) }));
    const priced = cands.filter((x) => x.v != null && !out.some((o) => o.id === x.p.id));
    if (!priced.length) { missing.push(AREAS.find((a) => a[0] === k)[1]); continue; }
    const fit = priced.find((x) => x.v <= left) || null;
    if (fit) { out.push({ id: fit.p.id, v: fit.v, why: 'ปิดช่องว่าง: ' + AREAS.find((a) => a[0] === k)[1] }); left -= fit.v; }
    else missing.push(AREAS.find((a) => a[0] === k)[1] + ' (เกินงบ)');
  }
  return { picks: out, left, missing };
}

export function renderBuilder(qs = {}) {
  if (qs.basket) { const b = getBasket(); if (b.ids.length) bld.ids = [...b.ids]; history.replaceState(null, '', '#/plans/build' + (qs.c ? '?c=' + qs.c : '')); }
  const c = qs.c ? store.get('clients', qs.c) : null;
  if (c && bld.client !== c.id) { bld.client = c.id; bld.age = clientAge(c) ?? bld.age; bld.g = c.gender || bld.g; bld.income = +c.incomeMonthly || bld.income; }
  const cov = coverage(bld.ids);
  const add = (id) => { if (!bld.ids.includes(id)) { bld.ids.push(id); haptic(15); } rerender(); };
  const del = (id) => { bld.ids = bld.ids.filter((x) => x !== id); rerender(); };
  const pr = bld.ids.map((id) => ({ id, r: lookup(store.get('premiums', id), bld.age, bld.g) }));
  const known = pr.filter((x) => x.r); const total = known.reduce((t, x) => t + x.r[0].value, 0);
  const riderNoMain = bld.ids.some((id) => PLAN[id]?.kind === 'rider') && !bld.ids.some((id) => PLAN[id]?.kind === 'main' && PLAN[id].cat !== 'accident');
  const empty = AREAS.filter(([k]) => k !== 'tax' && cov[k] < 100);
  const blocks = h('div.lego', { 'aria-label': 'ชุดแผนที่ต่อไว้' },
    [...bld.ids].reverse().map((id, i) => { const p = PLAN[id]; return p ? h('div.lego-b.cat-' + p.cat, { style: { '--i': i } }, h('span.lb-ic', icon('cat-' + p.cat)), h('b', p.short), h('small', p.kind === 'rider' ? 'แนบ' : 'หลัก'), h('button', { onclick: () => del(id), 'aria-label': 'เอา ' + p.short + ' ออก' }, icon('close'))) : null; }),
    !bld.ids.length ? h('div.lego-empty', 'แตะแผนด้านล่างเพื่อวางลงชุด') : null);
  const meters = h('div.meters', AREAS.map(([k, l, ic]) => h('div.meter', { class: cov[k] >= 100 ? 'full' : cov[k] ? 'part' : '' },
    h('span.m-ic', icon(ic)), h('span.m-l', l), h('div.m-bar', { role: 'meter', 'aria-valuenow': cov[k], 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': l }, h('i', { style: { width: cov[k] + '%' } })), h('span.m-v', cov[k] >= 100 ? icon('check') : cov[k] ? 'บางส่วน' : 'ยังไม่มี'))));
  const palette = h('div',
    h('div.chips', ['health', 'ci', 'hb', 'life', 'accident', 'saving', 'annuity', 'senior'].map((cat) => h('button.chip', { class: bld.cat === cat ? 'on' : '', onclick: () => { bld.cat = cat; rerender(); } }, h('span.dot', { style: { background: `var(--c-${cat})` } }), CAT[cat].short))),
    h('div.pal', star(PLANS.filter((p) => p.cat === bld.cat)).map((p) => h('button.pal-i.cat-' + p.cat, { class: bld.ids.includes(p.id) ? 'in' : '', 'aria-pressed': String(bld.ids.includes(p.id)), onclick: () => (bld.ids.includes(p.id) ? del(p.id) : add(p.id)) },
      h('span.lb-ic', icon(bld.ids.includes(p.id) ? 'check' : 'plus')), h('span', h('b', p.short), h('small', p.kind === 'rider' ? 'สัญญาเพิ่มเติม' : 'สัญญาหลัก'))))));

  // จัดตามงบ
  const yearBudget = bld.mode === 'pct' ? Math.round(bld.income * 12 * bld.pct / 100) : bld.budget * 12;
  const budgetBox = h('div.card', { style: { marginTop: '12px' } },
    h('b', 'จัดแผนตามงบ'),
    h('div.q', { style: { marginTop: '8px' } }, choices('bm', bld.mode === 'pct' ? 'pct' : 'build', [['build', 'บาท/เดือน'], ['pct', '% ของรายได้']], { onChange: (v) => { bld.mode = v; rerender(); } })),
    bld.mode === 'pct'
      ? h('div.row.wrap', { style: { gap: '10px' } }, h('label.f', h('span', 'รายได้/เดือน'), h('input.input', { type: 'number', inputmode: 'numeric', value: bld.income, onchange: (e) => { bld.income = +e.target.value || 0; rerender(); } })),
        h('label.f', h('span', '% ของรายได้'), h('input.input', { type: 'number', inputmode: 'numeric', min: 1, max: 40, value: bld.pct, onchange: (e) => { bld.pct = +e.target.value || 0; rerender(); } })))
      : h('label.f', h('span', 'งบต่อเดือน (บาท)'), h('input.input', { type: 'number', inputmode: 'numeric', step: 500, value: bld.budget, onchange: (e) => { bld.budget = +e.target.value || 0; rerender(); } })),
    h('p.small.muted', `= ${fmt(yearBudget)} บาท/ปี · แนวทางที่นิยม: เบี้ยประกันรวมประมาณ 10–15% ของรายได้`),
    h('div.q', h('span.ql', 'เรียงความสำคัญ (แตะเลือก)'), choices('pri', bld.pri, AREAS.filter(([k]) => k !== 'tax').map(([k, l]) => [k, l]), { multi: true, onChange: (v) => { bld.pri = v; } })),
    h('button.btn.primary', { onclick: () => {
      const r = fitBudget({ budgetYear: yearBudget, pri: bld.pri, age: bld.age, g: bld.g });
      if (!r.picks.length) { toast('ยังคิดไม่ได้ — ต้องมีตารางเบี้ยของแผนในหมวดที่เลือก'); }
      else { bld.ids = r.picks.map((x) => x.id); toast(`จัดชุดแล้ว ${fmt(yearBudget - r.left)} / ${fmt(yearBudget)} บาท`); }
      bld.lastFit = r; rerender();
    } }, icon('target'), 'จัดชุดให้'),
    bld.lastFit ? h('div', { style: { marginTop: '10px' } },
      bld.lastFit.picks.map((x) => h('div.small', `✓ ${PLAN[x.id].short} ${fmt(x.v)} — ${x.why}`)),
      bld.lastFit.picks.length ? h('div.small', { style: { marginTop: '4px' } }, h('b', `เหลืองบ ${fmt(bld.lastFit.left)} บาท/ปี`)) : null,
      bld.lastFit.missing.length ? h('div.callout.warn.small', { style: { marginTop: '8px' } }, 'ยังจัดไม่ได้: ' + bld.lastFit.missing.join(', ') + ' — นำเข้าตารางเบี้ยของแผนในหมวดนี้ก่อน ', h('a', { href: '#/tools/premiums' }, 'ไปนำเข้า')) : null) : null,
    h('p.source', 'คิดจากตารางเบี้ยจริงที่นำเข้าเท่านั้น (และอัตราโบรชัวร์ของแผนอุบัติเหตุ) ไม่ประมาณเอง'));

  return h('div', { 'data-title': 'ต่อชุดแผน' },
    back(c ? '#/client/' + c.id : '#/plans/tools', 'ต่อชุดแผน', c ? 'คุณ' + c.nick + ' · แตะแผนเพื่อต่อเป็นชุด' : 'แตะแผนเพื่อต่อเป็นชุด ดูว่าครอบคลุมด้านไหนแล้วบ้าง'),
    h('div.build-grid',
      h('div',
        blocks,
        riderNoMain ? h('div.callout.red.small', { style: { marginTop: '8px' } }, 'สัญญาเพิ่มเติมต้องมีสัญญาหลัก (ประกันชีวิต) ด้วย') : null,
        h('div.build-total', known.length ? [h('b', fmt(total)), h('small', ` บาท/ปี ≈ ${fmt(Math.round(total / 12))}/เดือน${known.length < bld.ids.length ? ` · คิดได้ ${known.length}/${bld.ids.length} แผน` : ''}`)] : h('small', 'นำเข้าตารางเบี้ยเพื่อดูเบี้ยรวม')),
        h('div.row.wrap', { style: { gap: '8px', margin: '6px 0' } },
          h('label.row.small', 'อายุ', h('input.input', { type: 'number', inputmode: 'numeric', value: bld.age, style: { width: '80px' }, onchange: (e) => { bld.age = +e.target.value || 0; rerender(); } })),
          choices('bg', bld.g, [['f', 'หญิง'], ['m', 'ชาย']], { onChange: (v) => { bld.g = v; rerender(); } })),
        meters,
        empty.length && bld.ids.length ? h('p.small.muted', { style: { marginTop: '6px' } }, 'ยังว่าง: ' + empty.map((a) => a[1]).join(' · ')) : null,
        h('div.row', { style: { gap: '8px', marginTop: '10px' } },
          h('a.btn', { style: { flex: 1 }, href: '#/sheet/' + bld.ids.join(',') + (c ? '?c=' + c.id : '') }, icon('doc'), 'สรุปหน้าเดียว'),
          h('button.btn.ghost', { onclick: () => { bld.ids = []; bld.lastFit = null; rerender(); } }, 'ล้าง')),
        bld.ids.length ? h('button.btn.block.sm', { style: { marginTop: '8px' }, onclick: () => { setBasket(bld.ids, c ? c.id : undefined); import('../ui.js').then((u) => u.toast(`เก็บเป็นชุดแผนที่กำลังคุยแล้ว (${bld.ids.length} แผน)`)); } }, icon('plans'), 'เก็บเป็นชุดแผนที่กำลังคุย') : null),
      h('div', palette, budgetBox)));
}

// ── 3) เส้นทางชีวิต (ภาพลายเส้น) ─────────────────────────────
const STAGES = [
  { age: 23, to: 25, name: 'เริ่มทำงาน', art: 'cap', risk: 'สวัสดิการบริษัทอาจไม่พอ · ยังไม่มีเงินเก็บ', cats: ['health', 'ci', 'accident'], tip: 'ล็อกประกันสุขภาพตอนยังแข็งแรง เบี้ยตั้งต้นต่ำ' },
  { age: 27, to: 32, name: 'แต่งงาน', art: 'rings', risk: 'มีคนที่ต้องรับผิดชอบร่วมกัน', cats: ['life', 'health', 'ci'], tip: 'ทบทวนผู้รับประโยชน์ และวางแผนคุ้มครองทั้งคู่' },
  { age: 30, to: 40, name: 'มีลูก', art: 'stroller', risk: 'ภาระค่าเลี้ยงดูและการศึกษา 15–20 ปี', cats: ['life', 'health', 'saving'], tip: 'ทุนชีวิตควรครอบคลุมค่าใช้จ่ายครอบครัวจนลูกโต' },
  { age: 32, to: 45, name: 'ซื้อบ้าน', art: 'house', risk: 'หนี้ก้อนใหญ่ระยะยาว', cats: ['life', 'ci'], tip: 'ทุนชีวิตอย่างน้อยเท่าหนี้คงค้าง ไม่ให้ภาระตกถึงครอบครัว' },
  { age: 30, to: 50, name: 'ทำธุรกิจ / ฟรีแลนซ์', art: 'laptop', risk: 'ไม่มีสวัสดิการ ป่วยแล้วรายได้หยุด', cats: ['health', 'hb', 'ci'], tip: 'ชดเชยรายได้ + เงินก้อนโรคร้าย ช่วยประคองธุรกิจ' },
  { age: 45, to: 60, name: 'เตรียมเกษียณ', art: 'chart', risk: 'เวลาออมเหลือน้อยลง', cats: ['annuity', 'saving', 'health'], tip: 'บำนาญได้ทั้งรายได้หลังเกษียณและสิทธิลดหย่อนภาษี' },
  { age: 60, to: 80, name: 'วัยเกษียณ', art: 'chair', risk: 'ค่ารักษาสูงขึ้นตามอายุ', cats: ['senior', 'health'], tip: 'ตรวจสอบความคุ้มครองสุขภาพต่อเนื่อง และมรดกให้ลูกหลาน' },
];
const ART = {
  cap: '<path d="M-22 -4l22-10 22 10-22 10z"/><path d="M-12 1v8c8 5 16 5 24 0V1M22 -4v12"/>',
  rings: '<circle cx="-7" cy="3" r="10"/><circle cx="7" cy="3" r="10"/><path d="M-10 -10l3-5 3 5"/>',
  stroller: '<path d="M-20 -8h22c0 12-8 16-16 16h-6z"/><path d="M2 -8a12 12 0 0 1 14 -6"/><circle cx="-14" cy="14" r="4"/><circle cx="4" cy="14" r="4"/>',
  house: '<path d="M-18 0l18-15 18 15"/><path d="M-13 -3v18h26V-3"/><path d="M-4 15V5h8v10"/>',
  laptop: '<rect x="-15" y="-12" width="30" height="20" rx="2"/><path d="M-21 12h42"/><path d="M-6 -2l4 4 8-8"/>',
  chart: '<path d="M-18 14h36"/><path d="M-14 14V4M-5 14V-2M4 14V-6M13 14V-12"/><path d="M-16 0l10-8 8 4 12-12"/>',
  chair: '<path d="M-14 -14v20h24"/><path d="M-14 6l-4 10M10 6l4 10"/><path d="M-10 -2h20"/><circle cx="14" cy="-12" r="5"/>',
};
let pathSel = 0;
export function renderPath(qs = {}) {
  const c = qs.c ? store.get('clients', qs.c) : null; const age = c ? clientAge(c) : null;
  const W = 360, H = 700; const pts = STAGES.map((s, i) => ({ x: i % 2 ? 260 : 100, y: 70 + i * 92 }));
  let d = `M${pts[0].x} ${pts[0].y - 40}`; pts.forEach((p, i) => { const q = pts[i - 1]; d += i ? ` C${q.x} ${q.y + 50} ${p.x} ${p.y - 50} ${p.x} ${p.y}` : ` L${p.x} ${p.y}`; });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'path-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'เส้นทางชีวิต 7 ช่วง');
  svg.innerHTML = `<path d="${d}" class="road"/><path d="${d}" class="road-dash"/>`;
  STAGES.forEach((s, i) => {
    const p = pts[i]; const here = age != null && age >= s.age && age <= s.to;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ms' + (i === pathSel ? ' on' : '') + (here ? ' here' : ''));
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', `${s.name} อายุ ${s.age}–${s.to}`);
    const lx = i % 2 ? -46 : 46; const anchor = i % 2 ? 'end' : 'start';
    g.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="34" class="ms-bg"/><g transform="translate(${p.x} ${p.y})" class="ms-art">${ART[s.art]}</g>
      <text x="${p.x + lx}" y="${p.y - 4}" text-anchor="${anchor}" class="ms-t">${s.name}</text><text x="${p.x + lx}" y="${p.y + 16}" text-anchor="${anchor}" class="ms-a">อายุ ${s.age}–${s.to}</text>
      ${here ? `<text x="${p.x + lx}" y="${p.y + 34}" text-anchor="${anchor}" class="ms-here">● คุณ${c.nick}อยู่ตรงนี้</text>` : ''}`;
    const pick = () => { pathSel = i; haptic(10); rerender(); };
    g.addEventListener('click', pick); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    svg.append(g);
  });
  const s = STAGES[pathSel];
  return h('div', { 'data-title': 'เส้นทางชีวิต' },
    back(c ? '#/client/' + c.id : '#/plans/tools', 'เส้นทางชีวิต', c ? `คุณ${c.nick}${age != null ? ' · อายุ ' + age : ''} · แตะแต่ละช่วงดูแผนที่เหมาะ` : 'แตะแต่ละช่วงชีวิต ดูความเสี่ยงและแผนที่เหมาะ'),
    h('div.path-grid', h('div.path-art', svg),
      h('div.path-panel', { 'aria-live': 'polite' },
        h('div.small.muted', `ช่วงที่ ${pathSel + 1}/${STAGES.length} · อายุ ${s.age}–${s.to}`), h('h2', s.name),
        h('div.callout', { style: { marginTop: '8px' } }, h('b', 'ความเสี่ยง: '), s.risk),
        h('p', { style: { margin: '10px 0' } }, h('b', 'คำแนะนำ: '), s.tip),
        ...s.cats.map((cat) => h('div.bp-cat.cat-' + cat, h('div.bp-h', icon('cat-' + cat), h('b', CAT[cat].name), h('span', CAT[cat].desc)),
          h('div.bp-plans', star(PLANS.filter((p) => p.cat === cat)).slice(0, 3).map((p) => h('a.chip', { href: '#/plan/' + p.id }, p.short))))),
        h('div.row', { style: { gap: '8px', marginTop: '10px' } },
          h('button.btn', { disabled: pathSel === 0, onclick: () => { pathSel--; rerender(); } }, icon('back'), 'ช่วงก่อน'),
          h('button.btn.primary', { disabled: pathSel === STAGES.length - 1, onclick: () => { pathSel++; rerender(); } }, 'ช่วงถัดไป', icon('next'))))));
}
