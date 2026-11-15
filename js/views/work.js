// ─── งานขาย: ท่อการขาย · ชั่วโมงโทรนัด · เป้าหมาย & ตัวเลข · ทบทวนสัปดาห์ ───
import { h, icon, dateTH, todayISO, initials, empty, field, inputEl, readForm, toast, fmt, seg } from '../ui.js';
import * as store from '../store.js';
import { STAGES, STAGE, ACTIVITIES, ACT, grade, ratios, reverseGoal, countBy, weekRange, pointsOn } from '../engine/work.js';
import { apptSheet, logActivity, setStage } from './common.js';
import { lineChart, legend } from '../charts.js';
import { profile } from '../app.js';

function tabsWork(active) {
  const t = [['pipe', 'ท่อการขาย', '#/work'], ['call', 'โทรนัด', '#/work/call'], ['goals', 'เป้าหมาย', '#/work/goals'], ['sales', 'ยอดขาย', '#/work/sales'], ['review', 'ทบทวนสัปดาห์', '#/work/review'], ['mandala', 'แมนฮาร่า', '#/work/mandala']];
  return h('div.seg', t.map(([id, l, href]) => h('button', { class: id === active ? 'on' : '', onclick: () => { location.hash = href; } }, l)));
}

export function renderPipeline() {
  const clients = store.all('clients');
  const cols = STAGES.map((s) => ({ s, items: clients.filter((c) => (c.stage || 'lead') === s.id).sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999')) }));
  return h('div', { 'data-title': 'ท่อการขาย' },
    h('div.topbar', h('div', h('h1', 'ท่อการขาย'), h('div.sub', 'รายชื่อ → ติดต่อ → นัด → พบ → เสนอ → ปิด → ส่งมอบ')), h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'รายชื่อ')),
    tabsWork('pipe'),
    clients.length ? h('div.board', { style: { marginTop: '14px' } }, cols.map(({ s, items }) => h('div.col',
      h('div.col-h', h('span', s.name), h('span.muted', items.length)),
      items.map((c) => {
        const g = grade(c);
        const i = STAGES.findIndex((x) => x.id === (c.stage || 'lead'));
        const next = STAGES[i + 1] && STAGES[i + 1].id !== 'paused' ? STAGES[i + 1] : null;
        return h('div.pcard', { onclick: (e) => { if (e.target.closest('button')) return; location.hash = '#/client/' + c.id; } },
          h('div.row.between', h('span.nm', c.nick), g ? h('span.grade.' + g, g) : null),
          h('div.nx', c.nextDate ? `ติดตาม ${dateTH(c.nextDate)}${c.nextText ? ' · ' + c.nextText : ''}` : (c.occupation || s.hint)),
          next ? h('button.btn.sm.ghost', { style: { marginTop: '6px', paddingLeft: 0 }, onclick: () => setStage(c, next.id) }, '→ ' + next.name) : null);
      }),
      !items.length ? h('div.xs.muted', { style: { padding: '4px' } }, s.hint) : null))) : empty('ยังไม่มีรายชื่อในท่อการขาย', 'work', h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อ')));
}

const SCRIPTS = {
  warm: { name: 'คนรู้จัก', text: `สวัสดีครับ {nick} ผม{me}นะ ช่วงนี้เป็นยังไงบ้าง?
…(คุยเรื่องทั่วไปสั้น ๆ)…
ตอนนี้ผมทำงานเป็นที่ปรึกษาการเงินกับ AIA ครับ กำลังฝึกทำ "ตรวจสุขภาพการเงิน" ให้คนรู้จัก ใช้เวลาแค่ 20–30 นาที ไม่ต้องซื้ออะไร
อยากให้ {nick} ช่วยเป็นคนแรก ๆ ที่ลองดูให้หน่อย สะดวก {day1} หรือ {day2} ดีครับ?` },
  referral: { name: 'มีคนแนะนำ', text: `สวัสดีครับคุณ{nick} ผม{me} ที่ปรึกษาการเงินจาก AIA ครับ
คุณ{ref}แนะนำมาครับ บอกว่าคุณ{nick}เป็นคนที่ใส่ใจวางแผนชีวิต
ผมช่วยคุณ{ref}ดูเรื่องความคุ้มครองไปเมื่อเร็ว ๆ นี้ เขาเลยอยากให้คุณ{nick}ได้ข้อมูลแบบเดียวกัน
ขอเวลา 20 นาที นัด {day1} หรือ {day2} สะดวกช่วงไหนครับ?` },
  birthday: { name: 'วันเกิด', text: `สุขสันต์วันเกิดครับ {nick} ขอให้สุขภาพแข็งแรง ปีนี้มีแต่เรื่องดี ๆ นะครับ
อีกเรื่องเล็ก ๆ ที่อยากเตือน: เบี้ยประกันคิดตามอายุ ถ้าวางแผนก่อนอายุขึ้นจะได้เบี้ยที่ถูกกว่า
ถ้าสนใจให้ผมช่วยเช็กความคุ้มครองที่มีอยู่ บอกได้เลยนะครับ` },
  followup: { name: 'ตามผลหลังเสนอ', text: `สวัสดีครับ {nick} ผม{me}นะครับ
โทรมาถามว่าแผนที่คุยกันไว้ มีตรงไหนที่ยังสงสัยหรืออยากปรับไหมครับ?
(ถ้า "ขอคิดดู" → ถามว่าติดเรื่องไหน: เบี้ย / ความคุ้มครอง / ปรึกษาครอบครัว)` },
};
function fillScript(t, c, me) {
  const d = new Date(); const d1 = new Date(d); d1.setDate(d.getDate() + 2); const d2 = new Date(d); d2.setDate(d.getDate() + 4);
  const ref = c.referredBy ? store.get('clients', c.referredBy)?.nick : '…';
  return t.replace(/{nick}/g, c.nick || '…').replace(/{me}/g, me).replace(/{ref}/g, ref || '…').replace('{day1}', dateTH(d1.toISOString().slice(0, 10), true)).replace('{day2}', dateTH(d2.toISOString().slice(0, 10), true));
}

let callSession = { idx: 0, made: 0, talks: 0, appts: 0, script: 'warm' };
export function renderCall() {
  const queue = store.all('clients').filter((c) => ['lead', 'contacted', undefined, ''].includes(c.stage))
    .sort((a, b) => ((grade(a) || 'Z').localeCompare(grade(b) || 'Z')) || (a.lastContact || '').localeCompare(b.lastContact || ''));
  const root = h('div', { 'data-title': 'ชั่วโมงโทรนัด' });
  const card = h('div');
  const me = (profile().name || '').split(' ')[0];
  const draw = () => {
    const c = queue[callSession.idx % Math.max(1, queue.length)];
    if (!queue.length) { card.replaceChildren(empty('ไม่มีรายชื่อที่รอโทร — เพิ่มรายชื่อใหม่ก่อน', 'phone', h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อ'))); return; }
    const sc = c.referredBy ? 'referral' : callSession.script;
    const next = () => { callSession.idx++; draw(); };
    card.replaceChildren(
      h('div.card',
        h('div.row.between', h('span.xs.muted', `รายชื่อที่ ${callSession.idx % queue.length + 1}/${queue.length}`), grade(c) ? h('span.grade.' + grade(c), grade(c)) : null),
        h('div.row', { style: { gap: '12px', marginTop: '8px' } }, h('div.avatar.lg', initials(c.nick)), h('div', h('h2.serif', { style: { fontSize: '24px' } }, c.nick), h('div.small.muted', [c.occupation, c.phone].filter(Boolean).join(' · ') || 'ไม่มีเบอร์'))),
        c.notes ? h('p.small', { style: { marginTop: '8px' } }, c.notes) : null,
        h('div.row.wrap', { style: { gap: '8px', marginTop: '12px' } },
          c.phone ? h('a.btn.primary', { href: 'tel:' + c.phone.replace(/[^\d+]/g, ''), onclick: () => { logActivity('call', c.id); callSession.made++; } }, icon('phone'), 'โทร') : null,
          h('button.btn', { onclick: () => { if (!c.phone) { logActivity('call', c.id); callSession.made++; } next(); } }, 'ไม่รับ / ทักไว้'),
          h('button.btn', { onclick: () => { logActivity('talk', c.id); callSession.talks++; setStage(c, 'contacted'); next(); } }, 'ได้คุย'),
          h('button.btn', { onclick: () => { callSession.appts++; apptSheet({ clientId: c.id }); } }, icon('cal'), 'ได้นัด'),
          h('button.btn.ghost', { onclick: () => { setStage(c, 'paused'); next(); } }, 'ไม่สนใจ'),
          h('button.btn.ghost', { onclick: next }, 'ข้าม', icon('next')))),
      h('div.card',
        h('div.card-h', h('h3', 'สคริปต์'), seg(Object.entries(SCRIPTS).map(([k, v]) => [k, v.name]), sc, (v) => { callSession.script = v; draw(); })),
        h('p', { style: { whiteSpace: 'pre-wrap', fontSize: '15px' } }, fillScript(SCRIPTS[sc].text, c, me))));
  };
  draw();
  root.append(
    h('div.topbar', h('div', h('h1', 'ชั่วโมงโทรนัด'), h('div.sub', 'กันเวลาวันละ 1 ชั่วโมง โทรทีละคน บันทึกผลทันที (แนวปฏิบัติ MDRT)'))),
    tabsWork('call'),
    h('div.stats', { style: { marginTop: '14px' } },
      h('div.stat', h('span', 'โทรรอบนี้'), h('b', callSession.made)), h('div.stat', h('span', 'ได้คุย'), h('b', callSession.talks)),
      h('div.stat', h('span', 'ได้นัด'), h('b', callSession.appts)), h('div.stat', h('span', 'คิวรอโทร'), h('b', queue.length))),
    h('div', { style: { marginTop: '12px' } }, card));
  return root;
}

export function renderGoals() {
  const s = store.getSettings();
  const g = { incomeYear: 600000, avgPremium: 25000, commissionRate: 0.3, dailyPoints: 20, ...(s.goal || {}), dailyPoints: s.dailyPoints || 20 };
  const acts = store.all('activities');
  const r = ratios(acts);
  const out = h('div');
  const draw = (v) => {
    const res = reverseGoal({ incomeYear: +v.incomeYear || 0, avgPremium: +v.avgPremium || 0, commissionRate: (+v.commissionPct || 0) / 100 }, r);
    out.replaceChildren(
      h('div.card',
        h('div.card-h', h('h3', 'ต้องทำเท่าไหร่ถึงถึงเป้า'), h('span.xs.muted', r.source)),
        h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', ''), h('th.r', 'ต่อปี'), h('th.r', 'ต่อเดือน'), h('th.r', 'ต่อสัปดาห์'), h('th.r', 'ต่อวัน'))),
          h('tbody', [['ปิดการขาย (เคส)', res.cases], ['นัดพบ', res.appts], ['ติดต่อ/โทร', res.contacts]].map(([l, x]) => h('tr', h('td', l), h('td.r.num', fmt(x.year)), h('td.r.num', fmt(x.month)), h('td.r.num', fmt(x.week, 1)), h('td.r.num', fmt(x.day, 1))))))),
        h('p.small', { style: { marginTop: '10px' } }, `ค่าคอมต่อเคส ≈ ${fmt(res.commPerCase)} บาท · เบี้ยรวมที่ต้องขาย ≈ ${fmt(res.premiumYear)} บาท/ปี`),
        h('p.xs.muted', `อัตราส่วนที่ใช้: ติดต่อ→นัด ${Math.round(r.contactToAppt * 100)}% · นัด→ปิด ${Math.round(r.apptToClose * 100)}%`)));
  };
  const f = h('form.form-grid', {
    oninput: () => draw(readForm(f)),
    onsubmit: (e) => { e.preventDefault(); const v = readForm(f); store.saveSettings({ goal: { incomeYear: v.incomeYear, avgPremium: v.avgPremium, commissionRate: (v.commissionPct || 0) / 100 }, dailyPoints: v.dailyPoints || 20 }); toast('บันทึกเป้าหมายแล้ว'); },
  },
    field('รายได้ (ค่าคอม) ที่ต้องการต่อปี', inputEl('incomeYear', g.incomeYear, { type: 'number', inputmode: 'numeric', step: 10000 })),
    field('เบี้ยเฉลี่ยต่อเคส (บาท/ปี)', inputEl('avgPremium', g.avgPremium, { type: 'number', inputmode: 'numeric', step: 1000 })),
    field('อัตราค่าคอมปีแรกเฉลี่ย (%)', inputEl('commissionPct', Math.round((g.commissionRate || 0) * 100), { type: 'number', inputmode: 'numeric', step: 1 }), 'ดูอัตราจริงจากระบบตัวแทน'),
    field('เป้าคะแนนกิจกรรมต่อวัน', inputEl('dailyPoints', g.dailyPoints, { type: 'number', inputmode: 'numeric', min: 1 })),
    h('div.full', h('button.btn.primary', { type: 'submit' }, icon('check'), 'บันทึกเป้าหมาย')));
  draw({ ...g, commissionPct: Math.round((g.commissionRate || 0) * 100) });

  // กราฟคะแนน 14 วันล่าสุด
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); });
  const series = [{ name: 'คะแนนต่อวัน', data: days.map((d) => pointsOn(acts, d)) }];
  return h('div', { 'data-title': 'เป้าหมาย & ตัวเลข' },
    h('div.topbar', h('div', h('h1', 'เป้าหมาย & ตัวเลข'), h('div.sub', 'คำนวณย้อนจากรายได้ที่อยากได้ → จำนวนเคส → นัด → การติดต่อ (อัตราส่วน 10 : 3 : 1 ของ Al Granum)'))),
    tabsWork('goals'),
    h('div.grid.g2', { style: { marginTop: '14px', alignItems: 'start' } }, h('div.card', f), out),
    h('div.card', { style: { marginTop: '12px' } }, h('div.card-h', h('h3', 'คะแนนกิจกรรม 14 วันล่าสุด')), lineChart({ x: days.map((d) => +d.slice(8)), series }, { type: 'bar' }), legend(series)),
    h('div.card', { style: { marginTop: '12px' } }, h('div.card-h', h('h3', 'ตารางคะแนนกิจกรรม')), h('div.row.wrap', { style: { gap: '6px' } }, ACTIVITIES.map((a) => h('span.tag', `${a.name} ${a.pts}`))), h('p.xs.muted', { style: { marginTop: '8px' } }, 'คนที่สำเร็จวัดผลจาก "กิจกรรม" ที่ควบคุมได้ทุกวัน ไม่ใช่ยอดขายที่ควบคุมไม่ได้')));
}

export function renderReview() {
  const acts = store.all('activities');
  const now = new Date();
  const wk = weekRange(now);
  const prev = weekRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
  const a = countBy(acts, wk.from, wk.to), b = countBy(acts, prev.from, prev.to);
  const s = store.getSettings();
  const key = 'review-' + wk.from;
  const saved = store.get('goals', key) || { id: key };
  const f = h('form.stack', { onsubmit: (e) => { e.preventDefault(); store.put('goals', { ...saved, ...readForm(f) }); toast('บันทึกการทบทวนแล้ว'); } },
    field('สัปดาห์นี้อะไรได้ผลดี?', h('textarea.input', { name: 'good' }, saved.good || '')),
    field('อะไรต้องปรับ?', h('textarea.input', { name: 'fix' }, saved.fix || '')),
    field('3 เรื่องสำคัญของสัปดาห์หน้า', h('textarea.input', { name: 'next' }, saved.next || '')),
    h('button.btn.primary', { type: 'submit' }, icon('check'), 'บันทึก'));
  const target = (+s.dailyPoints || 20) * 5;
  const pts = (c) => ACTIVITIES.reduce((sum, x) => sum + (c[x.id] || 0) * x.pts, 0);
  return h('div', { 'data-title': 'ทบทวนสัปดาห์' },
    h('div.topbar', h('div', h('h1', 'ทบทวนสัปดาห์'), h('div.sub', `${dateTH(wk.from)} – ${dateTH(wk.to)} · กันเวลาวางแผน 1 ครั้งต่อสัปดาห์`))),
    tabsWork('review'),
    h('div.stats', { style: { marginTop: '14px' } },
      h('div.stat', h('span', 'คะแนนรวม'), h('b', pts(a), h('small', ` / ${target}`)), h('small', `สัปดาห์ก่อน ${pts(b)}`)),
      h('div.stat', h('span', 'นัด / พบ'), h('b', `${a.appt} / ${a.meet}`), h('small', `สัปดาห์ก่อน ${b.appt} / ${b.meet}`)),
      h('div.stat', h('span', 'เสนอแผน'), h('b', a.present), h('small', `สัปดาห์ก่อน ${b.present}`)),
      h('div.stat', h('span', 'ปิดการขาย'), h('b', a.close), h('small', `สัปดาห์ก่อน ${b.close}`))),
    h('div.grid.g2', { style: { marginTop: '12px', alignItems: 'start' } },
      h('div.card', h('div.card-h', h('h3', 'กิจกรรมเทียบสัปดาห์ก่อน')),
        h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'กิจกรรม'), h('th.r', 'สัปดาห์นี้'), h('th.r', 'ก่อนหน้า'))),
          h('tbody', ACTIVITIES.map((x) => h('tr', h('td', x.name), h('td.r.num', a[x.id] || 0), h('td.r.num', b[x.id] || 0))))))),
      h('div.card', h('div.card-h', h('h3', 'บันทึกการทบทวน')), f)));
}
