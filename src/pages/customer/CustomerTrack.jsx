import { useState, useMemo, useEffect, useRef } from 'react';
import { Navigation, Phone, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import { formatDateTime } from '../../utils/formatters';
import { bookingService, tripService } from '../../services';
import { BOOKING_STATUS, TRIP_STATUS } from '../../constants';

const CENTER = { lat: 12.9716, lng: 77.5946 };

function CustomerMap({ trip, driverPos, tick }) {
  const mapRef  = useRef(null);
  const leafRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.L) { init(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = init;
    document.head.appendChild(s);
  }, []);

  function init() {
    if (!mapRef.current || leafRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [driverPos.lat, driverPos.lng],
      zoom: 14,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    leafRef.current = map;

    // Pickup marker
    L.marker([CENTER.lat - 0.02, CENTER.lng - 0.01], {
      icon: L.divIcon({
        className: '',
        iconSize: [28, 28], iconAnchor: [14, 14],
        html: `<div style="background:#38B763;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg></div>`,
      }),
    }).addTo(map).bindPopup('Pickup point');

    // Drop marker
    L.marker([CENTER.lat + 0.02, CENTER.lng + 0.02], {
      icon: L.divIcon({
        className: '',
        iconSize: [28, 28], iconAnchor: [14, 28],
        html: `<div style="background:#EF4444;width:28px;height:28px;border-radius:50% 50% 50% 0;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);transform:rotate(-45deg)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div></div>`,
      }),
    }).addTo(map).bindPopup('Destination');

    // Driver marker (animated)
    const driverIcon = L.divIcon({
      className: '',
      iconSize: [48, 48], iconAnchor: [24, 24],
      html: `
        <div style="position:relative;width:48px;height:48px">
          <div style="position:absolute;inset:0;border-radius:50%;background:#3B65DB;opacity:0.15;animation:cp 2s infinite"></div>
          <div style="position:absolute;inset:8px;background:#3B65DB;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(59,101,219,0.4);display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
        </div>
        <style>@keyframes cp{0%,100%{transform:scale(1);opacity:0.15}50%{transform:scale(1.6);opacity:0.05}}</style>
      `,
    });
    markerRef.current = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
      .addTo(map)
      .bindPopup(`<strong>${trip?.driverName}</strong><br>${trip?.vehicleRegNo}`);
    setReady(true);
  }

  // Smoothly move driver marker on each tick
  useEffect(() => {
    if (!markerRef.current || !ready) return;
    markerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
    if (leafRef.current) {
      leafRef.current.panTo([driverPos.lat, driverPos.lng], { animate: true, duration: 0.8 });
    }
  }, [tick, ready]);

  return (
    <div ref={mapRef} style={{ height: 260, width: '100%', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
      {!ready && (
        <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#eef2fb' }}>
          <p style={{ color:'#3B65DB', fontSize:13 }}>Loading map…</p>
        </div>
      )}
    </div>
  );
}

export default function CustomerTrack() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      bookingService.list({ limit: 100 }),
      tripService.list({ limit: 20 }),
    ]).then(([bRes, tRes]) => {
      const myIds = new Set(
        (bRes.data || [])
          .filter(b => (b.customerId === user.id || b.clientName === user.name) && b.status !== BOOKING_STATUS.CANCELLED)
          .map(b => b.id)
      );
      const trips = (tRes.data || []).filter(t =>
        (myIds.has(t.bookingId) || t.driverName) &&
        (t.status === TRIP_STATUS.ONGOING || t.status === TRIP_STATUS.SCHEDULED)
      ).slice(0, 2);
      setActiveTrips(trips);
    }).finally(() => setLoading(false));
  }, [user, tick]);

  if (loading) return <LoadingState label="Checking for active trips…" />;

  if (activeTrips.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5" style={{ color: '#1F2937' }}>Live Tracking</h2>
        <Card><EmptyState icon={Navigation} title="No active trips"
          description="Your driver's live location will appear here once a trip is in progress." /></Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>Live Tracking</h2>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Live GPS updates every 4 seconds</p>

      {activeTrips.map(trip => {
        const driverPos = {
          lat: CENTER.lat + (Math.sin(tick * 0.4) * 0.008),
          lng: CENTER.lng + (Math.cos(tick * 0.4) * 0.008),
        };
        const speedKmph = 28 + Math.round(Math.sin(tick) * 18);
        const etaMin    = Math.max(2, 14 - tick);

        return (
          <div key={trip.id} className="rounded-2xl border shadow-sm overflow-hidden mb-4"
            style={{ backgroundColor:'#ffffff', borderColor:'#E5E7EB' }}>
            <CustomerMap trip={trip} driverPos={driverPos} tick={tick} />

            {/* ETA ribbon */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background:'linear-gradient(90deg,#3B65DB,#2F55C7)', color:'#fff' }}>
              <div>
                <p className="text-xs opacity-80">Estimated arrival</p>
                <p className="text-xl font-black">~{etaMin} min</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Current speed</p>
                <p className="text-lg font-bold">{speedKmph} km/h</p>
              </div>
            </div>

            {/* Driver info */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom:'1px solid #F7F8FC' }}>
              <div className="h-11 w-11 rounded-full grid place-items-center font-black text-white"
                style={{ backgroundColor:'#3B65DB' }}>
                {(trip.driverName||'D').slice(0,1)}
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ color:'#1F2937' }}>{trip.driverName}</p>
                <p className="text-xs" style={{ color:'#6B7280' }}>{trip.vehicleRegNo}</p>
              </div>
              {trip.driverPhone && (
                <a href={`tel:${trip.driverPhone}`}
                  className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl"
                  style={{ backgroundColor:'#f0fdf4', color:'#38B763' }}>
                  <Phone size={15} /> Call Driver
                </a>
              )}
            </div>

            {/* Route */}
            <div className="px-4 py-3 space-y-2" style={{ borderBottom:'1px solid #F7F8FC' }}>
              <div className="flex items-start gap-2">
                <div className="h-4 w-4 rounded-full mt-0.5 shrink-0" style={{ backgroundColor:'#38B763' }} />
                <p className="text-sm" style={{ color:'#1F2937' }}>{trip.pickup}</p>
              </div>
              <div className="ml-2 border-l-2 h-4" style={{ borderColor:'#E5E7EB' }} />
              <div className="flex items-start gap-2">
                <div className="h-4 w-4 rounded-full mt-0.5 shrink-0" style={{ backgroundColor:'#EF4444' }} />
                <p className="text-sm" style={{ color:'#1F2937' }}>{trip.drop}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-4 py-3">
              <p className="text-xs font-bold mb-2" style={{ color:'#6B7280' }}>Trip progress</p>
              <ol className="space-y-2">
                {trip.timeline?.map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={14} style={{ color:'#38B763', flexShrink:0 }} />
                    <p className="text-xs flex-1" style={{ color:'#1F2937' }}>{t.label}</p>
                    <p className="text-xs" style={{ color:'#6B7280' }}>{formatDateTime(t.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        );
      })}
    </div>
  );
}
