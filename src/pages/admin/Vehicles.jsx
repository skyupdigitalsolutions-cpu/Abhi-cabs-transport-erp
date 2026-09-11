import { useState } from 'react';
import {
  Plus, Pencil, Trash2, Users, AlertTriangle, CheckCircle,
  Clock, Shield, ShieldAlert, XCircle, Eye, Car, FileText,
} from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import Button        from '../../components/ui/Button';
import IconButton    from '../../components/ui/IconButton';
import StatusBadge   from '../../components/ui/StatusBadge';
import Badge         from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal         from '../../components/ui/Modal';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import Alert         from '../../components/ui/Alert';
import VehicleFormDrawer from '../../components/vehicle/VehicleFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { useApi }    from '../../hooks/useApi';
import { vehicleService } from '../../services';
import { apiClient }  from '../../services/apiClient';
import { useToast }  from '../../hooks/useToast';
import { VEHICLE_STATUS, PERMISSIONS } from '../../constants';
import { useAuth }   from '../../hooks/useAuth';
import { formatDate, formatDateTime, titleCase } from '../../utils/formatters';

// ── Expiry helpers ──────────────────────────────────────────────────────────
function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

const INSURANCE_WARNING_DAYS = 45;
const OTHER_DOCS_WARNING_DAYS = 30;

function ExpiryChip({ dateStr }) {
  const days = getDaysUntil(dateStr);
  if (days === null) return <span style={{ color: '#6B7280', fontSize: 11 }}>—</span>;
  const expired  = days < 0;
  const expiring = days <= 30;
  const color = expired ? '#EF4444' : expiring ? '#F59E0B' : '#38B763';
  const bg    = expired ? '#fef2f2' : expiring ? '#fffbeb' : '#f0fdf4';
  const Icon  = expired ? AlertTriangle : expiring ? Clock : CheckCircle;
  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color, display: 'inline-flex' }}>
      <Icon size={10} />
      {expired ? 'Expired' : expiring ? `${days}d` : 'Valid'}
    </div>
  );
}

function ComplianceChips({ vehicle }) {
  const checks = [
    { label: 'INS', date: vehicle.insuranceExpiry },
    { label: 'PUC', date: vehicle.pucExpiry },
    { label: 'PMT', date: vehicle.permitExpiry },
    { label: 'FIT', date: vehicle.fitnessExpiry },
  ];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {checks.map((c) => {
        if (!c.date) return (
          <span key={c.label} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ backgroundColor: '#F7F8FC', color: '#9CA3AF' }}>{c.label}</span>
        );
        const days  = getDaysUntil(c.date);
        const color = days < 0 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#38B763';
        const bg    = days < 0 ? '#fef2f2' : days <= 30 ? '#fffbeb' : '#f0fdf4';
        return (
          <span key={c.label} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ backgroundColor: bg, color }}>{c.label}</span>
        );
      })}
    </div>
  );
}

