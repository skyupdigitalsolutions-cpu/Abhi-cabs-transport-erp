import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { ADMIN_NAV } from '../../constants';
import { AdminRealtimeProvider, useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import useFollowUpAlerts from '../../hooks/useFollowUpAlerts';
import NewBookingPopup from '../booking/NewBookingPopup';
import BookingAlertStack from '../booking/BookingAlertStack';

const SIDEBAR_COLLAPSED_KEY = 'terp_sidebar_collapsed';

function AdminLayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop sidebar collapse preference — persisted so it survives reloads.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
    return next;
  });
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
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div className={`terp-content${collapsed ? ' is-collapsed' : ''}`}>
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

      {/* New-booking confirm/dismiss popup + persistent corner stack.
          Live across the whole admin area so a booking is never missed,
          whichever page the admin is on. */}
      <NewBookingPopup />
      <BookingAlertStack />
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
