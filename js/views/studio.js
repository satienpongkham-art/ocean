// ─── สตูดิโอคอนเทนต์: ไอเดีย → กำลังทำ → พร้อมโพสต์ → โพสต์แล้ว · แก้ภาพในกรอบ IG · งานเดียวแปลง 4 แบบ ───
import { h, icon, sheet, closeSheet, choices, toast, copyText, fmt, todayISO, dateTH, empty } from '../ui.js';
import * as store from '../store.js';
import { PILLARS, IDEAS, FORMATS } from '../../data/content.js';
import { GLOSSARY } from '../../data/rules.js';
import { PLANS, PLAN, CAT } from '../../data/plans.js';
import { THEMES, KINDS, renderSlide, splitSlide } from '../carousel.js';
import { split503020, compoundCompare } from '../engine/calc.js';
import { profile, rerender } from '../app.js';
import { headline } from './planpage.js';
import { haptic } from '../pwa.js';

const COLS = [['idea', 'ไอเดีย', 'bulb'], ['doing', 'กำลังทำ', 'pen'], ['ready', 'พร้อมโพสต์', 'check'], ['posted', 'โพสต์แล้ว', 'star']];
const PIL = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
const TAGS = { protect: '#ประกันสุขภาพ #วางแผนความคุ้มครอง', money: '#วางแผนการเงิน #ออมเงิน', biz: '#ผู้ประกอบการ #ฟรีแลนซ์', tech: '#AIช่วยงาน #การเงินยุคใหม่', story: '#ที่ปรึกษาการเงิน #เรื่องจริง' };
export const seriesName = () => store.getSettings().brand?.series || 'ออมรู้ 1 นาที';
const nextEp = () => store.all('content').filter((x) => x.deck?.series === seriesName()).length + 1;
const cta = () => ({ kind: 'cta', title: 'อยากรู้ว่าแบบไหนเหมาะกับคุณ?', body: 'ทักมาคุยได้ ไม่มีค่าใช้จ่าย · บันทึกโพสต์นี้ไว้ แล้วแชร์ให้คนที่ควรรู้' });

