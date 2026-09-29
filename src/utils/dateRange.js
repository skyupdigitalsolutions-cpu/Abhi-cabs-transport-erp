// Date-range helpers for every admin filter (Bookings, Trips, Payments, Reports,
// Customers, Drivers). One place, so a "From" date and a "To" date are converted
// the same way everywhere.
//
// The rule: a calendar date picked in a filter means that day in the ADMIN'S OWN
// timezone, from 00:00:00.000 to 23:59:59.999. The API takes exact instants (ISO
// strings), so we send those two boundaries.
//
// What went wrong before: "From" was built with `new Date('2026-09-01')`, which
// JavaScript reads as midnight UTC. In India that is 05:30 the same morning, so
// anything from 00:00 to 05:29 on the From date was silently left out (early
// airport pickups, for one). "To" used `T23:59:59` with no zone, which is LOCAL
// time, so the two ends did not even agree with each other.

const pad = (n) => String(n).padStart(2, '0');
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' -> Date at LOCAL midnight (never UTC). null if not a real date. */
function parseLocalDate(dateStr) {
  const m = DATE_ONLY.exec(String(dateStr || ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 0, 0, 0, 0);
  // Reject 2026-02-31 style overflow: JS would roll it into March.
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

/** Date | ISO string | 'YYYY-MM-DD'  ->  the LOCAL calendar date as 'YYYY-MM-DD' ('' if invalid). */
export function toDateInputValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && DATE_ONLY.test(value)) return parseLocalDate(value) ? value : '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' -> ISO instant of that day's first millisecond (local). '' if empty/invalid. */
export function startOfDayISO(dateStr) {
  const d = parseLocalDate(dateStr);
  return d ? d.toISOString() : '';
}

/** 'YYYY-MM-DD' -> ISO instant of that day's last millisecond (local). '' if empty/invalid. */
export function endOfDayISO(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Local start of day, `daysAgo` calendar days back (0 = today). */
export function startOfDaysAgo(daysAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/**
 * Two picked dates -> { from, to } ISO instants covering both days completely, or
 * null when either is missing/invalid. If they are the wrong way round they are
 * swapped: "5 Sep to 1 Sep" can only mean 1 Sep to 5 Sep.
 */
export function customRange(fromStr, toStr) {
  let a = toDateInputValue(fromStr);
  let b = toDateInputValue(toStr);
  if (!a || !b) return null;
  if (a > b) [a, b] = [b, a];
  return { from: startOfDayISO(a), to: endOfDayISO(b) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-09-01','2026-09-05' -> '1 Sep – 5 Sep 2026' (year shown once when it is the same). */
export function formatRangeLabel(fromStr, toStr) {
  const a = parseLocalDate(toDateInputValue(fromStr));
  const b = parseLocalDate(toDateInputValue(toStr));
  if (!a || !b) return '';
  const part = (d, withYear) => `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
  if (a.getTime() === b.getTime()) return part(a, true);
  return a.getFullYear() === b.getFullYear()
    ? `${part(a, false)} \u2013 ${part(b, true)}`
    : `${part(a, true)} \u2013 ${part(b, true)}`;
}

/** Local Date at the start / end of a picked 'YYYY-MM-DD' (for filtering rows already in memory). */
export function startOfDayDate(dateStr) { return parseLocalDate(dateStr); }
export function endOfDayDate(dateStr) {
  const d = parseLocalDate(dateStr);
  if (d) d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Everything a From/To date pair in a list page needs, in one call:
 *
 *   const dates = dateFilterProps(list);
 *   <Input type="date" value={dates.fromValue} max={dates.toValue || undefined}
 *          onChange={(e) => dates.onFromChange(e.target.value)} />
 *   <Input type="date" value={dates.toValue} min={dates.fromValue || undefined}
 *          onChange={(e) => dates.onToChange(e.target.value)} />
 *
 * `list` is a useResourceList result. The filters hold ISO instants (what the
 * API takes) but a date box can only show 'YYYY-MM-DD', so the box values are
 * derived from them: handing the ISO string straight to the box, as the pages
 * used to, made the browser discard it and the picked date vanished.
 *
 * Choosing a From after the current To (or a To before the current From) moves
 * the other end to the same day instead of leaving an empty range that returns
 * nothing.
 */
export function dateFilterProps(list) {
  const from = list.filters.from || '';
  const to = list.filters.to || '';
  return {
    fromValue: toDateInputValue(from),
    toValue: toDateInputValue(to),
    onFromChange(dateStr) {
      const start = startOfDayISO(dateStr);
      list.setFilter('from', start);
      if (start && to && start > to) list.setFilter('to', endOfDayISO(dateStr));
    },
    onToChange(dateStr) {
      const end = endOfDayISO(dateStr);
      list.setFilter('to', end);
      if (end && from && end < from) list.setFilter('from', startOfDayISO(dateStr));
    },
  };
}
