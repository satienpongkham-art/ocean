// ─── ตัวตัดต่อคลิป: แบ่งสคริปต์เป็นซับทีละคำ · วาดเฟรม (ซูม ฉากตาราง ขาวดำ สติกเกอร์ ซับ 4 สไตล์) · เล่น/อัดเป็นไฟล์ ───
// ทุกอย่างทำในเครื่อง ไม่อัปโหลดคลิปไปที่ไหน
import { SFX } from './sfx.js';
import { emojiSrc } from '../../data/emoji.js';

export const VSTYLES = {
  neon: { name: 'Neon Pop', sub: 'ตัวขาว คำเด่นชมพูม่วงเรืองแสง ซ้อนเป็นแถว', stage: 'wall', sw: ['#9fb9c9', '#ff4fd8'] },
  grid: { name: 'Grid Stage', sub: 'ผนังตาราง ซับเหลืองเรืองแสงทีละคำ', stage: 'grid', sw: ['#ededed', '#ffe23d'] },
  aom: { name: 'AOM แดงขาว', sub: 'ป้ายแดง ตัวขาว คำเด่นสีทอง', stage: 'aom', sw: ['#fff8f3', '#a6192e'] },
  clean: { name: 'Clean', sub: 'มินิมอล ตัวขาวเงาบาง ด้านล่าง', stage: 'clean', sw: ['#f4f4f2', '#1b1717'] },
};
export const SCENES = { cam: 'หน้ากล้อง', stage: 'ฉากตาราง', bw: 'ขาวดำ' };
const FONT = '"Kanit", "Sarabun", sans-serif';

// ── ฟอนต์ ──
let fontP = null;
export function loadFonts() {
  if (fontP) return fontP;
  if (!document.getElementById('gf-kanit-heavy')) { const l = document.createElement('link'); l.id = 'gf-kanit-heavy'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@600;700;800&display=swap'; document.head.append(l); }
  const go = () => Promise.all(['600', '700', '800'].map((w) => document.fonts.load(`${w} 80px Kanit`, 'กขคAa').catch(() => {})));
  return (fontP = Promise.race([new Promise((r) => setTimeout(r, 300)).then(go).then(go), new Promise((r) => setTimeout(r, 4000))]));
}

// ── สติกเกอร์ ──
const IMG = {};
export function emojiImg(code) {
  if (!code) return null;
  if (!IMG[code]) { const im = new Image(); im.decoding = 'async'; im.src = emojiSrc(code); IMG[code] = im; }
  return IMG[code];
}
export const preloadEmoji = (codes) => Promise.all(codes.filter(Boolean).map((c) => { const im = emojiImg(c); return im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }); }));

// ── สคริปต์ → ซับทีละช่วง ──
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const MARKS = /[ัิ-ฺ็-๎]/g;
export const visLen = (s) => s.replace(MARKS, '').length;
const words = (s) => (SEG ? [...SEG.segment(s)].map((x) => x.segment) : s.split(/(\s+)/).filter(Boolean));
export const MAX_CHUNK = 14;

