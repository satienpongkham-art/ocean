// ─────────────────────────────────────────────────────────────
// Store: เก็บข้อมูลในเครื่อง (localStorage) + ซิงก์กับ Google Sheets ของผู้ใช้
//
// ทุกคอลเลกชันเก็บเป็น { [id]: record }  record = { id, updatedAt, deleted?, ...ข้อมูล }
// การรวมข้อมูล: updatedAt ใหม่กว่าชนะ · ลบแบบ tombstone (deleted: true) เพื่อให้ลบข้ามเครื่องได้
// ไม่มีข้อมูลลูกค้าใน repo — อยู่ในเครื่องและใน Google Sheet ของผู้ใช้เท่านั้น
// ─────────────────────────────────────────────────────────────
const NS = 'advdesk.v1.';
export const COLLECTIONS = ['clients', 'appts', 'logs', 'activities', 'goals', 'settings', 'policies'];

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
export function put(coll, rec) {
  const m = load(coll);
  const id = rec.id || newId();
  const prev = m[id] || {};
  const next = { ...prev, ...rec, id, updatedAt: now(), createdAt: prev.createdAt || rec.createdAt || now() };
  delete next.deleted;
  m[id] = next; persist(coll); queue(coll, id); emit(coll);
  return next;
}
export function remove(coll, id) {
  const m = load(coll); if (!m[id]) return;
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
