import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, AlertTriangle, CheckCircle, Clock, Shield, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import VehicleFormDrawer from '../../components/vehicle/VehicleFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { vehicleService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { VEHICLE_STATUS, PERMISSIONS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

// ── Expiry helpers ─────────────────────────────────────────────────────────
function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

// Purely client-side, computed from real vehicle data already fetched via
// GET /admin/vehicles — no backend change needed for either threshold
// below. Insurance gets its OWN, longer lead time (45 days) since renewing
// insurance typically takes longer to arrange than the other documents,
// which stay on the general 30-day compliance warning.
const INSURANCE_WARNING_DAYS = 45;
const OTHER_DOCS_WARNING_DAYS = 30;

function ExpiryChip({ dateStr }) {
  const days = getDaysUntil(dateStr);
  if (days === null) return <span style={{ color: '#6B7280', fontSize: 11 }}>—</span>;
  const expired = days < 0;
  const expiring = days <= 30;
  const color = expired ? '#EF4444' : expiring ? '#F59E0B' : '#38B763';
  const bg = expired ? '#fef2f2' : expiring ? '#fffbeb' : '#f0fdf4';
  const Icon = expired ? AlertTriangle : expiring ? Clock : CheckCircle;
  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: bg, color, display: 'inline-flex' }}>
      <Icon size={10} />
      {expired ? 'Expired' : expiring ? `${days}d` : 'Valid'}
    </div>
  );
}

