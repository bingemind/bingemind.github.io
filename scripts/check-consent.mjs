// Isolated consent logic checks. No network, browser or third-party packages.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const defaults = home.match(/<!-- bm-consent-default v1 -->\s*<script>(.*?)<\/script>/s)[1];
const script = await readFile(new URL('../js/consent.js', import.meta.url), 'utf8');
assert.ok(Buffer.byteLength(script) < 3000);
function setup({ choice, analytics = 'on', hostname = 'bingemind.com', blocked = false, tz = 'Europe/London' } = {}) {
  const stored = new Map(choice ? [['bm-analytics-consent', choice]] : []);
  const events = {}, windowEvents = {}, boxEvents = {}, scripts = [], cookies = [];
  let focused, scrolled = false;
  const settings = { focus() { focused = 'settings'; } };
  const accept = { dataset: { choice: 'accepted' }, focus() { focused = 'accept'; } };
  const reject = { dataset: { choice: 'rejected' } };
  const box = { setAttribute() {}, addEventListener(name, fn) { boxEvents[name] = fn; }, querySelector() { return accept; }, scrollIntoView() { scrolled = true; } };
  const footer = { before() {}, querySelector() { return settings; } };
  const document = {
    querySelector(selector) { return selector === 'footer' ? footer : { dataset: { analytics } }; },
    createElement(tag) { return tag === 'section' ? box : {}; },
    head: { appendChild(node) { scripts.push(node); } },
    addEventListener(name, fn) { events[name] = fn; },
    get cookie() { return '_ga=old; _ga_F4Y30PMRBB=old; theme=dark'; },
    set cookie(value) { cookies.push(value); }
  };
  const localStorage = { getItem(key) { if (blocked) throw Error('blocked'); return stored.get(key) || null; }, setItem(key, value) { if (blocked) throw Error('blocked'); stored.set(key, value); } };
  const Intl = { DateTimeFormat() { return { resolvedOptions() { return { timeZone: tz }; } }; } };
  const context = vm.createContext({ document, localStorage, Intl, location: { hostname }, addEventListener(name, fn) { windowEvents[name] = fn; } });
  context.window = context;
  vm.runInContext(defaults, context);
  vm.runInContext(script, context);
  return { context, box, scripts, cookies, stored,
    choose(value) { boxEvents.click({ target: { closest() { return value === 'accepted' ? accept : reject; } } }); },
    reopen() { events.click({ preventDefault() {}, target: { closest() { return settings; } } }); },
    sync(value) { if (value) stored.set('bm-analytics-consent', value); else stored.clear(); windowEvents.storage({ key: 'bm-analytics-consent' }); },
    get focused() { return focused; }, get scrolled() { return scrolled; }
  };
}
let count = 0;
function check(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
check('new visitor: all four defaults denied, no analytics load or events', () => {
  const s = setup();
  const first = s.context.dataLayer[0];
  assert.equal(first[0], 'consent'); assert.equal(first[1], 'default');
  for (const value of Object.values(first[2])) assert.equal(value, 'denied');
  assert.equal(s.scripts.length, 0); assert.equal(s.box.hidden, false);
  const n = s.context.dataLayer.length;s.context.gtag('event', 'tool_used');assert.equal(s.context.dataLayer.length, n);
});
check('accept: save, grant only analytics, load once, allow events, restore focus', () => {
  const s = setup();s.choose('accepted');
  assert.equal(s.stored.get('bm-analytics-consent'), 'accepted');assert.equal(s.scripts.length, 1);assert.equal(s.box.hidden, true);
  assert.equal(s.context.bmAnalyticsAllowed, true);assert.equal(s.context['ga-disable-G-F4Y30PMRBB'], false);assert.equal(s.focused, 'settings');
  assert.deepEqual(Object.keys(s.context.dataLayer.find(x => x[1] === 'update' && x[2].analytics_storage === 'granted')[2]), ['analytics_storage']);
  s.context.gtag('event', 'tool_used');assert.equal(s.context.dataLayer.at(-1)[0], 'event');
  s.reopen();s.choose('accepted');assert.equal(s.scripts.length, 1);
});
check('reject: no load, remember choice, remove analytics cookies only', () => {
  const s = setup();s.choose('rejected');assert.equal(s.scripts.length, 0);assert.equal(s.box.hidden, true);
  assert.equal(s.stored.get('bm-analytics-consent'), 'rejected');assert.ok(s.cookies.length);assert.ok(s.cookies.every(x => x.startsWith('_ga')));
});
check('reopen and withdraw: reachable controls, disable analytics and drop events', () => {
  const s = setup({ choice: 'accepted' });s.reopen();assert.equal(s.box.hidden, false);assert.equal(s.focused, 'accept');assert.equal(s.scrolled, true);
  s.choose('rejected');assert.equal(s.focused, 'settings');assert.equal(s.context['ga-disable-G-F4Y30PMRBB'], true);
  const n = s.context.dataLayer.length;s.context.gtag('event', 'test');assert.equal(s.context.dataLayer.length, n);
});
check('saved acceptance applies on the next page', () => { const s = setup({ choice: 'accepted' });assert.equal(s.box.hidden, true);assert.equal(s.scripts.length, 1); });
check('saved rejection applies on the next page', () => { const s = setup({ choice: 'rejected' });assert.equal(s.box.hidden, true);assert.equal(s.scripts.length, 0); });
check('blocked storage: defaults safe; buttons still work for the current page', () => { const s = setup({ blocked: true });s.choose('accepted');assert.equal(s.scripts.length, 1);s.reopen();s.choose('rejected');assert.equal(s.context.bmAnalyticsAllowed, false); });
check('local preview does not load GA even after accepting', () => { const s = setup({ hostname: '127.0.0.1' });s.choose('accepted');assert.equal(s.scripts.length, 0); });
check('Galactic pages retain no analytics after saved acceptance', () => { const s = setup({ analytics: 'off', choice: 'accepted' });assert.equal(s.scripts.length, 0);assert.equal(s.context.bmAnalyticsAllowed, false);assert.equal(s.cookies.length, 0); });
check('cross-tab choices apply without reloading', () => { const s = setup();s.sync('accepted');assert.equal(s.scripts.length, 1);s.sync('rejected');assert.equal(s.context.bmAnalyticsAllowed, false);s.sync(null);assert.equal(s.box.hidden, false); });
check('outside Europe: no banner, analytics on by default', () => { const s = setup({ tz: 'Asia/Kolkata' });assert.equal(s.box.hidden, true);assert.equal(s.scripts.length, 1);assert.equal(s.context.bmAnalyticsAllowed, true); });
check('outside Europe: Cookie settings opt out sticks', () => { const s = setup({ tz: 'America/New_York' });s.reopen();assert.equal(s.box.hidden, false);s.choose('rejected');assert.equal(s.context.bmAnalyticsAllowed, false);const t = setup({ tz: 'America/New_York', choice: 'rejected' });assert.equal(t.scripts.length, 0); });
check('unknown or European time zone: opt in, banner shown', () => { for (const tz of ['', 'Etc/UTC', 'Europe/Zurich', 'Atlantic/Canary', 'Africa/Ceuta']) { const s = setup({ tz });assert.equal(s.box.hidden, false);assert.equal(s.scripts.length, 0); } });
console.log(`${count} consent checks passed; ${Buffer.byteLength(script)} bytes.`);
