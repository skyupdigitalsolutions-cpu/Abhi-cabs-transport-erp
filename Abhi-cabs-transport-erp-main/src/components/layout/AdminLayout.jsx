import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { ADMIN_NAV } from '../../constants';
import { AdminRealtimeProvider, useAdminRealtimeContext } from '../../context/AdminRealtimeContext';

const SIDEBAR_W = 240;

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

      {/* Main content — offset by sidebar width */}
      <div style={{ marginLeft: SIDEBAR_W }}>
        <Navbar
          onMenuClick={() => setMobileOpen(true)}
          title={current?.label || 'ABHI CABS ERP'}
          liveConnected={connected}
        />
        <main style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
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
