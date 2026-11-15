const imp = (v) => v.units === 'imperial', met = (v) => v.units === 'metric';
const ACT = [['1.2', 'Sedentary: desk job, little exercise'], ['1.375', 'Light: exercise 1 to 3 days a week'], ['1.55', 'Moderate: exercise 3 to 5 days a week'], ['1.725', 'Active: hard exercise 6 to 7 days a week'], ['1.9', 'Very active: physical job or twice-daily training']];
export const spec = {
  slug: 'calorie-calculator', title: 'Calorie calculator',
  form: [
    { id: 'units', label: 'Units', type: 'seg', options: [['metric', 'cm and kg'], ['imperial', 'ft, in and lb']], def: (c) => c.units },
    { grid: [
      { id: 'sex', label: 'Sex', type: 'select', options: [['m', 'Male'], ['f', 'Female']], def: 'm' },
      { id: 'age', label: 'Age', type: 'number', suffix: 'years', def: 30, min: 15, max: 100 },
    ] },
    { id: 'cm', label: 'Height', type: 'number', suffix: 'cm', def: 175, min: 100, max: 250, when: met },
    { grid: [
      { id: 'ft', label: 'Height', type: 'number', suffix: 'ft', def: 5, min: 3, max: 8, when: imp },
      { id: 'inch', label: 'and', type: 'number', suffix: 'in', def: 9, min: 0, max: 11.99, when: imp },
    ] },
    { id: 'kg', label: 'Weight', type: 'number', suffix: 'kg', def: 75, min: 30, max: 300, when: met },
    { id: 'lb', label: 'Weight', type: 'number', suffix: 'lb', def: 165, min: 66, max: 660, when: imp },
    { id: 'act', label: 'Activity level', type: 'select', options: ACT, def: '1.55' },
    { id: 'energy', label: 'Show energy in', type: 'select', options: [['kcal', 'Calories (kcal)'], ['kj', 'Kilojoules (kJ)']], def: (c) => (c.code === 'AU' || c.code === 'NZ' ? 'kj' : 'kcal') },
  ],
};

// Mifflin-St Jeor (1990): the equation dietitians recommend for estimating resting energy use.
export function energy(v) {
  const cm = v.units === 'imperial' ? (v.ft * 12 + v.inch) * 2.54 : v.cm;
  const kg = v.units === 'imperial' ? v.lb * 0.45359237 : v.kg;
  const bmr = 10 * kg + 6.25 * cm - 5 * v.age + (v.sex === 'm' ? 5 : -161);
  return { cm, kg, bmr, tdee: bmr * Number(v.act) };
}

export function compute(v) {
  const e = energy(v), k = v.energy === 'kj' ? 4.184 : 1, u = v.energy === 'kj' ? 'kJ' : 'kcal';
  const floor = v.sex === 'm' ? 1500 : 1200;
  const goal = (d) => Math.max(e.tdee + d, floor) * k;
  const I = v.units === 'imperial';
  const rows = [
    [I ? 'Lose 2 lb a week' : 'Lose 1 kg a week', goal(-1000)], [I ? 'Lose 1 lb a week' : 'Lose 0.5 kg a week', goal(-500)],
    [I ? 'Lose 0.5 lb a week' : 'Lose 0.25 kg a week', goal(-250)], ['Stay the same weight', e.tdee * k],
    [I ? 'Gain 0.5 lb a week' : 'Gain 0.25 kg a week', goal(250)], [I ? 'Gain 1 lb a week' : 'Gain 0.5 kg a week', goal(500)],
  ];
  const p = e.kg * 1.6, fat = e.tdee * 0.3 / 9, carbs = (e.tdee - p * 4 - fat * 9) / 4;
  return {
    big: { label: 'Calories to maintain your weight', value: e.tdee * k, kind: 'int', unit: `${u} a day` },
    kv: [
      ['Resting energy use (BMR)', e.bmr * k, 'int'],
      ['Protein (1.6 g per kg)', `${Math.round(p)} g`, 'text'], ['Fat (30% of energy)', `${Math.round(fat)} g`, 'text'], ['Carbohydrate (the rest)', `${Math.round(Math.max(carbs, 0))} g`, 'text'],
      ['Water, rough guide', `${(e.kg * 0.033).toFixed(1)} litres`, 'text'],
    ],
    tables: [{ title: `Daily ${u} for your goal`, open: true, cols: [['Goal', 'text'], [`${u} a day`, 'int']], rows }],
    notes: [`Targets never go below ${Math.round(floor * k)} ${u} a day, the usual safe minimum without medical supervision.`],
    warn: e.tdee - 1000 < floor ? 'The fastest loss rate is capped for you. A slower rate is safer and easier to keep up.' : '',
  };
}
