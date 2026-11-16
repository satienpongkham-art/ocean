// ─── โปสเตอร์แผน: ดึงข้อมูลแผนในระบบ → โปสเตอร์สรุปเข้าใจง่ายในภาพเดียว (วาดในเครื่อง ได้ทันที) ───
// หลักที่ใช้: ลำดับสายตา (หัวข้อ → ตัวเลขเด่น → จุดเด่น → ติดต่อ), ข้อความน้อย + ไอคอน, สีไม่เกิน 3–4 สี, เว้นที่ว่าง
import { PLAN, CAT, quickFacts, closingInfo } from '../data/plans.js';
import { emojiSrc } from '../data/emoji.js';
import { profile } from './app.js';

export const POSTER_LAYOUTS = { cards: 'การ์ดตัวเลข', time: 'เส้นเวลา', why: '3 เหตุผล', urgent: 'ใกล้ปิดขาย', qa: 'ถาม-ตอบ', client: 'สรุปให้ลูกค้า' };
export const POSTER_SIZES = { feed: [1080, 1350, '4:5 ฟีด'], square: [1080, 1080, '1:1'], story: [1080, 1920, '9:16 สตอรี่'] };
const THEME = {
  life: ['#a6192e', '#fde8ea', '#7a1022'], health: ['#0e7c86', '#e2f5f6', '#0a5a61'], ci: ['#6d3fc0', '#efe8fb', '#4e2a91'], hb: ['#d86a12', '#fdf0e3', '#a14f0d'],
  accident: ['#d6336c', '#fde7ef', '#a1224f'], saving: ['#a87b00', '#fbf3dc', '#7a5900'], annuity: ['#2f6fd1', '#e6efff', '#1f4f9c'], senior: ['#2e8b57', '#e5f5ec', '#1f6640'], brand: ['#a6192e', '#fde8ea', '#7a1022'],
};
const HERO = { life: '1f468-200d-1f469-200d-1f467', health: '1f3e5', ci: '1fa7a', hb: '1f4b5', accident: '1f691', saving: '1f4b0', annuity: '1f474', senior: '1f9d3' };
const F = (w, s) => `${w} ${s}px "Kanit", "Sarabun", sans-serif`;
const B = (w, s) => `${w} ${s}px "Sarabun", "Kanit", sans-serif`;