// ── ตัวสร้างชุดสไลด์ ──
export const GEN = {
  idea(idea, pil) {
    return { tag: PIL[pil]?.name, slides: [{ kind: 'cover', kicker: PIL[pil]?.name || '', title: idea.hook, body: `${idea.points.length} ข้อที่ควรรู้ ปัดดูเลย` },
      ...idea.points.map((p, i) => ({ kind: 'point', num: i + 1, title: p, body: '' })), { kind: 'cta', title: idea.cta, body: 'บันทึกโพสต์นี้ไว้ แล้วแชร์ให้คนที่ควรรู้' }] };
  },
  salary(sal) {
    const s = split503020(sal); const exp = s.needs + s.wants;
    return { tag: 'เงินเดือน ' + fmt(sal), slides: [
      { kind: 'cover', kicker: 'วางแผนแบบทำตามได้จริง', title: `เงินเดือน ${fmt(sal)} จัดการยังไงดี?`, body: 'สูตร 50/30/20 + เงินสำรอง + งบประกัน' },
      { kind: 'stat', kicker: '50% · ค่าใช้จ่ายจำเป็น', value: fmt(s.needs), title: 'บาท/เดือน', body: 'ค่าเช่า ค่ากิน ค่าเดินทาง บิลต่าง ๆ (รวมเบี้ยประกัน)' },
      { kind: 'stat', kicker: '30% · ใช้ตามใจ', value: fmt(s.wants), title: 'บาท/เดือน', body: 'เที่ยว กินข้าวนอกบ้าน ของที่อยากได้ ใช้ได้ไม่ต้องรู้สึกผิด' },
      { kind: 'stat', kicker: '20% · ออมก่อนใช้', value: fmt(s.save), title: 'บาท/เดือน', body: 'ตั้งโอนอัตโนมัติวันเงินเดือนออก 1 ปี = ' + fmt(s.save * 12) + ' บาท (ยังไม่รวมผลตอบแทน)' },
      { kind: 'stat', kicker: 'เงินสำรองฉุกเฉินที่ควรมี', value: `${fmt(exp * 3 / 1000)}k–${fmt(exp * 6 / 1000)}k`, title: 'บาท (3–6 เท่าของรายจ่าย)', body: 'เก็บแยกบัญชี ถอนได้ทันที ไว้ใช้ตอนตกงาน/ป่วย' },
      { kind: 'stat', kicker: 'งบประกันโดยประมาณ', value: `${fmt(sal * 0.1)}–${fmt(sal * 0.15)}`, title: 'บาท/เดือน (แนวทาง 10–15% ของรายได้)', body: 'เริ่มจากความคุ้มครองที่จำเป็นก่อน: สุขภาพ → โรคร้าย → ชีวิต' },
      cta()] };
  },
  term(word) {
    const def = (GLOSSARY.find(([k]) => k === word) || [word, ''])[1];
    return { tag: 'ศัพท์ประกันวันละคำ', slides: [
      { kind: 'cover', kicker: 'ศัพท์ประกันวันละคำ', title: `"${word}" คืออะไร?`, body: 'แปลเป็นภาษาคน ใน 1 นาที' },
      { kind: 'point', num: '', title: 'แปลง่าย ๆ', body: def },
      { kind: 'list', title: 'ทำไมต้องรู้', items: ['อ่านกรมธรรม์แล้วเข้าใจ', 'ไม่เสียสิทธิ์ตอนเคลม', 'ถามตัวแทนได้ตรงจุด'] },
      { kind: 'cta', title: 'อยากให้อธิบายคำไหนต่อ?', body: 'คอมเมนต์คำที่สงสัยไว้ได้เลย เดี๋ยวทำให้' }] };
  },
  plan(id) {
    const p = PLAN[id];
    return { tag: CAT[p.cat].name, slides: [
      { kind: 'cover', kicker: CAT[p.cat].name, title: `${p.short} เหมาะกับใคร?`, body: p.tagline },
      { kind: 'list', title: 'เหมาะกับคนแบบนี้', items: (p.bestFor || []).slice(0, 3).map((x) => headline(x, 60)) },
      { kind: 'list', title: 'จุดเด่น', items: (p.highlights || []).slice(0, 3).map((x) => headline(x, 60)) },
      { kind: 'list', title: 'ข้อควรรู้ก่อนสมัคร', items: (p.watch || []).filter((x) => !/⏰/.test(x)).slice(0, 3).map((x) => headline(x, 70)) },
      { kind: 'cta', title: 'อยากรู้ว่าเหมาะกับคุณไหม?', body: 'ทักมาคุยได้ · ความคุ้มครองและเงื่อนไขเป็นไปตามกรมธรรม์' }] };
  },
  compound({ monthly = 2000, rate = 4, startA = 25, startB = 35, end = 60 }) {
    const r = compoundCompare({ monthly, rate, startA, startB, end });
    return { tag: 'พลังดอกเบี้ยทบต้น', slides: [
      { kind: 'cover', kicker: 'พลังของการเริ่มเร็ว', title: `ออมเดือนละ ${fmt(monthly)} เริ่มอายุ ${startA} กับ ${startB} ต่างกันแค่ไหน?`, body: `สมมติผลตอบแทน ${rate}% ต่อปี ถึงอายุ ${end}` },
      { kind: 'stat', kicker: `เริ่มอายุ ${startA}`, value: fmt(r.a), title: 'บาท ตอนอายุ ' + end, body: `เงินต้นที่ออมจริง ${fmt(r.paidA)} บาท` },
      { kind: 'stat', kicker: `เริ่มอายุ ${startB}`, value: fmt(r.b), title: 'บาท ตอนอายุ ' + end, body: `เงินต้นที่ออมจริง ${fmt(r.paidB)} บาท` },
      { kind: 'stat', kicker: 'ต่างกัน', value: fmt(r.diff), title: 'บาท', body: `ทั้งที่ออมมากกว่าแค่ ${fmt(r.paidA - r.paidB)} บาท · ตัวเลขสมมติเพื่ออธิบาย ไม่ใช่การรับประกันผลตอบแทน` },
      { kind: 'cta', title: 'เริ่มวันนี้ ดีกว่ารอพรุ่งนี้', body: 'อยากวางแผนออมให้เหมาะกับตัวเอง ทักมาคุยได้' }] };
  },
  blank() { return { slides: [{ kind: 'cover', kicker: '', title: 'หัวข้อของคุณ', body: 'คำอธิบายสั้น ๆ' }, { kind: 'point', num: 1, title: 'ประเด็นที่ 1', body: '' }, cta()] }; },
};
export function createItem(deck, { title, pillar = 'money', format = 'carousel', series = false, status = 'idea' } = {}) {
  const d = { theme: store.getSettings().brand?.theme || 'ink', ...deck };
  if (series) { d.series = seriesName(); d.ep = nextEp(); }
  const it = store.put('content', { title: title || deck.slides[0]?.title || 'คอนเทนต์ใหม่', status, pillar, format, deck: d, date: '' });
  toast('เพิ่มเข้าสตูดิโอแล้ว'); return it;
}

