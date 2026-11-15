// ─── ตารางเบี้ยที่ผู้ใช้นำเข้าเอง (คัดลอกจากระบบตัวแทน / Excel / Google Sheets แล้ววาง) ───
// รูปแบบที่รองรับ: แต่ละบรรทัด = 1 อายุ หรือช่วงอายุ · คั่นด้วย Tab, จุลภาค หรือเว้นวรรค 2 ช่องขึ้นไป
//   อายุ   ชาย     หญิง
//   20     5,200   4,900
//   21-25  5,400   5,000

const num = (s) => { const v = Number(String(s).replace(/[,\s฿บาท]/g, '')); return isFinite(v) && String(s).trim() !== '' ? v : null; };

/** อ่านช่วงอายุจากข้อความ เช่น "20", "21-25", "≤ 60", "61 – 65 ปี" */
export function parseAge(s) {
  const t = String(s).replace(/ปี|years?/gi, '').trim();
  let m = t.match(/^(\d+)\s*[-–~ถึง]+\s*(\d+)$/); if (m) return [+m[1], +m[2]];
  m = t.match(/^(?:≤|<=|ไม่เกิน)\s*(\d+)$/); if (m) return [0, +m[1]];
  m = t.match(/^(\d+)\s*\+$|^(?:≥|>=)\s*(\d+)$/); if (m) return [+(m[1] || m[2]), 120];
  m = t.match(/^(\d+)$/); if (m) return [+m[1], +m[1]];
  return null;
}

/** แปลงข้อความที่วาง → { cols: ['อายุ', ...], rows: [[ageText, v1, v2...]] } หรือ { error } */
export function parseTable(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { error: 'ยังไม่มีข้อมูล' };
  const split = (l) => (l.includes('\t') ? l.split('\t') : l.includes(',') && !/\d,\d{3}/.test(l) ? l.split(',') : l.split(/\s{2,}|\s(?=\d)/)).map((x) => x.trim()).filter((x) => x !== '');
  let cols = null; const rows = [];
  for (const l of lines) {
    const cells = split(l);
    if (!cells.length) continue;
    const age = parseAge(cells[0]);
    if (!age) { if (!rows.length) cols = cells; continue; }
    const vals = cells.slice(1).map(num);
    if (!vals.length || vals.some((v) => v == null)) continue;
    rows.push([cells[0], ...vals]);
  }
  if (!rows.length) return { error: 'อ่านตัวเลขไม่ได้ — บรรทัดต้องขึ้นต้นด้วยอายุ ตามด้วยเบี้ย' };
  const width = Math.max(...rows.map((r) => r.length));
  if (!cols || cols.length < width) cols = ['อายุ', ...Array.from({ length: width - 1 }, (_, i) => (width === 3 ? ['ชาย', 'หญิง'][i] : 'เบี้ย ' + (i + 1)))];
  return { cols: cols.slice(0, width), rows };
}

/** หาเบี้ยตามอายุ → [{ col, value }] (เลือกคอลัมน์ตามเพศถ้ามีหัวตาราง ชาย/หญิง) */
export function lookup(table, age, gender) {
  if (!table?.rows || age == null || age === '') return null;
  const row = table.rows.find((r) => { const a = parseAge(r[0]); return a && age >= a[0] && age <= a[1]; });
  if (!row) return null;
  const out = table.cols.slice(1).map((col, i) => ({ col, value: row[i + 1] }));
  const g = gender === 'm' ? /ชาย|male|^m$/i : gender === 'f' ? /หญิง|female|^f$/i : null;
  const byGender = g ? out.filter((x) => g.test(x.col)) : [];
  return byGender.length ? byGender : out;
}
