import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import AdminLayout from '../components/layout/AdminLayout';
import DriverLayout from '../components/layout/DriverLayout';
import LoadingState from '../components/ui/LoadingState';
import { PERMISSIONS } from '../constants';

// — Auth
const AdminLogin     = lazy(() => import('../pages/auth/AdminLogin'));
const DriverLogin    = lazy(() => import('../pages/auth/DriverLogin'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('../pages/auth/ResetPassword'));

// — Admin pages
const Dashboard     = lazy(() => import('../pages/admin/Dashboard'));
const Clients       = lazy(() => import('../pages/admin/Clients'));
const ClientDetail  = lazy(() => import('../pages/admin/ClientDetail'));
const Drivers       = lazy(() => import('../pages/admin/Drivers'));
const Vehicles      = lazy(() => import('../pages/admin/Vehicles'));
const Bookings      = lazy(() => import('../pages/admin/Bookings'));
const BookingDetail = lazy(() => import('../pages/admin/BookingDetail'));
const Dispatch      = lazy(() => import('../pages/admin/Dispatch'));
const Trips         = lazy(() => import('../pages/admin/Trips'));
const LiveTracking  = lazy(() => import('../pages/admin/LiveTracking'));
const Payments      = lazy(() => import('../pages/admin/Payments'));
const Invoices      = lazy(() => import('../pages/admin/Invoices'));
const Notifications = lazy(() => import('../pages/admin/Notifications'));
const Reports       = lazy(() => import('../pages/admin/Reports'));
const Masters       = lazy(() => import('../pages/admin/Masters'));
const Support       = lazy(() => import('../pages/admin/Support'));
const UsersRoles    = lazy(() => import('../pages/admin/UsersRoles'));
const Settings      = lazy(() => import('../pages/admin/Settings'));

// — Driver pages
const DriverTrips         = lazy(() => import('../pages/driver/DriverTrips'));
const DriverEarnings      = lazy(() => import('../pages/driver/DriverEarnings'));
const DriverDocuments     = lazy(() => import('../pages/driver/DriverDocuments'));
const DriverSOS           = lazy(() => import('../pages/driver/DriverSOS'));
const DriverProfile       = lazy(() => import('../pages/driver/DriverProfile'));
const DriverNotifications = lazy(() => import('../pages/driver/DriverNotifications'));

// — Misc
const NotFound     = lazy(() => import('../pages/NotFound'));
const Unauthorized = lazy(() => import('../pages/Unauthorized'));

function Fallback() {
  return (
    <div className="min-h-screen grid place-items-center" style={{ backgroundColor: '#F7F8FC' }}>
      <LoadingState label="Loading…" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Root → Admin dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        {/* ── Auth ─────────────────────────────────────────── */}
        <Route path="/admin/login"           element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password"  element={<ResetPassword />} />
        <Route path="/driver/login"          element={<DriverLogin />} />
        <Route path="/unauthorized"          element={<Unauthorized />} />

        {/* ── Admin ERP ────────────────────────────────────── */}
        <Route element={<ProtectedRoute requiredRole="admin" redirectTo="/admin/login" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.CLIENTS_VIEW} />}>
              <Route path="clients"            element={<Clients />} />
              <Route path="clients/:clientId"  element={<ClientDetail />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.DRIVERS_VIEW} />}>
              <Route path="drivers"  element={<Drivers />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.VEHICLES_VIEW} />}>
              <Route path="vehicles" element={<Vehicles />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.BOOKINGS_VIEW} />}>
              <Route path="bookings"            element={<Bookings />} />
              <Route path="bookings/:bookingId" element={<BookingDetail />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.DISPATCH_MANAGE} />}>
              <Route path="dispatch" element={<Dispatch />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.TRIPS_VIEW} />}>
              <Route path="trips"    element={<Trips />} />
              <Route path="tracking" element={<LiveTracking />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.PAYMENTS_VIEW} />}>
              <Route path="payments" element={<Payments />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.INVOICES_VIEW} />}>
              <Route path="invoices" element={<Invoices />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.REPORTS_VIEW} />}>
              <Route path="reports"  element={<Reports />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.MASTERS_MANAGE} />}>
              <Route path="masters"  element={<Masters />} />
            </Route>
            <Route path="notifications" element={<Notifications />} />
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.SUPPORT_MANAGE} />}>
              <Route path="support"  element={<Support />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="admin" permission={PERMISSIONS.USERS_MANAGE} />}>
              <Route path="users"    element={<UsersRoles />} />
            </Route>
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* ── Driver App ───────────────────────────────────── */}
        <Route element={<ProtectedRoute requiredRole="driver" redirectTo="/driver/login" />}>
          <Route path="/driver" element={<DriverLayout />}>
            <Route index                element={<Navigate to="trips" replace />} />
            <Route path="trips"         element={<DriverTrips />} />
            <Route path="earnings"      element={<DriverEarnings />} />
            <Route path="documents"     element={<DriverDocuments />} />
            <Route path="sos"           element={<DriverSOS />} />
            <Route path="profile"       element={<DriverProfile />} />
            <Route path="notifications" element={<DriverNotifications />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
