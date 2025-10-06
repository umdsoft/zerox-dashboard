// src/stores/auth.js
import { defineStore } from 'pinia'
import api from '../lib/axios'

const TOKEN_KEY = 'access_token'

function setAxiosAuthHeader(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),

    // Backenddan kelishi mumkin bo‘lgan ko‘rinishlarning barchasini tekshiramiz
    isAdmin: (state) => {
      const u = state.user || {}
      const role = u.role || {}
      return Boolean(
        role.is_admin === 1 ||
        role.is_admin === true ||
        u.is_admin === 1 ||
        u.is_admin === true ||
        u.type === 2 ||         // sizning screenshot’da type: 2 bor
        u.role === 'admin'
      )
    },
  },

  actions: {
    setToken(token) {
      this.token = token || ''
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
      setAxiosAuthHeader(this.token)
    },

    async login(payload) {
      this.loading = true
      try {
        const { data } = await api.post('/user/login', payload)
        // Token ba’zida data.token yoki data.data.token bo‘lishi mumkin
        const token = (data && data.token) || (data && data.data && data.data.token)
        if (!token) throw new Error('Missing access token')

        this.setToken(token)
        await this.fetchMe()
      } catch (err) {
        this.setToken('')
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      if (!this.token) {
        this.logout()
        throw new Error('No authentication token')
      }
      try {
        const res = await api.get('/user/me')
        // Ba’zan {success, data: {...}} ko‘rinishida keladi — ichki data’ni olamiz
        const me = (res.data && res.data.data) ? res.data.data : res.data
        this.user = me

        // Agar admin bo‘lish shart bo‘lsa — shu guard qolsin
        if (!this.isAdmin) {
          this.logout()
          throw new Error('Administrator access required')
        }
        return me
      } catch (error) {
        if (error && error.response && error.response.status === 401) {
          this.logout()
        }
        throw error
      }
    },

    logout() {
      this.user = null
      this.setToken('')
    },
  },
})