// ── แปลงเป็นแคปชั่น / บทคลิป ──
export function toCaption(it) {
  const p = profile(); const sl = it.deck.slides; const cov = sl.find((s) => s.kind === 'cover') || sl[0]; const end = sl.find((s) => s.kind === 'cta');
  const pts = sl.flatMap((s) => s.kind === 'list' ? s.items : s.kind === 'stat' ? [`${s.kicker}: ${s.value} ${s.title}`] : s.kind === 'point' ? [s.title + (s.body ? ' — ' + s.body : '')] : []).filter(Boolean).slice(0, 8);
  return [cov?.title, cov?.body ? cov.body : null, '', ...pts.map((x) => '✅ ' + x), '', end ? '👉 ' + end.title : '', '', `${TAGS[it.pillar] || ''}${it.deck.series ? ' #' + it.deck.series.replace(/\s/g, '') : ''}`,
    `—\n${p.name}${p.nick ? ' (' + p.nick + ')' : ''} · ${p.title}${p.licenseLife ? ' · ใบอนุญาตเลขที่ ' + p.licenseLife : ''}${p.line ? ' · LINE ' + p.line : ''}`].filter((x) => x !== null).join('\n');
}
export function toScript(it) {
  const sl = it.deck.slides; const cov = sl.find((s) => s.kind === 'cover') || sl[0]; const mid = sl.filter((s) => !['cover', 'cta'].includes(s.kind)); const end = sl.find((s) => s.kind === 'cta');
  const per = Math.max(3, Math.floor(22 / Math.max(1, mid.length)));
  let t = 3; const out = [`[0–3 วิ] ฮุก (มองกล้อง พูดเร็ว)\n"${cov?.title || ''}"\nข้อความบนจอ: ${cov?.title || ''}`];
  for (const s of mid) { const say = s.kind === 'list' ? s.title + ': ' + s.items.join(' · ') : s.kind === 'stat' ? `${s.kicker} ${s.value} ${s.title}` : s.title + (s.body ? ' — ' + s.body : '');
    out.push(`[${t}–${t + per} วิ] ${say}\nข้อความบนจอ: ${s.kind === 'stat' ? s.value : headline(s.title, 28)}`); t += per; }
  out.push(`[${t}–${t + 5} วิ] ปิดท้าย\n"${end?.title || 'ทักมาคุยได้'}"\nข้อความบนจอ: ${profile().line ? 'LINE ' + profile().line : 'ทักมาคุย'}`);
  return out.join('\n\n') + '\n\nเคล็ดลับ: อัดแนวตั้ง แสงหน้า เสียงชัด · ตัดต่อให้มีอะไรเปลี่ยนทุก 2–3 วินาที';
}

