import { calculateTakeHome, annualGross, STATES } from './engine.js';
import { calculateGlobal, modeFor, CA_PROVINCES, COUNTRIES } from './global.js';
import { initKit, initSeg, countUp, copyText, money, num as fmtNum, announce, downloadFile, setInvalid, initMiniTotal, parseNum, onRegionChange, getRegion, regionInfo } from './kit.js';

initKit();
const $ = (id) => document.getElementById(id);
let payType = 'salary';
let mode = 'US';

const PER_LABEL = { weekly: 'per week', biweekly: 'every 2 weeks', semimonthly: 'twice a month', monthly: 'per month', annual: 'per year' };
const COLORS = { net: 'var(--ok)', federal: 'var(--reg)', fica: 'var(--gold)', state: 'var(--ot)', pretax: 'var(--dt)' };

// US state list: named states alphabetically, then "Other".
const sel = $('state');
const named = Object.entries(STATES).filter(([k]) => k !== 'OTHER').sort((a, b) => a[1].name.localeCompare(b[1].name));
const US_STATES_HTML = named.map(([k, s]) => `<option value="${k}">${s.name}${s.type === 'none' ? ' (no income tax)' : ''}</option>`).join('')
  + `<option value="OTHER">${STATES.OTHER.name}</option>`;
const CA_PROV_HTML = Object.entries(CA_PROVINCES).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('');

// Starting values that make sense for each country's pay scale.
const MODE_DEFAULTS = {
  US: { salary: '65,000', hourly: '25', freq: 'biweekly', pension: 5 },
  GB: { salary: '40,000', hourly: '20', freq: 'monthly', pension: 5 },
  CA: { salary: '70,000', hourly: '30', freq: 'biweekly', pension: 0 },
  AU: { salary: '90,000', hourly: '40', freq: 'monthly', pension: 0 },
  IN: { salary: '1,500,000', hourly: '750', freq: 'monthly', pension: 12 },
  GULF: { salary: '240,000', hourly: '120', freq: 'monthly', pension: 0 },
  OTHER: { salary: '40,000', hourly: '20', freq: 'monthly', pension: 0 },
};
// Typical yearly pay by currency, used when a country has no tax engine of its own.
const SALARY_BY_CURRENCY = { EUR: '45,000', CHF: '85,000', SEK: '500,000', NOK: '560,000', DKK: '420,000', PLN: '90,000', CZK: '600,000', HUF: '7,000,000', RON: '70,000', TRY: '600,000', JPY: '4,500,000', KRW: '40,000,000', CNY: '120,000', HKD: '400,000', TWD: '700,000', IDR: '120,000,000', THB: '360,000', VND: '250,000,000', MYR: '48,000', SGD: '60,000', PHP: '300,000', NZD: '70,000', ZAR: '300,000', NGN: '3,000,000', KES: '900,000', GHS: '40,000', EGP: '120,000', ILS: '180,000', MXN: '200,000', BRL: '48,000', ARS: '8,000,000', CLP: '9,000,000', COP: '30,000,000', PEN: '30,000', PKR: '1,200,000', BDT: '500,000', LKR: '1,200,000', NPR: '600,000', UAH: '200,000' };

const seg = initSeg($('payType'), (v) => { payType = v; syncType(); update(); });
function syncType() { $('salaryBox').hidden = payType !== 'salary'; $('hourlyBox').hidden = payType !== 'hourly'; }

function num(el, { fallback = 0, max = Infinity, msg = 'Enter a number' } = {}) {
  const raw = el.value.trim();
  if (raw === '') { setInvalid(el, false); return fallback; }
  const n = parseNum(raw);
  const bad = isNaN(n) || n < 0 || n > max;
  setInvalid(el, bad, msg);
  return bad ? fallback : n;
}

