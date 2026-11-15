// ─── ให้แอปเหมือนแอปจริง: ติดตั้ง · ตัวเลขบนไอคอน · ธีม/ขนาดตัวอักษร · สั่นเบา ๆ ───
import { h, icon, sheet, closeSheet } from './ui.js';

const KEY = 'advdesk.v1.';
const ls = { get: (k) => { try { return localStorage.getItem(KEY + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(KEY + k, v); } catch {} } };

let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event('installable')); });
window.addEventListener('appinstalled', () => { deferred = null; ls.set('installed', '1'); });

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canInstall = () => !isStandalone() && (!!deferred || isIOS());

export async function install() {
  if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; return r.outcome; }
  iosGuide(); return 'guide';
}
export function iosGuide() {
  const step = (n, t, ic) => h('div.ios-step', h('span.n', n), h('div', { style: { flex: 1 } }, t), ic ? icon(ic) : null);
  sheet({
    title: 'ติดตั้งแอปบน iPhone',
    body: h('div',
      h('p.small.muted', { style: { marginBottom: '8px' } }, 'ต้องเปิดด้วย Safari เท่านั้น (ถ้าเปิดจากแอปอื่น ให้กด ⋯ › เปิดใน Safari ก่อน)'),
      step(1, 'แตะปุ่ม แชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่แถบล่างของ Safari', 'upload'),
      step(2, 'เลื่อนลง แตะ "เพิ่มไปยังหน้าจอโฮม"', 'plus'),
      step(3, 'แตะ "เพิ่ม" มุมขวาบน — ไอคอนแอปจะอยู่บนหน้าจอ', 'check'),
      h('button.btn.primary.block', { style: { marginTop: '12px' }, onclick: () => closeSheet() }, 'เข้าใจแล้ว')),
  });
}
export function installCard() {
  if (!canInstall() || ls.get('hideInstall') === '1') return null;
  const card = h('div.install-card',
    h('img', { src: 'assets/icon-192.png', alt: '' }),
    h('div.t', h('b', 'ติดตั้งเป็นแอป'), 'เปิดจากไอคอนบนหน้าจอ ใช้ได้แม้ไม่มีเน็ต'),
    h('button.btn.sm', { onclick: () => install() }, 'ติดตั้ง'),
    h('button.x', { 'aria-label': 'ซ่อน', onclick: () => { ls.set('hideInstall', '1'); card.remove(); } }, icon('close')));
  return card;
}

/** ตัวเลขบนไอคอนแอป (Android / iPhone iOS 16.4+ ที่ติดตั้งแล้ว / คอม) */
export function setBadge(n) {
  try { if ('setAppBadge' in navigator) { n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } } catch {}
}

/** สั่นเบา ๆ (Android) */
export function haptic(ms = 12) { try { if (ls.get('haptic') !== '0' && navigator.vibrate) navigator.vibrate(ms); } catch {} }

// ── ธีม & ขนาดตัวอักษร ──
export function getTheme() { return ls.get('theme') || 'auto'; }
export function setTheme(t) { ls.set('theme', t); if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }
export function getPalette() { return ls.get('palette') || 'ink'; }
export function setPalette(c) { ls.set('palette', c); if (c === 'ink') delete document.documentElement.dataset.palette; else document.documentElement.dataset.palette = c; }
export function getLeading() { return ls.get('leading') || 'normal'; }
export function setLeading(v) { ls.set('leading', v); if (v === 'normal') delete document.documentElement.dataset.leading; else document.documentElement.dataset.leading = v; }
export function getMotion() { return ls.get('motion') || 'auto'; }
export function setMotion(v) { ls.set('motion', v); if (v === 'auto') delete document.documentElement.dataset.motion; else document.documentElement.dataset.motion = v; }
export function getContrast() { return ls.get('contrast') || 'normal'; }
export function setContrast(v) { ls.set('contrast', v); if (v === 'normal') delete document.documentElement.dataset.contrast; else document.documentElement.dataset.contrast = v; }
export function getTextSize() { return ls.get('textsize') || 'm'; }
export function setTextSize(z) { ls.set('textsize', z); if (z === 'm') delete document.documentElement.dataset.text; else document.documentElement.dataset.text = z; }
export function getHaptic() { return ls.get('haptic') !== '0'; }
export function setHaptic(on) { ls.set('haptic', on ? '1' : '0'); }

/** ล้างแคชทั้งหมดแล้วโหลดเวอร์ชันล่าสุด (ข้อมูลลูกค้าไม่หาย — อยู่ใน localStorage) */
export async function forceUpdate() {
  try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch {}
  try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); } catch {}
  location.replace(location.pathname + '?v=' + Date.now() + location.hash);
}

export function hideSplash() { const s = document.getElementById('splash'); if (s && !s.classList.contains('hide')) { s.classList.add('hide'); setTimeout(() => s.remove(), 400); } }
