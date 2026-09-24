/**
 * Client-side invoice PDF generator.
 *
 * Renders a GST-compliant invoice as a styled HTML document in a new window
 * and triggers the browser's native print dialog — the user can save as PDF
 * or print directly. No backend PDF library needed.
 *
 * Usage:
 *   import { downloadInvoice } from '../utils/invoicePdf';
 *   downloadInvoice(invoiceObject);
 */

import { formatCurrency, formatDate } from './formatters';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Format a Decimal-string or number to 2dp with commas (₹1,23,456.78). */
function money(v) {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function isPositive(v) {
  return v && Number(v) > 0;
}

/* ------------------------------------------------------------------ *
 * HTML template
 * ------------------------------------------------------------------ */

function buildInvoiceHTML(invoice) {
  const isTax = invoice.type === 'TAX';
  const title = isTax ? 'Tax Invoice' : 'Bill of Supply';
  const lines = invoice.lines || [];

  // Booking number from lines or from the invoice.booking relation
  const bookingNumber =
    invoice.booking?.bookingNumber ||
    lines.find((l) => l.description?.includes('booking'))?.description?.match(/ABH-[\w-]+/)?.[0] ||
    '';

  // Tax breakdown rows (only for TAX invoices with non-zero tax)
  const hasCgst = isPositive(invoice.cgst);
  const hasSgst = isPositive(invoice.sgst);
  const hasIgst = isPositive(invoice.igst);
  const hasTax = hasCgst || hasSgst || hasIgst;

  const lineRows = lines
    .map(
      (l, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${l.description || '—'}</td>
        <td style="text-align:center">${l.quantity ?? 1}</td>
        <td style="text-align:right">${money(l.unitPrice)}</td>
        <td style="text-align:right">${money(l.amount)}</td>
      </tr>`
    )
    .join('');

  // Pad empty rows so the table has some visual weight
  const emptyRows =
    lines.length < 3
      ? Array(3 - lines.length)
          .fill(
            `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`
          )
          .join('')
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${invoice.invoiceNumber || 'Invoice'} — ABHI CABS</title>
<style>
  @page {
    size: A4;
    margin: 12mm 14mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .invoice-page {
    max-width: 210mm;
    margin: 0 auto;
    padding: 24px 0;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 2px solid #111;
    margin-bottom: 16px;
  }
  .brand h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #111;
    margin-bottom: 2px;
  }
  .brand p {
    font-size: 10px;
    color: #666;
  }
  .invoice-title {
    text-align: right;
  }
  .invoice-title h2 {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    color: #111;
    margin-bottom: 4px;
  }
  .invoice-title .inv-number {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  }

  /* Meta grid */
  .meta-grid {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 20px;
  }
  .meta-block {
    flex: 1;
  }
  .meta-block h3 {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #888;
    margin-bottom: 6px;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 4px;
  }
  .meta-block p {
    font-size: 11px;
    margin-bottom: 2px;
  }
  .meta-block .name {
    font-weight: 700;
    font-size: 12px;
    color: #111;
  }

  /* Line items table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  thead th {
    background: #111;
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 10px;
    text-align: left;
  }
  thead th:first-child { border-radius: 4px 0 0 0; }
  thead th:last-child  { border-radius: 0 4px 0 0; }
  tbody td {
    padding: 7px 10px;
    border-bottom: 1px solid #eee;
    font-size: 11px;
  }
  tbody tr:last-child td {
    border-bottom: 2px solid #ddd;
  }

  /* Totals */
  .totals-section {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 20px;
  }
  .totals-table {
    width: 280px;
  }
  .totals-table .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 11px;
  }
  .totals-table .row.sub {
    color: #666;
    font-size: 10px;
    padding-left: 12px;
  }
  .totals-table .row.total {
    border-top: 2px solid #111;
    margin-top: 4px;
    padding-top: 8px;
    font-size: 14px;
    font-weight: 800;
    color: #111;
  }

  /* HSN / SAC */
  .hsn-row {
    display: flex;
    gap: 24px;
    font-size: 10px;
    color: #666;
    margin-bottom: 20px;
  }
  .hsn-row span { font-weight: 600; color: #444; }

  /* Footer */
  .footer {
    border-top: 1px solid #e5e5e5;
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer .note {
    font-size: 10px;
    color: #888;
    max-width: 50%;
  }
  .footer .auth {
    text-align: right;
  }
  .footer .auth .sig-line {
    width: 160px;
    border-bottom: 1px solid #999;
    margin-bottom: 4px;
    margin-left: auto;
    height: 40px;
  }
  .footer .auth p {
    font-size: 10px;
    color: #666;
  }

  /* Print tweaks */
  @media print {
    body { padding: 0; }
    .invoice-page { padding: 0; }
    .no-print { display: none !important; }
  }

  /* Download bar (shown in the popup window) */
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
    background: #fff;
    color: #111;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .download-bar button:hover { background: #e5e5e5; }
</style>
</head>
<body>

<div class="download-bar no-print">
  <span>Invoice ${invoice.invoiceNumber || ''}</span>
  <button onclick="window.print()">Save as PDF / Print</button>
</div>

<div class="invoice-page" style="margin-top: 50px;">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <h1>ABHI CABS</h1>
      <p>Transport &amp; Cab Services</p>
    </div>
    <div class="invoice-title">
      <h2>${title}</h2>
      <div class="inv-number">${invoice.invoiceNumber || '—'}</div>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta-grid">
    <div class="meta-block">
      <h3>Billed To</h3>
      <p class="name">${invoice.billToName || '—'}</p>
      ${invoice.billToAddress ? `<p>${invoice.billToAddress}</p>` : ''}
      ${invoice.billToGstin ? `<p>GSTIN: <strong>${invoice.billToGstin}</strong></p>` : ''}
    </div>
    <div class="meta-block">
      <h3>Invoice Details</h3>
      <p>Date: <strong>${fmtDate(invoice.issuedAt)}</strong></p>
      ${invoice.dueAt ? `<p>Due: <strong>${fmtDate(invoice.dueAt)}</strong></p>` : ''}
      ${bookingNumber ? `<p>Booking: <strong>${bookingNumber}</strong></p>` : ''}
      <p>Status: <strong>${invoice.status || 'ISSUED'}</strong></p>
    </div>
    <div class="meta-block">
      <h3>Place of Supply</h3>
      <p>${invoice.placeOfSupply || '—'}</p>
      ${isTax ? `<p style="margin-top:4px">Reverse charge: <strong>No</strong></p>` : ''}
    </div>
  </div>

  <!-- Line items -->
  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center">#</th>
        <th>Description</th>
        <th style="width:60px;text-align:center">Qty</th>
        <th style="width:100px;text-align:right">Unit Price</th>
        <th style="width:100px;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
      ${emptyRows}
    </tbody>
  </table>

  <!-- HSN/SAC -->
  ${invoice.hsnSac ? `
  <div class="hsn-row">
    <div>SAC Code: <span>${invoice.hsnSac}</span></div>
    ${isTax ? `<div>GST Rate: <span>${invoice.gstRatePct ?? 5}%</span></div>` : ''}
  </div>
  ` : ''}

  <!-- Totals -->
  <div class="totals-section">
    <div class="totals-table">
      <div class="row">
        <span>Subtotal</span>
        <span>${money(invoice.subtotal || invoice.taxableValue)}</span>
      </div>
      ${isPositive(invoice.discount) ? `
      <div class="row">
        <span>Discount</span>
        <span>−${money(invoice.discount)}</span>
      </div>
      ` : ''}
      <div class="row">
        <span>Taxable Value</span>
        <span>${money(invoice.taxableValue)}</span>
      </div>
      ${hasTax && hasCgst ? `
      <div class="row sub">
        <span>CGST</span>
        <span>${money(invoice.cgst)}</span>
      </div>
      ` : ''}
      ${hasTax && hasSgst ? `
      <div class="row sub">
        <span>SGST</span>
        <span>${money(invoice.sgst)}</span>
      </div>
      ` : ''}
      ${hasTax && hasIgst ? `
      <div class="row sub">
        <span>IGST</span>
        <span>${money(invoice.igst)}</span>
      </div>
      ` : ''}
      <div class="row total">
        <span>Total</span>
        <span>${money(invoice.totalAmount)}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="note">
      ${invoice.notes ? `<p>${invoice.notes}</p>` : ''}
      <p>This is a computer-generated invoice.</p>
    </div>
    <div class="auth">
      <div class="sig-line"></div>
      <p>Authorised Signatory</p>
      <p><strong>ABHI CABS</strong></p>
    </div>
  </div>

</div>

</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Opens the invoice in a new browser window with a print bar.
 * The user can Cmd/Ctrl+P or click "Save as PDF / Print".
 *
 * @param {Object} invoice — the full invoice object (with lines).
 */
export function downloadInvoice(invoice) {
  if (!invoice) return;

  const html = buildInvoiceHTML(invoice);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    // Popup blocked — fall back to a Blob download of the HTML
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