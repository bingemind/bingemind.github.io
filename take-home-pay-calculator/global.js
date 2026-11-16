// Take-home pay outside the United States. Pure functions, same output shape as the US engine.
// Sources (checked 15 Nov 2026):
//   UK 2026/27: gov.uk "Rates and thresholds for employers 2026 to 2027" and Income Tax rates and bands.
//   Canada 2026: CRA T4032 payroll deductions tables (federal, Ontario, British Columbia, Alberta), CPP and EI pages.
//   Australia 2026-27: ato.gov.au "Tax rates - Australian resident" (15% from 1 July 2026).
//   India FY 2026-27: Income Tax Department new regime slabs (unchanged by Budget 2026).
// Estimates only: no student loans, tax codes, benefits in kind or local levies.

import { bracketTax } from './engine.js';

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pos = (n) => Math.max(n, 0);

// Each country: key, label of what the five lines mean, and a calc(input) -> lines.
// Lines use the US names so the page code is shared: federal = income tax, ss = main social charge,
// medicare = second social charge, state = regional tax, sdi = other, k401 = pension, pretax = health.
export const COUNTRIES = {
  GB: { name: 'United Kingdom', labels: { federal: 'Income tax', ss: 'National Insurance', medicare: '', state: '', pension: 'Workplace pension' }, regionLabel: null, note: 'England, Wales and Northern Ireland rates. Scotland has different income tax bands, so its figures will differ. Pension is taken before tax (net pay arrangement), not before National Insurance. Student loans are not included.' },
  CA: { name: 'Canada', labels: { federal: 'Federal income tax', ss: 'CPP', medicare: 'EI', state: 'Provincial income tax', pension: 'RRSP' }, regionLabel: 'Province', note: 'Quebec has its own pension and tax system and is not included. Other provinces use the rate you enter. RRSP lowers income tax, not CPP or EI.' },
  AU: { name: 'Australia', labels: { federal: 'Income tax', ss: '', medicare: 'Medicare levy', state: '', pension: 'Salary-sacrificed super' }, regionLabel: null, note: 'Resident rates for 2026-27 with the low income tax offset. Your employer pays super on top of the salary you enter, so it is not deducted here. Low-income Medicare levy reductions are not included.' },
  IN: { name: 'India', labels: { federal: 'Income tax', ss: '', medicare: 'Health and education cess', state: '', pension: 'Employee provident fund' }, regionLabel: null, note: 'New tax regime for FY 2026-27 with the 75,000 standard deduction and the 12 lakh rebate. Professional tax and surcharge marginal relief are not included. Provident fund is shown as a deduction with no tax relief, as in the new regime.' },
  GULF: { name: 'No income tax', labels: { federal: 'Income tax', ss: '', medicare: '', state: '', pension: 'Pension or savings' }, regionLabel: null, note: 'This country does not tax wages. Social security charges for citizens or end-of-service schemes are not included, so enter them as a pension percentage if they apply to you.' },
  OTHER: { name: 'Other country', labels: { federal: 'Income tax', ss: 'Social security', medicare: '', state: 'Local tax', pension: 'Pension' }, regionLabel: null, note: 'Enter your own average rates. Look at last year\'s payslip or tax return: income tax and social security as a percent of gross pay.' },
};

// Which calculator each country in the picker uses. Anything missing uses OTHER.
export const MODE_FOR_REGION = { GB: 'GB', CA: 'CA', AU: 'AU', IN: 'IN', AE: 'GULF', QA: 'GULF', BH: 'GULF', KW: 'GULF', OM: 'GULF' };
export const modeFor = (code) => (code === 'US' ? 'US' : MODE_FOR_REGION[code] || 'OTHER');

