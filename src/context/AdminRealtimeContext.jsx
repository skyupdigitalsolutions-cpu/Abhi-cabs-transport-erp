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
import { API_BASE_URL, USE_MOCK } from '../services/apiClient';
import { getToken } from '../services/authStorage';

const AdminRealtimeContext = createContext({ connected: false, feed: [], lastBookingEventId: null });

const MAX_FEED_ITEMS = 30;

export function AdminRealtimeProvider({ children, enabled = true }) {
  const toast = useToast();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);

  const pushFeedItem = useCallback((item) => {
    setFeed((prev) => [{ ...item, id: `${Date.now()}-${Math.random()}`, at: item.at || new Date().toISOString() }, ...prev].slice(0, MAX_FEED_ITEMS));
  }, []);

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

  const lastBookingEventId = feed.find((f) => f.kind === 'booking:created')?.id || null;

  return (
    <AdminRealtimeContext.Provider value={{ connected, feed, lastBookingEventId }}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtimeContext() {
  return useContext(AdminRealtimeContext);
}
