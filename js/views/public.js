// ─── หน้าสำหรับคนทั่วไป: แบบทดสอบ + เครื่องคิด (ภาษาง่าย แค่กรอกตัวเลขก็เข้าใจ) ───
// เปิดผ่านลิงก์ #/p/... ได้โดยไม่เห็นข้อมูลอื่นในแอป · ข้อมูลตัวแทน (ชื่อ/LINE/ใบอนุญาต) ฝังมากับลิงก์
import { h, icon, choices, fmt, toast, copyText, more } from '../ui.js';
import { retirement, education, emergency, compoundCompare } from '../engine/calc.js';
import { profile } from '../app.js';
import { illus } from '../illus.js';
import { countUp } from '../anim.js';

const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; } };
export function shareLink(path) { const p = profile(); return `${location.origin}${location.pathname}#/p/${path}?a=${b64({ n: p.name, k: p.nick, t: p.title, l: p.line, i: p.licenseLife })}`; }
function agentFrom(qs, internal) { if (internal) { const p = profile(); return { n: p.name, k: p.nick, t: p.title, l: p.line, i: p.licenseLife }; } return (qs.a && unb64(qs.a)) || {}; }
const nickOf = (a) => (a.k || '').replace(/^คุณ/, '') || (a.n || 'ที่ปรึกษา').split(' ')[0];
function lineLink(a, text) {
  const id = (a.l || '').trim(); if (!id) return null;
  return id.startsWith('@') ? `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(text)}` : `https://line.me/R/ti/p/~${encodeURIComponent(id)}`;
}
function sendBox(a, text = '') {
  let txt = text;
  const isOA = (a.l || '').trim().startsWith('@');
  const link = lineLink(a, txt) ? h('a.btn.pub-line', { href: lineLink(a, txt), target: '_blank', rel: 'noopener', onclick: () => { if (!isOA) copyText(txt); } }, icon('chat'), `ส่งผลให้คุณ${nickOf(a)}ทาง LINE`) : null;
  const el = h('div.pub-send', link, h('button.btn', { onclick: () => copyText(txt) }, icon('copy'), 'คัดลอกผล'),
    h('p.xs.muted', isOA || !link ? 'ไม่มีการเก็บข้อมูลของคุณ ตัวเลขคำนวณในเครื่องของคุณเท่านั้น' : 'กดแล้วจะคัดลอกผลให้ เปิด LINE แล้ววางในแชตได้เลย · ไม่มีการเก็บข้อมูลของคุณ'));
  el.update = (t) => { txt = t; if (link) link.href = lineLink(a, t); };
  return el;
}
function shell(a, title, sub, body, internal, back) {
  return h('div.pub', { 'data-title': title },
    internal ? h('div.back-row', h('a.icon-btn', { href: back || '#/tools/calc', 'aria-label': 'กลับ' }, icon('back')), h('span.small.muted', 'ตัวอย่างหน้าที่ลูกค้าจะเห็น')) : (back ? h('a.pub-back', { href: back }, icon('back'), 'กลับ') : null),
    h('header.pub-head', h('h1', title), sub ? h('p', sub) : null),
    body,
    h('footer.pub-foot', h('b', a.n || ''), h('span', [a.t, a.i ? 'ใบอนุญาตเลขที่ ' + a.i : null].filter(Boolean).join(' · ')), h('small', 'ตัวเลขเป็นการประมาณเพื่อช่วยวางแผน ไม่ใช่การรับประกันผลตอบแทน')));
}
// ช่องกรอกตัวเลขแบบใหญ่ อ่านง่าย มีปุ่ม − +
function bigNum(label, help, value, { step = 1000, min = 0, max = 1e9, suffix = 'บาท', chips = [] } = {}, onChange) {
  const inp = h('input.input.pub-num', { type: 'number', inputmode: 'numeric', value, min, max, step, 'aria-label': label, oninput: (e) => onChange(+e.target.value || 0) });
  const set = (v) => { v = Math.max(min, Math.min(max, v)); inp.value = v; onChange(v); };
  return h('div.pub-q', h('label', h('b', label), help ? h('small', help) : null),
    h('div.pub-num-row', h('button.pub-step', { type: 'button', 'aria-label': 'ลด', onclick: () => set((+inp.value || 0) - step) }, '−'), inp, h('span.pub-suf', suffix), h('button.pub-step', { type: 'button', 'aria-label': 'เพิ่ม', onclick: () => set((+inp.value || 0) + step) }, '+')),
    chips.length ? h('div.chips.wrap', chips.map((c) => h('button.chip', { type: 'button', onclick: () => set(c) }, fmt(c)))) : null);
}
const bigRes = (label) => { const v = h('b.pub-big', '0'); return { el: h('div.pub-res-i', h('span', label), v), set: (n) => countUp(v, n) }; };

