import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LOGIN = {
  ADMIN:  '/admin/login',
  USER:   '/customer/login',
  DRIVER: '/driver/login',
};

export default function ProtectedRoute({ permission, requiredRole, redirectTo, children }) {
  const { isAuthenticated, hasPermission, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const fallback = redirectTo || ROLE_LOGIN[requiredRole] || '/admin/login';
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    const fallback = ROLE_LOGIN[user?.role] || '/admin/login';
    return <Navigate to={fallback} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // When used as a layout wrapper (no children), render nested routes via Outlet.
  // When used as a guard around a specific page (children passed), render children.
  return children ?? <Outlet />;
}
