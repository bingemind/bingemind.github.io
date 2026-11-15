const U = (i, m) => ({ imperial: i, metric: m });
const slab = (v) => v.shape !== 'column', col = (v) => v.shape === 'column';
export const spec = {
  slug: 'concrete-calculator', title: 'Concrete calculator',
  form: [
    { id: 'units', label: 'Units', type: 'seg', options: [['imperial', 'Feet and inches'], ['metric', 'Meters and cm']], def: (c) => (c.code === 'US' ? 'imperial' : 'metric') },
    { id: 'shape', label: 'Shape', type: 'select', options: [['slab', 'Slab, patio or driveway'], ['footing', 'Footing or wall'], ['column', 'Round column or post hole']], def: 'slab' },
    { grid: [
      { id: 'len', label: 'Length', type: 'number', suffix: U('ft', 'm'), byUnits: true, def: (c) => (c.units === 'imperial' ? 20 : 6), min: 0, max: 100000, when: slab },
      { id: 'wid', label: 'Width', type: 'number', suffix: U('ft', 'm'), byUnits: true, def: (c) => (c.units === 'imperial' ? 10 : 3), min: 0, max: 100000, when: slab },
    ] },
    { id: 'thick', label: 'Thickness or depth', type: 'number', suffix: U('in', 'cm'), byUnits: true, def: (c) => (c.units === 'imperial' ? 4 : 10), min: 0, max: 10000, when: slab },
    { grid: [
      { id: 'dia', label: 'Diameter', type: 'number', suffix: U('in', 'cm'), byUnits: true, def: (c) => (c.units === 'imperial' ? 12 : 30), min: 0, max: 10000, when: col },
      { id: 'height', label: 'Height or depth', type: 'number', suffix: U('ft', 'm'), byUnits: true, def: (c) => (c.units === 'imperial' ? 4 : 1.2), min: 0, max: 10000, when: col },
    ] },
    { grid: [
      { id: 'qty', label: 'How many', type: 'number', def: 1, min: 1, max: 100000 },
      { id: 'waste', label: 'Extra for waste', type: 'number', suffix: '%', def: 10, min: 0, max: 100 },
    ] },
    { id: 'price', label: 'Ready-mix price', type: 'money', min: 0, byUnits: true, def: (c) => (c.units === 'imperial' ? c.amt(170) : c.amt(220)), hint: '(per cubic yard or cubic meter, optional)', optional: true },
  ],
};

export function volume(v) { // cubic meters, before waste
  const I = v.units === 'imperial', L = I ? 0.3048 : 1, S = I ? 0.0254 : 0.01;
  const one = v.shape === 'column' ? Math.PI * Math.pow(v.dia * S / 2, 2) * v.height * L : v.len * L * v.wid * L * v.thick * S;
  return one * v.qty;
}
// Yield per bag: ASTM C387 pre-mix, about 2,130 kg/m³ of dry mix (an 80 lb bag makes 0.60 cu ft).
export const BAGS = { imperial: [[40, 0.30], [60, 0.45], [80, 0.60]], metric: [[20, 0.0094], [25, 0.0117], [40, 0.0188]] };

export function compute(v) {
  const I = v.units === 'imperial', net = volume(v), m3 = net * (1 + v.waste / 100);
  const yd = m3 / 0.764554858, ft3 = m3 / 0.028316846592;
  const cost = v.price > 0 ? (I ? yd : m3) * v.price : 0;
  const bags = BAGS[v.units].map(([w, y]) => [`${w} ${I ? 'lb' : 'kg'} bags`, Math.ceil((I ? ft3 : m3) / y)]);
  const kv = [
    ['Cubic yards', yd, 'num'], ['Cubic meters', m3, 'num'], ['Cubic feet', ft3, 'num1'],
    ['Without waste', I ? net / 0.764554858 : net, 'num'],
    ['Weight of concrete', I ? `${Math.round(m3 * 2400 * 2.20462).toLocaleString('en-US')} lb` : `${Math.round(m3 * 2400).toLocaleString('en-US')} kg`, 'text'],
  ];
  if (cost) kv.push(['Ready-mix cost', cost, 'money0', true]);
  const small = I ? yd < 1 : m3 < 0.75;
  return {
    big: { label: 'Concrete needed', value: I ? yd : m3, kind: 'num', unit: I ? 'cubic yards' : 'm³', side: `includes ${v.waste}% waste` },
    kv,
    tables: [{ title: 'Pre-mixed bags to buy instead', open: true, cols: [['Bag size', 'text'], ['Bags', 'int']], rows: bags }],
    notes: [small ? 'For a job this small, bags are usually cheaper than a ready-mix truck, which often has a minimum load fee.' : 'For this volume, order ready-mix. Mixing this many bags by hand is slow and the pour may set unevenly.'],
  };
}
