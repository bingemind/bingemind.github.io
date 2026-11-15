import { monthsFromNow } from './fin.js';
import { cardRate, personalRate, carRate } from './geo.js';

const ITEM = [
  { id: 'name', label: 'Name', type: 'text', max: 30 },
  { id: 'bal', label: 'Balance', type: 'money', min: 0 },
  { id: 'apr', label: 'Rate', type: 'number', suffix: '%', min: 0, max: 100 },
  { id: 'min', label: 'Minimum', type: 'money', min: 0 },
];
export const spec = {
  slug: 'debt-payoff-calculator', title: 'Debt payoff calculator',
  form: [
    { id: 'debts', type: 'list', label: 'Your debts', itemLabel: 'Debt', addLabel: 'Add a debt', max: 15, item: ITEM,
      def: (c) => [
        { name: 'Credit card', bal: c.amt(6000), apr: cardRate(c.code), min: c.amt(180) },
        { name: 'Car loan', bal: c.amt(12000), apr: carRate(c.code), min: c.amt(350) },
        { name: 'Personal loan', bal: c.amt(4000), apr: personalRate(c.code), min: c.amt(140) },
      ],
      blank: () => ({ name: '', bal: 0, apr: 0, min: 0 }) },
    { id: 'extra', label: 'Extra you can pay each month', type: 'money', usd: 200, min: 0, hint: '(on top of the minimums)' },
    { id: 'method', label: 'Method', type: 'seg', options: [['avalanche', 'Avalanche: highest rate'], ['snowball', 'Snowball: smallest balance'], ['custom', 'Your order: as listed']], def: 'avalanche' },
  ],
};

// Simulate paying debts month by month. rollover=true keeps the total budget fixed (freed minimums go to the next debt).
export function payoff(debts, extra, method, rollover = true, cap = 600) {
  const ds = debts.map((d, i) => ({ i, name: d.name || `Debt ${i + 1}`, bal: d.bal, apr: d.apr, min: d.min, paidOff: null, interest: 0 }));
  const budget = ds.reduce((s, d) => s + d.min, 0) + extra;
  const order = method === 'custom' ? [...ds] : [...ds].sort((a, b) => (method === 'snowball' ? a.bal - b.bal || b.apr - a.apr : b.apr - a.apr || a.bal - b.bal));
  let month = 0, totalInt = 0, totalPaid = 0;
  const series = [ds.reduce((s, d) => s + d.bal, 0)];
  while (ds.some((d) => d.bal > 0.005) && month < cap) {
    month++;
    for (const d of ds) if (d.bal > 0.005) { const i = d.bal * d.apr / 1200; d.bal += i; d.interest += i; totalInt += i; }
    let left = rollover ? budget : Infinity;
    for (const d of ds) if (d.bal > 0.005) { const p = Math.min(d.min, d.bal, left); d.bal -= p; left -= p; totalPaid += p; }
    if (rollover) for (const d of order) { if (left <= 0.005) break; if (d.bal > 0.005) { const p = Math.min(d.bal, left); d.bal -= p; left -= p; totalPaid += p; } }
    for (const d of ds) if (d.bal <= 0.005 && d.paidOff == null) { d.bal = 0; d.paidOff = month; }
    series.push(ds.reduce((s, d) => s + Math.max(d.bal, 0), 0));
    if (month > 2 && series[month] >= series[month - 1] - 0.01) { month = Infinity; break; }
  }
  return { months: ds.every((d) => d.bal <= 0.005) ? month : Infinity, totalInt, totalPaid, ds, order, series, budget };
}

export function compute(v, c) {
  const debts = v.debts.filter((d) => d.bal > 0);
  if (!debts.length) return { error: 'Add at least one debt with a balance.', big: { label: 'Debt-free in' } };
  const p = payoff(debts, v.extra, v.method);
  if (!Number.isFinite(p.months)) return { error: 'These payments do not cover the interest, so the debt never gets paid off. Raise the minimums or the extra payment.', big: { label: 'Debt-free in' } };
  const otherM = v.method === 'avalanche' ? 'snowball' : 'avalanche';
  const other = payoff(debts, v.extra, otherM);
  const minOnly = payoff(debts, 0, v.method, false);
  const step = p.series.length > 61 ? 3 : 1;
  const xs = [], ys = [];
  p.series.forEach((b, i) => { if (i % step === 0 || i === p.series.length - 1) { xs.push(i === 0 ? 'Now' : 'Mo ' + i); ys.push(b); } });
  const otherName = otherM === 'snowball' ? 'Snowball' : 'Avalanche';
  return {
    big: { label: 'Debt-free in', value: p.months, kind: 'months', side: monthsFromNow(p.months, c.locale) },
    kv: [
      ['Total debt', p.series[0], 'money0'], ['Monthly budget', p.budget],
      ['Total interest', p.totalInt, 'money', true], ['Total you will pay', p.totalPaid, 'money0'],
      [`${otherName} method would take`, other.months, 'months'],
      [`${otherName} interest`, other.totalInt, 'money'],
      ['Minimums only would take', minOnly.months, 'months'],
      ['Interest saved vs minimums only', Number.isFinite(minOnly.totalInt) ? minOnly.totalInt - p.totalInt : NaN, 'money', true],
    ],
    chart: { title: 'Total debt over time', x: xs, series: [{ name: 'Debt left', data: ys }] },
    table: { title: 'Payoff order', open: true, cols: [['Debt', 'text'], ['Balance', 'money0'], ['Rate', 'pct'], ['Paid off in', 'months'], ['Interest paid', 'money']], rows: [...p.ds].sort((a, b) => a.paidOff - b.paidOff).map((d) => [d.name, debts[d.i].bal, d.apr, d.paidOff, d.interest]) },
  };
}