// ── Document detail modal ───────────────────────────────────────────────────
function DocDetailModal({ open, vehicle, onClose }) {
  if (!vehicle) return null;
  const docs = vehicle.documents || {};
  const DOC_META = {
    rc:        { label: 'Registration Certificate', icon: '📋' },
    insurance: { label: 'Insurance Policy',         icon: '🛡️', expiry: vehicle.insuranceExpiry },
    puc:       { label: 'Pollution Under Control',  icon: '🌿', expiry: vehicle.pucExpiry },
    permit:    { label: 'Vehicle Permit',           icon: '🔑', expiry: vehicle.permitExpiry },
    fitness:   { label: 'Fitness Certificate',      icon: '📄', expiry: vehicle.fitnessExpiry },
  };
  const entries = Object.entries(DOC_META).filter(
    ([key]) => docs[key] && Object.values(docs[key]).some(Boolean)
  );
  return (
    <Modal open={open} onClose={onClose} title={`Documents — ${vehicle.registrationNumber}`} size="md"
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
      {entries.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: '#6B7280' }}>
          No documents on file yet.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, meta]) => {
            const fields   = docs[key] || {};
            const days     = getDaysUntil(meta.expiry);
            const expired  = days !== null && days < 0;
            const expiring = days !== null && days >= 0 && days <= 30;
            return (
              <div key={key} className="rounded-xl border p-4"
                style={{ borderColor: expired ? '#fecaca' : expiring ? '#fde68a' : '#E5E7EB' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{meta.label}</p>
                  </div>
                  {meta.expiry && <ExpiryChip dateStr={meta.expiry} />}
                </div>
                {Object.entries(fields).filter(([k, v]) => v && k !== 'fileSelected' && k !== 'fileName').length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(fields).filter(([k, v]) => v && k !== 'fileSelected' && k !== 'fileName').map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
                          {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: '#1F2937' }}>
                          {typeof v === 'string' && v.includes('T') && !isNaN(Date.parse(v))
                            ? new Date(v).toLocaleDateString('en-IN') : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {fields.fileName && <p className="text-xs mt-2" style={{ color: '#38B763' }}>📎 {fields.fileName}</p>}
                {fields.url && (
                  <a href={fields.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs mt-2 flex items-center gap-1"
                    style={{ color: '#3B65DB' }}>
                    <Eye size={11} /> View uploaded document
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Pending verification modal ──────────────────────────────────────────────
function PendingVehicleModal({ vehicle, onClose, onApprove, onReject, actionLoading }) {
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const docs = vehicle.documents || {};
  const docEntries = Object.entries(docs);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
          maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1F2937' }}>
                Vehicle Verification — {vehicle.registrationNumber}
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {vehicle.makeModel} · {titleCase(vehicle.vehicleClass)} · {vehicle.seatingCapacity} seats
                {vehicle.year ? ` · ${vehicle.year}` : ''}
                {vehicle.colour ? ` · ${vehicle.colour}` : ''}
              </p>
            </div>
            <Badge tone="amber">PENDING VERIFICATION</Badge>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Owner driver info */}
          {vehicle.ownerDriver && (
            <div style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>SUBMITTED BY</p>
              <div style={{ display: 'flex', gap: 24 }}>
                <InfoItem label="Driver Name" value={vehicle.ownerDriver?.user?.name} />
                <InfoItem label="Phone"       value={vehicle.ownerDriver?.user?.phone} />
                <InfoItem label="Licence"     value={vehicle.ownerDriver?.licenceNumber} />
              </div>
            </div>
          )}

          {/* Uploaded documents */}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
            Uploaded Documents ({docEntries.length})
          </p>

          {docEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, backgroundColor: '#F9FAFB', borderRadius: 10, marginBottom: 16 }}>
              <FileText size={32} style={{ color: '#D1D5DB', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#6B7280' }}>No documents uploaded yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
              {docEntries.map(([docType, doc]) => (
                <a
                  key={docType}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden',
                    textDecoration: 'none', display: 'block',
                  }}
                >
                  <div style={{ height: 100, backgroundColor: '#F9FAFB', overflow: 'hidden' }}>
                    {doc.url ? (
                      <img src={doc.url} alt={docType}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <FileText size={28} style={{ color: '#D1D5DB' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#1F2937' }}>
                      {docType.replace(/_/g, ' ')}
                    </p>
                    {doc.uploadedAt && (
                      <p style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {formatDateTime(doc.uploadedAt)}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: '#3B65DB', marginTop: 2 }}>Click to open ↗</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Verification checklist hint */}
          <div style={{ backgroundColor: '#EEF2FF', borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#3730A3', marginBottom: 6 }}>Before approving, verify:</p>
            <ul style={{ fontSize: 12, color: '#4338CA', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Registration number matches the RC document</li>
              <li>Insurance is valid and not expired</li>
              <li>PUC certificate is current</li>
              <li>Vehicle photos show the correct vehicle</li>
              <li>Driver's name matches the RC owner (or NOC available)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="dangerOutline"
            icon={XCircle}
            loading={actionLoading === `reject-${vehicle.id}`}
            onClick={() => setRejectConfirm(true)}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            icon={CheckCircle}
            loading={actionLoading === `approve-${vehicle.id}`}
            onClick={() => onApprove(vehicle)}
          >
            Approve Vehicle
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={rejectConfirm}
        title="Reject this vehicle?"
        description={`${vehicle.registrationNumber} will be rejected. The driver will need to resubmit with correct documents.`}
        confirmLabel="Reject Vehicle"
        danger
        loading={actionLoading === `reject-${vehicle.id}`}
        onClose={() => setRejectConfirm(false)}
        onConfirm={() => { setRejectConfirm(false); onReject(vehicle); }}
      />
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

// ── Fleet vehicles tab (admin-managed) ──────────────────────────────────────
function FleetTab({ canManage }) {
  const list  = useResourceList(vehicleService, { filterDefaults: { status: '' }, sortBy: 'createdAt' });
  const [formOpen,     setFormOpen]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [deleting,     setDeleting]     = useState(null);
  const [docView,      setDocView]      = useState(null);
  const [deleteLoading,setDeleteLoading]= useState(false);
  const toast = useToast();

  const columns = [
    {
      key: 'registrationNumber', header: 'Reg. No.', sortable: true,
      render: (r) => <p style={{ fontWeight: 700, color: '#1F2937', fontFamily: 'monospace' }}>{r.registrationNumber}</p>,
    },
    {
      key: 'vehicle', header: 'Vehicle',
      render: (r) => (
        <div style={{ maxWidth: 200 }}>
          <p className="truncate" style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.makeModel || '—'}</p>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            {titleCase(r.vehicleClass)}{r.year ? ` · ${r.year}` : ''}{r.colour ? ` · ${r.colour}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'seatingCapacity', header: 'Seats', sortable: true,
      render: (r) => (
        <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#1F2937' }}>
          <Users size={13} style={{ color: '#6B7280' }} />{r.seatingCapacity}
        </span>
      ),
    },
    {
      key: 'odometerKm', header: 'Odometer',
      render: (r) => <span style={{ color: '#6B7280', fontSize: 13 }}>{Number(r.odometerKm || 0).toLocaleString('en-IN')} km</span>,
    },
    {
      key: 'compliance', header: 'Doc Status',
      render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); setDocView(r); }} className="focus-ring rounded">
          <ComplianceChips vehicle={r} />
        </button>
      ),
    },
    { key: 'insuranceExpiry', header: 'Insurance', render: (r) => <ExpiryChip dateStr={r.insuranceExpiry} /> },
    { key: 'pucExpiry',       header: 'PUC',        render: (r) => <ExpiryChip dateStr={r.pucExpiry} /> },
    { key: 'status',          header: 'Status',     render: (r) => <StatusBadge status={r.status} /> },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Shield} label="View documents"   onClick={(e) => { e.stopPropagation(); setDocView(r); }} />
          <IconButton icon={Pencil} label="Edit vehicle"     onClick={() => { setEditing(r); setFormOpen(true); }} />
          <IconButton icon={Trash2} label="Deactivate"       variant="danger" onClick={() => setDeleting(r)} />
        </div>
      ),
    }] : []),
  ];

  const handleSubmit = async (values) => {
    if (editing) {
      await vehicleService.update(editing.id, values);
      toast.success('Vehicle updated');
    } else {
      await vehicleService.create(values);
      toast.success('Vehicle added to fleet');
    }
    setEditing(null);
    list.reload();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await vehicleService.remove(deleting.id);
      toast.success('Vehicle deactivated');
      setDeleting(null);
      list.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const expiringVehicles = (list.rows || []).filter((v) => {
    const soonest = [v.insuranceExpiry, v.pucExpiry, v.permitExpiry, v.fitnessExpiry]
      .filter(Boolean).map((d) => getDaysUntil(d)).filter((d) => d !== null && d <= OTHER_DOCS_WARNING_DAYS);
    return soonest.length > 0;
  }).length;

  const insuranceExpiring = (list.rows || []).filter((v) => {
    const days = getDaysUntil(v.insuranceExpiry);
    return days !== null && days <= INSURANCE_WARNING_DAYS;
  });

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-3">
          <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Fleet Vehicle</Button>
        </div>
      )}

      {insuranceExpiring.length > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          <ShieldAlert size={17} className="shrink-0" />
          <span>
            <strong>{insuranceExpiring.length}</strong> vehicle{insuranceExpiring.length > 1 ? 's have' : ' has'} insurance expiring
            within {INSURANCE_WARNING_DAYS} days.
          </span>
        </div>
      )}
      {expiringVehicles > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          <AlertTriangle size={16} />
          {expiringVehicles} vehicle{expiringVehicles > 1 ? 's have' : ' has'} documents expiring within {OTHER_DOCS_WARNING_DAYS} days.
        </div>
      )}

      <FilterBar search={list.search} onSearchChange={list.onSearchChange}
        searchPlaceholder="Search registration number or make/model…"
        filters={[{
          name: 'status', value: list.filters.status,
          onChange: (v) => list.setFilter('status', v),
          placeholder: 'All statuses',
          options: Object.values(VEHICLE_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') })),
        }]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        sortBy={list.sortBy}
        sortDir={list.sortDir}
        onSort={list.onSort}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        emptyTitle="No vehicles yet"
        emptyDescription="Add fleet vehicles or approve driver-submitted vehicles from the Pending tab."
      />

      <VehicleFormDrawer open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing} onSubmit={handleSubmit} />
      <DocDetailModal open={!!docView} vehicle={docView} onClose={() => setDocView(null)} />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} danger title="Deactivate vehicle?" confirmLabel="Deactivate"
        description={`${deleting?.registrationNumber} will be deactivated and removed from dispatch.`}
      />
    </div>
  );
}

// ── Pending verification tab ─────────────────────────────────────────────────
// Shows vehicles submitted by drivers via the driver app, waiting for admin review.
// Backend: GET /admin/vehicles?verificationStatus=PENDING (or filter isActive=false)
// Approve: PATCH /admin/vehicles/:id { verificationStatus: 'VERIFIED', status: 'AVAILABLE', isActive: true }
// Reject:  PATCH /admin/vehicles/:id { verificationStatus: 'REJECTED' }
function PendingTab() {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewVehicle, setReviewVehicle] = useState(null);

  // Fetch vehicles with verificationStatus=PENDING
  // (driver-submitted vehicles start with isActive: false)
  const { data, status, error, refetch } = useApi(
    () => apiClient.get('/admin/vehicles', {
      params: { verificationStatus: 'PENDING', limit: 50, page: 1 }
    }),
    []
  );

  const pendingVehicles = data?.items ?? data?.data ?? [];

  async function approve(vehicle) {
    setActionLoading(`approve-${vehicle.id}`);
    try {
      await apiClient.patch(`/admin/vehicles/${vehicle.id}`, {
        verificationStatus: 'VERIFIED',
        status: 'AVAILABLE',
        isActive: true,
      });
      toast.success(`${vehicle.registrationNumber} approved — now available for dispatch`);
      setReviewVehicle(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Could not approve vehicle');
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(vehicle) {
    setActionLoading(`reject-${vehicle.id}`);
    try {
      await apiClient.patch(`/admin/vehicles/${vehicle.id}`, {
        verificationStatus: 'REJECTED',
      });
      toast.success(`${vehicle.registrationNumber} rejected`);
      setReviewVehicle(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Could not reject vehicle');
    } finally {
      setActionLoading(null);
    }
  }

  const columns = [
    {
      key: 'registrationNumber', header: 'Reg. No.',
      render: (r) => <p style={{ fontWeight: 700, color: '#1F2937', fontFamily: 'monospace' }}>{r.registrationNumber}</p>,
    },
    {
      key: 'vehicle', header: 'Vehicle',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.makeModel || '—'}</p>
          <p style={{ fontSize: 11, color: '#6B7280' }}>
            {titleCase(r.vehicleClass)} · {r.seatingCapacity} seats{r.year ? ` · ${r.year}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'driver', header: 'Submitted By',
      render: (r) => r.ownerDriver ? (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.ownerDriver.user?.name || '—'}</p>
          <p style={{ fontSize: 11, color: '#6B7280' }}>{r.ownerDriver.user?.phone}</p>
        </div>
      ) : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      key: 'documents', header: 'Documents',
      render: (r) => {
        const count = Object.keys(r.documents || {}).length;
        return count > 0
          ? <Badge tone="green">{count} uploaded</Badge>
          : <Badge tone="slate">None uploaded</Badge>;
      },
    },
    {
      key: 'createdAt', header: 'Submitted',
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" icon={Eye}
            onClick={() => setReviewVehicle(r)}>
            Review
          </Button>
          <Button size="sm" variant="primary" icon={CheckCircle}
            loading={actionLoading === `approve-${r.id}`}
            onClick={() => approve(r)}>
            Approve
          </Button>
          <Button size="sm" variant="dangerOutline" icon={XCircle}
            disabled={!!actionLoading}
            onClick={() => reject(r)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {pendingVehicles.length > 0 && (
        <Alert type="warning" className="mb-4">
          {pendingVehicles.length} vehicle{pendingVehicles.length > 1 ? 's' : ''} submitted by drivers
          {pendingVehicles.length > 1 ? ' are' : ' is'} waiting for verification.
          Click "Review" to view uploaded documents before approving.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={pendingVehicles}
        status={status}
        error={error}
        onRetry={refetch}
        emptyTitle="No pending vehicle submissions"
        emptyDescription="Vehicles submitted by drivers from the driver app will appear here for review."
      />

      {reviewVehicle && (
        <PendingVehicleModal
          vehicle={reviewVehicle}
          onClose={() => setReviewVehicle(null)}
          onApprove={approve}
          onReject={reject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const [tab, setTab] = useState('fleet');
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.VEHICLES_MANAGE);

  // Count pending vehicles for badge
  const { data: pendingData } = useApi(
    () => apiClient.get('/admin/vehicles', { params: { verificationStatus: 'PENDING', limit: 1, page: 1 } }),
    []
  );
  const pendingCount = pendingData?.pagination?.total ?? pendingData?.meta?.total ?? 0;

  const tabs = [
    { key: 'fleet',   label: 'Fleet Vehicles' },
    { key: 'pending', label: `Pending Verification${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Manage your fleet and review driver-submitted vehicle applications."
      />

      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring"
            style={{
              borderColor: tab === t.key ? '#3B65DB' : 'transparent',
              color:       tab === t.key ? '#3B65DB' : '#6B7280',
            }}>
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'fleet'   && <FleetTab canManage={canManage} />}
      {tab === 'pending' && <PendingTab />}
    </div>
  );
}
