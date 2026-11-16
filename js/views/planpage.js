// ─── หน้าแผนแบบเต็มจอ: ภาพกดดูรายละเอียด · คิดเบี้ยสด · เส้นเวลาชีวิต · เคลมจริงจ่ายเท่าไร · เทียบแผนใกล้เคียง · คำถามบ่อย · ภาษาง่าย ───
import { basketButton } from '../basket.js';
import { clientMode } from '../app.js';
import { h, icon, sheet, closeSheet, choices, fmt, toast, T, more } from '../ui.js';
import * as store from '../store.js';
import { PLANS, PLAN, CAT, TAX_LABEL, quickFacts, closingInfo } from '../../data/plans.js';
import { WAITING, COPAY, attachInfo } from '../../data/rules.js';
import { lookup } from '../engine/premium.js';
import { timelineChart } from '../charts.js';
import { ageRange } from './plans.js';
import { premiumTable, importSheet } from './plantools.js';
import { illus } from '../illus.js';
import { toggleCompare, getCompare } from './compare.js';
import { rerender } from '../app.js';

const AT = attachInfo(PLANS, PLAN);
const ui = { plain: false, big: false };
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
/** หัวข้อสั้นจากข้อความยาว (ตัดคำไทยไม่ให้ขาดกลางคำ) */
export function headline(t, max = 34, { split = true } = {}) {
  let s = split ? String(t).split(/ — | – |:|\(/)[0].trim() : String(t).trim();
  if (s.length <= max) return s;
  if (!seg) return s.slice(0, max) + '…';
  let out = ''; for (const { segment } of seg.segment(s)) { if ((out + segment).length > max) break; out += segment; }
  return out.trim() + '…';
}
const ICON_RULES = [[/มะเร็ง|โรคร้าย/, 'cat-ci'], [/อุบัติเหตุ/, 'cat-accident'], [/รายวัน|ชดเชย/, 'cat-hb'], [/OPD|ผู้ป่วยนอก/, 'user'], [/ไวทัลลิตี้|โบนัส|ส่วนลด/, 'star'], [/ภาษี/, 'tax'],
  [/คืน|การันตี|ออม/, 'cat-saving'], [/2 เท่า|เพิ่มเป็น|เบิ้ล/, 'layers'], [/ล้าน|วงเงิน|เหมาจ่าย|ตามจริง/, 'shield'], [/เสียชีวิต|ครอบครัว/, 'heart'], [/อายุ|ปี/, 'clock']];
const iconFor = (t) => (ICON_RULES.find(([re]) => re.test(t)) || [0, 'check'])[1];
const PLAIN = {
  health: 'ป่วยหรือเจ็บจนต้องนอนโรงพยาบาล แผนนี้ช่วยจ่ายค่ารักษาให้ เราไม่ต้องควักเงินเก็บ',
  ci: 'ถ้าหมอตรวจเจอโรคร้ายแรง เช่น มะเร็ง หัวใจ เส้นเลือดสมอง แผนนี้ให้เงินก้อน เอาไปใช้อะไรก็ได้ ทั้งรักษาและใช้จ่ายในบ้าน',
  hb: 'นอนโรงพยาบาลวันไหน ได้เงินสดวันนั้น ใช้แทนรายได้ที่หายไปตอนทำงานไม่ได้',
  accident: 'เกิดอุบัติเหตุ ได้ค่ารักษาและเงินชดเชยตามแผน เบี้ยเท่ากันทุกปี ซื้อเดี่ยว ๆ ได้',
  life: 'ถ้าวันหนึ่งเราไม่อยู่ ครอบครัวได้เงินก้อนตามทุนประกัน ใช้ดูแลบ้าน ใช้หนี้ ส่งลูกเรียน',
  saving: 'ออมเงินทุกปีตามที่ตกลง ได้เงินคืนตามที่การันตีไว้ และมีความคุ้มครองชีวิตระหว่างทาง',
  annuity: 'จ่ายเบี้ยช่วงทำงาน แล้วได้เงินใช้ทุกปีหลังเกษียณ เหมือนมีเงินเดือนตอนแก่',
  senior: 'สำหรับวัย 50 ขึ้นไป สมัครง่ายไม่ต้องตรวจสุขภาพ ครอบครัวได้เงินก้อนเมื่อจากไป',
};
const parseNum = (s) => { const t = String(s || ''); const m = t.match(/([\d.,]+)\s*(ล้าน)?/); if (!m) return null; const v = +m[1].replace(/,/g, ''); return m[2] ? v * 1e6 : v; };

// ── ภาพกดดูรายละเอียด ──
function tiles(p) {
  const items = [...(p.highlights || []).slice(0, 6)]; if (!items.length) return h('p.muted', 'ยังไม่มีข้อมูลจุดเด่น');
  const open = (i) => { const t = items[i]; closeSheet(true);
    sheet({ title: headline(t, 60), sub: `${p.short} · จุดเด่น ${i + 1}/${items.length}`, body: h('div.stack',
      h('div.hl-hero.cat-' + p.cat, h('span.hl-n', String(i + 1).padStart(2, '0')), h('span.hl-bigic', icon(iconFor(t)))),
      h('p', { style: { fontSize: '16.5px', lineHeight: 1.7, margin: 0 } }, T(t)),
      p.pros?.[i] ? h('div.callout.good', h('b', 'ทำไมสำคัญ: '), T(p.pros[i])) : null,
      (p.benefits || []).length ? more('ผลประโยชน์ทั้งหมดของแผนนี้', h('div.kvlist', (p.benefits || []).map(([k, v]) => h('div', h('span', k), h('b', T(v)))))) : null,
      h('div.row', { style: { gap: '8px' } }, h('button.btn', { style: { flex: 1 }, disabled: i === 0, onclick: () => open(i - 1) }, icon('back'), 'ก่อนหน้า'), h('button.btn.primary', { style: { flex: 1 }, disabled: i === items.length - 1, onclick: () => open(i + 1) }, 'ถัดไป', icon('next')))) }); };
  const dots = h('div.hl-dots', items.map((_, i) => h('i', { class: i ? '' : 'on' })));
  const rail = h('div.hl-rail', { onscroll: (e) => { const r = e.currentTarget; const k = Math.round(r.scrollLeft / (r.firstElementChild?.offsetWidth + 12 || 1)); [...dots.children].forEach((d, n) => d.classList.toggle('on', n === k)); } },
    items.map((t, i) => h('button.hl-card.tilt.cat-' + p.cat, { onclick: () => open(i), 'aria-label': `จุดเด่น ${i + 1}: ${t}` },
      h('span.hl-n', String(i + 1).padStart(2, '0')), h('span.hl-bigic', icon(iconFor(t))), h('span.hl-ic', icon(iconFor(t))),
      h('b', headline(t, 70)), h('span.hl-more', 'แตะดูรายละเอียด', icon('next')))));
  return h('div', rail, items.length > 1 ? dots : null);
}

// ── คิดเบี้ยแบบสด ──
function builtinTable(p) {
  const pb = p.premiumByAge; if (!pb) return null;
  const labels = pb.bands.map((b, i) => (i === 0 ? '0-' + b : (pb.bands[i - 1] + 1) + '-' + b));
  return { cols: ['อายุ', 'อาชีพขั้น 1', 'อาชีพขั้น 2'], rows: labels.map((l, i) => [l, pb.class1[i], pb.class2[i]]), source: 'อัตราจากโบรชัวร์ AIA' };
}
const liveSt = {};
function livePremium(p) {
  const t = premiumTable(p.id) || builtinTable(p);
  if (!t) return h('div.card.prem-empty', h('b', 'ยังไม่มีตารางเบี้ยจริงของแผนนี้'), h('p.small.muted', 'ตัวเลื่อนคิดเบี้ยใช้ตัวเลขจากตารางจริงเท่านั้น (ไม่เดา) — วางตารางจากระบบตัวแทนครั้งเดียว ใช้ได้ตลอด'),
    h('button.btn.sm', { style: { marginTop: '8px' }, onclick: () => importSheet(p.id) }, icon('upload'), 'นำเข้าตารางเบี้ย'));
  const r = ageRange(p) || { lo: 0, hi: 75 };
  const s = liveSt[p.id] ||= { age: Math.min(Math.max(35, r.lo), r.hi), g: 'f' };
  const hasG = t.cols.some((c) => /ชาย|หญิง/.test(c));
  const big = h('div.live-num', { 'aria-live': 'polite' }); const ageOut = h('b');
  let shown = 0;
  const paint = () => {
    ageOut.textContent = s.age + ' ปี';
    const res = lookup(t, s.age, hasG ? s.g : null);
    if (!res) { big.replaceChildren(h('small', 'ไม่มีอายุนี้ในตาราง')); return; }
    const target = res[0].value; const from = shown; const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 260); const v = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      big.replaceChildren(h('b', fmt(v)), h('small', ' บาท/ปี'), res.length > 1 ? h('div.small.muted', res.map((x) => `${x.col} ${fmt(x.value)}`).join(' · ')) : h('div.small.muted', res[0].col + ` · ≈ เดือนละ ${fmt(Math.round(target / 12))} · วันละ ${fmt(Math.round(target / 365))} บาท`));
      if (k < 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(step); else shown = target; };
    requestAnimationFrame(step);
  };
  setTimeout(paint, 0);
  return h('div.card.live',
    h('div.row.between', h('span.small.muted', 'เบี้ยจาก' + (t.source ? ' ' + t.source : 'ตารางที่นำเข้า')), premiumTable(p.id) ? h('button.btn.sm.ghost', { onclick: () => importSheet(p.id) }, 'แก้ตาราง') : null),
    big,
    h('label.live-slider', h('span', 'อายุ ', ageOut), h('input', { type: 'range', min: r.lo, max: r.hi, value: s.age, 'aria-label': 'อายุ', oninput: (e) => { s.age = +e.target.value; paint(); } })),
    hasG ? choices('lg', s.g, [['f', 'หญิง'], ['m', 'ชาย']], { onChange: (v) => { s.g = v; paint(); } }) : null);
}