// ── หน้าบอร์ดสตูดิโอ ──
async function thumb(it, el) { try { const r = await renderSlide(it.deck.slides[0], it.deck, 0); el.src = r.canvas.toDataURL('image/jpeg', 0.6); } catch {} }
export function renderStudio() {
  const items = store.all('content').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const move = (it, d) => { const i = COLS.findIndex((c) => c[0] === it.status); const n = COLS[i + d]; if (!n) return; store.put('content', { ...it, status: n[0], ...(n[0] === 'posted' ? { postedAt: todayISO() } : {}) }); haptic(10);
    if (n[0] === 'posted') import('../fx.js').then((m) => m.celebrate?.()).catch(() => {}); };
  const card = (it) => { const img = h('img.sc-th', { alt: '' }); thumb(it, img);
    return h('div.sc-card', { style: { '--pc': PIL[it.pillar]?.color || 'var(--primary)' } },
      h('a.sc-main', { href: '#/studio/' + it.id }, img, h('div', h('b', it.title), h('small', [PIL[it.pillar]?.name, it.deck?.series ? `${it.deck.series} EP.${it.deck.ep}` : null, `${it.deck?.slides?.length || 0} หน้า`].filter(Boolean).join(' · ')))),
      h('div.sc-acts', h('button.icon-btn', { 'aria-label': 'ย้ายไปช่องก่อนหน้า', disabled: it.status === 'idea', onclick: () => move(it, -1) }, icon('back')),
        h('span.small.muted', it.postedAt ? dateTH(it.postedAt) : ''), h('button.icon-btn', { 'aria-label': 'ย้ายไปช่องถัดไป', disabled: it.status === 'posted', onclick: () => move(it, 1) }, icon('next')))); };
  return h('div', { 'data-title': 'สตูดิโอคอนเทนต์' },
    h('div.topbar', h('div', h('h1', 'สตูดิโอคอนเทนต์'), h('div.sub', 'ไอเดีย → กำลังทำ → พร้อมโพสต์ → โพสต์แล้ว · งานเดียวได้ทั้งภาพ สตอรี่ แคปชั่น และบทคลิป')),
      h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'สร้าง')),
    h('div.row.wrap', { style: { gap: '8px', margin: '4px 0 12px' } }, h('a.chip', { href: '#/brand' }, icon('star'), 'แบรนด์ของฉัน'), h('a.chip', { href: '#/tools/content' }, icon('cal'), 'ปฏิทินคอนเทนต์'), h('a.chip', { href: '#/tools/tipcard' }, icon('pen'), 'ภาพทิป 1 หน้า')),
    items.length ? h('div.studio-board', COLS.map(([id, name, ic]) => { const list = items.filter((x) => (x.status || 'idea') === id);
      return h('div.sb-col', h('div.sb-h', icon(ic), h('b', name), h('span.muted', list.length)), list.map(card), !list.length ? h('div.small.muted.sb-empty', id === 'idea' ? 'กด "สร้าง" เพื่อเพิ่มไอเดีย' : '—') : null); }))
      : h('div.card', empty('ยังไม่มีงานในสตูดิโอ', 'pen', h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'สร้างงานแรก'), 'เริ่มจากตัวสร้างสำเร็จรูป เช่น "เงินเดือน ___ วางแผนยังไง" หรือ EP.1 ของซีรีส์')));
}

