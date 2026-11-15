// ─── ย้อนเวลาข้อมูล: ประวัติการแก้ไขรายรายการ · ถังขยะ · สำเนารายวัน ───
import { h, icon, sheet, closeSheet, toast, fmt, empty } from '../ui.js';
import * as store from '../store.js';

const COLL = { clients: ['ลูกค้า', 'clients'], policies: ['กรมธรรม์/ยอดขาย', 'doc'], appts: ['นัด', 'cal'], content: ['คอนเทนต์', 'pen'], goals: ['เป้าหมาย', 'target'], checks: ['เช็กสุขภาพการเงิน', 'heart'] };
const FIELD = { name: 'ชื่อ', nick: 'ชื่อเล่น', phone: 'เบอร์', line: 'LINE', stage: 'ขั้นการขาย', nextDate: 'วันติดตาม', nextText: 'สิ่งที่ต้องทำต่อ', birthday: 'วันเกิด', note: 'โน้ต', notes: 'โน้ต', incomeMonthly: 'รายได้', status: 'สถานะ', premium: 'เบี้ย', date: 'วันที่', time: 'เวลา', title: 'หัวข้อ', place: 'สถานที่', deck: 'สไลด์', tags: 'แท็ก', planId: 'แผน', occupation: 'อาชีพ', family: 'ครอบครัว' };
const when = (iso) => { const d = new Date(iso); return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); };
const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'เมื่อสักครู่' : m < 60 ? `${m} นาทีที่แล้ว` : m < 1440 ? `${Math.round(m / 60)} ชม.ที่แล้ว` : `${Math.round(m / 1440)} วันที่แล้ว`; };
export const label = (coll, r) => (r && (r.nick ? (r.name ? `${r.nick} (${r.name})` : r.nick) : r.name || r.title || r.planName || r.planId)) || COLL[coll]?.[0] || 'รายการ';
function diff(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]); const out = [];
  for (const k of keys) { if (['updatedAt', 'createdAt', 'id', 'deleted'].includes(k)) continue; if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(k); }
  return out;
}
const short = (v) => v == null || v === '' ? '—' : typeof v === 'object' ? (Array.isArray(v) ? `${v.length} รายการ` : '…') : String(v).slice(0, 40);

/** ประวัติของรายการเดียว (ใช้จากหน้าลูกค้า/สตูดิโอ ฯลฯ) */
export function historySheet(coll, id) {
  const cur = store.get(coll, id); const vers = store.history(coll, id);
  sheet({ title: 'ประวัติการแก้ไข', sub: label(coll, cur || vers[0]?.rec) + ` · เก็บย้อนหลัง ${vers.length} เวอร์ชัน`, body: vers.length ? h('div.tm-list', vers.map((v) => {
    const ch = diff(v.rec, cur || {});
    return h('div.tm-v', h('div.tm-vh', h('b', when(v.at)), h('small', ago(v.at))),
      ch.length ? h('ul.tm-ch', ch.slice(0, 5).map((k) => h('li', h('span', FIELD[k] || k), h('s', short(v.rec[k])), ' → ', h('em', short(cur?.[k]))))) : h('p.small.muted', 'เหมือนปัจจุบัน'),
      ch.length ? h('button.btn.sm', { onclick: () => { store.restoreVersion(coll, id, v.at); closeSheet(true); toast('ย้อนกลับเป็นเวอร์ชัน ' + when(v.at) + ' แล้ว'); } }, icon('undo'), 'ย้อนกลับเป็นเวอร์ชันนี้') : null);
  })) : empty('ยังไม่มีประวัติ', 'clock', h('p.small.muted', 'เมื่อแก้ไขข้อมูล แอปจะเก็บเวอร์ชันก่อนหน้าไว้ให้อัตโนมัติ')) });
}