/** บทจากสตูดิโอ ("[0–3 วิ] ...", "ข้อความบนจอ: ...") → เหลือเฉพาะประโยคที่พูด บรรทัดละประโยค */
export function speechFromScript(s = '') {
  return s.split('\n').map((l) => l.trim())
    .filter((l) => l && !/^(ข้อความบนจอ|เคล็ดลับ|แสดงภาพ)/.test(l))
    .map((l) => l.replace(/^\[[^\]]*\]\s*/, '').replace(/^(ประโยคเปิด|ปิดท้าย)(\s*\([^)]*\))?\s*/, '').replace(/["“”]/g, '').trim())
    .filter(Boolean).flatMap((l) => l.split(/\s+·\s+/)).join('\n');
}

/** แบ่งสคริปต์: ขึ้นบรรทัดใหม่ = ช็อตใหม่ · *คำ* = คำเด่น · ช่วงละไม่เกิน ~14 ตัวอักษร */
export function parseScript(text = '', old = []) {
  const out = [];
  text.split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line, li) => {
    const toks = line.split(/(\*[^*]+\*)/).filter(Boolean).flatMap((p) => (/^\*[^*]+\*$/.test(p) ? [{ w: p.slice(1, -1), key: true }] : words(p).map((w) => ({ w, key: false }))));
    let cur = [], len = 0;
    const push = () => { while (cur.length && !cur[cur.length - 1].w.trim()) cur.pop(); while (cur.length && !cur[0].w.trim()) cur.shift(); if (cur.length) out.push({ line: li, words: cur, text: cur.map((x) => x.w).join('') }); cur = []; len = 0; };
    for (const t of toks) {
      const sp = !t.w.trim(), tl = visLen(t.w);
      if (sp && len >= MAX_CHUNK * 0.55) { push(); continue; }
      if (!sp && cur.length && len + tl > MAX_CHUNK) push();
      cur.push(t); len += tl;
    }
    push();
  });
  // เก็บจังหวะ/สติกเกอร์/ฉากเดิมไว้ ถ้าข้อความช่วงนั้นเหมือนเดิม
  return out.map((c, i) => { const o = old[i]; return o && o.text === c.text ? { ...c, t0: o.t0, t1: o.t1, emoji: o.emoji ?? null, scene: o.scene || 'cam' } : { ...c, t0: null, t1: null, emoji: null, scene: 'cam' }; });
}
export const timed = (chunks) => chunks.length > 0 && chunks.every((c) => c.t0 != null && c.t1 != null);

/** จังหวะอัตโนมัติ: แบ่งเวลาตามความยาวคำ (ใช้เมื่อไม่ได้จิ้มเอง หรือไม่มีเสียง) */
export function autoTime(chunks, dur, start = 0.15) {
  const w = chunks.map((c, i) => visLen(c.text) + 3 + (i && c.line !== chunks[i - 1].line ? 3 : 0));
  const sum = w.reduce((a, b) => a + b, 0) || 1; const span = Math.max(0.5, dur - start - 0.4);
  let t = start;
  return chunks.map((c, i) => { const d = (w[i] / sum) * span; const r = { ...c, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }; t += d; return r; });
}
/** อ่านเงียบ (ไม่มีเสียง): ความยาวที่ควรใช้ (วินาที) */
export const readDur = (chunks, speed = 1) => Math.max(3, chunks.reduce((a, c) => a + 0.25 + visLen(c.text) * 0.085, 0.6) / speed);

// ── ช่วงเวลา ──
export function window_(P, mediaDur) {
  const T = P.chunks.filter((c) => c.t0 != null);
  const end = mediaDur || (T.length ? T1(T[T.length - 1]) + 0.6 : 3);
  if (!T.length) return [0, end];
  const a = P.trimHead ? Math.max(0, T[0].t0 - 0.25) : 0;
  const b = P.trimTail ? Math.min(end, T1(T[T.length - 1]) + 0.7) : end;
  return [a, Math.max(a + 0.5, b)];
}
const T1 = (c) => c.t1 ?? c.t0 + 4;
function activeIdx(ch, t) { for (let i = ch.length - 1; i >= 0; i--) { const c = ch[i]; if (c.t0 != null && c.t0 <= t) return T1(c) > t ? i : -1; } return -1; }
function lastStarted(ch, t) { for (let i = ch.length - 1; i >= 0; i--) if (ch[i].t0 != null && ch[i].t0 <= t) return i; return -1; }

