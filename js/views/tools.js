// ─── เครื่องมือ: เมนู · รับมือข้อโต้แย้ง · โปรไฟล์ · ซิงก์ & สำรองข้อมูล ───
import { h, icon, field, inputEl, readForm, toast, copyText, dateTH, initials } from '../ui.js';
import * as store from '../store.js';
import { OBJECTIONS } from '../../data/objections.js';
import { DEFAULT_PROFILE } from '../../data/profile.js';
import { profile } from '../app.js';

export function renderTools() {
  const p = profile();
  const tiles = [
    ['#/tools/tax', 'tax', 'คำนวณภาษี', 'ภาษีที่ลดได้จากเบี้ยประกัน'],
    ['#/tools/objections', 'chat', 'รับมือข้อโต้แย้ง', `${OBJECTIONS.length} สถานการณ์ที่เจอบ่อย`],
    ['#/tools/captions', 'pen', 'แคปชั่นโพสต์', 'Facebook · IG · TikTok'],
    ['#/plans/advisor', 'compass', 'ระบบแนะนำ', 'แพ็กเกจ + เหตุผล'],
    ['#/tools/profile', 'user', 'โปรไฟล์ตัวแทน', 'ชื่อ รหัส ใบอนุญาต'],
    ['#/tools/sync', 'sync', 'ซิงก์ & สำรองข้อมูล', 'Google Sheets · ไฟล์สำรอง'],
  ];
  return h('div', { 'data-title': 'เครื่องมือ' },
    h('div.topbar', h('div', h('h1', 'เครื่องมือ'))),
    h('div.card.profile-card', h('div.mark', initials(p.name || 'A')), h('div', h('b', p.name), h('div.small.muted', `${p.title} · ${p.company}`), h('div.small', `รหัสตัวแทน ${p.agentCode || '—'} · ใบอนุญาต ${p.licenseLife || 'ยังไม่ได้กรอก'}`))),
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
    h('div.card', f));
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