// ---------- United Kingdom 2026/27 (rest of UK outside Scotland) ----------
function uk(gross, pension) {
  const taxableIncome = gross - pension;
  const pa = Math.max(12570 - pos(taxableIncome - 100000) / 2, 0);
  const t = pos(taxableIncome - pa);
  const basic = Math.min(t, 37700);
  const higher = Math.min(pos(t - 37700), 125140 - 37700);
  const additional = pos(t - 125140);
  const tax = basic * 0.2 + higher * 0.4 + additional * 0.45;
  const marginal = t > 125140 ? 0.45 : t > 37700 ? 0.4 : t > 0 ? 0.2 : 0;
  const ni = pos(Math.min(gross, 50270) - 12570) * 0.08 + pos(gross - 50270) * 0.02;
  return { federal: tax, ss: ni, medicare: 0, state: 0, sdi: 0, marginal: marginal + (gross > 50270 ? 0.02 : gross > 12570 ? 0.08 : 0) };
}

// ---------- Canada 2026 ----------
const CA_FED = [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]];
const CA_PROV = {
  ON: { name: 'Ontario', bpa: 12989, rate: 0.0505, brackets: [[53891, 0.0505], [107785, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]] },
  BC: { name: 'British Columbia', bpa: 13216, rate: 0.056, brackets: [[50363, 0.056], [100728, 0.077], [115648, 0.105], [140430, 0.1229], [190405, 0.147], [265545, 0.168], [Infinity, 0.205]] },
  AB: { name: 'Alberta', bpa: 22769, rate: 0.08, brackets: [[61200, 0.08], [154259, 0.10], [185111, 0.12], [246813, 0.13], [370220, 0.14], [Infinity, 0.15]] },
  OTHER: { name: 'Other province (enter your rate)', custom: true },
};
export const CA_PROVINCES = CA_PROV;

function canada(gross, pension, provKey, customRate) {
  // CPP and EI come off gross; RRSP does not reduce them.
  const cppBase = pos(Math.min(gross, 74600) - 3500) * 0.0495;
  const cppEnh = pos(Math.min(gross, 74600) - 3500) * 0.01;
  const cpp2 = pos(Math.min(gross, 85000) - 74600) * 0.04;
  const ei = Math.min(gross, 68900) * 0.0163;
  const taxable = pos(gross - pension - cppEnh - cpp2);
  const bpa = taxable <= 181440 ? 16452 : taxable >= 258482 ? 14829 : 16452 - (16452 - 14829) * (taxable - 181440) / (258482 - 181440);
  const credits = bpa + cppBase + ei + Math.min(1501, gross);
  const { tax: fedGross, marginal: fedM } = bracketTax(taxable, CA_FED);
  const federal = pos(fedGross - credits * 0.14);
  const prov = CA_PROV[provKey] || CA_PROV.OTHER;
  let provincial = 0, provM = 0;
  if (prov.custom) {
    provincial = taxable * pos(customRate) / 100; provM = pos(customRate) / 100;
  } else {
    const { tax: pg, marginal } = bracketTax(taxable, prov.brackets);
    let basic = pos(pg - (prov.bpa + cppBase + ei) * prov.rate);
    provM = marginal;
    if (provKey === 'ON') {
      // Ontario: tax reduction for low incomes, surtax and the Ontario Health Premium.
      basic = pos(basic - pos(2 * 300 - basic));
      const surtax = 0.2 * pos(basic - 5818) + 0.36 * pos(basic - 7446);
      const ohp = taxable <= 20000 ? 0 : taxable <= 36000 ? Math.min(300, 0.06 * (taxable - 20000))
        : taxable <= 48000 ? Math.min(450, 300 + 0.06 * (taxable - 36000))
        : taxable <= 72000 ? Math.min(600, 450 + 0.25 * (taxable - 48000))
        : taxable <= 200000 ? Math.min(750, 600 + 0.25 * (taxable - 72000))
        : Math.min(900, 750 + 0.25 * (taxable - 200000));
      provincial = basic + surtax + ohp;
      if (basic > 5818) provM *= basic > 7446 ? 1.56 : 1.2;
    } else provincial = basic;
  }
  const marginal = fedM + provM + (gross < 74600 ? 0.0595 : gross < 85000 ? 0.04 : 0) + (gross < 68900 ? 0.0163 : 0);
  return { federal, ss: cppBase + cppEnh + cpp2, medicare: ei, state: provincial, sdi: 0, marginal, provName: prov.name };
}