// ── แบบทดสอบ 5 ข้อ ──
const QUIZ = [
  ['ถ้าวันนี้ไม่มีรายได้ เงินเก็บของคุณใช้ได้กี่เดือน?', [['ไม่ถึง 1 เดือน', 0], ['1–3 เดือน', 10], ['3–6 เดือน', 16], ['มากกว่า 6 เดือน', 20]], 'เก็บเงินสำรองให้ได้ 3–6 เท่าของรายจ่ายต่อเดือน แยกบัญชีไว้'],
  ['ถ้าต้องนอนโรงพยาบาล ค่ารักษาจะมาจากไหน?', [['จ่ายเอง', 0], ['สิทธิรัฐ / ประกันสังคม', 6], ['ประกันกลุ่มของบริษัท', 12], ['ประกันสุขภาพของตัวเอง', 20]], 'สิทธิรัฐและประกันกลุ่มมีข้อจำกัด และประกันกลุ่มหมดเมื่อลาออก ควรมีประกันสุขภาพของตัวเอง'],
  ['ถ้าป่วยหนักต้องหยุดงาน 6 เดือน รายได้ระหว่างนั้นมาจากไหน?', [['ไม่มีเลย', 0], ['ใช้เงินเก็บ', 8], ['มีเงินก้อนจากประกันโรคร้าย/ชดเชยรายได้', 20]], 'เงินก้อนเมื่อเจอโรคร้าย ช่วยให้บ้านยังเดินต่อได้ระหว่างรักษา'],
  ['มีคนที่พึ่งพารายได้ของคุณไหม (พ่อแม่ ลูก คู่ชีวิต)?', [['มี แต่ยังไม่มีประกันชีวิต', 0], ['มี และมีประกันชีวิตบ้าง', 12], ['มี และคุ้มครองพอแล้ว', 20], ['ไม่มีคนพึ่งพา', 20]], 'ทุนประกันชีวิตควรพอให้ครอบครัวใช้จ่ายและใช้หนี้ได้ ถ้าวันหนึ่งเราไม่อยู่'],
  ['คุณเริ่มออมเพื่อเกษียณหรือยัง?', [['ยังไม่ได้เริ่ม', 0], ['เริ่มบ้าง ไม่สม่ำเสมอ', 10], ['ออมทุกเดือน', 20]], 'เริ่มออมเร็วแม้จำนวนน้อย ได้เปรียบเพราะดอกเบี้ยทบต้น'],
];
const qz = { i: 0, ans: [] };
export function renderQuiz(qs = {}, internal = false) {
  const a = agentFrom(qs, internal);
  const box = h('div.pub-card');
  const draw = () => {
    if (qz.i < QUIZ.length) {
      const [q, opts] = QUIZ[qz.i];
      box.replaceChildren(h('div.pub-prog', QUIZ.map((_, k) => h('i', { class: k < qz.i ? 'done' : k === qz.i ? 'on' : '' }))), h('div.small.muted', `ข้อ ${qz.i + 1} จาก ${QUIZ.length}`), h('h2', q),
        h('div.pub-opts', opts.map(([l, sc], k) => h('button', { onclick: () => { qz.ans[qz.i] = k; qz.i++; draw(); window.scrollTo({ top: 0 }); } }, l))),
        qz.i ? h('button.btn.ghost.sm', { onclick: () => { qz.i--; draw(); } }, icon('back'), 'ย้อนกลับ') : null);
      return;
    }
    const score = qz.ans.reduce((t, k, i) => t + QUIZ[i][1][k][1], 0);
    const [lv, col, msg] = score >= 80 ? ['พร้อมมาก', 'var(--good)', 'คุณเตรียมรับมือเรื่องไม่คาดฝันได้ดีมาก ลองทบทวนปีละครั้ง'] : score >= 60 ? ['ดี แต่ยังมีช่องว่าง', 'var(--c-life)', 'พื้นฐานดีแล้ว เติมอีก 1–2 เรื่องจะอุ่นใจขึ้นมาก'] : score >= 40 ? ['ควรเติมบางเรื่อง', 'var(--warn)', 'ถ้าเกิดเรื่องไม่คาดฝัน อาจกระทบเงินเก็บพอสมควร'] : ['ควรเริ่มวางแผนเร็ว ๆ นี้', 'var(--bad)', 'ตอนนี้ยังเสี่ยงอยู่ เริ่มจากเรื่องที่สำคัญที่สุดก่อน'];
    const tips = qz.ans.map((k, i) => ({ s: QUIZ[i][1][k][1], t: QUIZ[i][2] })).filter((x) => x.s < 20).sort((x, y) => x.s - y.s).slice(0, 3);
    const num = h('b', '0'); setTimeout(() => countUp(num, score), 50);
    const text = `ผลแบบทดสอบ "พร้อมรับมือเรื่องไม่คาดฝันแค่ไหน": ${score}/100 (${lv})\nอยากให้ช่วยดูว่าควรเริ่มจากเรื่องไหนครับ/ค่ะ`;
    box.replaceChildren(illus(score >= 60 ? 'finder' : 'empty', { size: 110 }), h('div.pub-score', { style: { '--sc': col } }, num, h('small', '/100')), h('h2', { style: { color: col } }, lv), h('p', msg),
      tips.length ? h('div.pub-tips', h('b', 'เรื่องที่ควรเติมก่อน'), h('ol', tips.map((x) => h('li', x.t)))) : null,
      sendBox(a, text), h('button.btn.ghost.sm', { onclick: () => { qz.i = 0; qz.ans = []; draw(); } }, icon('sync'), 'ทำใหม่'));
  };
  draw();
  return shell(a, 'คุณพร้อมรับมือเรื่องไม่คาดฝันแค่ไหน?', '5 คำถาม ใช้เวลา 1 นาที ไม่ต้องกรอกข้อมูลส่วนตัว', box, internal, internal ? '#/tools/calc' : null);
}

