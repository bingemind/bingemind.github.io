import { fv, monthlyRate } from './fin.js';
import { inflation } from './geo.js';

const RETIRE_AGE = { US: 67, GB: 67, CA: 65, AU: 67, DE: 67, FR: 64, IN: 60, JP: 65, IE: 66, NZ: 65 };
export const spec = {
  slug: 'retirement-calculator', title: 'Retirement calculator',
  form: [
    { grid: [
      { id: 'age', label: 'Your age', type: 'number', suffix: 'years', def: 35, min: 15, max: 90 },
      { id: 'retire', label: 'Retire at', type: 'number', suffix: 'years', def: (c) => RETIRE_AGE[c.code] || 65, min: 30, max: 90 },
    ] },
    { grid: [
      { id: 'saved', label: 'Saved so far', type: 'money', usd: 50000, min: 0 },
      { id: 'monthly', label: 'You save each month', type: 'money', usd: 800, min: 0, hint: '(include employer match)' },
    ] },
    { grid: [
      { id: 'income', label: 'Income you want in retirement', type: 'money', usd: 60000, min: 0, hint: '(a year, today’s money)' },
      { id: 'other', label: 'Pension or social security', type: 'money', usd: 20000, min: 0, hint: '(a year, today’s money)' },
    ] },
    { adv: 'Returns, inflation and life expectancy', items: [
      { grid: [
        { id: 'pre', label: 'Return before retiring', type: 'number', suffix: '% a year', def: 7, min: -10, max: 30 },
        { id: 'post', label: 'Return after retiring', type: 'number', suffix: '% a year', def: 5, min: -10, max: 30 },
      ] },
      { grid: [
        { id: 'infl', label: 'Inflation', type: 'number', suffix: '% a year', def: (c) => inflation(c.code), min: 0, max: 50 },
        { id: 'life', label: 'Plan until age', type: 'number', suffix: 'years', def: 90, min: 50, max: 115 },
      ] },
    ] },
  ],
};

// Present value, at retirement, of withdrawals that grow with inflation for N years (paid at the start of each year).
export function nestEgg(firstYear, post, infl, N) {
  const rr = (1 + post / 100) / (1 + infl / 100) - 1;
  if (N <= 0 || firstYear <= 0) return 0;
  if (Math.abs(rr) < 1e-9) return firstYear * N;
  return firstYear * (1 - Math.pow(1 + rr, -N)) / rr * (1 + rr);
}

export function plan(v) {
  const yrs = Math.max(v.retire - v.age, 0), n = yrs * 12, r = monthlyRate(v.pre, 12, 12);
  const projected = fv(r, n, v.saved, v.monthly);
  const g = Math.pow(1 + v.infl / 100, yrs);
  const shortfall = Math.max(v.income - v.other, 0) * g; // first retirement year, in future money
  const needed = nestEgg(shortfall, v.post, v.infl, v.life - v.retire);
  const gap = needed - projected;
  const fvAnn = Math.abs(r) < 1e-12 ? n : (Math.pow(1 + r, n) - 1) / r;
  const extraMonthly = gap > 0 && n > 0 ? gap / fvAnn : 0;
  // Year-by-year path from now to the planning age.
  const path = []; let bal = v.saved, w = shortfall, lastsTo = null;
  for (let age = v.age; age <= v.life; age++) {
    path.push({ age, bal: Math.max(bal, 0) });
    if (age < v.retire) bal = fv(r, 12, bal, v.monthly);
    else { bal = (bal - w) * (1 + v.post / 100); w *= 1 + v.infl / 100; if (bal < 0 && lastsTo == null) lastsTo = age + 1; }
  }
  return { yrs, projected, needed, gap, extraMonthly, path, lastsTo, today: projected / g, shortfall };
}

export function compute(v) {
  if (v.retire <= v.age) return { error: 'Set a retirement age above your current age.', big: { label: 'Savings at retirement' } };
  if (v.life <= v.retire) return { error: 'Plan until an age after you retire.', big: { label: 'Savings at retirement' } };
  const p = plan(v);
  const ok = p.gap <= 0;
  return {
    big: { label: 'Savings at retirement', value: p.projected, kind: 'money0', side: `at age ${v.retire}, in ${p.yrs} years` },
    sub: ok ? `On track: this covers your income goal until age ${v.life}.` : 'At this rate you may run short. The extra monthly saving that closes the gap is shown below.',
    kv: [
      ['Nest egg you need at retirement', p.needed, 'money0', true],
      [ok ? 'Surplus' : 'Gap', Math.abs(p.gap), 'money0', true],
      ['Extra to save each month to close the gap', p.extraMonthly, 'money0'],
      ['Money lasts until age', p.lastsTo ? p.lastsTo : `${v.life}+`, p.lastsTo ? 'int' : 'text'],
      ['Savings at retirement in today’s money', p.today, 'money0'],
      ['First-year withdrawal needed', p.shortfall, 'money0'],
    ],
    chart: { title: 'Savings by age', x: p.path.map((x) => String(x.age)), series: [{ name: 'Savings', data: p.path.map((x) => x.bal) }] },
    table: { title: 'Savings by age', cols: [['Age', 'int'], ['Balance', 'money0']], rows: p.path.map((x) => [x.age, x.bal]) },
  };
}
