// ─── เมนู + ตั้งค่า (แบบแอปโซเชียล: โปรไฟล์ → ทางลัด → ตั้งค่าแยกหมวด) ───
import { h, icon, choices, toast, sheet, closeSheet } from '../ui.js';
import * as store from '../store.js';
import { profile, APP_VERSION, rerender } from '../app.js';
import { FEATURES, featureOn, setFeature } from '../features.js';
import { canInstall, install, isStandalone, iosGuide, getTheme, setTheme, getLeading, setLeading, getMotion, setMotion, getContrast, setContrast, getTextSize, setTextSize, getHaptic, setHaptic, forceUpdate } from '../pwa.js';
import { getShape, setShape, getDensity, setDensity, getDuo, setDuo } from '../theme.js';
import { palettePicker, fontPicker } from './tools.js';
import * as lock from '../lock.js';

export const brandName = () => (profile().brand || 'AOM CONNECT');
const ini = (p) => { const n = (p.nick || p.name || 'A').replace(/^คุณ/, '').trim(); const c = n.charAt(0); return 'เแโใไ'.includes(c) ? n.charAt(1) : c; };
export const meInitial = () => ini(profile());

const tgl = (on, fn, label) => h('label.tgl', h('input', { type: 'checkbox', checked: on, 'aria-label': label, onchange: (e) => fn(e.target.checked) }), h('i'));
const row = (href, ic, t, d, right) => h(typeof href === 'function' ? 'button.mn-row' : 'a.mn-row', typeof href === 'function' ? { onclick: href } : { href }, h('span.ic', icon(ic)), h('span.tx', h('b', t), d ? h('small', d) : null), right || icon('next'));
const sub = (title, desc, ...kids) => h('div', { 'data-title': title }, h('div.back-row', h('a.icon-btn', { href: '#/settings', 'aria-label': 'กลับไปตั้งค่า' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, title)), desc ? h('p.muted', { style: { margin: '0 0 14px' } }, desc) : null, ...kids);
const sec = (t, ...kids) => h('div.section', h('h2', t), h('div.card', ...kids));

export function renderMenu() {
  const p = profile();
  const G = [
    ['งานขาย', [['#/work/sales', 'line', 'ยอดขาย & กรมธรรม์'], ['#/work/calendar', 'cal', 'ปฏิทิน'], ['#/work/goals', 'target', 'เป้าหมาย'], ['#/work/report', 'doc', 'รายงานประจำเดือน'], ['#/work/call', 'flame', 'โทรรวด', 'call'], ['#/work/mandala', 'grid', 'แมนฮาร่าเป้าหมาย', 'mandala'], ['#/clients/lists', 'filter', 'รายชื่ออัจฉริยะ'], ['#/work/review', 'line', 'ทบทวนสัปดาห์', 'review']]],
    ['ลูกค้าและแผน', [['#/check', 'heart', 'ตรวจสุขภาพการเงิน'], ['#/plans/stages', 'clients', 'ชุดแผนตามช่วงวัย'], ['#/plans/ww', 'shield', 'มี vs ไม่มีประกัน'], ['#/tools/data', 'info', 'ข้อมูลจริง & ปฏิทินการเงิน'], ['#/plans/advisor', 'compass', 'ระบบแนะนำแผน'], ['#/plans/tools', 'layers', 'เครื่องมือแผน'], ['#/tools/calc', 'link', 'เครื่องคิด & ลิงก์ลูกค้า'], ['#/tools/tax', 'tax', 'คำนวณภาษี'], ['#/tools/simulate', 'heart', 'จำลองเหตุการณ์', 'simulate']]],
    ['พัฒนาตัวเอง', [['#/tools/train', 'bulb', 'ฝึกตัวเอง', 'train'], ['#/tools/objections', 'chat', 'รับมือข้อโต้แย้ง', 'objections'], ['#/brand', 'star', 'แบรนด์ของฉัน'], ['#/tools/glossary', 'book', 'คำศัพท์ภาษาง่าย']]],
  ];
  return h('div', { 'data-title': 'เมนู' },
    h('div.mn-head', h('h1', 'เมนู'), h('div.row', h('a.mn-round', { href: '#/settings', 'aria-label': 'ตั้งค่า' }, icon('gear')), h('a.mn-round', { href: '#/search', 'aria-label': 'ค้นหา' }, icon('search')))),
    h('a.mn-me', { href: '#/tools/profile' }, h('span.av', ini(p)), h('span.tx', h('span.bn', brandName()), h('b', p.name), h('small', [p.title, p.company].filter(Boolean).join(' · '))), icon('next')),
    ...G.flatMap(([t, items]) => { const on = items.filter((x) => !x[3] || featureOn(x[3])); return on.length ? [h('div.mn-sec', t), h('div.mn-grid', on.map(([href, ic, l]) => h('a.mn-tile', { href }, h('span.ic', icon(ic)), h('b', l))))] : []; }),
    h('div.mn-sec', 'ตั้งค่าและช่วยเหลือ'),
    h('div.mn-list',
      row('#/settings', 'gear', 'ตั้งค่า', 'โปรไฟล์ สีจอ ตัวอักษร ล็อกแอป ซิงก์ข้อมูล'),
      row('#/settings/look', 'palette', 'สีจอและหน้าตา', 'สีแบรนด์ โหมดมืด ฟอนต์'),
      row(() => import('../card.js').then((m) => m.shareCard()), 'share', 'แชร์นามบัตร', 'ส่งให้ลูกค้าใหม่'),
      row(() => import('../app.js').then((m) => m.showWhatsNew(APP_VERSION.split(' ')[0])), 'info', 'มีอะไรใหม่', 'เวอร์ชัน ' + APP_VERSION)));
}

const ROWS = [
  ['บัญชี', [['#/tools/profile', 'user', 'โปรไฟล์ & นามบัตร', 'ชื่อ เลขใบอนุญาต LINE เบอร์โทร ภาพนามบัตร', 'โปรไฟล์ ชื่อ ใบอนุญาต line เบอร์ นามบัตร'], ['#/brand', 'star', 'แบรนด์ของฉัน', 'จุดยืน ไบโอ ซีรีส์ ลายเซ็นท้ายภาพ', 'แบรนด์ ไบโอ ลายเซ็น aom connect']]],
  ['หน้าตา', [['#/settings/look', 'palette', 'สีจอและหน้าตา', 'สีแบรนด์ โหมดสว่าง/มืด ฟอนต์ มุมโค้ง', 'สี สีจอ ธีม มืด สว่าง dark ฟอนต์ ตัวหนังสือ โค้ง'], ['#/settings/access', 'note', 'ขนาดตัวอักษรและการอ่าน', 'ตัวใหญ่ ระยะบรรทัด คอนทราสต์ ลดการเคลื่อนไหว', 'ขนาด ตัวอักษร ใหญ่ ผู้สูงอายุ คอนทราสต์ เคลื่อนไหว สั่น']]],
  ['การใช้งาน', [['#/settings/notify', 'bell', 'การแจ้งเตือน', 'สรุปงานเช้า แถบสดด้านบนจอ', 'แจ้งเตือน สรุปเช้า แถบสด'], ['#/settings/features', 'grid', 'เปิด/ปิดฟีเจอร์', 'ซ่อนสิ่งที่ไม่ใช้ ให้แอปโล่งขึ้น', 'ฟีเจอร์ ซ่อน ปิด โทรรวด แมนฮาร่า ฝึก'], ['#/?edit=1', 'today', 'หน้าแรก', 'เลือกช่องที่อยากเห็นในหน้าวันนี้', 'หน้าแรก วันนี้ จัดช่อง']]],
  ['ความปลอดภัยและข้อมูล', [['#/settings/security', 'lock', 'ล็อกแอป', 'ใส่รหัส 4 หลัก หรือสแกนหน้า/นิ้ว ก่อนเปิด', 'ล็อก pin รหัส ปลอดภัย สแกน นิ้ว หน้า'], ['#/tools/sync', 'sync', 'ซิงก์และสำรองข้อมูล', 'Google Sheets · ไฟล์สำรอง', 'ซิงก์ สำรอง backup google sheets ย้ายเครื่อง'], ['#/tools/timemachine', 'clock', 'ย้อนเวลาข้อมูล', 'กู้รายการที่ลบ ดูประวัติการแก้ไข', 'ย้อน กู้คืน ลบ ประวัติ']]],
  ['แอป', [['#/settings/app', 'info', 'เกี่ยวกับแอป', 'ติดตั้ง อัปเดต เวอร์ชัน การนับอายุประกัน', 'ติดตั้ง อัปเดต เวอร์ชัน อายุประกัน เกี่ยวกับ']]],
];
export const SETTING_ROWS = ROWS.flatMap(([, a]) => a);
export function renderSettings() {
  const body = h('div'); let q = '';
  const draw = () => { const kids = ROWS.flatMap(([g, items]) => { const m = items.filter((x) => !q || (x[2] + x[3] + x[4]).toLowerCase().includes(q)); return m.length ? [h('div.set-grp', g), h('div.mn-list', m.map(([href, ic, t, d]) => row(href, ic, t, d)))] : []; });
    body.replaceChildren(...(kids.length ? kids : [h('p.muted', 'ไม่พบการตั้งค่าที่ตรงกับคำค้น')])); };
  draw();
  return h('div', { 'data-title': 'ตั้งค่า' },
    h('div.back-row', h('a.icon-btn', { href: '#/menu', 'aria-label': 'กลับไปเมนู' }, icon('back')), h('h1.serif', { style: { fontSize: '24px' } }, 'ตั้งค่า')),
    h('input.input.set-search', { type: 'search', placeholder: 'ค้นหาการตั้งค่า เช่น สี ตัวอักษร ล็อก', 'aria-label': 'ค้นหาการตั้งค่า', oninput: (e) => { q = e.target.value.trim().toLowerCase(); draw(); } }),
    body);
}

export function renderLook() {
  return sub('สีจอและหน้าตา', 'เปลี่ยนแล้วเห็นผลทันที',
    sec('สีแบรนด์', palettePicker()),
    sec('โหมดสว่าง / มืด', choices('th', getTheme(), [['auto', 'ตามมือถือ'], ['light', 'สว่าง'], ['dark', 'มืด']], { onChange: setTheme })),
    sec('คู่ฟอนต์', fontPicker()),
    sec('ความโค้ง ระยะห่าง ไอคอน',
      h('div.q', h('span.ql', 'มุมการ์ดและปุ่ม'), choices('shape', getShape(), [['crisp', 'เหลี่ยม'], ['soft', 'โค้งพอดี'], ['round', 'มน']], { onChange: setShape })),
      h('div.q', h('span.ql', 'ระยะห่าง'), choices('dens', getDensity(), [['comfy', 'สบายตา'], ['compact', 'แน่น เห็นข้อมูลมากขึ้น']], { onChange: setDensity })),
      h('div.q', h('span.ql', 'ไอคอน'), choices('duo', getDuo(), [['on', 'สองโทน'], ['off', 'เส้นอย่างเดียว']], { onChange: setDuo }))));
}
export function renderAccess() {
  return sub('ขนาดตัวอักษรและการอ่าน', null,
    sec('ขนาดตัวอักษร', choices('ts', getTextSize(), [['m', 'ปกติ'], ['l', 'ใหญ่'], ['xl', 'ใหญ่มาก']], { onChange: setTextSize }), h('p.small.muted', { style: { marginTop: '10px' } }, 'ใช้ "ใหญ่" ตอนเปิดให้ลูกค้าดู จะอ่านง่ายขึ้น')),
    sec('การอ่าน',
      h('div.q', h('span.ql', 'ระยะบรรทัด'), choices('ld', getLeading(), [['normal', 'ปกติ'], ['relaxed', 'กว้าง'], ['loose', 'กว้างมาก']], { onChange: setLeading })),
      h('div.q', h('span.ql', 'ความคมชัดของสี'), choices('hc', getContrast(), [['normal', 'ปกติ'], ['high', 'คอนทราสต์สูง']], { onChange: setContrast })),
      h('div.q', h('span.ql', 'ภาพเคลื่อนไหว'), choices('mo', getMotion(), [['auto', 'ตามมือถือ'], ['reduce', 'ลดให้น้อยที่สุด']], { onChange: setMotion }))),
    h('div.section', h('div.mn-list',
      row(() => {}, 'phone', 'สั่นเบา ๆ เมื่อบันทึก', 'เฉพาะ Android', tgl(getHaptic(), setHaptic, 'สั่นเมื่อบันทึก')),
      row('#/tools/glossary', 'book', 'คำศัพท์ภาษาง่าย', 'แตะคำที่มีเส้นประเพื่อดูความหมาย'),
      row(() => import('../app.js').then((m) => m.showShortcuts()), 'key', 'ปุ่มลัดคีย์บอร์ด', 'สำหรับใช้บนคอม'))));
}
export function renderNotify() {
  const s = store.getSettings();
  return sub('การแจ้งเตือน', 'แอปนี้ไม่มีเซิร์ฟเวอร์ จึงเตือนได้ตอนเปิดแอปอยู่เท่านั้น',
    h('div.mn-list',
      row(() => {}, 'today', 'สรุปงานเช้า', 'เปิดแอปครั้งแรกของวัน เห็นนัด วันเกิด ครบชำระ และคนที่ต้องติดตาม', tgl(s.morning !== false, (v) => store.saveSettings({ morning: v }), 'สรุปงานเช้า')),
      row(() => {}, 'bell', 'แถบสดด้านบนจอ', 'นับถอยหลังโทรรวด และเตือนก่อนถึงนัด 30 นาที', tgl(featureOn('island'), (v) => setFeature('island', v), 'แถบสดด้านบนจอ')),
      row(() => import('../morning.js').then((m) => m.morningBrief(true)), 'play', 'ดูสรุปวันนี้ตอนนี้', null)));
}
export function renderFeatures() {
  return sub('เปิด/ปิดฟีเจอร์', 'ปิดสิ่งที่ไม่ใช้ เมนูจะสั้นลง ข้อมูลไม่หาย เปิดกลับได้ทุกเมื่อ',
    h('div.mn-list', FEATURES.map(([id, t, d, ic]) => row(() => {}, ic, t, d, tgl(featureOn(id), (v) => setFeature(id, v), t)))));
}
export function renderSecurity() {
  const on = lock.lockEnabled(); const info = lock.lockInfo(); const bioRow = h('div');
  lock.bioSupported().then((ok) => { if (ok && on) bioRow.replaceChildren(row(() => {}, 'user', 'สแกนหน้า / นิ้ว', 'ใช้แทนการใส่รหัส (รหัสยังใช้ได้เสมอ)', tgl(!!info.bio, async (v) => { try { if (v) { await lock.enableBio(); toast('เปิดการสแกนแล้ว'); } else lock.disableBio(); } catch { toast('เครื่องนี้ตั้งค่าการสแกนไม่สำเร็จ'); } rerender(); }, 'สแกนหน้าหรือนิ้ว'))); });
  const newPin = () => { let first = null; const pad = lock.pinPad({ title: 'ตั้งรหัส 4 หลัก', sub: 'ใส่รหัสใหม่', onCancel: () => pad.done(), onDone: async (pin) => {
    if (!first) { first = pin; return 'ใส่อีกครั้งเพื่อยืนยัน'; }
    if (pin !== first) { first = null; return 'รหัสไม่ตรงกัน เริ่มใหม่'; }
    await lock.setPin(pin); pad.done(); toast('ล็อกแอปแล้ว'); rerender(); return true; } }); document.body.append(pad); };
  const off = () => { const pad = lock.pinPad({ title: 'ใส่รหัสเดิมเพื่อปิดการล็อก', onCancel: () => pad.done(), onDone: async (pin) => { if (await lock.checkPin(pin)) { lock.clearLock(); pad.done(); toast('ปิดการล็อกแล้ว'); rerender(); return true; } return false; } }); document.body.append(pad); };
  return sub('ล็อกแอป', 'กันคนอื่นหยิบมือถือไปเปิดดูข้อมูลลูกค้า',
    h('div.mn-list',
      row(() => {}, 'lock', 'ล็อกด้วยรหัส 4 หลัก', on ? 'เปิดอยู่' : 'ปิดอยู่', tgl(on, (v) => (v ? newPin() : off()), 'ล็อกด้วยรหัส')),
      on ? row(newPin, 'key', 'เปลี่ยนรหัส', null) : null, bioRow),
    on ? sec('ล็อกอีกครั้งเมื่อออกจากแอปนาน', choices('la', String(info.after ?? 2), [['0', 'ทันที'], ['2', '2 นาที'], ['10', '10 นาที'], ['60', '1 ชั่วโมง']], { onChange: (v) => lock.setLockAfter(v) })) : null,
    h('div.callout.small', { style: { marginTop: '14px' } }, h('b', 'ควรรู้: '), 'นี่คือการล็อกหน้าจอของแอป ไม่ใช่การเข้ารหัสข้อมูล ถ้าลืมรหัสต้องล้างข้อมูลแอปในเบราว์เซอร์ แล้วดึงข้อมูลกลับจาก Google Sheets หรือไฟล์สำรอง จึงควรตั้งค่าซิงก์ไว้ก่อน'));
}
export function renderApp() {
  const inst = isStandalone() ? row(() => {}, 'check', 'ติดตั้งเป็นแอปแล้ว', 'เปิดจากไอคอนบนหน้าจอได้เลย', h('span.tag', 'เรียบร้อย')) : row(() => (canInstall() ? install() : iosGuide()), 'download', 'ติดตั้งลงมือถือ', 'เปิดได้เหมือนแอปทั่วไป เต็มจอ');
  return sub('เกี่ยวกับแอป', null,
    h('div.mn-list', inst,
      row(() => forceUpdate(), 'sync', 'อัปเดตแอปตอนนี้', 'เวอร์ชัน ' + APP_VERSION + ' · ข้อมูลลูกค้าไม่หาย'),
      row(() => import('../app.js').then((m) => m.showWhatsNew(APP_VERSION.split(' ')[0])), 'info', 'มีอะไรใหม่', 'ดูรายการอัปเดตล่าสุด'),
      row(() => { try { localStorage.removeItem('advdesk.v1.onb'); } catch {} import('../morning.js').then((m) => m.onboarding()); }, 'play', 'ดูคำแนะนำการใช้อีกครั้ง', null)),
    sec('การนับอายุประกัน', choices('ar', store.getSettings().ageRule || 'nearest', [['nearest', 'เศษเกิน 6 เดือน นับเป็น 1 ปี'], ['last', 'นับตามวันเกิดล่าสุด']], { onChange: (v) => store.saveSettings({ ageRule: v }) }),
      h('p.small.muted', { style: { marginTop: '10px' } }, 'ใช้คำนวณวัน "อายุประกันขึ้น" · บริษัทประกันชีวิตไทยส่วนใหญ่ใช้แบบแรก ยืนยันกับระบบตัวแทนอีกครั้ง')),
    h('p.xs.muted', { style: { marginTop: '14px', textAlign: 'center' } }, brandName() + ' · ข้อมูลลูกค้าอยู่ในเครื่องนี้และ Google Sheets ของคุณเท่านั้น'));
}