export function newSheet() {
  const open = (deck, opt) => { closeSheet(true); const it = createItem(deck, opt); location.hash = '#/studio/' + it.id; };
  const num = (ph, v) => h('input.input', { type: 'number', inputmode: 'numeric', value: v, placeholder: ph, 'aria-label': ph });
  const sal = num('เงินเดือน (บาท)', 25000);
  const termSel = h('select.input', { 'aria-label': 'คำศัพท์' }, GLOSSARY.map(([k]) => h('option', { value: k }, k)));
  const planSel = h('select.input', { 'aria-label': 'แผน' }, PLANS.map((p) => h('option', { value: p.id }, `${p.short} (${CAT[p.cat].short})`)));
  const cm = num('ออมเดือนละ', 2000), cr = num('ผลตอบแทน %/ปี', 4);
  const topic = h('input.input', { placeholder: 'หัวข้อตอนนี้ เช่น เงินสำรองฉุกเฉินต้องมีเท่าไร' });
  const ideaList = h('div.idea-list', PILLARS.flatMap((pl) => IDEAS[pl.id].map((idea) => h('button.idea-i', { style: { '--pc': pl.color }, onclick: () => open(GEN.idea(idea, pl.id), { pillar: pl.id, title: idea.hook }) }, h('small', pl.name), h('b', idea.hook)))));
  sheet({ title: 'สร้างคอนเทนต์', body: h('div.stack.gen-list',
    h('div.gen', h('div.gen-h', h('b', `ซีรีส์ "${seriesName()}" EP.${nextEp()}`), h('small', 'ปกหน้าตาเดียวกันทุกตอน คนจำแบรนด์ได้')), topic, h('button.btn.primary', { onclick: () => { const t = topic.value.trim() || 'หัวข้อของตอนนี้'; open({ slides: [{ kind: 'cover', kicker: seriesName(), title: t, body: 'เข้าใจใน 1 นาที' }, { kind: 'point', num: 1, title: 'ประเด็นที่ 1', body: '' }, { kind: 'point', num: 2, title: 'ประเด็นที่ 2', body: '' }, { kind: 'point', num: 3, title: 'ประเด็นที่ 3', body: '' }, cta()] }, { series: true, title: t }); } }, icon('plus'), 'สร้างตอนใหม่')),
    h('div.gen', h('div.gen-h', h('b', 'ก. เงินเดือน ___ วางแผนยังไง'), h('small', 'ตัวเลขคำนวณจริงตามสูตร 50/30/20')), sal, h('button.btn', { onclick: () => open(GEN.salary(+sal.value || 25000), { pillar: 'money', title: `เงินเดือน ${fmt(+sal.value || 25000)} วางแผนยังไง` }) }, 'สร้าง')),
    h('div.gen', h('div.gen-h', h('b', 'ข. ศัพท์ประกันวันละคำ'), h('small', `${GLOSSARY.length} คำจากคลังคำศัพท์`)), termSel, h('button.btn', { onclick: () => open(GEN.term(termSel.value), { pillar: 'protect', title: 'ศัพท์: ' + termSel.value, series: false }) }, 'สร้าง')),
    h('div.gen', h('div.gen-h', h('b', 'ค. แผนนี้เหมาะกับใคร'), h('small', 'จากข้อมูลแผนจริง พร้อมข้อควรรู้')), planSel, h('button.btn', { onclick: () => open(GEN.plan(planSel.value), { pillar: 'protect', title: PLAN[planSel.value].short + ' เหมาะกับใคร' }) }, 'สร้าง')),
    h('div.gen', h('div.gen-h', h('b', 'ง. พลังดอกเบี้ยทบต้น'), h('small', 'เริ่มอายุ 25 กับ 35 ต่างกันแค่ไหน')), h('div.row', { style: { gap: '8px' } }, cm, cr), h('button.btn', { onclick: () => open(GEN.compound({ monthly: +cm.value || 2000, rate: +cr.value || 4 }), { pillar: 'money', title: 'เริ่มออมเร็ว ต่างกันแค่ไหน' }) }, 'สร้าง')),
    h('details.more', h('summary', h('span', 'จากคลังไอเดีย'), icon('next')), h('div.more-in', ideaList)),
    h('button.btn.ghost', { onclick: () => open(GEN.blank(), {}) }, 'เริ่มจากหน้าเปล่า')) });
}

