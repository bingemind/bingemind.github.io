// Shared file: identical copy in every calculator folder. The master is tools-build/shared/geo.js in the MicroTools project; edit it there and re-run tools/build_bingemind.py.
// Country data for example defaults. Values are typical figures to start from (late 2026),
// never quotes: every page tells visitors to replace them with their own numbers.

// Approximate units of local currency per US dollar, only used to turn a US example amount
// into a sensible local example (rounded to two significant figures).
export const FX = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.38, AUD: 1.52, NZD: 1.68, INR: 88, PKR: 280, BDT: 122, LKR: 300,
  NPR: 140, SGD: 1.32, MYR: 4.3, PHP: 58, IDR: 16000, THB: 33, VND: 26000, JPY: 150, KRW: 1400, CNY: 7.2,
  HKD: 7.8, TWD: 32, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, BHD: 0.376, OMR: 0.385, ILS: 3.7, TRY: 41,
  EGP: 48, ZAR: 18, NGN: 1500, KES: 129, GHS: 12, CHF: 0.8, SEK: 9.5, NOK: 10.2, DKK: 6.9, PLN: 3.7,
  CZK: 21, HUF: 340, RON: 4.4, UAH: 41, MXN: 18.5, BRL: 5.4, ARS: 1400, CLP: 940, COP: 3900, PEN: 3.6,
};

export function sig2(x) {
  if (!x) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / p) * p;
}
// Rough price level compared with the US (1 = same), so example amounts look typical locally
// (a home in India is not the US price converted at the exchange rate). Examples only.
const LEVEL = {
  INR: 0.25, PKR: 0.22, BDT: 0.28, LKR: 0.3, NPR: 0.25, NGN: 0.25, KES: 0.3, GHS: 0.3, EGP: 0.25, UAH: 0.3,
  VND: 0.35, IDR: 0.35, PHP: 0.35, THB: 0.45, MYR: 0.45, CNY: 0.55, TRY: 0.45, ZAR: 0.45, BRL: 0.5, MXN: 0.5,
  ARS: 0.5, COP: 0.4, PEN: 0.45, CLP: 0.55, RON: 0.5, HUF: 0.55, PLN: 0.55, CZK: 0.65, TWD: 0.6, KRW: 0.75,
  JPY: 0.75, SAR: 0.7, OMR: 0.7, BHD: 0.75, KWD: 0.8, QAR: 0.9, AED: 0.9, ILS: 1, SGD: 1, HKD: 1,
};
export const priceLevel = (currency) => LEVEL[currency] ?? 1;
// A US-dollar example amount in local currency, rounded to two significant figures.
export const localAmount = (usd, currency) => (currency === 'USD' ? usd : sig2(usd * (FX[currency] || 1) * priceLevel(currency)));
// Exchange-rate conversion only, for prices that are global (solar hardware, electricity data in USD).
export const fxAmount = (usd, currency) => (currency === 'USD' ? usd : sig2(usd * (FX[currency] || 1)));
// Typical household electricity use, kWh a month.
const KWH = { US: 860, CA: 900, AU: 500, NZ: 600, GB: 225, IE: 350, DE: 290, FR: 380, ES: 270, IT: 220, NL: 250, BE: 280, AT: 300, CH: 380, SE: 600, NO: 1200, DK: 300, FI: 600, PL: 180, IN: 120, PK: 200, BD: 80, ZA: 600, AE: 1500, SA: 1300, QA: 1800, KW: 2000, JP: 400, KR: 300, CN: 150, SG: 400, MY: 350, MX: 200, BR: 160 };
export const homeKwh = (c) => KWH[c] ?? 300;

const pick = (table, code, fallback) => (code in table ? table[code] : fallback);

// Typical new-loan home rates, % a year (fixed where that is normal; 5-year fixed in Canada).
const HOME_RATE = {
  US: 6.3, CA: 4.4, GB: 4.4, IE: 3.9, AU: 5.9, NZ: 5.2, IN: 8.4, DE: 3.7, FR: 3.3, ES: 2.9, IT: 3.3, NL: 3.9,
  BE: 3.4, PT: 3.2, AT: 3.5, FI: 3.4, GR: 3.8, CH: 1.6, SE: 3.0, NO: 5.3, DK: 4.0, PL: 7.0, CZ: 4.9, HU: 6.5,
  RO: 6.5, SG: 3.0, MY: 4.1, PH: 7.5, ID: 7.5, TH: 6.0, VN: 9.0, JP: 1.3, KR: 4.2, CN: 3.1, HK: 3.5, TW: 2.3,
  AE: 4.5, SA: 5.5, QA: 5.5, KW: 5.0, BH: 6.0, OM: 6.0, IL: 5.0, TR: 38, EG: 24, ZA: 11, NG: 22, KE: 15, GH: 28,
  MX: 11, BR: 11.5, AR: 12, CL: 4.5, CO: 13, PE: 9, PK: 17, BD: 12, LK: 12, NP: 10, UA: 15,
};
export const homeRate = (c) => pick(HOME_RATE, c, 6);
export const carRate = (c) => Math.round((homeRate(c) + 1.5) * 10) / 10;
export const personalRate = (c) => Math.round((homeRate(c) + 5.5) * 10) / 10;
export const cardRate = (c) => Math.round(Math.max(homeRate(c) + 15, 18) * 10) / 10;

