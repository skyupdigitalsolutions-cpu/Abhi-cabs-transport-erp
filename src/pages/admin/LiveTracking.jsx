import { useMemo, useState, useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ConnectionBadge from '../../components/tracking/ConnectionBadge';
import LoadingState from '../../components/ui/LoadingState';
import { useTrackingSocket } from '../../hooks/useTrackingSocket';
import { useApi } from '../../hooks/useApi';
import { tripService } from '../../services';
import { TRIP_STATUS } from '../../constants';

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}



const STALE_MS = 20000;
const MAP_STYLES = ['streets', 'satellite', 'hybrid'];

// Bengaluru center
const CENTER = { lat: 12.9716, lng: 77.5946 };
const ZOOM = 12;

// ── OpenStreetMap tile-based map with Leaflet via CDN ─────────────────────
function LiveMap({ trips, positions, now, selectedDriver, onSelectDriver }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef({});
  const [mapStyle, setMapStyle] = useState('streets');
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);

  const TILE_URLS = {
    streets:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    hybrid:    'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  };

  const TILE_ATTRIBS = {
    streets:   '© OpenStreetMap contributors',
    satellite: '© Esri',
    hybrid:    '© Google',
  };

  // Load Leaflet from CDN
  useEffect(() => {
    if (window.L) { initMap(); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    script.onerror = () => setError('Failed to load map library');
    document.head.appendChild(script);
  }, []);

  function initMap() {
    if (!mapRef.current || leafletRef.current) return;
    try {
      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [CENTER.lat, CENTER.lng],
        zoom: ZOOM,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(TILE_URLS.streets, {
        attribution: TILE_ATTRIBS.streets,
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = map;
      setMapReady(true);
    } catch (e) {
      setError('Map initialisation failed');
    }
  }

  // Switch tile layer when style changes
  useEffect(() => {
    if (!leafletRef.current || !mapReady) return;
    const L = window.L;
    leafletRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) leafletRef.current.removeLayer(layer);
    });
    L.tileLayer(TILE_URLS[mapStyle], {
      attribution: TILE_ATTRIBS[mapStyle],
      maxZoom: 19,
    }).addTo(leafletRef.current);
  }, [mapStyle, mapReady]);

  // Place / update driver markers
  useEffect(() => {
    if (!leafletRef.current || !mapReady) return;
    const L = window.L;
    const map = leafletRef.current;

    trips.forEach(trip => {
      const pos = positions[trip.driverId];
      if (!pos) return;

      const isSelected = selectedDriver === trip.driverId;
      const stale = now - pos.at > STALE_MS;
      const color = stale ? '#6B7280' : isSelected ? '#2F55C7' : '#3B65DB';

      // SVG marker icon — truck silhouette with pulse ring
      const svgIcon = L.divIcon({
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
        html: `
          <div style="position:relative;width:44px;height:44px;">
            ${!stale ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.2;animation:pulse 2s infinite;"></div>` : ''}
            <div style="position:absolute;inset:6px;background:${color};border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 4v4h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            ${isSelected ? `<div style="position:absolute;-inset:3px;border:3px solid ${color};border-radius:50%;"></div>` : ''}
          </div>
          <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.2}50%{transform:scale(1.5);opacity:0.1}}</style>
        `,
      });

      if (markersRef.current[trip.driverId]) {
        markersRef.current[trip.driverId]
          .setLatLng([pos.lat, pos.lng])
          .setIcon(svgIcon);
      } else {
        const marker = L.marker([pos.lat, pos.lng], { icon: svgIcon })
          .addTo(map)
          .on('click', () => onSelectDriver(trip.driverId));
        markersRef.current[trip.driverId] = marker;
      }

      // Update popup
      markersRef.current[trip.driverId].bindPopup(`
        <div style="font-family:-apple-system,sans-serif;min-width:180px">
          <p style="font-weight:700;color:#1F2937;margin:0 0 4px">${trip.driverName}</p>
          <p style="font-size:12px;color:#6B7280;margin:0 0 2px">${trip.vehicleRegNo}</p>
          <p style="font-size:12px;color:#6B7280;margin:0 0 6px">${trip.pickup?.split(',')[0]} → ${trip.drop?.split(',')[0]}</p>
          <div style="display:flex;gap:8px">
            <span style="font-size:11px;background:#eef2fb;color:#3B65DB;padding:2px 8px;border-radius:999px;font-weight:600">${pos.speedKmph} km/h</span>
            <span style="font-size:11px;background:#F7F8FC;color:#6B7280;padding:2px 8px;border-radius:999px">${stale ? '⚠ Stale' : '● Live'}</span>
          </div>
        </div>
      `, { maxWidth: 220 });
    });
  }, [trips, positions, now, selectedDriver, mapReady]);

  // Pan to selected driver
  useEffect(() => {
    if (!leafletRef.current || !selectedDriver || !mapReady) return;
    const trip = trips.find(t => t.driverId === selectedDriver);
    if (!trip) return;
    const pos = positions[selectedDriver];
    if (pos) leafletRef.current.flyTo([pos.lat, pos.lng], 15, { animate: true, duration: 1 });
  }, [selectedDriver, mapReady]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Map container */}
      <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '0' }} />

      {/* Error overlay */}
      {error && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#F7F8FC' }}>
          <p style={{ color:'#6B7280', fontSize:14 }}>{error}</p>
        </div>
      )}

      {/* Map style switcher */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:1000, display:'flex', gap:4, background:'rgba(255,255,255,0.95)', borderRadius:8, padding:4, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
        {MAP_STYLES.map(s => (
          <button key={s} onClick={() => setMapStyle(s)}
            style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, border:'none', cursor:'pointer',
              backgroundColor: mapStyle===s ? '#3B65DB':'transparent',
              color: mapStyle===s ? '#fff':'#6B7280' }}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {!mapReady && !error && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backgroundColor:'#eef2fb' }}>
          <div style={{ width:36, height:36, border:'3px solid #c7d7f6', borderTopColor:'#3B65DB', borderRadius:'50%', animation:'spin 0.8s linear infinite', marginBottom:12 }} />
          <p style={{ color:'#3B65DB', fontSize:13, fontWeight:600 }}>Loading map…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function LiveTracking() {
  const tripsApi = useApi(() => tripService.list({ limit: 20, status: TRIP_STATUS.ONGOING }), []);
  const ongoingTrips = (tripsApi.data?.data || []).slice(0, 6);
  const driverIds = useMemo(() => ongoingTrips.map((t) => t.driverId), [ongoingTrips]);
  const { connection, positions } = useTrackingSocket(driverIds);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  if (tripsApi.status === 'loading') return <LoadingState label="Loading active trips…" />;

  if (!ongoingTrips.length) {
    return (
      <div>
        <PageHeader title="Live Tracking" description="Realtime GPS tracking for all active trips." />
        <Card><EmptyState icon={Navigation} title="No trips in progress" description="Live driver positions appear here as soon as a trip starts." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description="Realtime GPS positions — click a driver card to centre the map."
        actions={<ConnectionBadge status={connection} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: 520 }}>
        {/* Map */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor:'#E5E7EB', minHeight: 420 }}>
          <LiveMap
            trips={ongoingTrips}
            positions={positions}
            now={now}
            selectedDriver={selectedDriver}
            onSelectDriver={setSelectedDriver}
          />
        </div>

        {/* Driver list */}
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '100%' }}>
          {ongoingTrips.map(trip => {
            const pos      = positions[trip.driverId];
            const stale    = pos && now - pos.at > STALE_MS;
            const isSelected = selectedDriver === trip.driverId;

            return (
              <div
                key={trip.id}
                onClick={() => setSelectedDriver(trip.driverId)}
                className="rounded-2xl border p-4 cursor-pointer transition-all"
                style={{
                  backgroundColor: isSelected ? '#eef2fb':'#ffffff',
                  borderColor: isSelected ? '#3B65DB':'#E5E7EB',
                  outline: isSelected ? '2px solid #3B65DB':undefined,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full grid place-items-center font-bold text-white text-xs"
                      style={{ backgroundColor: '#3B65DB' }}>
                      {(trip.driverName||'D').slice(0,1)}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color:'#1F2937' }}>{trip.driverName}</p>
                      <p className="text-xs" style={{ color:'#6B7280' }}>{trip.vehicleRegNo}</p>
                    </div>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: !pos ? '#E5E7EB' : stale ? '#F59E0B' : '#38B763' }} />
                </div>

                <p className="text-xs mb-2 truncate" style={{ color:'#6B7280' }}>
                  {trip.pickup?.split(',')[0]} → {trip.drop?.split(',')[0]}
                </p>

                {pos ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor:'#F7F8FC' }}>
                      <p className="text-xs" style={{ color:'#6B7280' }}>Speed</p>
                      <p className="text-sm font-bold" style={{ color:'#1F2937' }}>{pos.speedKmph} km/h</p>
                    </div>
                    <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor:'#F7F8FC' }}>
                      <p className="text-xs" style={{ color:'#6B7280' }}>Updated</p>
                      <p className="text-sm font-bold" style={{ color: stale ? '#F59E0B':'#38B763' }}>{stale ? 'Stale' : 'Live'}</p>
                    </div>
                    <div className="col-span-2 rounded-lg px-2 py-1.5" style={{ backgroundColor:'#F7F8FC' }}>
                      <p className="text-xs" style={{ color:'#6B7280' }}>Coordinates</p>
                      <p className="text-xs font-mono font-semibold" style={{ color:'#1F2937' }}>
                        {pos.lat.toFixed(4)}° N, {pos.lng.toFixed(4)}° E
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color:'#6B7280' }}>Waiting for GPS signal…</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