// ── หน้าแก้งาน ──
const ed = { id: null, tab: 'carousel', i: 0, hist: [], fut: [] };
export function renderStudioItem(id) {
  let it = store.get('content', id);
  if (!it) { location.hash = '#/studio'; return null; }
  if (ed.id !== id) Object.assign(ed, { id, tab: 'carousel', i: 0, hist: [], fut: [] });
  const deck = it.deck; ed.i = Math.min(ed.i, deck.slides.length - 1);
  const save = (patch, { hist = true } = {}) => { if (hist) { ed.hist.push(JSON.stringify(it.deck)); if (ed.hist.length > 40) ed.hist.shift(); ed.fut = []; } it = store.put('content', { ...it, ...patch }); };
  const setDeck = (d, o) => save({ deck: d }, o);
  const root = h('div', { 'data-title': it.title });
  const head = h('div.st-ed-head',
    h('a.icon-btn', { href: '#/studio', 'aria-label': 'กลับสตูดิโอ' }, icon('back')),
    h('input.input.st-title', { value: it.title, 'aria-label': 'ชื่องาน', onchange: (e) => save({ title: e.target.value }, { hist: false }) }),
    h('button.icon-btn', { 'aria-label': 'เลิกทำ', disabled: !ed.hist.length, onclick: () => { ed.fut.push(JSON.stringify(it.deck)); it = store.put('content', { ...it, deck: JSON.parse(ed.hist.pop()) }); } }, icon('undo')),
    h('button.icon-btn', { 'aria-label': 'ทำซ้ำ', disabled: !ed.fut.length, onclick: () => { ed.hist.push(JSON.stringify(it.deck)); it = store.put('content', { ...it, deck: JSON.parse(ed.fut.pop()) }); } }, icon('redo')));
  const statusRow = h('div.chips.wrap', { style: { margin: '6px 0' } }, COLS.map(([s, n]) => h('button.chip', { class: (it.status || 'idea') === s ? 'on' : '', 'aria-pressed': String((it.status || 'idea') === s), onclick: () => { save({ status: s, ...(s === 'posted' ? { postedAt: todayISO() } : {}) }, { hist: false }); if (s === 'posted') import('../fx.js').then((m) => m.celebrate?.()).catch(() => {}); } }, n)));
  const tabs = h('div.seg', { style: { margin: '6px 0 12px' } }, [['carousel', 'ภาพหลายหน้า'], ['story', 'สตอรี่'], ['caption', 'แคปชั่น'], ['script', 'บทคลิป']].map(([k, l]) => h('button', { class: ed.tab === k ? 'on' : '', onclick: () => { ed.tab = k; rerender(); } }, l)));
  root.append(head, statusRow, tabs);
  if (ed.tab === 'caption' || ed.tab === 'script') {
    const gen = ed.tab === 'caption' ? toCaption(it) : toScript(it); const key = ed.tab;
    const ta = h('textarea.input.st-text', { rows: 16, 'aria-label': key === 'caption' ? 'แคปชั่น' : 'บทคลิป', onchange: (e) => save({ [key]: e.target.value }, { hist: false }) }, it[key] || gen);
    root.append(h('div.card', ta, h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } },
      h('button.btn.primary', { onclick: () => copyText(ta.value) }, icon('copy'), 'คัดลอก'),
      h('button.btn', { onclick: () => { ta.value = gen; save({ [key]: '' }, { hist: false }); } }, icon('sync'), 'สร้างใหม่จากสไลด์'),
      key === 'script' ? h('button.btn', { onclick: () => prompter(ta.value) }, icon('play'), 'โหมดอ่านบท') : null),
      key === 'caption' ? h('p.small.muted', { style: { marginTop: '8px' } }, 'ใส่ชื่อและเลขใบอนุญาตให้แล้ว · ตรวจคำ: ไม่การันตีผลตอบแทน ไม่ใช้ "ดีที่สุด/ฟรี/แน่นอน"') : null));
    return root;
  }
  const story = ed.tab === 'story';
  // ── กรอบ IG / สตอรี่ + แตะข้อความเพื่อแก้ ──
  const img = h('img.ig-img', { alt: 'สไลด์ที่ ' + (ed.i + 1) });
  const stage = h('div.ig-stage', { class: story ? 'story' : '' }, img);
  const warn = h('div', { 'aria-live': 'polite' });
  let blocks = []; let cur = 0;
  const paint = async () => {
    const my = ++cur; const r = await renderSlide(deck.slides[ed.i], deck, ed.i, { story }); if (my !== cur) return;
    img.src = r.canvas.toDataURL('image/jpeg', 0.9); blocks = r.blocks;
    warn.replaceChildren(r.overflow ? h('div.callout.warn.small', { style: { marginTop: '8px' } }, 'ข้อความยาวเกินหน้านี้ ตัวอักษรย่อจนถึงขนาดเล็กสุดแล้ว ', h('button.btn.sm', { onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i, 1, ...splitSlide(d.slides[ed.i])); setDeck(d); } }, 'แยกเป็น 2 หน้า')) : null);
  };
  img.addEventListener('click', (e) => {
    const rect = img.getBoundingClientRect(); const sc = rect.width / 1080; const X = (e.clientX - rect.left) / sc, Y = (e.clientY - rect.top) / sc;
    const inside = (q, pad) => X >= q.x - pad && X <= q.x + q.w + pad && Y >= q.y - pad && Y <= q.y + q.h + pad;
    const dist = (q) => Math.hypot(Math.max(q.x - X, 0, X - q.x - q.w), Math.max(q.y - Y, 0, Y - q.y - q.h));
    const b = blocks.find((q) => inside(q, 0)) || blocks.filter((q) => inside(q, 40)).sort((m, n) => dist(m) - dist(n))[0]; if (!b) return;
    const s = deck.slides[ed.i]; const isItem = b.key.startsWith('item'); const ix = isItem ? +b.key.slice(4) : -1;
    const val = isItem ? s.items[ix] : s[b.key];
    const ta = h('textarea.ig-edit', { 'aria-label': 'แก้ข้อความ', style: { left: b.x * sc + 'px', top: b.y * sc + 'px', width: b.w * sc + 'px', minHeight: Math.max(b.h, b.size * 1.3) * sc + 'px', fontSize: b.size * sc + 'px', fontFamily: b.serif ? 'Kanit' : 'Sarabun', fontWeight: b.weight } }, val || '');
    let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { if (isItem) s.items[ix] = ta.value; else s[b.key] = ta.value; paint(); }, 160); });
    ta.addEventListener('blur', () => { if (isItem) s.items[ix] = ta.value; else s[b.key] = ta.value; ta.remove(); setDeck(structuredClone(deck)); });
    ta.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') ta.blur(); });
    stage.append(ta); ta.focus(); ta.select();
  });
  paint();
  const p = profile();
  const frame = story ? h('div.phone', stage) : h('div.ig-frame',
    h('div.ig-top', h('span.ig-av', (p.nick || p.name || 'A').replace(/^คุณ/, '')[0]), h('b', p.line ? p.line.replace('@', '') : (p.nick || 'yourname')), icon('more')),
    stage, h('div.ig-bar', icon('heart'), icon('chat'), icon('share'), h('span.ig-dots', deck.slides.map((_, k) => h('i', { class: k === ed.i ? 'on' : '' })))));
  const strip = h('div.st-strip', deck.slides.map((s, k) => { const t = h('img', { alt: '' }); renderSlide(s, deck, k, { story }).then((r) => { t.src = r.canvas.toDataURL('image/jpeg', 0.5); });
    return h('button.st-th', { class: k === ed.i ? 'on' : '', 'aria-label': `สไลด์ ${k + 1} (${KINDS[s.kind] || ''})`, onclick: () => { ed.i = k; rerender(); } }, t, h('small', k + 1)); }),
    h('button.st-th.add', { 'aria-label': 'เพิ่มสไลด์', onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i + 1, 0, { kind: 'point', num: '', title: 'ประเด็นใหม่', body: '' }); ed.i++; setDeck(d); } }, icon('plus')));
  const s = deck.slides[ed.i];
  const tools = h('div.st-tools',
    h('div.row.wrap', { style: { gap: '6px' } },
      h('button.btn.sm', { 'aria-label': 'สไลด์ก่อนหน้า', disabled: ed.i === 0, onclick: () => { ed.i--; rerender(); } }, icon('back')),
      h('button.btn.sm', { 'aria-label': 'สไลด์ถัดไป', disabled: ed.i === deck.slides.length - 1, onclick: () => { ed.i++; rerender(); } }, icon('next')),
      h('select.input.sm-sel', { 'aria-label': 'รูปแบบสไลด์', onchange: (e) => { const d = structuredClone(deck); d.slides[ed.i] = { ...d.slides[ed.i], kind: e.target.value, items: d.slides[ed.i].items || [d.slides[ed.i].body || 'ข้อที่ 1'].filter(Boolean) }; setDeck(d); } }, Object.entries(KINDS).map(([k, l]) => h('option', { value: k, selected: s.kind === k }, l))),
      h('button.btn.sm', { onclick: () => { if (ed.i === 0) return; const d = structuredClone(deck); [d.slides[ed.i - 1], d.slides[ed.i]] = [d.slides[ed.i], d.slides[ed.i - 1]]; ed.i--; setDeck(d); } }, 'ย้ายซ้าย'),
      h('button.btn.sm', { onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i + 1, 0, structuredClone(d.slides[ed.i])); ed.i++; setDeck(d); } }, icon('copy'), 'ทำสำเนา'),
      h('button.btn.sm.danger', { 'aria-label': 'ลบสไลด์นี้', disabled: deck.slides.length <= 1, onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i, 1); ed.i = Math.max(0, ed.i - 1); setDeck(d); } }, icon('trash'))),
    s.kind === 'list' ? h('div.small.muted', { style: { marginTop: '6px' } }, 'แตะข้อความบนภาพเพื่อแก้ · เพิ่มข้อ: ', h('button.btn.sm', { onclick: () => { const d = structuredClone(deck); d.slides[ed.i].items = [...(d.slides[ed.i].items || []), 'ข้อใหม่']; setDeck(d); } }, icon('plus'), 'เพิ่มข้อ')) : h('div.small.muted', { style: { marginTop: '6px' } }, 'แตะข้อความบนภาพเพื่อแก้ได้ทันที · ตัวอักษรย่อให้พอดีหน้าเอง'),
    h('div.q', { style: { marginTop: '10px' } }, h('span.ql', 'สไตล์'), choices('th', deck.theme || 'ink', Object.entries(THEMES).map(([k, v]) => [k, v.name]), { onChange: (v) => setDeck({ ...structuredClone(deck), theme: v }) })),
    h('label.row.small', h('input', { type: 'checkbox', checked: !!deck.series, onchange: (e) => setDeck({ ...structuredClone(deck), series: e.target.checked ? seriesName() : '', ep: e.target.checked ? (deck.ep || nextEp()) : '' }) }), `เป็นตอนของซีรีส์ "${seriesName()}"${deck.series ? ' EP.' + deck.ep : ''}`));
  const exportAll = async () => {
    const cap = it.caption || toCaption(it); try { await navigator.clipboard.writeText(cap); } catch {}
    const files = []; for (let k = 0; k < deck.slides.length; k++) { const r = await renderSlide(deck.slides[k], deck, k, { story }); files.push(new File([await new Promise((res) => r.canvas.toBlob(res, 'image/png'))], `${it.title.slice(0, 20)}-${k + 1}.png`, { type: 'image/png' })); }
    try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text: cap }); toast('คัดลอกแคปชั่นไว้แล้ว วางในโพสต์ได้เลย'); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    for (const f of files) { const a = h('a', { href: URL.createObjectURL(f), download: f.name }); document.body.append(a); a.click(); a.remove(); await new Promise((r) => setTimeout(r, 200)); }
    toast(`บันทึก ${files.length} ภาพ + คัดลอกแคปชั่นแล้ว`);
  };
  root.append(h('div.st-ed', h('div.st-left', frame, warn), h('div.st-right', strip, tools)),
    h('div.st-export', h('button.btn.primary', { onclick: exportAll }, icon('share'), story ? 'แชร์สตอรี่ทั้งหมด' : 'แชร์ทุกหน้า + คัดลอกแคปชั่น'), h('button.btn', { onclick: () => { ed.tab = 'caption'; rerender(); } }, 'ดูแคปชั่น')));
  return root;
}