function readInput() {
  return {
    payType,
    salary: num($('salary'), { msg: 'Enter your yearly salary' }),
    hourly: num($('hourly'), { msg: 'Enter your hourly rate' }),
    hoursPerWeek: num($('hours'), { max: 168, msg: 'Use 0 to 168 hours' }),
    frequency: $('frequency').value,
    status: $('status').value,
    state: $('state').value,
    children: num($('children'), { max: 20, msg: 'Use a whole number, like 2' }),
    customStateRate: num($('customRate'), { max: 15, msg: 'Use 0 to 15%' }),
    k401Pct: +$('k401').value,
    healthPerPeriod: num($('health'), { msg: 'Enter an amount per paycheck' }),
    hsaPerPeriod: num($('hsa'), { msg: 'Enter an amount per paycheck' }),
    taxPct: num($('taxPct'), { max: 100, msg: 'Use 0 to 100%' }),
    socialPct: num($('socialPct'), { max: 100, msg: 'Use 0 to 100%' }),
  };
}

const pctTxt = (x) => `${(x * 100).toFixed(1)}%`;
let last = null;
const mini = initMiniTotal($('results'), 'Take-home <b id="miniNet">0</b><span id="miniPer"></span>');

function drawDonut(parts, total) {
  const arcs = $('arcs');
  let offset = 0;
  arcs.innerHTML = parts.filter((p) => p.v > 0).map((p) => {
    const len = total > 0 ? (p.v / total) * 100 : 0;
    const c = `<circle cx="21" cy="21" r="15.915" stroke="${p.c}" stroke-dasharray="0 100" stroke-dashoffset="${-offset}" data-len="${len}"></circle>`;
    offset += len;
    return c;
  }).join('');
  requestAnimationFrame(() => arcs.querySelectorAll('circle').forEach((c) => {
    c.setAttribute('stroke-dasharray', `${Math.max(+c.dataset.len - 0.4, 0)} ${100 - Math.max(+c.dataset.len - 0.4, 0)}`);
  }));
}

// Switch the form to the visitor's country: which fields exist, their labels, and sensible starting values.

// Intro, badges and the "reviewed against" line follow the country (the US text is prerendered).
const INTRO = {
  US: ['what lands in your account each paycheck after federal income tax, Social Security, Medicare, state tax and your 401(k), and where every dollar goes.', ['2026 IRS brackets', '401(k) slider', 'Child tax credit'], ' against IRS Rev. Proc. 2025-32, SSA and Tax Foundation data.'],
  GB: ['what lands in your account each payday after Income Tax, National Insurance and your workplace pension, and where every pound goes.', ['2026/27 HMRC rates', 'Workplace pension', 'England, Wales and NI'], ' against HMRC 2026 to 2027 rates and thresholds.'],
  CA: ['what lands in your account each payday after federal and provincial income tax, CPP and EI, and where every dollar goes.', ['2026 CRA rates', 'Ontario, BC and Alberta', 'RRSP contributions'], ' against Canada Revenue Agency 2026 payroll tables.'],
  AU: ['what lands in your account each payday after income tax and the Medicare levy, and where every dollar goes. Your employer pays super on top.', ['2026-27 ATO rates', 'Medicare levy', 'Salary-sacrificed super'], ' against ATO resident tax rates for 2026-27.'],
  IN: ['what lands in your account each month after income tax under the new regime, cess and your provident fund, and where every rupee goes.', ['FY 2026-27 new regime', '12 lakh rebate', 'Standard deduction'], ' against Income Tax Department slabs for FY 2026-27.'],
  GULF: ['what lands in your account each month. Your country does not tax wages, so the calculator shows pension and other deductions you set.', ['No income tax on wages', 'Pension deductions', 'Any pay frequency'], ' against official guidance that wages are not taxed in this country.'],
  OTHER: ['what lands in your account each payday after your income tax and social security, using the average rates from your own payslip.', ['Your own tax rates', 'Any currency', 'Any pay frequency'], ': enter your own rates from a recent payslip.'],
};
function setIntro() {
  const [lede, badges, src] = INTRO[mode] || INTRO.OTHER;
  $('lede').textContent = 'Enter your salary or hourly pay. See ' + lede;
  const items = [...$('trust').querySelectorAll('li')];
  [...badges, 'No sign-up, nothing uploaded'].forEach((t, i) => { if (items[i]) items[i].lastChild.textContent = t; });
  $('reviewed').textContent = src;
}

