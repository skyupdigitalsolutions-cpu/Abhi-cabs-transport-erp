import { useState } from 'react';
import { Phone, IdCard, MapPin, Star, LogOut, Pencil, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { APP_NAME } from '../../constants';

export default function DriverProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const [editOpen, setEditOpen]  = useState(false);
  const [form, setForm]          = useState({ name: user?.name || '', city: user?.city || '' });
  const [pinOpen, setPinOpen]    = useState(false);
  const [pin, setPin]            = useState({ current: '', new: '', confirm: '' });

  const handleLogout = async () => { await logout(); navigate('/driver/login'); };

  const saveProfile = async () => {
    toast.success('Profile updated');
    setEditOpen(false);
  };

  const changePin = async () => {
    if (pin.new !== pin.confirm) { toast.error('PINs do not match'); return; }
    if (pin.new.length < 4)      { toast.error('PIN must be at least 4 digits'); return; }
    toast.success('PIN changed successfully');
    setPinOpen(false);
    setPin({ current: '', new: '', confirm: '' });
  };

  const infoPairs = [
    { icon: Phone,  label: 'Phone',       value: user?.phone      || '—' },
    { icon: IdCard, label: 'Licence No.', value: user?.licenseNo  || '—' },
    { icon: MapPin, label: 'City',        value: user?.city       || 'Bengaluru' },
    { icon: Star,   label: 'Rating',      value: user?.rating ? `${user.rating} / 5.0` : '4.7 / 5.0' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-5" style={{ color: '#1F2937' }}>My Profile</h2>

      {/* Avatar card */}
      <Card className="flex flex-col items-center text-center mb-4">
        <div className="h-20 w-20 rounded-full grid place-items-center font-bold text-3xl text-white mb-3"
          style={{ backgroundColor: '#3B65DB' }}>
          {(user?.name || 'D').slice(0,1)}
        </div>
        <p className="font-bold text-lg" style={{ color: '#1F2937' }}>{user?.name || 'Driver'}</p>
        <StatusBadge status={user?.status || 'active'} className="mt-1" />
        <span className="mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>
          {APP_NAME} Driver
        </span>
        <Button size="sm" variant="secondary" icon={Pencil} className="mt-3" onClick={() => setEditOpen(true)}>
          Edit Profile
        </Button>
      </Card>

      {/* Info */}
      <Card className="mb-4 !p-0 overflow-hidden">
        {infoPairs.map(({ icon: Icon, label, value }, i) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i<infoPairs.length-1 ? '1px solid #F7F8FC':'none' }}>
            <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: '#eef2fb' }}>
              <Icon size={15} style={{ color: '#3B65DB' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
              <p className="text-sm font-medium" style={{ color: '#1F2937' }}>{value}</p>
            </div>
          </div>
        ))}
      </Card>

      {/* Security */}
      <Card className="mb-4 flex items-center gap-3 cursor-pointer" onClick={() => setPinOpen(true)}>
        <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: '#F7F8FC' }}>
          <Shield size={15} style={{ color: '#6B7280' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: '#1F2937' }}>Change PIN</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>Update your app login PIN</p>
        </div>
        <span style={{ color: '#6B7280', fontSize: 20 }}>›</span>
      </Card>

      {/* Sign out */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border focus-ring"
        style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB', color: '#EF4444' }}>
        <LogOut size={16} /> Sign out
      </button>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={saveProfile}>Save</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Full name">
            <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
          </FormField>
          <FormField label="City">
            <Input value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} />
          </FormField>
        </div>
      </Modal>

      {/* Change PIN modal */}
      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title="Change PIN" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setPinOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={changePin}>Change PIN</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Current PIN">
            <Input type="password" inputMode="numeric" maxLength={6} value={pin.current} onChange={e => setPin(p=>({...p,current:e.target.value}))} />
          </FormField>
          <FormField label="New PIN">
            <Input type="password" inputMode="numeric" maxLength={6} value={pin.new} onChange={e => setPin(p=>({...p,new:e.target.value}))} />
          </FormField>
          <FormField label="Confirm new PIN">
            <Input type="password" inputMode="numeric" maxLength={6} value={pin.confirm} onChange={e => setPin(p=>({...p,confirm:e.target.value}))} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
