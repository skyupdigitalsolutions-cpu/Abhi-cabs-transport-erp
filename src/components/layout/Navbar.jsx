import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuth }    from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast }   from '../../hooks/useToast';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { onForegroundMessage }     from '../../lib/firebase';

export default function Navbar({ onMenuClick, title, liveConnected }) {
  const { user, logout, isDriver } = useAuth();
  const [open, setOpen]           = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast    = useToast();

  // Use live feed length as unread count — no REST endpoint exists
  const { feed, lastBookingEventId } = useAdminRealtimeContext();

  // Each new socket event increments unread count
  // Reset to 0 when user opens notifications page
  useEffect(() => {
    if (lastBookingEventId) setUnreadCount((c) => c + 1);
  }, [lastBookingEventId]);

  // Firebase foreground push
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { title: t, body } = payload.notification || {};
      toast.info(`${t || 'New notification'}${body ? ' — ' + body : ''}`);
      setUnreadCount((c) => c + 1);
    });
    return unsubscribe;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleBellClick = () => {
    setUnreadCount(0); // reset when navigating to notifications
    navigate('/admin/notifications');
  };

  const name  = user?.name  || 'Admin';
  const role  = isDriver ? 'Driver' : 'Admin';
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
          <p className="text-[10px] font-medium" style={{ color: liveConnected ? '#38B763' : '#9CA3AF' }}>
            {liveConnected ? '● Live updates on' : '○ Live updates offline'}
          </p>
        )}
      </div>

      {/* Bell */}
      <button onClick={handleBellClick}
        className="relative h-9 w-9 grid place-items-center rounded-lg"
        style={{ backgroundColor: '#F7F8FC' }}>
        <Bell size={17} style={{ color: '#6B7280' }} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 grid place-items-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: '#EF4444' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

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
            <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>{role}</p>
          </div>
          <ChevronDown size={14} style={{ color: '#6B7280' }}
            className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-lg overflow-hidden z-50"
            style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#F7F8FC' }}>
              <p className="text-xs font-bold" style={{ color: '#1F2937' }}>{name}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: '#6B7280' }}>{email}</p>
            </div>
            <div className="py-1">
              <MenuItem icon={UserIcon}  label="Profile"  onClick={() => { setOpen(false); navigate('/admin/settings'); }} />
              <MenuItem icon={Settings}  label="Settings" onClick={() => { setOpen(false); navigate('/admin/settings'); }} />
              <div className="border-t my-1" style={{ borderColor: '#F7F8FC' }} />
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
