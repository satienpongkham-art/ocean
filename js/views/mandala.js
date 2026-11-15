// ─── แมนฮาร่า (Mandala Chart) เป้าหมายของตัวแทน: เป้าหลัก 1 + เป้าย่อย 8 + แต่ละเป้าย่อยมี 8 การกระทำ ───
import { h, icon, sheet, closeSheet, toast } from '../ui.js';
import * as store from '../store.js';

const DEFAULT = {
  center: 'MDRT ปี 2570',
  subs: [
    { t: 'รายได้', a: ['ตั้งเป้ารายได้รายเดือน', 'ติดตามค่าคอมทุกสัปดาห์', 'เคสเฉลี่ยเบี้ย ≥ 30,000', 'ขายแพ็กเกจครบชุด', 'เพิ่มลูกค้ารายได้สูง', 'ต่ออายุครบ 100%', 'ขายเพิ่มลูกค้าเดิม', 'ทบทวนตัวเลขทุกศุกร์'] },
    { t: 'กิจกรรม', a: ['20 คะแนน/วัน', 'โทรนัดทุกเช้า 1 ชม.', 'นัด 10 ครั้ง/สัปดาห์', 'เสนอแผน 5 ครั้ง/สัปดาห์', 'บันทึกทุกกิจกรรม', 'ไม่มีวันศูนย์', 'วางแผนวันพรุ่งนี้ก่อนนอน', 'ทบทวนอัตราส่วน'] },
    { t: 'รายชื่อใหม่', a: ['ลิสต์ 100 รายชื่อ', 'ขอแนะนำทุกเคสที่ส่งมอบ', 'งานสัมมนา/เวิร์กชอป', 'เข้ากลุ่มชุมชนใหม่', 'AIA Digital Lead', 'ร่วมมือกับพาร์ตเนอร์', 'ติดต่อเพื่อนเก่า', 'จัดเกรด A/B/C'] },
    { t: 'ความรู้ & ทักษะ', a: ['รู้แผนทุกตัวในแอป', 'ซ้อมรับมือข้อโต้แย้ง', 'สอบใบอนุญาต IC', 'อบรม iAcademy', 'อ่านหนังสือเดือนละเล่ม', 'เรียนจาก MDRT', 'ซ้อมนำเสนอ', 'เรียนภาษี/การเงิน'] },
    { t: 'แบรนด์ออนไลน์', a: ['โพสต์ FB 3 ครั้ง/สัปดาห์', 'TikTok 2 คลิป/สัปดาห์', 'IG คาร์รูเซลความรู้', 'รีวิวจากลูกค้า', 'ตอบคอมเมนต์ใน 1 ชม.', 'โปรไฟล์ชัดเจน', 'Live ถามตอบ', 'ทำตามกฎ คปภ.'] },
    { t: 'บริการลูกค้า', a: ['อวยพรวันเกิด', 'ช่วยเคลมทุกเคส', 'แจ้งครบรอบชำระเบี้ย', 'ส่งมอบกรมธรรม์ด้วยตัวเอง', 'ตอบไลน์เร็ว', 'ของขวัญปีใหม่', 'จดบันทึกทุกครั้ง', 'ขอบคุณหลังปิดเคส'] },
    { t: 'สุขภาพ', a: ['ออกกำลังกาย 3 วัน/สัปดาห์', 'นอน 7 ชม.', 'AIA Vitality ระดับโกลด์', 'ตรวจสุขภาพประจำปี', 'ลดน้ำตาล', 'ดื่มน้ำ 2 ลิตร', 'เดิน 8,000 ก้าว', 'พักใจวันอาทิตย์'] },
    { t: 'การเงินตัวเอง', a: ['ออม 20% ของรายได้', 'เงินสำรอง 6 เดือน', 'ประกันตัวเองครบ', 'ลดหนี้', 'ลงทุนระยะยาว', 'แยกบัญชีธุรกิจ', 'วางแผนภาษี', 'บันทึกรายจ่าย'] },
  ],
};

function load() { const g = store.get('goals', 'agent-mandala'); return g || { id: 'agent-mandala', ...DEFAULT, done: {} }; }
function save(m) { store.put('goals', m); }