// ---------- Australia 2026-27 (resident) ----------
const AU_BRACKETS = [[18200, 0], [45000, 0.15], [135000, 0.30], [190000, 0.37], [Infinity, 0.45]];
function australia(gross, pension) {
  const taxable = pos(gross - pension);
  const { tax, marginal } = bracketTax(taxable, AU_BRACKETS);
  // Low income tax offset: 700, reduced by 5c per $ over 37,500 to 45,000, then 1.5c per $ to 66,667.
  const lito = taxable <= 37500 ? 700 : taxable <= 45000 ? 700 - (taxable - 37500) * 0.05 : taxable <= 66667 ? 325 - (taxable - 45000) * 0.015 : 0;
  const income = pos(tax - lito);
  const medicare = taxable * 0.02;
  return { federal: income, ss: 0, medicare, state: 0, sdi: 0, marginal: marginal + 0.02 };
}

// ---------- India FY 2026-27, new regime ----------
const IN_BRACKETS = [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]];
function india(gross, epf) {
  const taxable = pos(gross - 75000);
  let { tax, marginal } = bracketTax(taxable, IN_BRACKETS);
  if (taxable <= 1200000) { tax = 0; marginal = taxable > 400000 ? marginal : 0; }
  else tax = Math.min(tax, taxable - 1200000); // marginal relief just above the rebate limit
  const surRate = taxable > 20000000 ? 0.25 : taxable > 10000000 ? 0.15 : taxable > 5000000 ? 0.10 : 0;
  const withSur = tax * (1 + surRate);
  const cess = withSur * 0.04;
  return { federal: withSur, ss: 0, medicare: cess, state: 0, sdi: 0, marginal: marginal * (1 + surRate) * 1.04 };
}

export const FREQ = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, annual: 1 };

// input: { mode, gross (annual), pensionPct, healthPerPeriod, frequency, province, customRate, taxPct, socialPct }
export function calculateGlobal(input) {
  const mode = Object.hasOwn(COUNTRIES, input.mode) ? input.mode : 'OTHER';
  const periods = FREQ[Object.hasOwn(FREQ, input.frequency) ? input.frequency : 'monthly'];
  const gross = pos(+input.gross || 0);
  const health = Math.min(pos(+input.healthPerPeriod || 0) * periods, gross);
  const wages = gross - health;
  const pension = Math.min(wages * Math.min(pos(+input.pensionPct || 0), 100) / 100, wages);
  let l;
  if (mode === 'GB') l = uk(wages, pension);
  else if (mode === 'CA') l = canada(wages, pension, input.province, input.customRate);
  else if (mode === 'AU') l = australia(wages, pension);
  else if (mode === 'IN') l = india(wages, 0);
  else if (mode === 'GULF') l = { federal: 0, ss: 0, medicare: 0, state: 0, sdi: 0, marginal: 0 };
  else {
    const t = Math.min(pos(+input.taxPct || 0), 100) / 100, s = Math.min(pos(+input.socialPct || 0), 100) / 100;
    l = { federal: wages * t, ss: wages * s, medicare: 0, state: 0, sdi: 0, marginal: t + s };
  }
  // Pension tax relief, where it exists, is handled inside each country function.
  const taxes = l.federal + l.ss + l.medicare + l.state + l.sdi;
  const net = Math.max(wages - pension - taxes, 0);
  const lines = { gross, federal: l.federal, ss: l.ss, medicare: l.medicare, state: l.state, sdi: 0, k401: pension, pretax: health, net };
  const per = (x) => r2(x / periods);
  return {
    mode, status: 'single', frequency: Object.keys(FREQ).find((k) => FREQ[k] === periods), periods,
    stateName: l.provName || COUNTRIES[mode].name, stateType: 'global',
    labels: COUNTRIES[mode].labels, note: COUNTRIES[mode].note,
    annual: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, r2(v)])),
    perPeriod: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, per(v)])),
    taxes: r2(taxes), taxesPerPeriod: per(taxes),
    effectiveRate: gross > 0 ? taxes / gross : 0, marginalRate: l.marginal, fedMarginal: l.marginal,
    fedTaxable: 0, ctc: 0,
    hourlyNet: null,
  };
}
