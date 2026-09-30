// Booking attempts as the admin sees them.
//
// An "attempt" is a customer who started booking -- picked a trip, saw fares,
// began typing their details -- whether or not they finished. The website saves
// a draft as they go; the backend keeps it on one row per visitor, with what they
// typed on `payload.contact`.
//
// A guest's account is a throwaway named "Guest" with no phone, so for them the
// details typed into the form are the ONLY record of who they are. This module
// is the one place that decides which name/phone to show and what state an
// attempt is in, so the Dashboard and the Reports tab agree.

const STALE_MINUTES = 30; // matches the backend's abandon window (FUNNEL_ABANDON_MINUTES)

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const isPlaceholderName = (n) => !n || /^guest\b/i.test(n);

/** Who this is: what they typed if they typed it, else their account. */
export function attemptContact(a) {
  const c = a?.payload?.contact || {};
  const user = a?.customer?.user || {};
  const accountName = isPlaceholderName(clean(user.name)) ? '' : clean(user.name);
  return {
    name: clean(c.name) || accountName,
    phone: clean(c.phone) || clean(user.phone),
    email: clean(c.email),
    address: clean(c.address),
    landmark: clean(c.landmark),
    notes: clean(c.notes),
    customerType: clean(c.customerType),
    companyName: clean(c.companyName),
    gstNumber: clean(c.gstNumber),
  };
}

/**
 * PENDING / ABANDONED / FAILED / COMPLETED.
 *
 * The backend turns a stale draft into ABANDONED with a background job. If that
 * job is not running, a draft nobody has touched for 30 minutes would sit at
 * "In progress" for ever, so a PENDING draft that has gone quiet is shown as
 * Abandoned here. `inferred` says which case it is.
 */
export function attemptState(a, now = Date.now()) {
  const outcome = a?.outcome || 'PENDING';
  if (outcome !== 'PENDING') return { outcome, inferred: false };
  const last = Date.parse(a?.payload?.lastSeenAt || a?.createdAt || '');
  if (Number.isFinite(last) && now - last > STALE_MINUTES * 60 * 1000) {
    return { outcome: 'ABANDONED', inferred: true };
  }
  return { outcome: 'PENDING', inferred: false };
}

export const ATTEMPT_LABEL = { PENDING: 'In progress', ABANDONED: 'Abandoned', FAILED: 'Failed', COMPLETED: 'Completed' };
export const ATTEMPT_TONE = { PENDING: 'blue', ABANDONED: 'amber', FAILED: 'red', COMPLETED: 'green' };

const STAGE_LABEL = {
  STARTED: 'Started', PICKUP_SET: 'Pickup chosen', DROP_SET: 'Drop chosen',
  FARES_VIEWED: 'Viewed fares', PAYMENT_CHOSEN: 'Reached payment',
};
export const stageLabel = (a) => STAGE_LABEL[a?.payload?.stage] || (a?.estimatedFare != null ? 'Viewed fares' : 'Started');

/**
 * Everything known about an attempt, grouped for display. Blank values are left
 * out, so the panel shows exactly what the customer entered and nothing else.
 * `format` supplies the date / money formatters (kept out of here so this file
 * stays plain data logic).
 */
export function attemptSections(a, format = {}) {
  const c = attemptContact(a);
  const p = a?.payload || {};
  const fmtDT = format.dateTime || ((v) => v);
  const fmtMoney = format.money || ((v) => v);
  const stops = Array.isArray(p.stops) ? p.stops.length : 0;

  const rows = (list) => list.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  return [
    {
      title: 'Customer',
      rows: rows([
        ['Name', c.name],
        ['Mobile', c.phone],
        ['Email', c.email],
        ['Address', c.address],
        ['Landmark', c.landmark],
        ['Notes', c.notes],
        ['Customer type', c.customerType && (c.customerType === 'corporate' ? 'Corporate' : 'Individual')],
        ['Company', c.companyName],
        ['GST number', c.gstNumber],
      ]),
    },
    {
      title: 'Trip',
      rows: rows([
        ['Trip type', a?.tripType && String(a.tripType).replace(/_/g, ' ')],
        ['Pickup', a?.pickupAddress],
        ['Drop', a?.dropAddress],
        ['Extra stops', stops ? `${stops} stop${stops > 1 ? 's' : ''}` : ''],
        ['Pickup time', a?.pickupAt && fmtDT(a.pickupAt)],
        ['Rental package', p.rentalPackage],
      ]),
    },
    {
      title: 'Quote',
      rows: rows([
        ['Vehicle', p.vehicleName || a?.vehicleClass],
        ['Estimated fare', a?.estimatedFare != null && fmtMoney(Number(a.estimatedFare))],
        ['Reached', stageLabel(a)],
        ['Started', a?.createdAt && fmtDT(a.createdAt)],
        ['Last active', p.lastSeenAt && fmtDT(p.lastSeenAt)],
        ['Reason', a?.failureReason],
        ['Booking', a?.booking?.bookingNumber],
      ]),
    },
  ].filter((s) => s.rows.length > 0);
}

