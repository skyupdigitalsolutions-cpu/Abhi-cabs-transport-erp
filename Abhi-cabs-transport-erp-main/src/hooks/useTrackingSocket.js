import { useEffect, useRef, useState } from 'react';
import { createTrackingSocket } from '../services/socketService';

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
