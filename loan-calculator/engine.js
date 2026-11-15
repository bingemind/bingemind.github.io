import { pmt, amortize, yearly, rateFor, monthsFromNow } from './fin.js';
import { personalRate } from './geo.js';

const FREQ = { 12: 'Monthly', 26: 'Every two weeks', 52: 'Weekly' };
export const spec = {
  slug: 'loan-calculator', title: 'Loan calculator',
  form: [
    { id: 'amount', label: 'Loan amount', type: 'money', usd: 20000, min: 1 },
    { grid: [
      { id: 'rate', label: 'Interest rate', type: 'number', suffix: '% a year', def: (c) => personalRate(c.code), min: 0, max: 100 },
      { id: 'years', label: 'Loan term', type: 'number', suffix: 'years', def: 5, min: 0.25, max: 50 },
    ] },
    { id: 'freq', label: 'Payments', type: 'seg', options: [['12', 'Monthly'], ['26', 'Biweekly'], ['52', 'Weekly']], def: '12' },
    { adv: 'Fees and extra payments', items: [
      { grid: [
        { id: 'fee', label: 'Upfront fee', type: 'number', suffix: '% of loan', def: 0, min: 0, max: 20, hint: '(origination or processing)' },
        { id: 'extra', label: 'Extra per payment', type: 'money', def: 0, min: 0 },
      ] },
    ] },
  ],
};

export function loan(v) {
  const k = Number(v.freq), n = Math.round(v.years * k), r = v.rate / 100 / k;
  const pay = pmt(r, n, v.amount);
  const base = amortize(v.amount, r, n, pay, 0);
  const fast = v.extra > 0 ? amortize(v.amount, r, n, pay, v.extra) : base;
  const feeAmt = v.amount * v.fee / 100;
  // APR: the rate at which the payments repay only the money you actually received.
  const apr = feeAmt > 0 ? rateFor(v.amount - feeAmt, pay, n) * k * 100 : v.rate;
  return { k, n, r, pay, base, fast, feeAmt, apr };
}

export function compute(v, c) {
  const L = loan(v);
  const label = { 12: 'Monthly payment', 26: 'Biweekly payment', 52: 'Weekly payment' }[L.k];
  const ys = yearly(L.fast.rows, L.k);
  const kv = [
    ['Total interest', L.fast.totalInterest, 'money', true], ['Total of payments', L.fast.totalPaid],
    ['Number of payments', L.fast.months, 'int'], ['Paid off', monthsFromNow(L.fast.months * 12 / L.k, c.locale), 'text'],
  ];
  if (L.feeAmt > 0) kv.push(['Upfront fee', L.feeAmt], ['You receive', v.amount - L.feeAmt], ['APR including the fee', L.apr, 'pct', true]);
  if (v.extra > 0) kv.push(['Interest saved by extra payments', L.base.totalInterest - L.fast.totalInterest, 'money', true], ['Payments saved', L.base.months - L.fast.months, 'int']);
  const terms = [1, 2, 3, 4, 5, 7, 10].map((y) => { const n = y * L.k, p = pmt(L.r, n, v.amount); return [y, p, p * n - v.amount]; });
  return {
    big: { label, value: L.pay + v.extra, kind: 'money', side: `${FREQ[L.k]} for ${v.years} years` },
    bars: [['Principal', v.amount], ['Interest', L.fast.totalInterest], ['Fee', L.feeAmt]].filter((b) => b[1] > 0.004),
    kv,
    chart: { title: 'Balance by year', x: ['Start', ...ys.map((y) => 'Yr ' + y.year)], series: [{ name: 'Balance', data: [v.amount, ...ys.map((y) => y.balance)] }] },
    table: { title: 'Yearly amortization schedule', cols: [['Year', 'int'], ['Interest', 'money'], ['Principal', 'money'], ['Balance', 'money']], rows: ys.map((y) => [y.year, y.interest, y.principal, y.balance]) },
    tables: [{ title: 'Compare loan terms at this rate', cols: [['Years', 'int'], [label, 'money'], ['Total interest', 'money0']], rows: terms }],
  };
}
