// ─── เครื่องมือแผน: แผนที่การแนบสัญญา · Copayment · ระยะรอคอย · ตารางเบี้ย · สรุปหน้าเดียว · เทียบสวัสดิการ · คำศัพท์ ───
import { h, icon, sheet, closeSheet, choices, points, kvlist, fmt, toast, copyText, empty, more, dateTH, todayISO, T } from '../ui.js';
import * as store from '../store.js';
import { PLANS, PLAN, CATEGORIES, CAT, TAX_LABEL, quickFacts } from '../../data/plans.js';
import { COPAY, copayCheck, WAITING, waitingFor, GLOSSARY, attachInfo, DISCLAIMER } from '../../data/rules.js';
import { parseTable, lookup } from '../engine/premium.js';
import { lifeNeed, ciNeed, fmtM } from '../engine/needs.js';
import { termButton } from '../glossary.js';
import { tabsPlans } from './plans.js';
import { profile, rerender } from '../app.js';
import { clientAge } from './clients.js';
import { haptic } from '../pwa.js';

const AT = attachInfo(PLANS, PLAN);
export const premiumTable = (planId) => store.get('premiums', planId);
const catDot = (cat) => h('span.dot', { style: { background: `var(--c-${cat})` }, 'aria-hidden': 'true' });
const back = (href, title, subTxt) => h('div.back-row', h('a.icon-btn', { href, 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1.serif', { style: { fontSize: '22px' } }, title), subTxt ? h('div.small.muted', subTxt) : null));

// ── ศูนย์รวมเครื่องมือแผน ───────────────────────────────────
export function renderPlanTools() {
  const n = store.all('premiums').length;
  const tiles = [
    ['#/plans/build', 'layers', 'ต่อชุดแผน + จัดตามงบ', 'วางแผนเป็นชุด เห็นด้านที่ยังว่าง'],
    ['#/plans/body', 'heart', 'แผนที่ร่างกาย', 'แตะส่วนของร่างกาย ดูแผนที่ช่วย'],
    ['#/plans/path', 'compass', 'เส้นทางชีวิต', '7 ช่วงชีวิต กับแผนที่เหมาะ'],
    ['#/plans/finder', 'compass', 'ตัวช่วยเลือกแผน', '3 คำถาม ได้ 2–3 แผนพร้อมเหตุผล'],
    ['#/plans/attach', 'layers', 'แผนที่การแนบสัญญา', 'สัญญาหลักตัวไหน แนบอะไรได้ · จัดชุด'],
    ['#/plans/copay', 'info', 'Copayment มาตรฐานใหม่', '3 กรณีที่ต้องร่วมจ่าย + ตัวคำนวณ'],
    ['#/plans/waiting', 'clock', 'ระยะรอคอย & ข้อยกเว้น', 'พิมพ์ชื่อโรค รู้ว่ารอกี่วัน'],
    ['#/tools/premiums', 'tax', 'ตารางเบี้ยจริง', n ? `นำเข้าแล้ว ${n} แผน` : 'วางจากระบบตัวแทน คิดเบี้ยตามอายุ'],
    ['#/tools/simulate', 'flame', 'จำลองเหตุการณ์', 'ถ้าป่วย/อุบัติเหตุวันนี้ ต้องจ่ายเองเท่าไร'],
    ['#/tools/benefits', 'shield', 'เทียบกับสวัสดิการที่มี', 'ประกันกลุ่ม · ประกันสังคม · บัตรทอง'],
    ['#/tools/glossary', 'book', 'คำศัพท์ภาษาง่าย', `${GLOSSARY.length} คำ ใช้อธิบายลูกค้า`],
  ];
  return h('div', { 'data-title': 'เครื่องมือแผน' },
    h('div.topbar', h('div', h('h1', 'แผนประกัน'), h('div.sub', 'เครื่องมือช่วยอธิบายแผนให้ถูกต้องและเข้าใจง่าย'))),
    tabsPlans('tools'),
    h('div.grid.g2', { style: { marginTop: '14px' } }, tiles.map(([href, ic, t, d]) => h('a.card.tool-tile', { href }, h('span.tt-ic', icon(ic)), h('div', h('b', t), h('div.small.muted', d)), icon('next')))));
}

// ── 1) แผนที่การแนบสัญญา ───────────────────────────────────
const att = { mode: 'main', main: 'pay-life-plus', rider: 'health-happy', picked: new Set(['health-happy']), age: 35, gender: 'f' };
export function renderAttach() {
  const fromMain = sessionStorage.getItem('attMain'), fromRider = sessionStorage.getItem('attRider');
  if (fromMain && PLAN[fromMain]) { att.mode = 'main'; att.main = fromMain; sessionStorage.removeItem('attMain'); }
  if (fromRider && PLAN[fromRider]) { att.mode = 'rider'; att.rider = fromRider; sessionStorage.removeItem('attRider'); }
  const main = PLAN[att.main];
  const rec = AT.recRiders(main);
  const others = AT.riders.filter((r) => !rec.includes(r));
  const toggle = (id) => { att.picked.has(id) ? att.picked.delete(id) : att.picked.add(id); haptic(10); rerender(); };
  const riderBtn = (r) => h('button.att-r', { class: att.picked.has(r.id) ? 'on cat-' + r.cat : 'cat-' + r.cat, 'aria-pressed': String(att.picked.has(r.id)), onclick: () => toggle(r.id) },
    h('span.ar-ic', icon(att.picked.has(r.id) ? 'check' : 'plus')), h('span', h('b', r.short), h('small', CAT[r.cat].short)));
  const picked = [...att.picked].map((id) => PLAN[id]).filter(Boolean);
  // เบี้ยรวม (ถ้านำเข้าตารางแล้ว)
  const ids = [main.id, ...picked.map((p) => p.id)];
  const prem = ids.map((id) => ({ id, r: lookup(premiumTable(id), att.age, att.gender) }));
  const known = prem.filter((x) => x.r); const total = known.reduce((t, x) => t + x.r[0].value, 0);

  const mainMode = h('div',
    h('div.q', h('span.ql', 'เลือกสัญญาหลัก'), h('div.chips.wrap', AT.mains.map((m) => h('button.chip', { class: m.id === att.main ? 'on' : '', 'aria-pressed': String(m.id === att.main), onclick: () => { att.main = m.id; rerender(); } }, catDot(m.cat), m.short)))),
    h('div.att-stack', { 'aria-label': 'ชุดความคุ้มครองที่เลือก' },
      picked.length ? picked.map((r) => h('div.as-r.cat-' + r.cat, h('span', r.short), h('button', { onclick: () => toggle(r.id), 'aria-label': 'เอา ' + r.short + ' ออก' }, icon('close')))) : h('div.as-empty', 'ยังไม่ได้แนบสัญญาเพิ่มเติม — เลือกด้านล่าง'),
      h('div.as-main.cat-' + main.cat, h('small', 'สัญญาหลัก'), h('b', main.short), h('span', main.tagline))),
    known.length ? h('div.callout.good', { style: { marginTop: '10px' } }, h('b', `เบี้ยรวมโดยประมาณ ${fmt(total)} บาท/ปี`), ` · อายุ ${att.age} ${att.gender === 'm' ? 'ชาย' : 'หญิง'} · คิดจากตารางที่นำเข้า ${known.length}/${ids.length} แผน`) : null,
    h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } },
      h('label.row.small', 'อายุ', h('input.input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, value: att.age, style: { width: '84px' }, onchange: (e) => { att.age = +e.target.value; rerender(); }, 'aria-label': 'อายุลูกค้า' })),
      choices('g', att.gender, [['f', 'หญิง'], ['m', 'ชาย']], { onChange: (v) => { att.gender = v; rerender(); } })),
    h('div.section', h('h2', `แนะนำให้แนบกับ ${main.short}`), rec.length ? h('div.att-grid', rec.map(riderBtn)) : h('p.small.muted', 'ไม่มีข้อมูลคู่แนะนำในแอป')),
    others.length ? h('div.section', more(`สัญญาเพิ่มเติมอื่น (${others.length})`, h('div.att-grid', others.map(riderBtn)))) : null,
    h('div.callout.small', { style: { marginTop: '14px' } }, icon('info'), ' สัญญาเพิ่มเติมทุกตัวต้องแนบกับสัญญาหลัก · คู่ที่แนะนำมาจากข้อมูลแผนในแอป · เงื่อนไขการแนบจริง (อายุ ทุนขั้นต่ำ) ตรวจในระบบตัวแทนทุกครั้ง'),
    h('div.row', { style: { gap: '8px', marginTop: '14px' } },
      h('a.btn.primary', { style: { flex: 1 }, href: '#/sheet/' + ids.join(',') }, icon('doc'), 'สรุปหน้าเดียว (ชุดนี้)'),
      h('a.btn', { href: '#/plan/' + main.id }, 'ดูแผนหลัก')));

  const rider = PLAN[att.rider];
  const riderMode = h('div',
    h('div.q', h('span.ql', 'เลือกสัญญาเพิ่มเติม'), h('div.chips.wrap', AT.riders.map((r) => h('button.chip', { class: r.id === att.rider ? 'on' : '', 'aria-pressed': String(r.id === att.rider), onclick: () => { att.rider = r.id; rerender(); } }, catDot(r.cat), r.short)))),
    h('div.card', { style: { marginTop: '12px' } }, h('div.small.muted', 'ต้องแนบกับ'), h('b', T(AT.mustText(rider)))),
    h('div.section', h('h2', 'สัญญาหลักที่นิยมแนบคู่'), AT.recMain(rider).length ? h('div.plist', AT.recMain(rider).map((m) => h('button.prow.cat-' + m.cat, { onclick: () => { att.mode = 'main'; att.main = m.id; att.picked.add(rider.id); rerender(); } },
      h('span.pi', icon('cat-' + m.cat)), h('span.pt', h('b', m.short), h('span', m.tagline)), h('span.pr', h('span.tag', 'จัดชุด'), icon('next'))))) : h('p.small.muted', 'ใช้กับแบบประกันหลักทั่วไป — ตรวจเงื่อนไขในระบบตัวแทน')));

  return h('div', { 'data-title': 'แผนที่การแนบสัญญา' },
    back('#/plans/tools', 'แผนที่การแนบสัญญา', 'สุขภาพ โรคร้าย ชดเชย = สัญญาเพิ่มเติม ต้องมีสัญญาหลักก่อน'),
    h('div.seg', { style: { margin: '6px 0 14px' } },
      h('button', { class: att.mode === 'main' ? 'on' : '', onclick: () => { att.mode = 'main'; rerender(); } }, 'เริ่มจากสัญญาหลัก'),
      h('button', { class: att.mode === 'rider' ? 'on' : '', onclick: () => { att.mode = 'rider'; rerender(); } }, 'เริ่มจากสัญญาเพิ่มเติม')),
    att.mode === 'main' ? mainMode : riderMode);
}

// ── 2) Copayment ──────────────────────────────────────────
const cp = { premium: 20000, simpleClaims: 0, simpleAmt: 0, generalClaims: 0, generalAmt: 0 };
export function renderCopay() {
  const out = h('div', { 'aria-live': 'polite' });
  const draw = () => {
    const r = copayCheck(cp);
    out.replaceChildren(h('div.copay-res', { class: r.rate ? 'hit' : 'ok' },
      h('div.cr-big', r.rate ? `ปีต่ออายุ ร่วมจ่าย ${r.rate}%` : 'ปีต่ออายุ ไม่ต้องร่วมจ่าย'),
      h('div.small', `โรคเล็กน้อย ${cp.simpleClaims} ครั้ง · ${r.r1}% ของเบี้ย ${r.c1 ? '→ เข้ากรณีที่ 1' : ''}`),
      h('div.small', `โรคทั่วไป ${cp.generalClaims} ครั้ง · ${r.r2}% ของเบี้ย ${r.c2 ? '→ เข้ากรณีที่ 2' : ''}`),
      r.rate ? h('div.small', { style: { marginTop: '6px' } }, `ตัวอย่าง: ปีถัดไปค่ารักษา 50,000 บาท ลูกค้าจ่ายเอง ${fmt(50000 * r.rate / 100)} บาท บริษัทจ่าย ${fmt(50000 * (100 - r.rate) / 100)} บาท`) : null));
  };
  const numIn = (k, label, step) => h('label.f', h('span', label), h('input.input', { type: 'number', inputmode: 'numeric', min: 0, step, value: cp[k], oninput: (e) => { cp[k] = +e.target.value || 0; draw(); } }));
  draw();
  return h('div', { 'data-title': 'Copayment' },
    back('#/plans/tools', 'Copayment ปีต่ออายุ', `ประกันสุขภาพแบบมาตรฐานใหม่ เริ่มคุ้มครองตั้งแต่ ${COPAY.startTH}`),
    h('div.copay-cases', COPAY.cases.map((c) => h('div.cc', h('div.cc-rate', { 'aria-label': `ร่วมจ่าย ${c.rate} เปอร์เซ็นต์` }, c.rate + '%'), h('div', h('b', c.title), h('p', c.rule), h('small', c.example))))),
    h('div.card', { style: { marginTop: '12px' } }, h('b', 'ไม่นับรวมในการคิด'), points(COPAY.notCounted, { kind: 'good' })),
    h('div.section', h('h2', 'ลองคิดจากการเคลมปีที่ผ่านมา'), h('div.card',
      h('div.form-grid', numIn('premium', 'เบี้ยประกันสุขภาพต่อปี (บาท)', 1000), numIn('simpleClaims', 'เคลมโรคเล็กน้อย (ครั้ง)', 1), numIn('simpleAmt', 'ยอดเคลมโรคเล็กน้อยรวม (บาท)', 1000), numIn('generalClaims', 'เคลมโรคทั่วไป (ครั้ง)', 1), numIn('generalAmt', 'ยอดเคลมโรคทั่วไปรวม (บาท)', 1000)),
      out)),
    h('div.section', h('h2', 'ข้อเท็จจริงที่ควรบอกลูกค้า'), h('div.card', points(COPAY.facts, { kind: 'plain' }))),
    h('div.section', h('h2', 'คำพูดอธิบายลูกค้า'), h('div.card', h('p', { style: { lineHeight: 1.75 } }, COPAY.script), h('button.btn.sm', { style: { marginTop: '10px' }, onclick: () => copyText(COPAY.script) }, icon('copy'), 'คัดลอก'))),
    h('p.source', { style: { marginTop: '14px' } }, 'ที่มา: การชี้แจงของสมาคมประกันชีวิตไทย (ก.พ. 2568) ผ่าน The Standard, Infoquest, Forbes Thailand · เกณฑ์จริงเป็นไปตามกรมธรรม์'));
}

// ── 3) ระยะรอคอย & ข้อยกเว้น ─────────────────────────────────
let wq = '';
export function renderWaiting(qs = {}) {
  if (qs.q != null) wq = qs.q;
  const res = h('div', { 'aria-live': 'polite' });
  const draw = () => {
    const t = wq.trim();
    if (!t) { res.replaceChildren(); return; }
    const w = waitingFor(t);
    const hits = [];
    for (const p of PLANS) {
      const texts = [...(p.watch || []), ...(p.specs || []).map(([k, v]) => `${k}: ${v}`), ...(p.benefits || []).map(([k, v]) => `${k}: ${v}`), ...(p.highlights || []), p.what || ''];
      const found = texts.filter((x) => x.toLowerCase().includes(t.toLowerCase())).slice(0, 2);
      if (found.length) hits.push({ p, found });
    }
    const mark = (s) => { const i = s.toLowerCase().indexOf(t.toLowerCase()); return i < 0 ? s : [s.slice(0, i), h('mark', s.slice(i, i + t.length)), s.slice(i + t.length)]; };
    res.replaceChildren(
      w ? h('div.callout.warn', { style: { marginTop: '12px' } }, h('b', `"${w.name}" รอ ${w.days} วัน`), ' — อยู่ในกลุ่มโรคเฉพาะของประกันสุขภาพแบบมาตรฐาน') : null,
      h('div.section', h('h2', `พบในข้อมูลแผน ${hits.length} แผน`), hits.length ? h('div.plist', hits.slice(0, 20).map(({ p, found }) => h('a.prow.cat-' + p.cat, { href: '#/plan/' + p.id },
        h('span.pi', icon('cat-' + p.cat)), h('span.pt', h('b', p.short), ...found.map((f) => h('span', mark(f.length > 140 ? f.slice(0, 140) + '…' : f)))), h('span.pr', icon('next'))))) : h('p.small.muted', 'ไม่พบคำนี้ในข้อมูลแผน — ดูเงื่อนไขเต็มในกรมธรรม์/โบรชัวร์')));
  };
  const inp = h('input.input', { type: 'search', placeholder: 'พิมพ์ชื่อโรคหรือคำ เช่น ต้อกระจก, รอคอย, ตั้งครรภ์', value: wq, 'aria-label': 'ค้นหาระยะรอคอยและข้อยกเว้น', oninput: (e) => { wq = e.target.value; draw(); } });
  draw();
  return h('div', { 'data-title': 'ระยะรอคอย' },
    back('#/plans/tools', 'ระยะรอคอย & ข้อยกเว้น', WAITING.note),
    h('div.card.wait-card',
      h('div.wait-line', [['0', 'วันเริ่มสัญญา', WAITING.accident.text], ['30', '30 วัน', WAITING.general.text], ['120', '120 วัน', WAITING.special.text]].map(([d, l, txt]) => h('div.wl', { style: { '--p': Math.min(100, (+d / 120) * 100) + '%' } }, h('i'), h('b', l), h('span', txt)))),
      h('div.section', { style: { marginTop: '14px' } }, h('h2', 'โรคเฉพาะ 8 กลุ่ม (รอ 120 วัน)'), h('div.chips.wrap', WAITING.special.list.map(([name, keys]) => h('button.chip', { onclick: () => { wq = keys[0]; inp.value = wq; draw(); } }, name)))),
      h('p.small', { style: { marginTop: '10px' } }, T(WAITING.ci)),
      h('p.small', T(WAITING.preExisting))),
    h('div.search', { style: { marginTop: '14px' } }, icon('search'), inp),
    res);
}

// ── 4) ตารางเบี้ยจริง (นำเข้าเอง) ────────────────────────────
export function renderPremiums() {
  const have = Object.fromEntries(store.all('premiums').map((t) => [t.planId, t]));
  return h('div', { 'data-title': 'ตารางเบี้ยจริง' },
    back('#/plans/tools', 'ตารางเบี้ยจริง', 'คัดลอกตารางเบี้ยจากระบบตัวแทน / Excel / Google Sheets มาวาง แอปจะคิดเบี้ยตามอายุให้'),
    h('div.callout.small', { style: { margin: '6px 0 14px' } }, 'ตารางที่นำเข้าจะซิงก์ไปเครื่องอื่นด้วย · ใช้ในหน้าแผน (แท็บเบี้ย) · แผนที่การแนบสัญญา · สรุปหน้าเดียว · ฟอร์มบันทึกกรมธรรม์'),
    ...CATEGORIES.map((c) => { const list = PLANS.filter((p) => p.cat === c.id); if (!list.length) return null;
      return h('div.section', h('h2', c.name), h('div.plist', list.map((p) => h('button.prow.cat-' + p.cat, { onclick: () => importSheet(p.id) },
        h('span.pi', icon('cat-' + p.cat)), h('span.pt', h('b', p.short), h('span', have[p.id] ? `มีตาราง ${have[p.id].rows.length} แถว · ${have[p.id].cols.slice(1).join(' / ')}${have[p.id].source ? ' · ' + have[p.id].source : ''}` : (p.premiumByAge ? 'มีอัตราจากโบรชัวร์ในแอปแล้ว · นำเข้าเพิ่มได้' : 'ยังไม่มีตาราง'))),
        h('span.pr', have[p.id] ? h('span.tag.good', icon('check'), 'มีแล้ว') : h('span.tag', 'นำเข้า'))))));
    }));
}
export function importSheet(planId) {
  const p = PLAN[planId]; const cur = premiumTable(planId);
  const ta = h('textarea.input', { rows: 8, placeholder: 'อายุ\tชาย\tหญิง\n20\t5,200\t4,900\n21-25\t5,400\t5,000', 'aria-label': 'วางตารางเบี้ย' }, cur ? [cur.cols.join('\t'), ...cur.rows.map((r) => r.join('\t'))].join('\n') : '');
  const src = h('input.input', { value: cur?.source || '', placeholder: 'เช่น ระบบตัวแทน พ.ย. 69 · อาชีพขั้น 1' });
  const prev = h('div', { 'aria-live': 'polite' });
  let parsed = null;
  const draw = () => {
    parsed = parseTable(ta.value);
    prev.replaceChildren(parsed.error ? h('div.err', h('b', '! '), parsed.error) : h('div',
      h('div.small.muted', `อ่านได้ ${parsed.rows.length} แถว · คอลัมน์: ${parsed.cols.slice(1).join(', ')} (แก้ชื่อคอลัมน์ได้ในบรรทัดแรก)`),
      h('div.table-wrap', { style: { maxHeight: '220px', overflow: 'auto', marginTop: '6px' } }, h('table.t', h('thead', h('tr', parsed.cols.map((c, i) => h('th', { class: i ? 'r' : '' }, c)))),
        h('tbody', parsed.rows.slice(0, 40).map((r) => h('tr', r.map((v, i) => h('td', { class: i ? 'r num' : '' }, i ? fmt(v) : v)))))))));
  };
  ta.addEventListener('input', draw); draw();
  sheet({ title: 'ตารางเบี้ย · ' + p.short, body: h('div.stack',
    h('p.small.muted', 'วิธีนำเข้า: เปิดตารางเบี้ยในระบบตัวแทนหรือ Excel → ลากคลุมตั้งแต่หัวตาราง → คัดลอก → วางในช่องนี้ · บรรทัดแรกเป็นหัวตาราง เช่น อายุ / ชาย / หญิง หรือ อายุ / แผน 1 ล้าน / แผน 5 ล้าน'),
    ta, prev, h('label.f', h('span', 'ที่มา (ไว้กันลืม)'), src),
    h('div.row', { style: { gap: '8px' } },
      h('button.btn.primary', { style: { flex: 1 }, onclick: () => { if (!parsed || parsed.error) { ta.focus(); return; } store.put('premiums', { id: planId, planId, cols: parsed.cols, rows: parsed.rows, source: src.value.trim(), date: todayISO() }); closeSheet(true); toast('บันทึกตารางเบี้ยแล้ว'); } }, icon('check'), 'บันทึก'),
      cur ? h('button.btn.danger', { 'aria-label': 'ลบตาราง', onclick: () => { if (confirm('ลบตารางเบี้ยของแผนนี้?')) { store.remove('premiums', planId); closeSheet(true); } } }, icon('trash')) : null)) });
}
/** ช่องคิดเบี้ยตามอายุ (ใช้ในแท็บเบี้ยของการ์ดแผน) */
export function premiumCalc(planId) {
  const t = premiumTable(planId);
  if (!t) return h('div.card.prem-empty', h('div.row', { style: { gap: '10px' } }, icon('tax'), h('div', { style: { flex: 1 } }, h('b', 'ยังไม่มีตารางเบี้ยจริงของแผนนี้'), h('div.small.muted', 'วางตารางจากระบบตัวแทน แล้วคิดเบี้ยตามอายุได้ทันที'))),
    h('button.btn.sm', { style: { marginTop: '10px' }, onclick: () => importSheet(planId) }, icon('upload'), 'นำเข้าตารางเบี้ย'));
  let age = 35, g = 'f';
  const out = h('div.big-num', { 'aria-live': 'polite' });
  const paint = () => { const r = lookup(t, age, g); out.replaceChildren(...(r ? r.map((x) => h('div', h('small', x.col + ' '), fmt(x.value), h('small', ' บาท/ปี'))) : [h('small', 'ไม่มีอายุนี้ในตาราง')])); };
  paint();
  return h('div.card', h('div.row.between', h('div.small.muted', 'เบี้ยจากตารางที่นำเข้า' + (t.source ? ' · ' + t.source : '')), h('button.btn.sm.ghost', { onclick: () => importSheet(planId) }, 'แก้ตาราง')),
    out,
    h('div.row.wrap', { style: { gap: '10px', marginTop: '10px' } },
      h('label.row.small', 'อายุ', h('input.input', { type: 'number', inputmode: 'numeric', value: age, min: 0, max: 99, style: { width: '84px' }, oninput: (e) => { age = +e.target.value; paint(); } })),
      choices('pg', g, [['f', 'หญิง'], ['m', 'ชาย']], { onChange: (v) => { g = v; paint(); } })));
}

// ── 5) สรุปหน้าเดียว ─────────────────────────────────────────
export function renderSheet(idsStr, qs = {}) {
  const plans = idsStr.split(',').map((id) => PLAN[id]).filter(Boolean);
  if (!plans.length) { location.hash = '#/plans'; return null; }
  const c = qs.c ? store.get('clients', qs.c) : null;
  const age = c ? clientAge(c) : (qs.age ? +qs.age : null);
  const gender = c?.gender || qs.g;
  const me = profile();
  const prem = plans.map((p) => ({ p, r: lookup(premiumTable(p.id), age, gender) }));
  const total = prem.every((x) => x.r) && age != null ? prem.reduce((t, x) => t + x.r[0].value, 0) : null;
  const hasHealth = plans.some((p) => p.cat === 'health');
  const hasCI = plans.some((p) => p.cat === 'ci');

  const textVersion = () => [
    `สรุปแผน${c ? ' สำหรับคุณ' + c.nick : ''} (${dateTH(todayISO())})`,
    ...plans.map((p) => { const q = quickFacts(p); const r = prem.find((x) => x.p === p).r;
      return `\n■ ${p.short} — ${p.tagline}\n${(p.highlights || []).slice(0, 3).map((x) => '• ' + x).join('\n')}\n${[q.age && 'อายุรับ ' + q.age, q.pay, q.cover].filter(Boolean).join(' · ')}${r ? `\nเบี้ยประมาณ ${fmt(r[0].value)} บาท/ปี` : ''}\nข้อควรรู้: ${(p.watch || []).slice(0, 3).join(' / ')}`; }),
    total ? `\nเบี้ยรวมประมาณ ${fmt(total)} บาท/ปี` : '',
    hasHealth ? `\nระยะรอคอย: ${WAITING.general.text}, ${WAITING.special.text}, ${WAITING.accident.text}` : '',
    `\n${me.name} · ${me.title} ${me.company || ''} · รหัสตัวแทน ${me.agentCode || '—'}${me.licenseLife ? ' · ใบอนุญาต ' + me.licenseLife : ''}`,
    DISCLAIMER].filter(Boolean).join('\n');

  const share = async () => { const text = textVersion(); if (navigator.share) { try { await navigator.share({ title: 'สรุปแผนประกัน', text }); return; } catch {} } copyText(text); };

  return h('div.onepager', { 'data-title': 'สรุปหน้าเดียว' },
    h('div.back-row.no-print', h('button.icon-btn', { onclick: () => history.back(), 'aria-label': 'กลับ' }, icon('back')), h('span.small.muted', { style: { flex: 1 } }, 'สรุปหน้าเดียว · พิมพ์หรือบันทึกเป็น PDF ได้'),
      h('button.btn.sm', { onclick: share }, icon('share'), 'ส่งข้อความ'), h('button.btn.sm.primary', { onclick: () => window.print() }, icon('print'), 'พิมพ์ / PDF')),
    h('article.op-page',
      h('header.op-head', h('div', h('div.op-kicker', 'สรุปข้อมูลแผนประกัน'), h('h1', plans.length > 1 ? `ชุดความคุ้มครอง ${plans.length} แผน` : plans[0].short), c ? h('div.op-for', `สำหรับคุณ${c.nick}${age != null ? ' · อายุ ' + age + ' ปี' : ''}`) : null),
        h('div.op-date', dateTH(todayISO()))),
      ...plans.map((p) => { const q = quickFacts(p); const r = prem.find((x) => x.p === p).r;
        return h('section.op-plan.cat-' + p.cat,
          h('div.op-ph', h('span.op-cat', CAT[p.cat].name + (p.kind === 'rider' ? ' · สัญญาเพิ่มเติม' : ' · สัญญาหลัก')), h('h2', p.short), h('p', p.tagline)),
          h('div.op-facts', [['อายุรับ', q.age], ['จ่ายเบี้ย', q.pay], ['คุ้มครอง', q.cover], ['ลดหย่อนภาษี', TAX_LABEL[p.tax]?.split(' (')[0]]].filter(([, v]) => v).map(([k, v]) => h('div', h('span', k), h('b', v)))),
          h('div.op-cols',
            h('div', h('h3', 'จุดเด่น'), h('ul', (p.highlights || []).slice(0, 4).map((x) => h('li', T(x))))),
            h('div', h('h3', 'ข้อควรรู้ / ข้อยกเว้น'), h('ul.warn', (p.watch || []).slice(0, 4).map((x) => h('li', T(x)))))),
          r ? h('div.op-prem', `เบี้ยประมาณ ${r.map((x) => `${x.col} ${fmt(x.value)}`).join(' · ')} บาท/ปี`) : (p.example ? h('div.op-prem.muted', 'ตัวอย่าง: ' + p.example.text) : null));
      }),
      total ? h('div.op-total', `เบี้ยรวมโดยประมาณ ${fmt(total)} บาท/ปี`) : null,
      hasHealth || hasCI ? h('section.op-note', h('h3', 'ระยะเวลารอคอย'), h('p', `${WAITING.accident.text} · ${WAITING.general.text} · ${WAITING.special.text} (${WAITING.special.list.map((x) => x[0]).join(', ')})`), hasCI ? h('p', WAITING.ci) : null) : null,
      hasHealth ? h('section.op-note', h('h3', 'ส่วนร่วมจ่าย (Copayment) ปีต่ออายุ'), h('p', `ประกันสุขภาพที่เริ่มคุ้มครองตั้งแต่ ${COPAY.startTH}: ถ้าปีก่อนเคลมโรคเล็กน้อย ≥3 ครั้ง และ ≥200% ของเบี้ย หรือโรคทั่วไป ≥3 ครั้ง และ ≥400% ของเบี้ย ปีถัดไปร่วมจ่าย 30% (เข้าทั้งสองกรณี 50%) · ไม่นับผ่าตัดใหญ่ โรคร้ายแรง และอุบัติเหตุ`)) : null,
      h('footer.op-foot', h('div', h('b', me.name), h('div', `${me.title} · ${me.company || ''}`), h('div', `รหัสตัวแทน ${me.agentCode || '—'}${me.licenseLife ? ' · ใบอนุญาตเลขที่ ' + me.licenseLife : ''}${me.phone ? ' · โทร ' + me.phone : ''}${me.line ? ' · LINE ' + me.line : ''}`)),
        h('p.op-disc', DISCLAIMER))),
    h('details.no-print.op-text', h('summary', 'ข้อความสรุป (สำหรับคัดลอกส่ง LINE หรือโปรแกรมอ่านหน้าจอ)'), h('pre', textVersion()), h('button.btn.sm', { onclick: () => copyText(textVersion()) }, icon('copy'), 'คัดลอก')));
}

// ── 6) เทียบกับสวัสดิการที่มี ───────────────────────────────
const TIERS = { gov: { name: 'โรงพยาบาลรัฐ', room: 1500, year: 1000000 }, pri: { name: 'เอกชนทั่วไป', room: 4000, year: 5000000 }, prem: { name: 'เอกชนพรีเมียม', room: 8000, year: 15000000 } };
const WELFARE = [['sso', 'ประกันสังคม'], ['gold', 'บัตรทอง'], ['civil', 'ข้าราชการ'], ['none', 'ไม่มี']];
export function renderBenefits(clientId) {
  const c = clientId ? store.get('clients', clientId) : null;
  const b = { welfare: 'sso', tier: 'pri', room: 0, year: 0, opd: 0, group: false, ...(c?.benefits || store.getSettings().benefitsDraft || {}) };
  const save = (patch) => { Object.assign(b, patch); if (c) store.put('clients', { ...store.get('clients', c.id), benefits: { ...b } }); else store.saveSettings({ benefitsDraft: { ...b } }); };
  const out = h('div');
  const tier = TIERS[b.tier];
  const p = c ? { ...c, age: clientAge(c) } : {};
  const income = +p.incomeMonthly || 0;
  const rows = [
    ['ค่าห้อง/วัน', +b.room || 0, tier.room, 'health', 'แผนสุขภาพ'],
    ['วงเงินค่ารักษา/ปี', +b.year || 0, tier.year, 'health', 'แผนสุขภาพเหมาจ่าย'],
    ['เงินก้อนโรคร้ายแรง', +(c?.ciCover) || 0, c ? ciNeed(p).need : 0, 'ci', 'แผนโรคร้ายแรง'],
    ['ทุนประกันชีวิต', +(c?.lifeCover) || 0, c ? lifeNeed(p).need : 0, 'life', 'แผนประกันชีวิต'],
    ['ชดเชยรายวัน', +(c?.hbDaily) || 0, income ? Math.round(income / 30 / 100) * 100 : 0, 'hb', 'แผนชดเชยรายได้'],
  ].filter(([, , need]) => need > 0);
  const draw = () => {
    out.replaceChildren(
      h('div.table-wrap', h('table.t.bf', h('caption.sr-only', 'เทียบความคุ้มครองที่มีกับที่ควรมี'),
        h('thead', h('tr', h('th', { scope: 'col' }, ''), h('th.r', { scope: 'col' }, 'มีอยู่'), h('th.r', { scope: 'col' }, 'ควรมี'), h('th.r', { scope: 'col' }, 'ขาด'))),
        h('tbody', rows.map(([k, have, need]) => { const gap = Math.max(0, need - have);
          return h('tr', h('th', { scope: 'row' }, k), h('td.r.num', fmtM(have)), h('td.r.num', fmtM(need)), h('td.r.num', { class: gap ? 'gap' : 'ok' }, gap ? fmtM(gap) : h('span', icon('check'), ' พอ'))); })))),
      h('div.section', h('h2', 'แผนที่ช่วยเติมช่องว่าง'), h('div.row.wrap', { style: { gap: '6px' } },
        rows.filter(([, have, need]) => need > have).map(([k, , , cat, label]) => h('a.chip', { href: '#/plans?cat=' + cat }, catDot(cat), label)))),
      h('div.card', { style: { marginTop: '12px' } }, h('b', 'สิ่งที่ลูกค้ามักไม่รู้'), points([
        b.group ? 'ประกันกลุ่มเป็นของบริษัท สิ้นสุดเมื่อลาออกหรือเกษียณ — ช่วงที่อายุมากและป่วยง่ายที่สุดมักไม่มีแล้ว' : null,
        b.welfare === 'sso' ? 'ประกันสังคมต้องใช้โรงพยาบาลตามสิทธิ เลือกโรงพยาบาลเองหรือห้องเดี่ยวต้องจ่ายส่วนต่าง' : null,
        b.welfare === 'gold' ? 'บัตรทองใช้ได้ตามหน่วยบริการที่ลงทะเบียน ไม่ครอบคลุมการเลือกโรงพยาบาลเอกชนเอง' : null,
        b.welfare === 'civil' ? 'สิทธิข้าราชการครอบคลุมค่ารักษาส่วนใหญ่ในโรงพยาบาลรัฐ แต่ไม่ชดเชยรายได้ที่หายไปช่วงป่วย' : null,
        'สวัสดิการทุกแบบไม่จ่าย "เงินก้อน" เมื่อเป็นโรคร้าย — รายได้ที่หายไประหว่างรักษาต้องใช้เงินเก็บเอง',
      ].filter(Boolean), { kind: 'warn' })));
  };
  const money = (k, label) => h('label.f', h('span', label), h('input.input', { type: 'number', inputmode: 'numeric', min: 0, step: 500, value: b[k] || '', placeholder: '0', oninput: (e) => { b[k] = +e.target.value || 0; draw(); }, onchange: () => save({}) }));
  draw();
  return h('div', { 'data-title': 'เทียบสวัสดิการ' },
    back(c ? '#/client/' + c.id : '#/plans/tools', 'เทียบกับสวัสดิการที่มี', c ? 'คุณ' + c.nick + ' · ค่า "ควรมี" เป็นค่าแนะนำเบื้องต้น ปรับตามลูกค้าได้' : 'ค่า "ควรมี" เป็นค่าแนะนำเบื้องต้น · เปิดจากหน้าลูกค้าจะคิดทุนชีวิต/โรคร้ายให้ด้วย'),
    h('div.card', { style: { marginTop: '8px' } },
      h('div.q', h('span.ql', 'สิทธิรักษาพื้นฐาน'), choices('wf', b.welfare, WELFARE, { onChange: (v) => { save({ welfare: v }); draw(); } })),
      h('div.q', h('span.ql', 'อยากรักษาที่'), choices('tier', b.tier, Object.entries(TIERS).map(([k, v]) => [k, v.name]), { onChange: (v) => { save({ tier: v }); rerender(); } })),
      h('label.row.small', { style: { margin: '6px 0 10px' } }, h('input', { type: 'checkbox', checked: !!b.group, onchange: (e) => { save({ group: e.target.checked }); draw(); } }), 'มีประกันกลุ่มจากบริษัท'),
      more('กรอกวงเงินประกันกลุ่ม / ที่มีอยู่', h('div.form-grid', money('room', 'ค่าห้อง/วัน (บาท)'), money('year', 'วงเงินค่ารักษาต่อปี หรือต่อครั้ง (บาท)'), money('opd', 'OPD ต่อครั้ง (บาท)')))),
    h('div.section', h('h2', 'เทียบความคุ้มครอง'), out));
}

// ── 7) คำศัพท์ ──────────────────────────────────────────────
export function renderGlossary(qs = {}) {
  let gq = qs.q || '';
  const list = h('div', { 'aria-live': 'polite' });
  const draw = () => { const t = gq.trim().toLowerCase();
    const items = GLOSSARY.filter(([k, v]) => !t || k.toLowerCase().includes(t) || v.toLowerCase().includes(t));
    list.replaceChildren(items.length ? h('dl.gloss', items.map(([k, v]) => [h('dt', k), h('dd', v)])) : h('div.card', empty('ไม่พบคำนี้', 'book'))); };
  draw();
  return h('div', { 'data-title': 'คำศัพท์' },
    back('#/plans/tools', 'คำศัพท์ภาษาง่าย', 'ใช้อธิบายลูกค้า · คำที่มีเส้นประในแอป แตะดูความหมายได้ทุกที่'),
    h('div.search', { style: { margin: '6px 0 12px' } }, icon('search'), h('input.input', { type: 'search', value: gq, placeholder: 'ค้นหาคำ', 'aria-label': 'ค้นหาคำศัพท์', oninput: (e) => { gq = e.target.value; draw(); } })),
    list);
}
