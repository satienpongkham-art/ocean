// ─── เครื่องวาดภาพหลายหน้า v2 (Carousel) + สตอรี่ ───
// ตัวใหญ่ 1 ประเด็นต่อหน้า · กราฟ/ตาราง/ไทม์ไลน์ · ไฮไลต์คำ · สติกเกอร์ · ลายเซ็นเขียนมือ · ย่อข้อความให้พอดีอัตโนมัติ
// คืนตำแหน่งกล่องข้อความ (blocks, key เป็นเส้นทางในข้อมูลสไลด์ เช่น "bars.0.l") เพื่อแตะบนภาพแล้วแก้ตรงนั้นได้
import { profile } from './app.js';

export const THEMES = {
  aom: { name: 'แดง-ขาว', bg: '#fffdfb', bg2: '#f8eeee', ink: '#1b1717', sub: '#6b6161', accent: '#a6192e', accentInk: '#ffffff', hl: '#ffd9a8', look: 'clean' },
  aomfull: { name: 'แดงเต็ม', bg: '#a6192e', bg2: '#8b1225', ink: '#fff8f4', sub: '#f1c6cb', accent: '#ffe0b3', accentInk: '#5a0f1b', hl: '#7a1022', look: 'clean' },
  mag: { name: 'นิตยสาร', bg: '#f4efe6', bg2: '#e7ddcd', ink: '#201a15', sub: '#6d6257', accent: '#b3371f', accentInk: '#ffffff', hl: '#f1d684', look: 'mag', head: '"Noto Serif Thai"' },
  note: { name: 'กระดาษโน้ต', bg: '#fbf8ee', bg2: '#f0ead8', ink: '#2b2a28', sub: '#6a675f', accent: '#d1432f', accentInk: '#ffffff', hl: '#ffe45e', look: 'note', head: '"Mali"', body: '"Mali"', lhk: 1.14 },
  sticker: { name: 'สติกเกอร์', bg: '#ffe25a', bg2: '#fff6c9', ink: '#141414', sub: '#3d3d3d', accent: '#ff3d68', accentInk: '#ffffff', hl: '#7df0c8', look: 'brutal' },
  mini: { name: 'มินิมอล', bg: '#ffffff', bg2: '#f3f2ef', ink: '#111111', sub: '#74736e', accent: '#111111', accentInk: '#ffffff', hl: '#e7e0cf', look: 'mini' },
  night: { name: 'กลางคืน', bg: '#111318', bg2: '#1d212a', ink: '#f3f4f6', sub: '#9aa1ad', accent: '#ff6b81', accentInk: '#111318', hl: '#5a2330', look: 'night' },
  ink: { name: 'กรมท่า-ทอง', bg: '#0f1d33', bg2: '#1a2d50', ink: '#f6f1e7', sub: '#b9c6de', accent: '#f2c14e', accentInk: '#0f1d33', hl: '#3a4f7a', look: 'classic' },
  cream: { name: 'ครีม-ส้ม', bg: '#f6efe4', bg2: '#ece0cc', ink: '#14213d', sub: '#56607a', accent: '#ff6b4a', accentInk: '#ffffff', hl: '#ffd3a6', look: 'classic' },
  pop: { name: 'ขาว-น้ำเงิน', bg: '#ffffff', bg2: '#eef1ff', ink: '#111318', sub: '#4b5060', accent: '#3a5bff', accentInk: '#ffffff', hl: '#cfd8ff', look: 'classic' },
  mint: { name: 'เขียวมินต์', bg: '#0e3b33', bg2: '#15503f', ink: '#effaf5', sub: '#b4d8ca', accent: '#8ef0c3', accentInk: '#0e3b33', hl: '#1f6a57', look: 'classic' },
};
export const KINDS = { cover: 'ปก', point: 'ประเด็น', list: 'รายการ', stat: 'ตัวเลขเด่น', bar: 'กราฟแท่ง', line: 'กราฟเส้น', donut: 'โดนัท %', table: 'ตาราง', timeline: 'ไทม์ไลน์อายุ', myth: 'ความเชื่อ vs ความจริง', check: 'เช็กลิสต์', versus: 'เทียบ 2 ฝั่ง', qa: 'ถาม-ตอบ', quote: 'ประโยคเด่น', cta: 'ปิดท้าย' };

