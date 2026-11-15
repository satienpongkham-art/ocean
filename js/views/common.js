// ─── ส่วนที่ใช้ร่วมกัน: นัดหมาย · บันทึกกิจกรรม · ลิงก์ Google Calendar ───
import { h, icon, sheet, closeSheet, field, inputEl, selectEl, readForm, toast, todayISO, dateTH } from '../ui.js';
import * as store from '../store.js';
import { ACTIVITIES, ACT, STAGE } from '../engine/work.js';

export function gcalLink({ title, date, time, minutes = 60, place, details }) {
  const d = (date || todayISO()).replace(/-/g, '');
  let dates;
  if (time) {
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(2000, 0, 1, hh, mm); const end = new Date(start.getTime() + minutes * 60000);
    const t = (x) => String(x.getHours()).padStart(2, '0') + String(x.getMinutes()).padStart(2, '0') + '00';
    dates = `${d}T${t(start)}/${d}T${t(end)}`;
  } else {
    const nx = new Date(date + 'T00:00:00'); nx.setDate(nx.getDate() + 1);
    dates = `${d}/${nx.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }
  const u = new URLSearchParams({ action: 'TEMPLATE', text: title || 'นัดลูกค้า', dates, ctz: 'Asia/Bangkok' });
  if (place) u.set('location', place);
  if (details) u.set('details', details);
  return 'https://calendar.google.com/calendar/render?' + u.toString();
}

/** บันทึกกิจกรรม (นับคะแนน) + log ในประวัติลูกค้า */
export function logActivity(type, clientId, note = '') {
  store.put('activities', { type, clientId: clientId || null, date: todayISO(), count: 1 });
  if (clientId) {
    store.put('logs', { clientId, date: todayISO(), type, text: note || ACT[type]?.name || type });
    const c = store.get('clients', clientId);
    if (c) store.put('clients', { ...c, lastContact: new Date().toISOString() });
  }
  toast(`+${ACT[type]?.pts || 0} คะแนน · ${ACT[type]?.name || ''}`);
}

export function setStage(c, stage) {
  if (!c || c.stage === stage) return;
  store.put('clients', { ...c, stage, stageAt: new Date().toISOString() });
  store.put('logs', { clientId: c.id, date: todayISO(), type: 'stage', text: `ย้ายไปขั้น "${STAGE[stage]?.name || stage}"` });
}

/** ฟอร์มนัดหมาย (ป๊อปอัป) */
export function apptSheet({ clientId, appt } = {}) {
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const a = appt || { date: todayISO(), time: '', clientId };
  const f = h('form.form-grid', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = readForm(f);
      const isNew = !a.id;
      const saved = store.put('appts', { ...a, ...d, status: a.status || 'planned' });
      if (isNew) {
        const c = d.clientId && store.get('clients', d.clientId);
        if (c) {
          store.put('activities', { type: 'appt', clientId: c.id, date: todayISO(), count: 1 });
          if (['lead', 'contacted', undefined, ''].includes(c.stage)) setStage(store.get('clients', c.id), 'appt');
        }
      }
      closeSheet(true);
      toast(isNew ? 'บันทึกนัดแล้ว' : 'แก้ไขนัดแล้ว');
      const c = saved.clientId && store.get('clients', saved.clientId);
      showApptDone(saved, c);
    },
  },
    field('ลูกค้า', selectEl('clientId', a.clientId || '', [['', '— ไม่ระบุ —'], ...clients.map((c) => [c.id, c.nick])]), null),
    field('หัวข้อ', inputEl('title', a.title, { placeholder: 'เช่น คุยแผนสุขภาพ' })),
    field('วันที่', inputEl('date', a.date, { type: 'date', required: true })),
    field('เวลา', inputEl('time', a.time, { type: 'time' })),
    field('สถานที่ / ช่องทาง', inputEl('place', a.place, { placeholder: 'ร้านกาแฟ / Zoom / บ้านลูกค้า' })),
    field('จุดประสงค์', selectEl('purpose', a.purpose || 'แนะนำตัว/เก็บข้อมูล', [['แนะนำตัว/เก็บข้อมูล', 'แนะนำตัว / เก็บข้อมูล'], ['ตรวจสุขภาพการเงิน', 'ตรวจสุขภาพการเงิน'], ['เสนอแผน', 'เสนอแผน'], ['ปิดการขาย/เซ็นใบคำขอ', 'ปิดการขาย / เซ็นใบคำขอ'], ['ส่งมอบกรมธรรม์', 'ส่งมอบกรมธรรม์'], ['บริการ/ติดตาม', 'บริการ / ติดตาม']])),
    h('div.full', field('บันทึก', h('textarea.input', { name: 'note' }, a.note || ''))),
    h('div.full.row', { style: { gap: '8px' } },
      h('button.btn.primary', { type: 'submit', style: { flex: 1 } }, icon('check'), 'บันทึกนัด'),
      a.id ? h('button.btn.danger', { type: 'button', onclick: () => { if (confirm('ลบนัดนี้?')) { store.remove('appts', a.id); closeSheet(true); } } }, icon('trash')) : null));
  sheet({ title: a.id ? 'แก้ไขนัด' : 'เพิ่มนัดหมาย', body: f });
}

function showApptDone(a, c) {
  const title = (a.title || a.purpose || 'นัด') + (c ? ' — ' + c.nick : '');
  sheet({
    title: 'บันทึกนัดแล้ว',
    body: h('div.stack',
      h('div.callout.good', `${dateTH(a.date, true)} ${a.time || ''} · ${title}`),
      h('p.small.muted', 'เพิ่มลง Google Calendar เพื่อให้มือถือแจ้งเตือนก่อนถึงเวลานัด'),
      h('a.btn.primary.block', { href: gcalLink({ title, date: a.date, time: a.time, place: a.place, details: [a.purpose, a.note].filter(Boolean).join('\n') }), target: '_blank', rel: 'noopener' }, icon('cal'), 'เพิ่มลง Google Calendar'),
      h('button.btn.block', { onclick: () => closeSheet(true) }, 'เสร็จ')),
  });
}

/** ปิดนัด: บันทึกผล */
export function apptResultSheet(a) {
  const c = a.clientId && store.get('clients', a.clientId);
  const f = h('form.stack', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = readForm(f);
      store.put('appts', { ...a, status: d.status, result: d.result });
      if (d.status === 'done') {
        logActivity('meet', a.clientId, 'พบลูกค้า: ' + (d.result || a.purpose || ''));
        if (d.presented) store.put('activities', { type: 'present', clientId: a.clientId || null, date: todayISO(), count: 1 });
        if (c && d.nextStage) setStage(store.get('clients', c.id), d.nextStage);
      }
      closeSheet(true);
    },
  },
    field('ผล', selectEl('status', 'done', [['done', 'พบแล้ว'], ['cancel', 'ยกเลิก / เลื่อน']])),
    h('label.row.small', h('input', { type: 'checkbox', name: 'presented' }), 'ได้เสนอแผนในนัดนี้ (+4 คะแนน)'),
    c ? field('ย้ายขั้นลูกค้าเป็น', selectEl('nextStage', '', [['', '— ไม่เปลี่ยน —'], ['met', 'พบ / วิเคราะห์'], ['proposed', 'เสนอแผน'], ['closed', 'ปิดการขาย'], ['delivered', 'ส่งมอบแล้ว'], ['paused', 'พักไว้']])) : null,
    field('สรุปสั้น ๆ', h('textarea.input', { name: 'result', placeholder: 'คุยเรื่องอะไร ลูกค้าสนใจอะไร ต้องทำอะไรต่อ' })),
    h('button.btn.primary.block', { type: 'submit' }, icon('check'), 'บันทึกผล'));
  sheet({ title: 'บันทึกผลนัด', sub: (c?.nick || '') + ' · ' + dateTH(a.date), body: f });
}

export function activityButtons(clientId) {
  return h('div.row.wrap', { style: { gap: '6px' } }, ACTIVITIES.filter((a) => a.id !== 'appt').map((a) =>
    h('button.btn.sm', { onclick: () => logActivity(a.id, clientId) }, a.name, h('span.muted.xs', '+' + a.pts))));
}