const INFL = { US: 3, CA: 2.5, GB: 3.5, AU: 3, IN: 4.5, JP: 2, TR: 30, AR: 30, EG: 15, NG: 20, GH: 15, PK: 8, UA: 12, BR: 5, MX: 4, ZA: 4.5, KE: 5.5, CH: 1, CN: 1 };
export const inflation = (c) => pick(INFL, c, 3);

// Home ownership costs, % of home value a year.
const PROP_TAX = { US: 1.0, CA: 0.8, GB: 0, IE: 0.1, AU: 0.3, NZ: 0.4, IN: 0.1, DE: 0.3, FR: 0.8, ES: 0.5, IT: 0.4, NL: 0.1, JP: 1.4, AE: 0, SG: 0.4 };
export const propertyTax = (c) => pick(PROP_TAX, c, 0.5);
// Mortgage insurance on a low deposit (% of loan a year) only applies as monthly PMI in the US.
export const usesPMI = (c) => c === 'US';
// Canada and Ireland fixed rates compound twice a year by law/convention.
export const semiAnnual = (c) => c === 'CA';
export const termYears = (c) => ({ US: 30, CA: 25, GB: 25, IE: 30, AU: 30, NZ: 30, IN: 20, DE: 30, JP: 35, FR: 25, ES: 30 }[c] || 25);

// Electricity, US dollars per kWh (converted to local), and peak sun hours a day.
const POWER = { US: 0.18, CA: 0.13, GB: 0.33, IE: 0.40, AU: 0.22, NZ: 0.21, DE: 0.43, FR: 0.27, ES: 0.25, IT: 0.35, NL: 0.35, BE: 0.40, PT: 0.25, AT: 0.33, CH: 0.35, SE: 0.25, NO: 0.15, DK: 0.38, PL: 0.25, IN: 0.09, PK: 0.18, ZA: 0.18, JP: 0.22, KR: 0.12, AE: 0.08, SA: 0.05, MX: 0.10, BR: 0.17 };
export const powerPrice = (c) => pick(POWER, c, 0.18);
const SUN = { US: 4.5, CA: 3.8, GB: 2.8, IE: 2.7, AU: 5.0, NZ: 4.0, DE: 3.0, FR: 3.6, ES: 5.0, IT: 4.3, NL: 2.9, BE: 2.9, PT: 4.9, AT: 3.4, CH: 3.4, SE: 2.6, NO: 2.4, DK: 2.8, PL: 3.0, FI: 2.4, GR: 4.6, IN: 5.2, PK: 5.3, BD: 4.6, LK: 5.0, NP: 5.0, ZA: 5.5, JP: 3.8, KR: 3.9, CN: 4.2, AE: 6.0, SA: 6.2, QA: 5.8, KW: 6.0, BH: 5.8, OM: 6.0, IL: 5.8, TR: 4.6, EG: 6.0, NG: 5.2, KE: 5.5, GH: 5.0, MX: 5.5, BR: 5.0, AR: 4.8, CL: 5.5, CO: 4.5, PE: 5.0, SG: 4.3, MY: 4.6, PH: 4.8, ID: 4.8, TH: 5.0, VN: 4.6, HK: 3.8, TW: 3.8 };
export const sunHours = (c) => pick(SUN, c, 4.3);
const SOLAR_COST = { US: 2.9, AU: 1.0, GB: 1.6, DE: 1.6, IN: 0.55, CN: 0.5, PK: 0.45, ZA: 1.1, NL: 1.3, ES: 1.2, IT: 1.5 };
export const solarCostPerW = (c) => pick(SOLAR_COST, c, 1.4);

