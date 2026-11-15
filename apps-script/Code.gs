/**
 * Advisor Desk — ตัวซิงก์ข้อมูลกับ Google Sheets (วางในเมนู ส่วนขยาย › Apps Script ของชีตคุณ)
 *
 * 1) แก้ SECRET ด้านล่างเป็นรหัสลับของคุณเอง (ยาว ๆ เดายาก เช่น 20 ตัวอักษรขึ้นไป)
 * 2) ทำให้ใช้งานได้ › การทำให้ใช้งานได้รายการใหม่ › เว็บแอป
 *    - เรียกใช้ในฐานะ: ฉัน   - ผู้มีสิทธิ์เข้าถึง: ทุกคน
 * 3) คัดลอก URL (ลงท้าย /exec) ไปใส่ในแอป › เครื่องมือ › ซิงก์ & สำรองข้อมูล พร้อมรหัสลับ
 *
 * ข้อมูลเก็บในแท็บ "data" : id | collection | updatedAt | deleted | json
 * ใครไม่มีรหัสลับจะอ่าน/เขียนไม่ได้ — ห้ามแชร์ลิงก์และรหัสลับ
 */
const SECRET = 'เปลี่ยนเป็นรหัสลับของคุณ';
const SHEET = 'data';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['id', 'collection', 'updatedAt', 'deleted', 'json']);
    sh.setFrozenRows(1);
  }
  return sh;
}
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function checkKey_(key) {
  if (SECRET === 'เปลี่ยนเป็นรหัสลับของคุณ') throw new Error('ยังไม่ได้ตั้งรหัสลับ (SECRET) ในสคริปต์');
  if (key !== SECRET) throw new Error('รหัสลับไม่ถูกต้อง');
}

/** ดึงข้อมูลที่ใหม่กว่า since */
function doGet(e) {
  try {
    const p = e.parameter || {};
    checkKey_(p.key);
    if (p.action !== 'pull') return out_({ ok: true, hello: 'advisor-desk' });
    const since = p.since || '';
    const values = sheet_().getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < values.length; i++) {
      const [id, collection, updatedAt, deleted, json] = values[i];
      const u = updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt);
      if (!since || u > since) rows.push({ id: String(id), collection: String(collection), updatedAt: u, deleted: deleted === true || deleted === 'TRUE', json: String(json) });
    }
    return out_({ ok: true, rows: rows });
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  }
}

/** รับข้อมูลจากแอป: upsert ตาม collection+id (ใหม่กว่าชนะ) */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    checkKey_(body.key);
    if (body.action !== 'push') return out_({ ok: false, error: 'action ไม่ถูกต้อง' });
    const sh = sheet_();
    const values = sh.getDataRange().getValues();
    const index = {};
    for (let i = 1; i < values.length; i++) index[values[i][1] + '/' + values[i][0]] = i + 1; // แถวในชีต (1-based)
    let written = 0;
    const appends = [];
    (body.rows || []).forEach(function (r) {
      const key = r.collection + '/' + r.id;
      // ใส่ ' นำหน้าเพื่อให้ชีตเก็บเป็นข้อความ (ไม่แปลงเป็นวันที่ ทำให้เทียบเวลาได้แม่นยำ)
      const row = ["'" + r.id, r.collection, "'" + r.updatedAt, !!r.deleted, r.json];
      const at = index[key];
      if (at) {
        const cur = String(values[at - 1][2] instanceof Date ? values[at - 1][2].toISOString() : values[at - 1][2]);
        if (r.updatedAt > cur) { sh.getRange(at, 1, 1, 5).setValues([row]); written++; }
      } else { appends.push(row); written++; }
    });
    if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, 5).setValues(appends);
    return out_({ ok: true, written: written });
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}
