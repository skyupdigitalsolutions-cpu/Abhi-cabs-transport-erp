import { useState } from 'react';
import { Bell, CheckCheck, Truck, IndianRupee, AlertOctagon, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { timeAgo } from '../../utils/formatters';

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'trip',    title: 'New trip assigned',          body: 'Bengaluru → Chennai · KA-05-AB-1234',  read: false, at: new Date(Date.now()-5*60000).toISOString() },
  { id: '2', type: 'payment', title: 'Payment received',           body: '₹1,850 credited to your wallet',         read: false, at: new Date(Date.now()-30*60000).toISOString() },
  { id: '3', type: 'alert',   title: 'Document expiry reminder',   body: 'Vehicle Insurance expires in 7 days',    read: false, at: new Date(Date.now()-2*3600000).toISOString() },
  { id: '4', type: 'trip',    title: 'Trip completed — great job!', body: 'Trip TRP-AB1234 marked completed',      read: true,  at: new Date(Date.now()-86400000).toISOString() },
  { id: '5', type: 'info',    title: 'Schedule update',            body: 'New trip available tomorrow at 08:00',   read: true,  at: new Date(Date.now()-2*86400000).toISOString() },
  { id: '6', type: 'payment', title: 'Withdrawal processed',       body: '₹2,000 sent to your bank account',       read: true,  at: new Date(Date.now()-3*86400000).toISOString() },
];

const TYPE_CONFIG = {
  trip:    { icon: Truck,          bg: '#eef2fb', color: '#3B65DB' },
  payment: { icon: IndianRupee,    bg: '#f0fdf4', color: '#38B763' },
  alert:   { icon: AlertOctagon,   bg: '#fef2f2', color: '#EF4444' },
  info:    { icon: Info,           bg: '#F7F8FC', color: '#6B7280' },
};

export default function DriverNotifications() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead    = (id) => setNotifs(prev => prev.map(n => n.id===id ? {...n, read: true} : n));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>Notifications</h2>
          {unreadCount > 0 && <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {notifs.length === 0 ? (
        <Card><EmptyState icon={Bell} title="No notifications" description="Updates about your trips and payments appear here." /></Card>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const Ico = cfg.icon;
            return (
              <div key={n.id}
                className="flex items-start gap-3 rounded-2xl border p-4 cursor-pointer"
                style={{ backgroundColor: n.read ? '#ffffff':'#f0f4ff', borderColor: n.read ? '#E5E7EB':'#c7d7f6' }}
                onClick={() => markRead(n.id)}>
                <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                  <Ico size={16} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: '#3B65DB' }} />}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{n.body}</p>
                  <p className="text-xs mt-1" style={{ color: '#6B7280', opacity: 0.7 }}>{timeAgo(n.at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
