import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import Badge       from '../../components/ui/Badge';
import Button      from '../../components/ui/Button';
import Modal       from '../../components/ui/Modal';
import Alert       from '../../components/ui/Alert';
import { useApi }  from '../../hooks/useApi';
import { adminInvoicesService } from '../../services/adminInvoicesService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_TONE = { DRAFT: 'slate', ISSUED: 'blue', PAID: 'green', CANCELLED: 'red' };
const STATUS_OPTS = ['DRAFT','ISSUED','PAID','CANCELLED'];

function InvoiceModal({ invoice, onClose }) {
  if (!invoice) return null;
  return (
    <Modal open={!!invoice} onClose={onClose} title={invoice.invoiceNumber || 'Invoice'} size="md"
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
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
      </div>
    </Modal>
  );
}

export default function Invoices() {
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [selected,    setSelected]    = useState(null);

  const { data, status, error, refetch } = useApi(
    () => adminInvoicesService.list({ limit: 50 }),
    []
  );

  const rawItems = data?.data || data?.items || data?.invoices || [];

  const filtered = rawItems.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.billToName?.toLowerCase().includes(q) ||
        inv.booking?.bookingNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #',
      render: (r) => <span className="font-mono font-bold text-xs" style={{ color: '#111111' }}>{r.invoiceNumber || '—'}</span> },
    { key: 'booking', header: 'Booking',
      render: (r) => <span className="font-mono text-xs" style={{ color: '#9A9A9A' }}>{r.booking?.bookingNumber || '—'}</span> },
    { key: 'billToName', header: 'Billed To',
      render: (r) => <span className="font-semibold" style={{ color: '#111111' }}>{r.billToName || '—'}</span> },
    { key: 'type', header: 'Type',
      render: (r) => <Badge tone="slate">{r.type === 'TAX' ? 'Tax Invoice' : 'Bill of Supply'}</Badge> },
    { key: 'totalAmount', header: 'Amount',
      render: (r) => <span className="font-bold" style={{ color: '#111111' }}>{formatCurrency(Number(r.totalAmount) || 0)}</span> },
    { key: 'status', header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'slate'}>{r.status}</Badge> },
    { key: 'issuedAt', header: 'Issued',
      render: (r) => <span className="text-xs" style={{ color: '#9A9A9A' }}>{formatDate(r.issuedAt)}</span> },
    { key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <Button size="sm" variant="secondary" icon={FileText} onClick={() => setSelected(r)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="All booking invoices. Filtered client-side — no list endpoint on backend." />
      <Alert type="info" className="mb-4">
        Invoices are assembled from completed bookings. Only ISSUED and PAID invoices are shown.
      </Alert>
      <FilterBar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search invoice #, booking # or customer…"
        filters={[{
          name: 'status', value: statusFilter,
          onChange: setStatusFilter,
          placeholder: 'All statuses',
          options: STATUS_OPTS.map((s) => ({ value: s, label: s })),
        }]}
      />
      <DataTable
        columns={columns} rows={filtered}
        status={status} error={error} onRetry={refetch}
        emptyTitle="No invoices found"
        emptyDescription="Invoices are generated for completed bookings with payments."
      />
      <InvoiceModal invoice={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
