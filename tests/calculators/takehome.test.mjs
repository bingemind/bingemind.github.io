import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bracketTax, calculateTakeHome, FED } from '../../take-home-pay-calculator/engine.js';

const near = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('federal bracket tax matches IRS table (single)', () => {
  // IRS table: over 50,400 -> 5,800 + 22% of excess
  near(bracketTax(60000, FED.single.brackets).tax, 5800 + 0.22 * 9600);
  // over 105,700 -> 17,966 + 24%
  near(bracketTax(150000, FED.single.brackets).tax, 17966 + 0.24 * 44300);
  // top: over 640,600 -> 192,979.25 + 37%
  near(bracketTax(700000, FED.single.brackets).tax, 192979.25 + 0.37 * 59400);
});

test('federal bracket tax matches IRS table (head of household)', () => {
  near(bracketTax(80000, FED.hoh.brackets).tax, 7740 + 0.22 * 12550);
  near(bracketTax(300000, FED.hoh.brackets).tax, 56631 + 0.35 * 43800);
});

test('$60k single in Texas, biweekly', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 60000, status: 'single', frequency: 'biweekly', state: 'TX' });
  // taxable 43,900 -> 1,240 + 12% x 31,500 = 5,020
  near(r.annual.federal, 5020);
  near(r.annual.ss, 3720); near(r.annual.medicare, 870);
  near(r.annual.state, 0);
  near(r.annual.net, 60000 - 5020 - 3720 - 870);
  near(r.perPeriod.net, (60000 - 9610) / 26);
});

test('401(k) lowers income tax but not FICA', () => {
  const a = calculateTakeHome({ payType: 'salary', salary: 80000, status: 'single', frequency: 'annual', state: 'TX', k401Pct: 10 });
  near(a.annual.k401, 8000);
  near(a.annual.ss, 80000 * 0.062);
  // fed taxable 80,000-8,000-16,100 = 55,900 -> 5,800 + 22% x 5,500 = 7,010
  near(a.annual.federal, 7010);
});

test('health premium (section 125) lowers income tax and FICA', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 52000, status: 'single', frequency: 'weekly', state: 'TX', healthPerPeriod: 50 });
  near(r.annual.pretax, 2600);
  near(r.annual.ss, (52000 - 2600) * 0.062);
});

test('social security stops at wage base, extra medicare above 200k', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 250000, status: 'single', frequency: 'annual', state: 'FL' });
  near(r.annual.ss, 184500 * 0.062);
  near(r.annual.medicare, 250000 * 0.0145 + 50000 * 0.009);
});

test('child tax credit: 2 kids, married, $90k', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 90000, status: 'mfj', frequency: 'annual', state: 'TX', children: 2 });
  // taxable 57,800 -> 2,480 + 12% x 33,000 = 6,440; minus 4,400 = 2,040
  near(r.annual.federal, 2040);
  near(r.ctc, 4400);
});

test('credit never makes federal tax negative', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 30000, status: 'hoh', frequency: 'annual', state: 'TX', children: 3 });
  assert.equal(r.annual.federal, 0);
});

test('hourly pay converts to annual', () => {
  const r = calculateTakeHome({ payType: 'hourly', hourly: 25, hoursPerWeek: 40, weeksPerYear: 52, status: 'single', frequency: 'weekly', state: 'TX' });
  near(r.annual.gross, 52000); near(r.perPeriod.gross, 1000);
  assert.ok(r.hourlyNet > 0 && r.hourlyNet < 25);
});

test('flat state: Illinois 4.95% after exemption', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 70000, status: 'single', frequency: 'annual', state: 'IL' });
  near(r.annual.state, (70000 - 2925) * 0.0495);
});

test('Pennsylvania taxes 401(k) contributions', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 70000, status: 'single', frequency: 'annual', state: 'PA', k401Pct: 10 });
  near(r.annual.state, 70000 * 0.0307);
});

test('California 2026 brackets, credit and SDI', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 100000, status: 'single', frequency: 'annual', state: 'CA' });
  // 2026 Schedule X (FTB Tax News, Oct 2026); taxable income 100,000 - 5,900 = 94,100
  const caTax = 3310.88 + (94100 - 75197) * 0.093 - 158; // 3,310.88 is the tax at 75,197 in the FTB table
  near(r.annual.state, caTax);
  near(r.annual.sdi, 1300);
});

test('Mississippi 2026: 4% above the first $10,000, exemption and standard deduction', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 50000, status: 'single', frequency: 'annual', state: 'MS' });
  near(r.annual.state, (50000 - 18300) * 0.04); // 6,000 exemption + 2,300 standard deduction + 10,000 zero band
});

test('custom state rate', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 50000, status: 'single', frequency: 'annual', state: 'OTHER', customStateRate: 5 });
  near(r.annual.state, 2500);
});

test('401(k) capped at 2026 limit', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 400000, status: 'single', frequency: 'annual', state: 'TX', k401Pct: 20 });
  near(r.annual.k401, 24500);
});

test('zero and bad input are safe', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 'abc', status: 'weird', frequency: 'nope', state: 'constructor' });
  assert.equal(r.annual.net, 0); assert.equal(r.status, 'single'); assert.equal(r.frequency, 'biweekly');
});

test('net per period times periods equals annual net (within rounding)', () => {
  const r = calculateTakeHome({ payType: 'salary', salary: 73456, status: 'mfj', frequency: 'semimonthly', state: 'NC', k401Pct: 6, healthPerPeriod: 85 });
  near(r.perPeriod.net * 24, r.annual.net, 0.12);
});
