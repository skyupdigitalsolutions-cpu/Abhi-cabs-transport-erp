/**
 * src/pages/admin/BookingRequests.jsx
 *
 * Enquiries for trips OUTSIDE the states we operate in. A customer whose trip
 * touches another state is offered "send a booking request" on the website;
 * it lands here (booking_requests table), nothing is booked or charged.
 *
 * Staff call the customer back, quote, and then mark the request:
 *   REVIEWING → QUOTED → ACCEPTED (needs the id of the booking it became) | DECLINED
 * ACCEPTED / DECLINED / CANCELLED are final — the backend refuses further edits.
 *
 * Backend: GET/PATCH /admin/booking-requests (permission BOOKING_MANAGE)
 */
import { useState, useEffect, useRef } from 'react';
import { Phone, Mail, RefreshCw, MapPin, Eye } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar  from '../../components/ui/FilterBar';
import DataTable  from '../../components/ui/DataTable';
import Badge      from '../../components/ui/Badge';
import Drawer     from '../../components/ui/Drawer';
import Button     from '../../components/ui/Button';
import FormField  from '../../components/ui/FormField';
import Input      from '../../components/ui/Input';
import Textarea   from '../../components/ui/Textarea';
import { useResourceList } from '../../hooks/useResourceList';
import { useToast } from '../../hooks/useToast';
import { bookingRequestService } from '../../services';
import { formatDate, formatDateTime, titleCase } from '../../utils/formatters';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';

