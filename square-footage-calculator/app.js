import { calculateArea, roomArea, outline, SHAPES, DIM_LABELS } from './engine.js';
import { initKit, initSeg, countUp, copyText, downloadFile, num, money, toast, announce, initMiniTotal } from './kit.js';

initKit();
const $ = (id) => document.getElementById(id);
let units = 'imperial';
let rooms = [];
let activeId = null;
let seq = 0;
const STORE = 'mt-sqft-v1';

const newRoom = (o = {}) => ({ id: ++seq, name: o.name || `Room ${seq}`, shape: o.shape || 'rect', qty: o.qty || 1, dims: o.dims || {} });

function dimInputs(room, key) {
  const v = room.dims[key] || {};
  const id = `r${room.id}-${key}`;
  if (units === 'metric') {
    return `<div class="field"><label for="${id}-m">${DIM_LABELS[key]}</label><div class="affix"><input class="input has-post" id="${id}-m" data-room="${room.id}" data-dim="${key}" data-part="m" inputmode="decimal" value="${v.m ?? ''}" placeholder="0"><span class="post" aria-hidden="true">m</span></div></div>`;
  }
  return `<div class="field"><span class="lbl" id="${id}-l">${DIM_LABELS[key]}</span><div class="dim-pair">
    <div class="affix"><input class="input has-post" id="${id}-ft" aria-labelledby="${id}-l ${id}-ftl" data-room="${room.id}" data-dim="${key}" data-part="ft" inputmode="decimal" value="${v.ft ?? ''}" placeholder="0"><span class="post" id="${id}-ftl">ft</span></div>
    <div class="affix"><input class="input has-post" id="${id}-in" aria-labelledby="${id}-l ${id}-inl" data-room="${room.id}" data-dim="${key}" data-part="in" inputmode="decimal" value="${v.in ?? ''}" placeholder="0"><span class="post" id="${id}-inl">in</span></div>
  </div></div>`;
}

function render() {
  const box = $('rooms');
  box.innerHTML = rooms.map((r) => `
    <div class="room${r.id === activeId ? ' active' : ''}" data-id="${r.id}">
      <div class="room-top">
        <div class="field"><label for="r${r.id}-name">Name</label><input class="input" id="r${r.id}-name" data-room="${r.id}" data-field="name" value="${r.name.replace(/"/g, '&quot;')}"></div>
        <div class="field"><label for="r${r.id}-shape">Shape</label><select class="input" id="r${r.id}-shape" data-room="${r.id}" data-field="shape">${Object.entries(SHAPES).map(([k, s]) => `<option value="${k}"${k === r.shape ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div>
        <div class="field qty-f"><label for="r${r.id}-qty">How many</label><input class="input" id="r${r.id}-qty" data-room="${r.id}" data-field="qty" inputmode="numeric" value="${r.qty}"></div>
        <button class="del" type="button" data-del="${r.id}" aria-label="Remove ${r.name.replace(/"/g, '')}"${rooms.length === 1 ? ' disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="dims">${SHAPES[r.shape].dims.map((k) => dimInputs(r, k)).join('')}</div>
      <div class="area-chip" id="chip-${r.id}"></div>
    </div>`).join('');
}

function draw(room) {
  const svg = $('draw');
  if (!room) { svg.innerHTML = ''; return; }
  const res = roomArea({ ...room.dims, shape: room.shape }, units);
  const f = res.feet || {};
  const W = 320, H = 190, pad = 28;
  const unitLbl = (feet) => units === 'metric' ? `${num(feet / 3.280839895)} m` : `${Math.floor(feet + 1e-9)}′${Math.round((feet - Math.floor(feet + 1e-9)) * 12) ? ` ${Math.round((feet - Math.floor(feet + 1e-9)) * 12)}″` : ''}`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (res.error || !res.area) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">${res.error || 'Enter measurements to see the shape'}</text>`;
    svg.setAttribute('aria-label', res.error || 'No drawing yet');
    return;
  }
  let shapeEl = '', labels = '';
  if (room.shape === 'circle') {
    const rr = Math.min(W - pad * 2, H - pad * 2) / 2;
    shapeEl = `<circle class="shape" cx="${W / 2}" cy="${H / 2}" r="${rr}"></circle><line x1="${W / 2 - rr}" y1="${H / 2}" x2="${W / 2 + rr}" y2="${H / 2}" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"></line>`;
    labels = `<text x="${W / 2}" y="${H / 2 - 6}" text-anchor="middle">⌀ ${unitLbl(f.diameter)}</text>`;
  } else {
    const pts = outline(room.shape, f);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1;
    const s = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
    const ox = (W - w * s) / 2 - Math.min(...xs) * s, oy = (H - h * s) / 2 - Math.min(...ys) * s;
    const P = pts.map(([x, y]) => [ox + x * s, oy + y * s]);
    shapeEl = `<polygon class="shape" points="${P.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"></polygon>`;
    const first = SHAPES[room.shape].dims[0], second = SHAPES[room.shape].dims[room.shape === 'trapezoid' ? 2 : 1];
    const minX = Math.min(...P.map((p) => p[0])), maxX = Math.max(...P.map((p) => p[0])), minY = Math.min(...P.map((p) => p[1])), maxY = Math.max(...P.map((p) => p[1]));
    labels = `<text x="${(minX + maxX) / 2}" y="${room.shape === 'triangle' ? maxY + 16 : minY - 8}" text-anchor="middle">${unitLbl(room.shape === 'trapezoid' ? f.top : f[first])}</text>
      <text x="${minX - 8}" y="${(minY + maxY) / 2}" text-anchor="end" dominant-baseline="middle">${unitLbl(f[second])}</text>`;
  }
  const areaTxt = units === 'metric' ? `${num(res.each / 10.7639104)} m²` : `${num(res.each)} sq ft`;
  svg.innerHTML = `${shapeEl}${labels}<text x="${W - 6}" y="${H - 6}" text-anchor="end" style="font-weight:700;fill:var(--ink)">${areaTxt}</text>`;
  svg.setAttribute('aria-label', `${room.name}: ${SHAPES[room.shape].label}, ${areaTxt}`);
}

