import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Building2, CalendarCheck, Gift, Star, ShieldCheck } from 'lucide-react';
import { useApi }   from '../../hooks/useApi';
import { adminCustomersService, bookingService } from '../../services';
import Breadcrumb   from '../../components/ui/Breadcrumb';
import Card         from '../../components/ui/Card';
import StatusBadge  from '../../components/ui/StatusBadge';
import Badge        from '../../components/ui/Badge';
import Button       from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState   from '../../components/ui/ErrorState';
import EmptyState   from '../../components/ui/EmptyState';
import Drawer       from '../../components/ui/Drawer';
import FormField    from '../../components/ui/FormField';
import Input        from '../../components/ui/Input';
import Select       from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useForm }  from '../../hooks/useForm';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/formatters';

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

function StatCard({ icon: Icon, label, value, tone = 'primary' }) {
  const TONES = {
    primary: { bg: '#eef2fb', color: '#3B65DB' },
    green:   { bg: '#f0fdf4', color: '#38B763' },
    amber:   { bg: '#fffbeb', color: '#F59E0B' },
    purple:  { bg: '#f5f3ff', color: '#7c3aed' },
  };
  const t = TONES[tone] || TONES.primary;
  return (
    <Card className="flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
        style={{ backgroundColor: t.bg }}>
        <Icon size={20} style={{ color: t.color }} />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{label}</p>
        <p className="text-lg font-bold mt-0.5" style={{ color: '#1F2937' }}>{value}</p>
      </div>
    </Card>
  );
}

