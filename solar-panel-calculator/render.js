// Shared file: identical copy in every calculator folder. The master is tools-build/shared/render.js in the MicroTools project; edit it there and re-run tools/build_bingemind.py.
// Markup for calculator forms and results. Pure string functions: the page generator (Node)
// uses them to prerender the default result, and calc.js uses them in the browser.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Every field object in a form, in order, without layout wrappers.
export function allFields(form) {
  const out = [];
  const walk = (items) => items.forEach((it) => {
    if (it.grid) walk(it.grid); else if (it.adv) walk(it.items); else out.push(it);
  });
  walk(form);
  return out;
}

const PALETTE = ['var(--reg)', 'var(--gold)', 'var(--ot)', 'var(--dt)', 'var(--ok)', 'var(--line-strong)'];
export const color = (i) => PALETTE[i % PALETTE.length];

// Format a value by kind. F = { money(n, cents), num(n, d), locale }.
export function fmtVal(v, kind, F) {
  if (v == null || (typeof v === 'number' && !Number.isFinite(v))) return kind === 'text' ? '' : '—';
  switch (kind) {
    case 'money': return F.money(v, true);
    case 'money0': return F.money(v, Math.abs(v) < 100 && Math.abs(v) > 0.004);
    case 'pct': return F.num(v, 2) + '%';
    case 'pct1': return F.num(v, 1) + '%';
    case 'int': return F.num(Math.round(v), 0);
    case 'num0': return F.num(v, 0);
    case 'num1': return F.num(v, 1);
    case 'num': return F.num(v, 2);
    case 'years': return F.num(v, 1) + (Math.abs(v - 1) < 1e-9 ? ' year' : ' years');
    case 'months': return monthsLabel(v, F);
    default: return esc(v);
  }
}

export function monthsLabel(m, F) {
  if (!Number.isFinite(m)) return 'never';
  const t = Math.ceil(m - 1e-9), y = Math.floor(t / 12), mo = t % 12;
  const parts = [];
  if (y) parts.push(F.num(y, 0) + (y === 1 ? ' year' : ' years'));
  if (mo || !y) parts.push(mo + (mo === 1 ? ' month' : ' months'));
  return parts.join(' ');
}

function sufAttr(f) {
  if (!f.suffix) return '';
  if (typeof f.suffix === 'string') return `<span class="post" aria-hidden="true">${esc(f.suffix)}</span>`;
  return `<span class="post" aria-hidden="true" data-suf='${esc(JSON.stringify(f.suffix))}'>${esc(f.suffix.imperial)}</span>`;
}

export function fieldHTML(f, val, opt = {}) {
  const id = opt.id || 'f-' + f.id;
  const hint = f.hint ? ` <span class="hint">${esc(f.hint)}</span>` : '';
  const hid = opt.hide && opt.hide.has(f.id) ? ' hidden' : '';
  const wrap = (inner, cls = 'field') => `<div class="${cls}" data-f="${esc(opt.key || f.id)}"${hid}>${inner}</div>`;
  const lab = (opt.noLabel ? '' : `<label for="${id}">${esc(f.label)}${hint}</label>`);
  if (f.type === 'seg') {
    const btns = f.options.map(([v, l]) => `<button type="button" data-value="${esc(v)}" aria-checked="${String(v) === String(val)}">${esc(l)}</button>`).join('');
    return wrap(`<span class="lbl" id="${id}-l">${esc(f.label)}${hint}</span><div class="seg" id="${id}" aria-labelledby="${id}-l">${btns}</div>`);
  }
  if (f.type === 'select') {
    const opts = f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('');
    return wrap(`${lab}<select class="input" id="${id}">${opts}</select>`);
  }
  if (f.type === 'date') return wrap(`${lab}<input class="input" type="date" id="${id}" value="${esc(val)}">`);
  if (f.type === 'text') return wrap(`${lab}<input class="input" id="${id}" value="${esc(val)}" maxlength="${f.max || 40}" autocomplete="off">`);
  // number-like
  const pre = f.type === 'money' ? `<span class="pre" aria-hidden="true" data-cur>${esc(opt.sym || '$')}</span>` : '';
  const post = sufAttr(f);
  const input = `<input class="input${pre ? ' has-pre' : ''}" id="${id}" inputmode="decimal" autocomplete="off" value="${esc(val)}"${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}>`;
  return wrap(`${lab}${pre || post ? `<div class="affix">${pre}${input}${post}</div>` : input}`);
}

