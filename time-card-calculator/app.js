import { calculateCard, cardCSV, dayMinutes, toHM, toDecimal, DAYS } from './engine.js';
// Dependency: reuses the overtime rule table from the overtime calculator, so both tools share one set of rules.
import { RULES, RULE_GROUPS, RULE_FOR_REGION } from '../overtime-calculator/engine.js';
import { initKit, initSeg, countUp, copyText, downloadFile, flash, money, num, toast, announce, setInvalid, initMiniTotal, parseNum, onRegionChange, getRegion } from './kit.js';

initKit();
const $ = (id) => document.getElementById(id);
const STORE = 'mt-timecard-v1';
let weeksCount = 1;

// Anything from a share link or from storage is untrusted: keep only valid times, numbers and known option values.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanCard(c) {
  if (!c || typeof c !== 'object') return null;
  const out = {};
  if (Array.isArray(c.rows)) {
    out.rows = c.rows.slice(0, 2).map((wk) => (Array.isArray(wk) ? wk : []).slice(0, 7).map((d) => {
      const o = d && typeof d === 'object' ? d : {};
      const br = parseInt(o.breakMin, 10);
      return { start: TIME_RE.test(o.start) ? o.start : '', end: TIME_RE.test(o.end) ? o.end : '', breakMin: br >= 0 && br <= 1440 ? br : 0 };
    }));
    while (out.rows.length && out.rows.some((wk) => wk.length < 7)) out.rows = out.rows.map((wk) => { while (wk.length < 7) wk.push({ start: '', end: '', breakMin: 0 }); return wk; });
  }
  const numStr = (v) => (/^[0-9.,\s]{1,14}$/.test(String(v ?? '')) ? String(v).trim() : undefined);
  out.rate = numStr(c.rate);
  out.rule = typeof c.rule === 'string' && Object.hasOwn(RULES, c.rule) ? c.rule : undefined;
  out.name = typeof c.name === 'string' ? c.name.slice(0, 60) : '';
  out.start = /^\d{4}-\d\d-\d\d$/.test(c.start) ? c.start : '';
  out.period = c.period === 2 ? 2 : 1;
  out.rounding = typeof c.rounding === 'string' && /^[a-z0-9]{1,12}$/i.test(c.rounding) ? c.rounding : undefined;
  return out;
}

// Overtime rule list: US states plus other countries, grouped. Choosing one fills its usual multiplier.
const ruleSel = $('rule');
const keep = ['federal', 'california', 'alaska', 'colorado', 'none'];
ruleSel.innerHTML = RULE_GROUPS.map((g) => {
  const opts = Object.entries(RULES).filter(([k, r]) => (r.group || 'Other') === g && k !== 'custom' && (g !== 'United States' || keep.includes(k)));
  return opts.length ? `<optgroup label="${g}">${opts.map(([k, r]) => `<option value="${k}">${k === 'federal' ? 'Federal (over 40/week)' : r.label}</option>`).join('')}</optgroup>` : '';
}).join('');
let hadSaved = false;
try { hadSaved = !!localStorage.getItem(STORE); } catch (e) { /* storage blocked */ }
ruleSel.value = 'federal';
function applyRuleDefaults(key) {
  const r = RULES[key];
  if (!r) return;
  $('otMult').value = String(r.ot || 1.5);
}
function applyRegionRule() {
  const key = RULE_FOR_REGION[getRegion()];
  if (key && ruleSel.querySelector(`option[value="${key}"]`)) { ruleSel.value = key; applyRuleDefaults(key); }
}
ruleSel.addEventListener('change', () => applyRuleDefaults(ruleSel.value));

