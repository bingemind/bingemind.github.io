import { pmt, amortize, yearly, monthsFromNow } from './fin.js';
import { carRate } from './geo.js';

export const spec = {
  slug: 'auto-loan-calculator', title: 'Auto loan calculator',
  form: [
    { id: 'price', label: 'Vehicle price', type: 'money', usd: 35000, min: 0 },
    { grid: [
      { id: 'down', label: 'Down payment', type: 'money', usd: 5000, min: 0 },
      { id: 'trade', label: 'Trade-in value', type: 'money', def: 0, min: 0 },
    ] },
    { grid: [
      { id: 'rate', label: 'Interest rate (APR)', type: 'number', suffix: '%', def: (c) => carRate(c.code), min: 0, max: 60 },
      { id: 'term', label: 'Loan term', type: 'select', options: [24, 36, 48, 60, 72, 84, 96].map((m) => [String(m), `${m} months (${m / 12} yr)`]), def: '60' },
    ] },
    { adv: 'Sales tax, fees and trade-in payoff', items: [
      { grid: [
        { id: 'tax', label: 'Sales tax', type: 'number', suffix: '%', def: (c) => (c.code === 'US' ? 7 : 0), min: 0, max: 40, hint: '(0 if tax is in the price)' },
        { id: 'fees', label: 'Dealer and registration fees', type: 'money', usd: 600, min: 0 },
      ] },
      { grid: [
        { id: 'owed', label: 'Still owed on trade-in', type: 'money', def: 0, min: 0 },
        { id: 'wrap', label: 'Tax and fees', type: 'select', options: [['loan', 'Add to the loan'], ['cash', 'Pay upfront']], def: 'loan' },
      ] },
    ] },
  ],
};

export function autoLoan(v) {
  // Most US states tax the price minus the trade-in credit.
  const taxAmt = Math.max(v.price - v.trade, 0) * v.tax / 100;
  const extras = taxAmt + v.fees;
  const financed = Math.max(v.price - v.down - v.trade + v.owed + (v.wrap === 'loan' ? extras : 0), 0);
  const n = Number(v.term), r = v.rate / 1200;
  const pay = pmt(r, n, financed);
  const sch = amortize(financed, r, n, pay);
  const upfront = v.down + (v.wrap === 'cash' ? extras : 0);
  return { taxAmt, extras, financed, n, r, pay, sch, upfront, totalCost: upfront + sch.totalPaid + v.trade };
}

export function compute(v, c) {
  const a = autoLoan(v);
  if (a.financed <= 0) return { big: { label: 'Monthly payment', value: 0, kind: 'money', side: 'Nothing to finance' }, kv: [['Cash you pay upfront', a.upfront + a.extras * (v.wrap === 'loan' ? 1 : 0)]], notes: ['Your down payment and trade-in cover the whole price.'] };
  const ys = yearly(a.sch.rows);
  const terms = [36, 48, 60, 72, 84].map((m) => { const p = pmt(a.r, m, a.financed); return [m, p, p * m - a.financed]; });
  const kv = [
    ['Amount financed', a.financed, 'money', true], ['Total interest', a.sch.totalInterest, 'money', true],
    ['Sales tax', a.taxAmt], ['Paid upfront', a.upfront], ['Total cost of the car', a.totalCost, 'money0'],
    ['Paid off', monthsFromNow(a.n, c.locale), 'text'],
  ];
  const ltv = a.financed / Math.max(v.price, 1) * 100;
  return {
    big: { label: 'Monthly payment', value: a.pay, kind: 'money', side: `${v.term} months at ${v.rate}%` },
    bars: [['Principal', a.financed], ['Interest', a.sch.totalInterest]],
    kv,
    chart: { title: 'Loan balance by year', x: ['Start', ...ys.map((y) => 'Yr ' + y.year)], series: [{ name: 'Balance', data: [a.financed, ...ys.map((y) => y.balance)] }] },
    table: { title: 'Yearly amortization schedule', cols: [['Year', 'int'], ['Interest', 'money'], ['Principal', 'money'], ['Balance', 'money']], rows: ys.map((y) => [y.year, y.interest, y.principal, y.balance]) },
    tables: [{ title: 'Compare loan lengths', open: true, cols: [['Months', 'int'], ['Monthly', 'money'], ['Total interest', 'money0']], rows: terms }],
    warn: ltv > 100 ? `You are borrowing ${Math.round(ltv)}% of the car’s price, so you will owe more than it is worth at the start (negative equity).` : (Number(v.term) > 72 ? 'Loans longer than 72 months cost much more interest and often leave you owing more than the car is worth.' : ''),
  };
}