function applyMode(resetValues) {
  setIntro();
  const us = mode === 'US', ca = mode === 'CA';
  $('statusBox').hidden = !us; $('childrenBox').hidden = !us; $('hsaBox').hidden = !us;
  $('stateBox').hidden = !(us || ca);
  $('otherBox').hidden = mode !== 'OTHER';
  if (us) { sel.innerHTML = US_STATES_HTML; sel.value = 'TX'; $('stateLabel').textContent = 'State'; }
  if (ca) { sel.innerHTML = CA_PROV_HTML; sel.value = 'ON'; $('stateLabel').textContent = 'Province'; }
  const L = us ? null : COUNTRIES[mode].labels;
  $('k401Label').textContent = us ? '401(k) contribution' : `${L.pension} (% of pay)`;
  $('healthSummary').textContent = us ? 'Health insurance and HSA (pre-tax)' : 'Health insurance (taken before tax)';
  $('healthLabel').textContent = 'Health premium per paycheck';
  $('customRateLabel').textContent = ca ? 'Your provincial income tax rate (%)' : 'Your state income tax rate (%)';
  if (resetValues) {
    const d = { ...MODE_DEFAULTS[mode] };
    if (mode === 'OTHER' && SALARY_BY_CURRENCY[regionInfo().currency]) d.salary = SALARY_BY_CURRENCY[regionInfo().currency];
    const show = (s) => fmtNum(Number(String(s).replace(/,/g, '')), 0); // show defaults in the country's number style
    $('salary').value = show(d.salary); $('hourly').value = show(d.hourly); $('frequency').value = d.freq;
    $('k401').value = String(d.pension); $('health').value = '0'; $('hsa').value = '0'; $('children').value = '0';
  }
  renderSalaryTable();
}

function compute(input) {
  if (mode === 'US') return calculateTakeHome(input);
  const r = calculateGlobal({
    mode, gross: annualGross(input), pensionPct: input.k401Pct, healthPerPeriod: input.healthPerPeriod, frequency: input.frequency,
    province: input.state, customRate: input.customStateRate, taxPct: input.taxPct, socialPct: input.socialPct,
  });
  if (input.payType === 'hourly' && input.hoursPerWeek > 0) r.hourlyNet = Math.round(r.annual.net / (52 * input.hoursPerWeek) * 100) / 100;
  return r;
}

