import { useState, useMemo } from 'react';
import { Star, PlusCircle, Phone, Mail, IdCard } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DriverFormDrawer from '../../components/driver/DriverFormDrawer';
import { useApi } from '../../hooks/useApi';
import { useResourceList } from '../../hooks/useResourceList';
import { useToast } from '../../hooks/useToast';
import { reportsService, driverService } from '../../services';
import { apiClient } from '../../services/apiClient';
import { formatCurrency, formatDate, titleCase } from '../../utils/formatters';

function rangeFor(days) {
  const to = new Date();
  const from = new Date(Date.now() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const KYC_TONE = { PENDING: 'amber', VERIFIED: 'green', REJECTED: 'red', SUSPENDED: 'slate' };

// ── Roster tab — real, live /admin/drivers CRUD. Field shapes confirmed
// directly against src/services/driver.service.js's DRIVER_SELECT: a driver
// row's own fields (licenceNumber, kycStatus, isOnline, ...) sit alongside
// a nested `user` object (name/email/phone/isActive) since name/contact
// details live on the linked User record, not the Driver record itself.
// The route's :id param is the driver's userId — not a separate driver id.
function RosterTab() {
  const toast = useToast();
  const list = useResourceList(driverService, { limit: 10, sortBy: 'createdAt' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSubmit = async (values) => {
    if (editing) {
      await driverService.update(editing.userId, values);
      toast.success('Driver updated');
    } else {
      await driverService.create(values);
      toast.success('Driver onboarded');
    }
    list.reload();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      // Drivers have no DELETE route at all — only a dedicated deactivate
      // action (confirmed: driver.routes.js has PATCH /:id, /:id/activate,
      // /:id/deactivate, and nothing else).
      await apiClient.patch(`/admin/drivers/${deleting.userId}/deactivate`, {});
      toast.success('Driver deactivated');
      list.reload();
    } catch (e) {
      toast.error(e.message || 'Could not deactivate driver');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  };

  const columns = [
    {
      key: 'name', header: 'Driver', render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937' }}>{r.user?.name}</p>
          <p style={{ fontSize: '12px', color: '#6B7280' }} className="flex items-center gap-1"><Phone size={11} />{r.user?.phone}</p>
        </div>
      ),
    },
    {
      key: 'email', header: 'Email', render: (r) => (
        r.user?.email
          ? <span className="flex items-center gap-1" style={{ color: '#6B7280', fontSize: '13px' }}><Mail size={12} />{r.user.email}</span>
          : <span style={{ color: '#9CA3AF', fontSize: '13px' }}>—</span>
      ),
    },
    {
      key: 'licenceNumber', header: 'Licence', render: (r) => (
        <div>
          <p className="flex items-center gap-1 font-mono" style={{ color: '#1F2937', fontSize: '13px' }}><IdCard size={12} />{r.licenceNumber}</p>
          {r.licenceExpiry && <p style={{ color: '#6B7280', fontSize: '11px' }}>Expires {formatDate(r.licenceExpiry)}</p>}
        </div>
      ),
    },
    {
      key: 'kycStatus', header: 'KYC Status', render: (r) => (
        <Badge tone={KYC_TONE[r.kycStatus] || 'slate'}>{titleCase(r.kycStatus)}</Badge>
      ),
    },
    {
      key: 'isOnline', header: 'Availability', render: (r) => (
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: r.isOnline ? '#38B763' : '#9CA3AF' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.isOnline ? '#38B763' : '#D1D5DB' }} />
          {r.isOnline ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      key: 'rating', header: 'Rating', render: (r) => (
        r.ratingCount > 0
          ? <span style={{ color: '#1F2937' }}>★ {Number(r.ratingAvg ?? 0).toFixed(1)} <span style={{ color: '#9CA3AF' }}>({r.ratingCount})</span></span>
          : <span style={{ color: '#9CA3AF' }}>—</span>
      ),
    },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={() => { setEditing(r); setFormOpen(true); }}>Edit</Button>
          <Button size="sm" variant="dangerOutline" onClick={() => setDeleting(r)}>Deactivate</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button icon={PlusCircle} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Driver</Button>
      </div>

      <FilterBar search={list.search} onSearchChange={list.onSearchChange} searchPlaceholder="Search name, phone or licence…" />

      <DataTable
        columns={columns}
        rows={list.rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        emptyTitle="No drivers yet"
        emptyDescription="Add your first driver to get started."
      />

      <DriverFormDrawer open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={!!deleting}
        title="Deactivate this driver?"
        description={deleting ? `${deleting.user?.name} will be deactivated and forced offline. This can be reversed later.` : ''}
        confirmLabel="Deactivate"
        danger
        loading={deleteLoading}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Performance tab — real, working data from /admin/reports/driver-performance
function PerformanceTab() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => rangeFor(days), [days]);
  const { data, status, error, refetch } = useApi(() => reportsService.driverPerformance(range), [days]);
  const rows = data || [];

  const columns = [
    { key: 'name', header: 'Driver', render: (r) => <p style={{ color: '#1F2937', fontWeight: 600 }}>{r.name}</p> },
    {
      key: 'rating', header: 'Rating', render: (r) => (
        <span className="flex items-center gap-1">
          <Star size={13} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
          {Number(r.ratingAvg ?? 0).toFixed(2)}
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>({r.ratingCount ?? 0})</span>
        </span>
      ),
    },
    { key: 'offers', header: 'Offers', render: (r) => <span style={{ color: '#1F2937' }}>{r.offers ?? 0}</span> },
    {
      key: 'acceptance', header: 'Acceptance', render: (r) => {
        const rate = r.offers ? Math.round((r.accepted / r.offers) * 100) : 0;
        return <Badge tone={rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red'}>{rate}%</Badge>;
      },
    },
    { key: 'completedTrips', header: 'Completed Trips', render: (r) => <Badge tone="primary">{r.completedTrips ?? 0}</Badge> },
    { key: 'earnings', header: 'Earnings', render: (r) => <span style={{ fontWeight: 600, color: '#1F2937' }}>{formatCurrency(r.earnings ?? 0)}</span> },
  ];

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Select
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '365', label: 'Last 12 months' },
          ]}
        />
      </div>
      <Alert type="info" className="mb-4">
        This is real, working data from /admin/reports/driver-performance — but it's activity-based, not a
        directory: a driver with no trips in this window won't appear here at all.
      </Alert>
      <DataTable
        columns={columns}
        rows={rows}
        status={status}
        error={error}
        onRetry={refetch}
        emptyTitle="No driver activity"
        emptyDescription="No driver had any bookings in this period. Try a wider date range."
      />
    </div>
  );
}

export default function Drivers() {
  const [tab, setTab] = useState('roster');

  return (
    <div>
      <PageHeader title="Drivers" description="Manage your driver roster, or view activity-based performance metrics." />

      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {[{ key: 'roster', label: 'Roster' }, { key: 'performance', label: 'Performance' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring"
            style={{ borderColor: tab === t.key ? '#3B65DB' : 'transparent', color: tab === t.key ? '#3B65DB' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roster' ? <RosterTab /> : <PerformanceTab />}
    </div>
  );
}
