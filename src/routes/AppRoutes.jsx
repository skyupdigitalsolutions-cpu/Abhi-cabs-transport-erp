import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout   from '../components/layout/AdminLayout';
import LoadingState  from '../components/ui/LoadingState';
import { PERMISSIONS } from '../constants';
import ProtectedRoute from '../components/layout/ProtectedRoute';

// Auth pages
const AdminLogin    = lazy(() => import('../pages/auth/AdminLogin'));
const ForgotPassword= lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

// Admin pages — all lazy loaded
const Dashboard     = lazy(() => import('../pages/admin/Dashboard'));
const Clients       = lazy(() => import('../pages/admin/Clients'));
const Customers     = lazy(() => import('../pages/admin/Customers'));
const CustomerDetail= lazy(() => import('../pages/admin/CustomerDetail'));
const Drivers       = lazy(() => import('../pages/admin/Drivers'));
const Vehicles      = lazy(() => import('../pages/admin/Vehicles'));
const Bookings      = lazy(() => import('../pages/admin/Bookings'));
const BookingDetail = lazy(() => import('../pages/admin/BookingDetail'));
const Dispatch      = lazy(() => import('../pages/admin/Dispatch'));
const Trips         = lazy(() => import('../pages/admin/Trips'));
const LiveTracking  = lazy(() => import('../pages/admin/LiveTracking'));
const Payments      = lazy(() => import('../pages/admin/Payments'));
const Invoices      = lazy(() => import('../pages/admin/Invoices'));
const Reports       = lazy(() => import('../pages/admin/Reports'));
const Masters       = lazy(() => import('../pages/admin/Masters'));
const Notifications = lazy(() => import('../pages/admin/Notifications'));
const Support       = lazy(() => import('../pages/admin/Support'));
const WhatsApp      = lazy(() => import('../pages/admin/WhatsApp'));
const Discounts     = lazy(() => import('../pages/admin/Discounts'));
const UsersRoles    = lazy(() => import('../pages/admin/UsersRoles'));
const Settings      = lazy(() => import('../pages/admin/Settings'));

const P = ({ permission, children }) => (
  <ProtectedRoute permission={permission}>{children}</ProtectedRoute>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <Routes>
        {/* Auth */}
        <Route path="/admin/login"         element={<AdminLogin />} />
        <Route path="/admin/forgot"        element={<ForgotPassword />} />
        <Route path="/admin/reset"         element={<ResetPassword />} />

        {/* Admin — all inside layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"             element={<Dashboard />} />
          <Route path="clients"               element={<P permission={PERMISSIONS.CLIENTS_VIEW}><Clients /></P>} />
          <Route path="customers"             element={<P permission={PERMISSIONS.CLIENTS_VIEW}><Customers /></P>} />
          <Route path="customers/:id"         element={<P permission={PERMISSIONS.CLIENTS_VIEW}><CustomerDetail /></P>} />
          <Route path="drivers"               element={<P permission={PERMISSIONS.DRIVERS_VIEW}><Drivers /></P>} />
          <Route path="vehicles"              element={<P permission={PERMISSIONS.VEHICLES_VIEW}><Vehicles /></P>} />
          <Route path="bookings"              element={<P permission={PERMISSIONS.BOOKINGS_VIEW}><Bookings /></P>} />
          <Route path="bookings/:id"          element={<P permission={PERMISSIONS.BOOKINGS_VIEW}><BookingDetail /></P>} />
          <Route path="dispatch"              element={<P permission={PERMISSIONS.DISPATCH_MANAGE}><Dispatch /></P>} />
          <Route path="trips"                 element={<P permission={PERMISSIONS.TRIPS_VIEW}><Trips /></P>} />
          <Route path="tracking"              element={<P permission={PERMISSIONS.TRIPS_VIEW}><LiveTracking /></P>} />
          <Route path="payments"              element={<P permission={PERMISSIONS.PAYMENTS_VIEW}><Payments /></P>} />
          <Route path="invoices"              element={<P permission={PERMISSIONS.INVOICES_VIEW}><Invoices /></P>} />
          <Route path="reports"               element={<P permission={PERMISSIONS.REPORTS_VIEW}><Reports /></P>} />
          <Route path="masters"               element={<P permission={PERMISSIONS.MASTERS_MANAGE}><Masters /></P>} />
          <Route path="notifications"         element={<Notifications />} />
          <Route path="support"               element={<P permission={PERMISSIONS.SUPPORT_MANAGE}><Support /></P>} />
          <Route path="whatsapp"              element={<P permission={PERMISSIONS.SETTINGS_MANAGE}><WhatsApp /></P>} />
          <Route path="discounts"             element={<P permission={PERMISSIONS.SETTINGS_MANAGE}><Discounts /></P>} />
          <Route path="users"                 element={<P permission={PERMISSIONS.USERS_MANAGE}><UsersRoles /></P>} />
          <Route path="settings"              element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
