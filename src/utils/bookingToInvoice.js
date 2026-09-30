/**
 * Maps a booking record (GET /admin/bookings/:id → data.booking) onto the
 * fields of the Generate Invoice form. Pure — no network, no React.
 *
 * Amounts: estimatedFare / finalFare are NET of any promo (the discount comes
 * off the total at booking time). The form computes
 *     taxable = baseFare + extras − discount
 * so baseFare is rebuilt as net + discount and extras is left at 0. The
 * taxable value therefore equals what the customer was actually charged.
 *
 * Deliberately NOT filled: placeOfSupply and supplierGstin. They decide
 * CGST/SGST vs IGST, which is a tax decision for the person issuing the
 * invoice, not something to guess from the trip's city.
 */

const GENERATED_EMAIL = /@(guest\.invalid|placeholder\.local)$/i;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** YYYY-MM-DD for <input type="date">, in India time (UTC would be a day behind after 18:30 UTC). */
function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

export function bookingToInvoiceForm(b) {
  if (!b || typeof b !== 'object') return null;

  const user = b.customer?.user || {};
  const corp = b.corporate || null;
  const fb = b.fareBasis || {};

  const isCorporate = Boolean(corp) || fb.billing?.billTo === 'CORPORATE';

  // A settled fare wins; otherwise the quoted one. (finalFare is empty until the trip ends.)
  const net = num(b.finalFare) > 0 ? num(b.finalFare) : num(b.estimatedFare);
  const discount = round2(num(fb.discount?.amount));
  const baseFare = round2(net + discount);

  // Guest checkouts keep the passenger's own details on the booking; the
  // linked user row is a throwaway account with a made-up email.
  const name = (isCorporate && corp?.companyName) || b.guestName || user.name || '';
  const phone = b.guestPhone || user.phone || '';
  const email = user.email && !GENERATED_EMAIL.test(user.email) ? user.email : '';

  const declaredType = fb.billing?.invoiceType;
  const type = declaredType === 'TAX' || declaredType === 'NON_TAX'
    ? declaredType
    : (isCorporate ? 'TAX' : 'NON_TAX');

  return {
    form: {
      type,
      billToName: name,
      billToPhone: phone,
      billToEmail: email,
      billToGstin: corp?.gstin || '',
      bookingNumber: b.bookingNumber || '',
      tripType: b.tripType || '',
      vehicleClass: b.vehicleClass || '',
      pickupAddress: b.pickupAddress || '',
      dropAddress: b.dropAddress || '',
      pickupAt: toDateInput(b.pickupAt),
      completedAt: toDateInput(b.completedAt || b.returnAt),
      baseFare: baseFare > 0 ? String(baseFare) : '',
      extras: '',
      discount: discount > 0 ? String(discount) : '',
    },
    meta: {
      bookingId: b.id,
      status: b.status,
      isCorporate,
      // Only a completed trip has a settled fare; before that it is the quote.
      fareIsFinal: b.status === 'COMPLETED' && num(b.finalFare) > 0,
    },
  };
}
