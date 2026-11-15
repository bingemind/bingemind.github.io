import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomArea, calculateArea, toFeet, outline } from '../../square-footage-calculator/engine.js';

const ft = (f, i = 0) => ({ ft: f, in: i });

test('feet and inches', () => {
  assert.equal(toFeet(ft(12, 6)), 12.5);
  assert.ok(Number.isNaN(toFeet(ft(-1))));
  assert.equal(Math.round(toFeet({ m: 1 }, 'metric') * 1000) / 1000, 3.281);
});

test('rectangle 12 x 10 = 120', () => {
  assert.equal(roomArea({ shape: 'rect', length: ft(12), width: ft(10) }).area, 120);
});

test('rectangle with inches 12\'6" x 10\'3"', () => {
  assert.equal(roomArea({ shape: 'rect', length: ft(12, 6), width: ft(10, 3) }).area, 12.5 * 10.25);
});

test('L-shape: 20x15 minus 8x6 = 252', () => {
  assert.equal(roomArea({ shape: 'lshape', length: ft(20), width: ft(15), cutLength: ft(8), cutWidth: ft(6) }).area, 252);
});

test('L-shape cut-out too big is an error', () => {
  assert.ok(roomArea({ shape: 'lshape', length: ft(10), width: ft(10), cutLength: ft(12), cutWidth: ft(2) }).error);
});

test('circle diameter 10 = 78.54', () => {
  assert.equal(Math.round(roomArea({ shape: 'circle', diameter: ft(10) }).area * 100) / 100, 78.54);
});

test('triangle and trapezoid', () => {
  assert.equal(roomArea({ shape: 'triangle', base: ft(10), height: ft(8) }).area, 40);
  assert.equal(roomArea({ shape: 'trapezoid', top: ft(10), bottom: ft(20), height: ft(6) }).area, 90);
});

test('quantity multiplies', () => {
  assert.equal(roomArea({ shape: 'rect', length: ft(10), width: ft(10), qty: 3 }).area, 300);
});

test('metric room 4m x 3m = 12 sq m', () => {
  const r = calculateArea({ units: 'metric', rooms: [{ shape: 'rect', length: { m: 4 }, width: { m: 3 } }] });
  assert.equal(r.sqm, 12);
});

test('totals, waste, cost, boxes', () => {
  const r = calculateArea({ rooms: [{ shape: 'rect', length: ft(12), width: ft(10) }, { shape: 'rect', length: ft(10), width: ft(8) }], wastePct: 10, pricePerSqft: 3.5, boxSqft: 22 });
  assert.equal(r.sqft, 200); assert.equal(r.withWaste, 220); assert.equal(r.cost, 770); assert.equal(r.boxes, 10);
  assert.equal(r.sqyd, 22.22); assert.equal(r.sqm, 18.58);
});

test('exact box multiple does not round up an extra box', () => {
  const r = calculateArea({ rooms: [{ shape: 'rect', length: ft(22), width: ft(10) }], boxSqft: 22 });
  assert.equal(r.boxes, 10);
});

test('acres', () => {
  const r = calculateArea({ rooms: [{ shape: 'rect', length: ft(208.71), width: ft(208.71) }] });
  assert.equal(r.acres, 1);
});

test('outline for L-shape has 6 points', () => {
  assert.equal(outline('lshape', { length: 20, width: 15, cutLength: 8, cutWidth: 6 }).length, 6);
});

test('bad shape falls back to rectangle', () => {
  assert.equal(roomArea({ shape: '__proto__', length: ft(2), width: ft(3) }).area, 6);
});