// ── เส้นเวลาชีวิต ──
function lifeTimeline(p) {
  const r = ageRange(p); const tl = p.timeline || {};
  let age = Math.min(Math.max(35, r?.lo ?? 0), r?.hi ?? 70);
  const chart = h('div'); const txt = h('p.small', { 'aria-live': 'polite' }); const out = h('b');
  const draw = () => {
    out.textContent = age + ' ปี';
    chart.replaceChildren(timelineChart(tl, { age, color: `var(--c-${p.cat})` }));
    const pay = tl.payYears ? age + tl.payYears : tl.payToAge || null; const cover = tl.coverToAge || (tl.coverYears ? age + tl.coverYears : null) || tl.renewToAge || null;
    txt.replaceChildren(...[pay ? `จ่ายเบี้ยถึงอายุ ${pay}${tl.payYears ? ` (${tl.payYears} ปี)` : ''}` : tl.rider ? 'จ่ายเบี้ยปีต่อปีพร้อมสัญญาหลัก' : null,
      cover ? `คุ้มครองถึงอายุ ${cover} (อีก ${cover - age} ปี)` : null, pay && cover && cover > pay ? `หลังจ่ายครบ ยังคุ้มครองต่ออีก ${cover - pay} ปีโดยไม่ต้องจ่าย` : null,
      tl.incomeFrom ? `เริ่มรับเงินคืน/บำนาญตั้งแต่อายุ ${tl.incomeFrom}` : null].filter(Boolean).flatMap((x, i) => (i ? [' · ', x] : [x])));
  };
  draw();
  return h('div.card', chart, txt,
    r ? h('label.live-slider', h('span', 'ถ้าเริ่มทำตอนอายุ ', out), h('input', { type: 'range', min: r.lo, max: r.hi, value: age, 'aria-label': 'อายุที่เริ่มทำ', oninput: (e) => { age = +e.target.value; draw(); } })) : null);
}