/** เหตุการณ์ในคลิป (ใช้ทั้งวาดภาพและวางเสียงประกอบ) */
export function timeline(P) {
  const ch = P.chunks; const lines = {}; const segs = []; const stickers = []; const cuts = [];
  ch.forEach((c, i) => {
    if (c.t0 == null) return;
    const L = (lines[c.line] ||= { start: c.t0, end: T1(c), idx: [] }); L.end = T1(c); L.idx.push(i);
    const sc = P.mode === 'voice' ? 'stage' : (c.scene || 'cam');
    const prev = segs[segs.length - 1];
    if (prev && prev.scene === sc && Math.abs(prev.end - c.t0) < 0.35) { prev.end = T1(c); prev.idx.push(i); } else segs.push({ scene: sc, start: c.t0, end: T1(c), idx: [i] });
  });
  for (const L of Object.values(lines)) cuts.push(L.start);
  for (const s of segs) if (s.scene !== 'stage' || P.mode === 'voice') cuts.push(s.start);
  // สติกเกอร์: ค้างไว้จนจบบรรทัด/ฉาก หรือมีตัวใหม่
  ch.forEach((c, i) => {
    if (c.t0 == null || !c.emoji) return;
    const seg = segs.find((s) => s.idx.includes(i)); const L = lines[c.line];
    const stage = seg?.scene === 'stage';
    let at = c.t0; if (stage && P.mode === 'cam' && seg.idx[0] === i) at = c.t0 + 0.4;
    stickers.push({ code: c.emoji, at, end: stage ? seg.end : L.end, stage, i });
  });
  stickers.forEach((s, k) => { const n = stickers[k + 1]; if (n && n.at < s.end) s.end = n.at; });
  return { lines, segs, stickers, cuts: [...new Set(cuts)].sort((a, b) => a - b) };
}

export function sfxEvents(P, tl = timeline(P)) {
  if (!P.sfx) return [];
  const ev = [];
  if (P.mode === 'cam' && P.zoom) for (const t of tl.cuts) ev.push({ t, n: 'whoosh', v: 0.55, p: 2 });
  for (const s of tl.segs) if (s.scene === 'stage' && P.mode === 'cam') { ev.push({ t: s.start, n: 'whoosh', v: 0.8, p: 3 }); ev.push({ t: s.start + 0.38, n: 'boom', v: 0.6, p: 1 }); }
  for (const s of tl.stickers) ev.push({ t: s.at, n: 'pop', v: 0.85, p: 4 });
  P.chunks.forEach((c) => { if (c.t0 == null) return; if (c.words.some((w) => w.key)) ev.push({ t: c.t0 + 0.05, n: 'ding', v: 0.45, p: 2 }); else if (P.ticks) ev.push({ t: c.t0, n: 'tick', v: 0.6, p: 0 }); });
  ev.sort((a, b) => a.t - b.t || b.p - a.p);
  const out = []; for (const e of ev) { const last = out[out.length - 1]; if (last && e.t - last.t < 0.09 && e.n !== 'boom' && last.n !== 'boom') { if (e.p > last.p) out[out.length - 1] = e; continue; } out.push(e); }
  return out;
}