/** โหมดอ่านบท (ตัวอักษรเลื่อนเอง) */
function prompter(text) {
  let speed = 1, run = true, y = 0, raf;
  const body = h('div.tp-text', text);
  const ov = h('div.prompter', { role: 'dialog', 'aria-label': 'โหมดอ่านบท', tabindex: '-1' },
    h('div.tp-bar', h('button.st-btn', { 'aria-label': 'ช้าลง', onclick: () => { speed = Math.max(0.3, speed - 0.3); } }, '−'), h('button.st-btn', { 'aria-label': 'หยุด/เล่น', onclick: () => { run = !run; } }, icon('pause')), h('button.st-btn', { 'aria-label': 'เร็วขึ้น', onclick: () => { speed += 0.3; } }, '+'), h('button.st-btn', { 'aria-label': 'ปิด', onclick: () => { cancelAnimationFrame(raf); ov.remove(); } }, icon('close'))),
    h('div.tp-view', body));
  document.body.append(ov); ov.focus();
  const step = () => { if (run) { y += speed; body.style.transform = `translateY(${-y}px)`; } raf = requestAnimationFrame(step); };
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') { cancelAnimationFrame(raf); ov.remove(); } if (e.key === ' ') { e.preventDefault(); run = !run; } });
  setTimeout(() => { raf = requestAnimationFrame(step); }, 1200);
}
