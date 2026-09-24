import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import Badge       from '../../components/ui/Badge';
import Button      from '../../components/ui/Button';
import Modal       from '../../components/ui/Modal';
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

export default function Invoices() {
  const [selected, setSelected] = useState(null);

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
      <PageHeader title="Invoices" description="All booking and corporate invoices." />
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
    </div>
  );
}