import { useState, useCallback } from 'react';
import { MapPin, Clock, Navigation, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { tripService } from '../../services';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import { TRIP_STATUS } from '../../constants';

const STATUS_TABS = ['new', 'ongoing', 'completed', 'all'];

// ── Navigation modal (mock turn-by-turn) ──────────────────────────────────
function NavigationModal({ open, trip, onClose, onStatusUpdate }) {
  const [step, setStep] = useState(0);
  const toast = useToast();

  const steps = [
    { icon: '🚀', instruction: 'Head north on MG Road',     distance: '0.3 km', duration: '2 min' },
    { icon: '↰',  instruction: 'Turn left onto Brigade Rd', distance: '1.2 km', duration: '5 min' },
    { icon: '↱',  instruction: 'Turn right at Cubbon Park', distance: '2.4 km', duration: '8 min' },
    { icon: '🏁', instruction: 'Arrive at destination',     distance: '—',      duration: '—'     },
  ];

  if (!trip) return null;

  const handleComplete = async () => {
    if (onStatusUpdate) await onStatusUpdate(trip.id, 'completed');
    toast.success('Trip completed! Great work.');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Turn-by-Turn Navigation" size="md"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Minimise</Button>
        {step === steps.length - 1 && <Button size="sm" icon={CheckCircle} onClick={handleComplete}>Complete Trip</Button>}
      </>}
    >
      {/* Map placeholder */}
      <div className="rounded-xl mb-4 flex items-center justify-center overflow-hidden"
        style={{ height: 180, backgroundColor: '#eef2fb', position: 'relative' }}>
        <svg viewBox="0 0 400 180" className="absolute inset-0 w-full h-full">
          <rect width="400" height="180" fill="#eef2fb" />
          {[0,1,2,3].map(i => <line key={`h${i}`} x1={0} y1={i*45} x2={400} y2={i*45} stroke="#c7d7f6" strokeWidth="1" />)}
          {[0,1,2,3,4,5].map(i => <line key={`v${i}`} x1={i*80} y1={0} x2={i*80} y2={180} stroke="#c7d7f6" strokeWidth="1" />)}
          <polyline points="40,150 120,110 200,80 280,60 360,30" fill="none" stroke="#3B65DB" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="150" r="6" fill="#38B763" />
          <circle cx="360" cy="30" r="6" fill="#EF4444" />
        </svg>
        <div className="relative text-center">
          <p className="text-3xl font-bold" style={{ color: '#3B65DB' }}>{steps[step].icon}</p>
        </div>
      </div>

      {/* Current instruction */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#3B65DB' }}>
        <p className="text-2xl font-bold text-white mb-1">{steps[step].instruction}</p>
        <p style={{ color: '#849FE9' }}>{steps[step].distance} · {steps[step].duration}</p>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2"
            style={{ backgroundColor: i===step ? '#eef2fb' : 'transparent', cursor: 'pointer' }}
            onClick={() => setStep(i)}>
            <span className="text-lg">{s.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: i===step ? '#3B65DB' : '#1F2937' }}>{s.instruction}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{s.distance}</p>
            </div>
            {i < step && <CheckCircle size={16} style={{ color: '#38B763' }} />}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0}>← Prev</Button>
        <Button size="sm" className="flex-1" onClick={() => setStep(s => Math.min(steps.length-1, s+1))} disabled={step===steps.length-1}>Next →</Button>
      </div>
    </Modal>
  );
}

