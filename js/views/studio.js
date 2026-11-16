// ─── สตูดิโอคอนเทนต์ v2: เรื่องของวัน · บอร์ดงาน · ตัวแก้ไขภาพ (กราฟ/ตาราง/ไทม์ไลน์) · ประโยคเปิด 10 แบบ · โทนภาษา · ตรวจคำเสี่ยง ───
import { h, icon, sheet, closeSheet, choices, toast, copyText, fmt, todayISO, dateTH, empty, more } from '../ui.js';
import * as store from '../store.js';
import { PILLARS, IDEAS } from '../../data/content.js';
import { GLOSSARY } from '../../data/rules.js';
import { PLANS, PLAN, CAT } from '../../data/plans.js';
import { THEMES, KINDS, renderSlide, splitSlide, getPath, setPath, convertSlide, getSig } from '../carousel.js';
import { CATS, HOOKS, TONES, TONE_SWAP, RISKY } from '../../data/studio.js';
import { split503020, compoundCompare } from '../engine/calc.js';
import { profile, rerender } from '../app.js';
import { headline } from './planpage.js';
import { haptic } from '../pwa.js';

export const COLS = [['idea', 'ไอเดีย', 'bulb'], ['doing', 'กำลังทำ', 'pen'], ['ready', 'พร้อมโพสต์', 'check'], ['posted', 'โพสต์แล้ว', 'star']];
const PIL = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
const TAGS = { protect: '#ประกันสุขภาพ #วางแผนความคุ้มครอง', money: '#วางแผนการเงิน #ออมเงิน', biz: '#ผู้ประกอบการ #ฟรีแลนซ์', tech: '#AIช่วยงาน #การเงินยุคใหม่', story: '#ที่ปรึกษาการเงิน #เรื่องจริง' };
export const brandSet = () => store.getSettings().brand || {};
export const seriesName = () => brandSet().series || 'ออมรู้ 1 นาที';
const nextEp = () => store.all('content').filter((x) => x.deck?.series === seriesName()).length + 1;
const cta = () => ({ kind: 'cta', title: 'อยากรู้ว่าแบบไหนเหมาะกับคุณ?', body: 'ทักมาคุยได้ ไม่มีค่าใช้จ่ายในการปรึกษา · บันทึกโพสต์นี้ไว้ แล้วส่งให้คนที่ควรรู้' });
export const catOf = (it) => it.deck?.cat || ({ protect: 'protect', money: 'money', tech: 'ai', story: 'story', biz: 'money' }[it.pillar]) || 'money';
export const catColor = (it) => CATS[catOf(it)]?.color || PIL[it.pillar]?.color || 'var(--primary)';

