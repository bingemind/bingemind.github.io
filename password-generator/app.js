import { initKit, copyText, toast } from './kit.js';
import { password, passphrase, pool, entropyPassword, entropyPhrase, crackTime, strength } from './gen.js';
import { WORDS } from './words.js';

initKit();
const $ = (id) => document.getElementById(id);
const KEY = 'mt-password-generator';
const ids = ['len', 'lower', 'upper', 'digits', 'symbols', 'noAmbig', 'nwords', 'sep', 'cap', 'digit'];
let mode = 'password';
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { ids.forEach((k) => { const el = $(k); if (!el || !(k in s)) return; if (el.type === 'checkbox') el.checked = !!s[k]; else if (el.tagName === 'SELECT' ? [...el.options].some((o) => o.value === String(s[k])) : /^\d+$/.test(String(s[k]))) el.value = s[k]; }); if (s.mode === 'phrase') mode = 'phrase'; } } catch (e) { /* ignore */ }

function opts() { return { lower: $('lower').checked, upper: $('upper').checked, digits: $('digits').checked, symbols: $('symbols').checked, noAmbig: $('noAmbig').checked }; }
function save() { try { const o = { mode }; ids.forEach((k) => { const el = $(k); o[k] = el.type === 'checkbox' ? el.checked : el.value; }); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }

function gen() {
  $('lenOut').textContent = $('len').value; $('nwOut').textContent = $('nwords').value;
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  $('pwOpts').hidden = mode !== 'password'; $('phOpts').hidden = mode !== 'phrase';
  let pw, bits;
  if (mode === 'password') {
    const o = opts(); const p = pool(o);
    if (!p) { $('pw').textContent = 'Choose at least one character type'; $('bits').textContent = '0'; return; }
    pw = password(+$('len').value, o); bits = entropyPassword(+$('len').value, p.length);
  } else {
    pw = passphrase(+$('nwords').value, WORDS, $('sep').value, $('cap').checked, $('digit').checked);
    bits = entropyPhrase(+$('nwords').value, WORDS.length, $('digit').checked);
  }
  $('pw').textContent = pw;
  const [label, lvl] = strength(bits);
  $('bits').textContent = Math.round(bits);
  $('strength').textContent = label; $('meter').style.width = `${Math.min(100, bits / 1.28)}%`; $('meter').dataset.lvl = lvl;
  $('crackOnline').textContent = crackTime(bits, 1e3);
  $('crackFast').textContent = crackTime(bits, 1e11);
  $('length').textContent = [...pw].length + ' characters';
  const list = $('more'); list.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const li = document.createElement('li'); const code = document.createElement('code');
    code.textContent = mode === 'password' ? password(+$('len').value, opts()) : passphrase(+$('nwords').value, WORDS, $('sep').value, $('cap').checked, $('digit').checked);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = 'Copy';
    b.addEventListener('click', () => copyText(code.textContent, 'Copied'));
    li.append(code, b); list.append(li);
  }
  save();
}
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; gen(); }));
$('form').addEventListener('input', gen);
$('form').addEventListener('submit', (e) => e.preventDefault());
$('regen').addEventListener('click', gen);
$('copyPw').addEventListener('click', () => copyText($('pw').textContent, 'Password copied'));
gen();
