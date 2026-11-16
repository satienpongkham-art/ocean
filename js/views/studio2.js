// ─── สตูดิโอ (ต่อ): คลัง 365 เรื่อง · ผลโพสต์ · หลักที่ใช้ · ลายเซ็นท้ายภาพ ───
import { h, icon, sheet, closeSheet, toast, fmt, todayISO, dateTH, empty, choices } from '../ui.js';
import * as store from '../store.js';
import { CATS, HOOKS, PLAYBOOK } from '../../data/studio.js';
import { THEMES, renderSlide, SIG_PRESETS, getSig, setSig, drawSignature, ensureFont } from '../carousel.js';
import { loadAll, buildDeck, catOfDay } from '../library.js';
import { createItem, brandSet, catOf, catColor, COLS } from './studio.js';
import { rerender } from '../app.js';

const back = (title, sub, href = '#/studio') => h('div', h('div.back-row', h('a.icon-btn', { href, 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, title)), sub ? h('p.muted', { style: { margin: '0 0 12px' } }, sub) : null);
const FMT_IC = { bar: 'line', line: 'line', donut: 'target', table: 'grid', timeline: 'clock', myth: 'info', versus: 'layers', check: 'check', qa: 'chat', quote: 'pen', list: 'note', stat: 'star', point: 'note' };
const FMT_NAME = { b: 'กราฟ', g: 'กราฟ', d: 'โดนัท', t: 'ตาราง', tl: 'ไทม์ไลน์', m: 'ความเชื่อ/จริง', v: 'เทียบ', c: 'เช็กลิสต์', q: 'ถาม-ตอบ', s: 'เรื่องเล่า', n: 'ตัวเลขเด่น' };
const visOf = (it) => [...new Set((it.s || []).map((x) => FMT_NAME[x[0]]).filter(Boolean))];

// ── คะแนนผลโพสต์ ──
export const scoreOf = (st) => (st ? (+st.likes || 0) + (+st.comments || 0) * 2 + (+st.saves || 0) * 3 + (+st.shares || 0) * 4 + (+st.dms || 0) * 10 : 0);
function insights() {
  const posted = store.all('content').filter((x) => x.status === 'posted' && x.stats);
  const group = (keyFn) => { const g = {}; for (const x of posted) { const k = keyFn(x); if (!k) continue; (g[k] ||= []).push(scoreOf(x.stats)); } return Object.entries(g).map(([k, a]) => ({ k, n: a.length, avg: a.reduce((t, v) => t + v, 0) / a.length })).sort((a, b) => b.avg - a.avg); };
  return { n: posted.length, cat: group((x) => catOf(x)), hook: group((x) => x.deck?.hookStyle), theme: group((x) => x.deck?.theme), pf: group((x) => x.stats?.pf),
    visual: group((x) => (x.deck.slides.some((s) => ['bar', 'line', 'donut', 'table', 'timeline'].includes(s.kind)) ? 'มีกราฟ/ตาราง' : 'ข้อความล้วน')), hour: group((x) => (x.stats?.hour != null && x.stats.hour !== '' ? (+x.stats.hour < 11 ? 'เช้า (ก่อน 11 น.)' : +x.stats.hour < 15 ? 'กลางวัน (11–15 น.)' : +x.stats.hour < 19 ? 'เย็น (15–19 น.)' : 'ค่ำ (หลัง 19 น.)') : null)) };
}

// ── คลัง 365 ──
const lib = { cat: null, q: '', vis: '', sort: 'day' };
export function renderLibrary() {
  if (!lib.cat) lib.cat = catOfDay();
  const list = h('div.lib-list', h('p.muted', 'กำลังเปิดคลัง…')); const count = h('span.small.muted');
  const used = new Set(store.all('content').map((x) => x.deck?.lib).filter(Boolean));
  const ins = insights(); const best = Object.fromEntries(ins.cat.map((x, i) => [x.k, i]));
  const preview = (it) => { const deck = buildDeck(it, { theme: brandSet().theme }); const strip = h('div.lib-prev');
    deck.slides.forEach((s, i) => { const im = h('img', { alt: 'หน้า ' + (i + 1) }); strip.append(im); renderSlide(s, deck, i).then((r) => { im.src = r.canvas.toDataURL('image/jpeg', 0.7); }); });
    sheet({ title: it.h, sub: `${CATS[it.c].name} · ${deck.slides.length} หน้า${it.me ? ' · แม่แบบให้เล่าเรื่องของคุณเอง' : ''}`, body: h('div.stack', strip,
      it.me ? h('div.callout.small', 'เรื่องนี้เป็นแม่แบบ: แทนข้อความใน [ ] ด้วยเรื่องจริงของคุณ ก่อนโพสต์') : null,
      it.c === 'story' && !it.me ? h('div.callout.small', 'เป็นเรื่องสมมติจากสถานการณ์ที่พบบ่อย ใช้นามสมมติ ไม่ควรโพสต์ว่าเป็นเรื่องของลูกค้าจริง') : null,
      h('button.btn.primary.block', { onclick: () => { closeSheet(true); const x = createItem(deck, { title: it.h, pillar: it.c, status: 'doing' }); location.hash = '#/studio/' + x.id; } }, icon('pen'), 'เปิดในสตูดิโอ'),
      h('button.btn.block', { onclick: () => { closeSheet(true); createItem(deck, { title: it.h, pillar: it.c, status: 'idea' }); } }, icon('plus'), 'เก็บไว้ในช่องไอเดีย')) }); };
  const draw = (all) => {
    let a = all.filter((x) => (lib.cat === 'all' || x.c === lib.cat) && (!lib.q || (x.h + ' ' + (x.t || '')).toLowerCase().includes(lib.q)) && (!lib.vis || visOf(x).includes(lib.vis)));
    if (lib.sort === 'best' && ins.n >= 3) a = [...a].sort((x, y) => (best[x.c] ?? 99) - (best[y.c] ?? 99));
    if (lib.sort === 'new') a = a.filter((x) => !used.has(x.id));
    count.textContent = `${a.length} เรื่อง`;
    list.replaceChildren(...(a.length ? a.slice(0, 80).map((it) => h('button.lib-i', { style: { '--pc': CATS[it.c].color }, onclick: () => preview(it) },
      h('span.lib-c', CATS[it.c].short), h('b', it.h), h('span.lib-m', visOf(it).map((v) => h('em', v)), it.me ? h('em.me', 'เรื่องของคุณ') : null, used.has(it.id) ? h('em.used', 'เคยทำแล้ว') : null))) : [h('p.muted', 'ไม่พบเรื่องที่ตรงกับตัวกรอง')]),
      a.length > 80 ? h('p.small.muted', `แสดง 80 จาก ${a.length} เรื่อง พิมพ์ค้นหาเพื่อเจาะจง`) : '');
  };
  let ALL = []; loadAll().then((a) => { ALL = a; draw(ALL); }).catch(() => list.replaceChildren(h('p.muted', 'เปิดคลังไม่ได้ ลองใหม่อีกครั้ง')));
  const chips = h('div.chips', [['all', 'ทั้งหมด'], ...Object.entries(CATS).map(([k, v]) => [k, v.short])].map(([k, l]) => h('button.chip', { class: lib.cat === k ? 'on' : '', onclick: () => { lib.cat = k; rerender(); } }, k !== 'all' ? h('span.dot', { style: { background: CATS[k].color } }) : null, l)));
  return h('div', { 'data-title': 'คลัง 365 เรื่อง' }, back('คลัง 365 เรื่อง', 'วันละเรื่อง ครบทั้งปี · จันทร์ ออมเงิน · อังคาร ประกัน · พุธ ลงทุน · พฤหัส AI · ศุกร์ ภาษี/เกษียณ · เสาร์ เรื่องเล่า · อาทิตย์ เช็กลิสต์'),
    h('input.input', { type: 'search', placeholder: 'ค้นหาหัวข้อ เช่น เกษียณ บัตรเครดิต AI', value: lib.q, 'aria-label': 'ค้นหาในคลัง', oninput: (e) => { lib.q = e.target.value.trim().toLowerCase(); draw(ALL); } }),
    h('div', { style: { margin: '10px 0 6px' } }, chips),
    h('div.row.wrap', { style: { gap: '8px', margin: '6px 0 10px', alignItems: 'center' } },
      h('select.input.sm-sel', { 'aria-label': 'รูปแบบภาพ', onchange: (e) => { lib.vis = e.target.value; draw(ALL); } }, h('option', { value: '' }, 'ทุกรูปแบบ'), [...new Set(Object.values(FMT_NAME))].map((v) => h('option', { value: v, selected: lib.vis === v }, 'มี' + v))),
      h('select.input.sm-sel', { 'aria-label': 'เรียงลำดับ', onchange: (e) => { lib.sort = e.target.value; draw(ALL); } }, [['day', 'เรียงตามคลัง'], ['new', 'ที่ยังไม่เคยทำ'], ['best', 'หมวดที่ได้ผลกับฉันก่อน']].map(([k, l]) => h('option', { value: k, selected: lib.sort === k }, l))), count),
    lib.sort === 'best' && ins.n < 3 ? h('p.small.muted', 'ต้องบันทึกผลโพสต์อย่างน้อย 3 โพสต์ก่อน จึงจะเรียงตามผลของคุณได้') : null,
    list);
}

// ── ผลโพสต์ ──
const PF = [['ig', 'Instagram'], ['fb', 'Facebook'], ['tt', 'TikTok'], ['line', 'LINE']];
function statSheet(it) {
  const st = { pf: 'ig', views: '', likes: '', comments: '', saves: '', shares: '', dms: '', hour: '', ...(it.stats || {}) };
  const n = (k, l, hint) => h('label.f', h('span', l), h('input.input', { type: 'number', inputmode: 'numeric', min: 0, value: st[k], placeholder: hint || '0', oninput: (e) => { st[k] = e.target.value; } }));
  sheet({ title: 'บันทึกผลโพสต์', sub: it.title, body: h('div.stack',
    h('div.q', h('span.ql', 'ช่องทาง'), choices('pf', st.pf, PF, { onChange: (v) => { st.pf = v; } })),
    h('div.form-grid', n('views', 'ยอดเข้าถึง / ยอดดู'), n('likes', 'ถูกใจ'), n('comments', 'คอมเมนต์'), n('saves', 'บันทึก (เซฟ)'), n('shares', 'แชร์ / ส่งต่อ'), n('dms', 'คนทักมาถาม'), n('hour', 'โพสต์ตอนกี่โมง (0–23)', 'เช่น 19')),
    h('p.small.muted', 'ดูตัวเลขได้จากหน้าข้อมูลเชิงลึกของแต่ละแอป · ควรบันทึกหลังโพสต์ 2–3 วัน'),
    h('button.btn.primary.block', { onclick: () => { store.put('content', { ...it, stats: { ...st, at: todayISO() } }); closeSheet(true); toast('บันทึกผลแล้ว'); } }, icon('check'), 'บันทึก')) });
}
export function renderStats() {
  const posted = store.all('content').filter((x) => x.status === 'posted').sort((a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''));
  const ins = insights(); const ranked = posted.filter((x) => x.stats).sort((a, b) => scoreOf(b.stats) - scoreOf(a.stats));
  const NAME = { cat: (k) => CATS[k]?.name || k, hook: (k) => (HOOKS.find((x) => x[0] === k) || [0, k])[1], theme: (k) => THEMES[k]?.name || k, pf: (k) => (PF.find((x) => x[0] === k) || [0, k])[1], visual: (k) => k, hour: (k) => k };
  const block = (title, key) => { const a = ins[key]; if (!a.length) return null; const mx = Math.max(1, ...a.map((x) => x.avg)); return h('div.card', h('b', title), h('div.rp-bars', { style: { marginTop: '10px' } }, a.slice(0, 5).map((x) => h('div', h('span', NAME[key](x.k)), h('i', { style: { width: (x.avg / mx) * 100 + '%' } }), h('b', Math.round(x.avg))))), h('p.xs.muted', { style: { marginTop: '6px' } }, 'คะแนนเฉลี่ยต่อโพสต์ · ' + a.map((x) => `${NAME[key](x.k)} ${x.n} โพสต์`).slice(0, 3).join(' · '))); };
  const pick = (a) => a.find((x) => x.n >= 2) || a[0]; const top = pick(ins.cat), topHook = pick(ins.hook);
  return h('div', { 'data-title': 'ผลโพสต์' }, back('ผลโพสต์', 'บันทึกตัวเลขจริงหลังโพสต์ แล้วแอปจะบอกว่าแบบไหนได้ผลกับคนติดตามของคุณ'),
    ins.n >= 3 ? h('div.card.st-win', h('small', 'สิ่งที่ได้ผลกับคุณตอนนี้'), h('b', `หมวด "${NAME.cat(top.k)}"${topHook ? ` · เปิดแบบ "${NAME.hook(topHook.k)}"` : ''}`), h('p.small', `จาก ${ins.n} โพสต์ที่บันทึกผล${ins.n < 10 ? ' · ข้อมูลยังน้อย ใช้เป็นแนวทางเท่านั้น' : ''} · ลองทำแนวนี้ซ้ำ แล้วดูว่ายังได้ผลไหม`), h('a.btn.sm', { href: '#/studio/library' }, 'เลือกเรื่องจากคลัง')) : h('div.callout', h('b', `บันทึกผลแล้ว ${ins.n} โพสต์ `), 'ครบ 3 โพสต์เมื่อไร จะเริ่มเห็นว่าหมวดไหน ประโยคเปิดแบบไหน และเวลาไหนได้ผลกับคุณ'),
    ins.n >= 3 ? h('div.grid.g2', { style: { marginTop: '12px', alignItems: 'start' } }, block('หมวดเนื้อหา', 'cat'), block('แบบประโยคเปิด', 'hook'), block('มีกราฟ/ตาราง หรือข้อความล้วน', 'visual'), block('ช่วงเวลาที่โพสต์', 'hour'), block('ช่องทาง', 'pf'), block('สไตล์ภาพ', 'theme')) : null,
    h('div.section', h('h2', 'โพสต์แล้ว'), posted.length ? h('div.plist', posted.map((x) => h('div.prow', { style: { cursor: 'default', '--cc': catColor(x) } }, h('span.pi', icon(x.stats ? 'check' : 'pen')), h('a.pt', { href: '#/studio/' + x.id }, h('b', x.title), h('span', x.stats ? `คะแนน ${scoreOf(x.stats)} · เซฟ ${x.stats.saves || 0} · แชร์ ${x.stats.shares || 0} · ทัก ${x.stats.dms || 0}` : `โพสต์ ${x.postedAt ? dateTH(x.postedAt) : ''} · ยังไม่ได้บันทึกผล`)), h('span.pr', h('button.btn.sm', { class: x.stats ? '' : 'primary', onclick: () => statSheet(x) }, x.stats ? 'แก้' : 'บันทึกผล'))))) : h('div.card', empty('ยังไม่มีโพสต์', 'star', h('a.btn.primary', { href: '#/studio' }, 'ไปที่งานของฉัน'), 'เมื่อย้ายงานไปช่อง "โพสต์แล้ว" จะมาอยู่ที่นี่'))),
    ranked.length ? h('p.source', 'คะแนน = ถูกใจ + คอมเมนต์×2 + เซฟ×3 + แชร์×4 + คนทัก×10 (ให้น้ำหนักกับสิ่งที่นำไปสู่ลูกค้าจริง)') : null,
    h('div.callout.small', { style: { marginTop: '12px' } }, h('b', 'เวลาที่ควรโพสต์: '), ins.hour.length >= 2 ? `จากโพสต์ของคุณ ช่วง "${ins.hour[0].k}" ได้ผลดีที่สุดตอนนี้` : 'ยังไม่มีข้อมูลของคุณพอ แนวปฏิบัติทั่วไปคือช่วงพักเที่ยงและหลังเลิกงาน แต่ควรใช้ผลจริงของคุณเป็นหลัก กรอก "โพสต์ตอนกี่โมง" ทุกครั้งเพื่อให้แอปคำนวณให้'));
}

// ── หลักที่ใช้ (ผลการค้นคว้า) ──
export function renderPlaybook() {
  const EV = { 'งานวิจัย': 'var(--good)', 'รายงานสถิติ': 'var(--c-life)', 'แพลตฟอร์มแจ้ง': 'var(--c-saving)', 'หนังสือ': 'var(--warn)', 'แนวปฏิบัติ': 'var(--ink-3)', 'ยังไม่ชัด': 'var(--bad)' };
  return h('div', { 'data-title': 'หลักที่ใช้' }, back('หลักที่ใช้ออกแบบคลัง', 'สรุปจากการค้นคว้า พร้อมระดับหลักฐานของแต่ละข้อ ข้อไหนยังไม่มีหลักฐานชัดจะบอกตรง ๆ'),
    h('div.pb-list', PLAYBOOK.map(([t, d, ev, src]) => h('div.card.pb-i', h('span.pb-ev', { style: { '--ec': EV[ev] || 'var(--ink-3)' } }, ev), h('b', t), h('p', d), h('small', 'ที่มา: ' + src)))),
    h('div.section', h('h2', 'สูตรประโยคเปิด 10 แบบ'), h('div.pb-list', HOOKS.map(([, name, tpl, why, ev]) => h('div.card.pb-i', h('span.pb-ev', { style: { '--ec': EV[ev] || 'var(--ink-3)' } }, ev), h('b', name), h('p', why), h('small', 'ตัวอย่าง: ' + tpl[0].replace('{t}', '…')))))),
    h('p.source', 'ตัวเลขจากรายงานของบริษัทวิเคราะห์โซเชียลเป็นข้อมูลภาพรวมหลายประเทศ ไม่ใช่เฉพาะไทยหรือเฉพาะเนื้อหาการเงิน · สิ่งที่แม่นที่สุดคือผลโพสต์ของคุณเอง'));
}

// ── ลายเซ็นท้ายภาพ ──
export function renderSign() {
  const cur = getSig(); const W = 640, H = 260; let strokes = cur?.type === 'draw' ? structuredClone(cur.strokes) : []; let live = null;
  const cv = h('canvas.sig-pad', { width: W, height: H, 'aria-label': 'พื้นที่เซ็นลายเซ็น ใช้นิ้วหรือเมาส์วาด' }); const x = cv.getContext('2d');
  const paint = () => { x.clearRect(0, 0, W, H); x.strokeStyle = '#d9d2cc'; x.lineWidth = 2; x.setLineDash([6, 8]); x.beginPath(); x.moveTo(30, H - 60); x.lineTo(W - 30, H - 60); x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#3a3a3c'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 4; for (const st of strokes) { x.beginPath(); st.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); if (st.length === 1) x.lineTo(st[0][0] + .1, st[0][1]); x.stroke(); } };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * W / r.width), Math.round((e.clientY - r.top) * H / r.height)]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); live = [pos(e)]; strokes.push(live); paint(); });
  cv.addEventListener('pointermove', (e) => { if (!live) return; const p = pos(e); const l = live.at(-1); if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 2) { live.push(p); paint(); } });
  const end = () => { live = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  paint();
  const prev = h('img.sig-prev', { alt: 'ตัวอย่างหน้าสุดท้ายที่มีลายเซ็น' });
  const showPrev = async () => { const deck = { theme: brandSet().theme || 'aom', slides: [{ kind: 'cover', title: 'ตัวอย่าง' }, { kind: 'cta', title: 'อยากรู้ตัวเลขของคุณเอง?', body: 'ทักมาคุยได้ ไม่มีค่าใช้จ่ายในการปรึกษา' }] }; const r = await renderSlide(deck.slides[1], deck, 1); prev.src = r.canvas.toDataURL('image/jpeg', 0.85); };
  showPrev();
  const presetBtn = ([id, text, font, name]) => { const c = h('canvas', { width: 300, height: 120 }); ensureFont(font).then(() => drawSignature(c.getContext('2d'), { type: 'text', text, font }, 10, 10, 280, 100, '#3a3a3c'));
    const inp = h('input.input', { value: cur?.type === 'text' && cur.id === id ? cur.text : text, 'aria-label': 'ข้อความลายเซ็น ' + name });
    return h('div.sig-pre', c, h('small', name), inp, h('button.btn.sm', { onclick: () => { setSig({ type: 'text', id, text: inp.value.trim() || text, font }); toast('ใช้ลายเซ็นแบบ ' + name + ' แล้ว'); showPrev(); } }, 'ใช้แบบนี้')); };
  return h('div', { 'data-title': 'ลายเซ็นท้ายภาพ' }, back('ลายเซ็นท้ายภาพ', 'ลายเซ็นจะอยู่มุมขวาล่างของหน้าสุดท้ายในทุกโพสต์ เซ็นเองด้วยนิ้วจะไม่ซ้ำใคร'),
    h('div.card', h('b', 'เซ็นด้วยนิ้วของคุณเอง'), h('p.small.muted', 'เซ็นให้เต็มพื้นที่ เส้นจะถูกแปลงเป็นลายเส้นดินสอในภาพ'), cv,
      h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, h('button.btn.primary', { onclick: () => { if (!strokes.length) { toast('ยังไม่ได้เซ็น'); return; } setSig({ type: 'draw', strokes }); toast('บันทึกลายเซ็นแล้ว'); showPrev(); } }, icon('check'), 'ใช้ลายเซ็นนี้'),
        h('button.btn', { onclick: () => { strokes.pop(); paint(); } }, icon('undo'), 'ลบเส้นล่าสุด'), h('button.btn', { onclick: () => { strokes = []; paint(); } }, 'ล้าง'))),
    h('div.section', h('h2', 'หรือเลือกแบบสำเร็จ (แก้ข้อความได้)'), h('div.sig-pres', SIG_PRESETS.map(presetBtn))),
    h('div.section', h('h2', 'ตัวอย่างในภาพ'), h('div.card', prev, h('div.row', { style: { gap: '8px', marginTop: '10px' } }, getSig() ? h('button.btn.sm.danger', { onclick: () => { setSig(null); toast('เอาลายเซ็นออกแล้ว'); rerender(); } }, 'ไม่ใช้ลายเซ็น') : h('span.small.muted', 'ยังไม่ได้ตั้งลายเซ็น')))),
    h('p.source', 'ลายเซ็นเก็บในเครื่องนี้เท่านั้น ไม่ถูกส่งไปที่อื่น'));
}
