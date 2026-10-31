import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, tokenExpiry } from './session';
import { notify } from './toast';

const baseURL = import.meta.env.VITE_API_BASE;

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth endpointlari 401 ni o'zlari qayta ishlaydi (noto'g'ri parol / kod) — logout va refresh qilinmaydi.
const isAuthCall = (url = '') => /\/admin\/auth\/(login|totp|refresh)/.test(url);

let onAuthFailure = () => {};
export function setAuthFailureHandler(fn) { onAuthFailure = fn; }

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Refresh serverdan rad etildimi (400/401) — shunda sessiya haqiqatan tugagan. Tarmoq/5xx — vaqtinchalik. */
export function isAuthRejection(e) {
  if (e?.authRejected) return true;
  const s = e?.response?.status;
  return s === 400 || s === 401;
}

const LOCK_NAME = 'zx-admin-refresh';
const LS_LOCK = 'zx_refresh_lock';
const LOCK_TTL_MS = 15000;
const FRESH_MS = 15000; // boshqa tab yangilagan token kamida shuncha vaqt yashashi kerak

const tokenIsFresh = () => {
  const exp = tokenExpiry(getAccessToken());
  return Boolean(exp && exp - Date.now() > FRESH_MS);
};

async function postRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    const err = new Error('no-refresh-token');
    err.authRejected = true;
    throw err;
  }
  // api emas, oddiy axios — interceptor ichida rekursiya bo'lmasligi uchun
  const { data } = await axios.post(`${baseURL}/admin/auth/refresh`, { refreshToken });
  const token = data?.token || data?.data?.token;
  if (!token) {
    const err = new Error('refresh-failed');
    err.authRejected = true;
    throw err;
  }
  setTokens({ token, refreshToken: data?.refreshToken || data?.data?.refreshToken || refreshToken });
  return token;
}

// Qulf olingandan KEYIN tokenlar localStorage'dan qayta o'qiladi: boshqa tab allaqachon
// aylantirgan bo'lsa (refresh token bir martalik), yangi juftlikdan foydalanamiz.
async function refreshLocked(before) {
  if (getRefreshToken() !== before && tokenIsFresh()) return getAccessToken();
  return postRefresh();
}

// navigator.locks yo'q bo'lsa — localStorage qulfi + 'storage' hodisasi orqali kutish
function refreshWithStorageLock(before) {
  const me = `${Date.now()}:${Math.random()}`;
  const held = () => {
    const [ts] = String(localStorage.getItem(LS_LOCK) || '').split(':');
    return Number(ts) > Date.now() - LOCK_TTL_MS;
  };
  if (!held()) {
    localStorage.setItem(LS_LOCK, me);
    // raqobat: oxirgi yozgan g'olib
    if (localStorage.getItem(LS_LOCK) === me) {
      return refreshLocked(before).finally(() => {
        if (localStorage.getItem(LS_LOCK) === me) localStorage.removeItem(LS_LOCK);
      });
    }
  }
  // Boshqa tab yangilayapti — token o'zgarishini kutamiz
  return new Promise((resolve, reject) => {
    const done = (fn) => { window.removeEventListener('storage', onStorage); clearTimeout(t); fn(); };
    const onStorage = () => {
      if (getRefreshToken() !== before && tokenIsFresh()) done(() => resolve(getAccessToken()));
    };
    const t = setTimeout(() => done(() => refreshLocked(before).then(resolve, reject)), LOCK_TTL_MS / 3);
    window.addEventListener('storage', onStorage);
  });
}

// Bitta umumiy refresh va'dasi (shu tab ichida), tablar orasida esa qulf bilan
let refreshing = null;
export function refreshSession() {
  if (refreshing) return refreshing;
  const before = getRefreshToken();
  const run = () => (typeof navigator !== 'undefined' && navigator.locks?.request
    ? navigator.locks.request(LOCK_NAME, () => refreshLocked(before))
    : refreshWithStorageLock(before));
  refreshing = run().finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const cfg = error?.config;

    if (status === 401 && cfg && !isAuthCall(cfg.url) && !cfg._retried) {
      cfg._retried = true;
      try {
        const token = await refreshSession();
        cfg.headers.Authorization = `Bearer ${token}`;
        return api(cfg);
      } catch (re) {
        if (isAuthRejection(re)) {
          onAuthFailure(); // refresh token rad etildi — haqiqatan chiqamiz
        } else {
          // tarmoq xatosi / 5xx: sessiyani saqlaymiz, faqat so'rov muvaffaqiyatsiz
          notify('Sessiyani yangilab bo‘lmadi (tarmoq yoki server xatosi). Qayta urinib ko‘ring.', 'error');
        }
        return Promise.reject(error);
      }
    }
    if (status === 403 && cfg && !cfg.silent403) {
      notify('Bu amal uchun sizda ruxsat yo‘q.', 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
