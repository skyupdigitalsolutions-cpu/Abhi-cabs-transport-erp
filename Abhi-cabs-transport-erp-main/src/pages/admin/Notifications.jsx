/**
 * Notifications page — uses the live Socket.IO feed from AdminRealtimeContext
 * as its data source, since the backend has no /admin/notifications REST
 * endpoint yet. Events arrive in real-time via the shared socket connection
 * established in AdminRealtimeProvider (wired in AdminLayout).
 *
 * Feed events:
 *   booking:created    — new booking made
 *   booking:attempted  — booking attempt
 *   admin:alert        — booking attempt failed — needs attention
 *   trip:status        — booking status changed
 *   booking:allocated  — vehicle/driver assigned
 *   payment:received   — payment captured
 */
import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Car, CreditCard, AlertTriangle, Info, Radio } from 'lucide-react';
import PageHeader   from '../../components/ui/PageHeader';
import Card         from '../../components/ui/Card';
import Button       from '../../components/ui/Button';
import EmptyState   from '../../components/ui/EmptyState';
import Badge        from '../../components/ui/Badge';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { timeAgo }  from '../../utils/formatters';

// Map socket event kind → display config
const KIND_CONFIG = {
  'booking:created':   { label: 'New Booking',       tone: 'green', Icon: Car },
  'booking:attempted': { label: 'Booking Attempt',   tone: 'slate', Icon: Info },
  'admin:alert':       { label: 'Attempt Failed',    tone: 'red',   Icon: AlertTriangle },
  'trip:status':       { label: 'Status Changed',    tone: 'blue',  Icon: Car },
  'booking:allocated': { label: 'Vehicle Allocated', tone: 'purple',Icon: Car },
  'payment:received':  { label: 'Payment Received',  tone: 'green', Icon: CreditCard },
  // NEW — polled, not pushed live. See AdminRealtimeContext.jsx for why.
  'booking:abandoned': { label: 'Abandoned Booking',  tone: 'amber', Icon: AlertTriangle },
};

function kindConfig(kind) {
  return KIND_CONFIG[kind] || { label: kind, tone: 'slate', Icon: Info };
}

/**
 * FIX: every booking a customer made showed up as its own fully separate
 * row — a customer who booked 3 times in one session produced 3 identical-
 * looking "New Booking" entries, cluttering the feed and making it look
 * like 3 different customers were active rather than one repeat customer.
 * Groups consecutive booking:created events by customerId into one row
 * with a "×N" count and the full list of booking numbers, instead of N
 * separate rows. Other event kinds (payments, trip status, alerts) are
 * left exactly as they were — only repeat NEW BOOKINGS get grouped, since
 * that's specifically what was asked for.
 */
function groupFeed(feed) {
  const grouped = [];
  const byCustomer = new Map(); // customerId -> the group object already pushed into `grouped`

  for (const item of feed) {
    if (item.kind !== 'booking:created' || !item.customerId) {
      grouped.push(item);
      continue;
    }
    const existing = byCustomer.get(item.customerId);
    if (existing) {
      existing.bookingNumbers.push(item.bookingNumber || item.bookingId);
      existing.count += 1;
      // Keep the most recent timestamp/status for display, but the group
      // stays in its ORIGINAL (first-seen) position in the feed order.
      existing.at = item.at;
      existing.status = item.status;
    } else {
      const group = {
        ...item,
        bookingNumbers: [item.bookingNumber || item.bookingId],
        count: 1,
      };
      byCustomer.set(item.customerId, group);
      grouped.push(group);
    }
  }
  return grouped;
}

function NotificationRow({ item, isNew }) {
  const { label, tone, Icon } = kindConfig(item.kind);

  // Build a human-readable summary from the payload
  let summary = '';
  if (item.count > 1) {
    // Grouped repeat-customer bookings — show the count and every booking
    // number involved, rather than the single most-recent one.
    summary = `${item.count} bookings: ${item.bookingNumbers.join(', ')}`;
  } else if (item.kind === 'booking:abandoned') {
    summary = `${item.name} (${item.mobile})`;
  } else {
    if (item.bookingNumber) summary += `Booking ${item.bookingNumber}`;
    if (item.vehicleClass)  summary += summary ? ` · ${item.vehicleClass}` : item.vehicleClass;
    if (item.status)        summary += summary ? ` · ${item.status}` : item.status;
    if (item.amount)        summary += summary ? ` · ₹${item.amount}` : `₹${item.amount}`;
    if (item.reason)        summary += summary ? ` · ${item.reason}` : item.reason;
    if (!summary)           summary = label;
  }

  return (
    <div
      className="flex items-start gap-3 px-5 py-4"
      style={{
        borderBottom: '1px solid #F7F8FC',
        backgroundColor: isNew ? '#fffbea' : 'transparent',
      }}
    >
      {/* Icon */}
      <div
        className="h-8 w-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{ backgroundColor: '#F7F8FC' }}
      >
        <Icon size={16} style={{ color: tone === 'red' ? '#DC2626' : tone === 'green' ? '#16a34a' : '#3B65DB' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge tone={tone}>{label}</Badge>
          {item.count > 1 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}
            >
              ×{item.count}
            </span>
          )}
          {isNew && (
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#FFC107', color: '#111' }}
            >
              NEW
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: '#1F2937' }}>{summary}</p>
      </div>

      {/* Time */}
      <span className="text-xs shrink-0 mt-1" style={{ color: '#9CA3AF' }}>
        {timeAgo(item.at)}
      </span>
    </div>
  );
}

export default function Notifications() {
  const { connected, feed } = useAdminRealtimeContext();
  const [cleared, setCleared] = useState(false);
  const [localFeed, setLocalFeed] = useState(null);

  // Allow clearing the in-memory feed
  const rawFeed = localFeed ?? feed;
  const displayFeed = groupFeed(rawFeed);
  const handleClear = () => setLocalFeed([]);

  // Mark first 5 as "new" (arrived in this session)
  const newIds = new Set(displayFeed.slice(0, 5).map((f) => f.id));

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={
          connected
            ? `${displayFeed.length} events this session · live updates connected`
            : 'Live updates not connected — go online to receive events'
        }
        actions={
          displayFeed.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={Trash2}
              onClick={handleClear}
            >
              Clear session
            </Button>
          )
        }
      />

      {/* Connection status banner */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4 text-xs font-semibold"
        style={{
          backgroundColor: connected ? '#f0fdf4' : '#fef2f2',
          color: connected ? '#166534' : '#991B1B',
          border: `1px solid ${connected ? '#bbf7d0' : '#fecaca'}`,
        }}
      >
        <Radio size={13} />
        {connected
          ? 'Socket.IO connected — receiving live booking, trip and payment events'
          : 'Socket.IO disconnected — log in and navigate to any page to reconnect'
        }
      </div>

      {/* Feed */}
      {displayFeed.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="No events yet"
            description={
              connected
                ? 'Events will appear here as bookings, trips and payments happen in real time.'
                : 'Connect to the live socket to start receiving events.'
            }
          />
        </Card>
      ) : (
        <Card padded={false}>
          <div>
            {displayFeed.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                isNew={newIds.has(item.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Note about persistence */}
      <p className="text-xs mt-4 text-center" style={{ color: '#9CA3AF' }}>
        Events shown here are from the current session only and reset on page refresh.
        Persistent push notifications require Firebase configuration in <code>.env</code>.
      </p>
    </div>
  );
}
