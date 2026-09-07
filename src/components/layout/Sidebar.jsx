import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../constants';

export default function Sidebar({ nav, mobileOpen, onCloseMobile }) {
  const { hasPermission } = useAuth();
  const items = nav.filter((item) => hasPermission(item.permission));

  const content = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: 'rgba(255,193,7,0.2)' }}>
        {/* Logo mark — road-A in yellow on black */}
        <div
          className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0 font-extrabold text-sm"
          style={{ background: '#FFC107', color: '#111111', letterSpacing: '-0.5px' }}
        >
          AC
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-white text-sm leading-none tracking-widest uppercase">
            {APP_NAME}
          </p>
          <p className="text-[10px] mt-0.5 tracking-widest uppercase font-medium" style={{ color: '#FFC107' }}>
            Transport ERP
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = Icons[item.icon] || Icons.Circle;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all focus-ring',
                  isActive
                    ? 'text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/8'
                )
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: '#FFC107', color: '#111111' } : {}
              }
            >
              <Icon size={15} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,193,7,0.15)' }}>
        <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: '#555' }}>
          © 2026 Abhi Cabs
        </p>
        <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#FFC107' }}>
          Ride With Trust
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0"
        style={{ backgroundColor: '#111111' }}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            className="relative flex flex-col w-60 h-full"
            style={{ backgroundColor: '#111111' }}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
