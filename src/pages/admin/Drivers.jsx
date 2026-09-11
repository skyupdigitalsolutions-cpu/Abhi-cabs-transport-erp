import { useState, useMemo } from 'react';
import { Star, PlusCircle, Phone, Mail, IdCard, CheckCircle, XCircle, FileText, Image, Eye, X } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import Card          from '../../components/ui/Card';
import Select        from '../../components/ui/Select';
import Button        from '../../components/ui/Button';
import DataTable     from '../../components/ui/DataTable';
import FilterBar     from '../../components/ui/FilterBar';
import Badge         from '../../components/ui/Badge';
import Alert         from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DriverFormDrawer from '../../components/driver/DriverFormDrawer';
import { useApi }    from '../../hooks/useApi';
import { useResourceList } from '../../hooks/useResourceList';
import { useToast }  from '../../hooks/useToast';
import { reportsService, driverService } from '../../services';
import { apiClient } from '../../services/apiClient';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/formatters';

function rangeFor(days) {
  const to = new Date();
  const from = new Date(Date.now() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const KYC_TONE = { PENDING: 'amber', VERIFIED: 'green', REJECTED: 'red', SUSPENDED: 'slate' };

const DOC_LABELS = {
  LICENCE: 'Driving Licence',
  AADHAAR: 'Aadhaar Card',
  PHOTO:   'Driver Photo',
  RC:      'Vehicle RC',
  INSURANCE: 'Insurance',
  PUC:     'PUC Certificate',
  FITNESS: 'Fitness Certificate',
  PERMIT:  'Permit',
};

// ── Document Review Modal ───────────────────────────────────────────────────
function DocumentReviewModal({ driver, onClose, onApprove, onReject, actionLoading }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Fetch full driver detail (includes documents)
  const { data, status } = useApi(
    () => apiClient.get(`/admin/drivers/${driver.userId}`),
    [driver.userId]
  );

  const fullDriver = data?.driver || data;
  const documents  = fullDriver?.documents || {};
  const docEntries = Object.entries(documents);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 700,
          maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1F2937' }}>KYC Review — {driver.user?.name}</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              {driver.user?.phone} · {driver.user?.email} · Licence: {driver.licenceNumber}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {status === 'loading' && (
            <p style={{ color: '#6B7280', textAlign: 'center', padding: 32 }}>Loading documents…</p>
          )}

          {status !== 'loading' && docEntries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <FileText size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: '#1F2937' }}>No documents uploaded</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                The driver has not uploaded any documents yet. You can still approve or reject.
              </p>
            </div>
          )}

          {status !== 'loading' && docEntries.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                {docEntries.length} document{docEntries.length > 1 ? 's' : ''} uploaded
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {docEntries.map(([docType, doc]) => (
                  <div
                    key={docType}
                    style={{
                      border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
                      cursor: 'pointer', transition: 'box-shadow 0.15s',
                    }}
                    onClick={() => setSelectedDoc({ docType, doc })}
                  >
                    {/* Thumbnail */}
                    <div style={{ height: 120, backgroundColor: '#F9FAFB', position: 'relative', overflow: 'hidden' }}>
                      {doc.url ? (
                        <img
                          src={doc.url}
                          alt={docType}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <Image size={32} style={{ color: '#D1D5DB' }} />
                        </div>
                      )}
                      {/* View overlay */}
                      <div style={{
                        position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                        className="doc-overlay"
                      >
                        <Eye size={24} style={{ color: '#fff' }} />
                      </div>
                    </div>
                    {/* Label */}
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                        {DOC_LABELS[docType] || titleCase(docType)}
                      </p>
                      {doc.uploadedAt && (
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                          {formatDateTime(doc.uploadedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Driver info summary */}
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <InfoItem label="Full Name"       value={driver.user?.name} />
              <InfoItem label="Phone"           value={driver.user?.phone} />
              <InfoItem label="Email"           value={driver.user?.email} />
              <InfoItem label="Licence No."     value={driver.licenceNumber} />
              {driver.licenceExpiry && <InfoItem label="Licence Expiry" value={formatDate(driver.licenceExpiry)} />}
              {driver.aadhaarLast4  && <InfoItem label="Aadhaar Last 4" value={`****${driver.aadhaarLast4}`} />}
              <InfoItem label="Applied"         value={formatDateTime(driver.createdAt)} />
            </div>
          </div>
        </div>

        {/* Footer — approve / reject */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="dangerOutline"
            icon={XCircle}
            loading={actionLoading === `reject-${driver.userId}`}
            onClick={() => onReject(driver)}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            icon={CheckCircle}
            loading={actionLoading === `approve-${driver.userId}`}
            onClick={() => onApprove(driver)}
          >
            Approve Driver
          </Button>
        </div>
      </div>

      {/* Full-size document lightbox */}
      {selectedDoc && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div style={{ maxWidth: 800, width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
              {DOC_LABELS[selectedDoc.docType] || selectedDoc.docType}
            </p>
            <img
              src={selectedDoc.doc.url}
              alt={selectedDoc.docType}
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8, objectFit: 'contain' }}
            />
            <p style={{ color: '#9CA3AF', marginTop: 12, fontSize: 12 }}>Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{value || '—'}</p>
    </div>
  );
}

// ── Roster tab ──────────────────────────────────────────────────────────────
function RosterTab() {
  const toast = useToast();
  const list  = useResourceList(driverService, { limit: 10, sortBy: 'createdAt' });
  const [formOpen,      setFormOpen]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [deleting,      setDeleting]      = useState(null);
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

  const handleDeactivate = async () => {
    setDeleteLoading(true);
    try {
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
      key: 'name', header: 'Driver',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937' }}>{r.user?.name}</p>
          <p style={{ fontSize: 12, color: '#6B7280' }} className="flex items-center gap-1">
            <Phone size={11} />{r.user?.phone}
          </p>
        </div>
      ),
    },
    {
      key: 'email', header: 'Email',
      render: (r) => r.user?.email
        ? <span className="flex items-center gap-1" style={{ color: '#6B7280', fontSize: 13 }}><Mail size={12} />{r.user.email}</span>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      key: 'licenceNumber', header: 'Licence',
      render: (r) => (
        <div>
          <p className="flex items-center gap-1 font-mono" style={{ color: '#1F2937', fontSize: 13 }}>
            <IdCard size={12} />{r.licenceNumber}
          </p>
          {r.licenceExpiry && <p style={{ color: '#6B7280', fontSize: 11 }}>Expires {formatDate(r.licenceExpiry)}</p>}
        </div>
      ),
    },
    {
      key: 'kycStatus', header: 'KYC Status',
      render: (r) => <Badge tone={KYC_TONE[r.kycStatus] || 'slate'}>{titleCase(r.kycStatus)}</Badge>,
    },
    {
      key: 'isOnline', header: 'Status',
      render: (r) => (
        <span className="flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: r.isOnline ? '#38B763' : '#9CA3AF' }}>
          <span className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: r.isOnline ? '#38B763' : '#D1D5DB' }} />
          {r.isOnline ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      key: 'rating', header: 'Rating',
      render: (r) => r.ratingCount > 0
        ? <span style={{ color: '#1F2937' }}>★ {Number(r.ratingAvg ?? 0).toFixed(1)} <span style={{ color: '#9CA3AF' }}>({r.ratingCount})</span></span>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
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
      <FilterBar search={list.search} onSearchChange={list.onSearchChange}
        searchPlaceholder="Search name, phone or licence…" />
      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey="userId"
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
        description={deleting ? `${deleting.user?.name} will be deactivated and forced offline.` : ''}
        confirmLabel="Deactivate"
        danger
        loading={deleteLoading}
        onClose={() => setDeleting(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}

// ── KYC Applications tab ────────────────────────────────────────────────────
function KycTab() {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewDriver,  setReviewDriver]  = useState(null); // driver being reviewed in modal
  const [rejectDialog,  setRejectDialog]  = useState(null);

  const { data, status, error, refetch } = useApi(
    () => apiClient.get('/admin/drivers', { params: { kycStatus: 'PENDING', limit: 50, page: 1 } }),
    []
  );

  const applications = data?.items ?? data?.data ?? [];

  async function approve(driver) {
    setActionLoading(`approve-${driver.userId}`);
    try {
      await apiClient.patch(`/admin/drivers/${driver.userId}`, { kycStatus: 'VERIFIED' });
      toast.success(`${driver.user?.name} approved — they can now accept trips`);
      setReviewDriver(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Could not approve driver');
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(driver) {
    setActionLoading(`reject-${driver.userId}`);
    try {
      await apiClient.patch(`/admin/drivers/${driver.userId}`, { kycStatus: 'REJECTED' });
      toast.success(`${driver.user?.name} application rejected`);
      setRejectDialog(null);
      setReviewDriver(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Could not reject application');
    } finally {
      setActionLoading(null);
    }
  }

  const columns = [
    {
      key: 'name', header: 'Applicant',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937' }}>{r.user?.name}</p>
          <p style={{ fontSize: 12, color: '#6B7280' }} className="flex items-center gap-1">
            <Phone size={11} />{r.user?.phone}
          </p>
          {r.user?.email && (
            <p style={{ fontSize: 12, color: '#6B7280' }} className="flex items-center gap-1">
              <Mail size={11} />{r.user.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'licenceNumber', header: 'Licence',
      render: (r) => (
        <div>
          <p className="font-mono" style={{ color: '#1F2937', fontSize: 13 }}>{r.licenceNumber}</p>
          {r.licenceExpiry && <p style={{ color: '#6B7280', fontSize: 11 }}>Expires {formatDate(r.licenceExpiry)}</p>}
        </div>
      ),
    },
    {
      key: 'appliedAt', header: 'Applied',
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex gap-2 justify-end">
          {/* Review button opens the document modal */}
          <Button
            size="sm"
            variant="secondary"
            icon={Eye}
            onClick={() => setReviewDriver(r)}
          >
            Review Documents
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={CheckCircle}
            loading={actionLoading === `approve-${r.userId}`}
            onClick={() => approve(r)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="dangerOutline"
            icon={XCircle}
            disabled={!!actionLoading}
            onClick={() => setRejectDialog(r)}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {applications.length > 0 && (
        <Alert type="warning" className="mb-4">
          {applications.length} driver application{applications.length > 1 ? 's' : ''} waiting for KYC review.
          Click "Review Documents" to view uploaded documents before approving.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={applications}
        rowKey="userId"
        status={status}
        error={error}
        onRetry={refetch}
        emptyTitle="No pending applications"
        emptyDescription="All driver applications have been reviewed."
      />

      {/* Document review modal */}
      {reviewDriver && (
        <DocumentReviewModal
          driver={reviewDriver}
          onClose={() => setReviewDriver(null)}
          onApprove={approve}
          onReject={(d) => { setRejectDialog(d); }}
          actionLoading={actionLoading}
        />
      )}

      {/* Reject confirmation */}
      <ConfirmDialog
        open={!!rejectDialog}
        title="Reject this application?"
        description={rejectDialog ? `${rejectDialog.user?.name}'s application will be rejected.` : ''}
        confirmLabel="Reject Application"
        danger
        loading={actionLoading === `reject-${rejectDialog?.userId}`}
        onClose={() => setRejectDialog(null)}
        onConfirm={() => reject(rejectDialog)}
      />
    </div>
  );
}

// ── Performance tab ──────────────────────────────────────────────────────────
function PerformanceTab() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => rangeFor(days), [days]);
  const { data, status, error, refetch } = useApi(() => reportsService.driverPerformance(range), [days]);
  const rows = data || [];

  const columns = [
    { key: 'name',   header: 'Driver',    render: (r) => <p style={{ color: '#1F2937', fontWeight: 600 }}>{r.name}</p> },
    {
      key: 'rating', header: 'Rating',
      render: (r) => (
        <span className="flex items-center gap-1">
          <Star size={13} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
          {Number(r.ratingAvg ?? 0).toFixed(2)}
          <span style={{ color: '#9CA3AF', fontSize: 12 }}>({r.ratingCount ?? 0})</span>
        </span>
      ),
    },
    { key: 'offers', header: 'Offers',    render: (r) => <span>{r.offers ?? 0}</span> },
    {
      key: 'acceptance', header: 'Acceptance',
      render: (r) => {
        const rate = r.offers ? Math.round((r.accepted / r.offers) * 100) : 0;
        return <Badge tone={rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red'}>{rate}%</Badge>;
      },
    },
    { key: 'completedTrips', header: 'Completed', render: (r) => <Badge tone="primary">{r.completedTrips ?? 0}</Badge> },
    { key: 'earnings', header: 'Earnings', render: (r) => <span style={{ fontWeight: 600 }}>{formatCurrency(r.earnings ?? 0)}</span> },
  ];

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))}
          options={[
            { value: '7',   label: 'Last 7 days'    },
            { value: '30',  label: 'Last 30 days'   },
            { value: '90',  label: 'Last 90 days'   },
            { value: '365', label: 'Last 12 months' },
          ]}
        />
      </div>
      <DataTable columns={columns} rows={rows} status={status} error={error} onRetry={refetch}
        emptyTitle="No driver activity"
        emptyDescription="No driver had any bookings in this period." />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Drivers() {
  const [tab, setTab] = useState('roster');
  const { data: pendingData } = useApi(
    () => apiClient.get('/admin/drivers', { params: { kycStatus: 'PENDING', limit: 1, page: 1 } }),
    []
  );
  const pendingCount = pendingData?.pagination?.total ?? pendingData?.meta?.total ?? 0;

  const tabs = [
    { key: 'roster',      label: 'Roster' },
    { key: 'kyc',         label: `KYC Applications${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'performance', label: 'Performance' },
  ];

  return (
    <div>
      <PageHeader title="Drivers"
        description="Manage your driver roster, review KYC applications, and track performance." />
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring"
            style={{ borderColor: tab === t.key ? '#3B65DB' : 'transparent', color: tab === t.key ? '#3B65DB' : '#6B7280' }}>
            {t.label}
            {t.key === 'kyc' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === 'roster'      && <RosterTab />}
      {tab === 'kyc'         && <KycTab />}
      {tab === 'performance' && <PerformanceTab />}
    </div>
  );
}
