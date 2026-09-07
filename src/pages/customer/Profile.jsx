import { useState } from 'react';
import { Plus, MapPin, Trash2, Bell } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Switch from '../../components/ui/Switch';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const TABS = ['Profile', 'Addresses', 'Preferences'];

export default function CustomerProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('Profile');
  const [name, setName] = useState(user?.name || '');
  const [addresses, setAddresses] = useState([
    { id: 1, label: 'Warehouse', address: 'Peenya Industrial Area, Bengaluru' },
    { id: 2, label: 'Office', address: 'Sahakar Nagar, Bengaluru' },
  ]);
  const [prefs, setPrefs] = useState({ sms: true, email: true, whatsapp: false });

  return (
    <div>
      <PageHeader title="Profile & settings" description="Manage your account, saved addresses and notification preferences." />
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring ${tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <Card className="max-w-lg space-y-4">
          <FormField label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <FormField label="Phone number"><Input value={user?.phone || ''} disabled /></FormField>
          <FormField label="Email address" hint="Used for invoices and receipts."><Input type="email" defaultValue={user?.email || ''} /></FormField>
          <Button onClick={() => toast.success('Profile updated')}>Save changes</Button>
        </Card>
      )}

      {tab === 'Addresses' && (
        <Card className="max-w-lg">
          <div className="space-y-3 mb-4">
            {addresses.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.address}</p>
                  </div>
                </div>
                <IconButton icon={Trash2} label="Remove address" variant="danger" onClick={() => setAddresses((prev) => prev.filter((x) => x.id !== a.id))} />
              </div>
            ))}
          </div>
          <Button variant="secondary" icon={Plus} onClick={() => toast.info('Add-address form would open here')}>Add address</Button>
        </Card>
      )}

      {tab === 'Preferences' && (
        <Card className="max-w-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1"><Bell size={15} /> Notification channels</div>
          <Switch checked={prefs.sms} onChange={(v) => setPrefs((p) => ({ ...p, sms: v }))} label="SMS updates" />
          <Switch checked={prefs.email} onChange={(v) => setPrefs((p) => ({ ...p, email: v }))} label="Email updates" />
          <Switch checked={prefs.whatsapp} onChange={(v) => setPrefs((p) => ({ ...p, whatsapp: v }))} label="WhatsApp updates" />
          <Button onClick={() => toast.success('Preferences saved')}>Save preferences</Button>
        </Card>
      )}
    </div>
  );
}
