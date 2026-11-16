// ─── QR เปิดหน้านี้บนอีกเครื่อง (qrcode-generator · MIT) ───
import { h, sheet, copyText, icon } from './ui.js';
import * as store from './store.js';

export async function qrSvg(text, size = 220) {
  const { default: qrcode } = await import('./vendor/qrcode.js');
  const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(); const c = size / (n + 8);
  let d = ''; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) d += `M${(k + 4) * c},${(r + 4) * c}h${c}v${c}h-${c}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}
/** แผ่น "เปิดบนอีกเครื่อง" */
export async function openOnOtherDevice(note = '') {
  const url = location.href; const box = h('div.qr-box');
  const synced = !!store.sync.config.url;
  sheet({ title: 'เปิดหน้านี้บนอีกเครื่อง', sub: 'สแกนด้วยกล้องมือถือ', body: h('div.stack', box,
    h('p.small', synced ? 'งานซิงก์ผ่าน Google Sheets แล้ว เปิดบนเครื่องไหนก็ทำต่อได้' : 'ยังไม่ได้ตั้งค่าซิงก์ — ตั้งก่อนเพื่อให้งานไปถึงอีกเครื่อง ', synced ? null : h('a', { href: '#/tools/sync' }, 'ตั้งค่าซิงก์')),
    note ? h('p.xs.muted', note) : null, h('button.btn', { onclick: () => copyText(url) }, icon('copy'), 'คัดลอกลิงก์')) });
  box.innerHTML = await qrSvg(url);
}
