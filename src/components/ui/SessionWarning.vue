<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { refreshSession, isAuthRejection } from '../../lib/axios'
import { tokenExpiry, getAccessToken } from '../../lib/session'
import { toastErr, toastOk } from '../../lib/toast'

// Faol foydalanuvchi: token tugashidan SILENT_AHEAD_MS oldin jimgina yangilanadi (ogohlantirishsiz).
// Faol bo'lmasa: WARN_MS qolganda "Sessiyani uzaytirish" ogohlantirishi chiqadi.
const WARN_MS = 2 * 60 * 1000
const SILENT_AHEAD_MS = 3 * 60 * 1000
const ACTIVE_WINDOW_MS = 5 * 60 * 1000
const TICK_MS = 5000
const RETRY_BACKOFF_MS = 30 * 1000

const router = useRouter()
const auth = useAuthStore()
const show = ref(false)
const secondsLeft = ref(0)
const busy = ref(false)
let timer = null
let lastActivity = Date.now()
let lastFailAt = 0
let silentInFlight = false

const markActive = () => { lastActivity = Date.now() }
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']

// remote=true: foydalanuvchi o'zi "Chiqish" bosdi -> serverda sessiya bekor qilinadi.
// remote=false: token haqiqatan tugagan (server baribir rad etadi).
async function leave({ remote }) {
  show.value = false
  await auth.logout({ remote })
  router.replace({ name: 'login', query: remote ? {} : { expired: '1' } })
}

async function silentRefresh() {
  if (silentInFlight || Date.now() - lastFailAt < RETRY_BACKOFF_MS) return
  silentInFlight = true
  try {
    await refreshSession()
  } catch (e) {
    if (isAuthRejection(e)) { leave({ remote: false }); return }
    lastFailAt = Date.now() // tarmoq/5xx: keyinroq qayta uriniladi, ogohlantirish ko'rsatiladi
  } finally {
    silentInFlight = false
  }
}

async function tick() {
  const exp = tokenExpiry(getAccessToken())
  if (!exp) { show.value = false; return }
  const left = exp - Date.now()
  secondsLeft.value = Math.max(0, Math.ceil(left / 1000))
  const active = Date.now() - lastActivity < ACTIVE_WINDOW_MS

  if (left <= 0) {
    // Fon tabida taymer to'xtab qolgan bo'lishi mumkin — avval yangilashga urinamiz
    await silentRefresh()
    const again = tokenExpiry(getAccessToken())
    if (!again || again - Date.now() <= 0) {
      if (Date.now() - lastFailAt < RETRY_BACKOFF_MS) { show.value = true; return } // vaqtinchalik xato
      leave({ remote: false })
    }
    return
  }
  if (left <= SILENT_AHEAD_MS && active) {
    show.value = false
    silentRefresh()
    return
  }
  show.value = left <= WARN_MS
}

async function extend() {
  busy.value = true
  try {
    await refreshSession()
    show.value = false
    toastOk('Sessiya uzaytirildi.')
    tick()
  } catch (e) {
    if (isAuthRejection(e)) {
      toastErr('Sessiyani uzaytirib bo‘lmadi. Qaytadan kiring.')
      leave({ remote: false })
    } else {
      toastErr('Tarmoq yoki server xatosi. Qayta urinib ko‘ring.')
    }
  } finally {
    busy.value = false
  }
}

// Fon tabi brauzer tomonidan sekinlashtirilgan bo'lsa, qaytganda darhol tekshiramiz
const onVisible = () => { if (document.visibilityState === 'visible') tick() }

onMounted(() => {
  ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }))
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
  tick()
  timer = setInterval(tick, TICK_MS)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive))
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('focus', onVisible)
})
</script>

<template>
  <div v-if="show" class="fixed bottom-4 left-1/2 z-[55] w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xl" role="alertdialog" aria-live="assertive" aria-label="Sessiya tugayapti">
    <p class="text-sm font-medium text-amber-900">
      Sessiya tez orada tugaydi ({{ Math.floor(secondsLeft / 60) }}:{{ String(secondsLeft % 60).padStart(2, '0') }}).
    </p>
    <div class="mt-3 flex justify-end gap-2">
      <button type="button" class="rounded-xl border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" @click="leave({ remote: true })">Chiqish</button>
      <button type="button" :disabled="busy" class="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60" @click="extend">
        {{ busy ? 'Uzaytirilmoqda…' : 'Sessiyani uzaytirish' }}
      </button>
    </div>
  </div>
</template>
