import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, parseHours, splitWeek, toCSV } from '../../overtime-calculator/engine.js';

const wk = (days, rule = 'federal', rate = 20, extra = {}) => calculate({ mode: 'week', days, rule, rate, ...extra });

test('parseHours formats', () => {
  assert.equal(parseHours('8'), 8);
  assert.equal(parseHours('8.5'), 8.5);
  assert.equal(parseHours('8:30'), 8.5);
  assert.equal(parseHours('8h30'), 8.5);
  assert.equal(parseHours('8h 30m'), 8.5);
  assert.equal(parseHours('7h'), 7);
  assert.equal(parseHours(''), 0);
  assert.equal(parseHours('.5'), 0.5);
  assert.ok(Number.isNaN(parseHours('8:75')));
  assert.ok(Number.isNaN(parseHours('abc')));
});

test('federal: 45 hours at $20 = $950', () => {
  const r = wk([9, 9, 9, 9, 9, 0, 0]);
  assert.equal(r.regHours, 40); assert.equal(r.otHours, 5); assert.equal(r.gross, 950);
});

test('federal: 40 hours or fewer has no overtime', () => {
  const r = wk([12, 12, 12, 4, 0, 0, 0]);
  assert.equal(r.otHours, 0); assert.equal(r.gross, 800);
});

test('federal: no daily overtime for a 14 hour day', () => {
  const r = wk([14, 0, 0, 0, 0, 0, 0]);
  assert.equal(r.otHours, 0); assert.equal(r.dtHours, 0);
});

test('california: four 10-hour days at $25 = $1,100', () => {
  const r = wk([10, 10, 10, 10, 0, 0, 0], 'california', 25);
  assert.equal(r.regHours, 32); assert.equal(r.otHours, 8); assert.equal(r.gross, 1100);
});

test('california: one 14-hour day at $30 = $540', () => {
  const r = wk([14, 0, 0, 0, 0, 0, 0], 'california', 30);
  assert.equal(r.regHours, 8); assert.equal(r.otHours, 4); assert.equal(r.dtHours, 2); assert.equal(r.gross, 540);
});

test('california: weekly 40 after daily rules (6 x 8 = 48h -> 8 OT)', () => {
  const r = wk([8, 8, 8, 8, 8, 8, 0], 'california', 20);
  assert.equal(r.regHours, 40); assert.equal(r.otHours, 8); assert.equal(r.dtHours, 0);
});

test('california: 7th consecutive day, 10 hours -> 8 OT + 2 DT', () => {
  const { rows } = splitWeek([8, 8, 8, 8, 8, 8, 10], 'california');
  assert.deepEqual([rows[6].reg, rows[6].ot, rows[6].dt], [0, 8, 2]);
  const r = wk([8, 8, 8, 8, 8, 8, 10], 'california', 20);
  // Mon-Sat 48h: 40 reg + 8 weekly OT. Sun: 8 OT + 2 DT.
  assert.equal(r.regHours, 40); assert.equal(r.otHours, 16); assert.equal(r.dtHours, 2);
  assert.equal(r.gross, 40 * 20 + 16 * 30 + 2 * 40);
});

test('california: daily OT hours do not also count toward weekly 40', () => {
  // 5 x 10 = 50h: daily OT 10h, reg 40h -> no extra weekly OT
  const r = wk([10, 10, 10, 10, 10, 0, 0], 'california', 20);
  assert.equal(r.regHours, 40); assert.equal(r.otHours, 10);
});

test('alaska: daily 8, no double time', () => {
  const r = wk([14, 0, 0, 0, 0, 0, 0], 'alaska', 20);
  assert.equal(r.regHours, 8); assert.equal(r.otHours, 6); assert.equal(r.dtHours, 0);
});

test('colorado: daily 12', () => {
  const r = wk([14, 0, 0, 0, 0, 0, 0], 'colorado', 20);
  assert.equal(r.regHours, 12); assert.equal(r.otHours, 2);
});

test('custom thresholds', () => {
  const r = wk([11, 0, 0, 0, 0, 0, 0], 'custom', 10, { custom: { dailyOT: '9', dailyDT: '10', weeklyOT: '40' } });
  assert.equal(r.regHours, 9); assert.equal(r.otHours, 1); assert.equal(r.dtHours, 1);
});

test('custom with no weekly limit', () => {
  const r = wk([10, 10, 10, 10, 10, 0, 0], 'custom', 10, { custom: { dailyOT: '', dailyDT: '', weeklyOT: '' } });
  assert.equal(r.otHours, 0); assert.equal(r.gross, 500);
});