// ---------------------------------------------------------------------------
// Abandoned-checkout messages
//
// The backend's booking-attempt record has no place for a customer's name,
// phone, email or address. So when someone fills in the checkout form and leaves,
// the website posts everything they typed as ONE support message with the topic
// below. This reads those messages back out so staff see them as records, not as
// a block of text.
// ---------------------------------------------------------------------------

/** Topic the website gives an abandoned checkout's support message. */
export const ABANDONED_TOPIC = 'Abandoned Booking';
export const isAbandonedCheckout = (contact) => contact?.topic === ABANDONED_TOPIC;

// The labels the website writes, and the group each belongs to.
const CHECKOUT_GROUPS = [
  ['Customer', ['Name', 'Mobile', 'Email', 'Address', 'Landmark', 'Customer type', 'Company', 'GST', 'Notes']],
  ['Trip', ['Trip type', 'Pickup', 'Drop', 'Stops', 'Package', 'Date / time', 'Return']],
  ['Quote', ['Vehicle', 'Vehicle class', 'Estimated total', 'Promo']],
];
const LABEL_SET = new Set(CHECKOUT_GROUPS.flatMap(([, labels]) => labels));

/**
 * "Name: Ravi\nMobile: 98765..." -> grouped rows plus a short summary.
 * Lines that are not "Label: value" continue the previous value (a note can wrap
 * onto several lines); the section headings the website prints are skipped.
 */
export function parseAbandonedCheckout(message) {
  const values = {};
  let last = null;
  for (const raw of String(message || '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const m = /^([A-Za-z][A-Za-z /]*?):\s?(.*)$/.exec(line);
    if (m && LABEL_SET.has(m[1])) {
      last = m[1];
      values[last] = m[2].trim();
    } else if (/^[^A-Za-z0-9]*[A-Z]{3,}[^A-Za-z0-9]*$/.test(line.trim())) {
      last = null; // a heading such as "CONTACT", "TRIP", "QUOTE"
    } else if (last && line.trim()) {
      values[last] = `${values[last]}\n${line.trim()}`;
    }
  }
  if (/^\(?not given\)?$/i.test(values.Email || '')) delete values.Email;
  if (values['Customer type']) {
    values['Customer type'] = values['Customer type'] === 'corporate' ? 'Corporate' : 'Individual';
  }
  const sections = CHECKOUT_GROUPS
    .map(([title, labels]) => ({ title, rows: labels.filter((l) => values[l]).map((l) => [l, values[l]]) }))
    .filter((s) => s.rows.length > 0);
  return {
    sections,
    summary: {
      pickup: values.Pickup || '',
      drop: values.Drop || '',
      tripType: values['Trip type'] || '',
      vehicle: values.Vehicle || '',
      total: values['Estimated total'] || '',
    },
    parsed: sections.length > 0,
  };
}

export const CONTACT_STATUS_LABEL = { NEW: 'New', READ: 'Read', RESPONDED: 'Responded', ARCHIVED: 'Archived' };
export const CONTACT_STATUS_TONE = { NEW: 'blue', READ: 'slate', RESPONDED: 'green', ARCHIVED: 'slate' };

/**
 * How to name the person behind an attempt.
 * A guest's account is a throwaway ("Guest", no phone) and the backend stores no
 * contact details on the attempt, so for a guest the honest label is "Guest
 * visitor" -- their details, if they left any, are under "Left details at checkout".
 */
export function attemptWho(a) {
  const c = attemptContact(a);
  const user = a?.customer?.user;
  const isGuest = !user || isPlaceholderName(clean(user.name));
  return {
    name: c.name || (isGuest ? 'Guest visitor' : 'Unknown'),
    phone: c.phone,
    email: c.email,
    isGuest,
    hasContact: Boolean(c.name || c.phone || c.email),
  };
}
