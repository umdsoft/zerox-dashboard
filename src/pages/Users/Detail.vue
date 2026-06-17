<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '../../lib/axios'
import { assetUrl, pdfUrl } from '../../lib/config'
// default avatar (fix for vite import)
import defaultAvatar from '../../../assets/img/no-avatar.png'

const route = useRoute()
const loading = ref(false)
const err = ref('')
const raw = ref(null)

function fmtDate(val, withYear = false) {
  if (!val) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return withYear ? `${val} yil` : val
  const d = new Date(val); if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const s = `${dd}.${mm}.${yyyy}`
  return withYear ? `${s} yil` : s
}
function fmtMoney(n) {
  if (n == null) return '0'
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^\d.-]/g, ''))
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num)
}
const genderLabel = (g) => (Number(g) === 1 ? 'Erkak' : Number(g) === 2 ? 'Ayol' : '—')

const user = computed(() => {
  const u = raw.value || {}
  return {
    id: u.id ?? u.user_id,
    uid: u.uid ?? u.user_uid ?? '',
    type: Number(u.type ?? 2),
    is_active: Number(u.is_active ?? 0),
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    middle_name: u.middle_name ?? '',
    full_name: [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' '),
    phone: u.phone ?? '',
    brithday: u.brithday ? fmtDate(u.brithday, true) : '',
    gender: u.gender,
    region: u.region ?? '',
    district: u.district ?? '',
    address: u.address ?? '',
    contract_date: u.contract_date ? fmtDate(u.contract_date) : '',
    con_time: u.con_time ? String(u.con_time).slice(0, 5) : '',
    passport: u.passport ?? '',
    issued_by: u.issued_by ?? '',
    issued_date: u.issued_date ? fmtDate(u.issued_date, true) : '',
    expiry_date: u.expiry_date ? fmtDate(u.expiry_date, true) : '',
    rating: u.rating ?? 0,
    balance: u.balance ?? 0,
    image: assetUrl(u.image),
    company: u.company ?? '',
    director: u.director ?? '',
    stir: u.pinfl ?? '',
  }
})

const ofertaPdf = computed(() =>
  user.value.uid ? pdfUrl(user.value.uid, { file: 'oferta.php' }) : '#'
)

