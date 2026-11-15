// รัน: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taxOnNet, computeTax, insuranceDeductions, compareWithInsurance, roomLeft } from '../js/engine/tax.js';

test('ขั้นบันไดภาษี: 150,000 แรกยกเว้น', () => {
  assert.equal(taxOnNet(150000).tax, 0);
  assert.equal(taxOnNet(300000).tax, 7500);              // 150k×5%
  assert.equal(taxOnNet(500000).tax, 27500);             // +200k×10%
  assert.equal(taxOnNet(750000).tax, 65000);             // +250k×15%
  assert.equal(taxOnNet(1000000).tax, 115000);           // +250k×20%
  assert.equal(taxOnNet(2000000).tax, 365000);           // +1M×25%
  assert.equal(taxOnNet(5000000).tax, 1265000);          // +3M×30%
  assert.equal(taxOnNet(6000000).tax, 1615000);          // +1M×35%
});

test('เงินเดือน 50,000/เดือน โสด ประกันสังคม 9,000', () => {
  const r = computeTax({ income: 600000, socialSecurity: 9000 });
  // 600,000 − 100,000 (ค่าใช้จ่าย) − 60,000 − 9,000 = 431,000 → 7,500 + 131,000×10% = 20,600
  assert.equal(r.net, 431000);
  assert.equal(r.tax, 20600);
  assert.equal(r.marginal, 0.10);
});

test('สุขภาพตนเองไม่เกิน 25,000 และรวมชีวิตไม่เกิน 100,000', () => {
  const d = insuranceDeductions({ income: 600000, life: 90000, healthSelf: 40000 });
  assert.equal(d.healthSelf, 25000);
  assert.equal(d.life, 75000);
  assert.equal(d.life + d.healthSelf, 100000);
});

test('บำนาญใช้สิทธิประกันชีวิตที่ยังเหลือก่อน แล้วค่อยหมวดบำนาญ (≤15% ≤200,000)', () => {
  const d = insuranceDeductions({ income: 1000000, life: 20000, healthSelf: 10000, annuity: 250000 });
  assert.equal(d.annuityInLife, 70000);          // เติม 100k − 30k
  assert.equal(d.annuity, 150000);               // 15% ของ 1,000,000
  assert.equal(d.total, 20000 + 10000 + 70000 + 150000);
});

test('บำนาญถูกจำกัดด้วยเพดานกลุ่มเกษียณ 500,000', () => {
  const d = insuranceDeductions({ income: 3000000, life: 100000, annuity: 200000, otherRetirement: 400000 });
  assert.equal(d.annuity, 100000);
});

test('ประกันสุขภาพพ่อแม่ ≤15,000 และคู่สมรส ≤10,000', () => {
  const d = insuranceDeductions({ income: 500000, parentHealth: 30000, spouseLife: 20000 });
  assert.equal(d.parentHealth, 15000);
  assert.equal(d.spouseLife, 10000);
});

test('ภาษีที่ประหยัดได้จากการซื้อประกันชีวิต 100,000 (ฐาน 10%)', () => {
  const c = compareWithInsurance({ income: 600000, socialSecurity: 9000 }, { life: 100000 });
  // net 431,000 → 331,000 : 20,600 → 10,600
  assert.equal(c.saved, 10000);
});

test('roomLeft คำนวณสิทธิที่ยังเหลือ', () => {
  const r = roomLeft({ income: 600000, socialSecurity: 9000, life: 30000 });
  assert.equal(r.lifeHealthRoom, 70000);
  assert.equal(r.annuityRoom, 90000);  // 15% ของ 600,000
  assert.ok(r.maxSaving > 0);
});

test('บุตรคนที่ 2 ที่เกิดตั้งแต่ 2561 ได้ 60,000', () => {
  const r = computeTax({ income: 1200000, spouse: true, children: 2, children2561: 1, parents: 2 });
  assert.equal(r.family, 60000 + 60000 + 30000 + 60000 + 60000);
});
