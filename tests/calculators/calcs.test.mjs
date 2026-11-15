import test from 'node:test';
import assert from 'node:assert/strict';
import { pmt, monthlyRate, amortize, fv, rateFor, nper } from '../../mortgage-calculator/fin.js';
import { mortgage } from '../../mortgage-calculator/engine.js';
import { loan } from '../../loan-calculator/engine.js';
import { autoLoan } from '../../auto-loan-calculator/engine.js';
import { grow } from '../../compound-interest-calculator/engine.js';
import { plan, nestEgg } from '../../retirement-calculator/engine.js';
import { refi } from '../../refinance-calculator/engine.js';
import { afford } from '../../home-affordability-calculator/engine.js';
import { simulate } from '../../rent-vs-buy-calculator/engine.js';
import { payoff } from '../../debt-payoff-calculator/engine.js';
import { tax, rateFor as taxRate } from '../../sales-tax-calculator/engine.js';
import { margin } from '../../profit-margin-calculator/engine.js';
import { pct } from '../../percentage-calculator/engine.js';
import { bmi } from '../../bmi-calculator/engine.js';
import { energy } from '../../calorie-calculator/engine.js';
import { diff, nextBirthday } from '../../age-calculator/engine.js';
import { volume } from '../../concrete-calculator/engine.js';
import { solar } from '../../solar-panel-calculator/engine.js';

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('pmt: 300k at 6% for 30 years is 1,798.65', () => near(pmt(0.06 / 12, 360, 300000), 1798.65));
test('pmt: zero rate divides evenly', () => near(pmt(0, 60, 12000), 200));
test('Canada semi-annual: 5% gives monthly 0.4124%', () => near(monthlyRate(5, 2, 12) * 100, 0.41239, 1e-4));
test('amortize pays the loan to zero and sums interest', () => {
  const p = pmt(0.005, 360, 300000), a = amortize(300000, 0.005, 360, p);
  assert.equal(a.months, 360); near(a.totalInterest, p * 360 - 300000, 1);
});
test('extra payments shorten the loan', () => {
  const p = pmt(0.063 / 12, 360, 320000);
  assert.ok(amortize(320000, 0.063 / 12, 360, p, 200).months < 300);
});
test('amortize flags a payment below interest', () => assert.ok(amortize(10000, 0.02, 60, 100).never));
test('fv of level deposits', () => near(fv(0.07 / 12, 240, 10000, 500), 300850.72, 0.5));
test('rateFor recovers the rate', () => near(rateFor(20000, pmt(0.01, 60, 20000), 60), 0.01, 1e-6));
test('nper matches amortization', () => near(nper(0.01, pmt(0.01, 48, 5000), 5000), 48, 1e-6));

