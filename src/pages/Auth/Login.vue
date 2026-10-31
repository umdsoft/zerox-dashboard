<script setup>
import { reactive, ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AppButton from '../../components/ui/AppButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Bosqichlar: credentials -> telegram (kod, Telegram Gateway) -> recovery
const step = ref('credentials')
const form = reactive({ phone: '', password: '', code: '' })
const errorMessage = ref('')
const useRecovery = ref(false)
const channel = ref('telegram')   // 'telegram' | 'sms' — kod qaysi kanal orqali yuborilgan
const challengeToken = ref('')    // faqat xotirada
const recoveryCodes = ref([])
const saved = ref(false)
const codeInput = ref(null)

const sessionExpired = computed(() => route.query.expired === '1')

const DEFAULT_EXPIRES_S = 300
const RESEND_COOLDOWN_S = 60

const secondsLeft = ref(0)        // kod amal qilish muddati
const cooldown = ref(0)           // "qayta yuborish" tugmasi bloki
let tickTimer = null

function normalizePhone(v) {
  let s = String(v ?? '').trim()
  s = s.replace(/[\s   -‍  ⁠　]+/g, '')
  s = s.replace(/[().-]/g, '')
  s = s.replace(/\++/g, '+')
  if (s.indexOf('+') > 0) s = s.replace(/\+/g, '')
  return s
}

function humanError(error) {
  const data = error?.response?.data || {}
  const code = data.code || data.message
  const wait = (s) => (s > 90 ? Math.ceil(s / 60) + ' daqiqadan' : s + ' soniyadan')
  const s = Number(data.retry_after)
  if (error?.response?.status === 429 || code === 'too-many-attempts') {
    return s > 0
      ? `Juda ko‘p urinish. ${wait(s)} so‘ng qayta urinib ko‘ring.`
      : 'Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.'
  }
  const map = {
    'telegram-unavailable': 'Bu raqamda Telegram topilmadi. Zaxira kod bilan kiring yoki administratorga murojaat qiling',
    'telegram-not-configured': 'Telegram bot sozlanmagan, administratorga murojaat qiling',
    'telegram-failed': 'Telegramga yuborib bo‘lmadi, qayta urinib ko‘ring',
    'challenge-expired': 'Sessiya muddati tugadi yoki urinishlar tugadi. Parolni qaytadan kiriting.',
    'invalid-credentials': 'Telefon raqam yoki parol noto‘g‘ri.',
    'invalid-code': 'Kod noto‘g‘ri yoki muddati o‘tgan.',
    'token-expired': 'Sessiya muddati tugadi. Qaytadan kiring.',
    'invalid-token': 'Sessiya muddati tugadi. Qaytadan kiring.',
  }
  if (map[code]) return map[code]
  if (!error?.response) return 'Tarmoq xatosi: server bilan aloqa yo‘q.'
  return 'Kirishda xatolik. Keyinroq urinib ko‘ring.'
}

const isExpiredError = (error) => {
  const code = error?.response?.data?.code
  return code === 'challenge-expired' || code === 'token-expired' || code === 'invalid-token' || error?.response?.status === 410
}

// ---- taymerlar ----
function stopTimers() {
  clearInterval(tickTimer); tickTimer = null
}
onBeforeUnmount(stopTimers)

function startCountdown(expiresIn) {
  secondsLeft.value = Number(expiresIn) > 0 ? Number(expiresIn) : DEFAULT_EXPIRES_S
  cooldown.value = RESEND_COOLDOWN_S
  clearInterval(tickTimer)
  tickTimer = setInterval(() => {
    if (secondsLeft.value > 0) secondsLeft.value -= 1
    if (cooldown.value > 0) cooldown.value -= 1
  }, 1000)
}

function backToStart(msg = '') {
  stopTimers()
  step.value = 'credentials'
  challengeToken.value = ''
  form.password = ''; form.code = ''
  useRecovery.value = false
  errorMessage.value = msg
}

async function showCodeStep(expiresIn, ch) {
  channel.value = ch === 'sms' ? 'sms' : 'telegram'
  stopTimers()
  step.value = 'telegram'
  errorMessage.value = ''
  startCountdown(expiresIn)
  await nextTick()
  codeInput.value?.focus()
}

// ---- amallar ----
async function submitCredentials() {
  errorMessage.value = ''
  try {
    const data = await authStore.loginStep1({ phone: normalizePhone(form.phone), password: form.password })
    form.password = ''
    challengeToken.value = data?.challenge_token || ''
    if (!challengeToken.value || data?.step !== 'telegram') throw new Error('unexpected-step')
    await showCodeStep(data.expires_in, data.channel)
  } catch (error) {
    errorMessage.value = humanError(error)
    useRecoveryIfUnavailable(error)
  }
}

// Raqamda Telegram yo'q: kod yuborib bo'lmaydi — zaxira kod kiritishga o'tamiz
function useRecoveryIfUnavailable(error) {
  if (error?.response?.data?.code !== 'telegram-unavailable') return
  const tok = error.response.data.challenge_token
  if (tok) challengeToken.value = tok
  if (!challengeToken.value) return // token bo'lmasa faqat xabar ko'rsatiladi
  const msg = errorMessage.value
  stopTimers()
  step.value = 'telegram'
  useRecovery.value = true
  form.code = ''
  errorMessage.value = msg
  nextTick(() => codeInput.value?.focus())
}

const resending = ref(false)
async function resend() {
  if (cooldown.value > 0 || resending.value) return
  resending.value = true
  errorMessage.value = ''
  try {
    const data = await authStore.telegramResend(challengeToken.value)
    if (data?.sent) {
      if (data.channel) channel.value = data.channel === 'sms' ? 'sms' : 'telegram'
      startCountdown(data.expires_in)
    }
    else errorMessage.value = 'Telegram hali ulanmagan.'
  } catch (error) {
    if (isExpiredError(error)) { backToStart(humanError(error)); return }
    errorMessage.value = humanError(error)
    useRecoveryIfUnavailable(error)
  } finally {
    resending.value = false
  }
}

async function submitCode() {
  errorMessage.value = ''
  try {
    const { recoveryCodes: codes } = await authStore.verifyCode({ challengeToken: challengeToken.value, code: form.code })
    stopTimers()
    challengeToken.value = ''
    form.code = ''
    if (codes.length) {
      recoveryCodes.value = codes
      step.value = 'recovery'
    } else {
      await finish()
    }
  } catch (error) {
    if (isExpiredError(error)) { backToStart(humanError(error)); return }
    errorMessage.value = humanError(error)
    form.code = ''
  }
}

async function finish() {
  recoveryCodes.value = [] // xotiradan o'chiramiz — qayta ko'rsatilmaydi
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : null
  await router.replace(redirect || { name: 'dashboard' })
}

async function copyCodes() {
  try { await navigator.clipboard.writeText(recoveryCodes.value.join('\n')) } catch (_) { /* qo'lda ko'chiradi */ }
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const title = computed(() => ({
  recovery: 'Zaxira kodlar',
  telegram: 'Telegram orqali tasdiqlash',
}[step.value] || 'Xush kelibsiz'))

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
    <div class="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200/60 sm:p-10">
      <div class="space-y-2 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 font-semibold text-white">ZX</div>
        <h1 class="text-2xl font-semibold text-slate-800">{{ title }}</h1>
        <p v-if="step === 'credentials'" class="text-sm text-slate-500">Kirish uchun telefon raqamingiz va parolingizni kiriting.</p>
        <p v-else-if="step === 'telegram' && channel === 'sms'" class="text-sm text-slate-600">Tasdiqlash kodi telefoningizga SMS orqali yuborildi</p>
        <p v-else-if="step === 'telegram'" class="text-sm text-slate-600">Tasdiqlash kodi Telegram'dagi «Verification Codes» chatiga yuborildi</p>
      </div>

      <p v-if="sessionExpired && step === 'credentials'" class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">Sessiya muddati tugadi. Iltimos, qaytadan kiring.</p>

      <!-- 1) telefon + parol -->
      <form v-if="step === 'credentials'" class="space-y-5" @submit.prevent="submitCredentials">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="phone">Telefon raqamingiz</label>
          <input id="phone" v-model="form.phone" type="tel" autocomplete="username" placeholder="+998 90 123 45 67" required :class="inputCls" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="password">Parol</label>
          <input id="password" v-model="form.password" type="password" autocomplete="current-password" placeholder="••••••••" required :class="inputCls" />
        </div>
        <p v-if="errorMessage" class="text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
        <AppButton type="submit" size="lg" class="w-full" :disabled="authStore.loading">
          {{ authStore.loading ? 'Tekshirilmoqda…' : 'Davom etish' }}
        </AppButton>
      </form>

      <!-- 2a) Telegramga yuborilgan kod (yoki zaxira kod) -->
      <form v-else-if="step === 'telegram'" class="space-y-5" @submit.prevent="submitCode">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="code-tg">{{ useRecovery ? 'Zaxira kod' : (channel === 'sms' ? '5 yoki 6 xonali kod' : '6 xonali kod') }}</label>
          <input
            id="code-tg" ref="codeInput" v-model="form.code" required autocomplete="one-time-code"
            :inputmode="useRecovery ? 'text' : 'numeric'" :maxlength="useRecovery ? 32 : 6"
            :class="[inputCls, 'text-center font-mono text-lg', useRecovery ? '' : 'tracking-[0.4em]']"
          />
          <p v-if="!useRecovery" class="text-xs text-slate-600" aria-live="off">
            <template v-if="secondsLeft > 0">Kod amal qiladi: <b>{{ mmss(secondsLeft) }}</b></template>
            <template v-else>Kod muddati tugadi — qayta yuboring.</template>
          </p>
        </div>
        <p v-if="errorMessage" class="text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
        <AppButton type="submit" size="lg" class="w-full" :disabled="authStore.loading || !form.code">
          {{ authStore.loading ? 'Tekshirilmoqda…' : 'Kirish' }}
        </AppButton>
        <button
          v-if="!useRecovery" type="button"
          class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
          :disabled="cooldown > 0 || resending" @click="resend"
        >
          {{ cooldown > 0 ? `Kodni qayta yuborish (${cooldown} s)` : 'Kodni qayta yuborish' }}
        </button>
        <div class="flex items-center justify-between text-sm">
          <button type="button" class="text-slate-600 underline hover:text-slate-900" @click="useRecovery = !useRecovery; form.code = ''; errorMessage = ''">
            {{ useRecovery ? 'Telegram kodidan foydalanish' : 'Zaxira kod bilan kirish' }}
          </button>
          <button type="button" class="text-slate-600 underline hover:text-slate-900" @click="backToStart()">Orqaga</button>
        </div>
      </form>

      <!-- 3) zaxira kodlar — faqat bir marta -->
      <div v-else class="space-y-5">
        <p class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bu kodlar <b>faqat hozir bir marta</b> ko‘rsatiladi. Har biri bir martalik. Telegramga kira olmasangiz, ular orqali kirasiz. Xavfsiz joyga saqlang.
        </p>
        <ul class="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-800">
          <li v-for="c in recoveryCodes" :key="c" class="select-all text-center">{{ c }}</li>
        </ul>
        <button type="button" class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="copyCodes">Nusxalash</button>
        <label class="flex items-start gap-2 text-sm text-slate-700">
          <input v-model="saved" type="checkbox" class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Men zaxira kodlarni saqlab oldim
        </label>
        <AppButton size="lg" class="w-full" :disabled="!saved" @click="finish">Davom etish</AppButton>
      </div>
    </div>
  </div>
</template>
