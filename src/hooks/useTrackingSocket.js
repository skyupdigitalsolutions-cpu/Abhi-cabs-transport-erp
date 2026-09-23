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
  useEffect(() => {
    if (!driverIds.length) return;
    let cancelled = false;

    Promise.all(
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
              // Age the marker off its real ping time, not "now" — otherwise a
              // six-hour-old fix would render as a live one.
              at: loc.lastPingAt ? new Date(loc.lastPingAt).getTime() : Date.now(),
            };
          })
          .catch(() => null), // 404 = no fix yet for this driver; expected
      ),
    ).then((seeds) => {
      if (cancelled) return;
      const seeded = {};
      seeds.filter(Boolean).forEach((s) => { seeded[s.driverId] = s; });
      if (Object.keys(seeded).length === 0) return;
      // Never clobber a live socket fix that landed while this was in flight.
      setPositions((prev) => ({ ...seeded, ...prev }));
    });

    return () => { cancelled = true; };
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
