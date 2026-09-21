import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { ROLE_PERMISSIONS } from '../constants';
import { requestNotificationPermission } from '../lib/firebase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const normalizeUser = (raw) =>
    raw ? { ...raw, role: String(raw.role || '').toLowerCase() } : raw;

  const [user, setUser] = useState(() => normalizeUser(authService.getCurrentUser()));

  const loginAdmin = useCallback(async (creds) => {
    const { user: u } = await authService.loginAdmin(creds);
    const nu = normalizeUser(u);
    setUser(nu);
    requestNotificationPermission?.();
    return nu;
  }, []);

  const loginDriver = useCallback(async (creds) => {
    const { user: u } = await authService.loginDriver(creds);
    const nu = normalizeUser(u);
    setUser(nu);
    return nu;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    setUser(null);
  }, []);

  // apiClient dispatches this the moment it determines the session is truly
  // dead (refresh token invalid/missing, or an unrecoverable 401) — see the
  // comment on clearSession() in apiClient.js for why this event exists at
  // all. Without this listener, storage gets wiped but `user` here stays
  // populated forever, so isAuthenticated never flips to false and
  // ProtectedRoute never redirects: every mounted widget just keeps
  // re-fetching against a dead session and re-discovering the same 401,
  // instead of the app ever bouncing back to the login screen.
  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, []);

  // ROLE_PERMISSIONS is keyed by the backend's uppercase role enum
  // (ADMIN/OPS/FINANCE/FLEET/SUPPORT), while `user.role` here is normalized
  // to lowercase for route-guard comparisons elsewhere in the app. Looking
  // it up directly as ROLE_PERMISSIONS[user.role] always missed (e.g.
  // ROLE_PERMISSIONS['admin'] is undefined, only ROLE_PERMISSIONS['ADMIN']
  // exists), silently falling back to an empty permissions array for every
  // user — which hid every nav item that declares a `permission` in
  // ADMIN_NAV, leaving only the handful with none at all.
  const permissions = useMemo(
    () => (user ? ROLE_PERMISSIONS[user.role.toUpperCase()] || [] : []),
    [user]
  );
  // The backend also fully bypasses permission checks for ADMIN (see the
  // comment on ROLE_PERMISSIONS.ADMIN in constants/index.js), so the
  // frontend nav/route gating should match that rather than only working
  // for the permissions explicitly listed there.
  const hasPermission = useCallback(
    (perm) => !perm || user?.role === 'admin' || permissions.includes(perm),
    [permissions, user]
  );

  const value = useMemo(() => ({
    user, loginAdmin, loginDriver, logout, hasPermission,
    isAuthenticated: !!user,
    isAdmin:  user?.role === 'admin',
    isDriver: user?.role === 'driver',
  }), [user, loginAdmin, loginDriver, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}