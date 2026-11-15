// ─── รูปอวตารลายเส้น 8 แบบ (เลือกให้ลูกค้าแต่ละคน ไม่ต้องใช้รูปจริง — ปลอดภัยเรื่อง PDPA) ───
import { h, initials } from './ui.js';

const SKIN = '#f3d6c2', HAIR = '#2c2420', GRAY = '#b9b4ae';
const face = (extra = '') => `<circle cx="40" cy="42" r="17" fill="${SKIN}"/><circle cx="34" cy="42" r="1.6" fill="#2b2b2b"/><circle cx="46" cy="42" r="1.6" fill="#2b2b2b"/><path d="M35 49q5 4 10 0" stroke="#7a4b3a" stroke-width="1.8" fill="none" stroke-linecap="round"/>${extra}`;
const body = (c) => `<path d="M14 80c2-16 13-22 26-22s24 6 26 22z" fill="${c}"/>`;
export const AVATARS = {
  m1: { name: 'ผู้ชาย', bg: '#dfe8f3', svg: body('#3b5b7a') + face() + `<path d="M23 40c0-12 8-18 17-18s17 6 17 18c-3-5-8-8-17-8s-14 3-17 8z" fill="${HAIR}"/>` },
  f1: { name: 'ผู้หญิง', bg: '#f6e3e8', svg: `<path d="M20 44c0-16 9-24 20-24s20 8 20 24v18H20z" fill="${HAIR}"/>` + body('#7a3b5b') + face() + `<path d="M24 40c2-10 8-15 16-15s14 5 16 15c-5-6-10-8-16-8s-11 2-16 8z" fill="${HAIR}"/>` },
  m2: { name: 'ผู้ชายแว่น', bg: '#e3ece8', svg: body('#2f6b4f') + face('<circle cx="34" cy="42" r="5" fill="none" stroke="#333" stroke-width="1.6"/><circle cx="46" cy="42" r="5" fill="none" stroke="#333" stroke-width="1.6"/><path d="M39 42h2" stroke="#333" stroke-width="1.6"/>') + `<path d="M23 38c1-10 8-15 17-15s16 5 17 15c-4-3-9-6-17-6s-13 3-17 6z" fill="${HAIR}"/>` },
  f2: { name: 'ผู้หญิงผมสั้น', bg: '#f5ead3', svg: body('#9a6b1f') + face() + `<path d="M22 46c-2-16 6-25 18-25s20 9 18 25c-2-7-4-11-6-13-4 2-14 2-24 0-2 2-4 6-6 13z" fill="${HAIR}"/>` },
  m3: { name: 'คุณลุง', bg: '#eceeec', svg: body('#6b5847') + face('<circle cx="34" cy="42" r="5" fill="none" stroke="#555" stroke-width="1.6"/><circle cx="46" cy="42" r="5" fill="none" stroke="#555" stroke-width="1.6"/><path d="M33 52q7 3 14 0" stroke="' + GRAY + '" stroke-width="3" fill="none" stroke-linecap="round"/>') + `<path d="M24 38c2-8 8-12 16-12s14 4 16 12c-3-2-5-3-6-6-6 2-14 2-20 0-1 3-3 4-6 6z" fill="${GRAY}"/>` },
  f3: { name: 'คุณป้า', bg: '#efe3ee', svg: body('#5b2a59') + face() + `<circle cx="40" cy="20" r="7" fill="${GRAY}"/><path d="M23 42c0-11 8-17 17-17s17 6 17 17c-4-6-9-9-17-9s-13 3-17 9z" fill="${GRAY}"/>` },
  k1: { name: 'เด็กผู้ชาย', bg: '#e1eef6', svg: body('#2a6f73') + `<g transform="translate(40 44) scale(.88) translate(-40 -44)">${face()}<path d="M24 40c0-11 7-17 16-17s16 6 16 17c-2-3-5-6-8-6l-2-4-3 4c-5 0-13 2-19 6z" fill="${HAIR}"/></g>` },
  k2: { name: 'เด็กผู้หญิง', bg: '#fbe7dc', svg: body('#a44a2a') + `<g transform="translate(40 44) scale(.88) translate(-40 -44)">${face()}<path d="M23 42c0-12 8-19 17-19s17 7 17 19c-4-6-10-9-17-9s-13 3-17 9z" fill="${HAIR}"/><circle cx="21" cy="40" r="5" fill="${HAIR}"/><circle cx="59" cy="40" r="5" fill="${HAIR}"/></g>` },
};

/** รูปลูกค้า: อวตารที่เลือก หรือตัวอักษรย่อ */
export function avatarEl(c, size = 40, cls = '') {
  const a = c && AVATARS[c.avatar];
  if (!a) return h('span.avatar' + (cls ? '.' + cls : ''), { style: size !== 40 ? { width: size + 'px', height: size + 'px' } : null, 'aria-hidden': 'true' }, initials(c?.nick || '?'));
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 80 80'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('class', 'av-svg' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<rect width="80" height="80" rx="22" fill="${a.bg}"/><clipPath id="avc"><rect width="80" height="80" rx="22"/></clipPath><g clip-path="url(#avc)">${a.svg}</g>`;
  return s;
}
