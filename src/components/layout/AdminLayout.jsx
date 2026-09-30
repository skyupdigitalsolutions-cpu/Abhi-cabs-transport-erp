import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { ADMIN_NAV } from '../../constants';
import { AdminRealtimeProvider, useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import useFollowUpAlerts from '../../hooks/useFollowUpAlerts';

function AdminLayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const current  = ADMIN_NAV.find((n) => location.pathname.startsWith(n.to));
  const { connected } = useAdminRealtimeContext();

  // Background follow-up reminder system — fires toasts, browser
  // notifications and an audio chime when a scheduled follow-up is due.
  const { dueCount } = useFollowUpAlerts();

  return (
    <div style={{ backgroundColor: '#F9F9F7', minHeight: '100vh' }}>
      <Sidebar
        nav={ADMIN_NAV}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:ml-60">
        <Navbar
          onMenuClick={() => setMobileOpen(true)}
          title={current?.label || 'ABHI CABS ERP'}
          liveConnected={connected}
          followUpsDue={dueCount}
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
