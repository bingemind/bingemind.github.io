// Password and passphrase generation with the Web Crypto API. Unbiased: rejection sampling.
export const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};
const AMBIG = /[Il1O0o]/g;

export function randInt(n, rng = globalThis.crypto) {
  if (n <= 0) throw new Error('n must be positive');
  const max = Math.floor(0x100000000 / n) * n, buf = new Uint32Array(1);
  for (;;) { rng.getRandomValues(buf); if (buf[0] < max) return buf[0] % n; }
}

export function pool(opts) {
  let p = Object.keys(SETS).filter((k) => opts[k]).map((k) => SETS[k]).join('');
  if (opts.noAmbig) p = p.replace(AMBIG, '');
  return p;
}

// Guarantees at least one character from each chosen set, then shuffles.
export function password(len, opts, rng) {
  const sets = Object.keys(SETS).filter((k) => opts[k]).map((k) => (opts.noAmbig ? SETS[k].replace(AMBIG, '') : SETS[k]));
  if (!sets.length) return '';
  const all = sets.join('');
  const chars = sets.slice(0, len).map((s) => s[randInt(s.length, rng)]);
  while (chars.length < len) chars.push(all[randInt(all.length, rng)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = randInt(i + 1, rng); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

export function passphrase(n, words, sep, cap, digit, rng) {
  const w = Array.from({ length: n }, () => words[randInt(words.length, rng)]);
  const out = w.map((x) => (cap ? x[0].toUpperCase() + x.slice(1) : x));
  if (digit) out[randInt(out.length, rng)] += String(randInt(10, rng));
  return out.join(sep);
}

export const entropyPassword = (len, poolSize) => (poolSize > 1 ? len * Math.log2(poolSize) : 0);
export const entropyPhrase = (n, listSize, digit) => n * Math.log2(listSize) + (digit ? Math.log2(10 * n) : 0);

// Time to try half the possibilities at a given guesses-per-second rate.
export function crackTime(bits, rate = 1e11) {
  const s = Math.pow(2, bits - 1) / rate;
  const units = [['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 365], ['years', 1e3], ['thousand years', 1e3], ['million years', 1e3], ['billion years', Infinity]];
  let v = s;
  for (const [name, next] of units) { if (v < next) return v < 1 && name === 'seconds' ? 'instantly' : `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')} ${name}`; v /= next; }
  return 'longer than the age of the universe';
}

export const strength = (bits) => (bits < 40 ? ['Very weak', 0] : bits < 60 ? ['Weak', 1] : bits < 80 ? ['Good', 2] : bits < 100 ? ['Strong', 3] : ['Very strong', 4]);
