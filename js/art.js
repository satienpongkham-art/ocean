// ─── ภาพประกอบคนแบบแบน (flat illustration) วาดด้วย canvas: ฉากมีเรื่องราว ซ้อนชั้น พื้นหลัง → ของประกอบ → คน ───
// โทนเดียวกันทั้งชุด: สีผิว 2 โทน ผมเข้ม เสื้อใช้สีหลักของธีม เงานุ่ม ไม่มีเส้นขอบแข็ง
export const ARTS_PEOPLE = [['p-family', 'ครอบครัว'], ['p-saver', 'ออมเงิน'], ['p-care', 'ดูแลสุขภาพ'], ['p-elder', 'วัยเกษียณ'], ['p-work', 'คนทำงาน'], ['p-think', 'สงสัย/คิด'], ['p-grow', 'เงินงอกเงย']];
const SKIN = ['#f3c9a6', '#e2ac84'], HAIR = '#2a2220';
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); };

/** คน 1 คน (cx = กึ่งกลาง, base = เท้า, s = ความสูงรวม) */
function person(x, cx, base, s, { skin = SKIN[0], shirt = '#a6192e', pants = '#2f3542', hair = 'short', arm = 'down', glasses = false, old = false, kid = false } = {}) {
  const head = s * (kid ? 0.2 : 0.16), bodyH = s * (kid ? 0.36 : 0.4), legH = s - head * 2 - bodyH;
  const hy = base - s + head; const by = hy + head * 0.95; const bw = s * (kid ? 0.3 : 0.32);
  // เงาพื้น
  x.fillStyle = 'rgba(0,0,0,.08)'; x.beginPath(); x.ellipse(cx, base + 4, bw * 0.75, s * 0.03, 0, 0, 7); x.fill();
  // ขา
  x.fillStyle = pants; rr(x, cx - bw * 0.36, by + bodyH - 6, bw * 0.3, legH + 6, bw * 0.12); x.fill(); rr(x, cx + bw * 0.06, by + bodyH - 6, bw * 0.3, legH + 6, bw * 0.12); x.fill();
  x.fillStyle = '#1e2229'; rr(x, cx - bw * 0.42, base - s * 0.035, bw * 0.38, s * 0.04, s * 0.02); x.fill(); rr(x, cx + bw * 0.04, base - s * 0.035, bw * 0.38, s * 0.04, s * 0.02); x.fill();
  // ตัว
  x.fillStyle = shirt; rr(x, cx - bw / 2, by, bw, bodyH, bw * 0.32); x.fill();
  x.fillStyle = shade(shirt, 0.86); rr(x, cx - bw / 2, by + bodyH * 0.55, bw, bodyH * 0.45, bw * 0.3); x.fill();
  // แขน
  x.strokeStyle = shirt; x.lineCap = 'round'; x.lineWidth = bw * 0.24;
  const sh = by + bw * 0.18; const L = [cx - bw * 0.5, sh], R = [cx + bw * 0.5, sh];
  const hand = (p, q) => { x.strokeStyle = shirt; x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke(); x.fillStyle = skin; x.beginPath(); x.arc(q[0], q[1], bw * 0.13, 0, 7); x.fill(); };
  if (arm === 'wave') { hand(L, [L[0] - bw * 0.25, sh + bodyH * 0.6]); hand(R, [R[0] + bw * 0.35, sh - bodyH * 0.45]); }
  else if (arm === 'hold') { hand(L, [cx - bw * 0.05, sh + bodyH * 0.45]); hand(R, [cx + bw * 0.12, sh + bodyH * 0.42]); }
  else if (arm === 'think') { hand(L, [L[0] - bw * 0.2, sh + bodyH * 0.6]); hand(R, [cx + bw * 0.12, hy + head * 0.75]); }
  else { hand(L, [L[0] - bw * 0.18, sh + bodyH * 0.62]); hand(R, [R[0] + bw * 0.18, sh + bodyH * 0.62]); }
  // คอ + หัว
  x.fillStyle = shade(skin, 0.92); rr(x, cx - head * 0.28, hy + head * 0.6, head * 0.56, head * 0.6, head * 0.2); x.fill();
  x.fillStyle = skin; x.beginPath(); x.ellipse(cx, hy, head * 0.92, head, 0, 0, 7); x.fill();
  // ผม
  x.fillStyle = old ? '#d9d9d9' : HAIR; x.beginPath();
  if (hair === 'long') { x.ellipse(cx, hy - head * 0.2, head * 1.02, head * 0.9, 0, Math.PI, 0); x.fill(); rr(x, cx - head * 1.02, hy - head * 0.25, head * 0.42, head * 1.6, head * 0.2); x.fill(); rr(x, cx + head * 0.6, hy - head * 0.25, head * 0.42, head * 1.6, head * 0.2); x.fill(); }
  else if (hair === 'bun') { x.ellipse(cx, hy - head * 0.25, head * 0.98, head * 0.82, 0, Math.PI, 0); x.fill(); x.beginPath(); x.arc(cx + head * 0.2, hy - head * 1.05, head * 0.42, 0, 7); x.fill(); }
  else { x.ellipse(cx, hy - head * 0.28, head * 0.98, head * 0.78, 0, Math.PI * 1.02, -0.02); x.fill(); }
  // หน้า
  x.fillStyle = '#2a2220'; x.beginPath(); x.arc(cx - head * 0.34, hy + head * 0.05, head * 0.09, 0, 7); x.fill(); x.beginPath(); x.arc(cx + head * 0.34, hy + head * 0.05, head * 0.09, 0, 7); x.fill();
  x.strokeStyle = '#7a3b2e'; x.lineWidth = Math.max(2, head * 0.08); x.beginPath(); x.arc(cx, hy + head * 0.3, head * 0.26, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
  x.fillStyle = 'rgba(232,120,110,.35)'; x.beginPath(); x.arc(cx - head * 0.55, hy + head * 0.32, head * 0.14, 0, 7); x.fill(); x.beginPath(); x.arc(cx + head * 0.55, hy + head * 0.32, head * 0.14, 0, 7); x.fill();
  if (glasses) { x.strokeStyle = '#3a3a3a'; x.lineWidth = Math.max(2, head * 0.07); x.beginPath(); x.arc(cx - head * 0.34, hy + head * 0.05, head * 0.24, 0, 7); x.stroke(); x.beginPath(); x.arc(cx + head * 0.34, hy + head * 0.05, head * 0.24, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx - head * 0.1, hy + head * 0.05); x.lineTo(cx + head * 0.1, hy + head * 0.05); x.stroke(); }
  return { hy, head, by, bw, sh };
}
function blob(x, cx, cy, r, color) { x.fillStyle = color; x.beginPath(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; const rr2 = r * (1 + 0.06 * Math.sin(i * 2.3)); const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2 * 0.9; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); }
function coin(x, cx, cy, r) { x.fillStyle = '#e8a91a'; x.beginPath(); x.ellipse(cx, cy + r * 0.12, r, r * 0.92, 0, 0, 7); x.fill(); x.fillStyle = '#ffcc3d'; x.beginPath(); x.ellipse(cx, cy, r, r * 0.92, 0, 0, 7); x.fill(); x.fillStyle = '#e8a91a'; x.font = `800 ${r}px "Kanit"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('฿', cx, cy + r * 0.05); }
function leaf(x, cx, cy, s, a, c) { x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = c; x.beginPath(); x.ellipse(0, -s / 2, s * 0.32, s / 2, 0, 0, 7); x.fill(); x.restore(); }

/** วาดฉาก ณ กึ่งกลาง (cx, cy) ขนาด size (กว้าง≈สูง) · T = ธีมของสไลด์ */
export function drawArt(x, type, cx, cy, size, T) {
  const acc = T?.accent || '#a6192e', soft = T?.bg2 || '#f5eded'; const s = size;
  x.save(); x.textAlign = 'center';
  blob(x, cx, cy + s * 0.05, s * 0.5, soft);
  const base = cy + s * 0.44;
  if (type === 'p-family') {
    leaf(x, cx - s * 0.46, base - s * 0.1, s * 0.28, -0.3, '#7cc59a'); leaf(x, cx - s * 0.4, base - s * 0.06, s * 0.22, 0.4, '#5fae82');
    person(x, cx - s * 0.2, base, s * 0.78, { shirt: acc, arm: 'hold' });
    person(x, cx + s * 0.18, base, s * 0.72, { shirt: '#f2b33d', hair: 'long', skin: SKIN[1], arm: 'hold' });
    person(x, cx, base, s * 0.42, { shirt: '#4c8bf5', kid: true, arm: 'wave' });
    x.fillStyle = acc; x.globalAlpha = 0.9; heart(x, cx + s * 0.38, cy - s * 0.32, s * 0.09); x.globalAlpha = 1;
  } else if (type === 'p-saver') {
    const p = person(x, cx - s * 0.12, base, s * 0.8, { shirt: acc, arm: 'hold', hair: 'bun' });
    // กระปุกหมู
    const px = cx + s * 0.22, py = base - s * 0.16; x.fillStyle = '#f59fb0'; x.beginPath(); x.ellipse(px, py, s * 0.17, s * 0.13, 0, 0, 7); x.fill(); x.fillStyle = '#ef8aa0'; x.beginPath(); x.ellipse(px + s * 0.15, py, s * 0.05, s * 0.045, 0, 0, 7); x.fill(); rr(x, px - s * 0.1, py + s * 0.08, s * 0.05, s * 0.07, 4); x.fill(); rr(x, px + s * 0.05, py + s * 0.08, s * 0.05, s * 0.07, 4); x.fill(); x.fillStyle = '#2a2220'; x.beginPath(); x.arc(px + s * 0.07, py - s * 0.03, s * 0.014, 0, 7); x.fill(); x.fillStyle = '#c96a80'; rr(x, px - s * 0.04, py - s * 0.135, s * 0.08, s * 0.02, 3); x.fill();
    coin(x, px - s * 0.02, py - s * 0.24, s * 0.06); coin(x, px + s * 0.12, py - s * 0.33, s * 0.05);
    void p;
  } else if (type === 'p-care') {
    // หมอ + ผู้ป่วยบนเตียง
    x.fillStyle = '#ffffff'; rr(x, cx - s * 0.5, base - s * 0.2, s * 0.62, s * 0.12, s * 0.04); x.fill(); x.fillStyle = '#9fb7d9'; rr(x, cx - s * 0.5, base - s * 0.1, s * 0.62, s * 0.06, s * 0.02); x.fill(); x.fillStyle = '#7c8ea8'; rr(x, cx - s * 0.48, base - s * 0.05, s * 0.04, s * 0.05, 2); x.fill(); rr(x, cx + s * 0.06, base - s * 0.05, s * 0.04, s * 0.05, 2); x.fill();
    x.fillStyle = SKIN[0]; x.beginPath(); x.arc(cx - s * 0.4, base - s * 0.26, s * 0.08, 0, 7); x.fill(); x.fillStyle = HAIR; x.beginPath(); x.arc(cx - s * 0.42, base - s * 0.3, s * 0.07, Math.PI, 0); x.fill(); x.fillStyle = '#c9daf2'; rr(x, cx - s * 0.32, base - s * 0.27, s * 0.42, s * 0.09, s * 0.04); x.fill();
    person(x, cx + s * 0.3, base, s * 0.82, { shirt: '#ffffff', pants: '#5a6b82', glasses: true, arm: 'hold' });
    x.fillStyle = acc; rr(x, cx + s * 0.27, base - s * 0.52, s * 0.06, s * 0.02, 2); x.fill(); rr(x, cx + s * 0.29, base - s * 0.54, s * 0.02, s * 0.06, 2); x.fill();
  } else if (type === 'p-elder') {
    x.fillStyle = '#8a6a4a'; rr(x, cx - s * 0.44, base - s * 0.2, s * 0.88, s * 0.04, 6); x.fill(); rr(x, cx - s * 0.4, base - s * 0.2, s * 0.03, s * 0.2, 4); x.fill(); rr(x, cx + s * 0.37, base - s * 0.2, s * 0.03, s * 0.2, 4); x.fill();
    person(x, cx - s * 0.17, base - s * 0.02, s * 0.74, { shirt: '#6a9bd8', old: true, glasses: true, arm: 'hold' });
    person(x, cx + s * 0.17, base - s * 0.02, s * 0.7, { shirt: acc, old: true, hair: 'bun', skin: SKIN[1], arm: 'hold' });
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx + s * 0.4, cy - s * 0.32, s * 0.07, 0, 7); x.fill(); x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(cx + s * 0.4, cy - s * 0.32, s * 0.05, 0, 7); x.fill();
  } else if (type === 'p-work') {
    x.fillStyle = '#d7c3a8'; rr(x, cx - s * 0.46, base - s * 0.3, s * 0.92, s * 0.04, 6); x.fill(); x.fillStyle = '#b89f80'; rr(x, cx - s * 0.42, base - s * 0.26, s * 0.03, s * 0.26, 3); x.fill(); rr(x, cx + s * 0.39, base - s * 0.26, s * 0.03, s * 0.26, 3); x.fill();
    person(x, cx - s * 0.05, base - s * 0.02, s * 0.84, { shirt: acc, arm: 'hold', glasses: true });
    x.fillStyle = '#3a3f4b'; rr(x, cx + s * 0.08, base - s * 0.48, s * 0.3, s * 0.19, 8); x.fill(); x.fillStyle = '#7fb2ff'; rr(x, cx + s * 0.1, base - s * 0.46, s * 0.26, s * 0.15, 6); x.fill(); x.fillStyle = '#3a3f4b'; rr(x, cx + s * 0.04, base - s * 0.31, s * 0.38, s * 0.02, 4); x.fill();
    x.fillStyle = '#ffffff'; rr(x, cx - s * 0.42, base - s * 0.39, s * 0.1, s * 0.09, 4); x.fill(); x.fillStyle = '#c9915d'; rr(x, cx - s * 0.4, base - s * 0.36, s * 0.06, s * 0.06, 3); x.fill();
  } else if (type === 'p-think') {
    person(x, cx - s * 0.05, base, s * 0.86, { shirt: acc, arm: 'think', hair: 'long', skin: SKIN[1] });
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx + s * 0.32, cy - s * 0.3, s * 0.15, s * 0.12, 0, 0, 7); x.fill(); x.beginPath(); x.arc(cx + s * 0.18, cy - s * 0.14, s * 0.03, 0, 7); x.fill(); x.beginPath(); x.arc(cx + s * 0.13, cy - s * 0.07, s * 0.018, 0, 7); x.fill();
    x.fillStyle = acc; x.font = `800 ${s * 0.16}px "Kanit"`; x.textBaseline = 'middle'; x.fillText('?', cx + s * 0.32, cy - s * 0.29);
  } else if (type === 'p-grow') {
    const bars = [[-0.42, 0.16], [-0.28, 0.26], [-0.14, 0.38]]; bars.forEach(([dx, hh], i) => { x.fillStyle = i === 2 ? acc : shade(acc, 1.35); x.globalAlpha = 0.5 + i * 0.25; rr(x, cx + s * dx, base - s * hh, s * 0.1, s * hh, s * 0.02); x.fill(); }); x.globalAlpha = 1;
    leaf(x, cx - s * 0.09, base - s * 0.42, s * 0.16, 0.6, '#6dbf8b');
    person(x, cx + s * 0.22, base, s * 0.82, { shirt: acc, arm: 'wave' });
    coin(x, cx + s * 0.44, cy - s * 0.3, s * 0.06); coin(x, cx + s * 0.02, cy - s * 0.38, s * 0.05);
  }
  x.restore();
}
function heart(x, cx, cy, r) { x.beginPath(); x.moveTo(cx, cy + r * 0.9); x.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.4, cx, cy - r * 0.45); x.bezierCurveTo(cx + r * 0.7, cy - r * 1.4, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9); x.fill(); }
