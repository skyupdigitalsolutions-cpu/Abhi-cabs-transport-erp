import { useState } from 'react';
import { Save, Eye, EyeOff, Key, Bell, Building2, Shield } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card       from '../../components/ui/Card';
import FormField  from '../../components/ui/FormField';
import Input      from '../../components/ui/Input';
import Button     from '../../components/ui/Button';
import Alert      from '../../components/ui/Alert';
import Badge      from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { APP_NAME } from '../../constants';

const TABS = [
  { key: 'company',       label: 'Company',       icon: Building2 },
  { key: 'notifications', label: 'Notifications', icon: Bell      },
  { key: 'security',      label: 'Security',      icon: Shield    },
  { key: 'api',           label: 'API Keys',      icon: Key       },
];

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative" onClick={() => onChange(!checked)}>
        <div className="w-10 h-5 rounded-full transition-colors"
          style={{ backgroundColor: checked ? '#FFC107' : '#E8E8E4' }} />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
      </div>
      <span className="text-sm font-medium" style={{ color: '#111111' }}>{label}</span>
    </label>
  );
}

export default function Settings() {
  const toast = useToast();
  const [tab, setTab] = useState('company');
  const [showKey, setShowKey] = useState(false);

  const [company, setCompany] = useState({
    name: APP_NAME, supportEmail: 'ops@abhicabs.in',
    phone: '+91 98765 43210', address: 'Bengaluru, Karnataka, India',
    gstin: '', pan: '', cin: '',
  });

  const [notifs, setNotifs] = useState({
    emailOnNewBooking: true, emailOnCancellation: true,
    smsOnDriverAssign: true, whatsappOnConfirm: true,
    pushOnNewBooking: false,
  });

  const [security, setSecurity] = useState({
    current: '', newPass: '', confirm: '',
  });

  const saveCompany = () => toast.success('Company settings saved');
  const saveNotifs  = () => toast.success('Notification preferences saved');
  const changePass  = () => {
    if (!security.current) { toast.error('Enter current password'); return; }
    if (security.newPass !== security.confirm) { toast.error('Passwords do not match'); return; }
    toast.success('Password changed successfully');
    setSecurity({ current: '', newPass: '', confirm: '' });
  };

  return (
    <div>
      <PageHeader title="Settings" description="Company profile, notifications and security preferences." />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#E8E8E4' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors"
            style={{ borderColor: tab === key ? '#FFC107' : 'transparent', color: tab === key ? '#111111' : '#9A9A9A' }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Company */}
      {tab === 'company' && (
        <Card className="max-w-xl space-y-4">
          <h3 className="text-sm font-bold" style={{ color: '#111111' }}>Company Profile</h3>
          <Alert type="info">
            These details appear on generated invoices and customer communications.
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Company name" className="sm:col-span-2">
              <Input value={company.name} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} />
            </FormField>
            <FormField label="Support email">
              <Input type="email" value={company.supportEmail} onChange={(e) => setCompany((c) => ({ ...c, supportEmail: e.target.value }))} />
            </FormField>
            <FormField label="Support phone">
              <Input value={company.phone} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <Input value={company.address} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} />
            </FormField>
            <FormField label="GSTIN" hint="15-digit GST number">
              <Input value={company.gstin} onChange={(e) => setCompany((c) => ({ ...c, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
            </FormField>
            <FormField label="PAN">
              <Input value={company.pan} onChange={(e) => setCompany((c) => ({ ...c, pan: e.target.value }))} placeholder="AAAAA1234A" />
            </FormField>
          </div>
          <Button icon={Save} onClick={saveCompany}>Save company settings</Button>
        </Card>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <Card className="max-w-xl space-y-5">
          <h3 className="text-sm font-bold" style={{ color: '#111111' }}>Notification Preferences</h3>
          <Alert type="info">
            WhatsApp and SMS notifications require MSG91 credentials in the backend .env file.
          </Alert>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9A9A9A' }}>Email</p>
              <div className="space-y-3">
                <Toggle checked={notifs.emailOnNewBooking}    onChange={(v) => setNotifs((n) => ({ ...n, emailOnNewBooking: v }))}    label="Email admin on new booking" />
                <Toggle checked={notifs.emailOnCancellation}  onChange={(v) => setNotifs((n) => ({ ...n, emailOnCancellation: v }))}  label="Email admin on cancellation" />
              </div>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: '#E8E8E4' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9A9A9A' }}>WhatsApp / SMS (via MSG91)</p>
              <div className="space-y-3">
                <Toggle checked={notifs.whatsappOnConfirm}   onChange={(v) => setNotifs((n) => ({ ...n, whatsappOnConfirm: v }))}    label="WhatsApp customer on booking confirmed" />
                <Toggle checked={notifs.smsOnDriverAssign}   onChange={(v) => setNotifs((n) => ({ ...n, smsOnDriverAssign: v }))}    label="WhatsApp customer on driver assigned" />
              </div>
            </div>
          </div>
          <Button icon={Save} onClick={saveNotifs}>Save preferences</Button>
        </Card>
      )}

      {/* Security */}
      {tab === 'security' && (
        <Card className="max-w-md space-y-4">
          <h3 className="text-sm font-bold" style={{ color: '#111111' }}>Change Password</h3>
          <FormField label="Current password">
            <Input type="password" value={security.current}
              onChange={(e) => setSecurity((s) => ({ ...s, current: e.target.value }))} />
          </FormField>
          <FormField label="New password">
            <Input type="password" value={security.newPass}
              onChange={(e) => setSecurity((s) => ({ ...s, newPass: e.target.value }))} />
          </FormField>
          <FormField label="Confirm new password">
            <Input type="password" value={security.confirm}
              onChange={(e) => setSecurity((s) => ({ ...s, confirm: e.target.value }))} />
          </FormField>
          <Alert type="warning">
            Forgot/reset password via email is not yet supported. Contact your system administrator.
          </Alert>
          <Button icon={Shield} onClick={changePass}>Change password</Button>
        </Card>
      )}

      {/* API Keys */}
      {tab === 'api' && (
        <div className="max-w-xl space-y-4">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold" style={{ color: '#111111' }}>Backend Environment Keys</h3>
            <Alert type="info">
              These keys are set in the backend <code className="font-mono text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: '#F5F5F3' }}>.env</code> file,
              not in the ERP. Listed here for reference only.
            </Alert>
            {[
              { label: 'MSG91 Auth Key',      key: 'MSG91_AUTH_KEY',          status: 'missing',      hint: 'Required for WhatsApp/SMS notifications' },
              { label: 'MSG91 Sender ID',     key: 'MSG91_SENDER_ID',         status: 'missing',      hint: 'Your registered sender ID (e.g. ABHICB)' },
              { label: 'Razorpay Key ID',     key: 'RAZORPAY_KEY_ID',         status: 'check backend', hint: 'Required for online payments' },
              { label: 'Firebase Server Key', key: 'FIREBASE_SERVER_KEY',     status: 'optional',     hint: 'Required for push notifications to ERP' },
              { label: 'JWT Secret',          key: 'JWT_SECRET',              status: 'required',     hint: 'Must be a strong random string' },
              { label: 'Redis URL',           key: 'REDIS_URL',               status: 'required',     hint: 'Required for BullMQ job queues' },
            ].map((item) => (
              <div key={item.key} className="rounded-xl border p-3"
                style={{ borderColor: '#E8E8E4' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color: '#111111' }}>{item.label}</span>
                  <Badge tone={item.status === 'required' || item.status === 'missing' ? 'red' : item.status === 'optional' ? 'slate' : 'amber'}>
                    {item.status}
                  </Badge>
                </div>
                <code className="text-[10px] font-mono" style={{ color: '#7c3aed' }}>{item.key}</code>
                <p className="text-[10px] mt-1" style={{ color: '#9A9A9A' }}>{item.hint}</p>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
