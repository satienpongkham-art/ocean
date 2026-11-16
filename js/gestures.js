// ─── ท่าทางนิ้ว: ปัดจากขอบซ้ายเพื่อย้อนกลับ · กดค้างการ์ดเพื่อเปิดเมนูลัด ───
import { isSheetOpen } from './ui.js';

export function initGestures() {
  if (!('ontouchstart' in window)) return;
  // ปัดจากขอบซ้าย → ย้อนกลับ (มีลูกศรบอก)
  const arrow = document.createElement('div'); arrow.className = 'gs-back'; arrow.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
  document.body.append(arrow);
  let sx = 0, sy = 0, on = false, dx = 0;
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; on = false; dx = 0;
    if (e.touches.length !== 1 || t.clientX > 22 || isSheetOpen() || document.querySelector('.rc, .vd-recov, .prompter') || location.hash.replace('#', '') === '' || location.hash === '#/') return;
    if (e.target.closest?.('.no-swipe, input[type=range], canvas')) return;
    sx = t.clientX; sy = t.clientY; on = true;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!on) return; const t = e.touches[0]; dx = t.clientX - sx; const dy = Math.abs(t.clientY - sy);
    if (dy > 60 && dy > dx) { on = false; arrow.classList.remove('show'); return; }
    const p = Math.min(1, Math.max(0, dx / 110)); arrow.style.setProperty('--p', p); arrow.classList.toggle('show', dx > 12); arrow.classList.toggle('ready', p >= 1);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (on && dx > 110) { navigator.vibrate?.(10); history.back(); }
    on = false; arrow.classList.remove('show', 'ready');
  }, { passive: true });
}

/** กดค้าง 450ms บน element → fn (ไม่รบกวนการแตะปกติ) */
export function longPress(el, fn) {
  let t = null, x0 = 0, y0 = 0, fired = false;
  el.addEventListener('pointerdown', (e) => { fired = false; x0 = e.clientX; y0 = e.clientY; t = setTimeout(() => { fired = true; navigator.vibrate?.(15); fn(e); }, 450); });
  const cancel = () => clearTimeout(t);
  el.addEventListener('pointerup', cancel); el.addEventListener('pointerleave', cancel); el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - x0) > 8 || Math.abs(e.clientY - y0) > 8) cancel(); });
  el.addEventListener('click', (e) => { if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; } }, true);
  el.addEventListener('contextmenu', (e) => { if (fired || e.pointerType === 'touch') e.preventDefault(); });
  return el;
}
