// ─── UI helpers: element builder, icons, sheet (popup), toast, formatting ───

/** h('div.card#x', {onclick}, child, ...) — tiny hyperscript */
export function h(tag, attrs, ...children) {
  const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  if (attrs != null && attrs !== false && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ── Icons (เส้น 1.75 ไม่ใช้ emoji) ─────────────────────────
const P = {
  today: '<path d="M8 3v3M16 3v3M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M9 14l2 2 4-4"/>',
  plans: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M10 4h8.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10"/><path d="M13 8h4M13 12h4"/>',
  clients: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>',
  work: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  tools: '<path d="M14.5 6.5l3 3M4 20l7.5-7.5"/><path d="M15 3l6 6-3.5 3.5-6-6z"/><path d="M6 14l4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  cal: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  cake: '<path d="M4 20h16M5 20v-7h14v7"/><path d="M5 15c2 1.5 4 1.5 7 0s5-1.5 7 0"/><path d="M12 13V9M12 6.5v.01"/>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.5 1 2.5 2 3 0-3-1-5.5.5-8z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  tax: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 17l6-6M9.5 11.5h.01M14.5 16.5h.01"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  package: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
  line: '<path d="M4 18l5-6 4 3 7-9"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
};
export function icon(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.75'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
  s.innerHTML = P[name] || P.doc;
  return s;
}

// ── Formatting ─────────────────────────────────────────────
export const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('th-TH', { maximumFractionDigits: d, minimumFractionDigits: d });
export const baht = (n) => (n == null || isNaN(n)) ? '—' : fmt(Math.round(n)) + ' บาท';
export function short(n) {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return fmt(n / 1e6, a % 1e6 === 0 ? 0 : 1) + ' ล้าน';
  if (a >= 1e3 && a % 1e3 === 0 && a < 1e5) return fmt(n / 1e3) + ',000';
  return fmt(n);
}
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export function dateTH(d, withDay = false) {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d.length <= 10 ? d + 'T00:00:00' : d) : d;
  if (isNaN(x)) return '—';
  return (withDay ? TH_DAYS[x.getDay()] + ' ' : '') + x.getDate() + ' ' + TH_MONTHS[x.getMonth()] + ' ' + String((x.getFullYear() + 543)).slice(-2);
}
export const todayISO = () => isoDate(new Date());
export function isoDate(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
export function daysBetween(a, b) { const A = new Date(a + 'T00:00:00'), B = new Date(b + 'T00:00:00'); return Math.round((B - A) / 864e5); }
export function ageFrom(birthday, at = new Date()) {
  if (!birthday) return null;
  const b = new Date(birthday + 'T00:00:00'); if (isNaN(b)) return null;
  let a = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) a--;
  return a;
}
export function nextBirthday(birthday, from = new Date()) {
  if (!birthday) return null;
  const b = new Date(birthday + 'T00:00:00'); if (isNaN(b)) return null;
  const t = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let n = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (n < t) n = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
  return { date: isoDate(n), days: Math.round((n - t) / 864e5), turning: n.getFullYear() - b.getFullYear() };
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// ตัวอักษรย่อ: ข้ามสระหน้า (เ แ โ ใ ไ) และคำนำหน้า เพื่อให้ได้พยัญชนะตัวแรก
export const initials = (s = '') => ((s.trim().replace(/^(น้อง|พี่|คุณ|ป้า|ลุง|น้า|อา)\s*/, '').replace(/^[เแโใไ]/, '')[0]) || '?').toUpperCase();

// ── Toast ──────────────────────────────────────────────────
let tt;
export function toast(msg) {
  const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2200);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('คัดลอกแล้ว'); }
  catch { const t = h('textarea', { style: { position: 'fixed', opacity: 0 } }, text); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); toast('คัดลอกแล้ว'); }
}

// ── Sheet (การ์ดป๊อปอัป) ───────────────────────────────────
let openSheet = null;
export function sheet({ title, sub, body, actions, onClose, cls = '' }) {
  closeSheet(true);
  const scrim = h('div.scrim');
  const close = () => closeSheet();
  const panel = h('div.sheet' + (cls ? '.' + cls : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': typeof title === 'string' ? title : 'รายละเอียด' },
    h('div.sheet-grip'),
    h('div.sheet-head',
      h('div.t', sub ? h('div.crumb', sub) : null, typeof title === 'string' ? h('h2', title) : title),
      actions || null,
      h('button.icon-btn', { onclick: close, 'aria-label': 'ปิด' }, icon('close'))),
    h('div.sheet-body', body));
  scrim.addEventListener('click', close);
  document.body.append(scrim, panel);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('show'); panel.classList.add('show'); });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  openSheet = { scrim, panel, onClose, onKey };
  return panel;
}
export function closeSheet(silent = false) {
  if (!openSheet) return;
  const { scrim, panel, onClose, onKey } = openSheet; openSheet = null;
  document.removeEventListener('keydown', onKey);
  scrim.classList.remove('show'); panel.classList.remove('show');
  document.body.style.overflow = '';
  setTimeout(() => { scrim.remove(); panel.remove(); }, silent ? 0 : 240);
  if (!silent && onClose) onClose();
}
export const isSheetOpen = () => !!openSheet;

// ── Form helpers ───────────────────────────────────────────
export function field(label, input, hint) {
  return h('label.f', h('span', label), input, hint ? h('small', hint) : null);
}
export function inputEl(name, value, attrs = {}) {
  return h('input.input', { name, value: value ?? '', ...attrs });
}
export function selectEl(name, value, options, attrs = {}) {
  return h('select.input', { name, ...attrs }, options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value ?? '') }, l)));
}
export function readForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'number' || el.dataset.num != null) o[el.name] = el.value === '' ? null : Number(String(el.value).replace(/,/g, ''));
    else o[el.name] = el.value.trim();
  }
  return o;
}
export function seg(options, value, onChange) {
  const wrap = h('div.seg', { role: 'tablist' });
  for (const [v, l] of options) wrap.append(h('button', { class: v === value ? 'on' : '', role: 'tab', 'aria-selected': String(v === value), onclick: () => onChange(v) }, l));
  return wrap;
}
export function empty(text, ic = 'doc', action) {
  return h('div.empty', icon(ic), h('div', text), action ? h('div', { style: { marginTop: '12px' } }, action) : null);
}
