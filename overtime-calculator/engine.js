// Overtime engine: pure functions, no DOM. Used by the page and by tests.
// Rules last reviewed: 13 Nov 2026. Sources are listed on the page. Official sources behind the US rules:
//   US Department of Labor, overtime: https://www.dol.gov/agencies/whd/overtime
//   California DIR: https://www.dir.ca.gov/dlse/faq_overtime.htm
//   Alaska: https://labor.alaska.gov/lss/whact.htm
//   Colorado CDLE: https://cdle.colorado.gov/wage-and-hour-law
//   Nevada: https://labor.nv.gov/
//   IRS qualified overtime deduction (2025 to 2028): https://www.irs.gov/newsroom/questions-and-answers-about-the-new-deduction-for-qualified-overtime-compensation

export const RULES = {
  federal:    { label: 'Federal (FLSA): over 40 hours a week', dailyOT: null, dailyDT: null, weeklyOT: 40, seventhDay: false, us: true, group: 'United States' },
  california: { label: 'California: daily, weekly and 7th day', dailyOT: 8, dailyDT: 12, weeklyOT: 40, seventhDay: true, us: true, group: 'United States' },
  alaska:     { label: 'Alaska: over 8 a day or 40 a week', dailyOT: 8, dailyDT: null, weeklyOT: 40, seventhDay: false, us: true, group: 'United States' },
  colorado:   { label: 'Colorado: over 12 a day or 40 a week', dailyOT: 12, dailyDT: null, weeklyOT: 40, seventhDay: false, us: true, group: 'United States' },
  nevada:     { label: 'Nevada (paid under 1.5x minimum wage): over 8 a day or 40 a week', dailyOT: 8, dailyDT: null, weeklyOT: 40, seventhDay: false, us: true, group: 'United States' },
  none:       { label: 'No overtime', group: 'Other', dailyOT: null, dailyDT: null, weeklyOT: null, seventhDay: false },
  custom:     { label: 'Custom or contract terms (any country)', group: 'Other', dailyOT: null, dailyDT: null, weeklyOT: 40, seventhDay: false },
};