const STATUS_TONE = {
  NEW: 'amber', REVIEWING: 'blue', QUOTED: 'purple',
  ACCEPTED: 'green', DECLINED: 'red', CANCELLED: 'slate',
};
const FILTER_STATUSES = ['NEW', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED'];
const CLOSED = new Set(['ACCEPTED', 'DECLINED', 'CANCELLED']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRIP_LABEL = { ONE_WAY: 'One way', ROUND_TRIP: 'Round trip', AIRPORT: 'Airport', HOURLY: 'Local / hourly' };

// Website guest checkouts get a generated address (guest-<uuid>@guest.invalid)
// that can never receive mail — never show it as the customer's email.
const realEmail = (e) => (e && !/@(guest\.invalid|placeholder\.local)$/i.test(e) ? e : '');

// A round trip's return is a DATE (stored as end of that day, IST) — never
// shown with a time, because none was asked for.
const returnDateOf = (r) => (r?.tripType === 'ROUND_TRIP' && r?.returnAt
  ? formatDate(r.returnAt, { timeZone: 'Asia/Kolkata' })
  : null);

const vehicleName = (v) => (v ? titleCase(String(v).replace(/-/g, ' ')) : null);

const contactOf = (r) => ({
  name:  r.contactName  || r.customer?.name  || '—',
  phone: r.contactPhone || r.customer?.phone || '',
  email: realEmail(r.contactEmail) || realEmail(r.customer?.email),
});

export default function BookingRequests() {
  const toast = useToast();

  // No status filter = the open queue (NEW, REVIEWING, QUOTED), oldest first.
  const list = useResourceList(bookingRequestService, {
    filterDefaults: { status: '' },
    limit: 15,
  });

  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [saving, setSaving] = useState(false);

  // Reload when a new request arrives over the socket (AdminRealtimeContext),
  // so the queue is current without pressing Refresh. Skips the first render.
  const { requestTick, refreshRequestCount } = useAdminRealtimeContext();
  const firstTick = useRef(true);
  useEffect(() => {
    if (firstTick.current) { firstTick.current = false; return; }
    list.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestTick]);

  const open = (r) => { setSelected(r); setNote(r.adminNote || ''); setBookingId(r.convertedBookingId || ''); };
  const close = () => { setSelected(null); setNote(''); setBookingId(''); };

  const save = async (status) => {
    if (!selected) return;
    const body = {};
    if (status) body.status = status;
    if (note.trim() !== (selected.adminNote || '')) body.adminNote = note.trim();
    if (status === 'ACCEPTED') {
      if (!UUID_RE.test(bookingId.trim())) {
        toast.error('Enter the booking id (UUID) this request became before accepting.');
        return;
      }
      body.convertedBookingId = bookingId.trim();
    }
    if (Object.keys(body).length === 0) { toast.error('Nothing to save.'); return; }

    setSaving(true);
    try {
      const updated = await bookingRequestService.update(selected.id, body);
      toast.success(status ? `Marked ${status.toLowerCase()}` : 'Note saved');
      setSelected({ ...selected, ...updated });
      list.reload();
      // Moving a request out of NEW should clear it from the sidebar badge.
      if (status) refreshRequestCount();
    } catch (e) {
      toast.error(e.message || 'Could not update the request');
    } finally {
      setSaving(false);
    }
  };

  const rows = list.rows || [];
  const isClosed = selected ? CLOSED.has(selected.status) : false;

  const columns = [
    {
      key: 'requestNumber', header: 'Request',
      render: (r) => (
        <div>
          <p className="font-bold text-xs" style={{ color: '#111111' }}>{r.requestNumber}</p>
          <p className="text-[11.5px]" style={{ color: '#9A9A9A' }}>{TRIP_LABEL[r.tripType] || r.tripType}</p>
          {r.vehicleClass && <p className="text-[11.5px] font-semibold" style={{ color: '#374151' }}>{vehicleName(r.vehicleClass)}</p>}
        </div>
      ),
    },
    {
      key: 'contact', header: 'Customer',
      render: (r) => {
        const c = contactOf(r);
        return (
          <div>
            <p className="font-bold text-xs" style={{ color: '#111111' }}>{c.name}</p>
            <p className="text-xs flex items-center gap-1" style={{ color: '#9A9A9A' }}>
              <Phone size={10} /> {c.phone || '—'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'route', header: 'Route',
      render: (r) => (
        <div className="max-w-[260px]">
          <p className="text-xs truncate" style={{ color: '#111111' }}>{r.pickupAddress}</p>
          <p className="text-[11.5px] truncate" style={{ color: '#9A9A9A' }}>→ {r.dropAddress}</p>
        </div>
      ),
    },
    {
      key: 'pickupAt', header: 'Pickup',
      render: (r) => (
        <div>
          <span className="text-xs" style={{ color: '#374151' }}>{formatDateTime(r.pickupAt)}</span>
          {returnDateOf(r) && <p className="text-[11.5px]" style={{ color: '#9A9A9A' }}>Return {returnDateOf(r)}</p>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'slate'}>{r.status}</Badge>,
    },
    {
      key: 'createdAt', header: 'Received',
      render: (r) => <span className="text-xs" style={{ color: '#9A9A9A' }}>{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <Button size="sm" variant="secondary" icon={Eye} onClick={() => open(r)}>View</Button>
      ),
    },
  ];

  const c = selected ? contactOf(selected) : null;

  return (
    <div>
      <PageHeader
        title="Booking Requests"
        description="Trips outside our service states. Call the customer, quote, then mark the outcome. Nothing here is booked or charged."
        actions={
          <button onClick={list.reload}
            className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#3B65DB' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      <FilterBar
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'Open requests',
            options: FILTER_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        onRowClick={open}
        emptyTitle="No booking requests"
        emptyDescription="When a customer asks to book a trip outside our service states, it will appear here."
      />

      <Drawer
        open={!!selected}
        onClose={close}
        title={selected ? `Request ${selected.requestNumber}` : 'Booking request'}
        footer={
          selected && !isClosed ? (
            <div className="flex gap-2 w-full flex-wrap">
              <Button size="sm" variant="secondary" loading={saving} onClick={() => save(null)}>Save note</Button>
              {selected.status !== 'REVIEWING' && (
                <Button size="sm" variant="secondary" loading={saving} onClick={() => save('REVIEWING')}>Mark reviewing</Button>
              )}
              {selected.status !== 'QUOTED' && (
                <Button size="sm" variant="secondary" loading={saving} onClick={() => save('QUOTED')}>Mark quoted</Button>
              )}
              <Button size="sm" variant="secondary" loading={saving} onClick={() => save('DECLINED')}>Decline</Button>
              <Button size="sm" loading={saving} onClick={() => save('ACCEPTED')}>Accept (booked)</Button>
            </div>
          ) : null
        }
      >
        {selected && c && (
          <div className="space-y-5">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
              <p className="font-bold text-sm" style={{ color: '#111111' }}>{c.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs" style={{ color: '#3B65DB' }}>
                    <Phone size={11} /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs" style={{ color: '#3B65DB' }}>
                    <Mail size={11} /> {c.email}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge tone={STATUS_TONE[selected.status] || 'slate'}>{selected.status}</Badge>
                <span className="text-[11.5px]" style={{ color: '#9A9A9A' }}>Received {formatDateTime(selected.createdAt)}</span>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAFAFA', border: '1px solid #E8E8E4' }}>
              <p className="text-[11.5px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9A9A9A' }}>Trip</p>
              <div className="space-y-2 text-sm" style={{ color: '#374151', lineHeight: 1.5 }}>
                <p className="flex gap-2"><MapPin size={14} className="mt-1 shrink-0" />
                  <span><b>From:</b> {selected.pickupAddress}{selected.pickupState ? ` (${selected.pickupState})` : ''}</span></p>
                <p className="flex gap-2"><MapPin size={14} className="mt-1 shrink-0" />
                  <span><b>To:</b> {selected.dropAddress}{selected.dropState ? ` (${selected.dropState})` : ''}</span></p>
                <p><b>Type:</b> {TRIP_LABEL[selected.tripType] || selected.tripType}
                  {selected.passengers ? ` · ${selected.passengers} passengers` : ''}</p>
                <p><b>Vehicle:</b> {vehicleName(selected.vehicleClass) || 'Not chosen'}</p>
                <p><b>Pickup:</b> {formatDateTime(selected.pickupAt)}</p>
                {returnDateOf(selected) && <p><b>Return date:</b> {returnDateOf(selected)}</p>}
                {selected.note && <p><b>Customer note:</b> {selected.note}</p>}
              </div>
            </div>

            {selected.reason && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FCD34D' }}>
                <p className="text-xs font-semibold" style={{ color: '#92400E' }}>Why this couldn't be booked online</p>
                <p className="text-xs mt-1" style={{ color: '#B45309' }}>{selected.reason}</p>
              </div>
            )}

            {isClosed ? (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
                <p className="text-xs font-semibold" style={{ color: '#374151' }}>
                  This request is {selected.status.toLowerCase()} and can no longer be changed.
                </p>
                {selected.adminNote && <p className="text-xs mt-2" style={{ color: '#374151' }}><b>Note:</b> {selected.adminNote}</p>}
                {selected.convertedBookingId && (
                  <p className="text-xs mt-2 break-all" style={{ color: '#374151' }}><b>Booking id:</b> {selected.convertedBookingId}</p>
                )}
              </div>
            ) : (
              <>
                <FormField label="Internal note" htmlFor="br-admin-note" hint="Quote given, call outcome, etc. Not shown to the customer.">
                  <Textarea id="br-admin-note" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                </FormField>
                <FormField label="Booking id (only when accepting)" htmlFor="br-booking-id"
                  hint="Create the trip under Bookings first, then paste its id here to link the two.">
                  <Input id="br-booking-id" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </FormField>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
