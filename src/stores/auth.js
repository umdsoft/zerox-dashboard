import { defineStore } from 'pinia';
import api from '../lib/axios';

const TOKEN_KEY = 'access_token';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    loading: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role?.is_admin === true
  },
  actions: {
    setToken(token) {
      this.token = token || '';
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    },
    async login(payload) {
      this.loading = true;
      try {
        const { data } = await api.post('/user/login', payload);
        console.log(data)
        if (data?.token) {
          this.setToken(data.token);
          await this.fetchMe();
        } else {
          throw new Error('Missing access token');
        }
      } catch (error) {
        this.setToken('');
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchMe() {
      if (!this.token) {
        this.logout();
        throw new Error('No authentication token');
      }
      try {
        const { data } = await api.get('user/me');
        this.user = data;
        if (!this.isAdmin) {
          this.logout();
          throw new Error('Administrator access required');
        }
        return data;
      } catch (error) {
        if (error?.response?.status === 401) {
          this.logout();
        }
        throw error;
      }
    },
    logout() {
      this.user = null;
      this.setToken('');
    }
  }
});
