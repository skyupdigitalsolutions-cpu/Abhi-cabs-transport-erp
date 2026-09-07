import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { ADMIN_NAV } from '../../constants';
import { AdminRealtimeProvider, useAdminRealtimeContext } from '../../context/AdminRealtimeContext';

function AdminLayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const current = ADMIN_NAV.find((n) => location.pathname.startsWith(n.to));

  // Live "new booking" toasts + activity feed — the socket connection lives
  // in AdminRealtimeProvider (wrapped below), so this just reads its state.
  const { connected } = useAdminRealtimeContext();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F7F8FC' }}>
      <Sidebar nav={ADMIN_NAV} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} title={current?.label || 'ABHI CABS ERP'} liveConnected={connected} />
        <main className="flex-1 p-4 sm:p-6">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  // Provider lives here so exactly one socket connection exists per admin
  // session, shared by the Navbar's live indicator, Dashboard's activity
  // feed, and any other page that wants to react to live events.
  return (
    <AdminRealtimeProvider>
      <AdminLayoutInner />
    </AdminRealtimeProvider>
  );
}
