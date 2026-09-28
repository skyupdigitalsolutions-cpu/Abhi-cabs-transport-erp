import { useState } from 'react';
import { FileText, Download, Plus } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import Badge       from '../../components/ui/Badge';
import Button      from '../../components/ui/Button';
import Modal       from '../../components/ui/Modal';
import Drawer      from '../../components/ui/Drawer';
import FormField   from '../../components/ui/FormField';
import Input       from '../../components/ui/Input';
import Select      from '../../components/ui/Select';
import { useResourceList } from '../../hooks/useResourceList';
import { useApi } from '../../hooks/useApi';
import { adminInvoicesService } from '../../services/adminInvoicesService';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/formatters';
import { downloadInvoice } from '../../utils/invoicePdf';

const STATUS_TONE = { DRAFT: 'slate', ISSUED: 'blue', PAID: 'green', CANCELLED: 'red' };
const STATUS_OPTS = ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'];
const TYPE_OPTS   = [{ value: 'TAX', label: 'Tax Invoice' }, { value: 'NON_TAX', label: 'Bill of Supply' }];

// Ledger entries for the invoice's booking — GET /admin/invoices/booking/:bookingId/ledger.
// Only loaded once a booking is known (the invoice has at least one line tied to a booking);
// a consolidated corporate invoice with no single booking simply shows no ledger section.
function InvoiceLedger({ bookingId }) {
  const { data, status } = useApi(() => adminInvoicesService.ledgerForBooking(bookingId), [bookingId]);

  if (status === 'loading') return <p className="text-xs" style={{ color: '#9A9A9A' }}>Loading ledger…</p>;
  if (status === 'error' || !data?.ledger?.length) return null;

  return (
    <div className="border-t pt-3 mt-3" style={{ borderColor: '#F5F5F3' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>Ledger</p>
      {data.ledger.map((e) => (
        <div key={e.id} className="flex justify-between py-1 text-xs">
          <span style={{ color: '#5A5A5A' }}>{titleCase(e.entryType)} · {formatDateTime(e.createdAt)}</span>
          <span className="font-semibold" style={{ color: e.direction === 'CREDIT' ? '#15803d' : '#DC2626' }}>
            {e.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(e.amount)}
          </span>
        </div>
      ))}
      {data.balance && (
        <div className="flex justify-between pt-2 mt-1 border-t text-xs font-bold" style={{ borderColor: '#F5F5F3' }}>
          <span>Fare charged</span>
          <span>{formatCurrency(data.balance.fareCharged)}</span>
        </div>
      )}
    </div>
  );
}

function InvoiceModal({ invoice, onClose }) {
  if (!invoice) return null;
  return (
    <Modal open={!!invoice} onClose={onClose} title={invoice.invoiceNumber || 'Invoice'} size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadInvoice(invoice)}>
            Download
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }>
      <div className="space-y-3 text-sm">
        {[
          ['Type',     invoice.type === 'TAX' ? 'Tax Invoice' : 'Bill of Supply'],
          ['Billed to', invoice.billToName],
          ['GSTIN',    invoice.billToGstin],
          ['Booking',  invoice.booking?.bookingNumber],
          ['Issued',   formatDate(invoice.issuedAt)],
          ['Due',      formatDate(invoice.dueAt)],
        ].filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span style={{ color: '#9A9A9A' }}>{label}</span>
            <span className="font-semibold text-right" style={{ color: '#111111' }}>{value}</span>
          </div>
        ))}
        {(invoice.lines || []).length > 0 && (
          <div className="border-t pt-3 mt-3" style={{ borderColor: '#F5F5F3' }}>
            {invoice.lines.map((l) => (
              <div key={l.id} className="flex justify-between py-1">
                <span style={{ color: '#5A5A5A' }}>{l.description}</span>
                <span className="font-medium">{formatCurrency(Number(l.amount) || 0)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-1 border-t font-bold" style={{ borderColor: '#F5F5F3' }}>
              <span>Total</span>
              <span style={{ color: '#111111' }}>{formatCurrency(Number(invoice.totalAmount) || 0)}</span>
            </div>
          </div>
        )}
        {invoice.booking?.id && <InvoiceLedger bookingId={invoice.booking.id} />}
      </div>
    </Modal>
  );
}

// ── Generate Invoice Drawer ────────────────────────────────────────────────

function GenerateInvoiceDrawer({ open, onClose }) {
  const [form, setForm] = useState({
    type: 'NON_TAX',
    billToName: '', billToPhone: '', billToEmail: '', billToGstin: '',
    placeOfSupply: 'Karnataka',
    bookingNumber: '', tripType: '', vehicleClass: '',
    pickupAddress: '', dropAddress: '',
    pickupAt: '', completedAt: '',
    baseFare: '', extras: '', discount: '',
    supplierGstin: '36AAQCS9916C1ZY',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const gstRate = 5;
  const baseFare = Number(form.baseFare) || 0;
  const extras = Number(form.extras) || 0;
  const discount = Number(form.discount) || 0;
  const taxableValue = Math.max(baseFare + extras - discount, 0);

  const isTax = form.type === 'TAX';
  const isInterState = isTax && form.placeOfSupply && form.placeOfSupply !== 'Karnataka';
  const cgst = isTax && !isInterState ? +(taxableValue * 0.025).toFixed(2) : 0;
  const sgst = isTax && !isInterState ? +(taxableValue * 0.025).toFixed(2) : 0;
  const igst = isTax && isInterState ? +(taxableValue * 0.05).toFixed(2) : 0;
  const totalAmount = +(taxableValue + cgst + sgst + igst).toFixed(2);

  const handleGenerate = () => {
    if (!form.billToName.trim()) return;
    if (isTax && !form.billToGstin.trim() && !confirm('No GSTIN entered. Generate tax invoice without customer GSTIN?')) return;

    const now = new Date();
    const invoiceNumber = `ABH-INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    downloadInvoice({
      type: form.type,
      invoiceNumber,
      issuedAt: now.toISOString(),
      billToName: form.billToName,
      billToGstin: form.billToGstin || null,
      placeOfSupply: form.placeOfSupply,
      supplierGstin: form.supplierGstin,
      taxableValue,
      cgst, sgst, igst,
      totalAmount,
      discount: discount || null,
      gstRatePct: gstRate,
      booking: {
        bookingNumber: form.bookingNumber || null,
        tripType: form.tripType || null,
        vehicleClass: form.vehicleClass || null,
        pickupAddress: form.pickupAddress || null,
        dropAddress: form.dropAddress || null,
        pickupAt: form.pickupAt || null,
        completedAt: form.completedAt || null,
        customer: { user: { name: form.billToName, phone: form.billToPhone, email: form.billToEmail } },
      },
    });
    onClose();
  };

  const STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi',
    'Goa','Gujarat','Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand',
    'Karnataka','Kerala','Ladakh','Madhya Pradesh','Maharashtra','Manipur',
    'Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan',
    'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Generate Invoice"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={FileText} onClick={handleGenerate} disabled={!form.billToName.trim() || !baseFare}>
          Generate & Download
        </Button>
      </>}>
      <div className="space-y-4">

        {/* Invoice type toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, backgroundColor: '#F3F4F6' }}>
          {[
            { key: 'TAX', label: 'Tax Invoice', desc: 'With GST' },
            { key: 'NON_TAX', label: 'Bill of Supply', desc: 'Without GST' },
          ].map((t) => (
            <button key={t.key} onClick={() => set('type', t.key)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                backgroundColor: form.type === t.key ? '#fff' : 'transparent',
                boxShadow: form.type === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
              }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: form.type === t.key ? '#111' : '#6B7280', margin: 0 }}>{t.label}</p>
              <p style={{ fontSize: 11, color: '#9A9A9A', margin: '2px 0 0' }}>{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Customer details */}
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Customer Details</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name" required>
            <Input value={form.billToName} onChange={(e) => set('billToName', e.target.value)} placeholder="Ramesh Kumar" />
          </FormField>
          <FormField label="Phone">
            <Input value={form.billToPhone} onChange={(e) => set('billToPhone', e.target.value)} placeholder="9876543210" />
          </FormField>
        </div>
        <FormField label="Email">
          <Input value={form.billToEmail} onChange={(e) => set('billToEmail', e.target.value)} placeholder="ramesh@example.com" />
        </FormField>

        {isTax && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Customer GSTIN" hint="Optional for personal customers">
                <Input value={form.billToGstin} onChange={(e) => set('billToGstin', e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" maxLength={15} />
              </FormField>
              <FormField label="Place of Supply" required>
                <Select value={form.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)}
                  options={STATES.map((s) => ({ value: s, label: s }))} searchable />
              </FormField>
            </div>
            <FormField label="Supplier GSTIN">
              <Input value={form.supplierGstin} onChange={(e) => set('supplierGstin', e.target.value.toUpperCase())} />
            </FormField>
          </>
        )}

        {/* Trip details */}
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Trip Details</p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Booking #">
            <Input value={form.bookingNumber} onChange={(e) => set('bookingNumber', e.target.value)} placeholder="ABH-2026-001044" />
          </FormField>
          <FormField label="Vehicle class">
            <Input value={form.vehicleClass} onChange={(e) => set('vehicleClass', e.target.value)} placeholder="sedan" />
          </FormField>
          <FormField label="Trip type">
            <Select value={form.tripType} onChange={(e) => set('tripType', e.target.value)}
              placeholder="Select…" options={[
                { value: 'ONE_WAY', label: 'One Way' }, { value: 'ROUND_TRIP', label: 'Round Trip' },
                { value: 'AIRPORT', label: 'Airport' }, { value: 'HOURLY', label: 'Hourly' },
              ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Pickup">
            <Input value={form.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} placeholder="Bengaluru" />
          </FormField>
          <FormField label="Drop">
            <Input value={form.dropAddress} onChange={(e) => set('dropAddress', e.target.value)} placeholder="Mysuru" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start date">
            <Input type="date" value={form.pickupAt} onChange={(e) => set('pickupAt', e.target.value)} />
          </FormField>
          <FormField label="End date">
            <Input type="date" value={form.completedAt} onChange={(e) => set('completedAt', e.target.value)} />
          </FormField>
        </div>

        {/* Amounts */}
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Amount</p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Base Fare (₹)" required>
            <Input type="number" value={form.baseFare} onChange={(e) => set('baseFare', e.target.value)} placeholder="2500" />
          </FormField>
          <FormField label="Extras (₹)" hint="Extra km, waiting etc.">
            <Input type="number" value={form.extras} onChange={(e) => set('extras', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Discount (₹)">
            <Input type="number" value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder="0" />
          </FormField>
        </div>

        {/* Live calculation preview */}
        <div style={{ borderRadius: 12, border: '1.5px solid #E8E8E4', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', backgroundColor: '#F7F8FC' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>
              {isTax ? 'Tax Invoice Preview' : 'Invoice Preview'}
            </p>
          </div>
          <div style={{ padding: '10px 14px', fontSize: 13 }}>
            {[
              ['Base Fare', formatCurrency(baseFare)],
              ...(extras > 0 ? [['Extras', formatCurrency(extras)]] : []),
              ...(discount > 0 ? [['Discount', `- ${formatCurrency(discount)}`]] : []),
              ...(isTax ? [['Taxable Value', formatCurrency(taxableValue)]] : []),
              ...(cgst > 0 ? [[`CGST (2.5%)`, formatCurrency(cgst)]] : []),
              ...(sgst > 0 ? [[`SGST (2.5%)`, formatCurrency(sgst)]] : []),
              ...(igst > 0 ? [[`IGST (5%)`, formatCurrency(igst)]] : []),
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1">
                <span style={{ color: '#6B7280' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#111' }}>{val}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t" style={{ borderColor: '#E8E8E4' }}>
              <span style={{ fontWeight: 800, color: '#111' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

      </div>
    </Drawer>
  );
}

export default function Invoices() {
  const [selected, setSelected] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const list = useResourceList(adminInvoicesService, {
    filterDefaults: { status: '', type: '' },
    sortBy: 'issuedAt',
    sortDir: 'desc',
    limit: 20,
  });

  // The list endpoint's own row doesn't carry `lines` (kept lean for a table
  // view) — fetch the full invoice, with lines, only when one is opened.
  const openInvoice = async (row) => {
    setSelected(row); // show what we already have immediately
    try {
      const full = await adminInvoicesService.getOne(row.id);
      setSelected({ ...full, booking: row.booking });
    } catch { /* keep the row-level view; not worth an error toast for a detail fetch */ }
  };

  // Fetch the full invoice (with lines) and open the PDF preview.
  const handleDownload = async (row) => {
    try {
      const full = await adminInvoicesService.getOne(row.id);
      downloadInvoice({ ...full, booking: row.booking });
    } catch {
      // If the detail fetch fails, still try with whatever data we have —
      // the list row already carries enough for a basic invoice.
      downloadInvoice(row);
    }
  };

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #',
      render: (r) => <span className="font-mono font-bold text-xs" style={{ color: '#111111' }}>{r.invoiceNumber || '—'}</span> },
    { key: 'booking', header: 'Booking',
      render: (r) => <span className="font-mono text-xs" style={{ color: '#9A9A9A' }}>{r.booking?.bookingNumber || '—'}</span> },
    { key: 'billToName', header: 'Billed To',
      render: (r) => <span className="font-semibold" style={{ color: '#111111' }}>{r.billToName || '—'}</span> },
    { key: 'type', header: 'Type',
      render: (r) => <Badge tone="slate">{r.type === 'TAX' ? 'Tax Invoice' : 'Bill of Supply'}</Badge> },
    { key: 'totalAmount', header: 'Amount', sortable: true,
      render: (r) => <span className="font-bold" style={{ color: '#111111' }}>{formatCurrency(Number(r.totalAmount) || 0)}</span> },
    { key: 'status', header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'slate'}>{r.status}</Badge> },
    { key: 'issuedAt', header: 'Issued', sortable: true,
      render: (r) => <span className="text-xs" style={{ color: '#9A9A9A' }}>{formatDate(r.issuedAt)}</span> },
    { key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="secondary" icon={FileText} onClick={() => openInvoice(r)}>
            View
          </Button>
          <Button size="sm" variant="secondary" icon={Download} onClick={() => handleDownload(r)}
            title="Download invoice">
            Download
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="All booking and corporate invoices."
        actions={<Button icon={Plus} onClick={() => setGenerateOpen(true)}>Generate Invoice</Button>} />
      <FilterBar
        search={list.search} onSearchChange={list.onSearchChange}
        searchPlaceholder="Search invoice # or billed-to name…"
        filters={[
          {
            name: 'status', value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: STATUS_OPTS.map((s) => ({ value: s, label: s })),
          },
          {
            name: 'type', value: list.filters.type,
            onChange: (v) => list.setFilter('type', v),
            placeholder: 'All types',
            options: TYPE_OPTS,
          },
        ]}
      />
      <DataTable
        columns={columns} rows={list.rows}
        status={list.status} error={list.error} onRetry={list.refetch}
        sortBy={list.sortBy} sortDir={list.sortDir} onSort={list.onSort}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total}
        totalPages={list.meta?.totalPages} onPageChange={list.setPage} onLimitChange={list.setLimit}
        emptyTitle="No invoices found"
        emptyDescription="Invoices are generated automatically for completed bookings and consolidated corporate billing."
      />
      <InvoiceModal invoice={selected} onClose={() => setSelected(null)} />
      <GenerateInvoiceDrawer open={generateOpen} onClose={() => setGenerateOpen(false)} />
    </div>
  );
}