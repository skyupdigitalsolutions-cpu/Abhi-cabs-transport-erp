import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, MapPin, Package, IndianRupee, Calendar, Phone,
  CheckCircle, XCircle, Truck, PlayCircle, ClipboardList, FileText, Navigation,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { bookingService, invoiceService, bookingOpsService, adminService } from '../../services';
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
import FormField from '../../components/ui/FormField';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSIONS, BOOKING_TRANSITIONS, BOOKING_STATUS } from '../../constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

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
// The backend's /admin/dispatch/bookings/:id/assign accepts an optional
// driverId, but there's no endpoint to list/pick from a driver roster yet
// (confirmed against dispatch.routes.js and admin.routes.js) — so this only
// offers a vehicle, using the real GET /admin/dispatch/vehicles endpoint.
function AssignModal({ open, onClose, onAssign }) {
  const [vehicleId, setVehicleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    if (!open) return;
    apiClient.get('/admin/dispatch/vehicles')
      .then((r) => setVehicles(r.vehicles || []));
  }, [open]);

  const submit = async () => {
    if (!vehicleId) return;
    setLoading(true);
    await onAssign(vehicleId);
    setLoading(false);
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
        <Alert type="info">Driver assignment isn't available yet — the backend doesn't expose a driver roster endpoint.</Alert>
      </div>
    </Modal>
  );
}

// ── Generate Invoice modal ─────────────────────────────────────────────────
function InvoiceModal({ open, onClose, booking, customerName, onGenerate }) {
  const [loading, setLoading] = useState(false);
  const baseFare = booking?.finalFare ?? booking?.estimatedFare ?? 0;
  const tax = Math.round(baseFare * 0.18);
  const total = baseFare + tax;

  const generate = async () => {
    setLoading(true);
    await onGenerate({ tax, total });
    setLoading(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Invoice" size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={loading} onClick={generate}>Generate Invoice</Button>
      </>}
    >
      {booking && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #F7F8FC' }}>
            <span style={{ color: '#6B7280' }}>Client</span>
            <span style={{ fontWeight: 600, color: '#1F2937' }}>{customerName}</span>
          </div>
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #F7F8FC' }}>
            <span style={{ color: '#6B7280' }}>Base fare</span>
            <span style={{ color: '#1F2937' }}>{formatCurrency(baseFare)}</span>
          </div>
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #F7F8FC' }}>
            <span style={{ color: '#6B7280' }}>GST (18%)</span>
            <span style={{ color: '#1F2937' }}>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold">
            <span style={{ color: '#1F2937' }}>Total</span>
            <span style={{ color: '#3B65DB' }}>{formatCurrency(total)}</span>
          </div>
          <Alert type="info">Invoice will be created in Draft status. You can issue it from the Invoices page.</Alert>
        </div>
      )}
    </Modal>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function BookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.BOOKINGS_MANAGE);

  const fetchBooking = useCallback(() => bookingService.get(bookingId), [bookingId]);
  const { data: booking, status, error, refetch, setData } = useApi(fetchBooking, [bookingId]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
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
      const updated = nextStatus === BOOKING_STATUS.CANCELLED
        ? await bookingOpsService.cancel(booking.id, { reason: 'Cancelled by admin' })
        : await bookingOpsService.transition(booking.id, nextStatus, extraData);
      setData(updated.booking || updated);
      toast.success(`Booking → ${nextStatus.replace('_', ' ')}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleAssign = async (vehicleId) => {
    setTransitioning(true);
    try {
      // The real endpoint returns { allocation }, not the full updated
      // booking — refetch the booking fresh so its status reflects the
      // new allocation correctly rather than guessing at a merge.
      await apiClient.post(`/admin/dispatch/bookings/${booking.id}/assign`, { vehicleId });
      toast.success('Vehicle assigned');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleGenerateInvoice = async ({ tax, total }) => {
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await invoiceService.create({
      invoiceNo,
      bookingId: booking.id,
      clientName: customerName,
      amount: fare,
      tax,
      total,
      status: 'DRAFT',
      type: 'TAX',
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    });
    setHasInvoice(true);
    toast.success(`Invoice ${invoiceNo} created as Draft`);
  };

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
                        onClick={() => cfg.needsAssign ? setAssignOpen(true) : transition(ns)}
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
                <Button
                  className="w-full"
                  variant="secondary"
                  icon={FileText}
                  disabled={hasInvoice}
                  onClick={() => setInvoiceOpen(true)}
                >
                  {hasInvoice ? 'Invoice Generated ✓' : 'Generate Invoice'}
                </Button>
                {hasInvoice && (
                  <button
                    className="w-full text-xs text-center focus-ring rounded"
                    style={{ color: '#3B65DB' }}
                    onClick={() => navigate('/admin/invoices')}
                  >
                    View in Invoices →
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} onAssign={handleAssign} />
      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} booking={booking} customerName={customerName} onGenerate={handleGenerateInvoice} />
    </div>
  );
}