export function renderTimeMachine() {
  store.snapshotDaily();
  const snaps = store.snapshots(); const bin = store.trash(); const edits = store.recentEdits(20).filter((x) => !x.cur?.deleted);
  const restoreSnap = (s) => sheet({ title: 'ย้อนข้อมูลทั้งหมด?', sub: s.d === 'ก่อนย้อน' ? 'กลับไปเป็นข้อมูลก่อนย้อนครั้งล่าสุด' : 'กลับไปเป็นข้อมูลวันที่ ' + s.d, body: h('div.stack',
    h('p', 'ข้อมูลลูกค้า นัด ยอดขาย และคอนเทนต์ จะกลับไปเป็นแบบในสำเนานี้ (การตั้งค่าไม่เปลี่ยน)'),
    h('p.small.muted', 'แอปจะเก็บสำเนา "ก่อนย้อน" ไว้ให้ก่อน ถ้าเปลี่ยนใจกดย้อนกลับมาได้'),
    h('button.btn.primary.block', { onclick: () => { try { const n = store.restoreSnapshot(s.d); closeSheet(true); toast(`ย้อนข้อมูลแล้ว (${n} รายการเปลี่ยน)`); } catch (e) { toast(e.message); } } }, icon('undo'), 'ย้อนเลย'),
    h('button.btn.block', { onclick: () => closeSheet(true) }, 'ยกเลิก')) });
  return h('div', { 'data-title': 'ย้อนเวลาข้อมูล' },
    h('div.back-row', h('a.icon-btn', { href: '#/tools/sync', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, 'ย้อนเวลาข้อมูล')),
    h('p.muted', { style: { margin: '0 0 12px' } }, 'แก้ผิด ลบพลาด ก็กู้คืนได้ · เก็บในเครื่องนี้ ไม่ต้องตั้งค่าอะไร'),
    h('div.section', h('h2', 'ลบไปแล้ว (กู้คืนได้)'), h('div.card', { style: { padding: '4px 0' } }, bin.length ? h('div.plist', { style: { boxShadow: 'none' } }, bin.slice(0, 20).map((x) => h('div.prow', { style: { cursor: 'default' } },
      h('span.pi', { style: { '--cc': 'var(--bad)' } }, icon(COLL[x.coll]?.[1] || 'doc')), h('span.pt', h('b', label(x.coll, x.rec)), h('span', `${COLL[x.coll]?.[0] || x.coll} · ลบเมื่อ ${ago(x.cur.updatedAt || x.at)}`)),
      h('span.pr', h('button.btn.sm', { onclick: () => { store.restoreVersion(x.coll, x.id, x.at); toast('กู้คืน ' + label(x.coll, x.rec) + ' แล้ว'); } }, icon('undo'), 'กู้คืน'))))) : h('p.small.muted', { style: { padding: '12px 16px' } }, 'ไม่มีรายการที่ถูกลบ'))),
    h('div.section', h('h2', 'แก้ไขล่าสุด'), h('div.card', { style: { padding: '4px 0' } }, edits.length ? h('div.plist', { style: { boxShadow: 'none' } }, edits.map((x) => h('button.prow', { onclick: () => historySheet(x.coll, x.id) },
      h('span.pi', icon(COLL[x.coll]?.[1] || 'doc')), h('span.pt', h('b', label(x.coll, x.cur)), h('span', `${COLL[x.coll]?.[0] || x.coll} · ${ago(x.at)} · ${x.n} เวอร์ชัน`)), h('span.pr', icon('clock'))))) : h('p.small.muted', { style: { padding: '12px 16px' } }, 'ยังไม่มีการแก้ไข'))),
    h('div.section', h('h2', 'สำเนาทั้งหมดรายวัน (7 วันล่าสุด)'), h('div.card',
      snaps.length ? h('div.tm-snaps', snaps.map((s) => h('div.tm-snap', h('span.tm-dot', { class: s.d === 'ก่อนย้อน' ? 'undo' : '' }), h('div', h('b', s.d === 'ก่อนย้อน' ? 'ก่อนย้อนครั้งล่าสุด' : new Date(s.d + 'T00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })),
        h('small', `ลูกค้า ${fmt(s.counts?.clients || 0)} · นัด ${fmt(s.counts?.appts || 0)} · กรมธรรม์ ${fmt(s.counts?.policies || 0)} · ${(s.size / 1024).toFixed(0)} KB`)),
        h('button.btn.sm', { onclick: () => restoreSnap(s) }, 'ย้อนไปวันนี้')))) : h('p.small.muted', 'ข้อมูลใหญ่เกินกว่าจะเก็บสำเนาในเครื่อง ใช้ "สำรองเป็นไฟล์" ในหน้าซิงก์แทน'),
      h('p.source', 'สร้างสำเนาอัตโนมัติวันละครั้งเมื่อเปิดแอป · ถ้าซิงก์ Google Sheets อยู่ การย้อนจะส่งข้อมูลที่ย้อนขึ้นชีตด้วย'))));
}
