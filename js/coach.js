// ─── จุดแนะนำฟีเจอร์ทีละจุด (ครั้งแรกที่เปิดแต่ละหน้า) ───
import { h } from './ui.js';
const KEY = 'advdesk.v1.coach';
const STEPS = [
  [/^\/?$/, 'home', [['#tabbar .tb-me', 'เมนูและตั้งค่า', 'แตะรูปโปรไฟล์เพื่อเปิดเครื่องมือทั้งหมด และตั้งค่า เช่น สีจอ ตัวอักษร ล็อกแอป'], ['.hero', 'เป้าเดือนนี้', 'ดูยอดเบี้ยเทียบเป้า แตะเพื่อดูยอดขายทั้งหมด'], ['.fab', 'บันทึกด่วน', 'จดโน้ต ลงนัด หรือเพิ่มลูกค้าได้จากทุกหน้า']]],
  [/^\/studio$/, 'studio', [['.sd-today', 'เรื่องของวันนี้', 'วันละเรื่องจากคลัง 365 กด "เปิดทำเลย" ได้สไลด์พร้อมแก้'], ['.sd-nav', 'ทางลัดสตูดิโอ', 'คลังเรื่อง ผลโพสต์ หลักที่ใช้ ลายเซ็น และปกไฮไลต์ IG'], ['.sm-seg', 'บอร์ด หรือ ปฏิทิน', 'สลับดูงานตามขั้นตอน หรือตามวันที่ตั้งโพสต์']]],
  [/^\/studio\/(?!library|stats|playbook|sign|covers)[\w-]+$/, 'editor', [['.ig-stage', 'แตะบนภาพเพื่อแก้', 'แตะข้อความหรือตัวเลขบนภาพ แก้ได้ทันที ตัวอักษรย่อให้พอดีเอง'], ['.st-strip', 'เรียงสไลด์', 'แตะเพื่อเลือก ลากเพื่อสลับ กด + เพื่อเพิ่มกราฟ ตาราง หรือไทม์ไลน์'], ['.th-row', 'สไตล์ภาพ', 'เปลี่ยนสไตล์ทั้งชุดได้ในแตะเดียว'], ['.st-ed-head + .chips + .seg, .seg', 'แคปชั่นและบทคลิป', 'งานเดียวได้ทั้งภาพ สตอรี่ แคปชั่น และบทคลิป เลือกโทนภาษาได้']]],
  [/^\/plans\/?$/, 'plans', [['.pl-cta', 'เครื่องมือแผนใหม่', 'ชุดแผนตามช่วงวัย และเทียบมีกับไม่มีประกันจากบิลจริง'], ['.topbar', 'คลังแผน', 'ค้นหาแผน กรองตามหมวด แตะแผนเพื่อดูหน้าเต็ม']]],
  [/^\/plan\/[\w-]+$/, 'plan', [['.pp-30', '3 คำตอบใน 5 วินาที', 'คุ้มครองอะไร เหมาะกับใคร เบี้ยเท่าไร ใช้ตอบลูกค้าได้ทันที'], ['.hl-rail', 'จุดเด่น', 'ปัดดูการ์ด แตะเพื่ออ่านรายละเอียด'], ['.pp-sticky', 'ชุดแผนที่กำลังคุย', 'ใส่แผนนี้ลงชุด แล้วไปต่อชุดคิดเบี้ยรวมได้']]],
  [/^\/clients\/?$/, 'clients', [['a.btn.primary[href="#/client/new"]', 'เพิ่มลูกค้า', 'กรอกทีละขั้น ใช้เวลาไม่ถึงนาที'], ['.chips', 'ตัวกรองด่วน', 'ดูคนที่ต้องติดตามหรือยังไม่มีขั้นต่อไป']]],
  [/^\/client\/[\w-]+$/, 'client', [['.c-stats', 'ภาพรวมลูกค้า', 'กรมธรรม์ เบี้ยต่อปี คุยล่าสุด และนัดที่รออยู่'], ['.icon-actions', 'ติดต่อด่วน', 'โทร LINE ลงนัด หรือจดบันทึก'], ['.tabs-bar, .tabs, [role=tablist]', 'ไทม์ไลน์', 'แท็บสุดท้ายรวมทุกความเคลื่อนไหวของลูกค้าคนนี้']]],
];
const seen = () => { try { const v = localStorage.getItem(KEY); return v === 'off' ? 'off' : JSON.parse(v || '{}'); } catch { return {}; } };
let busy = false;
export function coach(path) {
  const S = seen(); if (S === 'off' || busy) return;
  const m = STEPS.find(([re]) => re.test(path)); if (!m) return; const [, id, steps] = m; if (S[id]) return;
  if (document.querySelector('.sheet-wrap, .lock, .onb, .prompter') || document.body.classList.contains('public') || document.body.classList.contains('presenting')) return;
  const vis = (sel) => { for (const s of sel.split(',')) { const el = document.querySelector(s.trim()); if (el) { const r = el.getBoundingClientRect(); if (r.width && r.height) return el; } } return null; };
  const list = steps.map(([sel, t, d]) => ({ el: vis(sel), t, d })).filter((x) => x.el); if (!list.length) return;
  busy = true; let i = 0;
  const hole = h('div.cm-hole'); const tip = h('div.cm-tip', { role: 'dialog', 'aria-live': 'polite' }); const veil = h('div.cm-veil', hole, tip);
  const done = () => { busy = false; veil.remove(); try { const s2 = seen(); if (s2 !== 'off') localStorage.setItem(KEY, JSON.stringify({ ...s2, [id]: 1 })); } catch {} window.removeEventListener('hashchange', done); };
  const show = () => { const { el, t, d } = list[i]; el.scrollIntoView({ block: 'center', behavior: 'instant' });
    requestAnimationFrame(() => { const r = el.getBoundingClientRect(); const pad = 6; Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: Math.min(r.height, innerHeight * .6) + pad * 2 + 'px' });
      tip.replaceChildren(h('b', t), h('p', d), h('div.row', h('small', `${i + 1}/${list.length}`), h('div.row', { style: { gap: '8px' } }, h('button.btn.sm.ghost', { onclick: done }, 'ข้าม'), h('button.btn.sm.primary', { onclick: () => { i++; i < list.length ? show() : done(); } }, i < list.length - 1 ? 'ถัดไป' : 'เข้าใจแล้ว'))));
      const below = r.bottom + 16 + 170 < innerHeight; tip.style.top = (below ? r.top + Math.min(r.height, innerHeight * .6) + 18 : Math.max(16, r.top - 18 - (tip.offsetHeight || 150))) + 'px'; }); };
  document.body.append(veil); window.addEventListener('hashchange', done); show();
}
