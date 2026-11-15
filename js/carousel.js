// ─── เครื่องวาดภาพหลายหน้า (Carousel) + สตอรี่ ───
// ดีไซน์: ตัวใหญ่ หนา 1 ประเด็นต่อหน้า เว้นพื้นที่ · ป้ายซีรีส์ + เลขหน้า · "ปัดต่อ →" · ย่อข้อความให้พอดีอัตโนมัติ
// คืนตำแหน่งกล่องข้อความ (blocks) เพื่อให้แตะบนภาพแล้วแก้ตรงนั้นได้
import { profile } from './app.js';

export const THEMES = {
  ink: { name: 'กรมท่า-ทอง', bg: '#0f1d33', bg2: '#1a2d50', ink: '#f6f1e7', sub: '#b9c6de', accent: '#f2c14e', accentInk: '#0f1d33' },
  cream: { name: 'ครีม-ส้ม', bg: '#f6efe4', bg2: '#ece0cc', ink: '#14213d', sub: '#56607a', accent: '#ff6b4a', accentInk: '#ffffff' },
  pop: { name: 'ขาว-น้ำเงินสด', bg: '#ffffff', bg2: '#eef1ff', ink: '#111318', sub: '#4b5060', accent: '#3a5bff', accentInk: '#ffffff' },
  mint: { name: 'เขียวมินต์', bg: '#0e3b33', bg2: '#15503f', ink: '#effaf5', sub: '#b4d8ca', accent: '#8ef0c3', accentInk: '#0e3b33' },
};
export const KINDS = { cover: 'ปก', point: 'ประเด็น', list: 'รายการ', stat: 'ตัวเลขเด่น', cta: 'ปิดท้าย' };

const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function lines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text || '').split('\n')) {
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
const F = (w, s, serif) => `${w} ${s}px ${serif ? '"Kanit"' : '"Sarabun"'}, sans-serif`;
/** หาขนาดตัวอักษรที่ใหญ่ที่สุดที่ยังพอดีกล่อง */
function fit(ctx, text, { w, h, size, min, weight = 500, serif = true, lh = 1.18 }) {
  let s = size, ls;
  for (; s >= min; s -= 4) { ctx.font = F(weight, s, serif); ls = lines(ctx, text, w); if (ls.length * s * lh <= h) return { size: s, lines: ls, lh, overflow: false }; }
  ctx.font = F(weight, min, serif); ls = lines(ctx, text, w);
  return { size: min, lines: ls, lh, overflow: ls.length * min * lh > h };
}
function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }

