import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Phone, Mail, UserCheck, UserX, Users } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import FilterBar     from '../../components/ui/FilterBar';
import DataTable     from '../../components/ui/DataTable';
import IconButton    from '../../components/ui/IconButton';
import Badge         from '../../components/ui/Badge';
import Button        from '../../components/ui/Button';
import Input         from '../../components/ui/Input';
import CustomerFormDrawer from '../../components/customer/CustomerFormDrawer';
import { adminCustomersService, bookingService } from '../../services';
import { useToast }    from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, accountTypeLabel } from '../../utils/formatters';
import { PERMISSIONS } from '../../constants';
import { useAuth }   from '../../hooks/useAuth';

/**
 * Customers / Clients — Logged-in users and Guest users on separate tabs.
 *
 * FRONTEND-ONLY: the backend has no "guest" field or filter, so the split is
 * done here. Customers are loaded in pages of 100 (the backend's max limit),
 * with search / account type / sort still applied server-side, then split
 * into Logged-in vs Guest and paginated locally. That keeps the tab counts
 * and pagination correct instead of filtering only the 10 rows on screen.
 *
 * A GUEST is a customer created without signing up, recognised by the
 * placeholder email the backend gives such accounts:
 *   - WhatsApp bot  → <digits>@whatsapp.invalid
 *   - phone-only    → phone_<number>@placeholder.local
 *   - legacy guest  → guest.<...>
 * Everyone with a real email is a logged-in (registered) user.
 */
const PAGE_FETCH_LIMIT = 100;   // backend cap for list endpoints
const MAX_PAGES        = 20;    // safety cap → up to 2,000 customers loaded

const SORT_OPTIONS = [
  { value: 'createdAt',     label: 'Joined date'    },
  { value: 'loyaltyPoints', label: 'Loyalty points' },
  { value: 'name',          label: 'Name'           },
];

const USER_TABS = [
  { key: 'registered', label: 'Logged-in Users', icon: UserCheck },
  { key: 'guest',      label: 'Guest Users',     icon: UserX     },
];

function isGuestCustomer(r) {
  if (typeof r?.isGuest === 'boolean') return r.isGuest;
  const email = (r?.user?.email || '').toLowerCase();
  return !email
    || email.endsWith('@placeholder.local')
    || email.endsWith('@whatsapp.invalid')
    || email.startsWith('guest.');
}