// Hisob holati (is_active) — badge uchun
const accountStatus = computed(() =>
  Number(user.value.is_active) === 1
    ? { label: 'Tasdiqlangan', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
    : { label: 'Tasdiqlanmagan', cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
)

// O'ng tomon — bo'limlangan ma'lumot qatorlari
const personalRows = computed(() => [
  { label: 'Familiya', value: user.value.last_name || '—' },
  { label: 'Ismi', value: user.value.first_name || '—' },
  { label: 'Sharifi', value: user.value.middle_name || '—' },
  { label: 'Tug‘ilgan sanasi', value: user.value.brithday || '—' },
  { label: 'Jinsi', value: genderLabel(user.value.gender) },
])
const contactRows = computed(() => [
  { label: 'Telefon raqami', value: user.value.phone || '—' },
  { label: 'Elektron pochta', value: '—' },
  { label: 'Viloyat / tuman', value: [user.value.region, user.value.district].filter(Boolean).join(', ') || '—' },
  { label: 'Yashash manzili', value: user.value.address || '—' },
])
const passportRows = computed(() => [
  { label: 'Pasport seriasi', value: user.value.passport || '—' },
  { label: 'JSHSHIR', value: user.value.stir || '—' },
  { label: 'Kim tomonidan berilgan', value: user.value.issued_by || '—' },
  { label: 'Berilgan vaqti', value: user.value.issued_date || '—' },
  { label: 'Amal qilish muddati', value: user.value.expiry_date || '—' },
])
const legalRows = computed(() => [
  { label: 'Korxona nomi', value: user.value.company || '—' },
  { label: 'Rahbar', value: user.value.director || '—' },
  { label: 'STIR', value: user.value.stir || '—' },
  { label: 'Telefon raqami', value: user.value.phone || '—' },
  { label: 'Elektron pochta', value: '—' },
  { label: 'Yuridik manzil', value: user.value.address || '—' },
])
const ofertaInfo = computed(() =>
  user.value.contract_date
    ? `${user.value.contract_date}${user.value.con_time ? ' ' + user.value.con_time : ''}`
    : '—'
)

async function load() {
  const id = route.params.id
  if (!id) { err.value = 'Noto‘g‘ri foydalanuvchi ID'; return }
  loading.value = true; err.value = ''
  try {
    const res = await api.get(`/user/admin/user/${id}`)
    raw.value = res?.data?.data ?? res?.data ?? res
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Ma’lumotni yuklashda xatolik'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
      Yuklanmoqda…
    </div>
    <div v-else-if="err" class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
      {{ err }}
    </div>

    <div v-else-if="user" class="grid gap-6 lg:grid-cols-12">
      <!-- ================= LEFT: Profil ================= -->
      <aside class="lg:col-span-4">
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <!-- Gradient header -->
          <div class="h-20 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

          <div class="-mt-12 px-5 pb-5 text-center">
            <div class="mx-auto h-28 w-28 overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-4 ring-white">
              <img :src="user.image || defaultAvatar" alt="avatar" class="h-full w-full object-cover" />
            </div>

            <h2 class="mt-3 text-lg font-semibold text-slate-800 break-words">{{ user.full_name || '—' }}</h2>

            <div class="mt-2 flex justify-center">
              <span :class="['inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', accountStatus.cls]">
                <span :class="['h-2 w-2 rounded-full', accountStatus.dot]"></span>
                {{ accountStatus.label }}
              </span>
            </div>

            <!-- ID + balans -->
            <div class="mt-5 grid gap-2 text-left">
              <div class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <span class="flex items-center gap-2 text-sm text-slate-500">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" /></svg>
                  ID raqami
                </span>
                <span class="text-sm font-semibold text-indigo-600">{{ user.uid || '—' }}</span>
              </div>
              <div class="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                <span class="flex items-center gap-2 text-sm text-emerald-600">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9v9a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 2.25 9Zm13.5 6h3" /></svg>
                  Mobil hisob
                </span>
                <span class="text-sm font-bold text-emerald-700">{{ fmtMoney(user.balance) }} UZS</span>
              </div>
            </div>

            <!-- Amal tugmalari -->
            <div class="mt-5 space-y-2.5">
              <RouterLink :to="`/users/${user.uid}/contracts`"
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold !text-white no-underline shadow-sm transition duration-200 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:bg-indigo-800">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                Qarz shartnomalari
              </RouterLink>

              <RouterLink :to="`/users/${user.id}/logins`"
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold !text-slate-700 no-underline shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                Kirishlar arxivi
              </RouterLink>

              <a :href="ofertaPdf" download
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold !text-slate-700 no-underline shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2">
                <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Ommaviy ofertani yuklab olish
              </a>
            </div>
          </div>
        </div>
      </aside>

      <!-- ================= RIGHT: Ma'lumotlar ================= -->
      <section class="space-y-6 lg:col-span-8">
        <!-- ===== JISMONIY ===== -->
        <template v-if="user.type === 2">
          <!-- Shaxsiy ma'lumotlar -->
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              </span>
              <h3 class="text-sm font-semibold text-slate-800">Shaxsiy ma'lumotlar</h3>
            </div>
            <dl class="divide-y divide-slate-100">
              <div v-for="r in personalRows" :key="r.label" class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">{{ r.label }}</dt>
                <dd class="col-span-2 text-sm font-medium text-slate-800 break-words">{{ r.value }}</dd>
              </div>
            </dl>
          </div>

          <!-- Aloqa ma'lumotlari -->
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
              </span>
              <h3 class="text-sm font-semibold text-slate-800">Aloqa va manzil</h3>
            </div>
            <dl class="divide-y divide-slate-100">
              <div v-for="r in contactRows" :key="r.label" class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">{{ r.label }}</dt>
                <dd class="col-span-2 text-sm font-medium text-slate-800 break-words">{{ r.value }}</dd>
              </div>
            </dl>
          </div>

          <!-- Pasport ma'lumotlari -->
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" /></svg>
              </span>
              <h3 class="text-sm font-semibold text-slate-800">Pasport ma'lumotlari</h3>
            </div>
            <dl class="divide-y divide-slate-100">
              <div v-for="r in passportRows" :key="r.label" class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">{{ r.label }}</dt>
                <dd class="col-span-2 text-sm font-medium text-slate-800 break-words">{{ r.value }}</dd>
              </div>
            </dl>
          </div>

          <!-- Tizim ma'lumotlari -->
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </span>
              <h3 class="text-sm font-semibold text-slate-800">Tizim ma'lumotlari</h3>
            </div>
            <dl class="divide-y divide-slate-100">
              <div class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">Oferta tasdiqlangan sana</dt>
                <dd class="col-span-2 text-sm font-medium text-slate-800">{{ ofertaInfo }}</dd>
              </div>
              <div class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">Hisob holati</dt>
                <dd class="col-span-2">
                  <span :class="['inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold', accountStatus.cls]">
                    <span :class="['h-1.5 w-1.5 rounded-full', accountStatus.dot]"></span>
                    {{ accountStatus.label }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </template>

        <!-- ===== YURIDIK ===== -->
        <template v-else>
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
              </span>
              <h3 class="text-sm font-semibold text-slate-800">Korxona ma'lumotlari</h3>
            </div>
            <dl class="divide-y divide-slate-100">
              <div v-for="r in legalRows" :key="r.label" class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">{{ r.label }}</dt>
                <dd class="col-span-2 text-sm font-medium text-slate-800 break-words">{{ r.value }}</dd>
              </div>
              <div class="grid grid-cols-3 gap-4 px-6 py-3">
                <dt class="text-sm text-slate-500">Hisob holati</dt>
                <dd class="col-span-2">
                  <span :class="['inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold', accountStatus.cls]">
                    <span :class="['h-1.5 w-1.5 rounded-full', accountStatus.dot]"></span>
                    {{ accountStatus.label }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </template>
      </section>
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
      Ma’lumot topilmadi
    </div>
  </div>
</template>
