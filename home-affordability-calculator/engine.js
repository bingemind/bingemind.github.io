import { pmt, monthlyRate } from './fin.js';
import { homeRate, propertyTax, termYears, semiAnnual } from './geo.js';

const MULT = { GB: 4.5, IE: 4 };
const DTI = { US: [28, 36], CA: [32, 40], AU: [30, 40], NZ: [30, 40], IN: [40, 50] };
export const spec = {
  slug: 'home-affordability-calculator', title: 'Home affordability calculator',
  form: [
    { grid: [
      { id: 'income', label: 'Household income before tax', type: 'money', usd: 100000, min: 0, hint: '(a year)' },
      { id: 'debts', label: 'Other debt payments', type: 'money', usd: 500, min: 0, hint: '(a month)' },
    ] },
    { grid: [
      { id: 'down', label: 'Down payment saved', type: 'money', usd: 60000, min: 0 },
      { id: 'rate', label: 'Interest rate', type: 'number', suffix: '%', def: (c) => homeRate(c.code), min: 0, max: 60 },
    ] },
    { id: 'method', label: 'Lender test', type: 'select', options: [['dti', 'Debt-to-income ratios (US, Canada, Australia, India)'], ['mult', 'Income multiple (UK, Ireland)']], def: (c) => (MULT[c.code] ? 'mult' : 'dti') },
    { grid: [
      { id: 'front', label: 'Housing cost limit', type: 'number', suffix: '% of income', def: (c) => (DTI[c.code] || [30, 40])[0], min: 5, max: 70, when: (v) => v.method === 'dti' },
      { id: 'back', label: 'All debts limit', type: 'number', suffix: '% of income', def: (c) => (DTI[c.code] || [30, 40])[1], min: 5, max: 80, when: (v) => v.method === 'dti' },
    ] },
    { id: 'mult', label: 'Income multiple', type: 'number', suffix: '× income', def: (c) => MULT[c.code] || 4.5, min: 1, max: 10, when: (v) => v.method === 'mult' },
    { adv: 'Term, taxes and insurance', items: [
      { grid: [
        { id: 'term', label: 'Loan term', type: 'select', options: [15, 20, 25, 30, 35].map((y) => [String(y), y + ' years']), def: (c) => String(termYears(c.code)) },
        { id: 'tax', label: 'Property tax', type: 'number', suffix: '% a year', def: (c) => propertyTax(c.code), min: 0, max: 10 },
      ] },
      { grid: [
        { id: 'ins', label: 'Home insurance', type: 'money', usd: 1800, min: 0, hint: '(a year)' },
        { id: 'hoa', label: 'HOA or service charge', type: 'money', def: 0, min: 0, hint: '(a month)' },
      ] },
    ] },
  ],
};

export function afford(v, c = { code: 'US' }) {
  const M = v.income / 12, n = Number(v.term) * 12;
  const r = monthlyRate(v.rate, semiAnnual(c.code) ? 2 : 12, 12);
  const k = pmt(r, n, 1), t = v.tax / 100 / 12, fixed = v.ins / 12 + v.hoa;
  let loan, limitBy;
  if (v.method === 'mult') { loan = v.income * v.mult; limitBy = `${v.mult} × income`; }
  else {
    const byFront = M * v.front / 100, byBack = M * v.back / 100 - v.debts;
    const H = Math.min(byFront, byBack);
    limitBy = byFront <= byBack ? `housing limit (${v.front}%)` : `all-debts limit (${v.back}%)`;
    loan = (H - fixed - v.down * t) / (k + t);
  }
  loan = Math.max(loan, 0);
  const price = loan + v.down;
  const pi = loan * k, taxM = price * t, total = pi + taxM + fixed;
  return { loan, price, pi, taxM, total, limitBy, share: M ? total / M * 100 : 0, dti: M ? (total + v.debts) / M * 100 : 0 };
}

export function compute(v, c) {
  const a = afford(v, c);
  const rows = [-1, -0.5, 0, 0.5, 1].map((d) => { const x = afford({ ...v, rate: Math.max(v.rate + d, 0) }, c); return [Math.max(v.rate + d, 0), x.price, x.total]; });
  return {
    big: { label: 'You could afford about', value: a.price, kind: 'money0', side: `limited by ${a.limitBy}` },
    bars: [['Principal and interest', a.pi], ['Property tax', a.taxM], ['Insurance', v.ins / 12], ['HOA', v.hoa]].filter((b) => b[1] > 0.004),
    kv: [
      ['Loan amount', a.loan, 'money0'], ['Down payment', v.down, 'money0'],
      ['Monthly housing payment', a.total, 'money', true],
      ['Housing cost / income', a.share, 'pct1'], ['All debts / income', a.dti, 'pct1'],
      ['Down payment share', a.price ? v.down / a.price * 100 : 0, 'pct1'],
    ],
    tables: [{ title: 'If the rate changes', open: true, cols: [['Rate', 'pct'], ['Home price', 'money0'], ['Monthly payment', 'money0']], rows }],
    warn: a.loan <= 0 ? 'Your debts and costs already use the whole limit, so the lender test leaves no room for a loan.' : '',
  };
}
