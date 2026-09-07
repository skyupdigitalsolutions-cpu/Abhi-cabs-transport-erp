import { useState, useEffect } from 'react';
import { Phone, Mail, User, Shield, LogOut, Pencil } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';
import { APP_NAME } from '../../constants';
import { customerService, bookingService } from '../../services';

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const [editOpen, setEditOpen]   = useState(false);
  const [pwOpen,   setPwOpen]     = useState(false);
  const [form,     setForm]       = useState({ name: user?.name||'', email: user?.email||'' });
  const [pw,       setPw]         = useState({ current:'', new:'', confirm:'' });

  const handleLogout = async () => { await logout(); navigate('/customer/login'); };

  const saveProfile = async () => {
    try {
      await customerService.updateProfile(form);
      toast.success('Profile updated');
      setEditOpen(false);
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const savePassword = async () => {
    if (pw.new !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.new.length < 4)     { toast.error('Minimum 4 characters'); return; }
    try {
      // authService.changePassword lives on the ERP's auth module; imported
      // lazily here to avoid a circular dependency with useAuth.
      const { authService } = await import('../../services/authService');
      await authService.changePassword({ currentPassword: pw.current, newPassword: pw.new });
      toast.success('Password changed');
      setPwOpen(false);
      setPw({ current:'', new:'', confirm:'' });
    } catch (e) {
      toast.error(e.message || 'Current password is incorrect');
    }
  };

  const [totalBookings, setTotalBookings] = useState(0);
  useEffect(() => {
    if (!user) return;
    bookingService.list({ limit: 200 }).then((r) =>
      setTotalBookings((r.data || []).filter(b => b.customerId === user.id || b.clientName === user.name).length)
    );
  }, [user]);

  const info = [
    { icon: Phone, label: 'Mobile',  value: user?.phone },
    { icon: Mail,  label: 'Email',   value: user?.email || '—' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-5" style={{ color: '#1F2937' }}>My Profile</h2>

      {/* Avatar */}
      <Card className="flex flex-col items-center text-center mb-4">
        <div className="h-20 w-20 rounded-full grid place-items-center font-black text-2xl text-white mb-3"
          style={{ backgroundColor: '#3B65DB' }}>
          {(user?.name||'C').slice(0,1)}
        </div>
        <p className="font-bold text-lg" style={{ color: '#1F2937' }}>{user?.name}</p>
        <span className="mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>{APP_NAME} Customer</span>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-xl font-black" style={{ color: '#3B65DB' }}>{totalBookings}</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Bookings</p>
          </div>
        </div>
        <Button size="sm" variant="secondary" icon={Pencil} className="mt-3" onClick={() => setEditOpen(true)}>Edit Profile</Button>
      </Card>

      {/* Info */}
      <Card className="mb-4 !p-0 overflow-hidden">
        {info.map(({ icon: Icon, label, value }, i) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < info.length-1 ? '1px solid #F7F8FC':'none' }}>
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
      <Card className="mb-4 cursor-pointer" onClick={() => setPwOpen(true)}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: '#F7F8FC' }}>
            <Shield size={15} style={{ color: '#6B7280' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#1F2937' }}>Change password</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Update your account password</p>
          </div>
          <span style={{ color: '#6B7280', fontSize: 20 }}>›</span>
        </div>
      </Card>

      {/* Sign out */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border focus-ring"
        style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB', color: '#EF4444' }}>
        <LogOut size={16} /> Sign out
      </button>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" size="sm"
        footer={<><Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button><Button size="sm" onClick={saveProfile}>Save</Button></>}>
        <div className="space-y-4">
          <FormField label="Full name"><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></FormField>
        </div>
      </Modal>

      {/* Password modal */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change Password" size="sm"
        footer={<><Button variant="secondary" size="sm" onClick={() => setPwOpen(false)}>Cancel</Button><Button size="sm" onClick={savePassword}>Change</Button></>}>
        <div className="space-y-4">
          <FormField label="Current password"><PasswordInput value={pw.current} onChange={e => setPw(p=>({...p,current:e.target.value}))} /></FormField>
          <FormField label="New password"><PasswordInput value={pw.new} onChange={e => setPw(p=>({...p,new:e.target.value}))} /></FormField>
          <FormField label="Confirm new password"><PasswordInput value={pw.confirm} onChange={e => setPw(p=>({...p,confirm:e.target.value}))} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
