// Shared file: identical copy in every calculator folder. The master is tools-build/shared/fin.js in the MicroTools project; edit it there and re-run tools/build_bingemind.py.
// Finance maths shared by the money calculators. Pure functions, no DOM, tested in tests/calcs.test.mjs.

// Periodic payment for a loan of `pv` over `n` periods at periodic rate `r`.
export function pmt(r, n, pv) {
  if (n <= 0) return 0;
  if (Math.abs(r) < 1e-12) return pv / n;
  return pv * r / (1 - Math.pow(1 + r, -n));
}

// Monthly rate from a nominal annual rate (percent) and how many times a year interest compounds.
// Canadian fixed mortgages compound twice a year: (1 + 0.05/2)^(2/12) - 1.
export function monthlyRate(annualPct, compoundsPerYear = 12, paymentsPerYear = 12) {
  const a = annualPct / 100;
  if (compoundsPerYear === paymentsPerYear) return a / paymentsPerYear;
  return Math.pow(1 + a / compoundsPerYear, compoundsPerYear / paymentsPerYear) - 1;
}

// Present value of a loan that `payment` pays off in n periods.
export function pv(r, n, payment) {
  if (Math.abs(r) < 1e-12) return payment * n;
  return payment * (1 - Math.pow(1 + r, -n)) / r;
}

// Future value of a lump sum plus level end-of-period deposits.
export function fv(r, n, start, deposit = 0) {
  if (Math.abs(r) < 1e-12) return start + deposit * n;
  const g = Math.pow(1 + r, n);
  return start * g + deposit * (g - 1) / r;
}

// Amortize a loan. Returns per-period rows and totals. `extra` is added to every payment.
export function amortize(principal, r, n, payment, extra = 0, maxPeriods = 1200) {
  const rows = [];
  let bal = principal, totalInt = 0, totalPaid = 0, k = 0;
  while (bal > 0.005 && k < Math.min(n, maxPeriods)) {
    k++;
    const interest = bal * r;
    let princ = payment + extra - interest;
    if (princ <= 0 && r > 0) return { rows, months: Infinity, totalInterest: Infinity, totalPaid: Infinity, never: true };
    if (princ > bal) princ = bal;
    bal -= princ;
    totalInt += interest; totalPaid += interest + princ;
    rows.push({ k, interest, principal: princ, balance: Math.max(bal, 0) });
  }
  return { rows, months: k, totalInterest: totalInt, totalPaid };
}

// Roll monthly rows up into yearly rows.
export function yearly(rows, perYear = 12) {
  const out = [];
  rows.forEach((r, i) => {
    const y = Math.floor(i / perYear);
    if (!out[y]) out[y] = { year: y + 1, interest: 0, principal: 0, balance: 0 };
    out[y].interest += r.interest; out[y].principal += r.principal; out[y].balance = r.balance;
  });
  return out;
}

// Rate per period that makes the payments worth `amount` (used for APR with fees). Bisection.
export function rateFor(amount, payment, n) {
  if (payment * n <= amount) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid, n, payment) > amount) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Months needed to pay `bal` at rate r with a level payment. Infinity if the payment never covers interest.
export function nper(r, payment, bal) {
  if (payment <= bal * r) return Infinity;
  if (Math.abs(r) < 1e-12) return bal / payment;
  return -Math.log(1 - bal * r / payment) / Math.log(1 + r);
}

// Add months to today and return a short month-year label in the visitor's locale.
export function monthsFromNow(m, locale = 'en-US', from = new Date()) {
  if (!Number.isFinite(m)) return 'never';
  const d = new Date(from.getFullYear(), from.getMonth() + Math.ceil(m), 1);
  return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

export const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
