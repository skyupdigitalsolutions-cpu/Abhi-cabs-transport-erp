import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { ROLE_PERMISSIONS } from '../constants';
import { requestNotificationPermission } from '../lib/firebase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The backend returns role as uppercase ("ADMIN", "DRIVER", "OPS") — the ERP's
  // routes, ROLE_HOME/ROLE_LOGIN maps, and permission lookups all compare
  // against lowercase ("admin", "driver"). Normalize once here so every
  // consumer of `user` throughout the app gets a consistent, lowercase role,
  // regardless of what casing the API happens to return.
  const normalizeUser = (raw) => (raw ? { ...raw, role: String(raw.role || '').toLowerCase() } : raw);

  const [user, setUser]           = useState(() => normalizeUser(authService.getCurrentUser()));
  const [initializing, setInitializing] = useState(false);

  useEffect(() => { setInitializing(false); }, []);

  const loginAdmin  = useCallback(async (creds) => { const { user: u } = await authService.loginAdmin(creds);  const nu = normalizeUser(u); setUser(nu); requestNotificationPermission(); return nu; }, []);
  const loginDriver = useCallback(async (creds) => { const { user: u } = await authService.loginDriver(creds); const nu = normalizeUser(u); setUser(nu); return nu; }, []);
  const logout      = useCallback(async ()       => { await authService.logout(); setUser(null); }, []);

  const permissions   = useMemo(() => (user ? ROLE_PERMISSIONS[user.role] || [] : []), [user]);
  const hasPermission = useCallback((perm) => !perm || permissions.includes(perm), [permissions]);

  const value = useMemo(() => ({
    user, initializing,
    loginAdmin, loginDriver, logout, hasPermission,
    isAuthenticated: !!user,
    isAdmin:  user?.role === 'admin',
    isDriver: user?.role === 'driver',
  }), [user, initializing, loginAdmin, loginDriver, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
