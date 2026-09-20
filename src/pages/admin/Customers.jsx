import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Phone, Mail } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import IconButton    from '../../components/ui/IconButton';
import Badge         from '../../components/ui/Badge';
import Button        from '../../components/ui/Button';
import CustomerFormDrawer from '../../components/customer/CustomerFormDrawer';
import { useResourceList }       from '../../hooks/useResourceList';
import { adminCustomersService, bookingService } from '../../services';
import { useToast }  from '../../hooks/useToast';
import { formatDate, titleCase, accountTypeLabel } from '../../utils/formatters';
import { PERMISSIONS } from '../../constants';
import { useAuth }   from '../../hooks/useAuth';

// Backend listCustomersQuerySchema accepts:
//   search, accountType, sortBy (createdAt|loyaltyPoints|totalBookings|name), order, page, limit
// ALL SERVER-SIDE.
//
// FIX: date-range search was requested, but this schema has NO from/to
// fields at all — confirmed directly against the validator. Adding it
// server-side would be one line; per an explicit "frontend only" decision,
// this is instead built as a separate, larger fetch (respecting whatever
// search/accountType filter is active) that's then filtered by createdAt
// client-side and paginated locally — same pattern used for the
// Cancellation Reasons report. It's capped (see CLIENT_FILTER_LIMIT below)
// and stated plainly in the UI, not silently pretending to search everyone.
const CLIENT_FILTER_LIMIT = 500;

const SORT_OPTIONS = [
  { value: 'createdAt',    label: 'Joined date'    },
  { value: 'loyaltyPoints',label: 'Loyalty points' },
  { value: 'name',         label: 'Name'           },
];

const customerListService = {
  list: (params) => adminCustomersService.list(params),
};

