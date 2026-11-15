// ─── การ์ดมีมิติ: เอียงตามนิ้ว/เมาส์ และตามการเอียงมือถือ ───
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
const MAX = 7;
function set(el, x, y) { // x,y ∈ [-1,1]
  el.style.setProperty('--ry', (x * MAX).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * MAX).toFixed(2) + 'deg');
  el.style.setProperty('--gx', (50 + x * 40).toFixed(1) + '%'); el.style.setProperty('--gy', (40 + y * 40).toFixed(1) + '%');
}
let orientOn = false, asked = false;
function onOrient(e) {
  if (calm() || e.gamma == null) return;
  const x = Math.max(-1, Math.min(1, e.gamma / 25)); const y = Math.max(-1, Math.min(1, ((e.beta || 0) - 40) / 25));
  document.querySelectorAll('.tilt.gyro').forEach((el) => set(el, x, y));
}
function startOrient() { if (orientOn) return; orientOn = true; window.addEventListener('deviceorientation', onOrient); }
export function initTilt() {
  document.addEventListener('pointermove', (e) => {
    if (calm() || e.pointerType === 'touch') return;
    const el = e.target.closest?.('.tilt'); if (!el) return;
    const r = el.getBoundingClientRect(); set(el, ((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest?.('.tilt'); if (el && !el.contains(e.relatedTarget) && !orientOn) set(el, 0, 0); }, { passive: true });
  // มือถือ: Android ได้ทันที · iPhone ต้องขออนุญาตเมื่อแตะการ์ดครั้งแรก
  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      document.addEventListener('click', (e) => { if (asked || !e.target.closest?.('.tilt')) return; asked = true; DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') startOrient(); }).catch(() => {}); });
    } else if (matchMedia('(pointer: coarse)').matches) startOrient();
  }
}
