// src/stores/auth.js — admin autentifikatsiya (parol + 2FA), rollar, sessiya
import { defineStore } from 'pinia';
import api, { setAuthFailureHandler } from '../lib/axios';
import { getAccessToken, setTokens, clearTokens } from '../lib/session';

// Rollar matritsasi (backend bilan bir xil): viewer < operator < super
const ROLE_RANK = { viewer: 1, operator: 2, super: 3 };
export const ROLE_LABELS = { viewer: 'Kuzatuvchi', operator: 'Operator', super: 'Super admin' };

// Amal → minimal rol
const PERMISSIONS = {
  reveal: 'operator',   // PII ni ochib ko'rish
  news: 'operator',     // yangiliklar CRUD
  cancelPayment: 'super',
  broadcast: 'super',
  version: 'super',
  export: 'super',
  manageAdmins: 'super',
  audit: 'super',
  loginArchive: 'operator', // IP/qurilma tarixi (backend: viewer uchun 403)
};

const unwrap = (res) => res?.data?.data && !res.data.token && !res.data.step ? res.data.data : res?.data;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getAccessToken(),
    user: null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    role: (state) => {
      const r = state.user?.admin_role;
      return ROLE_RANK[r] ? r : 'viewer'; // noma'lum bo'lsa — eng kam huquq
    },
    roleLabel() { return ROLE_LABELS[this.role]; },
    // /admin/auth/me faqat adminlarga javob beradi — user yuklangan bo'lsa admin.
    isAdmin: (state) => Boolean(state.user),
  },

  actions: {
    can(permission) {
      const need = PERMISSIONS[permission] || 'super';
      return ROLE_RANK[this.role] >= ROLE_RANK[need];
    },

    // 1-qadam: telefon + parol → { step: 'enroll'|'totp', ... }
    async loginStep1(payload) {
      this.loading = true;
      try {
        const { data } = await api.post('/admin/auth/login', payload);
        return data;
      } finally {
        this.loading = false;
      }
    },

    // Birinchi enroll: SMS kodi to'g'ri bo'lsa, otpauth_uri + secret beriladi
    async enrollVerifySms({ enroll_token, sms_code }) {
      this.loading = true;
      try {
        const { data } = await api.post('/admin/auth/enroll/verify-sms', { enroll_token, sms_code: String(sms_code).trim() });
        return data;
      } finally {
        this.loading = false;
      }
    },

    // 2-qadam: TOTP / zaxira kod → tokenlar + (birinchi marta) recovery_codes
    async verifyCode({ token, code }) {
      this.loading = true;
      try {
        const body = { code: String(code).trim() };
        // enroll_token yoki challenge_token — qaysi biri ekanini chaqiruvchi aytadi
        body[token.kind] = token.value;
        const { data } = await api.post('/admin/auth/totp', body);
        const access = data?.token;
        if (!access) throw new Error('Kirish tokeni topilmadi');
        setTokens({ token: access, refreshToken: data.refreshToken || '' });
        this.token = access;
        this.user = data.user || null;
        return { recoveryCodes: Array.isArray(data.recovery_codes) ? data.recovery_codes : [] };
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      if (!this.token) throw new Error('No authentication token');
      const res = await api.get('/admin/auth/me');
      this.user = unwrap(res);
      return this.user;
    },

    // Serverda sessiyani bekor qiladi, so'ng lokal holatni tozalaydi.
    async logout({ remote = true } = {}) {
      if (remote && this.token) {
        try { await api.post('/admin/auth/logout', null, { silent403: true }); } catch (_) { /* tarmoq xatosi bo'lsa ham lokal chiqamiz */ }
      }
      this.clearLocal();
    },

    clearLocal() {
      this.user = null;
      this.token = '';
      clearTokens();
    },
  },
});

// Refresh muvaffaqiyatsiz bo'lsa — lokal tozalash va login sahifasiga o'tish (bir marta).
export function registerAuthFailure(router) {
  setAuthFailureHandler(() => {
    const store = useAuthStore();
    store.clearLocal();
    const cur = router.currentRoute.value;
    if (cur.name !== 'login') {
      router.replace({ name: 'login', query: { redirect: cur.fullPath, expired: '1' } });
    }
  });
}