// ── เคลมจริงจ่ายเท่าไร (ใช้ค่ารักษาจริงที่ผู้ใช้ใส่ ไม่ใช้ตัวเลขสมมติ) ──
function claimModel(p) {
  if (p.cat === 'health' && p.plans) {
    const lim = p.plans.rows.find(([k]) => /วงเงิน/.test(k)); const room = p.plans.rows.find(([k]) => /ค่าห้อง/.test(k));
    const lump = p.plans.rows.some((r) => r.slice(1).some((v) => /ตามจริง/.test(v)));
    if (lim && room && lump) return { type: 'lump', tiers: p.plans.cols.slice(1).map((c, i) => ({ name: c, limit: parseNum(lim[i + 1]), room: parseNum(room[i + 1]) })) };
  }
  if (p.cat === 'hb') { const b = Object.fromEntries((p.benefits || []).map(([k, v]) => [k, v])); const m = (re) => { const e = Object.entries(b).find(([k]) => re.test(k)); return e ? parseFloat(e[1]) : 0; };
    return { type: 'hb', day: m(/นอน/), icu: m(/ICU/), surg: m(/ผ่าตัด/) }; }
  if (p.cat === 'ci' && (p.benefits || []).some(([, v]) => /% ของทุน/.test(v))) return { type: 'ci', pct: parseNum((p.benefits.find(([, v]) => /% ของทุน/.test(v)) || [])[1]) || 100 };
  return null;
}
function claimCalc(p) {
  const mdl = claimModel(p);
  if (!mdl) return h('p.small.muted', p.cat === 'health' ? 'แผนนี้แยกจ่ายรายหมวด (ค่าห้อง ค่าแพทย์ ค่าผ่าตัด มีเพดานแต่ละหมวด) — ดูวงเงินแต่ละหมวดในแท็บความคุ้มครองของแผน' : 'แผนนี้จ่ายตามทุนประกันเมื่อเกิดเหตุตามสัญญา ไม่ได้คิดจากค่ารักษา');
  const cases = store.getSettings().claimCases || [];
  const st = { bill: '', roomRate: '', days: 3, icu: 0, surgery: true, tier: 1, sa: 1000000, unit: 1000, src: '' };
  const out = h('div', { 'aria-live': 'polite' });
  const draw = () => {
    const bill = +st.bill || 0, days = +st.days || 0;
    let paid = 0, cost = 0, note = '';
    if (mdl.type === 'lump') { const t = mdl.tiers[st.tier]; const rr = +st.roomRate || 0; cost = bill + rr * days;
      paid = Math.min(t.limit || Infinity, bill + Math.min(rr, t.room || rr) * days); note = `${t.name} · ค่าห้องได้ไม่เกิน ${fmt(t.room)}/วัน · วงเงิน ${fmt(t.limit)}/ปี`; }
    if (mdl.type === 'hb') { cost = bill; paid = st.unit * (mdl.day * Math.max(0, days - st.icu) + mdl.icu * st.icu + (st.surgery ? mdl.surg : 0)); note = `ชดเชยวันละ ${fmt(st.unit)} · ICU ${mdl.icu} เท่า · ผ่าตัด ${mdl.surg} เท่า (จ่ายเพิ่มจากค่ารักษา)`; }
    if (mdl.type === 'ci') { cost = bill; paid = st.sa * mdl.pct / 100; note = `เงินก้อน ${mdl.pct}% ของทุน เมื่อตรวจพบโรคร้ายระดับรุนแรงตามเงื่อนไข`; }
    const own = mdl.type === 'lump' ? Math.max(0, cost - paid) : Math.max(0, cost - paid);
    out.replaceChildren(!bill && mdl.type !== 'ci' ? h('p.small.muted', 'ใส่ค่ารักษาจริงจากใบแจ้งหนี้/ราคาแพ็กเกจของโรงพยาบาล แล้วจะเห็นว่าแผนนี้จ่ายเท่าไร') :
      h('div.claim-res', h('div', h('span', 'ค่าใช้จ่าย'), h('b', fmt(cost))), h('div.good', h('span', mdl.type === 'lump' ? 'แผนนี้จ่าย' : 'แผนนี้ให้เงิน'), h('b', fmt(paid))), h('div.bad', h('span', mdl.type === 'lump' ? 'จ่ายเอง' : 'ส่วนต่าง'), h('b', mdl.type === 'lump' ? fmt(own) : (paid >= cost ? '+' + fmt(paid - cost) : fmt(own))))),
      h('p.small.muted', note));
  };
  const n = (k, label, step = 1000) => h('label.f', h('span', label), h('input.input', { type: 'number', inputmode: 'numeric', min: 0, step, value: st[k], oninput: (e) => { st[k] = e.target.value; draw(); } }));
  const caseSel = cases.length ? h('div.chips.wrap', { style: { marginBottom: '8px' } }, cases.map((c) => h('button.chip', { type: 'button', title: c.src, onclick: (e) => { Object.assign(st, { bill: c.bill, roomRate: c.roomRate || '', days: c.days || 0, surgery: !!c.surgery, src: c.src }); e.currentTarget.closest('.claim').querySelectorAll('input[type=number]').forEach((inp, i) => { inp.value = [st.bill, st.roomRate, st.days][i] ?? inp.value; }); draw(); } }, c.name))) : null;
  draw();
  return h('div.card.claim',
    caseSel,
    mdl.type === 'lump' ? choices('ct', String(st.tier), mdl.tiers.map((t, i) => [String(i), t.name]), { onChange: (v) => { st.tier = +v; draw(); } }) : null,
    h('div.form-grid', { style: { marginTop: '8px' } },
      n('bill', mdl.type === 'lump' ? 'ค่ารักษาจริง ไม่รวมค่าห้อง (บาท)' : 'ค่ารักษาจริงรวม (บาท)'),
      mdl.type === 'lump' ? n('roomRate', 'ค่าห้องจริงต่อวัน (บาท)', 100) : null,
      mdl.type !== 'ci' ? n('days', 'นอนกี่วัน', 1) : null,
      mdl.type === 'hb' ? n('unit', 'ชดเชยวันละ (บาท)', 500) : null,
      mdl.type === 'ci' ? n('sa', 'ทุนประกัน (บาท)', 100000) : null),
    mdl.type === 'hb' ? h('label.row.small', h('input', { type: 'checkbox', checked: st.surgery, onchange: (e) => { st.surgery = e.target.checked; draw(); } }), 'มีการผ่าตัด') : null,
    out,
    h('button.btn.sm.ghost', { style: { marginTop: '6px' }, onclick: () => saveCase(st) }, icon('plus'), 'บันทึกเป็นเคสจริง (ใส่ที่มา)'),
    h('p.source', 'ใช้ค่ารักษาจริงเท่านั้น เช่น ราคาแพ็กเกจที่โรงพยาบาลประกาศ หรือใบเสร็จเคสจริงของลูกค้า (ปิดชื่อ) · การจ่ายจริงเป็นไปตามเงื่อนไขกรมธรรม์และการพิจารณาสินไหม'));
}
function saveCase(st) {
  if (!(+st.bill)) { toast('ใส่ค่ารักษาก่อน'); return; }
  const nm = h('input.input', { placeholder: 'เช่น ผ่าตัดไส้ติ่ง ส่องกล้อง', required: true }); const src = h('input.input', { placeholder: 'เช่น แพ็กเกจ รพ.___ ประกาศ ต.ค. 69 / เคสลูกค้า', required: true });
  sheet({ title: 'บันทึกเคสค่ารักษาจริง', body: h('div.stack', h('label.f', h('span', 'ชื่อเคส'), nm), h('label.f', h('span', 'ที่มาของตัวเลข'), src),
    h('button.btn.primary.block', { onclick: () => { if (!nm.value.trim() || !src.value.trim()) { (nm.value.trim() ? src : nm).reportValidity(); return; }
      store.saveSettings({ claimCases: [...(store.getSettings().claimCases || []), { id: Date.now().toString(36), name: nm.value.trim(), src: src.value.trim(), bill: +st.bill, roomRate: +st.roomRate || 0, days: +st.days || 0, surgery: !!st.surgery }] });
      closeSheet(true); toast('บันทึกเคสแล้ว ใช้ได้กับทุกแผน'); } }, icon('check'), 'บันทึก')) });
}

