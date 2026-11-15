// ─── เครื่องมือ: เมนู · รับมือข้อโต้แย้ง · โปรไฟล์ · ซิงก์ & สำรองข้อมูล ───
import { h, icon, field, inputEl, readForm, toast, copyText, dateTH, initials } from '../ui.js';
import * as store from '../store.js';
import { OBJECTIONS } from '../../data/objections.js';
import { DEFAULT_PROFILE } from '../../data/profile.js';
import { profile } from '../app.js';
import { choices } from '../ui.js';
import { canInstall, install, isStandalone, isIOS, iosGuide, getTheme, setTheme, getPalette, setPalette, getLeading, setLeading, getMotion, setMotion, getContrast, setContrast, getTextSize, setTextSize, getHaptic, setHaptic, forceUpdate } from '../pwa.js';
import { APP_VERSION } from '../app.js';

export function renderTools() {
  const p = profile();
  const tiles = [
    ['#/tools/tax', 'tax', 'คำนวณภาษี', 'ภาษีที่ลดได้จากเบี้ยประกัน'],
    ['#/tools/objections', 'chat', 'รับมือข้อโต้แย้ง', `${OBJECTIONS.length} สถานการณ์ที่เจอบ่อย`],
    ['#/studio', 'pen', 'สตูดิโอคอนเทนต์', 'ไอเดีย → ภาพหลายหน้า สตอรี่ แคปชั่น บทคลิป'],
    ['#/brand', 'star', 'แบรนด์ของฉัน', 'จุดยืน · ไบโอ · ภารกิจ 30 วัน'],
    ['#/tools/content', 'cal', 'ปฏิทินคอนเทนต์', 'แผนโพสต์ทั้งเดือน + แคปชั่น'],
    ['#/tools/tipcard', 'pen', 'ภาพทิปการเงิน', 'ภาพพร้อมโพสต์ ใส่ชื่อคุณ'],
    ['#/tools/train', 'bulb', 'ฝึกตัวเอง', 'ฝึกจำแผน · ซ้อมข้อโต้แย้ง'],
    ['#/plans/tools', 'layers', 'เครื่องมือแผน', 'แนบสัญญา · Copayment · รอคอย · ตารางเบี้ย'],
    ['#/tools/captions', 'pen', 'แคปชั่นโพสต์', 'Facebook · IG · TikTok'],
    ['#/plans/advisor', 'compass', 'ระบบแนะนำ', 'แพ็กเกจ + เหตุผล'],
    ['#/tools/profile', 'user', 'โปรไฟล์ตัวแทน', 'ชื่อ รหัส ใบอนุญาต'],
    ['#/tools/display', 'today', 'การแสดงผล & ติดตั้งแอป', 'ตัวอักษร โหมดมืด ไอคอนแอป'],
    ['#/work/sales', 'line', 'ยอดขาย & กรมธรรม์', 'สรุปเบี้ย ค่าคอม ครบชำระ'],
    ['#/search', 'search', 'ค้นหา', 'ลูกค้า แผน เคส เมนู'],
    ['#/tools/sync', 'sync', 'ซิงก์ & สำรองข้อมูล', 'Google Sheets · ไฟล์สำรอง'],
  ];
  return h('div', { 'data-title': 'เครื่องมือ' },
    h('div.topbar', h('div', h('h1', 'เครื่องมือ'))),
    h('div.card.profile-card', h('div.mark', initials(p.name || 'A')), h('div', h('b', p.name), h('div.small.muted', `${p.title} · ${p.company}`), h('div.small', `รหัสตัวแทน ${p.agentCode || '—'} · ใบอนุญาต ${p.licenseLife || 'ยังไม่ได้กรอก'}`), h('div.xs.muted', 'แอปเวอร์ชัน ' + APP_VERSION))),
    h('div.grid.g3', { style: { marginTop: '12px' } }, tiles.map(([href, ic, t, d]) => h('a.card', { href, style: { textDecoration: 'none', color: 'inherit', display: 'flex', gap: '12px', alignItems: 'center' } },
      h('div.avatar', icon(ic)), h('div', h('b', t), h('div.small.muted', d))))));
}

