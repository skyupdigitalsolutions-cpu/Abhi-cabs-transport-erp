/**
 * src/components/layout/ProtectedRoute.jsx
 *
 * FIX: role comparison was case-sensitive.
 * Backend returns role as "ADMIN" (uppercase).
 * AuthContext normalises it to "admin" (lowercase).
 * ProtectedRoute compared user.role ("admin") !== requiredRole ("ADMIN") → always redirected.
 *
 * Fix: compare both sides lowercased so "admin" === "admin" ✅
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LOGIN = {
  admin:  '/admin/login',
  user:   '/admin/login',
  driver: '/admin/login',
};

export default function ProtectedRoute({ permission, requiredRole, redirectTo, children }) {
  const { isAuthenticated, hasPermission, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo || '/admin/login'} state={{ from: location }} replace />;
  }

  // FIXED: compare lowercased so "admin" === "admin" regardless of what
  // the backend or the route definition uses as casing.
  if (requiredRole && user?.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    const fallback = ROLE_LOGIN[user?.role?.toLowerCase()] || '/admin/login';
    return <Navigate to={fallback} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ?? <Outlet />;
}