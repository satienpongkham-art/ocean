// ─── นามบัตรดิจิทัล: อัปโหลดภาพนามบัตร (เก็บในเครื่องนี้เท่านั้น ไม่ขึ้นเว็บสาธารณะ) แล้วแชร์ได้ทันที ───
import { h, icon, toast } from './ui.js';
const K = (side) => 'advdesk.v1.card.' + side;
export const getCard = (side) => { try { return localStorage.getItem(K(side)); } catch { return null; } };
/** ย่อภาพให้ไม่เกิน 1600px และบีบเป็น JPEG (~200–400KB) ก่อนเก็บ */
export function saveCardFile(side, file) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      try { localStorage.setItem(K(side), c.toDataURL('image/jpeg', 0.86)); res(); } catch (e) { rej(e); } };
    img.onerror = rej; img.src = url;
  });
}
const toFile = async (data, name) => new File([await (await fetch(data)).blob()], name, { type: 'image/jpeg' });
export async function shareCard() {
  const sides = ['front', 'back'].map((s) => getCard(s)).filter(Boolean);
  if (!sides.length) { toast('ยังไม่มีภาพนามบัตร — อัปโหลดที่ เครื่องมือ › โปรไฟล์'); location.hash = '#/tools/profile'; return; }
  const files = await Promise.all(sides.map((d, i) => toFile(d, `นามบัตร-${i + 1}.jpg`)));
  try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: 'นามบัตร' }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  for (const f of files) { const a = h('a', { href: URL.createObjectURL(f), download: f.name }); document.body.append(a); a.click(); a.remove(); }
  toast('บันทึกภาพนามบัตรแล้ว');
}
export function cardManager(onChange) {
  const slot = (side, label) => {
    const data = getCard(side);
    const inp = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', id: 'card-' + side, onchange: async (e) => { const f = e.target.files[0]; if (!f) return; try { await saveCardFile(side, f); toast('บันทึกภาพนามบัตรแล้ว'); onChange(); } catch { toast('บันทึกไม่ได้ — ภาพใหญ่เกินไป'); } } });
    return h('div.card-slot', data ? h('img', { src: data, alt: 'นามบัตร' + label }) : h('div.card-ph', icon('upload'), 'ยังไม่มีภาพ'),
      h('div.row', { style: { gap: '6px', marginTop: '6px' } }, inp, h('label.btn.sm', { for: 'card-' + side }, icon('upload'), data ? 'เปลี่ยน' + label : 'อัปโหลด' + label),
        data ? h('button.btn.sm.ghost', { type: 'button', 'aria-label': 'ลบภาพ' + label, onclick: () => { localStorage.removeItem(K(side)); onChange(); } }, icon('trash')) : null));
  };
  return h('div', h('div.card-slots', slot('front', 'ด้านหน้า'), slot('back', 'ด้านหลัง')),
    h('button.btn.primary.block', { type: 'button', style: { marginTop: '10px' }, onclick: shareCard }, icon('share'), 'แชร์นามบัตร'),
    h('p.small.muted', { style: { marginTop: '6px' } }, 'ภาพเก็บเฉพาะในเครื่องนี้ (ไม่ซิงก์ และไม่ขึ้นเว็บสาธารณะ) · ใช้เครื่องอื่นให้อัปโหลดอีกครั้ง'));
}
