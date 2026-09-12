import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROLE_HOME  = { admin: '/admin/dashboard', driver: '/driver/trips' };
const ROLE_LOGIN = { admin: '/admin/login',     driver: '/driver/login'  };

export default function ProtectedRoute({ permission, requiredRole, redirectTo, children }) {
  const { isAuthenticated, hasPermission, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const fallback = redirectTo || ROLE_LOGIN[requiredRole] || '/admin/login';
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={ROLE_HOME[user?.role] || '/admin/login'} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}