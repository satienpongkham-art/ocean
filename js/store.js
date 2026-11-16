// ─────────────────────────────────────────────────────────────
// Store: เก็บข้อมูลในเครื่อง (localStorage) + ซิงก์กับ Google Sheets ของผู้ใช้
//
// ทุกคอลเลกชันเก็บเป็น { [id]: record }  record = { id, updatedAt, deleted?, ...ข้อมูล }
// การรวมข้อมูล: updatedAt ใหม่กว่าชนะ · ลบแบบ tombstone (deleted: true) เพื่อให้ลบข้ามเครื่องได้
// ไม่มีข้อมูลลูกค้าใน repo — อยู่ในเครื่องและใน Google Sheet ของผู้ใช้เท่านั้น
// ─────────────────────────────────────────────────────────────
const NS = 'advdesk.v1.';
export const COLLECTIONS = ['clients', 'appts', 'logs', 'activities', 'goals', 'settings', 'policies', 'checks', 'premiums', 'content', 'videos'];

const mem = {};
const listeners = new Set();
const safe = {
  get(k) { try { return localStorage.getItem(NS + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(NS + k, v); return true; } catch { return false; } },
};

function load(coll) {
  if (!mem[coll]) { try { mem[coll] = JSON.parse(safe.get(coll) || '{}'); } catch { mem[coll] = {}; } }
  return mem[coll];
}
function persist(coll) { safe.set(coll, JSON.stringify(mem[coll] || {})); }
function outbox() { try { return JSON.parse(safe.get('outbox') || '[]'); } catch { return []; } }
function setOutbox(a) { safe.set('outbox', JSON.stringify(a)); }
function queue(coll, id) {
  const ob = outbox(); const key = coll + '/' + id;
  if (!ob.includes(key)) { ob.push(key); setOutbox(ob); }
  scheduleSync();
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(coll) { for (const fn of listeners) try { fn(coll); } catch (e) { console.error(e); } }

const now = () => new Date().toISOString();
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function all(coll, { withDeleted = false } = {}) {
  const m = load(coll);
  return Object.values(m).filter((r) => withDeleted || !r.deleted);
}
export function get(coll, id) { const r = load(coll)[id]; return r && !r.deleted ? r : null; }
// ── ย้อนเวลาข้อมูล: เก็บเวอร์ชันก่อนแก้ของแต่ละรายการ + สำเนารายวัน ──
const HIST_COLLS = ['clients', 'policies', 'appts', 'content', 'goals', 'checks'];
const HIST_MAX = 8;
function hist() { try { return JSON.parse(safe.get('hist') || '{}'); } catch { return {}; } }
function remember(coll, prev) {
  if (!HIST_COLLS.includes(coll) || !prev?.id || prev.deleted) return;
  const H = hist(); const k = coll + '/' + prev.id; const a = H[k] || [];
  const last = a[0];
  // แก้ถี่ ๆ ภายใน 2 นาที นับเป็นครั้งเดียว (เก็บเวอร์ชันก่อนเริ่มแก้)
  if (last && Date.now() - Date.parse(last.at) < 120000) return;
  a.unshift({ at: now(), rec: prev }); H[k] = a.slice(0, HIST_MAX);
  let txt = JSON.stringify(H);
  while (txt.length > 900000) { // จำกัดขนาด: ตัดเวอร์ชันเก่าสุดออก
    const keys = Object.keys(H); if (!keys.length) break;
    let ok = keys.sort((x, y) => (H[x].at(-1)?.at || '').localeCompare(H[y].at(-1)?.at || ''))[0];
    H[ok].pop(); if (!H[ok].length) delete H[ok]; txt = JSON.stringify(H);
  }
  safe.set('hist', txt);
}
export function history(coll, id) { return hist()[coll + '/' + id] || []; }
/** รายการที่แก้ล่าสุดทุกคอลเลกชัน → [{coll,id,at,rec,cur}] */
export function recentEdits(limit = 30) {
  const H = hist(); const out = [];
  for (const [k, a] of Object.entries(H)) { const [coll, id] = k.split('/'); const cur = load(coll)[id]; out.push({ coll, id, at: a[0].at, rec: a[0].rec, cur, n: a.length }); }
  return out.sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit);
}
/** รายการที่ถูกลบ ซึ่งยังกู้คืนได้ */
export function trash() { return recentEdits(500).filter((x) => x.cur?.deleted); }
export function restoreVersion(coll, id, at) {
  const v = history(coll, id).find((x) => x.at === at); if (!v) return null;
  const m = load(coll); const cur = m[id];
  if (cur && !cur.deleted) { const H = hist(); const k = coll + '/' + id; (H[k] ||= []).unshift({ at: now(), rec: cur }); H[k] = H[k].slice(0, HIST_MAX); safe.set('hist', JSON.stringify(H)); }
  m[id] = { ...v.rec, id, updatedAt: now() }; delete m[id].deleted;
  persist(coll); queue(coll, id); emit(coll); return m[id];
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function snapshots() { try { return JSON.parse(safe.get('snaps') || '[]'); } catch { return []; } }
export function snapshotNow(tag) {
  const d = tag || dayKey(); const txt = JSON.stringify(exportAll());
  if (txt.length > 1500000) return null; // ใหญ่เกิน — ใช้ไฟล์สำรองแทน
  let list = snapshots().filter((x) => x.d !== d);
  if (!safe.set('snap.' + d, txt)) return null;
  const counts = Object.fromEntries(['clients', 'policies', 'appts'].map((c) => [c, all(c).length]));
  list.unshift({ d, at: now(), size: txt.length, counts });
  const daily = list.filter((x) => /^\d{4}-/.test(x.d));
  for (const old of daily.slice(3)) { try { localStorage.removeItem(NS + 'snap.' + old.d); } catch {} list = list.filter((x) => x !== old); }
  safe.set('snaps', JSON.stringify(list)); return list[0];
}
export function snapshotDaily() { if (!snapshots().some((x) => x.d === dayKey())) snapshotNow(); }
export function restoreSnapshot(d) {
  let snap; try { snap = JSON.parse(safe.get('snap.' + d) || 'null'); } catch {} if (!snap?.data) throw new Error('ไม่พบสำเนา');
  snapshotNow('ก่อนย้อน'); let n = 0; const t = now();
  for (const c of COLLECTIONS) {
    if (c === 'settings') continue;
    const m = load(c); const old = snap.data[c] || {};
    for (const [id, r] of Object.entries(old)) { const cur = m[id]; if (!cur || JSON.stringify({ ...cur, updatedAt: 0 }) !== JSON.stringify({ ...r, updatedAt: 0 })) { m[id] = { ...r, updatedAt: t }; queue(c, id); n++; } }
    for (const id of Object.keys(m)) if (!old[id] && !m[id].deleted) { m[id] = { id, deleted: true, updatedAt: t }; queue(c, id); n++; }
    persist(c);
  }
  emit('*'); return n;
}

export function put(coll, rec) {
  const m = load(coll);
  const id = rec.id || newId();
  const prev = m[id] || {};
  remember(coll, prev);
  const next = { ...prev, ...rec, id, updatedAt: now(), createdAt: prev.createdAt || rec.createdAt || now() };
  delete next.deleted;
  m[id] = next; persist(coll); queue(coll, id); emit(coll);
  return next;
}
export function remove(coll, id) {
  const m = load(coll); if (!m[id]) return;
  if (m[id].deleted) return;
  { const H = hist(); const k = coll + '/' + id; if (HIST_COLLS.includes(coll)) { (H[k] ||= []).unshift({ at: now(), rec: m[id] }); H[k] = H[k].slice(0, HIST_MAX); safe.set('hist', JSON.stringify(H)); } }
  m[id] = { id, deleted: true, updatedAt: now() }; persist(coll); queue(coll, id); emit(coll);
}
// ค่าตั้งค่า (เอกสารเดียว)
export function getSettings() { return get('settings', 'main') || { id: 'main' }; }
export function saveSettings(patch) { return put('settings', { ...getSettings(), ...patch, id: 'main' }); }

// ── Export / Import (สำรองข้อมูลเป็นไฟล์) ───────────────────
export function exportAll() {
  const data = {}; for (const c of COLLECTIONS) data[c] = load(c);
  return { app: 'advisor-desk', version: 1, exportedAt: now(), data };
}
export function importAll(json) {
  if (!json || json.app !== 'advisor-desk' || !json.data) throw new Error('ไฟล์ไม่ถูกต้อง');
  let n = 0;
  for (const c of COLLECTIONS) {
    const incoming = json.data[c] || {}; const m = load(c);
    for (const [id, r] of Object.entries(incoming)) {
      if (!m[id] || (r.updatedAt || '') > (m[id].updatedAt || '')) { m[id] = r; queue(c, id); n++; }
    }
    persist(c);
  }
  emit('*'); return n;
}

// ── Sync with Google Sheets (Apps Script Web App) ─────────────
// การตั้งค่า: syncUrl (ลิงก์ Web App) + syncKey (รหัสลับที่ตั้งในสคริปต์) เก็บแยกในเครื่อง ไม่ซิงก์ขึ้นชีต
export const sync = {
  state: 'off', // off | idle | busy | ok | err
  lastError: '',
  get config() { try { return JSON.parse(safe.get('sync') || '{}'); } catch { return {}; } },
  set config(v) { safe.set('sync', JSON.stringify(v || {})); },
  get lastAt() { return safe.get('lastSyncAt'); },
};
const syncListeners = new Set();
export function onSync(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); }
function setSyncState(s, err = '') { sync.state = s; sync.lastError = err; for (const f of syncListeners) try { f(s, err); } catch {} }

let timer = null;
function scheduleSync() {
  const cfg = sync.config; if (!cfg.url) return;
  clearTimeout(timer); timer = setTimeout(() => syncNow().catch(() => {}), 2500);
}

export async function syncNow() {
  const cfg = sync.config;
  if (!cfg.url || !cfg.key) { setSyncState('off'); return { skipped: true }; }
  if (!navigator.onLine) { setSyncState('err', 'ออฟไลน์อยู่ — จะซิงก์เมื่อมีอินเทอร์เน็ต'); return { offline: true }; }
  setSyncState('busy');
  try {
    // 1) ส่งของที่แก้ในเครื่องขึ้นไป
    const ob = outbox();
    const rows = [];
    for (const key of ob) {
      const [coll, id] = key.split('/'); const r = load(coll)[id];
      if (r) rows.push({ id, collection: coll, updatedAt: r.updatedAt, deleted: !!r.deleted, json: JSON.stringify(r) });
    }
    if (rows.length) {
      const res = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: cfg.key, action: 'push', rows }) });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || 'ส่งข้อมูลไม่สำเร็จ');
      const sent = new Set(rows.map((r) => r.collection + '/' + r.id));
      setOutbox(outbox().filter((k) => !sent.has(k)));
    }
    // 2) ดึงของใหม่จากชีต
    const since = safe.get('pullSince') || '';
    const res2 = await fetch(cfg.url + (cfg.url.includes('?') ? '&' : '?') + 'action=pull&key=' + encodeURIComponent(cfg.key) + '&since=' + encodeURIComponent(since));
    const data = await res2.json();
    if (!data.ok) throw new Error(data.error || 'ดึงข้อมูลไม่สำเร็จ');
    let changed = new Set(); let maxAt = since;
    for (const row of data.rows || []) {
      if (!COLLECTIONS.includes(row.collection)) continue;
      const m = load(row.collection); const cur = m[row.id];
      if (!cur || (row.updatedAt || '') > (cur.updatedAt || '')) {
        try { m[row.id] = JSON.parse(row.json); changed.add(row.collection); } catch {}
      }
      if ((row.updatedAt || '') > maxAt) maxAt = row.updatedAt;
    }
    for (const c of changed) persist(c);
    if (maxAt) safe.set('pullSince', maxAt);
    safe.set('lastSyncAt', now());
    setSyncState('ok');
    if (changed.size) emit('*');
    return { pushed: rows.length, pulled: (data.rows || []).length };
  } catch (e) {
    setSyncState('err', e.message || String(e));
    throw e;
  }
}
export function resetPull() { safe.set('pullSince', ''); }
export function pendingCount() { return outbox().length; }
window.addEventListener('online', () => scheduleSync());