function dateLabel(startISO, offset) {
  if (!startISO) return '';
  const d = new Date(startISO + 'T12:00:00');
  if (isNaN(d)) return '';
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildWeeks() {
  const box = $('weeks');
  const saved = readRows();
  box.innerHTML = '';
  for (let w = 0; w < weeksCount; w++) {
    const label = document.createElement('div');
    label.className = 'week-label';
    label.innerHTML = `Week ${w + 1}<span id="wk${w}tot"></span>`;
    box.append(label);
    const head = document.createElement('div');
    head.className = 'punch-head'; head.setAttribute('aria-hidden', 'true');
    head.innerHTML = '<span>Day</span><span>In</span><span>Out</span><span>Break</span><span style="text-align:right">Hours</span>';
    box.append(head);
    DAYS.forEach((d, i) => {
      const id = `w${w}d${i}`;
      const v = saved?.[w]?.[i] || {};
      const row = document.createElement('div');
      row.className = 'punch'; row.id = `row-${id}`;
      row.innerHTML = `<span class="dname" id="${id}-l">${d}<small class="hint" style="display:block;font:500 11px var(--f-body)" data-date="${w * 7 + i}"></small></span>
        <input class="input" type="time" step="60" id="${id}-in" aria-labelledby="${id}-l ${id}-inl" value="${v.start || ''}"><span class="sr" id="${id}-inl">clock in</span>
        <input class="input" type="time" step="60" id="${id}-out" aria-labelledby="${id}-l ${id}-outl" value="${v.end || ''}"><span class="sr" id="${id}-outl">clock out</span>
        <input class="input" inputmode="numeric" id="${id}-br" aria-labelledby="${id}-l ${id}-brl" placeholder="0" value="${v.breakMin || ''}"><span class="sr" id="${id}-brl">unpaid break in minutes</span>
        <span class="hrs" id="${id}-h" aria-live="off">–</span>`;
      box.append(row);
    });
  }
  labelDates();
}

function labelDates() {
  const start = $('startDate').value;
  document.querySelectorAll('[data-date]').forEach((el) => { el.textContent = dateLabel(start, +el.dataset.date); });
}

function rowEls(w, i) { const id = `w${w}d${i}`; return { inp: $(`${id}-in`), out: $(`${id}-out`), br: $(`${id}-br`), h: $(`${id}-h`), row: $(`row-${id}`) }; }

function readRows() {
  try { return cleanCard(JSON.parse(localStorage.getItem(STORE) || 'null'))?.rows || null; } catch (e) { return null; }
}

function collect() {
  const weeks = [];
  for (let w = 0; w < weeksCount; w++) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const e = rowEls(w, i);
      const brRaw = e.br.value.trim();
      const br = brRaw === '' ? 0 : parseInt(brRaw, 10);
      const badBr = brRaw !== '' && (isNaN(br) || br < 0 || br > 1440);
      e.br.setAttribute('aria-invalid', String(badBr));
      days.push({ start: e.inp.value, end: e.out.value, breakMin: badBr ? 0 : br });
    }
    weeks.push(days);
  }
  return weeks;
}

function save(weeks) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ rows: weeks, rate: $('rate').value, rule: $('rule').value, name: $('name').value, start: $('startDate').value, period: weeksCount, rounding: $('rounding').value }));
  } catch (e) { /* storage blocked */ }
}

let last = null;
const mini = initMiniTotal($('results'), 'Total <b id="miniHM">0:00</b><span id="miniPay"></span>');

