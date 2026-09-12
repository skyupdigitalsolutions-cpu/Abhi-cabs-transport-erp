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
    <div className="flex min-h-screen" style={{ backgroundColor: '#F9F9F7' }}>
      <Sidebar nav={ADMIN_NAV} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      {/* lg:ml-60 offsets for the fixed 240px sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <Navbar
          onMenuClick={() => setMobileOpen(true)}
          title={current?.label || 'ABHI CABS ERP'}
          liveConnected={connected}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
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