// ── เครื่องคิด ──
const CALCS = [
  ['retire', 'cat-annuity', 'เกษียณต้องมีเงินเท่าไร', 'คิดรวมเงินเฟ้อ บอกว่าต้องออมเดือนละเท่าไร'],
  ['edu', 'cat-saving', 'ทุนการศึกษาลูก', 'ค่าเรียนในอนาคต และต้องเก็บเดือนละเท่าไร'],
  ['emergency', 'shield', 'เงินสำรองฉุกเฉิน', 'ควรมีเท่าไร อีกกี่เดือนถึงเป้า'],
  ['grow', 'line', 'เริ่มออมเร็ว vs ช้า', 'เห็นพลังดอกเบี้ยทบต้นชัด ๆ'],
];
const st = { retire: { age: 35, ra: 60, m: 20000, have: 0, inf: 3, ret: 4, to: 85 }, edu: { ca: 3, sa: 18, cost: 100000, yrs: 4, inf: 5, ret: 3 }, emergency: { exp: 20000, mo: 6, have: 0, per: 3000 }, grow: { m: 2000, a: 25, late: 10, end: 60, r: 4 } };
export function renderCalc(type, qs = {}, internal = false) {
  const a = agentFrom(qs, internal); const base = internal ? '#/tools/calc' : '#/p/calc' + (qs.a ? '?a=' + qs.a : '');
  if (!type) return shell(a, 'เครื่องคิดการเงิน', 'เลือกเรื่องที่อยากรู้ กรอกตัวเลขไม่กี่ช่อง เห็นผลทันที', h('div', h('div.pub-hub', CALCS.map(([k, ic, t, d]) => h('a.pub-tile', { href: (internal ? '#/tools/calc/' : '#/p/calc/') + k + (!internal && qs.a ? '?a=' + qs.a : '') }, h('span.pt-ic', icon(ic)), h('b', t), h('small', d), icon('next')))),
    h('a.pub-tile.quiz', { href: internal ? '#/tools/quiz' : '#/p/quiz' + (qs.a ? '?a=' + qs.a : '') }, h('span.pt-ic', icon('grid')), h('b', 'แบบทดสอบ: พร้อมรับมือแค่ไหน?'), h('small', '5 คำถาม 1 นาที'), icon('next')),
    internal ? linkManager() : null), internal, internal ? '#/tools' : null);
  const s = st[type]; if (!s) return renderCalc(null, qs, internal);
  const out = h('div.pub-res', { 'aria-live': 'polite' }); const sb = sendBox(a); let draw, title, sub, inputs, adv, sendText;
  if (type === 'retire') {
    title = 'เกษียณแล้วต้องมีเงินเท่าไร?'; sub = 'ของแพงขึ้นทุกปี (เงินเฟ้อ) เงิน 20,000 วันนี้ อีก 25 ปีจะซื้อของได้น้อยลง';
    const r1 = bigRes('ต้องมีเงินก้อนตอนเกษียณประมาณ'), r2 = bigRes('ต้องออมเดือนละ (เริ่มวันนี้)'), r3 = bigRes('ค่าใช้จ่ายต่อเดือนตอนเกษียณ (หลังรวมเงินเฟ้อ)');
    out.append(r1.el, r2.el, r3.el);
    draw = () => { const r = retirement({ age: s.age, retireAge: s.ra, lifeTo: s.to, monthlyNow: s.m, inflation: s.inf, returnPre: s.ret, returnPost: 3, have: s.have }); r1.set(r.need); r2.set(r.save); r3.set(r.monthlyAtRetire);
      sendText = `คิดเงินเกษียณ: อยากใช้เดือนละ ${fmt(s.m)} (ค่าเงินวันนี้) เกษียณอายุ ${s.ra} → ต้องมีประมาณ ${fmt(r.need)} บาท ต้องออมเดือนละ ${fmt(r.save)} บาท\nอยากปรึกษาวิธีเก็บครับ/ค่ะ`; };
    inputs = [bigNum('ตอนนี้อายุ', null, s.age, { step: 1, min: 18, max: 70, suffix: 'ปี' }, (v) => { s.age = v; draw(); }), bigNum('อยากเกษียณตอนอายุ', null, s.ra, { step: 1, min: 40, max: 75, suffix: 'ปี', chips: [55, 60, 65] }, (v) => { s.ra = v; draw(); }),
      bigNum('อยากมีเงินใช้เดือนละ', 'คิดเป็นค่าเงินวันนี้ เช่น ใช้ชีวิตแบบตอนนี้ต้องใช้เท่าไร', s.m, { step: 1000, chips: [15000, 20000, 30000, 50000] }, (v) => { s.m = v; draw(); }), bigNum('มีเงินเก็บเพื่อเกษียณแล้ว', 'ไม่มีใส่ 0 ได้', s.have, { step: 10000 }, (v) => { s.have = v; draw(); })];
    adv = [bigNum('เงินเฟ้อต่อปี', 'ค่าเฉลี่ยระยะยาวของไทยประมาณ 2–3%', s.inf, { step: 0.5, min: 0, max: 10, suffix: '%' }, (v) => { s.inf = v; draw(); }), bigNum('ผลตอบแทนเงินออมต่อปี (สมมติ)', null, s.ret, { step: 0.5, min: 0, max: 12, suffix: '%' }, (v) => { s.ret = v; draw(); }), bigNum('ใช้เงินถึงอายุ', null, s.to, { step: 1, min: 70, max: 100, suffix: 'ปี' }, (v) => { s.to = v; draw(); })];
  } else if (type === 'edu') {
    title = 'ทุนการศึกษาลูกต้องเตรียมเท่าไร?'; sub = 'ค่าเรียนขึ้นทุกปี ยิ่งเริ่มเก็บเร็ว ยิ่งเก็บต่อเดือนน้อย';
    const r1 = bigRes('ค่าเรียนรวมในอนาคตประมาณ'), r2 = bigRes('ต้องเก็บเดือนละ'); out.append(r1.el, r2.el);
    draw = () => { const r = education({ childAge: s.ca, startAge: s.sa, years: s.yrs, costPerYear: s.cost, inflation: s.inf, returnPct: s.ret }); r1.set(r.total); r2.set(r.save);
      sendText = `คิดทุนการศึกษา: ลูกอายุ ${s.ca} เรียนตอนอายุ ${s.sa} ${s.yrs} ปี ค่าเรียนวันนี้ปีละ ${fmt(s.cost)} → รวมประมาณ ${fmt(r.total)} บาท เก็บเดือนละ ${fmt(r.save)} บาท`; };
    inputs = [bigNum('ลูกอายุตอนนี้', null, s.ca, { step: 1, min: 0, max: 20, suffix: 'ปี' }, (v) => { s.ca = v; draw(); }), bigNum('เริ่มเรียนระดับนี้ตอนอายุ', 'เช่น มหาวิทยาลัย 18 ปี', s.sa, { step: 1, min: 3, max: 25, suffix: 'ปี', chips: [6, 12, 18] }, (v) => { s.sa = v; draw(); }),
      bigNum('ค่าเรียนต่อปี (ราคาวันนี้)', null, s.cost, { step: 10000, chips: [50000, 100000, 200000, 500000] }, (v) => { s.cost = v; draw(); }), bigNum('เรียนกี่ปี', null, s.yrs, { step: 1, min: 1, max: 12, suffix: 'ปี' }, (v) => { s.yrs = v; draw(); })];
    adv = [bigNum('ค่าเรียนขึ้นปีละ', null, s.inf, { step: 0.5, min: 0, max: 15, suffix: '%' }, (v) => { s.inf = v; draw(); }), bigNum('ผลตอบแทนเงินเก็บ (สมมติ)', null, s.ret, { step: 0.5, min: 0, max: 10, suffix: '%' }, (v) => { s.ret = v; draw(); })];
  } else if (type === 'emergency') {
    title = 'เงินสำรองฉุกเฉินต้องมีเท่าไร?'; sub = 'ไว้ใช้ตอนตกงาน ป่วย หรือมีเรื่องด่วน แนวทางที่นิยม: 3–6 เท่าของรายจ่ายต่อเดือน';
    const r1 = bigRes('ควรมีเงินสำรอง'), r2 = bigRes('ยังขาดอีก'); const barI = h('i'); const when = h('p.pub-when');
    out.append(r1.el, h('div.pub-bar', barI), r2.el, when);
    draw = () => { const r = emergency({ expense: s.exp, months: s.mo, have: s.have, perMonth: s.per }); r1.set(r.target); r2.set(r.left); barI.style.width = r.pct * 100 + '%';
      when.textContent = r.left <= 0 ? 'ถึงเป้าแล้ว เก่งมาก!' : r.monthsToGo ? `ถ้าเก็บเดือนละ ${fmt(s.per)} บาท อีก ${r.monthsToGo} เดือนถึงเป้า` : 'ลองใส่จำนวนที่เก็บได้ต่อเดือน';
      sendText = `คิดเงินสำรอง: รายจ่ายเดือนละ ${fmt(s.exp)} ควรมี ${fmt(r.target)} บาท มีแล้ว ${fmt(s.have)} ยังขาด ${fmt(r.left)} บาท`; };
    inputs = [bigNum('รายจ่ายต่อเดือน', 'รวมค่าเช่า ค่ากิน ค่าเดินทาง บิลทั้งหมด', s.exp, { step: 1000, chips: [10000, 20000, 30000] }, (v) => { s.exp = v; draw(); }),
      h('div.pub-q', h('label', h('b', 'อยากสำรองกี่เดือน')), choices('mo', String(s.mo), [['3', '3 เดือน'], ['6', '6 เดือน (แนะนำ)'], ['12', '12 เดือน']], { onChange: (v) => { s.mo = +v; draw(); } })),
      bigNum('ตอนนี้มีแล้ว', null, s.have, { step: 5000 }, (v) => { s.have = v; draw(); }), bigNum('เก็บเพิ่มได้เดือนละ', null, s.per, { step: 500, chips: [1000, 3000, 5000] }, (v) => { s.per = v; draw(); })];
  } else {
    title = 'เริ่มออมเร็ว vs ช้า ต่างกันแค่ไหน?'; sub = 'ออมเท่ากันทุกเดือน แต่เริ่มคนละเวลา ผลต่างกันเพราะดอกเบี้ยทบต้น';
    const r1 = bigRes('เริ่มตอนนี้ ตอนจบจะมี'), r2 = bigRes('ถ้าเริ่มช้าไป'), r3 = bigRes('ต่างกัน'); const bars = h('div.pub-cmp'); out.append(r1.el, r2.el, bars, r3.el);
    draw = () => { const r = compoundCompare({ monthly: s.m, rate: s.r, startA: s.a, startB: s.a + s.late, end: s.end }); r1.set(r.a); r2.set(r.b); r3.set(r.diff);
      bars.replaceChildren(h('div', h('span', `เริ่มอายุ ${s.a}`), h('i', { style: { width: '100%' } })), h('div', h('span', `เริ่มอายุ ${s.a + s.late}`), h('i.late', { style: { width: (r.a ? r.b / r.a * 100 : 0) + '%' } })));
      sendText = `คิดออมเร็ว vs ช้า: ออมเดือนละ ${fmt(s.m)} เริ่มอายุ ${s.a} ได้ประมาณ ${fmt(r.a)} · เริ่มช้า ${s.late} ปี ได้ ${fmt(r.b)} (สมมติผลตอบแทน ${s.r}%/ปี)`; };
    inputs = [bigNum('ออมเดือนละ', null, s.m, { step: 500, chips: [1000, 2000, 5000] }, (v) => { s.m = v; draw(); }), bigNum('อายุตอนนี้', null, s.a, { step: 1, min: 15, max: 60, suffix: 'ปี' }, (v) => { s.a = v; draw(); }),
      bigNum('ถ้ารอไปอีก', null, s.late, { step: 1, min: 1, max: 30, suffix: 'ปี', chips: [5, 10] }, (v) => { s.late = v; draw(); }), bigNum('เก็บถึงอายุ', null, s.end, { step: 1, min: 30, max: 80, suffix: 'ปี' }, (v) => { s.end = v; draw(); })];
    adv = [bigNum('ผลตอบแทนต่อปี (สมมติ)', null, s.r, { step: 0.5, min: 0, max: 12, suffix: '%' }, (v) => { s.r = v; draw(); })];
  }
  const calc = draw; draw = () => { calc(); sb.update(sendText || title); };
  setTimeout(draw, 0);
  const body = h('div', h('div.pub-card', ...inputs, adv ? more('ตั้งค่าเพิ่มเติม (ไม่ต้องแก้ก็ได้)', ...adv) : null),
    h('div.pub-card.res', h('div.pub-res-h', 'ผลของคุณ'), out, sb),
    internal ? h('button.btn.block', { style: { marginTop: '10px' }, onclick: () => import('./studio.js').then((m) => { const deck = calcDeck(type, s); const x = m.createItem(deck, { pillar: 'money', title: deck.slides[0].title }); location.hash = '#/studio/' + x.id; }) }, icon('pen'), 'ทำเป็นโพสต์ (ส่งเข้าสตูดิโอ)') : null);
  return shell(a, title, sub, body, internal, base);
}

