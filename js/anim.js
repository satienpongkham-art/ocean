// ─── ตัวเลขนับขึ้น (ปิดเองเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว) ───
import { fmt } from './ui.js';
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
export function countUp(el, to, { dur = 650, from = +(el.dataset.v || 0), format = (v) => fmt(Math.round(v)) } = {}) {
  el.dataset.v = to;
  if (calm() || !isFinite(to)) { el.textContent = format(to); return; }
  const t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = format(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
/** สังเกตเมื่อเลื่อนมาเห็น แล้วค่อยนับ */
export function countWhenVisible(el, to, opt) {
  if (!('IntersectionObserver' in window)) return countUp(el, to, opt);
  el.textContent = '0';
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); countUp(el, to, { ...opt, from: 0 }); } }); io.observe(el);
}

/** นับตัวเลขขึ้นทั้งหน้า (เรียกตอนเปิดหน้าใหม่) — เฉพาะตัวเลขล้วน เช่น 12,500 หรือ 85% */
const NUM_SEL = '.bt-n, .kpi > b, .stat > b, .big, .build-total > b, .mission-stat b, .pp-facts b, [data-count]';
export function animateNumbers(root) {
  if (calm()) return;
  for (const el of root.querySelectorAll(NUM_SEL)) {
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (!node) continue;
    const m = node.textContent.trim().match(/^([\d,]+)(%?)$/); if (!m) continue;
    const to = +m[1].replace(/,/g, ''); if (!to || to > 1e10) continue;
    const pct = m[2]; const t0 = performance.now(); const dur = 700;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); node.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))) + pct; if (k < 1) requestAnimationFrame(step); };
    node.textContent = '0' + pct; requestAnimationFrame(step);
  }
}
