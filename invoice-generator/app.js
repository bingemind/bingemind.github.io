import { initKit, money, regionInfo, onRegionChange, parseNum, downloadFile, toast, copyText } from './kit.js';
import { VAT, localAmount } from './geo.js';
import { totals } from './invoice.js';

initKit();
const $ = (id) => document.getElementById(id);
const KEY = 'mt-invoice-generator', LOGO = 'mt-invoice-logo';
let logo = '';
try { const l = localStorage.getItem(LOGO); if (l && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(l)) logo = l; } catch (e) { /* ignore */ }
const FIELDS = ['from', 'to', 'number', 'date', 'due', 'taxName', 'taxRate', 'discount', 'shipping', 'notes', 'payment'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const taxDefaults = () => { const v = VAT[regionInfo().code] || [0, [], 'Tax']; return { name: regionInfo().code === 'US' ? 'Sales tax' : /^[A-Za-z/ ]+$/.test(v[2]) && !/^no /.test(v[2]) ? v[2] : 'Tax', rate: v[0] }; };

const cur = regionInfo().currency;
let items = [{ desc: 'Website design', qty: '1', price: String(localAmount(1200, cur)) }, { desc: 'Hosting (12 months)', qty: '12', price: String(localAmount(15, cur)) }];
const now = new Date(), due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
const def = { from: 'Your Business Name\n12 Example Street\nCity, Postcode\nhello@example.com', to: 'Client Name\nClient Company\nAddress', number: 'INV-0001', date: iso(now), due: iso(due), taxName: taxDefaults().name, taxRate: String(taxDefaults().rate), discount: '0', shipping: '0', notes: 'Thank you for your business.', payment: 'Bank transfer to: Account name, account number, sort code / IBAN' };
FIELDS.forEach((k) => { $(k).value = def[k]; });
try {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (s && typeof s === 'object') {
    FIELDS.forEach((k) => { if (typeof s[k] === 'string') $(k).value = s[k].slice(0, 2000); });
    $('paid').checked = s.paid === true;
    if (Array.isArray(s.items)) items = s.items.slice(0, 50).filter((x) => x && typeof x === 'object').map((x) => ({ desc: String(x.desc || '').slice(0, 200), qty: String(x.qty || ''), price: String(x.price || '') }));
  }
} catch (e) { /* ignore */ }

function renderItems() {
  $('items').innerHTML = items.map((it, i) => `<div class="inv-row" data-i="${i}">
    <input class="input" aria-label="Item ${i + 1} description" data-k="desc" value="${esc(it.desc)}" placeholder="Description" maxlength="200">
    <input class="input" aria-label="Item ${i + 1} quantity" data-k="qty" inputmode="decimal" value="${esc(it.qty)}" placeholder="Qty">
    <input class="input" aria-label="Item ${i + 1} unit price" data-k="price" inputmode="decimal" value="${esc(it.price)}" placeholder="Price">
    <button type="button" class="del" data-del="${i}" aria-label="Remove item ${i + 1}">×</button></div>`).join('');
}
function state() { const o = { items, paid: $('paid').checked }; FIELDS.forEach((k) => { o[k] = $(k).value; }); return o; }
function calc() {
  const s = state();
  return totals(items.map((it) => ({ desc: it.desc, qty: parseNum(it.qty) || 0, price: parseNum(it.price) || 0 })), parseNum(s.taxRate) || 0, parseNum(s.discount) || 0, parseNum(s.shipping) || 0);
}
function preview() {
  const s = state(), t = calc();
  const d = (x) => { if (!x) return ''; const [y, m, dd] = x.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(regionInfo().locale, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const nl = (x) => esc(x).replace(/\n/g, '<br>');
  $('invoice').innerHTML = `<div class="inv-head"><div class="inv-from">${logo ? '<img class="inv-logo" alt="" src="' + logo + '">' : ''}${nl(s.from)}</div><div class="inv-meta"><h3>${s.paid ? 'RECEIPT' : 'INVOICE'}</h3><p><b>${esc(s.number)}</b></p><p>Date: ${d(s.date)}</p>${s.due ? `<p>Due: ${d(s.due)}</p>` : ''}</div></div>
  <div class="inv-to"><span>Bill to</span><div>${nl(s.to)}</div></div>
  <table class="tbl inv-tbl"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>
  ${t.lines.map((l) => `<tr><td>${esc(l.desc)}</td><td>${l.qty}</td><td>${money(l.price)}</td><td>${money(l.amount)}</td></tr>`).join('')}</tbody></table>
  <div class="inv-sum">${s.paid ? '<div class="inv-paid">PAID</div>' : '<span></span>'}<dl class="kv inv-tot"><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd>${t.discount ? `<dt>Discount (${esc(s.discount)}%)</dt><dd>−${money(t.discount)}</dd>` : ''}${t.tax || parseNum(s.taxRate) ? `<dt>${esc(s.taxName || 'Tax')} (${esc(s.taxRate)}%)</dt><dd>${money(t.tax)}</dd>` : ''}${parseNum(s.shipping) ? `<dt>Shipping</dt><dd>${money(parseNum(s.shipping))}</dd>` : ''}<dt class="grand">Total due (${regionInfo().currency})</dt><dd class="grand">${money(t.total)}</dd></dl></div>
  ${s.payment ? `<div class="inv-note"><b>Payment details</b><br>${nl(s.payment)}</div>` : ''}${s.notes ? `<div class="inv-note">${nl(s.notes)}</div>` : ''}`;
  $('grand').textContent = money(t.total);
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}
$('form').addEventListener('input', (e) => {
  const row = e.target.closest('.inv-row');
  if (row) items[+row.dataset.i][e.target.dataset.k] = e.target.value;
  preview();
});
$('form').addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { items.splice(+del.dataset.del, 1); if (!items.length) items.push({ desc: '', qty: '1', price: '' }); renderItems(); preview(); }
});
$('form').addEventListener('submit', (e) => e.preventDefault());
$('addItem').addEventListener('click', () => { if (items.length >= 50) return toast('Up to 50 lines'); items.push({ desc: '', qty: '1', price: '' }); renderItems(); $('items').lastElementChild.querySelector('input').focus(); preview(); });
$('printInv').addEventListener('click', () => window.print());
$('csvInv').addEventListener('click', () => {
  const t = calc(), q = (x) => `"${String(x).replace(/"/g, '""')}"`;
  const rows = [['Description', 'Qty', 'Unit price', 'Amount'], ...t.lines.map((l) => [l.desc, l.qty, l.price, l.amount]), [], ['Subtotal', '', '', t.subtotal], ['Discount', '', '', -t.discount], ['Tax', '', '', t.tax], ['Total', '', '', t.total]];
  downloadFile(`${$('number').value || 'invoice'}.csv`, rows.map((r) => r.map(q).join(',')).join('\n'));
});
$('copyInv').addEventListener('click', () => copyText($('invoice').innerText, 'Invoice text copied'));
$('newInv').addEventListener('click', () => {
  const m = $('number').value.match(/^(.*?)(\d+)$/);
  if (m) $('number').value = m[1] + String(+m[2] + 1).padStart(m[2].length, '0');
  items = [{ desc: '', qty: '1', price: '' }]; $('to').value = ''; $('date').value = iso(new Date());
  const d2 = new Date(); d2.setDate(d2.getDate() + 30); $('due').value = iso(d2);
  renderItems(); preview(); toast('New invoice started. Your business details are kept.');
});
onRegionChange(() => { const t = taxDefaults(); $('taxName').value = t.name; $('taxRate').value = String(t.rate); preview(); });
$('noLogo').hidden = !logo;
$('logo').addEventListener('change', () => {
  const file = $('logo').files[0]; if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast('Use a PNG, JPG or WebP image');
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(1, 480 / img.width, 200 / img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    logo = c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
    URL.revokeObjectURL(url);
    try { localStorage.setItem(LOGO, logo); } catch (e) { toast('Logo shown but too large to remember'); }
    $('noLogo').hidden = false; preview();
  };
  img.onerror = () => toast('That image could not be read');
  img.src = url;
});
$('noLogo').addEventListener('click', () => { logo = ''; $('logo').value = ''; try { localStorage.removeItem(LOGO); } catch (e) { /* ignore */ } $('noLogo').hidden = true; preview(); });
renderItems();
preview();
