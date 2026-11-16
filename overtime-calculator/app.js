import { calculate, parseHours, toCSV, DAYS, RULES, RULE_GROUPS, RULE_FOR_REGION } from './engine.js';
import { initKit, initSeg, countUp, copyText, downloadFile, flash, money, num, toast, announce, setInvalid, initMiniTotal, parseNum, onRegionChange, getRegion, regionInfo } from './kit.js';

initKit();

const $ = (id) => document.getElementById(id);
const daysEl = $('days');
let mode = 'week';

const RULE_HINTS = {
  federal: 'Overtime after 40 hours in the workweek. No daily limit. Most states use this rule.',
  california: 'Overtime after 8 hours a day or 40 a week. Double time after 12 a day. 7th consecutive day of the workweek: first 8 hours overtime, the rest double time.',
  alaska: 'Overtime after 8 hours a day or 40 a week (employers with 4 or more employees).',
  colorado: 'Overtime after 12 hours a day or 40 a week. Over 12 consecutive hours also counts.',
  nevada: 'Overtime after 8 hours in a workday if you earn less than 1.5 times minimum wage ($18/h in 2026), or after 40 a week.',
  custom: 'Set your own daily and weekly limits below. Leave a box empty for no limit.',
};


// Rule list: every rule set, grouped by region.
const ruleSel = $('rule');
ruleSel.innerHTML = RULE_GROUPS.map((g) => {
  const opts = Object.entries(RULES).filter(([, r]) => (r.group || 'Other') === g);
  return opts.length ? `<optgroup label="${g}">${opts.map(([k, r]) => `<option value="${k}">${r.label}</option>`).join('')}</optgroup>` : '';
}).join('');
ruleSel.value = 'federal';

// Choosing a rule fills in its usual multipliers (you can still edit them) and the names of the tiers.
function applyRuleDefaults(key) {
  const r = RULES[key];
  if (!r) return;
  if (r.ot) $('otMult').value = String(r.ot);
  else if (key === 'federal' || r.us) $('otMult').value = '1.5';
  if (r.dt) $('dtMult').value = String(r.dt);
  else if (key !== 'custom' && key !== 'none') $('dtMult').value = '2';
}
function tierName(r) { return r.dtLabel || 'Double time'; }

// Day rows
DAYS.forEach((d, i) => {
  const row = document.createElement('div');
  row.className = 'day';
  row.innerHTML = `<label class="dname" for="d${i}">${d}</label>
    <div class="meter" aria-hidden="true"><span style="background:var(--reg)"></span><span style="background:var(--ot)"></span><span style="background:var(--dt)"></span></div>
    <input class="input" id="d${i}" inputmode="decimal" autocomplete="off" enterkeyhint="${i < 6 ? 'next' : 'done'}" aria-describedby="daysHint" placeholder="0">`;
  daysEl.append(row);
});
const dayInputs = DAYS.map((_, i) => $(`d${i}`));
dayInputs.forEach((el, i) => el.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); (dayInputs[i + 1] || $('rate')).focus(); }
}));

const seg = initSeg($('mode'), (v) => { mode = v; syncMode(); update(); });
function syncMode() { $('weekBox').hidden = mode !== 'week'; $('quickBox').hidden = mode !== 'quick'; }

function readNumber(el, fallback, { min = 0, allowZero = true, msg = 'Enter a number, like 25' } = {}) {
  const raw = el.value.trim();
  if (raw === '') { setInvalid(el, false); return fallback; }
  const n = parseNum(raw);
  const bad = isNaN(n) || n < min || (!allowZero && n === 0);
  setInvalid(el, bad, msg);
  return bad ? fallback : n;
}

function readHours(el, max) {
  const h = parseHours(el.value);
  const bad = isNaN(h) || h > max;
  setInvalid(el, bad, max === 24 ? 'Use hours like 8.5 or 8:30 (max 24)' : 'Enter total hours, like 48');
  return bad ? 0 : h;
}

