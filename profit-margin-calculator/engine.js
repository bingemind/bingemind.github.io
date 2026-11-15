export const spec = {
  slug: 'profit-margin-calculator', title: 'Profit margin calculator',
  form: [
    { id: 'mode', label: 'I know', type: 'select', options: [['price', 'Cost and selling price'], ['margin', 'Cost and the margin I want'], ['markup', 'Cost and the markup I want']], def: 'price' },
    { id: 'cost', label: 'Cost per item', type: 'money', usd: 60, min: 0 },
    { id: 'price', label: 'Selling price', type: 'money', usd: 100, min: 0, when: (v) => v.mode === 'price' },
    { id: 'margin', label: 'Target margin', type: 'number', suffix: '%', def: 40, min: -1000, max: 99.99, when: (v) => v.mode === 'margin' },
    { id: 'markup', label: 'Target markup', type: 'number', suffix: '%', def: 50, min: -100, max: 100000, when: (v) => v.mode === 'markup' },
    { adv: 'Volume and overheads', open: true, items: [
      { grid: [
        { id: 'qty', label: 'Units sold', type: 'number', def: 100, min: 0, max: 1e9, hint: '(per month)' },
        { id: 'fixed', label: 'Fixed costs', type: 'money', usd: 2000, min: 0, hint: '(per month)' },
      ] },
      { id: 'disc', label: 'Discount given', type: 'number', suffix: '%', def: 0, min: 0, max: 100 },
    ] },
  ],
};

export function margin(v) {
  let price = v.price;
  if (v.mode === 'margin') price = v.cost / (1 - v.margin / 100);
  if (v.mode === 'markup') price = v.cost * (1 + v.markup / 100);
  const sell = price * (1 - (v.disc || 0) / 100);
  const profit = sell - v.cost;
  return { list: price, price: sell, profit, margin: sell ? profit / sell * 100 : NaN, markup: v.cost ? profit / v.cost * 100 : NaN };
}

export function compute(v) {
  const m = margin(v);
  const revenue = m.price * v.qty, gross = m.profit * v.qty, net = gross - v.fixed;
  const be = m.profit > 0 ? v.fixed / m.profit : Infinity;
  const rows = [10, 20, 25, 30, 40, 50, 60, 75].map((x) => [x, x / (100 - x) * 100, v.cost / (1 - x / 100)]);
  return {
    big: v.mode === 'price' ? { label: 'Profit margin', value: m.margin, kind: 'pct', side: `markup ${Number.isFinite(m.markup) ? m.markup.toFixed(1) : '—'}%` } : { label: 'Selling price', value: m.list, kind: 'money', side: `margin ${m.margin.toFixed(1)}%` },
    bars: m.profit > 0 ? [['Cost', v.cost], ['Profit', m.profit]] : [],
    kv: [
      ['Selling price after discount', m.price], ['Profit per item', m.profit, 'money', true],
      ['Margin (profit ÷ price)', m.margin, 'pct'], ['Markup (profit ÷ cost)', m.markup, 'pct'],
      ['Revenue', revenue, 'money0'], ['Gross profit', gross, 'money0'],
      ['Net profit after fixed costs', net, 'money0', true], ['Net margin', revenue ? net / revenue * 100 : NaN, 'pct'],
      ['Break-even units', Number.isFinite(be) ? Math.ceil(be) : 'never', Number.isFinite(be) ? 'int' : 'text'],
    ],
    tables: [{ title: 'Margin to markup, with the price for your cost', open: true, cols: [['Margin', 'pct'], ['Markup', 'pct'], ['Selling price', 'money']], rows }],
    warn: m.profit < 0 ? 'You are selling below cost: each sale loses money.' : '',
  };
}