// ── Document details modal — reads the real `documents` JSON field ─────────
function DocDetailModal({ open, vehicle, onClose }) {
  if (!vehicle) return null;
  const docs = vehicle.documents || {};
  const DOC_META = {
    rc: { label: 'Registration Certificate', icon: '📋' },
    insurance: { label: 'Insurance Policy', icon: '🛡️', expiry: vehicle.insuranceExpiry },
    puc: { label: 'Pollution Under Control', icon: '🌿', expiry: vehicle.pucExpiry },
    permit: { label: 'Vehicle Permit', icon: '🔑', expiry: vehicle.permitExpiry },
    fitness: { label: 'Fitness Certificate', icon: '📄', expiry: vehicle.fitnessExpiry },
  };
  const entries = Object.entries(DOC_META).filter(([key]) => docs[key] && Object.values(docs[key]).some(Boolean));

  return (
    <Modal open={open} onClose={onClose} title={`Documents — ${vehicle.registrationNumber}`} size="md"
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
      {entries.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: '#6B7280' }}>No documents on file yet. Edit the vehicle to add them.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, meta]) => {
            const fields = docs[key] || {};
            const days = getDaysUntil(meta.expiry);
            const expired = days !== null && days < 0;
            const expiring = days !== null && days >= 0 && days <= 30;
            return (
              <div key={key} className="rounded-xl border p-4" style={{ borderColor: expired ? '#fecaca' : expiring ? '#fde68a' : '#E5E7EB', backgroundColor: '#ffffff' }}>
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
                          {typeof v === 'string' && v.includes('T') && !isNaN(Date.parse(v)) ? new Date(v).toLocaleDateString('en-IN') : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {fields.fileName && <p className="text-xs mt-2" style={{ color: '#38B763' }}>📎 {fields.fileName}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Compliance summary chip for table ───────────────────────────────────────
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
        if (!c.date) return <span key={c.label} className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: '#F7F8FC', color: '#9CA3AF' }}>{c.label}</span>;
        const days = getDaysUntil(c.date);
        const color = days < 0 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#38B763';
        const bg = days < 0 ? '#fef2f2' : days <= 30 ? '#fffbeb' : '#f0fdf4';
        return <span key={c.label} className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: bg, color }}>{c.label}</span>;
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const list = useResourceList(vehicleService, { filterDefaults: { status: '' }, sortBy: 'createdAt' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [docView, setDocView] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.VEHICLES_MANAGE);

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
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{r.vehicleClass}{r.year ? ` · ${r.year}` : ''}{r.colour ? ` · ${r.colour}` : ''}</p>
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
        <button onClick={(e) => { e.stopPropagation(); setDocView(r); }} className="focus-ring rounded" title="View document details">
          <ComplianceChips vehicle={r} />
        </button>
      ),
    },
    { key: 'insuranceExpiry', header: 'Insurance', render: (r) => <ExpiryChip dateStr={r.insuranceExpiry} /> },
    { key: 'pucExpiry', header: 'PUC', render: (r) => <ExpiryChip dateStr={r.pucExpiry} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Shield} label="View documents" onClick={(e) => { e.stopPropagation(); setDocView(r); }} />
          <IconButton icon={Pencil} label="Edit vehicle" onClick={() => { setEditing(r); setFormOpen(true); }} />
          <IconButton icon={Trash2} label="Deactivate vehicle" variant="danger" onClick={() => setDeleting(r)} />
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
      toast.success('Vehicle added');
    }
    setEditing(null);
    list.reload();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      // Real DELETE is a soft-delete (physical deletion isn't offered) — the
      // vehicle stays in the database, just marked inactive.
      await vehicleService.remove(deleting.id);
      toast.success('Vehicle removed from fleet');
      setDeleting(null);
      list.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // General compliance warning — any of the 4 documents expiring within 30
  // days. Purely client-side from data already fetched; no backend needed.
  const expiringVehicles = (list.rows || []).filter((v) => {
    const soonest = [v.insuranceExpiry, v.pucExpiry, v.permitExpiry, v.fitnessExpiry]
      .filter(Boolean).map((d) => getDaysUntil(d)).filter((d) => d !== null && d <= OTHER_DOCS_WARNING_DAYS);
    return soonest.length > 0;
  }).length;

  // Insurance-specific warning — its own, longer 45-day lead time, called
  // out separately since renewing insurance often needs more advance
  // notice than the other three documents.
  const insuranceExpiringVehicles = (list.rows || []).filter((v) => {
    const days = getDaysUntil(v.insuranceExpiry);
    return days !== null && days <= INSURANCE_WARNING_DAYS;
  });
  const insuranceExpiringCount = insuranceExpiringVehicles.length;
  const insuranceAlreadyExpiredCount = insuranceExpiringVehicles.filter((v) => getDaysUntil(v.insuranceExpiry) < 0).length;

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Track your fleet — seating capacity, compliance dates, and vehicle class."
        actions={canManage && <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add vehicle</Button>}
      />

      {insuranceExpiringCount > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          <ShieldAlert size={17} className="shrink-0" />
          <span>
            <strong>{insuranceExpiringCount}</strong> vehicle{insuranceExpiringCount > 1 ? 's have' : ' has'} insurance
            {insuranceAlreadyExpiredCount > 0 && (
              <> — <strong>{insuranceAlreadyExpiredCount} already expired</strong></>
            )} expiring within {INSURANCE_WARNING_DAYS} days: {insuranceExpiringVehicles.slice(0, 3).map((v) => v.registrationNumber).join(', ')}
            {insuranceExpiringCount > 3 ? ` +${insuranceExpiringCount - 3} more` : ''}.
          </span>
        </div>
      )}

      {expiringVehicles > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          <AlertTriangle size={16} />
          {expiringVehicles} vehicle{expiringVehicles > 1 ? 's have' : ' has'} other documents (PUC/Permit/Fitness) expiring within {OTHER_DOCS_WARNING_DAYS} days.
        </div>
      )}

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search registration number or make/model…"
        filters={[{
          name: 'status',
          value: list.filters.status,
          onChange: (v) => list.setFilter('status', v),
          placeholder: 'All statuses',
          options: Object.values(VEHICLE_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) })),
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
        emptyDescription="Add vehicles to start tracking compliance and assigning trips."
      />

      <VehicleFormDrawer open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} initial={editing} onSubmit={handleSubmit} />
      <DocDetailModal open={!!docView} vehicle={docView} onClose={() => setDocView(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Deactivate vehicle?"
        confirmLabel="Deactivate"
        description={`${deleting?.registrationNumber} will be deactivated and removed from active dispatch. This is a soft delete — the record isn't permanently erased.`}
      />
    </div>
  );
}