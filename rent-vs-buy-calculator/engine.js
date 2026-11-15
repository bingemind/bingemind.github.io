import { pmt, monthlyRate } from './fin.js';
import { homeRate, propertyTax, termYears, semiAnnual } from './geo.js';

export const spec = {
  slug: 'rent-vs-buy-calculator', title: 'Rent vs buy calculator',
  form: [
    { grid: [
      { id: 'price', label: 'Home price', type: 'money', usd: 400000, min: 1 },
      { id: 'rent', label: 'Monthly rent for a similar home', type: 'money', usd: 2200, min: 0 },
    ] },
    { grid: [
      { id: 'years', label: 'How long you will stay', type: 'number', suffix: 'years', def: 7, min: 1, max: 40 },
      { id: 'down', label: 'Down payment', type: 'number', suffix: '%', def: 20, min: 0, max: 100 },
    ] },
    { grid: [
      { id: 'rate', label: 'Mortgage rate', type: 'number', suffix: '%', def: (c) => homeRate(c.code), min: 0, max: 60 },
      { id: 'term', label: 'Mortgage term', type: 'select', options: [15, 20, 25, 30, 35].map((y) => [String(y), y + ' years']), def: (c) => String(termYears(c.code)) },
    ] },
    { adv: 'Growth rates and ownership costs', open: true, items: [
      { grid: [
        { id: 'appr', label: 'Home price growth', type: 'number', suffix: '% a year', def: 3, min: -20, max: 30 },
        { id: 'rentUp', label: 'Rent increase', type: 'number', suffix: '% a year', def: 3, min: -20, max: 30 },
      ] },
      { grid: [
        { id: 'inv', label: 'Return on invested savings', type: 'number', suffix: '% a year', def: 6, min: -20, max: 30 },
        { id: 'tax', label: 'Property tax', type: 'number', suffix: '% a year', def: (c) => propertyTax(c.code), min: 0, max: 10 },
      ] },
      { grid: [
        { id: 'maint', label: 'Maintenance', type: 'number', suffix: '% a year', def: 1, min: 0, max: 10 },
        { id: 'ins', label: 'Home insurance', type: 'money', usd: 1800, min: 0, hint: '(a year)' },
      ] },
      { grid: [
        { id: 'buyCost', label: 'Buying costs', type: 'number', suffix: '% of price', def: 3, min: 0, max: 20, hint: '(fees, stamp duty)' },
        { id: 'sellCost', label: 'Selling costs', type: 'number', suffix: '% of price', def: 6, min: 0, max: 20 },
      ] },
    ] },
  ],
};

// Month-by-month comparison. Whoever spends less each month invests the difference.
export function simulate(v, c = { code: 'US' }, months = Math.round(v.years) * 12) {
  const loan = v.price * (1 - v.down / 100), n = Number(v.term) * 12;
  const r = monthlyRate(v.rate, semiAnnual(c.code) ? 2 : 12, 12), pay = pmt(r, n, loan);
  const ri = Math.pow(1 + v.inv / 100, 1 / 12) - 1;
  let bal = loan, home = v.price, rent = v.rent, buyInv = 0, rentInv = v.price * v.down / 100 + v.price * v.buyCost / 100;
  const yearly = [];
  for (let m = 1; m <= months; m++) {
    const interest = bal * r, mPay = bal > 0.005 ? Math.min(pay, bal + interest) : 0;
    bal = Math.max(bal + interest - mPay, 0);
    const own = mPay + home * (v.tax + v.maint) / 100 / 12 + v.ins / 12;
    const diff = own - rent;
    buyInv = buyInv * (1 + ri) + Math.max(-diff, 0);
    rentInv = rentInv * (1 + ri) + Math.max(diff, 0);
    home *= Math.pow(1 + v.appr / 100, 1 / 12);
    if (m % 12 === 0) {
      rent *= 1 + v.rentUp / 100;
      yearly.push({ year: m / 12, buy: home * (1 - v.sellCost / 100) - bal + buyInv, rent: rentInv, own, rentPaid: rent });
    }
  }
  return { yearly, pay, loan };
}

export function compute(v, c) {
  const Y = Math.round(v.years), long = simulate(v, c, Math.max(Y, 30) * 12);
  const at = long.yearly[Y - 1];
  const adv = at.buy - at.rent;
  const be = long.yearly.find((y) => y.buy >= y.rent);
  const first = long.yearly[0];
  const show = long.yearly.slice(0, Math.max(Y, 10));
  return {
    big: { label: adv >= 0 ? 'Buying comes out ahead by' : 'Renting comes out ahead by', value: Math.abs(adv), kind: 'money0', side: `after ${Y} years` },
    kv: [
      ['Your wealth if you buy', at.buy, 'money0'], ['Your wealth if you rent', at.rent, 'money0'],
      ['Buying starts to win after', be ? be.year : 'over 30 years', be ? 'years' : 'text', true],
      ['Mortgage payment', long.pay], ['Rent in year 1', v.rent],
    ],
    chart: { title: 'Wealth after selling, by year', area: false, x: show.map((y) => 'Yr ' + y.year), series: [{ name: 'Buy', data: show.map((y) => y.buy), c: 0 }, { name: 'Rent and invest', data: show.map((y) => y.rent), c: 1 }] },
    table: { title: 'Year-by-year comparison', cols: [['Year', 'int'], ['Wealth if buying', 'money0'], ['Wealth if renting', 'money0'], ['Difference', 'money0']], rows: show.map((y) => [y.year, y.buy, y.rent, y.buy - y.rent]) },
    notes: [`Wealth if you buy = home value after selling costs − mortgage left + any monthly savings invested. Renting assumes you invest the down payment and buying costs instead.`],
  };
}
