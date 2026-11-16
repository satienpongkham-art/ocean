// ─── ตัดต่อคลิป: พูดหน้ากล้อง / เสียงพากย์ + กราฟิก → ซับทีละคำ ซูม ฉากตาราง สติกเกอร์ เสียงประกอบ → ไฟล์ 9:16 ───
import { h, icon, sheet, closeSheet, toast, dateTH, empty } from '../ui.js';
import * as store from '../store.js';
import { VSTYLES, SCENES, parseScript, speechFromScript, autoTime, readDur, timed, Player, loadFonts, preloadEmoji, emojiImg, pickMime, window_ } from '../video/engine.js';
import { EMOJI, EMOJI_BY, emojiSrc, suggestEmoji } from '../../data/emoji.js';

// ── เก็บโปรเจกต์ (ข้อมูลเล็กใน localStorage · ไฟล์คลิป/เสียงใน IndexedDB ของเครื่องนี้) ──
const KEY = 'advdesk.v1.videos';
const all = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const getP = (id) => all()[id] || null;
function saveP(p) { const a = all(); p.updatedAt = new Date().toISOString(); a[p.id] = p; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { toast('พื้นที่เก็บในเครื่องเต็ม'); } }
function delP(id) { const a = all(); delete a[id]; localStorage.setItem(KEY, JSON.stringify(a)); idb('delete', id).catch(() => {}); }
function idb(op, id, val) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('aom-video', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('media');
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => { const db = rq.result; const tx = db.transaction('media', op === 'get' ? 'readonly' : 'readwrite'); const s = tx.objectStore('media');
      const r = op === 'get' ? s.get(id) : op === 'put' ? s.put(val, id) : s.delete(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); };
  });
}
const newId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const fmtT = (s) => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
const fmtS = (s) => (s == null ? '—' : s.toFixed(1));

function createProject({ mode, script = '', title = '', from = null }) {
  const p = { id: newId(), title: title || (mode === 'cam' ? 'คลิปพูดหน้ากล้อง' : 'คลิปเสียงพากย์'), mode, audio: mode === 'voice' ? 'none' : 'file', script, chunks: parseScript(script), style: 'neon', zoom: true, sfx: true, ticks: false, sfxVol: 0.8, trimHead: true, trimTail: true, res: 1080, readSpeed: 1, from, createdAt: new Date().toISOString(), hasMedia: false };
  if (p.mode === 'voice' && p.chunks.length) p.chunks = autoTime(p.chunks, readDur(p.chunks, 1));
  saveP(p); return p;
}