function update() {
  const weeks = collect();
  const rateEl = $('rate');
  const rateRaw = rateEl.value.trim();
  const rate = rateRaw === '' ? 0 : parseNum(rateRaw);
  setInvalid(rateEl, rateRaw !== '' && (isNaN(rate) || rate < 0), 'Enter your hourly rate, like 20');
  const otMult = parseFloat($('otMult').value) > 0 ? parseFloat($('otMult').value) : 1.5;
  const rule = $('rule').value;
  const rounding = +$('rounding').value;
  const res = calculateCard({ weeks, rate: isNaN(rate) ? 0 : rate, rule, otMult, dtMult: RULES[rule]?.dt || 2, rounding });
  last = { res, weeks };

  let halfFilled = 0, overnight = 0;
  res.weeks.forEach((wk, w) => {
    wk.rows.forEach((r, i) => {
      const e = rowEls(w, i);
      const d = dayMinutes(weeks[w][i], rounding);
      const bad = !d.valid;
      e.row.classList.toggle('bad', bad);
      e.row.classList.toggle('has-ot', r.ot + r.dt > 0);
      if (bad) halfFilled++;
      if (d.overnight) overnight++;
      e.h.innerHTML = r.minutes > 0 ? `${toHM(r.minutes)}<small>${num(toDecimal(r.minutes))} h${r.ot + r.dt > 0 ? ` · ${num(r.ot + r.dt)} OT` : ''}</small>` : (bad ? '<small>add time</small>' : '–');
    });
    const t = $(`wk${w}tot`);
    if (t) t.textContent = `${toHM(wk.minutes)} · ${num(toDecimal(wk.minutes))} h${wk.ot + wk.dt > 0 ? ` · ${num(wk.ot + wk.dt)} OT` : ''}`;
  });

  $('hm').textContent = res.hm;
  countUp($('dec'), res.decimal, (v) => num(v));
  countUp($('gross'), res.gross, (v) => money(v));
  $('regH').textContent = `${num(res.reg)} h`;
  $('otH').textContent = `${num(res.ot)} h`;
  $('dtH').textContent = `${num(res.dt)} h`;
  $('regPay').textContent = money(res.regPay);
  $('otPay').textContent = `${money(res.otPay)} at ${money(res.rate * res.otMult)}`;
  $('dtPay').textContent = money(res.dtPay);
  const totH = res.reg + res.ot + res.dt;
  $('barReg').style.width = (totH ? res.reg / totH * 100 : 0) + '%';
  $('barOt').style.width = (totH ? res.ot / totH * 100 : 0) + '%';
  $('barDt').style.width = (totH ? res.dt / totH * 100 : 0) + '%';
  $('bar').setAttribute('aria-label', `Regular ${num(res.reg)} hours, overtime ${num(res.ot)}, double time ${num(res.dt)}`);
  $('miniHM').textContent = res.hm;
  $('miniPay').textContent = res.rate > 0 ? money(res.gross) : `${num(res.decimal)} h`;

  const two = weeksCount === 2;
  ['w1', 'w1l', 'w2', 'w2l'].forEach((id) => { $(id).hidden = !two; });
  if (two) {
    $('w1').textContent = `${num(toDecimal(res.weeks[0].minutes))} h · ${money(res.weeks[0].pay)}`;
    $('w2').textContent = `${num(toDecimal(res.weeks[1].minutes))} h · ${money(res.weeks[1].pay)}`;
  }

  const msgs = [];
  if (halfFilled) msgs.push(`<strong>${halfFilled} day${halfFilled > 1 ? 's have' : ' has'} only one time.</strong> Add both clock-in and clock-out.`);
  if (overnight) msgs.push(`${overnight} overnight shift${overnight > 1 ? 's' : ''} counted past midnight.`);
  if (rounding) msgs.push(`Punches rounded to the nearest ${rounding} minutes.`);
  $('msg').hidden = msgs.length === 0;
  $('msg').innerHTML = msgs.join(' ');

  save(weeks);
  announce(`Total ${res.hm}, ${num(res.decimal)} decimal hours${res.rate > 0 ? `, gross pay ${money(res.gross)}` : ''}.`);
}

// Minutes-to-decimal chart
$('chart').innerHTML = Array.from({ length: 60 }, (_, m) => m + 1).filter((m) => m % 1 === 0)
  .map((m) => `<div><span>${m} min</span><b>${(m / 60).toFixed(2)}</b></div>`).join('');

function fill(start, end, br, days = [0, 1, 2, 3, 4]) {
  for (let w = 0; w < weeksCount; w++) days.forEach((i) => { const e = rowEls(w, i); e.inp.value = start; e.out.value = end; e.br.value = br; });
}

