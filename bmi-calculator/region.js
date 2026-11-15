// Shared file: identical copy in every calculator folder. The master is tools-build/shared/region.js in the MicroTools project; edit it there and re-run tools/build_bingemind.py.
// Region: country, currency, number format and default units. No network, no dependencies.
// Every tool imports this through kit.js, so money() and number parsing follow the visitor's country.

// code: [name, ISO currency, locale, default units]
export const REGIONS = {
  US: ['United States', 'USD', 'en-US', 'imperial'], CA: ['Canada', 'CAD', 'en-CA', 'metric'],
  GB: ['United Kingdom', 'GBP', 'en-GB', 'imperial'], IE: ['Ireland', 'EUR', 'en-IE', 'metric'],
  AU: ['Australia', 'AUD', 'en-AU', 'metric'], NZ: ['New Zealand', 'NZD', 'en-NZ', 'metric'],
  IN: ['India', 'INR', 'en-IN', 'metric'], PK: ['Pakistan', 'PKR', 'en-PK', 'metric'],
  BD: ['Bangladesh', 'BDT', 'en-BD', 'metric'], LK: ['Sri Lanka', 'LKR', 'en-LK', 'metric'],
  NP: ['Nepal', 'NPR', 'en-NP', 'metric'], SG: ['Singapore', 'SGD', 'en-SG', 'metric'],
  MY: ['Malaysia', 'MYR', 'en-MY', 'metric'], PH: ['Philippines', 'PHP', 'en-PH', 'metric'],
  ID: ['Indonesia', 'IDR', 'id-ID', 'metric'], TH: ['Thailand', 'THB', 'th-TH', 'metric'],
  VN: ['Vietnam', 'VND', 'vi-VN', 'metric'], JP: ['Japan', 'JPY', 'ja-JP', 'metric'],
  KR: ['South Korea', 'KRW', 'ko-KR', 'metric'], CN: ['China', 'CNY', 'zh-CN', 'metric'],
  HK: ['Hong Kong', 'HKD', 'en-HK', 'metric'], TW: ['Taiwan', 'TWD', 'zh-TW', 'metric'],
  AE: ['United Arab Emirates', 'AED', 'en-AE', 'metric'], SA: ['Saudi Arabia', 'SAR', 'en-SA', 'metric'],
  QA: ['Qatar', 'QAR', 'en-QA', 'metric'], KW: ['Kuwait', 'KWD', 'en-KW', 'metric'],
  BH: ['Bahrain', 'BHD', 'en-BH', 'metric'], OM: ['Oman', 'OMR', 'en-OM', 'metric'],
  IL: ['Israel', 'ILS', 'en-IL', 'metric'], TR: ['Türkiye', 'TRY', 'tr-TR', 'metric'],
  EG: ['Egypt', 'EGP', 'en-EG', 'metric'], ZA: ['South Africa', 'ZAR', 'en-ZA', 'metric'],
  NG: ['Nigeria', 'NGN', 'en-NG', 'metric'], KE: ['Kenya', 'KES', 'en-KE', 'metric'],
  GH: ['Ghana', 'GHS', 'en-GH', 'metric'], DE: ['Germany', 'EUR', 'de-DE', 'metric'],
  FR: ['France', 'EUR', 'fr-FR', 'metric'], ES: ['Spain', 'EUR', 'es-ES', 'metric'],
  IT: ['Italy', 'EUR', 'it-IT', 'metric'], NL: ['Netherlands', 'EUR', 'nl-NL', 'metric'],
  BE: ['Belgium', 'EUR', 'nl-BE', 'metric'], PT: ['Portugal', 'EUR', 'pt-PT', 'metric'],
  AT: ['Austria', 'EUR', 'de-AT', 'metric'], FI: ['Finland', 'EUR', 'fi-FI', 'metric'],
  GR: ['Greece', 'EUR', 'el-GR', 'metric'], CH: ['Switzerland', 'CHF', 'de-CH', 'metric'],
  SE: ['Sweden', 'SEK', 'sv-SE', 'metric'], NO: ['Norway', 'NOK', 'nb-NO', 'metric'],
  DK: ['Denmark', 'DKK', 'da-DK', 'metric'], PL: ['Poland', 'PLN', 'pl-PL', 'metric'],
  CZ: ['Czechia', 'CZK', 'cs-CZ', 'metric'], HU: ['Hungary', 'HUF', 'hu-HU', 'metric'],
  RO: ['Romania', 'RON', 'ro-RO', 'metric'], UA: ['Ukraine', 'UAH', 'uk-UA', 'metric'],
  MX: ['Mexico', 'MXN', 'es-MX', 'metric'], BR: ['Brazil', 'BRL', 'pt-BR', 'metric'],
  AR: ['Argentina', 'ARS', 'es-AR', 'metric'], CL: ['Chile', 'CLP', 'es-CL', 'metric'],
  CO: ['Colombia', 'COP', 'es-CO', 'metric'], PE: ['Peru', 'PEN', 'es-PE', 'metric'],
};

