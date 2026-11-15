import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { totals } from '../../invoice-generator/invoice.js';
import { stats, syllables } from '../../word-counter/count.js';
import { password, passphrase, pool, entropyPassword, entropyPhrase, randInt, SETS } from '../../password-generator/gen.js';
import { WORDS } from '../../password-generator/words.js';

test('invoice totals: discount before tax, shipping after', () => {
  const t = totals([{ desc: 'a', qty: 2, price: 50 }, { desc: 'b', qty: 1, price: 100 }], 20, 10, 5);
  assert.equal(t.subtotal, 200); assert.equal(t.discount, 20); assert.equal(t.tax, 36); assert.equal(t.total, 221);
});
test('invoice totals: cents rounding per line', () => assert.equal(totals([{ qty: 3, price: 0.333 }], 0, 0).subtotal, 1));
test('word count: English basics', () => {
  const s = stats("Don't stop. It's a well-known e-mail!\n\nNew paragraph here.");
  assert.equal(s.words, 9); assert.equal(s.sentences, 3); assert.equal(s.paragraphs, 2);
});
test('word count: Chinese text without spaces is split into words', () => {
  const s = stats('我喜欢学习中文。', 'zh'); assert.ok(s.words >= 3 && s.words <= 6, String(s.words)); assert.equal(s.cjk, true);
});
test('word count: empty text', () => { const s = stats(''); assert.equal(s.words, 0); assert.equal(s.chars, 0); assert.equal(s.flesch, null); });
test('syllables', () => { assert.equal(syllables('cat'), 1); assert.equal(syllables('water'), 2); assert.equal(syllables('banana'), 3); });
test('password: length, one of each set, only allowed characters', () => {
  for (let i = 0; i < 200; i++) {
    const p = password(12, { lower: true, upper: true, digits: true, symbols: true }, webcrypto);
    assert.equal(p.length, 12);
    for (const k of Object.keys(SETS)) assert.ok([...p].some((c) => SETS[k].includes(c)), k);
  }
  const q = password(40, { lower: true, digits: true, noAmbig: true }, webcrypto);
  assert.ok(!/[Il1O0o]/.test(q) && /^[a-z0-9]+$/.test(q));
});
test('password: entropy', () => {
  assert.equal(pool({ lower: true, upper: true, digits: true, symbols: true }).length, 87);
  assert.ok(Math.abs(entropyPassword(16, 87) - 103.09) < 0.01);
  assert.ok(Math.abs(entropyPhrase(5, 1296, false) - 51.7) < 0.05);
});
test('randInt is unbiased enough', () => {
  const c = [0, 0, 0]; for (let i = 0; i < 30000; i++) c[randInt(3, webcrypto)]++;
  c.forEach((n) => assert.ok(n > 9500 && n < 10500, String(c)));
});
test('passphrase uses list words', () => {
  assert.equal(WORDS.length, 1296); assert.equal(new Set(WORDS).size, 1296);
  const p = passphrase(6, WORDS, '-', false, false, webcrypto).split('-'); assert.equal(p.length, 6); p.forEach((w) => assert.ok(WORDS.includes(w)));
});
