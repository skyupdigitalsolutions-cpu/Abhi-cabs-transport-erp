import { useState, useCallback, useEffect } from 'react';
import { Truck, Radio, AlertCircle, User, RefreshCw } from 'lucide-react';
import PageHeader   from '../../components/ui/PageHeader';
import Card         from '../../components/ui/Card';
import Select       from '../../components/ui/Select';
import Button       from '../../components/ui/Button';
import StatusBadge  from '../../components/ui/StatusBadge';
import EmptyState   from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState   from '../../components/ui/ErrorState';
import Badge        from '../../components/ui/Badge';
import { useApi }   from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { apiClient } from '../../services/apiClient';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

export default function Dispatch() {
  const toast = useToast();
  const { lastBookingEventId } = useAdminRealtimeContext();

  // { bookingId → { vehicleId, driverId, done, reassigning } }
  const [assignments, setAssignments] = useState({});
  const [assigning,   setAssigning]   = useState({});

  const board = useApi(() => apiClient.get('/admin/dispatch/board'), []);

  // Load available VERIFIED drivers (online + kycStatus=VERIFIED)
  // GET /admin/drivers?kycStatus=VERIFIED&status=online&limit=100
  const driversApi = useApi(
    () => apiClient.get('/admin/drivers', {
      params: { kycStatus: 'VERIFIED', limit: 100, page: 1 },
    }),
    []
  );

  useEffect(() => {
    if (!lastBookingEventId) return;
    board.refetch();
  }, [lastBookingEventId]);

  const pendingBookings   = board.data?.pending?.bookings || [];
  const liveTrips         = board.data?.live?.trips || [];
  // Backend returns { vehicles: { count, vehicles: [...] } }
  const availableVehicles = board.data?.vehicles?.vehicles || [];

  // All verified drivers — admin can assign even offline ones for pre-assignment
  const allDrivers = driversApi.data?.items ?? driversApi.data?.data ?? [];
  // Online drivers first, then offline — for sorting in dropdown
  const sortedDrivers = [...allDrivers].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

  // vehicleIds already assigned this session — prevent double-assign
  const assignedVehicleIds = new Set(
    Object.values(assignments).filter((a) => a.done).map((a) => a.vehicleId)
  );

  // driverIds already assigned this session
  const assignedDriverIds = new Set(
    Object.values(assignments).filter((a) => a.done && a.driverId).map((a) => a.driverId)
  );

  // Vehicles matching booking's class and not yet assigned this session
  function vehiclesForBooking(booking) {
    return availableVehicles.filter((v) => {
      if (assignedVehicleIds.has(v.id)) return false;
      if (booking.vehicleClass && v.vehicleClass !== booking.vehicleClass) return false;
      return true;
    });
  }

  // Drivers not yet assigned this session
  function driversForBooking(bookingId) {
    return sortedDrivers.filter((d) => !assignedDriverIds.has(d.userId));
  }

  const setField = (bookingId, key, value) =>
    setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], [key]: value } }));

  // ── Assign new booking ───────────────────────────────────────────────────
  const assign = useCallback(async (bookingId) => {
    const a = assignments[bookingId];
    if (!a?.vehicleId) { toast.error('Select a vehicle before assigning.'); return; }
    setAssigning((p) => ({ ...p, [bookingId]: true }));
    try {
      await apiClient.post(`/admin/dispatch/bookings/${bookingId}/assign`, {
        vehicleId: a.vehicleId,
        ...(a.driverId ? { driverId: a.driverId } : {}),
      });
      setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], done: true } }));
      const vehicle = availableVehicles.find((v) => v.id === a.vehicleId);
      const driver  = sortedDrivers.find((d) => d.userId === a.driverId);
      toast.success(
        `${vehicle?.registrationNumber || 'Vehicle'} assigned` +
        (driver ? ` to ${driver.user?.name}` : '')
      );
      setTimeout(() => board.refetch(), 800);
    } catch (e) {
      toast.error(e.message || 'Assignment failed');
    } finally {
      setAssigning((p) => ({ ...p, [bookingId]: false }));
    }
  }, [assignments, availableVehicles, sortedDrivers, toast, board]);

  // ── Reassign allocated booking (driver on leave / swap) ─────────────────
  const reassign = useCallback(async (bookingId) => {
    const a = assignments[bookingId];
    if (!a?.vehicleId && !a?.driverId) {
      toast.error('Select a new vehicle or driver to reassign.');
      return;
    }
    setAssigning((p) => ({ ...p, [bookingId]: true }));
    try {
      await apiClient.patch(`/admin/dispatch/bookings/${bookingId}/reassign`, {
        ...(a.vehicleId ? { vehicleId: a.vehicleId } : {}),
        ...(a.driverId  ? { driverId:  a.driverId  } : {}),
      });
      setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], done: true } }));
      toast.success('Booking reassigned successfully');
      setTimeout(() => board.refetch(), 800);
    } catch (e) {
      toast.error(e.message || 'Reassignment failed');
    } finally {
      setAssigning((p) => ({ ...p, [bookingId]: false }));
    }
  }, [assignments, toast, board]);

  const autoAssign = useCallback(async (bookingId) => {
    setAssigning((p) => ({ ...p, [bookingId]: true }));
    try {
      await apiClient.post(`/admin/dispatch/bookings/${bookingId}/auto-assign`, {});
      setAssignments((p) => ({ ...p, [bookingId]: { ...p[bookingId], done: true } }));
      toast.success('Auto-assigned to nearest available vehicle');
      setTimeout(() => board.refetch(), 800);
    } catch (e) {
      toast.error(e.message || 'No matching vehicle available right now');
    } finally {
      setAssigning((p) => ({ ...p, [bookingId]: false }));
    }
  }, [toast, board]);

  if (board.status === 'loading') return <LoadingState label="Loading dispatch board…" />;
  if (board.status === 'error')   return <ErrorState message={board.error?.message} onRetry={board.refetch} />;

  return (
    <div>
      <PageHeader
        title="Dispatch Board"
        description="Assign vehicles and drivers to bookings. Only available vehicles matching the booking class are shown."
        actions={
          <div className="flex items-center gap-3">
            {availableVehicles.length > 0 && (
              <Badge tone="green">{availableVehicles.length} vehicle{availableVehicles.length > 1 ? 's' : ''} available</Badge>
            )}
            {liveTrips.length > 0 && (
              <Badge tone="blue">{liveTrips.length} live trip{liveTrips.length > 1 ? 's' : ''}</Badge>
            )}
            <button onClick={() => { board.refetch(); driversApi.refetch(); }}
              className="text-xs font-medium flex items-center gap-1" style={{ color: '#3B65DB' }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        }
      />

      {/* No vehicles warning */}
      {availableVehicles.length === 0 && pendingBookings.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4"
          style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <AlertCircle size={16} style={{ color: '#92400E', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>No vehicles currently available</p>
            <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
              All vehicles are on trips or inactive. Use Auto-assign to queue or reassign a live trip's vehicle.
            </p>
          </div>
        </div>
      )}

      {/* ── Pending bookings ── */}
      {pendingBookings.length === 0 && liveTrips.length === 0 ? (
        <Card>
          <EmptyState icon={Radio} title="Dispatch queue is clear"
            description="No pending bookings need assignment right now." />
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingBookings.map((b) => {
            const a               = assignments[b.id] || {};
            const matchingVehicles = vehiclesForBooking(b);
            const availableDrivers = driversForBooking(b.id);
            const isDone          = a.done;

            return (
              <Card key={b.id}>
                <div className="flex flex-col gap-3">
                  {/* Booking info */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                          {b.customer?.user?.name || 'Unknown customer'}
                        </p>
                        <StatusBadge status={isDone ? 'ALLOCATED' : b.status} />
                        <span className="font-mono text-xs" style={{ color: '#9CA3AF' }}>{b.bookingNumber}</span>
                      </div>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        {addr(b.pickupAddress)} → {addr(b.dropAddress)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap" style={{ color: '#6B7280' }}>
                        <span>{titleCase(b.vehicleClass || '—')}</span>
                        <span style={{ color: '#D1D5DB' }}>·</span>
                        <span>{b.tripType?.replace('_', ' ')}</span>
                        <span style={{ color: '#D1D5DB' }}>·</span>
                        <span className="font-semibold" style={{ color: '#1F2937' }}>{formatCurrency(b.estimatedFare)}</span>
                        <span style={{ color: '#D1D5DB' }}>·</span>
                        <span>{formatDateTime(b.pickupAt)}</span>
                        {b.customer?.user?.phone && (
                          <><span style={{ color: '#D1D5DB' }}>·</span><span>{b.customer.user.phone}</span></>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assignment controls */}
                  {isDone ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <Truck size={15} style={{ color: '#16a34a' }} />
                      <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                        Assigned successfully
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {/* Vehicle selector */}
                      <div className="flex gap-2 items-center">
                        <Truck size={15} style={{ color: '#6B7280', flexShrink: 0 }} />
                        {matchingVehicles.length === 0 ? (
                          <div className="flex-1 rounded-lg px-3 py-2 text-xs"
                            style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047', color: '#854D0E' }}>
                            {availableVehicles.length === 0
                              ? 'No vehicles available'
                              : `No ${titleCase(b.vehicleClass || '')} available — ${availableVehicles.length} other class${availableVehicles.length > 1 ? 'es' : ''} free`}
                          </div>
                        ) : (
                          <Select
                            value={a.vehicleId || ''}
                            placeholder={`Vehicle — ${matchingVehicles.length} ${titleCase(b.vehicleClass || '')} available`}
                            onChange={(e) => setField(b.id, 'vehicleId', e.target.value)}
                            options={matchingVehicles.map((v) => ({
                              value: v.id,
                              label: `${v.registrationNumber} · ${v.makeModel} · ${v.seatingCapacity} seats`,
                            }))}
                          />
                        )}
                      </div>

                      {/* Driver selector — optional */}
                      <div className="flex gap-2 items-center">
                        <User size={15} style={{ color: '#6B7280', flexShrink: 0 }} />
                        <Select
                          value={a.driverId || ''}
                          placeholder={
                            availableDrivers.length === 0
                              ? 'No verified drivers available'
                              : `Driver (optional) — ${availableDrivers.filter(d => d.isOnline).length} online`
                          }
                          onChange={(e) => setField(b.id, 'driverId', e.target.value || undefined)}
                          options={[
                            { value: '', label: 'No driver (assign vehicle only)' },
                            ...availableDrivers.map((d) => ({
                              value: d.userId,
                              label: `${d.user?.name}${d.isOnline ? ' 🟢 Online' : ' ⚪ Offline'} · ${d.user?.phone || ''}`,
                            })),
                          ]}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="secondary"
                          loading={assigning[b.id]}
                          onClick={() => autoAssign(b.id)}>
                          Auto-assign
                        </Button>
                        <Button size="sm"
                          disabled={!a.vehicleId}
                          loading={assigning[b.id]}
                          onClick={() => assign(b.id)}>
                          Assign
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          {/* ── Live trips — reassign section (driver on leave) ── */}
          {liveTrips.length > 0 && (
            <>
              <div className="flex items-center gap-3 mt-4 mb-2">
                <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                  LIVE TRIPS — REASSIGN IF DRIVER IS ON LEAVE
                </span>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              </div>

              {liveTrips.map((t) => {
                const a            = assignments[`reassign-${t.id}`] || {};
                const isDone       = a.done;
                const currentAlloc = t.allocations?.[0];
                const currentDriver = currentAlloc?.driver?.user;
                const currentVehicle = currentAlloc?.vehicle;
                const matchingVehicles = vehiclesForBooking(t);
                const availableDrivers = driversForBooking(`reassign-${t.id}`).filter(
                  (d) => d.userId !== currentAlloc?.driverId // exclude current driver
                );

                return (
                  <Card key={t.id} style={{ borderLeft: '3px solid #3B65DB' }}>
                    <div className="flex flex-col gap-3">
                      {/* Trip info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                            {t.customer?.user?.name || 'Unknown customer'}
                          </p>
                          <StatusBadge status={t.status} />
                          <span className="font-mono text-xs" style={{ color: '#9CA3AF' }}>{t.bookingNumber}</span>
                        </div>
                        <p className="text-sm" style={{ color: '#6B7280' }}>
                          {addr(t.pickupAddress)} → {addr(t.dropAddress)}
                        </p>

                        {/* Current assignment */}
                        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                          {currentVehicle && (
                            <span className="flex items-center gap-1" style={{ color: '#374151' }}>
                              <Truck size={11} />
                              <strong>{currentVehicle.registrationNumber}</strong>
                              {' '}{currentVehicle.makeModel}
                            </span>
                          )}
                          {currentDriver && (
                            <span className="flex items-center gap-1" style={{ color: '#374151' }}>
                              <User size={11} />
                              <strong>{currentDriver.name}</strong>
                              {' '}{currentDriver.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reassign controls */}
                      {isDone ? (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <Truck size={15} style={{ color: '#16a34a' }} />
                          <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                            Reassigned successfully
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            Reassign to a different driver or vehicle:
                          </p>

                          {/* New vehicle */}
                          <div className="flex gap-2 items-center">
                            <Truck size={15} style={{ color: '#6B7280', flexShrink: 0 }} />
                            <Select
                              value={a.vehicleId || ''}
                              placeholder={matchingVehicles.length > 0
                                ? `New vehicle (${matchingVehicles.length} available) — optional`
                                : 'No other vehicles available'}
                              onChange={(e) => setField(`reassign-${t.id}`, 'vehicleId', e.target.value || undefined)}
                              options={[
                                { value: '', label: 'Keep current vehicle' },
                                ...matchingVehicles.map((v) => ({
                                  value: v.id,
                                  label: `${v.registrationNumber} · ${v.makeModel} · ${v.seatingCapacity} seats`,
                                })),
                              ]}
                            />
                          </div>

                          {/* New driver */}
                          <div className="flex gap-2 items-center">
                            <User size={15} style={{ color: '#6B7280', flexShrink: 0 }} />
                            <Select
                              value={a.driverId || ''}
                              placeholder={availableDrivers.length > 0
                                ? `New driver (${availableDrivers.filter(d => d.isOnline).length} online)`
                                : 'No other drivers available'}
                              onChange={(e) => setField(`reassign-${t.id}`, 'driverId', e.target.value || undefined)}
                              options={[
                                { value: '', label: 'Keep current driver' },
                                ...availableDrivers.map((d) => ({
                                  value: d.userId,
                                  label: `${d.user?.name}${d.isOnline ? ' 🟢 Online' : ' ⚪ Offline'} · ${d.user?.phone || ''}`,
                                })),
                              ]}
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!a.vehicleId && !a.driverId}
                              loading={assigning[`reassign-${t.id}`]}
                              onClick={() => reassign(t.id)}
                            >
                              Reassign
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
