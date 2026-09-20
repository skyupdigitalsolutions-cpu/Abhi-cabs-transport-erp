import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import Button        from '../../components/ui/Button';
import StatusBadge   from '../../components/ui/StatusBadge';
import BookingFormDrawer from '../../components/booking/BookingFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { bookingService }  from '../../services';
import { useToast }        from '../../hooks/useToast';
import { PERMISSIONS }     from '../../constants';
import { useAuth }         from '../../hooks/useAuth';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

// All filters are SERVER-SIDE — sent directly as query params to /admin/bookings
// Backend listBookingsQuerySchema accepts:
//   status, tripType, from, to, search, sortBy, order, page, limit

const BOOKING_STATUSES = ['PENDING','CONFIRMED','ALLOCATED','EN_ROUTE','ONGOING','COMPLETED','CANCELLED','EXPIRED'];
const TRIP_TYPES       = ['ONE_WAY','ROUND_TRIP','AIRPORT','HOURLY'];
const SORT_OPTIONS     = ['createdAt','pickupAt','estimatedFare','status'];

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

export default function Bookings() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.BOOKINGS_MANAGE);

  // Server-side filters passed directly to useResourceList → backend query params
  const list = useResourceList(bookingService, {
    filterDefaults: { status: '', tripType: '', from: '', to: '' },
    sortBy: 'createdAt',
    sortDir: 'desc',
    limit: 10,
  });

  const [formOpen, setFormOpen] = useState(false);

  // FRONTEND-ONLY fetch of cancellation reasons: the LIST endpoint
  // (BOOKING_LIST_SELECT on the backend) never included cancellationReason
  // at all — only the single-booking detail endpoint does. Changing that is
  // a backend edit; per instruction this stays frontend-only instead, so
  // for each CANCELLED row currently on screen, fetch its full detail once
  // (bookingService.get already hits the real, existing GET /admin/bookings/:id)
  // and cache the reason locally. Bounded cost: at most one extra request
  // per cancelled booking actually visible on the current page (≤ page size),
  // never re-fetched once cached.
  const [reasons, setReasons] = useState({});
  const fetchingRef = useRef(new Set());

  useEffect(() => {
    (list.rows || []).forEach((r) => {
      if (r.status !== 'CANCELLED') return;
      if (reasons[r.id] !== undefined) return;
      if (fetchingRef.current.has(r.id)) return;
      fetchingRef.current.add(r.id);
      bookingService.get(r.id)
        .then((full) => setReasons((prev) => ({ ...prev, [r.id]: full?.cancellationReason || null })))
        .catch(() => setReasons((prev) => ({ ...prev, [r.id]: null })))
        .finally(() => fetchingRef.current.delete(r.id));
    });
  }, [list.rows]);

  const columns = [
    {
      key: 'bookingNumber', header: 'Booking #',
      render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.bookingNumber || '—'}</span>,
    },
    {
      key: 'customer', header: 'Customer',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>
            {r.customer?.user?.name || r.corporate?.companyName || '—'}
          </p>
          <p style={{ fontSize: 12.5, color: '#9CA3AF' }}>{r.customer?.user?.phone || ''}</p>
        </div>
      ),
    },
    {
      // Moved right after Customer (was last) so it's visible without
      // scrolling — the Route column's full addresses were pushing every
      // other column, Status included, off-screen to the right.
      key: 'status', header: 'Status',
      render: (r) => {
        const loaded = reasons[r.id];
        const isLoading = r.status === 'CANCELLED' && loaded === undefined;
        return (
          <div>
            <StatusBadge status={r.status} />
            {r.status === 'CANCELLED' && (
              <p
                className="mt-1 truncate"
                style={{ fontSize: 11.5, color: isLoading ? '#9CA3AF' : '#B91C1C', maxWidth: 160 }}
                title={loaded || (isLoading ? 'Loading…' : 'No reason was recorded.')}
              >
                {isLoading ? 'Loading reason…' : (loaded || 'No reason recorded')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'route', header: 'Route',
      render: (r) => {
        const full = `${addr(r.pickupAddress)} → ${addr(r.dropAddress)}`;
        // Full address is still there (title = hover tooltip, and it's
        // still sent to the server unchanged) — just not forced into view
        // for every row when the first line of each address already
        // identifies the pickup/drop clearly enough for a list scan.
        const short = `${addr(r.pickupAddress).split(',')[0]} → ${addr(r.dropAddress).split(',')[0]}`;
        return (
          <span style={{ color: '#6B7280', fontSize: 13.5 }} title={full}>
            {short}
          </span>
        );
      },
    },
    {
      key: 'tripType', header: 'Type',
      render: (r) => <span style={{ fontSize: 13.5, color: '#6B7280' }}>{r.tripType?.replace(/_/g,' ') || '—'}</span>,
    },
    {
      key: 'vehicleClass', header: 'Class',
      render: (r) => <span style={{ fontSize: 13.5, color: '#6B7280' }}>{titleCase(r.vehicleClass || '—')}</span>,
    },
    {
      key: 'fare', header: 'Fare', sortable: true,
      render: (r) => formatCurrency(Number(r.finalFare ?? r.estimatedFare) || 0),
    },
    {
      key: 'pickupAt', header: 'Pickup', sortable: true,
      render: (r) => formatDateTime(r.pickupAt),
    },
  ];

  const handleCreate = async (values) => {
    await bookingService.create(values);
    toast.success('Booking created');
    list.reload();
  };

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="All booking requests. Filters are applied server-side for speed."
        actions={canManage && (
          <Button icon={Plus} onClick={() => setFormOpen(true)}>New booking</Button>
        )}
      />

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search booking # or customer name…"
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: BOOKING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
          },
          {
            name: 'tripType',
            value: list.filters.tripType,
            onChange: (v) => list.setFilter('tripType', v),
            placeholder: 'All trip types',
            options: TRIP_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') })),
          },
          {
            name: 'sortBy',
            value: list.sortBy,
            onChange: (v) => list.onSort(v, list.sortDir),
            placeholder: 'Sort by',
            options: SORT_OPTIONS.map((s) => ({ value: s, label: titleCase(s.replace(/([A-Z])/g, ' $1')) })),
          },
        ]}
        extra={
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>From</label>
            <input type="date" value={list.filters.from || ''}
              onChange={(e) => list.setFilter('from', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="text-xs border rounded-lg px-2 py-1.5"
              style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
            <label className="text-xs font-semibold" style={{ color: '#6B7280' }}>To</label>
            <input type="date" value={list.filters.to || ''}
              onChange={(e) => list.setFilter('to', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '')}
              className="text-xs border rounded-lg px-2 py-1.5"
              style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
          </div>
        }
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
        onLimitChange={list.setLimit}
        onRowClick={(r) => navigate(`/admin/bookings/${r.id}`)}
        emptyTitle="No bookings found"
        emptyDescription="Try adjusting your filters or date range."
      />

      <BookingFormDrawer open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}