/** วาด 1 สไลด์ → { canvas, blocks:[{key,x,y,w,h}], overflow } · story=true ได้ 1080×1920 (เว้นขอบบน/ล่างสำหรับ UI สตอรี่) */
export async function renderSlide(slide, deck, idx, { story = false } = {}) {
  if (document.fonts?.ready) await document.fonts.ready;
  const T = THEMES[deck.theme] || THEMES.ink; const W = 1080, H = story ? 1920 : 1350; const M = 92;
  const top = story ? 300 : 210, bottom = story ? H - 320 : H - 170;
  const c = document.createElement('canvas'); c.width = W; c.height = H; let x = c.getContext('2d');
  const blocks = []; let overflow = false; const total = deck.slides.length;
  // พื้นหลัง + รูปทรงเรียบ
  x.fillStyle = T.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = T.bg2; x.beginPath(); x.arc(W - 40, story ? 380 : 140, 300, 0, Math.PI * 2); x.fill();
  x.fillStyle = T.accent; x.globalAlpha = .9; x.beginPath(); x.arc(W - 150, story ? 470 : 230, 26, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
  x.fillStyle = T.sub; x.globalAlpha = .18; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(M + i * 26, H - (story ? 420 : 250) + j * 26, 3, 0, Math.PI * 2); x.fill(); } x.globalAlpha = 1;
  // หัว: ป้ายซีรีส์ + เลขหน้า
  const tag = deck.series ? `${deck.series}${deck.ep ? ' · EP.' + deck.ep : ''}` : (deck.tag || 'ทิปการเงิน');
  x.font = F(600, 30); const tw = x.measureText(tag).width + 48; const hy = story ? 200 : 96;
  x.fillStyle = T.accent; rr(x, M, hy, tw, 58, 29); x.fill(); x.fillStyle = T.accentInk; x.fillText(tag, M + 24, hy + 40);
  x.font = F(600, 30); x.fillStyle = T.sub; const pg = String(idx + 1).padStart(2, '0') + '/' + String(total).padStart(2, '0'); x.fillText(pg, W - M - x.measureText(pg).width, hy + 40);

  const main = x; const layer = document.createElement('canvas'); layer.width = W; layer.height = H; x = layer.getContext('2d');
  const drawFit = (key, text, box, opt, color) => {
    if (!text) return box.y;
    const r = fit(x, text, { ...opt, w: box.w, h: box.h }); overflow = overflow || r.overflow;
    x.font = F(opt.weight || 500, r.size, opt.serif !== false); x.fillStyle = color;
    r.lines.forEach((ln, i) => x.fillText(ln, box.x, box.y + r.size * (i + 0.92) * r.lh / 1.08));
    const hh = r.lines.length * r.size * r.lh; blocks.push({ key, x: box.x, y: box.y, w: box.w, h: Math.max(hh, r.size), size: r.size, serif: opt.serif !== false, weight: opt.weight || 500 });
    return box.y + hh;
  };
  const cw = W - M * 2; let y = top;
  const k = slide.kind || 'point';
  if (k === 'cover') {
    y = top + (story ? 120 : 60);
    if (slide.kicker) y = drawFit('kicker', slide.kicker, { x: M, y, w: cw, h: 80 }, { size: 40, min: 30, weight: 600, serif: false }, T.accent) + 24;
    y = drawFit('title', slide.title, { x: M, y, w: cw, h: story ? 760 : 560 }, { size: 116, min: 64, weight: 600, lh: 1.12 }, T.ink) + 26;
    x.fillStyle = T.accent; rr(x, M, y, 170, 14, 7); x.fill(); y += 54;
    drawFit('body', slide.body, { x: M, y, w: cw - 60, h: bottom - y - 120 }, { size: 46, min: 32, serif: false, lh: 1.45 }, T.sub);
  } else if (k === 'stat') {
    y = top + 40;
    if (slide.kicker) y = drawFit('kicker', slide.kicker, { x: M, y, w: cw, h: 90 }, { size: 44, min: 30, weight: 600, serif: false }, T.sub) + 16;
    y = drawFit('value', slide.value, { x: M, y, w: cw, h: 260 }, { size: 200, min: 90, weight: 600, lh: 1.05 }, T.accent) + 20;
    y = drawFit('title', slide.title, { x: M, y, w: cw, h: 300 }, { size: 72, min: 46, weight: 500 }, T.ink) + 24;
    drawFit('body', slide.body, { x: M, y, w: cw, h: bottom - y }, { size: 42, min: 30, serif: false, lh: 1.45 }, T.sub);
  } else if (k === 'list') {
    y = top + 30;
    y = drawFit('title', slide.title, { x: M, y, w: cw, h: 300 }, { size: 78, min: 48, weight: 600 }, T.ink) + 36;
    const items = (slide.items || []).filter(Boolean); const per = items.length ? (bottom - y) / items.length : 0;
    items.forEach((it, i) => {
      const cy = y + 4; x.fillStyle = T.accent; x.beginPath(); x.arc(M + 26, cy + 26, 26, 0, Math.PI * 2); x.fill();
      x.strokeStyle = T.accentInk; x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(M + 14, cy + 27); x.lineTo(M + 23, cy + 36); x.lineTo(M + 39, cy + 18); x.stroke();
      const end = drawFit('item' + i, it, { x: M + 78, y, w: cw - 78, h: Math.max(60, per - 22) }, { size: 48, min: 30, serif: false, weight: 500, lh: 1.35 }, T.ink);
      y = Math.max(end, y + 60) + 26;
    });
  } else if (k === 'cta') {
    y = top + 60;
    y = drawFit('title', slide.title, { x: M, y, w: cw, h: 420 }, { size: 90, min: 52, weight: 600 }, T.ink) + 24;
    y = drawFit('body', slide.body, { x: M, y, w: cw, h: 260 }, { size: 46, min: 32, serif: false, lh: 1.45 }, T.sub) + 40;
    const p = profile(); const by = Math.min(y, bottom - 230);
    x.fillStyle = T.bg2; rr(x, M, by, cw, 210, 34); x.fill();
    x.fillStyle = T.accent; x.beginPath(); x.arc(M + 90, by + 105, 52, 0, Math.PI * 2); x.fill();
    x.fillStyle = T.accentInk; x.font = F(600, 44, true); const ini = (p.nick || p.name || 'A').replace(/^คุณ/, '').trim()[0] || 'A'; x.fillText(ini, M + 90 - x.measureText(ini).width / 2, by + 121);
    x.fillStyle = T.ink; x.font = F(600, 44, true); x.fillText(p.name + (p.nick ? ` (${p.nick})` : ''), M + 172, by + 92);
    x.fillStyle = T.sub; x.font = F(500, 32); x.fillText([p.title, p.line ? 'LINE ' + p.line : null].filter(Boolean).join(' · '), M + 172, by + 146);
  } else {
    y = top + 30;
    if (slide.num != null && slide.num !== '') { x.fillStyle = T.accent; x.font = F(600, 150, true); x.fillText(String(slide.num), M - 6, y + 130); y += 170; }
    y = drawFit('title', slide.title, { x: M, y, w: cw, h: 380 }, { size: 84, min: 50, weight: 600 }, T.ink) + 30;
    drawFit('body', slide.body, { x: M, y, w: cw, h: bottom - y }, { size: 48, min: 32, serif: false, lh: 1.5 }, T.sub);
  }
  // จัดเนื้อหาให้อยู่กลางพื้นที่ (เอียงขึ้นบนเล็กน้อย) แล้ววางลงภาพหลัก
  const used = Math.max(...blocks.map((b) => b.y + b.h), y) - top; const free = (bottom - top) - used;
  const off = k === 'cta' ? 0 : Math.max(0, Math.round(free * 0.42));
  main.drawImage(layer, 0, off); blocks.forEach((b) => { b.y += off; }); x = main;
  // ท้าย: ชื่อ · ใบอนุญาต · ปัดต่อ
  const p = profile(); const fy = story ? H - 210 : H - 78;
  x.font = F(500, 28); x.fillStyle = T.sub; x.fillText(`${p.name}${p.licenseLife ? ' · ใบอนุญาต ' + p.licenseLife : ''}`, M, fy);
  if (idx < total - 1) { x.font = F(600, 30); x.fillStyle = T.accent; const s = 'ปัดต่อ  →'; x.fillText(s, W - M - x.measureText(s).width, fy); }
  else { x.font = F(500, 24); x.fillStyle = T.sub; x.globalAlpha = .8; const s = 'ข้อมูลเบื้องต้น ความคุ้มครองเป็นไปตามกรมธรรม์'; x.fillText(s, W - M - x.measureText(s).width, fy); x.globalAlpha = 1; }
  // จุดความคืบหน้า
  const dw = 14, gap = 10, tw2 = total * dw + (total - 1) * gap; let dx = (W - tw2) / 2;
  for (let i = 0; i < total; i++) { x.fillStyle = i === idx ? T.accent : T.sub; x.globalAlpha = i === idx ? 1 : .3; rr(x, dx, fy - (story ? 70 : 52), i === idx ? 34 : dw, dw, 7); x.fill(); dx += (i === idx ? 34 : dw) + gap; } x.globalAlpha = 1;
  return { canvas: c, blocks, overflow };
}

/** แยกสไลด์ที่ยาวเกินเป็น 2 หน้า */
export function splitSlide(s) {
  if (s.kind === 'list' && (s.items || []).length > 2) { const n = Math.ceil(s.items.length / 2); return [{ ...s, items: s.items.slice(0, n) }, { ...s, title: s.title + ' (ต่อ)', items: s.items.slice(n) }]; }
  const parts = String(s.body || '').split(/(?<=[.!?。]|\n)\s*|(?<=\s)(?=\S)/).filter(Boolean);
  const half = Math.ceil(String(s.body || '').length / 2); let a = '', b = '';
  for (const p of parts) (a.length < half ? (a += p) : (b += p));
  return [{ ...s, body: a.trim() }, { ...s, num: '', title: s.title + ' (ต่อ)', body: b.trim() }];
}
