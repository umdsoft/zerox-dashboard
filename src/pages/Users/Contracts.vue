<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '../../lib/axios'

const route = useRoute()

const loading = ref(false)
const err = ref('')

const user = ref(null)

const nearDebitor = ref([])
const nearCreditor = ref([])

const debitorData = ref([])
const creditorData = ref([])

const debitorUsd = ref(null)
const debitorUzs = ref(null)
const creditorUsd = ref(null)
const creditorUzs = ref(null)

const expiredDebitorUsd = ref(null)
const expiredDebitorUzs = ref(null)
const expiredCreditorUsd = ref(null)
const expiredCreditorUzs = ref(null)

const tabLeft = ref(1)
const tabRight = ref(1)

/* ---------- utils ---------- */
function nfmt(n) {
  if (n == null) return '0'
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^\d.-]/g, ''))
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num)
}
function dateFormat(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d)) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}
function getDays(time) {
  const ms = new Date(time) - Date.now()
  if (isNaN(ms)) return '—'
  if (ms < 0) return "<span class='text-red-500'>Bugun</span>"
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (days <= 1) return "<span class='text-red-500'>1 kun</span>"
  if (days < 4) return `<span class='text-red-500'>${days} kun</span>`
  return `${days} kun`
}
/* Normalize user object (field nomlari turlicha bo‘lishi mumkin) */
function normalizeUser(u) {
  const raw = u?.data?.data ?? u?.data ?? u ?? {}
  return {
    id: raw.id ?? raw.user_id ?? null,
    uid: raw.uid ?? raw.user_uid ?? raw.userUid ?? null,
    type: raw.type ?? raw.user_type ?? 2,
    first_name: raw.first_name ?? raw.firstName ?? '',
    last_name: raw.last_name ?? raw.lastName ?? '',
    middle_name: raw.middle_name ?? raw.middleName ?? '',
    company: raw.company ?? raw.company_name ?? '',
    created_at: raw.created_at ?? raw.registered_at ?? raw.createdAt ?? null,
    rating: raw.rating ?? raw.score ?? '-',
    rating_type: raw.rating_type ?? raw.ratingType ?? null,
  }
}

/* /home/by javobini normalize qilish */
function normalizeByResponse(res) {
  const d = res?.data?.data ?? res?.data ?? {}
  return {
    five: Array.isArray(d.five) ? d.five : [],
    data: Array.isArray(d.data) ? d.data : [],
    expired: Array.isArray(d.expired) ? d.expired : [],
  }
}

/* Tab almashtirish */
function handleTab(side, value) {
  const cur = value === 1 ? 'UZS' : 'USD'
  if (side === 'left') {
    tabLeft.value = value
    debitorData.value = (nearDebitor.value || []).filter(i => i.currency === cur)
  } else {
    tabRight.value = value
    creditorData.value = (nearCreditor.value || []).filter(i => i.currency === cur)
  }
}