// Render a form tree. vals: id -> value. lists: id -> array of rows.
export function formHTML(form, vals, opt = {}) {
  const one = (it) => {
    if (it.grid) return `<div class="grid-2">${it.grid.map(one).join('')}</div>`;
    if (it.adv) return `<details class="adv"${it.open ? ' open' : ''}><summary>${esc(it.adv)}</summary>${it.items.map(one).join('')}</details>`;
    if (it.type === 'list') return listHTML(it, (opt.lists || {})[it.id] || [], opt);
    return fieldHTML(it, vals[it.id], opt);
  };
  return form.map(one).join('');
}

export function listHTML(L, rows, opt = {}) {
  const items = rows.map((row, i) => `<div class="room list-row" data-row="${i}">
    <div class="room-top"><b class="row-n">${esc(L.itemLabel)} ${i + 1}</b>${rows.length > 1 ? `<button type="button" class="del" data-del="${i}" aria-label="Remove ${esc(L.itemLabel)} ${i + 1}">×</button>` : ''}</div>
    <div class="list-grid">${L.item.map((f) => fieldHTML(f, row[f.id], { ...opt, id: `${L.id}-${i}-${f.id}`, key: `${L.id}.${f.id}` })).join('')}</div>
  </div>`).join('');
  return `<div class="field list" data-f="${esc(L.id)}"><span class="lbl">${esc(L.label)}</span><div class="rows" id="list-${esc(L.id)}">${items}</div>
  <div class="mini-actions"><button class="btn" type="button" data-add="${esc(L.id)}"${rows.length >= (L.max || 12) ? ' disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>${esc(L.addLabel || 'Add another')}</button></div></div>`;
}

// ---------- results ----------
function niceStep(range) {
  const raw = range / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export function chartSVG(ch, F) {
  const W = 640, H = 240, L = 64, R = 12, T = 12, B = 30;
  const n = ch.x.length;
  if (n < 2) return '';
  const all = ch.series.flatMap((s) => s.data).filter(Number.isFinite);
  let lo = Math.min(0, ...all), hi = Math.max(...all, 1);
  const step = niceStep(hi - lo); hi = Math.ceil(hi / step) * step; lo = Math.floor(lo / step) * step;
  const X = (i) => L + (W - L - R) * i / (n - 1), Y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo || 1));
  const compact = F.compact || ((v) => F.num(v, 0));
  let g = '';
  for (let v = lo; v <= hi + step / 2; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${esc(compact(v))}</text>`;
  const every = Math.max(1, Math.ceil(n / 7));
  ch.x.forEach((lab, i) => { if (i % every === 0 || i === n - 1) g += `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`; });
  const paths = ch.series.map((s, si) => {
    const pts = s.data.map((v, i) => `${X(i).toFixed(1)},${Y(Number.isFinite(v) ? v : 0).toFixed(1)}`);
    const area = si === 0 && ch.area !== false ? `<path d="M${X(0)},${Y(Math.max(lo, 0))} L${pts.join(' L')} L${X(n - 1)},${Y(Math.max(lo, 0))} Z" fill="${color(s.c ?? si)}" opacity=".12"/>` : '';
    return `${area}<polyline points="${pts.join(' ')}" fill="none" stroke="${color(s.c ?? si)}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="6 5"' : ''}/>`;
  }).join('');
  const legend = ch.series.map((s, si) => `<li><span class="k"><i style="background:${color(s.c ?? si)}"></i>${esc(s.name)}</span><span class="v">${fmtVal(s.data[n - 1], ch.fmt || 'money0', F)}</span><span class="s">at ${esc(ch.x[n - 1])}</span></li>`).join('');
  return `<figure class="chart"><figcaption>${esc(ch.title)} <span class="hint" id="chartHelp">Hover, tap or use arrow keys for values</span></figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ch.title)}">${g}${paths}</svg><ul class="legend">${legend}</ul></figure>`;
}

