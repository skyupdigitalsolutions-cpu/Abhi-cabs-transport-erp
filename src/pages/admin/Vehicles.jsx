import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, AlertTriangle, CheckCircle, Clock, Shield, XCircle, Eye, FileText, RotateCcw, PowerOff } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import Button        from '../../components/ui/Button';
import IconButton    from '../../components/ui/IconButton';
import PageTabs      from '../../components/ui/PageTabs';
import StatusBadge   from '../../components/ui/StatusBadge';
import Badge         from '../../components/ui/Badge';
import Alert         from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal         from '../../components/ui/Modal';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import VehicleFormDrawer, { fuelLabel } from '../../components/vehicle/VehicleFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { useApi }    from '../../hooks/useApi';
import { vehicleService } from '../../services';
import { apiClient } from '../../services/apiClient';
import { useToast }  from '../../hooks/useToast';
import { VEHICLE_STATUS, PERMISSIONS } from '../../constants';
import { useAuth }   from '../../hooks/useAuth';
import { formatDateTime, titleCase } from '../../utils/formatters';
import { VEHICLE_CLASSES } from '../../constants';

// Backend listVehiclesQuerySchema accepts:
//   search, status, vehicleClass, isActive, sortBy, order, page, limit
// ALL SERVER-SIDE.

const SORT_OPTIONS    = ['createdAt','registrationNumber','vehicleClass','status','odometerKm'];

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function ExpiryChip({ dateStr }) {
  const days = getDaysUntil(dateStr);
  if (days === null) return <span style={{ color: '#6B7280', fontSize: 12.5 }}>—</span>;
  const expired  = days < 0;
  const expiring = days <= 30;
  const color = expired ? '#EF4444' : expiring ? '#F59E0B' : '#38B763';
  const bg    = expired ? '#fef2f2' : expiring ? '#fffbeb' : '#f0fdf4';
  const Icon  = expired ? AlertTriangle : expiring ? Clock : CheckCircle;
  return (
    <div className="flex items-center gap-1 text-[12.5px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color, display: 'inline-flex' }}>
      <Icon size={10} />{expired ? 'Expired' : expiring ? `${days}d` : 'Valid'}
    </div>
  );
}

function ComplianceChips({ vehicle }) {
  const checks = [{ label:'INS',date:vehicle.insuranceExpiry },{ label:'PUC',date:vehicle.pucExpiry },{ label:'PMT',date:vehicle.permitExpiry },{ label:'FIT',date:vehicle.fitnessExpiry }];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {checks.map((c) => {
        if (!c.date) return <span key={c.label} className="text-[11.5px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: '#F7F8FC', color: '#9CA3AF' }}>{c.label}</span>;
        const days  = getDaysUntil(c.date);
        const color = days < 0 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#38B763';
        const bg    = days < 0 ? '#fef2f2' : days <= 30 ? '#fffbeb' : '#f0fdf4';
        return <span key={c.label} className="text-[11.5px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: bg, color }}>{c.label}</span>;
      })}
    </div>
  );
}