/* ---------- loader ---------- */
async function load() {
  loading.value = true
  err.value = ''
  try {
    // 1) User — bir nechta endpointni sinab ko‘ramiz
    let uRes
    const idParam = route.params.id
    const tryUrls = [
      `/user/admin/user/${idParam}`,
      `/user/candidate/${idParam}`,
      `/users/${idParam}`,
    ]
    for (const url of tryUrls) {
      try {
        uRes = await api.get(url)
        if (uRes?.data) break
      } catch (_) { /* continue */ }
    }
    if (!uRes?.data) throw new Error('Foydalanuvchi topilmadi')

    const u = normalizeUser(uRes)
    user.value = u

    // 2) Debitor/Kreditor statistikasi – avval id bilan, bo‘lmasa uid bilan
    const key = u.id ?? u.uid
    if (!key) throw new Error('User ID/UID aniqlanmadi')

    // debitor
    let dRes
    try { dRes = await api.get(`/home/by/${u.id}?type=debitor`) } catch(_){}
    if (!dRes) try { dRes = await api.get(`/home/by/${u.uid}?type=debitor`) } catch(_){}
    if (dRes) {
      const D = normalizeByResponse(dRes)
      nearDebitor.value = D.five
      debitorData.value = D.five.filter(i => i.currency === 'UZS')
      debitorUsd.value = D.data.find(i => i.currency === 'USD') || null
      debitorUzs.value = D.data.find(i => i.currency === 'UZS') || null
      expiredDebitorUsd.value = D.expired.find(i => i.currency === 'USD') || null
      expiredDebitorUzs.value = D.expired.find(i => i.currency === 'UZS') || null
    } else {
      nearDebitor.value = []
      debitorData.value = []
    }

    // kreditor
    let cRes
    try { cRes = await api.get(`/home/by/${u.id}?type=creditor`) } catch(_){}
    if (!cRes) try { cRes = await api.get(`/home/by/${u.uid}?type=creditor`) } catch(_){}
    if (cRes) {
      const C = normalizeByResponse(cRes)
      nearCreditor.value = C.five
      creditorData.value = C.five.filter(i => i.currency === 'UZS')
      creditorUsd.value = C.data.find(i => i.currency === 'USD') || null
      creditorUzs.value = C.data.find(i => i.currency === 'UZS') || null
      expiredCreditorUsd.value = C.expired.find(i => i.currency === 'USD') || null
      expiredCreditorUzs.value = C.expired.find(i => i.currency === 'UZS') || null
    } else {
      nearCreditor.value = []
      creditorData.value = []
    }
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Ma’lumotlarni yuklashda xatolik'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>


<template>
  <div class="rounded bg-[#eaf2fb] py-6" v-if="user">
    <div class="px-4">
      <!-- HEADER -->
      <div class="flex flex-wrap items-center">
        <div class="mx-auto lg:mx-12">
          <!-- oddiy avatar svg -->
          <svg width="120" height="120" viewBox="0 0 26 25" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="13" cy="12.5" rx="13" ry="12.5" fill="white" />
            <path d="M15.2107 6.94546C14.6493 6.33576 13.8653 6 12.9999 6C12.13 6 11.3434 6.33373 10.7846 6.93965C10.2198 7.55226 9.94464 8.38483 10.0093 9.28386C10.1373 11.0575 11.4789 12.5004 12.9999 12.5004C14.521 12.5004 15.8603 11.0578 15.9903 9.28444C16.0558 8.39354 15.7789 7.56271 15.2107 6.94546Z" fill="#3182CE"/>
            <path d="M18.0768 19.0002H7.92322C7.79032 19.0019 7.6587 18.9738 7.53795 18.9179C7.41719 18.8621 7.31034 18.7798 7.22516 18.6772C7.03766 18.4517 6.96209 18.1438 7.01805 17.8324C7.2615 16.4737 8.02129 15.3324 9.21549 14.5311C10.2764 13.8199 11.6203 13.4284 13 13.4284C14.3797 13.4284 15.7236 13.8202 16.7845 14.5311C17.9787 15.3321 18.7385 16.4734 18.982 17.8321C19.0379 18.1435 18.9623 18.4514 18.7748 18.6769C18.6897 18.7796 18.5828 18.8619 18.4621 18.9178C18.3413 18.9737 18.2097 19.0019 18.0768 19.0002Z" fill="#3182CE"/>
          </svg>
        </div>

        <div class="mt-5">
          <div class="text-[#195a96] font-medium">
            <h1><b>{{ user.type === 1 ? 'Korxona nomi' : 'F.I.Sh' }} :</b></h1>
            <h1 class="text-black">
              {{ user.type === 1 ? user.company : `${user.last_name} ${user.first_name} ${user.middle_name}` }}
            </h1>
            <h1><b>Tizimda ro‘yxatdan o‘tgan vaqti :</b></h1>
            <p class="text-black">{{ dateFormat(user.created_at) }}</p>
            <h1><b>ID:</b></h1>
            <p class="text-black">{{ user.uid }}</p>
            <h1><b>Status:</b></h1>
            <h1 class="text-black flex items-center gap-2">
              <span>{{ user.rating }}</span>
              <!-- rating_type indikatorlari -->
              <span v-if="user.rating_type == 1">
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 5L0 9.5L7 4.5L14 9.5V5L7 0L0 5Z" fill="#049D26"/></svg>
              </span>
              <span v-if="user.rating_type == 2">
                <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 5L0 9.5L7 4.5L14 9.5V5L7 0L0 5Z" fill="#049D26"/><path d="M0 12L0 16.5L7 11.5L14 16.5V12L7 7L0 12Z" fill="#049D26"/></svg>
              </span>
              <span v-if="user.rating_type == 3">
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4.5V0L7 5L0 0V4.5L7 9.5L14 4.5Z" fill="#FF0000"/></svg>
              </span>
              <span v-if="user.rating_type == 4">
                <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 11.5V7L7 12L0 7V11.5L7 16.5L14 11.5Z" fill="#FF0000"/><path d="M14 4.5V0L7 5L0 0V4.5L7 9.5L14 4.5Z" fill="#FF0000"/></svg>
              </span>
            </h1>
          </div>
        </div>
      </div>
    </div>

    <!-- 2 ta karta qatori: Debitor / Kreditor umumiy qarz -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 gap-x-8 mt-10 items-stretch px-4">
      <!-- Debitor -->
      <RouterLink
        :to="`/users/${user.uid}/debitor/history`"
        class="flex justify-between rounded-xl bg-white p-5 h-full shadow-sm"
      >
        <div>
          <h1 class="text-xl text-slate-700 mb-1">Qarz (debitor)</h1>
          <h2 class="text-xl font-semibold text-emerald-600">
            {{ debitorUzs ? nfmt(debitorUzs.residual_amount) : '0' }} <span>UZS</span>
          </h2>
          <h2 class="text-xl font-semibold text-emerald-600 mb-1">
            {{ debitorUsd ? nfmt(debitorUsd.residual_amount) : '0' }} <span>USD</span>
          </h2>
        </div>
        <div class="opacity-80">
          <!-- ikonani qoldirdim -->
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="8" fill="#3182CE"/>
            <path d="M31.2593 18.625H17.1968C16.4511 18.6258 15.7362 18.9224 15.2089 19.4497C14.6817 19.9769 14.3851 20.6918 14.3843 21.4375V29.875C14.3851 30.6207 14.6817 31.3356 15.2089 31.8628C15.7362 32.3901 16.4511 32.6867 17.1968 32.6875H31.2593C32.0049 32.6867 32.7198 32.3901 33.2471 31.8628C33.7744 31.3356 34.071 30.6207 34.0718 29.875V21.4375C34.071 20.6918 33.7744 19.9769 33.2471 19.4497C32.7198 18.9224 32.0049 18.6258 31.2593 18.625Z" fill="white"/>
          </svg>
        </div>
      </RouterLink>

      <!-- Kreditor -->
      <RouterLink
        :to="`/users/${user.uid}/creditor/history`"
        class="flex justify-between rounded-xl bg-white p-5 h-full shadow-sm"
      >
        <div>
          <h1 class="text-xl text-slate-700 mb-1">Olingan qarz (kreditor)</h1>
          <h2 class="text-xl font-semibold text-emerald-600">
            {{ creditorUzs ? nfmt(creditorUzs.residual_amount) : '0' }} <span>UZS</span>
          </h2>
          <h2 class="text-xl font-semibold text-emerald-600 mb-1">
            {{ creditorUsd ? nfmt(creditorUsd.residual_amount) : '0' }} <span>USD</span>
          </h2>
        </div>
        <div class="opacity-80">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="8" fill="#3182CE"/>
            <path d="M31.259 19H17.197C16.451 19 15.736 19.297 15.209 19.824C14.682 20.351 14.385 21.066 14.385 21.812V29.25C14.385 29.996 14.682 30.711 15.209 31.238C15.736 31.765 16.451 32.062 17.197 32.063H31.259C32.005 32.062 32.72 31.765 33.247 31.238C33.774 30.711 34.071 29.996 34.072 29.25V21.812C34.071 21.066 33.774 20.351 33.247 19.824C32.72 19.297 32.005 19 31.259 19Z" fill="white"/>
          </svg>
        </div>
      </RouterLink>
    </div>

    <!-- Muddati yaqinlar (Debitor/Kreditor) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 gap-x-8 mt-10 px-4">
      <!-- Debitor yaqin muddat -->
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <h1 class="text-xl text-slate-700 border-b pb-2">Yaqin muddat (debitor)</h1>

        <div class="flex items-center justify-between mt-3">
          <button
            class="w-full rounded py-1 m-2"
            :class="tabLeft === 1 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'"
            @click="handleTab('left', 1)"
          >UZS</button>
          <button
            class="w-full rounded py-1 m-2"
            :class="tabLeft === 2 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'"
            @click="handleTab('left', 2)"
          >USD</button>
        </div>

        <table class="w-full">
          <thead class="bg-slate-100 text-slate-500 text-sm">
            <tr class="flex items-center py-1">
              <th class="w-1/2 text-left px-2">Vaqt</th>
              <th class="w-1/2 text-left px-2">Summasi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in debitorData" :key="i" class="flex items-center py-1 text-sm">
              <td class="w-1/2 px-2" v-html="getDays(item.end_date)"></td>
              <td class="w-1/2 px-2">{{ nfmt(item.residual_amount) }} {{ item.currency }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="debitorData.length === 0" class="py-4 text-center text-slate-500">Ma’lumot yo‘q</div>
      </div>

      <!-- Kreditor yaqin muddat -->
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <h1 class="text-xl text-slate-700 border-b pb-2">Yaqin muddat (kreditor)</h1>

        <div class="flex items-center justify-between mt-3">
          <button
            class="w-full rounded py-1 m-2"
            :class="tabRight === 1 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'"
            @click="handleTab('right', 1)"
          >UZS</button>
          <button
            class="w-full rounded py-1 m-2"
            :class="tabRight === 2 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'"
            @click="handleTab('right', 2)"
          >USD</button>
        </div>

        <table class="w-full">
          <thead class="bg-slate-100 text-slate-500 text-sm">
            <tr class="flex items-center py-1">
              <th class="w-1/2 text-left px-2">Vaqt</th>
              <th class="w-1/2 text-left px-2">Summasi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in creditorData" :key="i" class="flex items-center py-1 text-sm">
              <td class="w-1/2 px-2" v-html="getDays(item.end_date)"></td>
              <td class="w-1/2 px-2">{{ nfmt(item.residual_amount) }} {{ item.currency }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="creditorData.length === 0" class="py-4 text-center text-slate-500">Ma’lumot yo‘q</div>
      </div>
    </div>

    <!-- Hisobotlar linklari -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 gap-x-8 mt-6 px-4">
      <RouterLink
        :to="`/users/${user.uid}/reports/debitor`"
        class="flex justify-between items-center w-full rounded-xl p-4 bg-white shadow-sm"
      >
        <div><h1 class="text-xl text-slate-700">Debitor hisobotlari</h1></div>
        <div class="opacity-80">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="8" fill="#3182CE"/></svg>
        </div>
      </RouterLink>

      <RouterLink
        :to="`/users/${user.uid}/reports/creditor`"
        class="flex justify-between items-center w-full rounded-xl p-4 bg-white shadow-sm"
      >
        <div><h1 class="text-xl text-slate-700">Kreditor hisobotlari</h1></div>
        <div class="opacity-80">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="8" fill="#3182CE"/></svg>
        </div>
      </RouterLink>
    </div>
  </div>

  <!-- Loading / error -->
  <div v-else class="p-6">
    <div v-if="loading" class="rounded-xl border bg-white p-6 text-center text-slate-500 shadow-sm">
      Yuklanmoqda…
    </div>
    <div v-else-if="err" class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
      {{ err }}
    </div>
  </div>
</template>
