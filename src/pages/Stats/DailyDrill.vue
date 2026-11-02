<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getDailyDrill } from '../../api/stats'
import { useRequest } from '../../composables/useRequest'
import PagerBar from '../../components/ui/PagerBar.vue'
import StateBlock from '../../components/ui/StateBlock.vue'
import { fmtDateTime, fmtMoney, fmtNum } from '../../lib/format'
import {
  DRILL_TITLES, DRILL_VIEWS, PAY_SOURCE_LABELS, fmtYmd, isDrillMetric, normalizeView,
} from '../../components/stats/dailyDrillMeta'

// 02.11: Kunlik dinamika jadvalidagi raqam ortidagi yozuvlar. Backend: GET /dashboard/stats/daily-activity/:metric
const PAGE_LIMIT = 20
const route = useRoute()
const router = useRouter()

const metric = computed(() => String(route.params.metric || ''))
const date = computed(() => String(route.params.date || ''))
const validMetric = computed(() => isDrillMetric(metric.value))
const view = computed(() => normalizeView(metric.value, String(route.query.view || 'records')))
const page = ref(1)
const data = ref(null)

const title = computed(() => (validMetric.value ? DRILL_TITLES[metric.value][view.value] : 'Kunlik dinamika'))
const views = computed(() => (validMetric.value ? DRILL_VIEWS[metric.value] : []))
const VIEW_LABELS = { records: 'Yozuvlar', users: 'Faol userlar' }

// ---- ustun konfiguratsiyasi: {title, text(row), link(row)?, align?, mono?} ----
const userLink = (u) => (u && u.uid ? `/users/${u.uid}` : null)
const shopLink = (id) => (id ? { name: 'stores-detail', params: { id } } : null)
const TURI = { berish: 'Berilgan', olish: 'Olingan' }
const DEBT_TYPE = { lent: 'Berdim', borrowed: 'Oldim' }
const KIND = { income: 'Daromad', expense: 'Xarajat' }
const money = (r, key = 'amount') => fmtMoney(r[key], r.currency)
const dt = (r) => fmtDateTime(r.created_at, { empty: '—' })

const userCols = {
  uid: { title: 'ID', text: (r) => r.uid ?? '—', link: (r) => userLink(r) },
  fio: { title: 'F.I.O', text: (r) => r.fio },
  phone: { title: 'Telefon', text: (r) => r.phone_masked, mono: true },
}
const nestedUser = {
  title: 'Foydalanuvchi', text: (r) => r.user?.fio || '—', link: (r) => userLink(r.user),
}