// ── หน้ารวม ──
export function renderVideos(q = {}) {
  if (q.from) { const it = store.get('content', q.from); if (it) return import('./studio.js').then((S) => { const p = createProject({ mode: q.mode === 'voice' ? 'voice' : 'cam', script: speechFromScript(it.script || S.toScript(it)), title: it.title, from: it.id }); location.replace('#/studio/video/' + p.id); return h('div'); }); }
  const list = Object.values(all()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return h('div', { 'data-title': 'ตัดต่อคลิป' },
    h('div.topbar', h('div', h('h1', 'ตัดต่อคลิป'), h('div.sub', 'ซับทีละคำ · ซูมตัดช็อต · สติกเกอร์ 3 มิติ · เสียงประกอบ — ทำในเครื่อง ไม่เสียเงิน')), h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'คลิปใหม่')),
    h('div.vd-how', [['1', 'สื่อและบท', 'เลือกคลิปจากเครื่อง หรืออัดเสียง แล้ววางบท'], ['2', 'จิ้มจังหวะ', 'เล่นคลิป แตะทุกครั้งที่พูดคำถัดไป'], ['3', 'ตกแต่ง', 'เลือกสไตล์ สติกเกอร์ ฉาก เสียง'], ['4', 'ส่งออก', 'ได้ไฟล์ 9:16 แชร์เข้า TikTok/Reels']].map(([n, b, s]) => h('div', h('i', n), h('b', b), h('small', s)))),
    list.length ? h('div.vd-list', list.map((p) => h('div.vd-item',
      h('a', { href: '#/studio/video/' + p.id }, h('span.vd-ic', { style: { '--a': VSTYLES[p.style]?.sw[1] || '#a6192e', '--b': VSTYLES[p.style]?.sw[0] || '#eee' } }, icon(p.mode === 'cam' ? 'user' : 'chat')),
        h('div', h('b', p.title), h('small', [p.mode === 'cam' ? 'พูดหน้ากล้อง' : 'เสียงพากย์ + กราฟิก', VSTYLES[p.style]?.name, `${p.chunks.length} ช่วง`, timed(p.chunks) ? 'จัดจังหวะแล้ว' : 'ยังไม่จัดจังหวะ', p.updatedAt ? dateTH(p.updatedAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')))),
      h('button.icon-btn', { 'aria-label': 'ลบคลิป ' + p.title, onclick: () => { if (confirm('ลบโปรเจกต์นี้? (ไฟล์คลิปต้นฉบับในเครื่องคุณยังอยู่)')) { delP(p.id); location.hash = '#/studio/video?r=' + Date.now(); } } }, icon('trash')))))
      : h('div.card', empty('ยังไม่มีคลิป', 'play', h('button.btn.primary', { onclick: newSheet }, icon('plus'), 'เริ่มคลิปแรก'), 'หรือเปิดงานในสตูดิโอ แท็บ "บทคลิป" แล้วกด "ตัดต่อคลิปจากบทนี้"')),
    h('p.xs.muted', { style: { marginTop: '14px' } }, 'คลิปและเสียงเก็บในเครื่องนี้เท่านั้น ไม่ซิงก์ขึ้นคลาวด์ · สติกเกอร์ Fluent Emoji (Microsoft, MIT) · เสียงประกอบสร้างในแอป ไม่ติดลิขสิทธิ์'));
}

function newSheet() {
  const items = store.all('content').filter((x) => x.deck).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 12);
  let mode = 'cam', src = '';
  const body = h('div',
    h('div.vd-modes', [['cam', 'user', 'พูดหน้ากล้อง', 'ถ่ายคลิปตัวเองพูด แล้วให้แอปใส่ซับ ซูม สติกเกอร์'], ['voice', 'chat', 'เสียงพากย์ + กราฟิก', 'ไม่ต้องออกกล้อง อัดเสียง (หรือไม่ใส่เสียง) ฉากกราฟิกตามบท']].map(([k, ic, b, s]) => h('button.vd-mode', { type: 'button', class: k === mode ? 'on' : '', onclick: (e) => { mode = k; [...e.currentTarget.parentNode.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, h('span', icon(ic)), h('b', b), h('small', s)))),
    h('h3.vd-h3', 'บทพูด'),
    h('div.vd-src', h('button.chip.on', { type: 'button', 'data-s': '', onclick: pick }, 'เริ่มจากบทว่าง'), items.map((it) => h('button.chip', { type: 'button', 'data-s': it.id, onclick: pick }, it.title.slice(0, 32)))),
    h('div.row', { style: { marginTop: '16px', justifyContent: 'flex-end' } }, h('button.btn.primary', { onclick: go }, 'เริ่มทำ', icon('next'))));
  function pick(e) { src = e.currentTarget.dataset.s; [...e.currentTarget.parentNode.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); }
  async function go() {
    let script = '', title = '';
    if (src) { const it = store.get('content', src); const S = await import('./studio.js'); script = speechFromScript(it.script || S.toScript(it)); title = it.title; }
    const p = createProject({ mode, script, title, from: src || null }); closeSheet(true); location.hash = '#/studio/video/' + p.id;
  }
  sheet({ title: 'คลิปใหม่', sub: 'ตัดต่อคลิป', body });
}

// ── หน้าแก้ไข ──
let M = null; // { id, node, player, media, url }
window.addEventListener('hashchange', () => { if (M && !location.hash.startsWith('#/studio/video/' + M.id)) { M.player?.pause(); M.stopRec?.(); } });

export async function renderVideoEditor(id) {
  if (M && M.id === id && M.node) return M.node;
  if (M) { M.player?.destroy(); if (M.url) URL.revokeObjectURL(M.url); M = null; }
  const P = getP(id);
  if (!P) return h('div.card', empty('ไม่พบโปรเจกต์นี้', 'play', h('a.btn', { href: '#/studio/video' }, 'กลับหน้ารวม')));
  M = { id };
  loadFonts().then(() => M?.player?.draw());
  preloadEmoji(P.chunks.map((c) => c.emoji)).then(() => M?.player?.draw());
  const save = () => { saveP(P); M.player?.refresh(); };

  // พื้นที่ดูตัวอย่าง
  const cv = h('canvas.vd-cv', { width: 540, height: 960, 'aria-label': 'ตัวอย่างคลิป' });
  const playBtn = h('button.vd-play', { 'aria-label': 'เล่น/หยุด', onclick: () => togglePlay() }, icon('play'));
  const scrub = h('input.vd-scrub', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'เลื่อนเวลา', oninput: (e) => { const [a, b] = M.player.win; M.player.pause(); setPlayIcon(false); M.player.seek(a + (b - a) * e.target.value / 1000); } });
  const tLabel = h('span.vd-time', '0:00 / 0:00');
  const preview = h('div.vd-prev', h('div.vd-frame', cv, h('div.vd-safe', { 'aria-hidden': 'true' })), h('div.vd-ctl', playBtn, scrub, tLabel));
  const setPlayIcon = (on) => playBtn.replaceChildren(icon(on ? 'pause' : 'play'));

  async function attachMedia() {
    let blob = null; if (P.hasMedia) blob = await idb('get', P.id).catch(() => null);
    if (M.url) URL.revokeObjectURL(M.url);
    M.media = null; M.url = null;
    if (blob) { M.url = URL.createObjectURL(blob); const el = document.createElement(P.mode === 'cam' ? 'video' : 'audio'); el.playsInline = true; el.preload = 'auto'; el.src = M.url; el.crossOrigin = 'anonymous';
      await new Promise((r) => { el.onloadedmetadata = r; el.onerror = r; setTimeout(r, 6000); }); M.media = el; P.mediaDur = isFinite(el.duration) ? el.duration : 0;
      M.bad = !(P.mediaDur > 0) || (P.mode === 'cam' && !el.videoWidth); if (M.bad) { M.media = null; } }
    else M.bad = false;
    M.player?.destroy();
    M.player = new Player(cv, P, M.media);
    M.player.onTime = (t) => { const [a, b] = M.player.win; tLabel.textContent = `${fmtT(t - a)} / ${fmtT(b - a)}`; if (document.activeElement !== scrub) scrub.value = Math.round(((t - a) / Math.max(0.01, b - a)) * 1000); onTick?.(t); };
    M.player.onEnd = () => setPlayIcon(false);
    if (M.media && P.mode === 'cam') M.media.addEventListener('seeked', () => !M.player.playing && M.player.draw(), { once: false });
    await M.player.seek(M.player.win[0]);
  }
  function togglePlay() {
    const pl = M.player; if (!pl) return;
    if (pl.playing) { pl.pause(); setPlayIcon(false); return; }
    pl.refresh(); const [a, b] = pl.win; const from = pl.t >= b - 0.05 || pl.t < a ? a : pl.t;
    pl.play(from); setPlayIcon(true);
  }
  let onTick = null;

  // ขั้นตอน
  const STEPS = [['media', 'สื่อและบท'], ['sync', 'จิ้มจังหวะ'], ['look', 'ตกแต่ง'], ['out', 'ส่งออก']];
  let step = P.chunks.length && (P.hasMedia || P.mode === 'voice') ? (timed(P.chunks) ? 'look' : 'sync') : 'media';
  const stepNav = h('div.vd-steps', { role: 'tablist' });
  const panel = h('div.vd-panel');
  const titleIn = h('input.vd-title', { value: P.title, 'aria-label': 'ชื่อคลิป', onchange: (e) => { P.title = e.target.value.trim() || P.title; save(); } });
  function paintSteps() { stepNav.replaceChildren(...STEPS.map(([k, l], i) => h('button', { role: 'tab', 'aria-selected': String(k === step), class: k === step ? 'on' : '', onclick: () => go(k) }, h('i', i + 1), l))); }
  function go(k) { if (M.tapOn) return; step = k; onTick = null; paintSteps(); paintPanel(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function paintPanel() { panel.replaceChildren(({ media: stepMedia, sync: stepSync, look: stepLook, out: stepOut })[step]()); }
  const next = (k, label) => h('div.vd-next', h('button.btn.primary', { onclick: () => go(k) }, label, icon('next')));

  // ── 1. สื่อและบท ──
  function stepMedia() {
    const box = h('div');
    const info = h('div.vd-media-info');
    const paintInfo = () => {
      if (M.bad) info.replaceChildren(h('div.vd-bad', icon('info'), h('span', h('b', (P.mediaName || 'ไฟล์นี้') + ' เปิดเล่นไม่ได้'), h('small', 'เบราว์เซอร์ไม่รองรับไฟล์แบบนี้ (เช่น .avi) กดแปลงเป็น MP4 ในเครื่องได้เลย')), h('button.btn.primary', { onclick: () => M.fixMedia?.() }, 'แปลงไฟล์')));
      else if (P.mode === 'cam') info.replaceChildren(M.media ? h('div.vd-ok', icon('check'), h('span', h('b', P.mediaName || 'คลิปของคุณ'), h('small', `ยาว ${fmtT(P.mediaDur)}${P.mediaDur > 90 ? ' · ยาวไป แนะนำไม่เกิน 60 วินาที' : ''}`))) : h('p.small.muted', 'ถ่ายแนวตั้ง แสงเข้าหน้า เสียงชัด · ยาว 15–30 วินาทีกำลังดี'));
      else info.replaceChildren(P.audio === 'none' ? h('p.small.muted', 'ไม่มีเสียงพูด: ซับขึ้นตามความเร็วอ่าน แล้วไปเลือกเพลงใน TikTok ตอนโพสต์') : M.media ? h('div.vd-ok', icon('check'), h('span', h('b', P.audio === 'rec' ? 'เสียงที่อัดไว้' : (P.mediaName || 'ไฟล์เสียง')), h('small', `ยาว ${fmtT(P.mediaDur)}`))) : h('p.small.muted', P.audio === 'rec' ? 'กดอัด แล้วอ่านบทด้านล่าง' : 'เลือกไฟล์เสียงจากเครื่อง'));
    };
    const kind = P.mode === 'cam' ? 'video' : 'audio';
    const useFile = async (f) => {
      if (f.size > 300 * 1024 * 1024) { toast('ไฟล์ใหญ่เกิน 300MB ลองตัดให้สั้นลงก่อน'); return; }
      const { probe, toMp4 } = await import('../video/convert.js');
      if (!(await probe(f, kind))) {
        if (f.size > 200 * 1024 * 1024) { toast('ไฟล์นี้เบราว์เซอร์เปิดไม่ได้ และใหญ่เกินกว่าจะแปลงในเครื่อง (เกิน 200MB)'); return; }
        const stage = h('p.small', 'เตรียมแปลงไฟล์…'), bar = h('div.vd-bar.on', h('i'));
        sheet({ title: 'แปลงไฟล์ให้เปิดได้', sub: f.name, body: h('div', h('p.small.muted', `ไฟล์ .${(f.name.split('.').pop() || '').toLowerCase()} นี้ Chrome เปิดเล่นไม่ได้ แอปจะแปลงเป็น MP4 ให้ในเครื่อง (ไม่อัปโหลดไปไหน) ใช้เวลาประมาณ 1–3 เท่าของความยาวคลิป อย่าปิดหน้านี้`), stage, bar) });
        try { f = await toMp4(f, { kind, onStage: (t) => { stage.textContent = t; }, onProgress: (p) => { bar.firstChild.style.width = Math.round(p * 100) + '%'; stage.textContent = 'กำลังแปลงไฟล์ในเครื่อง… ' + Math.round(p * 100) + '%'; } }); closeSheet(true); toast('แปลงไฟล์เสร็จแล้ว'); }
        catch (err) { closeSheet(true); toast('แปลงไฟล์ไม่สำเร็จ: ' + (err.message || err)); return; }
      }
      try { await idb('put', P.id, f); } catch { toast('เก็บไฟล์ในเครื่องไม่ได้ (พื้นที่ไม่พอ?)'); return; }
      P.hasMedia = true; P.mediaName = f.name; save(); await attachMedia(); save(); paintInfo(); toast('เพิ่มไฟล์แล้ว');
    };
    M.fixMedia = async () => { const b = await idb('get', P.id).catch(() => null); if (b) useFile(b instanceof File ? b : new File([b], P.mediaName || 'clip.avi', { type: b.type })); };
    const fileIn = h('input', { type: 'file', accept: P.mode === 'cam' ? 'video/*,.avi,.mkv,.mov,.wmv,.3gp,.flv,.mts,.m4v' : 'audio/*,.m4a,.aac,.wav,.ogg,.amr,.wma', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) useFile(f); } });
    if (P.mode === 'cam') box.append(h('div.card', h('h3.vd-h3', 'คลิปของคุณ'), info, h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, h('button.btn' + (M.media ? '' : '.primary'), { onclick: () => fileIn.click() }, icon('upload'), M.media ? 'เปลี่ยนคลิป' : 'เลือกคลิปจากเครื่อง')), fileIn));
    else {
      const recBox = h('div');
      const setAudio = (v) => { P.audio = v; if (v === 'none') { P.hasMedia = false; idb('delete', P.id).catch(() => {}); P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); } save(); attachMedia().then(() => { paintInfo(); paintRec(); }); paintAud(); };
      const audSeg = h('div.seg'); const paintAud = () => audSeg.replaceChildren(...[['rec', 'อัดเสียงในแอป'], ['file', 'ไฟล์เสียง'], ['none', 'ไม่มีเสียง']].map(([k, l]) => h('button', { class: P.audio === k ? 'on' : '', onclick: () => setAudio(k) }, l)));
      const paintRec = () => {
        recBox.replaceChildren();
        if (P.audio === 'file') recBox.append(h('button.btn', { onclick: () => fileIn.click() }, icon('upload'), M.media ? 'เปลี่ยนไฟล์เสียง' : 'เลือกไฟล์เสียง'), fileIn);
        if (P.audio === 'rec') { const b = h('button.btn.primary.vd-rec', { onclick: () => toggleRec(b) }, h('span.vd-dot'), M.media ? 'อัดใหม่' : 'เริ่มอัด'); recBox.append(b); }
      };
      paintAud(); paintRec();
      box.append(h('div.card', h('h3.vd-h3', 'เสียง'), audSeg, h('div', { style: { marginTop: '10px' } }, info, recBox)));
    }
    paintInfo();
    // บท
    const chips = h('div.vd-chunks');
    const paintChips = () => { let line = -1; chips.replaceChildren(...P.chunks.flatMap((c) => { const out = []; if (c.line !== line) { line = c.line; out.push(h('i.vd-br', { 'aria-hidden': 'true' })); } out.push(h('span.vd-chunk', c.words.map((w) => (w.key ? h('b', w.w) : w.w)))); return out; })); };
    const ta = h('textarea.input.vd-script', { rows: 8, placeholder: 'พิมพ์หรือวางบทพูด\nขึ้นบรรทัดใหม่ = ตัดช็อต/ซูมใหม่\nครอบ *คำสำคัญ* ด้วยดอกจัน = คำเด่นสีสะดุดตา', 'aria-label': 'บทพูด',
      oninput: (e) => { P.script = e.target.value; const old = P.chunks; P.chunks = parseScript(P.script, old); if (P.mode === 'voice' && P.audio === 'none') P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); save(); paintChips(); M.player?.draw(); } }, P.script || '');
    const pull = h('button.btn', { onclick: pullFromStudio }, icon('studio'), 'ดึงบทจากงานในสตูดิโอ');
    box.append(h('div.card', h('h3.vd-h3', 'บทพูด'), h('p.xs.muted', { style: { margin: '0 0 8px' } }, 'แอปจะแบ่งเป็นช่วงสั้น ๆ 1–3 คำให้เอง ขึ้นบรรทัดใหม่ = ตัดช็อต · *คำ* = คำเด่น'), ta, h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } }, pull), chips));
    paintChips();
    function pullFromStudio() {
      const items = store.all('content').filter((x) => x.deck).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      sheet({ title: 'ดึงบทจากสตูดิโอ', body: items.length ? h('div.vd-pick', items.slice(0, 30).map((it) => h('button.vd-pick-i', { onclick: async () => { const S = await import('./studio.js'); P.script = speechFromScript(it.script || S.toScript(it)); P.chunks = parseScript(P.script, []); if (P.mode === 'voice' && P.audio === 'none') P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); if (!P.title || /^คลิป/.test(P.title)) { P.title = it.title; titleIn.value = it.title; } save(); closeSheet(true); paintPanel(); M.player?.draw(); } }, h('b', it.title), h('small', `${it.deck.slides.length} หน้า`)))) : empty('ยังไม่มีงานในสตูดิโอ', 'studio') });
    }
    box.append(next('sync', 'ต่อไป: จิ้มจังหวะ'));
    return box;
  }
  // อัดเสียงในแอป
  async function toggleRec(btn) {
    if (M.rec) { M.stopRec(); return; }
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { toast('ไม่ได้รับอนุญาตให้ใช้ไมค์'); return; }
    const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined); const parts = []; const t0 = Date.now();
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); clearInterval(M.recT); M.rec = null; ov.remove();
      const blob = new Blob(parts, { type: mt.split(';')[0] || 'audio/webm' }); await idb('put', P.id, blob); P.hasMedia = true; P.mediaName = 'เสียงที่อัด'; P.chunks = P.chunks.map((c) => ({ ...c, t0: null, t1: null })); save(); await attachMedia(); save(); toast('อัดเสียงแล้ว ต่อไปจิ้มจังหวะ'); go('sync'); };
    const timer = h('b', '0:00');
    const ov = h('div.vd-recov', { role: 'dialog', 'aria-label': 'กำลังอัดเสียง' }, h('div.vd-rec-top', h('span.vd-dot.on'), 'กำลังอัด ', timer), h('div.vd-rec-text', (P.script || 'อ่านบทของคุณ').split('\n').map((l) => h('p', l.replace(/\*/g, '')))), h('button.btn.primary.vd-rec-stop', { onclick: () => M.stopRec() }, 'หยุดอัด'));
    document.body.append(ov);
    M.rec = rec; M.stopRec = () => { if (M.rec && M.rec.state !== 'inactive') M.rec.stop(); };
    M.recT = setInterval(() => { timer.textContent = fmtT((Date.now() - t0) / 1000); }, 250);
    rec.start(250);
  }

  // ── 2. จิ้มจังหวะ ──
  function stepSync() {
    const box = h('div');
    if (!P.chunks.length) { box.append(h('div.card', empty('ยังไม่มีบท', 'pen', h('button.btn.primary', { onclick: () => go('media') }, 'ไปใส่บท')))); return box; }
    if (P.mode === 'voice' && P.audio === 'none') {
      const sp = h('div.seg'); const paint = () => sp.replaceChildren(...[[0.8, 'ช้า'], [1, 'ปกติ'], [1.25, 'เร็ว'], [1.5, 'เร็วมาก']].map(([v, l]) => h('button', { class: P.readSpeed === v ? 'on' : '', onclick: () => { P.readSpeed = v; P.chunks = autoTime(P.chunks, readDur(P.chunks, v)); save(); paint(); M.player.seek(0); list(); } }, l)));
      if (!timed(P.chunks)) { P.chunks = autoTime(P.chunks, readDur(P.chunks, P.readSpeed)); save(); }
      paint();
      box.append(h('div.card', h('h3.vd-h3', 'ความเร็วซับ'), h('p.small.muted', 'ไม่มีเสียงพูด ซับจะขึ้นตามความเร็วอ่าน กด ▶ ด้านบนเพื่อดู'), sp));
    } else if (!M.media) {
      box.append(h('div.card', empty(P.mode === 'cam' ? 'ยังไม่ได้เลือกคลิป' : 'ยังไม่มีเสียง', 'upload', h('button.btn.primary', { onclick: () => go('media') }, 'ไปเลือก'))));
      return box;
    } else box.append(tapPanel());
    const rows = h('div.vd-rows'); box.append(h('div.card', h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'ปรับทีละช่วง'), h('small.muted', 'แตะข้อความเพื่อดูช่วงนั้น')), rows));
    function list() {
      rows.replaceChildren(...P.chunks.map((c, i) => h('div.vd-row', { class: c.t0 == null ? 'pending' : '' },
        h('button.vd-row-t', { onclick: () => { if (c.t0 != null) { M.player.pause(); setPlayIcon(false); M.player.seek(c.t0 + 0.2); } } }, h('small', fmtS(c.t0)), h('span', c.words.map((w) => (w.key ? h('b', w.w) : w.w)))),
        h('div.vd-nudge', h('button.icon-btn', { 'aria-label': 'ขึ้นเร็วขึ้น 0.1 วินาที', disabled: c.t0 == null, onclick: () => nudge(i, -0.1) }, '−'), h('button.icon-btn', { 'aria-label': 'ขึ้นช้าลง 0.1 วินาที', disabled: c.t0 == null, onclick: () => nudge(i, 0.1) }, '+')))));
    }
    function nudge(i, d) { const c = P.chunks[i]; const prev = P.chunks[i - 1]; const lo = prev?.t0 != null ? prev.t0 + 0.1 : 0; c.t0 = +Math.max(lo, Math.min(c.t1 - 0.1, c.t0 + d)).toFixed(2); if (prev && prev.t1 != null) prev.t1 = c.t0; save(); list(); M.player.seek(c.t0 + 0.15); }
    list(); M.paintRows = list;
    box.append(next('look', 'ต่อไป: ตกแต่ง'));
    return box;
  }
  function tapPanel() {
    let rate = 0.85, i = 0;
    const cur = h('div.vd-tap-cur'), nxt = h('div.vd-tap-nxt'), stat = h('div.vd-tap-stat');
    const n = P.chunks.length;
    const paint = () => {
      const done = P.chunks.filter((c) => c.t0 != null).length;
      if (M.tapOn) { cur.replaceChildren(i < n ? h('span', P.chunks[i].words.map((w) => (w.key ? h('b', w.w) : w.w))) : h('span.muted', 'แตะอีกครั้งเมื่อพูดจบ')); nxt.textContent = i + 1 < n ? 'ถัดไป: ' + P.chunks[i + 1].text : ''; stat.textContent = `${i}/${n}`; }
      else { cur.replaceChildren(h('span.muted', timed(P.chunks) ? 'จัดจังหวะครบแล้ว ✓ ดูตัวอย่างด้านบนได้เลย' : 'กด "เริ่มจิ้ม" แล้วแตะปุ่มใหญ่ทุกครั้งที่เริ่มพูดช่วงถัดไป')); nxt.textContent = ''; stat.textContent = `${done}/${n}`; }
      tapBtn.disabled = !M.tapOn; startBtn.textContent = M.tapOn ? 'หยุด' : timed(P.chunks) ? 'จิ้มใหม่' : 'เริ่มจิ้ม';
    };
    const finish = () => {
      if (!M.tapOn) return; M.tapOn = false; M.player.pause(); setPlayIcon(false); document.removeEventListener('keydown', onKey);
      const end = M.player.win[1] || P.mediaDur; const last = P.chunks[i - 1];
      if (last && last.t1 == null) last.t1 = +Math.min(end, last.t0 + 2.5).toFixed(2);
      if (i < n) { const from = last ? last.t1 : 0.2; const rest = autoTime(P.chunks.slice(i), Math.max(from + 1, (P.mediaDur || end)) - from, 0).map((c) => ({ ...c, t0: +(c.t0 + from).toFixed(2), t1: +(c.t1 + from).toFixed(2) })); P.chunks.splice(i, n - i, ...rest); toast('ช่วงที่ยังไม่ได้จิ้ม จัดให้อัตโนมัติแล้ว'); }
      save(); paint(); M.paintRows?.(); M.player.seek(M.player.win[0]);
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
      P.chunks = P.chunks.map((c) => ({ ...c, t0: null, t1: null })); P.trimHeadSave = P.trimHead; i = 0; M.tapOn = true; M.player.P = P; M.player.refresh(); paint(); M.paintRows?.();
      document.addEventListener('keydown', onKey);
      M.player.onEnd = () => { setPlayIcon(false); finish(); };
      await M.player.play(0, { to: P.mediaDur || M.media.duration, sfx: false, rate }); setPlayIcon(true);
    };
    const tapBtn = h('button.vd-tap', { disabled: true, onpointerdown: (e) => { e.preventDefault(); tap(); } }, 'แตะ');
    const startBtn = h('button.btn.primary', { onclick: start }, 'เริ่มจิ้ม');
    const rateSeg = h('div.seg'); const paintRate = () => rateSeg.replaceChildren(...[[0.7, 'ช้า 0.7×'], [0.85, '0.85×'], [1, 'ปกติ']].map(([v, l]) => h('button', { class: rate === v ? 'on' : '', onclick: () => { rate = v; paintRate(); } }, l)));
    paintRate();
    const auto = h('button.btn', { onclick: () => { P.chunks = autoTime(P.chunks, P.mediaDur || 10, 0.3); save(); paint(); M.paintRows?.(); M.player.seek(0); toast('จัดจังหวะแบบเฉลี่ยแล้ว ปรับทีละช่วงด้านล่างได้'); } }, icon('sync'), 'จัดอัตโนมัติ (คร่าว ๆ)');
    setTimeout(paint);
    return h('div.card.vd-tapcard', h('div.row.between', h('h3.vd-h3', { style: { margin: 0 } }, 'จิ้มจังหวะซับ'), stat), cur, nxt, tapBtn,
      h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, startBtn, rateSeg, auto),
      h('p.xs.muted', { style: { marginTop: '8px' } }, 'คอมพิวเตอร์: กด Space แทนการแตะ · เล่นช้าลงช่วยให้จิ้มแม่นขึ้น · แอปหักเวลามือช้าให้แล้ว'));
  }

  // ── 3. ตกแต่ง ──
  function stepLook() {
    const box = h('div');
    const styles = h('div.vd-styles', Object.entries(VSTYLES).map(([k, s]) => h('button.vd-style', { type: 'button', class: P.style === k ? 'on' : '', style: { '--a': s.sw[1], '--b': s.sw[0] }, onclick: (e) => { P.style = k; save(); [...styles.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); M.player.draw(); } },
      h('span.vd-sw', h('i', k === 'neon' ? 'Aa' : k === 'grid' ? 'ก' : k === 'aom' ? 'AOM' : 'aa')), h('b', s.name), h('small', s.sub))));
    box.append(h('div.card', h('h3.vd-h3', 'สไตล์'), styles));
    const tg = (label, key, sub) => h('label.vd-tg', h('input', { type: 'checkbox', checked: !!P[key], onchange: (e) => { P[key] = e.target.checked; save(); M.player.draw(); } }), h('span', h('b', label), sub ? h('small', sub) : null));
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: P.sfxVol ?? 0.8, 'aria-label': 'ความดังเสียงประกอบ', onchange: (e) => { P.sfxVol = +e.target.value; save(); } });
    box.append(h('div.card', h('h3.vd-h3', 'การตัดและเสียง'),
      P.mode === 'cam' ? tg('ซูมตัดช็อตอัตโนมัติ', 'zoom', 'ภาพซูมเข้า-ออกทุกครั้งที่ขึ้นบรรทัดใหม่ เหมือนตัดหลายช็อต') : null,
      tg('ตัดช่วงเงียบตอนต้น', 'trimHead', 'เริ่มคลิปที่คำแรกทันที (สำคัญมากกับ 2 วินาทีแรก)'),
      tg('ตัดช่วงเงียบตอนท้าย', 'trimTail'),
      tg('เสียงประกอบ', 'sfx', 'ฟิ้วตอนตัดช็อต · ป๊อปตอนสติกเกอร์ · ติ๊งตอนคำเด่น'),
      tg('เสียงติ๊กทุกช่วงซับ', 'ticks'),
      h('label.vd-tg', h('span', h('b', 'ความดังเสียงประกอบ')), vol)));
    // สติกเกอร์ + ฉาก
    const rows = h('div.vd-rows');
    const paintRows = () => rows.replaceChildren(...P.chunks.map((c, i) => h('div.vd-row.deco', { class: c.line !== P.chunks[i - 1]?.line ? 'nl' : '' },
      h('button.vd-emo', { 'aria-label': c.emoji ? 'เปลี่ยนสติกเกอร์' : 'ใส่สติกเกอร์', onclick: () => pickEmoji(i) }, c.emoji ? h('img', { src: emojiSrc(c.emoji), alt: EMOJI_BY[c.emoji]?.[2] || '' }) : icon('plus')),
      h('button.vd-row-t', { onclick: () => { if (c.t0 != null) { M.player.pause(); setPlayIcon(false); M.player.seek(c.t0 + 0.35); } } }, h('small', fmtS(c.t0)), h('span', c.words.map((w) => (w.key ? h('b', w.w) : w.w)))),
      P.mode === 'cam' ? h('div.seg.sm-seg.vd-scene', Object.entries(SCENES).map(([k, l]) => h('button', { class: (c.scene || 'cam') === k ? 'on' : '', onclick: () => { c.scene = k; save(); paintRows(); M.player.seek(c.t0 != null ? c.t0 + 0.7 : 0); } }, l))) : null)));
    const autoBtn = h('button.btn.primary', { onclick: autoDeco }, icon('bulb'), 'ใส่สติกเกอร์และฉากให้อัตโนมัติ');
    const clearBtn = h('button.btn', { onclick: () => { P.chunks.forEach((c) => { c.emoji = null; c.scene = 'cam'; }); save(); paintRows(); M.player.draw(); } }, 'ล้างทั้งหมด');
    box.append(h('div.card', h('h3.vd-h3', 'สติกเกอร์และฉาก'), h('p.xs.muted', { style: { margin: '0 0 10px' } }, P.mode === 'cam' ? 'ฉากตาราง = ภาพหดเป็นการ์ดแล้วตัดไปที่สติกเกอร์ใหญ่ · ขาวดำ = ช่วงเล่าปัญหา แล้วกลับมาเป็นสีตอนบอกทางออก' : 'สติกเกอร์จะขึ้นใหญ่กลางฉาก ค้างไว้จนมีตัวใหม่หรือขึ้นบรรทัดใหม่'), h('div.row.wrap', { style: { gap: '8px', marginBottom: '10px' } }, autoBtn, clearBtn), rows));
    paintRows();
    function autoDeco() {
      const neg = /ไม่มี|ไม่ได้|ไม่พอ|ปัญหา|เสียเงิน|แพง|ยากมาก|ลำบาก|เจ็บ|ป่วย|หมดตัว|เสี่ยง/;
      let lastLine = -1, used = 0, lineN = -1;
      P.chunks.forEach((c) => {
        if (c.line !== lastLine) { lastLine = c.line; lineN++; used = 0; }
        const sug = suggestEmoji(c.text); c.emoji = null; c.scene = 'cam';
        if (sug && used < 1) { c.emoji = sug; used++; }
      });
      if (P.mode === 'cam') {
        const lines = [...new Set(P.chunks.map((c) => c.line))];
        lines.forEach((ln, k) => { const cs = P.chunks.filter((c) => c.line === ln); const txt = cs.map((c) => c.text).join('');
          if (k > 0 && neg.test(txt) && P.style !== 'grid') cs.forEach((c) => { c.scene = 'bw'; });
          else if (k > 0 && k % 3 === 1 && cs.some((c) => c.emoji)) { cs.forEach((c) => { c.scene = 'stage'; }); } });
      }
      if (P.mode === 'voice') { let cur = null; P.chunks.forEach((c, i) => { if (c.emoji) cur = c.emoji; else if (P.chunks[i - 1]?.line !== c.line && cur && !c.emoji) { c.emoji = suggestEmoji(P.chunks.filter((x) => x.line === c.line).map((x) => x.text).join('')) || null; } }); }
      save(); preloadEmoji(P.chunks.map((c) => c.emoji)).then(() => { paintRows(); M.player.seek(M.player.win[0]); }); toast('ใส่ให้แล้ว แก้ทีละช่วงได้');
    }
    function pickEmoji(i) {
      const c = P.chunks[i]; const sug = suggestEmoji(P.chunks.filter((x) => x.line === c.line).map((x) => x.text).join(''));
      const set = (code) => { c.emoji = code; save(); closeSheet(true); preloadEmoji([code]).then(() => { paintRows(); if (c.t0 != null) M.player.seek(c.t0 + 0.45); }); };
      const order = sug ? [EMOJI_BY[sug], ...EMOJI.filter((e) => e[0] !== sug)] : EMOJI;
      sheet({ title: 'เลือกสติกเกอร์', sub: `"${c.text}"`, body: h('div', h('div.vd-emogrid', h('button.vd-emo-i.none', { onclick: () => set(null) }, icon('close'), h('small', 'ไม่ใส่')), order.map(([code, , name]) => h('button.vd-emo-i', { class: code === c.emoji ? 'on' : code === sug ? 'sug' : '', onclick: () => set(code), 'aria-label': name }, h('img', { src: emojiSrc(code), alt: '', loading: 'lazy' }), h('small', name)))), h('p.xs.muted', 'Fluent Emoji โดย Microsoft (MIT License)')) });
    }
    box.append(next('out', 'ต่อไป: ส่งออก'));
    return box;
  }

  // ── 4. ส่งออก ──
  function stepOut() {
    const box = h('div');
    const mime = pickMime(); const isMp4 = mime?.startsWith('video/mp4');
    const [a, b] = window_(P, P.mediaDur || 0);
    const ok = timed(P.chunks) && (P.mode === 'voice' && P.audio === 'none' ? true : !!M.media);
    const resSeg = h('div.seg'); const paintRes = () => resSeg.replaceChildren(...[[1080, '1080×1920 คมชัด'], [720, '720×1280 เร็วกว่า']].map(([v, l]) => h('button', { class: P.res === v ? 'on' : '', onclick: () => { P.res = v; save(); paintRes(); } }, l)));
    paintRes();
    const bar = h('div.vd-bar', h('i')); const result = h('div.vd-result');
    const btn = h('button.btn.primary.vd-export', { disabled: !ok || !mime, onclick: run }, icon('download'), 'สร้างไฟล์วิดีโอ');
    box.append(h('div.card', h('h3.vd-h3', 'ส่งออก'),
      h('div.vd-kv', h('div', h('small', 'ความยาว'), h('b', fmtT(b - a))), h('div', h('small', 'สไตล์'), h('b', VSTYLES[P.style].name)), h('div', h('small', 'ไฟล์'), h('b', mime ? (isMp4 ? 'MP4' : 'WebM') : 'ไม่รองรับ'))),
      h('div', { style: { margin: '12px 0' } }, resSeg),
      !ok ? h('p.small.warn-t', !timed(P.chunks) ? 'ยังจัดจังหวะไม่ครบ กลับไปขั้นที่ 2 ก่อน' : 'ยังไม่มีคลิป/เสียง') : null,
      !mime ? h('p.small.warn-t', 'เบราว์เซอร์นี้อัดวิดีโอไม่ได้ ใช้ Chrome บนแอนดรอยด์หรือคอม') : null,
      btn, bar, result,
      h('ul.vd-tips', h('li', 'ระหว่างสร้างไฟล์ แอปจะเล่นคลิป 1 รอบตามเวลาจริง อย่าสลับแอปหรือปิดจอ'), h('li', 'เพลง: เลือกใน TikTok/Reels ตอนโพสต์ (บัญชีธุรกิจใช้คลังเพลงเชิงพาณิชย์) แล้วลดเสียงเพลงให้เบากว่าเสียงพูด'), h('li', 'ซับอยู่ในภาพแล้ว ไม่ต้องเปิดคำบรรยายอัตโนมัติซ้ำ · ขอบล่างและขวาเว้นไว้ให้ปุ่มของแอปแล้ว'), !isMp4 && mime ? h('li', 'ไฟล์เป็น .webm: แชร์เข้า TikTok หรือ CapCut ได้ตรง ๆ ถ้าแกลเลอรีไม่แสดง ให้ใช้ปุ่มแชร์') : null)));
    async function run() {
      btn.disabled = true; result.replaceChildren(); bar.classList.add('on'); let lock = null;
      try { lock = await navigator.wakeLock?.request('screen'); } catch {}
      const pl = M.player; pl.pause(); setPlayIcon(false); const W = P.res === 720 ? 720 : 1080;
      cv.width = W; cv.height = Math.round(W * 16 / 9);
      try {
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
    h('div.topbar', h('div', h('a.crumb', { href: '#/studio/video' }, '‹ ตัดต่อคลิป'), titleIn, h('div.sub', P.mode === 'cam' ? 'พูดหน้ากล้อง' : 'เสียงพากย์ + กราฟิก'))),
    h('div.vd-grid', preview, h('div.vd-side', stepNav, panel)));
  paintSteps(); paintPanel();
  M.node = node;
  await attachMedia();
  if (M.bad && step !== 'media') go('media'); else paintPanel();
  return node;
}
