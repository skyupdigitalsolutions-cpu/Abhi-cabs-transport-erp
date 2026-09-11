import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { adminCustomersService } from '../../services';
import { formatDate } from '../../utils/formatters';

/**
 * This page used to manage an invented "Clients" concept (cargo-transport
 * style: company/city/GST/status) that has no equivalent anywhere on the
 * real backend. There is, however, a real Customer model and a real
 * /admin/customers endpoint — individual (RETAIL) and business (CORPORATE)
 * riders of this cab service. This page now shows that real data instead.
 *
 * Confirmed real fields (src/models/customer.model.js CUSTOMER_LIST_SELECT):
 *   userId, accountType, corporateAccountId, loyaltyPoints, totalBookings,
 *   createdAt, user: { name, email, phone, isActive }, corporate: { companyName }
 *
 * There is no create/delete here — customers self-register through the
 * customer app. Staff can only view, and edit a small set of fields
 * (see CustomerDetail's edit drawer) via PATCH.
 */
export default function Clients() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');

  const load = () => {
    setStatus('loading');
    adminCustomersService.list({ page, limit: 10, search: search || undefined, accountType: accountType || undefined })
      .then((r) => {
        setRows(r.data || []);
        setMeta(r.meta || null);
        setStatus('success');
      })
      .catch((e) => { setError(e); setStatus('error'); });
  };

  useEffect(() => { load(); }, [page, search, accountType]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      key: 'name', header: 'Customer', render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937' }}>{r.user?.name}</p>
          <p style={{ fontSize: '12px', color: '#6B7280' }}>{r.user?.phone}</p>
        </div>
      ),
    },
    {
      key: 'accountType', header: 'Type', render: (r) => (
        <Badge tone={r.accountType === 'CORPORATE' ? 'purple' : 'primary'}>
          {r.accountType === 'CORPORATE' ? 'Corporate' : 'Retail'}
        </Badge>
      ),
    },
    {
      key: 'company', header: 'Company', render: (r) => r.corporate?.companyName
        ? (
          <span className="flex items-center gap-1.5">
            <Building2 size={13} style={{ color: '#6B7280' }} />
            <span style={{ color: '#1F2937' }}>{r.corporate.companyName}</span>
          </span>
        )
        : <span style={{ color: '#6B7280' }}>—</span>,
    },
    {
      key: 'totalBookings', header: 'Bookings', render: (r) => (
        <Badge tone="primary">{r.totalBookings ?? 0}</Badge>
      ),
    },
    {
      key: 'loyaltyPoints', header: 'Loyalty pts', render: (r) => (
        <span style={{ color: '#1F2937' }}>{r.loyaltyPoints ?? 0}</span>
      ),
    },
    {
      key: 'isActive', header: 'Status', render: (r) => (
        <Badge tone={r.user?.isActive ? 'green' : 'slate'}>
          {r.user?.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt', header: 'Since', render: (r) => (
        <span style={{ color: '#6B7280', fontSize: '13px' }}>{formatDate(r.createdAt)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Individual and corporate riders of ABHI CABS — view profiles, billing, and booking history."
      />

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search name, email or phone…"
        filters={[{
          name: 'accountType',
          value: accountType,
          onChange: (v) => { setAccountType(v); setPage(1); },
          placeholder: 'All types',
          options: [
            { value: 'RETAIL', label: 'Retail' },
            { value: 'CORPORATE', label: 'Corporate' },
          ],
        }]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        status={status}
        error={error}
        onRetry={load}
        page={page}
        limit={meta?.limit}
        total={meta?.total}
        totalPages={meta?.totalPages}
        onPageChange={setPage}
        rowKey="userId"
        onRowClick={(r) => navigate(`/admin/clients/${r.userId}`)}
        emptyTitle="No customers yet"
        emptyDescription="Customers who sign up through the app will appear here."
      />
    </div>
  );
}
