import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { Route, User, Wallet, FileText, AlertOctagon, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import ErrorBoundary from './ErrorBoundary';

const NAV = [
  { label: 'Trips',    to: '/driver/trips',         Icon: Route        },
  { label: 'Earnings', to: '/driver/earnings',       Icon: Wallet       },
  { label: 'Docs',     to: '/driver/documents',      Icon: FileText     },
  { label: 'SOS',      to: '/driver/sos',            Icon: AlertOctagon },
  { label: 'Profile',  to: '/driver/profile',        Icon: User         },
];

export default function DriverLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const current  = NAV.find(n => location.pathname.startsWith(n.to));

  const handleLogout = async () => { await logout(); navigate('/driver/login'); };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F8FC' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 border-b"
        style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
        <div className="h-7 w-7 rounded-lg grid place-items-center font-bold text-white text-xs shrink-0"
          style={{ backgroundColor: '#3B65DB' }}>AC</div>
        <span className="font-semibold text-sm" style={{ color: '#1F2937' }}>{APP_NAME}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>Driver</span>
        <h1 className="ml-auto font-medium text-sm truncate" style={{ color: '#6B7280' }}>
          {current?.label || 'App'}
        </h1>
        {/* Notification bell */}
        <NavLink to="/driver/notifications" className="relative p-1.5 rounded-lg focus-ring" style={{ color: '#6B7280' }}>
          <Bell size={18} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
        </NavLink>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full pb-24">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t z-30"
        style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
        {NAV.map(({ label, to, Icon }) => (
          <NavLink key={to} to={to}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold focus-ring"
            style={({ isActive }) => ({ color: isActive ? '#3B65DB':'#6B7280' })}>
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon size={20} />
                  {to === '/driver/sos' && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                  )}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