test('mortgage: PMI only below 20% down and ends at 78%', () => {
  const base = { price: 400000, rate: 6.3, term: '30', comp: '12', tax: 1, ins: 1800, pmi: 0.5, hoa: 0, extra: 0 };
  assert.equal(mortgage({ ...base, down: 20 }).pmiMonthly, 0);
  const m = mortgage({ ...base, down: 10 });
  near(m.pmiMonthly, 360000 * 0.005 / 12);
  assert.ok(m.base.rows[m.pmiMonths - 1].balance <= 312000 && m.base.rows[m.pmiMonths - 2].balance > 312000);
});
test('mortgage: total adds tax and insurance', () => {
  const m = mortgage({ price: 400000, down: 20, rate: 6.3, term: '30', comp: '12', tax: 1, ins: 1800, pmi: 0.5, hoa: 0, extra: 0 });
  near(m.total, m.pi + 333.33 + 150, 0.01);
});
test('loan: biweekly has 26 payments a year and APR rises with a fee', () => {
  const l = loan({ amount: 20000, rate: 10, years: 5, freq: '26', fee: 3, extra: 0 });
  assert.equal(l.n, 130); assert.ok(l.apr > 10 && l.apr < 12.5);
  near(loan({ amount: 20000, rate: 10, years: 5, freq: '12', fee: 0, extra: 0 }).apr, 10);
});
test('auto loan: tax applies after trade-in credit', () => {
  const a = autoLoan({ price: 30000, down: 2000, trade: 5000, owed: 0, rate: 6, term: '60', tax: 8, fees: 500, wrap: 'loan' });
  near(a.taxAmt, 2000); near(a.financed, 30000 - 2000 - 5000 + 2000 + 500);
});
test('compound interest: yearly compounding of a lump sum', () => {
  near(grow({ start: 1000, monthly: 0, rate: 10, years: 2, comp: '1', grow: 0, when: 'end' }).balance, 1210, 0.01);
});
test('compound interest: start-of-month deposits earn more', () => {
  const b = { start: 0, monthly: 100, rate: 6, years: 10, comp: '12', grow: 0 };
  assert.ok(grow({ ...b, when: 'start' }).balance > grow({ ...b, when: 'end' }).balance);
});
test('retirement: nest egg with return equal to inflation is income × years', () => near(nestEgg(40000, 3, 3, 25), 1000000, 0.01));
test('retirement: extra saving closes the gap', () => {
  const v = { age: 35, retire: 65, saved: 0, monthly: 200, income: 60000, other: 20000, pre: 7, post: 5, infl: 3, life: 90 };
  const p = plan(v); assert.ok(p.gap > 0);
  near(plan({ ...v, monthly: 200 + p.extraMonthly }).gap, 0, 1);
});
test('refinance: break-even is costs ÷ monthly saving', () => {
  const r = refi({ bal: 280000, cur: 7.3, left: 27, nrate: 6.3, nterm: '30', costs: 5000, roll: 'cash' });
  near(r.breakEven, 5000 / r.save, 1e-9); assert.ok(r.save > 0);
});
test('affordability: DTI result respects both limits', () => {
  const v = { income: 100000, debts: 500, down: 60000, rate: 6.3, method: 'dti', front: 28, back: 36, mult: 4.5, term: '30', tax: 1, ins: 1800, hoa: 0 };
  const a = afford(v); near(a.total, Math.min(100000 / 12 * 0.28, 100000 / 12 * 0.36 - 500), 0.01);
});
test('affordability: income multiple', () => near(afford({ income: 60000, debts: 0, down: 30000, rate: 4.4, method: 'mult', mult: 4.5, term: '25', tax: 0, ins: 0, hoa: 0 }, { code: 'GB' }).price, 300000));
test('rent vs buy: free rent means renting wins; huge rent means buying wins', () => {
  const v = { price: 400000, rent: 0, years: 7, down: 20, rate: 6.3, term: '30', appr: 3, rentUp: 3, inv: 6, tax: 1, maint: 1, ins: 1800, buyCost: 3, sellCost: 6 };
  const a = simulate(v).yearly[6]; assert.ok(a.rent > a.buy);
  const b = simulate({ ...v, rent: 6000 }).yearly[6]; assert.ok(b.buy > b.rent);
});
test('debt payoff: avalanche never costs more interest than snowball', () => {
  const d = [{ name: 'a', bal: 6000, apr: 24, min: 180 }, { name: 'b', bal: 1000, apr: 5, min: 50 }, { name: 'c', bal: 12000, apr: 8, min: 350 }];
  const av = payoff(d, 200, 'avalanche'), sn = payoff(d, 200, 'snowball');
  assert.ok(av.totalInt <= sn.totalInt + 0.01); assert.equal(sn.order[0].name, 'b'); assert.equal(av.order[0].name, 'a');
  near(av.totalPaid, 19000 + av.totalInt, 0.5);
});
test('debt payoff: payment below interest never finishes', () => assert.equal(payoff([{ name: 'x', bal: 10000, apr: 30, min: 100 }], 0, 'avalanche').months, Infinity));
test('sales tax: add and remove are inverses', () => {
  const a = tax(100, 20, 'add'); near(a.gross, 120); near(tax(120, 20, 'remove').net, 100);
  near(taxRate({ state: 'CA', local: 1.5 }, 'US'), 8.75); near(taxRate({ prov: 'ON' }, 'CA'), 13); near(taxRate({ rate: 19 }, 'DE'), 19);
});
test('margin and markup', () => {
  const m = margin({ mode: 'price', cost: 60, price: 100, disc: 0 }); near(m.margin, 40); near(m.markup, 66.667, 0.01);
  near(margin({ mode: 'margin', cost: 60, margin: 40, disc: 0 }).list, 100); near(margin({ mode: 'markup', cost: 60, markup: 50, disc: 0 }).list, 90);
});
test('percentages', () => {
  near(pct('of', 15, 80).v, 12); near(pct('is', 20, 80).v, 25); near(pct('change', 50, 75).v, 50); near(pct('change', -50, -25).v, 50);
  near(pct('inc', 200, 10).v, 220); near(pct('dec', 200, 10).v, 180); near(pct('whole', 12, 15).v, 80); near(pct('diff', 40, 60).v, 40);
});
test('BMI: metric and imperial agree, Asian cut-offs differ', () => {
  const a = bmi({ units: 'metric', cm: 170, kg: 70, scale: 'who' }); near(a.bmi, 24.22, 0.01); assert.equal(a.cat, 'Healthy weight');
  assert.equal(bmi({ units: 'metric', cm: 170, kg: 70, scale: 'asian' }).cat, 'Overweight');
  near(bmi({ units: 'imperial', ft: 5, inch: 7, lb: 154, scale: 'who' }).bmi, 24.12, 0.01);
});
test('calories: Mifflin-St Jeor', () => {
  near(energy({ units: 'metric', sex: 'm', age: 30, cm: 175, kg: 75, act: '1.2' }).bmr, 10 * 75 + 6.25 * 175 - 150 + 5);
  near(energy({ units: 'metric', sex: 'f', age: 30, cm: 165, kg: 60, act: '1.55' }).tdee, (600 + 1031.25 - 150 - 161) * 1.55);
});
test('age: calendar difference and leap-day birthday', () => {
  const r = diff(new Date(1995, 5, 15), new Date(2026, 10, 15)); assert.deepEqual([r.y, r.m, r.d], [31, 5, 0]);
  const q = diff(new Date(2000, 0, 31), new Date(2000, 2, 1)); assert.deepEqual([q.y, q.m, q.d], [0, 1, 1]);
  assert.equal(diff(new Date(2024, 0, 1), new Date(2025, 0, 1)).days, 366);
  const nb = nextBirthday(new Date(2000, 1, 29), new Date(2026, 1, 1)); assert.equal(nb.date.getMonth(), 2); assert.equal(nb.date.getDate(), 1);
});
test('concrete: 20 × 10 ft at 4 in is 2.47 cubic yards', () => near(volume({ units: 'imperial', shape: 'slab', len: 20, wid: 10, thick: 4, qty: 1 }) / 0.764554858, 2.469, 0.001));
test('concrete: metric slab and round column', () => {
  near(volume({ units: 'metric', shape: 'slab', len: 6, wid: 3, thick: 10, qty: 1 }), 1.8);
  near(volume({ units: 'metric', shape: 'column', dia: 30, height: 1.2, qty: 2 }), Math.PI * 0.15 * 0.15 * 1.2 * 2);
});
test('solar: system covers the bill and payback is cost ÷ savings when prices are flat', () => {
  const s = solar({ bill: 150, price: 0.18, sun: 4.5, offset: 100, watt: 420, cost: 2.9, incent: 30, rise: 0, pr: 80 });
  assert.ok(s.gen >= s.yearKwh && s.gen < s.yearKwh * 1.08); assert.ok(s.payback > s.net / s.year1 - 0.01 && s.payback < s.net / s.year1 + 1);
});
