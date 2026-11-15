import { pmt, monthlyRate, amortize, yearly, monthsFromNow } from './fin.js';
import { homeRate, propertyTax, usesPMI, semiAnnual, termYears } from './geo.js';

export const spec = {
  slug: 'mortgage-calculator', title: 'Mortgage calculator',
  form: [
    { id: 'price', label: 'Home price', type: 'money', usd: 400000, min: 1 },
    { grid: [
      { id: 'down', label: 'Down payment', type: 'number', suffix: '%', def: 20, min: 0, max: 100 },
      { id: 'rate', label: 'Interest rate', type: 'number', suffix: '% a year', def: (c) => homeRate(c.code), min: 0, max: 60 },
    ] },
    { grid: [
      { id: 'term', label: 'Loan term', type: 'select', options: [5, 10, 15, 20, 25, 30, 35, 40].map((y) => [String(y), y + ' years']), def: (c) => String(termYears(c.code)) },
      { id: 'comp', label: 'Interest compounds', type: 'select', options: [['12', 'Monthly (most countries)'], ['2', 'Twice a year (Canada fixed)']], def: (c) => (semiAnnual(c.code) ? '2' : '12') },
    ] },
    { adv: 'Taxes, insurance and extra payments', open: true, items: [
      { grid: [
        { id: 'tax', label: 'Property tax', type: 'number', suffix: '% a year', def: (c) => propertyTax(c.code), min: 0, max: 10, hint: '(of home price)' },
        { id: 'ins', label: 'Home insurance', type: 'money', usd: 1800, min: 0, hint: '(a year)' },
      ] },
      { grid: [
        { id: 'pmi', label: 'Mortgage insurance', type: 'number', suffix: '% a year', def: (c) => (usesPMI(c.code) ? 0.5 : 0), min: 0, max: 5, hint: '(PMI below 20% down)' },
        { id: 'hoa', label: 'HOA or service charge', type: 'money', def: 0, min: 0, hint: '(a month)' },
      ] },
      { id: 'extra', label: 'Extra payment each month', type: 'money', def: 0, min: 0, hint: '(optional)' },
    ] },
  ],
};

export function mortgage(v) {
  const price = v.price, loan = price * (1 - v.down / 100);
  const n = Number(v.term) * 12;
  const r = monthlyRate(v.rate, Number(v.comp), 12);
  const pi = pmt(r, n, loan);
  const base = amortize(loan, r, n, pi, 0);
  const fast = v.extra > 0 ? amortize(loan, r, n, pi, v.extra) : base;
  // PMI is charged while the balance is above 80% of the price and drops automatically at 78% (US Homeowners Protection Act).
  const hasPmi = v.pmi > 0 && loan > price * 0.8;
  const pmiMonthly = hasPmi ? loan * v.pmi / 100 / 12 : 0;
  let pmiMonths = 0;
  if (hasPmi) { const i = fast.rows.findIndex((x) => x.balance <= price * 0.78); pmiMonths = i < 0 ? fast.months : i + 1; }
  const tax = price * v.tax / 100 / 12, ins = v.ins / 12;
  return { loan, n, r, pi, base, fast, pmiMonthly, pmiMonths, tax, ins, total: pi + tax + ins + pmiMonthly + v.hoa };
}

export function compute(v, c) {
  if (v.down >= 100) return { error: 'With 100% down there is no loan. Lower the down payment.', big: { label: 'Monthly payment' } };
  const m = mortgage(v);
  const years = yearly(m.fast.rows), baseYears = yearly(m.base.rows);
  const kv = [
    ['Loan amount', m.loan], ['Down payment', v.price - m.loan],
    ['Total interest', m.fast.totalInterest, 'money0', true], ['Total of loan payments', m.fast.totalPaid, 'money0'],
    ['Loan paid off', monthsFromNow(m.fast.months, c.locale), 'text'],
  ];
  if (v.extra > 0) {
    kv.push(['Interest saved by extra payments', m.base.totalInterest - m.fast.totalInterest, 'money0', true]);
    kv.push(['Time saved', m.base.months - m.fast.months, 'months']);
  }
  if (m.pmiMonthly) kv.push(['Mortgage insurance stops after', m.pmiMonths, 'months']);
  const chart = {
    title: 'Loan balance by year', fmt: 'money0',
    x: baseYears.map((y) => 'Yr ' + y.year),
    series: [{ name: v.extra > 0 ? 'Balance with extra payments' : 'Loan balance', data: baseYears.map((_, i) => (years[i] ? years[i].balance : 0)) }],
  };
  if (v.extra > 0) chart.series.push({ name: 'Balance without extra', data: baseYears.map((y) => y.balance), c: 2, dash: true });
  let cum = 0;
  chart.series.push({ name: 'Interest paid so far', data: baseYears.map((_, i) => (cum += years[i] ? years[i].interest : 0)), c: 1 });
  return {
    big: { label: 'Monthly payment', value: m.total, kind: 'money', side: `${v.term}-year loan at ${v.rate}%` },
    bars: [['Principal and interest', m.pi], ['Property tax', m.tax], ['Home insurance', m.ins], ['Mortgage insurance', m.pmiMonthly], ['HOA / service charge', v.hoa]].filter((b) => b[1] > 0.004),
    kv, chart,
    table: { title: 'Yearly amortization schedule', cols: [['Year', 'int'], ['Interest', 'money0'], ['Principal', 'money0'], ['Balance', 'money0']], rows: years.map((y) => [y.year, y.interest, y.principal, y.balance]) },
    notes: v.extra > 0 ? [] : ['Tip: add an extra monthly payment above to see how much interest and time you save.'],
  };
}
