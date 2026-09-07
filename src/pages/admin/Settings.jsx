import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Switch from '../../components/ui/Switch';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { APP_NAME } from '../../constants';

const TABS = ['Company', 'Notifications', 'Security'];

export default function Settings() {
  const [tab, setTab] = useState('Company');
  const [form, setForm] = useState({
    companyName: APP_NAME,
    supportEmail: 'ops@abhicabs.in',
    gstin: '',
    address: 'Bengaluru, Karnataka, India',
  });
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: true, push: false });
  const toast = useToast();

  return (
    <div>
      <PageHeader title="Settings" description="Company profile, notification and security preferences." />

      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring"
            style={{
              borderColor: tab === t ? '#3B65DB' : 'transparent',
              color: tab === t ? '#3B65DB' : '#6B7280',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Company' && (
        <Card className="max-w-lg space-y-4">
          <FormField label="Company name">
            <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
          </FormField>
          <FormField label="Support email">
            <Input type="email" value={form.supportEmail} onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))} />
          </FormField>
          <FormField label="Address">
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </FormField>
          <FormField label="GSTIN" hint="Used on generated invoices.">
            <Input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} />
          </FormField>
          <Button onClick={() => toast.success('Settings saved')}>Save changes</Button>
        </Card>
      )}

      {tab === 'Notifications' && (
        <Card className="max-w-lg space-y-4">
          <Switch checked={notifPrefs.email} onChange={(v) => setNotifPrefs((p) => ({ ...p, email: v }))} label="Email notifications" />
          <Switch checked={notifPrefs.sms}   onChange={(v) => setNotifPrefs((p) => ({ ...p, sms: v }))}   label="SMS notifications" />
          <Switch checked={notifPrefs.push}  onChange={(v) => setNotifPrefs((p) => ({ ...p, push: v }))}  label="Push notifications" />
          <Button onClick={() => toast.success('Preferences saved')}>Save preferences</Button>
        </Card>
      )}

      {tab === 'Security' && (
        <Card className="max-w-lg text-sm" style={{ color: '#6B7280' }}>
          <p className="mb-3">Password policy, session timeout and two-factor settings are enforced by the backend.</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Minimum 8 characters with mixed case and numbers</li>
            <li>Admin sessions expire after 30 minutes of inactivity</li>
            <li>Driver PINs must be rotated every 90 days</li>
            <li>All API endpoints require Bearer token authorisation</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
