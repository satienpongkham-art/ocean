// ─── เอฟเฟกต์ฉลอง: พลุกระดาษ + สั่นเบา ๆ (ปิดเองเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว) ───
import { haptic } from './pwa.js';
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
export function celebrate({ count = 90 } = {}) {
  haptic(40);
  if (calm()) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; c.setAttribute('aria-hidden', 'true');
  document.body.append(c); const x = c.getContext('2d'); x.scale(devicePixelRatio, devicePixelRatio);
  const cs = getComputedStyle(document.documentElement); const cols = [cs.getPropertyValue('--primary'), cs.getPropertyValue('--accent'), '#f2c14e', '#8ef0c3', '#ff8a8a'].map((s) => s.trim() || '#f2c14e');
  const ps = Array.from({ length: count }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .35, vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - .5) * .3 }));
  let t = 0; const step = () => { x.clearRect(0, 0, innerWidth, innerHeight); t++;
    for (const p of ps) { p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.globalAlpha = Math.max(0, 1 - t / 110); x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (t < 110) requestAnimationFrame(step); else c.remove(); };
  requestAnimationFrame(step);
}