// ── Trip card ──────────────────────────────────────────────────────────────
function TripCard({ trip, onAccept, onDecline, onNavigate, onUpdateStatus }) {
  const [actLoading, setActLoading] = useState('');
  const isNew      = trip.status === TRIP_STATUS.SCHEDULED;
  const isOngoing  = trip.status === TRIP_STATUS.ONGOING;

  const act = async (fn, key) => { setActLoading(key); await fn(); setActLoading(''); };

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden"
      style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between"
        style={{ borderBottom: '1px solid #F7F8FC' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: '#6B7280' }}>{trip.id}</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: '#1F2937' }}>{trip.vehicleRegNo}</p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      {/* Route */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="h-4 w-4 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: '#38B763' }} />
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>Pickup</p>
            <p className="text-sm font-medium" style={{ color: '#1F2937' }}>{trip.pickup}</p>
          </div>
        </div>
        <div className="ml-2 border-l-2 h-4" style={{ borderColor: '#E5E7EB' }} />
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>Drop</p>
            <p className="text-sm font-medium" style={{ color: '#1F2937' }}>{trip.drop}</p>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 py-2 flex items-center gap-4" style={{ borderTop: '1px solid #F7F8FC' }}>
        <span className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
          <Clock size={12} /> {formatDate(trip.startedAt)}
        </span>
      </div>

      {/* Actions */}
      {isNew && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2 pt-2">
          <Button variant="danger" icon={XCircle} loading={actLoading==='decline'}
            onClick={() => act(() => onDecline(trip.id), 'decline')}>Decline</Button>
          <Button icon={CheckCircle} loading={actLoading==='accept'}
            onClick={() => act(() => onAccept(trip.id), 'accept')}>Accept</Button>
        </div>
      )}
      {isOngoing && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          <Button className="w-full" icon={Navigation} onClick={() => onNavigate(trip)}>
            Navigate
          </Button>
          <Button className="w-full" variant="secondary" icon={CheckCircle} loading={actLoading==='complete'}
            onClick={() => act(() => onUpdateStatus(trip.id, 'completed'), 'complete')}>
            Mark Completed
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DriverTrips() {
  const { user } = useAuth();
  const toast    = useToast();
  const [activeTab,  setActiveTab]  = useState('new');
  const [navTrip,    setNavTrip]    = useState(null);
  const [localTrips, setLocalTrips] = useState(null);

  const fetchTrips = useCallback(() => tripService.list({ page:1, limit:50, sortBy:'startedAt' }), []);
  const { data, status, error, refetch } = useApi(fetchTrips, []);

  const allTrips   = localTrips ?? (data?.data || []);
  const newTrips   = allTrips.filter(t => t.status === TRIP_STATUS.SCHEDULED);
  const displayed  = activeTab==='all' ? allTrips : activeTab==='new' ? newTrips : allTrips.filter(t => t.status===activeTab);

  const updateLocal = (id, updates) => {
    setLocalTrips(prev => (prev ?? (data?.data||[])).map(t => t.id===id ? {...t,...updates} : t));
  };

  const handleAccept = async (id) => {
    updateLocal(id, { status: 'ongoing' });
    toast.success('Trip accepted — navigate to pickup');
  };

  const handleDecline = async (id) => {
    updateLocal(id, { status: 'cancelled' });
    toast.info('Trip declined');
  };

  const handleUpdateStatus = async (id, newStatus) => {
    updateLocal(id, { status: newStatus });
    toast.success(`Trip marked as ${newStatus}`);
  };

  const tabCounts = {
    new:       newTrips.length,
    ongoing:   allTrips.filter(t=>t.status===TRIP_STATUS.ONGOING).length,
    completed: allTrips.filter(t=>t.status===TRIP_STATUS.COMPLETED).length,
    all:       allTrips.length,
  };

  if (status === 'loading') return <LoadingState label="Loading trips…" />;
  if (status === 'error')   return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>My Trips</h2>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          Welcome, <span className="font-semibold" style={{ color: '#3B65DB' }}>{user?.name}</span>
        </p>
      </div>

      {newTrips.length > 0 && (
        <Alert type="info" className="mb-4">
          You have {newTrips.length} new trip{newTrips.length>1?'s':''} pending acceptance.
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap focus-ring flex items-center gap-1.5"
            style={{ backgroundColor: activeTab===tab ? '#3B65DB':'#F7F8FC', color: activeTab===tab ? '#ffffff':'#6B7280', border: `1px solid ${activeTab===tab ? '#3B65DB':'#E5E7EB'}` }}>
            <span className="capitalize">{tab==='new' ? 'New Trips' : tab==='all' ? 'All' : tab.charAt(0).toUpperCase()+tab.slice(1)}</span>
            {tabCounts[tab] > 0 && (
              <span className="rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: activeTab===tab ? 'rgba(255,255,255,0.25)' : '#E5E7EB', color: activeTab===tab ? '#fff':'#6B7280' }}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState icon={Navigation} title={`No ${activeTab==='all'?'':activeTab} trips`} description="Trips assigned to you will appear here." />
      ) : (
        <div className="space-y-3">
          {displayed.map(trip => (
            <TripCard key={trip.id} trip={trip}
              onAccept={handleAccept} onDecline={handleDecline}
              onNavigate={t => setNavTrip(t)}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}

      <NavigationModal open={!!navTrip} trip={navTrip} onClose={() => setNavTrip(null)} onStatusUpdate={handleUpdateStatus} />
    </div>
  );
}
