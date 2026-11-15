// Shared file: identical copy in every calculator folder. The master is tools-build/shared/calc.js in the MicroTools project; edit it there and re-run tools/build_bingemind.py.
// Calculator runtime: binds a declarative form spec to a pure compute() function.
// Handles country defaults, live results, validation, saved state, share links, copy, CSV and print.
import {
  initKit, initSeg, countUp, toast, copyText, downloadFile, announce, setInvalid, initMiniTotal,
  money, num, parseNum, onRegionChange, regionInfo, currencySymbol,
} from './kit.js';
import { allFields, formHTML, listHTML, resultHTML, summaryText, fmtVal, esc } from './render.js';
import { localAmount } from './geo.js';

const F = {
  money, num,
  compact: (v) => { try { return new Intl.NumberFormat(regionInfo().locale, { notation: 'compact', maximumFractionDigits: 1 }).format(v); } catch (e) { return num(v, 0); } },
  get locale() { return regionInfo().locale; },
};
const NUMERIC = new Set(['money', 'number']);

export function mountCalc(spec, compute) {
  initKit();
  const form = document.getElementById('form');
  const results = document.getElementById('out');
  const fields = allFields(spec.form).filter((f) => f.type !== 'list');
  const lists = allFields(spec.form).filter((f) => f.type === 'list');
  const KEY = 'mt-' + spec.slug;
  const dirty = new Set();
  let vals = {}, listVals = {}, units = null, lastOut = null, prevBig = null;

  const ctx = () => {
    const r = regionInfo();
    return { code: r.code, currency: r.currency, locale: r.locale, units: units || r.units, amt: (usd) => localAmount(usd, r.currency) };
  };
  const defOf = (f, c) => (typeof f.def === 'function' ? f.def(c) : f.usd != null ? c.amt(f.usd) : f.def);
  const str = (v) => (v == null ? '' : String(v));

  // ----- sanitizing anything that comes from a link or storage -----
  function clean(f, raw) {
    if (raw == null) return null;
    const s = String(raw).slice(0, 60);
    if (NUMERIC.has(f.type)) { if (!/^[\s\d.,'\u00a0\u202f+-]{1,30}$/.test(s)) return null; const n = parseNum(s); return Number.isFinite(n) && n >= (f.min ?? -1e15) && n <= (f.max ?? 1e15) ? String(n) : null; }
    if (f.type === 'select' || f.type === 'seg') return f.options.some(([v]) => String(v) === s) ? s : null;
    if (f.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    if (f.type === 'text') return s.replace(/[<>]/g, '').slice(0, f.max || 40);
    return null;
  }
  function cleanList(L, arr) {
    if (!Array.isArray(arr)) return null;
    const rows = arr.slice(0, L.max || 12).map((r) => {
      if (!r || typeof r !== 'object') return null;
      const o = {};
      for (const f of L.item) { const c = clean(f, r[f.id]); if (c == null) return null; o[f.id] = c; }
      return o;
    }).filter(Boolean);
    return rows.length ? rows : null;
  }

  // ----- initial state: defaults, then saved (same country), then link -----
  function applyDefaults(all) {
    const c = ctx();
    for (const f of fields) if (all || !dirty.has(f.id)) vals[f.id] = str(defOf(f, c));
    for (const L of lists) if (all || !dirty.has(L.id)) listVals[L.id] = L.def(c).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, str(v)])));
  }
  const unitField = fields.find((f) => f.id === 'units');
  units = regionInfo().units;
  applyDefaults(true);
  if (unitField) units = vals.units;

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
  if (saved && saved.region === regionInfo().code && saved.v) {
    for (const f of fields) { const c = clean(f, saved.v[f.id]); if (c != null) { vals[f.id] = c; dirty.add(f.id); } }
    for (const L of lists) { const c = cleanList(L, saved.l && saved.l[L.id]); if (c) { listVals[L.id] = c; dirty.add(L.id); } }
  }
  const q = new URLSearchParams(location.search);
  for (const f of fields) { const c = clean(f, q.get(f.id)); if (c != null) { vals[f.id] = c; dirty.add(f.id); } }
  for (const L of lists) {
    let parsed = null; try { parsed = JSON.parse(q.get(L.id) || 'null'); } catch (e) { parsed = null; }
    const c = cleanList(L, parsed); if (c) { listVals[L.id] = c; dirty.add(L.id); }
  }
  if (unitField) units = vals.units;

  // ----- render form -----
  function renderForm() {
    form.querySelector('.fields').innerHTML = formHTML(spec.form, vals, { lists: listVals, sym: currencySymbol(), hide: hiddenSet() });
    form.querySelectorAll('.seg').forEach((seg) => {
      const id = seg.id.replace(/^f-/, '');
      initSeg(seg, (v) => { vals[id] = v; dirty.add(id); if (id === 'units') onUnits(v); update(); });
    });
    syncSuffix(); syncCur(); syncVisible();
  }
  function syncCur() { const s = currencySymbol(); document.querySelectorAll('[data-cur]').forEach((el) => { el.textContent = s; }); }
  function syncSuffix() {
    form.querySelectorAll('[data-suf]').forEach((el) => { try { el.textContent = JSON.parse(el.dataset.suf)[units] || ''; } catch (e) { /* ignore */ } });
  }
  function onUnits(v) {
    units = v;
    const c = ctx();
    for (const f of fields) if (f.byUnits && !dirty.has(f.id)) { vals[f.id] = str(defOf(f, c)); const el = document.getElementById('f-' + f.id); if (el) el.value = vals[f.id]; }
    syncSuffix();
  }
  function hiddenSet() { const v = parsed(), cx = ctx(); return new Set(fields.filter((f) => f.when && !f.when(v, cx)).map((f) => f.id)); }
  function syncVisible() {
    const v = parsed();
    const cx = ctx();
    for (const f of fields) if (f.when) { const w = form.querySelector(`[data-f="${f.id}"]`); if (w) w.hidden = !f.when(v, cx); }
  }

  // ----- reading values -----
  function parsed() {
    const v = {};
    for (const f of fields) v[f.id] = NUMERIC.has(f.type) ? (vals[f.id] === '' && f.optional ? 0 : parseNum(vals[f.id])) : vals[f.id];
    for (const L of lists) v[L.id] = listVals[L.id].map((r) => Object.fromEntries(L.item.map((f) => [f.id, NUMERIC.has(f.type) ? (r[f.id] === '' && f.optional ? 0 : parseNum(r[f.id])) : r[f.id]])));
    return v;
  }
  function validate(v) {
    let ok = true;
    const check = (f, el, x) => {
      if (!el || !NUMERIC.has(f.type)) return;
      const w = el.closest('[data-f]');
      if (w && w.hidden) { setInvalid(el, false); return; }
      let msg = '';
      if (!Number.isFinite(x)) msg = 'Enter a number';
      else if (f.min != null && x < f.min) msg = `Use ${num(f.min, 4)} or more`;
      else if (f.max != null && x > f.max) msg = `Use ${num(f.max, 4)} or less`;
      setInvalid(el, !!msg, msg);
      if (msg) ok = false;
    };
    for (const f of fields) check(f, document.getElementById('f-' + f.id), v[f.id]);
    for (const L of lists) v[L.id].forEach((r, i) => L.item.forEach((f) => check(f, document.getElementById(`${L.id}-${i}-${f.id}`), r[f.id])));
    return ok;
  }

  // ----- results -----
  let mini = null;
  function update() {
    syncVisible();
    const v = parsed();
    if (!validate(v)) return;
    let out;
    try { out = compute(v, ctx()); } catch (e) { out = { error: 'Those numbers do not work together. Check the highlighted fields.', big: { label: spec.bigLabel || 'Result' } }; }
    lastOut = out;
    results.innerHTML = resultHTML(out, F);
    if (!out.error && out.chart) bindChart(out.chart);
    const big = document.getElementById('big');
    if (big && !out.error && typeof out.big.value === 'number' && Number.isFinite(out.big.value) && out.big.kind !== 'text' && !out.big.unit) {
      const kind = out.big.kind;
      if (prevBig != null) { big.dataset.value = String(prevBig); big.textContent = fmtVal(prevBig, kind, F); }
      countUp(big, out.big.value, (x) => fmtVal(x, kind, F));
      prevBig = out.big.value;
    }
    if (!mini && window.matchMedia('(max-width: 860px)').matches) mini = initMiniTotal(document.getElementById('results'), '<b id="miniV"></b> <span id="miniL"></span>');
    const mv = document.getElementById('miniV'), ml = document.getElementById('miniL');
    if (mv && !out.error) { mv.textContent = fmtVal(out.big.value, out.big.kind, F).replace(/<[^>]+>/g, ''); ml.textContent = out.big.label.toLowerCase(); }
    if (!out.error) announce(`${out.big.label}: ${fmtVal(out.big.value, out.big.kind, F)}${out.big.unit ? ' ' + out.big.unit : ''}`);
    save();
  }
  // Hover, touch or arrow keys on a chart show the values for that point.
  function bindChart(ch) {
    const fig = results.querySelector('.chart'), svg = fig && fig.querySelector('svg');
    if (!svg) return;
    const n = ch.x.length, L = 64, W = 640, R = 12;
    const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true; fig.append(tip);
    const ns = 'http://www.w3.org/2000/svg', guide = document.createElementNS(ns, 'line');
    guide.setAttribute('class', 'guide'); guide.setAttribute('y1', '12'); guide.setAttribute('y2', '210'); guide.style.display = 'none'; svg.append(guide);
    svg.setAttribute('tabindex', '0'); svg.setAttribute('aria-describedby', 'chartHelp');
    let cur = n - 1;
    const show = (i) => {
      cur = Math.min(Math.max(i, 0), n - 1);
      const x = L + (W - L - R) * cur / (n - 1), r = svg.getBoundingClientRect();
      guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.style.display = '';
      tip.innerHTML = `<b>${esc(ch.x[cur])}</b>` + ch.series.map((s) => `<span>${esc(s.name)}: <b>${fmtVal(s.data[cur], ch.fmt || 'money0', F)}</b></span>`).join('');
      tip.hidden = false;
      const px = x / W * r.width;
      tip.style.left = Math.min(Math.max(px - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
    };
    const hide = () => { tip.hidden = true; guide.style.display = 'none'; };
    const at = (clientX) => { const r = svg.getBoundingClientRect(); return Math.round(((clientX - r.left) / r.width * W - L) / (W - L - R) * (n - 1)); };
    svg.addEventListener('pointermove', (e) => show(at(e.clientX)));
    svg.addEventListener('pointerdown', (e) => show(at(e.clientX)));
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    svg.addEventListener('focus', () => show(cur));
    svg.addEventListener('keydown', (e) => {
      const k = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n }[e.key];
      if (k) { e.preventDefault(); show(cur + k); announce(tip.innerText.replace(/\n/g, ', '), 100); }
    });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ region: regionInfo().code, v: Object.fromEntries([...dirty].filter((k) => k in vals).map((k) => [k, vals[k]])), l: Object.fromEntries(lists.filter((L) => dirty.has(L.id)).map((L) => [L.id, listVals[L.id]])) })); } catch (e) { /* storage blocked */ }
  }

  // ----- events -----
  form.addEventListener('input', (e) => {
    const t = e.target; if (!t.id) return;
    const m = t.id.match(/^(.+)-(\d+)-(.+)$/);
    if (t.id.startsWith('f-')) { const id = t.id.slice(2); vals[id] = t.value; dirty.add(id); }
    else if (m && listVals[m[1]]) { listVals[m[1]][+m[2]][m[3]] = t.value; dirty.add(m[1]); }
    update();
  });
  form.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]');
    if (add) {
      const L = lists.find((x) => x.id === add.dataset.add);
      const blank = L.blank(ctx());
      listVals[L.id].push(Object.fromEntries(Object.entries(blank).map(([k, v]) => [k, str(v)])));
      dirty.add(L.id); rerenderList(L);
      const first = document.getElementById(`${L.id}-${listVals[L.id].length - 1}-${L.item[0].id}`); if (first) first.focus();
      update();
    } else if (del) {
      const row = del.closest('[data-f]'); const L = lists.find((x) => x.id === row.dataset.f);
      listVals[L.id].splice(+del.dataset.del, 1); dirty.add(L.id); rerenderList(L); update();
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  function rerenderList(L) {
    const host = form.querySelector(`.list[data-f="${L.id}"]`);
    host.outerHTML = listHTML(L, listVals[L.id], { sym: currencySymbol() });
    syncCur();
  }
  form.querySelector('[data-reset]')?.addEventListener('click', () => {
    dirty.clear(); units = regionInfo().units; applyDefaults(true); if (unitField) units = vals.units;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    history.replaceState(null, '', location.pathname);
    prevBig = null; renderForm(); update(); toast('Reset to the example');
  });

  onRegionChange(() => {
    if (unitField && !dirty.has('units')) units = regionInfo().units;
    applyDefaults(false);
    if (unitField) units = vals.units;
    renderForm(); prevBig = null; update();
  });

  document.getElementById('copyRes')?.addEventListener('click', () => copyText(summaryText(spec.title, lastOut, F) + '\n' + shareURL(), 'Result copied'));
  document.getElementById('shareRes')?.addEventListener('click', () => copyText(shareURL(), 'Link copied'));
  document.getElementById('printRes')?.addEventListener('click', () => window.print());
  document.getElementById('csvRes')?.addEventListener('click', () => {
    if (!lastOut || lastOut.error) return;
    const q2 = (s) => `"${String(s).replace(/<[^>]+>/g, '').replace(/"/g, '""')}"`;
    const t = lastOut.table;
    let rows;
    if (t) rows = [t.cols.map(([l]) => l), ...t.rows.map((r) => r.map((x, i) => (typeof x === 'number' ? Math.round(x * 100) / 100 : fmtVal(x, t.cols[i][1], F))))];
    else rows = [['Item', 'Value'], [lastOut.big.label, lastOut.big.value], ...(lastOut.bars || []).map(([k, v]) => [k, v]), ...(lastOut.kv || []).map(([k, v, kind]) => [k, typeof v === 'number' ? Math.round(v * 100) / 100 : fmtVal(v, kind, F)])];
    downloadFile(`${spec.slug}.csv`, rows.map((r) => r.map(q2).join(',')).join('\n'));
  });
  function shareURL() {
    const p = new URLSearchParams();
    p.set('country', regionInfo().code);
    for (const f of fields) if (dirty.has(f.id) || f.id === 'units') p.set(f.id, vals[f.id]);
    for (const L of lists) p.set(L.id, JSON.stringify(listVals[L.id]));
    return location.origin + location.pathname + '?' + p.toString();
  }

  renderForm();
  update();
  return { esc };
}
