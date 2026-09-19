/**
 * AdminRealtimeContext — establishes exactly ONE Socket.IO connection for the
 * whole admin session and shares it via context, so multiple components
 * (Navbar's live indicator, Dashboard's activity feed, Dispatch board, etc.)
 * can all react to the same live events without opening duplicate sockets.
 *
 * The backend auto-joins this identity to the right rooms based on role
 * (ADMIN → `dispatch` + `admin`, OPS → `dispatch`) — see the backend's
 * src/realtime/rooms.js. This provider just listens for whatever the
 * backend pushes to those rooms.
 *
 * Events (see backend src/realtime/bridge.js for exact payload shapes):
 *   booking:created    — a new booking was made (customer website OR ERP)
 *   booking:attempted  — a booking attempt happened (in-flight)
 *   admin:alert        — a booking attempt FAILED — needs admin attention
 *   trip:status        — a booking's status changed
 *   booking:allocated  — a driver/vehicle was assigned
 *   payment:received   — a payment came in
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import { API_BASE_URL, USE_MOCK, apiClient } from '../services/apiClient';
import { getToken } from '../services/authStorage';
import { contactService } from '../services';

const AdminRealtimeContext = createContext({ connected: false, feed: [], lastEventId: null });

const MAX_FEED_ITEMS = 30;

export function AdminRealtimeProvider({ children, enabled = true }) {
  const toast = useToast();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);

  const pushFeedItem = useCallback((item) => {
    setFeed((prev) => [{ ...item, id: `${Date.now()}-${Math.random()}`, at: item.at || new Date().toISOString() }, ...prev].slice(0, MAX_FEED_ITEMS));
  }, []);

  // NEW: abandoned-checkout notifications, via polling — NOT a real-time
  // push. The customer website logs an abandoned checkout as a genuine
  // Contact/Support record (topic "Abandoned Booking"), but creating a
  // contact triggers no socket event at all on the backend (checked
  // contact.service.js directly). Polling this endpoint periodically is
  // the honest, best-available approximation of "notify admin" without a
  // backend change — noticeably faster than "whenever someone happens to
  // open Support," but not instant like the other events in this file.
  const seenAbandonedIdsRef = useRef(new Set());
  const abandonedPollFirstRunRef = useRef(true);

  useEffect(() => {
    if (!enabled || USE_MOCK) return undefined;
    let cancelled = false;

    async function pollAbandoned() {
      try {
        const res = await contactService.list({ search: 'Abandoned Booking', limit: 10, sortBy: 'createdAt', order: 'desc' });
        if (cancelled) return;
        const items = res?.items ?? [];
        // First run just records what already exists — nothing here is
        // "new", so nothing should toast on initial page load.
        if (abandonedPollFirstRunRef.current) {
          items.forEach((c) => seenAbandonedIdsRef.current.add(c.id));
          abandonedPollFirstRunRef.current = false;
          return;
        }
        const freshOnes = items.filter((c) => !seenAbandonedIdsRef.current.has(c.id));
        freshOnes.forEach((c) => {
          seenAbandonedIdsRef.current.add(c.id);
          pushFeedItem({ kind: 'booking:abandoned', contactId: c.id, name: c.name, mobile: c.mobile, message: c.message });
          toast.info(`Abandoned booking — ${c.name} (${c.mobile})`, { duration: 6000 });
        });
      } catch {
        // Best-effort only — a failed poll just tries again next interval.
      }
    }

    pollAbandoned();
    const interval = setInterval(pollAbandoned, 60000); // every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, [enabled, pushFeedItem, toast]);

  useEffect(() => {
    if (!enabled || USE_MOCK) return undefined;
    const token = getToken();
    if (!token) return undefined;

    let socket;
    let cancelled = false;

    (async () => {
      try {
        const { io } = await import('socket.io-client');
        if (cancelled) return;

        const socketBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

        socket = io(socketBase, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (err) => {
          setConnected(false);
          console.warn('[realtime] connection failed:', err.message);
        });

        socket.on('booking:created', (payload) => {
          toast.success(
            `New booking ${payload.bookingNumber || payload.bookingId} — ${payload.vehicleClass || 'vehicle'} (${payload.status})`,
            { duration: 6000 }
          );
          pushFeedItem({ kind: 'booking:created', ...payload });

          // FIX (frontend-only automatic dispatch, no backend change):
          // POST /admin/dispatch/bookings/:id/auto-assign already exists
          // and already works — it just previously required an admin to
          // manually click "Auto-Assign" on the Dispatch page for every
          // single booking. This calls that exact same, real endpoint
          // automatically the moment this admin session sees a new
          // booking come in, using this admin's own live session/token.
          //
          // REAL LIMITATION, stated plainly: this only works (a) while an
          // admin with dispatch permission has this dashboard open and
          // connected, and (b) for bookings that are already CONFIRMED —
          // "Book at Zero" (pay-later) bookings are confirmed immediately,
          // so this covers them correctly. A PARTIAL/FULL-pay booking
          // starts PENDING until its payment actually captures, and the
          // booking:created payload here doesn't include status at all
          // (confirmed against booking.service.js's emit — no `status`
          // field is sent), so there's no reliable signal from the
          // frontend alone to know when a PENDING booking later becomes
          // payable-confirmed. The call below will simply get a
          // "not assignable yet" conflict for those and do nothing — they
          // still need a manual Auto-Assign click once paid, same as
          // before. Getting PARTIAL/FULL bookings to auto-dispatch too
          // would need a real backend change (a socket event fired at the
          // moment payment capture flips status to CONFIRMED).
          if (payload.bookingId) {
            apiClient.post(`/admin/dispatch/bookings/${payload.bookingId}/auto-assign`, {})
              .then(() => {
                toast.success(`Auto-dispatched ${payload.bookingNumber || payload.bookingId} to the nearest driver`, { duration: 4000 });
              })
              .catch((err) => {
                // Expected/harmless for PENDING (unpaid) bookings, or when
                // no eligible vehicle is free right now — these just fall
                // back to the existing manual Assign flow on the Dispatch
                // page, exactly as they did before this change.
                console.log('[auto-dispatch] not assigned automatically — falls back to manual dispatch:', err.message);
              });
          }
        });

        socket.on('booking:attempted', (payload) => {
          if (payload.outcome === 'FAILED') return; // admin:alert covers this louder
          pushFeedItem({ kind: 'booking:attempted', ...payload });
        });

        socket.on('admin:alert', (payload) => {
          toast.error(`Booking attempt failed — ${payload.reason || 'unknown reason'}`, { duration: 8000 });
          pushFeedItem({ kind: 'admin:alert', ...payload });
        });

        socket.on('trip:status', (payload) => {
          pushFeedItem({ kind: 'trip:status', ...payload });
        });

        socket.on('booking:allocated', (payload) => {
          toast.info(`Booking ${payload.bookingId} allocated a vehicle`, { duration: 5000 });
          pushFeedItem({ kind: 'booking:allocated', ...payload });
        });

        socket.on('payment:received', (payload) => {
          toast.success(`Payment received — ₹${payload.amount} (${payload.purpose})`, { duration: 5000 });
          pushFeedItem({ kind: 'payment:received', ...payload });
        });
      } catch (err) {
        console.warn('[realtime] socket.io-client unavailable:', err.message);
      }
    })();

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // FIX: this used to only track the most recent `booking:created` event, so
  // the Navbar's unread bell counter never incremented for payments, alerts,
  // allocations, or trip-status changes — only new bookings. Now tracks the
  // most recent event of ANY kind (feed is newest-first, so feed[0] is it).
  const lastEventId = feed[0]?.id || null;

  return (
    <AdminRealtimeContext.Provider value={{ connected, feed, lastEventId }}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtimeContext() {
  return useContext(AdminRealtimeContext);
}
