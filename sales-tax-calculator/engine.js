import { VAT, US_STATES, CA_PROV } from './geo.js';

const notUSCA = (v, c) => c.code !== 'US' && c.code !== 'CA';
export const spec = {
  slug: 'sales-tax-calculator', title: 'Sales tax and VAT calculator',
  form: [
    { id: 'amount', label: 'Amount', type: 'money', usd: 100, min: 0 },
    { id: 'mode', label: 'The amount is', type: 'seg', options: [['add', 'Before tax (add tax)'], ['remove', 'Tax included (remove tax)']], def: 'add' },
    { id: 'state', label: 'State', type: 'select', options: US_STATES.map(([k, n, r]) => [k, `${n} (${r}%)`]), def: 'CA', when: (v, c) => c.code === 'US' },
    { id: 'local', label: 'Local city or county tax', type: 'number', suffix: '%', def: 0, min: 0, max: 15, hint: '(added to the state rate)', when: (v, c) => c.code === 'US' },
    { id: 'prov', label: 'Province or territory', type: 'select', options: CA_PROV.map(([k, n, r]) => [k, `${n} (${r}%)`]), def: 'ON', when: (v, c) => c.code === 'CA' },
    { id: 'rate', label: 'Tax rate', type: 'number', suffix: '%', def: (c) => (VAT[c.code] || [0])[0], min: 0, max: 100, hint: '(standard rate for your country, edit for reduced rates)', when: notUSCA },
    { id: 'qty', label: 'Quantity', type: 'number', def: 1, min: 0, max: 1000000 },
  ],
};

export function rateFor(v, code) {
  if (code === 'US') return (US_STATES.find((s) => s[0] === v.state) || [0, 0, 0])[2] + (v.local || 0);
  if (code === 'CA') return (CA_PROV.find((s) => s[0] === v.prov) || [0, 0, 0])[2];
  return v.rate;
}
export function tax(amount, rate, mode) {
  const net = mode === 'remove' ? amount / (1 + rate / 100) : amount;
  const t = net * rate / 100;
  return { net, tax: t, gross: net + t };
}

export function compute(v, c) {
  const rate = rateFor(v, c.code), name = (VAT[c.code] || [0, [], 'tax'])[2];
  const r = tax(v.amount * v.qty, rate, v.mode);
  const rates = c.code === 'US' || c.code === 'CA' ? [] : (VAT[c.code] || [0, []])[1];
  const out = {
    big: { label: v.mode === 'add' ? 'Total with tax' : 'Price before tax', value: v.mode === 'add' ? r.gross : r.net, kind: 'money', side: `${rate}% ${name}` },
    bars: [['Price before tax', r.net], [`Tax (${rate}%)`, r.tax]].filter((b) => b[1] > 0.004),
    kv: [['Price before tax', r.net], ['Tax', r.tax, 'money', true], ['Total with tax', r.gross], ['Tax rate used', rate, 'pct']],
  };
  if (rates.length > 1) out.tables = [{ title: `${name} rates in your country`, open: true, cols: [['Rate', 'pct'], ['Tax', 'money'], ['Total', 'money']], rows: rates.map((x) => { const t = tax(v.amount * v.qty, x, v.mode); return [x, t.tax, t.gross]; }) }];
  if (c.code === 'US') out.notes = ['State rate shown. Most places add city, county or district tax: enter it as local tax. Alaska, Delaware, Montana, New Hampshire and Oregon have no state sales tax.'];
  if (c.code === 'CA') out.notes = ['Combined GST plus provincial tax (PST, QST) or HST. Some goods such as basic groceries are zero-rated.'];
  if (rate === 0 && c.code !== 'US' && c.code !== 'CA') out.notes = ['Your country has no general national sales tax or VAT, or it varies by region. Enter a rate if one applies.'];
  return out;
}