// Restore saved settings
(function restore() {
  let s = null;
  try { s = cleanCard(JSON.parse(localStorage.getItem(STORE) || 'null')); } catch (e) { /* ignore */ }
  const p = new URLSearchParams(location.search);
  if (p.has('card')) {
    try { s = cleanCard(JSON.parse(decodeURIComponent(escape(atob(p.get('card')))))); } catch (e) { /* bad link */ }
  }
  if (s) {
    if (s.rate) $('rate').value = s.rate;
    if (s.rule && $('rule').querySelector(`option[value="${CSS.escape(s.rule)}"]`)) $('rule').value = s.rule;
    if (s.name) $('name').value = s.name;
    if (s.start) $('startDate').value = s.start;
    if (s.rounding && $('rounding').querySelector(`option[value="${CSS.escape(s.rounding)}"]`)) $('rounding').value = s.rounding;
    if (s.period === 2) weeksCount = 2;
    if (p.has('card') && s.rows) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  }
  if (!$('startDate').value) {
    const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
    $('startDate').value = d.toISOString().slice(0, 10);
  }
  buildWeeks();
  if (!s || !s.rows) fill('09:00', '17:30', '30');
})();

const seg = initSeg($('period'), (v) => { save(collect()); weeksCount = +v; buildWeeks(); update(); });
if (weeksCount === 2) seg.select('2');

const form = $('form');
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', (e) => { if (e.target.id === 'startDate') labelDates(); update(); });
form.addEventListener('change', update);

$('copyMon').addEventListener('click', () => {
  for (let w = 0; w < weeksCount; w++) {
    const m = rowEls(0, 0);
    for (let i = (w === 0 ? 1 : 0); i < 5; i++) { const e = rowEls(w, i); e.inp.value = m.inp.value; e.out.value = m.out.value; e.br.value = m.br.value; }
  }
  update();
});
document.querySelectorAll('[data-fill]').forEach((b) => b.addEventListener('click', () => { const [a, c, br] = b.dataset.fill.split('|'); fill(a, c, br); update(); }));
$('clearAll').addEventListener('click', () => {
  for (let w = 0; w < weeksCount; w++) for (let i = 0; i < 7; i++) { const e = rowEls(w, i); e.inp.value = ''; e.out.value = ''; e.br.value = ''; }
  update(); rowEls(0, 0).inp.focus();
});
document.querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => {
  const [a, c, br, rate] = b.dataset.example.split('|');
  weeksCount = 1; seg.select('1'); buildWeeks();
  fill(a, c, br); $('rate').value = rate; $('rule').value = 'federal'; update();
  $('results').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  $('results').focus({ preventScroll: true }); flash($('results'));
}));

$('printCard').addEventListener('click', () => window.print());
$('csvCard').addEventListener('click', () => {
  downloadFile(`time-card-${$('startDate').value || 'week'}.csv`, cardCSV(last.res, { name: $('name').value, start: $('startDate').value, punches: last.weeks }));
  toast('CSV downloaded');
});
$('copyCard').addEventListener('click', () => {
  const r = last.res;
  copyText(`Time card${$('name').value ? ' for ' + $('name').value : ''} (week of ${$('startDate').value})\nTotal: ${r.hm} (${num(r.decimal)} decimal hours)\nRegular ${num(r.reg)} h, overtime ${num(r.ot)} h, double time ${num(r.dt)} h\nGross pay: ${money(r.gross)}`, 'Totals copied');
});
$('shareCard').addEventListener('click', () => {
  const data = { rows: last.weeks, rate: $('rate').value, rule: $('rule').value, start: $('startDate').value, period: weeksCount, rounding: $('rounding').value };
  const url = `${location.origin}${location.pathname}?card=${btoa(unescape(encodeURIComponent(JSON.stringify(data))))}`;
  copyText(url, 'Link copied (name not included)');
});

if (!hadSaved && !new URLSearchParams(location.search).has('card')) applyRegionRule();
onRegionChange(() => { applyRegionRule(); update(); });
update();
void mini;
