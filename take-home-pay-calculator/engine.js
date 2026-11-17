// Take-home pay engine, tax year 2026. Pure functions.
// Federal: IRS Rev. Proc. 2025-32. Social Security wage base: SSA ($184,500).
// State rates: Tax Foundation "State Individual Income Tax Rates and Brackets, 2026".
// Reviewed 13 Nov 2026. Official sources (links):
//   IRS 2026 inflation adjustments (Rev. Proc. 2025-32): https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
//   Social Security wage base: https://www.ssa.gov/oact/cola/cbb.html
//   California 2026 indexing (FTB): https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html
//   Mississippi Department of Revenue: https://www.dor.ms.gov/general-information
//   State rates (not a tax authority, cross-check against each state's revenue site): https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/

export const YEAR = 2026;

export const FED = {
  single: { std: 16100, brackets: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]] },
  mfj:    { std: 32200, brackets: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]] },
  hoh:    { std: 24150, brackets: [[17700, 0.10], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]] },
};

export const FICA = { ssRate: 0.062, ssWageBase: 184500, medRate: 0.0145, addlMedRate: 0.009, addlMedThreshold: 200000 };
export const CTC = { perChild: 2200, phaseStart: { single: 200000, hoh: 200000, mfj: 400000 }, phasePer1000: 50 };

export const FREQ = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, annual: 1 };

// type: none | flat | ca | custom. ded = simple state deduction/exemption by status (approximation).
export const STATES = {
  AK: { name: 'Alaska', type: 'none' }, FL: { name: 'Florida', type: 'none' }, NV: { name: 'Nevada', type: 'none' },
  NH: { name: 'New Hampshire', type: 'none' }, SD: { name: 'South Dakota', type: 'none' }, TN: { name: 'Tennessee', type: 'none' },
  TX: { name: 'Texas', type: 'none' }, WA: { name: 'Washington', type: 'none' }, WY: { name: 'Wyoming', type: 'none' },
  AZ: { name: 'Arizona', type: 'flat', rate: 0.025, ded: { single: 8350, mfj: 16700, hoh: 12525 } },
  CO: { name: 'Colorado', type: 'flat', rate: 0.044, ded: 'federal' },
  GA: { name: 'Georgia', type: 'flat', rate: 0.0499, ded: { single: 12000, mfj: 24000, hoh: 12000 } },
  ID: { name: 'Idaho', type: 'flat', rate: 0.053, ded: 'federal' },
  IL: { name: 'Illinois', type: 'flat', rate: 0.0495, ded: { single: 2925, mfj: 5850, hoh: 2925 } },
  IN: { name: 'Indiana', type: 'flat', rate: 0.0295, ded: { single: 1000, mfj: 2000, hoh: 1000 } },
  IA: { name: 'Iowa', type: 'flat', rate: 0.038, ded: 'federal' },
  KY: { name: 'Kentucky', type: 'flat', rate: 0.035, ded: { single: 3270, mfj: 3270, hoh: 3270 } },
  LA: { name: 'Louisiana', type: 'flat', rate: 0.03, ded: { single: 12500, mfj: 25000, hoh: 25000 } },
  MI: { name: 'Michigan', type: 'flat', rate: 0.0425, ded: { single: 5800, mfj: 11600, hoh: 5800 } },
  // Mississippi 2026: 4% above the first $10,000 (0% band), personal exemption ($6,000 single, $12,000 joint, $8,000 head of family) and standard deduction ($2,300 / $4,600 / $3,400). Joint assumes one earner's 0% band.
  MS: { name: 'Mississippi', type: 'flat', rate: 0.04, ded: { single: 18300, mfj: 26600, hoh: 21400 } },
  NC: { name: 'North Carolina', type: 'flat', rate: 0.0399, ded: { single: 12750, mfj: 25500, hoh: 19125 } },
  OH: { name: 'Ohio', type: 'flat', rate: 0.0275, ded: { single: 26050, mfj: 26050, hoh: 26050 } },
  PA: { name: 'Pennsylvania', type: 'flat', rate: 0.0307, ded: { single: 0, mfj: 0, hoh: 0 }, retirementTaxed: true },
  UT: { name: 'Utah', type: 'flat', rate: 0.0445, ded: { single: 0, mfj: 0, hoh: 0 } },
  CA: { name: 'California', type: 'ca' },
  OTHER: { name: 'Other state (enter your rate)', type: 'custom' },
};

// California 2026 (FTB Tax News, October 2026: 2026 indexing, Schedules X and Y), standard deduction and exemption credit.
// The 1% mental health surcharge above $1,000,000 is the last step to 13.3%. SDI 1.3% on all wages.
export const CA = {
  single: { std: 5900, credit: 158, brackets: [[11456, 0.01], [27157, 0.02], [42861, 0.04], [59498, 0.06], [75197, 0.08], [384109, 0.093], [460927, 0.103], [768213, 0.113], [1000000, 0.123], [Infinity, 0.133]] },
  mfj: { std: 11800, credit: 316, brackets: [[22912, 0.01], [54314, 0.02], [85722, 0.04], [118996, 0.06], [150394, 0.08], [768218, 0.093], [921854, 0.103], [1000000, 0.113], [1536426, 0.123], [Infinity, 0.133]] },
  sdi: 0.013,
};

