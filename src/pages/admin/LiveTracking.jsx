import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Navigation, MapPin, Truck, Radio, RefreshCw } from 'lucide-react';
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
function LiveMap({ trips, positions, now, selectedDriver, onSelectDriver }) {
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

  // Update markers whenever positions or trips change
  useEffect(() => {
    if (!gmapRef.current || !ready) return;
    const G = window.google.maps;

    trips.forEach((trip) => {
      const pos   = positions[trip.driverId];
      if (!pos) return;
      const stale = now - pos.at > STALE_MS;
      const isSelected = selectedDriver === trip.driverId;
      const color = stale ? '#9CA3AF' : isSelected ? '#FFC107' : '#3B65DB';

      const icon = {
        url:        truckSvg(color),
        scaledSize: new G.Size(36, 36),
        anchor:     new G.Point(18, 18),
      };

      if (markersRef.current[trip.driverId]) {
        const marker = markersRef.current[trip.driverId];
        marker.setPosition({ lat: pos.lat, lng: pos.lng });
        marker.setIcon(icon);
      } else {
        const marker = new G.Marker({
          position: { lat: pos.lat, lng: pos.lng },
          map:      gmapRef.current,
          icon,
          title:    trip.driverName || 'Driver',
        });

        const info = new G.InfoWindow({
          content: `
            <div style="font-family:-apple-system,sans-serif;min-width:160px;padding:2px 0">
              <p style="font-weight:700;margin:0 0 3px;color:#111;font-size:13px">${trip.driverName || 'Driver'}</p>
              <p style="font-size:11px;color:#666;margin:0 0 2px">${trip.vehicleRegNo || ''}</p>
              <p style="font-size:11px;color:#666;margin:0 0 6px">
                ${addr(trip.pickupAddress)?.split(',')[0]} → ${addr(trip.dropAddress)?.split(',')[0]}
              </p>
              <span style="font-size:11px;background:#eef2fb;color:#3B65DB;padding:2px 8px;border-radius:99px;font-weight:600">
                ${pos.speedKmph ?? 0} km/h
              </span>
            </div>`,
        });

        marker.addListener('click', () => {
          onSelectDriver(trip.driverId);
          info.open(gmapRef.current, marker);
        });

        markersRef.current[trip.driverId] = marker;
      }
    });

    // Remove markers for drivers no longer in the list
    const activeIds = new Set(trips.map((t) => t.driverId));
    Object.keys(markersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
  }, [trips, positions, now, selectedDriver, ready]);

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
              style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: mapType === t.key ? '#3B65DB' : 'transparent', color: mapType === t.key ? '#fff' : '#6B7280' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Driver card ──────────────────────────────────────────────────────────────
function DriverCard({ trip, pos, now, selected, onSelect }) {
  const stale = pos && (now - pos.at > STALE_MS);
  return (
    <div onClick={() => onSelect(trip.driverId)}
      className="rounded-2xl border p-4 cursor-pointer"
      style={{ backgroundColor: selected ? '#eef2fb' : '#fff', borderColor: selected ? '#3B65DB' : '#E8E8E4', outline: selected ? '2px solid #3B65DB' : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full grid place-items-center font-bold text-white text-xs shrink-0"
            style={{ backgroundColor: '#111111' }}>
            {(trip.driverName || 'D')[0]}
          </div>
          <div>
            <p className="font-bold text-xs" style={{ color: '#111111' }}>{trip.driverName || 'Driver'}</p>
            <p className="text-[10px]" style={{ color: '#9A9A9A' }}>{trip.vehicleRegNo || trip.vehicleClass || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: !pos ? '#E8E8E4' : stale ? '#F59E0B' : '#22A65A' }} />
          <StatusBadge status={trip.status} />
        </div>
      </div>
      <p className="text-[10px] truncate mb-2" style={{ color: '#9A9A9A' }}>
        {addr(trip.pickupAddress)?.split(',')[0]} → {addr(trip.dropAddress)?.split(',')[0]}
      </p>
      {pos ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['Speed', `${pos.speedKmph ?? 0} km/h`],
            ['Lat',   pos.lat?.toFixed(4)],
            ['Lng',   pos.lng?.toFixed(4)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg px-2 py-1 text-center" style={{ backgroundColor: '#F9F9F7' }}>
              <p className="text-[9px] uppercase tracking-wide" style={{ color: '#9A9A9A' }}>{label}</p>
              <p className="text-[10px] font-bold font-mono" style={{ color: '#111111' }}>{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px]" style={{ color: '#9A9A9A' }}>Waiting for GPS signal…</p>
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function NoActiveTrips({ recentBookings, refetch }) {
  return (
    <div>
      <div className="rounded-2xl border p-5 mb-5 flex items-center gap-4"
        style={{ backgroundColor: '#F9F9F7', borderColor: '#E8E8E4' }}>
        <div className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
          style={{ backgroundColor: '#F5F5F3' }}>
          <Navigation size={22} style={{ color: '#9A9A9A' }} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: '#111111' }}>No active trips right now</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>
            Driver positions will appear here in real time once a trip is in progress.
            Use <strong>Dispatch</strong> to assign a vehicle to a pending booking.
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={refetch}>Refresh</Button>
      </div>

      <div className="rounded-2xl border mb-5 overflow-hidden"
        style={{ height: 320, borderColor: '#E8E8E4', backgroundColor: '#EEF2FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <MapPin size={36} style={{ color: '#c7d7f6' }} />
        <p style={{ color: '#9A9A9A', fontSize: 13, fontWeight: 600 }}>Map will activate when trips are live</p>
      </div>

      {recentBookings.length > 0 && (
        <Card padded={false}>
          <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: '#F5F5F3' }}>
            <p className="text-sm font-bold" style={{ color: '#111111' }}>Recent bookings</p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>Latest confirmed and pending bookings awaiting dispatch</p>
          </div>
          <div className="divide-y" style={{ borderColor: '#F5F5F3' }}>
            {recentBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] font-bold" style={{ color: '#9A9A9A' }}>
                      {b.bookingNumber}
                    </span>
                    <Badge tone="slate">{b.tripType?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-xs font-semibold truncate" style={{ color: '#111111' }}>
                    {b.customer?.user?.name || b.corporate?.companyName || '—'}
                  </p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: '#9A9A9A' }}>
                    {addr(b.pickupAddress)?.split(',')[0]} → {addr(b.dropAddress)?.split(',')[0]}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={b.status} />
                  <p className="text-[10px] mt-1" style={{ color: '#9A9A9A' }}>
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
  const activeApi  = useApi(
    () => bookingService.list({ status: 'ONGOING', limit: 20 }),
    []
  );
  const recentApi  = useApi(
    () => bookingService.list({ limit: 10, sortBy: 'createdAt', order: 'desc' }),
    []
  );

  const activeTrips    = activeApi.data?.data  ?? activeApi.data?.items  ?? [];
  const recentBookings = recentApi.data?.data  ?? recentApi.data?.items  ?? [];

  const driverIds = useMemo(
    () => activeTrips.map((t) => t.driverId).filter(Boolean),
    [activeTrips]
  );
  const { connection, positions } = useTrackingSocket(driverIds);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  if (activeApi.status === 'loading' || recentApi.status === 'loading') {
    return <LoadingState label="Loading tracking data…" />;
  }

  if (activeApi.status === 'error') {
    return (
      <div>
        <PageHeader title="Live Tracking" />
        <ErrorState message={activeApi.error?.message} onRetry={activeApi.refetch} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description={activeTrips.length > 0
          ? `${activeTrips.length} trip${activeTrips.length > 1 ? 's' : ''} in progress — click a driver to centre the map.`
          : 'Realtime GPS positions appear here once trips are in progress.'}
        actions={
          <div className="flex items-center gap-2">
            <ConnectionBadge status={connection} />
            <Button size="sm" variant="secondary" icon={RefreshCw}
              onClick={() => { activeApi.refetch(); recentApi.refetch(); }}>
              Refresh
            </Button>
          </div>
        }
      />

      {activeTrips.length === 0 ? (
        <NoActiveTrips
          recentBookings={recentBookings}
          refetch={() => { activeApi.refetch(); recentApi.refetch(); }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          style={{ height: 'calc(100vh - 200px)', minHeight: 520 }}>
          {/* Map */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border"
            style={{ borderColor: '#E8E8E4', minHeight: 420 }}>
            <LiveMap
              trips={activeTrips}
              positions={positions}
              now={now}
              selectedDriver={selectedDriver}
              onSelectDriver={setSelectedDriver}
            />
          </div>

          {/* Driver cards */}
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '100%' }}>
            {activeTrips.map((trip) => (
              <DriverCard
                key={trip.id}
                trip={trip}
                pos={positions[trip.driverId]}
                now={now}
                selected={selectedDriver === trip.driverId}
                onSelect={setSelectedDriver}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
