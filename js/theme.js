// ─── ระบบหน้าตา: สีแบรนด์ (สร้างพาเลตสว่าง/มืดอัตโนมัติ) · คู่ฟอนต์ · ความโค้ง/ความแน่น ───
const LS = 'advdesk.v1.';
const ls = { get: (k) => { try { return localStorage.getItem(LS + k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(LS + k) : localStorage.setItem(LS + k, v); } catch {} } };
const root = document.documentElement;

function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
  return [hh, s * 100, l * 100];
}
function hsl(hh, s, l) {
  hh = ((hh % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map((c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((t, c, i) => t + c * [.2126, .7152, .0722][i], 0); };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

/** สีเดียว → ชุดสีครบ (ปุ่มอ่านออก ≥ 4.5:1 ทั้งโหมดสว่างและมืด) */
export function paletteFrom(hex) {
  const [hh, s0, l0] = hexToHsl(hex); const s = Math.max(28, Math.min(s0, 78));
  let L = Math.min(l0, 42); let primary = hsl(hh, s, L);
  while (contrast(primary, '#ffffff') < 4.6 && L > 8) primary = hsl(hh, s, (L -= 2));
  let D = 72; let dark = hsl(hh, Math.min(s, 60), D);
  while (contrast(dark, '#1f2522') < 6 && D < 90) dark = hsl(hh, Math.min(s, 60), (D += 2));
  const ah = hh + 150;
  return {
    light: { '--primary': primary, '--primary-ink': '#ffffff', '--primary-soft': hsl(hh, Math.min(s, 40), 93), '--accent': hsl(ah, 62, 40), '--accent-soft': hsl(ah, 50, 93) },
    dark: { '--primary': dark, '--primary-ink': hsl(hh, 30, 9), '--primary-soft': hsl(hh, 24, 18), '--accent': hsl(ah, 70, 72), '--accent-soft': hsl(ah, 30, 18) },
  };
}
const block = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
function cssFor(hex) {
  const p = paletteFrom(hex); const sel = ':root[data-palette="custom"]';
  return `${sel}{${block(p.light)}}:root[data-theme="dark"][data-palette="custom"]{${block(p.dark)}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"])[data-palette="custom"]{${block(p.dark)}}}`;
}
export function injectBrandCss(css) { let st = document.getElementById('brand-css'); if (!st) { st = document.createElement('style'); st.id = 'brand-css'; document.head.append(st); } st.textContent = css || ''; }
export const getBrandColor = () => ls.get('brandColor') || '';
export function setBrandColor(hex) {
  ls.set('brandColor', hex); const css = cssFor(hex); ls.set('brandCss', css); injectBrandCss(css);
  ls.set('palette', 'custom'); root.dataset.palette = 'custom';
  document.querySelectorAll('meta[name=theme-color]').forEach(() => {});
}

// ── คู่ฟอนต์ ──
export const FONTS = [
  ['kanit', 'Kanit + Sarabun', 'หัวเรื่องหนักแน่น เนื้อหาอ่านสบาย (ค่าเริ่มต้น)', null],
  ['plex', 'IBM Plex Thai', 'โมเดิร์น เรียบ ดูเป็นมืออาชีพ', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600&display=swap'],
  ['noto', 'Noto Serif + Sans Thai', 'หัวเรื่องมีหัว ดูหรู น่าเชื่อถือ', 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@500;600;700&display=swap'],
];
export const getFont = () => ls.get('font') || 'kanit';
export function loadFont(id) {
  const f = FONTS.find((x) => x[0] === id); if (!f?.[3] || document.getElementById('font-' + id)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f[3]; l.id = 'font-' + id; document.head.append(l);
}
export function setFont(id) { ls.set('font', id === 'kanit' ? null : id); loadFont(id); if (id === 'kanit') delete root.dataset.font; else root.dataset.font = id; }

// ── ความโค้ง & ความแน่น ──
export const getShape = () => ls.get('shape') || 'soft';
export function setShape(v) { ls.set('shape', v === 'soft' ? null : v); if (v === 'soft') delete root.dataset.shape; else root.dataset.shape = v; }
export const getDensity = () => ls.get('density') || 'comfy';
export function setDensity(v) { ls.set('density', v === 'comfy' ? null : v); if (v === 'comfy') delete root.dataset.density; else root.dataset.density = v; }

export const getDuo = () => ls.get('duo') || 'on';
export function setDuo(v) { ls.set('duo', v === 'on' ? null : v); if (v === 'on') delete root.dataset.duo; else root.dataset.duo = v; }