export function bracketTax(income, brackets) {
  let tax = 0, prev = 0, marginal = brackets[0][1];
  for (const [top, rate] of brackets) {
    if (income <= prev) break;
    const slice = Math.min(income, top) - prev;
    tax += slice * rate;
    marginal = rate;
    prev = top;
  }
  return { tax, marginal: income > 0 ? marginal : 0 };
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function annualGross({ payType, salary, hourly, hoursPerWeek, weeksPerYear = 52 }) {
  if (payType === 'hourly') return Math.max(+hourly || 0, 0) * Math.max(+hoursPerWeek || 0, 0) * Math.max(+weeksPerYear || 52, 0);
  return Math.max(+salary || 0, 0);
}

export function calculateTakeHome(input) {
  const status = Object.hasOwn(FED, input.status) ? input.status : 'single';
  const freq = Object.hasOwn(FREQ, input.frequency) ? input.frequency : 'biweekly';
  const periods = FREQ[freq];
  const gross = annualGross(input);
  const pct401k = Math.min(Math.max(+input.k401Pct || 0, 0), 100) / 100;
  let k401 = Math.min(gross * pct401k, 24500); // 2026 employee deferral limit
  const health = Math.max(+input.healthPerPeriod || 0, 0) * periods; // section 125: pre-tax for income tax and FICA
  const hsa = Math.max(+input.hsaPerPeriod || 0, 0) * periods;
  const pretaxCafeteria = Math.min(health + hsa, gross);
  k401 = Math.min(k401, gross - pretaxCafeteria);
  const kids = Math.max(Math.floor(+input.children || 0), 0);

  // Federal income tax (annual liability)
  const fedWages = Math.max(gross - k401 - pretaxCafeteria, 0);
  const fedTaxable = Math.max(fedWages - FED[status].std, 0);
  const { tax: fedBefore, marginal } = bracketTax(fedTaxable, FED[status].brackets);
  const over = Math.max(fedWages - CTC.phaseStart[status], 0);
  const ctcAllowed = Math.max(kids * CTC.perChild - Math.ceil(over / 1000) * CTC.phasePer1000, 0);
  const federal = Math.max(fedBefore - ctcAllowed, 0);

  // FICA: 401(k) is still subject to FICA; cafeteria (health, HSA) is not.
  const ficaWages = Math.max(gross - pretaxCafeteria, 0);
  const ss = Math.min(ficaWages, FICA.ssWageBase) * FICA.ssRate;
  const medicare = ficaWages * FICA.medRate + Math.max(ficaWages - FICA.addlMedThreshold, 0) * FICA.addlMedRate;

  // State
  const st = Object.hasOwn(STATES, input.state) ? STATES[input.state] : STATES.TX;
  let state = 0, stateMarginal = 0, sdi = 0;
  const stateWages = st.retirementTaxed ? Math.max(gross - pretaxCafeteria, 0) : fedWages;
  if (st.type === 'flat') {
    const ded = st.ded === 'federal' ? FED[status].std : (st.ded[status] ?? 0);
    state = Math.max(stateWages - ded, 0) * st.rate;
    stateMarginal = stateWages > ded ? st.rate : 0;
  } else if (st.type === 'ca') {
    const t = status === 'mfj' ? CA.mfj : CA.single;
    const { tax, marginal: m } = bracketTax(Math.max(stateWages - t.std, 0), t.brackets);
    state = Math.max(tax - t.credit, 0);
    stateMarginal = m;
    sdi = ficaWages * CA.sdi;
  } else if (st.type === 'custom') {
    const rate = Math.min(Math.max(+input.customStateRate || 0, 0), 15) / 100;
    state = stateWages * rate;
    stateMarginal = rate;
  }

  const taxes = federal + ss + medicare + state + sdi;
  const deductions = k401 + pretaxCafeteria;
  const net = Math.max(gross - taxes - deductions, 0);
  const per = (x) => r2(x / periods);
  const lines = { gross, federal, ss, medicare, state, sdi, k401, pretax: pretaxCafeteria, net };
  const perPeriod = Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, per(v)]));
  const annual = Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, r2(v)]));
  return {
    status, frequency: freq, periods, stateName: st.name, stateType: st.type,
    annual, perPeriod,
    taxes: r2(taxes), taxesPerPeriod: per(taxes),
    effectiveRate: gross > 0 ? taxes / gross : 0,
    marginalRate: marginal + stateMarginal + (ficaWages < FICA.ssWageBase ? FICA.ssRate : 0) + FICA.medRate + (ficaWages > FICA.addlMedThreshold ? FICA.addlMedRate : 0) + (sdi ? CA.sdi : 0),
    fedMarginal: marginal, fedTaxable: r2(fedTaxable), ctc: r2(Math.min(ctcAllowed, fedBefore)),
    hourlyNet: input.payType === 'hourly' && +input.hoursPerWeek > 0 ? r2(net / ((+input.weeksPerYear || 52) * +input.hoursPerWeek)) : null,
  };
}
