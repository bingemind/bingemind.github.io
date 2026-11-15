import { calculateTakeHome, STATES, FREQ } from './engine.js';
import { initKit, initSeg, countUp, copyText, money, toast, announce, setInvalid, initMiniTotal } from './kit.js';

initKit();
const $ = (id) => document.getElementById(id);
let payType = 'salary';

const PER_LABEL = { weekly: 'per week', biweekly: 'every 2 weeks', semimonthly: 'twice a month', monthly: 'per month', annual: 'per year' };
const COLORS = { net: 'var(--ok)', federal: 'var(--reg)', fica: 'var(--gold)', state: 'var(--ot)', pretax: 'var(--dt)' };

// State list: named states alphabetically, then "Other".
const sel = $('state');
const named = Object.entries(STATES).filter(([k]) => k !== 'OTHER').sort((a, b) => a[1].name.localeCompare(b[1].name));
sel.innerHTML = named.map(([k, s]) => `<option value="${k}">${s.name}${s.type === 'none' ? ' (no income tax)' : ''}</option>`).join('')
  + `<option value="OTHER">${STATES.OTHER.name}</option>`;
sel.value = 'TX';

const seg = initSeg($('payType'), (v) => { payType = v; syncType(); update(); });
function syncType() { $('salaryBox').hidden = payType !== 'salary'; $('hourlyBox').hidden = payType !== 'hourly'; }

function num(el, { fallback = 0, max = Infinity, msg = 'Enter a number' } = {}) {
  const raw = el.value.trim().replace(/[$,\s]/g, '');
  if (raw === '') { setInvalid(el, false); return fallback; }
  const n = parseFloat(raw);
  const bad = isNaN(n) || n < 0 || n > max;
  setInvalid(el, bad, msg);
  return bad ? fallback : n;
}

function readInput() {
  return {
    payType,
    salary: num($('salary'), { msg: 'Enter your yearly salary, like 65,000' }),
    hourly: num($('hourly'), { msg: 'Enter your hourly rate, like 25' }),
    hoursPerWeek: num($('hours'), { max: 168, msg: 'Use 0 to 168 hours' }),
    frequency: $('frequency').value,
    status: $('status').value,
    state: $('state').value,
    children: num($('children'), { max: 20, msg: 'Use a whole number, like 2' }),
    customStateRate: num($('customRate'), { max: 15, msg: 'Use 0 to 15%' }),
    k401Pct: +$('k401').value,
    healthPerPeriod: num($('health'), { msg: 'Enter dollars per paycheck' }),
    hsaPerPeriod: num($('hsa'), { msg: 'Enter dollars per paycheck' }),
  };
}

const pctTxt = (x) => `${(x * 100).toFixed(1)}%`;
let last = null;
const mini = initMiniTotal($('results'), 'Take-home <b id="miniNet">$0</b><span id="miniPer"></span>');

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