// ── ตัวสร้างชุดสไลด์ ──
export const GEN = {
  idea(idea, pil) {
    return { tag: PIL[pil]?.name, slides: [{ kind: 'cover', kicker: PIL[pil]?.name || '', title: idea.hook, body: `${idea.points.length} ข้อที่ควรรู้ ปัดดูเลย` },
      ...idea.points.map((p, i) => ({ kind: 'point', num: i + 1, title: p, body: '' })), { kind: 'cta', title: idea.cta, body: 'บันทึกโพสต์นี้ไว้ แล้วแชร์ให้คนที่ควรรู้' }] };
  },
  salary(sal) {
    const s = split503020(sal); const exp = s.needs + s.wants;
    return { tag: 'เงินเดือน ' + fmt(sal), slides: [
      { kind: 'cover', kicker: 'วางแผนแบบทำตามได้จริง', title: `เงินเดือน ${fmt(sal)} จัดการยังไงดี?`, body: 'สูตร 50/30/20 + เงินสำรอง + งบประกัน', art: 'coins' },
      { kind: 'donut', title: 'แบ่งเป็น 3 ส่วน', parts: [{ l: `จำเป็น ${fmt(s.needs)} บาท`, v: 50 }, { l: `ใช้ตามใจ ${fmt(s.wants)} บาท`, v: 30 }, { l: `ออมก่อนใช้ ${fmt(s.save)} บาท`, v: 20 }], center: fmt(sal) },
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
  const d = { theme: brandSet().theme || 'aom', ...deck };
  if (!THEMES[d.theme]) d.theme = 'aom';
  if (series) { d.series = seriesName(); d.ep = nextEp(); }
  const it = store.put('content', { title: title || deck.slides[0]?.title || 'คอนเทนต์ใหม่', status, pillar, format, deck: d, date: '', tone: brandSet().tone2 || 'friend' });
  toast('เพิ่มเข้าสตูดิโอแล้ว'); return it;
}

// ── สไลด์ → ประโยคสรุป (ใช้ทำแคปชั่นและบทคลิป) ──
function sayOf(s) {
  switch (s.kind) {
    case 'list': case 'check': return [s.title, ...(s.items || [])];
    case 'stat': return [`${s.kicker || ''} ${s.value || ''} ${s.title || ''}`.trim()];
    case 'bar': return [s.title, ...(s.bars || []).slice(0, 3).map((b) => `${b.l}: ${b.t || fmt(+b.v || 0) + (s.unit ? ' ' + s.unit : '')}`)];
    case 'line': return [s.title, ...(s.series || []).map((x) => `${x.name}: ${fmt(x.pts?.at(-1) || 0)} ${s.unit || ''}`)];
    case 'donut': return [s.title, ...(s.parts || []).map((x) => `${x.l} ${x.v}%`)];
    case 'table': return [s.title, ...(s.rows || []).slice(0, 4).map((r) => r.join(' · '))];
    case 'timeline': return [s.title, ...(s.steps || []).map((x) => `${x.a}: ${x.t}`)];
    case 'myth': return [`หลายคนเชื่อว่า ${s.myth}`, `ความจริง: ${s.fact}`];
    case 'versus': return [s.title, `${s.a?.h}: ${(s.a?.items || []).join(', ')}`, `${s.b?.h}: ${(s.b?.items || []).join(', ')}`];
    case 'qa': return [`ถาม: ${s.q}`, `ตอบ: ${s.a}`];
    case 'quote': return [s.title];
    case 'point': return [s.title + (s.body ? ' — ' + s.body : '')];
    default: return [];
  }
}
const hashNum = (str) => [...String(str)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const fillTone = (t, p) => t.replace(/\{nick\}/g, (p.nick || p.name || '').replace(/^คุณ/, '').split(' ')[0] || 'เรา').replace(/\{me\}/g, '').replace(/\{kp\}/g, brandSet().particle ? ' ' + brandSet().particle : '');
function swapTone(text, tone) { for (const [a, b] of TONE_SWAP[tone] || []) text = text.split(a).join(b); return text; }
// ปรับเนื้อหาตรงกลางตามโทน (ไม่ใช้ AI): ความยาว การแบ่งบรรทัด ลำดับเลข และคำ
const BODY = {
  genz: { max: 56, cut: true, marks: ['✦', '→', '✔︎', '💡'] },
  work: { max: 90, cut: true },
  senior: { num: true, gap: true, swap: [['%', ' เปอร์เซ็นต์'], [' AI', ' เอไอ'], ['vs', 'เทียบกับ'], ['/', ' หรือ ']] },
  formal: { num: true, swap: [['เรา', 'ผู้อ่าน'], ['นะ', ''], ['เลย', ''], ['จ้า', ''], ['!', '']] },
  family: { swap: [['ตัวเอง', 'ตัวเองและครอบครัว']] },
};
const clip = (t, n) => { if (t.length <= n) return t; const cut = t.slice(0, n); const k = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(' — ')); return (k > n * 0.5 ? cut.slice(0, k) : cut).trim() + '…'; };
export function toneBody(lines, tk, bullet) {
  const B = BODY[tk] || {};
  return lines.map((x, i) => { let t = String(x); if (B.cut) t = t.split(' — ')[0]; if (B.max) t = clip(t, B.max); for (const [a, b2] of B.swap || []) t = t.split(a).join(b2); t = t.replace(/\s{2,}/g, ' ').trim();
    const mark = B.num ? `${i + 1}.` : B.marks ? B.marks[i % B.marks.length] : bullet; return `${mark} ${t}` + (B.gap ? '\n' : ''); });
}

/** แคปชั่นตามโทนภาษา */
export function toCaption(it, toneKey) {
  const tk = toneKey || it.tone || 'friend'; const T = TONES[tk] || TONES.friend; const p = profile(); const sl = it.deck.slides;
  const cov = sl.find((s) => s.kind === 'cover') || sl[0]; const end = sl.find((s) => s.kind === 'cta');
  const me = T.me.includes('{nick}') ? fillTone(T.me, p) : T.me; const open = fillTone(T.open[hashNum(it.id || it.title) % T.open.length], p).replace(/\{me\}/g, me);
  const pts = sl.filter((s) => !['cover', 'cta'].includes(s.kind)).flatMap((s) => { const a = sayOf(s); return s.kind === 'point' || s.kind === 'quote' || s.kind === 'stat' ? a : a.slice(0, 1).concat(a.slice(1, 4)); }).filter(Boolean).slice(0, 9);
  const mark = T.emoji === 2 ? '🔥 ' : T.emoji === 1 ? '📌 ' : '';
  const tags = (CATS[it.deck.cat]?.tags || TAGS[it.pillar] || '') + (it.deck.series ? ' #' + it.deck.series.replace(/\s/g, '') : '') + (p.brand ? ' #' + p.brand.replace(/\s/g, '') : '');
  const out = [mark + (cov?.title || ''), open.replace(/\{me\}/g, me), '', ...toneBody(pts, tk, T.bullet), '', fillTone(T.ask, p), end ? (T.emoji ? '👉 ' : '') + end.title : '', fillTone(T.close, p), '', tags,
    `—\n${p.name}${p.nick ? ' (' + p.nick + ')' : ''} · ${p.title}${p.licenseLife ? ' · ใบอนุญาตเลขที่ ' + p.licenseLife : ''}${p.line ? ' · LINE ' + p.line : ''}`];
  return swapTone(out.filter((x) => x !== null && x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n'), tk);
}
export function toScript(it, toneKey) {
  const tk = toneKey || it.tone || 'friend'; const T = TONES[tk] || TONES.friend; const p = profile();
  const sl = it.deck.slides; const cov = sl.find((s) => s.kind === 'cover') || sl[0]; const midS = sl.filter((s) => !['cover', 'cta'].includes(s.kind)); const end = sl.find((s) => s.kind === 'cta');
  const per = Math.max(3, Math.floor(24 / Math.max(1, midS.length)));
  let t = 3; const out = [`[0–3 วิ] ประโยคเปิด (มองกล้อง พูดทันที ไม่ต้องแนะนำตัว)\n"${cov?.title || ''}"\nข้อความบนจอ: ${cov?.title || ''}`];
  for (const s of midS) { const a = toneBody(sayOf(s).slice(0, 3), tk, '').map((x) => x.replace(/^\S+\s/, '').trim()); const say = a.join(' · '); const onScreen = s.kind === 'stat' ? s.value : ['bar', 'line', 'donut', 'table', 'timeline'].includes(s.kind) ? 'แสดงภาพ: ' + (KINDS[s.kind] || '') : headline(a[0] || '', 28);
    out.push(`[${t}–${t + per} วิ] ${say}\nข้อความบนจอ: ${onScreen}`); t += per; }
  out.push(`[${t}–${t + 5} วิ] ปิดท้าย\n"${end?.title || 'ทักมาคุยได้'} ${fillTone(T.close, p)}"\nข้อความบนจอ: ${p.line ? 'LINE ' + p.line : 'ทักมาคุย'}`);
  return swapTone(out.join('\n\n'), tk) + '\n\nเคล็ดลับ: อัดแนวตั้ง แสงเข้าหน้า เสียงชัด · ตัดต่อให้มีอะไรเปลี่ยนทุก 2–3 วินาที · ใส่คำบรรยายทุกคลิป';
}
/** ตรวจคำที่ควรระวัง → [{label, tip, found}] */
export function riskScan(it) {
  const text = [...it.deck.slides.flatMap((s) => [s.title, s.body, s.kicker, s.myth, s.fact, s.q, typeof s.a === 'string' ? s.a : '', s.note, ...(s.items || [])]), it.caption || ''].filter(Boolean).join('\n');
  return RISKY.map(([re, label, tip]) => { const m = text.match(re); return m ? { label, tip, found: m[0] } : null; }).filter(Boolean);
}
/** ประโยคเปิด 10 แบบจากหัวข้อ */
export function hooksFor(topic) { const t = (topic || 'เรื่องนี้').trim(); return HOOKS.map(([id, name, tpl, why, ev]) => ({ id, name, why, ev, options: tpl.map((x) => x.replace(/\{t\}/g, t)) })); }

// ── หน้าแรกสตูดิโอ ──
async function thumb(it, el, i = 0) { try { const r = await renderSlide(it.deck.slides[i], it.deck, i); el.src = r.canvas.toDataURL('image/jpeg', 0.6); } catch {} }
export function renderStudio() {
  const items = store.all('content').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const move = (it, d) => { const i = COLS.findIndex((c) => c[0] === (it.status || 'idea')); const n = COLS[i + d]; if (!n) return; store.put('content', { ...it, status: n[0], ...(n[0] === 'posted' ? { postedAt: it.postedAt || todayISO() } : {}) }); haptic(10);
    if (n[0] === 'posted') import('../fx.js').then((m) => m.celebrate?.()).catch(() => {}); };
  const card = (it) => { const img = h('img.sc-th', { alt: '' }); thumb(it, img);
    return h('div.sc-card', { style: { '--pc': catColor(it) } },
      h('a.sc-main', { href: '#/studio/' + it.id }, img, h('div', h('b', it.title), h('small', [CATS[it.deck?.cat]?.short || PIL[it.pillar]?.name, it.deck?.series ? `${it.deck.series} EP.${it.deck.ep}` : null, `${it.deck?.slides?.length || 0} หน้า`, it.date ? 'ตั้งโพสต์ ' + dateTH(it.date) : null].filter(Boolean).join(' · ')))),
      h('div.sc-acts', h('button.icon-btn', { 'aria-label': 'ย้ายไปช่องก่อนหน้า', disabled: (it.status || 'idea') === 'idea', onclick: () => move(it, -1) }, icon('back')),
        h('span.small.muted', it.postedAt ? dateTH(it.postedAt) : ''), h('button.icon-btn', { 'aria-label': 'ย้ายไปช่องถัดไป', disabled: it.status === 'posted', onclick: () => move(it, 1) }, icon('next')))); };
  // เรื่องของวัน (จากคลัง 365)
  const today = h('div.sd-today', h('div.sd-load', 'กำลังเปิดเรื่องของวันนี้…'));
  import('../library.js').then(async (L) => { const it = await L.itemOfDay(); if (!it) return; const C = CATS[it.c]; const deck = L.buildDeck(it, { theme: brandSet().theme });
    const im = h('img', { alt: 'ปกเรื่องของวันนี้' }); renderSlide(deck.slides[0], deck, 0).then((r) => { im.src = r.canvas.toDataURL('image/jpeg', 0.8); });
    const used = items.some((x) => x.deck?.lib === it.id);
    today.replaceChildren(h('div.sd-th', im), h('div.sd-tx', h('span.sd-k', { style: { '--pc': C.color } }, 'เรื่องของวันนี้ · ' + C.short), h('b', it.h), h('small', `${deck.slides.length} หน้า · มีประโยคเปิด แคปชั่น และบทคลิปให้แล้ว${used ? ' · เคยเปิดทำแล้ว' : ''}`),
      ), h('div.sd-acts', h('button.btn.primary', { onclick: () => { const x = createItem(deck, { title: it.h, pillar: it.c, status: 'doing' }); location.hash = '#/studio/' + x.id; } }, icon('pen'), 'เปิดทำเลย'), h('a.btn', { href: '#/studio/library' }, 'เลือกเรื่องอื่น'))); }).catch(() => today.replaceChildren(h('p.small.muted', 'เปิดคลังไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง')));
  const due = items.filter((x) => x.date && x.date <= todayISO() && x.status !== 'posted');
  const noStat = items.filter((x) => x.status === 'posted' && !x.stats).length;
  return h('div', { 'data-title': 'สตูดิโอ' },
    h('div.topbar', h('div', h('h1', 'สตูดิโอ'), h('div.sub', 'วันละเรื่อง เลือก แก้ โพสต์ แล้วกลับมาบันทึกผล')), h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'สร้าง')),
    today,
    h('div.sd-nav', h('a', { href: '#/studio/library' }, h('span', icon('book')), h('b', 'คลัง 365 เรื่อง')), h('a', { href: '#/studio/video' }, h('span', icon('play')), h('b', 'ตัดต่อคลิป')), h('a', { href: '#/studio/stats' }, h('span', icon('line')), h('b', 'ผลโพสต์'), noStat ? h('i', noStat) : null), h('a', { href: '#/studio/playbook' }, h('span', icon('bulb')), h('b', 'หลักที่ใช้')), h('a', { href: '#/studio/sign' }, h('span', icon('pen')), h('b', 'ลายเซ็น')), h('a', { href: '#/studio/covers' }, h('span', icon('target')), h('b', 'ปก IG')), h('a', { href: '#/brand' }, h('span', icon('star')), h('b', 'แบรนด์'))),
    due.length ? h('div.callout', { style: { margin: '12px 0' } }, h('b', `ถึงกำหนดโพสต์ ${due.length} งาน: `), due.slice(0, 3).map((x, i) => [i ? ' · ' : '', h('a', { href: '#/studio/' + x.id }, x.title)])) : null,
    h('div.section', h('div.row.between', h('h2', { style: { margin: 0 } }, 'งานของฉัน'), h('div.seg.sm-seg', [['board', 'บอร์ด'], ['cal', 'ปฏิทิน']].map(([k, l]) => h('button', { class: sv.view === k ? 'on' : '', onclick: () => { sv.view = k; rerender(); } }, l)))),
      sv.view === 'cal' ? studioCal(items) : items.length ? h('div.studio-board', COLS.map(([id, name, ic]) => { const list = items.filter((x) => (x.status || 'idea') === id);
      return h('div.sb-col', h('div.sb-h', icon(ic), h('b', name), h('span.muted', list.length)), list.map(card), !list.length ? h('div.small.muted.sb-empty', id === 'idea' ? 'กด "สร้าง" หรือเลือกจากคลัง' : '—') : null); }))
      : h('div.card', empty('ยังไม่มีงาน', 'pen', h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'สร้างงานแรก'), 'เริ่มจาก "เรื่องของวันนี้" ด้านบนได้เลย'))));
}

const sv = { view: 'board', ym: null };
function studioCal(items) {
  const t = new Date(); if (!sv.ym) sv.ym = [t.getFullYear(), t.getMonth()]; const [y, m] = sv.ym;
  const MON = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const byDay = {}; for (const it of items) { const d = it.status === 'posted' ? (it.postedAt || it.date) : it.date; if (d) (byDay[d] ||= []).push(it); }
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate(); const today = key(t);
  const go = (d) => { const n = new Date(y, m + d, 1); sv.ym = [n.getFullYear(), n.getMonth()]; rerender(); };
  const noDate = items.filter((x) => !x.date && x.status !== 'posted');
  return h('div', { style: { marginTop: '10px' } },
    h('div.row.between', { style: { marginBottom: '8px' } }, h('button.icon-btn', { onclick: () => go(-1), 'aria-label': 'เดือนก่อน' }, icon('back')), h('b', `${MON[m]} ${y + 543}`), h('button.icon-btn', { onclick: () => go(1), 'aria-label': 'เดือนถัดไป' }, icon('next'))),
    h('div.sc-cal', ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => h('div.sc-dow', d)), Array.from({ length: lead }, () => h('div.sc-day.pad')),
      Array.from({ length: days }, (_, i) => { const k = key(new Date(y, m, i + 1)); return h('div.sc-day', { class: k === today ? 'today' : '' }, h('span', i + 1), (byDay[k] || []).map((it) => h('a', { href: '#/studio/' + it.id, class: it.status === 'posted' ? 'posted' : '', style: { '--pc': catColor(it) }, title: it.title }, it.title))); })),
    noDate.length ? h('p.small.muted', { style: { marginTop: '10px' } }, `ยังไม่ได้ตั้งวันโพสต์ ${noDate.length} งาน · เปิดงานแล้วกดไอคอนปฏิทินเพื่อตั้งวัน`) : null);
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
    h('a.btn.primary.block', { href: '#/studio/library', onclick: () => closeSheet(true) }, icon('book'), 'เลือกจากคลัง 365 เรื่อง'),
    h('div.gen', h('div.gen-h', h('b', `ซีรีส์ "${seriesName()}" EP.${nextEp()}`), h('small', 'ปกหน้าตาเดียวกันทุกตอน คนจำแบรนด์ได้')), topic, h('button.btn', { onclick: () => { const t = topic.value.trim() || 'หัวข้อของตอนนี้'; open({ topic: t, slides: [{ kind: 'cover', kicker: seriesName(), title: t, body: 'เข้าใจใน 1 นาที' }, { kind: 'point', num: 1, title: 'ประเด็นที่ 1', body: '' }, { kind: 'point', num: 2, title: 'ประเด็นที่ 2', body: '' }, cta()] }, { title: t, series: true }); } }, 'สร้างตอนใหม่')),
    h('div.gen', h('div.gen-h', h('b', 'เงินเดือน ___ วางแผนยังไง'), h('small', 'ตัวเลขคำนวณจริงตามสูตร 50/30/20')), sal, h('button.btn', { onclick: () => open(GEN.salary(+sal.value || 25000), { pillar: 'money', title: `เงินเดือน ${fmt(+sal.value || 25000)} วางแผนยังไง` }) }, 'สร้าง')),
    h('div.gen', h('div.gen-h', h('b', 'ศัพท์ประกันวันละคำ'), h('small', `${GLOSSARY.length} คำจากคลังคำศัพท์`)), termSel, h('button.btn', { onclick: () => open(GEN.term(termSel.value), { pillar: 'protect', title: 'ศัพท์: ' + termSel.value }) }, 'สร้าง')),
    h('div.gen', h('div.gen-h', h('b', 'แผนนี้เหมาะกับใคร'), h('small', 'จากข้อมูลแผนจริง พร้อมข้อควรรู้')), planSel, h('button.btn', { onclick: () => open(GEN.plan(planSel.value), { pillar: 'protect', title: PLAN[planSel.value].short + ' เหมาะกับใคร' }) }, 'สร้าง')),
    h('div.gen', h('div.gen-h', h('b', 'พลังดอกเบี้ยทบต้น'), h('small', 'เริ่มอายุ 25 กับ 35 ต่างกันแค่ไหน')), h('div.row', { style: { gap: '8px' } }, cm, cr), h('button.btn', { onclick: () => open(GEN.compound({ monthly: +cm.value || 2000, rate: +cr.value || 4 }), { pillar: 'money', title: 'เริ่มออมเร็ว ต่างกันแค่ไหน' }) }, 'สร้าง')),
    h('details.more', h('summary', h('span', 'ไอเดียชุดเดิม'), icon('next')), h('div.more-in', ideaList)),
    h('button.btn.ghost', { onclick: () => open(GEN.blank(), {}) }, 'เริ่มจากหน้าเปล่า')) });
}

