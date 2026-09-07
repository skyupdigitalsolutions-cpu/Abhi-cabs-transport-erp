import { useState } from 'react';
import { AlertOctagon, Phone, MapPin, Shield, Siren } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';

const EMERGENCY_CONTACTS = [
  { name: 'ABHI CABS Control Room', phone: '1800-XXX-XXXX', available: '24/7' },
  { name: 'Police Emergency',        phone: '100',           available: '24/7' },
  { name: 'Ambulance',               phone: '108',           available: '24/7' },
];

const INCIDENT_TYPES = [
  { id: 'breakdown',  label: 'Vehicle Breakdown',  icon: '🔧' },
  { id: 'accident',   label: 'Road Accident',       icon: '🚨' },
  { id: 'hijack',     label: 'Theft / Hijacking',   icon: '🚔' },
  { id: 'medical',    label: 'Medical Emergency',   icon: '🏥' },
  { id: 'cargo',      label: 'Cargo Issue',         icon: '📦' },
  { id: 'other',      label: 'Other',               icon: '⚠️' },
];

export default function DriverSOS() {
  const { user } = useAuth();
  const toast    = useToast();
  const [sosActive,     setSosActive]     = useState(false);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [incidentType,  setIncidentType]  = useState('');
  const [sosLoading,    setSosLoading]    = useState(false);

  const triggerSOS = async () => {
    setSosLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setSosActive(true);
    setSosLoading(false);
    setConfirmOpen(false);
    toast.error('SOS ALERT SENT — Control room has been notified of your location');
  };

  const cancelSOS = () => {
    setSosActive(false);
    toast.success('SOS cancelled — Control room notified');
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>SOS & Emergency</h2>
      <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
        In an emergency, press the SOS button to instantly alert the control room with your location.
      </p>

      {/* SOS active banner */}
      {sosActive && (
        <Alert type="error" title="SOS ACTIVE" className="mb-4">
          Your location is being shared with the control room. Help is on the way.
          <br />
          <button onClick={cancelSOS} className="text-xs font-bold underline mt-1" style={{ color: '#EF4444' }}>
            Cancel SOS
          </button>
        </Alert>
      )}

      {/* Big SOS button */}
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={sosActive}
          className="h-36 w-36 rounded-full flex flex-col items-center justify-center gap-1 shadow-lg focus-ring transition-all active:scale-95"
          style={{
            backgroundColor: sosActive ? '#fecaca' : '#EF4444',
            border: `4px solid ${sosActive ? '#fca5a5' : '#dc2626'}`,
            color: '#ffffff',
          }}
        >
          <Siren size={40} />
          <span className="text-lg font-bold tracking-wider">{sosActive ? 'ACTIVE' : 'SOS'}</span>
        </button>
        <p className="text-xs mt-3 text-center" style={{ color: '#6B7280' }}>
          {sosActive ? 'Control room alerted · Location shared' : 'Press and hold in case of emergency'}
        </p>
      </div>

      {/* Location card */}
      <Card className="mb-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: '#eef2fb' }}>
          <MapPin size={16} style={{ color: '#3B65DB' }} />
        </div>
        <div>
          <p className="text-xs" style={{ color: '#6B7280' }}>Current location (approx.)</p>
          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>Bengaluru, Karnataka</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>12.9716° N, 77.5946° E · Updated now</p>
        </div>
      </Card>

      {/* Emergency contacts */}
      <div className="mb-4">
        <p className="text-sm font-bold mb-3" style={{ color: '#1F2937' }}>Emergency Contacts</p>
        <div className="space-y-2">
          {EMERGENCY_CONTACTS.map((c, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border p-3"
              style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
              <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: '#fef2f2' }}>
                <Phone size={16} style={{ color: '#EF4444' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{c.name}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{c.available}</p>
              </div>
              <a href={`tel:${c.phone}`}
                className="text-sm font-bold px-3 py-1.5 rounded-lg focus-ring"
                style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>
                {c.phone}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Safe zone */}
      <Card className="flex items-start gap-3">
        <Shield size={18} style={{ color: '#38B763' }} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>Safety Tips</p>
          <ul className="text-xs mt-1 space-y-0.5" style={{ color: '#6B7280' }}>
            <li>• Always share your trip details with family</li>
            <li>• Keep your phone charged on long routes</li>
            <li>• Report unsafe roads to the control room</li>
            <li>• Do not drive beyond 10 hours continuously</li>
          </ul>
        </div>
      </Card>

      {/* SOS Confirm Modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Trigger SOS Alert?" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" size="sm" icon={AlertOctagon} loading={sosLoading}
            onClick={triggerSOS} disabled={!incidentType}>Send SOS</Button>
        </>}
      >
        <div className="space-y-4">
          <Alert type="warning">
            This will immediately alert the ABHI CABS control room with your name, location and incident type.
          </Alert>
          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>Select incident type:</p>
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map(t => (
              <button key={t.id} onClick={() => setIncidentType(t.id)}
                className="flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-center focus-ring"
                style={{
                  backgroundColor: incidentType===t.id ? '#fef2f2':'#ffffff',
                  borderColor:      incidentType===t.id ? '#EF4444':'#E5E7EB',
                  color:            incidentType===t.id ? '#EF4444':'#1F2937',
                }}>
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