// ── วาดเฟรม ──
const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const back = (p) => { p = Math.min(1, Math.max(0, p)); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const ZOOM = [[1, 0, 0], [1.16, -0.035, 0.02], [1.07, 0.03, 0], [1.24, 0, 0.04]];

const bgCache = {};
function stageBg(kind, W, H) {
  const key = kind + W + 'x' + H; if (bgCache[key]) return bgCache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  if (kind === 'grid') {
    let g = x.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.78); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#ececec'); g.addColorStop(1, '#8f8f8f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const s = W / 5.2; x.lineWidth = Math.max(2, W / 360);
    for (let i = -1; i * s < W + s; i++) { const X = W / 2 + (i - 2.5) * s; x.strokeStyle = 'rgba(40,40,40,.2)'; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, H); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(X + x.lineWidth, 0); x.lineTo(X + x.lineWidth, H); x.stroke(); }
    for (let j = 0; j * s < H + s; j++) { const Y = j * s - s * 0.3; x.strokeStyle = 'rgba(40,40,40,.2)'; x.beginPath(); x.moveTo(0, Y); x.lineTo(W, Y); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(0, Y + x.lineWidth); x.lineTo(W, Y + x.lineWidth); x.stroke(); }
    g = x.createRadialGradient(W * 0.5, H * 0.45, H * 0.3, W * 0.5, H * 0.45, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  } else if (kind === 'wall') {
    let g = x.createRadialGradient(W * 0.5, H * 0.34, 0, W * 0.5, H * 0.34, H * 0.8); g.addColorStop(0, '#eef5f9'); g.addColorStop(0.4, '#adc6d5'); g.addColorStop(1, '#4f6878');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createLinearGradient(0, H * 0.6, 0, H); g.addColorStop(0, 'rgba(10,20,30,0)'); g.addColorStop(1, 'rgba(10,20,30,.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  } else if (kind === 'aom') {
    x.fillStyle = '#fff8f3'; x.fillRect(0, 0, W, H);
    for (const [cx, cy, r, a] of [[W * 0.95, H * 0.1, W * 0.6, 0.13], [W * 0.02, H * 0.92, W * 0.7, 0.1], [W * 0.5, H * 0.45, W * 0.55, 0.05]]) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(166,25,46,${a})`); g.addColorStop(1, 'rgba(166,25,46,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.fillStyle = 'rgba(166,25,46,.09)'; const s = W / 18; for (let i = 1; i < 18; i++) for (let j = 1; j < 32; j++) { x.beginPath(); x.arc(i * s, j * s, W / 300, 0, 7); x.fill(); }
  } else {
    const g = x.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, H * 0.75); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e4e3df'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  return (bgCache[key] = c);
}

function drawMedia(x, W, H, media, z, ox, oy, bw) {
  const vw = media?.videoWidth, vh = media?.videoHeight;
  if (!vw || media.readyState < 2) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2a30'); g.addColorStop(1, '#111114'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (!media) { x.save(); x.fillStyle = 'rgba(255,255,255,.45)'; x.font = `500 ${W * 0.042}px ${FONT}`; x.textAlign = 'center'; x.fillText('ยังไม่มีคลิป · เลือกในขั้นที่ 1', W / 2, H * 0.47); x.restore(); }
    return; }
  const s0 = Math.max(W / vw, H / vh); const dw = vw * s0, dh = vh * s0;
  const m = (z - 1) / 2 * 0.92; ox = Math.max(-m, Math.min(m, ox)); oy = Math.max(-m, Math.min(m, oy));
  x.save(); if (bw) x.filter = 'grayscale(1) contrast(1.12) brightness(.96)';
  x.translate(W * (0.5 + ox), H * (0.4 + oy)); x.scale(z, z); x.translate(-W * 0.5, -H * 0.4);
  x.drawImage(media, (W - dw) / 2, (H - dh) / 2, dw, dh); x.restore();
}
function rrect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }

/** ตัวหนังสือมีขอบ + เรืองแสง */
function glowText(x, s, X, Y, o) {
  x.lineJoin = 'round'; x.miterLimit = 2;
  if (o.glow) { x.save(); x.shadowColor = o.glow; x.shadowBlur = o.blur; x.fillStyle = o.glow; x.fillText(s, X, Y); x.fillText(s, X, Y); x.restore(); }
  if (o.shadow) { x.save(); x.shadowColor = o.shadow; x.shadowBlur = o.sblur || 16; x.shadowOffsetY = o.soff || 4; x.fillStyle = o.fill; x.fillText(s, X, Y); x.restore(); }
  if (o.stroke) { x.strokeStyle = o.stroke; x.lineWidth = o.sw; x.strokeText(s, X, Y); }
  x.fillStyle = o.fill; x.fillText(s, X, Y);
  if (o.inner) { x.strokeStyle = o.inner; x.lineWidth = Math.max(1, o.sw * 0.12); x.strokeText(s, X, Y); }
}

function drawSticker(x, W, H, st, t, P, onStage, textTop) {
  const im = emojiImg(st.code); if (!im || !im.complete || !im.naturalWidth) return;
  const p = (t - st.at) / 0.3; if (p < 0) return;
  const out = st.end - t < 0.12 ? Math.max(0, (st.end - t) / 0.12) : 1;
  const sc = back(p) * (0.6 + 0.4 * out);
  let cx, cy, size;
  if (onStage) { cx = W * 0.5; cy = H * 0.4; size = W * 0.46; }
  else if (P.style === 'grid') { cx = W * 0.5; cy = H * 0.17; size = W * 0.2; }
  else if (P.style === 'neon') { cx = W * 0.8; cy = Math.max(H * 0.1, (textTop ?? H * 0.3) - W * 0.06); size = W * 0.17; }
  else { cx = W * 0.8; cy = H * 0.2; size = W * 0.18; }
  cy += Math.sin(t * 2.3) * H * 0.006;
  x.save(); x.globalAlpha = out;
  if (onStage) { x.fillStyle = 'rgba(0,0,0,.16)'; x.beginPath(); x.ellipse(cx, cy + size * 0.55, size * 0.36 * sc, size * 0.06 * sc, 0, 0, 7); x.fill(); }
  x.translate(cx, cy); x.rotate(Math.sin(t * 1.7) * 0.06 + (1 - Math.min(1, p)) * -0.35); x.scale(sc, sc);
  x.shadowColor = 'rgba(0,0,0,.28)'; x.shadowBlur = size * 0.08; x.shadowOffsetY = size * 0.04;
  x.drawImage(im, -size / 2, -size / 2, size, size); x.restore();
}

/** แถวคำ (คำเด่นใหญ่กว่า) ขึ้นทีละคำ */
function rowLayout(x, words, S, maxW) {
  const parts = words.map((w) => ({ ...w, size: w.key ? S * 1.32 : S }));
  const measure = () => { let tot = 0; for (const p of parts) { x.font = `800 ${p.size}px ${FONT}`; p.w = x.measureText(p.w0 ?? p.w).width; tot += p.w; } return tot; };
  for (const p of parts) p.w0 = p.w;
  let tot = measure(); if (tot > maxW) { const k = maxW / tot; for (const p of parts) p.size *= k; tot = measure(); }
  return { parts, tot, h: Math.max(...parts.map((p) => p.size)) };
}

function drawNeon(x, W, H, P, ch, tl, t, onStage, ci, measureOnly = false) {
  const L = tl.lines[ch[ci].line]; const lineNo = Object.keys(tl.lines).indexOf(String(ch[ci].line));
  const rows = L.idx.filter((i) => ch[i].t0 <= t).slice(-3);
  const S = W * 0.096; const maxW = W * 0.86;
  const lays = rows.map((i) => ({ i, ...rowLayout(x, ch[i].words, S, maxW) }));
  const gap = S * 0.12; const total = lays.reduce((a, l) => a + l.h * 1.05 + gap, -gap);
  const cyPos = onStage ? [0.72, 0.72, 0.72, 0.72] : [0.24, 0.6, 0.3, 0.64];
  let y = H * cyPos[lineNo % 4] - total / 2; const top = y;
  if (measureOnly) return top;
  const exitP = L.end - t < 0.14 ? (L.end - t) / 0.14 : 1;
  x.save(); x.textBaseline = 'alphabetic'; x.globalAlpha = Math.max(0, exitP);
  for (const l of lays) {
    const c = ch[l.i]; const n = l.parts.filter((p) => p.w0.trim()).length || 1; const step = Math.min(0.11, ((T1(c) - c.t0) * 0.5) / n);
    let X = (W - l.tot) / 2; let k = 0; y += l.h * 1.0;
    for (const p of l.parts) {
      const word = p.w0; if (!word.trim()) { X += p.w; continue; }
      const at = c.t0 + k * step; k++; const q = (t - at) / 0.13; if (q <= 0) { X += p.w; continue; }
      const sc = 0.55 + 0.45 * back(q); const a = Math.min(1, q * 1.6);
      x.save(); x.globalAlpha *= a; x.translate(X + p.w / 2, y - p.size * 0.35); x.scale(sc, sc); x.translate(-(X + p.w / 2), -(y - p.size * 0.35));
      x.font = `800 ${p.size}px ${FONT}`;
      if (p.key) { const g = x.createLinearGradient(0, y - p.size * 0.9, 0, y + p.size * 0.1); g.addColorStop(0, '#ffd3f9'); g.addColorStop(0.5, '#ff5fe0'); g.addColorStop(1, '#c64dff');
        glowText(x, word, X, y, { fill: g, glow: 'rgba(214,70,255,.9)', blur: p.size * 0.5, stroke: 'rgba(60,0,70,.55)', sw: p.size * 0.1, inner: 'rgba(255,255,255,.7)' }); }
      else glowText(x, word, X, y, { fill: '#ffffff', stroke: 'rgba(20,24,40,.6)', sw: p.size * 0.13, shadow: 'rgba(0,0,0,.35)', sblur: p.size * 0.3, soff: p.size * 0.05 });
      x.restore(); X += p.w;
    }
    y += gap;
  }
  x.restore();
  return top;
}

function drawSingle(x, W, H, P, c, t, onStage) {
  const st = P.style; const k = c.words.some((w) => w.key);
  x.save(); x.textBaseline = 'middle'; x.textAlign = 'left';
  if (st === 'grid') {
    let S = W * (k ? 0.112 : 0.1); x.font = `800 ${S}px ${FONT}`; let w = x.measureText(c.text).width; if (w > W * 0.9) { S *= W * 0.9 / w; x.font = `800 ${S}px ${FONT}`; w = x.measureText(c.text).width; }
    const q = (t - c.t0) / 0.18; const sc = q < 1 ? 0.8 + 0.2 * back(q) : 1; const Y = H * (onStage ? 0.72 : 0.6);
    x.translate(W / 2, Y); x.scale(sc, sc); x.globalAlpha = Math.min(1, q * 2 + 0.2);
    glowText(x, c.text, -w / 2, 0, { fill: '#ffe23d', glow: 'rgba(255,150,0,.95)', blur: S * 0.5, stroke: '#3a2200', sw: S * 0.16 });
  } else if (st === 'aom') {
    const S0 = W * 0.078; let S = S0; const segs = c.words.map((w) => ({ s: w.w, key: w.key }));
    const meas = () => { x.font = `700 ${S}px ${FONT}`; return segs.reduce((a, g) => a + x.measureText(g.s).width, 0); };
    let w = meas(); if (w > W * 0.8) { S *= W * 0.8 / w; w = meas(); }
    const q = ease((t - c.t0) / 0.2); const Y = H * (onStage ? 0.72 : 0.74) + (1 - q) * S * 0.6; const padX = S * 0.55, ph = S * 1.55;
    x.globalAlpha = q; x.fillStyle = '#a6192e'; x.shadowColor = 'rgba(80,0,10,.35)'; x.shadowBlur = S * 0.4; x.shadowOffsetY = S * 0.1;
    rrect(x, (W - w) / 2 - padX, Y - ph / 2, w + padX * 2, ph, ph * 0.28); x.fill(); x.shadowColor = 'transparent';
    let X = (W - w) / 2; for (const g of segs) { x.fillStyle = g.key ? '#ffd36b' : '#ffffff'; x.fillText(g.s, X, Y + S * 0.04); X += x.measureText(g.s).width; }
  } else {
    let S = W * 0.074; const segs = c.words.map((w) => ({ s: w.w, key: w.key }));
    const meas = () => { x.font = `700 ${S}px ${FONT}`; return segs.reduce((a, g) => a + x.measureText(g.s).width, 0); };
    let w = meas(); if (w > W * 0.86) { S *= W * 0.86 / w; w = meas(); }
    const q = Math.min(1, (t - c.t0) / 0.12); const Y = H * (onStage ? 0.72 : 0.76); x.globalAlpha = q;
    let X = (W - w) / 2;
    for (const g of segs) {
      const fill = onStage ? (g.key ? '#a6192e' : '#1b1717') : (g.key ? '#ffd36b' : '#ffffff');
      glowText(x, g.s, X, Y, onStage ? { fill } : { fill, shadow: 'rgba(0,0,0,.7)', sblur: S * 0.35, soff: S * 0.04, stroke: 'rgba(0,0,0,.35)', sw: S * 0.08 });
      X += x.measureText(g.s).width;
    }
  }
  x.restore();
}

/** วาด 1 เฟรม ณ เวลา t (วินาทีของคลิปต้นฉบับ) */
export function drawFrame(x, P, t, media, tl = timeline(P)) {
  const W = x.canvas.width, H = x.canvas.height; const ch = P.chunks;
  const ci = activeIdx(ch, t); const ls = lastStarted(ch, t);
  // ฉาก ณ เวลานี้ (ช่องว่างสั้น ๆ ใช้ฉากเดิม)
  let seg = tl.segs.filter((s) => s.start <= t).pop() || null; if (seg && t >= seg.end + 0.3) seg = null;
  const scene = P.mode === 'voice' ? 'stage' : seg?.scene || 'cam';
  const onStage = scene === 'stage';
  x.save(); x.clearRect(0, 0, W, H);
  if (onStage) {
    x.drawImage(stageBg(VSTYLES[P.style]?.stage || 'grid', W, H), 0, 0);
    if (P.mode === 'cam' && seg) {
      const p = (t - seg.start) / 0.4;
      if (p < 1.55) {
        const e = ease(Math.min(1, p)); const cw = W * 0.46, chh = cw * 16 / 9; const tx = (W - cw) / 2, ty = H * 0.18;
        const fade = p > 1 ? 1 - (p - 1) / 0.55 : 1; const shr = p > 1 ? 1 - 0.25 * (p - 1) / 0.55 : 1;
        let X = tx * e, Y = ty * e, w = W + (cw - W) * e, hh = H + (chh - H) * e;
        if (p > 1) { const mx = X + w / 2, my = Y + hh / 2; w *= shr; hh *= shr; X = mx - w / 2; Y = my - hh / 2; }
        x.save(); x.globalAlpha = Math.max(0, fade); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 40 * e; x.shadowOffsetY = 14 * e;
        rrect(x, X, Y, w, hh, 48 * e); x.fillStyle = '#000'; x.fill(); x.shadowColor = 'transparent'; x.clip();
        x.translate(X, Y); x.scale(w / W, hh / H); drawMedia(x, W, H, media, 1, 0, 0, false); x.restore();
      }
    }
  } else {
    let z = 1, ox = 0, oy = 0;
    if (P.zoom) {
      const cut = tl.cuts.filter((c) => c <= t).pop(); const n = cut == null ? 0 : tl.cuts.indexOf(cut);
      [z, ox, oy] = ZOOM[n % ZOOM.length]; const pp = cut == null ? 1 : (t - cut) / 0.16; if (pp < 1) z *= 1 + 0.06 * (1 - ease(pp));
    }
    drawMedia(x, W, H, media, z, ox, oy, scene === 'bw');
    if (scene === 'bw') { const g = x.createRadialGradient(W / 2, H * 0.42, H * 0.25, W / 2, H * 0.42, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  }
  // ซับ + สติกเกอร์
  const st = tl.stickers.filter((s) => s.at <= t && t < s.end && (P.mode === 'voice' || s.stage === onStage)).pop();
  let textTop = null;
  if (ci >= 0 && P.style === 'neon') {
    // วัดตำแหน่งก่อน วางสติกเกอร์ไว้ข้างหลังตัวหนังสือ
    textTop = drawNeon(x, W, H, P, ch, tl, t, onStage, ci, true);
    if (st) drawSticker(x, W, H, st, t, P, onStage, textTop);
    drawNeon(x, W, H, P, ch, tl, t, onStage, ci);
  } else {
    if (st) drawSticker(x, W, H, st, t, P, onStage, null);
    if (ci >= 0) drawSingle(x, W, H, P, ch[ci], t, onStage);
  }
  x.restore();
  return { ci, ls, scene };
}

// ── เล่น / อัดไฟล์ ──
const MIMES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export const pickMime = () => (typeof MediaRecorder === 'undefined' ? null : MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || null);

export class Player {
  constructor(canvas, P, media) {
    this.cv = canvas; this.x = canvas.getContext('2d'); this.P = P; this.media = media || null;
    this.playing = false; this.clock0 = 0; this.t = 0; this.onTime = null; this.onEnd = null; this.rate = 1; this.sfxOn = true;
    this.refresh();
  }
  refresh() { this.tl = timeline(this.P); this.ev = sfxEvents(this.P, this.tl); this.win = window_(this.P, this.media?.duration && isFinite(this.media.duration) ? this.media.duration : 0); }
  audio() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.recDest = ctx.createMediaStreamDestination(); this.master.connect(this.recDest);
    this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = this.P.sfxVol ?? 0.8; this.sfxGain.connect(this.master);
    if (this.media) { this.src = ctx.createMediaElementSource(this.media); this.mediaGain = ctx.createGain(); this.src.connect(this.mediaGain).connect(this.master); }
    return ctx;
  }
  now() { return this.media ? this.media.currentTime : this.playing ? (this.ctx.currentTime - this.clock0) * this.rate : this.t; }
  draw(t = this.now()) { this.t = t; const r = drawFrame(this.x, this.P, t, this.media, this.tl); this.onTime?.(t, r); return r; }
  async seek(t) {
    t = Math.max(0, t); this.t = t;
    if (this.media) { if (Math.abs(this.media.currentTime - t) > 0.01) await new Promise((r) => { const done = () => { this.media.removeEventListener('seeked', done); r(); }; this.media.addEventListener('seeked', done); this.media.currentTime = t; setTimeout(done, 1500); }); }
    this.draw(t);
  }
  async play(from = this.t, { to = this.win[1], sfx = this.sfxOn, rate = 1 } = {}) {
    const ctx = this.audio(); await ctx.resume().catch(() => {});
    this.rate = rate; this.to = to; this.sfxNow = sfx; this.sfxGain.gain.value = this.P.sfxVol ?? 0.8;
    if (this.media) { this.media.playbackRate = rate; if (Math.abs(this.media.currentTime - from) > 0.05) await this.seek(from); await this.media.play().catch(() => {}); }
    else this.clock0 = ctx.currentTime - from / rate;
    this.playing = true; this.sched = from - 0.001;
    const loop = () => {
      if (!this.playing) return;
      const t = this.now();
      if (this.sfxNow) { const ahead = t + 0.12 * rate; for (const e of this.ev) if (e.t > this.sched && e.t <= ahead) SFX[e.n]?.(ctx, this.sfxGain, ctx.currentTime + Math.max(0, (e.t - t) / rate), e.v); this.sched = Math.max(this.sched, ahead); }
      this.draw(t);
      if (t >= this.to - 0.01 || (this.media && this.media.ended)) { this.pause(); this.onEnd?.(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  pause() { this.playing = false; cancelAnimationFrame(this.raf); if (this.media) this.media.pause(); else if (this.ctx) this.t = (this.ctx.currentTime - this.clock0) * this.rate; }
  /** อัดเป็นไฟล์วิดีโอ (เล่นจริง 1 รอบตามเวลา) */
  async record(onProgress) {
    const mime = pickMime(); if (!mime || !this.cv.captureStream) throw new Error('เครื่องนี้อัดวิดีโอจากแอปไม่ได้ ลองใช้ Chrome เวอร์ชันล่าสุด');
    this.refresh(); this.audio(); await this.ctx.resume().catch(() => {});
    const [a, b] = this.win; await this.seek(a);
    const stream = this.cv.captureStream(30); for (const tr of this.recDest.stream.getAudioTracks()) stream.addTrack(tr);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: this.cv.width >= 1080 ? 9_000_000 : 5_000_000, audioBitsPerSecond: 160_000 });
    const parts = []; rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    const prevEnd = this.onEnd; const prevTime = this.onTime; this.onTime = (t, r) => { prevTime?.(t, r); onProgress?.(Math.min(1, (t - a) / (b - a))); };
    rec.start(250);
    await new Promise((res) => { this.onEnd = res; this.play(a, { to: b, sfx: true, rate: 1 }); });
    this.draw(b); await new Promise((r) => setTimeout(r, 120));
    rec.stop(); await stopped; this.onTime = prevTime; this.onEnd = prevEnd; stream.getVideoTracks().forEach((t) => t.stop());
    return new Blob(parts, { type: mime.split(';')[0] });
  }
  destroy() { this.pause(); try { this.ctx?.close(); } catch {} }
}