export function renderObjections() {
  const tags = ['ทั้งหมด', ...new Set(OBJECTIONS.map((o) => o.tag))];
  let cur = 'ทั้งหมด';
  const grid = h('div.grid.g2');
  const draw = () => grid.replaceChildren(...OBJECTIONS.filter((o) => cur === 'ทั้งหมด' || o.tag === cur).map((o) => {
    const card = h('div.flip', { onclick: () => card.classList.toggle('on'), role: 'button', tabindex: 0, 'aria-label': 'พลิกการ์ด: ' + o.say, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('on'); } } },
      h('div.flip-in',
        h('div.flip-f', h('span.tag', o.tag), h('q', o.say), h('span.xs.muted', 'แตะเพื่อดูวิธีตอบ')),
        h('div.flip-b', h('b.small', 'วิธีตอบ'), h('ol', o.steps.map((s) => h('li', s))), h('div.callout.small', { style: { marginTop: '8px', background: 'var(--card)' } }, h('b', 'เคล็ดลับ: '), o.tip))));
    return card;
  }));
  draw();
  return h('div', { 'data-title': 'รับมือข้อโต้แย้ง' },
    h('div.topbar', h('div', h('h1', 'รับมือข้อโต้แย้ง'), h('div.sub', 'การ์ดฝึกซ้อม: ด้านหน้าคือคำพูดลูกค้า พลิกดูวิธีตอบ (รับฟัง → ถาม → มุมมองใหม่ → ชวนก้าวต่อไป)'))),
    h('div.chips', { style: { marginBottom: '12px' } }, tags.map((t) => h('button.chip', { class: t === cur ? 'on' : '', onclick: (e) => { cur = t; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, t))),
    grid);
}

export function renderProfile() {
  const p = profile();
  const f = h('form.form-grid', {
    onsubmit: (e) => { e.preventDefault(); store.saveSettings({ profile: readForm(f) }); toast('บันทึกโปรไฟล์แล้ว'); location.hash = '#/tools'; },
  },
    field('ชื่อ-นามสกุล', inputEl('name', p.name)),
    field('ชื่อเล่น', inputEl('nick', p.nick, { placeholder: 'เช่น คุณออม' }), 'แสดงในสตอรี่ ภาพทิป และแคปชั่น'),
    field('ตำแหน่ง', inputEl('title', p.title)),
    field('บริษัท', inputEl('company', p.company)),
    field('รหัสตัวแทน', inputEl('agentCode', p.agentCode, { inputmode: 'numeric' })),
    field('เลขที่ใบอนุญาตตัวแทนประกันชีวิต', inputEl('licenseLife', p.licenseLife, { placeholder: 'กรอกภายหลังได้' }), 'จะแสดงท้ายแคปชั่นโพสต์อัตโนมัติ (ตามกฎ คปภ.)'),
    field('ใบอนุญาตหมดอายุ', inputEl('licenseExpiry', p.licenseExpiry, { type: 'date' })),
    field('โทรศัพท์', inputEl('phone', p.phone, { type: 'tel' })),
    field('LINE ID', inputEl('line', p.line)),
    field('อีเมล', inputEl('email', p.email, { type: 'email' })),
    field('พื้นที่ให้บริการ', inputEl('area', p.area)),
    h('div.full', field('สโลแกน', inputEl('tagline', p.tagline))),
    h('div.full.row', { style: { gap: '8px' } }, h('button.btn.primary', { type: 'submit', style: { flex: 1 } }, icon('check'), 'บันทึก'),
      h('button.btn', { type: 'button', onclick: () => { store.saveSettings({ profile: { ...DEFAULT_PROFILE } }); location.reload(); } }, 'คืนค่าเริ่มต้น')));
  const exp = p.licenseExpiry ? Math.round((new Date(p.licenseExpiry) - new Date()) / 864e5) : null;
  return h('div', { 'data-title': 'โปรไฟล์ตัวแทน' },
    h('div.topbar', h('div', h('a.crumb', { href: '#/tools' }, icon('back'), 'เครื่องมือ'), h('h1', 'โปรไฟล์ตัวแทน'))),
    exp != null && exp <= 90 ? h('div.callout.red', { style: { marginBottom: '12px' } }, h('b', `ใบอนุญาตหมดอายุในอีก ${exp} วัน`), ' — เตรียมต่ออายุและชั่วโมงอบรม') : null,
    h('div.card', f),
    h('div.section', h('h2', 'นามบัตรดิจิทัล'), h('div.card', (() => { const box = h('div'); const draw = () => import('../card.js').then((m) => box.replaceChildren(m.cardManager(draw))); draw(); return box; })())));
}

export function renderSync() {
  const cfg = store.sync.config;
  const status = h('div.callout', { style: { marginTop: '10px' } });
  const paint = () => {
    const st = store.sync.state;
    status.className = 'callout ' + (st === 'ok' ? 'good' : st === 'err' ? 'red' : '');
    status.replaceChildren(
      h('b', { off: 'ยังไม่ได้ตั้งค่าซิงก์', idle: 'พร้อม', busy: 'กำลังซิงก์…', ok: 'ซิงก์สำเร็จ', err: 'ซิงก์ไม่สำเร็จ' }[st] || st),
      store.sync.lastError ? ' — ' + store.sync.lastError : '',
      store.sync.lastAt ? h('div.xs.muted', 'ล่าสุด ' + new Date(store.sync.lastAt).toLocaleString('th-TH')) : null,
      h('div.xs.muted', `รอส่ง ${store.pendingCount()} รายการ`));
  };
  paint();
  const off = store.onSync(paint);
  window.addEventListener('hashchange', () => off(), { once: true });
  const f = h('form.stack', {
    onsubmit: async (e) => {
      e.preventDefault();
      const v = readForm(f);
      store.sync.config = { url: v.url, key: v.key };
      store.resetPull();
      try { const r = await store.syncNow(); toast(r.skipped ? 'บันทึกการตั้งค่าแล้ว' : `ซิงก์แล้ว · ส่ง ${r.pushed} · รับ ${r.pulled}`); } catch (err) { toast('ซิงก์ไม่สำเร็จ: ' + err.message); }
    },
  },
    field('ลิงก์ Web App (Apps Script)', inputEl('url', cfg.url, { placeholder: 'https://script.google.com/macros/s/…/exec', inputmode: 'url' })),
    field('รหัสลับ (SECRET)', inputEl('key', cfg.key, { type: 'password', autocomplete: 'off' }), 'ต้องตรงกับค่า SECRET ในสคริปต์ — ห้ามแชร์ลิงก์และรหัสนี้ให้ใคร'),
    h('div.row.wrap', { style: { gap: '8px' } },
      h('button.btn.primary', { type: 'submit' }, icon('sync'), 'บันทึก & ซิงก์ตอนนี้'),
      cfg.url ? h('button.btn', { type: 'button', onclick: () => { store.sync.config = {}; toast('ปิดซิงก์แล้ว (ข้อมูลในเครื่องยังอยู่)'); location.reload(); } }, 'ปิดซิงก์') : null));

  const fileIn = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' }, onchange: async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const n = store.importAll(JSON.parse(await file.text())); toast(`นำเข้าแล้ว ${n} รายการ`); } catch (err) { toast('นำเข้าไม่สำเร็จ: ' + err.message); }
  } });
  const steps = [
    'เปิด Google Sheets สร้างชีตใหม่ ตั้งชื่อเช่น "Advisor Desk Data"',
    'เมนู ส่วนขยาย › Apps Script → ลบโค้ดเดิม แล้ววางโค้ดจากปุ่ม "คัดลอกโค้ดสคริปต์" ด้านล่าง',
    'แก้บรรทัด SECRET เป็นรหัสลับของคุณเอง (ยาว ๆ เดายาก) แล้วกดบันทึก',
    'กด ทำให้ใช้งานได้ › การทำให้ใช้งานได้รายการใหม่ › ประเภท: เว็บแอป · เรียกใช้ในฐานะ: ฉัน · ผู้มีสิทธิ์เข้าถึง: ทุกคน → กดทำให้ใช้งานได้ และอนุญาตสิทธิ์',
    'คัดลอก "URL ของเว็บแอป" (ลงท้าย /exec) มาวางด้านบน พร้อมรหัสลับ แล้วกด "บันทึก & ซิงก์"',
    'ทำข้อ 5 ซ้ำในมือถือ/คอมอีกเครื่อง (ใช้ลิงก์และรหัสเดียวกัน) — ข้อมูลจะตรงกันทุกเครื่อง',
  ];
  return h('div', { 'data-title': 'ซิงก์ & สำรองข้อมูล' },
    h('div.topbar', h('div', h('a.crumb', { href: '#/tools' }, icon('back'), 'เครื่องมือ'), h('h1', 'ซิงก์ & สำรองข้อมูล'), h('div.sub', 'ข้อมูลลูกค้าอยู่ในเครื่องนี้ + Google Sheets ของคุณเท่านั้น ไม่ขึ้น GitHub'))),
    h('div.grid.g2', { style: { alignItems: 'start' } },
      h('div.card', h('div.card-h', h('h3', 'ซิงก์มือถือ ↔ คอม (Google Sheets)')), f, status),
      h('div.card', h('div.card-h', h('h3', 'ตั้งค่าครั้งแรก (~10 นาที)')),
        h('ol.small', { style: { paddingLeft: '18px', margin: 0 } }, steps.map((s) => h('li', { style: { margin: '6px 0' } }, s))),
        h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } },
          h('button.btn', { onclick: async () => { const t = await (await fetch('apps-script/Code.gs')).text(); copyText(t); } }, icon('copy'), 'คัดลอกโค้ดสคริปต์'),
          h('a.btn.ghost', { href: 'apps-script/Code.gs', target: '_blank' }, icon('doc'), 'ดูโค้ด')))),
    h('div.card', { style: { marginTop: '12px' } },
      h('div.card-h', h('h3', 'สำรองข้อมูลเป็นไฟล์')),
      h('p.small.muted', 'ดาวน์โหลดเก็บไว้เป็นระยะ หรือใช้ย้ายเครื่อง — ไฟล์มีข้อมูลลูกค้า เก็บไว้ในที่ปลอดภัย'),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } },
        h('button.btn', { onclick: () => {
          const blob = new Blob([JSON.stringify(store.exportAll(), null, 1)], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `advisor-desk-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove();
        } }, icon('download'), 'ดาวน์โหลดไฟล์สำรอง'),
        h('button.btn', { onclick: () => fileIn.click() }, icon('upload'), 'นำเข้าจากไฟล์'), fileIn),
      h('p.xs.muted', { style: { marginTop: '10px' } }, `ในเครื่องนี้: ลูกค้า ${store.all('clients').length} · นัด ${store.all('appts').length} · กิจกรรม ${store.all('activities').length}`)));
}

export function renderDisplay() {
  const installRow = isStandalone()
    ? h('div.set-row', h('div', h('b', 'ติดตั้งเป็นแอปแล้ว'), h('small', 'เปิดจากไอคอนบนหน้าจอได้เลย')), h('span.tag.good', 'เรียบร้อย'))
    : h('div.set-row', h('div', h('b', 'ติดตั้งเป็นแอปบนมือถือ'), h('small', isIOS() ? 'iPhone: ทำผ่าน Safari ตามขั้นตอน' : 'มีไอคอนบนหน้าจอ เปิดเต็มจอ ใช้ออฟไลน์ได้')),
      h('button.btn.primary.sm', { onclick: () => (canInstall() ? install() : iosGuide()) }, 'ติดตั้ง'));
  return h('div', { 'data-title': 'การแสดงผล' },
    h('div.back-row', h('a.icon-btn', { href: '#/tools', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, 'การแสดงผล & ติดตั้งแอป')),
    h('div.card', installRow,
      h('div.set-row', h('div', h('b', 'ตัวเลขบนไอคอน'), h('small', 'แสดงจำนวนงานสำคัญวันนี้บนไอคอนแอป (Android / iPhone iOS 16.4+ ที่ติดตั้งแล้ว)')), h('span.tag', 'อัตโนมัติ')),
      h('div.set-row', h('div', h('b', 'กดค้างที่ไอคอน'), h('small', 'เมนูลัด: เพิ่มลูกค้า · โทรนัด · คลังแผน · ค้นหา (Android)')), h('span.tag', 'พร้อมใช้'))),
    h('div.section', h('h2', 'เวอร์ชันแอป'), h('div.card', h('div.set-row', h('div', h('b', 'เวอร์ชัน ' + APP_VERSION), h('small', 'แอปอัปเดตเองเมื่อเปิด · ถ้าหน้าตาไม่เปลี่ยน กดปุ่มนี้ (ข้อมูลลูกค้าไม่หาย)')),
      h('button.btn.primary.sm', { onclick: () => forceUpdate() }, icon('sync'), 'อัปเดตแอปตอนนี้')),
      h('div.set-row', h('div', h('b', 'มีอะไรใหม่'), h('small', 'ดูรายการอัปเดตล่าสุด')), h('button.btn.sm', { onclick: () => import('../app.js').then((m) => m.showWhatsNew(APP_VERSION.split(' ')[0])) }, 'ดู')))),
    h('div.section', h('h2', 'ขนาดตัวอักษร'), h('div.card', choices('ts', getTextSize(), [['m', 'ปกติ'], ['l', 'ใหญ่'], ['xl', 'ใหญ่มาก']], { onChange: setTextSize }),
      h('p.small.muted', { style: { marginTop: '10px' } }, 'ใช้ "ใหญ่" ตอนเปิดให้ลูกค้าดู จะอ่านง่ายขึ้น'))),
    h('div.section', h('h2', 'การเข้าถึง'), h('div.card',
      h('div.q', h('span.ql', 'ระยะบรรทัด'), choices('ld', getLeading(), [['normal', 'ปกติ'], ['relaxed', 'กว้าง'], ['loose', 'กว้างมาก']], { onChange: setLeading }), h('span.qh', 'อักษรไทยมีสระบน-ล่าง ระยะบรรทัดกว้างช่วยให้อ่านง่ายขึ้น')),
      h('div.q', h('span.ql', 'ความคมชัดของสี'), choices('hc', getContrast(), [['normal', 'ปกติ'], ['high', 'คอนทราสต์สูง']], { onChange: setContrast }), h('span.qh', 'ขาว–ดำชัด เส้นขอบหนา อ่านกลางแดดได้ (ใช้คู่กับโหมดมืดได้)')),
      h('div.q', h('span.ql', 'ภาพเคลื่อนไหว'), choices('mo', getMotion(), [['auto', 'ตามมือถือ'], ['reduce', 'ลดให้น้อยที่สุด']], { onChange: setMotion })),
      h('a.btn.sm', { href: '#/tools/glossary' }, icon('book'), 'คำศัพท์ภาษาง่าย'), ' ',
      h('button.btn.sm', { onclick: () => import('../app.js').then((m) => m.showShortcuts()) }, icon('key'), 'ปุ่มลัดคีย์บอร์ด'))),
    h('div.section', h('h2', 'สีธีม'), h('div.card', palettePicker())),
    h('div.section', h('h2', 'โหมดสว่าง / มืด'), h('div.card', choices('th', getTheme(), [['auto', 'ตามมือถือ'], ['light', 'สว่าง'], ['dark', 'มืด']], { onChange: setTheme }))),
    h('div.section', h('h2', 'การนับอายุประกัน'), h('div.card', choices('ar', store.getSettings().ageRule || 'nearest', [['nearest', 'เศษเกิน 6 เดือน นับเป็น 1 ปี'], ['last', 'นับตามวันเกิดล่าสุด']], { onChange: (v) => store.saveSettings({ ageRule: v }) }),
      h('p.small.muted', { style: { marginTop: '10px' } }, 'ใช้คำนวณวัน "อายุประกันขึ้น" ที่แจ้งเตือนในหน้าวันนี้ ปฏิทิน และหน้าลูกค้า · บริษัทประกันชีวิตไทยส่วนใหญ่ใช้แบบแรก ยืนยันกับระบบตัวแทนอีกครั้ง'))),
    h('div.section', h('h2', 'การสั่น'), h('div.card', h('div.set-row', h('div', h('b', 'สั่นเบา ๆ เมื่อบันทึก'), h('small', 'เฉพาะ Android')),
      h('input', { type: 'checkbox', checked: getHaptic(), onchange: (e) => setHaptic(e.target.checked), style: { width: '22px', height: '22px' } })))));
}

const PALETTES = [['ink', 'เขียวหมึก', '#1f4e46', '#f5f2ec'], ['red', 'แดง AIA', '#b3121f', '#f5f2ec'], ['navy', 'กรมท่า-ทอง', '#1e3354', '#b08a3e'], ['plum', 'ม่วงพลัม', '#5b2a59', '#f5f2ec']];
function palettePicker() {
  const wrap = h('div.swatches');
  const draw = () => wrap.replaceChildren(...PALETTES.map(([id, name, a, b]) => h('button.swatch', { class: getPalette() === id ? 'on' : '', 'aria-pressed': getPalette() === id, onclick: () => { setPalette(id); draw(); } },
    h('span.sw', { style: { background: `linear-gradient(135deg, ${a} 0 60%, ${b} 60%)` } }), h('b', name))));
  draw();
  return wrap;
}
