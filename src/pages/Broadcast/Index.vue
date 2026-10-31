<script setup>
/**
 * 10.10 — Hammaga xabar yuborish: bitta xabar Telegram bot va/yoki ilova push-xabarnomasi orqali.
 * Backend: GET/POST /dashboard/broadcasts, GET /dashboard/broadcasts/audience, POST /dashboard/broadcasts/stop.
 * Yuborish fonda ketadi — jarayon har 3 soniyada yangilanadi, istalgan payt to'xtatish mumkin.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Swal from 'sweetalert2'
import { getAudience, getBroadcasts, sendBroadcast, stopBroadcast } from '../../api/broadcast'
import { fmtDateTime, errMessage } from '../../lib/format'
import { toastErr } from '../../lib/toast'

const MAX_TEXT = 3500
const MAX_TITLE = 64
const POLL_MS = 3000
const SEGMENTS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'uz', label: "O'zbekcha" },
  { key: 'kr', label: 'Ўзбекча' },
  { key: 'ru', label: 'Русский' },
  { key: 'kaa', label: 'Qaraqalpaqsha' },
  { key: 'en', label: 'English' },
]
const STATUS = {
  sending: { label: 'Yuborilmoqda', cls: 'bg-indigo-50 text-indigo-700' },
  done: { label: 'Yakunlandi', cls: 'bg-emerald-50 text-emerald-700' },
  stopped: { label: "To'xtatildi", cls: 'bg-amber-50 text-amber-700' },
  interrupted: { label: 'Uzilib qoldi', cls: 'bg-amber-50 text-amber-700' },
  cancelled: { label: 'Bekor qilindi', cls: 'bg-slate-100 text-slate-600' },
  failed: { label: 'Xato', cls: 'bg-rose-50 text-rose-700' },
}

const text = ref('')
const title = ref('')
const segment = ref('all')
const channels = ref({ telegram: true, push: true })
const audience = ref(null)
const history = ref([])
const activeJobs = ref([])
const sending = ref(false)
const loadingHistory = ref(false)
const loadError = ref('')
let pollTimer = null

const tgAvailable = computed(() => !!audience.value?.telegram_available)
const countFor = (ch, seg) => Number(audience.value?.[ch]?.[seg] || 0)
const recipients = computed(() =>
  (channels.value.telegram && tgAvailable.value ? countFor('telegram', segment.value) : 0) +
  (channels.value.push ? countFor('push', segment.value) : 0))
const textLen = computed(() => text.value.length)
const canSend = computed(() =>
  !sending.value && !activeJobs.value.length && text.value.trim().length > 0 && textLen.value <= MAX_TEXT &&
  ((channels.value.telegram && tgAvailable.value) || channels.value.push) && recipients.value > 0)
const pushTitle = computed(() => title.value.trim() || 'ZeroX')

async function loadAudience() {
  try {
    const { data } = await getAudience()
    audience.value = data?.data || null
    if (!audience.value?.telegram_available) channels.value.telegram = false
  } catch (e) {
    audience.value = null
    loadError.value = errMessage(e, 'Auditoriya sonini yuklab bo‘lmadi.')
  }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const { data } = await getBroadcasts({ params: { limit: 30 } })
    history.value = data?.data?.items || []
    activeJobs.value = data?.data?.active_jobs || []
    loadError.value = ''
  } catch (e) {
    loadError.value = errMessage(e, 'Tarixni yuklab bo‘lmadi.')
  } finally {
    loadingHistory.value = false
  }
  schedulePoll()
}

function schedulePoll() {
  clearTimeout(pollTimer)
  if (activeJobs.value.length) pollTimer = setTimeout(loadHistory, POLL_MS)
}

async function send() {
  if (!canSend.value) return
  const parts = []
  if (channels.value.telegram && tgAvailable.value) parts.push(`Telegram: ${countFor('telegram', segment.value)} ta`)
  if (channels.value.push) parts.push(`Ilova push: ${countFor('push', segment.value)} ta`)
  const ok = await Swal.fire({
    title: 'Xabar yuborilsinmi?',
    // text (html emas): qiymatlar matn sifatida chiqadi, qatorlar CSS orqali ajratiladi
    text: `${parts.join('\n')}\n\nYuborilgan xabarni qaytarib bo‘lmaydi.`,
    customClass: { htmlContainer: 'whitespace-pre-line' },
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ha, yuborish',
    cancelButtonText: 'Bekor qilish',
    confirmButtonColor: '#4f46e5',
  })
  if (!ok.isConfirmed) return
  sending.value = true
  try {
    const { data } = await sendBroadcast({
      text: text.value,
      title: title.value,
      segment: segment.value,
      channels: { telegram: channels.value.telegram && tgAvailable.value, push: channels.value.push },
    })
    const errs = Object.entries(data?.data || {}).filter(([, v]) => v && v.error)
    if (errs.length) {
      Swal.fire({
        title: 'Diqqat',
        text: errs.map(([ch, v]) => `${ch === 'push' ? 'Push' : 'Telegram'}: ${v.error === 'empty' ? 'qabul qiluvchi yo‘q' : v.error}`).join('\n'),
        icon: 'warning',
        customClass: { htmlContainer: 'whitespace-pre-line' },
      })
    } else {
      Swal.fire({ title: 'Yuborish boshlandi', text: 'Jarayon pastda ko‘rinadi.', icon: 'success', timer: 1800, showConfirmButton: false })
      text.value = ''
    }
  } catch (e) {
    Swal.fire('Xatolik', e?.response?.data?.message || 'Xabarni yuborib bo‘lmadi.', 'error')
  } finally {
    sending.value = false
    loadHistory()
  }
}

async function stop() {
  const ok = await Swal.fire({
    title: "Yuborish to'xtatilsinmi?", text: 'Hali yuborilmaganlarga xabar ketmaydi.', icon: 'warning',
    showCancelButton: true, confirmButtonText: "Ha, to'xtatish", cancelButtonText: 'Yo‘q', confirmButtonColor: '#e11d48',
  })
  if (!ok.isConfirmed) return
  try { await stopBroadcast() } catch (e) { toastErr(errMessage(e, 'To‘xtatib bo‘lmadi.')) }
  loadHistory()
}

const pct = (j) => (j.total ? Math.min(100, Math.round((j.done / j.total) * 100)) : 0)
const fmtDate = (v) => fmtDateTime(v, { empty: '—' })
const channelLabel = (c) => (c === 'push' ? 'Ilova push' : 'Telegram')

onMounted(() => { loadAudience(); loadHistory() })
onBeforeUnmount(() => clearTimeout(pollTimer))
</script>

<template>
  <div class="space-y-6">
    <div v-if="loadError" class="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-lg border border-rose-300 bg-white px-3 py-1 font-medium hover:bg-rose-100" @click="loadAudience(); loadHistory()">Qayta urinish</button>
    </div>
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Hammaga xabar yuborish</h1>
      <p class="mt-1 text-sm text-slate-500">Bitta xabar Telegram bot obunachilariga va ilova foydalanuvchilariga push-xabarnoma sifatida boradi.</p>
    </div>

    <!-- Faol jarayon -->
    <div v-for="j in activeJobs" :key="j.channel" class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-indigo-200">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60"></span><span class="relative inline-flex h-3 w-3 rounded-full bg-indigo-500"></span></span>
          <p class="font-semibold text-slate-800">{{ channelLabel(j.channel) }} — yuborilmoqda</p>
          <span class="text-sm tabular-nums text-slate-500">{{ j.done }} / {{ j.total }}</span>
        </div>
        <button class="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100" @click="stop">To'xtatish</button>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-indigo-500 transition-all duration-500" :style="{ width: pct(j) + '%' }"></div></div>
      <p class="mt-2 text-xs tabular-nums text-slate-500">Yuborildi: {{ j.sent }} · Bloklagan/eskirgan: {{ j.blocked }} · Xato: {{ j.failed }}</p>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <!-- Xabar tuzish -->
      <section class="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Qayerga</p>
          <div class="grid gap-3 sm:grid-cols-2">
            <button type="button" :disabled="!tgAvailable" @click="channels.telegram = !channels.telegram"
              :class="['flex items-start gap-3 rounded-xl border p-4 text-left transition', channels.telegram && tgAvailable ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200' : 'border-slate-200 hover:border-slate-300', !tgAvailable && 'cursor-not-allowed opacity-60']">
              <span :class="['mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', channels.telegram && tgAvailable ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300']">
                <svg v-if="channels.telegram && tgAvailable" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              </span>
              <span class="min-w-0">
                <span class="block font-semibold text-slate-800">Telegram bot</span>
                <span class="block text-sm text-slate-500" v-if="tgAvailable"><b class="tabular-nums text-slate-700">{{ countFor('telegram', segment) }}</b> ta obunachi</span>
                <span class="block text-sm text-amber-600" v-else>Bot faqat asosiy (prod) serverda ishlaydi</span>
              </span>
            </button>
            <button type="button" @click="channels.push = !channels.push"
              :class="['flex items-start gap-3 rounded-xl border p-4 text-left transition', channels.push ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300']">
              <span :class="['mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', channels.push ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300']">
                <svg v-if="channels.push" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              </span>
              <span class="min-w-0">
                <span class="block font-semibold text-slate-800">Ilova push-xabarnomasi</span>
                <span class="block text-sm text-slate-500"><b class="tabular-nums text-slate-700">{{ countFor('push', segment) }}</b> ta qurilma</span>
              </span>
            </button>
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Til</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="s in SEGMENTS" :key="s.key" type="button" @click="segment = s.key"
              :class="['rounded-full px-3.5 py-1.5 text-sm font-medium transition', segment === s.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']">
              {{ s.label }}
            </button>
          </div>
          <p class="mt-2 text-xs text-slate-500">Xabar yozilgan tilda ketadi — til tanlovi faqat kimga yuborilishini belgilaydi.</p>
        </div>

        <div v-if="channels.push">
          <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" for="bc-title">Push sarlavhasi</label>
          <input id="bc-title" v-model="title" :maxlength="MAX_TITLE" placeholder="ZeroX"
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-indigo-400" />
        </div>

        <div>
          <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" for="bc-text">Xabar matni</label>
          <textarea id="bc-text" v-model="text" rows="7" :maxlength="MAX_TEXT" placeholder="Masalan: Hurmatli foydalanuvchilar! Ilovaning yangi versiyasi chiqdi…"
            class="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-indigo-400 focus:ring-indigo-400"></textarea>
          <div class="mt-1 flex justify-between text-xs text-slate-500">
            <span>Oddiy matn. Havolalar ishlaydi.</span>
            <span :class="['tabular-nums', textLen > MAX_TEXT - 200 ? 'font-semibold text-amber-600' : '']">{{ textLen }}/{{ MAX_TEXT }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p class="text-sm text-slate-500">Taxminan <b class="tabular-nums text-slate-800">{{ recipients }}</b> ta qabul qiluvchi</p>
          <button type="button" :disabled="!canSend" @click="send"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
            {{ sending ? 'Yuborilmoqda…' : 'Yuborish' }}
          </button>
        </div>
        <p v-if="activeJobs.length" class="text-xs text-amber-600">Oldingi tarqatma tugaguncha yangisini yuborib bo'lmaydi.</p>
      </section>

      <!-- Ko'rinishi -->
      <aside class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Qanday ko'rinadi</p>
        <div v-if="channels.push" class="rounded-[28px] bg-gradient-to-b from-slate-700 to-slate-900 p-4 shadow-lg">
          <p class="mb-3 text-center text-xs font-medium text-white/70">Telefon ekrani</p>
          <div class="rounded-2xl bg-white/90 p-3 backdrop-blur">
            <div class="flex items-center gap-2 text-[11px] text-slate-500">
              <span class="flex h-4 w-4 items-center justify-center rounded bg-indigo-600 text-[9px] font-bold text-white">Z</span>
              ZeroX · hozir
            </div>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ pushTitle }}</p>
            <p class="line-clamp-3 whitespace-pre-line text-sm text-slate-700">{{ text || 'Xabar matni shu yerda ko‘rinadi' }}</p>
          </div>
        </div>
        <div v-if="channels.telegram && tgAvailable" class="rounded-2xl bg-[#e7ebf0] p-4 shadow-sm">
          <p class="mb-3 text-center text-xs font-medium text-slate-500">Telegram</p>
          <div class="max-w-[90%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 shadow-sm">
            <p class="text-xs font-semibold text-sky-600">ZeroX</p>
            <p class="whitespace-pre-line break-words text-sm text-slate-800">{{ text || 'Xabar matni shu yerda ko‘rinadi' }}</p>
          </div>
        </div>
      </aside>
    </div>

    <!-- Tarix -->
    <section class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
      <div class="flex items-center justify-between px-6 py-4">
        <h3 class="text-base font-semibold text-slate-800">Yuborilgan xabarlar</h3>
        <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700" @click="loadHistory">Yangilash</button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">Sana</th><th class="px-4 py-3">Kanal</th><th class="px-4 py-3">Matn</th><th class="px-4 py-3">Holat</th>
              <th class="px-4 py-3 text-right">Jami</th><th class="px-4 py-3 text-right">Yuborildi</th><th class="px-4 py-3 text-right">Bloklagan</th><th class="px-6 py-3 text-right">Xato</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="h in history" :key="h.id" class="hover:bg-slate-50/60">
              <td class="whitespace-nowrap px-6 py-3 text-slate-600">{{ fmtDate(h.created_at) }}</td>
              <td class="px-4 py-3"><span :class="['whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', h.channel === 'push' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700']">{{ channelLabel(h.channel) }}</span></td>
              <td class="max-w-md px-4 py-3 text-slate-700"><p class="line-clamp-2">{{ h.body || '(media)' }}</p></td>
              <td class="px-4 py-3"><span :class="['rounded-md px-2 py-0.5 text-xs font-medium', (STATUS[h.status] || STATUS.cancelled).cls]">{{ (STATUS[h.status] || { label: h.status }).label }}</span></td>
              <td class="px-4 py-3 text-right tabular-nums">{{ h.total }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-emerald-700">{{ h.sent }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-500">{{ h.blocked }}</td>
              <td class="px-6 py-3 text-right tabular-nums text-rose-600">{{ h.failed }}</td>
            </tr>
            <tr v-if="!history.length && !loadingHistory"><td colspan="8" class="px-6 py-10 text-center text-slate-500">Hali xabar yuborilmagan</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
