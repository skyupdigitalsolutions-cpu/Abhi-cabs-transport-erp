import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { ADMIN_NAV } from '../../constants';
import { AdminRealtimeProvider, useAdminRealtimeContext } from '../../context/AdminRealtimeContext';

function AdminLayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const current  = ADMIN_NAV.find((n) => location.pathname.startsWith(n.to));
  const { connected } = useAdminRealtimeContext();

  return (
    <div style={{ backgroundColor: '#F9F9F7', minHeight: '100vh' }}>
      <Sidebar
        nav={ADMIN_NAV}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar width, but only once the sidebar
          itself is actually visible (lg+). Previously this margin was
          always applied via inline style regardless of screen size, so on
          mobile the content was squeezed into whatever space was left next
          to a sidebar that (before the Sidebar.jsx fix) was also always
          on-screen — and even after that fix, an unconditional margin here
          alone would have left a permanent 240px blank gap on phones. */}
      <div className="lg:ml-60">
        <Navbar
          onMenuClick={() => setMobileOpen(true)}
          title={current?.label || 'ABHI CABS ERP'}
          liveConnected={connected}
        />
        <main className="p-4 sm:p-6" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminRealtimeProvider>
      <AdminLayoutInner />
    </AdminRealtimeProvider>
  );
}
