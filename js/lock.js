// ─── ล็อกแอปด้วย PIN (+ สแกนหน้า/นิ้ว ถ้าเครื่องรองรับ) ───
// เป็นการล็อกหน้าจอของแอป กันคนอื่นหยิบมือถือไปเปิดดูข้อมูลลูกค้า (ไม่ใช่การเข้ารหัสข้อมูล)
import { h, icon } from './ui.js';
const KEY = 'advdesk.v1.lock';
const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const put = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} };
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function digest(salt, pin) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin)); return b64(d); }

export const lockEnabled = () => !!get()?.hash;
export const lockInfo = () => get() || {};
export async function setPin(pin) { const salt = b64(crypto.getRandomValues(new Uint8Array(12))); put({ ...(get() || {}), salt, hash: await digest(salt, pin), after: get()?.after ?? 2 }); }
export function clearLock() { put(null); }
export function setLockAfter(min) { const c = get(); if (c) put({ ...c, after: +min }); }
export async function checkPin(pin) { const c = get(); return !!c && (await digest(c.salt, pin)) === c.hash; }
export const bioSupported = async () => { try { return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; } };
export async function enableBio() {
  const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'AOM CONNECT' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'me', displayName: 'ฉัน' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
  put({ ...(get() || {}), bio: b64(cred.rawId) }); return true;
}
export function disableBio() { const c = get(); if (c) { delete c.bio; put(c); } }
async function bioUnlock() {
  const c = get(); if (!c?.bio) return false;
  try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(c.bio) }], userVerification: 'required', timeout: 60000 } }); return true; } catch { return false; }
}

let el = null, fails = 0, until = 0;
/** หน้ากรอก PIN: mode 'unlock' | 'new' (คืนค่า PIN ที่ตั้ง) */
export function pinPad({ title, sub, onDone, onCancel, bio }) {
  let v = '';
  const dots = h('div.lock-dots', [0, 1, 2, 3].map(() => h('i'))); const msg = h('p', { role: 'status' }, sub || '');
  const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < v.length));
  const press = async (n) => {
    if (Date.now() < until) { msg.textContent = `รอ ${Math.ceil((until - Date.now()) / 1000)} วินาที`; return; }
    if (v.length >= 4) return; v += n; paint();
    if (v.length === 4) { const pin = v; const r = await onDone(pin); if (r === false) { dots.classList.add('bad'); setTimeout(() => { dots.classList.remove('bad'); v = ''; paint(); }, 420); } else if (typeof r === 'string') { msg.textContent = r; v = ''; paint(); } }
  };
  const keys = h('div.lock-pad', [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('button', { type: 'button', onclick: () => press(String(n)) }, n)),
    bio ? h('button.ghost', { type: 'button', 'aria-label': 'สแกนหน้าหรือนิ้ว', onclick: bio }, icon('user')) : onCancel ? h('button.ghost', { type: 'button', onclick: onCancel }, 'ยกเลิก') : h('span'),
    h('button', { type: 'button', onclick: () => press('0') }, 0),
    h('button.ghost', { type: 'button', 'aria-label': 'ลบ', onclick: () => { v = v.slice(0, -1); paint(); } }, icon('back')));
  const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') { v = v.slice(0, -1); paint(); } };
  const box = h('div.lock', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div.lock-in', h('div.lock-mark', icon('lock')), h('h2', title), msg, dots, keys));
  document.addEventListener('keydown', onKey); box.done = () => { document.removeEventListener('keydown', onKey); box.remove(); };
  box.setMsg = (t) => { msg.textContent = t; };
  return box;
}
export function showLock() {
  if (el || !lockEnabled() || location.hash.startsWith('#/p/')) return;
  const tryBio = async () => { if (await bioUnlock()) unlock(); };
  const unlock = () => { fails = 0; el?.done(); el = null; };
  el = pinPad({ title: 'ใส่รหัสเพื่อเปิดแอป', sub: 'ข้อมูลลูกค้าถูกล็อกไว้', bio: get()?.bio ? tryBio : null, onDone: async (pin) => {
    if (await checkPin(pin)) { unlock(); return true; }
    fails++; if (fails >= 5) { until = Date.now() + 30000; fails = 0; el.setMsg('ใส่ผิด 5 ครั้ง รอ 30 วินาที'); } else el.setMsg(`รหัสไม่ถูกต้อง (ผิด ${fails}/5)`);
    return false;
  } });
  document.body.append(el);
  if (get()?.bio) setTimeout(tryBio, 350);
}
export function initLock() {
  showLock(); let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && lockEnabled() && Date.now() - hiddenAt > (get()?.after ?? 2) * 60000) showLock();
  });
}
