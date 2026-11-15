// Overtime engine: pure functions, no DOM. Used by the page and by tests.
// Rules last reviewed: 13 Nov 2026. Sources are listed on the page.

export const RULES = {
  federal:    { label: 'Federal (FLSA): over 40 hours a week', dailyOT: null, dailyDT: null, weeklyOT: 40, seventhDay: false },
  california: { label: 'California: daily, weekly and 7th day', dailyOT: 8, dailyDT: 12, weeklyOT: 40, seventhDay: true },
  alaska:     { label: 'Alaska: over 8 a day or 40 a week', dailyOT: 8, dailyDT: null, weeklyOT: 40, seventhDay: false },
  colorado:   { label: 'Colorado: over 12 a day or 40 a week', dailyOT: 12, dailyDT: null, weeklyOT: 40, seventhDay: false },
  nevada:     { label: 'Nevada (paid under 1.5x minimum wage): over 8 a day or 40 a week', dailyOT: 8, dailyDT: null, weeklyOT: 40, seventhDay: false },
  none:       { label: 'No overtime', dailyOT: null, dailyDT: null, weeklyOT: null, seventhDay: false },
  custom:     { label: 'Custom thresholds', dailyOT: null, dailyDT: null, weeklyOT: 40, seventhDay: false },
};

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Accepts "8", "8.5", "8:30", "8h30", "8h 30m", "" -> hours as a number, or NaN if invalid.
export function parseHours(input) {
  if (input === null || input === undefined) return 0;
  const s = String(input).trim().toLowerCase();
  if (s === '') return 0;
  // Colon form needs two-digit minutes (8:05), so "8:5" is rejected instead of guessed.
  let m = s.match(/^(\d{1,2}):(\d{2})$/) || s.match(/^(\d{1,2})\s*h\s*(\d{1,2})\s*m?$/);
  if (m) {
    const h = +m[1], min = +m[2];
    if (min >= 60) return NaN;
    return h + min / 60;
  }
  m = s.match(/^(\d{1,2})\s*h$/);
  if (m) return +m[1];
  if (/^\d*\.?\d+$/.test(s)) return parseFloat(s);
  return NaN;
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampHours = (h) => Math.min(Math.max(h, 0), 24);

function resolveRule(ruleKey, custom) {
  const base = Object.hasOwn(RULES, ruleKey) ? RULES[ruleKey] : RULES.federal;
  if (ruleKey !== 'custom') return base;
  const num = (v) => (v === '' || v === null || v === undefined || isNaN(+v) || +v <= 0 ? null : +v);
  const r = { ...base, dailyOT: num(custom?.dailyOT), dailyDT: num(custom?.dailyDT), weeklyOT: num(custom?.weeklyOT) };
  if (r.dailyOT !== null && r.dailyDT !== null && r.dailyDT < r.dailyOT) r.dailyDT = r.dailyOT;
  return r;
}

// Split one week of daily hours into regular, overtime and double time.
// Method: daily rules first, then hours that are still regular past the weekly
// threshold become overtime, in day order. Hours are never counted twice.
export function splitWeek(days, ruleKey = 'federal', custom = {}) {
  const rule = resolveRule(ruleKey, custom);
  const hrs = DAYS.map((_, i) => clampHours(+days[i] || 0));
  const workedAll7 = hrs.every((h) => h > 0);
  const rows = hrs.map((h, i) => {
    let reg = h, ot = 0, dt = 0;
    if (rule.seventhDay && workedAll7 && i === 6) {
      ot = Math.min(h, 8);
      dt = Math.max(h - 8, 0);
      reg = 0;
    } else {
      if (rule.dailyDT !== null && h > rule.dailyDT) {
        dt = h - rule.dailyDT;
      }
      if (rule.dailyOT !== null && h > rule.dailyOT) {
        const otCap = rule.dailyDT !== null ? rule.dailyDT : h;
        ot = Math.max(Math.min(h, otCap) - rule.dailyOT, 0);
      }
      reg = h - ot - dt;
    }
    return { day: DAYS[i], hours: h, reg, ot, dt };
  });
  if (rule.weeklyOT !== null) {
    let regSoFar = 0;
    for (const r of rows) {
      const room = Math.max(rule.weeklyOT - regSoFar, 0);
      if (r.reg > room) {
        const moved = r.reg - room;
        r.reg = room;
        r.ot += moved;
      }
      regSoFar += r.reg;
    }
  }
  return { rule, rows };
}

// Full calculation. mode "week" uses per-day hours; "quick" uses one weekly total
// with the weekly threshold only (daily rules need daily hours).
export function calculate(input) {
  const rate = Math.max(+input.rate || 0, 0);
  const otMult = +input.otMult > 0 ? +input.otMult : 1.5;
  const dtMult = +input.dtMult > 0 ? +input.dtMult : 2;
  const weeksPerYear = Math.min(Math.max(+input.weeksPerYear || 52, 1), 53);
  let split;
  if (input.mode === 'quick') {
    const total = Math.min(Math.max(+input.totalHours || 0, 0), 168);
    const rule = resolveRule(input.rule, input.custom);
    const weekly = rule.weeklyOT ?? Infinity;
    const reg = Math.min(total, weekly);
    split = { rule, rows: [{ day: 'Week', hours: total, reg, ot: total - reg, dt: 0 }] };
  } else {
    split = splitWeek(input.days || [], input.rule, input.custom);
  }
  const sum = (k) => split.rows.reduce((a, r) => a + r[k], 0);
  const totalHours = sum('hours'), regHours = sum('reg'), otHours = sum('ot'), dtHours = sum('dt');
  const regPay = regHours * rate, otPay = otHours * rate * otMult, dtPay = dtHours * rate * dtMult;
  // Gross is the sum of the rounded day pays, so the table and CSV always add up.
  const rowPay = split.rows.map((r) => round2(r.reg * rate + r.ot * rate * otMult + r.dt * rate * dtMult));
  const gross = rowPay.reduce((a, b) => a + b, 0);
  // Federal "no tax on overtime" deduction (tax years 2025 to 2028) covers only the
  // premium part (the "half" in time-and-a-half) of overtime the FLSA requires:
  // hours over 40 in the workweek. State-only daily overtime does not count.
  // If the multiplier is below 1.5 no FLSA premium is being paid, so nothing is shown.
  const flsaOTHours = Math.max(totalHours - 40, 0);
  const qualifiedPremium = otMult >= 1.5 ? flsaOTHours * rate * 0.5 : 0;
  return {
    rule: split.rule,
    rows: split.rows.map((r, i) => ({
      ...r,
      reg: round2(r.reg), ot: round2(r.ot), dt: round2(r.dt),
      pay: rowPay[i],
    })),
    rate, otMult, dtMult, weeksPerYear,
    totalHours: round2(totalHours), regHours: round2(regHours), otHours: round2(otHours), dtHours: round2(dtHours),
    regPay: round2(regPay), otPay: round2(otPay), dtPay: round2(dtPay), gross: round2(gross),
    effectiveRate: totalHours > 0 ? round2(gross / totalHours) : 0,
    otRate: round2(rate * otMult), dtRate: round2(rate * dtMult),
    qualifiedPremiumWeek: round2(qualifiedPremium),
    qualifiedPremiumYear: round2(qualifiedPremium * weeksPerYear),
    grossYear: round2(gross * weeksPerYear),
  };
}

export function toCSV(res) {
  const lines = [['Day', 'Hours', 'Regular', 'Overtime', 'Double time', 'Pay']];
  for (const r of res.rows) lines.push([r.day, round2(r.hours), r.reg, r.ot, r.dt, r.pay.toFixed(2)]);
  lines.push(['Total', res.totalHours, res.regHours, res.otHours, res.dtHours, res.gross.toFixed(2)]);
  return lines.map((l) => l.join(',')).join('\n');
}
