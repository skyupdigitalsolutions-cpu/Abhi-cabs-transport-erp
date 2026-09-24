/**
 * Client-side invoice PDF generator — Savaari-style layout branded as ABHI CABS.
 *
 * Two invoice types:
 *   TAX      → "TAX INVOICE" with GSTIN, CGST/SGST/IGST breakdown, SAC code,
 *              reverse charge note, HSN — full GST-compliant tax invoice.
 *   NON_TAX  → "INVOICE" (Bill of Supply) — no GST fields, no tax rows,
 *              no GSTIN, clean simple layout for non-GST trips.
 *
 * Usage:
 *   import { downloadInvoice } from '../utils/invoicePdf';
 *   downloadInvoice(invoiceObject);
 */

import { formatCurrency, formatDate } from './formatters';
// Inlined as a data: URI (not a /brand/… URL) because the invoice is written
// into a blank popup window — or saved as a standalone .html file when popups
// are blocked — and a relative path would not resolve in either case.
import abhiCabsLogoSvg from '../assets/brand/abhicabs-logo.svg?raw';

const LOGO_SRC = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(abhiCabsLogoSvg);
const LOGO_HTML = `<img class="logo-img" src="${LOGO_SRC}" alt="ABHI CABS" />`;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function money(v) {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return 'Rs. 0.00';
  return 'Rs. ' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

function isPositive(v) {
  return v && Number(v) > 0;
}

/* ------------------------------------------------------------------ *
 * Shared CSS — used by both invoice types
 * ------------------------------------------------------------------ */

const SHARED_CSS = `
  @page { size: A4; margin: 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #333;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
  }
  .page { max-width: 210mm; margin: 0 auto; padding: 20px 0; }

  /* Title bar */
  .title-bar {
    text-align: center;
    padding: 10px 0;
    border-top: 3px solid #333;
    border-bottom: 3px solid #333;
    margin-bottom: 16px;
  }
  .title-bar h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #111;
  }
  .title-bar .subtitle {
    font-size: 10px;
    color: #888;
    margin-top: 2px;
    font-weight: 500;
  }

  /* Company header */
  .company-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ddd;
  }
  .company-logo .logo-img {
    display: block;
    height: 64px;
    width: auto;
  }
  .company-logo h2 {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #111;
  }
  .company-logo .tagline {
    font-size: 10px;
    color: #888;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .company-address {
    text-align: right;
    font-size: 10.5px;
    color: #555;
    line-height: 1.6;
  }
  .company-address strong { color: #333; }

  /* Section headers */
  .section-header {
    background: #555;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 5px 10px;
  }

  /* Customer section */
  .customer-section {
    border: 1px solid #ccc;
    margin-bottom: 14px;
  }
  .customer-grid {
    display: flex;
  }
  .customer-left {
    flex: 1;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.7;
    border-right: 1px solid #ccc;
  }
  .customer-right {
    width: 220px;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.7;
  }
  .customer-left strong, .customer-right strong { color: #111; }

  /* Trip + Amount section */
  .trip-section {
    border: 1px solid #ccc;
    margin-bottom: 14px;
  }
  .trip-header {
    display: flex;
  }
  .trip-header-left {
    flex: 1;
    background: #555;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 5px 10px;
  }
  .trip-header-right {
    width: 220px;
    background: #555;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 5px 10px;
    text-align: right;
  }
  .trip-body {
    display: flex;
  }
  .trip-left {
    flex: 1;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.9;
    border-right: 1px solid #ccc;
  }
  .trip-right {
    width: 220px;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.9;
  }
  .trip-left .label {
    display: inline-block;
    width: 100px;
    font-weight: 600;
    color: #555;
  }
  .trip-right .amount-row {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
  }
  .trip-right .amount-row .lbl { color: #555; }
  .trip-right .amount-row .val { font-weight: 600; color: #111; text-align: right; }
  .trip-right .total-row {
    display: flex;
    justify-content: space-between;
    border-top: 2px solid #333;
    margin-top: 6px;
    padding-top: 6px;
    font-weight: 800;
    font-size: 12.5px;
    color: #111;
  }

  /* Extra charges */
  .extra-charges {
    padding: 6px 10px 0;
    font-size: 11px;
    color: #555;
    line-height: 1.6;
  }
  .extra-charges strong { color: #111; }

  /* Signature */
  .signature {
    text-align: right;
    padding: 20px 10px 10px;
    font-size: 11px;
    color: #555;
  }
  .signature .company-name {
    font-weight: 700;
    color: #111;
    font-size: 12px;
  }

  /* Terms */
  .terms {
    border-top: 2px solid #333;
    padding: 14px 0;
    margin-top: 14px;
  }
  .terms h3 {
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 8px;
    color: #111;
  }
  .terms p {
    font-size: 10px;
    color: #555;
    line-height: 1.65;
    margin-bottom: 4px;
  }

  /* Footer notices */
  .electronic-notice {
    margin-top: 14px;
    font-size: 10px;
    color: #555;
    line-height: 1.6;
  }
  .service-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 9.5px;
    color: #888;
  }

  @media print {
    body { padding: 0; }
    .page { padding: 0; }
    .no-print { display: none !important; }
  }

  .download-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #111;
    color: #fff;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 1000;
    font-size: 13px;
    font-weight: 500;
  }
  .download-bar button {
    background: #FFC107;
    color: #111;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .download-bar button:hover { background: #e6ac00; }
`;

/* ------------------------------------------------------------------ *
 * Extract common data from invoice
 * ------------------------------------------------------------------ */

function extractData(invoice) {
  const lines = invoice.lines || [];
  const booking = invoice.booking || {};
  const fareBasis = booking.fareBasis || {};

  const bookingNumber =
    booking.bookingNumber ||
    lines.find((l) => l.description?.includes('booking'))?.description?.match(/ABH-[\w-]+/)?.[0] || '';

  const tripType = booking.tripType ? booking.tripType.replace(/_/g, ' ') : '—';
  const vehicleClass = booking.vehicleClass || '—';
  const distanceKm = booking.distanceKm || fareBasis?.routing?.totalKm || '—';
  const pickupAddress = booking.pickupAddress || '—';
  const dropAddress = booking.dropAddress || '—';
  const pickupAt = booking.pickupAt;
  const completedAt = booking.completedAt || booking.updatedAt;

  const customerName = invoice.billToName || booking.customer?.user?.name || '—';
  const customerEmail = booking.customer?.user?.email || '—';
  const customerPhone = booking.customer?.user?.phone || '—';
  const customerState = invoice.placeOfSupply || 'Karnataka';

  const extraKm = fareBasis?.extra?.extraKm || 0;
  const extraKmRate = fareBasis?.extra?.perKmRate || fareBasis?.components?.perKm || 0;
  const extraKmCharge = extraKm * Number(extraKmRate);
  const baseFare = Number(invoice.taxableValue || invoice.subtotal || 0);

  return {
    lines, booking, fareBasis, bookingNumber, tripType, vehicleClass,
    distanceKm, pickupAddress, dropAddress, pickupAt, completedAt,
    customerName, customerEmail, customerPhone, customerState,
    extraKm, extraKmRate, extraKmCharge, baseFare,
  };
}

/* ------------------------------------------------------------------ *
 * TAX INVOICE — GST-compliant with CGST/SGST/IGST, GSTIN, SAC
 * ------------------------------------------------------------------ */

function buildTaxInvoiceHTML(invoice) {
  const d = extractData(invoice);

  const hasCgst = isPositive(invoice.cgst);
  const hasSgst = isPositive(invoice.sgst);
  const hasIgst = isPositive(invoice.igst);
  const gstRate = invoice.gstRatePct || 5;
  const halfRate = (gstRate / 2).toFixed(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${invoice.invoiceNumber || 'Invoice'} — ABHI CABS</title>
<style>${SHARED_CSS}</style>
</head>
<body>

<div class="download-bar no-print">
  <span>Tax Invoice — ${invoice.invoiceNumber || ''}</span>
  <button onclick="window.print()">Save as PDF / Print</button>
</div>

<div class="page" style="margin-top: 50px;">

  <!-- Title -->
  <div class="title-bar">
    <h1>Tax Invoice</h1>
  </div>

  <!-- Company Header -->
  <div class="company-header">
    <div class="company-logo">
      ${LOGO_HTML}
    </div>
    <div class="company-address">
      Bengaluru, Karnataka, India<br/>
      GSTIN #: <strong>${invoice.supplierGstin || '—'}</strong>
    </div>
  </div>

  <!-- Customer Details -->
  <div class="customer-section">
    <div class="section-header">Customer Details</div>
    <div class="customer-grid">
      <div class="customer-left">
        Name : <strong>${d.customerName}</strong><br/>
        Email : <strong>${d.customerEmail}</strong><br/>
        Phone : <strong>${d.customerPhone}</strong><br/>
        State : <strong>${d.customerState}</strong>
        ${invoice.billToGstin ? `<br/>GSTIN : <strong>${invoice.billToGstin}</strong>` : ''}
      </div>
      <div class="customer-right">
        Invoice# : <strong>${invoice.invoiceNumber || '—'}</strong><br/>
        Billed on : <strong>${fmtDate(invoice.issuedAt)}</strong><br/>
        Booking ID : <strong>${d.bookingNumber || '—'}</strong><br/>
        Place of Supply : <strong>${d.customerState}</strong>
      </div>
    </div>
  </div>

  <!-- Trip Details + Amount -->
  <div class="trip-section">
    <div class="trip-header">
      <div class="trip-header-left">Trip Details</div>
      <div class="trip-header-right">Amount</div>
    </div>
    <div class="trip-body">
      <div class="trip-left">
        <span class="label">Trip Type</span>: ${d.tripType}${d.distanceKm !== '—' ? ` (${d.distanceKm}km)` : ''}<br/>
        <span class="label">Vehicle</span>: ${d.vehicleClass}<br/>
        <span class="label">Pick Up</span>: ${d.pickupAddress}<br/>
        <span class="label">Drop</span>: ${d.dropAddress}<br/>
        <span class="label">Start Date</span>: ${fmtDate(d.pickupAt)}<br/>
        ${d.completedAt ? `<span class="label">End Date</span>: ${fmtDate(d.completedAt)}<br/>` : ''}

        ${d.extraKm > 0 ? `
        <br/>
        <div class="extra-charges">
          <strong>Charges For Additional Usage</strong><br/>
          Extra Km (${d.extraKm} × Rs.${Number(d.extraKmRate).toFixed(2)}) : <strong>Rs. ${d.extraKmCharge.toFixed(2)}</strong>
        </div>
        ` : ''}
      </div>
      <div class="trip-right">
        <div class="amount-row">
          <span class="lbl">Base Fare</span>
          <span class="val">${money(d.baseFare)}</span>
        </div>
        ${d.extraKm > 0 ? `
        <div class="amount-row">
          <span class="lbl">Extras</span>
          <span class="val">${money(d.extraKmCharge)}</span>
        </div>
        ` : ''}
        ${isPositive(invoice.discount) ? `
        <div class="amount-row">
          <span class="lbl">Discount</span>
          <span class="val">- ${money(invoice.discount)}</span>
        </div>
        ` : ''}
        <div class="amount-row" style="border-top: 1px solid #ddd; margin-top: 4px; padding-top: 4px;">
          <span class="lbl">Taxable Value</span>
          <span class="val">${money(invoice.taxableValue || d.baseFare)}</span>
        </div>
        ${hasCgst ? `
        <div class="amount-row">
          <span class="lbl">CGST (${halfRate}%)</span>
          <span class="val">${money(invoice.cgst)}</span>
        </div>
        ` : ''}
        ${hasSgst ? `
        <div class="amount-row">
          <span class="lbl">SGST (${halfRate}%)</span>
          <span class="val">${money(invoice.sgst)}</span>
        </div>
        ` : ''}
        ${hasIgst ? `
        <div class="amount-row">
          <span class="lbl">IGST (${gstRate}%)</span>
          <span class="val">${money(invoice.igst)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span>Total Amount Paid</span>
          <span>${money(invoice.totalAmount)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Reverse Charge -->
  <div style="padding: 6px 10px; font-size: 10px; color: #888;">
    Reverse Charge Applicable: <strong>No</strong>
  </div>

  <!-- Signature -->
  <div class="signature">
    For <span class="company-name">Abhi Cabs</span>
  </div>

  <!-- Terms -->
  <div class="terms">
    <h3>Terms &amp; Conditions</h3>
    <p># All road toll fees, Airport entry charges, parking charges, state taxes etc. are charged extra and need to be
    paid to the concerned authorities as per actuals. Please collect the receipts for these directly from
    the authorities or the driver wherever applicable. These will not be included in the Abhi Cabs bill and Abhi Cabs is not
    responsible for these receipts if not taken during trip. Please note any handling charge levied will not be part of
    the receipt that you will get.</p>
    <p>At the end of the trip, please check and take all your belongings with you.</p>
    <p>Any discrepancies regarding bill amount will be considered within 24 hrs of Invoice.</p>
  </div>

  <div class="electronic-notice">
    <p>This is an electronically generated invoice and does not require signature. All disputes are subject to
    jurisdiction of courts in Bangalore. For any queries, please write to us at <strong>support@abhicabs.in</strong></p>
  </div>

  <div class="service-footer">
    <p>Service: Transport of passengers</p>
    <p>Service Accounting Code (SAC): 996412${invoice.hsnSac ? `; HSN: ${invoice.hsnSac}` : ''}</p>
  </div>

</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * NON-TAX INVOICE (Bill of Supply) — No GST, no GSTIN, simple
 * ------------------------------------------------------------------ */

function buildNonTaxInvoiceHTML(invoice) {
  const d = extractData(invoice);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${invoice.invoiceNumber || 'Invoice'} — ABHI CABS</title>
<style>${SHARED_CSS}</style>
</head>
<body>

<div class="download-bar no-print">
  <span>Invoice — ${invoice.invoiceNumber || ''}</span>
  <button onclick="window.print()">Save as PDF / Print</button>
</div>

<div class="page" style="margin-top: 50px;">

  <!-- Title -->
  <div class="title-bar">
    <h1>Invoice</h1>
    <div class="subtitle">Bill of Supply</div>
  </div>

  <!-- Company Header (no GSTIN for non-tax) -->
  <div class="company-header">
    <div class="company-logo">
      ${LOGO_HTML}
    </div>
    <div class="company-address">
      Bengaluru, Karnataka, India
    </div>
  </div>

  <!-- Customer Details (no GSTIN fields) -->
  <div class="customer-section">
    <div class="section-header">Customer Details</div>
    <div class="customer-grid">
      <div class="customer-left">
        Name : <strong>${d.customerName}</strong><br/>
        Email : <strong>${d.customerEmail}</strong><br/>
        Phone : <strong>${d.customerPhone}</strong><br/>
        State : <strong>${d.customerState}</strong>
      </div>
      <div class="customer-right">
        Invoice# : <strong>${invoice.invoiceNumber || '—'}</strong><br/>
        Billed on : <strong>${fmtDate(invoice.issuedAt)}</strong><br/>
        Booking ID : <strong>${d.bookingNumber || '—'}</strong>
      </div>
    </div>
  </div>

  <!-- Trip Details + Amount (no tax rows) -->
  <div class="trip-section">
    <div class="trip-header">
      <div class="trip-header-left">Trip Details</div>
      <div class="trip-header-right">Amount</div>
    </div>
    <div class="trip-body">
      <div class="trip-left">
        <span class="label">Trip Type</span>: ${d.tripType}${d.distanceKm !== '—' ? ` (${d.distanceKm}km)` : ''}<br/>
        <span class="label">Vehicle</span>: ${d.vehicleClass}<br/>
        <span class="label">Pick Up</span>: ${d.pickupAddress}<br/>
        <span class="label">Drop</span>: ${d.dropAddress}<br/>
        <span class="label">Start Date</span>: ${fmtDate(d.pickupAt)}<br/>
        ${d.completedAt ? `<span class="label">End Date</span>: ${fmtDate(d.completedAt)}<br/>` : ''}

        ${d.extraKm > 0 ? `
        <br/>
        <div class="extra-charges">
          <strong>Charges For Additional Usage</strong><br/>
          Extra Km (${d.extraKm} × Rs.${Number(d.extraKmRate).toFixed(2)}) : <strong>Rs. ${d.extraKmCharge.toFixed(2)}</strong>
        </div>
        ` : ''}
      </div>
      <div class="trip-right">
        <div class="amount-row">
          <span class="lbl">Trip Fare</span>
          <span class="val">${money(d.baseFare)}</span>
        </div>
        ${d.extraKm > 0 ? `
        <div class="amount-row">
          <span class="lbl">Extra Km Charges</span>
          <span class="val">${money(d.extraKmCharge)}</span>
        </div>
        ` : ''}
        ${isPositive(invoice.discount) ? `
        <div class="amount-row">
          <span class="lbl">Discount</span>
          <span class="val">- ${money(invoice.discount)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span>Total Amount</span>
          <span>${money(invoice.totalAmount)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Signature -->
  <div class="signature">
    For <span class="company-name">Abhi Cabs</span>
  </div>

  <!-- Terms -->
  <div class="terms">
    <h3>Terms &amp; Conditions</h3>
    <p># All road toll fees, Airport entry charges, parking charges, state taxes etc. are charged extra and need to be
    paid to the concerned authorities as per actuals. Please collect the receipts for these directly from
    the authorities or the driver wherever applicable.</p>
    <p>At the end of the trip, please check and take all your belongings with you.</p>
    <p>Any discrepancies regarding bill amount will be considered within 24 hrs of Invoice.</p>
  </div>

  <div class="electronic-notice">
    <p>This is an electronically generated invoice and does not require signature. All disputes are subject to
    jurisdiction of courts in Bangalore. For any queries, please write to us at <strong>support@abhicabs.in</strong></p>
  </div>

  <div class="service-footer">
    <p>Service: Transport of passengers</p>
  </div>

</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Router — picks the right template based on invoice.type
 * ------------------------------------------------------------------ */

function buildInvoiceHTML(invoice) {
  if (invoice.type === 'TAX') {
    return buildTaxInvoiceHTML(invoice);
  }
  return buildNonTaxInvoiceHTML(invoice);
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export function downloadInvoice(invoice) {
  if (!invoice) return;

  const html = buildInvoiceHTML(invoice);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber || 'invoice'}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return;
  }

  win.document.write(html);
  win.document.close();
}