const TZ = { // IANA time zone to country, for a first guess when nothing is saved
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
  'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID', 'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM',
  'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Jerusalem': 'IL',
  'Europe/Istanbul': 'TR', 'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
  'Africa/Accra': 'GH', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Lisbon': 'PT', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Athens': 'GR', 'Europe/Kyiv': 'UA',
  'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR', 'America/Santiago': 'CL',
  'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Halifax': 'CA', 'America/Winnipeg': 'CA',
};

let code = 'US';
const listeners = new Set();
const fmtCache = new Map();

function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

export function detectRegion() {
  const q = new URLSearchParams(location.search).get('country');
  if (q && REGIONS[q.toUpperCase()]) return q.toUpperCase();
  const saved = safeGet('region');
  if (saved && REGIONS[saved]) return saved;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ[tz]) return TZ[tz];
  } catch (e) { /* ignore */ }
  const lang = (navigator.language || '').split('-')[1];
  if (lang && REGIONS[lang.toUpperCase()]) return lang.toUpperCase();
  return 'US';
}

export const getRegion = () => code;
export const regionInfo = () => { const r = REGIONS[code]; return { code, name: r[0], currency: r[1], locale: r[2], units: r[3] }; };
export const onRegionChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setRegion(next, { save = true } = {}) {
  if (!REGIONS[next]) return;
  code = next;
  if (save) safeSet('region', next);
  syncCurrencySymbols();
  listeners.forEach((fn) => fn(regionInfo()));
}

function fmt(opts) {
  const { locale, currency } = regionInfo();
  const key = JSON.stringify([locale, currency, opts]);
  let f = fmtCache.get(key);
  if (!f) {
    try { f = new Intl.NumberFormat(locale, opts.cur ? { style: 'currency', currency, ...opts.o } : opts.o); }
    catch (e) { f = new Intl.NumberFormat('en-US', opts.cur ? { style: 'currency', currency, ...opts.o } : opts.o); }
    fmtCache.set(key, f);
  }
  return f;
}

// Currency with its own decimals (0 for yen, 3 for dinar). cents=false rounds to whole units.
export function money(n, cents = true) {
  return fmt({ cur: 1, o: cents ? {} : { minimumFractionDigits: 0, maximumFractionDigits: 0 } }).format(n);
}
export function num(n, d = 2) {
  return fmt({ o: { maximumFractionDigits: d } }).format(Math.round(n * 10 ** d) / 10 ** d);
}
export function currencySymbol() {
  const parts = fmt({ cur: 1, o: { maximumFractionDigits: 0 } }).formatToParts(0);
  return (parts.find((p) => p.type === 'currency') || { value: '$' }).value;
}
export function syncCurrencySymbols() {
  const s = currencySymbol();
  document.querySelectorAll('[data-cur]').forEach((el) => { el.textContent = s; });
}

// Read a number typed in any common style: 1,234.56  1.234,56  1 234,56  1,00,000  12,5
export function parseNum(input) {
  let s = String(input ?? '').trim().replace(/[\s  ']/g, '').replace(/[^\d.,\-+]/g, '');
  if (!s) return NaN;
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
  const dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
  let dec = null;
  if (lastDot >= 0 && lastComma >= 0) dec = lastDot > lastComma ? '.' : ',';
  else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',', count = sep === '.' ? dots : commas;
    const tail = s.length - 1 - (sep === '.' ? lastDot : lastComma);
    if (count > 1) dec = null;                 // 1,00,000 or 1.234.567: grouping
    else if (tail !== 3) dec = sep;            // 12,5 or 3.14: decimal
    else dec = regionInfo().locale && new Intl.NumberFormat(regionInfo().locale).format(1.1)[1] === sep ? sep : null; // 1,234 is ambiguous: follow locale
  }
  if (dec) s = s.replace(dec === '.' ? /,/g : /\./g, '').replace(dec, '.');
  else s = s.replace(/[.,]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Country picker for the page header. Mounts into any element with data-region-picker.
export function mountRegionPicker(host = document.querySelector('[data-region-picker]')) {
  if (!host) return;
  const sel = document.createElement('select');
  sel.className = 'region-sel';
  sel.id = 'regionSel';
  sel.setAttribute('aria-label', 'Country and currency');
  const sorted = Object.entries(REGIONS).sort((a, b) => a[1][0].localeCompare(b[1][0]));
  sel.innerHTML = sorted.map(([k, r]) => `<option value="${k}">${r[0]} (${r[1]})</option>`).join('');
  sel.value = code;
  sel.addEventListener('change', () => setRegion(sel.value));
  onRegionChange(() => { sel.value = code; });
  host.replaceChildren(sel);
}

export function initRegion() {
  code = detectRegion();
  document.documentElement.dataset.region = code;
  mountRegionPicker();
  syncCurrencySymbols();
}