export default function CustomerDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const customer = useApi(() => adminCustomersService.get(id), [id]);
  const bookings = useApi(
    () => bookingService.list({ customerId: id, page: 1, limit: 10, sortBy: 'createdAt' }),
    [id]
  );

  // FIX: "Total Bookings" / "Completed" / "Total Spend" used to be computed
  // from the same 10-row "Recent Bookings" preview above — accurate only for
  // a customer with 10 or fewer bookings ever, silently wrong for anyone
  // with more history than that. GET /admin/bookings already supports
  // filtering by customerId (confirmed against the real backend validator),
  // so this fetches the customer's FULL booking history (paging through in
  // batches of 100, the backend's max page size) and computes real totals
  // from all of it — frontend-only, no backend change needed.
  const [fullStats, setFullStats] = useState({ status: 'loading', total: 0, completed: 0, spend: 0 });

  useEffect(() => {
    let cancelled = false;
    setFullStats({ status: 'loading', total: 0, completed: 0, spend: 0 });

    async function loadAll() {
      let page = 1;
      let totalPages = 1;
      let total = 0, completed = 0, spend = 0;
      do {
        const res = await bookingService.list({ customerId: id, page, limit: 100, sortBy: 'createdAt' });
        const rows = res?.data ?? res?.items ?? [];
        const meta = res?.meta ?? res?.pagination;
        totalPages = meta?.totalPages ?? 1;
        total += rows.length;
        for (const b of rows) {
          if (b.status === 'COMPLETED') {
            completed += 1;
            spend += Number(b.finalFare ?? b.estimatedFare ?? 0);
          }
        }
        page += 1;
      } while (page <= totalPages && !cancelled);

      if (!cancelled) setFullStats({ status: 'ready', total, completed, spend });
    }

    loadAll().catch(() => { if (!cancelled) setFullStats((s) => ({ ...s, status: 'error' })); });
    return () => { cancelled = true; };
  }, [id]);

  // adminCustomersService.get() returns customer object directly (already unwrapped)
  const c = customer.data;
  const recentBookings = bookings.data?.data ?? bookings.data?.items ?? bookings.data ?? [];

  const { values, errors, touched, submitting, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: {
      accountType: c?.accountType || 'RETAIL',
      notes:       c?.notes || '',
    },
    onSubmit: async (vals) => {
      await adminCustomersService.update(id, vals);
      toast.success('Customer updated');
      setEditOpen(false);
      customer.refetch();
    },
  });

  // Sync form when customer data loads (useForm initialValues are evaluated before API resolves)
  useEffect(() => {
    if (c) setValues({ accountType: c.accountType || 'RETAIL', notes: c.notes || '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.userId]);

  if (customer.status === 'loading') return <LoadingState label="Loading customer…" />;
  if (customer.status === 'error')   return <ErrorState message={customer.error?.message} onRetry={customer.refetch} />;
  if (!c) return <ErrorState message="Customer not found" />;

  // Real totals across the customer's ENTIRE booking history (see fullStats
  // effect above) — not the backend's stale, never-updated totalBookings
  // column, and not just the small "recent" preview list either.
  const totalSpend     = fullStats.spend;
  const completedCount = fullStats.completed;
  const totalBookingsCount = fullStats.status === 'ready' ? fullStats.total : (c.totalBookings ?? 0);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Customers', to: '/admin/customers' }, { label: c.user?.name || 'Customer' }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-lg grid place-items-center border"
            style={{ borderColor: '#E5E7EB', backgroundColor: '#fff' }}>
            <ArrowLeft size={18} style={{ color: '#6B7280' }} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>{c.user?.name || '—'}</h1>
              <Badge tone={c.accountType === 'CORPORATE' ? 'blue' : 'slate'}>{c.accountType || 'RETAIL'}</Badge>
              {c.user?.isActive === false && <Badge tone="red">Inactive</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {c.user?.phone && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#6B7280' }}>
                  <Phone size={13} />{c.user.phone}
                </span>
              )}
              {c.user?.email && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#6B7280' }}>
                  <Mail size={13} />{c.user.email}
                </span>
              )}
              {c.corporate?.companyName && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#6B7280' }}>
                  <Building2 size={13} />{c.corporate.companyName}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit customer</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CalendarCheck} label="Total Bookings"  value={fullStats.status === 'loading' ? '…' : totalBookingsCount} tone="primary" />
        <StatCard icon={CalendarCheck} label="Completed"       value={fullStats.status === 'loading' ? '…' : completedCount}     tone="green" />
        <StatCard icon={Gift}          label="Loyalty Points"  value={c.loyaltyPoints ?? 0}                                       tone="amber" />
        <StatCard icon={Star}          label="Total Spend"     value={fullStats.status === 'loading' ? '…' : formatCurrency(totalSpend)} tone="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <Card>
          <h2 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Profile</h2>
          <div className="space-y-3">
            {[
              ['Name',         c.user?.name],
              ['Phone',        c.user?.phone],
              ['Email',        c.user?.email],
              ['Account type', titleCase(c.accountType || 'RETAIL')],
              ['Joined',       formatDate(c.createdAt)],
              ...(c.corporate ? [['Company', c.corporate.companyName], ['GSTIN', c.corporate.gstin]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>{label}</span>
                <span className="text-xs font-semibold text-right" style={{ color: '#1F2937' }}>{value || '—'}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent bookings */}
        <Card padded={false} className="lg:col-span-2">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-sm font-bold" style={{ color: '#1F2937' }}>Recent Bookings</h2>
          </div>
          {bookings.status === 'loading' && <LoadingState label="Loading bookings…" />}
          {bookings.status !== 'loading' && recentBookings.length === 0 && (
            <EmptyState icon={CalendarCheck} title="No bookings yet"
              description="This customer has not made any bookings yet." />
          )}
          {recentBookings.length > 0 && (
            <div className="divide-y" style={{ borderColor: '#F7F8FC' }}>
              {recentBookings.map((b) => (
                <div key={b.id}
                  className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/admin/bookings/${b.id}`)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: '#1F2937' }}>
                      {addr(b.pickupAddress)} → {addr(b.dropAddress)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      {b.tripType?.replace(/_/g,' ')} · {titleCase(b.vehicleClass || '—')} · {formatDateTime(b.pickupAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <StatusBadge status={b.status} />
                    <p className="text-xs font-bold mt-1" style={{ color: '#1F2937' }}>
                      {formatCurrency(Number(b.finalFare ?? b.estimatedFare) || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit drawer */}
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Edit customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleSubmit}>Save changes</Button>
          </>
        }>
        <div className="space-y-4">
          <FormField label="Account type">
            <Select value={values.accountType}
              onChange={(e) => setValue('accountType', e.target.value)}
              options={[{ value:'RETAIL', label:'Retail' }, { value:'CORPORATE', label:'Corporate' }]} />
          </FormField>
          <FormField label="Internal notes">
            <Input as="textarea" rows={3} value={values.notes || ''}
              onChange={(e) => setValue('notes', e.target.value)}
              placeholder="Notes visible only to staff…" />
          </FormField>
        </div>
      </Drawer>
    </div>
  );
}
