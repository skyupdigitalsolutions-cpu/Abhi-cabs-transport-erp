import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, CalendarCheck, MapPin, CreditCard, User, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from './ErrorBoundary';
import { APP_NAME } from '../../constants';

const NAV = [
  { label: 'Book',      to: '/customer/book',      Icon: PlusCircle    },
  { label: 'Bookings',  to: '/customer/bookings',  Icon: CalendarCheck },
  { label: 'Track',     to: '/customer/track',     Icon: MapPin        },
  { label: 'Payments',  to: '/customer/payments',  Icon: CreditCard    },
  { label: 'Profile',   to: '/customer/profile',   Icon: User          },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => { await logout(); navigate('/customer/login'); };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F8FC' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center px-4 border-b"
        style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
        <div className="h-7 w-7 rounded-lg grid place-items-center font-bold text-white text-xs shrink-0"
          style={{ backgroundColor: '#3B65DB' }}>AC</div>
        <span className="font-bold text-sm ml-2" style={{ color: '#1F2937' }}>{APP_NAME}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-2"
          style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>Customer</span>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block text-sm font-medium" style={{ color: '#1F2937' }}>{user?.name}</span>
          <button onClick={handleLogout} className="p-1.5 rounded-lg focus-ring" style={{ color: '#6B7280' }} title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full pb-24">
        <ErrorBoundary key={location.pathname}><Outlet /></ErrorBoundary>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t z-30"
        style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
        {NAV.map(({ label, to, Icon }) => (
          <NavLink key={to} to={to}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold focus-ring"
            style={({ isActive }) => ({ color: isActive ? '#3B65DB':'#6B7280' })}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}