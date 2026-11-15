export const spec = {
  slug: 'percentage-calculator', title: 'Percentage calculator',
  form: [
    { id: 'mode', label: 'What do you want to work out?', type: 'select', def: 'of', options: [
      ['of', 'What is X% of Y?'], ['is', 'X is what percent of Y?'], ['change', 'Percent change from X to Y'],
      ['inc', 'Increase X by Y%'], ['dec', 'Decrease X by Y%'], ['whole', 'X is Y% of what number?'], ['diff', 'Percent difference between X and Y'],
    ] },
    { grid: [
      { id: 'x', label: 'X', type: 'number', def: 15, min: -1e15, max: 1e15 },
      { id: 'y', label: 'Y', type: 'number', def: 80, min: -1e15, max: 1e15 },
    ] },
  ],
};

export function pct(mode, x, y) {
  switch (mode) {
    case 'of': return { v: x / 100 * y, kind: 'num', f: `${x}% × ${y} = ${x} ÷ 100 × ${y}` };
    case 'is': return { v: x / y * 100, kind: 'pct', f: `${x} ÷ ${y} × 100` };
    case 'change': return { v: (y - x) / Math.abs(x) * 100, kind: 'pct', f: `(${y} − ${x}) ÷ |${x}| × 100` };
    case 'inc': return { v: x * (1 + y / 100), kind: 'num', f: `${x} × (1 + ${y} ÷ 100)` };
    case 'dec': return { v: x * (1 - y / 100), kind: 'num', f: `${x} × (1 − ${y} ÷ 100)` };
    case 'whole': return { v: x / (y / 100), kind: 'num', f: `${x} ÷ (${y} ÷ 100)` };
    default: return { v: Math.abs(x - y) / ((Math.abs(x) + Math.abs(y)) / 2) * 100, kind: 'pct', f: `|${x} − ${y}| ÷ ((${x} + ${y}) ÷ 2) × 100` };
  }
}

export function compute(v) {
  const r = pct(v.mode, v.x, v.y);
  if (!Number.isFinite(r.v)) return { error: 'You cannot divide by zero. Change the number that is 0.', big: { label: 'Answer' } };
  const label = spec.form[0].options.find((o) => o[0] === v.mode)[1].replace('X', v.x).replace('Y', v.y);
  const all = spec.form[0].options.filter((o) => o[0] !== v.mode).map(([k, l]) => { const q = pct(k, v.x, v.y); return [l.replace('X', v.x).replace('Y', v.y), Number.isFinite(q.v) ? q.v : NaN, q.kind]; });
  const out = { big: { label, value: r.v, kind: r.kind, side: '' }, sub: 'Working: ' + r.f, kv: all };
  if (v.mode === 'change') out.notes = [r.v >= 0 ? `That is an increase of ${Math.abs(v.y - v.x)}.` : `That is a decrease of ${Math.abs(v.y - v.x)}. To get back to ${v.x} you need a ${(Math.abs(v.x - v.y) / Math.abs(v.y) * 100).toFixed(2)}% increase.`];
  return out;
}