function DocDetailModal({ open, vehicle, onClose }) {
  if (!vehicle) return null;
  const docs = vehicle.documents || {};
  // FIX: the real uploaded file (from POST /admin/vehicles/:id/documents)
  // is stored at documents[docType] — uppercase, e.g. documents.INSURANCE —
  // while the reference sub-fields typed into the form (policy numbers,
  // issuing authorities) live at documents[cfg.key] — lowercase, e.g.
  // documents.insurance. This modal previously only ever read the lowercase
  // key, so `fields.url` was always undefined and "View document" never
  // appeared even after a real upload succeeded. Photo was also missing
  // entirely — it isn't a compliance document, so it never had reference
  // fields, only ever the uppercase-keyed uploaded file.
  const DOC_META = {
    rc:{ label:'Registration Certificate', icon:'📋', docType:'RC' },
    insurance:{ label:'Insurance Policy', icon:'🛡️', expiry:vehicle.insuranceExpiry, docType:'INSURANCE' },
    puc:{ label:'Pollution Under Control', icon:'🌿', expiry:vehicle.pucExpiry, docType:'PUC' },
    permit:{ label:'Vehicle Permit', icon:'🔑', expiry:vehicle.permitExpiry, docType:'PERMIT' },
    fitness:{ label:'Fitness Certificate', icon:'📄', expiry:vehicle.fitnessExpiry, docType:'FITNESS' },
    photo:{ label:'Vehicle Photo', icon:'📷', docType:'PHOTO' },
  };
  const entries = Object.entries(DOC_META).filter(([key, meta]) => {
    const hasReference = docs[key] && Object.values(docs[key]).some(Boolean);
    const hasUpload = docs[meta.docType]?.url;
    return hasReference || hasUpload;
  });
  return (
    <Modal open={open} onClose={onClose} title={`Documents — ${vehicle.registrationNumber}`} size="md" footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
      {entries.length === 0 ? <p className="text-sm text-center py-6" style={{ color: '#6B7280' }}>No documents on file yet.</p> : (
        <div className="space-y-3">
          {entries.map(([key, meta]) => {
            const fields = docs[key] || {};
            const uploaded = docs[meta.docType]; // { url, publicId, uploadedAt } — the real file
            const days = getDaysUntil(meta.expiry);
            const expired = days !== null && days < 0;
            const expiring = days !== null && days >= 0 && days <= 30;
            const referenceEntries = Object.entries(fields).filter(([k, v]) => v && k !== 'fileSelected' && k !== 'fileName');
            return (
              <div key={key} className="rounded-xl border p-4" style={{ borderColor: expired ? '#fecaca' : expiring ? '#fde68a' : '#E5E7EB' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2"><span className="text-xl">{meta.icon}</span><p className="text-sm font-bold" style={{ color: '#1F2937' }}>{meta.label}</p></div>
                  {meta.expiry && <ExpiryChip dateStr={meta.expiry} />}
                </div>
                {uploaded?.url && (
                  <a href={uploaded.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden mb-3" style={{ backgroundColor: '#F9FAFB', height: 120 }}>
                    <img src={uploaded.url} alt={meta.label} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </a>
                )}
                {referenceEntries.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {referenceEntries.map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: '#1F2937' }}>{typeof v === 'string' && v.includes('T') && !isNaN(Date.parse(v)) ? new Date(v).toLocaleDateString('en-IN') : String(v)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {uploaded?.url ? (
                  <a href={uploaded.url} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 flex items-center gap-1" style={{ color: '#3B65DB' }}><Eye size={11} /> View document{uploaded.uploadedAt ? ` · uploaded ${new Date(uploaded.uploadedAt).toLocaleDateString('en-IN')}` : ''}</a>
                ) : referenceEntries.length > 0 ? (
                  <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>Reference details on file — no file has been uploaded for this yet.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function PendingVehicleModal({ vehicle, onClose, onSetOperationalStatus, actionLoading }) {
  const [confirmInactive, setConfirmInactive] = useState(false);
  const docs = vehicle.documents || {};
  const docEntries = Object.entries(docs);
  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }} onClick={onClose}>
      <div style={{ backgroundColor:'#fff',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'90vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding:'20px 24px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div><h2 style={{ fontWeight:700,fontSize:18,color:'#1F2937' }}>Vehicle — {vehicle.registrationNumber}</h2><p style={{ fontSize:13,color:'#6B7280',marginTop:2 }}>{vehicle.makeModel} · {titleCase(vehicle.vehicleClass)}{vehicle.documents?.fuelType ? ` · ${fuelLabel(vehicle.documents.fuelType)}` : ''} · {vehicle.seatingCapacity} seats</p></div>
          <Badge tone="slate">Operational: {titleCase(vehicle.status)}</Badge>
        </div>
        <div style={{ padding:'20px 24px' }}>
          {/* Submitted-by driver info would come from the VehicleClaim relation — no
              existing admin endpoint returns it, so this is honestly omitted rather
              than shown as blank/guessed. */}
          <p style={{ fontSize:13,fontWeight:600,color:'#374151',marginBottom:10 }}>Documents ({docEntries.length})</p>
          {docEntries.length === 0 ? (
            <div style={{ textAlign:'center',padding:24,backgroundColor:'#F9FAFB',borderRadius:10,marginBottom:16 }}>
              <FileText size={32} style={{ color:'#D1D5DB',margin:'0 auto 8px' }} />
              <p style={{ fontSize:13,color:'#6B7280' }}>No documents uploaded</p>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:16 }}>
              {docEntries.map(([docType, doc]) => (
                <a key={docType} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ border:'1px solid #E5E7EB',borderRadius:10,overflow:'hidden',textDecoration:'none',display:'block' }}>
                  <div style={{ height:100,backgroundColor:'#F9FAFB',overflow:'hidden' }}>
                    {doc.url ? <img src={doc.url} alt={docType} style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%' }}><FileText size={28} style={{ color:'#D1D5DB' }} /></div>}
                  </div>
                  <div style={{ padding:'6px 8px' }}>
                    <p style={{ fontSize: 12.5,fontWeight:600,color:'#1F2937' }}>{docType.replace(/_/g,' ')}</p>
                    {doc.uploadedAt && <p style={{ fontSize: 11.5,color:'#9CA3AF' }}>{formatDateTime(doc.uploadedAt)}</p>}
                    <p style={{ fontSize: 11.5,color:'#3B65DB',marginTop:2 }}>Click to open ↗</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Verification — honestly unavailable. Do not present an action here
              that implies the backend actually verifies this vehicle. */}
          <div style={{ backgroundColor:'#FFFBEB',borderRadius:10,padding:'14px 16px',marginBottom:16,border:'1px solid #FDE68A' }}>
            <p style={{ fontSize:13,fontWeight:700,color:'#92400E',marginBottom:6 }}>⚠ Vehicle Verification</p>
            <p style={{ fontSize: 13.5,color:'#92400E',lineHeight:1.6 }}>
              Verification approval is currently unavailable because the existing backend does not
              provide a vehicle verification/claim approval API. Please complete verification once
              the backend capability is available. This vehicle cannot be marked dispatch-ready from
              here.
            </p>
          </div>

          {/* Operational status — a real, existing, separate capability. Not a
              verification decision; only changes fleet availability. */}
          <div style={{ backgroundColor:'#F9FAFB',borderRadius:10,padding:'14px 16px' }}>
            <p style={{ fontSize: 13.5,fontWeight:600,color:'#374151',marginBottom:8 }}>Operational Status (fleet availability only)</p>
            <div style={{ display:'flex',gap:10 }}>
              <Button variant="dangerOutline" icon={XCircle} loading={actionLoading === `inactive-${vehicle.id}`} onClick={() => setConfirmInactive(true)}>Keep Inactive</Button>
              <Button variant="primary" icon={CheckCircle} loading={actionLoading === `active-${vehicle.id}`} onClick={() => onSetOperationalStatus(vehicle, true)}>Mark Active in Fleet</Button>
            </div>
          </div>
        </div>
        <div style={{ padding:'16px 24px',borderTop:'1px solid #F3F4F6',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
      <ConfirmDialog open={confirmInactive} title="Keep this vehicle inactive?" description={`${vehicle.registrationNumber} will remain out of the active fleet. This does not reject its verification, which is not tracked here.`} confirmLabel="Keep Inactive" danger loading={actionLoading === `inactive-${vehicle.id}`} onClose={() => setConfirmInactive(false)} onConfirm={() => { setConfirmInactive(false); onSetOperationalStatus(vehicle, false); }} />
    </div>
  );
}

// ── Fleet tab ─────────────────────────────────────────────────────────────────
function FleetTab({ canManage, canDelete }) {
  const toast = useToast();
  // Server-side filters: status, vehicleClass, search, sortBy, order
  const list  = useResourceList(vehicleService, {
    filterDefaults: { status: '', vehicleClass: '', isActive: '' },
    sortBy: 'createdAt',
    sortDir: 'desc',
    limit: 10,
  });
  const [formOpen,      setFormOpen]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [docView,       setDocView]       = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [purging,       setPurging]       = useState(null);  // vehicle pending PERMANENT delete
  const [purgeLoading,  setPurgeLoading]  = useState(false);
  const [detailLoading, setDetailLoading] = useState(null); // vehicle id currently being fetched

  // FIX: the vehicles LIST endpoint doesn't include the `documents` field at
  // all (confirmed against VEHICLE_SELECT on the backend — only the
  // single-vehicle GET /admin/vehicles/:id already includes it). So opening
  // Edit or Docs straight from a list row always showed stale/empty
  // reference fields and no uploaded file, no matter what was actually
  // saved — the list row genuinely never had that data to show. This
  // fetches the real, full detail first, using an endpoint that already
  // works today, rather than waiting on a backend change to the list.
  const openEdit = async (row) => {
    setDetailLoading(row.id);
    try {
      const full = await vehicleService.get(row.id);
      setEditing(full);
      setFormOpen(true);
    } catch (e) {
      toast.error(e.message || 'Could not load vehicle details');
    } finally {
      setDetailLoading(null);
    }
  };

  const openDocs = async (row) => {
    setDetailLoading(row.id);
    try {
      const full = await vehicleService.get(row.id);
      setDocView(full);
    } catch (e) {
      toast.error(e.message || 'Could not load vehicle documents');
    } finally {
      setDetailLoading(null);
    }
  };

  const columns = [
    { key: 'registrationNumber', header: 'Reg. No.', sortable: true, render: (r) => <p style={{ fontWeight: 700, color: '#1F2937', fontFamily: 'monospace' }}>{r.registrationNumber}</p> },
    { key: 'vehicle', header: 'Vehicle', render: (r) => (<div style={{ maxWidth: 200 }}><p className="truncate" style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.makeModel || '—'}</p><p style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{titleCase(r.vehicleClass)}{r.documents?.fuelType ? ` · ${fuelLabel(r.documents.fuelType)}` : ''}{r.year ? ` · ${r.year}` : ''}</p></div>) },
    { key: 'seatingCapacity', header: 'Seats', sortable: true, render: (r) => <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#1F2937' }}><Users size={13} style={{ color: '#6B7280' }} />{r.seatingCapacity}</span> },
    { key: 'odometerKm', header: 'Odometer', sortable: true, render: (r) => <span style={{ color: '#6B7280', fontSize: 13 }}>{Number(r.odometerKm || 0).toLocaleString('en-IN')} km</span> },
    { key: 'compliance', header: 'Doc Status', render: (r) => <button onClick={(e) => { e.stopPropagation(); openDocs(r); }} disabled={detailLoading === r.id} className="focus-ring rounded"><ComplianceChips vehicle={r} /></button> },
    { key: 'insuranceExpiry', header: 'Insurance', render: (r) => <ExpiryChip dateStr={r.insuranceExpiry} /> },
    { key: 'pucExpiry', header: 'PUC', render: (r) => <ExpiryChip dateStr={r.pucExpiry} /> },
    { key: 'status', header: 'Operational Status', render: (r) => <StatusBadge status={r.status} /> },
    // NOTE: the always-"Not available" Verification column was removed from the
    // fleet list — the backend exposes no verification field here, so it only
    // ever showed a dead placeholder while widening the table enough to push the
    // row actions (including Delete) off-screen behind horizontal scroll.
    ...(canManage ? [{ key: 'actions', header: '', className: 'text-right', render: (r) => (<div className="flex justify-end gap-1"><IconButton icon={Shield} label="Docs" onClick={(e) => { e.stopPropagation(); openDocs(r); }} disabled={detailLoading === r.id} /><IconButton icon={Pencil} label="Edit" onClick={() => openEdit(r)} disabled={detailLoading === r.id} />{r.isActive === false || r.status === 'INACTIVE'
            ? <IconButton icon={RotateCcw} label="Activate" onClick={() => handleActivate(r)} />
            : <IconButton icon={PowerOff} label="Deactivate" onClick={() => setDeleting(r)} />}
            {/* Delete is now visible to every fleet manager, not just admins.
                Permanent erase is an ADMIN-only backend capability, so admins get
                the real permanent-delete dialog; anyone else gets deactivate
                (remove from fleet, records kept) — the strongest removal their
                role is allowed to perform. */}
            <IconButton icon={Trash2} label={canDelete ? 'Delete permanently' : 'Delete (remove from fleet)'} variant="danger" onClick={() => (canDelete ? setPurging(r) : setDeleting(r))} /></div>) }] : []),
  ];

  const handleSubmit = async (values) => {
    // crudFactory's create/update don't unwrap a single-resource envelope
    // the way .get() does — the real backend returns { vehicle: {...} }, so
    // without this, `result.id` would be undefined even though the vehicle
    // was created successfully. Handled locally rather than changing the
    // shared crudFactory, since other resources built on it haven't been
    // re-checked for the same assumption.
    let result;
    if (editing) { result = await vehicleService.update(editing.id, values); toast.success('Vehicle updated'); }
    else         { result = await vehicleService.create(values);             toast.success('Vehicle added'); }
    const vehicle = result?.vehicle || result;
    setEditing(null);
    // FIX: list.reload() used to fire right here — BEFORE any selected
    // document/photo actually finished uploading (those uploads run inside
    // VehicleFormDrawer, after this function returns). So the list always
    // refreshed one step too early: it showed the vehicle with no
    // compliance dates and no photo, since the uploads that set those
    // hadn't completed yet, and nothing reloaded a second time afterward —
    // an admin had to leave the page and come back to see real data. Reload
    // now happens in onClose instead, which VehicleFormDrawer only calls
    // once everything (vehicle save + every upload) is actually finished.
    // Returned so VehicleFormDrawer knows the vehicle's real id — needed to
    // upload any documents/photo selected on the Documents tab, since that
    // upload hits /admin/vehicles/:id/documents and a brand-new vehicle has
    // no id until this create call actually returns one.
    return vehicle;
  };
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await vehicleService.remove(deleting.id);
      toast.success('Vehicle deactivated');
      list.reload();
    } catch (e) {
      // The backend refuses while the vehicle is ASSIGNED to a driver or ON_TRIP
      // (VEHICLE_IN_USE). Say what to do about it instead of a bare error.
      toast.error(
        e?.code === 'VEHICLE_IN_USE'
          ? `${deleting?.registrationNumber} is ${String(deleting?.status || 'in use').replace('_', ' ').toLowerCase()} and can't be deactivated yet. Unassign it from the driver / finish the trip first.`
          : (e?.message || 'Could not deactivate the vehicle')
      );
    } finally {
      // Close the dialog either way — leaving it open after an error looked like the button did nothing.
      setDeleteLoading(false);
      setDeleting(null);
    }
  };

  // PERMANENT delete (ADMIN only). The backend refuses while the vehicle is on
  // a job, and refuses for good once it has ever been dispatched, because its
  // trip records must stay readable. Both cases point the admin at Deactivate.
  const handlePurge = async () => {
    const v = purging;
    setPurgeLoading(true);
    try {
      await vehicleService.destroy(v.id);
      toast.success(`${v.registrationNumber} permanently deleted`);
      list.reload();
    } catch (e) {
      if (e?.code === 'VEHICLE_IN_USE') {
        toast.error(`${v.registrationNumber} is on a job right now. Finish the trip or unassign the driver first.`);
      } else if (e?.code === 'VEHICLE_HAS_HISTORY') {
        toast.error(`${v.registrationNumber} has trip history, so it can't be erased. Deactivate it instead — that removes it from dispatch and keeps the records.`);
      } else if (e?.status === 403) {
        toast.error('Only an admin can permanently delete a vehicle.');
      } else {
        toast.error(e?.message || 'Could not delete the vehicle');
      }
    } finally {
      setPurgeLoading(false);
      setPurging(null);
    }
  };

  // Bring a deactivated vehicle back into the fleet (same call the Inactive tab uses).
  const handleActivate = async (vehicle) => {
    try {
      await apiClient.patch(`/admin/vehicles/${vehicle.id}`, { status: 'AVAILABLE', isActive: true });
      toast.success(`${vehicle.registrationNumber} activated`);
      list.reload();
    } catch (e) { toast.error(e?.message || 'Could not activate the vehicle'); }
  };

  const expiringCount = (list.rows || []).filter((v) => [v.insuranceExpiry, v.pucExpiry, v.permitExpiry, v.fitnessExpiry].filter(Boolean).some((d) => { const days = getDaysUntil(d); return days !== null && days <= 30; })).length;

  return (
    <div>
      {canManage && <div className="flex justify-end mb-3"><Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Fleet Vehicle</Button></div>}
      {expiringCount > 0 && <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}><AlertTriangle size={16} />{expiringCount} vehicle{expiringCount > 1 ? 's have' : ' has'} documents expiring within 30 days.</div>}
      <FilterBar
        search={list.search} onSearchChange={list.onSearchChange}
        searchPlaceholder="Search registration number or make/model…"
        filters={[
          { name: 'status', value: list.filters.status, onChange: (v) => list.setFilter('status', v), placeholder: 'All statuses', options: Object.values(VEHICLE_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') })) },
          { name: 'vehicleClass', value: list.filters.vehicleClass, onChange: (v) => list.setFilter('vehicleClass', v), placeholder: 'All classes', options: VEHICLE_CLASSES.map((c) => ({ value: c, label: titleCase(c) })) },
          { name: 'isActive', value: list.filters.isActive, onChange: (v) => list.setFilter('isActive', v), placeholder: 'Active & inactive', options: [{ value: 'true', label: 'Active only' }, { value: 'false', label: 'Inactive only' }] },
          { name: 'sortBy', value: list.sortBy, onChange: (v) => list.onSort(v, list.sortDir), placeholder: 'Sort by', options: SORT_OPTIONS.map((s) => ({ value: s, label: titleCase(s.replace(/([A-Z])/g, ' $1')) })) },
        ]}
      />
      <DataTable columns={columns} rows={list.rows} status={list.status} error={list.error} onRetry={list.refetch}
        sortBy={list.sortBy} sortDir={list.sortDir} onSort={list.onSort}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total} totalPages={list.meta?.totalPages} onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        emptyTitle="No vehicles found" emptyDescription="Try adjusting your filters." />
      <VehicleFormDrawer open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); list.reload(); }} initial={editing} onSubmit={handleSubmit} />
      <DocDetailModal open={!!docView} vehicle={docView} onClose={() => setDocView(null)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading} danger title="Deactivate vehicle?" confirmLabel="Deactivate" description={`${deleting?.registrationNumber} will be deactivated.`} />
      <ConfirmDialog open={!!purging} onClose={() => setPurging(null)} onConfirm={handlePurge} loading={purgeLoading} danger
        title="Delete vehicle permanently?" confirmLabel="Delete permanently"
        description={`${purging?.registrationNumber || 'This vehicle'} will be removed from the system for good and can't be restored. This only works for a vehicle that has never been dispatched on a trip; otherwise use Deactivate.`} />
    </div>
  );
}

// ── Pending tab ───────────────────────────────────────────────────────────────
// NOTE ON HONESTY: the backend has no verificationStatus filter or field on
// /admin/vehicles (see VEHICLE_SELECT in vehicle.service.js — it only returns
// operational fields: status, isActive, etc.). This tab uses status=INACTIVE
// + isActive=false purely as the closest available PROXY for "not yet in
// active fleet use" — it is NOT the same thing as verification, and is
// labelled accordingly throughout. There is also no VehicleClaim approval
// endpoint anywhere, so approving/rejecting an actual verification decision
// is not possible from this dashboard at all right now.
function PendingTab() {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewVehicle, setReviewVehicle] = useState(null);

  const { data, status, error, refetch } = useApi(
    () => apiClient.get('/admin/vehicles', { params: { status: 'INACTIVE', isActive: 'false', limit: 50, page: 1 } }),
    []
  );
  const pendingVehicles = data?.data ?? data?.items ?? [];

  // Changes ONLY the operational status/availability flag — a real, existing
  // backend capability. This intentionally does NOT call itself "approve" or
  // "reject": it has no effect on verificationStatus or any VehicleClaim,
  // and does not make the vehicle dispatch-ready.
  async function setOperationalStatus(vehicle, active) {
    const key = active ? `active-${vehicle.id}` : `inactive-${vehicle.id}`;
    setActionLoading(key);
    try {
      await apiClient.patch(`/admin/vehicles/${vehicle.id}`, active ? { status: 'AVAILABLE', isActive: true } : { status: 'INACTIVE', isActive: false });
      toast.success(active ? `${vehicle.registrationNumber} marked active in fleet` : `${vehicle.registrationNumber} kept inactive`);
      setReviewVehicle(null); refetch();
    } catch (e) { toast.error(e.message || 'Could not update operational status'); }
    finally { setActionLoading(null); }
  }

  const columns = [
    { key: 'registrationNumber', header: 'Reg. No.', render: (r) => <p style={{ fontWeight: 700, color: '#1F2937', fontFamily: 'monospace' }}>{r.registrationNumber}</p> },
    { key: 'vehicle', header: 'Vehicle', render: (r) => (<div><p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.makeModel || '—'}</p><p style={{ fontSize: 12.5, color: '#6B7280' }}>{titleCase(r.vehicleClass)} · {r.seatingCapacity} seats</p></div>) },
    { key: 'driver', header: 'Submitted By', render: () => <span style={{ color: '#9CA3AF', fontSize: 13.5 }}>Not available</span> },
    { key: 'verification', header: 'Verification', render: () => <Badge tone="slate">Not available</Badge> },
    { key: 'documents', header: 'Documents', render: (r) => { const count = Object.keys(r.documents || {}).length; return count > 0 ? <Badge tone="green">{count} uploaded</Badge> : <Badge tone="slate">None</Badge>; } },
    { key: 'createdAt', header: 'Submitted', render: (r) => formatDateTime(r.createdAt) },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (<div className="flex gap-2 justify-end"><Button size="sm" variant="secondary" icon={Eye} onClick={() => setReviewVehicle(r)}>Review</Button></div>) },
  ];

  return (
    <div>
      <Alert type="warning" className="mb-4">
        Vehicle verification approval is currently unavailable because the existing backend does not
        provide a vehicle verification/claim approval API. The list below is filtered by operational
        status as the closest available proxy, not a real verification queue.
      </Alert>
      <DataTable columns={columns} rows={pendingVehicles} status={status} error={error} onRetry={refetch} emptyTitle="No inactive vehicles" emptyDescription="Vehicles submitted from the driver app will appear here." />
      {reviewVehicle && <PendingVehicleModal vehicle={reviewVehicle} onClose={() => setReviewVehicle(null)} onSetOperationalStatus={setOperationalStatus} actionLoading={actionLoading} />}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const [tab, setTab] = useState('fleet');
  const { hasPermission, isAdmin } = useAuth();
  const canManage = hasPermission(PERMISSIONS.VEHICLES_MANAGE);
  // Permanent delete is ADMIN-only on the backend (requireRole('ADMIN')),
  // stricter than VEHICLE_MANAGE, which FLEET staff also hold.
  const canDelete = canManage && isAdmin;
  const { data: pendingData } = useApi(() => apiClient.get('/admin/vehicles', { params: { status: 'INACTIVE', isActive: 'false', limit: 1, page: 1 } }), []);
  const pendingCount = pendingData?.meta?.total ?? pendingData?.pagination?.total ?? 0;

  const tabs = [
    { key: 'fleet',   label: 'Fleet Vehicles' },
    { key: 'pending', label: 'Inactive Vehicles', badge: pendingCount },
  ];

  return (
    <div>
      <PageHeader title="Vehicles" description="Manage your fleet and review driver-submitted vehicle applications." />
      <PageTabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'fleet'   && <FleetTab canManage={canManage} canDelete={canDelete} />}
      {tab === 'pending' && <PendingTab />}
    </div>
  );
}