// ── ทำไมตัวนี้ ไม่ใช่ตัวนั้น ──
const cmpSt = {};
function whyThis(p) {
  const sibs = PLANS.filter((x) => x.id !== p.id && x.cat === p.cat && x.kind === p.kind);
  if (!sibs.length) return h('p.small.muted', 'หมวดนี้มีแผนเดียวในแอป');
  const other = PLAN[cmpSt[p.id]] || sibs.find((x) => x.star) || sibs[0];
  const qa = quickFacts(p), qb = quickFacts(other);
  const rows = [['จุดเด่น', p.tagline, other.tagline], ['อายุรับ', qa.age, qb.age], ['จ่ายเบี้ย', qa.pay, qb.pay], ['คุ้มครอง', qa.cover, qb.cover],
    ['ลดหย่อนภาษี', TAX_LABEL[p.tax]?.split(' (')[0], TAX_LABEL[other.tax]?.split(' (')[0]], ['เหมาะกับ', p.bestFor?.[0], other.bestFor?.[0]], ['ข้อควรรู้', p.watch?.[0], other.watch?.[0]]];
  return h('div',
    h('div.chips.wrap', sibs.map((x) => h('button.chip', { class: x.id === other.id ? 'on' : '', 'aria-pressed': String(x.id === other.id), onclick: () => { cmpSt[p.id] = x.id; rerender(); } }, x.short))),
    h('div.why-grid', { role: 'table', 'aria-label': `เทียบ ${p.short} กับ ${other.short}` },
      h('div.wg-row.head', { role: 'row' }, h('span', { role: 'columnheader' }, ''), h('b', { role: 'columnheader' }, p.short), h('b', { role: 'columnheader' }, h('a', { href: '#/plan/' + other.id }, other.short))),
      rows.map(([k, a, b]) => h('div.wg-row', { role: 'row', class: (a || '') !== (b || '') ? 'diff' : '' }, h('span', { role: 'rowheader' }, k, (a || '') !== (b || '') ? h('i.wg-dot', { 'aria-label': 'ต่างกัน' }) : null), h('div', { role: 'cell' }, T(a || '—')), h('div', { role: 'cell' }, T(b || '—'))))),
    h('p.small.muted', { style: { marginTop: '8px' } }, 'แถวที่มีจุดคือจุดที่ต่างกัน'));
}