function update() {
  const input = readInput();
  const us = mode === 'US';
  const usesCustom = (us || mode === 'CA') && input.state === 'OTHER';
  $('customRateBox').hidden = !usesCustom;
  $('k401Out').textContent = `${input.k401Pct}%`;
  const r = compute(input);
  last = { input, r };
  const p = r.perPeriod;
  $('perLabel').textContent = PER_LABEL[r.frequency];
  countUp($('net'), p.net, (v) => money(v));
  countUp($('netYear'), r.annual.net, (v) => money(v, false));
  $('miniNet').textContent = money(p.net);
  $('miniPer').textContent = PER_LABEL[r.frequency];

  const L = r.labels;
  const joinL = (...a) => a.filter(Boolean).join(' + ');
  const parts = us ? [
    { k: 'You keep', v: p.net, c: COLORS.net },
    { k: 'Federal income tax', v: p.federal, c: COLORS.federal },
    { k: 'Social Security + Medicare', v: p.ss + p.medicare, c: COLORS.fica },
    { k: r.annual.sdi ? 'State tax + SDI' : 'State income tax', v: p.state + p.sdi, c: COLORS.state },
    { k: '401(k), health, HSA', v: p.k401 + p.pretax, c: COLORS.pretax },
  ] : [
    { k: 'You keep', v: p.net, c: COLORS.net },
    { k: L.federal, v: p.federal, c: COLORS.federal },
    { k: joinL(L.ss, L.medicare) || 'Social charges', v: p.ss + p.medicare, c: COLORS.fica, optional: true },
    { k: L.state || 'Regional tax', v: p.state, c: COLORS.state, optional: true },
    { k: `${L.pension}, health`, v: p.k401 + p.pretax, c: COLORS.pretax, optional: true },
  ].filter((x) => !x.optional || x.v > 0);
  drawDonut(parts, p.gross);
  $('keepPct').textContent = p.gross > 0 ? `${Math.round((p.net / p.gross) * 100)}%` : '–';
  $('donut').setAttribute('aria-label', parts.map((x) => `${x.k} ${money(x.v)}`).join(', '));
  $('split').innerHTML = parts.map((x) => `<li><i style="background:${x.c}"></i><span>${x.k}</span><b>${money(x.v)}</b></li>`).join('');

  $('eff').textContent = pctTxt(r.effectiveRate);
  $('marg').textContent = pctTxt(r.marginalRate);
  const showHr = r.hourlyNet !== null && r.hourlyNet !== undefined;
  $('hourlyNet').hidden = !showHr; $('hourlyNetL').hidden = !showHr;
  if (showHr) $('hourlyNet').textContent = `${money(r.hourlyNet)}/h`;

  const notes = [];
  if (us) {
    if (r.stateType === 'none') notes.push(`<strong>${r.stateName} has no state income tax on wages.</strong>`);
    if (r.stateType === 'custom') notes.push('<strong>Using your state rate.</strong> Pick your state above if it is listed for a closer estimate.');
    if (r.ctc > 0) notes.push(`Child tax credit lowers your federal tax by ${money(r.ctc, false)} a year.`);
    if (input.k401Pct > 0) {
      const without = calculateTakeHome({ ...input, k401Pct: 0 });
      notes.push(`Your ${input.k401Pct}% 401(k) saves ${money(p.k401)} a paycheck but only lowers take-home by ${money(without.perPeriod.net - p.net)}, because it cuts your income tax.`);
    }
  } else {
    notes.push(r.note);
    if (input.k401Pct > 0 && mode !== 'IN' && mode !== 'OTHER' && mode !== 'GULF') {
      const without = compute({ ...input, k401Pct: 0 });
      notes.push(`Your ${input.k401Pct}% ${L.pension.toLowerCase()} is ${money(p.k401)} a paycheck but only lowers take-home by ${money(without.perPeriod.net - p.net)}, because it cuts your income tax.`);
    }
  }
  $('note').innerHTML = notes.join(' ') || 'Tip: move the slider to see how saving more changes your paycheck.';

  const row = (label, per, yr) => `<tr><td>${label}</td><td>${money(per)}</td><td>${money(yr, false)}</td></tr>`;
  const a = r.annual;
  const lines = us ? `
    ${p.k401 ? row('401(k)', -p.k401, -a.k401) : ''}
    ${p.pretax ? row('Health and HSA', -p.pretax, -a.pretax) : ''}
    ${row('Federal income tax', -p.federal, -a.federal)}
    ${row('Social Security', -p.ss, -a.ss)}
    ${row('Medicare', -p.medicare, -a.medicare)}
    ${r.stateType !== 'none' ? row(`${r.stateName.replace(/ \(.*/, '')} income tax`, -p.state, -a.state) : ''}
    ${p.sdi ? row('California SDI', -p.sdi, -a.sdi) : ''}` : `
    ${p.k401 ? row(L.pension, -p.k401, -a.k401) : ''}
    ${p.pretax ? row('Health insurance', -p.pretax, -a.pretax) : ''}
    ${row(L.federal, -p.federal, -a.federal)}
    ${L.ss ? row(L.ss, -p.ss, -a.ss) : ''}
    ${L.medicare ? row(L.medicare, -p.medicare, -a.medicare) : ''}
    ${L.state && (p.state || mode === 'CA') ? row(mode === 'CA' ? `${r.stateName} income tax` : L.state, -p.state, -a.state) : ''}`;
  $('breakdown').innerHTML = `<caption class="sr">Paycheck breakdown</caption><thead><tr><th scope="col">Item</th><th scope="col">${PER_LABEL[r.frequency].replace(/^per /, 'Per ')}</th><th scope="col">Per year</th></tr></thead><tbody>
    ${row('Gross pay', p.gross, a.gross)}${lines}
  </tbody><tfoot><tr><td>Take-home pay</td><td>${money(p.net)}</td><td>${money(a.net, false)}</td></tr></tfoot>`;

  announce(`Take-home pay ${money(p.net)} ${PER_LABEL[r.frequency]}, ${money(a.net, false)} a year. Effective tax rate ${pctTxt(r.effectiveRate)}.`);
}

// Salary table: US sample salaries in dollars; other countries use sample salaries on their own scale.
const SAMPLE_SALARIES = {
  US: [30000, 40000, 50000, 60000, 75000, 100000, 125000, 150000, 200000],
  GB: [20000, 25000, 30000, 40000, 50000, 60000, 80000, 100000, 150000],
  CA: [35000, 45000, 55000, 70000, 90000, 110000, 150000, 200000],
  AU: [50000, 65000, 80000, 100000, 125000, 150000, 200000],
  IN: [400000, 700000, 1000000, 1500000, 2500000, 4000000, 6000000],
  GULF: [60000, 120000, 240000, 360000, 600000],
};
function renderSalaryTable() {
  const head = $('salaryHead'), body = $('salaryTable');
  const base = SALARY_BY_CURRENCY[regionInfo().currency] ? parseNum(SALARY_BY_CURRENCY[regionInfo().currency]) : 40000;
  const list = SAMPLE_SALARIES[mode] || [0.5, 0.75, 1, 1.5, 2, 3].map((m) => Math.round(base * m / 1000) * 1000);
  if (mode === 'US') {
    head.innerHTML = '<tr><th>Salary</th><th>Per paycheck</th><th>Per month</th><th>Per year</th><th>Effective tax</th></tr>';
    body.innerHTML = list.map((s) => {
      const r = calculateTakeHome({ payType: 'salary', salary: s, status: 'single', frequency: 'biweekly', state: 'TX' });
      return `<tr><td>${money(s, false)}</td><td>${money(r.perPeriod.net)}</td><td>${money(r.annual.net / 12, false)}</td><td>${money(r.annual.net, false)}</td><td>${pctTxt(r.effectiveRate)}</td></tr>`;
    }).join('');
  } else {
    head.innerHTML = '<tr><th>Salary</th><th>Per month</th><th>Per year</th><th>Effective tax</th></tr>';
    body.innerHTML = list.map((s) => {
      const r = calculateGlobal({ mode, gross: s, frequency: 'monthly', province: 'ON', pensionPct: 0, taxPct: parseNum($('taxPct').value) || 0, socialPct: parseNum($('socialPct').value) || 0 });
      return `<tr><td>${money(s, false)}</td><td>${money(r.perPeriod.net, false)}</td><td>${money(r.annual.net, false)}</td><td>${pctTxt(r.effectiveRate)}</td></tr>`;
    }).join('');
  }
}

// URL state
const KEYS = ['pt', 's', 'h', 'hw', 'f', 'st', 'state', 'k', 'c', 'cr', 'hi', 'hsa', 'tp', 'sp'];
function toQuery() {
  const i = last.input;
  const q = new URLSearchParams({ country: getRegion(), pt: i.payType, f: i.frequency, k: String(i.k401Pct) });
  if (mode === 'US' || mode === 'CA') q.set('state', i.state);
  if (mode === 'US') q.set('st', i.status);
  if (i.payType === 'salary') q.set('s', String(i.salary)); else { q.set('h', String(i.hourly)); q.set('hw', String(i.hoursPerWeek)); }
  if (i.children && mode === 'US') q.set('c', String(i.children));
  if (i.state === 'OTHER') q.set('cr', String(i.customStateRate));
  if (i.healthPerPeriod) q.set('hi', String(i.healthPerPeriod));
  if (i.hsaPerPeriod && mode === 'US') q.set('hsa', String(i.hsaPerPeriod));
  if (mode === 'OTHER') { q.set('tp', String(i.taxPct)); q.set('sp', String(i.socialPct)); }
  return q.toString();
}
function fromQuery(src = location.search) {
  const q = new URLSearchParams(src);
  if (!KEYS.some((k) => q.has(k))) return;
  const setSel = (el, v) => { if (v && el.querySelector(`option[value="${CSS.escape(v)}"]`)) el.value = v; };
  if (q.get('s')) $('salary').value = q.get('s');
  if (q.get('h')) $('hourly').value = q.get('h');
  if (q.get('hw')) $('hours').value = q.get('hw');
  setSel($('frequency'), q.get('f')); setSel($('status'), q.get('st')); setSel($('state'), q.get('state'));
  if (q.get('k') && !isNaN(+q.get('k'))) $('k401').value = q.get('k');
  if (q.get('c')) $('children').value = q.get('c');
  if (q.get('cr')) $('customRate').value = q.get('cr');
  if (q.get('hi')) $('health').value = q.get('hi');
  if (q.get('hsa')) $('hsa').value = q.get('hsa');
  if (q.get('tp')) $('taxPct').value = q.get('tp');
  if (q.get('sp')) $('socialPct').value = q.get('sp');
  if (q.get('pt') === 'hourly') { payType = 'hourly'; seg.select('hourly'); }
}

const form = $('form');
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', update);
form.addEventListener('change', update);
$('copyRes').addEventListener('click', () => {
  const { r } = last; const p = r.perPeriod;
  const L = r.labels;
  const body = mode === 'US'
    ? `Federal income tax: ${money(p.federal)}\nSocial Security: ${money(p.ss)}\nMedicare: ${money(p.medicare)}\nState tax: ${money(p.state + p.sdi)}\n401(k)/pre-tax: ${money(p.k401 + p.pretax)}`
    : [`${L.federal}: ${money(p.federal)}`, L.ss && `${L.ss}: ${money(p.ss)}`, L.medicare && `${L.medicare}: ${money(p.medicare)}`, L.state && p.state > 0 && `${L.state}: ${money(p.state)}`, `${L.pension} and health: ${money(p.k401 + p.pretax)}`].filter(Boolean).join('\n');
  copyText(`Take-home pay (${regionInfo().name}, ${PER_LABEL[r.frequency]})\nGross: ${money(p.gross)}\n${body}\nTake-home: ${money(p.net)} (${money(r.annual.net, false)} a year)\n${location.origin}${location.pathname}?${toQuery()}`, 'Breakdown copied');
});
$('shareRes').addEventListener('click', () => { history.replaceState(null, '', `?${toQuery()}`); copyText(`${location.origin}${location.pathname}?${toQuery()}`, 'Link copied'); });
$('printRes').addEventListener('click', () => window.print());
$('csvRes').addEventListener('click', () => {
  const { r } = last; const p = r.perPeriod; const a = r.annual;
  const L = r.labels || {};
  const n = (v) => v || 0;
  const rows = [['Item', PER_LABEL[r.frequency], 'Per year'], ['Gross pay', n(p.gross), n(a.gross)], [L.federal || 'Income tax', n(p.federal), n(a.federal)]];
  if (p.ss || (L.ss && mode !== 'US')) rows.push([L.ss || 'Social Security', n(p.ss), n(a.ss)]);
  if (p.medicare) rows.push([L.medicare || 'Medicare', n(p.medicare), n(a.medicare)]);
  if (p.state) rows.push([L.state || 'State tax', n(p.state), n(a.state)]);
  rows.push(['Pension and pre-tax deductions', n(p.k401) + n(p.pretax), n(a.k401) + n(a.pretax)], ['Take-home pay', n(p.net), n(a.net)]);
  const q = (v) => (typeof v === 'number' ? (Math.round(v * 100) / 100).toFixed(2) : `"${String(v).replace(/"/g, '""')}"`);
  downloadFile(`take-home-pay-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((l) => l.map(q).join(',')).join('\n'));
  announce('CSV downloaded');
});
const SAVE = 'mt-takehome-last';
function save() { try { localStorage.setItem(SAVE, toQuery()); } catch (e) { /* storage blocked */ } }
form.addEventListener('input', save);
form.addEventListener('change', save);

// Start: pick the country mode first, so a shared link still wins over the defaults.
const hasLink = [...new URLSearchParams(location.search).keys()].some((k) => KEYS.includes(k));
mode = modeFor(getRegion());
applyMode(!hasLink);
const usGuideNote = (code) => { document.getElementById('usGuideNote').hidden = code === 'US'; };
usGuideNote(getRegion());
onRegionChange(() => { mode = modeFor(getRegion()); applyMode(true); usGuideNote(getRegion()); update(); });
if (!hasLink) {
  try { const sv = localStorage.getItem(SAVE); if (sv && new URLSearchParams(sv).get('country') === getRegion()) fromQuery(sv); } catch (e) { /* ignore */ }
} else fromQuery();
syncType();
update();
void mini;
