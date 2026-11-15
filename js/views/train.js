// ─── ฝึกตัวเอง: การ์ดฝึกจำแผน (คำถามสร้างจากข้อมูลแผนจริงในแอป) · ซ้อมรับมือข้อโต้แย้ง ───
import { h, icon, todayISO, dateTH } from '../ui.js';
import { PLANS, CAT, quickFacts } from '../../data/plans.js';
import { OBJECTIONS } from '../../data/objections.js';
import { haptic } from '../pwa.js';

// สถิติการฝึกเก็บในเครื่องนี้ (เป็นเรื่องส่วนตัว ไม่ต้องซิงก์)
const KEY = 'advdesk.v1.train';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

const TAX_SHORT = { life: 'ลดหย่อนหมวดประกันชีวิต', health: 'ลดหย่อนหมวดประกันสุขภาพ', annuity: 'ลดหย่อนหมวดบำนาญ', none: 'ลดหย่อนภาษีไม่ได้', check: 'ลดหย่อนได้เฉพาะส่วนที่เข้าเงื่อนไข' };
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const uniq = (a) => [...new Set(a)];

/** สุ่มแผน โดยแผนที่เคยตอบผิดบ่อยมีโอกาสออกมากกว่า */
function pickPlan(stats, used) {
  const pool = PLANS.filter((p) => !used.has(p.id));
  const w = pool.map((p) => 1 + 2 * ((stats.miss || {})[p.id] || 0));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[0];
}
function options(correct, wrongPool) {
  const wrong = shuffle(uniq(wrongPool.filter((x) => x && x !== correct))).slice(0, 3);
  return wrong.length < 2 ? null : shuffle([correct, ...wrong]);
}

/** สร้างคำถาม 1 ข้อจากแผน p — คืน null ถ้าข้อมูลไม่พอ */
function makeQuestion(p) {
  const others = PLANS.filter((x) => x.id !== p.id);
  const qf = quickFacts(p);
  const kinds = shuffle(['tagline', 'cat', 'age', 'highlight', 'tax', 'term']);
  for (const k of kinds) {
    let q = null;
    if (k === 'tagline' && p.tagline) {
      const same = others.filter((x) => x.cat === p.cat).map((x) => x.short);
      const opts = options(p.short, same.length >= 3 ? same : [...same, ...others.map((x) => x.short)]);
      if (opts) q = { ask: 'แผนไหนตรงกับคำอธิบายนี้?', quote: p.tagline, answer: p.short, opts };
    } else if (k === 'cat') {
      const opts = options(CAT[p.cat].name, Object.values(CAT).map((c) => c.name));
      if (opts) q = { ask: `${p.short} อยู่หมวดไหน?`, answer: CAT[p.cat].name, opts, hideCat: true };
    } else if (k === 'age' && qf.age && qf.age.length < 30) {
      const opts = options(qf.age, others.map((x) => quickFacts(x).age).filter((a) => a && a.length < 30));
      if (opts) q = { ask: `${p.short} รับอายุเท่าไร?`, answer: qf.age, opts };
    } else if (k === 'highlight' && p.highlights?.length) {
      const good = p.highlights.find((x) => x.length <= 90) || p.highlights[0];
      const pool = others.filter((x) => x.cat !== p.cat).flatMap((x) => (x.highlights || []).filter((t) => t.length <= 90));
      const opts = options(good, pool);
      if (opts) q = { ask: `ข้อไหนเป็นจุดเด่นของ ${p.short}?`, answer: good, opts, long: true };
    } else if (k === 'tax' && TAX_SHORT[p.tax]) {
      const opts = options(TAX_SHORT[p.tax], Object.values(TAX_SHORT));
      if (opts) q = { ask: `เบี้ย ${p.short} ลดหย่อนภาษีแบบไหน?`, answer: TAX_SHORT[p.tax], opts };
    } else if (k === 'term' && qf.pay && qf.cover) {
      const s = `${qf.pay} · ${qf.cover}`;
      const opts = options(s, others.map((x) => { const f = quickFacts(x); return f.pay && f.cover ? `${f.pay} · ${f.cover}` : null; }));
      if (opts) q = { ask: `${p.short} จ่ายเบี้ยและคุ้มครองแบบไหน?`, answer: s, opts };
    }
    if (q) return { ...q, plan: p };
  }
  return null;
}

