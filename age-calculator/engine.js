const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const spec = {
  slug: 'age-calculator', title: 'Age calculator',
  form: [
    { id: 'dob', label: 'Date of birth', type: 'date', def: '1995-06-15' },
    { id: 'on', label: 'Age on this date', type: 'date', def: () => iso(new Date()) },
  ],
};

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1, d); return t.getMonth() === m - 1 ? t : null; };
const dim = (y, m) => new Date(y, m + 1, 0).getDate();

// Calendar difference: whole years, then whole months, then days (the way ages are counted on documents).
export function diff(a, b) {
  const utc = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const addMonths = (n) => { const y = a.getFullYear() + Math.floor((a.getMonth() + n) / 12), m = (a.getMonth() + n) % 12; return new Date(y, m, Math.min(a.getDate(), dim(y, m))); };
  let tm = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  if (addMonths(tm) > b) tm--;
  const d = Math.round((utc(b) - utc(addMonths(tm))) / 864e5);
  return { y: Math.floor(tm / 12), m: tm % 12, d, days: Math.round((utc(b) - utc(a)) / 864e5) };
}
export function nextBirthday(a, b) {
  const mk = (yr) => { const t = new Date(yr, a.getMonth(), a.getDate()); return t.getMonth() === a.getMonth() ? t : new Date(yr, 2, 1); }; // 29 Feb → 1 Mar
  let n = mk(b.getFullYear());
  if (n < b) n = mk(b.getFullYear() + 1);
  return { date: n, days: Math.round((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5), turns: n.getFullYear() - a.getFullYear() };
}

export function compute(v, c) {
  const a = parse(v.dob || ''), b = parse(v.on || '');
  if (!a || !b) return { error: 'Enter both dates.', big: { label: 'Age' } };
  if (a > b) return { error: 'The date of birth is after the second date.', big: { label: 'Age' } };
  const r = diff(a, b), nb = nextBirthday(a, b);
  const fmt = (d, o) => d.toLocaleDateString(c.locale, o);
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return {
    big: { label: 'Age', value: `${pl(r.y, 'year')}, ${pl(r.m, 'month')}, ${pl(r.d, 'day')}`, kind: 'text' },
    kv: [
      ['In months', r.y * 12 + r.m, 'int'], ['In weeks', Math.floor(r.days / 7), 'int'], ['In days', r.days, 'int', true],
      ['In hours', r.days * 24, 'int'], ['In minutes', r.days * 1440, 'int'],
      ['Born on a', fmt(a, { weekday: 'long' }), 'text'],
      ['Next birthday', nb.days === 0 ? 'Today! Happy birthday' : `${fmt(nb.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} (in ${pl(nb.days, 'day')})`, 'text'],
      ['You will turn', nb.turns, 'int'],
      ['Korean age (traditional)', b.getFullYear() - a.getFullYear() + 1, 'int'],
    ],
  };
}
