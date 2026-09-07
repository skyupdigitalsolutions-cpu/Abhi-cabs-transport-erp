/**
 * ABHI CABS ERP Auth Service
 * Wired to the real backend auth endpoints (/api/v1/auth/*):
 *   POST /auth/login          — email + password (admin & staff roles)
 *   POST /auth/otp/request    — send OTP (used for driver phone login)
 *   POST /auth/otp/verify     — verify OTP → tokens
 *   POST /auth/refresh        — rotate refresh token (handled inside apiClient)
 *   GET  /auth/me             — current user + permissions
 *   POST /auth/change-password
 *   POST /auth/logout / /auth/logout-all
 * Falls back to mock credentials when VITE_USE_MOCK=true or the backend is
 * unreachable (VITE_MOCK_FALLBACK=true).
 */
import { apiClient, ApiError, withMockFallback } from './apiClient';
import { mockResolve } from './mockUtils';
import { setSession, clearSession, getStoredUser, getToken } from './authStorage';
import { users, drivers } from './mockDb';

const MOCK_ADMIN = {
  id:    'USR-ADMIN-001',
  name:  'Abhi Admin',
  email: 'admin@abhicabs.in',
  role:  'admin',
};

const MOCK_DRIVER = {
  id:        'DRV-MOCK-001',
  name:      'Ravi Kumar',
  email:     'driver1@example.com',
  phone:     '9876543210',
  role:      'driver',
  licenseNo: 'KA3120221234',
  status:    'active',
};

async function mockLoginAdmin({ email, password }) {
  await mockResolve(null);
  if (!password || password.length < 6) {
    throw new ApiError('Invalid email or password.', { status: 401, code: 'INVALID_CREDENTIALS' });
  }
  const match = users.find((u) => u.email === email && u.role !== 'driver') || MOCK_ADMIN;
  const token = `mock.admin.${btoa(email)}.${Date.now()}`;
  const refreshToken = `mock.refresh.${Date.now()}`;
  const user = { ...match, role: match.role || 'admin' };
  setSession(token, user, refreshToken);
  return { token, refreshToken, user };
}

async function mockLoginDriver({ email, password }) {
  await mockResolve(null);
  if (!password || password.length < 4) {
    throw new ApiError('Invalid email or password.', { status: 401, code: 'INVALID_CREDENTIALS' });
  }
  const match = drivers.find((d) => d.email === email) || { ...MOCK_DRIVER, email };
  const token = `mock.driver.${btoa(email)}.${Date.now()}`;
  const refreshToken = `mock.refresh.${Date.now()}`;
  const user = { ...match, role: 'driver' };
  setSession(token, user, refreshToken);
  return { token, refreshToken, user };
}

export const authService = {
  /** Admin / staff: email + password → POST /auth/login */
  async loginAdmin({ email, password }) {
    return withMockFallback(
      async () => {
        const data = await apiClient.post('/auth/login', { email, password });
        setSession(data.accessToken, data.user, data.refreshToken);
        return { token: data.accessToken, user: data.user };
      },
      () => mockLoginAdmin({ email, password })
    );
  },

  /** Driver: email + password → POST /auth/login (same endpoint as admin).
   *  The backend's /auth/login only accepts { email, password } — there is
   *  no phone-based login field in its validator (src/validators/schemas.js
   *  loginSchema). Drivers are seeded with both an email and a phone number,
   *  but must sign in with the email, same as every other role. */
  async loginDriver({ email, password }) {
    return withMockFallback(
      async () => {
        const data = await apiClient.post('/auth/login', { email, password });
        setSession(data.accessToken, data.user, data.refreshToken);
        return { token: data.accessToken, user: data.user };
      },
      () => mockLoginDriver({ email, password })
    );
  },

  async requestOtp(phone) {
    return withMockFallback(
      () => apiClient.post('/auth/otp/request', { phone }),
      () => mockResolve({ sent: true })
    );
  },

  async requestPasswordReset(email) {
    return withMockFallback(
      () => apiClient.post('/auth/password/forgot', { email }),
      () => mockResolve({ sent: true })
    );
  },

  async resetPassword({ token, password }) {
    return withMockFallback(
      () => apiClient.post('/auth/password/reset', { token, password }),
      () => mockResolve({ success: true })
    );
  },

  async changePassword({ currentPassword, newPassword }) {
    return withMockFallback(
      () => apiClient.post('/auth/change-password', { currentPassword, newPassword }),
      () => mockResolve({ success: true })
    );
  },

  /** GET /auth/me — current user + live permissions from the server. */
  async getMe() {
    return withMockFallback(
      () => apiClient.get('/auth/me'),
      () => mockResolve(getStoredUser())
    );
  },

  async logout() {
    try {
      if (getToken()) await apiClient.post('/auth/logout');
    } catch { /* best-effort */ }
    clearSession();
  },

  async logoutAll() {
    try {
      if (getToken()) await apiClient.post('/auth/logout-all');
    } catch { /* best-effort */ }
    clearSession();
  },

  getCurrentUser() {
    return getToken() ? getStoredUser() : null;
  },
};