// ── ข้อความสรุปที่คัดมาสำหรับแผนหลัก (ข้อมูลจากหน้าแผนในระบบ) ──
const OVR = {
  'pay-life-plus': { head: 'จ่ายสั้น คุ้มครองยาวถึง 99', stats: [['1f4c5', '10/15/20 ปี', 'เลือกจ่ายเบี้ยได้'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครองตลอดชีพ'], ['1fa7a', 'หยุดจ่ายเบี้ย', 'เมื่อป่วยโรคร้ายแรง*'], ['1f4b0', 'รับก่อน 90%', 'ภาวะระยะสุดท้าย*']] },
  '20-pay-life': { head: 'จ่าย 20 ปี คุ้มครองถึง 99', stats: [['1f4c5', '20 ปี', 'จ่ายเบี้ย'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครองชีวิต']] },
  'health-happy': { head: 'เหมาจ่ายค่ารักษาตามจริง', stats: [['1f3e5', '25 ล้าน', 'สูงสุดต่อปี'], ['2705', 'บาทแรก', 'คุ้มครองตั้งแต่ ไม่มีส่วนร่วมจ่ายปีแรก'], ['1fa7a', 'x2', 'เมื่อป่วยโรคร้ายแรง'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'ci-procare': { head: 'โรคร้ายแรง ไม่จ่ายเบี้ยทิ้ง', stats: [['1f4c5', '10 / 20 ปี', 'จ่ายเบี้ย'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง'], ['1f4b0', 'ได้เงินแน่', 'ป่วยหรือไม่ป่วย*']] },
  'ci-plus': { head: 'เจอ จ่าย จบ โรคร้ายแรง', stats: [['1fa7a', '44 โรค', 'ระดับรุนแรง'], ['1fa99', 'วันละ 7 บาท', 'เบี้ยเริ่มต้น*'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'multipay-ci-plus': { head: 'เจอ จ่าย หลายจบ', stats: [['1fa7a', '62 โรค', 'ครอบคลุม'], ['2705', '11 ครั้ง', 'เคลมได้สูงสุด'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'hb-extra': { head: 'นอนโรงพยาบาล มีรายได้ทุกวัน', stats: [['1f3e5', 'ทุกวัน', 'ที่นอนโรงพยาบาล'], ['1f525', 'ICU x3', 'เงินชดเชย'], ['1fa7a', 'ผ่าตัด x5', 'เงินชดเชย'], ['1f4b0', 'โรคร้าย x25', 'เงินชดเชย']] },
  'npa4600': { head: 'อุบัติเหตุ อุ่นใจทุกวัน', stats: [['1f3e5', '100,000', 'ค่ารักษาต่อครั้ง'], ['1f6e1-fe0f', '600,000', 'คุ้มครองชีวิต'], ['1f4c5', 'ปีต่อปี', 'ต่ออายุถึง 75']] },
  'saving-sure': { head: 'จ่าย 10 ปี มีเงินคืนยาว ๆ', stats: [['1f4c5', '10 ปี', 'จ่ายเบี้ย'], ['1f4b0', 'ทุกปี', 'เงินคืนการันตี อายุ 60–98'], ['1f4c8', 'สูงสุด 820%', 'รับรวม*'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'annuity-sure': { head: 'มีเงินใช้ทุกปีหลังเกษียณ', stats: [['1f4b0', '15% ต่อปี', 'บำนาญของทุน'], ['1f474', '60 – 90', 'อายุที่รับบำนาญ'], ['1f9fe', '200,000', 'ลดหย่อนภาษีได้ถึง*']] },
  'senior-happy': { head: 'ผู้สูงวัยทำได้ ไม่ตรวจสุขภาพ', stats: [['1f9d3', '50 – 70 ปี', 'อายุที่ทำได้'], ['2705', 'ไม่ตรวจ', 'ไม่ถามสุขภาพ'], ['1fa99', 'วันละ 7 บาท', 'เบี้ยเริ่มต้น*'], ['1f6e1-fe0f', 'ถึงอายุ 90', 'คุ้มครอง']] },
  'health-starter': { head: 'ประกันสุขภาพ เบี้ยเบา', stats: [['1fa99', '350 บาท', 'เริ่มต่อเดือน*'], ['1f476', 'แรกเกิด', 'ทำได้ตั้งแต่'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'health-saver': { head: 'เหมาจ่าย เบี้ยเข้าถึงง่าย', stats: [['1f3e5', '2 – 5 แสน', 'วงเงินค่ารักษา'], ['1fa7a', 'x2', 'เมื่อป่วยโรคร้ายแรง'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'health-ci-hero': { head: 'ตรวจเจอโรคร้าย มีวงเงินรักษา', stats: [['1f3e5', '12 ล้าน', 'ค่ารักษาสูงสุด'], ['1fa99', 'วันละ 18 บาท', 'เบี้ยเริ่มต้น*']] },
  'infinite-care': { head: 'วงเงินสูง ครอบคลุมทั่วโลก', stats: [['1f3e5', '120 ล้าน', 'สูงสุดต่อปี'], ['2708-fe0f', 'ทั่วโลก', 'ความคุ้มครอง']] },
  'lifetime-income': { head: 'จ่าย 9 ปี มีรายได้ถึง 98', stats: [['1f4c5', '9 ปี', 'จ่ายเบี้ย'], ['1f4b0', 'ทุกปี', 'รายได้การันตีถึงอายุ 98'], ['1f4c8', '900%', 'ครบ 99 รับ*']] },
  'excellent': { head: 'ออม 20 ปี คุ้มครอง 3 เท่า', stats: [['1f4c5', '20 ปี', 'จ่ายเบี้ย'], ['1f6e1-fe0f', 'x3', 'ความคุ้มครอง'], ['1f4c8', '340%', 'รับคืนรวม*']] },
  'protection-65': { head: 'จ่ายถึง 65 รับเงินคืนทุกปี', stats: [['1f4c5', 'ถึงอายุ 65', 'จ่ายเบี้ย'], ['1f4b0', 'ทุกปี', 'เงินคืนการันตี 65–98'], ['1f6e1-fe0f', 'ถึงอายุ 99', 'คุ้มครอง']] },
  'lp70': { head: 'คุ้มครองชีวิตถึงอายุ 70', stats: [['1f6e1-fe0f', 'ถึงอายุ 70', 'จ่ายเบี้ยและคุ้มครอง'], ['1f468-200d-1f469-200d-1f467', '18 – 60 ปี', 'อายุที่ทำได้'], ['1f4aa', 'มีส่วนลด', 'เมื่อดูแลสุขภาพ (Vitality)*']] },
  'lp80': { head: 'คุ้มครองชีวิตถึงอายุ 80', stats: [['1f6e1-fe0f', 'ถึงอายุ 80', 'จ่ายเบี้ยและคุ้มครอง'], ['1f468-200d-1f469-200d-1f467', '18 – 60 ปี', 'อายุที่ทำได้'], ['1f4aa', 'มีส่วนลด', 'เมื่อดูแลสุขภาพ (Vitality)*']] },
  'term': { head: 'ทุนสูง เบี้ยต่ำ', stats: [['1f4c5', '5–20 ปี', 'เลือกระยะ'], ['1f6e1-fe0f', 'ทุนสูง', 'เบี้ยประหยัด']] },
};

const strip = (s = '') => s.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
/** ข้อมูลสำหรับโปสเตอร์ของแผน */
export function posterData(id) {
  const p = PLAN[id]; if (!p) return null;
  const q = quickFacts(p); const tl = p.timeline || {}; const o = OVR[id] || {};
  let stats = o.stats;
  if (!stats) {
    stats = [];
    if (tl.payOptions) stats.push(['1f4c5', tl.payOptions.join('/') + ' ปี', 'เลือกจ่ายเบี้ย']); else if (tl.payYears) stats.push(['1f4c5', tl.payYears + ' ปี', 'จ่ายเบี้ย']); else if (tl.payToAge) stats.push(['1f4c5', 'ถึงอายุ ' + tl.payToAge, 'จ่ายเบี้ย']); else if (tl.yearly) stats.push(['1f4c5', 'ปีต่อปี', 'ต่ออายุได้']);
    if (tl.coverToAge) stats.push(['1f6e1-fe0f', 'ถึงอายุ ' + tl.coverToAge, 'คุ้มครอง']); else if (tl.coverYears) stats.push(['1f6e1-fe0f', tl.coverYears + ' ปี', 'คุ้มครอง']); else if (tl.renewToAge) stats.push(['1f6e1-fe0f', 'ถึงอายุ ' + tl.renewToAge, 'ต่ออายุได้']);
    const m = (p.tagline || '').match(/(\d[\d,.]*\s*(?:ล้าน(?:บาท)?|บาท|%|เท่า|โรค|ครั้ง))/); if (m) stats.unshift(['2b50', m[1].replace(/บาท$/, '').trim(), strip(p.tagline.replace(m[1], '')).slice(0, 26) || 'จุดเด่น']);
    if (stats.length >= 2 && stats[stats.length - 1][1] === stats[stats.length - 2][1]) { const c = stats.pop(); stats[stats.length - 1] = ['1f6e1-fe0f', c[1], 'จ่ายเบี้ยและคุ้มครอง']; }
    if (q.age && q.age.length <= 16) stats.push([/วัน/.test(q.age) ? '1f476' : '1f468-200d-1f469-200d-1f467', q.age, 'อายุที่ทำได้']);
    stats = stats.slice(0, 4);
  }
  const points = (p.highlights || []).map(strip).filter(Boolean).slice(0, 4);
  return { p, id, cat: p.cat, name: p.short || p.name, full: strip(p.name), head: o.head || strip(p.tagline || ''), tagline: strip(p.tagline || ''), stats, points, who: (p.bestFor || []).map(strip), what: strip(p.what || ''), tl, q, closing: closingInfo(p), example: p.example };
}

// ── เครื่องมือวาด ──
const IMG = {};
function img(code) { if (!IMG[code]) { const i = new Image(); i.src = emojiSrc(code); IMG[code] = i; } return IMG[code]; }
export async function preparePoster() {
  if (!document.getElementById('gf-kanit-heavy')) { const l = document.createElement('link'); l.id = 'gf-kanit-heavy'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@600;700;800&display=swap'; document.head.append(l); }
  await Promise.race([Promise.all(['600 40px Kanit', '800 40px Kanit', '500 30px Sarabun', '700 30px Sarabun'].map((f) => document.fonts.load(f, 'กขAa').catch(() => {}))), new Promise((r) => setTimeout(r, 2500))]);
  await Promise.all([...Object.values(HERO), '1f4c5', '1f6e1-fe0f', '1fa7a', '1f4b0', '2705', '1f3e5', '1fa99', '1f4c8', '1f9fe', '1f474', '1f9d3', '1f476', '1f525', '2708-fe0f', '2b50', '2753', '1f4ac', '23f0', '1f4cc', '1f4aa', '1f331'].map((c) => { const i = img(c); return i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 3000); }); }));
}
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrap(x, text, maxW, maxLines = 2) {
  const words = SEG ? [...SEG.segment(text)].map((s) => s.segment) : text.split(/(\s)/);
  const lines = []; let cur = '';
  for (const w of words) { if (cur && x.measureText(cur + w).width > maxW) { lines.push(cur.trim()); cur = w.trimStart(); if (lines.length === maxLines) break; } else cur += w; }
  if (lines.length < maxLines && cur.trim()) lines.push(cur.trim());
  if (lines.length === maxLines && (lines.join('').length < text.replace(/\s/g, '').length - 1)) { let l = lines[maxLines - 1]; while (l && x.measureText(l + '…').width > maxW) l = l.slice(0, -1); lines[maxLines - 1] = l + '…'; }
  return lines;
}
function fit(x, text, weight, size, maxW, font = F) { let s = size; x.font = font(weight, s); while (x.measureText(text).width > maxW && s > 16) { s -= 2; x.font = font(weight, s); } return s; }
function icon3d(x, code, cx, cy, size, shadow = true) { const i = img(code); if (!i?.complete || !i.naturalWidth) return; x.save(); if (shadow) { x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = size * 0.12; x.shadowOffsetY = size * 0.06; } x.drawImage(i, cx - size / 2, cy - size / 2, size, size); x.restore(); }
function text(x, s, X, Y, { font, color, align = 'left', base = 'alphabetic' }) { x.font = font; x.fillStyle = color; x.textAlign = align; x.textBaseline = base; x.fillText(s, X, Y); }
/** ไฮไลต์แบบปากกาเน้นข้อความ (ไม่เป๊ะ ดูเป็นงานมือ) */
function marker(x, X, Y, w, h, color) { x.save(); x.fillStyle = color; x.beginPath(); x.moveTo(X - 8, Y + h * 0.18); x.lineTo(X + w + 10, Y); x.lineTo(X + w + 6, Y + h); x.lineTo(X - 4, Y + h * 1.04); x.closePath(); x.fill(); x.restore(); }

function background(x, W, H, T) {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
  let g = x.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.9); g.addColorStop(0, T[1]); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W * 0.05, H * 0.95, 0, W * 0.05, H * 0.95, W * 0.8); g.addColorStop(0, T[1]); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save(); x.globalAlpha = 0.06; x.fillStyle = T[0]; for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(W - 70 - j * 26, 60 + i * 26, 3.2, 0, 7); x.fill(); } x.restore();
}
function catPill(x, label, X, Y, T) { x.font = F(600, 30); const w = x.measureText(label).width + 44; x.fillStyle = T[0]; rr(x, X, Y, w, 56, 28); x.fill(); text(x, label, X + 22, Y + 39, { font: F(600, 30), color: '#fff' }); return w; }
function footer(x, W, H, T, d, opt) {
  const pr = profile(); const fh = 128; const Y = H - fh;
  x.fillStyle = T[2]; x.fillRect(0, Y, W, fh);
  const nm = pr.name || ''; text(x, nm, 60, Y + 56, { font: F(700, 38), color: '#fff' });
  const sub = [pr.title || 'ที่ปรึกษาประกันชีวิต', pr.licenseLife ? 'ใบอนุญาต ' + pr.licenseLife : ''].filter(Boolean).join(' · ');
  text(x, sub, 60, Y + 98, { font: B(500, 26), color: 'rgba(255,255,255,.82)' });
  if (pr.line || pr.phone) { const c = pr.line ? 'LINE ' + pr.line : 'โทร ' + pr.phone; x.font = F(700, 34); const w = x.measureText(c).width + 56; x.fillStyle = '#fff'; rr(x, W - 60 - w, Y + 32, w, 64, 32); x.fill(); text(x, c, W - 60 - w / 2, Y + 76, { font: F(700, 34), color: T[2], align: 'center' }); }
  const disc = 'ข้อมูลโดยสรุป เงื่อนไขความคุ้มครองเป็นไปตามกรมธรรม์ · ผู้ซื้อควรทำความเข้าใจรายละเอียดก่อนตัดสินใจ';
  text(x, disc, W / 2, Y - 16, { font: B(400, 21), color: '#8a8484', align: 'center' });
}
function statCard(x, X, Y, w, h, s, T) {
  x.save(); x.shadowColor = 'rgba(30,20,20,.10)'; x.shadowBlur = 24; x.shadowOffsetY = 8; x.fillStyle = '#fff'; rr(x, X, Y, w, h, 28); x.fill(); x.restore();
  x.strokeStyle = T[1]; x.lineWidth = 3; rr(x, X, Y, w, h, 28); x.stroke();
  const ic = Math.min(h * 0.5, 96); x.fillStyle = T[1]; x.beginPath(); x.arc(X + 26 + ic / 2, Y + h / 2, ic * 0.62, 0, 7); x.fill(); icon3d(x, s[0], X + 26 + ic / 2, Y + h / 2, ic, false);
  const tx = X + 26 + ic + 28, tw = w - (tx - X) - 20;
  const bs = fit(x, s[1], 800, Math.min(64, h * 0.4), tw); text(x, s[1], tx, Y + h / 2 + bs * 0.12, { font: F(800, bs), color: T[0] });
  x.font = B(600, 26); const ls = wrap(x, s[2], tw, 2); ls.forEach((l, i) => text(x, l, tx, Y + h / 2 + bs * 0.12 + 36 + i * 30, { font: B(600, 26), color: '#5b5353' }));
}
function headline(x, W, d, T, Y, maxW, size = 92) {
  x.font = F(800, size); let lines = wrap(x, d.head, maxW, 2); let s = size;
  if (lines.length === 2 && /…$/.test(lines[1])) { s = size - 16; x.font = F(800, s); lines = wrap(x, d.head, maxW, 3); }
  lines.forEach((l, i) => { x.font = F(800, s); const w = x.measureText(l).width; if (i === lines.length - 1) marker(x, 60, Y + i * s * 1.18 - s * 0.78, w, s * 0.95, T[1]); text(x, l, 60, Y + i * s * 1.18, { font: F(800, s), color: i === lines.length - 1 ? T[0] : '#1b1717' }); });
  return Y + lines.length * s * 1.18;
}
function points(x, list, X, Y, w, T, max = 3, gap = 18, size = 30) {
  let y = Y;
  for (const pt of list.slice(0, max)) { x.font = B(600, size); const ls = wrap(x, pt, w - 64, 2); x.fillStyle = T[0]; x.beginPath(); x.arc(X + 18, y + 2, 18, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.moveTo(X + 10, y + 2); x.lineTo(X + 16, y + 9); x.lineTo(X + 27, y - 6); x.stroke(); ls.forEach((l, i) => text(x, l, X + 50, y + 12 + i * (size + 8), { font: B(600, size), color: '#2b2525' })); y += ls.length * (size + 8) + gap; }
  return y;
}

/** วาดโปสเตอร์ · opt: { layout, size, theme ('cat'|'brand'), example, closeDate, head, client } */
export function drawPoster(canvas, d, opt = {}) {
  if (opt.size === 'story') { // สตอรี่: วางโปสเตอร์ 4:5 กลางจอ เว้นที่บน-ล่างให้ปุ่มของแอป
    const inner = drawPoster(document.createElement('canvas'), d, { ...opt, size: 'feed' }); canvas.width = 1080; canvas.height = 1920; const x = canvas.getContext('2d');
    const T = THEME[opt.theme === 'brand' ? 'brand' : d.cat] || THEME.brand; const g = x.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, T[0]); g.addColorStop(1, T[2]); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
    x.save(); x.globalAlpha = 0.08; x.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { x.beginPath(); x.arc((i * 173) % 1080, (i * 331) % 1920, 40 + (i % 4) * 30, 0, 7); x.fill(); } x.restore();
    const w = 980, hh = w * 1350 / 1080, X = 50, Y = 300; x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 50; x.shadowOffsetY = 20; rr(x, X, Y, w, hh, 36); x.fillStyle = '#fff'; x.fill(); x.restore();
    x.save(); rr(x, X, Y, w, hh, 36); x.clip(); x.drawImage(inner, X, Y, w, hh); x.restore();
    text(x, opt.closeDate ? 'อย่าพลาด! ปิดรับเร็ว ๆ นี้' : 'รู้ไว้ก่อน ไม่เสียโอกาส', 540, 200, { font: F(800, 64), color: '#fff', align: 'center' });
    const cta = 'ทักมาคุยได้เลย 💬'; x.font = F(700, 46); const cw = x.measureText(cta).width + 90; x.fillStyle = '#fff'; rr(x, 540 - cw / 2, Y + hh + 70, cw, 96, 48); x.fill(); text(x, cta, 540, Y + hh + 133, { font: F(700, 46), color: T[2], align: 'center' });
    return canvas;
  }
  const [W, H] = POSTER_SIZES[opt.size || 'feed']; canvas.width = W; canvas.height = H; const x = canvas.getContext('2d');
  const T = THEME[opt.theme === 'brand' ? 'brand' : d.cat] || THEME.brand; const L = opt.layout || 'cards';
  const dd = { ...d, head: opt.head || d.head };
  background(x, W, H, T);
  const tall = H > 1500, sq = H < 1200; const footTop = H - 128 - 40;
  const catName = CAT[d.cat]?.name || 'ประกัน';
  let y = tall ? 150 : 70;
  if (L === 'urgent' || (L !== 'client' && opt.closeDate)) {
    const dt = opt.closeDate ? new Date(opt.closeDate + 'T12:00:00') : null; const dstr = dt ? dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
    x.fillStyle = T[0]; x.fillRect(0, y - 20, W, 92); text(x, L === 'urgent' ? 'ใกล้ปิดการขาย' : 'ก่อนปิดการขาย', 60, y + 42, { font: F(800, 50), color: '#fff' });
    if (dstr) { x.font = F(800, 46); const w = x.measureText('ถึง ' + dstr).width + 40; x.fillStyle = '#ffe14a'; rr(x, W - 60 - w, y - 4, w, 64, 14); x.fill(); text(x, 'ถึง ' + dstr, W - 60 - w / 2, y + 44, { font: F(800, 46), color: '#3a2200', align: 'center' }); }
    y += 120;
  } else { catPill(x, catName, 60, y, T); y += 90; }
  const heroCode = HERO[d.cat] || '1f6e1-fe0f';
  if (L === 'cards' || L === 'urgent') {
    text(x, dd.name, 60, y + 46, { font: F(700, 46), color: '#5b5353' }); y += 70;
    y = headline(x, W, dd, T, y + 70, W * 0.62, sq ? 80 : 92);
    icon3d(x, heroCode, W - 200, (tall ? 300 : 210) + (L === 'urgent' ? 120 : 30), sq ? 210 : 260);
    y += 20; const st = dd.stats.slice(0, sq ? 2 : 4); const cols = 2; const gw = (W - 120 - 24) / cols; const ch = sq ? 170 : 190;
    st.forEach((s, i) => statCard(x, 60 + (i % cols) * (gw + 24), y + Math.floor(i / cols) * (ch + 24), gw, ch, s, T));
    y += Math.ceil(st.length / cols) * (ch + 24) + 10;
    if (L === 'urgent') y = points(x, dd.points, 60, y + 30, W - 120, T, sq ? 1 : 2);
    else if (!sq && dd.who[0] && y < footTop - 120) { x.fillStyle = T[1]; rr(x, 60, y + 6, W - 120, 104, 24); x.fill(); icon3d(x, '1f4cc', 112, y + 58, 56, false); x.font = B(700, 30); const ls = wrap(x, 'เหมาะกับ: ' + dd.who[0], W - 260, 2); ls.forEach((l, i) => text(x, l, 160, y + 50 + i * 36 - (ls.length - 1) * 16, { font: B(700, 30), color: T[2] })); y += 130; }
    { const room = footTop - y - 30; const n = Math.min(3, Math.floor(room / 95)); if (L !== 'urgent' && n > 0) y = points(x, dd.points.slice(dd.who[0] ? 0 : 0), 60, y + 36, W - 120, T, n); }
  } else if (L === 'time') {
    text(x, dd.name, 60, y + 46, { font: F(700, 46), color: '#5b5353' }); y += 70;
    y = headline(x, W, dd, T, y + 110, W - 120, sq ? 78 : 88) + 30;
    const tl = dd.tl; const pay = tl.payOptions ? tl.payOptions.join('/') + ' ปี' : tl.payYears ? tl.payYears + ' ปี' : tl.payToAge ? 'ถึงอายุ ' + tl.payToAge : tl.yearly ? 'ปีต่อปี' : 'ตามสัญญาหลัก';
    const cover = tl.coverToAge ? 'อายุ ' + tl.coverToAge : tl.coverYears ? tl.coverYears + ' ปี' : tl.renewToAge ? 'อายุ ' + tl.renewToAge : '—';
    const nodes = [['1f331', 'เริ่มทำ', dd.q.age || 'ตามเงื่อนไข'], ['1f4c5', 'จ่ายเบี้ย', pay], ['1f6e1-fe0f', 'คุ้มครองถึง', cover]];
    const ty = y + 120; x.strokeStyle = T[0]; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(140, ty); x.lineTo(W - 140, ty); x.stroke();
    x.fillStyle = T[0]; x.beginPath(); x.moveTo(W - 120, ty); x.lineTo(W - 150, ty - 20); x.lineTo(W - 150, ty + 20); x.fill();
    nodes.forEach(([ic, a, b], i) => { const cx = 140 + i * (W - 280) / 2; x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, ty, 70, 0, 7); x.fill(); x.strokeStyle = T[0]; x.lineWidth = 8; x.stroke(); icon3d(x, ic, cx, ty, 80, false);
      text(x, a, cx, ty + 120, { font: B(600, 28), color: '#5b5353', align: 'center' }); const bs = fit(x, b, 800, 46, 300); text(x, b, cx, ty + 172, { font: F(800, bs), color: T[0], align: 'center' }); });
    y = ty + 230; y = points(x, dd.points, 60, y + 30, W - 120, T, Math.max(1, Math.min(4, Math.floor((footTop - y - 20) / 95))));
  } else if (L === 'why') {
    const t1 = `${sq ? 3 : 3} เหตุผลที่ควรมี`; text(x, t1, 60, y + 60, { font: F(700, 52), color: '#5b5353' }); y += 70;
    const ns = fit(x, dd.name, 800, 110, W - 120); x.font = F(800, ns); const nw = x.measureText(dd.name).width; marker(x, 60, y + 20, nw, ns * 0.95, T[1]); text(x, dd.name, 60, y + ns * 0.92 + 10, { font: F(800, ns), color: T[0] }); y += ns + 70;
    icon3d(x, heroCode, W - 170, tall ? 330 : 220, 200);
    const reasons = (dd.p.pros?.length ? dd.p.pros.map(strip) : dd.points).slice(0, 3); const rh = Math.max(140, Math.min(250, (footTop - y - 30) / 3 - 20));
    reasons.forEach((r, i) => { const Y = y + i * (rh + 20); x.save(); x.shadowColor = 'rgba(0,0,0,.08)'; x.shadowBlur = 20; x.shadowOffsetY = 6; x.fillStyle = '#fff'; rr(x, 60, Y, W - 120, rh, 28); x.fill(); x.restore();
      x.fillStyle = T[0]; x.beginPath(); x.arc(130, Y + rh / 2, 44, 0, 7); x.fill(); text(x, String(i + 1), 130, Y + rh / 2 + 22, { font: F(800, 60), color: '#fff', align: 'center' });
      x.font = B(700, sq ? 30 : 34); const ls = wrap(x, r, W - 330, sq ? 2 : 3); ls.forEach((l, k) => text(x, l, 200, Y + rh / 2 + 12 + (k - (ls.length - 1) / 2) * (sq ? 38 : 44), { font: B(700, sq ? 30 : 34), color: '#2b2525' })); });
    y += 3 * (rh + 20);
  } else if (L === 'qa') {
    text(x, dd.name, 60, y + 60, { font: F(800, 70), color: T[0] }); y += 110;
    const qa = [['แผนนี้คืออะไร?', dd.what || dd.tagline], ['เหมาะกับใคร?', dd.who[0] || ''], ['จุดเด่นคือ?', dd.points[0] || '']].filter((r) => r[1]).slice(0, sq ? 2 : 3);
    for (const [qq, aa] of qa) {
      x.font = F(700, 36); const qw = x.measureText(qq).width + 60; x.fillStyle = '#f1eeee'; rr(x, 60, y, qw, 72, 36); x.fill(); text(x, qq, 90, y + 48, { font: F(700, 36), color: '#2b2525' }); y += 92;
      x.font = B(600, 32); const ls = wrap(x, aa, W - 300, 3); const bh = ls.length * 44 + 44; x.fillStyle = T[0]; rr(x, W - 60 - (W - 240), y, W - 240, bh, 36); x.fill();
      ls.forEach((l, i) => text(x, l, W - 60 - (W - 240) + 32, y + 52 + i * 44, { font: B(600, 32), color: '#fff' })); y += bh + 34;
    }
    icon3d(x, '1f4ac', W - 130, 120 + (tall ? 80 : 0), 130);
  } else if (L === 'client') {
    const who = opt.client ? 'สรุปแผนสำหรับคุณ' + opt.client.replace(/^คุณ/, '') : 'สรุปแผนสำหรับคุณ';
    text(x, who, 60, y + 50, { font: F(700, 46), color: '#5b5353' }); y += 80;
    const ns = fit(x, dd.name, 800, 96, W - 340); text(x, dd.name, 60, y + ns * 0.9, { font: F(800, ns), color: T[0] }); y += ns + 30;
    x.font = B(600, 32); wrap(x, dd.tagline, W - 120, 2).forEach((l, i) => text(x, l, 60, y + 30 + i * 42, { font: B(600, 32), color: '#3b3434' })); y += 110;
    icon3d(x, heroCode, W - 170, tall ? 330 : 230, 190);
    const st = dd.stats.slice(0, sq ? 2 : 4); const gw = (W - 120 - 24) / 2; const ch = 170;
    st.forEach((s, i) => statCard(x, 60 + (i % 2) * (gw + 24), y + Math.floor(i / 2) * (ch + 24), gw, ch, s, T)); y += Math.ceil(st.length / 2) * (ch + 24) + 20;
    if (!sq) y = points(x, dd.points, 60, y + 20, W - 120, T, tall ? 4 : 2, 14, 28);
  }
  if (opt.example && dd.example?.text && y < footTop - 140) {
    const by = Math.max(y + 10, footTop - 150); x.fillStyle = '#faf7f5'; rr(x, 60, by, W - 120, 120, 20); x.fill();
    text(x, 'ตัวอย่างจากโบรชัวร์', 90, by + 42, { font: F(700, 26), color: T[0] }); x.font = B(500, 24); wrap(x, strip(dd.example.text), W - 180, 2).forEach((l, i) => text(x, l, 90, by + 76 + i * 30, { font: B(500, 24), color: '#5b5353' }));
  }
  footer(x, W, H, T, dd, opt);
  return canvas;
}

/** แคปชั่นคู่โปสเตอร์ */
export function posterCaption(d, opt = {}) {
  const pr = profile();
  const head = opt.closeDate ? `⏰ ${d.name} ปิดรับถึง ${new Date(opt.closeDate + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}` : `✨ ${d.name} — ${d.head}`;
  const tags = { life: '#ประกันชีวิต', health: '#ประกันสุขภาพ', ci: '#ประกันโรคร้ายแรง', hb: '#ค่าชดเชยรายวัน', accident: '#ประกันอุบัติเหตุ', saving: '#ประกันออมทรัพย์', annuity: '#ประกันบำนาญ', senior: '#ประกันผู้สูงอายุ' }[d.cat] || '#ประกัน';
  return `${head}\n\n${d.points.slice(0, 3).map((p) => '✔️ ' + p).join('\n')}\n\nสนใจให้ช่วยดูแผนที่เหมาะกับคุณ ทักมาคุยได้เลย${pr.line ? ' 👉 LINE ' + pr.line : ''}\n\n${pr.name || ''}${pr.licenseLife ? ' · ใบอนุญาตเลขที่ ' + pr.licenseLife : ''}\n*เงื่อนไขความคุ้มครองเป็นไปตามกรมธรรม์\n\n${tags} #วางแผนการเงิน`;
}
