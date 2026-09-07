import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { notificationsService } from '../../services';
import { onForegroundMessage } from '../../lib/firebase';

export default function Navbar({ onMenuClick, title, liveConnected }) {
  const { user, logout, isDriver } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const { lastBookingEventId } = useAdminRealtimeContext();

  const refreshUnreadCount = () => {
    notificationsService.list({ page: 1, limit: 1 })
      .then((r) => setUnreadCount(r.unreadCount || 0))
      .catch(() => {});
  };

  useEffect(() => { refreshUnreadCount(); }, []);
  useEffect(() => { if (lastBookingEventId) refreshUnreadCount(); }, [lastBookingEventId]);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { title: t, body } = payload.notification || {};
      toast.info(`${t || 'New notification'}${body ? ' — ' + body : ''}`);
      refreshUnreadCount();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate(isDriver ? '/driver/login' : '/admin/login');
  };

  const avatarInitial = (user?.name || 'A').slice(0, 1).toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 sm:px-6"
      style={{ backgroundColor: '#ffffff', borderColor: '#E8E8E4' }}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-lg p-1.5 focus-ring"
        style={{ color: '#5A5A5A' }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <h1
        className="font-bold truncate tracking-tight"
        style={{ color: '#111111', fontSize: '14px', letterSpacing: '-0.2px' }}
      >
        {title}
      </h1>

      {liveConnected !== undefined && (
        <span
          className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase"
          style={{
            backgroundColor: liveConnected ? '#fff8e1' : '#F5F5F5',
            color: liveConnected ? '#b45309' : '#9A9A9A',
            border: `1px solid ${liveConnected ? '#FFC107' : '#E8E8E4'}`,
          }}
          title={liveConnected ? 'Live updates connected' : 'Live updates offline'}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: liveConnected ? '#FFC107' : '#D1D5DB' }}
          />
          {liveConnected ? 'Live' : 'Offline'}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <button
          className="relative h-8 w-8 grid place-items-center rounded-lg focus-ring transition-colors hover:bg-gray-100"
          style={{ color: '#5A5A5A' }}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onClick={() => navigate('/admin/notifications')}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full grid place-items-center text-[9px] font-bold text-black"
              style={{ backgroundColor: '#FFC107' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 focus-ring hover:bg-gray-50 transition-colors"
            style={{ color: '#111111' }}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div
              className="h-7 w-7 rounded-lg grid place-items-center text-xs font-extrabold"
              style={{ backgroundColor: '#FFC107', color: '#111111' }}
            >
              {avatarInitial}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold leading-none" style={{ color: '#111111' }}>{user?.name}</p>
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#9A9A9A' }}>
                {user?.role === 'driver' ? 'Driver' : 'Admin'}
              </p>
            </div>
            <ChevronDown size={12} style={{ color: '#9A9A9A' }} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl border shadow-xl py-1 text-xs z-50"
              style={{ backgroundColor: '#ffffff', borderColor: '#E8E8E4', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            >
              <div className="px-3 py-2.5 border-b" style={{ borderColor: '#E8E8E4' }}>
                <p className="font-bold truncate" style={{ color: '#111111' }}>{user?.name}</p>
                <p className="text-[10px] truncate mt-0.5 font-medium" style={{ color: '#9A9A9A' }}>{user?.email || user?.phone}</p>
              </div>
              {!isDriver && (
                <button
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                  style={{ color: '#111111' }}
                  onClick={() => { setOpen(false); navigate('/admin/settings'); }}
                >
                  <Settings size={13} /> Settings
                </button>
              )}
              <button
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 transition-colors"
                style={{ color: '#DC2626' }}
                onClick={handleLogout}
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
