/**
 * Session storage helpers.
 * Access + refresh tokens are kept in memory + sessionStorage (not
 * localStorage) to reduce exposure; in production this should be replaced
 * by an httpOnly cookie issued by the backend, with this module only
 * tracking auth "state". Refresh tokens are single-use — every refresh call
 * must persist the newly rotated pair via setTokens().
 */
const TOKEN_KEY = 'terp_token';
const REFRESH_KEY = 'terp_refresh';
const USER_KEY = 'terp_user';

let memoryToken = null;
let memoryRefresh = null;

export function getToken() {
  return memoryToken || sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return memoryRefresh || sessionStorage.getItem(REFRESH_KEY);
}

export function setSession(token, user, refreshToken) {
  memoryToken = token;
  memoryRefresh = refreshToken || null;
  sessionStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Called after a token refresh — rotates only the token pair, keeps the
// stored user untouched.
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    memoryToken = accessToken;
    sessionStorage.setItem(TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    memoryRefresh = refreshToken;
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearSession() {
  memoryToken = null;
  memoryRefresh = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
}
