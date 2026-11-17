// ─── ตัดต่อคลิป: พูดหน้ากล้อง / เสียงพากย์ + กราฟิก → ซับทีละคำ ซูม ฉาก สติกเกอร์ เพลง เสียงประกอบ ป้ายท้าย → ไฟล์ 9:16 ───
import { h, icon, sheet, closeSheet, toast, dateTH, empty } from '../ui.js';
import * as store from '../store.js';
import { visLen, VSTYLES, SCENES, VSCENES, HOOKS, GRADES, MOODS, remapWords, remapEn, parseScript, speechFromScript, autoTime, readDur, timed, Player, drawFrame, timeline, loadFonts, preloadEmoji, pickMime, window_, segList, remapTimes, sanitize, renderEndcard, drawCover } from '../video/engine.js';
import { EMOJI, EMOJI_BY, emojiSrc, suggestEmoji } from '../../data/emoji.js';
import { GENRES, renderMusic, autoGenre } from '../video/music.js';
import { autoAll, TEMPLATES, findPlan } from '../video/smart.js';
import { SFX_NAMES } from '../video/sfx.js';
import { PLANS, PLAN } from '../../data/plans.js';
import { deriveSegs, silenceCuts, makeCaption, STEPS as AUTO_STEPS, WHY } from '../video/autoedit.js';
import { artCanvas, guessArt, ARTS_PEOPLE } from '../video/broll.js';
import { profile } from '../app.js';
import { copyText } from '../ui.js';

// ── เก็บโปรเจกต์ (ข้อมูลเล็กใน localStorage · คลิป/เสียง/ภาพใน IndexedDB ของเครื่องนี้) ──
// งานคลิปเก็บใน store (ซิงก์ข้ามเครื่องผ่าน Google Sheets ได้) · ไฟล์คลิปอยู่ในเครื่องที่ใส่เท่านั้น
const KEY = 'advdesk.v1.videos';
(function migrate() { try { const old = JSON.parse(localStorage.getItem(KEY) || 'null'); if (old && typeof old === 'object' && !Array.isArray(old) && Object.values(old).some((v) => v?.chunks)) { for (const p of Object.values(old)) if (p?.id && !store.get('videos', p.id)) store.put('videos', p); localStorage.setItem(KEY + '.migrated', JSON.stringify(old)); localStorage.removeItem(KEY); } } catch {} })();
const all = () => Object.fromEntries(store.all('videos').map((p) => [p.id, p]));
const getP = (id) => store.get('videos', id);
function saveP(p) { p.updatedAt = new Date().toISOString(); try { Object.assign(p, store.put('videos', JSON.parse(JSON.stringify(p)))); } catch { toast('พื้นที่เก็บในเครื่องเต็ม'); } }
function delP(id) { const p = getP(id); store.remove('videos', id); for (const k of [id, ...(p?.clips || []).map((c) => c.key), ...(p?.imgs || []).map((i) => i.key), ...(p?.sounds || []).map((i) => i.key)]) idb('delete', k).catch(() => {}); }
function idb(op, id, val) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('aom-video', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('media');
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => { const db = rq.result; const tx = db.transaction('media', op === 'get' ? 'readonly' : 'readwrite'); const s = tx.objectStore('media');
      const r = op === 'get' ? s.get(id) : op === 'put' ? s.put(val, id) : s.delete(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); };
  });
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const fmtT = (s) => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
const fmtS = (s) => (s == null ? '—' : s.toFixed(1));
const coarse = () => matchMedia('(pointer: coarse)').matches;

/** โปรเจกต์รุ่นแรก (ไฟล์เดียว) → รุ่นหลายคลิป */
function normalize(P) {
  if (!P.clips) { P.clips = P.hasMedia ? [{ id: 'main', key: P.id, name: P.mediaName || 'คลิป', dur: P.mediaDur || 0 }] : []; P.segs = P.hasMedia ? [{ clip: 'main', a: 0, b: P.mediaDur || 0 }] : []; }
  P.imgs ||= []; P.keep ||= {}; P.cuts ||= []; P.silence ||= { on: false, gap: 0.45 }; P.live ||= {}; if (P.target == null) P.target = 0; if (P.subMax == null) P.subMax = 18; if (P.enhance == null) P.enhance = true;
  if (P.silence.on && Object.keys(P.keep).length) { for (const c of P.clips) if (P.keep[c.id]) P.cuts.push(...silenceCuts(c, P.keep[c.id])); P.keep = {}; }
  if (P.music == null) P.music = 'auto'; if (P.musicVol == null) P.musicVol = 0.3; if (P.endcard == null) P.endcard = true; if (P.hook == null) P.hook = 'auto';
  return P;
}
function createProject({ mode, script = '', title = '', from = null, tpl = null }) {
  const p = normalize({ id: 'v' + uid(), title: title || (mode === 'cam' ? 'คลิปพูดหน้ากล้อง' : 'คลิปเสียงพากย์'), mode, audio: mode === 'voice' ? 'none' : 'file', script, chunks: parseScript(script), style: 'mini', grade: 'cine', credit: true, zoom: true, sfx: false, ticks: false, sfxVol: 0.8, musicVol: 0.12, trimHead: true, trimTail: true, res: 1080, readSpeed: 1, from, slideFrom: from, createdAt: new Date().toISOString(), tplRules: tpl?.rules || null });
  if (tpl?.hook) p.hook = tpl.hook;
  if (p.mode === 'voice' && p.chunks.length) p.chunks = autoTime(p.chunks, readDur(p.chunks, 1));
  saveP(p); return p;
}