// Rest of the world. ot / dt are the default multipliers for the rule. Statutory rules were checked
// against official labour-law summaries on 15 Nov 2026; many countries also have collective agreements
// that pay more, so every page says to check your contract. weeklyDT: hours past this weekly total
// move to the second tier. otCapWeekly: overtime hours past this weekly count move to the second tier.
const W = (label, group, rest) => ({ label, group, seventhDay: false, dailyOT: null, dailyDT: null, weeklyOT: null, ...rest });
Object.assign(RULES, {
  ca_fed: W('Canada, federal (Canada Labour Code): over 8 a day or 40 a week', 'Canada', { dailyOT: 8, weeklyOT: 40, ot: 1.5, hint: 'Federally regulated employers: overtime at 1.5x after 8 hours a day or 40 a week.' }),
  ca_on:  W('Canada, Ontario: over 44 a week', 'Canada', { weeklyOT: 44, ot: 1.5, hint: 'Ontario: overtime at 1.5x after 44 hours a week. No daily rule.' }),
  ca_bc:  W('Canada, British Columbia: daily and weekly', 'Canada', { dailyOT: 8, dailyDT: 12, weeklyOT: 40, ot: 1.5, dt: 2, hint: 'British Columbia: 1.5x after 8 hours a day or 40 a week, double time after 12 a day.' }),
  ca_ab:  W('Canada, Alberta: over 8 a day or 44 a week', 'Canada', { dailyOT: 8, weeklyOT: 44, ot: 1.5, hint: 'Alberta: 1.5x after 8 hours a day or 44 a week, whichever is greater.' }),
  ca_qc:  W('Canada, Quebec: over 40 a week', 'Canada', { weeklyOT: 40, ot: 1.5, hint: 'Quebec: 1.5x after 40 hours a week.' }),
  au:     W('Australia: typical award, per day (over 7.6 h) and over 38 a week', 'Asia-Pacific', { dailyOT: 7.6, dailyDT: 9.6, weeklyOT: 38, ot: 1.5, dt: 2, dtLabel: 'After first 2 h of the day', hint: 'Worked out per day, as most modern awards do: hours past 7.6 in a day pay 1.5x for the first 2 hours, then 2x. Ordinary hours past 38 in the week also pay 1.5x. Your award or agreement decides, so check its daily hours and edit the multipliers.' }),
  in:     W('India: Factories Act, over 9 a day or 48 a week', 'Asia-Pacific', { dailyOT: 9, weeklyOT: 48, ot: 2, hint: 'Factories Act: overtime at twice the ordinary rate after 9 hours a day or 48 a week. Shops and office rules differ by state.' }),
  sg:     W('Singapore: over 8 a day or 44 a week', 'Asia-Pacific', { dailyOT: 8, weeklyOT: 44, ot: 1.5, hint: 'Employment Act, covered employees only (pay limits apply): 1.5x basic rate after 8 hours a day or 44 a week.' }),
  my:     W('Malaysia: over 8 a day or 45 a week', 'Asia-Pacific', { dailyOT: 8, weeklyOT: 45, ot: 1.5, hint: 'Employment Act: 1.5x after 8 hours a day or 45 a week on a normal working day. Rest days and holidays pay more.' }),
  jp:     W('Japan: over 8 a day or 40 a week', 'Asia-Pacific', { dailyOT: 8, weeklyOT: 40, ot: 1.25, hint: 'Labor Standards Act: 1.25x. Overtime past 60 hours a month is 1.5x, which this weekly calculator does not track.' }),
  kr:     W('South Korea: over 8 a day or 40 a week', 'Asia-Pacific', { dailyOT: 8, weeklyOT: 40, ot: 1.5, hint: 'Labor Standards Act: 1.5x. The legal maximum is 52 hours a week.' }),
  ph:     W('Philippines: over 8 a day', 'Asia-Pacific', { dailyOT: 8, ot: 1.25, hint: 'Labor Code: 1.25x for work beyond 8 hours a day. Night work adds a further 10%.' }),
  ae:     W('United Arab Emirates: over 8 a day or 48 a week', 'Middle East and Africa', { dailyOT: 8, weeklyOT: 48, ot: 1.25, hint: 'Labour law: 1.25x. Night work, rest days and public holidays pay 1.5x. Change the multiplier for those hours.' }),
  sa:     W('Saudi Arabia: over 8 a day or 48 a week', 'Middle East and Africa', { dailyOT: 8, weeklyOT: 48, ot: 1.5, hint: 'Labor Law: overtime pays the hourly wage plus 50%. Hours are shorter in Ramadan.' }),
  za:     W('South Africa: over 9 a day or 45 a week', 'Middle East and Africa', { dailyOT: 9, weeklyOT: 45, ot: 1.5, dt: 2, hint: 'BCEA: 1.5x. Sunday work pays 2x unless it is your normal day.' }),
  fr:     W('France: over 35 a week, two tiers', 'Europe', { weeklyOT: 35, weeklyDT: 43, ot: 1.25, dt: 1.5, dtLabel: 'Hours 44+', hint: 'Statutory: +25% for hours 36 to 43 and +50% from the 44th hour. A collective agreement can set a different rate, at least +10%.' }),
  de:     W('Germany: typical contract, over 8 a day', 'Europe', { dailyOT: 8, weeklyOT: 40, ot: 1.25, hint: 'No statutory premium. Collective agreements often pay +25%. The law limits a day to 10 hours.' }),
  gb:     W('United Kingdom: no statutory premium', 'Europe', { weeklyOT: 40, ot: 1.5, hint: 'There is no legal overtime premium. Use your contract: set the weekly hours and the multiplier it gives you.' }),
  ie:     W('Ireland: no statutory premium', 'Europe', { weeklyOT: 39, ot: 1.5, hint: 'There is no legal overtime premium. Use your contract or sector agreement.' }),
  mx:     W('Mexico: over 8 a day, double then triple', 'Latin America', { dailyOT: 8, otCapWeekly: 9, ot: 2, dt: 3, dtLabel: 'Triple time', hint: 'Federal Labour Law: the first 9 overtime hours a week pay 2x, further hours pay 3x. A day allows at most 3 overtime hours.' }),
  br:     W('Brazil: over 8 a day or 44 a week', 'Latin America', { dailyOT: 8, weeklyOT: 44, ot: 1.5, hint: 'CLT: at least +50%. Sundays and holidays pay 2x.' }),
});
export const RULE_GROUPS = ['United States', 'Canada', 'Asia-Pacific', 'Middle East and Africa', 'Europe', 'Latin America', 'Other'];
// Default rule for each country in the picker (anything not listed keeps the custom rule).
export const RULE_FOR_REGION = { US: 'federal', CA: 'ca_on', AU: 'au', IN: 'in', SG: 'sg', MY: 'my', JP: 'jp', KR: 'kr', PH: 'ph',
  AE: 'ae', SA: 'sa', ZA: 'za', FR: 'fr', DE: 'de', GB: 'gb', IE: 'ie', MX: 'mx', BR: 'br', NZ: 'custom' };

// Official source shown for a country on the overtime and time card pages (rule 14: text follows the country).
// Only pages already vetted on these tool pages are listed. Other countries get neutral text, no link.
//   UK:  https://www.gov.uk/maximum-weekly-working-hours
//   EU:  https://eur-lex.europa.eu/eli/dir/2003/88/oj
const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
export function sourcesForRegion(code) {
  if (code === 'US') return { us: true, links: [] };
  if (code === 'GB') return { us: false, links: [{ label: 'UK government working hours guide', url: 'https://www.gov.uk/maximum-weekly-working-hours' }] };
  if (EU.includes(code)) return { us: false, links: [{ label: 'EU Working Time Directive 2003/88/EC', url: 'https://eur-lex.europa.eu/eli/dir/2003/88/oj' }] };
  return { us: false, links: [] };
}

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
  if (rule.weeklyDT != null || rule.otCapWeekly != null) {
    // Second tier: hours past a weekly total, or overtime hours past a weekly count.
    let cum = 0, otCum = 0;
    for (const r of rows) {
      if (rule.weeklyDT != null) {
        const over = Math.max(Math.min(r.hours, cum + r.hours - rule.weeklyDT), 0);
        const fromOt = Math.min(r.ot, over);
        r.ot -= fromOt; r.reg = Math.max(r.reg - (over - fromOt), 0); r.dt += over;
      }
      if (rule.otCapWeekly != null) {
        const room = Math.max(rule.otCapWeekly - otCum, 0);
        if (r.ot > room) { r.dt += r.ot - room; r.ot = room; }
        otCum += r.ot;
      }
      cum += r.hours;
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
  // Only hours that are actually paid at an overtime rate can carry a premium, so a rule that pays no overtime gives 0.
  const flsaOTHours = Math.min(Math.max(totalHours - 40, 0), otHours + dtHours);
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
