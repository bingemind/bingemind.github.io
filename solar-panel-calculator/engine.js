import { powerPrice, sunHours, solarCostPerW, fxAmount, homeKwh } from './geo.js';

const price = (c) => (c.currency === 'USD' ? powerPrice(c.code) : fxAmount(powerPrice(c.code), c.currency));

const r2 = (x) => Math.round(x * 100) / 100;
export const spec = {
  slug: 'solar-panel-calculator', title: 'Solar panel calculator',
  form: [
    { grid: [
      { id: 'bill', label: 'Monthly electricity bill', type: 'money', def: (c) => Math.round(homeKwh(c.code) * price(c)), min: 0 },
      { id: 'price', label: 'Electricity price', type: 'money', def: price, min: 0.0001, hint: '(per kWh)' },
    ] },
    { grid: [
      { id: 'sun', label: 'Peak sun hours', type: 'number', suffix: 'hours a day', def: (c) => sunHours(c.code), min: 0.5, max: 9, hint: '(yearly average)' },
      { id: 'offset', label: 'Share of bill to cover', type: 'number', suffix: '%', def: 100, min: 1, max: 200 },
    ] },
    { adv: 'Panels, cost and incentives', open: true, items: [
      { grid: [
        { id: 'watt', label: 'Panel size', type: 'number', suffix: 'W', def: 420, min: 50, max: 800 },
        { id: 'cost', label: 'Installed cost', type: 'money', def: (c) => (c.currency === 'USD' ? solarCostPerW(c.code) : fxAmount(solarCostPerW(c.code), c.currency)), min: 0, hint: '(per watt)' },
      ] },
      { grid: [
        { id: 'incent', label: 'Rebate or tax credit', type: 'number', suffix: '%', def: 0, min: 0, max: 100, hint: '(of system cost; US federal credit ended for spending after 2025)' },
        { id: 'rise', label: 'Electricity price rise', type: 'number', suffix: '% a year', def: 3, min: -10, max: 30 },
      ] },
      { id: 'pr', label: 'System efficiency', type: 'number', suffix: '%', def: 80, min: 40, max: 100, hint: '(losses from heat, wiring, inverter, shade)' },
    ] },
  ],
};

export function solar(v) {
  const monthlyKwh = v.bill / v.price, yearKwh = monthlyKwh * 12 * v.offset / 100;
  const kw = yearKwh / (v.sun * 365 * v.pr / 100);
  const panels = Math.ceil(kw * 1000 / v.watt - 1e-9), sizeKw = panels * v.watt / 1000;
  const gen = sizeKw * v.sun * 365 * v.pr / 100;
  const gross = sizeKw * 1000 * v.cost, net = gross * (1 - v.incent / 100);
  // 25 years, panels lose about 0.5% output a year, electricity price rises each year.
  let cum = -net, payback = null; const path = [cum]; let total = 0;
  for (let y = 1; y <= 25; y++) {
    const s = gen * Math.pow(0.995, y - 1) * v.price * Math.pow(1 + v.rise / 100, y - 1);
    if (payback == null && cum + s >= 0) payback = y - 1 + (-cum) / s;
    cum += s; total += s; path.push(cum);
  }
  return { monthlyKwh, yearKwh, kw, panels, sizeKw, gen, gross, net, payback, path, total, year1: gen * v.price, area: panels * 1.95 };
}

export function compute(v, c) {
  const s = solar(v), I = c.units === 'imperial';
  return {
    big: { label: 'System size you need', value: s.sizeKw, kind: 'num', unit: 'kW', side: `${s.panels} panels of ${v.watt} W` },
    kv: [
      ['Your electricity use', `${Math.round(s.monthlyKwh).toLocaleString('en-US')} kWh a month`, 'text'],
      ['Solar output', `${Math.round(s.gen).toLocaleString('en-US')} kWh a year`, 'text'],
      ['Roof area needed', I ? `${Math.round(s.area * 10.7639)} sq ft` : `${Math.round(s.area)} m²`, 'text'],
      ['Cost before incentives', s.gross, 'money0'], ['Cost after incentives', s.net, 'money0', true],
      ['First-year savings', s.year1, 'money0'],
      ['Payback time', s.payback == null ? 'over 25 years' : s.payback, s.payback == null ? 'text' : 'years', true],
      ['25-year net savings', s.path[25], 'money0', true],
      ['CO₂ avoided, rough guide', `${r2(s.gen * 0.4 / 1000)} tonnes a year`, 'text'],
    ],
    chart: { title: 'Savings minus cost over 25 years', x: s.path.map((_, i) => (i === 0 ? 'Now' : 'Yr ' + i)), series: [{ name: 'Net position', data: s.path }] },
    notes: ['Assumes you use or get full credit for every kWh the panels make. If your utility pays less for exported power, payback takes longer.'],
  };
}