// Standard consumption-tax rates (VAT/GST), % (checked November 2026; reduced rates listed where common).
export const VAT = {
  GB: [20, [20, 5, 0], 'VAT'], IE: [23, [23, 13.5, 9, 0], 'VAT'], DE: [19, [19, 7], 'MwSt'], FR: [20, [20, 10, 5.5, 2.1], 'TVA'],
  ES: [21, [21, 10, 4], 'IVA'], IT: [22, [22, 10, 5, 4], 'IVA'], NL: [21, [21, 9], 'BTW'], BE: [21, [21, 12, 6], 'BTW/TVA'],
  PT: [23, [23, 13, 6], 'IVA'], AT: [20, [20, 13, 10], 'USt'], FI: [25.5, [25.5, 13.5, 10], 'ALV'], GR: [24, [24, 13, 6], 'ΦΠΑ'],
  CH: [8.1, [8.1, 3.8, 2.6], 'MWST'], SE: [25, [25, 12, 6], 'moms'], NO: [25, [25, 15, 12], 'MVA'], DK: [25, [25], 'moms'],
  PL: [23, [23, 8, 5], 'VAT'], CZ: [21, [21, 12], 'DPH'], HU: [27, [27, 18, 5], 'ÁFA'], RO: [21, [21, 11], 'TVA'],
  UA: [20, [20, 14, 7], 'VAT'], TR: [20, [20, 10, 1], 'KDV'], IL: [18, [18, 0], 'VAT'], AE: [5, [5, 0], 'VAT'],
  SA: [15, [15], 'VAT'], BH: [10, [10], 'VAT'], OM: [5, [5], 'VAT'], QA: [0, [0], 'no VAT'], KW: [0, [0], 'no VAT'],
  EG: [14, [14], 'VAT'], ZA: [15, [15], 'VAT'], NG: [7.5, [7.5], 'VAT'], KE: [16, [16, 8], 'VAT'], GH: [20, [20], 'VAT and levies'],
  IN: [18, [18, 5, 40, 0], 'GST'], PK: [18, [18], 'sales tax'], BD: [15, [15, 10, 7.5, 5], 'VAT'], LK: [18, [18], 'VAT'],
  NP: [13, [13], 'VAT'], SG: [9, [9], 'GST'], MY: [10, [10, 8, 5], 'SST'], PH: [12, [12], 'VAT'], ID: [11, [11, 12], 'PPN'],
  TH: [7, [7], 'VAT'], VN: [10, [10, 8, 5], 'VAT'], JP: [10, [10, 8], '消費税'], KR: [10, [10], 'VAT'], CN: [13, [13, 9, 6], 'VAT'],
  HK: [0, [0], 'no sales tax'], TW: [5, [5], 'VAT'], AU: [10, [10], 'GST'], NZ: [15, [15], 'GST'], CA: [5, [5], 'GST/HST'],
  US: [0, [0], 'sales tax'], MX: [16, [16, 8, 0], 'IVA'], BR: [0, [0], 'ICMS/ISS'], AR: [21, [21, 10.5], 'IVA'],
  CL: [19, [19], 'IVA'], CO: [19, [19, 5], 'IVA'], PE: [18, [18], 'IGV'],
};

// US state sales tax (state rate only, before local add-ons), % for 2026.
export const US_STATES = [
  ['AL', 'Alabama', 4], ['AK', 'Alaska', 0], ['AZ', 'Arizona', 5.6], ['AR', 'Arkansas', 6.5], ['CA', 'California', 7.25],
  ['CO', 'Colorado', 2.9], ['CT', 'Connecticut', 6.35], ['DE', 'Delaware', 0], ['DC', 'District of Columbia', 6], ['FL', 'Florida', 6],
  ['GA', 'Georgia', 4], ['HI', 'Hawaii', 4], ['ID', 'Idaho', 6], ['IL', 'Illinois', 6.25], ['IN', 'Indiana', 7], ['IA', 'Iowa', 6],
  ['KS', 'Kansas', 6.5], ['KY', 'Kentucky', 6], ['LA', 'Louisiana', 5], ['ME', 'Maine', 5.5], ['MD', 'Maryland', 6],
  ['MA', 'Massachusetts', 6.25], ['MI', 'Michigan', 6], ['MN', 'Minnesota', 6.875], ['MS', 'Mississippi', 7], ['MO', 'Missouri', 4.225],
  ['MT', 'Montana', 0], ['NE', 'Nebraska', 5.5], ['NV', 'Nevada', 6.85], ['NH', 'New Hampshire', 0], ['NJ', 'New Jersey', 6.625],
  ['NM', 'New Mexico', 4.875], ['NY', 'New York', 4], ['NC', 'North Carolina', 4.75], ['ND', 'North Dakota', 5], ['OH', 'Ohio', 5.75],
  ['OK', 'Oklahoma', 4.5], ['OR', 'Oregon', 0], ['PA', 'Pennsylvania', 6], ['RI', 'Rhode Island', 7], ['SC', 'South Carolina', 6],
  ['SD', 'South Dakota', 4.2], ['TN', 'Tennessee', 7], ['TX', 'Texas', 6.25], ['UT', 'Utah', 6.1], ['VT', 'Vermont', 6],
  ['VA', 'Virginia', 5.3], ['WA', 'Washington', 6.5], ['WV', 'West Virginia', 6], ['WI', 'Wisconsin', 5], ['WY', 'Wyoming', 4],
];
// Canadian provinces: combined GST + PST/QST or HST, %.
export const CA_PROV = [
  ['AB', 'Alberta', 5], ['BC', 'British Columbia', 12], ['MB', 'Manitoba', 12], ['NB', 'New Brunswick', 15], ['NL', 'Newfoundland and Labrador', 15],
  ['NS', 'Nova Scotia', 14], ['ON', 'Ontario', 13], ['PE', 'Prince Edward Island', 15], ['QC', 'Quebec', 14.975], ['SK', 'Saskatchewan', 11],
  ['NT', 'Northwest Territories', 5], ['NU', 'Nunavut', 5], ['YT', 'Yukon', 5],
];
