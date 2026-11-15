// ─── งานขาย: ท่อการขาย · ชั่วโมงโทรนัด · เป้าหมาย & ตัวเลข · ทบทวนสัปดาห์ ───
import { h, icon, dateTH, todayISO, isoDate, initials, empty, field, inputEl, readForm, toast, fmt, seg, nextBirthday, sheet, closeSheet } from '../ui.js';
import * as store from '../store.js';
import { STAGES, STAGE, ACTIVITIES, ACT, grade, ratios, reverseGoal, countBy, weekRange, pointsOn, ageUp, callQueue } from '../engine/work.js';
import { haptic } from '../pwa.js';
import { snap, restore } from '../undo.js';
import { avatarEl } from '../avatars.js';
import { rerender } from '../app.js';
import { apptSheet, logActivity, setStage } from './common.js';
import { lineChart, legend } from '../charts.js';
import { profile } from '../app.js';

function tabsWork(active) {
  const t = [['pipe', 'ท่อการขาย', '#/work'], ['call', 'โทรรวด', '#/work/call'], ['cal', 'ปฏิทิน', '#/work/calendar'], ['goals', 'เป้าหมาย', '#/work/goals'], ['sales', 'ยอดขาย', '#/work/sales'], ['review', 'ทบทวนสัปดาห์', '#/work/review'], ['mandala', 'แมนฮาร่า', '#/work/mandala']];
  return h('div.seg', t.map(([id, l, href]) => h('button', { class: id === active ? 'on' : '', onclick: () => { location.hash = href; } }, l)));
}

