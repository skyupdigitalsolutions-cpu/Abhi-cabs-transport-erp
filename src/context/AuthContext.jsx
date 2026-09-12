import { createContext, useCallback, useMemo, useState } from 'react';
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

  const permissions   = useMemo(() => (user ? ROLE_PERMISSIONS[user.role] || [] : []), [user]);
  const hasPermission = useCallback((perm) => !perm || permissions.includes(perm), [permissions]);

  const value = useMemo(() => ({
    user, loginAdmin, loginDriver, logout, hasPermission,
    isAuthenticated: !!user,
    isAdmin:  user?.role === 'admin',
    isDriver: user?.role === 'driver',
  }), [user, loginAdmin, loginDriver, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