// ── หน้ารวม ──
export function renderVideos(q = {}) {
  if (q.from) { const it = store.get('content', q.from); if (it) return import('./studio.js').then((S) => { const p = createProject({ mode: q.mode === 'voice' ? 'voice' : 'cam', script: speechFromScript(it.script || S.toScript(it)), title: it.title, from: it.id }); location.replace('#/studio/video/' + p.id); return h('div'); }); }
  const list = Object.values(all()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return h('div', { 'data-title': 'ตัดต่อคลิป' },
    h('div.topbar', h('div', h('h1', 'ตัดต่อคลิป'), h('div.sub', 'อัดหรือใส่คลิป แอปตัดให้จนจบ')), h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'คลิปใหม่')),
    h('div.vd-hero', h('button.vd-big', { onclick: () => { const p = createProject({ mode: 'cam' }); location.hash = '#/studio/video/' + p.id + '?rec=1'; } }, h('span', icon('play')), h('b', 'อัดคลิปในแอป'), h('small', 'ซับขึ้นสดตอนพูด แล้วแอปตัดต่อให้จนจบ')), h('button.vd-big.alt', { onclick: () => { const p = createProject({ mode: 'cam' }); location.hash = '#/studio/video/' + p.id + '?auto=1'; } }, h('span', icon('upload')), h('b', 'มีคลิปแล้ว ตัดให้เลย'), h('small', 'เลือกคลิปจากเครื่อง แอปตัดเงียบ ใส่ซับ เอฟเฟกต์ เพลงให้'))),
    h('div.vd-how', [['1', 'สื่อและบท', 'ใส่คลิป ให้แอปเขียนซับ หรือวางบทเอง'], ['2', 'จังหวะ', 'เช็กซับ แตะปรับจังหวะได้'], ['3', 'ตกแต่ง', 'กด "จัดให้อัตโนมัติ" แล้วแก้ตามชอบ'], ['4', 'ส่งออก', 'ได้ไฟล์ 9:16 + ภาพปก']].map(([n, b, s]) => h('div', h('i', n), h('b', b), h('small', s)))),
    h('h2.vd-sec', 'เริ่มจากแม่แบบ'),
    h('div.vd-tpls', TEMPLATES.map((t) => h('button.vd-tpl', { type: 'button', style: { '--a': VSTYLES[t.style].sw[1] }, onclick: () => tplSheet(t) }, h('b', t.name), h('small', t.sub)))),
    h('h2.vd-sec', 'คลิปของฉัน'),
    list.length ? h('div.vd-list', list.map((p) => h('div.vd-item',
      h('a', { href: '#/studio/video/' + p.id }, h('span.vd-ic', { style: { '--a': VSTYLES[p.style]?.sw[1] || '#a6192e', '--b': VSTYLES[p.style]?.sw[0] || '#eee' } }, icon(p.mode === 'cam' ? 'user' : 'chat')),
        h('div', h('b', p.title), h('small', [p.mode === 'cam' ? 'พูดหน้ากล้อง' : 'เสียงพากย์ + กราฟิก', VSTYLES[p.style]?.name, `${p.chunks.length} ช่วง`, timed(p.chunks) ? 'จัดจังหวะแล้ว' : 'ยังไม่จัดจังหวะ', p.updatedAt ? dateTH(p.updatedAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')))),
      h('button.icon-btn', { 'aria-label': 'ลบคลิป ' + p.title, onclick: () => { if (confirm('ลบโปรเจกต์นี้? (ไฟล์ต้นฉบับในเครื่องคุณยังอยู่)')) { delP(p.id); location.hash = '#/studio/video?r=' + Date.now(); } } }, icon('trash')))))
      : h('div.card', empty('ยังไม่มีคลิป', 'play', h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'เริ่มคลิปแรก'), 'หรือเลือกแม่แบบด้านบน หรือเปิดงานในสตูดิโอ แท็บ "บทคลิป" แล้วกด "ตัดต่อคลิปจากบทนี้"')),
    h('p.xs.muted', { style: { marginTop: '14px' } }, 'คลิป เสียง และภาพเก็บในเครื่องนี้เท่านั้น ไม่ซิงก์ขึ้นคลาวด์ · ซับอัตโนมัติใช้ Whisper ทำงานในเครื่อง · สติกเกอร์ Fluent Emoji (Microsoft, MIT) · เพลงและเสียงประกอบสร้างในแอป ไม่ติดลิขสิทธิ์'));
}

function modePicker(cur, onPick) {
  return h('div.vd-modes', [['cam', 'user', 'พูดหน้ากล้อง', 'ถ่ายคลิปตัวเองพูด แอปใส่ซับ ซูม สติกเกอร์ เพลงให้'], ['voice', 'chat', 'เสียงพากย์ + กราฟิก', 'ไม่ต้องออกกล้อง อัดเสียงหรือไม่ใส่เสียง ฉากกราฟิกตามบท']].map(([k, ic, b, s]) => h('button.vd-mode', { type: 'button', class: k === cur ? 'on' : '', onclick: (e) => { onPick(k); [...e.currentTarget.parentNode.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, h('span', icon(ic)), h('b', b), h('small', s))));
}
function newSheet() {
  const items = store.all('content').filter((x) => x.deck).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 12);
  let mode = 'cam', src = '';
  const pick = (e) => { src = e.currentTarget.dataset.s; [...e.currentTarget.parentNode.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); };
  const go = async () => {
    let script = '', title = '';
    if (src) { const it = store.get('content', src); const S = await import('./studio.js'); script = speechFromScript(it.script || S.toScript(it)); title = it.title; }
    const p = createProject({ mode, script, title, from: src || null }); closeSheet(true); location.hash = '#/studio/video/' + p.id;
  };
  sheet({ title: 'คลิปใหม่', sub: 'ตัดต่อคลิป', body: h('div', modePicker(mode, (k) => { mode = k; }),
    h('h3.vd-h3', { style: { marginTop: '14px' } }, 'บทพูด'),
    h('div.vd-src', h('button.chip.on', { type: 'button', 'data-s': '', onclick: pick }, 'บทว่าง / ให้แอปเขียนซับจากเสียง'), items.map((it) => h('button.chip', { type: 'button', 'data-s': it.id, onclick: pick }, it.title.slice(0, 32)))),
    h('div.row', { style: { marginTop: '16px', justifyContent: 'flex-end' } }, h('button.btn.primary', { onclick: go }, 'เริ่มทำ', icon('next')))) });
}
function tplSheet(t) {
  let mode = 'cam'; const inputs = {};
  const body = h('div', h('p.small.muted', { style: { marginTop: 0 } }, 'กรอกสั้น ๆ แอปจะเรียงเป็นบท พร้อมฉากและสติกเกอร์ให้ แล้วคุณแค่อ่านตามบทตอนถ่าย/อัดเสียง'),
    t.fields.map(([k, l, ph]) => h('label.vd-field', h('span', l), inputs[k] = h('input.input', { placeholder: 'เช่น ' + ph }))),
    h('h3.vd-h3', { style: { marginTop: '12px' } }, 'แบบคลิป'), modePicker(mode, (k) => { mode = k; }),
    h('div.row', { style: { marginTop: '16px', justifyContent: 'flex-end' } }, h('button.btn.primary', { onclick: () => {
      const f = Object.fromEntries(t.fields.map(([k, , ph]) => [k, inputs[k].value.trim() || ph]));
      const p = createProject({ mode, script: t.build(f).join('\n'), title: t.name + ': ' + (f[t.fields[0][0]] || '').slice(0, 30), tpl: t }); closeSheet(true); location.hash = '#/studio/video/' + p.id; } }, 'สร้างบท', icon('next'))));
  sheet({ title: t.name, sub: 'แม่แบบคลิป', body });
}

// ── หน้าแก้ไข ──
let M = null; // { id, node, player, urls, imgUrls }
window.addEventListener('hashchange', () => { if (M && !location.hash.startsWith('#/studio/video/' + M.id)) { M.player?.pause(); M.stopRec?.(); } });

export async function renderVideoEditor(id, q = {}) {
  if (M && M.id === id && M.node) return M.node;
  if (M) { M.player?.destroy(); Object.values(M.urls || {}).forEach((u) => URL.revokeObjectURL(u)); Object.values(M.imgUrls || {}).forEach((u) => URL.revokeObjectURL(u)); M = null; }
  const raw = getP(id);
  if (!raw) return h('div.card', empty('ไม่พบโปรเจกต์นี้', 'play', h('a.btn', { href: '#/studio/video' }, 'กลับหน้ารวม')));
  const P = normalize(raw);
  M = { id, urls: {}, imgUrls: {} };
  const kind = P.mode === 'cam' ? 'video' : 'audio';
  const save = () => { saveP(P); M.player?.refresh(); };

  // ── ตัวอย่าง ──
  const cv = h('canvas.vd-cv', { width: 540, height: 960, 'aria-label': 'ตัวอย่างคลิป' });
  const playBtn = h('button.vd-play', { 'aria-label': 'เล่น/หยุด', onclick: () => togglePlay() }, icon('play'));
  const scrub = h('input.vd-scrub', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'เลื่อนเวลา', oninput: (e) => { const [a, , z] = M.player.win; M.player.pause(); setPlayIcon(false); M.player.seek(a + (z - a) * e.target.value / 1000); } });
  const tLabel = h('span.vd-time', '0:00 / 0:00');
  const preview = h('div.vd-prev', h('div.vd-frame', cv, h('div.vd-safe', { 'aria-hidden': 'true' })), h('div.vd-ctl', playBtn, scrub, tLabel));
  const setPlayIcon = (on) => playBtn.replaceChildren(icon(on ? 'pause' : 'play'));
  function togglePlay() {
    const pl = M.player; if (!pl) return;
    if (pl.playing) { pl.pause(); setPlayIcon(false); return; }
    pl.refresh(); const [a, , z] = pl.win; const from = pl.t >= z - 0.05 || pl.t < a ? a : pl.t;
    pl.play(from); setPlayIcon(true);
  }

  // ── สื่อ ──
  async function probeDur(url) { const el = document.createElement(kind); el.preload = 'metadata'; el.src = url; await new Promise((r) => { el.onloadedmetadata = r; el.onerror = r; setTimeout(r, 6000); }); const d = isFinite(el.duration) ? el.duration : 0; const ok = d > 0 && (kind === 'audio' || el.videoWidth > 0); el.removeAttribute('src'); return { d, ok }; }
  async function attachMedia() {
    for (const u of Object.values(M.urls)) URL.revokeObjectURL(u); M.urls = {}; M.bad = null; M.missing = [];
    for (const c of P.clips) {
      const blob = await idb('get', c.key).catch(() => null); if (!blob) { M.missing.push(c); continue; }
      const url = URL.createObjectURL(blob); const { d, ok } = await probeDur(url);
      if (!ok) { M.bad = c; URL.revokeObjectURL(url); continue; }
      M.urls[c.id] = url; if (!c.dur || Math.abs(c.dur - d) > 0.05) { if (c.out == null || c.out > d) c.out = undefined; c.dur = +d.toFixed(2); }
    }
    const miss = new Set(M.missing.map((c) => c.id)); P.segs = P.segs.filter((s) => s.b > s.a + 0.05 && (M.urls[s.clip] || miss.has(s.clip)));
    if (!P.segs.length && P.clips.length) P.segs = deriveSegs(P).filter((s) => M.urls[s.clip] || miss.has(s.clip));
    if (!M.player) { M.player = new Player(cv, P, M.urls, kind); M.player.onTime = (t) => { const [a, , z] = M.player.win; tLabel.textContent = `${fmtT(t - a)} / ${fmtT(z - a)}`; if (document.activeElement !== scrub) scrub.value = Math.round(((t - a) / Math.max(0.01, z - a)) * 1000); }; M.player.onEnd = () => setPlayIcon(false); }
    else M.player.setUrls(M.urls);
    if (!M.missing.length) saveP(P); M.player.refresh(); await M.player.seek(M.player.win[0]);
    ensureAssets();
  }
  /** ใช้ช่วงคลิปใหม่ + ย้ายเวลาซับตามเสียงเดิม */
  function applySegs() { const old = segList(P); P.segs = deriveSegs(P).filter((s) => M.urls[s.clip]); const nw = segList(P); if (old.length && timed(P.chunks)) { P.chunks = remapTimes(P.chunks, old, nw); if (P.words) P.words = remapWords(P.words, old, nw); if (P.enSegs) P.enSegs = remapEn(P.enSegs, old, nw); } save(); M.player.seek(Math.min(M.player.t, M.player.win[2])); ensureMusic(); }

  // ── ของประกอบ: สไลด์ ภาพแทรก ป้ายท้าย เพลง ตัวตัดฉากหลัง ──
  let deckCache = null;
  async function deck() { if (!P.slideFrom) return null; if (deckCache?.id === P.slideFrom) return deckCache.deck; const it = store.get('content', P.slideFrom); deckCache = { id: P.slideFrom, deck: it?.deck || null }; return deckCache.deck; }
  async function slideImg(i) {
    if (M.player.ext.slides[i]) return M.player.ext.slides[i];
    const d = await deck(); if (!d?.slides?.[i]) return null; const { renderSlide } = await import('../carousel.js'); const r = await renderSlide(d.slides[i], d, i); M.player.ext.slides[i] = r.canvas; return r.canvas;
  }
  async function ensureAssets() {
    const used = [...new Set(P.chunks.filter((c) => c.scene === 'slide' && c.slide != null).map((c) => c.slide))];
    await Promise.all(used.map((i) => slideImg(i).catch(() => null)));
    for (const im of P.imgs) if (!M.player.ext.imgs[im.id]) { const b = await idb('get', im.key).catch(() => null); if (!b) continue; const u = URL.createObjectURL(b); M.imgUrls[im.id] = u; const el = new Image(); el.src = u; await el.decode().catch(() => {}); M.player.ext.imgs[im.id] = el; }
    const pids = [...new Set(P.chunks.filter((c) => c.scene === 'poster' && c.poster).map((c) => c.poster))];
    if (pids.length) { const PS = await import('../poster.js'); await PS.preparePoster(); for (const id of pids) if (!M.player.ext.posters?.[id] && PS.posterData(id)) { (M.player.ext.posters ||= {})[id] = PS.drawPoster(document.createElement('canvas'), PS.posterData(id), { layout: 'cards', size: 'feed' }); } }
    for (const sd of P.sounds || []) if (!M.player.ext.sounds?.[sd.id]) { const b = await idb('get', sd.key).catch(() => null); if (b) { try { (M.player.ext.sounds ||= {})[sd.id] = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await b.arrayBuffer()); } catch {} } }
    await preloadEmoji([...P.chunks.map((c) => c.emoji), '1f4b5', '1f4b8']);
    if (P.chunks.some((c) => c.scene === 'cut')) import('../video/segment.js').then((S) => S.load()).then(() => { if (!M.player.playing) M.player.draw(); }).catch((e) => toast(e.message || 'ตัดฉากหลังไม่ได้'));
    ensureEndcard(); ensureMusic(); if (!M.player.playing) M.player.draw();
  }
  let ecKey = '';
  async function ensureEndcard() { if (!P.endcard) return; const k = P.style + JSON.stringify(store.getSettings().profile || {}); if (k === ecKey && M.player.ext.endcard) return; ecKey = k; M.player.ext.endcard = await renderEndcard(P).catch(() => null); if (!M.player.playing) M.player.draw(); }
  let muKey = '', muT = null;
  function ensureMusic() {
    clearTimeout(muT); muT = setTimeout(async () => {
      if (!P.music || P.music === 'off') { M.player.setMusic(null); return; }
      const g = P.music === 'auto' ? autoGenre(P) : P.music; const [a, , z] = window_(P); const d = Math.ceil(z - a + 0.5); const k = g + d;
      if (k === muKey) return; muKey = k; try { M.player.setMusic(await renderMusic(g, d)); } catch { M.player.setMusic(null); }
    }, 250);
  }

  // ── ขั้นตอน ──
  const STEPS = [['media', 'สื่อและบท'], ['sync', 'จังหวะ'], ['look', 'ตกแต่ง'], ['out', 'ส่งออก']];
  let step = P.chunks.length && (P.clips.length || P.mode === 'voice') ? (timed(P.chunks) ? 'look' : 'sync') : 'media';
  const stepNav = h('div.vd-steps', { role: 'tablist' });
  const panel = h('div.vd-panel');
  const titleIn = h('input.vd-title', { value: P.title, 'aria-label': 'ชื่อคลิป', onchange: (e) => { P.title = e.target.value.trim() || P.title; save(); } });
  function paintSteps() { stepNav.replaceChildren(...STEPS.map(([k, l], i) => h('button', { role: 'tab', 'aria-selected': String(k === step), class: k === step ? 'on' : '', onclick: () => go(k) }, h('i', i + 1), l))); }
  function go(k) { if (M.tapOn) return; step = k; paintSteps(); paintPanel(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function paintPanel() { panel.replaceChildren(({ media: stepMedia, sync: stepSync, look: stepLook, out: stepOut })[step]()); }
  const next = (k, label) => h('div.vd-next', h('button.btn.primary', { onclick: () => go(k) }, label, icon('next')));
  const chunkText = (c) => c.words.map((w) => (w.key ? h('b', w.w) : w.w));
  const rebuildScript = () => { const lines = []; for (const c of P.chunks) { (lines[c.line] ||= []).push(c.words.map((w) => (w.key ? `*${w.w}*` : w.w)).join('')); } P.script = lines.filter(Boolean).map((l) => l.join(' ')).join('\n'); };

  // ── 1. สื่อและบท ──
  async function useFiles(files, { replace = false, quiet = false, keep = false } = {}) {
    const { probe, toMp4 } = await import('../video/convert.js'); const added = [];
    for (let f of files) {
      if (f.size > 300 * 1024 * 1024) { toast(f.name + ' ใหญ่เกิน 300MB'); continue; }
      if (!(await probe(f, kind))) {
        if (f.size > 200 * 1024 * 1024) { toast(f.name + ' เปิดไม่ได้ และใหญ่เกินกว่าจะแปลงในเครื่อง'); continue; }
        const stage = h('p.small', 'เตรียมแปลงไฟล์…'), bar = h('div.vd-bar.on', h('i'));
        sheet({ title: 'แปลงไฟล์ให้เปิดได้', sub: f.name, body: h('div', h('p.small.muted', `ไฟล์ .${(f.name.split('.').pop() || '').toLowerCase()} นี้ Chrome เปิดเล่นไม่ได้ แอปจะแปลงเป็น MP4 ให้ในเครื่อง (ไม่อัปโหลดไปไหน) อย่าปิดหน้านี้`), stage, bar) });
        try { f = await toMp4(f, { kind, onStage: (t) => { stage.textContent = t; }, onProgress: (p) => { bar.firstChild.style.width = Math.round(p * 100) + '%'; stage.textContent = 'กำลังแปลงไฟล์ในเครื่อง… ' + Math.round(p * 100) + '%'; } }); closeSheet(true); }
        catch (err) { closeSheet(true); toast('แปลงไฟล์ไม่สำเร็จ: ' + (err.message || err)); continue; }
      }
      let c = replace ? P.clips.find((x) => x.id === replace) : null;
      if (!c) { c = { id: 'c' + uid(), key: P.id + ':' + uid(), name: f.name }; if (P.mode === 'voice') { P.clips.forEach((x) => idb('delete', x.key).catch(() => {})); P.clips = []; } P.clips.push(c); }
      if (!keep) { c.name = f.name; c.dur = 0; c.in = undefined; c.out = undefined; }
      try { await idb('put', c.key, f); } catch { toast('เก็บไฟล์ในเครื่องไม่ได้ (พื้นที่ไม่พอ?)'); return; }
      if (!keep) { delete P.keep[c.id]; P.cuts = P.cuts.filter((x) => x.clip !== c.id); } added.push(c);
    }
    const old = segList(P); await attachMedia(); if (!keep) { P.segs = deriveSegs(P).filter((s) => M.urls[s.clip]);
    if (old.length && timed(P.chunks)) P.chunks = remapTimes(P.chunks, old, segList(P)); }
    save(); await M.player.seek(M.player.win[0]); paintPanel(); if (!quiet) toast('เพิ่มไฟล์แล้ว');
    if (added.length && (q.auto || P.autoMode) && !quiet) { P.autoMode = true; save(); autoSheet(); }
    return added;
  }
  async function recordNow() {
    const R = await import('../video/recorder.js');
    const r = await R.openRecorder({ script: P.script || '' }); if (!r) return;
    const [c] = await useFiles([r.file], { quiet: true }); if (!c) return;
    if (r.liveOk) P.live[c.id] = r.live; save();
    autoSheet({ startNow: true, live: r.liveOk });
  }
  const asrEnv = async (extra = {}) => { const [A, R, S] = await Promise.all([import('../video/audio.js'), import('../video/asr.js'), import('../video/subs.js')]); return { getBlob: (c) => idb('get', c.key), urls: M.urls, A, R, S, parseScript, ...extra }; };
  const modelPicker = (state) => { const box = h('div'); import('../video/asr.js').then(({ ASR_MODELS, defaultModel }) => { state.model ||= defaultModel(); box.replaceChildren(h('div.vd-models', Object.entries(ASR_MODELS).map(([k, m]) => h('button.vd-model', { type: 'button', class: k === state.model ? 'on' : '', onclick: (e) => { state.model = k; [...e.currentTarget.parentNode.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, h('b', m.name), h('small', `${m.size} · ${m.sub}`))))); }); return box; };
  async function autoSheet({ startNow = false } = {}) {
    const hasLive = P.clips.length > 0 && P.clips.every((c) => P.live[c.id]?.length);
    const st = { model: null }; const opt = { cutSilence: true, cutRetake: false, cutFiller: false, useScript: false, en: (P.subLang || 'th') !== 'th' };
    const ck = (key, label, sub) => h('label.vd-tg', h('input', { type: 'checkbox', checked: opt[key], onchange: (e) => { opt[key] = e.target.checked; } }), h('span', h('b', label), sub ? h('small', sub) : null));
    const lenSeg = h('div.seg', [[0, 'ไม่จำกัด (เก็บทุกคำ)'], [15, '15 วิ'], [30, '30 วิ'], [60, '60 วิ']].map(([v, l]) => h('button', { class: P.target === v ? 'on' : '', onclick: (e) => { P.target = v; save(); [...lenSeg.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, l)));
    const list = h('ol.vd-autosteps', AUTO_STEPS.map(([k, l]) => h('li', { 'data-k': k }, h('i'), h('span', l), h('small'))));
    const bar = h('div.vd-bar', h('i')); const go2 = h('button.btn.primary.vd-export', { onclick: run }, icon('bulb'), 'ตัดต่อให้เลย');
    sheet({ title: 'ตัดต่อให้เลย', sub: 'ซับครบทุกคำ ตรงจังหวะพูด', body: h('div',
      h('p.small', { style: { marginTop: 0 } }, h('b', 'โมเดลถอดเสียงภาษาไทย'), hasLive ? ' (ใช้ซับสดตอนอัดช่วยเรื่องตัวสะกดด้วย)' : ''), modelPicker(st),
      h('p.small', h('b', 'ซับ')), ck('en', 'ใส่ซับภาษาอังกฤษด้วย', 'แปลทีละประโยค ตรวจแก้ได้ก่อนโพสต์'),
      h('p.small', h('b', 'ให้แอปตัดอะไรออกบ้าง')), ck('cutSilence', 'ช่วงเงียบ', 'เหลือจังหวะหายใจไว้ ไม่ตัดกลางคำ'), ck('cutRetake', 'พูดซ้ำ / เทคเสีย', 'ปิดไว้ = เก็บทุกคำที่พูด'), ck('cutFiller', 'คำเติม เอ่อ อ่า'),
      (P.script || '').trim() && !P.autoEdited ? ck('useScript', 'ใช้บทของฉันเป็นซับ', 'ตัวสะกดตามบท 100% แอปจับเวลาจากเสียงให้') : null,
      h('p.small', h('b', 'ความยาวคลิป')), lenSeg, list, bar, go2, h('p.xs.muted', 'ครั้งแรกต้องโหลดโมเดล (ต่อ Wi-Fi) · ทำในเครื่อง ไม่ส่งเสียงไปไหน · อย่าปิดหน้านี้ระหว่างทำ')) });
    if (startNow) setTimeout(run, 400);
    async function run() {
      go2.disabled = true; bar.classList.add('on'); let cur = null;
      const mark = (k, text, p) => { const li = list.querySelector(`[data-k="${k}"]`); if (cur && cur !== li) cur.className = 'done'; cur = li; li.className = 'run'; if (text) li.querySelector('small').textContent = text; if (p != null) { bar.classList.toggle('busy', p < 0); bar.firstChild.style.width = p < 0 ? '100%' : Math.round(p * 100) + '%'; } };
      try {
        const AE = await import('../video/autoedit.js'); const d = await deck();
        const sum = await AE.autoEdit(P, await asrEnv({ onStep: mark, target: P.target, model: st.model, canCut: (navigator.hardwareConcurrency || 4) >= 6, slideKinds: d?.slides?.map((x) => x.kind) || [], profile: profile(), ...opt }));
        if (opt.en) { list.append(h('li', { 'data-k': 'en' }, h('i'), h('span', 'แปลซับเป็นภาษาอังกฤษ'), h('small'))); const T = await import('../video/translate.js'); try { await T.translateProject(P, { onStatus: (t) => mark('en', t), onProgress: (p) => mark('en', null, p) }); P.subLang = 'both'; } catch (e) { console.error(e); toast('แปลภาษาอังกฤษไม่สำเร็จ ลองใหม่ได้ในขั้นจังหวะ'); } }
        if (cur) cur.className = 'done';
        P.autoDone = true; P.autoMode = false; save(); M.player.ext.slides = {}; await ensureAssets(); await M.player.seek(M.player.win[0]);
        closeSheet(true); step = 'sync'; paintSteps(); paintPanel();
        toast(`เสร็จแล้ว · ซับ ${sum.words} คำ ${sum.subs} ช่วง · ตัดเงียบ ${sum.cut.toFixed(1)} วิ${sum.retake ? ` · เทคซ้ำ ${sum.retake}` : ''} — ตรวจคำผิดได้เลย`);
      } catch (e) { console.error(e); if (cur) cur.className = 'err'; go2.disabled = false; bar.classList.remove('on'); toast('ทำไม่สำเร็จ: ' + (e.message || e)); }
    }
  }
  function stepMedia() {
    const box = h('div');
    const fileIn = h('input', { type: 'file', multiple: P.mode === 'cam', accept: P.mode === 'cam' ? 'video/*,.avi,.mkv,.mov,.wmv,.3gp,.flv,.mts,.m4v' : 'audio/*,.m4a,.aac,.wav,.ogg,.amr,.wma', hidden: true, onchange: (e) => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) useFiles(fs); } });
    const missBox = M.missing?.length ? h('div.vd-bad', icon('info'), h('span', h('b', `ไฟล์คลิป ${M.missing.length} ไฟล์อยู่ในอีกเครื่อง`), h('small', 'งานซิงก์มาแล้ว แต่ไฟล์คลิปไม่ซิงก์ — เลือกไฟล์เดิมจากเครื่องนี้เพื่อทำต่อ (จุดตัดและซับยังอยู่ครบ)')), h('div.row.wrap', { style: { gap: '6px' } }, M.missing.map((c) => { const inp = h('input', { type: 'file', accept: kind === 'video' ? 'video/*' : 'audio/*', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; if (f) useFiles([f], { replace: c.id, keep: true }); } }); return h('label.btn.sm', inp, icon('upload'), c.name.slice(0, 18)); }))) : null;
    const badBox = M.bad ? h('div.vd-bad', icon('info'), h('span', h('b', (M.bad.name || 'ไฟล์นี้') + ' เปิดเล่นไม่ได้'), h('small', 'เบราว์เซอร์ไม่รองรับไฟล์แบบนี้ (เช่น .avi) กดแปลงเป็น MP4 ในเครื่องได้เลย')), h('button.btn.primary', { onclick: async () => { const b = await idb('get', M.bad.key).catch(() => null); if (b) useFiles([b instanceof File ? b : new File([b], M.bad.name || 'clip.avi', { type: b.type })], { replace: M.bad.id }); } }, 'แปลงไฟล์')) : null;
    if (P.mode === 'cam') {
      const rows = P.clips.map((c, i) => h('div.vd-clip', { class: M.urls[c.id] ? '' : 'bad' },
        h('i', i + 1), h('div.vd-clip-m', h('b', c.name), h('small', M.urls[c.id] ? `ยาว ${fmtT(c.dur)}` : 'เปิดไม่ได้'),
          M.urls[c.id] ? h('div.vd-trim', h('label', 'เริ่ม', h('input.input', { type: 'number', step: 0.1, min: 0, max: c.dur, value: c.in ?? 0, onchange: (e) => { c.in = Math.max(0, Math.min(+e.target.value || 0, (c.out ?? c.dur) - 0.5)); applySegs(); } })), h('label', 'จบ', h('input.input', { type: 'number', step: 0.1, min: 0, max: c.dur, value: +(c.out ?? c.dur).toFixed(1), onchange: (e) => { c.out = Math.min(c.dur, Math.max(+e.target.value || c.dur, (c.in ?? 0) + 0.5)); applySegs(); } })), h('small.muted', 'วินาที')) : null),
        h('div.vd-clip-a', h('button.icon-btn', { 'aria-label': 'เลื่อนขึ้น', disabled: !i, onclick: () => { P.clips.splice(i - 1, 0, P.clips.splice(i, 1)[0]); applySegs(); paintPanel(); } }, '↑'), h('button.icon-btn', { 'aria-label': 'เลื่อนลง', disabled: i === P.clips.length - 1, onclick: () => { P.clips.splice(i + 1, 0, P.clips.splice(i, 1)[0]); applySegs(); paintPanel(); } }, '↓'),
          h('button.icon-btn', { 'aria-label': 'ลบคลิป', onclick: () => { if (!confirm('เอาคลิปนี้ออก?')) return; idb('delete', c.key).catch(() => {}); P.clips.splice(i, 1); delete P.keep[c.id]; applySegs(); paintPanel(); } }, icon('trash')))));
      box.append(h('div.card', h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'คลิปของคุณ'), P.clips.length ? h('small.muted', `รวม ${fmtT(segList(P).reduce((a, s) => a + s.b - s.a, 0))}`) : null),
        missBox, badBox, P.clips.length ? h('div.vd-clips', rows) : h('p.small.muted', 'ถ่ายแนวตั้ง แสงเข้าหน้า เสียงชัด · ใส่ได้หลายคลิป ต่อกันตามลำดับ'),
        h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, h('button.btn' + (P.clips.length ? '' : '.primary'), { onclick: recordNow }, icon('play'), P.clips.length ? 'อัดเพิ่ม' : 'อัดคลิปในแอป'), h('button.btn' + (P.clips.length ? '' : '.primary'), { onclick: () => fileIn.click() }, icon('upload'), P.clips.length ? 'เพิ่มคลิป' : 'เลือกคลิปจากเครื่อง')), fileIn));
      if (Object.keys(M.urls).length) box.append(h('div.card.vd-autocard', h('div', h('b', 'ตัดต่อให้เลย'), h('small', 'ตัดช่วงเงียบ เทคเสีย คำเติม · เขียนซับ · ปรับเสียง/ภาพ · เอฟเฟกต์ เพลง ป้ายท้าย · แคปชั่น — ในปุ่มเดียว')), h('button.btn.primary', { onclick: () => autoSheet() }, icon('bulb'), 'เริ่ม')));
    } else {
      const recBox = h('div');
      const setAudio = (v) => { P.audio = v; if (v === 'none') { P.clips.forEach((x) => idb('delete', x.key).catch(() => {})); P.clips = []; P.segs = []; P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); } save(); attachMedia().then(() => paintPanel()); };
      const audSeg = h('div.seg', [['rec', 'อัดเสียงในแอป'], ['file', 'ไฟล์เสียง'], ['none', 'ไม่มีเสียง']].map(([k, l]) => h('button', { class: P.audio === k ? 'on' : '', onclick: () => setAudio(k) }, l)));
      const c0 = P.clips[0];
      if (P.audio === 'file') recBox.append(h('button.btn', { onclick: () => fileIn.click() }, icon('upload'), c0 ? 'เปลี่ยนไฟล์เสียง' : 'เลือกไฟล์เสียง'), fileIn);
      if (P.audio === 'rec') { const b = h('button.btn.primary.vd-rec', { onclick: () => toggleRec() }, h('span.vd-dot'), c0 ? 'อัดใหม่' : 'เริ่มอัด'); recBox.append(b); }
      box.append(h('div.card', h('h3.vd-h3', 'เสียง'), audSeg, h('div', { style: { marginTop: '10px' } }, badBox,
        P.audio === 'none' ? h('p.small.muted', 'ไม่มีเสียงพูด: ซับขึ้นตามความเร็วอ่าน มีเพลงประกอบให้ในขั้นตกแต่ง') : c0 && M.urls[c0.id] ? h('div.vd-ok', icon('check'), h('span', h('b', c0.name), h('small', `ยาว ${fmtT(c0.dur)}`))) : h('p.small.muted', P.audio === 'rec' ? 'กดอัด แล้วอ่านบทด้านล่าง' : 'เลือกไฟล์เสียงจากเครื่อง'), recBox)));
    }
    // ตัดช่วงเงียบ
    if (Object.keys(M.urls).length) {
      const st = h('small.muted', P.silence.on ? silenceInfo() : 'ตัดช่วงหยุดคิด เว้นนาน ให้จังหวะกระชับ (jump cut)');
      const gapSeg = h('div.seg', [[0.3, 'กระชับมาก'], [0.45, 'ปกติ'], [0.7, 'นุ่มนวล']].map(([v, l]) => h('button', { class: P.silence.gap === v ? 'on' : '', onclick: async () => { P.silence.gap = v; if (P.silence.on) await runSilence(st); paintPanel(); } }, l)));
      box.append(h('div.card', h('label.vd-tg', h('input', { type: 'checkbox', checked: P.silence.on, onchange: async (e) => { P.silence.on = e.target.checked; if (P.silence.on) await runSilence(st); else { P.cuts = P.cuts.filter((x) => x.why !== 'silence'); applySegs(); } st.textContent = P.silence.on ? silenceInfo() : 'ตัดช่วงหยุดคิด เว้นนาน ให้จังหวะกระชับ (jump cut)'; } }), h('span', h('b', 'ตัดช่วงเงียบอัตโนมัติ'), st)), P.silence.on ? gapSeg : null));
    }
    // บท
    const chips = h('div.vd-chunks');
    const paintChips = () => { let line = -1; chips.replaceChildren(...P.chunks.flatMap((c) => { const out = []; if (c.line !== line) { line = c.line; out.push(h('i.vd-br', { 'aria-hidden': 'true' })); } out.push(h('span.vd-chunk', chunkText(c))); return out; })); };
    const ta = h('textarea.input.vd-script', { rows: 7, placeholder: 'พิมพ์หรือวางบทพูด\nขึ้นบรรทัดใหม่ = ตัดช็อต/ซูมใหม่\nครอบ *คำสำคัญ* ด้วยดอกจัน = คำเด่นสีสะดุดตา', 'aria-label': 'บทพูด',
      oninput: (e) => { P.script = e.target.value; P.chunks = parseScript(P.script, P.chunks); if (P.mode === 'voice' && P.audio === 'none') P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); save(); paintChips(); M.player?.draw(); } }, P.script || '');
    const canAsr = Object.keys(M.urls).length > 0;
    box.append(h('div.card', h('h3.vd-h3', 'บทพูด / ซับ'),
      canAsr ? h('div.vd-asr', h('div', h('b', 'ให้แอปเขียนซับจากเสียง'), h('small', 'ฟังเสียงในคลิป แล้วเขียนซับพร้อมจังหวะให้ ทำในเครื่อง ไม่ส่งเสียงไปไหน')), h('button.btn.primary', { onclick: asrSheet }, icon('pen'), 'เขียนซับให้')) : null,
      h('p.xs.muted', { style: { margin: '8px 0' } }, canAsr ? 'หรือวางบทเอง: ' : '', 'แอปแบ่งเป็นช่วงสั้น ๆ 1–3 คำให้ · ขึ้นบรรทัดใหม่ = ตัดช็อต · *คำ* = คำเด่น'), ta,
      h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, h('button.btn', { onclick: pullFromStudio }, icon('studio'), 'ดึงบทจากงานในสตูดิโอ')), chips));
    paintChips();
    function pullFromStudio() {
      const items = store.all('content').filter((x) => x.deck).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      sheet({ title: 'ดึงบทจากสตูดิโอ', body: items.length ? h('div.vd-pick', items.slice(0, 30).map((it) => h('button.vd-pick-i', { onclick: async () => { const S = await import('./studio.js'); P.script = speechFromScript(it.script || S.toScript(it)); P.chunks = parseScript(P.script, []); P.slideFrom = it.id; deckCache = null; if (P.mode === 'voice' && P.audio === 'none') P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); if (!P.title || /^คลิป/.test(P.title)) { P.title = it.title; titleIn.value = it.title; } save(); closeSheet(true); paintPanel(); M.player?.draw(); } }, h('b', it.title), h('small', `${it.deck.slides.length} หน้า`)))) : empty('ยังไม่มีงานในสตูดิโอ', 'studio') });
    }
    box.append(next('sync', 'ต่อไป: จังหวะ'));
    return box;
  }
  function silenceInfo() { const tot = P.clips.reduce((a, c) => a + ((c.out ?? c.dur) - (c.in ?? 0)), 0); const kept = segList(P).reduce((a, s) => a + s.b - s.a, 0); return `ตัดออก ${Math.max(0, tot - kept).toFixed(1)} วินาที · เหลือ ${fmtT(kept)} (${segList(P).length} ช่วง)`; }
  async function runSilence(st) {
    st && (st.textContent = 'กำลังฟังหาช่วงเงียบ…');
    try { const A = await import('../video/audio.js'); P.cuts = P.cuts.filter((x) => x.why !== 'silence'); for (const c of P.clips) { if (!M.urls[c.id]) continue; const b = await idb('get', c.key); P.cuts.push(...silenceCuts(c, await A.speechRanges(c.key, b, { gap: P.silence.gap }))); } P.cuts = P.cuts.map((x, i) => ({ ...x, id: x.id || 's' + i + uid() })); applySegs(); toast('ตัดช่วงเงียบแล้ว'); }
    catch (e) { P.silence.on = false; save(); toast('วิเคราะห์เสียงไม่ได้: ' + (e.message || e)); }
    st && (st.textContent = P.silence.on ? silenceInfo() : '');
  }
  /** เขียนซับ / จับเวลาจากเสียง (ไม่แตะจุดตัดและการตกแต่ง) · useScript = ใช้บทเดิม จับเวลาใหม่ */
  async function asrSheet({ useScript = false } = {}) {
    const st = { model: null }; const stage = h('p.small'), bar = h('div.vd-bar', h('i'));
    const start = h('button.btn.primary', { onclick: run }, useScript ? 'จับเวลาจากเสียง' : 'เริ่มเขียนซับ');
    sheet({ title: useScript ? 'จับเวลาซับจากเสียง' : 'เขียนซับจากเสียง', sub: 'ทำในเครื่อง', body: h('div', h('p.small.muted', { style: { marginTop: 0 } }, useScript ? 'ใช้ตัวสะกดตามบทของคุณ แอปฟังเสียงแล้ววางเวลาให้ทีละคำ' : 'ได้ซับครบทุกคำพร้อมเวลาทีละคำ · ครั้งแรกต้องโหลดโมเดล (ต่อ Wi-Fi) · แก้คำผิดได้ในขั้นจังหวะ'), modelPicker(st), stage, bar, h('div.row', { style: { justifyContent: 'flex-end', marginTop: '10px' } }, start)) });
    async function run() {
      start.disabled = true; bar.classList.add('on');
      try {
        stage.textContent = 'กำลังเตรียมเสียง…'; const AE = await import('../video/autoedit.js');
        const n = await AE.subtitleOnly(P, await asrEnv({ model: st.model, useScript, onStep: (k, t, p) => { if (t) stage.textContent = t; if (p != null) { bar.classList.toggle('busy', p < 0); bar.firstChild.style.width = p < 0 ? '100%' : Math.round(p * 100) + '%'; } } }));
        if (!n || !P.chunks.length) throw new Error('ไม่ได้ยินเสียงพูด');
        P.chunks = sanitize(P.chunks); if (!useScript) P.autoDone = false; if (P.enSegs?.length) (await import('../video/translate.js')).fillFromCache(P); save(); closeSheet(true); toast(useScript ? `จับเวลาแล้ว (ตรงกับเสียง ${Math.round((P.alignScore || 0) * 100)}%)` : `เขียนซับแล้ว ${n} คำ ตรวจคำผิดได้เลย`); step = 'sync'; paintSteps(); paintPanel(); M.player.seek(M.player.win[0]);
      } catch (e) { console.error(e); stage.textContent = 'ไม่สำเร็จ: ' + (e.message || e); start.disabled = false; bar.classList.remove('on'); }
    }
  }
  // อัดเสียงในแอป
  async function toggleRec() {
    if (M.rec) { M.stopRec(); return; }
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { toast('ไม่ได้รับอนุญาตให้ใช้ไมค์'); return; }
    const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined); const parts = []; const t0 = Date.now();
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); clearInterval(M.recT); M.rec = null; ov.remove();
      const blob = new Blob(parts, { type: mt.split(';')[0] || 'audio/webm' }); P.chunks = P.chunks.map((c) => ({ ...c, t0: null, t1: null })); await useFiles([new File([blob], 'เสียงที่อัด.' + (mt.includes('mp4') ? 'm4a' : 'webm'), { type: blob.type })]); go('media'); };
    const timer = h('b', '0:00');
    const ov = h('div.vd-recov', { role: 'dialog', 'aria-label': 'กำลังอัดเสียง' }, h('div.vd-rec-top', h('span.vd-dot.on'), 'กำลังอัด ', timer), h('div.vd-rec-text', (P.script || 'พูดได้เลย แล้วให้แอปเขียนซับให้ทีหลัง').split('\n').map((l) => h('p', l.replace(/\*/g, '')))), h('button.btn.primary.vd-rec-stop', { onclick: () => M.stopRec() }, 'หยุดอัด'));
    document.body.append(ov);
    M.rec = rec; M.stopRec = () => { if (M.rec && M.rec.state !== 'inactive') M.rec.stop(); };
    M.recT = setInterval(() => { timer.textContent = fmtT((Date.now() - t0) / 1000); }, 250);
    rec.start(250);
  }

  // ── 2. จังหวะ ──
  function stepSync() {
    const box = h('div');
    if (!P.chunks.length) { box.append(h('div.card', empty('ยังไม่มีบท', 'pen', h('button.btn.primary', { onclick: () => go('media') }, 'ไปใส่บท / เขียนซับ')))); return box; }
    const hasAudio = segList(P).length > 0;
    if (!hasAudio && P.mode === 'voice') {
      if (!timed(P.chunks)) { P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); save(); }
      box.append(h('div.card', h('h3.vd-h3', 'ความเร็วซับ'), h('p.small.muted', 'ไม่มีเสียงพูด ซับจะขึ้นตามความเร็วอ่าน กด ▶ ด้านบนเพื่อดู'),
        h('div.seg', [[0.8, 'ช้า'], [1, 'ปกติ'], [1.25, 'เร็ว'], [1.5, 'เร็วมาก']].map(([v, l]) => h('button', { class: P.readSpeed === v ? 'on' : '', onclick: () => { P.readSpeed = v; P.chunks = autoTime(P.chunks, readDur(P.chunks, v)); save(); M.player.seek(0); paintPanel(); } }, l)))));
    } else if (!hasAudio) { box.append(h('div.card', empty('ยังไม่ได้เลือกคลิป', 'upload', h('button.btn.primary', { onclick: () => go('media') }, 'ไปเลือก')))); return box; }
    else box.append(tapPanel());
    {
      const lenSeg = h('div.seg', [[8, 'สั้นมาก'], [12, 'สั้น'], [18, 'กลาง'], [24, 'ยาว']].map(([v, l]) => h('button', { class: P.subMax === v ? 'on' : '', disabled: !P.words?.length, onclick: async () => { const [AE, S, R] = await Promise.all([import('../video/autoedit.js'), import('../video/subs.js'), import('../video/asr.js')]); P.subMax = v; if (AE.rechunk(P, S, R)) { P.autoDone = false; if (P.enSegs?.length) (await import('../video/translate.js')).fillFromCache(P); save(); paintPanel(); M.player.draw(); toast('แบ่งซับใหม่แล้ว (การตกแต่งจะจัดให้ใหม่ในขั้นถัดไป)'); } } }, l)));
      box.append(h('div.card', h('h3.vd-h3', 'รูปแบบซับ'), langRow(),
        hasAudio ? [
        h('div.q', h('span.ql', 'ความยาวต่อช่วง'), lenSeg, !P.words?.length ? h('p.xs.muted', 'ใช้ได้หลัง "เขียนซับให้" หรือ "ตัดต่อให้เลย"') : null),
        h('label.vd-tg', h('input', { type: 'checkbox', checked: !!P.karaoke, onchange: (e) => { P.karaoke = e.target.checked; save(); M.player.draw(); } }), h('span', h('b', 'ไฮไลต์คำที่กำลังพูด'), h('small', 'คำเปลี่ยนเป็นสีเหลืองตามเสียงทีละคำ'))),
        h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, h('button.btn', { onclick: () => asrSheet() }, icon('pen'), 'เขียนซับใหม่จากเสียง'), h('button.btn', { onclick: dictSheet }, icon('book'), 'คำที่แก้บ่อย'))] : null));
    }
    const rows = h('div.vd-rows'); box.append(h('div.card', h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'ตรวจซับ · ปรับทีละช่วง'), h('small.muted', `${P.chunks.length} ช่วง · แตะเพื่อดู · ✎ แก้`)), rows));
    function list() {
      rows.replaceChildren(...P.chunks.map((c, i) => h('div.vd-row', { class: (c.t0 == null ? 'pending ' : '') + (c.line !== P.chunks[i - 1]?.line ? 'nl' : '') },
        h('button.vd-row-t', { onclick: () => { if (c.t0 != null) { M.player.pause(); setPlayIcon(false); M.player.seek(c.t0 + 0.2); } } }, h('small', fmtS(c.t0)), h('span', chunkText(c))),
        h('button.icon-btn', { 'aria-label': 'แก้คำ', onclick: () => editText(i, list) }, icon('pen')),
        h('div.vd-nudge', h('button.icon-btn', { 'aria-label': 'ขึ้นเร็วขึ้น 0.1 วินาที', disabled: c.t0 == null, onclick: () => nudge(i, -0.1) }, '−'), h('button.icon-btn', { 'aria-label': 'ขึ้นช้าลง 0.1 วินาที', disabled: c.t0 == null, onclick: () => nudge(i, 0.1) }, '+')))));
    }
    function nudge(i, d) { const c = P.chunks[i]; const prev = P.chunks[i - 1]; const lo = prev?.t0 != null ? prev.t0 + 0.1 : 0; c.t0 = +Math.max(lo, Math.min(c.t1 - 0.1, c.t0 + d)).toFixed(2); if (prev && prev.t1 != null) prev.t1 = c.t0; save(); list(); M.player.seek(c.t0 + 0.15); }
    list(); M.paintRows = list;
    box.append(next('look', 'ต่อไป: ตกแต่ง'));
    return box;
  }
  // ── ซับภาษาอังกฤษ ──
  function langRow() {
    const seg = h('div.seg', [['th', 'ไทย'], ['both', 'ไทย + อังกฤษ'], ['en', 'อังกฤษ']].map(([v, l]) => h('button', { class: (P.subLang || 'th') === v ? 'on' : '', onclick: async () => {
      P.subLang = v; save(); [...seg.children].forEach((b) => b.classList.toggle('on', b.textContent === l));
      if (v !== 'th') { const T = await import('../video/translate.js'); if (T.fillFromCache(P)) { save(); enSheet(); } else { save(); paintPanel(); } } else paintPanel();
      M.player.draw();
    } }, l)));
    const n = P.enSegs?.length || 0;
    return h('div.q', h('span.ql', 'ภาษาซับ'), seg, (P.subLang || 'th') !== 'th' && n ? h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, h('button.btn.sm', { onclick: enReview }, icon('pen'), 'ตรวจ/แก้คำแปล'), h('button.btn.sm.ghost', { onclick: () => enSheet({ force: true }) }, 'แปลใหม่')) : null);
  }
  async function enSheet({ force = false, after } = {}) {
    const T = await import('../video/translate.js'); const chrome = await T.chromeTranslator(); const st = { engine: chrome ? 'chrome' : 'nllb' };
    const opts = h('div.vd-models', [chrome ? ['chrome', 'ตัวแปลของ Chrome', 'เร็ว · โหลดน้อย · ทำในเครื่อง'] : null, ['nllb', 'ตัวแปลในแอป', 'ประมาณ 900MB ครั้งแรก · แนะนำบนคอม']].filter(Boolean).map(([k, n, sub]) => h('button.vd-model', { type: 'button', class: k === st.engine ? 'on' : '', onclick: (e) => { st.engine = k; [...opts.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, h('b', n), h('small', sub))));
    const stage = h('p.small'), bar = h('div.vd-bar', h('i')); const go = h('button.btn.primary', { onclick: run }, 'แปลเป็นภาษาอังกฤษ');
    sheet({ title: 'ซับภาษาอังกฤษ', sub: `${force ? T.linesOf(P.chunks, { byLine: !P.words?.length }).length : T.missing(P)} ประโยค`, body: h('div', h('p.small.muted', { style: { marginTop: 0 } }, 'แปลทีละประโยค ศัพท์ประกันใช้คำมาตรฐาน (critical illness, sum insured, waiting period…) · ตรวจและแก้ได้ทุกบรรทัดก่อนโพสต์'), opts, stage, bar, h('div.row', { style: { justifyContent: 'flex-end', marginTop: '10px' } }, go)) });
    async function run() {
      go.disabled = true; bar.classList.add('on');
      try {
        const n = await T.translateProject(P, { engine: st.engine, force, onStatus: (t) => { stage.textContent = t; }, onProgress: (p) => { bar.classList.toggle('busy', p < 0); bar.firstChild.style.width = Math.round(Math.max(0, p) * 100) + '%'; } });
        if ((P.subLang || 'th') === 'th') P.subLang = 'both'; save(); closeSheet(true); paintPanel(); M.player.draw(); toast(n ? `แปลแล้ว ${n} ประโยค ตรวจคำแปลได้ที่ "ตรวจ/แก้คำแปล"` : 'ใช้คำแปลเดิมแล้ว'); after?.();
      } catch (e) { console.error(e); stage.textContent = 'แปลไม่สำเร็จ: ' + (e.message || e); go.disabled = false; bar.classList.remove('on'); }
    }
  }
  async function enReview() {
    const T = await import('../video/translate.js'); const segs = (P.enSegs || []).slice().sort((a, b) => a.t0 - b.t0);
    if (!segs.length) { enSheet(); return; }
    const inputs = segs.map((g) => h('textarea.input.vd-en-in', { rows: 2, placeholder: 'ใส่คำแปลภาษาอังกฤษ (เว้นว่าง = ไม่แสดง)' }, g.en || ''));
    const list = h('div.vd-enlist', segs.map((g, i) => h('div.vd-en-row', h('button.vd-en-th', { type: 'button', onclick: () => { M.player.pause(); setPlayIcon(false); M.player.seek(g.t0 + 0.2); } }, h('small', fmtS(g.t0)), h('span', g.th)), inputs[i])));
    const ok = () => { segs.forEach((g, i) => { const v = inputs[i].value.trim(); if (v !== g.en) { g.en = v; if (v) T.remember(g.key, v, { user: true }); } }); P.enSegs = segs.filter((g) => g.en); save(); closeSheet(true); M.player.draw(); toast('บันทึกคำแปลแล้ว'); };
    const miss = T.missing(P);
    sheet({ title: 'ตรวจคำแปล', sub: `${segs.length} ประโยค · แตะภาษาไทยเพื่อดูในคลิป`, body: h('div', miss ? h('div.vd-bad', icon('info'), h('span', h('b', `อีก ${miss} ประโยคยังไม่มีคำแปล`), h('small', 'เช่น ซับที่เพิ่มใหม่ ')), h('button.btn.sm', { onclick: () => { closeSheet(true); enSheet(); } }, 'แปลเพิ่ม')) : null, list, h('p.xs.muted', 'คำที่แก้จะถูกจำไว้ ใช้ซ้ำได้ในคลิปต่อไป · ตรวจตัวเลขและชื่อแผนให้ตรงกับกรมธรรม์ทุกครั้ง'), h('div.row', { style: { justifyContent: 'flex-end', marginTop: '10px' } }, h('button.btn.primary', { onclick: ok }, 'บันทึก'))) });
  }
  async function dictSheet() {
    const R = await import('../video/asr.js'); const ta = h('textarea.input', { rows: 7, placeholder: 'เขียนบรรทัดละคู่  ผิด=ถูก\nเช่น\nเอเดีย=ไอเดีย\nวัดเจ็ต=budget' }, R.getDictText());
    sheet({ title: 'คำที่แก้บ่อย', sub: 'แอปจะแก้ให้อัตโนมัติทุกครั้งที่เขียนซับ', body: h('div', ta, h('p.xs.muted', 'ใช้กับชื่อแผน ชื่อเฉพาะ คำทับศัพท์ ที่ตัวถอดเสียงสะกดผิดซ้ำ ๆ · มีคำพื้นฐานให้แล้ว เช่น เอไอเอ → AIA'), h('div.row', { style: { justifyContent: 'flex-end', marginTop: '10px' } }, h('button.btn.primary', { onclick: () => { R.setDictText(ta.value); closeSheet(true); toast('บันทึกแล้ว จะใช้ตอนเขียนซับครั้งถัดไป'); } }, 'บันทึก'))) });
  }
  const spreadWords = (c) => { const ws = c.words.filter((w) => w.w.trim()); const tot = ws.reduce((a, w) => a + w.w.trim().length, 0) || 1; let t = c.t0 ?? 0; const d = (c.t1 ?? t) - t; for (const w of ws) { const k = w.w.trim().length / tot; w.t0 = +t.toFixed(2); t += d * k; w.t1 = +t.toFixed(2); } };
  function editText(i, after) {
    const c = P.chunks[i]; const prev = P.chunks[i - 1];
    const inp = h('input.input', { value: c.words.map((w) => (w.key ? w.w.replace(/^(\s*)(.*)$/, '$1*$2*') : w.w)).join('') });
    const done = () => { rebuildScript(); save(); closeSheet(true); after?.(); M.player.draw(); };
    const ok = () => { const v = inp.value.trim(); if (!v) return; const parts = parseScript(v.replace(/\n/g, ' ')); if (!parts.length) return; c.words = parts.flatMap((x, k, arr) => (k < arr.length - 1 ? [...x.words, { w: ' ', key: false }] : x.words)); c.text = c.words.map((w) => w.w).join(''); if (c.t0 != null) spreadWords(c); done(); };
    const merge = () => { if (!prev) return; prev.words = [...prev.words, ...c.words]; prev.text = prev.words.map((w) => w.w).join(''); if (c.t1 != null) prev.t1 = c.t1; P.chunks.splice(i, 1); done(); };
    const split = () => { const ws = c.words.filter((w) => w.w.trim()); if (ws.length < 2) { toast('ช่วงนี้มีคำเดียว แยกไม่ได้'); return; } const half = Math.ceil(ws.length / 2); const cutAt = c.words.indexOf(ws[half]); const a = c.words.slice(0, cutAt), b = c.words.slice(cutAt); const tm = b.find((w) => w.t0 != null)?.t0 ?? ((c.t0 ?? 0) + (c.t1 ?? 0)) / 2; const nb = { ...c, words: b, text: b.map((w) => w.w).join('').trim(), t0: tm, emoji: null, term: null, label: null, mood: null, sound: null }; c.words = a; c.text = a.map((w) => w.w).join('').trim(); c.t1 = tm; P.chunks.splice(i + 1, 0, nb); done(); };
    const del = () => { P.chunks.splice(i, 1); done(); };
    sheet({ title: 'แก้ซับ', sub: fmtS(c.t0) + ' วิ', body: h('div', inp, h('p.xs.muted', 'ครอบ *คำ* = คำเด่น · เวลาเดิมไม่เปลี่ยน'),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, h('button.btn.primary', { onclick: ok }, 'บันทึก'), prev ? h('button.btn', { onclick: merge }, 'รวมกับช่วงก่อนหน้า') : null, h('button.btn', { onclick: split }, 'แยกเป็น 2 ช่วง'), h('button.btn.danger', { onclick: del }, icon('trash'), 'ลบช่วงนี้'))) });
    setTimeout(() => inp.focus(), 80); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  }
  function tapPanel() {
    if (P.words?.length && timed(P.chunks) && !M.tapOpen) {
      const card = h('div.card.vd-tapcard.vd-tapok', h('div', h('b', '✓ จังหวะตรงกับเสียงแล้ว'), h('small', `เวลาทีละคำจากเสียงพูด ${P.words.length} คำ · ปรับเฉพาะช่วงที่ต้องการด้านล่าง`)),
        h('button.btn.sm.ghost', { onclick: () => { M.tapOpen = true; card.replaceWith(tapPanel()); } }, 'จิ้มเอง'));
      return card;
    }
    let rate = 0.85, i = 0;
    const cur = h('div.vd-tap-cur'), nxt = h('div.vd-tap-nxt'), stat = h('div.vd-tap-stat');
    const n = P.chunks.length; const endT = () => segList(P).at(-1)?.o1 || 10;
    const paint = () => {
      const done = P.chunks.filter((c) => c.t0 != null).length;
      if (M.tapOn) { cur.replaceChildren(i < n ? h('span', chunkText(P.chunks[i])) : h('span.muted', 'แตะอีกครั้งเมื่อพูดจบ')); nxt.textContent = i + 1 < n ? 'ถัดไป: ' + P.chunks[i + 1].text : ''; stat.textContent = `${i}/${n}`; }
      else { cur.replaceChildren(h('span.muted', timed(P.chunks) ? 'จังหวะครบแล้ว ✓ ดูตัวอย่างด้านบน หรือจิ้มใหม่ให้แม่นขึ้น' : 'กด "เริ่มจิ้ม" แล้วแตะปุ่มใหญ่ทุกครั้งที่เริ่มพูดช่วงถัดไป')); nxt.textContent = ''; stat.textContent = `${done}/${n}`; }
      tapBtn.disabled = !M.tapOn; startBtn.textContent = M.tapOn ? 'หยุด' : timed(P.chunks) ? 'จิ้มใหม่' : 'เริ่มจิ้ม';
    };
    const finish = () => {
      if (!M.tapOn) return; M.tapOn = false; M.player.pause(); setPlayIcon(false); document.removeEventListener('keydown', onKey); M.player.onEnd = () => setPlayIcon(false);
      const end = endT(); const last = P.chunks[i - 1];
      if (last && last.t1 == null) last.t1 = +Math.min(end, last.t0 + 2.5).toFixed(2);
      if (i < n) { const from = last ? last.t1 : 0.2; const rest = autoTime(P.chunks.slice(i), Math.max(from + 1, end) - from, 0).map((c) => ({ ...c, t0: +(c.t0 + from).toFixed(2), t1: +(c.t1 + from).toFixed(2) })); P.chunks.splice(i, n - i, ...rest); toast('ช่วงที่ยังไม่ได้จิ้ม จัดให้อัตโนมัติแล้ว'); }
      P.chunks = sanitize(P.chunks); save(); paint(); M.paintRows?.(); M.player.seek(M.player.win[0]);
    };
    const tap = () => {
      if (!M.tapOn) return; const t = +Math.max(0, M.player.now() - 0.1 * rate).toFixed(2);
      if (i < n) { if (i > 0) P.chunks[i - 1].t1 = t; P.chunks[i].t0 = t; P.chunks[i].t1 = null; i++; navigator.vibrate?.(8); M.player.refresh(); }
      else { P.chunks[n - 1].t1 = t; finish(); return; }
      paint();
    };
    const onKey = (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); tap(); } if (e.key === 'Escape') finish(); };
    const start = async () => {
      if (M.tapOn) { finish(); return; }
      P.chunks = P.chunks.map((c) => ({ ...c, t0: null, t1: null })); i = 0; M.tapOn = true; M.player.refresh(); paint(); M.paintRows?.();
      document.addEventListener('keydown', onKey);
      M.player.onEnd = () => { setPlayIcon(false); finish(); };
      await M.player.play(0, { to: endT(), sfx: false, rate, music: false }); setPlayIcon(true);
    };
    const tapBtn = h('button.vd-tap', { disabled: true, onpointerdown: (e) => { e.preventDefault(); tap(); } }, 'แตะ');
    const startBtn = h('button.btn.primary', { onclick: start }, 'เริ่มจิ้ม');
    const rateSeg = h('div.seg'); const paintRate = () => rateSeg.replaceChildren(...[[0.7, 'ช้า 0.7×'], [0.85, '0.85×'], [1, 'ปกติ']].map(([v, l]) => h('button', { class: rate === v ? 'on' : '', onclick: () => { rate = v; paintRate(); } }, l)));
    paintRate();
    const align = h('button.btn.primary', { onclick: () => asrSheet({ useScript: true }) }, icon('sync'), 'จับเวลาจากเสียง (แม่น)');
    const auto = h('button.btn', { onclick: () => { P.chunks = autoTime(P.chunks, endT(), 0.3); save(); paint(); M.paintRows?.(); M.player.seek(0); toast('จัดจังหวะแบบเฉลี่ยแล้ว ปรับทีละช่วงด้านล่างได้'); } }, icon('sync'), 'เฉลี่ยอัตโนมัติ');
    setTimeout(paint);
    return h('div.card.vd-tapcard', h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'จิ้มจังหวะซับ'), stat), cur, nxt, tapBtn,
      h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, align, startBtn, rateSeg, auto),
      h('p.xs.muted', { style: { marginTop: '8px' } }, 'ถ้าให้แอปเขียนซับแล้ว จังหวะมีให้แล้ว ไม่ต้องจิ้ม · คอมพิวเตอร์กด Space แทนการแตะ'));
  }

  // ── 3. ตกแต่ง ──
  function stepLook() {
    const box = h('div');
    const canCut = P.mode === 'cam' && (navigator.hardwareConcurrency || 4) >= 6;
    const runAuto = async () => { const d = await deck(); const msg = autoAll(P, { slideKinds: d?.slides?.map((s) => s.kind) || [], canCut }); save(); await ensureAssets(); M.player.seek(M.player.win[0]); paintPanel(); toast(msg); };
    if (!P.autoDone && timed(P.chunks)) setTimeout(runAuto, 50);
    box.append(h('div.card.vd-autocard', h('div', h('b', 'จัดให้อัตโนมัติ'), h('small', 'เลือกฉาก ภาพแทรก การ์ดความรู้ เพลง ให้เหมาะกับบท')), h('button.btn.primary', { onclick: runAuto }, icon('bulb'), P.autoDone ? 'จัดใหม่' : 'จัดให้')));
    if (P.cuts?.length) box.append(cutsCard());
    // สไตล์ + โทนสี
    const styles = h('div.vd-styles', Object.entries(VSTYLES).map(([k, s]) => h('button.vd-style', { type: 'button', class: P.style === k ? 'on' : '', style: { '--a': s.sw[1], '--b': s.sw[0] }, onclick: (e) => { P.style = k; save(); [...styles.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); ensureEndcard(); ensureMusic(); M.player.draw(); } },
      h('span.vd-sw', h('i', k === 'mini' ? 'ก' : k === 'neon' ? 'Aa' : k === 'grid' ? 'ก' : k === 'aom' ? 'AOM' : 'aa')), h('b', s.name), h('small', s.sub))));
    const gradeSeg = h('div.seg', Object.entries(GRADES).map(([k, l]) => h('button', { class: (P.grade || 'none') === k ? 'on' : '', onclick: (e) => { P.grade = k; save(); [...gradeSeg.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget)); M.player.draw(); } }, l)));
    const tg = (label, key, sub, after, defOn) => h('label.vd-tg', h('input', { type: 'checkbox', checked: defOn ? P[key] !== false : !!P[key], onchange: (e) => { P[key] = e.target.checked; save(); after?.(); M.player.draw(); } }), h('span', h('b', label), sub ? h('small', sub) : null));
    box.append(h('div.card', h('h3.vd-h3', 'สไตล์'), styles, h('h3.vd-h3', { style: { marginTop: '14px' } }, 'โทนสีภาพ'), gradeSeg,
      P.style === 'mini' ? h('label.vd-tg', h('input', { type: 'checkbox', checked: P.credit !== false, onchange: (e) => { P.credit = e.target.checked; save(); M.player.draw(); } }), h('span', h('b', 'เครดิตใต้ภาพ'), h('small', 'AOM CONNECT · Financial Advisor'))) : null));
    // ทีละช่วง
    const rows = h('div.vd-rows');
    const badge = (c) => [c.scene && c.scene !== 'cam' && !(P.mode === 'voice' && c.scene === 'stage') ? (P.mode === 'voice' ? VSCENES : SCENES)[c.scene] : P.mode === 'voice' ? 'กราฟิก' : 'หน้ากล้อง', c.term ? ' · การ์ดความรู้' : '', c.label ? ' · ป้ายชื่อ' : '', c.mood ? ' · ' + (MOODS[c.mood] || '') : '', c.sound ? ' · เสียง' : '', c.arc ? ' · โค้ง' : ''].join('');
    const paintRows = () => rows.replaceChildren(...P.chunks.map((c, i) => h('div.vd-row.deco', { class: c.line !== P.chunks[i - 1]?.line ? 'nl' : '' },
      P.style === 'mini' ? null : h('button.vd-emo', { 'aria-label': c.emoji ? 'เปลี่ยนสติกเกอร์' : 'ใส่สติกเกอร์', onclick: () => pickEmoji(i, paintRows) }, c.emoji ? h('img', { src: emojiSrc(c.emoji), alt: EMOJI_BY[c.emoji]?.[2] || '' }) : icon('plus')),
      h('button.vd-row-t', { onclick: () => { if (c.t0 != null) { M.player.pause(); setPlayIcon(false); M.player.seek(c.t0 + 0.45); } } }, h('small', fmtS(c.t0)), h('span', chunkText(c))),
      h('button.vd-scn', { onclick: () => chunkSheet(i, paintRows) }, badge(c), icon('next')))));
    const rowsCard = h('div.card', h('h3.vd-h3', 'ทีละช่วง'), rows); paintRows();
    if (P.chunks.length > 10) { rows.classList.add('clip'); rowsCard.append(h('button.btn.sm.vd-more', { onclick: (e) => { rows.classList.remove('clip'); e.currentTarget.remove(); } }, `ดูทั้งหมด ${P.chunks.length} ช่วง`)); }
    box.append(rowsCard);
    // ตั้งค่าเพิ่มเติม (พับไว้)
    const adv = h('div');
    adv.append(versionsCard());
    const hookSeg = h('div.seg.vd-wrapseg', Object.entries(HOOKS).map(([k, l]) => h('button', { class: (P.hook || 'auto') === k ? 'on' : '', onclick: () => { P.hook = k; save(); paintPanel(); M.player.seek(M.player.win[0]); } }, l)));
    const muChips = h('div.vd-chips', [['auto', 'อัตโนมัติ'], ...Object.entries(GENRES).map(([k, g]) => [k, g.name]), ['off', 'ไม่ใส่']].map(([k, l]) => h('button.chip', { class: P.music === k ? 'on' : '', onclick: () => { P.music = k; save(); ensureMusic(); paintPanel(); } }, l)));
    const muVol = h('input', { type: 'range', min: 0, max: 0.8, step: 0.02, value: P.musicVol, 'aria-label': 'ความดังเพลง', onchange: (e) => { P.musicVol = +e.target.value; save(); } });
    adv.append(h('div.card', h('h3.vd-h3', 'เปิดคลิป (2 วินาทีแรก)'), hookSeg, h('h3.vd-h3', { style: { marginTop: '14px' } }, 'เพลง'), muChips, h('label.vd-tg', h('span', h('b', 'ความดังเพลง'), h('small', 'เบาลงเองตอนพูด')), muVol)));
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: P.sfxVol ?? 0.8, 'aria-label': 'ความดังเสียงประกอบ', onchange: (e) => { P.sfxVol = +e.target.value; save(); } });
    adv.append(h('div.card', h('h3.vd-h3', 'การตัดและเสียง'),
      tg('ปรับเสียงและภาพอัตโนมัติ', 'enhance', 'เสียงสม่ำเสมอ · แสงสี · ครอปตามหน้า'),
      h('div.q', h('span.ql', 'ลดเสียงรบกวน (พัดลม แอร์ เสียงซ่า)'), h('div.seg', [['off', 'ปิด'], ['on', 'ปกติ'], ['strong', 'แรง']].map(([v, l]) => h('button', { class: (P.denoise || 'on') === v ? 'on' : '', onclick: (e) => { P.denoise = v; save(); M.player._enh = null; M.player.applyEnhance(); [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, l))), P.levels && Object.values(P.levels).some(Boolean) ? h('p.xs.muted', `เสียงพื้นหลังที่วัดได้ ${Math.max(...Object.values(P.levels).filter(Boolean).map((l) => l.noise))} dB ${Math.max(...Object.values(P.levels).filter(Boolean).map((l) => l.noise)) > -42 ? '· ค่อนข้างดัง แนะนำ "แรง"' : '· เงียบดี'}`) : null),
      tg('คำสำคัญเด้ง', 'pop', 'ตัวเลขและคำเด่นขยายตามจังหวะพูด', null, true),
      tg('ภาพประกอบอัตโนมัติ', 'broll', 'พูดถึงโรงพยาบาล เงินเก็บ ครอบครัว… ขึ้นภาพประกอบ', () => { import('../video/broll.js').then(async (B) => { const F = await import('../video/face.js'); const n = P.broll !== false ? B.autoBroll(P, F.lookAway(P, segList(P))) : (P.chunks.forEach((c) => { if (c.autoArt) { c.scene = P.mode === 'voice' ? 'stage' : 'cam'; c.art = null; c.autoArt = false; } }), 0); save(); M.player.refresh(); paintPanel(); toast(P.broll !== false ? `วางภาพประกอบ ${n} จุด` : 'เอาภาพประกอบอัตโนมัติออกแล้ว'); }); }, true),
      P.mode === 'cam' && P.style !== 'mini' ? tg('ซูมตัดช็อต', 'zoom') : null,
      tg('ตัดเงียบตอนต้น', 'trimHead'), tg('ตัดเงียบตอนท้าย', 'trimTail'),
      tg('เสียงประกอบอัตโนมัติ', 'sfx', 'ปิดไว้ = เสียงสะอาดแบบพอดแคสต์'), h('label.vd-tg', h('span', h('b', 'ความดังเสียงประกอบ')), vol),
      tg('ป้ายท้ายคลิป', 'endcard', null, () => { ensureEndcard(); ensureMusic(); }),
      P.endcard && !(store.getSettings().profile || {}).licenseLife ? h('p.xs.muted', 'ยังไม่ได้กรอกเลขใบอนุญาต/LINE — ', h('a', { href: '#/tools/profile' }, 'กรอกในโปรไฟล์')) : null));
    const items = store.all('content').filter((x) => x.deck).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 20);
    const slideSel = h('select.input', { 'aria-label': 'สไลด์จากงาน', onchange: (e) => { P.slideFrom = e.target.value || null; deckCache = null; M.player.ext.slides = {}; save(); ensureAssets(); } }, h('option', { value: '' }, '— ไม่ใช้สไลด์ —'), items.map((it) => h('option', { value: it.id, selected: it.id === P.slideFrom }, it.title.slice(0, 40))));
    const imgIn = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => { for (const f of e.target.files || []) { const im = { id: 'i' + uid(), key: P.id + ':img:' + uid(), name: f.name }; await idb('put', im.key, f).catch(() => {}); P.imgs.push(im); } e.target.value = ''; save(); await ensureAssets(); paintPanel(); } });
    const sndIn = h('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true, onchange: async (e) => { P.sounds ||= []; for (const f of e.target.files || []) { const sd = { id: 's' + uid(), key: P.id + ':snd:' + uid(), name: f.name.replace(/\.\w+$/, '').slice(0, 24) }; await idb('put', sd.key, f).catch(() => {}); P.sounds.push(sd); } e.target.value = ''; save(); await ensureAssets(); paintPanel(); } });
    adv.append(h('div.card', h('h3.vd-h3', 'สไลด์ ภาพแทรก และเสียงของฉัน'), slideSel,
      h('div.vd-imgs', P.imgs.map((im, k) => h('div.vd-img', M.imgUrls[im.id] ? h('img', { src: M.imgUrls[im.id], alt: '' }) : null, h('button.icon-btn', { 'aria-label': 'ลบภาพ', onclick: () => { idb('delete', im.key).catch(() => {}); P.imgs.splice(k, 1); P.chunks.forEach((c) => { if (c.img === im.id) { c.img = null; if (c.scene === 'img') c.scene = P.mode === 'voice' ? 'stage' : 'cam'; } }); save(); paintPanel(); } }, icon('close')))), h('button.vd-img.add', { onclick: () => imgIn.click(), 'aria-label': 'เพิ่มภาพแทรก' }, icon('plus'))), imgIn,
      h('div.vd-chips', { style: { marginTop: '10px' } }, (P.sounds || []).map((sd, k) => h('span.chip', '🔊 ' + sd.name, h('button.icon-btn', { 'aria-label': 'ลบเสียง', style: { width: '22px', height: '22px' }, onclick: () => { idb('delete', sd.key).catch(() => {}); P.sounds.splice(k, 1); P.chunks.forEach((c) => { if (c.sound === 'my:' + sd.id) c.sound = null; }); save(); paintPanel(); } }, icon('close')))), h('button.chip', { onclick: () => sndIn.click() }, icon('plus'), 'เพิ่มเสียงของฉัน')), sndIn,
      h('p.xs.muted', 'ใส่เสียงที่มีสิทธิ์ใช้ (อัดเอง/ฟรีถูกลิขสิทธิ์) แล้วเลือกใส่ทีละช่วงได้')));
    box.append(h('details.vd-adv', h('summary', 'ตั้งค่าเพิ่มเติม · เพลง เสียง ภาพแทรก ลองหลายแบบ'), adv));
    box.append(next('out', 'ต่อไป: ส่งออก'));
    return box;
  }
  function toggleCut(cut, on) {
    const old = segList(P); const idx = P.cuts.indexOf(cut); cut.on = on;
    if (on) P.chunks = P.chunks.filter((c) => c.fromCut !== cut.id);
    P.segs = deriveSegs(P).filter((s) => M.urls[s.clip]); const nw = segList(P);
    P.chunks = remapTimes(P.chunks, old, nw); if (P.words) P.words = on ? remapWords(P.words, old, nw) : null; if (P.enSegs) P.enSegs = remapEn(P.enSegs, old, nw);
    if (!on && cut.text) { const sg = nw.find((x) => x.clip === cut.clip && cut.a >= x.a - 0.05 && cut.a <= x.b); if (sg) { const s0 = sg.o0 + Math.max(0, cut.a - sg.a), e0 = sg.o0 + Math.min(sg.b, cut.b) - sg.a; const add = parseScript(cut.text).map((c) => ({ ...c, line: 5000 + idx, fromCut: cut.id })); const tot = add.reduce((a, c) => a + c.text.length + 1, 0) || 1; let t = s0; for (const c of add) { const d = (e0 - s0) * (c.text.length + 1) / tot; c.t0 = +t.toFixed(2); c.t1 = +(t + d).toFixed(2); t += d; } P.chunks = [...P.chunks, ...add].sort((a, b) => (a.t0 ?? 0) - (b.t0 ?? 0)); } }
    P.chunks = sanitize(P.chunks); save(); ensureMusic(); M.player.seek(Math.min(M.player.t, M.player.win[2]));
  }
  function cutsCard() {
    const sil = P.cuts.filter((x) => x.why === 'silence'); const others = P.cuts.filter((x) => x.why !== 'silence');
    const tot = P.cuts.filter((x) => x.on).reduce((a, x) => a + x.b - x.a, 0); const kept = segList(P).reduce((a, x) => a + x.b - x.a, 0);
    const body = h('div.vd-cuts');
    if (sil.length) body.append(h('label.vd-cut', h('input', { type: 'checkbox', checked: sil.some((x) => x.on), onchange: (e) => { const old = segList(P); sil.forEach((x) => { x.on = e.target.checked; }); P.segs = deriveSegs(P).filter((s) => M.urls[s.clip]); P.chunks = sanitize(remapTimes(P.chunks, old, segList(P))); save(); ensureMusic(); paintPanel(); } }), h('span.vd-why', WHY.silence), h('span', `${sil.length} จุด · ${sil.reduce((a, x) => a + x.b - x.a, 0).toFixed(1)} วิ`)));
    for (const c of others) body.append(h('label.vd-cut', h('input', { type: 'checkbox', checked: c.on, onchange: (e) => { toggleCut(c, e.target.checked); paintPanel(); } }), h('span.vd-why', WHY[c.why] || c.why), h('span', c.text ? `"${c.text}"` : '', h('small', ` ${(c.b - c.a).toFixed(1)} วิ`)), h('button.icon-btn', { 'aria-label': 'ฟังช่วงนี้', onclick: (e) => { e.preventDefault(); const sg = segList(P).find((x) => x.clip === c.clip && x.b >= c.a - 0.3); if (sg) M.player.seek(sg.o0 + Math.max(0, Math.min(sg.b, c.a) - sg.a)); } }, icon('play'))));
    return h('div.card', h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'จุดที่แอปตัดให้'), h('small.muted', `ตัดออก ${tot.toFixed(1)} วิ · เหลือ ${fmtT(kept)}`)), h('p.xs.muted', { style: { margin: '4px 0 8px' } }, 'ติ๊กออก = เอาช่วงนั้นกลับมา'), body);
  }
  function versionsCard() {
    const VARS = [['neon', 'upbeat', 'สนุก สดใส'], ['grid', 'story', 'เล่าเรื่อง'], ['aom', 'corp', 'มืออาชีพ'], ['clean', 'chill', 'มินิมอล']];
    const wrap = h('div.vd-vers');
    for (const [st, mu, label] of VARS) {
      const c = h('canvas', { width: 216, height: 384 }); const Q = { ...P, style: st, music: mu };
      try { drawFrame(c.getContext('2d'), Q, M.player.t, M.player.active, timeline(Q, segList(Q)), { ...M.player.ext, win: M.player.win, endcard: null }); } catch {}
      wrap.append(h('button.vd-ver', { class: P.style === st && (P.music === mu || P.music === 'auto') ? 'on' : '', onclick: () => { P.style = st; P.music = mu; save(); ensureEndcard(); ensureMusic(); paintPanel(); M.player.draw(); } }, c, h('b', VSTYLES[st].name), h('small', label + ' · ' + GENRES[mu].name)));
    }
    return h('div.card', h('h3.vd-h3', 'ลองหลายแบบ'), h('p.xs.muted', { style: { margin: '0 0 8px' } }, 'แตะเลือกแบบที่ชอบ (สไตล์ + เพลง) · เลื่อนตัวอย่างไปเฟรมอื่นแล้วเปิดหน้านี้ใหม่เพื่อดูภาพเปลี่ยน'), wrap);
  }
  function pickEmoji(i, after) {
    const c = P.chunks[i]; const sug = suggestEmoji(P.chunks.filter((x) => x.line === c.line).map((x) => x.text).join(''));
    const set = (code) => { c.emoji = code; save(); closeSheet(true); preloadEmoji([code]).then(() => { after?.(); if (c.t0 != null) M.player.seek(c.t0 + 0.45); }); };
    const order = sug ? [EMOJI_BY[sug], ...EMOJI.filter((e) => e[0] !== sug)] : EMOJI;
    sheet({ title: 'เลือกสติกเกอร์', sub: `"${c.text}"`, body: h('div', h('div.vd-emogrid', h('button.vd-emo-i.none', { onclick: () => set(null) }, icon('close'), h('small', 'ไม่ใส่')), order.map(([code, , name]) => h('button.vd-emo-i', { class: code === c.emoji ? 'on' : code === sug ? 'sug' : '', onclick: () => set(code), 'aria-label': name }, h('img', { src: emojiSrc(code), alt: '', loading: 'lazy' }), h('small', name)))), h('p.xs.muted', 'Fluent Emoji โดย Microsoft (MIT License)')) });
  }
  async function chunkSheet(i, after) {
    const c = P.chunks[i]; const lineCs = P.chunks.filter((x) => x.line === c.line);
    const scenes = P.mode === 'voice' ? VSCENES : SCENES;
    const body = h('div');
    const paint = async () => {
      const d = await deck();
      body.replaceChildren(
        h('p.small', { style: { marginTop: 0 } }, h('b', 'ฉาก'), ' (ใช้กับทั้งบรรทัดนี้)'),
        h('div.vd-chips', Object.entries(scenes).map(([k, l]) => h('button.chip', { class: (c.scene || (P.mode === 'voice' ? 'stage' : 'cam')) === k ? 'on' : '', disabled: (k === 'slide' && !d) || (k === 'img' && !P.imgs.length), onclick: async () => {
          lineCs.forEach((x) => { x.scene = k; }); if (k === 'slide' && c.slide == null) lineCs.forEach((x) => { x.slide = 0; }); if (k === 'poster' && !c.poster) { const pl = findPlan(lineCs.map((x) => x.text).join('')) || PLANS.find((x) => x.star); lineCs.forEach((x) => { x.poster = pl.id; }); } if (k === 'img' && !c.img) lineCs.forEach((x) => { x.img = P.imgs[0]?.id || null; }); if (k === 'art') lineCs.forEach((x) => { x.art = x.art || guessArt(lineCs.map((y) => y.text).join('')) || 'p-think'; x.autoArt = false; });
          save(); if (k === 'cut') { const S = await import('../video/segment.js'); toast('กำลังโหลดตัวตัดฉากหลัง…'); S.load().then(() => M.player.draw()).catch((e) => toast(e.message)); } await ensureAssets(); paint(); after?.(); M.player.seek((c.t0 ?? 0) + 0.7); } }, l))),
        !d ? h('p.xs.muted', 'สไลด์: เลือกงานในสตูดิโอที่ "สไลด์และภาพแทรก" ก่อน') : null,
        c.scene === 'art' ? h('div', h('p.small', h('b', 'ภาพประกอบ')), h('div.vd-arts', ARTS_PEOPLE.map(([k, l]) => h('button.vd-art', { type: 'button', class: c.art === k ? 'on' : '', onclick: () => { lineCs.forEach((x) => { x.art = k; x.autoArt = false; }); save(); paint(); after?.(); M.player.seek((c.t0 ?? 0) + 0.7); } }, h('img', { src: artCanvas(k).toDataURL('image/jpeg', 0.6), alt: '' }), h('small', l))))) : null,
        c.scene === 'slide' && d ? h('div.vd-slides', d.slides.map((s, k) => { const im = h('img', { alt: 'สไลด์ ' + (k + 1) }); slideImg(k).then((cv2) => { if (cv2) im.src = cv2.toDataURL('image/jpeg', 0.6); }); return h('button.vd-slide', { class: c.slide === k ? 'on' : '', onclick: async () => { lineCs.forEach((x) => { x.slide = k; }); save(); await slideImg(k); paint(); M.player.seek((c.t0 ?? 0) + 0.9); } }, im); })) : null,
        c.scene === 'poster' ? h('select.input', { 'aria-label': 'เลือกแผน', style: { marginTop: '8px' }, onchange: async (e) => { lineCs.forEach((x) => { x.poster = e.target.value; }); if (!lineCs[0].label) lineCs[0].label = (PLAN[e.target.value]?.short || '').toUpperCase(); save(); await ensureAssets(); paint(); after?.(); M.player.seek((c.t0 ?? 0) + 0.9); } }, PLANS.filter((x) => !x.closed).map((x) => h('option', { value: x.id, selected: x.id === c.poster }, x.short || x.name))) : null,
        c.scene === 'img' ? h('div.vd-imgs', P.imgs.map((im) => h('button.vd-img', { class: c.img === im.id ? 'on' : '', onclick: () => { lineCs.forEach((x) => { x.img = im.id; }); save(); paint(); M.player.seek((c.t0 ?? 0) + 0.5); } }, h('img', { src: M.imgUrls[im.id] || '', alt: '' })))) : null,
        h('p.small', h('b', 'การ์ดความรู้'), ' (คำตัวใหญ่ด้านบน + คำอธิบาย)'),
        h('div.vd-term', h('input.input', { value: c.term?.t || '', placeholder: 'คำ เช่น ระยะเวลารอคอย', 'aria-label': 'คำ', onchange: (e) => { const v = e.target.value.trim(); c.term = v ? { t: v, d: c.term?.d || '' } : null; save(); after?.(); M.player.seek((c.t0 ?? 0) + 0.6); } }), h('input.input', { value: c.term?.d || '', placeholder: 'คำอธิบายสั้น ๆ', 'aria-label': 'คำอธิบาย', onchange: (e) => { if (c.term) { c.term.d = e.target.value.trim(); save(); M.player.seek((c.t0 ?? 0) + 0.6); } } })),
        h('label.vd-field', { style: { marginTop: '8px' } }, h('span', 'ป้ายชื่อ (ตัวเหลือง เช่น ชื่อแผน ชื่อคน)'), h('input.input', { value: c.label || '', placeholder: 'เช่น HEALTH HAPPY', onchange: (e) => { c.label = e.target.value.trim() || null; save(); after?.(); M.player.seek((c.t0 ?? 0) + 0.4); } })),
        h('p.small', h('b', 'อารมณ์ของช่วงนี้')),
        h('div.vd-chips', [[null, 'ไม่ระบุ'], ...Object.entries(MOODS).filter(([k]) => k !== 'calm')].map(([k, l]) => h('button.chip', { class: (c.mood || null) === k ? 'on' : '', onclick: () => { c.mood = k; save(); paint(); after?.(); M.player.seek(c.t0 ?? 0); } }, l))),
        h('p.small', h('b', 'เสียงตอนเริ่มช่วงนี้')),
        h('select.input', { 'aria-label': 'เสียง', onchange: (e) => { c.sound = e.target.value || null; save(); after?.(); } }, h('option', { value: '' }, '— ไม่มี —'), Object.entries(SFX_NAMES).map(([k, l]) => h('option', { value: k, selected: c.sound === k }, l)), (P.sounds || []).map((sd) => h('option', { value: 'my:' + sd.id, selected: c.sound === 'my:' + sd.id }, '🔊 ' + sd.name))),
        h('p.small', h('b', 'ตำแหน่งซับ')),
        h('div.seg', [[null, 'อัตโนมัติ'], ['top', 'บน'], ['mid', 'กลาง'], ['low', 'ล่าง']].map(([v, l]) => h('button', { class: (c.pos || null) === v ? 'on' : '', onclick: () => { c.pos = v; save(); paint(); after?.(); M.player.seek((c.t0 ?? 0) + 0.4); } }, l))),
        h('label.vd-tg', h('input', { type: 'checkbox', checked: !!c.arc, onchange: (e) => { lineCs.forEach((x) => { x.arc = e.target.checked; }); save(); after?.(); M.player.seek((c.t0 ?? 0) + 0.5); } }), h('span', h('b', 'ตัวหนังสือโค้งรอบหัว'), h('small', 'ทั้งบรรทัด · เหมาะกับประโยคสั้น'))),
        h('div.row.wrap', { style: { gap: '8px', marginTop: '6px' } }, h('button.btn', { onclick: () => pickEmoji(i, after) }, c.emoji ? h('img', { src: emojiSrc(c.emoji), alt: '', style: { width: '22px', height: '22px' } }) : icon('plus'), 'สติกเกอร์'), h('button.btn', { onclick: () => editText(i, after) }, icon('pen'), 'แก้คำ')));
    };
    sheet({ title: `"${c.text}"`, sub: fmtS(c.t0) + ' วิ', body }); await paint();
  }

  // ── 4. ส่งออก ──
  // ── ตรวจคลิปก่อนโพสต์ → [{lv: 'warn'|'info', msg, fix?: [label, fn]}] ──
  async function preCheck() {
    const out = []; const [a, b, z] = window_(P); const sl = segList(P); const F = await import('../video/face.js');
    const lv = Object.values(P.levels || {}).filter(Boolean);
    if (lv.length) {
      const sp = Math.min(...lv.map((l) => l.speech)), pk = Math.max(...lv.map((l) => l.peak)), nz = Math.max(...lv.map((l) => l.noise));
      if (sp < -30 && P.enhance === false) out.push({ lv: 'warn', msg: `เสียงพูดเบา (${sp} dB) คนดูต้องเร่งเสียง`, fix: ['ปรับเสียงอัตโนมัติ', () => { P.enhance = true; }] });
      if (pk > -0.3) out.push({ lv: 'info', msg: 'มีช่วงเสียงดังจนแตก (ตอนอัดเสียงดังเกิน) · ครั้งหน้าถือห่างไมค์อีกนิด' });
      if (nz > -42 && (P.denoise || 'on') !== 'strong') out.push({ lv: 'warn', msg: `เสียงพื้นหลังค่อนข้างดัง (${nz} dB)`, fix: ['ลดเสียงรบกวนแบบแรง', () => { P.denoise = 'strong'; M.player._enh = null; M.player.applyEnhance(); }] });
    }
    const long = P.chunks.filter((c) => visLen(c.text) > 26);
    if (long.length) out.push({ lv: 'warn', msg: `ซับยาวเกินจอ ${long.length} ช่วง (ตัวหนังสือจะเล็กลง)`, fix: P.words?.length ? ['แบ่งซับให้สั้นลง', async () => { const [AE, S, R] = await Promise.all([import('../video/autoedit.js'), import('../video/subs.js'), import('../video/asr.js')]); P.subMax = 14; AE.rechunk(P, S, R); P.autoDone = false; }] : null });
    const box = Object.values(P.gaze || {}).find((g) => g?.box)?.box;
    if (box && P.mode === 'cam' && !P.chunks.some((c) => c.pos)) { const y = P.style === 'mini' ? 0.6 : 0.76; if (box[3] > y - 0.03 && box[1] < y + 0.03) out.push({ lv: 'warn', msg: 'ซับทับหน้า (ตำแหน่งหน้าในคลิปค่อนข้างต่ำ)', fix: ['ย้ายซับลงล่าง', () => { P.chunks.forEach((c) => { c.pos = 'low'; }); }] }); }
    const len = b - a;
    if (len > 90) out.push({ lv: 'info', msg: `คลิปยาว ${Math.round(len)} วิ · Reels/TikTok ที่คนดูจบมักอยู่ราว 15–60 วิ` });
    const first = P.chunks.find((c) => c.t0 != null); if (first && first.t0 - a > 1.5) out.push({ lv: 'warn', msg: `${(first.t0 - a).toFixed(1)} วินาทีแรกยังไม่มีเสียงพูด คนอาจปัดผ่าน`, fix: ['ตัดช่วงเงียบตอนต้น', () => { P.trimHead = true; }] });
    const allText = P.chunks.map((c) => c.text).join(' ') + ' ' + (P.caption || '');
    if (/\d|ล้าน|แสน|บาท|%|เปอร์เซ็นต์/.test(allText) && !/เงื่อนไขเป็นไปตามกรมธรรม์/.test(P.caption || '')) out.push({ lv: 'warn', msg: 'มีตัวเลข/ผลประโยชน์ แต่แคปชั่นยังไม่มี "เงื่อนไขเป็นไปตามกรมธรรม์"', fix: ['เพิ่มในแคปชั่น', () => { const cap = P.caption || makeCaption(P, profile()).caption; P.caption = cap.replace(/\s*$/, '') + '\n\n*เงื่อนไขความคุ้มครองเป็นไปตามกรมธรรม์'; }] });
    if ((P.subLang || 'th') !== 'th') { const T = await import('../video/translate.js'); const m = T.missing(P); if (m) out.push({ lv: 'warn', msg: `ซับอังกฤษยังขาด ${m} ประโยค`, fix: ['แปลเพิ่ม', () => enSheet()] }); }
    const covered = (r) => P.chunks.some((c) => ['art', 'img', 'slide', 'poster', 'stage'].includes(c.scene) && c.t0 < r.t1 && (c.t1 ?? c.t0) > r.t0);
    const away = F.lookAway(P, sl, { minDur: 1.2 }).filter((r) => !covered(r));
    if (away.length) out.push({ lv: 'info', msg: `ไม่ได้มองกล้อง ${away.length} ช่วง (${away.slice(0, 3).map((r) => fmtS(r.t0)).join(', ')} วิ)`, fix: ['ใส่ภาพประกอบทับ', async () => { const B = await import('../video/broll.js'); for (const r of away) { const cs = P.chunks.filter((c) => c.t0 != null && c.t0 < r.t1 && (c.t1 ?? c.t0) > r.t0 && (c.scene || 'cam') === 'cam'); const k = B.guessArt(cs.map((c) => c.text).join('')) || 'p-think'; cs.forEach((c) => { c.scene = 'art'; c.art = k; }); } }] });
    if (!P.coverMade) out.push({ lv: 'info', msg: 'ยังไม่ได้ทำภาพปก (ด้านล่างมีแบบแนะนำ 3 แบบ)' });
    return out;
  }
  function checkCard() {
    const card = h('div.card.vd-check', h('h3.vd-h3', 'ตรวจก่อนโพสต์'), h('p.small.muted', 'กำลังตรวจ…'));
    preCheck().then((items) => {
      const warn = items.filter((i) => i.lv === 'warn').length;
      card.replaceChildren(h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'ตรวจก่อนโพสต์'), h('span.vd-ckbadge', { class: warn ? 'warn' : 'ok' }, warn ? `ควรแก้ ${warn} จุด` : 'พร้อมโพสต์ ✓')),
        items.length ? h('ul.vd-cklist', items.map((it) => h('li', { class: it.lv }, h('span', it.msg), it.fix ? h('button.btn.sm', { onclick: async (e) => { e.currentTarget.disabled = true; await it.fix[1](); P.chunks = sanitize(P.chunks); save(); M.player.refresh(); await ensureAssets(); M.player.draw(); toast('แก้แล้ว'); paintPanel(); } }, it.fix[0]) : null))) : h('p.small', { style: { margin: '6px 0 0' } }, 'เสียง ซับ ความยาว และแคปชั่นเรียบร้อย'));
    }).catch((e) => { console.error(e); card.remove(); });
    return card;
  }
  function stepOut() {
    const box = h('div'); box.append(checkCard());
    const mime = pickMime(); const isMp4 = mime?.startsWith('video/mp4');
    const [a, , z] = window_(P);
    const needAudio = !(P.mode === 'voice' && P.audio === 'none');
    const ok = timed(P.chunks) && (!needAudio || segList(P).length > 0);
    const resSeg = h('div.seg', [[1080, '1080×1920 คมชัด'], [720, '720×1280 เร็วกว่า']].map(([v, l]) => h('button', { class: P.res === v ? 'on' : '', onclick: () => { P.res = v; save(); paintPanel(); } }, l)));
    const bar = h('div.vd-bar', h('i')); const result = h('div.vd-result');
    const btn = h('button.btn.primary.vd-export', { disabled: !ok || !mime, onclick: run }, icon('download'), 'สร้างไฟล์วิดีโอ');
    box.append(h('div.card', h('h3.vd-h3', 'ส่งออก'),
      h('div.vd-kv', h('div', h('small', 'ความยาว'), h('b', fmtT(z - a))), h('div', h('small', 'สไตล์'), h('b', VSTYLES[P.style].name)), h('div', h('small', 'ไฟล์'), h('b', mime ? (isMp4 ? 'MP4' : 'WebM') : 'ไม่รองรับ'))),
      h('div', { style: { margin: '12px 0' } }, resSeg),
      !ok ? h('p.small.warn-t', !timed(P.chunks) ? 'ยังจัดจังหวะไม่ครบ กลับไปขั้นที่ 2 ก่อน' : 'ยังไม่มีคลิป/เสียง') : null,
      !mime ? h('p.small.warn-t', 'เบราว์เซอร์นี้อัดวิดีโอไม่ได้ ใช้ Chrome บนแอนดรอยด์หรือคอม') : null,
      btn, bar, result,
      h('ul.vd-tips', h('li', 'ระหว่างสร้างไฟล์ แอปจะเล่นคลิป 1 รอบตามเวลาจริง อย่าสลับแอปหรือปิดจอ'), h('li', 'ซับอยู่ในภาพแล้ว ไม่ต้องเปิดคำบรรยายอัตโนมัติซ้ำ · ขอบล่างและขวาเว้นไว้ให้ปุ่มของแอปแล้ว'), P.music !== 'off' ? h('li', 'มีเพลงประกอบในไฟล์แล้ว ถ้าเพิ่มเพลงใน TikTok อีก ให้ปิดเสียงเพลงของแอปก่อน') : null, !isMp4 && mime ? h('li', 'ไฟล์เป็น .webm: แชร์เข้า TikTok หรือ CapCut ได้ตรง ๆ') : null)));
    // แคปชั่น
    const capData = makeCaption(P, profile()); const capTa = h('textarea.input', { rows: 7, 'aria-label': 'แคปชั่น', onchange: (e) => { P.caption = e.target.value; save(); } }, P.caption || capData.caption);
    box.append(h('div.card', h('h3.vd-h3', 'แคปชั่นและแฮชแท็ก'), capTa, h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, h('button.btn.primary', { onclick: () => copyText(capTa.value) }, icon('copy'), 'คัดลอก'), h('button.btn', { onclick: () => { P.caption = ''; save(); paintPanel(); } }, icon('sync'), 'เขียนใหม่จากซับ')),
      capData.risks.length ? h('div.callout.warn.small', { style: { marginTop: '10px' } }, h('b', `คำที่ควรตรวจ ${capData.risks.length} จุด`), h('ul', capData.risks.map((r) => h('li', h('b', `"${r.found}" `), `${r.label} → ${r.tip}`)))) : null));
    // ภาพปก: แนะนำ 3 แบบ (เฟรมหน้าตรง ตาเปิด ยิ้ม + หัวข้อ 3 แบบ + 3 สไตล์) หรือทำจากเฟรมที่เลือกเอง
    const coverTitle = h('input.input', { value: P.coverTitle ?? P.title, 'aria-label': 'หัวข้อบนปก', onchange: (e) => { P.coverTitle = e.target.value; save(); } });
    const coverOut = h('div.vd-cover'); const sugg = h('div.vd-covers');
    box.append(h('div.card', h('h3.vd-h3', 'ภาพปกคลิป'), h('p.xs.muted', { style: { margin: '0 0 8px' } }, 'แตะแบบที่ชอบ หรือเลื่อนตัวอย่างไปเฟรมที่ต้องการแล้วกด "ทำปกจากเฟรมนี้" · ปกไม่มีซับ'), sugg,
      h('label.vd-field', { style: { marginTop: '10px' } }, h('span', 'หัวข้อบนปก'), coverTitle),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, h('button.btn', { onclick: suggestCovers }, icon('sync'), 'แนะนำปกใหม่'), h('button.btn', { onclick: () => makeCover(M.player.t, coverTitle.value.trim(), P.coverLook || 'top') }, icon('star'), 'ทำปกจากเฟรมนี้')), coverOut));
    const titleIdeas = () => {
      // หัวข้อปก: ตัดตามช่วงซับ (วลีธรรมชาติ) ไม่ตัดกลางคำ · ยาวไม่เกิน ~28 ตัวอักษร
      const lines = [...new Set(P.chunks.map((c) => c.line))].map((ln) => P.chunks.filter((c) => c.line === ln).map((c) => c.text.replace(/\*/g, '').trim()).filter(Boolean));
      const pick = (arr) => { let o = ''; for (const t of arr) { const n = o ? o + ' ' + t : t; if (o && visLen(n) > 28) break; o = n; } return o; };
      const ideas = [P.coverTitle || P.title, lines[0] && pick(lines[0]), pick(lines.find((l) => /\d|ล้าน|แสน|%/.test(l.join(''))) || lines[1] || [])].filter(Boolean);
      return [...new Set(ideas)].concat(ideas).slice(0, 3);
    };
    async function suggestCovers() {
      sugg.replaceChildren(h('p.small.muted', 'กำลังเลือกเฟรมที่หน้าตรงและยิ้ม…')); await loadFonts(); const F = await import('../video/face.js'); const sl = segList(P); const [a, b] = window_(P);
      const camAt = (t) => { const sg = M.player.tl.segs.find((x) => x.start <= t && t < x.end + 0.05); return !sg || ['cam', 'bw'].includes(sg.scene); };
      let ts = F.coverTimes(P, sl, { ok: camAt }); const pad = [0.2, 0.5, 0.75, 0.35, 0.62, 0.9, 0.1].map((f) => +(a + (b - a) * f).toFixed(2)).filter((t) => camAt(t) && ts.every((u) => Math.abs(u - t) > 1)); while (ts.length < 3 && pad.length) ts.push(pad.shift()); while (ts.length < 3) ts.push(+(a + (b - a) * 0.5).toFixed(2));
      const looks = ['top', 'mid', 'band']; const titles = titleIdeas(); const was = M.player.t; const opts = [];
      for (let k = 0; k < 3; k++) { await M.player.seek(ts[k]); const c = document.createElement('canvas'); c.width = 360; c.height = 640; drawCover(c.getContext('2d'), P, ts[k], M.player.active, titles[k], M.player.tl, { ...M.player.ext, win: M.player.win }, looks[k]); opts.push({ t: ts[k], title: titles[k], look: looks[k], src: c.toDataURL('image/jpeg', 0.8) }); }
      await M.player.seek(was);
      sugg.replaceChildren(...opts.map((o) => h('button.vd-coveropt', { type: 'button', onclick: () => { coverTitle.value = o.title; P.coverTitle = o.title; P.coverLook = o.look; save(); makeCover(o.t, o.title, o.look); } }, h('img', { src: o.src, alt: 'แบบปก' }))));
    }
    async function makeCover(t, title, look) {
      await loadFonts(); const was = M.player.t; if (Math.abs(was - t) > 0.05) await M.player.seek(t); const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
      drawCover(c.getContext('2d'), P, t, M.player.active, title, M.player.tl, { ...M.player.ext, win: M.player.win }, look);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)); const url = URL.createObjectURL(blob); const name = 'aom-cover.jpg'; const file = new File([blob], name, { type: 'image/jpeg' });
      P.coverMade = true; P.coverT = t; save();
      coverOut.replaceChildren(h('img', { src: url, alt: 'ภาพปก' }), h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, navigator.canShare?.({ files: [file] }) ? h('button.btn.primary', { onclick: () => navigator.share({ files: [file] }).catch(() => {}) }, icon('share'), 'แชร์') : null, h('a.btn', { href: url, download: name }, icon('download'), 'บันทึกปก')));
    }
    setTimeout(suggestCovers, 300);
    async function run() {
      btn.disabled = true; result.replaceChildren(); bar.classList.add('on'); let lock = null;
      try { lock = await navigator.wakeLock?.request('screen'); } catch {}
      const pl = M.player; pl.pause(); setPlayIcon(false); const W = P.res === 720 ? 720 : 1080;
      cv.width = W; cv.height = Math.round(W * 16 / 9);
      try {
        await ensureAssets(); await new Promise((r) => setTimeout(r, 300));
        const blob = await pl.record((p) => { bar.firstChild.style.width = Math.round(p * 100) + '%'; });
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'; const name = `aom-clip-${new Date().toISOString().slice(0, 10)}.${ext}`;
        const url = URL.createObjectURL(blob); const file = new File([blob], name, { type: blob.type });
        const canShare = navigator.canShare?.({ files: [file] });
        result.replaceChildren(h('video.vd-out', { src: url, controls: true, playsInline: true }),
          h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } },
            canShare ? h('button.btn.primary', { onclick: () => navigator.share({ files: [file], title: P.title }).catch(() => {}) }, icon('share'), 'แชร์ไป TikTok / แอปอื่น') : null,
            h('a.btn' + (canShare ? '' : '.primary'), { href: url, download: name }, icon('download'), 'บันทึกไฟล์')),
          h('p.xs.muted', `${name} · ${(blob.size / 1048576).toFixed(1)} MB`));
        P.exportedAt = new Date().toISOString(); save(); toast('สร้างไฟล์เสร็จแล้ว');
      } catch (e) { result.replaceChildren(h('p.small.warn-t', 'สร้างไฟล์ไม่สำเร็จ: ' + (e.message || e))); }
      finally { cv.width = 540; cv.height = 960; pl.draw(); bar.classList.remove('on'); bar.firstChild.style.width = '0'; btn.disabled = false; lock?.release?.().catch(() => {}); }
    }
    return box;
  }

  const node = h('div.vd-ed', { 'data-title': 'ตัดต่อคลิป' },
    h('div.topbar', h('div', h('a.crumb', { href: '#/studio/video' }, '‹ ตัดต่อคลิป'), titleIn, h('div.sub', P.mode === 'cam' ? 'พูดหน้ากล้อง' : 'เสียงพากย์ + กราฟิก')), h('button.icon-btn', { 'aria-label': 'เปิดบนอีกเครื่อง', onclick: () => import('../qr.js').then((m) => m.openOnOtherDevice('ไฟล์คลิปไม่ซิงก์ — อีกเครื่องต้องเลือกไฟล์เดิม หรืออัดใหม่')) }, icon('link'))),
    h('div.vd-grid', preview, h('div.vd-side', stepNav, panel)));
  M.node = node;
  loadFonts().then(() => M?.player?.draw());
  await attachMedia();
  if (M.bad && step !== 'media') step = 'media';
  paintSteps(); paintPanel();
  if (q.rec) { history.replaceState(null, '', '#/studio/video/' + id); setTimeout(recordNow, 350); }
  if (q.auto) { P.autoMode = true; saveP(P); history.replaceState(null, '', '#/studio/video/' + id); }
  return node;
}
