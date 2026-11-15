import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTable, lookup, parseAge } from '../js/engine/premium.js';

test('อ่านช่วงอายุ', () => {
  assert.deepEqual(parseAge('21-25'), [21, 25]); assert.deepEqual(parseAge('≤ 60'), [0, 60]);
  assert.deepEqual(parseAge('61 – 65 ปี'), [61, 65]); assert.deepEqual(parseAge('30'), [30, 30]); assert.equal(parseAge('อายุ'), null);
});
test('วางจาก Excel (Tab) มีหัวตาราง ชาย/หญิง', () => {
  const t = parseTable('อายุ\tชาย\tหญิง\n20\t5,200\t4,900\n21-25\t5,400\t5,000');
  assert.deepEqual(t.cols, ['อายุ', 'ชาย', 'หญิง']);
  assert.deepEqual(lookup(t, 23, 'f'), [{ col: 'หญิง', value: 5000 }]);
  assert.deepEqual(lookup(t, 20, 'm'), [{ col: 'ชาย', value: 5200 }]);
  assert.equal(lookup(t, 40, 'm'), null);
});
test('วางแบบเว้นวรรค ไม่มีหัวตาราง หลายคอลัมน์', () => {
  const t = parseTable('30  12,000  18,500  25,000\n31  12,300  18,900  25,600');
  assert.equal(t.cols.length, 4);
  assert.equal(lookup(t, 31, 'm').length, 3);
  assert.equal(lookup(t, 31, 'm')[2].value, 25600);
});
test('ข้อมูลผิดรูปแบบ', () => { assert.ok(parseTable('สวัสดี').error); assert.ok(parseTable('').error); });
