// Sessiya tokenlari — bitta joyda (localStorage). Boshqa modullarga bog'liq emas.
const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY) || '';
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || '';

export function setTokens({ token, refreshToken } = {}) {
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
  if (refreshToken !== undefined) {
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// JWT payload'idagi exp (soniya, epoch). Imzo tekshirilmaydi — faqat taymer uchun.
export function tokenExpiry(token = getAccessToken()) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = Number(JSON.parse(json).exp);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}
