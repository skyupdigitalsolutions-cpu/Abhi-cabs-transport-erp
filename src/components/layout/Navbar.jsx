import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Calendar, AlertTriangle, Truck, CreditCard, MessageSquareWarning, Car } from 'lucide-react';
import { useAuth }    from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast }   from '../../hooks/useToast';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { onForegroundMessage }     from '../../lib/firebase';
import { timeAgo } from '../../utils/formatters';

export default function Navbar({ onMenuClick, title, liveConnected, followUpsDue = 0 }) {
  const { user, logout, isDriver } = useAuth();
  const [open, setOpen]           = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const toast    = useToast();

  // Use live feed length as unread count — no REST endpoint exists
  const { feed, lastEventId } = useAdminRealtimeContext();

  // Every new socket event increments unread count, not just new bookings.
  // Reset to 0 when user opens notifications page
  useEffect(() => {
    if (lastEventId) setUnreadCount((c) => c + 1);
  }, [lastEventId]);

  // Firebase foreground push
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { title: t, body } = payload.notification || {};
      toast.info(`${t || 'New notification'}${body ? ' — ' + body : ''}`);
      setUnreadCount((c) => c + 1);
    });
    return unsubscribe;
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // FIX: the bell previously did nothing but navigate straight to
  // /admin/notifications (a mock page, disconnected from the real feed —
  // see notificationsService.js) — there was no way to see or click an
  // individual real event at all. This opens an actual dropdown of the real
  // feed instead, and each item routes somewhere real when it has enough
  // information to: a bookingId takes you to that booking, a contactId
  // takes you to Support. An attempt with no bookingId yet (it may have
  // failed before a booking ever existed) is shown but not clickable —
  // sending it somewhere fake would be worse than not linking it at all.
  const handleBellClick = () => {
    setNotifOpen((o) => !o);
    setUnreadCount(0);
  };

  const goToNotification = (item) => {
    setNotifOpen(false);
    if (item.bookingId) {
      navigate(`/admin/bookings`);
    } else if (item.contactId) {
      navigate('/admin/support');
    } else if (item.kind === 'booking:attempted' || item.kind === 'admin:alert' || item.kind === 'booking:abandoned') {
      navigate('/admin/bookings');
    } else {
      navigate('/admin/notifications');
    }
  };

  const name  = user?.name  || 'Admin';
  const role  = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin';
  const email = user?.email || '';

  return (
    <header className="h-16 border-b flex items-center px-4 sm:px-6 gap-4"
      style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', zIndex: 30, position: 'sticky', top: 0 }}>

      {/* Mobile menu toggle */}
      <button onClick={onMenuClick}
        className="lg:hidden h-9 w-9 grid place-items-center rounded-lg"
        style={{ backgroundColor: '#F7F8FC' }}>
        <Menu size={18} style={{ color: '#6B7280' }} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate" style={{ color: '#1F2937' }}>{title}</p>
        {typeof liveConnected === 'boolean' && (
          <p className="text-[11.5px] font-medium" style={{ color: liveConnected ? '#38B763' : '#9CA3AF' }}>
            {liveConnected ? '● Live updates on' : '○ Live updates offline'}
          </p>
        )}
      </div>

      {/* Follow-up due badge */}
      {followUpsDue > 0 && (
        <button
          onClick={() => navigate('/admin/bookings')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{
            backgroundColor: '#FEF2F2', border: '1.5px solid #FECACA',
            cursor: 'pointer', animation: 'followup-pulse 2s ease-in-out infinite',
          }}
          title={`${followUpsDue} follow-up${followUpsDue > 1 ? 's' : ''} overdue — click to view bookings`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#DC2626' }}>
            {followUpsDue} due
          </span>
          <style>{`@keyframes followup-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>
        </button>
      )}

      {/* Bell + notification dropdown */}
      <div className="relative" ref={notifRef}>
        <button onClick={handleBellClick}
          className="relative h-9 w-9 grid place-items-center rounded-lg"
          style={{ backgroundColor: '#F7F8FC' }}>
          <Bell size={17} style={{ color: '#6B7280' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 grid place-items-center rounded-full text-[11.5px] font-bold text-white"
              style={{ backgroundColor: '#EF4444' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-80 max-w-[90vw] rounded-xl border shadow-lg overflow-hidden z-50"
            style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#F7F8FC' }}>
              <p className="text-xs font-bold" style={{ color: '#1F2937' }}>Notifications</p>
              <button onClick={() => { setNotifOpen(false); navigate('/admin/notifications'); }}
                className="text-[11.5px] font-semibold" style={{ color: '#3B65DB' }}>
                View all
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {feed.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: '#9CA3AF' }}>Nothing yet — new bookings, payments and trip updates will show up here live.</p>
              ) : (
                feed.slice(0, 20).map((item) => <NotificationItem key={item.id} item={item} onClick={() => goToNotification(item)} />)
              )}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          style={{ backgroundColor: open ? '#F7F8FC' : 'transparent' }}>
          <div className="h-8 w-8 rounded-full grid place-items-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: '#3B65DB' }}>
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold leading-none" style={{ color: '#1F2937' }}>{name}</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: '#6B7280' }}>{role}</p>
          </div>
          <ChevronDown size={14} style={{ color: '#6B7280' }}
            className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-lg overflow-hidden z-50"
            style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#F7F8FC' }}>
              <p className="text-xs font-bold" style={{ color: '#1F2937' }}>{name}</p>
              <p className="text-[11.5px] mt-0.5 truncate" style={{ color: '#6B7280' }}>{email}</p>
            </div>
            <div className="py-1">
              <MenuItem icon={LogOut}    label="Log out"  danger onClick={() => { setOpen(false); logout(); navigate('/admin/login'); }} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-gray-50"
      style={{ color: danger ? '#EF4444' : '#374151' }}>
      <Icon size={15} style={{ color: danger ? '#EF4444' : '#6B7280' }} />
      {label}
    </button>
  );
}

// One entry per kind, matching exactly what AdminRealtimeContext.jsx actually
// pushes (confirmed against bridge.js on the backend for field names) —
// icon, a short human label, and whether it's safe to link somewhere real.
const NOTIF_META = {
  'booking:created':   { icon: Calendar,  label: (i) => `New booking ${i.bookingNumber || ''}`.trim(), clickable: true },
  'booking:attempted': {
    icon: Car,
    label: (i) => {
      const pickup = i.pickupAddress ? String(i.pickupAddress).split(',')[0].trim() : '';
      const drop = i.dropAddress ? String(i.dropAddress).split(',')[0].trim() : '';
      const route = pickup && drop ? `${pickup} → ${drop}` : pickup || 'Unknown route';
      const type = i.tripType ? ` · ${i.tripType.replace(/_/g, ' ')}` : '';
      return `Booking attempt — ${route}${type}`;
    },
    clickable: true,
  },
  'admin:alert':       {
    icon: AlertTriangle,
    label: (i) => {
      const pickup = i.pickupAddress ? String(i.pickupAddress).split(',')[0].trim() : '';
      return `⚠ Attempt failed${pickup ? ` — ${pickup}` : ''} — ${i.reason || i.failureReason || 'unknown'}`;
    },
    clickable: true,
  },
  'trip:status':       { icon: Truck,     label: (i) => `${i.bookingNumber || 'Booking'} → ${(i.status || '').replace(/_/g, ' ')}`, clickable: true },
  'booking:allocated': { icon: Truck,     label: (i) => `Vehicle assigned${i.bookingNumber ? ` to ${i.bookingNumber}` : ''}`, clickable: true },
  'payment:received':  { icon: CreditCard, label: (i) => `Payment received${i.amount ? ` — ₹${Number(i.amount).toLocaleString('en-IN')}` : ''}`, clickable: true },
  'booking:abandoned': { icon: MessageSquareWarning, label: (i) => `Abandoned — ${i.name || i.pickupAddress?.split(',')[0] || 'unknown customer'}`, clickable: true },
};

function NotificationItem({ item, onClick }) {
  const meta = NOTIF_META[item.kind] || { icon: Bell, label: () => item.kind, clickable: true };
  const Icon = meta.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      className="w-full flex items-start gap-2.5 px-4 py-3 text-left border-b last:border-b-0"
      style={{
        borderColor: '#F7F8FC',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        transition: 'background-color 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <div className="h-7 w-7 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ backgroundColor: '#F7F8FC' }}>
        <Icon size={13} style={{ color: '#6B7280' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug" style={{ color: '#1F2937' }}>{meta.label(item)}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{timeAgo(item.at)}</p>
      </div>
    </div>
  );
}