// ── แก้ข้อมูลกราฟ/ตาราง ──
function dataSheet(slide, onSave) {
  const s = structuredClone(slide); const body = h('div.stack'); const inp = (v, ph, fn, o = {}) => h('input.input', { value: v ?? '', placeholder: ph, 'aria-label': ph, ...o, oninput: (e) => fn(e.target.value) });
  const rowsOf = (key, cols, blank) => { const box = h('div.ds-rows'); const draw = () => box.replaceChildren(...(s[key] || []).map((r, i) => h('div.ds-row', ...cols.map(([f, ph, o]) => inp(r[f], ph, (v) => { r[f] = o?.type === 'number' ? +v || 0 : v; }, o || {})), h('button.icon-btn', { type: 'button', 'aria-label': 'ลบแถว', onclick: () => { s[key].splice(i, 1); draw(); } }, icon('close')))), h('button.btn.sm', { type: 'button', onclick: () => { (s[key] ||= []).push(structuredClone(blank)); draw(); } }, icon('plus'), 'เพิ่มแถว')); draw(); return box; };
  body.append(h('label.f', h('span', 'หัวข้อ'), inp(s.title, 'หัวข้อ', (v) => { s.title = v; })));
  if (s.kind === 'bar') body.append(rowsOf('bars', [['l', 'ชื่อแท่ง'], ['v', 'ตัวเลข', { type: 'number', inputmode: 'decimal' }]], { l: 'รายการใหม่', v: 10 }), h('label.f', h('span', 'หน่วย'), inp(s.unit, 'เช่น บาท', (v) => { s.unit = v; })));
  if (s.kind === 'donut') body.append(rowsOf('parts', [['l', 'ชื่อส่วน'], ['v', 'ตัวเลข', { type: 'number', inputmode: 'decimal' }]], { l: 'ส่วนใหม่', v: 10 }), h('label.f', h('span', 'ข้อความตรงกลาง'), inp(s.center, 'เช่น 25,000', (v) => { s.center = v; })));
  if (s.kind === 'timeline') body.append(rowsOf('steps', [['a', 'อายุ/ลำดับ'], ['t', 'หัวข้อ'], ['d', 'คำอธิบาย']], { a: '', t: 'ขั้นใหม่', d: '' }));
  if (s.kind === 'table') { const box = h('div'); const draw = () => box.replaceChildren(h('div.ds-grid', { style: { '--n': (s.cols || []).length } }, ...(s.cols || []).map((c, j) => inp(c, 'หัวคอลัมน์', (v) => { s.cols[j] = v; }, { class: 'hd' })), ...(s.rows || []).flatMap((r, i) => r.map((c, j) => inp(c, '—', (v) => { s.rows[i][j] = v; })))),
      h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } }, h('button.btn.sm', { type: 'button', onclick: () => { s.rows.push((s.cols || []).map(() => '')); draw(); } }, icon('plus'), 'แถว'), h('button.btn.sm', { type: 'button', disabled: s.rows.length <= 1, onclick: () => { s.rows.pop(); draw(); } }, icon('minus'), 'แถว'),
        h('button.btn.sm', { type: 'button', disabled: s.cols.length >= 4, onclick: () => { s.cols.push('คอลัมน์'); s.rows.forEach((r) => r.push('')); draw(); } }, icon('plus'), 'คอลัมน์'), h('button.btn.sm', { type: 'button', disabled: s.cols.length <= 2, onclick: () => { s.cols.pop(); s.rows.forEach((r) => r.pop()); draw(); } }, icon('minus'), 'คอลัมน์')),
      h('label.f', { style: { marginTop: '8px' } }, h('span', 'คอลัมน์ที่เน้น'), h('select.input', { onchange: (e) => { s.hi = e.target.value === '' ? undefined : +e.target.value; } }, h('option', { value: '' }, 'ไม่เน้น'), (s.cols || []).map((c, j) => h('option', { value: j, selected: s.hi === j }, c))))); draw(); body.append(box); }
  if (s.kind === 'line') { const csv = (a) => (a || []).join(', '); body.append(h('label.f', h('span', 'ป้ายแกนนอน (คั่นด้วย ,)'), inp(csv(s.xl), 'ปี 1, ปี 5, ปี 10', (v) => { s.xl = v.split(',').map((x) => x.trim()); })),
      ...(s.series || []).map((se, i) => h('div.ds-row2', h('label.f', h('span', `เส้นที่ ${i + 1}: ชื่อ`), inp(se.name, 'ชื่อเส้น', (v) => { se.name = v; })), h('label.f', h('span', 'ตัวเลข (คั่นด้วย ,)'), inp(csv(se.pts), '10, 20, 30', (v) => { se.pts = v.split(',').map((x) => +x.trim().replace(/,/g, '') || 0); })))), h('label.f', h('span', 'หน่วย'), inp(s.unit, 'เช่น บาท', (v) => { s.unit = v; }))); }
  if (s.kind === 'versus') for (const k of ['a', 'b']) { s[k] ||= { h: '', items: [] }; body.append(h('label.f', h('span', k === 'a' ? 'ฝั่งซ้าย: หัวข้อ' : 'ฝั่งขวา: หัวข้อ'), inp(s[k].h, 'หัวข้อ', (v) => { s[k].h = v; })), h('label.f', h('span', 'รายการ (บรรทัดละข้อ)'), h('textarea.input', { rows: 4, oninput: (e) => { s[k].items = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); } }, (s[k].items || []).join('\n')))); }
  if (['bar', 'line', 'donut', 'table'].includes(s.kind)) body.append(h('label.f', h('span', 'หมายเหตุใต้ภาพ'), inp(s.note, 'เช่น ตัวเลขสมมติ ไม่ใช่การรับประกันผลตอบแทน', (v) => { s.note = v; })), h('label.f', h('span', 'ที่มาของข้อมูล (ถ้ามี)'), inp(s.src, 'เช่น กระทรวงพาณิชย์', (v) => { s.src = v; })));
  body.append(h('button.btn.primary.block', { onclick: () => { closeSheet(true); onSave(s); } }, icon('check'), 'ใช้ข้อมูลนี้'));
  sheet({ title: 'แก้ข้อมูล: ' + (KINDS[s.kind] || ''), sub: 'ตัวเลขที่ใส่ต้องเป็นข้อมูลจริงหรือระบุว่าเป็นตัวอย่างสมมติ', body });
}
const STRUCT = ['bar', 'line', 'donut', 'table', 'timeline', 'versus'];
const STICKERS = ['ต้องรู้', 'เซฟไว้เลย', 'ทำตามได้จริง', 'จริงหรือ?', 'ส่งต่อให้คนที่ห่วง', 'ใหม่'];
const ARTS = [['', 'ไม่มี'], ['bars', 'กราฟ'], ['coins', 'เหรียญ'], ['shield', 'โล่'], ['heart', 'หัวใจ'], ['chat', 'แชต'], ['spark', 'ประกาย'], ['home', 'บ้าน'], ['clock', 'นาฬิกา']];

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
  const setStatus = (s2) => { save({ status: s2, ...(s2 === 'posted' ? { postedAt: it.postedAt || todayISO() } : {}) }, { hist: false }); if (s2 === 'posted') { import('../fx.js').then((m) => m.celebrate?.()).catch(() => {}); toast('โพสต์แล้ว! อีก 2–3 วันกลับมาบันทึกผลในหน้า "ผลโพสต์"'); } };
  const statusRow = h('div.chips.wrap', { style: { margin: '6px 0' } }, COLS.map(([s2, n]) => h('button.chip', { class: (it.status || 'idea') === s2 ? 'on' : '', 'aria-pressed': String((it.status || 'idea') === s2), onclick: () => setStatus(s2) }, n)),
    h('label.chip.st-date', icon('cal'), h('input', { type: 'date', value: it.date || '', 'aria-label': 'วันที่ตั้งใจโพสต์', onchange: (e) => save({ date: e.target.value }, { hist: false }) })));
  const tabs = h('div.seg', { style: { margin: '6px 0 12px' } }, [['carousel', 'ภาพหลายหน้า'], ['story', 'สตอรี่'], ['caption', 'แคปชั่น'], ['script', 'บทคลิป']].map(([k, l]) => h('button', { class: ed.tab === k ? 'on' : '', onclick: () => { ed.tab = k; rerender(); } }, l)));
  root.append(head, statusRow, tabs);
  const riskBox = h('div', { 'aria-live': 'polite' });
  const drawRisk = () => { const risks = riskScan(it); riskBox.replaceChildren(...(risks.length ? [h('div.callout.warn.small.st-risk', h('b', `คำที่ควรตรวจ ${risks.length} จุด`), h('ul', risks.map((r) => h('li', h('b', `"${r.found}" `), `${r.label} → ${r.tip}`))), h('p.xs.muted', 'ตัวช่วยกรองเบื้องต้น ยึดแนวทางของบริษัทและหน่วยงานกำกับเป็นหลัก'))] : [])); };
  drawRisk();
  if (ed.tab === 'caption' || ed.tab === 'script') {
    const key = ed.tab; const tone = it.tone || 'friend'; const gen = () => (key === 'caption' ? toCaption(it) : toScript(it));
    const ta = h('textarea.input.st-text', { rows: 16, 'aria-label': key === 'caption' ? 'แคปชั่น' : 'บทคลิป', onchange: (e) => { save({ [key]: e.target.value }, { hist: false }); drawRisk(); } }, it[key] || gen());
    root.append(h('div.card', h('div.q', h('span.ql', 'โทนภาษา'), choices('tone', tone, Object.entries(TONES).map(([k, v]) => [k, v.name]), { onChange: (v) => { save({ tone: v, caption: '', script: '' }, { hist: false }); } })),
      !brandSet().particle ? h('p.xs.muted', { style: { margin: '0 0 8px' } }, 'ตั้งคำลงท้าย ครับ/ค่ะ ได้ที่ ', h('a', { href: '#/brand' }, 'แบรนด์ของฉัน')) : null,
      ta, h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } },
        h('button.btn.primary', { onclick: () => copyText(ta.value) }, icon('copy'), 'คัดลอก'),
        h('button.btn', { onclick: () => { save({ [key]: '' }, { hist: false }); } }, icon('sync'), 'สร้างใหม่จากสไลด์'),
        key === 'script' ? h('button.btn', { onclick: () => prompter(ta.value) }, icon('play'), 'โหมดอ่านบท') : null,
        key === 'script' ? h('button.btn', { onclick: () => { save({ script: ta.value }, { hist: false }); location.hash = '#/studio/video?from=' + it.id; } }, icon('play'), 'ตัดต่อคลิปจากบทนี้') : null),
      h('p.small.muted', { style: { marginTop: '8px' } }, 'โทนภาษาปรับคำขึ้นต้น คำลงท้าย และคำชวนคุย · ใส่ชื่อและเลขใบอนุญาตให้แล้ว')), riskBox);
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
    warn.replaceChildren(...(r.overflow ? [h('div.callout.warn.small', { style: { marginTop: '8px' } }, 'ข้อความยาวเกินหน้านี้ ตัวอักษรย่อจนถึงขนาดเล็กสุดแล้ว ', h('button.btn.sm', { onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i, 1, ...splitSlide(d.slides[ed.i])); setDeck(d); } }, 'แยกเป็น 2 หน้า'))] : []));
  };
  img.addEventListener('click', (e) => {
    const rect = img.getBoundingClientRect(); const sc = rect.width / 1080; const X = (e.clientX - rect.left) / sc, Y = (e.clientY - rect.top) / sc;
    const inside = (q, pad) => X >= q.x - pad && X <= q.x + q.w + pad && Y >= q.y - pad && Y <= q.y + q.h + pad;
    const dist = (q) => Math.hypot(Math.max(q.x - X, 0, X - q.x - q.w), Math.max(q.y - Y, 0, Y - q.y - q.h));
    const b = blocks.find((q) => inside(q, 0)) || blocks.filter((q) => inside(q, 40)).sort((m, n) => dist(m) - dist(n))[0]; if (!b) return;
    const s = deck.slides[ed.i]; const val = getPath(s, b.key);
    const put = (v) => setPath(s, b.key, b.numeric ? (+String(v).replace(/[^\d.-]/g, '') || 0) : v);
    const ta = h('textarea.ig-edit', { 'aria-label': 'แก้ข้อความ', inputmode: b.numeric ? 'decimal' : null, style: { left: Math.max(0, Math.min(b.x * sc, rect.width - Math.max(b.w * sc, 90))) + 'px', top: b.y * sc + 'px', width: Math.max(b.w * sc, 90) + 'px', minHeight: Math.max(b.h, b.size * 1.3) * sc + 'px', fontSize: Math.max(12, b.size * sc) + 'px', fontFamily: b.serif ? 'Kanit' : 'Sarabun', fontWeight: b.weight } }, val ?? '');
    let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { put(ta.value); paint(); }, 160); });
    ta.addEventListener('blur', () => { put(ta.value); ta.remove(); setDeck(structuredClone(deck)); drawRisk(); });
    ta.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') ta.blur(); });
    stage.append(ta); ta.focus(); ta.select();
  });
  paint();
  const p = profile();
  const frame = story ? h('div.phone', stage) : h('div.ig-frame',
    h('div.ig-top', h('span.ig-av', (p.nick || p.name || 'A').replace(/^คุณ/, '')[0]), h('b', (p.brand || 'aomconnect').toLowerCase().replace(/\s/g, '')), icon('more')),
    stage, h('div.ig-bar', icon('heart'), icon('chat'), icon('share'), h('span.ig-dots', deck.slides.map((_, k) => h('i', { class: k === ed.i ? 'on' : '' })))));
  let dragFrom = null;
  const strip = h('div.st-strip', deck.slides.map((s, k) => { const t = h('img', { alt: '', draggable: 'false' }); renderSlide(s, deck, k, { story }).then((r) => { t.src = r.canvas.toDataURL('image/jpeg', 0.5); });
    return h('button.st-th', { class: k === ed.i ? 'on' : '', draggable: 'true', 'aria-label': `สไลด์ ${k + 1} (${KINDS[s.kind] || ''})`, onclick: () => { ed.i = k; rerender(); },
      ondragstart: () => { dragFrom = k; }, ondragover: (e) => e.preventDefault(), ondrop: (e) => { e.preventDefault(); if (dragFrom == null || dragFrom === k) return; const d = structuredClone(deck); const [m] = d.slides.splice(dragFrom, 1); d.slides.splice(k, 0, m); ed.i = k; setDeck(d); } }, t, h('small', k + 1)); }),
    h('button.st-th.add', { 'aria-label': 'เพิ่มสไลด์', onclick: () => addSlide() }, icon('plus')));
  const s = deck.slides[ed.i];
  const upd = (fn) => { const d = structuredClone(deck); fn(d.slides[ed.i], d); setDeck(d); };
  function addSlide() {
    const opts = [['point', 'ประเด็น', 'note'], ['list', 'รายการ', 'check'], ['bar', 'กราฟแท่ง', 'line'], ['line', 'กราฟเส้น', 'line'], ['donut', 'โดนัท %', 'target'], ['table', 'ตาราง', 'grid'], ['timeline', 'ไทม์ไลน์อายุ', 'clock'], ['myth', 'ความเชื่อ vs จริง', 'info'], ['versus', 'เทียบ 2 ฝั่ง', 'layers'], ['check', 'เช็กลิสต์', 'check'], ['qa', 'ถาม-ตอบ', 'chat'], ['quote', 'ประโยคเด่น', 'pen'], ['stat', 'ตัวเลขเด่น', 'star']];
    sheet({ title: 'เพิ่มสไลด์แบบไหน', body: h('div.kind-grid', opts.map(([k, l, ic]) => h('button.kind-i', { onclick: () => { closeSheet(true); const d = structuredClone(deck); d.slides.splice(ed.i + 1, 0, convertSlide({ title: 'หัวข้อใหม่', body: '' }, k)); ed.i++; setDeck(d); } }, h('span', icon(ic)), h('b', l)))) });
  }
  const hookSheet = () => { const topic = h('input.input', { value: deck.topic || '', placeholder: 'หัวข้อ เช่น เงินสำรองฉุกเฉิน', 'aria-label': 'หัวข้อ' }); const list = h('div.hook-list');
    const draw = () => list.replaceChildren(...hooksFor(topic.value).map((g) => h('div.hook-g', h('div.hook-h', h('b', g.name), h('span.tag', g.ev)), h('p.xs.muted', g.why), ...g.options.map((o) => h('button.hook-o', { onclick: () => { closeSheet(true); const d = structuredClone(deck); const c = d.slides.find((x) => x.kind === 'cover') || d.slides[0]; c.title = o; c.hl = ''; d.topic = topic.value; d.hookStyle = g.id; setDeck(d); save({ title: o }, { hist: false }); } }, o)))));
    topic.addEventListener('input', draw); draw();
    sheet({ title: 'ประโยคเปิด 10 แบบ', sub: 'เลือกแล้วใส่หน้าปกให้ทันที แก้ต่อได้', body: h('div.stack', h('label.f', h('span', 'หัวข้อของโพสต์นี้'), topic), list, h('a.small', { href: '#/studio/playbook', onclick: () => closeSheet(true) }, 'ดูที่มาของแต่ละสูตร')) }); };
  const tools = h('div.st-tools',
    h('div.row.wrap', { style: { gap: '6px' } },
      h('button.btn.sm', { 'aria-label': 'สไลด์ก่อนหน้า', disabled: ed.i === 0, onclick: () => { ed.i--; rerender(); } }, icon('back')),
      h('button.btn.sm', { 'aria-label': 'สไลด์ถัดไป', disabled: ed.i === deck.slides.length - 1, onclick: () => { ed.i++; rerender(); } }, icon('next')),
      h('select.input.sm-sel', { 'aria-label': 'รูปแบบสไลด์', onchange: (e) => upd((x, d) => { d.slides[ed.i] = convertSlide(x, e.target.value); }) }, Object.entries(KINDS).map(([k, l]) => h('option', { value: k, selected: s.kind === k }, l))),
      STRUCT.includes(s.kind) ? h('button.btn.sm.primary', { onclick: () => dataSheet(s, (ns) => upd((x, d) => { d.slides[ed.i] = ns; })) }, icon('grid'), 'แก้ข้อมูล') : null,
      ['list', 'check'].includes(s.kind) ? h('button.btn.sm', { onclick: () => upd((x) => { x.items = [...(x.items || []), 'ข้อใหม่']; }) }, icon('plus'), 'เพิ่มข้อ') : null),
    h('div.row.wrap', { style: { gap: '6px', marginTop: '6px' } },
      h('button.btn.sm', { disabled: ed.i === 0, onclick: () => { const d = structuredClone(deck); [d.slides[ed.i - 1], d.slides[ed.i]] = [d.slides[ed.i], d.slides[ed.i - 1]]; ed.i--; setDeck(d); } }, 'ย้ายซ้าย'),
      h('button.btn.sm', { disabled: ed.i === deck.slides.length - 1, onclick: () => { const d = structuredClone(deck); [d.slides[ed.i + 1], d.slides[ed.i]] = [d.slides[ed.i], d.slides[ed.i + 1]]; ed.i++; setDeck(d); } }, 'ย้ายขวา'),
      h('button.btn.sm', { onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i + 1, 0, structuredClone(d.slides[ed.i])); ed.i++; setDeck(d); } }, icon('copy'), 'ทำสำเนา'),
      h('button.btn.sm.danger', { 'aria-label': 'ลบสไลด์นี้', disabled: deck.slides.length <= 1, onclick: () => { const d = structuredClone(deck); d.slides.splice(ed.i, 1); ed.i = Math.max(0, ed.i - 1); setDeck(d); } }, icon('trash'))),
    h('div.small.muted', { style: { marginTop: '8px' } }, 'แตะข้อความหรือตัวเลขบนภาพเพื่อแก้ได้ทันที · ตัวอักษรย่อให้พอดีหน้าเอง'),
    s.kind === 'cover' ? h('button.btn.block', { style: { marginTop: '10px' }, onclick: hookSheet }, icon('bulb'), 'ประโยคเปิด 10 แบบ') : null,
    more('ตกแต่งหน้านี้ (ไฮไลต์ สติกเกอร์ ภาพประกอบ)',
      h('label.f', h('span', 'คำที่ระบายไฮไลต์ (ต้องเป็นคำที่อยู่ในหัวข้อ)'), h('input.input', { value: s.hl || '', placeholder: 'เช่น เงินล้าน', onchange: (e) => upd((x) => { x.hl = e.target.value.trim(); }) })),
      h('label.f', h('span', 'สติกเกอร์มุมบน'), h('input.input', { value: s.sticker || '', placeholder: 'เว้นว่างถ้าไม่ใช้', onchange: (e) => upd((x) => { x.sticker = e.target.value.trim(); }) })),
      h('div.chips.wrap', STICKERS.map((t) => h('button.chip', { onclick: () => upd((x) => { x.sticker = x.sticker === t ? '' : t; }) }, t))),
      s.kind === 'cover' ? h('div.q', { style: { marginTop: '8px' } }, h('span.ql', 'ภาพลายเส้นบนปก'), choices('art', s.art ?? deck.art ?? '', ARTS, { onChange: (v) => upd((x, d) => { x.art = v; if (!v) d.art = ''; }) })) : null),
    h('div.q', { style: { marginTop: '10px' } }, h('span.ql', 'สไตล์'), h('div.th-row', Object.entries(THEMES).map(([k, v]) => h('button.th-chip', { class: (deck.theme || 'aom') === k ? 'on' : '', 'aria-pressed': String((deck.theme || 'aom') === k), title: v.name, onclick: () => setDeck({ ...structuredClone(deck), theme: k }) }, h('i', { style: { background: v.bg, borderColor: v.accent } }, h('u', { style: { background: v.accent } })), h('span', v.name))))),
    h('label.row.small', { style: { marginTop: '6px' } }, h('input', { type: 'checkbox', checked: !!deck.series, onchange: (e) => setDeck({ ...structuredClone(deck), series: e.target.checked ? seriesName() : '', ep: e.target.checked ? (deck.ep || nextEp()) : '' }) }), `เป็นตอนของซีรีส์ "${seriesName()}"${deck.series ? ' EP.' + deck.ep : ''}`),
    h('label.row.small', { style: { marginTop: '6px' } }, h('input', { type: 'checkbox', checked: deck.sig !== false && !!getSig(), disabled: !getSig(), onchange: (e) => setDeck({ ...structuredClone(deck), sig: e.target.checked }) }), getSig() ? 'ใส่ลายเซ็นหน้าสุดท้าย' : ['ยังไม่มีลายเซ็น ', h('a', { href: '#/studio/sign' }, 'ไปทำลายเซ็น')]),
    h('button.btn.ghost.sm', { style: { marginTop: '8px' }, onclick: () => { store.saveSettings({ brand: { ...brandSet(), theme: deck.theme } }); toast('ตั้งเป็นสไตล์เริ่มต้นของงานใหม่แล้ว'); } }, 'ใช้สไตล์นี้กับงานใหม่ทุกงาน'));
  const exportAll = async () => {
    const cap = it.caption || toCaption(it); try { await navigator.clipboard.writeText(cap); } catch {}
    const files = []; for (let k = 0; k < deck.slides.length; k++) { const r = await renderSlide(deck.slides[k], deck, k, { story }); files.push(new File([await new Promise((res) => r.canvas.toBlob(res, 'image/png'))], `${it.title.slice(0, 20)}-${k + 1}.png`, { type: 'image/png' })); }
    try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text: cap }); toast('คัดลอกแคปชั่นไว้แล้ว วางในโพสต์ได้เลย'); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    for (const f of files) { const a = h('a', { href: URL.createObjectURL(f), download: f.name }); document.body.append(a); a.click(); a.remove(); await new Promise((r) => setTimeout(r, 200)); }
    toast(`บันทึก ${files.length} ภาพ + คัดลอกแคปชั่นแล้ว`);
  };
  root.append(h('div.st-ed', h('div.st-left', frame, warn), h('div.st-right', strip, tools, riskBox)),
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