export function tableHTML(t, F) {
  const head = t.cols.map(([l]) => `<th>${esc(l)}</th>`).join('');
  const body = t.rows.map((r) => `<tr>${r.map((v, i) => `<td>${fmtVal(v, t.cols[i][1], F)}</td>`).join('')}</tr>`).join('');
  const foot = t.foot ? `<tfoot><tr>${t.foot.map((v, i) => `<td>${fmtVal(v, t.cols[i][1], F)}</td>`).join('')}</tr></tfoot>` : '';
  return `<details class="adv tbl-det"${t.open ? ' open' : ''}><summary>${esc(t.title)}</summary><div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div></details>`;
}

export function resultHTML(out, F) {
  if (out.error) return `<div class="result-top"><div><h2 id="resTitle">${esc(out.big ? out.big.label : 'Result')}</h2><div class="big" id="big">—</div></div></div><p class="note warn">${esc(out.error)}</p>`;
  const b = out.big;
  let h = `<div class="result-top"><div><h2 id="resTitle">${esc(b.label)}</h2><div class="big" id="big">${fmtVal(b.value, b.kind, F)}${b.unit ? ` <small>${esc(b.unit)}</small>` : ''}</div></div>${b.side ? `<div class="hint">${esc(b.side)}</div>` : ''}</div>`;
  if (out.sub) h += `<p class="res-sub">${esc(out.sub)}</p>`;
  if (out.bars && out.bars.length) {
    const tot = out.bars.reduce((s, x) => s + Math.max(0, x[1]), 0) || 1;
    h += `<div class="stackbar" aria-hidden="true">${out.bars.map((x, i) => `<span style="width:${(Math.max(0, x[1]) / tot * 100).toFixed(2)}%;background:${color(x[3] ?? i)}"></span>`).join('')}</div>`;
    h += `<ul class="legend">${out.bars.map((x, i) => `<li><span class="k"><i style="background:${color(x[3] ?? i)}"></i>${esc(x[0])}</span><span class="v">${fmtVal(x[1], x[2] || 'money', F)}</span><span class="s">${F.num(Math.max(0, x[1]) / tot * 100, 0)}%</span></li>`).join('')}</ul>`;
  }
  if (out.kv && out.kv.length) h += `<dl class="kv">${out.kv.map(([k, v, kind, strong]) => `<dt>${esc(k)}</dt><dd${strong ? ' class="strong"' : ''}>${fmtVal(v, kind || 'money', F)}</dd>`).join('')}</dl>`;
  if (out.chart) h += chartSVG(out.chart, F);
  if (out.table) h += tableHTML(out.table, F);
  (out.tables || []).forEach((t) => { h += tableHTML(t, F); });
  (out.notes || []).forEach((n) => { h += `<p class="note">${esc(n)}</p>`; });
  if (out.warn) h += `<p class="note warn">${esc(out.warn)}</p>`;
  return h;
}

// Plain-text summary for Copy result.
export function summaryText(title, out, F) {
  if (!out || out.error) return title;
  const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const lines = [title, `${out.big.label}: ${strip(fmtVal(out.big.value, out.big.kind, F))}${out.big.unit ? ' ' + out.big.unit : ''}`];
  (out.bars || []).forEach(([k, v, kind]) => lines.push(`${k}: ${strip(fmtVal(v, kind || 'money', F))}`));
  (out.kv || []).forEach(([k, v, kind]) => lines.push(`${k}: ${strip(fmtVal(v, kind || 'money', F))}`));
  return lines.join('\n');
}
