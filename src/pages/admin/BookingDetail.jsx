import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, Package, IndianRupee, Calendar, Phone,
  CheckCircle, XCircle, Truck, PlayCircle, ClipboardList, FileText, Navigation,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { bookingService, bookingOpsService, adminService } from '../../services';
import { apiClient } from '../../services/apiClient';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSIONS, BOOKING_TRANSITIONS, BOOKING_STATUS } from '../../constants';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

// Helper: backend returns pickupAddress/dropAddress as { address: "..." } objects
function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || JSON.stringify(val);
}



// ── Transition config — label/icon per target status ───────────────────────
const TRANSITION_BTN = {
  [BOOKING_STATUS.CONFIRMED]: { label: 'Confirm Booking',  icon: CheckCircle, variant: 'primary' },
  [BOOKING_STATUS.ALLOCATED]: { label: 'Assign Driver',    icon: Truck,       variant: 'primary', needsAssign: true },
  [BOOKING_STATUS.EN_ROUTE]:  { label: 'Mark En Route',    icon: Navigation,  variant: 'primary' },
  [BOOKING_STATUS.ONGOING]:   { label: 'Start Trip',       icon: PlayCircle,  variant: 'primary' },
  [BOOKING_STATUS.COMPLETED]: { label: 'Complete Booking', icon: CheckCircle, variant: 'primary' },
  [BOOKING_STATUS.CANCELLED]: { label: 'Cancel Booking',   icon: XCircle,     variant: 'danger'  },
};

