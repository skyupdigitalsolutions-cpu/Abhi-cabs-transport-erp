/**
 * src/components/layout/ProtectedRoute.jsx
 *
 * Guards admin routes. Any authenticated staff role (ADMIN, OPS, FINANCE,
 * FLEET, SUPPORT) can enter the admin panel. Individual pages are then
 * gated by `permission` — each role only sees the pages their permissions
 * allow.
 *
 * Customers and drivers are redirected to login — they have their own apps.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Roles that may access the admin panel
const STAFF_ROLES = new Set(['admin', 'ops', 'finance', 'fleet', 'support', 'manager']);

export default function ProtectedRoute({ permission, requiredRole, redirectTo, children }) {
  const { isAuthenticated, hasPermission, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo || '/admin/login'} state={{ from: location }} replace />;
  }

  const role = (user?.role || '').toLowerCase();

  // If a specific role is required, check it (case-insensitive)
  if (requiredRole) {
    if (role !== requiredRole.toLowerCase()) {
      return <Navigate to="/admin/login" replace />;
    }
  } else {
    // Default: any staff role can access the admin panel
    // Block customers/drivers — they don't belong here
    if (!STAFF_ROLES.has(role)) {
      return <Navigate to="/admin/login" replace />;
    }
  }

  // Fine-grained: does this role hold the required permission?
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ?? <Outlet />;
}
