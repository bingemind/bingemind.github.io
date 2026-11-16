import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, roundMinutes, dayMinutes, calculateCard, toHM, toDecimal, cardCSV } from '../../time-card-calculator/engine.js';

const day = (start, end, breakMin = 0) => ({ start, end, breakMin });
const empty = () => day('', '');
const week = (...d) => { const w = [...d]; while (w.length < 7) w.push(empty()); return w; };

test('parseTime', () => {
  assert.equal(parseTime('08:30'), 510);
  assert.equal(parseTime('8:30'), 510);
  assert.equal(parseTime('830'), 510);
  assert.equal(parseTime('1730'), 1050);
  assert.equal(parseTime('5:30 pm'), 1050);
  assert.equal(parseTime('12:15 am'), 15);
  assert.equal(parseTime('12 pm'), 720);
  assert.equal(parseTime('9'), 540);
  assert.equal(parseTime(''), null);
  assert.ok(Number.isNaN(parseTime('25:00')));
  assert.ok(Number.isNaN(parseTime('8:75')));
  assert.ok(Number.isNaN(parseTime('13 pm')));
});

test('roundMinutes nearest increment', () => {
  assert.equal(roundMinutes(487, 15), 480); // 8:07 -> 8:00
  assert.equal(roundMinutes(488, 15), 495); // 8:08 -> 8:15
  assert.equal(roundMinutes(483, 6), 486);
  assert.equal(roundMinutes(483, 0), 483);
});

test('dayMinutes with lunch', () => {
  assert.equal(dayMinutes(day('08:30', '17:15', 30)).minutes, 495); // 8h15m
});

test('dayMinutes overnight shift', () => {
  const d = dayMinutes(day('22:00', '06:30', 30));
  assert.equal(d.minutes, 480); assert.equal(d.overnight, true);
});

test('dayMinutes break longer than shift is capped', () => {
  assert.equal(dayMinutes(day('09:00', '10:00', 120)).minutes, 0);
});

test('half-filled day is invalid', () => {
  assert.equal(dayMinutes(day('09:00', '')).valid, false);
  assert.equal(dayMinutes(day('', '')).valid, true);
});

test('toHM and toDecimal', () => {
  assert.equal(toHM(495), '8:15'); assert.equal(toDecimal(495), 8.25);
  assert.equal(toHM(2520), '42:00');
});

test('federal week: 5 x 8:30-17:15 with 30 min lunch = 41.25h -> 1.25 OT', () => {
  const d = day('08:30', '17:15', 30);
  const r = calculateCard({ weeks: [week(d, d, d, d, d)], rate: 20 });
  assert.equal(r.decimal, 41.25); assert.equal(r.reg, 40); assert.equal(r.ot, 1.25);
  assert.equal(r.gross, 800 + 1.25 * 30);
});

test('bi-weekly: overtime is per week, not averaged', () => {
  const long = day('07:00', '17:00', 0); // 10h
  const short = day('09:00', '15:00', 0); // 6h
  const r = calculateCard({ weeks: [week(long, long, long, long, long), week(short, short, short, short, short)], rate: 10 });
  // week1 50h -> 10 OT; week2 30h -> 0 OT
  assert.equal(r.ot, 10); assert.equal(r.reg, 70);
  assert.equal(r.gross, 70 * 10 + 10 * 15);
});

test('california daily overtime via time card', () => {
  const d = day('06:00', '18:00', 30); // 11.5h
  const r = calculateCard({ weeks: [week(d)], rate: 20, rule: 'california' });
  assert.equal(r.reg, 8); assert.equal(r.ot, 3.5); assert.equal(r.dt, 0);
});

test('rounding applies to punches', () => {
  const r = calculateCard({ weeks: [week(day('08:07', '16:53', 0))], rate: 10, rounding: 15 });
  assert.equal(r.minutes, 540); // 8:07 -> 8:00, 16:53 -> 17:00 = 9h
  const r2 = calculateCard({ weeks: [week(day('08:07', '16:52', 0))], rate: 10, rounding: 15 });
  assert.equal(r2.minutes, 525); // 16:52 -> 16:45 = 8h45
});

test('CSV includes meta and totals', () => {
  const d = day('09:00', '17:00', 30);
  const r = calculateCard({ weeks: [week(d)], rate: 10 });
  const csv = cardCSV(r, { name: 'Sam, Lee', start: '2026-11-09', punches: [week(d)] });
  assert.match(csv, /^Employee,Sam  Lee/);
  assert.match(csv, /1,Mon,09:00,17:00,30,7:30,7.5/);
  assert.match(csv, /Total,,,,7:30,7.5/);
});
