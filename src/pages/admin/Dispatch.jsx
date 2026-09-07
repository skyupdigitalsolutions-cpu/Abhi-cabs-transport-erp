import { useState, useCallback, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { apiClient } from '../../services/apiClient';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Radio } from 'lucide-react';

/**
 * Real backend contract (confirmed directly against dispatch.service.js /
 * dispatch.controller.js — not the mock/invented shape):
 *
 *   GET /admin/dispatch/board  →
 *     { pending: { count, bookings: [...] },
 *       live:    { count, trips:    [...] },
 *       vehicles:{ count, available:[...] } }
 *
 *   A "booking" here has: id, bookingNumber, status, vehicleClass, tripType,
 *   pickupAddress, dropAddress, pickupAt, returnAt, estimatedFare, cityId,
 *   customer.user.{ name, phone }  — NOT clientName/pickup/drop/fare/cargoType.
 *
 *   A "vehicle" here has: id, registrationNumber, vehicleClass, makeModel,
 *   seatingCapacity, status, cityId — NOT regNo/type/seater.
 *
 *   POST /admin/dispatch/bookings/:bookingId/assign  body: { vehicleId, driverId? }
 *   driverId is OPTIONAL — there is no backend endpoint to list/pick from a
 *   driver roster yet, so this screen only assigns a VEHICLE, matching what
 *   the API actually supports today.
 */
export default function Dispatch() {
  const toast = useToast();
  const { lastBookingEventId } = useAdminRealtimeContext();
  const [assignments, setAssignments] = useState({});
  const [assigning, setAssigning] = useState({});

  const board = useApi(() => apiClient.get('/admin/dispatch/board'), []);

  // A booking made on the customer website (or ERP) pings this board live —
  // refetch the instant one comes in so a new booking appears without the
  // dispatcher needing to manually reload the page.
  useEffect(() => {
    if (!lastBookingEventId) return;
    board.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBookingEventId]);

  const pendingBookings = board.data?.pending?.bookings || [];
  const availableVehicles = board.data?.vehicles?.available || [];

  const setAssignField = (bookingId, key, value) =>
    setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], [key]: value } }));

  const assign = useCallback(async (bookingId) => {
    const a = assignments[bookingId];
    if (!a?.vehicleId) {
      toast.error('Select a vehicle before assigning.');
      return;
    }
    setAssigning((p) => ({ ...p, [bookingId]: true }));
    try {
      await apiClient.post(`/admin/dispatch/bookings/${bookingId}/assign`, { vehicleId: a.vehicleId });
      setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], done: true } }));
      const vehicle = availableVehicles.find((v) => v.id === a.vehicleId);
      toast.success(`Vehicle ${vehicle?.registrationNumber || ''} assigned`);
      board.refetch();
    } catch (e) {
      toast.error(e.message || 'Assignment failed');
    } finally {
      setAssigning((p) => ({ ...p, [bookingId]: false }));
    }
  }, [assignments, availableVehicles, toast, board]);

  const autoAssign = useCallback(async (bookingId) => {
    setAssigning((p) => ({ ...p, [bookingId]: true }));
    try {
      await apiClient.post(`/admin/dispatch/bookings/${bookingId}/auto-assign`, {});
      setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], done: true } }));
      toast.success('Booking auto-assigned to the nearest available vehicle');
      board.refetch();
    } catch (e) {
      toast.error(e.message || 'No free vehicle available right now');
    } finally {
      setAssigning((p) => ({ ...p, [bookingId]: false }));
    }
  }, [toast, board]);

  if (board.status === 'loading') return <LoadingState label="Loading dispatch board…" />;
  if (board.status === 'error') return <ErrorState message={board.error?.message} onRetry={board.refetch} />;

  return (
    <div>
      <PageHeader
        title="Dispatch Board"
        description="Assign available vehicles to pending bookings. Driver assignment isn't available yet — the backend doesn't expose a driver roster endpoint, so a driver must currently be linked to a vehicle separately."
      />

      {pendingBookings.length === 0 ? (
        <Card>
          <EmptyState icon={Radio} title="Dispatch queue is clear" description="No pending bookings need assignment right now." />
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingBookings.map((b) => {
            const a = assignments[b.id] || {};
            const customerName = b.customer?.user?.name || 'Unknown customer';
            const customerPhone = b.customer?.user?.phone;
            return (
              <Card key={b.id} className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>{customerName}</p>
                    <StatusBadge status={a.done ? 'ALLOCATED' : b.status} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{b.bookingNumber}</span>
                  </div>
                  <p className="text-sm truncate" style={{ color: '#6B7280' }}>{b.pickupAddress} → {b.dropAddress}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {b.vehicleClass} · {b.tripType} · {formatCurrency(b.estimatedFare)} · {formatDateTime(b.pickupAt)}
                    {customerPhone ? ` · ${customerPhone}` : ''}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 lg:w-[420px]">
                  <Select
                    value={a.vehicleId || ''} placeholder="Assign vehicle" disabled={a.done}
                    onChange={(e) => setAssignField(b.id, 'vehicleId', e.target.value)}
                    options={availableVehicles.map((v) => ({
                      value: v.id,
                      label: `${v.registrationNumber} · ${v.makeModel} (${v.seatingCapacity} seats)`,
                    }))}
                  />
                  <Button
                    size="sm" disabled={a.done} loading={assigning[b.id]}
                    onClick={() => assign(b.id)} className="shrink-0"
                    style={a.done ? { backgroundColor: '#f0fdf4', color: '#38B763' } : {}}
                  >
                    {a.done ? '✓ Assigned' : 'Assign'}
                  </Button>
                  <Button
                    size="sm" variant="secondary" disabled={a.done} loading={assigning[b.id]}
                    onClick={() => autoAssign(b.id)} className="shrink-0"
                  >
                    Auto
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