const ROUND = 5;
let quiz = null; // { qs, i, picked, correct }
function newRound() {
  const stats = load(); const used = new Set(); const qs = [];
  let guard = 0;
  while (qs.length < ROUND && guard++ < 60) { const p = pickPlan(stats, used); used.add(p.id); const q = makeQuestion(p); if (q) qs.push(q); }
  quiz = { qs, i: 0, picked: null, correct: 0 };
}

function streakText(s) {
  return s.streak ? `ฝึกต่อเนื่อง ${s.streak} วัน` : 'เริ่มฝึกวันแรก';
}
function bumpDay(s) {
  const t = todayISO();
  if (s.lastDay === t) return s;
  const y = new Date(); y.setDate(y.getDate() - 1); const yy = new Date(y.getTime() - y.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  s.streak = s.lastDay === yy ? (s.streak || 0) + 1 : 1; s.lastDay = t; return s;
}

function quizView(root) {
  const body = h('div');
  const draw = () => {
    if (!quiz) newRound();
    const s = load();
    if (quiz.i >= quiz.qs.length) {
      const pct = Math.round((quiz.correct / quiz.qs.length) * 100);
      body.replaceChildren(h('div.train-done',
        h('div.td-score', h('b', `${quiz.correct}/${quiz.qs.length}`), h('span', pct >= 80 ? 'จำแม่นมาก!' : pct >= 60 ? 'ดีแล้ว ฝึกต่ออีกนิด' : 'ลองอีกรอบนะ')),
        h('p.small.muted', `${streakText(s)} · ตอบถูกสะสม ${s.right || 0} ข้อ จาก ${s.total || 0} ข้อ`),
        h('p.small.muted', 'แผนที่ตอบผิดจะออกบ่อยขึ้นในรอบถัดไป'),
        h('button.btn.primary.block', { style: { marginTop: '14px' }, onclick: () => { newRound(); draw(); } }, icon('sync'), 'เล่นอีกรอบ')));
      return;
    }
    const q = quiz.qs[quiz.i];
    const done = quiz.picked != null;
    const pick = (o) => {
      if (done) return;
      quiz.picked = o;
      const ok = o === q.answer;
      const st = bumpDay(load());
      st.total = (st.total || 0) + 1; st.right = (st.right || 0) + (ok ? 1 : 0);
      st.miss = st.miss || {}; st.miss[q.plan.id] = Math.max(0, (st.miss[q.plan.id] || 0) + (ok ? -1 : 1));
      save(st);
      if (ok) quiz.correct++;
      haptic(ok ? 15 : 60); draw();
    };
    body.replaceChildren(
      h('div.train-prog', [...Array(quiz.qs.length)].map((_, i) => h('i', { class: i < quiz.i ? 'done' : i === quiz.i ? 'on' : '' }))),
      h('div.card.train-q', { class: 'cat-' + q.plan.cat },
        q.hideCat ? h('span.tag', 'แผนประกัน') : h('span.tag', CAT[q.plan.cat].short),
        h('h2', q.ask),
        q.quote ? h('blockquote', q.quote) : null),
      h('div.train-opts' + (q.long ? '.long' : ''), q.opts.map((o) => h('button', {
        class: done ? (o === q.answer ? 'right' : o === quiz.picked ? 'wrong' : 'dim') : '', onclick: () => pick(o),
      }, done && o === q.answer ? icon('check') : null, h('span', o)))),
      done ? h('div.train-foot',
        h('div.callout', { class: quiz.picked === q.answer ? 'good' : 'red' }, quiz.picked === q.answer ? h('b', 'ถูกต้อง ') : h('b', 'ยังไม่ใช่ '), `คำตอบ: ${q.answer}`),
        h('div.row', { style: { gap: '8px', marginTop: '10px' } },
          h('a.btn', { href: '#/plan/' + q.plan.id, style: { flex: 1 } }, icon('plans'), 'ดูแผนนี้'),
          h('button.btn.primary', { style: { flex: 1 }, onclick: () => { quiz.i++; quiz.picked = null; draw(); } }, quiz.i + 1 < quiz.qs.length ? 'ข้อต่อไป' : 'ดูคะแนน', icon('next')))) : null);
  };
  draw();
  return body;
}

// ── ซ้อมข้อโต้แย้ง ─────────────────────────────────────────
let obj = null; // { id, open }
function nextObjection() {
  const s = load(); const sc = s.obj || {};
  // ข้อที่ยังไม่เคยฝึก หรือให้คะแนนตัวเองต่ำ จะออกก่อน
  const w = OBJECTIONS.map((o) => (sc[o.id] == null ? 4 : sc[o.id] < 0 ? 3 : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = OBJECTIONS[0];
  for (let i = 0; i < OBJECTIONS.length; i++) { r -= w[i]; if (r <= 0) { pick = OBJECTIONS[i]; break; } }
  if (obj && pick.id === obj.id && OBJECTIONS.length > 1) return nextObjection();
  obj = { id: pick.id, open: false };
}
function objView() {
  const body = h('div');
  const draw = () => {
    if (!obj) nextObjection();
    const o = OBJECTIONS.find((x) => x.id === obj.id);
    const sc = load().obj || {};
    const good = OBJECTIONS.filter((x) => sc[x.id] > 0).length;
    const rate = (v) => { const s = bumpDay(load()); s.obj = { ...(s.obj || {}), [o.id]: v }; save(s); haptic(15); nextObjection(); draw(); };
    body.replaceChildren(
      h('p.small.muted', `ตอบได้มั่นใจแล้ว ${good} จาก ${OBJECTIONS.length} สถานการณ์`),
      h('div.train-obj',
        h('span.tag', o.tag), h('div.to-say', '“' + o.say + '”'), h('p.small', 'ลูกค้าพูดแบบนี้ คุณจะตอบว่าอะไร? ลองพูดออกเสียงก่อน แล้วค่อยดูคำตอบ')),
      !obj.open ? h('button.btn.primary.block', { style: { marginTop: '12px', minHeight: '52px' }, onclick: () => { obj.open = true; draw(); } }, 'ดูคำตอบตัวอย่าง')
        : h('div',
          h('div.card', { style: { marginTop: '12px' } }, h('ol.to-steps', o.steps.map((s) => h('li', s))), h('div.callout.small', { style: { marginTop: '8px' } }, h('b', 'เคล็ดลับ: '), o.tip)),
          h('p.small.muted', { style: { margin: '12px 0 8px' } }, 'คำตอบของคุณเป็นอย่างไร?'),
          h('div.row', { style: { gap: '8px' } },
            h('button.btn', { style: { flex: 1 }, onclick: () => rate(-1) }, 'ยังต้องฝึก'),
            h('button.btn', { style: { flex: 1 }, onclick: () => rate(0) }, 'พอได้'),
            h('button.btn.primary', { style: { flex: 1 }, onclick: () => rate(1) }, icon('check'), 'ตอบได้ดี'))));
  };
  draw();
  return body;
}

export function renderTrain(q = {}) {
  const tab = q.t === 'obj' ? 'obj' : 'plan';
  const s = load();
  return h('div', { 'data-title': 'ฝึกตัวเอง' },
    h('div.topbar', h('div', h('h1', 'ฝึกตัวเอง'), h('div.sub', `วันละ 5 ข้อ ตอบลูกค้าได้ทันทีโดยไม่ต้องเปิดดู · ${streakText(s)}${s.lastDay ? ' · ล่าสุด ' + dateTH(s.lastDay) : ''}`))),
    h('div.seg', { style: { marginBottom: '14px' } },
      h('button', { class: tab === 'plan' ? 'on' : '', onclick: () => { location.hash = '#/tools/train'; } }, 'ฝึกจำแผน'),
      h('button', { class: tab === 'obj' ? 'on' : '', onclick: () => { location.hash = '#/tools/train?t=obj'; } }, 'ซ้อมข้อโต้แย้ง')),
    tab === 'plan' ? quizView() : objView());
}
