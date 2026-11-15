import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageUp, level, anniversariesIn, callQueue } from '../js/engine/work.js';

const NOW = new Date(2026, 10, 15); // 15 พ.ย. 2569

test('อายุประกันแบบเศษเกิน 6 เดือน: ขึ้นที่วันเกิด + 6 เดือน', () => {
  assert.deepEqual(ageUp('1990-05-20', 'nearest', NOW), { date: '2026-11-20', days: 5, now: 36, to: 37 });
  assert.deepEqual(ageUp('1990-08-01', 'nearest', NOW), { date: '2027-02-01', days: 78, now: 36, to: 37 });
  assert.deepEqual(ageUp('1990-03-10', 'nearest', NOW), { date: '2027-09-10', days: 299, now: 37, to: 38 });
});
test('อายุประกันแบบวันเกิดล่าสุด: ขึ้นที่วันเกิด', () => {
  assert.deepEqual(ageUp('1990-12-01', 'last', NOW), { date: '2026-12-01', days: 16, now: 35, to: 36 });
  assert.equal(ageUp('', 'last', NOW), null);
});
test('เลเวลจากคะแนนสะสม', () => {
  assert.equal(level(0).lv, 1); assert.equal(level(25).lv, 2); assert.equal(level(99).lv, 2); assert.equal(level(100).lv, 3);
});
test('วันครบรอบในเดือน', () => {
  assert.deepEqual(anniversariesIn('1990-05-20', 2026, 10, 6), ['2026-11-20']);
  assert.deepEqual(anniversariesIn('2026-12-01', 2026, 10), []);
});
test('คิวโทร: ติดตามที่ถึงกำหนดมาก่อน แล้วตามเกรด', () => {
  const q = callQueue([
    { id: 'c', stage: 'lead', closeness: 1, ability: 1, access: 1 },
    { id: 'a', stage: 'lead', closeness: 3, ability: 3, access: 3 },
    { id: 'f', stage: 'proposed', nextDate: '2026-11-10' },
    { id: 'p', stage: 'paused' },
  ], '2026-11-15');
  assert.deepEqual(q.map((x) => x.id), ['f', 'a', 'c']);
});