// ── Assign vehicle modal ────────────────────────────────────────────────────
// The backend's /admin/dispatch/bookings/:id/assign accepts { vehicleId,
// driverId } — driverId is optional (assignSchema in dispatch.schemas.js).
// A driver roster DOES exist (GET /admin/drivers, the same endpoint the
// Drivers page and Dispatch board already use) — the previous version of
// this modal claimed otherwise and only ever sent vehicleId, so a booking
// could be assigned a vehicle but never a driver from this screen.
function AssignModal({ open, onClose, onAssign }) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    if (!open) return;
    apiClient.get('/admin/dispatch/vehicles')
      .then((r) => setVehicles(r.vehicles || []));
    // Online + KYC-verified only — an offline or unverified driver can't
    // actually take the trip, so offering them here would just set up a
    // failed pickup. This mirrors the same filter Dispatch's own driver
    // suggestions use.
    apiClient.get('/admin/drivers', { params: { kycStatus: 'VERIFIED', status: 'online', limit: 100 } })
      .then((r) => setDrivers(r.data || r.items || []))
      .catch(() => setDrivers([]));
  }, [open]);

  const submit = async () => {
    if (!vehicleId) return;
    setLoading(true);
    await onAssign(vehicleId, driverId || undefined);
    setLoading(false);
    setDriverId('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign vehicle" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={loading} onClick={submit} disabled={!vehicleId}>Assign</Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Vehicle" required>
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="Select vehicle"
            options={vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} · ${v.makeModel} (${v.seatingCapacity} seats)` }))} />
        </FormField>
        <FormField label="Driver" hint="Optional — only online, KYC-verified drivers are listed.">
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)} placeholder="Select driver (optional)"
            options={drivers.map((d) => ({ value: d.userId, label: `${d.user?.name || 'Unnamed'} · ${d.user?.phone || ''}` }))} />
        </FormField>
        {drivers.length === 0 && (
          <Alert type="info">No online, KYC-verified drivers right now — you can still assign the vehicle and add a driver later via Reassign.</Alert>
        )}
      </div>
    </Modal>
  );
}



// ── Cancel modal — requires a real, typed reason ────────────────────────────
// Previously "Cancel Booking" called transition() straight away with a
// hardcoded reason: 'Cancelled by admin' baked into the code — every admin
// cancellation therefore stored that exact same generic string, forever,
// regardless of why it was actually cancelled. This asks for the real one.
function CancelModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancel booking" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Back</Button>
        <Button variant="danger" size="sm" loading={loading} onClick={submit}>Cancel booking</Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Reason for cancellation" hint="Shown on the booking record — be specific, this is what the customer and reports will see.">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation due to change of plans" />
        </FormField>
      </div>
    </Modal>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function BookingDetail() {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.BOOKINGS_MANAGE);

  const fetchBooking = useCallback(() => bookingService.get(bookingId), [bookingId]);
  const { data: booking, status, error, refetch, setData } = useApi(fetchBooking, [bookingId]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);

  useEffect(() => {
    if (!booking) return;
    adminService.getInvoiceForBooking(booking.id)
      .then((inv) => setHasInvoice(!!inv))
      .catch(() => setHasInvoice(false));
  }, [booking]);

  if (status === 'loading') return <LoadingState label="Loading booking…" />;
  if (status === 'error') return <ErrorState message={error?.status === 404 ? 'Booking not found.' : error?.message} onRetry={refetch} />;

  const nextStatuses = BOOKING_TRANSITIONS[booking.status] || [];

  // ── Transition handler — goes through bookingOpsService's dedicated
  // PATCH actions (confirm/allocate/en-route/start/complete/cancel), never
  // a generic PUT with a raw status field. ──────────────────────────────
  const transition = async (nextStatus, extraData = {}) => {
    setTransitioning(true);
    try {
      const updated = await bookingOpsService.transition(booking.id, nextStatus, extraData);
      setData(updated.booking || updated);
      toast.success(`Booking → ${nextStatus.replace('_', ' ')}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTransitioning(false);
    }
  };

  // Cancellation is its own flow (not a generic transition) because it needs
  // a real, admin-typed reason — see CancelModal above. This is also where
  // the request-body field name is fixed: it used to send { cancelledBy },
  // but the backend's adminCancelSchema expects `cancelledByType`
  // (confirmed in lifecycle.schemas.js) — cancelledBy was silently dropped
  // by Zod (unknown keys are stripped, not rejected), so the service was
  // always falling back to its own 'ADMIN' default anyway. Harmless for
  // this screen specifically (an admin cancelling should say ADMIN), but
  // the field name is fixed here for correctness rather than left wrong.
  const handleCancel = async (reason) => {
    try {
      const updated = await bookingOpsService.cancel(booking.id, { reason, cancelledByType: 'ADMIN' });
      setData(updated.booking || updated);
      toast.success('Booking cancelled');
    } catch (e) {
      toast.error(e.message);
      throw e; // keep the modal open on failure
    }
  };

  const handleAssign = async (vehicleId, driverId) => {
    setTransitioning(true);
    try {
      // The real endpoint returns { allocation }, not the full updated
      // booking — refetch the booking fresh so its status reflects the
      // new allocation correctly rather than guessing at a merge.
      await apiClient.post(`/admin/dispatch/bookings/${booking.id}/assign`, { vehicleId, driverId });
      toast.success(driverId ? 'Vehicle and driver assigned' : 'Vehicle assigned');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTransitioning(false);
    }
  };

  // Invoices are auto-generated by the backend when a booking is completed.
  // There is no manual create endpoint — mark Complete to trigger invoice generation.

  // Real field names confirmed against BOOKING_SELECT in src/models/booking.model.js:
  //   pickupAddress, dropAddress, vehicleClass, tripType, estimatedFare/finalFare,
  //   pickupAt, customer.user.{name, phone} — NOT pickup/drop/cargoType/weightTon/
  //   clientName/clientPhone/scheduledAt/assignedDriverName, which don't exist.
  const customerName = booking.customer?.user?.name || booking.corporate?.companyName || 'Unknown customer';
  const customerPhone = booking.customer?.user?.phone;
  const fare = booking.finalFare ?? booking.estimatedFare;

  const infoRows = [
    { icon: MapPin, label: 'Pickup', value: booking.pickupAddress },
    { icon: MapPin, label: 'Drop', value: booking.dropAddress },
    { icon: Package, label: 'Vehicle Class', value: `${booking.vehicleClass} · ${booking.tripType}` },
    { icon: IndianRupee, label: 'Fare', value: formatCurrency(fare) },
    { icon: Calendar, label: 'Pickup Time', value: formatDateTime(booking.pickupAt) },
    ...(customerPhone ? [{ icon: Phone, label: 'Customer Phone', value: customerPhone }] : []),
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Bookings', to: '/admin/bookings' }, { label: booking.id }]} />
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} className="mb-3 -ml-2">
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
              <div>
                <h2 className="font-bold text-lg" style={{ color: '#1F2937' }}>{customerName}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{booking.bookingNumber}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <dl className="grid sm:grid-cols-2 gap-4">
              {infoRows.map((r) => (
                <div key={r.label} className="flex items-start gap-2.5">
                  <r.icon size={15} style={{ color: '#6B7280' }} className="mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs" style={{ color: '#6B7280' }}>{r.label}</dt>
                    <dd className="text-sm font-semibold mt-0.5" style={{ color: '#1F2937' }}>{r.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>

          {/* FIX: the backend has always returned cancellationReason,
              cancelledAt, cancelledByType and cancellationFee for a
              cancelled booking (confirmed in BOOKING_SELECT) — this screen
              just never rendered any of them, so a cancelled booking looked
              identical to any other except for its status badge. */}
          {booking.status === BOOKING_STATUS.CANCELLED && (
            <Card style={{ borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: '#B91C1C' }}>
                <XCircle size={14} /> Cancellation details
              </h3>
              <dl className="space-y-2.5">
                <div>
                  <dt className="text-xs" style={{ color: '#7F1D1D' }}>Reason</dt>
                  <dd className="text-sm font-medium mt-0.5" style={{ color: '#1F2937' }}>
                    {booking.cancellationReason || 'No reason was recorded.'}
                  </dd>
                </div>
                <div className="flex gap-6 flex-wrap">
                  {booking.cancelledByType && (
                    <div>
                      <dt className="text-xs" style={{ color: '#7F1D1D' }}>Cancelled by</dt>
                      <dd className="text-sm font-medium mt-0.5" style={{ color: '#1F2937' }}>{titleCase(booking.cancelledByType)}</dd>
                    </div>
                  )}
                  {booking.cancelledAt && (
                    <div>
                      <dt className="text-xs" style={{ color: '#7F1D1D' }}>Cancelled at</dt>
                      <dd className="text-sm font-medium mt-0.5" style={{ color: '#1F2937' }}>{formatDateTime(booking.cancelledAt)}</dd>
                    </div>
                  )}
                  {Number(booking.cancellationFee) > 0 && (
                    <div>
                      <dt className="text-xs" style={{ color: '#7F1D1D' }}>Cancellation fee</dt>
                      <dd className="text-sm font-medium mt-0.5" style={{ color: '#1F2937' }}>{formatCurrency(booking.cancellationFee)}</dd>
                    </div>
                  )}
                </div>
              </dl>
            </Card>
          )}

          {(booking.statusHistory || []).length > 0 && (
            <Card>
              <h3 className="font-bold text-sm mb-4" style={{ color: '#1F2937' }}>
                <ClipboardList size={14} className="inline mr-1.5" style={{ color: '#6B7280' }} />
                Status History
              </h3>
              <ol className="border-l-2 pl-4 space-y-3" style={{ borderColor: '#E5E7EB' }}>
                {booking.statusHistory.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#3B65DB' }} />
                    <p className="text-xs font-semibold" style={{ color: '#1F2937' }}>
                      {h.from} → {h.to?.replace('_', ' ')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{formatDateTime(h.at)} · by {h.by}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {canManage && (
          <div className="space-y-3">
            <Card>
              <h3 className="font-bold text-sm mb-3" style={{ color: '#1F2937' }}>Actions</h3>

              {nextStatuses.length === 0 ? (
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  No further actions available for this booking.
                </p>
              ) : (
                <div className="space-y-2">
                  {nextStatuses.map((ns) => {
                    const cfg = TRANSITION_BTN[ns];
                    if (!cfg) return null;
                    return (
                      <Button
                        key={ns}
                        className="w-full"
                        variant={cfg.variant}
                        icon={cfg.icon}
                        loading={transitioning}
                        onClick={() => {
                          if (cfg.needsAssign) setAssignOpen(true);
                          else if (ns === BOOKING_STATUS.CANCELLED) setCancelOpen(true);
                          else transition(ns);
                        }}
                      >
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-bold text-sm mb-3" style={{ color: '#1F2937' }}>Finance</h3>
              <div className="space-y-2">
                {hasInvoice ? (
                  <Button
                    className="w-full"
                    variant="secondary"
                    icon={FileText}
                    onClick={() => navigate('/admin/invoices')}
                  >
                    View Invoice →
                  </Button>
                ) : (
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    Invoice is auto-generated by the backend when this booking is marked <strong>Completed</strong>.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} onAssign={handleAssign} />
      <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel} />
    </div>
  );
}