export default function Customers() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CLIENTS_MANAGE);

  const list = useResourceList(customerListService, {
    filterDefaults: { accountType: '' },
    sortBy: 'createdAt',
    sortDir: 'desc',
    limit: 10,
  });

  const [editing, setEditing] = useState(null);

  // ── Client-side date range filter (see note above imports) ──
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState(false); // whether a search has actually been run
  const [dateFilterStatus, setDateFilterStatus] = useState('idle'); // idle | loading | ready | error
  const [dateFilterRows, setDateFilterRows] = useState([]);
  const [dateFilterPage, setDateFilterPage] = useState(1);
  const dateFiltering = applied && (dateFrom || dateTo);

  async function runDateSearch() {
    if (!dateFrom && !dateTo) return;
    setApplied(true);
    setDateFilterStatus('loading');
    setDateFilterPage(1);
    try {
      // Respects whatever search/accountType filter is already active, so
      // this composes with the existing filters rather than replacing them.
      const res = await adminCustomersService.list({
        search: list.search || undefined,
        accountType: list.filters.accountType || undefined,
        sortBy: 'createdAt',
        order: 'desc',
        limit: CLIENT_FILTER_LIMIT,
        page: 1,
      });
      const rows = res?.data ?? res?.items ?? [];
      const from = dateFrom ? new Date(dateFrom) : null;
      const to   = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      const filtered = rows.filter((r) => {
        const joined = r.createdAt ? new Date(r.createdAt) : null;
        if (!joined) return false;
        if (from && joined < from) return false;
        if (to && joined > to) return false;
        return true;
      });
      setDateFilterRows(filtered);
      setDateFilterStatus('ready');
    } catch (e) {
      setDateFilterStatus('error');
    }
  }

  function clearDateSearch() {
    setDateFrom('');
    setDateTo('');
    setApplied(false);
    setDateFilterRows([]);
    setDateFilterStatus('idle');
  }

  const DATE_FILTER_PAGE_SIZE = 10;
  const dateFilterTotalPages = Math.max(1, Math.ceil(dateFilterRows.length / DATE_FILTER_PAGE_SIZE));
  const dateFilterPageRows = useMemo(
    () => dateFilterRows.slice((dateFilterPage - 1) * DATE_FILTER_PAGE_SIZE, dateFilterPage * DATE_FILTER_PAGE_SIZE),
    [dateFilterRows, dateFilterPage]
  );

  // ── Total Bookings column ──
  // FIX: GET /admin/customers (the list endpoint) doesn't return a booking
  // count at all — confirmed against its select fields. The only way to get
  // a real count per customer is GET /admin/bookings?customerId=X, one call
  // per customer. Only ever done for whichever rows are actually visible on
  // screen right now (10–100 depending on page size), never the whole
  // customer base at once — and cached so switching pages back and forth
  // doesn't keep re-fetching the same customer twice.
  const [bookingCounts, setBookingCounts] = useState({}); // userId -> count | 'loading' | 'error'
  const visibleRows = dateFiltering ? dateFilterPageRows : list.rows;
  const visibleUserIds = visibleRows.map((r) => r.userId).join(',');

  useEffect(() => {
    const toFetch = visibleRows.filter((r) => r.userId && bookingCounts[r.userId] === undefined);
    if (toFetch.length === 0) return;
    setBookingCounts((prev) => {
      const next = { ...prev };
      for (const r of toFetch) next[r.userId] = 'loading';
      return next;
    });
    toFetch.forEach((r) => {
      bookingService.list({ customerId: r.userId, limit: 1 })
        .then((res) => {
          const total = res?.meta?.total ?? res?.pagination?.total ?? 0;
          setBookingCounts((prev) => ({ ...prev, [r.userId]: total }));
        })
        .catch(() => {
          setBookingCounts((prev) => ({ ...prev, [r.userId]: 'error' }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleUserIds]);

  const columns = [
    {
      key: 'name', header: 'Customer',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937' }}>{r.user?.name || '—'}</p>
          <p style={{ fontSize: 13.5, color: '#6B7280' }} className="flex items-center gap-1">
            <Mail size={11} />{r.user?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Phone',
      render: (r) => (
        <span className="flex items-center gap-1" style={{ fontSize: 13, color: '#6B7280' }}>
          <Phone size={12} />{r.user?.phone || '—'}
        </span>
      ),
    },
    {
      key: 'accountType', header: 'Type',
      render: (r) => (
        <Badge tone={r.accountType === 'CORPORATE' ? 'blue' : 'slate'}>
          {accountTypeLabel(r.accountType)}
        </Badge>
      ),
    },
    {
      key: 'loyaltyPoints', header: 'Loyalty Pts', sortable: true,
      render: (r) => <span style={{ color: '#1F2937' }}>{r.loyaltyPoints ?? 0}</span>,
    },
    {
      // FIX: no such column existed anywhere on this page. Since the list
      // endpoint doesn't return a count, this is fetched per visible row
      // (see the effect above) — shows a small spinner-ish "…" while that
      // row's count is loading, "—" if it failed for that one customer.
      key: 'totalBookings', header: 'Total Bookings',
      render: (r) => {
        const count = bookingCounts[r.userId];
        if (count === undefined || count === 'loading') {
          return <span style={{ color: '#9CA3AF' }}>…</span>;
        }
        if (count === 'error') {
          return <span style={{ color: '#9CA3AF' }} title="Could not load">—</span>;
        }
        return <span style={{ fontWeight: 600, color: '#1F2937' }}>{count}</span>;
      },
    },
    {
      key: 'createdAt', header: 'Joined', sortable: true,
      render: (r) => formatDate(r.createdAt),
    },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(r)} />
        </div>
      ),
    }] : []),
  ];

  const handleUpdate = async (values) => {
    await adminCustomersService.update(editing.userId, values);
    toast.success('Customer updated');
    setEditing(null);
    list.reload();
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="All registered customers. Filters applied server-side."
      />

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search name, email or phone…"
        filters={[
          {
            name: 'accountType',
            value: list.filters.accountType,
            onChange: (v) => list.setFilter('accountType', v),
            placeholder: 'All account types',
            options: [
              { value: 'RETAIL',    label: 'Personal'  },
              { value: 'CORPORATE', label: 'Corporate' },
            ],
          },
          {
            name: 'sortBy',
            value: list.sortBy,
            onChange: (v) => list.onSort(v, list.sortDir),
            placeholder: 'Sort by',
            options: SORT_OPTIONS,
          },
          {
            name: 'order',
            value: list.sortDir,
            onChange: (v) => list.onSort(list.sortBy, v),
            placeholder: 'Order',
            options: [
              { value: 'desc', label: 'Newest first' },
              { value: 'asc',  label: 'Oldest first' },
            ],
          },
        ]}
      />

      {/* Custom date range — client-side only, see the note above imports */}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">Joined From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">Joined To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <Button size="sm" onClick={runDateSearch} disabled={!dateFrom && !dateTo}>Search</Button>
        {dateFiltering && <Button size="sm" variant="ghost" onClick={clearDateSearch}>Clear</Button>}
        {dateFiltering && (
          <span className="text-xs text-gray-400">
            Searching the {CLIENT_FILTER_LIMIT} most recent matching customers, filtered by join date — not your full customer base.
          </span>
        )}
      </div>

      {dateFiltering ? (
        <DataTable
          columns={columns}
          rows={dateFilterPageRows}
          status={dateFilterStatus}
          error={dateFilterStatus === 'error' ? { message: 'Could not run date search' } : null}
          onRetry={runDateSearch}
          page={dateFilterPage}
          limit={DATE_FILTER_PAGE_SIZE}
          total={dateFilterRows.length}
          totalPages={dateFilterTotalPages}
          onPageChange={setDateFilterPage}
          onRowClick={(r) => navigate(`/admin/customers/${r.userId}`)}
          emptyTitle="No customers joined in this date range"
          emptyDescription="Try a wider range, or clear the date filter."
        />
      ) : (
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
          onRowClick={(r) => navigate(`/admin/customers/${r.userId}`)}
          emptyTitle="No customers found"
          emptyDescription="Try adjusting your search or filters."
        />
      )}

      {editing && (
        <CustomerFormDrawer
          open={!!editing}
          customer={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
