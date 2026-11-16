import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGlobal, modeFor } from '../../take-home-pay-calculator/global.js';
import { parseNum } from '../../overtime-calculator/region.js';
import { calculate, RULES } from '../../overtime-calculator/engine.js';

const g = (o) => calculateGlobal({ frequency: 'annual', pensionPct: 0, ...o });

test('UK £50,000: tax 7,486 and NI 2,994.40', () => {
  const r = g({ mode: 'GB', gross: 50000 });
  assert.equal(Math.round(r.annual.federal), 7486);
  assert.equal(r.annual.ss, 2994.4);
  assert.equal(Math.round(r.annual.net), 39520);
});
test('UK personal allowance tapers above 100k', () => {
  const r = g({ mode: 'GB', gross: 125140 });
  assert.equal(Math.round(r.annual.federal), 42516); // (37700*.2)+(87440*.4) = 7540 + 34976
});
test('UK pension is taken before tax but not before NI', () => {
  const a = g({ mode: 'GB', gross: 40000 }), b = g({ mode: 'GB', gross: 40000, pensionPct: 5 });
  assert.equal(a.annual.ss, b.annual.ss);
  assert.ok(b.annual.federal < a.annual.federal);
});
test('Australia 2026-27: $90,000 pays 17,520 tax and 1,800 Medicare', () => {
  const r = g({ mode: 'AU', gross: 90000 });
  assert.equal(r.annual.federal, 17520);
  assert.equal(r.annual.medicare, 1800);
});
test('Australia: low income tax offset zeroes tax at 18,200 to ~22,000', () => {
  assert.equal(g({ mode: 'AU', gross: 22000 }).annual.federal, 0);
});
test('India new regime: 12 lakh salary pays no tax, 15 lakh pays 97,500', () => {
  assert.equal(g({ mode: 'IN', gross: 1275000 }).annual.federal, 0);
  const r = g({ mode: 'IN', gross: 1500000 });
  assert.equal(Math.round(r.annual.federal + r.annual.medicare), 97500);
});
test('India marginal relief just above the rebate limit', () => {
  const r = g({ mode: 'IN', gross: 1300000 }); // taxable 12.25 lakh: tax limited to 25,000
  assert.equal(Math.round(r.annual.federal), 25000);
});
test('Canada Ontario $60,000: CPP 3,360.. EI 978 and positive tax', () => {
  const r = g({ mode: 'CA', gross: 60000, province: 'ON' });
  assert.ok(Math.abs(r.annual.ss - (60000 - 3500) * 0.0595) < 0.01);
  assert.ok(Math.abs(r.annual.medicare - 60000 * 0.0163) < 0.01);
  assert.ok(r.annual.federal > 5000 && r.annual.federal < 7000, String(r.annual.federal));
  assert.ok(r.annual.state > 2000 && r.annual.state < 4500, String(r.annual.state));
  assert.ok(r.annual.net > 44000 && r.annual.net < 50000, String(r.annual.net));
});
test('Canada: RRSP lowers income tax but not CPP or EI', () => {
  const a = g({ mode: 'CA', gross: 80000, province: 'BC' }), b = g({ mode: 'CA', gross: 80000, province: 'BC', pensionPct: 10 });
  assert.equal(a.annual.ss, b.annual.ss); assert.equal(a.annual.medicare, b.annual.medicare);
  assert.ok(b.annual.federal < a.annual.federal && b.annual.state < a.annual.state);
});
test('Gulf states: no income tax', () => {
  const r = g({ mode: 'GULF', gross: 240000, pensionPct: 0 });
  assert.equal(r.annual.net, 240000);
});
test('Other country uses the rates you enter', () => {
  const r = g({ mode: 'OTHER', gross: 100000, taxPct: 20, socialPct: 10 });
  assert.equal(r.annual.net, 70000);
});
test('country mode mapping', () => {
  assert.equal(modeFor('US'), 'US'); assert.equal(modeFor('GB'), 'GB'); assert.equal(modeFor('AE'), 'GULF'); assert.equal(modeFor('JP'), 'OTHER');
});
test('numbers parse in every common style', () => {
  assert.equal(parseNum('1,234.56'), 1234.56);
  assert.equal(parseNum('1.234,56'), 1234.56);
  assert.equal(parseNum('1 234,56'), 1234.56);
  assert.equal(parseNum('1,00,000'), 100000);
  assert.equal(parseNum('12,5'), 12.5);
  assert.equal(parseNum('3.14'), 3.14);
  assert.equal(parseNum('65000'), 65000);
  assert.equal(parseNum('₹1,500,000'), 1500000);
  assert.ok(Number.isNaN(parseNum('abc')));
});
const week = (rule, days) => { const x = calculate({ rate: 10, rule, days, mode: 'week', otMult: RULES[rule].ot ?? 1.5, dtMult: RULES[rule].dt ?? 2 }); return [x.regHours, x.otHours, x.dtHours, x.gross]; };
test('France: 50 hours = 35 regular, 8 at +25%, 7 at +50%', () => assert.deepEqual(week('fr', [10, 10, 10, 10, 10, 0, 0]), [35, 8, 7, 555]));
test('Mexico: first 9 overtime hours double, rest triple', () => assert.deepEqual(week('mx', [10, 10, 10, 10, 10, 10, 0]), [48, 9, 3, 750]));
test('Australia award, per day: five 9-hour days = 38 ordinary + 7 at 1.5x', () => assert.deepEqual(week('au', [9, 9, 9, 9, 9, 0, 0]), [38, 7, 0, 485]));
test('Australia award, per day: an 11-hour day = 7.6 + 2 at 1.5x + 1.4 at 2x', () => assert.deepEqual(week('au', [11, 0, 0, 0, 0, 0, 0]), [7.6, 2, 1.4, 134]));
test('Australia award: ordinary hours past 38 a week also pay 1.5x', () => assert.deepEqual(week('au', [7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 0]), [38, 7.6, 0, 494]));
test('British Columbia 14-hour day: 8 / 4 / 2', () => assert.deepEqual(week('ca_bc', [14, 0, 0, 0, 0, 0, 0]), [8, 4, 2, 180]));
test('UAE 10-hour day at 1.25x', () => assert.deepEqual(week('ae', [10, 0, 0, 0, 0, 0, 0]), [8, 2, 0, 105]));

test('BC 2026 lowest rate is 5.60% (BC Budget 2026)', async () => { const { CA_PROVINCES } = await import('../../take-home-pay-calculator/global.js'); assert.equal(CA_PROVINCES.BC.rate, 0.056); assert.equal(CA_PROVINCES.BC.brackets[0][1], 0.056); });