/** ผลเครื่องคิด → ชุดสไลด์ (ตัวสร้าง ง.) */
export function calcDeck(type, s) {
  const end = { kind: 'cta', title: 'อยากรู้ตัวเลขของคุณเอง?', body: 'ทักมาคุยได้ เดี๋ยวช่วยคิดให้ · ตัวเลขเป็นการประมาณ ไม่ใช่การรับประกัน' };
  if (type === 'retire') { const r = retirement({ age: s.age, retireAge: s.ra, lifeTo: s.to, monthlyNow: s.m, inflation: s.inf, returnPre: s.ret, returnPost: 3, have: s.have });
    return { tag: 'วางแผนเกษียณ', slides: [{ kind: 'cover', kicker: 'วางแผนเกษียณ', title: `อยากใช้เดือนละ ${fmt(s.m)} ตอนเกษียณ ต้องมีเท่าไร?`, body: `อายุ ${s.age} เกษียณ ${s.ra} · เงินเฟ้อ ${s.inf}%/ปี` },
      { kind: 'stat', kicker: 'เงิน ' + fmt(s.m) + ' วันนี้ ตอนเกษียณจะเท่ากับ', value: fmt(r.monthlyAtRetire), title: 'บาท/เดือน', body: 'เพราะของแพงขึ้นทุกปี' },
      { kind: 'stat', kicker: 'ต้องมีเงินก้อนตอนเกษียณ', value: fmt(r.need), title: 'บาท', body: `ใช้ถึงอายุ ${s.to}` }, { kind: 'stat', kicker: 'ถ้าเริ่มวันนี้ ต้องออม', value: fmt(r.save), title: 'บาท/เดือน', body: `สมมติผลตอบแทน ${s.ret}%/ปี` }, end] }; }
  if (type === 'edu') { const r = education({ childAge: s.ca, startAge: s.sa, years: s.yrs, costPerYear: s.cost, inflation: s.inf, returnPct: s.ret });
    return { tag: 'ทุนการศึกษาลูก', slides: [{ kind: 'cover', kicker: 'ทุนการศึกษาลูก', title: `ค่าเรียนลูกในอีก ${r.until} ปี ต้องเตรียมเท่าไร?`, body: `ค่าเรียนวันนี้ปีละ ${fmt(s.cost)} ขึ้นปีละ ${s.inf}%` }, { kind: 'stat', kicker: 'ค่าเรียนรวมในอนาคต', value: fmt(r.total), title: 'บาท', body: `${s.yrs} ปี` }, { kind: 'stat', kicker: 'ต้องเก็บ', value: fmt(r.save), title: 'บาท/เดือน', body: 'ยิ่งเริ่มเร็ว ยิ่งเก็บต่อเดือนน้อย' }, end] }; }
  if (type === 'emergency') { const r = emergency({ expense: s.exp, months: s.mo, have: s.have, perMonth: s.per });
    return { tag: 'เงินสำรองฉุกเฉิน', slides: [{ kind: 'cover', kicker: 'เงินสำรองฉุกเฉิน', title: `รายจ่ายเดือนละ ${fmt(s.exp)} ควรสำรองเท่าไร?`, body: 'ไว้ใช้ตอนตกงาน ป่วย หรือมีเรื่องด่วน' }, { kind: 'stat', kicker: `${s.mo} เท่าของรายจ่าย`, value: fmt(r.target), title: 'บาท', body: 'แยกบัญชี ถอนได้ทันที' }, { kind: 'list', title: 'เริ่มยังไง', items: ['ตั้งโอนอัตโนมัติวันเงินเดือนออก', 'เริ่มจาก 1 เดือนก่อน แล้วค่อยเพิ่ม', 'ห้ามแตะ ยกเว้นเรื่องฉุกเฉินจริง'] }, end] }; }
  return { tag: 'พลังดอกเบี้ยทบต้น', ...(() => { const r = compoundCompare({ monthly: s.m, rate: s.r, startA: s.a, startB: s.a + s.late, end: s.end }); return { slides: [{ kind: 'cover', kicker: 'พลังของการเริ่มเร็ว', title: `ออมเดือนละ ${fmt(s.m)} เริ่มอายุ ${s.a} กับ ${s.a + s.late} ต่างกันแค่ไหน?`, body: `สมมติผลตอบแทน ${s.r}%/ปี` }, { kind: 'stat', kicker: `เริ่มอายุ ${s.a}`, value: fmt(r.a), title: 'บาท', body: `ตอนอายุ ${s.end}` }, { kind: 'stat', kicker: `เริ่มอายุ ${s.a + s.late}`, value: fmt(r.b), title: 'บาท', body: `ตอนอายุ ${s.end}` }, { kind: 'stat', kicker: 'ต่างกัน', value: fmt(r.diff), title: 'บาท', body: 'ตัวเลขสมมติเพื่ออธิบาย ไม่ใช่การรับประกันผลตอบแทน' }, end] }; })() };
}

