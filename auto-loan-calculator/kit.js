// Shared file: identical copy in every calculator folder. The master is tools-build/shared/kit.js in the MicroTools project; edit it there and re-run tools/build_bingemind.py.
// Micro-tool kit: shared behaviour (theme, reveal-on-scroll, count-up, tabs, toast,
import { initRegion } from './region.js';
// copy/share/print/CSV helpers). No dependencies.

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const label = () => btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
  label();
  btn.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* ignore */ }
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.removeAttribute('media'); m.content = isDark() ? '#090d1c' : '#f7f6f2'; });
    label();
  });
}

export function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion()) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((e) => io.observe(e));
}

// Animate a number in an element from its current value to `to`.
const running = new WeakMap();
export function countUp(el, to, format, ms = 650) {
  if (!el) return;
  const from = parseFloat(el.dataset.value || '0') || 0;
  el.dataset.value = String(to);
  cancelAnimationFrame(running.get(el));
  // Hidden tabs pause requestAnimationFrame, so write the final value straight away.
  if (reduceMotion() || from === to || document.hidden) { el.textContent = format(to); return; }
  // Safety net: whatever happens to the animation, the final value lands.
  setTimeout(() => { if (el.dataset.value === String(to)) el.textContent = format(to); }, ms + 120);
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / ms, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(from + (to - from) * e);
    if (p < 1) running.set(el, requestAnimationFrame(step));
  };
  running.set(el, requestAnimationFrame(step));
}

export function initSeg(seg, onChange) {
  const buttons = [...seg.querySelectorAll('button')];
  let pill = seg.querySelector('.pill');
  if (!pill) { pill = document.createElement('span'); pill.className = 'pill'; pill.setAttribute('aria-hidden', 'true'); seg.prepend(pill); }
  const move = (b) => { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  seg.setAttribute('role', 'radiogroup');
  buttons.forEach((b) => { b.setAttribute('role', 'radio'); });
  const isOn = (b) => b.getAttribute('aria-checked') === 'true' || b.getAttribute('aria-selected') === 'true';
  const select = (b, fire = true) => {
    buttons.forEach((x) => { x.setAttribute('aria-checked', String(x === b)); x.removeAttribute('aria-selected'); x.tabIndex = x === b ? 0 : -1; });
    move(b);
    if (fire) onChange(b.dataset.value);
  };
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = buttons[(i + 1) % buttons.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = buttons[(i + buttons.length - 1) % buttons.length];
      else if (e.key === 'Home') n = buttons[0];
      else if (e.key === 'End') n = buttons[buttons.length - 1];
      if (!n) return;
      e.preventDefault(); n.focus(); select(n);
    });
  });
  const current = buttons.find(isOn) || buttons[0];
  select(current, false);
  const remeasure = () => move(buttons.find((b) => b.getAttribute('aria-checked') === 'true') || buttons[0]);
  requestAnimationFrame(remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener('resize', remeasure);
  return { select: (v) => { const b = buttons.find((x) => x.dataset.value === v); if (b) select(b, false); } };
}

let toastTimer;
export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

export async function copyText(text, okMsg = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg); } catch (e2) { toast('Copy failed'); }
    ta.remove();
  }
}

export function downloadFile(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export function flash(el) { if (!el || reduceMotion()) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

export { money, num, parseNum, onRegionChange, getRegion, regionInfo, setRegion, currencySymbol } from './region.js';

export function initKit() {
  document.documentElement.classList.remove('js-off');
  initRegion();
  initTheme();
  initReveal();
  const y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
}

// One polite screen-reader announcement after typing settles (instead of live count-ups).
let liveTimer;
export function announce(msg, delay = 700) {
  let live = document.getElementById('sr-live');
  if (!live) { live = document.createElement('p'); live.id = 'sr-live'; live.className = 'sr'; live.setAttribute('aria-live', 'polite'); document.body.append(live); }
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { live.textContent = msg; }, delay);
}

// Mark a field invalid with visible text linked by aria-describedby.
export function setInvalid(el, bad, msg = '') {
  el.setAttribute('aria-invalid', String(!!bad));
  let err = document.getElementById(el.id + '-err');
  if (!err) {
    err = document.createElement('span'); err.className = 'err'; err.id = el.id + '-err';
    (el.closest('.affix') || el).insertAdjacentElement('afterend', err);
    const d = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (!d.includes(err.id)) el.setAttribute('aria-describedby', [...d, err.id].join(' '));
  }
  err.textContent = bad ? msg : '';
}

// Sticky mini total on phones; hides while the full results card is on screen.
export function initMiniTotal(resultsEl, html = '') {
  const a = document.createElement('a');
  a.className = 'mini-total'; a.href = '#' + resultsEl.id; a.innerHTML = html;
  document.body.append(a);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => a.classList.toggle('away', en.isIntersecting), { threshold: 0.25 }).observe(resultsEl);
  }
  a.addEventListener('click', () => setTimeout(() => resultsEl.focus({ preventScroll: true }), 400));
  return a;
}