function readInput() {
  return {
    mode,
    rate: readNumber($('rate'), 0, { msg: 'Enter your hourly rate, like 25' }),
    rule: $('rule').value,
    days: dayInputs.map((el) => readHours(el, 24)),
    totalHours: readHours($('total'), 168),
    otMult: readNumber($('otMult'), 1.5, { allowZero: false, msg: 'Use a number like 1.5' }),
    dtMult: readNumber($('dtMult'), 2, { allowZero: false, msg: 'Use a number like 2' }),
    weeksPerYear: readNumber($('weeks'), 52, { allowZero: false, msg: 'Use 1 to 53 weeks' }),
    bracket: parseFloat($('bracket').value) || 0.12,
    ruleKey: $('rule').value,
    custom: {
      dailyOT: (readNumber($('cDaily'), null, { allowZero: false, msg: 'Use a number above 0, or leave empty' }), $('cDaily').value),
      dailyDT: (readNumber($('cDailyDT'), null, { allowZero: false, msg: 'Use a number above 0, or leave empty' }), $('cDailyDT').value),
      weeklyOT: (readNumber($('cWeekly'), null, { allowZero: false, msg: 'Use a number above 0, or leave empty' }), $('cWeekly').value),
    },
  };
}

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
const h = (n) => `${num(n)} h`;
let last = null;

const mini = initMiniTotal($('results'), 'Gross this week <b id="miniGross">$0.00</b><span id="miniOT"></span>');

function update() {
  const input = readInput();
  $('customBox').hidden = input.rule !== 'custom';
  const ruleObj = RULES[input.rule] || RULES.federal;
  $('ruleHint').textContent = RULE_HINTS[input.rule] || ruleObj.hint || '';
  const tier = tierName(ruleObj);
  $('dtName').textContent = tier;
  $('dtRateName').textContent = tier === 'Double time' ? 'Double-time rate' : `${tier} rate`;
  $('dtMultName').textContent = tier === 'Double time' ? 'Double-time multiplier' : `${tier} multiplier`;
  const r = calculate(input);
  last = { input, r };

  countUp($('gross'), r.gross, (v) => money(v));
  countUp($('regPay'), r.regPay, (v) => money(v));
  countUp($('otPay'), r.otPay, (v) => money(v));
  countUp($('dtPay'), r.dtPay, (v) => money(v));
  $('regH').textContent = h(r.regHours);
  $('otH').textContent = `${h(r.otHours)} at ${money(r.otRate)}`;
  $('dtH').textContent = `${h(r.dtHours)} at ${money(r.dtRate)}`;
  $('hoursLine').textContent = `${num(r.totalHours)} hours worked`;
  $('otRate').textContent = `${money(r.otRate)}/h`;
  $('dtRate').textContent = `${money(r.dtRate)}/h`;
  $('effRate').textContent = `${money(r.effectiveRate)}/h`;
  $('grossYear').textContent = money(r.grossYear, false);
  $('miniGross').textContent = money(r.gross);
  $('miniOT').textContent = r.otHours + r.dtHours > 0 ? `${num(r.otHours + r.dtHours)} h overtime` : 'no overtime';

  $('barReg').style.width = pct(r.regPay, r.gross) + '%';
  $('barOt').style.width = pct(r.otPay, r.gross) + '%';
  $('barDt').style.width = pct(r.dtPay, r.gross) + '%';
  $('bar').setAttribute('aria-label', `Regular ${money(r.regPay)}, overtime ${money(r.otPay)}, ${tier.toLowerCase()} ${money(r.dtPay)}`);

  if (input.mode === 'week') {
    r.rows.forEach((row, i) => {
      const spans = daysEl.children[i].querySelectorAll('.meter span');
      spans[0].style.width = Math.min(row.reg / 16 * 100, 100) + '%';
      spans[1].style.width = Math.min(row.ot / 16 * 100, 100) + '%';
      spans[2].style.width = Math.min(row.dt / 16 * 100, 100) + '%';
    });
  }

  // No tax on overtime note
  const usTax = getRegion() === 'US' && (ruleObj.us || input.rule === 'custom');
  if (usTax && r.qualifiedPremiumWeek > 0) {
    const yearCapped = Math.min(r.qualifiedPremiumYear, 12500);
    const saving = yearCapped * input.bracket;
    const capText = r.qualifiedPremiumYear > 12500
      ? `about ${money(r.qualifiedPremiumYear, false)} a year at this pace, but the deduction stops at $12,500 ($25,000 joint)`
      : `about ${money(r.qualifiedPremiumYear, false)} a year at this pace`;
    $('taxNote').innerHTML = `<strong>No tax on overtime (2025–2028):</strong> if you are non-exempt under the FLSA, about ${money(r.qualifiedPremiumWeek)} of this week's pay is the overtime premium that may be deductible from federal income tax: ${capText}. In the ${Math.round(input.bracket * 100)}% bracket that could cut your federal income tax by about ${money(saving, false)}. <a href="#no-tax">How it works</a>.`;
  } else {
    $('taxNote').innerHTML = usTax
      ? `<strong>Tip:</strong> overtime starts after 40 hours under federal law${input.rule !== 'federal' && input.rule !== 'custom' ? ', or sooner under the daily rule you picked' : ''}.`
      : `<strong>Check your contract.</strong> ${ruleObj.hint || 'Collective agreements and employment contracts often pay more than the legal minimum.'}`;
  }

  if (input.mode === 'week' && r.totalHours > 0) {
    const rows = r.rows.filter((x) => x.hours > 0).map((x) => `<tr><td>${x.day}</td><td>${num(x.hours)}</td><td>${num(x.reg)}</td><td>${num(x.ot)}</td><td>${num(x.dt)}</td><td>${money(x.pay)}</td></tr>`).join('');
    $('tableWrap').innerHTML = `<table class="tbl"><caption class="sr">Hours and pay by day</caption><thead><tr><th scope="col">Day</th><th scope="col">Hours</th><th scope="col">Reg</th><th scope="col">OT</th><th scope="col">${tier === 'Double time' ? 'DT' : 'Tier 2'}</th><th scope="col">Pay</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Total</td><td>${num(r.totalHours)}</td><td>${num(r.regHours)}</td><td>${num(r.otHours)}</td><td>${num(r.dtHours)}</td><td>${money(r.gross)}</td></tr></tfoot></table>`;
  } else {
    $('tableWrap').innerHTML = '';
  }
  $('printMeta').textContent = `${r.rule.label} · ${money(r.rate)}/h · printed ${new Date().toLocaleDateString(regionInfo().locale)} · bingemind.com/overtime-calculator`;

  announce(`Gross pay ${money(r.gross)}: regular ${money(r.regPay)}, overtime ${money(r.otPay)}, ${tier.toLowerCase()} ${money(r.dtPay)}.`);
}