const COLUMNS = {
  'registrations:records': [
    userCols.uid, userCols.fio, userCols.phone,
    { title: 'Hudud', text: (r) => r.region || '—' },
    { title: 'Vaqti', text: dt, align: 'right' },
  ],
  'contracts:records': [
    { title: 'Raqam', text: (r) => r.number || r.id, link: (r) => `/contracts/${r.id}` },
    { title: 'Qarz beruvchi', text: (r) => r.creditor?.fio || '—', link: (r) => userLink(r.creditor) },
    { title: 'Qarz oluvchi', text: (r) => r.debitor?.fio || '—', link: (r) => userLink(r.debitor) },
    { title: 'Summa', text: money, align: 'right' },
    { title: 'Vaqti', text: dt, align: 'right' },
  ],
  'qarz_daftari:records': [
    { title: 'Do‘kon', text: (r) => r.shop_name, link: (r) => shopLink(r.shop_id) },
    { title: 'Mijoz', text: (r) => r.mijoz_fish },
    { title: 'Telefon', text: (r) => r.mijoz_phone_masked, mono: true },
    { title: 'Turi', text: (r) => TURI[r.turi] || r.turi },
    { title: 'Summa', text: money, align: 'right' },
    { title: 'Qoldiq', text: (r) => money(r, 'remaining'), align: 'right' },
    nestedUser,
    { title: 'Vaqti', text: dt, align: 'right' },
  ],
  'qarz_daftari:users': [
    userCols.uid, userCols.fio, userCols.phone,
    { title: 'Yangi qarzlar', text: (r) => fmtNum(r.new_debts), align: 'right' },
    { title: 'Qaytarishlar', text: (r) => fmtNum(r.repayments), align: 'right' },
  ],
  // MAXFIYLIK: shaxsiy moliya yozuvlarida summa yo'q (backend ham qaytarmaydi)
  'personal_finance:records': [
    nestedUser,
    { title: 'Turi', text: (r) => KIND[r.kind] || r.kind },
    { title: 'Vaqti', text: dt, align: 'right' },
  ],
  'personal_finance:users': [
    userCols.uid, userCols.fio, userCols.phone,
    { title: 'Yozuvlar', text: (r) => fmtNum(r.records), align: 'right' },
    { title: 'Daromad', text: (r) => fmtNum(r.incomes), align: 'right' },
    { title: 'Xarajat', text: (r) => fmtNum(r.expenses), align: 'right' },
  ],
  'personal_debt:records': [
    nestedUser,
    { title: 'Turi', text: (r) => DEBT_TYPE[r.type] || r.type },
    { title: 'Summa', text: money, align: 'right' },
    { title: 'Qoldiq', text: (r) => money(r, 'remaining'), align: 'right' },
    { title: 'Vaqti', text: dt, align: 'right' },
  ],
  'personal_debt:users': [
    userCols.uid, userCols.fio, userCols.phone,
    { title: 'Yangi qarzlar', text: (r) => fmtNum(r.debts), align: 'right' },
  ],
  'revenue:records': [
    nestedUser,
    { title: 'Manba', text: (r) => PAY_SOURCE_LABELS[r.source] || r.source },
    { title: 'Summa (so‘m)', text: (r) => fmtNum(r.amount), align: 'right' },
    { title: 'Vaqti', text: dt, align: 'right' },
  ],
}
const columns = computed(() => COLUMNS[`${metric.value}:${view.value}`] || [])
const rows = computed(() => data.value?.items || [])
const total = computed(() => Number(data.value?.total || 0))
const summary = computed(() => data.value?.summary || null)
const groups = computed(() => data.value?.groups || [])

const req = useRequest(
  ({ signal }) => getDailyDrill(metric.value, {
    params: { date: date.value, view: view.value, page: page.value, limit: PAGE_LIMIT }, signal,
  }),
  {
    onSuccess: (res) => { data.value = res?.data?.data || null },
    mapError: (e) => (e?.response?.status === 403
      ? 'Bu ma’lumot faqat super-admin uchun ochiq'
      : e?.response?.data?.message || 'Ma’lumotni yuklab bo‘lmadi'),
  },
)
const loading = req.loading
const err = computed(() => (validMetric.value ? req.error.value : 'Noto‘g‘ri ko‘rsatkich'))

function load() {
  if (validMetric.value) req.run()
}
// metrika/sana/ko'rinish o'zgarsa 1-sahifadan qayta yuklanadi
watch(() => [metric.value, date.value, view.value], () => { page.value = 1; data.value = null; load() }, { immediate: true })

function onPage(p) {
  page.value = p
  load()
}
function setView(v) {
  if (v !== view.value) router.replace({ query: { ...route.query, view: v } })
}
function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'dashboard' })
}

const cellClass = (c) => `px-4 py-3 whitespace-nowrap ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.mono ? 'font-mono' : ''}`
const linkClass = 'font-medium text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded'
</script>

