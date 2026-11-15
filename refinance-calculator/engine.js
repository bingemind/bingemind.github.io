import { pmt } from './fin.js';
import { homeRate } from './geo.js';

export const spec = {
  slug: 'refinance-calculator', title: 'Refinance calculator',
  form: [
    { id: 'bal', label: 'Current loan balance', type: 'money', usd: 280000, min: 1 },
    { grid: [
      { id: 'cur', label: 'Current rate', type: 'number', suffix: '%', def: (c) => Math.round((homeRate(c.code) + 1) * 10) / 10, min: 0, max: 60 },
      { id: 'left', label: 'Years left on the loan', type: 'number', suffix: 'years', def: 27, min: 0.5, max: 40 },
    ] },
    { grid: [
      { id: 'nrate', label: 'New rate', type: 'number', suffix: '%', def: (c) => homeRate(c.code), min: 0, max: 60 },
      { id: 'nterm', label: 'New term', type: 'select', options: [10, 15, 20, 25, 30].map((y) => [String(y), y + ' years']), def: '30' },
    ] },
    { grid: [
      { id: 'costs', label: 'Closing costs and fees', type: 'money', usd: 5000, min: 0 },
      { id: 'roll', label: 'Pay the costs', type: 'select', options: [['cash', 'Upfront in cash'], ['loan', 'Add to the new loan']], def: 'cash' },
    ] },
  ],
};

export function refi(v) {
  const n0 = Math.round(v.left * 12), n1 = Number(v.nterm) * 12;
  const curPay = pmt(v.cur / 1200, n0, v.bal);
  const newBal = v.bal + (v.roll === 'loan' ? v.costs : 0);
  const newPay = pmt(v.nrate / 1200, n1, newBal);
  const save = curPay - newPay;
  const curTotal = curPay * n0, newTotal = newPay * n1 + (v.roll === 'cash' ? v.costs : 0);
  // Break-even: months until cumulative savings pay back the costs.
  const breakEven = save > 0 ? v.costs / save : Infinity;
  return { n0, n1, curPay, newPay, newBal, save, curInt: curTotal - v.bal, newInt: newPay * n1 - newBal, curTotal, newTotal, net: curTotal - newTotal, breakEven };
}

export function compute(v) {
  const r = refi(v);
  const horizon = Math.max(r.n0, r.n1), step = 12, x = [], a = [], b = [];
  for (let m = 0; m <= horizon; m += step) {
    x.push(m === 0 ? 'Now' : 'Yr ' + m / 12);
    a.push(Math.min(m, r.n0) * r.curPay);
    b.push(Math.min(m, r.n1) * r.newPay + (v.roll === 'cash' ? v.costs : 0));
  }
  const kv = [
    ['Current payment', r.curPay], ['New payment', r.newPay],
    ['Break-even point', r.breakEven, 'months', true],
    ['Interest left on current loan', r.curInt, 'money0'], ['Interest on new loan', r.newInt, 'money0'],
    [r.net >= 0 ? 'Lifetime savings' : 'Lifetime extra cost', Math.abs(r.net), 'money0', true],
  ];
  let warn = '';
  if (r.save <= 0) warn = 'The new payment is not lower, so refinancing only makes sense if you want a shorter term or to switch rate type.';
  else if (r.net < 0) warn = `Your payment falls, but restarting a ${v.nterm}-year term costs more in total. A shorter new term or extra payments keep the savings.`;
  return {
    big: { label: r.save >= 0 ? 'Monthly savings' : 'Monthly increase', value: Math.abs(r.save), kind: 'money', side: `${v.cur}% → ${v.nrate}%` },
    kv, warn,
    chart: { title: 'Total paid from today', area: false, x, series: [{ name: 'Keep current loan', data: a, c: 2 }, { name: 'Refinance', data: b, c: 0 }] },
    notes: Number.isFinite(r.breakEven) ? [`If you keep the home at least ${Math.ceil(r.breakEven)} months, the lower payment pays back the costs.`] : [],
  };
}