// ── คำถามที่ลูกค้าถามบ่อย (สร้างจากข้อมูลแผน) ──
export function faqs(p) {
  const q = quickFacts(p); const out = [];
  out.push(['แผนนี้คุ้มครองอะไร?', p.what || p.tagline]);
  if (q.age) out.push(['อายุเท่าไรถึงสมัครได้?', `รับอายุ ${q.age}`]);
  out.push(['ต้องจ่ายเบี้ยนานแค่ไหน?', q.pay ? `${q.pay}${q.cover ? ' · ' + q.cover : ''}` : 'ดูเงื่อนไขในกรมธรรม์']);
  if (p.kind === 'rider') out.push(['ซื้อแผนนี้อย่างเดียวได้ไหม?', `ไม่ได้ เป็นสัญญาเพิ่มเติม ต้องแนบกับ${AT.mustText(p)}`]);
  out.push(['เอาไปลดหย่อนภาษีได้ไหม?', TAX_LABEL[p.tax] || 'ตรวจในหนังสือรับรองเบี้ย']);
  if (['health', 'ci', 'hb'].includes(p.cat)) out.push(['สมัครแล้วใช้ได้เลยไหม?', p.cat === 'ci' ? WAITING.ci : `${WAITING.accident.text} · ${WAITING.general.text} · ${WAITING.special.text}`]);
  if (p.cat === 'health') out.push(['ปีต่อไปต้องร่วมจ่ายไหม (Copayment)?', `กรมธรรม์ที่เริ่มคุ้มครองตั้งแต่ ${COPAY.startTH} ถ้าปีก่อนเคลมโรคเล็กน้อย ≥3 ครั้งและ ≥200% ของเบี้ย หรือโรคทั่วไป ≥3 ครั้งและ ≥400% ปีถัดไปร่วมจ่าย 30% (เข้าทั้งสองกรณี 50%) ปีต่อมาใช้ปกติก็กลับมาไม่ต้องร่วมจ่าย`]);
  if (p.kind === 'rider' || p.cat === 'accident') out.push(['เบี้ยขึ้นไหม?', p.cat === 'accident' ? 'เบี้ยปรับตามช่วงอายุตอนต่ออายุ (ดูตารางเบี้ยในแผน)' : 'สัญญาเพิ่มเติมปรับเบี้ยตามช่วงอายุตอนต่ออายุ']);
  if (p.bestFor?.length) out.push(['เหมาะกับใคร?', p.bestFor.slice(0, 2).join(' / ')]);
  if (p.watch?.length) out.push(['มีอะไรต้องระวัง?', p.watch.slice(0, 2).join(' / ')]);
  return out;
}