// ── ฟอนต์เสริม (โหลดเมื่อธีม/ลายเซ็นต้องใช้) ──
const GF = { '"Mali"': 'Mali:wght@500;600;700', '"Noto Serif Thai"': 'Noto+Serif+Thai:wght@500;600;700', '"Mitr"': 'Mitr:wght@500;600', '"Charmonman"': 'Charmonman:wght@700', '"Srisakdi"': 'Srisakdi:wght@700', '"Mrs Saint Delafield"': 'Mrs+Saint+Delafield', '"Reenie Beanie"': 'Reenie+Beanie' };
const fontReady = {};
export function ensureFont(fam) {
  if (!fam || !GF[fam]) return Promise.resolve();
  if (fontReady[fam]) return fontReady[fam];
  const id = 'gf-' + fam.replace(/\W/g, '');
  if (!document.getElementById(id)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.id = id; l.href = `https://fonts.googleapis.com/css2?family=${GF[fam]}&display=swap`; document.head.append(l); }
  const load = () => Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 48px ${fam}`, 'กขAa').catch(() => {})));
  return (fontReady[fam] = Promise.race([new Promise((r) => setTimeout(r, 400)).then(load).then(load), new Promise((r) => setTimeout(r, 3500))]));
}

// ── ลายเซ็นท้ายภาพ ──
const SIG_KEY = 'advdesk.v1.sig';
export const SIG_PRESETS = [['th', 'ออม', '"Charmonman"', 'ลายมือไทย'], ['en', 'Aom Connect', '"Mrs Saint Delafield"', 'ลายเซ็นตวัด'], ['pen', 'aom connect', '"Reenie Beanie"', 'ดินสอ']];
export const getSig = () => { try { return JSON.parse(localStorage.getItem(SIG_KEY) || 'null'); } catch { return null; } };
export const setSig = (v) => { try { v ? localStorage.setItem(SIG_KEY, JSON.stringify(v)) : localStorage.removeItem(SIG_KEY); } catch {} };
/** วาดลายเซ็นให้พอดีกล่อง (x,y คือมุมซ้ายบน) สีแบบดินสอ */
export async function drawSignature(x, sig, bx, by, bw, bh, color) {
  if (!sig) return;
  x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineCap = 'round'; x.lineJoin = 'round';
  if (sig.type === 'draw' && sig.strokes?.length) {
    const pts = sig.strokes.flat(); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(1, Math.max(...xs) - x0), hh = Math.max(1, Math.max(...ys) - y0);
    const k = Math.min(bw / w, bh / hh); const ox = bx + (bw - w * k) / 2, oy = by + (bh - hh * k) / 2;
    for (const [dx, dy, a, lw] of [[0, 0, .9, 4.2], [.9, .6, .45, 3], [-.7, .8, .3, 2.4]]) { // ซ้อน 3 ชั้นให้เหมือนเส้นดินสอ
      x.globalAlpha = a; x.lineWidth = lw;
      for (const st of sig.strokes) { if (!st.length) continue; x.beginPath(); st.forEach(([px, py], i) => { const X = ox + (px - x0) * k + dx, Y = oy + (py - y0) * k + dy; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); }); if (st.length === 1) x.lineTo(ox + (st[0][0] - x0) * k + .1, oy + (st[0][1] - y0) * k); x.stroke(); }
    }
  } else if (sig.type === 'text') {
    await ensureFont(sig.font);
    let s = Math.min(bh * 0.95, 150); x.font = `700 ${s}px ${sig.font}, "Kanit"`; const tw = x.measureText(sig.text).width; if (tw > bw) { s *= bw / tw; x.font = `700 ${s}px ${sig.font}, "Kanit"`; }
    const w2 = x.measureText(sig.text).width; const tx = bx + (bw - w2) / 2, ty = by + bh * 0.68;
    x.globalAlpha = .9; x.fillText(sig.text, tx, ty); x.globalAlpha = .4; x.fillText(sig.text, tx + .9, ty + .7);
    x.globalAlpha = .75; x.lineWidth = 3; x.beginPath(); x.moveTo(tx - 6, ty + s * .22); x.quadraticCurveTo(tx + w2 * .5, ty + s * .36, tx + w2 + 26, ty + s * .1); x.stroke();
  }
  x.restore();
}

// ── เครื่องมือวาด ──
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function lines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    const words = seg ? [...seg.segment(para)].map((s) => s.segment) : para.split(/(\s+)/);
    let line = '';
    for (const w of words) {
      if (ctx.measureText(line + w).width > maxW && line.trim()) { out.push(line.trim()); line = w.trimStart(); }
      else line += w;
    }
    out.push(line.trim());
  }
  for (let i = 0; i < out.length - 1; i++) { const m = out[i].match(/[(\["“']$/); if (m) { out[i] = out[i].slice(0, -1).trimEnd(); out[i + 1] = m[0] + out[i + 1]; } }
  return out.filter((l, i, a) => l || (i > 0 && i < a.length - 1));
}
function rr(x, X, Y, W, H, R) { R = Math.min(R, W / 2, H / 2); x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
const rng = (seed) => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const num = (v) => (typeof v === 'number' ? v.toLocaleString('th-TH', { maximumFractionDigits: 1 }) : String(v ?? ''));
const short = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้าน' : num(Math.round(v)));

/** วาด 1 สไลด์ → { canvas, blocks:[{key,x,y,w,h,size,serif,weight}], overflow } · story=true ได้ 1080×1920 */
export async function renderSlide(slide, deck, idx, { story = false } = {}) {
  const T = THEMES[deck.theme] || THEMES.aom; const HF = T.head || '"Kanit"', BF = T.body || '"Sarabun"';
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all([ensureFont(T.head), ensureFont(T.body)]);
  const F = (w, s, head = true) => `${w} ${s}px ${head ? HF : BF}, "Kanit", "Sarabun", sans-serif`;
  const W = 1080, H = story ? 1920 : 1350; const brutal = T.look === 'brutal'; const M = brutal ? 110 : 92;
  const top = story ? 300 : 210, bottom = story ? H - 320 : H - 170;
  const c = document.createElement('canvas'); c.width = W; c.height = H; let x = c.getContext('2d');
  const blocks = []; let overflow = false; const total = deck.slides.length; const R = rng(idx * 97 + 13);
  const k = slide.kind || 'point'; const p = profile();

  // ── พื้นหลังตามสไตล์ ──
  x.fillStyle = T.bg; x.fillRect(0, 0, W, H);
  if (T.look === 'clean') {
    x.fillStyle = T.bg2; x.beginPath(); x.arc(W + 40, H - (story ? 420 : 230), 380, 0, 7); x.fill();
    x.fillStyle = T.accent; x.globalAlpha = .9; rr(x, 0, story ? 300 : 210, 14, 190, 7); x.fill(); x.globalAlpha = 1;
  } else if (T.look === 'classic') {
    x.fillStyle = T.bg2; x.beginPath(); x.arc(W - 40, story ? 380 : 140, 300, 0, 7); x.fill();
    x.fillStyle = T.accent; x.globalAlpha = .9; x.beginPath(); x.arc(W - 150, story ? 470 : 230, 26, 0, 7); x.fill(); x.globalAlpha = 1;
  } else if (T.look === 'mag') {
    x.strokeStyle = T.ink; x.lineWidth = 3; const ty = story ? 176 : 70; x.beginPath(); x.moveTo(M, ty); x.lineTo(W - M, ty); x.stroke(); x.lineWidth = 1; x.beginPath(); x.moveTo(M, ty + 9); x.lineTo(W - M, ty + 9); x.stroke();
    x.font = `600 300px ${HF}, serif`; x.fillStyle = T.bg2; const n = String(idx + 1); x.fillText(n, W - M - x.measureText(n).width + 14, (story ? 560 : 420));
  } else if (T.look === 'note') {
    x.strokeStyle = '#c9d6e6'; x.lineWidth = 2; for (let yy = (story ? 330 : 240); yy < H - 120; yy += 66) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    x.strokeStyle = '#f0a8a0'; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 0); x.lineTo(60, H); x.stroke();
    x.fillStyle = T.bg; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(30, H * (0.2 + i * 0.3), 13, 0, 7); x.fill(); x.strokeStyle = '#d8d2c0'; x.lineWidth = 2; x.stroke(); }
  } else if (brutal) {
    const cy = story ? 180 : 70; x.fillStyle = T.ink; rr(x, 62, cy + 14, W - 110, H - cy - 60 - (story ? 150 : 0), 34); x.fill();
    x.fillStyle = '#ffffff'; rr(x, 48, cy, W - 110, H - cy - 60 - (story ? 150 : 0), 34); x.fill(); x.strokeStyle = T.ink; x.lineWidth = 6; x.stroke();
  } else if (T.look === 'night') {
    const g = x.createRadialGradient(W - 100, story ? 300 : 120, 20, W - 100, story ? 300 : 120, 620); g.addColorStop(0, T.accent + '55'); g.addColorStop(1, T.accent + '00'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = T.sub; x.globalAlpha = .16; for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(M + i * 60, H - (story ? 460 : 290) + j * 30, 2.5, 0, 7); x.fill(); } x.globalAlpha = 1;
  } else if (T.look === 'mini') { x.fillStyle = T.ink; x.fillRect(M, story ? 190 : 86, 64, 6); }
  const CARD = brutal ? '#ffffff' : T.bg; // สีพื้นที่ตัวหนังสือวางอยู่

  // ── หัว: ป้ายซีรีส์ + เลขหน้า ──
  const tag = deck.series ? `${deck.series}${deck.ep ? ' · EP.' + deck.ep : ''}` : (deck.tag || 'เรื่องเงินใกล้ตัว'); const hy = story ? 200 : 96;
  const pg = String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  if (T.look === 'mag' || T.look === 'mini') { x.font = F(600, 28); x.fillStyle = T.look === 'mag' ? T.accent : T.sub; x.fillText(tag, M, hy + 40); }
  else if (T.look === 'note') { x.save(); x.translate(M + 6, hy + 30); x.rotate(-0.025); x.font = F(600, 32); const tw = x.measureText(tag).width + 56; x.fillStyle = T.hl; x.globalAlpha = .85; x.fillRect(-10, -34, tw, 62); x.globalAlpha = 1; x.fillStyle = T.ink; x.fillText(tag, 18, 8); x.restore(); }
  else { x.font = F(600, 30); const tw = x.measureText(tag).width + 48; x.fillStyle = T.accent; rr(x, M, hy, tw, 58, 29); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 5; x.stroke(); } x.fillStyle = T.accentInk; x.fillText(tag, M + 24, hy + 40); }
  x.font = F(600, 28); x.fillStyle = T.sub; x.fillText(pg, W - M - x.measureText(pg).width, hy + 40);

  // ── เลเยอร์เนื้อหา (วาดก่อน แล้วค่อยจัดกลางแนวตั้ง) ──
  const main = x; const layer = document.createElement('canvas'); layer.width = W; layer.height = H; x = layer.getContext('2d');
  const cw = W - M * 2; let y = top; let maxY = top;
  const fit = (text, { w, h, size, min, weight = 500, head = true, lh = 1.18, balance = head }) => {
    let s = size, ls; lh *= (head && T.lhk) || 1;
    for (; s >= min; s -= 4) { x.font = F(weight, s, head); ls = lines(x, text, w); if (ls.length * s * lh <= h) {
      if (balance && ls.length > 1) for (const f of [0.62, 0.7, 0.78, 0.86, 0.93]) { const l2 = lines(x, text, w * f); if (l2.length === ls.length) { ls = l2; break; } } // เกลี่ยบรรทัดให้ยาวใกล้กัน ไม่เหลือคำเดียวท้ายบรรทัด
      return { size: s, lines: ls, lh, weight, head, over: false }; } }
    x.font = F(weight, min, head); ls = lines(x, text, w); return { size: min, lines: ls, lh, weight, head, over: ls.length * min * lh > h };
  };
  const marker = (mx, my, mw, s) => { x.save(); x.fillStyle = T.hl; x.globalAlpha = T.look === 'night' || deck.theme === 'aomfull' ? 1 : .9; x.beginPath(); const t = my - s * .74, b = my + s * .2; x.moveTo(mx - 8, t + R() * 6); x.lineTo(mx + mw + 10, t - 2 + R() * 6); x.lineTo(mx + mw + 4, b + R() * 5); x.lineTo(mx - 12, b - 2 + R() * 5); x.closePath(); x.fill(); x.restore(); };
  /** วางข้อความ: คืน y ถัดไป · hl = คำที่ระบายไฮไลต์ · align: left|center|right */
  const put = (key, text, box, opt, color, { hl, align = 'left', noBlock } = {}) => {
    if (text == null || text === '') return box.y;
    const r = fit(String(text), { ...opt, w: box.w, h: box.h }); overflow = overflow || r.over;
    x.font = F(r.weight, r.size, r.head);
    r.lines.forEach((ln, i) => {
      const lw = x.measureText(ln).width; const lx = align === 'center' ? box.x + (box.w - lw) / 2 : align === 'right' ? box.x + box.w - lw : box.x; const ly = box.y + r.size * (i + 0.92) * r.lh / 1.08;
      if (hl) { let a = ln.indexOf(hl), part = hl; if (a < 0) { for (let n = hl.length - 1; n >= 2 && a < 0; n--) { if (ln.endsWith(hl.slice(0, n)) && (r.lines[i + 1] || '').startsWith(hl.slice(n).trimStart())) { a = ln.length - n; part = hl.slice(0, n); } else if (i > 0 && ln.startsWith(hl.slice(-n)) && r.lines[i - 1].endsWith(hl.slice(0, hl.length - n).trimEnd())) { a = 0; part = hl.slice(-n); } } }
        if (a >= 0) marker(lx + x.measureText(ln.slice(0, a)).width, ly, x.measureText(part).width, r.size); }
      x.fillStyle = color; x.fillText(ln, lx, ly);
    });
    const hh = r.lines.length * r.size * r.lh; if (!noBlock) blocks.push({ key, x: box.x, y: box.y, w: box.w, h: Math.max(hh, r.size), size: r.size, serif: r.head, weight: r.weight });
    maxY = Math.max(maxY, box.y + hh); return box.y + hh;
  };
  const squiggle = (sx, sy, sw, color, lw = 7) => { x.save(); x.strokeStyle = color; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath(); x.moveTo(sx, sy); const n = Math.max(2, Math.round(sw / 46)); for (let i = 1; i <= n; i++) x.quadraticCurveTo(sx + (i - .5) * sw / n, sy + (i % 2 ? 12 : -10), sx + i * sw / n, sy + (R() - .5) * 4); x.stroke(); x.restore(); };
  const sticker = (text, cx, cy, rot) => { x.save(); x.translate(cx, cy); x.rotate(rot); x.font = F(600, 38); const tw = x.measureText(text).width + 56; x.fillStyle = brutal ? T.hl : T.accent; rr(x, -tw / 2, -40, tw, 80, 40); x.fill(); x.strokeStyle = brutal ? T.ink : CARD; x.lineWidth = brutal ? 6 : 8; x.stroke(); x.fillStyle = brutal ? T.ink : T.accentInk; x.fillText(text, -tw / 2 + 28, 14); x.restore(); };
  const doodle = (type, cx, cy, sc = 1) => { x.save(); x.translate(cx, cy); x.scale(sc, sc); x.strokeStyle = T.accent; x.fillStyle = T.accent; x.lineWidth = 11; x.lineCap = 'round'; x.lineJoin = 'round';
    if (type === 'bars') { [[-110, 70], [-40, 120], [30, 170], [100, 230]].forEach(([bx, bh], i) => { x.globalAlpha = i === 3 ? 1 : .35 + i * .18; rr(x, bx, 110 - bh, 50, bh, 14); x.fill(); }); x.globalAlpha = 1; x.beginPath(); x.moveTo(-120, 10); x.quadraticCurveTo(-10, -30, 110, -150); x.stroke(); x.beginPath(); x.moveTo(70, -150); x.lineTo(114, -154); x.lineTo(112, -110); x.stroke(); }
    else if (type === 'coins') { for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(-30, 90 - i * 44, 100, 30, 0, 0, 7); x.fillStyle = T.bg; x.fill(); x.stroke(); } x.beginPath(); x.arc(105, -110, 52, 0, 7); x.stroke(); x.beginPath(); x.moveTo(105, -134); x.lineTo(105, -86); x.stroke(); }
    else if (type === 'shield') { x.beginPath(); x.moveTo(0, -150); x.lineTo(120, -100); x.lineTo(120, 0); x.quadraticCurveTo(110, 110, 0, 160); x.quadraticCurveTo(-110, 110, -120, 0); x.lineTo(-120, -100); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(-50, 0); x.lineTo(-12, 40); x.lineTo(58, -44); x.stroke(); }
    else if (type === 'chat') { rr(x, -130, -120, 260, 180, 46); x.stroke(); x.beginPath(); x.moveTo(-60, 60); x.lineTo(-90, 120); x.lineTo(-10, 60); x.stroke(); [-60, 0, 60].forEach((dx) => { x.beginPath(); x.arc(dx, -30, 13, 0, 7); x.fill(); }); }
    else if (type === 'spark') { const st = (px, py, r) => { x.beginPath(); x.moveTo(px, py - r); x.quadraticCurveTo(px, py, px + r, py); x.quadraticCurveTo(px, py, px, py + r); x.quadraticCurveTo(px, py, px - r, py); x.quadraticCurveTo(px, py, px, py - r); x.fill(); }; st(-20, 10, 130); st(100, -110, 56); st(-110, -110, 34); }
    else if (type === 'heart') { x.beginPath(); x.moveTo(0, 130); x.bezierCurveTo(-190, 0, -110, -150, 0, -60); x.bezierCurveTo(110, -150, 190, 0, 0, 130); x.stroke(); x.beginPath(); x.moveTo(-80, 10); x.lineTo(-36, 10); x.lineTo(-14, -34); x.lineTo(16, 50); x.lineTo(38, 10); x.lineTo(84, 10); x.stroke(); }
    else if (type === 'home') { x.beginPath(); x.moveTo(-130, -10); x.lineTo(0, -130); x.lineTo(130, -10); x.stroke(); rr(x, -96, -20, 192, 150, 16); x.stroke(); rr(x, -30, 40, 60, 90, 10); x.stroke(); }
    else if (type === 'clock') { x.beginPath(); x.arc(0, 0, 130, 0, 7); x.stroke(); x.beginPath(); x.moveTo(0, -70); x.lineTo(0, 0); x.lineTo(54, 34); x.stroke(); }
    x.restore(); };
  const title = (size = 70, h = 260, gap = 30) => { if (slide.title) y = put('title', slide.title, { x: M, y, w: cw, h }, { size, min: 42, weight: 600 }, T.ink, { hl: slide.hl }) + gap; };
  const note = (yy) => { if (slide.note) put('note', slide.note, { x: M, y: yy, w: cw, h: 90 }, { size: 30, min: 24, head: false, lh: 1.4 }, T.sub); };
  const soft = mix(T.ink, CARD, .8);

  if (k === 'cover') {
    y = top + (story ? 120 : 50);
    if (slide.kicker) y = put('kicker', slide.kicker, { x: M, y, w: cw, h: 80 }, { size: 40, min: 30, weight: 600, head: false }, T.accent) + 26;
    y = put('title', slide.title, { x: M, y, w: cw, h: story ? 780 : 580 }, { size: 122, min: 62, weight: 600, lh: 1.14 }, T.ink, { hl: slide.hl }) + 22;
    squiggle(M, y + 8, 210, T.accent, 9); y += 60;
    y = put('body', slide.body, { x: M, y, w: cw - 60, h: 200 }, { size: 46, min: 32, head: false, lh: 1.45 }, T.sub);
    if (slide.sticker) sticker(slide.sticker, W - M - 150, top + (story ? 60 : 10), 0.09);
  } else if (k === 'stat') {
    y = top + 40;
    if (slide.kicker) y = put('kicker', slide.kicker, { x: M, y, w: cw, h: 100 }, { size: 44, min: 30, weight: 600, head: false }, T.sub) + 16;
    const y0 = y; y = put('value', slide.value, { x: M, y, w: cw, h: 260 }, { size: 210, min: 90, weight: 600, lh: 1.05 }, T.accent);
    x.font = F(600, blocks.at(-1)?.size || 120); squiggle(M, y + 4, Math.min(cw, x.measureText(String(slide.value ?? '')).width), T.ink, 6); y += 40; void y0;
    y = put('title', slide.title, { x: M, y, w: cw, h: 300 }, { size: 68, min: 44, weight: 500 }, T.ink, { hl: slide.hl }) + 24;
    put('body', slide.body, { x: M, y, w: cw, h: bottom - y }, { size: 42, min: 30, head: false, lh: 1.45 }, T.sub);
  } else if (k === 'list' || k === 'check') {
    y = top + 30; title(76, 300, 36);
    const items = (slide.items || []).filter((v) => v != null && v !== ''); const foot = k === 'check' && slide.body ? 90 : 0; const per = items.length ? (bottom - y - foot) / items.length : 0;
    items.forEach((it, i) => {
      const cy = y + 4;
      if (k === 'check') { x.strokeStyle = T.ink; x.lineWidth = 5; x.lineJoin = 'round'; x.beginPath(); x.moveTo(M + 2 + R() * 3, cy + 2); x.lineTo(M + 50, cy + R() * 4); x.lineTo(M + 52, cy + 50); x.lineTo(M + R() * 4, cy + 52); x.closePath(); x.stroke(); }
      else { x.fillStyle = T.accent; x.beginPath(); x.arc(M + 26, cy + 26, 26, 0, 7); x.fill(); x.strokeStyle = T.accentInk; x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(M + 14, cy + 27); x.lineTo(M + 23, cy + 36); x.lineTo(M + 39, cy + 18); x.stroke(); }
      const end = put('items.' + i, it, { x: M + 80, y, w: cw - 80, h: Math.max(60, per - 22) }, { size: 48, min: 30, head: false, weight: 500, lh: 1.35 }, T.ink);
      y = Math.max(end, y + 60) + 26;
    });
    if (foot) put('body', slide.body, { x: M, y: y + 6, w: cw, h: 80 }, { size: 36, min: 28, weight: 600 }, T.accent);
  } else if (k === 'bar') {
    y = top + 20; title(64, 230, 26);
    const bars = (slide.bars || []).slice(0, 6); const mx = Math.max(1, ...bars.map((b) => +b.v || 0)); const hi = slide.hi ?? bars.reduce((m, b, i) => ((+b.v || 0) > (+bars[m].v || 0) ? i : m), 0);
    const avail = bottom - y - (slide.note ? 90 : 0); const rowH = Math.min(260, avail / Math.max(1, bars.length)); const bh = Math.min(84, rowH - 100);
    bars.forEach((b, i) => {
      const vt = b.t || (num(+b.v || 0) + (slide.unit ? ' ' + slide.unit : '')); x.font = F(600, 50); const vw0 = x.measureText(vt).width; const vs = vw0 > cw * .5 ? 50 * cw * .5 / vw0 : 50; x.font = F(600, vs); const vw = x.measureText(vt).width;
      put(`bars.${i}.l`, b.l, { x: M, y: y + 6, w: cw - vw - 30, h: 56 }, { size: 42, min: 26, head: false, weight: 500 }, T.ink);
      x.font = F(600, vs); x.fillStyle = i === hi ? T.accent : T.ink; x.fillText(vt, W - M - vw, y + 50);
      blocks.push({ key: `bars.${i}.v`, x: W - M - vw, y: y + 6, w: vw, h: 56, size: vs, serif: true, weight: 600, numeric: true });
      const by = y + 74; const bw = Math.max(18, (+b.v || 0) / mx * cw); x.fillStyle = soft; rr(x, M, by, cw, bh, bh / 2); x.globalAlpha = .35; x.fill(); x.globalAlpha = 1;
      x.fillStyle = i === hi ? T.accent : mix(T.ink, CARD, .45); rr(x, M, by, bw, bh, bh / 2); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 4; x.stroke(); }
      y += rowH; maxY = Math.max(maxY, by + bh);
    });
    note(maxY + 26);
  } else if (k === 'line') {
    y = top + 20; title(64, 230, 20);
    const ser = (slide.series || []).slice(0, 2); const xl = slide.xl || []; const all = ser.flatMap((s) => s.pts || []); const mx = Math.max(1, ...all) * 1.08;
    const gx0 = M + 8, gx1 = W - M - 230, gy0 = y + 30, gy1 = bottom - (slide.note ? 170 : 90); const n = Math.max(2, ...ser.map((s) => (s.pts || []).length));
    const X = (i) => gx0 + (gx1 - gx0) * i / (n - 1), Y = (v) => gy1 - (gy1 - gy0) * v / mx;
    x.strokeStyle = T.sub; x.globalAlpha = .28; x.lineWidth = 2; x.setLineDash([4, 10]); for (let g = 0; g <= 3; g++) { const yy = gy1 - (gy1 - gy0) * g / 3; x.beginPath(); x.moveTo(gx0, yy); x.lineTo(gx1, yy); x.stroke(); } x.setLineDash([]); x.globalAlpha = 1;
    const cols = [T.accent, mix(T.ink, CARD, .45)]; const ends = [];
    ser.forEach((s, si) => { const pts = s.pts || []; if (!pts.length) return;
      if (si === 0) { x.beginPath(); x.moveTo(X(0), gy1); pts.forEach((v, i) => x.lineTo(X(i), Y(v))); x.lineTo(X(pts.length - 1), gy1); x.closePath(); x.fillStyle = T.accent; x.globalAlpha = .12; x.fill(); x.globalAlpha = 1; }
      x.strokeStyle = cols[si]; x.lineWidth = si ? 7 : 9; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); pts.forEach((v, i) => (i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)))); x.stroke();
      const ex = X(pts.length - 1), ey = Y(pts.at(-1)); x.fillStyle = CARD; x.beginPath(); x.arc(ex, ey, 15, 0, 7); x.fill(); x.fillStyle = cols[si]; x.beginPath(); x.arc(ex, ey, 10, 0, 7); x.fill(); ends.push({ si, ex, ey, v: pts.at(-1), name: s.name }); });
    ends.sort((a, b) => a.ey - b.ey); for (let i = 1; i < ends.length; i++) if (ends[i].ey - ends[i - 1].ey < 96) ends[i].ey = ends[i - 1].ey + 96;
    ends.forEach((e) => { x.fillStyle = cols[e.si]; x.font = F(600, 40); x.fillText(short(e.v), e.ex + 26, e.ey + 4); x.font = F(500, 26, false); x.fillStyle = T.sub; x.fillText(e.name || '', e.ex + 26, e.ey + 38); });
    x.font = F(500, 28, false); x.fillStyle = T.sub; [0, Math.floor((n - 1) / 2), n - 1].forEach((i) => { const t = String(xl[i] ?? ''); const tw = x.measureText(t).width; x.fillText(t, Math.min(Math.max(X(i) - tw / 2, gx0), gx1 - tw), gy1 + 44); });
    if (slide.unit) { x.fillText(slide.unit, gx0, gy0 - 8); }
    maxY = gy1 + 56; note(maxY + 12);
  } else if (k === 'donut') {
    y = top + 20; title(64, 230, 20);
    const parts = (slide.parts || []).slice(0, 5); const sum = parts.reduce((t, a) => t + (+a.v || 0), 0) || 1; const pal = [T.accent, T.ink, mix(T.accent, CARD, .5), T.sub, mix(T.ink, CARD, .7)];
    const rad = story ? 250 : 200, th = story ? 92 : 76; const cx = W / 2, cy = y + rad + 16; let a0 = -Math.PI / 2;
    parts.forEach((pt, i) => { const a1 = a0 + (+pt.v || 0) / sum * Math.PI * 2; x.strokeStyle = pal[i % 5]; x.lineWidth = th; x.lineCap = 'butt'; x.beginPath(); x.arc(cx, cy, rad - th / 2, a0 + .018, Math.max(a0 + .02, a1 - .018)); x.stroke(); a0 = a1; });
    if (slide.center) { put('center', slide.center, { x: cx - rad + th + 10, y: cy - 44, w: (rad - th - 10) * 2, h: 100 }, { size: 60, min: 30, weight: 600, lh: 1.1 }, T.ink, { align: 'center' }); }
    y = cy + rad + 44; const rowH = Math.min(84, (bottom - y - (slide.note ? 80 : 0)) / Math.max(1, parts.length));
    parts.forEach((pt, i) => { x.fillStyle = pal[i % 5]; rr(x, M, y + 8, 40, 40, 10); x.fill(); const pct = Math.round((+pt.v || 0) / sum * 100) + '%'; x.font = F(600, 42); x.fillStyle = T.ink; const pw = x.measureText(pct).width; x.fillText(pct, W - M - pw, y + 44);
      put(`parts.${i}.l`, pt.l, { x: M + 60, y: y + 2, w: cw - 70 - pw - 20, h: rowH - 8 }, { size: 42, min: 26, head: false }, T.ink); y += rowH; });
    maxY = y; note(y + 8);
  } else if (k === 'table') {
    y = top + 20; title(62, 220, 22);
    const cols = (slide.cols || []).slice(0, 4); const rows = (slide.rows || []).slice(0, 7); const nC = Math.max(1, cols.length);
    const fr = cols.map((_, i) => (i === 0 ? 1.25 : 1)); const fs = fr.reduce((a, b) => a + b, 0); const cx0 = []; let acc = M; fr.forEach((f) => { cx0.push(acc); acc += cw * f / fs; }); const colW = (i) => cw * fr[i] / fs;
    const hh = 88; const avail = bottom - y - hh - (slide.note ? 84 : 0); const rh = Math.min(160, avail / Math.max(1, rows.length)); const tH = hh + rh * rows.length;
    x.save(); rr(x, M, y, cw, tH, 26); x.clip();
    x.fillStyle = CARD; x.fillRect(M, y, cw, tH); rows.forEach((_, i) => { if (i % 2 === 0) { x.fillStyle = T.bg2; x.fillRect(M, y + hh + i * rh, cw, rh); } });
    if (slide.hi != null && slide.hi < nC) { x.fillStyle = T.accent; x.globalAlpha = .12; x.fillRect(cx0[slide.hi], y + hh, colW(slide.hi), tH - hh); x.globalAlpha = 1; }
    x.fillStyle = T.accent; x.fillRect(M, y, cw, hh); x.restore();
    x.strokeStyle = brutal ? T.ink : mix(T.ink, CARD, .78); x.lineWidth = brutal ? 5 : 2.5; rr(x, M, y, cw, tH, 26); x.stroke();
    cols.forEach((cname, j) => put(`cols.${j}`, cname, { x: cx0[j] + 18, y: y + 14, w: colW(j) - 30, h: hh - 22 }, { size: 36, min: 22, weight: 600, lh: 1.15 }, T.accentInk));
    rows.forEach((row, i) => row.slice(0, nC).forEach((cell, j) => put(`rows.${i}.${j}`, cell, { x: cx0[j] + 18, y: y + hh + i * rh + 12, w: colW(j) - 30, h: rh - 20 }, { size: 40, min: 22, head: j === slide.hi, weight: j === 0 || j === slide.hi ? 600 : 500, lh: 1.25, balance: false }, j === slide.hi ? T.accent : T.ink)));
    maxY = y + tH; note(maxY + 22);
  } else if (k === 'timeline') {
    y = top + 20; title(64, 230, 30);
    const steps = (slide.steps || []).slice(0, 5); const sh = Math.min(250, (bottom - y) / Math.max(1, steps.length)); const lx = M + 62;
    x.strokeStyle = T.accent; x.lineWidth = 5; x.setLineDash([2, 14]); x.lineCap = 'round'; x.beginPath(); x.moveTo(lx, y + 60); x.lineTo(lx, y + sh * (steps.length - 1) + 60); x.stroke(); x.setLineDash([]);
    steps.forEach((s, i) => { const cy = y + 62; x.fillStyle = i === (slide.hi ?? -1) ? T.ink : T.accent; x.beginPath(); x.arc(lx, cy, 60, 0, 7); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 5; x.stroke(); }
      put(`steps.${i}.a`, s.a, { x: lx - 50, y: cy - 26, w: 100, h: 56 }, { size: 40, min: 22, weight: 600, lh: 1.1 }, i === (slide.hi ?? -1) ? CARD : T.accentInk, { align: 'center' });
      const ty = put(`steps.${i}.t`, s.t, { x: M + 152, y: y + 8, w: cw - 152, h: 64 }, { size: 52, min: 32, weight: 600, lh: 1.15 }, T.ink);
      put(`steps.${i}.d`, s.d, { x: M + 152, y: ty + 4, w: cw - 152, h: sh - (ty - y) - 26 }, { size: 38, min: 26, head: false, lh: 1.35 }, T.sub); y += sh; });
    maxY = y - 20;
  } else if (k === 'myth') {
    y = top + 10; if (slide.title) y = put('title', slide.title, { x: M, y, w: cw, h: 120 }, { size: 50, min: 36, weight: 600 }, T.ink) + 24;
    const ch = (bottom - y - 34) / 2; const card = (yy, bg, fg, label, lbg, lfg, key, text, ok) => { x.fillStyle = bg; rr(x, M, yy, cw, ch, 36); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 6; x.stroke(); }
      x.font = F(600, 30); const lw = x.measureText(label).width + 92; x.fillStyle = lbg; rr(x, M + 34, yy + 32, lw, 56, 28); x.fill(); x.strokeStyle = lfg; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); if (ok) { x.moveTo(M + 54, yy + 61); x.lineTo(M + 63, yy + 70); x.lineTo(M + 80, yy + 51); } else { x.moveTo(M + 56, yy + 50); x.lineTo(M + 76, yy + 70); x.moveTo(M + 76, yy + 50); x.lineTo(M + 56, yy + 70); } x.stroke(); x.fillStyle = lfg; x.fillText(label, M + 96, yy + 71);
      const r0 = fit(String(text || ''), { w: cw - 80, h: ch - 150, size: 66, min: 32, weight: 600, lh: 1.25 }); const th0 = r0.lines.length * r0.size * r0.lh;
      put(key, text, { x: M + 40, y: yy + 104 + Math.max(0, (ch - 124 - th0) / 2), w: cw - 80, h: ch - 150 }, { size: r0.size, min: r0.size, weight: 600, lh: 1.25 }, fg); };
    card(y, T.bg2, T.ink, 'ความเชื่อ', mix(T.ink, T.bg2, .82), T.ink, 'myth', slide.myth, false);
    card(y + ch + 34, T.accent, T.accentInk, 'ความจริง', T.accentInk, T.accent, 'fact', slide.fact, true); maxY = bottom;
  } else if (k === 'versus') {
    y = top + 20; title(62, 220, 26);
    const gw = 26, colW = (cw - gw) / 2; const ch = bottom - y; const side = (key, xx, bg, fg, hb, hf) => { const d = slide[key] || {}; x.fillStyle = bg; rr(x, xx, y, colW, ch, 30); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 5; x.stroke(); }
      x.save(); rr(x, xx, y, colW, ch, 30); x.clip(); x.fillStyle = hb; x.fillRect(xx, y, colW, 104); x.restore();
      put(`${key}.h`, d.h, { x: xx + 24, y: y + 20, w: colW - 48, h: 70 }, { size: 40, min: 26, weight: 600, lh: 1.1 }, hf, { align: 'center' });
      const its = (d.items || []).slice(0, 5); const ih = Math.min(190, (ch - 130) / Math.max(1, its.length)); its.forEach((t, i) => { const iy = y + 128 + i * ih; x.fillStyle = fg; x.globalAlpha = .9; x.beginPath(); x.arc(xx + 34, iy + 24, 7, 0, 7); x.fill(); x.globalAlpha = 1; put(`${key}.items.${i}`, t, { x: xx + 56, y: iy, w: colW - 80, h: ih - 14 }, { size: 42, min: 24, head: false, lh: 1.3 }, fg); }); };
    side('a', M, T.bg2, T.ink, mix(T.ink, T.bg2, .82), T.ink); side('b', M + colW + gw, mix(T.accent, CARD, .88), T.ink, T.accent, T.accentInk);
    x.fillStyle = CARD; x.beginPath(); x.arc(W / 2, y + 52, 44, 0, 7); x.fill(); x.strokeStyle = T.ink; x.lineWidth = 4; x.stroke(); x.fillStyle = T.ink; x.font = F(600, 30); const vw = x.measureText('VS').width; x.fillText('VS', W / 2 - vw / 2, y + 63); maxY = bottom;
  } else if (k === 'qa') {
    y = top + 30; const bub = (key, text, left, bg, fg, label) => { const bw = cw * 0.84; const bx = left ? M : M + cw - bw; const r = fit(String(text || ''), { w: bw - 72, h: (bottom - top) * 0.46, size: 50, min: 30, weight: left ? 600 : 500, head: left, lh: 1.32 }); const bh = r.lines.length * r.size * r.lh + 72;
      x.font = F(600, 28, false); x.fillStyle = T.sub; x.fillText(label, left ? bx + 8 : bx + bw - x.measureText(label).width - 8, y + 26); y += 42;
      x.fillStyle = bg; rr(x, bx, y, bw, bh, 40); x.fill(); x.beginPath(); if (left) { x.moveTo(bx + 30, y + bh - 6); x.lineTo(bx - 6, y + bh + 30); x.lineTo(bx + 80, y + bh - 2); } else { x.moveTo(bx + bw - 30, y + bh - 6); x.lineTo(bx + bw + 6, y + bh + 30); x.lineTo(bx + bw - 80, y + bh - 2); } x.closePath(); x.fill();
      put(key, text, { x: bx + 36, y: y + 34, w: bw - 72, h: bh - 60 }, { size: r.size, min: r.size, weight: r.weight, head: r.head, lh: 1.32 }, fg); y += bh + 54; };
    bub('q', slide.q, true, T.bg2, T.ink, slide.who || 'ลูกค้าถาม'); bub('a', slide.a, false, T.accent, T.accentInk, (p.nick || 'ออม') + 'ตอบ'); maxY = y - 30;
  } else if (k === 'quote') {
    y = top + 40; x.fillStyle = T.accent; for (const qx of [M + 34, M + 118]) { x.beginPath(); x.arc(qx, y + 78, 32, 0, 7); x.fill(); x.beginPath(); x.moveTo(qx - 32, y + 78); x.quadraticCurveTo(qx - 30, y + 6, qx + 26, y - 6); x.lineTo(qx + 30, y + 14); x.quadraticCurveTo(qx - 2, y + 26, qx + 4, y + 60); x.closePath(); x.fill(); } y += 150;
    y = put('title', slide.title, { x: M, y, w: cw, h: bottom - y - 130 }, { size: 80, min: 42, weight: 600, lh: 1.28 }, T.ink, { hl: slide.hl }) + 34;
    put('body', slide.body, { x: M, y, w: cw, h: 110 }, { size: 38, min: 28, head: false, lh: 1.4 }, T.sub);
  } else if (k === 'cta') {
    y = top + 50;
    y = put('title', slide.title, { x: M, y, w: cw, h: 400 }, { size: 90, min: 52, weight: 600 }, T.ink, { hl: slide.hl }) + 24;
    y = put('body', slide.body, { x: M, y, w: cw, h: 230 }, { size: 44, min: 30, head: false, lh: 1.45 }, T.sub) + 40;
    const by = Math.min(y, bottom - 250); x.fillStyle = T.bg2; rr(x, M, by, cw, 220, 34); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 5; x.stroke(); }
    x.fillStyle = T.accent; x.beginPath(); x.arc(M + 96, by + 110, 56, 0, 7); x.fill();
    const me = (p.nick || p.name || 'A').replace(/^คุณ/, '').trim(); const ini = 'เแโใไ'.includes(me[0]) ? me[1] : me[0] || 'A'; x.fillStyle = T.accentInk; x.font = F(600, 48); x.fillText(ini, M + 96 - x.measureText(ini).width / 2, by + 127);
    x.fillStyle = T.accent; x.font = `600 24px "Kanit", sans-serif`; x.fillText((p.brand || 'AOM CONNECT').split('').join('  '), M + 180, by + 62);
    x.fillStyle = T.ink; x.font = F(600, 42); x.fillText(p.name + (p.nick ? ` (${p.nick})` : ''), M + 180, by + 114);
    x.fillStyle = T.sub; x.font = F(500, 30, false); x.fillText([p.title, p.line ? 'LINE ' + p.line : null].filter(Boolean).join(' · '), M + 180, by + 162);
    maxY = by + 220;
  } else { // point
    y = top + 30;
    if (slide.num != null && slide.num !== '') { if (T.look === 'mag' || T.look === 'mini') { x.font = F(600, 150); x.fillStyle = T.accent; x.fillText(String(slide.num).padStart(2, '0'), M - 6, y + 126); } else { x.fillStyle = T.accent; x.beginPath(); x.arc(M + 68, y + 68, 68, 0, 7); x.fill(); if (brutal) { x.strokeStyle = T.ink; x.lineWidth = 6; x.stroke(); } x.font = F(600, 78); x.fillStyle = T.accentInk; const t = String(slide.num); x.fillText(t, M + 68 - x.measureText(t).width / 2, y + 96); } y += 170; }
    y = put('title', slide.title, { x: M, y, w: cw, h: 380 }, { size: 84, min: 50, weight: 600 }, T.ink, { hl: slide.hl }) + 30;
    put('body', slide.body, { x: M, y, w: cw, h: bottom - y }, { size: 46, min: 32, head: false, lh: 1.5 }, T.sub);
  }
  if (slide.sticker && k !== 'cover') sticker(slide.sticker, W - M - 130, top + 6, 0.08);

  // จัดเนื้อหาให้อยู่กลางพื้นที่ (เอียงขึ้นบนเล็กน้อย) แล้ววางลงภาพหลัก
  const free = (bottom - top) - (maxY - top);
  const off = ['cta', 'myth', 'versus'].includes(k) ? 0 : Math.max(0, Math.round(free * 0.46));
  main.drawImage(layer, 0, off); blocks.forEach((b) => { b.y += off; }); x = main;
  if (k === 'cover' && (slide.art || deck.art)) { const free0 = bottom - (maxY + off); if (free0 > 150) doodle(slide.art || deck.art, W - M - 150, bottom - Math.min(150, free0 * .5), Math.min(.95, free0 / 330)); }

  // ── ท้าย: แบรนด์ · ชื่อ · ใบอนุญาต · ปัดต่อ / ลายเซ็น ──
  const fy = story ? H - 210 : H - 78; const sig = getSig(); const last = idx === total - 1;
  x.font = `600 24px "Kanit", sans-serif`; x.fillStyle = T.ink; const bn = (p.brand || 'AOM CONNECT').split('').join(' '); x.fillText(bn, M, fy); const bw = x.measureText(bn).width;
  x.font = F(500, 24, false); x.fillStyle = T.sub; x.fillText(`  ·  ${p.name}${p.licenseLife ? ' · ใบอนุญาต ' + p.licenseLife : ''}`, M + bw, fy);
  if (!last) { x.font = F(600, 30); x.fillStyle = T.accent; const s = 'ปัดต่อ'; const sw = x.measureText(s).width; x.fillText(s, W - M - sw - 56, fy); x.strokeStyle = T.accent; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(W - M - 46, fy - 10); x.quadraticCurveTo(W - M - 24, fy - 16 + R() * 6, W - M - 4, fy - 10); x.moveTo(W - M - 16, fy - 22); x.lineTo(W - M - 4, fy - 10); x.lineTo(W - M - 18, fy + 2); x.stroke(); }
  else if (sig && deck.sig !== false) await drawSignature(x, sig, W - M - 300, fy - 196, 300, 140, ['night', 'classic'].includes(T.look) && deck.theme !== 'cream' && deck.theme !== 'pop' || deck.theme === 'aomfull' ? T.ink : '#3a3a3c');
  else { x.font = F(500, 22, false); x.fillStyle = T.sub; x.globalAlpha = .85; const s = 'ข้อมูลเบื้องต้น ความคุ้มครองเป็นไปตามกรมธรรม์'; x.fillText(s, W - M - x.measureText(s).width, fy - 38); x.globalAlpha = 1; }
  if (slide.src) { x.font = F(500, 20, false); x.fillStyle = T.sub; x.globalAlpha = .9; x.fillText('ที่มา: ' + slide.src, M, fy - 40); x.globalAlpha = 1; }
  // จุดความคืบหน้า
  const dw = 12, gap = 9, tw2 = total * dw + (total - 1) * gap + 20; let dx = (W - tw2) / 2; const dy = story ? fy - 78 : H - 36;
  for (let i = 0; i < total; i++) { x.fillStyle = i === idx ? T.accent : T.sub; x.globalAlpha = i === idx ? 1 : .3; rr(x, dx, dy, i === idx ? 32 : dw, dw, 6); x.fill(); dx += (i === idx ? 32 : dw) + gap; } x.globalAlpha = 1;
  return { canvas: c, blocks, overflow };
}

/** อ่าน/เขียนค่าตามเส้นทาง เช่น "bars.0.l" (รองรับ key เดิมแบบ item3) */
const pathOf = (key) => (/^item\d+$/.test(key) ? ['items', key.slice(4)] : key.split('.'));
export function getPath(o, key) { return pathOf(key).reduce((a, k2) => (a == null ? a : a[k2]), o); }
export function setPath(o, key, val) { const ps = pathOf(key); let a = o; ps.slice(0, -1).forEach((k2, i) => { if (a[k2] == null) a[k2] = /^\d+$/.test(ps[i + 1]) ? [] : {}; a = a[k2]; }); a[ps.at(-1)] = val; }

/** เปลี่ยนชนิดสไลด์โดยไม่ทิ้งข้อมูลเดิม (เก็บทุกช่องไว้ และเติมช่องที่ชนิดใหม่ต้องใช้) */
export function convertSlide(s, kind) {
  const texts = [...(s.items || []), ...(s.bars || []).map((b) => b.l), ...(s.steps || []).map((t) => t.t), ...(s.parts || []).map((t) => t.l)].filter(Boolean);
  const base = texts.length ? texts : [s.body || 'ข้อที่ 1', 'ข้อที่ 2', 'ข้อที่ 3'].filter(Boolean);
  const n = { ...s, kind, title: s.title || s.q || s.myth || 'หัวข้อ' };
  if (['list', 'check'].includes(kind) && !n.items?.length) n.items = base.slice(0, 5);
  if (kind === 'bar' && !n.bars?.length) n.bars = base.slice(0, 4).map((l, i) => ({ l, v: (i + 1) * 10 }));
  if (kind === 'donut' && !n.parts?.length) n.parts = base.slice(0, 4).map((l, i) => ({ l, v: [50, 30, 20, 10][i] || 10 }));
  if (kind === 'line' && !n.series?.length) { n.xl = ['ปีที่ 1', 'ปีที่ 5', 'ปีที่ 10', 'ปีที่ 15', 'ปีที่ 20']; n.series = [{ name: 'เส้นที่ 1', pts: [10, 30, 60, 100, 150] }, { name: 'เส้นที่ 2', pts: [10, 20, 35, 50, 70] }]; }
  if (kind === 'table' && !n.rows?.length) { n.cols = ['หัวข้อ', 'แบบ ก', 'แบบ ข']; n.rows = base.slice(0, 4).map((l) => [l, '—', '—']); }
  if (kind === 'timeline' && !n.steps?.length) n.steps = base.slice(0, 4).map((t, i) => ({ a: String(25 + i * 10), t, d: '' }));
  if (kind === 'myth') { n.myth = n.myth || s.title || 'ความเชื่อที่คนมักเข้าใจผิด'; n.fact = n.fact || s.body || 'ความจริงคือ…'; }
  if (kind === 'versus' && (typeof n.a !== 'object' || !n.a)) { const h2 = Math.ceil(base.length / 2); n.a = { h: 'แบบ ก', items: base.slice(0, h2) }; n.b = { h: 'แบบ ข', items: base.slice(h2).length ? base.slice(h2) : ['…'] }; }
  if (kind === 'qa') { n.q = n.q || s.title || 'คำถาม?'; n.a = typeof n.a === 'string' ? n.a : (s.body || 'คำตอบ…'); }
  if (kind === 'stat' && n.value == null) n.value = '0';
  return n;
}

/** แยกสไลด์ที่ยาวเกินเป็น 2 หน้า */
export function splitSlide(s) {
  for (const key of ['items', 'bars', 'steps', 'rows', 'parts']) if ((s[key] || []).length > 2) { const n = Math.ceil(s[key].length / 2); return [{ ...s, [key]: s[key].slice(0, n) }, { ...s, title: (s.title || '') + ' (ต่อ)', [key]: s[key].slice(n) }]; }
  const parts = String(s.body || '').split(/(?<=[.!?。]|\n)\s*|(?<=\s)(?=\S)/).filter(Boolean);
  const half = Math.ceil(String(s.body || '').length / 2); let a = '', b = '';
  for (const p of parts) (a.length < half ? (a += p) : (b += p));
  return [{ ...s, body: a.trim() }, { ...s, num: '', title: (s.title || '') + ' (ต่อ)', body: b.trim() }];
}