let last = null;
const mini = initMiniTotal($('results'), 'Total <b id="miniSq">0 sq ft</b><span id="miniW"></span>');

function update() {
  const input = {
    units,
    rooms: rooms.map((r) => ({ ...r.dims, shape: r.shape, qty: r.qty })),
    wastePct: +$('waste').value,
    pricePerSqft: parseFloat($('price').value.replace(/[$,]/g, '')) || 0,
    boxSqft: parseFloat($('box').value) || 0,
  };
  const res = calculateArea(input);
  last = { input, res };
  countUp($('sqft'), res.sqft, (v) => num(v));
  $('sqyd').textContent = num(res.sqyd);
  $('sqm').textContent = num(res.sqm);
  $('acres').textContent = res.acres.toLocaleString('en-US', { maximumFractionDigits: 4 });
  $('roomCount').textContent = `${rooms.length} area${rooms.length > 1 ? 's' : ''}`;
  $('wasteLbl').textContent = `${input.wastePct}%`;
  $('withWaste').textContent = `${num(res.withWaste)} sq ft`;
  const showBox = res.boxes > 0, showCost = res.cost > 0;
  $('boxes').hidden = $('boxesL').hidden = !showBox;
  $('cost').hidden = $('costL').hidden = !showCost;
  if (showBox) $('boxes').textContent = `${res.boxes} boxes`;
  if (showCost) $('cost').textContent = money(res.cost);
  $('miniSq').textContent = `${num(res.sqft)} sq ft`;
  $('miniW').textContent = `${num(res.withWaste)} with waste`;

  rooms.forEach((r, i) => {
    const rr = res.rooms[i];
    const chip = $(`chip-${r.id}`);
    if (chip) chip.innerHTML = rr.error ? `<span class="err">${rr.error}</span>` : `<span>${SHAPES[r.shape].label}${r.qty > 1 ? ` × ${r.qty}` : ''}</span><b>${num(rr.area)} sq ft</b>`;
  });
  draw(rooms.find((r) => r.id === activeId) || rooms[0]);

  $('tableWrap').innerHTML = rooms.length > 1 ? `<table class="tbl"><caption class="sr">Area by room</caption><thead><tr><th scope="col">Area</th><th scope="col">Sq ft</th><th scope="col">Sq m</th></tr></thead><tbody>${rooms.map((r, i) => `<tr><td>${r.name.replace(/</g, '&lt;')}</td><td>${num(res.rooms[i].area)}</td><td>${num(res.rooms[i].area / 10.7639104)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td>${num(res.sqft)}</td><td>${num(res.sqm)}</td></tr></tfoot></table>` : '';
  try { localStorage.setItem(STORE, JSON.stringify({ units, rooms, waste: $('waste').value, price: $('price').value, box: $('box').value })); } catch (e) { /* ignore */ }
  announce(`Total ${num(res.sqft)} square feet, ${num(res.withWaste)} with waste.`);
}

// Events (delegated)
const form = $('form');
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', (e) => {
  const t = e.target;
  const id = +t.dataset.room;
  if (id) {
    const r = rooms.find((x) => x.id === id);
    if (t.dataset.dim) { r.dims[t.dataset.dim] = { ...(r.dims[t.dataset.dim] || {}), [t.dataset.part]: t.value.trim() }; }
    else if (t.dataset.field === 'name') r.name = t.value;
    else if (t.dataset.field === 'qty') r.qty = Math.max(parseInt(t.value, 10) || 1, 1);
    setActive(id);
  }
  update();
});
form.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.field === 'shape') {
    const r = rooms.find((x) => x.id === +t.dataset.room);
    r.shape = t.value; activeId = r.id; render(); $(`r${r.id}-shape`).focus();
  }
  update();
});
form.addEventListener('focusin', (e) => { const id = +e.target.dataset.room; if (id) setActive(id); });
form.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (!del) return;
  rooms = rooms.filter((r) => r.id !== +del.dataset.del);
  activeId = rooms[rooms.length - 1]?.id ?? null;
  render(); update();
  $('addRoom').focus();
});
function setActive(id) {
  if (activeId === id) return;
  activeId = id;
  document.querySelectorAll('.room').forEach((el) => el.classList.toggle('active', +el.dataset.id === id));
  draw(rooms.find((r) => r.id === id));
}
$('addRoom').addEventListener('click', () => {
  const r = newRoom();
  rooms.push(r); activeId = r.id; render(); update();
  const first = document.querySelector(`.room[data-id="${r.id}"] [data-dim]`); if (first) first.focus();
});
$('clearRooms').addEventListener('click', () => { seq = 0; rooms = [newRoom()]; activeId = rooms[0].id; render(); update(); });

const seg = initSeg($('units'), (v) => {
  // Convert existing measurements so the user does not lose them.
  rooms.forEach((r) => Object.keys(r.dims).forEach((k) => {
    const d = r.dims[k];
    if (v === 'metric') { const f = (+d.ft || 0) + (+d.in || 0) / 12; r.dims[k] = { m: f ? String(Math.round(f / 3.280839895 * 100) / 100) : '' }; }
    else { const f = (+d.m || 0) * 3.280839895; const ft = Math.floor(f); const inch = Math.round((f - ft) * 12); r.dims[k] = f ? (inch === 12 ? { ft: String(ft + 1), in: '' } : { ft: String(ft), in: inch ? String(inch) : '' }) : {}; }
  }));
  units = v; render(); update();
});

function sharePayload() {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ u: units, r: rooms.map(({ name, shape, qty, dims }) => ({ name, shape, qty, dims })), w: $('waste').value, p: $('price').value, b: $('box').value }))));
}
$('shareRes').addEventListener('click', () => copyText(`${location.origin}${location.pathname}?plan=${sharePayload()}`, 'Link copied'));
$('copyRes').addEventListener('click', () => {
  const { res } = last;
  copyText(`Square footage\n${rooms.map((r, i) => `${r.name}: ${num(res.rooms[i].area)} sq ft`).join('\n')}\nTotal: ${num(res.sqft)} sq ft (${num(res.sqyd)} sq yd, ${num(res.sqm)} m²)\nWith ${last.input.wastePct}% waste: ${num(res.withWaste)} sq ft${res.boxes ? `\nBoxes: ${res.boxes}` : ''}${res.cost ? `\nCost: ${money(res.cost)}` : ''}`, 'Result copied');
});
$('csvRes').addEventListener('click', () => {
  const { res } = last;
  const lines = [['Area', 'Shape', 'Quantity', 'Sq ft', 'Sq m']].concat(rooms.map((r, i) => [r.name.replace(/,/g, ' '), SHAPES[r.shape].label, r.qty, res.rooms[i].area, Math.round(res.rooms[i].area / 10.7639104 * 100) / 100]));
  lines.push(['Total', '', '', res.sqft, res.sqm], ['With waste', `${last.input.wastePct}%`, '', res.withWaste, '']);
  downloadFile(`square-footage-${new Date().toISOString().slice(0, 10)}.csv`, lines.map((l) => l.join(',')).join('\n'));
  toast('CSV downloaded');
});
$('printRes').addEventListener('click', () => window.print());

// Start: share link > saved > example
(function start() {
  let s = null;
  const q = new URLSearchParams(location.search);
  if (q.has('plan')) { try { const p = JSON.parse(decodeURIComponent(escape(atob(q.get('plan'))))); s = { units: p.u, rooms: p.r, waste: p.w, price: p.p, box: p.b }; } catch (e) { /* bad link */ } }
  if (!s) { try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { /* ignore */ } }
  if (s && Array.isArray(s.rooms) && s.rooms.length) {
    units = s.units === 'metric' ? 'metric' : 'imperial';
    rooms = s.rooms.slice(0, 40).map((r) => newRoom({ name: String(r.name || '').slice(0, 60), shape: Object.hasOwn(SHAPES, r.shape) ? r.shape : 'rect', qty: Math.max(parseInt(r.qty, 10) || 1, 1), dims: r.dims && typeof r.dims === 'object' ? r.dims : {} }));
    if (s.waste && $('waste').querySelector(`option[value="${CSS.escape(String(s.waste))}"]`)) $('waste').value = s.waste;
    if (s.price) $('price').value = s.price;
    if (s.box) $('box').value = s.box;
  } else {
    rooms = [newRoom({ name: 'Living room', dims: { length: { ft: '12' }, width: { ft: '10' } } }), newRoom({ name: 'Bedroom', dims: { length: { ft: '10' }, width: { ft: '8' } } })];
  }
  activeId = rooms[0].id;
  if (units === 'metric') seg.select('metric');
  render(); update();
})();
void mini;