let open = null; // index ของเป้าย่อยที่กำลังดู (เก็บไว้ระดับโมดูล เพื่อไม่หลุดเมื่อหน้ารีเฟรชจากการซิงก์)
export function renderAgentMandala() {
  let m = load();
  const root = h('div', { 'data-title': 'แมนฮาร่าเป้าหมาย' });
  const body = h('div');
  const progress = (i) => { const d = m.done || {}; const n = m.subs[i].a.filter((_, j) => d[`${i}.${j}`]).length; return n; };

  const draw = () => {
    if (open == null) {
      const total = m.subs.reduce((s, _, i) => s + progress(i), 0);
      body.replaceChildren(
        h('div.card',
          h('div.mandala', [0, 1, 2, 3, -1, 4, 5, 6, 7].map((i) => i < 0
            ? h('button.mcell.center', { onclick: () => editText('เป้าหมายหลัก', m.center, (v) => { m.center = v; save(m); draw(); }) }, h('div.mt', m.center), h('div.ms', `ทำแล้ว ${total}/64`))
            : h('button.mcell', { onclick: () => { open = i; draw(); }, class: progress(i) >= 8 ? 'good' : progress(i) >= 4 ? 'warn' : '' },
              h('div.mt', m.subs[i].t), h('div.mv', progress(i) + '/8'), h('div.ms', 'แตะเพื่อดู 8 การกระทำ')))),
          h('p.xs.muted', { style: { textAlign: 'center', marginTop: '10px' } }, 'แตะตรงกลางเพื่อแก้เป้าหมายหลัก · แตะช่องรอบนอกเพื่อเปิดแผนย่อย')),
        h('div.card', h('h3', 'วิธีใช้แมนฮาร่า'), h('ul.dots.small', { style: { marginTop: '6px' } },
          h('li', 'ตรงกลางคือเป้าหมายใหญ่ของปี (เช่น MDRT, รายได้, จำนวนเคส)'),
          h('li', '8 ช่องรอบนอกคือ "สิ่งที่ต้องเก่ง" เพื่อไปถึงเป้า'),
          h('li', 'แต่ละช่องแตกเป็น 8 การกระทำที่ทำได้จริง — ติ๊กเมื่อทำเป็นนิสัยแล้ว'),
          h('li', 'ทบทวนทุกสัปดาห์ในหน้า "ทบทวนสัปดาห์"'))));
    } else {
      const s = m.subs[open];
      body.replaceChildren(
        h('button.btn.ghost', { onclick: () => { open = null; draw(); } }, icon('back'), 'กลับภาพรวม'),
        h('div.card', { style: { marginTop: '8px' } },
          h('div.mandala.goal', [0, 1, 2, 3, -1, 4, 5, 6, 7].map((j) => {
            if (j < 0) return h('button.mcell.center', { onclick: () => editText('ชื่อเป้าย่อย', s.t, (v) => { s.t = v; save(m); draw(); }) }, h('div.mt', s.t), h('div.ms', progress(open) + '/8'));
            const key = `${open}.${j}`; const done = !!(m.done || {})[key];
            return h('div.mcell', { class: done ? 'done' : '' },
              h('div.ms', { style: { color: 'var(--ink)', fontSize: '12.5px', flex: 1, cursor: 'text' }, onclick: () => editText('การกระทำ', s.a[j], (v) => { s.a[j] = v; save(m); draw(); }) }, s.a[j] || '—'),
              h('label.row.xs', { style: { gap: '4px' } }, h('input', { type: 'checkbox', checked: done, onchange: (e) => { m.done = { ...(m.done || {}), [key]: e.target.checked }; save(m); draw(); } }), done ? 'ทำแล้ว' : 'ติ๊ก'));
          })),
          h('p.xs.muted', { style: { textAlign: 'center', marginTop: '10px' } }, 'แตะข้อความเพื่อแก้ไข · ติ๊กเมื่อทำได้สม่ำเสมอแล้ว')));
    }
  };
  root.append(
    h('div.topbar', h('div', h('h1', 'แมนฮาร่าเป้าหมาย'), h('div.sub', 'Mandala Chart: เป้าหลัก 1 → เป้าย่อย 8 → การกระทำ 64 ข้อ')),
      h('button.btn.sm', { onclick: () => { if (confirm('รีเซ็ตกลับเป็นแม่แบบเริ่มต้น?')) { m = { id: 'agent-mandala', ...structuredClone(DEFAULT), done: {} }; save(m); draw(); } } }, 'รีเซ็ต')),
    body);
  draw();
  return root;
}

function editText(title, value, onSave) {
  const inp = h('textarea.input', { style: { minHeight: '70px' } }, value || '');
  sheet({ title, body: h('form.stack', { onsubmit: (e) => { e.preventDefault(); onSave(inp.value.trim()); closeSheet(true); toast('บันทึกแล้ว'); } }, inp, h('button.btn.primary.block', { type: 'submit' }, 'บันทึก')) });
  setTimeout(() => inp.focus(), 250);
}