test('quick mode uses weekly limit only', () => {
  const r = calculate({ mode: 'quick', totalHours: 48, rule: 'california', rate: 20 });
  assert.equal(r.regHours, 40); assert.equal(r.otHours, 8); assert.equal(r.gross, 1040);
});

test('custom multipliers', () => {
  const r = wk([9, 9, 9, 9, 9, 0, 0], 'federal', 20, { otMult: 2 });
  assert.equal(r.gross, 800 + 5 * 40);
});

test('no tax on overtime premium uses FLSA hours over 40 only', () => {
  const r = wk([10, 10, 10, 10, 0, 0, 0], 'california', 25); // 40h total, CA daily OT only
  assert.equal(r.qualifiedPremiumWeek, 0);
  const r2 = wk([9, 9, 9, 9, 9, 0, 0], 'federal', 20); // 5h over 40
  assert.equal(r2.qualifiedPremiumWeek, 50);
  assert.equal(r2.qualifiedPremiumYear, 2600);
});

test('bad input is safe', () => {
  const r = calculate({ mode: 'week', days: ['x', -5, 30, null], rule: 'nope', rate: -3 });
  assert.equal(r.gross, 0);
  assert.ok(r.totalHours <= 24);
});

test('CSV has header, rows and total', () => {
  const csv = toCSV(wk([9, 9, 9, 9, 9, 0, 0]));
  const lines = csv.split('\n');
  assert.equal(lines[0], 'Day,Hours,Regular,Overtime,Double time,Pay');
  assert.equal(lines.at(-1), 'Total,45,40,5,0,950.00');
});

test('nevada daily 8 rule', () => {
  const r = wk([10, 0, 0, 0, 0, 0, 0], 'nevada', 15);
  assert.equal(r.regHours, 8); assert.equal(r.otHours, 2);
});

test('8:5 is rejected, 8:05 accepted', () => {
  assert.ok(Number.isNaN(parseHours('8:5')));
  assert.equal(Math.round(parseHours('8:05') * 1000), 8083);
});

test('rows always sum to gross (no cent drift)', () => {
  const r = wk([8.333, 8.333, 8.333, 8.333, 8.333, 8.333, 0], 'federal', 17.77);
  const sum = Math.round(r.rows.reduce((a, x) => a + x.pay, 0) * 100) / 100;
  assert.equal(sum, r.gross);
});

test('no premium when multiplier below 1.5', () => {
  const r = wk([9, 9, 9, 9, 9, 0, 0], 'federal', 20, { otMult: 1 });
  assert.equal(r.qualifiedPremiumWeek, 0);
});

test('rule key "constructor" falls back to federal', () => {
  const r = wk([14, 0, 0, 0, 0, 0, 0], 'constructor', 20);
  assert.equal(r.otHours, 0);
  assert.equal(r.rule.label.startsWith('Federal'), true);
});

test('no-tax-on-overtime premium counts only overtime that is actually paid', () => {
  const none = wk([10, 10, 10, 10, 10, 0, 0], 'none');
  assert.equal(none.qualifiedPremiumWeek, 0, 'rule that pays no overtime has no premium');
  const fed = wk([10, 10, 10, 10, 10, 0, 0], 'federal');
  assert.equal(fed.qualifiedPremiumWeek, 100); // 10 h over 40 x $20 x 0.5
  const under = wk([8, 8, 8, 8, 8, 0, 0], 'federal');
  assert.equal(under.qualifiedPremiumWeek, 0);
});

// Country text: US keeps its own sources, the UK and EU countries get their official page, everyone else gets neutral text with no US source.
import { sourcesForRegion } from '../../overtime-calculator/engine.js';
test('sourcesForRegion follows the country', () => {
  assert.equal(sourcesForRegion('US').us, true);
  assert.deepEqual(sourcesForRegion('GB').links.map((l) => l.url), ['https://www.gov.uk/maximum-weekly-working-hours']);
  assert.deepEqual(sourcesForRegion('FR').links.map((l) => l.url), ['https://eur-lex.europa.eu/eli/dir/2003/88/oj']);
  for (const c of ['AU', 'IN', 'AE', 'CA', 'ZZ']) { const s = sourcesForRegion(c); assert.equal(s.us, false); assert.equal(s.links.length, 0); }
  for (const c of ['GB', 'FR', 'AU', 'IN']) for (const l of sourcesForRegion(c).links) assert.ok(l.url.startsWith('https://'));
});
