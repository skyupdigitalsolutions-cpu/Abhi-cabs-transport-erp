import { useEffect, useRef, useState } from 'react';
import { createTrackingSocket } from '../services/socketService';
import { apiClient } from '../services/apiClient';

/**
 * Wires the tracking UI to the realtime socket (real Socket.IO connection to
 * the backend when VITE_USE_MOCK=false, a simulated ticker only in mock mode
 * — see services/socketService.js), exposing connection state, per-driver
 * last-known positions and stale-location detection.
 */
export function useTrackingSocket(driverIds) {
  const [connection, setConnection] = useState('connecting'); // connecting | open | reconnecting | closed
  const [positions, setPositions] = useState({});
  const socketRef = useRef(null);

  // Seed from the LAST KNOWN position before any socket traffic arrives.
  //
  // Without this the map sits on "Waiting for GPS signal…" until each driver's
  // next ping — up to 6s for an active driver, and FOREVER for one who is
  // marked online but whose app is backgrounded (the driver app's pinger is
  // foreground-only). The backend already keeps the last fix in Redis:
  // GET /admin/location/driver/:driverId → { location: { lat, lng, speed,
  // heading, lastPingAt } }, 404 when there is no fix at all.
  // Seed AND keep positions fresh via REST polling — resilient to the socket.
  //
  // The realtime socket (below) pushes 'driver:location' the instant a driver
  // pings, which is ideal. But websocket upgrades are often blocked by proxies
  // (Cloudflare/Railway), leaving the socket stuck 'connecting' and the map
  // frozen. So we ALSO poll the backend's last-known fix every few seconds:
  //   GET /admin/location/driver/:driverId → { location: { lat, lng, speed,
  //   heading, lastPingAt } }, 404 when there is no fix at all.
  // Socket and poll updates are merged by timestamp (newest wins), so whichever
  // path is working keeps the markers moving.
  useEffect(() => {
    if (!driverIds.length) return;
    let cancelled = false;
    let timer = null;

    const pollOnce = async () => {
      const fixes = await Promise.all(
        driverIds.map((id) =>
          apiClient.get(`/admin/location/driver/${id}`)
            .then((res) => {
              const body = res?.data?.success !== undefined ? res.data : res;
              const loc = (body?.data ?? body)?.location;
              if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
              return {
                driverId: id,
                lat: loc.lat,
                lng: loc.lng,
                speedKmph: loc.speed ?? 0,
                heading: loc.heading ?? null,
                at: loc.lastPingAt ? new Date(loc.lastPingAt).getTime() : Date.now(),
              };
            })
            .catch(() => null), // 404 = no fix yet for this driver; expected
        ),
      );
      if (cancelled) return;
      const fresh = fixes.filter(Boolean);
      if (!fresh.length) return;
      setPositions((prev) => {
        const next = { ...prev };
        for (const f of fresh) {
          const cur = prev[f.driverId];
          // Newest fix wins, so a live socket push is never overwritten by an
          // older polled value (and vice-versa).
          if (!cur || (f.at ?? 0) >= (cur.at ?? 0)) next[f.driverId] = f;
        }
        return next;
      });
    };

    pollOnce();                          // immediate seed
    timer = setInterval(pollOnce, 5000); // then keep fresh

    return () => { cancelled = true; if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverIds.join(',')]);

  useEffect(() => {
    const socket = createTrackingSocket();
    socketRef.current = socket;
    const offOpen = socket.on('open', () => setConnection('open'));
    const offReconnecting = socket.on('reconnecting', () => setConnection('reconnecting'));
    const offClose = socket.on('close', () => setConnection('closed'));
    const offLocation = socket.on('location', (loc) => {
      setPositions((prev) => ({ ...prev, [loc.driverId]: loc }));
    });

    socket.connect(driverIds);

    return () => {
      offOpen(); offReconnecting(); offClose(); offLocation();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverIds.join(',')]);

  return { connection, positions };
}
