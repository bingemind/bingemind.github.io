// Countries where health bodies advise the lower Asian cut-offs (WHO expert consultation, 2004).
const ASIAN = new Set(['IN', 'PK', 'BD', 'LK', 'NP', 'SG', 'MY', 'PH', 'ID', 'TH', 'VN', 'JP', 'KR', 'CN', 'HK', 'TW']);
const imp = (v) => v.units === 'imperial', met = (v) => v.units === 'metric';
export const spec = {
  slug: 'bmi-calculator', title: 'BMI calculator',
  form: [
    { id: 'units', label: 'Units', type: 'seg', options: [['metric', 'cm and kg'], ['imperial', 'ft, in and lb']], def: (c) => c.units },
    { id: 'cm', label: 'Height', type: 'number', suffix: 'cm', def: 170, min: 50, max: 260, when: met },
    { grid: [
      { id: 'ft', label: 'Height', type: 'number', suffix: 'ft', def: 5, min: 1, max: 8, when: imp },
      { id: 'inch', label: 'and', type: 'number', suffix: 'in', def: 7, min: 0, max: 11.99, when: imp },
    ] },
    { id: 'kg', label: 'Weight', type: 'number', suffix: 'kg', def: 70, min: 10, max: 400, when: met },
    { id: 'lb', label: 'Weight', type: 'number', suffix: 'lb', def: 154, min: 20, max: 900, when: imp },
    { id: 'scale', label: 'Cut-off points', type: 'select', options: [['who', 'WHO standard (25 and 30)'], ['asian', 'Asian populations (23 and 27.5)']], def: (c) => (ASIAN.has(c.code) ? 'asian' : 'who') },
  ],
};

export function bmi(v) {
  const m = v.units === 'imperial' ? (v.ft * 12 + v.inch) * 0.0254 : v.cm / 100;
  const kg = v.units === 'imperial' ? v.lb * 0.45359237 : v.kg;
  const b = kg / (m * m);
  const [over, obese] = v.scale === 'asian' ? [23, 27.5] : [25, 30];
  const cat = b < 18.5 ? 'Underweight' : b < over ? 'Healthy weight' : b < obese ? 'Overweight' : 'Obesity';
  return { m, kg, bmi: b, cat, over, obese, lo: 18.5 * m * m, hi: over * m * m };
}

export function compute(v) {
  const r = bmi(v), I = v.units === 'imperial', w = (kg) => (I ? kg / 0.45359237 : kg), u = I ? 'lb' : 'kg';
  const f = (kg) => `${w(kg).toFixed(1)} ${u}`;
  let advice = 'You are inside the healthy range.';
  if (r.bmi < 18.5) advice = `Gaining ${f(r.lo - r.kg)} would bring you to the healthy range.`;
  else if (r.bmi >= r.over) advice = `Losing ${f(r.kg - r.hi)} would bring you to the healthy range.`;
  return {
    big: { label: 'Your BMI', value: r.bmi, kind: 'num1', unit: r.cat },
    sub: advice,
    kv: [
      ['Healthy weight for your height', `${f(r.lo)} to ${f(r.hi)}`, 'text', true],
      ['BMI prime (BMI ÷ upper healthy limit)', r.bmi / r.over, 'num'],
      ['Ponderal index', r.kg / Math.pow(r.m, 3), 'num1'],
    ],
    tables: [{ title: 'BMI categories used', open: true, cols: [['Category', 'text'], ['BMI', 'text'], ['Weight at your height', 'text']], rows: [
      ['Underweight', 'below 18.5', `below ${f(r.lo)}`],
      ['Healthy weight', `18.5 to ${r.over - 0.1}`, `${f(r.lo)} to ${f(r.hi)}`],
      ['Overweight', `${r.over} to ${r.obese - 0.1}`, `${f(r.hi)} to ${f(r.obese * r.m * r.m)}`],
      ['Obesity', `${r.obese} and above`, `${f(r.obese * r.m * r.m)} and above`],
    ] }],
    notes: ['BMI is a screening measure for adults aged 20 and over. It does not separate muscle from fat, so athletes, pregnant women, older adults and children need a different assessment.'],
  };
}