// ── รายละเอียดความคุ้มครองครบ (ตารางแผนย่อย · ผลประโยชน์ · เงื่อนไข · ข้อควรรู้ · ตารางตัวอย่าง) ──
function coverDetail(p) {
  const wrap = h('div');
  if (p.plans) {
    const view = h('div', { style: { marginTop: '10px' } });
    const show = (i) => view.replaceChildren(h('div.kvlist', p.plans.rows.map((r) => h('div', h('span', r[0]), h('b', T(r[i + 1]))))));
    wrap.append(h('div.card', h('div.small.muted', { style: { marginBottom: '8px' } }, p.plans.title || 'เลือกแผนย่อย'), choices('pp', '0', p.plans.cols.slice(1).map((c, i) => [String(i), c]), { onChange: (v) => show(+v) }), view));
    show(0);
  }
  if (p.benefits?.length) wrap.append(h('div.card', { style: { marginTop: '10px' } }, h('b', 'ผลประโยชน์'), h('div.kvlist', { style: { marginTop: '6px' } }, p.benefits.map(([k, v]) => h('div', h('span', k), h('b', T(v)))))));
  const att = p.kind === 'rider' ? AT.mustText(p) : AT.recRiders(p).map((r) => r.short).join(', ');
  if (att && p.cat !== 'accident') wrap.append(h('a.attach-box', { href: '#/plans/attach', style: { display: 'block', color: 'inherit', textDecoration: 'none' }, onclick: () => sessionStorage.setItem(p.kind === 'rider' ? 'attRider' : 'attMain', p.id) },
    h('div.ab-h', icon('layers'), h('b', p.kind === 'rider' ? 'ต้องแนบกับสัญญาหลัก' : 'แนบสัญญาเพิ่มเติมได้')), h('p.small', att), h('span.small', 'ดูแผนที่การแนบ →')));
  if (p.watch?.length) wrap.append(more(`ข้อควรรู้ทั้งหมด (${p.watch.length})`, h('ul.pts.warn', p.watch.map((t) => h('li', h('span.mk', { 'aria-hidden': 'true' }, h('b', '!')), h('span', T(t)))))));
  if (p.specs?.length) wrap.append(more('เงื่อนไขการรับประกัน', h('div.kvlist', p.specs.map(([k, v]) => h('div', h('span', k), h('b', T(v)))))));
  if (p.example || p.table) wrap.append(more('ตัวอย่างเบี้ย / ตารางจากโบรชัวร์',
    p.example ? h('div.card', h('p', p.example.text), h('div.source', p.example.source)) : null,
    p.table ? h('div', { style: { marginTop: '8px' } }, h('div.small.muted', p.table.title), h('div.table-wrap', h('table.t', h('thead', h('tr', p.table.cols.map((c, i) => h('th', { class: i ? 'r' : '' }, c)))), h('tbody', p.table.rows.map((r) => h('tr', r.map((c, i) => h('td', { class: i ? 'r num' : '' }, c)))))))) : null));
  wrap.append(h('p.small', { style: { marginTop: '10px' } }, h('b', 'ลดหย่อนภาษี: '), TAX_LABEL[p.tax] || '—'));
  return wrap;
}

