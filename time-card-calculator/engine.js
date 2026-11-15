// Time card engine: punches -> minutes worked -> weekly overtime split.
import { splitWeek, DAYS } from '../overtime-calculator/engine.js';

export { DAYS };

// "08:30" or "8:30" or "830" or "8:30 pm" -> minutes after midnight, or null if empty, NaN if invalid.
export function parseTime(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim().toLowerCase().replace(/\./g, '');
  if (s === '') return null;
  const ampm = s.match(/\s*(am|pm|a|p)$/);
  if (ampm) s = s.slice(0, ampm.index).trim();
  let h, m;
  let mm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (mm) { h = +mm[1]; m = +mm[2]; }
  else if ((mm = s.match(/^(\d{3,4})$/))) { const n = mm[1].padStart(4, '0'); h = +n.slice(0, 2); m = +n.slice(2); }
  else if ((mm = s.match(/^(\d{1,2})$/))) { h = +mm[1]; m = 0; }
  else return NaN;
  if (m > 59) return NaN;
  if (ampm) {
    if (h < 1 || h > 12) return NaN;
    const pm = ampm[1].startsWith('p');
    if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12;
  }
  if (h > 23) return NaN;
  return h * 60 + m;
}

// Round a punch to the nearest increment (FLSA allows neutral rounding, e.g. 5, 6 or 15 minutes).
export function roundMinutes(min, inc) {
  if (!inc || inc <= 1) return min;
  return Math.round(min / inc) * inc;
}

// Minutes worked in one day. Overnight shifts (end earlier than start) roll past midnight.
export function dayMinutes({ start, end, breakMin = 0 }, rounding = 0) {
  const s = parseTime(start), e = parseTime(end);
  if (s === null || e === null) return { minutes: 0, valid: s === null && e === null, overnight: false };
  if (Number.isNaN(s) || Number.isNaN(e)) return { minutes: 0, valid: false, overnight: false };
  const rs = roundMinutes(s, rounding);
  let re = roundMinutes(e, rounding);
  const overnight = re <= rs && !(re === rs && s === e);
  if (re <= rs) re += 24 * 60;
  const span = re - rs;
  const br = Math.min(Math.max(+breakMin || 0, 0), span);
  return { minutes: span - br, valid: true, overnight, breakUsed: br };
}

export const toDecimal = (minutes) => Math.round((minutes / 60) * 100) / 100;
export function toHM(minutes) {
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// weeks: array of 1 or 2 weeks, each an array of 7 {start,end,breakMin}.
export function calculateCard({ weeks, rate = 0, rule = 'federal', custom = {}, otMult = 1.5, dtMult = 2, rounding = 0 }) {
  rate = Math.max(+rate || 0, 0);
  otMult = +otMult > 0 ? +otMult : 1.5;
  dtMult = +dtMult > 0 ? +dtMult : 2;
  const out = weeks.map((week, wi) => {
    const days = week.map((d) => dayMinutes(d, rounding));
    const { rows } = splitWeek(days.map((d) => d.minutes / 60), rule, custom);
    const dayRows = rows.map((r, i) => ({
      week: wi + 1, day: DAYS[i], minutes: days[i].minutes, valid: days[i].valid, overnight: days[i].overnight,
      reg: r.reg, ot: r.ot, dt: r.dt,
      pay: r.reg * rate + r.ot * rate * otMult + r.dt * rate * dtMult,
    }));
    const sum = (k) => dayRows.reduce((a, x) => a + x[k], 0);
    return { week: wi + 1, rows: dayRows, minutes: sum('minutes'), reg: sum('reg'), ot: sum('ot'), dt: sum('dt'), pay: sum('pay') };
  });
  const tot = (k) => out.reduce((a, w) => a + w[k], 0);
  const minutes = tot('minutes');
  return {
    weeks: out.map((w) => ({ ...w, reg: r2(w.reg), ot: r2(w.ot), dt: r2(w.dt), pay: r2(w.pay), rows: w.rows.map((x) => ({ ...x, reg: r2(x.reg), ot: r2(x.ot), dt: r2(x.dt), pay: r2(x.pay) })) })),
    minutes, decimal: toDecimal(minutes), hm: toHM(minutes),
    reg: r2(tot('reg')), ot: r2(tot('ot')), dt: r2(tot('dt')),
    regPay: r2(tot('reg') * rate), otPay: r2(tot('ot') * rate * otMult), dtPay: r2(tot('dt') * rate * dtMult),
    gross: r2(tot('pay')), rate, otMult, dtMult,
  };
}

export function cardCSV(res, meta = {}) {
  const head = [];
  if (meta.name) head.push(`Employee,${String(meta.name).replace(/,/g, ' ')}`);
  if (meta.start) head.push(`Week starting,${meta.start}`);
  const lines = [['Week', 'Day', 'Start', 'End', 'Break (min)', 'Hours (h:mm)', 'Decimal hours', 'Regular', 'Overtime', 'Double time', 'Pay']];
  res.weeks.forEach((w, wi) => w.rows.forEach((r, i) => {
    const p = meta.punches?.[wi]?.[i] || {};
    lines.push([w.week, r.day, p.start || '', p.end || '', p.breakMin || '', toHM(r.minutes), toDecimal(r.minutes), r.reg, r.ot, r.dt, r.pay.toFixed(2)]);
  }));
  lines.push(['', 'Total', '', '', '', res.hm, res.decimal, res.reg, res.ot, res.dt, res.gross.toFixed(2)]);
  return [...head, ...lines.map((l) => l.join(','))].join('\n');
}
