import { initKit, num, copyText, downloadFile, toast, regionInfo } from './kit.js';
import { stats, LIMITS } from './count.js';

initKit();
const ta = document.getElementById('text');
const KEY = 'mt-word-counter';
try { const s = localStorage.getItem(KEY); if (s) ta.value = s; } catch (e) { /* storage blocked */ }
const $ = (id) => document.getElementById(id);
const mins = (m) => (m < 1 ? `${Math.max(Math.round(m * 60), m > 0 ? 1 : 0)} sec` : `${Math.floor(m)} min ${Math.round((m % 1) * 60)} sec`);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let timer;

function render() {
  const s = stats(ta.value, regionInfo().locale);
  $('words').textContent = num(s.words, 0);
  $('chars').textContent = num(s.chars, 0);
  $('noSpace').textContent = num(s.noSpace, 0);
  $('sentences').textContent = num(s.sentences, 0);
  $('paragraphs').textContent = num(s.paragraphs, 0);
  $('unique').textContent = num(s.unique, 0);
  $('read').textContent = mins(s.readMin);
  $('speak').textContent = mins(s.speakMin);
  $('avgWord').textContent = num(s.avgWord, 1) + ' letters';
  $('avgSent').textContent = num(s.avgSentence, 1) + ' words';
  $('flesch').textContent = s.flesch == null ? 'English text only' : `${num(s.flesch, 0)} (${s.flesch >= 70 ? 'easy' : s.flesch >= 50 ? 'fairly difficult' : 'difficult'})`;
  $('top').innerHTML = s.top.length ? s.top.map(([w, n]) => `<li><span class="k">${esc(w)}</span><span class="v">${n}×</span><span class="s">${num(n / s.words * 100, 1)}%</span></li>`).join('') : '<li><span class="k">Type or paste text to see keywords</span></li>';
  $('limits').innerHTML = LIMITS.map(([name, max, unit]) => {
    const have = unit === 'words' ? s.words : s.chars, left = max - have;
    return `<tr${left < 0 ? ' class="over"' : ''}><td>${name}</td><td>${num(max, 0)} ${unit}</td><td>${left >= 0 ? num(left, 0) + ' left' : num(-left, 0) + ' over'}</td></tr>`;
  }).join('');
  $('miniW') && ($('miniW').textContent = num(s.words, 0));
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, ta.value.slice(0, 200000)); } catch (e) { /* ignore */ } }, 400);
}
ta.addEventListener('input', render);
$('clear').addEventListener('click', () => { ta.value = ''; render(); ta.focus(); });
$('copyText').addEventListener('click', () => copyText(ta.value, 'Text copied'));
$('caseUp').addEventListener('click', () => { ta.value = ta.value.toUpperCase(); render(); });
$('caseLow').addEventListener('click', () => { ta.value = ta.value.toLowerCase(); render(); });
$('caseTitle').addEventListener('click', () => { ta.value = ta.value.toLowerCase().replace(/(^|[\s(“"'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()); render(); });
$('caseSent').addEventListener('click', () => { ta.value = ta.value.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()); render(); });
$('trim').addEventListener('click', () => { ta.value = ta.value.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim(); render(); toast('Extra spaces removed'); });
$('copyStats').addEventListener('click', () => {
  const s = stats(ta.value, regionInfo().locale);
  copyText(`Words: ${s.words}\nCharacters: ${s.chars}\nCharacters without spaces: ${s.noSpace}\nSentences: ${s.sentences}\nParagraphs: ${s.paragraphs}\nReading time: ${mins(s.readMin)}`, 'Counts copied');
});
$('saveTxt').addEventListener('click', () => downloadFile('text.txt', ta.value, 'text/plain'));
render();