export function renderPlanPage(id) {
  const p = PLAN[id];
  if (!p) { location.hash = '#/plans'; return null; }
  try { const r = JSON.parse(localStorage.getItem('advdesk.v1.recentPlans') || '[]').filter((x) => x !== id); r.unshift(id); localStorage.setItem('advdesk.v1.recentPlans', JSON.stringify(r.slice(0, 5))); } catch {}
  const q = quickFacts(p); const ci = closingInfo(p);
  const t = premiumTable(p.id) || builtinTable(p);
  const mid = t ? lookup(t, 35, 'f') : null;
  const priceLine = mid ? `เบี้ยประมาณ ${fmt(mid[0].value)} บาท/ปี (อายุ 35)` : p.example ? headline(p.example.text, 90, { split: false }) : 'เบี้ยตามใบเสนอจากระบบ AIA';
  const nav = [['sec-pic', 'ภาพรวม'], ['sec-cover', 'ความคุ้มครอง'], ['sec-prem', 'คิดเบี้ย'], ['sec-time', 'เส้นเวลา'], claimModel(p) ? ['sec-claim', 'เคลมจริง'] : null, ['sec-why', 'เทียบ'], ['sec-faq', 'คำถาม']].filter(Boolean);
  const go = (sid) => document.getElementById(sid)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  return h('div.planpage.cat-' + p.cat, { class: [ui.big ? 'big' : '', ui.plain ? 'plain' : ''].join(' '), 'data-title': p.short },
    h('div.pp-hero',
      h('div.pp-top', h('button.icon-btn', { onclick: () => (history.length > 1 ? history.back() : (location.hash = '#/plans')), 'aria-label': 'กลับ' }, icon('back')),
        h('div.row', { style: { gap: '6px' } },
          h('button.pp-tog', { 'aria-pressed': String(ui.plain), onclick: () => { ui.plain = !ui.plain; rerender(); } }, 'ภาษาง่าย'),
          h('button.pp-tog', { 'aria-pressed': String(ui.big), onclick: () => { ui.big = !ui.big; rerender(); }, 'aria-label': 'ตัวอักษรใหญ่' }, 'ก+'))),
      h('div.pp-head', h('div', h('div.pp-kind', CAT[p.cat].name + (p.kind === 'rider' ? ' · สัญญาเพิ่มเติม' : ' · สัญญาหลัก')), h('h1', p.short), h('p', p.tagline)), illus(p.cat, { size: 112 })),
      ci && !ci.closed ? h('div.pp-close', icon('clock'), `ปิดรับใบคำขออีก ${ci.days} วัน`) : null,
      h('div.pp-30', h('div.pp-30h', icon('clock'), '3 คำตอบใน 5 วินาที'),
        h('ol', h('li', h('b', 'คุ้มครอง: '), T(ui.plain ? PLAIN[p.cat] : headline(p.what || p.tagline, 110))), h('li', h('b', 'เหมาะกับ: '), T(p.bestFor?.[0] || '—')), h('li', h('b', 'เบี้ย: '), priceLine))),
      h('div.pp-facts', [['อายุรับ', q.age], ['จ่ายเบี้ย', q.pay], ['คุ้มครอง', (q.cover || '').replace('คุ้มครอง', '').trim()]].map(([k, v]) => h('div', h('span', k), h('b', v || '—'))))),
    h('nav.pp-nav', { 'aria-label': 'ไปยังส่วนของหน้า' }, nav.map(([sid, l]) => h('button', { onclick: () => go(sid) }, l))),
    ui.plain ? h('div.card.plain-card', h('b', 'อธิบายแบบภาษาง่าย'), h('p', PLAIN[p.cat]),
      h('p', `สมัครได้ตอนอายุ ${q.age || 'ตามเงื่อนไข'} · ${q.pay || 'จ่ายเบี้ยตามเงื่อนไข'} · ${q.cover || ''}`),
      p.kind === 'rider' ? h('p', 'ซื้อเดี่ยวไม่ได้ ต้องมีประกันชีวิตตัวหลักก่อน แล้วแนบแผนนี้เข้าไป') : null,
      h('p', 'สิ่งที่ต้องรู้: ' + (p.watch?.[0] || 'อ่านเงื่อนไขในกรมธรรม์'))) : null,
    h('section#sec-pic.pp-sec', h('h2', 'จุดเด่น (ปัดดู แตะเพื่ออ่านต่อ)'), tiles(p),
      h('div.row', { style: { gap: '8px', marginTop: '12px' } },
        h('button.btn.primary', { style: { flex: 1 }, onclick: () => import('./story.js').then((m) => m.openStory(p)) }, icon('play'), 'ดูแบบสตอรี่'),
        h('a.btn', { style: { flex: 1 }, href: '#/sheet/' + p.id }, icon('doc'), 'สรุปหน้าเดียว')),
      basketButton(p.id, 'btn block pp-basket'),
      h('button.btn.block', { style: { marginTop: '8px' }, onclick: () => import('./studio.js').then((m) => { const x = m.createItem(m.GEN.plan(p.id), { pillar: 'protect', title: p.short + ' เหมาะกับใคร' }); location.hash = '#/studio/' + x.id; }) }, icon('pen'), 'ทำคอนเทนต์จากแผนนี้')),
    h('section#sec-cover.pp-sec', h('h2', 'รายละเอียดความคุ้มครอง'), coverDetail(p)),
    h('section#sec-prem.pp-sec', h('h2', 'คิดเบี้ยแบบสด'), livePremium(p)),
    h('section#sec-time.pp-sec', h('h2', 'เส้นเวลาชีวิต'), lifeTimeline(p)),
    claimModel(p) ? h('section#sec-claim.pp-sec', h('h2', 'เคลมจริง แผนนี้จ่ายเท่าไร'), claimCalc(p)) : null,
    h('section#sec-why.pp-sec', h('h2', 'ทำไมตัวนี้ ไม่ใช่ตัวนั้น'), whyThis(p)),
    h('section#sec-faq.pp-sec', h('h2', 'คำถามที่ลูกค้าถามบ่อย'), h('div.faq', faqs(p).map(([qq, a]) => h('details', h('summary', qq, icon('next')), h('p', T(a)))))),
    clientMode() ? null : h('div.pp-tools', h('a.pp-tool', { href: '#/studio/poster?plan=' + p.id }, h('span', icon('star')), h('b', 'ทำโปสเตอร์'), h('small', 'โพสต์ได้ทันที')), h('button.pp-tool', { onclick: () => import('./poster.js').then((m) => m.clientShareSheet(p.id)) }, h('span', icon('share')), h('b', 'ส่งสรุปให้ลูกค้า'), h('small', 'ภาพสวย ส่ง LINE'))),
    clientMode() ? null : h('div.sticky-act.pp-sticky', basketButton(p.id, 'btn'), h('a.btn.primary', { href: '#/sheet/' + p.id }, icon('doc'), 'สรุปหน้าเดียว')),
    h('div.pp-actions',
      h('a.btn', { href: p.url, target: '_blank', rel: 'noopener' }, icon('ext'), 'AIA'),
      p.brochure ? h('a.btn', { href: p.brochure, target: '_blank', rel: 'noopener' }, icon('doc'), 'โบรชัวร์') : null,
      h('button.btn', { onclick: (e) => { toggleCompare(p.id); e.currentTarget.lastChild.textContent = getCompare().includes(p.id) ? 'เทียบแล้ว' : 'เทียบ'; } }, icon('plus'), getCompare().includes(p.id) ? 'เทียบแล้ว' : 'เทียบ'),
      h('a.btn', { href: `#/tools/captions?plan=${p.id}` }, icon('pen'), 'โพสต์')),
    h('p.source', { style: { margin: '14px 0' } }, 'ข้อมูลเบื้องต้นเพื่อประกอบการนำเสนอ ความคุ้มครองและเงื่อนไขเป็นไปตามกรมธรรม์'));
}