// Rate table (time and a half / double time)
$('rateTable').innerHTML = [15, 16, 17, 18, 19, 20, 22, 25, 28, 30, 35, 40, 45, 50]
  .map((x) => `<tr><td>${money(x)}</td><td>${money(x * 1.5)}</td><td>${money(x * 2)}</td><td>${money(x * 15)}</td></tr>`).join('');

// URL state
const KEYS = ['m', 'r', 'rule', 'd', 't', 'ot', 'dt', 'w', 'cd', 'cdt', 'cw'];
function toQuery() {
  const i = last.input;
  const p = new URLSearchParams({ m: i.mode, r: String(i.rate), rule: i.rule });
  if (i.mode === 'week') p.set('d', dayInputs.map((el) => el.value.trim() || '0').join(','));
  else p.set('t', $('total').value.trim());
  if (i.otMult !== 1.5) p.set('ot', String(i.otMult));
  if (i.dtMult !== 2) p.set('dt', String(i.dtMult));
  if (i.weeksPerYear !== 52) p.set('w', String(i.weeksPerYear));
  if (i.rule === 'custom') { p.set('cd', i.custom.dailyOT); p.set('cdt', i.custom.dailyDT); p.set('cw', i.custom.weeklyOT); }
  return p.toString();
}
function fromQuery(src = location.search) {
  const p = new URLSearchParams(src);
  if (!KEYS.some((k) => p.has(k))) return false; // ignore gclid, utm_* etc.
  if (p.get('r')) $('rate').value = p.get('r');
  if (p.get('rule') && Object.hasOwn(RULES, p.get('rule')) && $('rule').querySelector(`option[value="${p.get('rule')}"]`)) $('rule').value = p.get('rule');
  if (p.get('d')) p.get('d').split(',').slice(0, 7).forEach((v, i) => { dayInputs[i].value = v === '0' ? '' : v; });
  if (p.get('t')) $('total').value = p.get('t');
  if (p.get('ot')) $('otMult').value = p.get('ot');
  if (p.get('dt')) $('dtMult').value = p.get('dt');
  if (p.get('w')) $('weeks').value = p.get('w');
  if (p.has('cd')) $('cDaily').value = p.get('cd');
  if (p.has('cdt')) $('cDailyDT').value = p.get('cdt');
  if (p.has('cw')) $('cWeekly').value = p.get('cw');
  if (p.get('m') === 'quick') { mode = 'quick'; seg.select('quick'); }
  return true;
}

