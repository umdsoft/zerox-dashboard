<script setup>
import { reactive, ref, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AppButton from '../../components/ui/AppButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Bosqichlar: credentials -> (sms -> enroll) | totp -> recovery
const step = ref('credentials')
const form = reactive({ phone: '', password: '', code: '', sms: '' })
const errorMessage = ref('')
const useRecovery = ref(false)
const pending = ref(null)        // { kind: 'enroll_token'|'challenge_token', value }  — faqat xotirada
const enroll = reactive({ secret: '', qr: '' })
const recoveryCodes = ref([])
const saved = ref(false)
const codeInput = ref(null)

const sessionExpired = computed(() => route.query.expired === '1')

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
  if (code === 'enroll-locked') {
    return 'Juda ko‘p noto‘g‘ri SMS kod kiritildi. 2FA ulash 24 soatga bloklandi — boshqa super-admin bilan bog‘laning.'
  }
  if (code === 'sms-rate-limited') {
    return s > 0
      ? `SMS juda ko‘p so‘ralgan. ${wait(s)} so‘ng qayta urinib ko‘ring.`
      : 'SMS juda ko‘p so‘ralgan. Birozdan so‘ng qayta urinib ko‘ring.'
  }
  if (error?.response?.status === 429 || code === 'too-many-attempts') {
    return s > 0
      ? `Juda ko‘p urinish. ${wait(s)} so‘ng qayta urinib ko‘ring.`
      : 'Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.'
  }
  const map = {
    'sms-failed': 'SMS yuborib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.',
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

function backToStart(msg = '') {
  step.value = 'credentials'
  pending.value = null
  enroll.secret = ''; enroll.qr = ''
  form.password = ''; form.code = ''; form.sms = ''
  useRecovery.value = false
  errorMessage.value = msg
}

async function drawQr(uri) {
  try {
    // qrcode faqat shu ekranda yuklanadi (alohida chunk)
    const QRCode = (await import('qrcode')).default
    enroll.qr = await QRCode.toDataURL(uri, { margin: 1, width: 192, errorCorrectionLevel: 'M' })
  } catch (_) {
    enroll.qr = '' // QR chizilmasa ham maxfiy kalitni qo'lda kiritish mumkin
  }
}

async function submitCredentials() {
  errorMessage.value = ''
  try {
    const data = await authStore.loginStep1({ phone: normalizePhone(form.phone), password: form.password })
    form.password = ''
    if (data?.step === 'enroll') {
      // Secret endi darhol berilmaydi: avval telefonga yuborilgan SMS kodi tasdiqlanadi
      pending.value = { kind: 'enroll_token', value: data.enroll_token }
      step.value = 'sms'
    } else if (data?.step === 'totp') {
      pending.value = { kind: 'challenge_token', value: data.challenge_token }
      step.value = 'totp'
    } else {
      throw new Error('unexpected-step')
    }
    await nextTick()
    codeInput.value?.focus()
  } catch (error) {
    errorMessage.value = humanError(error)
  }
}

async function submitSms() {
  errorMessage.value = ''
  try {
    const data = await authStore.enrollVerifySms({ enroll_token: pending.value.value, sms_code: form.sms })
    enroll.secret = data?.secret || ''
    await drawQr(data?.otpauth_uri)
    form.sms = ''
    step.value = 'enroll'
    await nextTick()
    codeInput.value?.focus()
  } catch (error) {
    if (error?.response?.data?.code === 'challenge-expired') { backToStart(humanError(error)); return }
    errorMessage.value = humanError(error)
    form.sms = ''
  }
}

async function submitCode() {
  errorMessage.value = ''
  try {
    const { recoveryCodes: codes } = await authStore.verifyCode({ token: pending.value, code: form.code })
    pending.value = null
    enroll.secret = ''; enroll.qr = ''
    form.code = ''
    if (codes.length) {
      recoveryCodes.value = codes
      step.value = 'recovery'
    } else {
      await finish()
    }
  } catch (error) {
    const code = error?.response?.data?.code
    if (code === 'challenge-expired' || code === 'token-expired' || code === 'invalid-token' || error?.response?.status === 410) {
      backToStart(humanError(error))
      return
    }
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

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
    <div class="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200/60 sm:p-10">
      <div class="space-y-2 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 font-semibold text-white">ZX</div>
        <h1 class="text-2xl font-semibold text-slate-800">
          {{ step === 'recovery' ? 'Zaxira kodlar' : (step === 'enroll' || step === 'sms') ? 'Ikki bosqichli himoya' : 'Xush kelibsiz' }}
        </h1>
        <p v-if="step === 'credentials'" class="text-sm text-slate-500">Kirish uchun telefon raqamingiz va parolingizni kiriting.</p>
        <p v-else-if="step === 'totp'" class="text-sm text-slate-500">Autentifikator ilovasidagi 6 xonali kodni kiriting.</p>
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

      <!-- 2-0) birinchi marta: telefonga yuborilgan SMS kodi -->
      <form v-else-if="step === 'sms'" class="space-y-5" @submit.prevent="submitSms">
        <p class="text-sm text-slate-600">Telefoningizga yuborilgan SMS kodni kiriting.</p>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="code-sms">SMS kod</label>
          <input id="code-sms" ref="codeInput" v-model="form.sms" inputmode="numeric" autocomplete="one-time-code" maxlength="5" pattern="\d{5}" required :class="[inputCls, 'text-center font-mono text-lg tracking-[0.4em]']" />
        </div>
        <p v-if="errorMessage" class="text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
        <AppButton type="submit" size="lg" class="w-full" :disabled="authStore.loading || form.sms.length !== 5">
          {{ authStore.loading ? 'Tekshirilmoqda…' : 'Davom etish' }}
        </AppButton>
        <button type="button" class="w-full text-center text-sm text-slate-600 underline hover:text-slate-900" @click="backToStart()">Orqaga</button>
      </form>

      <!-- 2a) birinchi marta: QR + qo'lda kalit + kod -->
      <form v-else-if="step === 'enroll'" class="space-y-5" @submit.prevent="submitCode">
        <ol class="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Telefoningizda Google Authenticator yoki shunga o‘xshash ilovani oching.</li>
          <li>QR kodni skanerlang yoki maxfiy kalitni qo‘lda kiriting.</li>
          <li>Ilovada ko‘ringan 6 xonali kodni pastga yozing.</li>
        </ol>
        <div class="flex flex-col items-center gap-3">
          <img v-if="enroll.qr" :src="enroll.qr" width="192" height="192" alt="Autentifikator uchun QR kod" class="rounded-xl border border-slate-200" />
          <div class="w-full rounded-xl bg-slate-50 p-3 text-center">
            <p class="text-xs text-slate-500">Maxfiy kalit (qo‘lda kiritish uchun)</p>
            <p class="mt-1 select-all break-all font-mono text-sm font-semibold tracking-wider text-slate-800">{{ enroll.secret }}</p>
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="code-enroll">6 xonali kod</label>
          <input id="code-enroll" ref="codeInput" v-model="form.code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\d{6}" required :class="[inputCls, 'text-center font-mono text-lg tracking-[0.4em]']" />
        </div>
        <p v-if="errorMessage" class="text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
        <AppButton type="submit" size="lg" class="w-full" :disabled="authStore.loading || form.code.length !== 6">
          {{ authStore.loading ? 'Tekshirilmoqda…' : 'Tasdiqlash va yoqish' }}
        </AppButton>
        <button type="button" class="w-full text-center text-sm text-slate-600 underline hover:text-slate-900" @click="backToStart()">Orqaga</button>
      </form>

      <!-- 2b) TOTP yoki zaxira kod -->
      <form v-else-if="step === 'totp'" class="space-y-5" @submit.prevent="submitCode">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="code-totp">{{ useRecovery ? 'Zaxira kod' : '6 xonali kod' }}</label>
          <input
            id="code-totp" ref="codeInput" v-model="form.code" required autocomplete="one-time-code"
            :inputmode="useRecovery ? 'text' : 'numeric'" :maxlength="useRecovery ? 32 : 6"
            :class="[inputCls, 'text-center font-mono text-lg', useRecovery ? '' : 'tracking-[0.4em]']"
          />
        </div>
        <p v-if="errorMessage" class="text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
        <AppButton type="submit" size="lg" class="w-full" :disabled="authStore.loading || !form.code">
          {{ authStore.loading ? 'Tekshirilmoqda…' : 'Kirish' }}
        </AppButton>
        <div class="flex items-center justify-between text-sm">
          <button type="button" class="text-slate-600 underline hover:text-slate-900" @click="useRecovery = !useRecovery; form.code = ''; errorMessage = ''">
            {{ useRecovery ? 'Autentifikator kodidan foydalanish' : 'Zaxira koddan foydalanish' }}
          </button>
          <button type="button" class="text-slate-600 underline hover:text-slate-900" @click="backToStart()">Orqaga</button>
        </div>
      </form>

      <!-- 3) zaxira kodlar — faqat bir marta -->
      <div v-else class="space-y-5">
        <p class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bu kodlar <b>faqat hozir bir marta</b> ko‘rsatiladi. Har biri bir martalik. Telefoningizni yo‘qotsangiz, ular orqali kirasiz. Xavfsiz joyga saqlang.
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