export function renderPipeline() {
  const clients = store.all('clients');
  const cols = STAGES.map((s) => ({ s, items: clients.filter((c) => (c.stage || 'lead') === s.id).sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999')) }));
  const board = h('div.board', { style: { marginTop: '14px' } }, cols.map(({ s, items }) => h('div.col', { 'data-stage': s.id },
    h('div.col-h', h('span', s.name), h('span.muted', items.length)),
    items.map((c) => {
      const g = grade(c);
      const i = STAGES.findIndex((x) => x.id === (c.stage || 'lead'));
      const next = STAGES[i + 1] && STAGES[i + 1].id !== 'paused' ? STAGES[i + 1] : null;
      return h('div.pcard', { 'data-id': c.id, onclick: (e) => { if (e.target.closest('button') || board.dataset.justDragged) return; location.hash = '#/client/' + c.id; } },
        h('div.row.between', h('span.nm', c.nick), h('span.row', { style: { gap: '4px' } }, g ? h('span.grade.' + g, { 'aria-label': 'เกรด ' + g }, g) : null,
          h('button.icon-btn.mv', { 'aria-label': `ย้าย ${c.nick} ไปขั้นอื่น`, title: 'ย้ายไปขั้น…', onclick: () => moveSheet(c) }, icon('more')))),
        h('div.nx', c.nextDate ? `ติดตาม ${dateTH(c.nextDate)}${c.nextText ? ' · ' + c.nextText : ''}` : (c.occupation || s.hint)),
        next ? h('button.btn.sm.ghost', { style: { marginTop: '6px', paddingLeft: 0 }, onclick: () => setStage(c, next.id) }, '→ ' + next.name) : null);
    }),
    !items.length ? h('div.xs.muted.col-empty', s.hint) : null)));
  if (clients.length) enableDrag(board);
  return h('div', { 'data-title': 'ท่อการขาย' },
    h('div.topbar', h('div', h('h1', 'ท่อการขาย'), h('div.sub', 'ลากการ์ดข้ามขั้นได้ (มือถือ: กดค้างแล้วลาก) · รายชื่อ → ติดต่อ → นัด → พบ → เสนอ → ปิด → ส่งมอบ')), h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'รายชื่อ')),
    tabsWork('pipe'),
    clients.length ? board : empty('ยังไม่มีรายชื่อในท่อการขาย', 'work', h('a.btn.primary', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อ')));
}

/** ทางเลือกแทนการลาก: เลือกขั้นจากรายการ (WCAG 2.5.7) */
function moveSheet(c) {
  const cur = c.stage || 'lead';
  sheet({ title: `ย้าย ${c.nick} ไปขั้น…`, body: h('div.plist', { role: 'list' }, STAGES.map((st) => h('button.prow', { role: 'listitem', 'aria-current': st.id === cur ? 'true' : null, class: st.id === cur ? 'on' : '', onclick: () => { closeSheet(true); if (st.id !== cur) setStage(store.get('clients', c.id), st.id); } },
    h('span.pi', icon(st.id === cur ? 'check' : 'next')), h('span.pt', h('b', st.name), h('span', st.id === cur ? 'ขั้นปัจจุบัน' : st.hint))))) });
}

/** ลากการ์ดข้ามคอลัมน์: เมาส์ลากได้ทันที · นิ้วต้องกดค้าง 0.35 วินาทีก่อน (ไม่ให้ชนกับการเลื่อนจอ) */
let dragCleanup = null;
function enableDrag(board) {
  if (dragCleanup) dragCleanup();
  let st = null;
  const colAt = (x, y) => document.elementsFromPoint(x, y).find((el) => el.classList?.contains('col') && board.contains(el));
  const begin = (e) => {
    const r = st.card.getBoundingClientRect();
    st.dx = st.x0 - r.left; st.dy = st.y0 - r.top;
    st.ghost = st.card.cloneNode(true); st.ghost.classList.add('drag-ghost');
    Object.assign(st.ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
    document.body.append(st.ghost);
    st.card.classList.add('drag-src'); board.classList.add('dragging');
    st.on = true; haptic(25);
    move(e);
  };
  const move = (e) => {
    if (!st) return;
    const x = e.clientX, y = e.clientY;
    if (!st.on) {
      const far = Math.hypot(x - st.x0, y - st.y0) > 8;
      if (st.touch) { if (far) cancel(); return; } // นิ้วขยับก่อนครบเวลา = เลื่อนจอ
      if (far) begin(e); else return;
    }
    st.ghost.style.left = x - st.dx + 'px'; st.ghost.style.top = y - st.dy + 'px';
    const col = colAt(x, y);
    board.querySelectorAll('.col.drop').forEach((c) => c !== col && c.classList.remove('drop'));
    if (col && col !== st.from) col.classList.add('drop');
    const br = board.getBoundingClientRect(); // เลื่อนบอร์ดอัตโนมัติเมื่อลากใกล้ขอบ
    if (x > br.right - 40) board.scrollLeft += 14; else if (x < br.left + 40) board.scrollLeft -= 14;
  };
  const cancel = () => { if (!st) return; clearTimeout(st.timer); st.ghost?.remove(); st.card.classList.remove('drag-src'); board.classList.remove('dragging'); board.querySelectorAll('.col.drop').forEach((c) => c.classList.remove('drop')); st = null; };
  const end = (e) => {
    if (!st) return;
    if (st.on) {
      const col = colAt(e.clientX, e.clientY);
      const id = st.card.dataset.id;
      board.dataset.justDragged = '1'; setTimeout(() => delete board.dataset.justDragged, 50);
      cancel();
      if (col && col.dataset.stage) { const c = store.get('clients', id); if (c && (c.stage || 'lead') !== col.dataset.stage) setStage(c, col.dataset.stage); }
    } else cancel();
  };
  board.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.pcard');
    if (!card || e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    st = { card, from: card.closest('.col'), x0: e.clientX, y0: e.clientY, touch: e.pointerType !== 'mouse', on: false };
    if (st.touch) st.timer = setTimeout(() => { if (st && !st.on) begin({ clientX: st.x0, clientY: st.y0 }); }, 350);
  });
  const onCancel = (e) => { if (st && st.on) end(e); else cancel(); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', onCancel);
  dragCleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', onCancel); };
  // ระหว่างลากด้วยนิ้ว ห้ามจอเลื่อน
  board.addEventListener('touchmove', (e) => { if (st && st.on) e.preventDefault(); }, { passive: false });
  board.addEventListener('contextmenu', (e) => { if (st) e.preventDefault(); });
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

// ── โหมดโทรรวด (Power Hour): จับเวลา · ทีละคน · แตะผลปุ่มเดียว · สรุปท้ายรอบ ──
const PH_KEY = 'advdesk.v1.powerhour';
const loadPH = () => { try { return JSON.parse(sessionStorage.getItem(PH_KEY)) || null; } catch { return null; } };
let ph = loadPH() || { running: false, script: 'warm', minutes: 60 };
const savePH = () => { try { sessionStorage.setItem(PH_KEY, JSON.stringify(ph)); } catch {} };
const RESULT = { noans: ['ไม่รับสาย', 'var(--na)'], callback: ['ขอโทรกลับ', 'var(--warn)'], appt: ['ได้นัด', 'var(--good)'], no: ['ไม่สนใจ', 'var(--bad)'], skip: ['ข้าม', 'var(--line)'] };
let phTimer = null;

function lastNote(id) {
  const l = store.all('logs').filter((x) => x.clientId === id && !['stage'].includes(x.type)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  return l ? `${dateTH(l.date)} · ${l.text}` : null;
}
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d); }
function tick() {
  const el = document.getElementById('ph-time');
  if (!el || !ph.running) { clearInterval(phTimer); phTimer = null; return; }
  if (ph.pausedAt) return;
  const left = Math.round((ph.start + ph.minutes * 60000 - Date.now()) / 1000);
  const a = Math.abs(left);
  el.textContent = (left < 0 ? '+' : '') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
  el.parentElement.classList.toggle('over', left < 0);
  if (left === 0) { haptic(200); toast('ครบเวลาแล้ว — จะจบรอบหรือโทรต่อก็ได้'); }
  const bar = document.getElementById('ph-bar'); if (bar) bar.style.width = Math.min(100, (1 - left / (ph.minutes * 60)) * 100) + '%';
}

export function renderCall() {
  const root = h('div', { 'data-title': 'โหมดโทรรวด' },
    h('div.topbar', h('div', h('h1', 'โหมดโทรรวด'), h('div.sub', 'กันเวลาโทรรวดเดียว ทีละคน แตะผลปุ่มเดียว แล้วไปคนถัดไป (แนวปฏิบัติ MDRT)'))),
    tabsWork('call'));
  if (ph.running) root.append(phRunning());
  else if (ph.summary) root.append(phSummary());
  else root.append(phIntro());
  return root;
}

/** เริ่มโทรรวดกับรายชื่อที่กำหนด (จากรายชื่ออัจฉริยะ) */
export function startPowerHour(ids, name) {
  ph = { running: true, start: Date.now(), minutes: ph.minutes || 60, script: ph.script || 'warm', ids, idx: 0, results: [], called: {}, listName: name || '' };
  savePH(); location.hash = '#/work/call';
}

function phIntro() {
  const queue = callQueue(store.all('clients'));
  const hist = store.all('goals').filter((g) => g.type === 'powerhour').sort((a, b) => (b.start || 0) - (a.start || 0)).slice(0, 5);
  const start = () => {
    if (!queue.length) return;
    ph = { running: true, start: Date.now(), minutes: ph.minutes || 60, script: ph.script || 'warm', ids: queue.map((c) => c.id), idx: 0, results: [], called: {} };
    savePH(); haptic(20); rerender();
  };
  return h('div', { style: { marginTop: '14px' } },
    h('div.ph-hero',
      h('div.ph-ic', icon('phone')),
      h('h2', `พร้อมโทร ${queue.length} คน`),
      h('p', queue.length ? 'เรียงให้แล้ว: คนที่ถึงวันติดตาม → เกรด A → B → C → คนที่ไม่ได้คุยนานที่สุด' : 'ยังไม่มีรายชื่อที่รอโทร เพิ่มรายชื่อใหม่ก่อน'),
      h('div.ph-dur', [30, 45, 60].map((m) => h('button', { class: (ph.minutes || 60) === m ? 'on' : '', onclick: () => { ph.minutes = m; savePH(); rerender(); } }, m + ' นาที'))),
      queue.length ? h('button.btn.ph-go', { onclick: start }, icon('flame'), 'เริ่มเลย') : h('a.btn.ph-go', { href: '#/client/new' }, icon('plus'), 'เพิ่มรายชื่อ')),
    queue.length ? h('div.section', h('h2', 'คิวรอบนี้'), h('div.card', { style: { paddingTop: '4px', paddingBottom: '4px' } },
      queue.slice(0, 6).map((c, i) => h('div.task', h('span.ic', i + 1), h('span.tt', h('b', c.nick, grade(c) ? h('span.grade.' + grade(c), { style: { marginLeft: '8px' } }, grade(c)) : null), h('span', c.nextDate && c.nextDate <= todayISO() ? `ถึงวันติดตาม · ${c.nextText || ''}` : (STAGE[c.stage || 'lead']?.name + (c.occupation ? ' · ' + c.occupation : '')))))),
      queue.length > 6 ? h('p.small.muted', { style: { padding: '8px 2px' } }, `และอีก ${queue.length - 6} คน`) : null)) : null,
    hist.length ? h('div.section', h('h2', 'รอบที่ผ่านมา'), h('div.card', { style: { paddingTop: '4px', paddingBottom: '4px' } }, hist.map((x) =>
      h('div.task', h('span.ic', icon('clock')), h('span.tt', h('b', `${dateTH(x.date, true)} · ${x.mins} นาที`), h('span', `โทร ${x.calls} · ได้คุย ${x.talks} · ได้นัด ${x.appts}`)))))) : null);
}

function phRunning() {
  const ids = ph.ids.filter((id) => store.get('clients', id));
  if (ph.idx >= ids.length) { finishPH(); return phSummary(); }
  const c = store.get('clients', ids[ph.idx]);
  const me = (profile().name || '').split(' ')[0];
  const sc = c.referredBy ? 'referral' : (c.stage === 'proposed' ? 'followup' : ph.script);
  const note = lastNote(c.id);
  const au = ageUp(c.birthday, store.getSettings().ageRule);
  const nb = nextBirthday(c.birthday);
  const count = (k) => ph.results.filter((r) => r.r === k).length;
  const ensureCall = () => { if (!ph.called[c.id]) { ph.callSnaps = logActivity('call', c.id, '', { silent: true }); ph.called[c.id] = 1; } };
  const result = (r, extra) => {
    const before = snap([['clients', c.id]]);
    const wasCalled = !!ph.called[c.id];
    if (r !== 'skip') ensureCall();
    const made = r !== 'skip' && !wasCalled ? (ph.callSnaps || []).filter((x) => x.coll !== 'clients') : [];
    if (['callback', 'appt', 'no'].includes(r)) { const t = store.put('activities', { type: 'talk', clientId: c.id, date: todayISO(), count: 1 }); made.push({ coll: 'activities', id: t.id, before: null }); }
    const cur = store.get('clients', c.id);
    if (r === 'noans') store.put('clients', { ...cur, nextDate: addDays(2), nextText: 'โทรอีกครั้ง (ไม่รับสาย)' });
    if (r === 'callback') { store.put('clients', { ...cur, nextDate: addDays(extra), nextText: 'โทรกลับตามที่ขอ', stage: ['lead', '', undefined].includes(cur.stage) ? 'contacted' : cur.stage }); }
    if (r === 'no') { const sn = setStage(cur, 'paused', { undo: false }); if (sn) made.push(...sn.filter((x) => x.coll === 'logs')); }
    ph.last = { snaps: [...made, ...before], id: c.id, wasCalled };
    ph.results.push({ id: c.id, nick: c.nick, r });
    ph.idx++; ph.pending = null; savePH(); haptic(15);
    if (r === 'appt') { rerender(); apptSheet({ clientId: c.id }); return; }
    rerender();
  };
  const scriptBox = h('details.ph-script', { open: ph.showScript !== false, ontoggle: (e) => { ph.showScript = e.target.open; savePH(); } },
    h('summary', 'สคริปต์ · ' + SCRIPTS[sc].name),
    seg(Object.entries(SCRIPTS).map(([k, v]) => [k, v.name]), sc, (v) => { ph.script = v; savePH(); rerender(); }),
    h('p', fillScript(SCRIPTS[sc].text, c, me)));

  const node = h('div', { style: { marginTop: '14px' } },
    h('div.ph-bar-wrap',
      h('div.ph-clock', { role: 'timer', 'aria-label': 'เวลาที่เหลือ' }, icon('clock'), h('b#ph-time', '--:--')),
      h('div.ph-prog', h('span', `${ph.idx + 1} / ${ids.length}`), h('div.ph-track', h('i#ph-bar'))),
      h('button.btn.sm.ph-pause', { 'aria-label': ph.pausedAt ? 'เล่นต่อ' : 'หยุดเวลาชั่วคราว', 'aria-pressed': String(!!ph.pausedAt), onclick: () => { if (ph.pausedAt) { ph.start += Date.now() - ph.pausedAt; ph.pausedAt = null; } else ph.pausedAt = Date.now(); savePH(); rerender(); } }, icon(ph.pausedAt ? 'play' : 'pause')),
      h('button.btn.sm', { onclick: () => { finishPH(); rerender(); } }, 'จบรอบ')),
    ph.pausedAt ? h('div.callout.warn', { style: { marginTop: '8px' }, role: 'status' }, 'หยุดเวลาไว้ชั่วคราว — กด ▶ เพื่อเล่นต่อ') : null,
    h('div.ph-chips', ['noans', 'callback', 'appt', 'no'].map((k) => h('span', h('i', { style: { background: RESULT[k][1] } }), RESULT[k][0] + ' ' + count(k)))),
    h('div.card.ph-card',
      h('div.row', { style: { gap: '14px' } }, avatarEl(c, 56, 'lg'),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('h2.ph-name', c.nick, grade(c) ? h('span.grade.' + grade(c), { style: { marginLeft: '8px', verticalAlign: 'middle' } }, grade(c)) : null),
          h('div.small.muted', [STAGE[c.stage || 'lead']?.name, c.occupation, c.phone].filter(Boolean).join(' · ') || 'ไม่มีเบอร์'))),
      h('div.row.wrap', { style: { gap: '6px', marginTop: '10px' } },
        c.nextDate && c.nextDate <= todayISO() ? h('span.tag.warn', 'ถึงวันติดตาม' + (c.nextText ? ': ' + c.nextText : '')) : null,
        au && au.days <= 45 ? h('span.tag.red', `อายุประกันขึ้นอีก ${au.days} วัน`) : null,
        nb && nb.days <= 14 ? h('span.tag.good', nb.days ? `วันเกิดอีก ${nb.days} วัน` : 'วันนี้วันเกิด') : null),
      note ? h('div.ph-note', icon('note'), h('span', note)) : null,
      c.phone ? h('a.btn.primary.block.ph-call', { href: 'tel:' + c.phone.replace(/[^\d+]/g, ''), onclick: ensureCall }, icon('phone'), 'โทร ' + c.phone)
        : h('div.small.muted', { style: { marginTop: '12px' } }, 'ไม่มีเบอร์ในระบบ — ทักทาง LINE/แชต แล้วแตะผลด้านล่าง')),
    ph.pending === 'callback'
      ? h('div.card', h('b', 'โทรกลับเมื่อไหร่?'), h('div.ph-results', { style: { marginTop: '10px' } },
        [[1, 'พรุ่งนี้'], [3, 'อีก 3 วัน'], [7, 'สัปดาห์หน้า'], [30, 'เดือนหน้า']].map(([d, l]) => h('button', { onclick: () => result('callback', d) }, l))),
        h('button.btn.ghost.sm', { style: { marginTop: '8px' }, onclick: () => { ph.pending = null; savePH(); rerender(); } }, 'ยกเลิก'))
      : h('div.ph-results',
        h('button', { style: { '--rc': RESULT.noans[1] }, onclick: () => result('noans') }, h('b', 'ไม่รับสาย'), h('span', 'โทรอีกครั้งใน 2 วัน')),
        h('button', { style: { '--rc': RESULT.callback[1] }, onclick: () => { ph.pending = 'callback'; savePH(); rerender(); } }, h('b', 'ขอโทรกลับ'), h('span', 'เลือกวัน')),
        h('button', { style: { '--rc': RESULT.appt[1] }, onclick: () => result('appt') }, h('b', 'ได้นัด'), h('span', 'ลงนัดทันที')),
        h('button', { style: { '--rc': RESULT.no[1] }, onclick: () => result('no') }, h('b', 'ไม่สนใจ'), h('span', 'พักรายชื่อไว้'))),
    h('div.row', { style: { gap: '8px', marginTop: '6px' } },
      ph.last && ph.idx > 0 ? h('button.btn.ghost', { style: { flex: 1 }, onclick: () => { restore(ph.last.snaps); if (!ph.last.wasCalled) delete ph.called[ph.last.id]; ph.idx--; ph.results.pop(); ph.last = null; savePH(); toast('ย้อนกลับไปคนก่อนหน้าแล้ว'); rerender(); } }, icon('back'), 'ย้อนคนล่าสุด') : null,
      h('button.btn.ghost', { style: { flex: 1 }, onclick: () => result('skip') }, 'ข้ามคนนี้', icon('next'))),
    h('div.card', { style: { marginTop: '10px' } }, scriptBox));
  if (!phTimer) phTimer = setInterval(tick, 1000);
  setTimeout(() => { if (ph.pausedAt) { const el = document.getElementById('ph-time'); if (el) { const left = Math.round((ph.start + ph.minutes * 60000 - ph.pausedAt) / 1000); const a = Math.abs(left); el.textContent = String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0'); } } else tick(); }, 0);
  return node;
}

function finishPH() {
  if (!ph.running) return;
  const r = ph.results; const n = (k) => r.filter((x) => x.r === k).length;
  const mins = Math.max(1, Math.round(((ph.pausedAt || Date.now()) - ph.start) / 60000));
  const sum = { calls: r.filter((x) => x.r !== 'skip').length, talks: n('callback') + n('appt') + n('no'), appts: n('appt'), callbacks: n('callback'), noans: n('noans'), no: n('no'), mins };
  store.put('goals', { id: 'ph-' + ph.start, type: 'powerhour', date: todayISO(), start: ph.start, ...sum });
  if (sum.appts > 0) import('../fx.js').then((f) => f.celebrate({ count: 60 })).catch(() => {});
  ph = { running: false, script: ph.script, minutes: ph.minutes, summary: { ...sum, results: r } };
  savePH();
}

function phSummary() {
  const s = ph.summary;
  const pts = s.calls * 1 + s.talks * 1 + s.appts * 2;
  return h('div', { style: { marginTop: '14px' } },
    h('div.ph-hero', h('div.ph-ic', icon('check')), h('h2', 'จบรอบแล้ว เก่งมาก!'), h('p', `ใช้เวลา ${s.mins} นาที · ได้ประมาณ ${pts} คะแนนกิจกรรม`),
      h('div.ph-sum', [['โทร', s.calls], ['ได้คุย', s.talks], ['ได้นัด', s.appts], ['โทรกลับ', s.callbacks]].map(([l, v]) => h('div', h('b', v), h('span', l))))),
    s.results.length ? h('div.section', h('h2', 'ผลรายคน'), h('div.card', { style: { paddingTop: '4px', paddingBottom: '4px' } }, s.results.map((x) =>
      h('a.task', { href: '#/client/' + x.id }, h('span.ic', h('i.status-dot', { style: { background: RESULT[x.r][1], margin: 0 } })), h('span.tt', h('b', x.nick), h('span', RESULT[x.r][0])), icon('next'))))) : null,
    h('div.row', { style: { gap: '8px', marginTop: '16px' } },
      h('button.btn.primary', { style: { flex: 1 }, onclick: () => { ph.summary = null; savePH(); rerender(); } }, icon('phone'), 'เริ่มรอบใหม่'),
      h('a.btn', { style: { flex: 1 }, href: '#/' }, 'กลับหน้าวันนี้')));
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
