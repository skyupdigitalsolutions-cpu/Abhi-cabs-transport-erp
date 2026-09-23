import { useMemo, useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import PageHeader      from '../../components/ui/PageHeader';
import Card            from '../../components/ui/Card';
import Badge           from '../../components/ui/Badge';
import Button          from '../../components/ui/Button';
import StatusBadge     from '../../components/ui/StatusBadge';
import LoadingState    from '../../components/ui/LoadingState';
import ErrorState      from '../../components/ui/ErrorState';
import ConnectionBadge from '../../components/tracking/ConnectionBadge';
import { useTrackingSocket } from '../../hooks/useTrackingSocket';
import { useApi }      from '../../hooks/useApi';
import { bookingService } from '../../services';
import { apiClient, USE_MOCK }   from '../../services/apiClient';
import { formatDateTime } from '../../utils/formatters';

const STALE_MS  = 20_000;
const CENTER    = { lat: 12.9716, lng: 77.5946 };
const MAPS_KEY  = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

// ── Google Maps loader ───────────────────────────────────────────────────────
function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.google?.maps) { setReady(true); return; }
    if (!MAPS_KEY) { setError('VITE_GOOGLE_MAPS_API_KEY not set in .env'); return; }

    // Avoid loading twice if another instance already appended the script
    if (document.getElementById('gmap-script')) return;

    const script = document.createElement('script');
    script.id  = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload  = () => setReady(true);
    script.onerror = () => setError('Failed to load Google Maps — check your API key.');
    document.head.appendChild(script);
  }, []);

  return { ready, error };
}

// ── Truck SVG for marker ─────────────────────────────────────────────────────
function truckSvg(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="17" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      <rect x="6" y="13" width="14" height="10" rx="1.5" fill="white"/>
      <path d="M20 15.5h4l3 4v3.5h-7V15.5z" fill="white"/>
      <circle cx="10" cy="25" r="2" fill="${color}"/>
      <circle cx="25" cy="25" r="2" fill="${color}"/>
    </svg>
  `)}`;
}