function setDays(list) { list.forEach((v, i) => { dayInputs[i].value = v ? String(v) : ''; }); }
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

// Events
const form = $('form');
ruleSel.addEventListener('change', () => applyRuleDefaults(ruleSel.value));
function applyRegionRule() {
  const key = RULE_FOR_REGION[getRegion()];
  if (!key) return;
  ruleSel.value = key; applyRuleDefaults(key);
}
onRegionChange(() => { applyRegionRule(); update(); });
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', update);
form.addEventListener('change', update);
$('copyMon').addEventListener('click', () => { const v = dayInputs[0].value; for (let i = 1; i < 5; i++) dayInputs[i].value = v; update(); });
$('clearDays').addEventListener('click', () => { setDays([0, 0, 0, 0, 0, 0, 0]); update(); dayInputs[0].focus(); });
document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { setDays(b.dataset.preset.split(',').map(Number)); update(); }));
document.querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => {
  const [rate, rule, d] = b.dataset.example.split('|');
  $('rate').value = rate; $('rule').value = rule; setDays(d.split(',').map(Number));
  mode = 'week'; seg.select('week'); syncMode(); update();
  $('results').scrollIntoView({ behavior: smooth(), block: 'start' });
  $('results').focus({ preventScroll: true });
  flash($('results'));
}));

$('copyRes').addEventListener('click', () => {
  const { r } = last;
  const text = `Overtime calculation (${r.rule.label})\nHours: ${num(r.totalHours)} (regular ${num(r.regHours)}, overtime ${num(r.otHours)}, double time ${num(r.dtHours)})\nRate: ${money(r.rate)}/h, overtime ${money(r.otRate)}/h, double time ${money(r.dtRate)}/h\nRegular pay: ${money(r.regPay)}\nOvertime pay: ${money(r.otPay)}\nDouble-time pay: ${money(r.dtPay)}\nGross pay: ${money(r.gross)}\n${location.origin}${location.pathname}?${toQuery()}`;
  copyText(text, 'Result copied');
});
$('shareRes').addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?${toQuery()}`;
  history.replaceState(null, '', `?${toQuery()}`);
  if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ title: 'My overtime calculation', url }).catch(() => {});
  else copyText(url, 'Link copied');
});
$('csvRes').addEventListener('click', () => {
  const head = `Rule,${last.r.rule.label.replace(/,/g, ';')}\nHourly rate,${last.r.rate}\n`;
  downloadFile(`overtime-${new Date().toISOString().slice(0, 10)}.csv`, head + toCSV(last.r));
  toast('CSV downloaded');
});
$('printRes').addEventListener('click', () => window.print());

// Start
const SAVE = 'mt-overtime-last';
function saved() { try { const v = JSON.parse(localStorage.getItem(SAVE) || 'null'); return v && v.country === getRegion() ? v.q : null; } catch (e) { return null; } }
if (!fromQuery()) { const sv = saved(); if (!(sv && fromQuery(sv))) { setDays([8, 8, 8, 8, 10, 6, 0]); applyRegionRule(); } }
const keep = () => { try { localStorage.setItem(SAVE, JSON.stringify({ country: getRegion(), q: toQuery() })); } catch (e) { /* storage blocked */ } };
form.addEventListener('input', keep);
form.addEventListener('change', keep);
syncMode();
update();
void mini;