function update() {
  const input = readInput();
  $('customRateBox').hidden = input.state !== 'OTHER';
  $('k401Out').textContent = `${input.k401Pct}%`;
  const r = calculateTakeHome(input);
  last = { input, r };
  const p = r.perPeriod;
  $('perLabel').textContent = PER_LABEL[r.frequency];
  countUp($('net'), p.net, (v) => money(v));
  countUp($('netYear'), r.annual.net, (v) => money(v, false));
  $('miniNet').textContent = money(p.net);
  $('miniPer').textContent = PER_LABEL[r.frequency];

  const fica = p.ss + p.medicare;
  const stateAll = p.state + p.sdi;
  const deds = p.k401 + p.pretax;
  const parts = [
    { k: 'You keep', v: p.net, c: COLORS.net },
    { k: 'Federal income tax', v: p.federal, c: COLORS.federal },
    { k: 'Social Security + Medicare', v: fica, c: COLORS.fica },
    { k: r.annual.sdi ? 'State tax + SDI' : 'State income tax', v: stateAll, c: COLORS.state },
    { k: '401(k), health, HSA', v: deds, c: COLORS.pretax },
  ];
  drawDonut(parts, p.gross);
  $('keepPct').textContent = p.gross > 0 ? `${Math.round((p.net / p.gross) * 100)}%` : '–';
  $('donut').setAttribute('aria-label', parts.map((x) => `${x.k} ${money(x.v)}`).join(', '));
  $('split').innerHTML = parts.map((x) => `<li><i style="background:${x.c}"></i><span>${x.k}</span><b>${money(x.v)}</b></li>`).join('');

  $('eff').textContent = pctTxt(r.effectiveRate);
  $('marg').textContent = pctTxt(r.marginalRate);
  const showHr = r.hourlyNet !== null;
  $('hourlyNet').hidden = !showHr; $('hourlyNetL').hidden = !showHr;
  if (showHr) $('hourlyNet').textContent = `${money(r.hourlyNet)}/h`;

  const notes = [];
  if (r.stateType === 'none') notes.push(`<strong>${r.stateName} has no state income tax on wages.</strong>`);
  if (r.stateType === 'custom') notes.push('<strong>Using your state rate.</strong> Pick your state above if it is listed for a closer estimate.');
  if (r.ctc > 0) notes.push(`Child tax credit lowers your federal tax by ${money(r.ctc, false)} a year.`);
  if (input.k401Pct > 0) {
    const without = calculateTakeHome({ ...input, k401Pct: 0 });
    const costPer = without.perPeriod.net - p.net;
    notes.push(`Your ${input.k401Pct}% 401(k) saves ${money(p.k401)} a paycheck but only lowers take-home by ${money(costPer)}, because it cuts your income tax.`);
  }
  $('note').innerHTML = notes.join(' ') || 'Tip: move the 401(k) slider to see how saving more changes your paycheck.';

  const row = (label, per, yr, cls = '') => `<tr${cls}><td>${label}</td><td>${money(per)}</td><td>${money(yr, false)}</td></tr>`;
  const a = r.annual;
  $('breakdown').innerHTML = `<caption class="sr">Paycheck breakdown</caption><thead><tr><th scope="col">Item</th><th scope="col">${PER_LABEL[r.frequency].replace(/^per /, 'Per ')}</th><th scope="col">Per year</th></tr></thead><tbody>
    ${row('Gross pay', p.gross, a.gross)}
    ${p.k401 ? row('401(k)', -p.k401, -a.k401) : ''}
    ${p.pretax ? row('Health and HSA', -p.pretax, -a.pretax) : ''}
    ${row('Federal income tax', -p.federal, -a.federal)}
    ${row('Social Security', -p.ss, -a.ss)}
    ${row('Medicare', -p.medicare, -a.medicare)}
    ${r.stateType !== 'none' ? row(`${r.stateName.replace(/ \(.*/, '')} income tax`, -p.state, -a.state) : ''}
    ${p.sdi ? row('California SDI', -p.sdi, -a.sdi) : ''}
  </tbody><tfoot><tr><td>Take-home pay</td><td>${money(p.net)}</td><td>${money(a.net, false)}</td></tr></tfoot>`;

  announce(`Take-home pay ${money(p.net)} ${PER_LABEL[r.frequency]}, ${money(a.net, false)} a year. Effective tax rate ${pctTxt(r.effectiveRate)}.`);
}

// Salary table (single, no state tax, biweekly)
$('salaryTable').innerHTML = [30000, 40000, 50000, 60000, 75000, 100000, 125000, 150000, 200000]
  .map((s) => {
    const r = calculateTakeHome({ payType: 'salary', salary: s, status: 'single', frequency: 'biweekly', state: 'TX' });
    return `<tr><td>${money(s, false)}</td><td>${money(r.perPeriod.net)}</td><td>${money(r.annual.net / 12, false)}</td><td>${money(r.annual.net, false)}</td><td>${pctTxt(r.effectiveRate)}</td></tr>`;
  }).join('');

// URL state
const KEYS = ['pt', 's', 'h', 'hw', 'f', 'st', 'state', 'k', 'c', 'cr', 'hi', 'hsa'];
function toQuery() {
  const i = last.input;
  const q = new URLSearchParams({ pt: i.payType, f: i.frequency, st: i.status, state: i.state, k: String(i.k401Pct) });
  if (i.payType === 'salary') q.set('s', String(i.salary)); else { q.set('h', String(i.hourly)); q.set('hw', String(i.hoursPerWeek)); }
  if (i.children) q.set('c', String(i.children));
  if (i.state === 'OTHER') q.set('cr', String(i.customStateRate));
  if (i.healthPerPeriod) q.set('hi', String(i.healthPerPeriod));
  if (i.hsaPerPeriod) q.set('hsa', String(i.hsaPerPeriod));
  return q.toString();
}
function fromQuery() {
  const q = new URLSearchParams(location.search);
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
  if (q.get('pt') === 'hourly') { payType = 'hourly'; seg.select('hourly'); }
}

const form = $('form');
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', update);
form.addEventListener('change', update);
$('copyRes').addEventListener('click', () => {
  const { r } = last; const p = r.perPeriod;
  copyText(`Take-home pay (${r.stateName}, ${r.status}, ${PER_LABEL[r.frequency]})\nGross: ${money(p.gross)}\nFederal income tax: ${money(p.federal)}\nSocial Security: ${money(p.ss)}\nMedicare: ${money(p.medicare)}\nState tax: ${money(p.state + p.sdi)}\n401(k)/pre-tax: ${money(p.k401 + p.pretax)}\nTake-home: ${money(p.net)} (${money(r.annual.net, false)} a year)\n${location.origin}${location.pathname}?${toQuery()}`, 'Breakdown copied');
});
$('shareRes').addEventListener('click', () => { history.replaceState(null, '', `?${toQuery()}`); copyText(`${location.origin}${location.pathname}?${toQuery()}`, 'Link copied'); });
$('printRes').addEventListener('click', () => window.print());

fromQuery();
syncType();
update();
void mini; void FREQ; void toast;