function linkManager() {
  const items = [['quiz', 'แบบทดสอบ: พร้อมรับมือแค่ไหน?'], ['calc', 'รวมเครื่องคิดทั้งหมด'], ['calc/retire', 'เครื่องคิดเกษียณ'], ['calc/edu', 'ทุนการศึกษาลูก'], ['calc/emergency', 'เงินสำรองฉุกเฉิน'], ['calc/grow', 'ออมเร็ว vs ช้า']];
  const share = async (url, t) => { try { if (navigator.share) { await navigator.share({ title: t, url }); return; } } catch (e) { if (e?.name === 'AbortError') return; } copyText(url); };
  return h('div.section', h('h2', 'ลิงก์สำหรับส่งให้คนทั่วไป'), h('div.card',
    h('p.small.muted', 'ใส่ในไบโอ ส่งทาง LINE หรือแนบในโพสต์ · คนเปิดลิงก์จะเห็นแค่หน้านี้ และปุ่มส่งผลมาหาคุณ (ไม่เห็นข้อมูลลูกค้าในแอปของคุณ)'),
    !profile().line ? h('div.callout.warn.small', { style: { margin: '8px 0' } }, 'ยังไม่ได้ใส่ LINE ID ในโปรไฟล์ ปุ่ม "ส่งผลทาง LINE" จะไม่แสดง ', h('a', { href: '#/tools/profile' }, 'ไปใส่')) : null,
    h('div.plist', items.map(([pth, t]) => { const url = shareLink(pth); return h('div.prow', { style: { cursor: 'default' } }, h('span.pi', icon('link')), h('span.pt', h('b', t), h('span', 'ลิงก์พร้อมชื่อและ LINE ของคุณ')), h('span.pr', h('button.btn.sm', { onclick: () => share(url, t) }, icon('share'), 'แชร์'), h('button.btn.sm.ghost', { onclick: () => copyText(url), 'aria-label': 'คัดลอกลิงก์ ' + t }, icon('copy')))); }))));
}