// ── พื้นที่เก็บในเครื่อง: ดูขนาด + ล้างของเก่า ──
export function storageUsage() {
  const out = { total: 0, data: 0, hist: 0, snaps: 0, videos: 0, other: 0 };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); const n = (k.length + (localStorage.getItem(k) || '').length) * 2; out.total += n;
      if (!k.startsWith(NS) && !k.startsWith('advdesk')) { out.other += n; continue; }
      const s = k.slice(NS.length);
      if (s === 'hist') out.hist += n; else if (s.startsWith('snap')) out.snaps += n; else if (s === 'videos') out.videos += n; else if (COLLECTIONS.includes(s)) out.data += n; else out.other += n;
    }
  } catch {}
  return out;
}
/** ล้างของเก่า: ประวัติของรายการที่ลบเกิน 14 วัน · ประวัติงานสตูดิโอเหลือ 3 รุ่น · สำเนารายวันเหลือ 3 วัน */
export function compact({ keepSnaps = 3 } = {}) {
  const before = storageUsage().total; const cut = Date.now() - 14 * 864e5;
  const H = hist();
  for (const [k, list] of Object.entries(H)) {
    const [coll, id] = k.split('/'); const cur = load(coll)[id];
    if (!cur || (cur.deleted && Date.parse(cur.updatedAt || 0) < cut)) { delete H[k]; continue; }
    if (coll === 'content') H[k] = list.slice(0, 3);
  }
  safe.set('hist', JSON.stringify(H));
  let list = snapshots(); const daily = list.filter((x) => /^\d{4}-/.test(x.d));
  for (const old of daily.slice(keepSnaps)) { try { localStorage.removeItem(NS + 'snap.' + old.d); } catch {} list = list.filter((x) => x !== old); }
  safe.set('snaps', JSON.stringify(list));
  return Math.max(0, before - storageUsage().total);
}
