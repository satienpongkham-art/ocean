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
