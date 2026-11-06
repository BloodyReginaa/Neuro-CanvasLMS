// Times in the user's own time zone. Canvas sends UTC ("2026-11-07T04:59:59Z"); a student thinks
// in local days, and the deadline above is Friday 23:59 in New York. These helpers use only Intl,
// which knows every IANA zone, so nothing has to be bundled.
const formatters = new Map();
function formatter(zone, kind) {
  if (typeof zone !== 'string' || zone.length > 64) return null;
  const key = kind + zone;
  if (!formatters.has(key)) {
    if (formatters.size > 32) formatters.clear();
    let f = null;
    try {
      f = new Intl.DateTimeFormat(
        'en-US',
        kind === 'show'
          ? {
              timeZone: zone,
              weekday: 'short',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
              timeZoneName: 'short',
            }
          : {
              timeZone: zone,
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hourCycle: 'h23',
            },
      );
    } catch {}
    formatters.set(key, f);
  }
  return formatters.get(key);
}
const partsOf = (f, d) => {
  const p = {};
  for (const { type, value } of f.formatToParts(d)) p[type] = value;
  return p;
};
export const isTimeZone = zone => formatter(zone, 'show') !== null;

// "2026-11-07T04:59:59Z" in America/New_York → "Fri 2026-11-06 23:59 EST": the local date with
// its weekday, so the AI never converts and never gets the day wrong.
export function localTime(value, zone) {
  const f = formatter(zone, 'show');
  const d = value instanceof Date ? value : new Date(value);
  if (!f || Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  const p = partsOf(f, d);
  return `${p.weekday} ${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
}

// Local wall-clock time minus UTC at instant t, in milliseconds.
function offset(t, zone) {
  const p = partsOf(formatter(zone, 'parts'), new Date(t));
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000
  );
}
const validDay = day =>
  /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') && !Number.isNaN(Date.parse(day + 'T00:00:00Z'));
// The instant a local day starts (midnight in that zone), as epoch milliseconds.
export function dayStart(day, zone) {
  const guess = Date.parse(day + 'T00:00:00Z');
  const first = offset(guess, zone);
  const t = guess - first;
  const second = offset(t, zone);
  return second === first ? t : guess - second;
}
const nextDay = day =>
  new Date(Date.parse(day + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
const iso = t => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');

// A day range the way people mean it: both days included, in the user's time zone. The planner
// reads an end date as the START of that day, so "today to today" was an empty range and
// "Friday" missed Friday's 23:59 deadline. With the zone known this is exact; without it the end
// moves one day on (Canvas reads plain dates in the user's own zone).
export function dayRange(start, end, zone) {
  const out = {};
  const exact = isTimeZone(zone);
  if (validDay(start)) out.start_date = exact ? iso(dayStart(start, zone)) : start;
  else if (start !== undefined) out.start_date = start;
  if (validDay(end)) out.end_date = exact ? iso(dayStart(nextDay(end), zone) - 1000) : nextDay(end);
  else if (end !== undefined) out.end_date = end;
  return out;
}

// The user's Canvas time zone, cached per user. read() fetches it (from the Canvas profile); a
// zone is kept for `ttl` milliseconds, since users rarely change it. A failed read is not kept, so
// the next call tries again (e.g. after the user reconnects with a new token). A value that is not
// a known IANA zone counts as "no zone": results then keep Canvas's UTC times.
export function timeZoneCache({ ttl = 6 * 3600 * 1000, now = Date.now } = {}) {
  let cached = null;
  return async (user, read) => {
    if (cached && cached.user === user && now() - cached.at < ttl) return cached.zone;
    let zone;
    try {
      zone = await read();
    } catch {
      return null;
    }
    zone = isTimeZone(zone) ? zone : null;
    cached = { user, zone, at: now() };
    return zone;
  };
}
