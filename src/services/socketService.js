/**
 * Realtime tracking socket.
 *
 * Two implementations behind the same { on, connect, disconnect } interface:
 *   - MockTrackingSocket   — simulated ticks (unchanged behaviour), used
 *                            when VITE_USE_MOCK=true.
 *   - LiveTrackingSocket   — a real Socket.IO connection to the backend
 *                            (JWT-authenticated), used when VITE_USE_MOCK=false.
 * createTrackingSocket() picks the right one so callers (useTrackingSocket)
 * never need to know which mode is active.
 *
 * Requires the `socket.io-client` package (see package.json). If it isn't
 * installed yet, the live socket falls back to the mock automatically so
 * the tracking UI still renders.
 */
import { USE_MOCK, API_BASE_URL } from './apiClient';
import { getToken } from './authStorage';

const BENGALURU = { lat: 12.9716, lng: 77.5946 };

// ── Mock implementation (unchanged) ─────────────────────────────────────────
class MockTrackingSocket {
  constructor() {
    this.listeners = { open: [], close: [], reconnecting: [], location: [], error: [] };
    this.status = 'idle';
    this.timers = [];
  }

  on(event, cb) {
    this.listeners[event]?.push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb);
    };
  }

  emit(event, payload) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }

  connect(driverIds = []) {
    this.status = 'connecting';
    const connectTimer = setTimeout(() => {
      this.status = 'open';
      this.emit('open', { at: Date.now() });
      this._startTicking(driverIds);
    }, 600);
    this.timers.push(connectTimer);

    const flakeTimer = setTimeout(() => {
      if (this.status !== 'open') return;
      this.status = 'reconnecting';
      this.emit('reconnecting', { attempt: 1 });
      const backTimer = setTimeout(() => {
        this.status = 'open';
        this.emit('open', { at: Date.now(), resumed: true });
      }, 1800);
      this.timers.push(backTimer);
    }, 18000);
    this.timers.push(flakeTimer);
  }

  _startTicking(driverIds) {
    const positions = {};
    driverIds.forEach((id) => {
      positions[id] = { lat: BENGALURU.lat + (Math.random() - 0.5) * 0.08, lng: BENGALURU.lng + (Math.random() - 0.5) * 0.08 };
    });
    const tick = setInterval(() => {
      if (this.status !== 'open') return;
      driverIds.forEach((id) => {
        const pos = positions[id];
        pos.lat += (Math.random() - 0.5) * 0.004;
        pos.lng += (Math.random() - 0.5) * 0.004;
        this.emit('location', {
          driverId: id,
          lat: pos.lat,
          lng: pos.lng,
          speedKmph: Math.round(20 + Math.random() * 50),
          heading: Math.round(Math.random() * 359),
          at: Date.now(),
        });
      });
    }, 4000);
    this.timers.push(tick);
  }

  disconnect() {
    this.status = 'closed';
    this.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    this.timers = [];
    this.emit('close', { at: Date.now() });
  }
}

// ── Live implementation — real Socket.IO connection ─────────────────────────
class LiveTrackingSocket {
  constructor() {
    this.listeners = { open: [], close: [], reconnecting: [], location: [], error: [] };
    this.status = 'idle';
    this.io = null;
    this.mockFallback = null; // used if socket.io-client isn't installed / connect fails
  }

  on(event, cb) {
    this.listeners[event]?.push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb);
    };
  }

  emit(event, payload) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }

  async connect(driverIds = []) {
    this.status = 'connecting';
    try {
      // Dynamic import so the app still builds/runs if the package isn't
      // installed yet (`npm install socket.io-client` — see package.json).
      const { io } = await import('socket.io-client');
      const wsBase = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
      const httpBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

      this.io = io(httpBase, {
        auth: { token: getToken() },
        transports: ['websocket'],
        reconnection: true,
      });

      this.io.on('connect', () => {
        this.status = 'open';
        this.emit('open', { at: Date.now() });
        // Subscribe to the drivers we care about once connected.
        this.io.emit('subscribe:drivers', { driverIds });
      });

      this.io.on('disconnect', () => {
        this.status = 'closed';
        this.emit('close', { at: Date.now() });
      });

      this.io.on('reconnect_attempt', (attempt) => {
        this.status = 'reconnecting';
        this.emit('reconnecting', { attempt });
      });

      this.io.on('driver:location', (loc) => {
        this.emit('location', loc);
      });

      this.io.on('connect_error', (err) => {
        this.emit('error', err);
      });
    } catch (err) {
      // socket.io-client not installed, or connection failed — fall back to
      // the mock ticker so the tracking screen still shows movement while
      // the real realtime layer is being wired up.
      console.warn('[socketService] Live socket unavailable, using mock ticker:', err?.message || err);
      this.mockFallback = new MockTrackingSocket();
      Object.keys(this.listeners).forEach((event) => {
        this.listeners[event].forEach((cb) => this.mockFallback.on(event, cb));
      });
      this.mockFallback.connect(driverIds);
    }
  }

  disconnect() {
    this.status = 'closed';
    if (this.io) {
      this.io.disconnect();
      this.io = null;
    }
    if (this.mockFallback) {
      this.mockFallback.disconnect();
      this.mockFallback = null;
    }
    this.emit('close', { at: Date.now() });
  }
}

export function createTrackingSocket() {
  return USE_MOCK ? new MockTrackingSocket() : new LiveTrackingSocket();
}
