// ─── สรุปงานเช้า (ครั้งแรกของวัน) + แนะนำการใช้ครั้งแรก ───
import { h, icon, sheet, closeSheet, todayISO, dateTH } from './ui.js';
import * as store from './store.js';
import { illus } from './illus.js';

const KEY = 'advdesk.v1.brief';
export function morningBrief(force = false) {
  const s = store.getSettings(); const today = todayISO();
  if (!force) { if (s.morning === false) return; try { if (localStorage.getItem(KEY) === today) return; } catch { return; } if (document.body.classList.contains('public') || document.querySelector('.sheet-wrap, .lock, .onb')) return; }
  try { localStorage.setItem(KEY, today); } catch {}
  return import('./views/calendar.js').then(({ monthEvents }) => {
    const d = new Date(); const ev = monthEvents(d.getFullYear(), d.getMonth()); const list = ev[today] || [];
    const n = (k) => list.filter((e) => e.kind === k);
    const week = Object.entries(ev).filter(([k]) => k > today && (new Date(k) - new Date(today)) / 864e5 <= 7).flatMap(([k, a]) => a.map((e) => ({ ...e, d: k })));
    const overdue = store.all('clients').filter((c) => c.nextDate && c.nextDate < today && !['closed', 'delivered', 'paused'].includes(c.stage)).length;
    const rows = [
      [n('appt').length, 'นัดวันนี้', n('appt').map((e) => e.title).join(' · ') || 'ไม่มีนัด — ลองโทรนัดเพิ่ม', '#/work/calendar'],
      [n('follow').length + overdue, 'ลูกค้าที่ต้องติดตาม', overdue ? `เลยกำหนด ${overdue} คน` : n('follow').map((e) => e.title.replace('ติดตาม ', '')).join(' · ') || 'ไม่มีค้าง', '#/clients?f=follow'],
      [n('bday').length, 'วันเกิดวันนี้', n('bday').map((e) => e.title.replace('วันเกิด ', '')).join(' · ') || (week.filter((e) => e.kind === 'bday').length ? `สัปดาห์นี้มี ${week.filter((e) => e.kind === 'bday').length} คน` : 'ไม่มี'), '#/work/calendar'],
      [n('due').length + week.filter((e) => e.kind === 'due').length, 'ครบชำระเบี้ยใน 7 วัน', [...n('due'), ...week.filter((e) => e.kind === 'due')].map((e) => e.title).slice(0, 3).join(' · ') || 'ไม่มี', '#/work/sales'],
    ];
    const hol = n('holiday')[0];
    if (!force && !rows.some((r) => r[0]) && !store.all('clients').length) return;
    const hr = d.getHours();
    sheet({ title: hr < 12 ? 'สรุปเช้านี้' : 'สรุปวันนี้', sub: dateTH(today, true) + (hol ? ' · ' + hol.title : ''), body: h('div.stack',
      h('div.mb-list', rows.map(([c, t, sub, href]) => h('a.mb-i', { href, onclick: () => closeSheet(true) }, h('span.n', c), h('span', h('b', t), h('small', sub))))),
      h('button.btn.primary.block', { onclick: () => closeSheet(true) }, 'เริ่มวันนี้เลย'),
      h('p.xs.muted', { style: { textAlign: 'center' } }, 'ปิดสรุปนี้ได้ที่ เมนู › ตั้งค่า › การแจ้งเตือน')) });
  });
}

const PAGES = [
  ['clients', 'AOM CONNECT', 'ทุกอย่างของงานที่ปรึกษา ในแอปเดียว', 'ลูกค้า นัด ยอดขาย และแผนประกัน เก็บในเครื่องของคุณ ไม่ขึ้นอินเทอร์เน็ตถ้าคุณไม่ตั้งค่าซิงก์'],
  ['story', 'สตูดิโอ', 'ทำคอนเทนต์วันละเรื่อง ไม่ต้องคิดเอง', 'เลือกเรื่องจากคลัง แก้นิดหน่อย ได้ภาพหลายหน้า แคปชั่น และบทคลิปพร้อมโพสต์'],
  ['tools', 'เมนู', 'ที่เหลืออยู่ในเมนู', 'แตะรูปโปรไฟล์ที่แถบล่าง เพื่อเปิดเครื่องมือทั้งหมดและการตั้งค่า เช่น สีจอ ขนาดตัวอักษร และล็อกแอป'],
];
export function onboarding() {
  try { if (localStorage.getItem('advdesk.v1.onb')) return; localStorage.setItem('advdesk.v1.onb', '1'); } catch { return; }
  let i = 0; const page = h('div'); const dots = h('div.onb-dots', PAGES.map(() => h('i'))); const btn = h('button.btn.primary.block', { onclick: () => { if (i < PAGES.length - 1) { i++; draw(); } else box.remove(); } });
  const draw = () => { const [art, k, t, d] = PAGES[i]; page.replaceChildren(h('div.onb-page', illus(art, { size: 150 }), h('small.k', k), h('h2', t), h('p', d))); [...dots.children].forEach((x, j) => x.classList.toggle('on', j === i)); btn.textContent = i < PAGES.length - 1 ? 'ถัดไป' : 'เริ่มใช้งาน'; };
  const box = h('div.onb', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'แนะนำการใช้งาน' }, page, h('div.onb-foot', dots, btn, h('button.btn.ghost.block', { onclick: () => box.remove() }, 'ข้าม')));
  draw(); document.body.append(box);
}