<template>
  <div class="space-y-6 p-4 md:p-6">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      @click="goBack"
    >
      <fa icon="arrow-left" class="text-xs" />
      Orqaga
    </button>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">{{ title }}</h1>
        <p class="text-sm text-slate-500">Kun: <span class="font-semibold text-slate-700">{{ fmtYmd(date) }}</span> (Toshkent vaqti) — Boshqaruv panelidagi raqamni tashkil etgan yozuvlar.</p>
      </div>
      <div v-if="views.length > 1" class="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold" role="group" aria-label="Ko‘rinish">
        <button
          v-for="v in views" :key="v" type="button" :aria-pressed="v === view"
          class="px-3 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
          :class="v === view ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
          @click="setView(v)"
        >{{ VIEW_LABELS[v] }}</button>
      </div>
    </div>

    <StateBlock v-if="(loading && !data) || err" :loading="loading && !data" :error="err" @retry="req.retry()" />

    <template v-else-if="data">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">{{ view === 'users' ? 'Faol userlar' : 'Yozuvlar soni' }}</p>
          <p class="mt-1 text-2xl font-semibold text-indigo-600">{{ fmtNum(total) }}</p>
        </div>
        <template v-if="summary">
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <p class="text-sm text-slate-500">Jami daromad</p>
            <p class="mt-1 text-2xl font-semibold text-amber-600">{{ fmtNum(summary.total) }} <span class="text-base text-slate-500">so‘m</span></p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <p class="text-sm text-slate-500">Manbalar bo‘yicha</p>
            <p class="mt-1 text-sm text-slate-700">
              <span v-for="(v, k) in summary.by_source" :key="k" class="mr-3 whitespace-nowrap">{{ PAY_SOURCE_LABELS[k] || k }}: <b>{{ fmtNum(v) }}</b></span>
            </p>
          </div>
        </template>
      </div>

      <!-- Qarz daftari: do'konlar kesimi -->
      <div v-if="groups.length" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Do‘konlar ({{ data.groups_truncated ? `${fmtNum(groups.length)} / ${fmtNum(data.groups_total)}` : fmtNum(groups.length) }}) — shu kuni yozilgan qarzlar</div>
        <p v-if="data.groups_truncated" class="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">Ro‘yxat qisqartirilgan: eng ko‘p qarz yozgan {{ fmtNum(groups.length) }} ta do‘kon ko‘rsatilmoqda (jami {{ fmtNum(data.groups_total) }} ta).</p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr><th class="px-4 py-3">Do‘kon</th><th class="px-4 py-3 text-right">Qarzlar soni</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="g in groups" :key="g.shop_id" class="hover:bg-slate-50">
                <td class="px-4 py-3"><RouterLink :to="{ name: 'stores-detail', params: { id: g.shop_id } }" :class="linkClass">{{ g.shop_name }}</RouterLink></td>
                <td class="px-4 py-3 text-right tabular-nums">{{ fmtNum(g.debts) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white" :class="loading ? 'opacity-60' : ''">
        <div class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{{ view === 'users' ? 'Foydalanuvchilar' : 'Yozuvlar' }} ({{ fmtNum(total) }})</div>
        <div v-if="!rows.length" class="p-6 text-center text-sm text-slate-500">Bu kunda yozuv topilmadi</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th v-for="c in columns" :key="c.title" class="px-4 py-3 whitespace-nowrap" :class="c.align === 'right' ? 'text-right' : ''">{{ c.title }}</th>
                <th v-if="view === 'users' && metric === 'qarz_daftari'" class="px-4 py-3">Do‘konlari</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="r in rows" :key="`${r.kind || view}-${r.id}`" class="hover:bg-slate-50">
                <td v-for="c in columns" :key="c.title" :class="cellClass(c)">
                  <RouterLink v-if="c.link && c.link(r)" :to="c.link(r)" :class="linkClass">{{ c.text(r) }}</RouterLink>
                  <span v-else class="text-slate-800">{{ c.text(r) }}</span>
                </td>
                <td v-if="view === 'users' && metric === 'qarz_daftari'" class="px-4 py-3">
                  <span v-for="s in r.shops" :key="s.shop_id" class="mr-2 inline-block whitespace-nowrap">
                    <RouterLink :to="{ name: 'stores-detail', params: { id: s.shop_id } }" :class="linkClass">{{ s.shop_name }}</RouterLink>
                    <span class="text-xs text-slate-500"> ({{ s.new_debts }} qarz, {{ s.repayments }} qaytarish)</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PagerBar :page="page" :limit="PAGE_LIMIT" :total="total" :disabled="loading" @change="onPage" />
      </div>
    </template>
  </div>
</template>
