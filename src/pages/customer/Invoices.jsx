import { Download } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import IconButton from '../../components/ui/IconButton';
import { useResourceList } from '../../hooks/useResourceList';
import { invoiceService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerInvoices() {
  const list = useResourceList(invoiceService, { sortBy: 'issuedAt', limit: 8 });
  const toast = useToast();

  const columns = [
    { key: 'invoiceNo', header: 'Invoice No.' },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'issuedAt', header: 'Issued', render: (r) => formatDate(r.issuedAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <IconButton icon={Download} label="Download invoice" onClick={() => toast.info(`Downloading ${r.invoiceNo}…`)} />
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="Download invoices for your completed bookings." />
      <DataTable columns={columns} rows={list.rows} status={list.status} error={list.error} onRetry={list.refetch}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total} totalPages={list.meta?.totalPages} onPageChange={list.setPage}
        emptyTitle="No invoices yet" />
    </div>
  );
}
