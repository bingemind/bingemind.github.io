import { monthlyRate } from './fin.js';
import { inflation } from './geo.js';

export const spec = {
  slug: 'compound-interest-calculator', title: 'Compound interest calculator',
  form: [
    { grid: [
      { id: 'start', label: 'Starting amount', type: 'money', usd: 10000, min: 0 },
      { id: 'monthly', label: 'Monthly contribution', type: 'money', usd: 500, min: 0 },
    ] },
    { grid: [
      { id: 'rate', label: 'Interest rate', type: 'number', suffix: '% a year', def: 7, min: -50, max: 100 },
      { id: 'years', label: 'Years', type: 'number', suffix: 'years', def: 20, min: 1, max: 100 },
    ] },
    { id: 'comp', label: 'Compounding', type: 'select', options: [['1', 'Yearly'], ['2', 'Twice a year'], ['4', 'Quarterly'], ['12', 'Monthly'], ['365', 'Daily']], def: '12' },
    { adv: 'Inflation, contribution increases and timing', items: [
      { grid: [
        { id: 'grow', label: 'Raise contributions each year by', type: 'number', suffix: '%', def: 0, min: 0, max: 50 },
        { id: 'infl', label: 'Inflation', type: 'number', suffix: '% a year', def: (c) => inflation(c.code), min: 0, max: 200 },
      ] },
      { id: 'when', label: 'Contributions made', type: 'select', options: [['end', 'End of each month'], ['start', 'Start of each month']], def: 'end' },
    ] },
  ],
};

export function grow(v) {
  const r = monthlyRate(v.rate, Number(v.comp), 12);
  let bal = v.start, dep = v.monthly, paid = v.start;
  const years = [];
  for (let y = 1; y <= Math.round(v.years); y++) {
    let yDep = 0, yInt = 0;
    for (let m = 0; m < 12; m++) {
      if (v.when === 'start') { bal += dep; yDep += dep; }
      const i = bal * r; bal += i; yInt += i;
      if (v.when !== 'start') { bal += dep; yDep += dep; }
    }
    paid += yDep;
    years.push({ year: y, deposits: yDep, interest: yInt, balance: bal, paid });
    dep *= 1 + v.grow / 100;
  }
  return { years, balance: bal, paid, interest: bal - paid };
}

export function compute(v) {
  const g = grow(v);
  const real = g.balance / Math.pow(1 + v.infl / 100, Math.round(v.years));
  const apy = (Math.pow(1 + monthlyRate(v.rate, Number(v.comp), 12), 12) - 1) * 100;
  const dbl = v.rate > 0 ? Math.log(2) / Math.log(1 + apy / 100) : Infinity;
  return {
    big: { label: 'Future value', value: g.balance, kind: 'money0', side: `after ${Math.round(v.years)} years` },
    bars: [['Starting amount', v.start], ['Contributions', g.paid - v.start], ['Interest earned', Math.max(g.interest, 0)]].filter((b) => b[1] > 0.004),
    kv: [
      ['Total you put in', g.paid, 'money0'], ['Interest earned', g.interest, 'money0', true],
      [`Worth in today’s money (${v.infl}% inflation)`, real, 'money0'],
      ['Effective yearly rate (APY)', apy, 'pct'], ['Money doubles about every', dbl, 'years'],
    ],
    chart: { title: 'Growth by year', x: ['Now', ...g.years.map((y) => 'Yr ' + y.year)], series: [
      { name: 'Balance', data: [v.start, ...g.years.map((y) => y.balance)] },
      { name: 'Money put in', data: [v.start, ...g.years.map((y) => y.paid)], c: 1 },
    ] },
    table: { title: 'Year-by-year growth', cols: [['Year', 'int'], ['Contributions', 'money0'], ['Interest', 'money0'], ['Balance', 'money0']], rows: g.years.map((y) => [y.year, y.deposits, y.interest, y.balance]) },
  };
}