// ── Live Map ─────────────────────────────────────────────────────────────────
// Renders one marker per ONLINE driver (drivers[], see main component below) —
// not per active trip. A driver with no trip yet still gets a marker, just
// with "Waiting for a trip" in its info window instead of a route.
function LiveMap({ drivers, positions, now, selectedDriver, onSelectDriver }) {
  const mapRef     = useRef(null);
  const gmapRef    = useRef(null);   // google.maps.Map instance
  const markersRef = useRef({});     // driverId → google.maps.Marker
  const { ready, error } = useGoogleMaps();
  const [mapType, setMapType] = useState('roadmap'); // roadmap | satellite | hybrid

  // Init map once SDK is ready
  useEffect(() => {
    if (!ready || !mapRef.current || gmapRef.current) return;
    gmapRef.current = new window.google.maps.Map(mapRef.current, {
      center:    CENTER,
      zoom:      12,
      mapTypeId: mapType,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,   // we render our own switcher
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
      ],
    });
  }, [ready]);

  // Swap map type when toggle changes
  useEffect(() => {
    if (!gmapRef.current) return;
    gmapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  // Update markers whenever positions or the online-driver list changes
  useEffect(() => {
    if (!gmapRef.current || !ready) return;
    const G = window.google.maps;

    drivers.forEach((driver) => {
      const pos   = positions[driver.driverId];
      if (!pos) return;
      const stale = now - pos.at > STALE_MS;
      const isSelected = selectedDriver === driver.driverId;
      const color = stale ? '#9CA3AF' : isSelected ? '#FFC107' : driver.trip ? '#3B65DB' : '#22A65A';

      const icon = {
        url:        truckSvg(color),
        scaledSize: new G.Size(36, 36),
        anchor:     new G.Point(18, 18),
      };

      if (markersRef.current[driver.driverId]) {
        const marker = markersRef.current[driver.driverId];
        marker.setPosition({ lat: pos.lat, lng: pos.lng });
        marker.setIcon(icon);
      } else {
        const marker = new G.Marker({
          position: { lat: pos.lat, lng: pos.lng },
          map:      gmapRef.current,
          icon,
          title:    driver.driverName || 'Driver',
        });

        const routeLine = driver.trip
          ? `<p style="font-size:11px;color:#666;margin:0 0 6px">
               ${addr(driver.trip.pickupAddress)?.split(',')[0]} → ${addr(driver.trip.dropAddress)?.split(',')[0]}
             </p>`
          : `<p style="font-size:11px;color:#9A9A9A;margin:0 0 6px;font-style:italic">Waiting for a trip</p>`;

        const info = new G.InfoWindow({
          content: `
            <div style="font-family:-apple-system,sans-serif;min-width:160px;padding:2px 0">
              <p style="font-weight:700;margin:0 0 3px;color:#111;font-size:13px">${driver.driverName || 'Driver'}</p>
              <p style="font-size:11px;color:#666;margin:0 0 2px">${driver.vehicleRegNo || ''}</p>
              ${routeLine}
              <span style="font-size:11px;background:#eef2fb;color:#3B65DB;padding:2px 8px;border-radius:99px;font-weight:600">
                ${pos.speedKmph ?? 0} km/h
              </span>
            </div>`,
        });

        marker.addListener('click', () => {
          onSelectDriver(driver.driverId);
          info.open(gmapRef.current, marker);
        });

        markersRef.current[driver.driverId] = marker;
      }
    });

    // Remove markers for drivers no longer online
    const activeIds = new Set(drivers.map((d) => d.driverId));
    Object.keys(markersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
  }, [drivers, positions, now, selectedDriver, ready]);

  // Pan/zoom to selected driver
  useEffect(() => {
    if (!gmapRef.current || !selectedDriver) return;
    const pos = positions[selectedDriver];
    if (pos) {
      gmapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
      gmapRef.current.setZoom(15);
    }
  }, [selectedDriver, positions]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

      {/* Error overlay */}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9F7' }}>
          <p style={{ color: '#9A9A9A', fontSize: 14, textAlign: 'center', padding: 16 }}>{error}</p>
        </div>
      )}

      {/* Loading overlay */}
      {!ready && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FB' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #c7d7f6', borderTopColor: '#3B65DB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 10 }} />
          <p style={{ color: '#3B65DB', fontSize: 13, fontWeight: 600 }}>Loading Google Maps…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Map type switcher */}
      {ready && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {[
            { key: 'roadmap',   label: 'Map'       },
            { key: 'satellite', label: 'Satellite'  },
            { key: 'hybrid',    label: 'Hybrid'     },
          ].map((t) => (
            <button key={t.key} onClick={() => setMapType(t.key)}
              style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: mapType === t.key ? '#3B65DB' : 'transparent', color: mapType === t.key ? '#fff' : '#6B7280' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Driver card ──────────────────────────────────────────────────────────────
// `driver` is an ONLINE driver, not necessarily one with a trip — driver.trip
// is null while they're just waiting for a dispatch assignment.
function DriverCard({ driver, pos, now, selected, onSelect }) {
  const stale = pos && (now - pos.at > STALE_MS);
  const trip = driver.trip;
  return (
    <div onClick={() => onSelect(driver.driverId)}
      className="rounded-2xl border p-4 cursor-pointer"
      style={{ backgroundColor: selected ? '#eef2fb' : '#fff', borderColor: selected ? '#3B65DB' : '#E8E8E4', outline: selected ? '2px solid #3B65DB' : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full grid place-items-center font-bold text-white text-xs shrink-0"
            style={{ backgroundColor: '#111111' }}>
            {(driver.driverName || 'D')[0]}
          </div>
          <div>
            <p className="font-bold text-xs" style={{ color: '#111111' }}>{driver.driverName || 'Driver'}</p>
            <p className="text-[11.5px]" style={{ color: '#9A9A9A' }}>{driver.vehicleRegNo || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: !pos ? '#E8E8E4' : stale ? '#F59E0B' : '#22A65A' }} />
          {trip ? <StatusBadge status={trip.status} /> : <Badge tone="green">Online</Badge>}
        </div>
      </div>
      {trip ? (
        <p className="text-[11.5px] truncate mb-2" style={{ color: '#9A9A9A' }}>
          {addr(trip.pickupAddress)?.split(',')[0]} → {addr(trip.dropAddress)?.split(',')[0]}
        </p>
      ) : (
        <p className="text-[11.5px] truncate mb-2 italic" style={{ color: '#9A9A9A' }}>
          Waiting for a trip assignment
        </p>
      )}
      {pos ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['Speed', `${pos.speedKmph ?? 0} km/h`],
            ['Lat',   pos.lat?.toFixed(4)],
            ['Lng',   pos.lng?.toFixed(4)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg px-2 py-1 text-center" style={{ backgroundColor: '#F9F9F7' }}>
              <p className="text-[9px] uppercase tracking-wide" style={{ color: '#9A9A9A' }}>{label}</p>
              <p className="text-[11.5px] font-bold font-mono" style={{ color: '#111111' }}>{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11.5px]" style={{ color: '#9A9A9A' }}>
          {driver.lastPingAt
            ? `No live fix — last ping ${formatDateTime(driver.lastPingAt)}`
            : 'Online, but no GPS received yet. The driver app only sends location while it is open in the foreground.'}
        </p>
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function NoDriversOnline({ recentBookings, refetch, totalDrivers }) {
  return (
    <div>
      <div className="rounded-2xl border p-5 mb-5 flex items-center gap-4"
        style={{ backgroundColor: '#F9F9F7', borderColor: '#E8E8E4' }}>
        <div className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
          style={{ backgroundColor: '#F5F5F3' }}>
          <Navigation size={22} style={{ color: '#9A9A9A' }} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: '#111111' }}>No drivers online right now</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>
            {totalDrivers > 0
              ? `${totalDrivers} verified driver${totalDrivers > 1 ? 's' : ''} found, but none are online. Positions appear the moment a driver goes online in the app — whether or not they have a trip.`
              : 'Driver positions appear here the moment a driver goes online in the app — whether or not they have a trip.'}
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={refetch}>Refresh</Button>
      </div>

      <div className="rounded-2xl border mb-5 overflow-hidden"
        style={{ height: 320, borderColor: '#E8E8E4', backgroundColor: '#EEF2FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <MapPin size={36} style={{ color: '#c7d7f6' }} />
        <p style={{ color: '#9A9A9A', fontSize: 13, fontWeight: 600 }}>Map will activate once a driver goes online</p>
      </div>

      {recentBookings.length > 0 && (
        <Card padded={false}>
          <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: '#F5F5F3' }}>
            <p className="text-sm font-bold" style={{ color: '#111111' }}>Recent bookings</p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>Latest confirmed and pending bookings awaiting dispatch</p>
          </div>
          <div>
            {recentBookings.map((b, idx) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 gap-4"
                style={{ borderBottom: idx < recentBookings.length - 1 ? '1px solid #F5F5F3' : 'none' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11.5px] font-bold" style={{ color: '#9A9A9A' }}>
                      {b.bookingNumber}
                    </span>
                    <Badge tone="slate">{b.tripType?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-xs font-semibold truncate" style={{ color: '#111111' }}>
                    {b.customer?.user?.name || b.corporate?.companyName || '—'}
                  </p>
                  <p className="text-[11.5px] truncate mt-0.5" style={{ color: '#9A9A9A' }}>
                    {addr(b.pickupAddress)?.split(',')[0]} → {addr(b.dropAddress)?.split(',')[0]}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={b.status} />
                  <p className="text-[11.5px] mt-1" style={{ color: '#9A9A9A' }}>
                    {formatDateTime(b.pickupAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LiveTracking() {
  // Primary source of truth: every driver who is currently ONLINE — not just
  // ones with an active trip. The socket already broadcasts every online
  // driver's location unfiltered (see socketService.js); this page just has
  // to know who they are.
  //
  // NOTE on the query: this deliberately mirrors the call Dispatch.jsx
  // already makes successfully — kycStatus/limit/page only. An earlier
  // version passed `isOnline: true` with `limit: 200` and the backend
  // rejected it with 400 "Invalid request data": `isOnline` is a field ON
  // each driver record, not an accepted query parameter, and 200 is over
  // the server's page-size cap. Online status is therefore filtered
  // client-side off the `isOnline` field the roster already renders.
  const onlineApi = useApi(
    () => apiClient.get('/admin/drivers', {
      params: { kycStatus: 'VERIFIED', limit: 100, page: 1 },
    }),
    []
  );
  const activeApi  = useApi(
    () => bookingService.list({ status: 'ONGOING', limit: 50 }),
    []
  );
  const recentApi  = useApi(
    () => bookingService.list({ limit: 10, sortBy: 'createdAt', order: 'desc' }),
    []
  );

  // Client-side online filter — see the note on onlineApi above.
  // Unwrap order matches Dispatch.jsx, which uses this same endpoint.
  const allDrivers     = onlineApi.data?.items ?? onlineApi.data?.data ?? [];
  const onlineDrivers  = allDrivers.filter((d) => d.isOnline);
  const activeTripsRaw = activeApi.data?.data  ?? activeApi.data?.items  ?? [];
  const recentBookings = recentApi.data?.data  ?? recentApi.data?.items  ?? [];

  // The admin booking list (/admin/bookings, used by bookingService) never
  // includes an allocation/driverId field — BOOKING_LIST_SELECT on the
  // backend only returns booking columns, not the assigned driver. So each
  // ONGOING booking's actual driver is resolved via the existing
  // GET /admin/dispatch/bookings/:bookingId/allocation endpoint (already
  // used by Dispatch.jsx) rather than inventing a new API.
  const [driverIdByBooking, setDriverIdByBooking] = useState({});

  useEffect(() => {
    let cancelled = false;
    const missing = activeTripsRaw.filter((t) => t.id && !(t.id in driverIdByBooking));
    if (missing.length === 0) return;

    Promise.all(
      missing.map((t) =>
        apiClient.get(`/admin/dispatch/bookings/${t.id}/allocation`)
          .then((data) => [t.id, data?.allocation?.driverId ?? data?.data?.allocation?.driverId ?? null])
          .catch(() => [t.id, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      setDriverIdByBooking((prev) => {
        const next = { ...prev };
        for (const [bookingId, driverId] of pairs) next[bookingId] = driverId;
        return next;
      });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTripsRaw.map((t) => t.id).join(',')]);

  // driverId → their ONGOING trip, for whichever online drivers happen to
  // have one right now.
  const tripByDriverId = useMemo(() => {
    const map = {};
    activeTripsRaw.forEach((t) => {
      const driverId = t.driverId ?? driverIdByBooking[t.id] ?? null;
      if (driverId) map[driverId] = t;
    });
    return map;
  }, [activeTripsRaw, driverIdByBooking]);

  // The unified list the map/cards render from: every online driver, each
  // optionally carrying its current trip.
  const drivers = useMemo(
    () => onlineDrivers.map((d) => ({
      driverId:    d.id ?? d.userId,
      driverName:  d.user?.name || d.name || 'Driver',
      vehicleRegNo: d.assignedVehicle?.registrationNumber || d.vehicle?.registrationNumber || null,
      // The driver app's GPS pinger is foreground-only, so a driver can be
      // isOnline in Postgres while sending nothing. lastPingAt is what tells
      // those two states apart on the card.
      lastPingAt:  d.lastPingAt || null,
      trip:        tripByDriverId[d.id] || tripByDriverId[d.userId] || null,
    })),
    [onlineDrivers, tripByDriverId]
  );

  const driverIds = useMemo(() => drivers.map((d) => d.driverId).filter(Boolean), [drivers]);
  const { connection, positions } = useTrackingSocket(driverIds);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  if (onlineApi.status === 'loading' || activeApi.status === 'loading' || recentApi.status === 'loading') {
    return <LoadingState label="Loading tracking data…" />;
  }

  if (onlineApi.status === 'error' || activeApi.status === 'error') {
    return (
      <div>
        <PageHeader title="Live Tracking" />
        <ErrorState message={onlineApi.error?.message || activeApi.error?.message} onRetry={() => { onlineApi.refetch(); activeApi.refetch(); }} />
      </div>
    );
  }

  const onTripCount = drivers.filter((d) => d.trip).length;

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description={drivers.length > 0
          ? `${drivers.length} driver${drivers.length > 1 ? 's' : ''} online${onTripCount > 0 ? ` — ${onTripCount} on a trip` : ''}. Click a driver to centre the map.`
          : 'Driver positions appear here the moment they go online — with or without a trip.'}
        actions={
          <div className="flex items-center gap-2">
            <ConnectionBadge status={connection} />
            <Button size="sm" variant="secondary" icon={RefreshCw}
              onClick={() => { onlineApi.refetch(); activeApi.refetch(); recentApi.refetch(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Mock mode invents plausible-looking driver positions, which is
          indistinguishable from real tracking at a glance — say so loudly
          rather than letting it be mistaken for live data. */}
      {USE_MOCK && (
        <div className="rounded-xl border p-4 mb-4 flex items-start gap-3"
          style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
          <AlertTriangle size={18} style={{ color: '#92400E', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#92400E' }}>
              Showing simulated data — this is not live driver tracking
            </p>
            <p className="text-xs mt-1" style={{ color: '#92400E' }}>
              <code>VITE_USE_MOCK</code> is enabled (it defaults to <code>true</code> when no
              <code> .env</code> file is present). Create <code>.env</code> from
              <code> .env.example</code>, set <code>VITE_USE_MOCK=false</code> and
              <code> VITE_API_BASE_URL</code> to your backend, then restart the dev server.
            </p>
          </div>
        </div>
      )}

      {drivers.length === 0 ? (
        <NoDriversOnline
          recentBookings={recentBookings}
          totalDrivers={allDrivers.length}
          refetch={() => { onlineApi.refetch(); activeApi.refetch(); recentApi.refetch(); }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          style={{ height: 'calc(100vh - 200px)', minHeight: 520 }}>
          {/* Map */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border"
            style={{ borderColor: '#E8E8E4', minHeight: 420 }}>
            <LiveMap
              drivers={drivers}
              positions={positions}
              now={now}
              selectedDriver={selectedDriver}
              onSelectDriver={setSelectedDriver}
            />
          </div>

          {/* Driver cards */}
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '100%' }}>
            {drivers.map((driver) => (
              <DriverCard
                key={driver.driverId}
                driver={driver}
                pos={positions[driver.driverId]}
                now={now}
                selected={selectedDriver === driver.driverId}
                onSelect={setSelectedDriver}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