export default function Customers() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CLIENTS_MANAGE);

  // ── Server-side query params ──
  const [search, setSearch]           = useState('');
  const debouncedSearch               = useDebounce(search, 350);
  const [accountType, setAccountType] = useState('');
  const [sortBy, setSortBy]           = useState('createdAt');
  const [sortDir, setSortDir]         = useState('desc');

  // ── Loaded data ──
  const [allRows, setAllRows]   = useState([]);
  const [status, setStatus]     = useState('loading');
  const [error, setError]       = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // ── Local UI state ──
  const [tab, setTab]           = useState('registered');
  const [page, setPage]         = useState(1);
  const [limit, setLimit]       = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });
  const [editing, setEditing]   = useState(null);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  // Load every page (up to the cap) for the current server-side params.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setError(null);
      try {
        const collected = [];
        let totalPages = 1;
        let p = 1;
        do {
          const res = await adminCustomersService.list({
            page: p,
            limit: PAGE_FETCH_LIMIT,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(accountType ? { accountType } : {}),
            sortBy,
            order: sortDir,
          });
          const rows = res?.data ?? res?.items ?? [];
          collected.push(...rows);
          totalPages = res?.meta?.totalPages ?? res?.pagination?.totalPages ?? 1;
          p += 1;
        } while (p <= totalPages && p <= MAX_PAGES && !cancelled);
        if (cancelled) return;
        setAllRows(collected);
        setTruncated(totalPages > MAX_PAGES);
        setStatus('success');
      } catch (e) {
        if (cancelled) return;
        setError(e);
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedSearch, accountType, sortBy, sortDir, reloadTick]);

  // Any change to what's shown goes back to page 1.
  useEffect(() => { setPage(1); }, [tab, debouncedSearch, accountType, sortBy, sortDir, appliedRange, limit]);

  // ── Split + date filter ──
  const { registeredRows, guestRows } = useMemo(() => {
    const reg = [], guest = [];
    for (const r of allRows) (isGuestCustomer(r) ? guest : reg).push(r);
    return { registeredRows: reg, guestRows: guest };
  }, [allRows]);

  const dateFiltering = !!(appliedRange.from || appliedRange.to);

  const tabRows = useMemo(() => {
    const base = tab === 'guest' ? guestRows : registeredRows;
    if (!dateFiltering) return base;
    const from = appliedRange.from ? new Date(appliedRange.from) : null;
    const to   = appliedRange.to ? new Date(appliedRange.to + 'T23:59:59') : null;
    return base.filter((r) => {
      const joined = r.createdAt ? new Date(r.createdAt) : null;
      if (!joined) return false;
      if (from && joined < from) return false;
      if (to && joined > to) return false;
      return true;
    });
  }, [tab, guestRows, registeredRows, dateFiltering, appliedRange]);

  const totalPages = Math.max(1, Math.ceil(tabRows.length / limit));
  const pageRows = useMemo(
    () => tabRows.slice((page - 1) * limit, page * limit),
    [tabRows, page, limit]
  );

  // ── Total Bookings column ──
  // The list endpoint doesn't return a booking count, so it's fetched per
  // VISIBLE row only (GET /admin/bookings?customerId=X&limit=1) and cached.
  const [bookingCounts, setBookingCounts] = useState({});
  const visibleUserIds = pageRows.map((r) => r.userId).join(',');

  useEffect(() => {
    const toFetch = pageRows.filter((r) => r.userId && bookingCounts[r.userId] === undefined);
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
          <p style={{ fontWeight: 600, color: '#1F2937' }} className="flex items-center gap-1.5">
            {r.user?.name || '—'}
            {r.isLive && (
              <span
                className="inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                style={{ backgroundColor: '#f0fdf4', color: '#22A65A' }}
                title="Customer's app is open right now"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#22A65A' }} />
                Live
              </span>
            )}
          </p>
          <p style={{ fontSize: 13.5, color: '#6B7280' }} className="flex items-center gap-1">
            <Mail size={11} />
            {/* A guest's placeholder email isn't a real address — don't show it as one */}
            {isGuestCustomer(r) ? 'No email (guest)' : (r.user?.email || '—')}
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
      key: 'userType', header: 'User',
      render: (r) => (
        isGuestCustomer(r)
          ? <Badge tone="amber">Guest</Badge>
          : <Badge tone="green">Logged-in</Badge>
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

  const handleSort = (key, dir) => {
    if (dir) {
      setSortBy(key);
      setSortDir(dir);
    } else {
      setSortDir((prev) => (sortBy === key && prev === 'desc' ? 'asc' : 'desc'));
      setSortBy(key);
    }
  };

  const handleUpdate = async (values) => {
    await adminCustomersService.update(editing.userId, values);
    toast.success('Customer updated');
    setEditing(null);
    reload();
  };

  const counts = { registered: registeredRows.length, guest: guestRows.length };
  const loaded = status === 'success';

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Logged-in users and guest users are listed separately."
      />

      {/* Logged-in vs Guest tabs */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: '#E8E8E4' }}>
        {USER_TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors"
              style={{ borderColor: active ? '#FFC107' : 'transparent', color: active ? '#111111' : '#9A9A9A' }}
            >
              <Icon size={13} />
              {label}
              {loaded && (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold"
                  style={{ backgroundColor: active ? '#FFC107' : '#F3F4F6', color: '#111111' }}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'guest' && (
        <p className="mb-4 text-xs flex items-center gap-1.5" style={{ color: '#6B7280' }}>
          <Users size={12} />
          Guests are customers created without signing up (e.g. WhatsApp or phone-only bookings) — they have no real email on file.
        </p>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email or phone…"
        filters={[
          {
            name: 'accountType',
            value: accountType,
            onChange: (v) => setAccountType(v),
            placeholder: 'All account types',
            options: [
              { value: 'RETAIL',    label: 'Personal'  },
              { value: 'CORPORATE', label: 'Corporate' },
            ],
          },
          {
            name: 'sortBy',
            value: sortBy,
            onChange: (v) => handleSort(v, sortDir),
            placeholder: 'Sort by',
            options: SORT_OPTIONS,
          },
          {
            name: 'order',
            value: sortDir,
            onChange: (v) => handleSort(sortBy, v),
            placeholder: 'Order',
            options: [
              { value: 'desc', label: 'Newest first' },
              { value: 'asc',  label: 'Oldest first' },
            ],
          },
        ]}
      />

      {/* Joined date range — applied to the loaded list */}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Joined From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Joined To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button
          size="sm"
          onClick={() => setAppliedRange({ from: dateFrom, to: dateTo })}
          disabled={!dateFrom && !dateTo}
        >
          Search
        </Button>
        {dateFiltering && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setDateFrom(''); setDateTo(''); setAppliedRange({ from: '', to: '' }); }}
          >
            Clear
          </Button>
        )}
        {truncated && (
          <span className="text-xs text-gray-400">
            Showing the first {PAGE_FETCH_LIMIT * MAX_PAGES} customers for this search — narrow the search to see others.
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey="userId"
        status={status}
        error={error}
        onRetry={reload}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        page={page}
        limit={limit}
        total={tabRows.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={(n) => setLimit(Number(n) || 10)}
        onRowClick={(r) => navigate(`/admin/customers/${r.userId}`)}
        emptyTitle={
          dateFiltering
            ? 'No customers joined in this date range'
            : tab === 'guest' ? 'No guest users found' : 'No logged-in users found'
        }
        emptyDescription="Try adjusting your search or filters."
      />

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
