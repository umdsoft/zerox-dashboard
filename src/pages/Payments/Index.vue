<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataTable from '../../components/ui/DataTable.vue'
import PagerBar from '../../components/ui/PagerBar.vue'
import ReasonDialog from '../../components/ui/ReasonDialog.vue'
import { getTransfers, cancelClickAtm } from '../../api/contracts'
import { fmtDate, fmtTime, fmtNum, errMessage } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'
import { useAuthStore } from '../../stores/auth'
import { toastOk, toastErr } from '../../lib/toast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const TABS = {
  income: { label: 'Tushgan mablag‘lar' },
  withdraw: { label: 'Mobil hisobdan yechilgan mablag‘' },
  p2p: { label: 'Mobil hisobdan mobil hisobga o‘tkazmalar' },
}
const initialTab = String(route.query.type || 'income').toLowerCase()
const tab = ref(TABS[initialTab] ? initialTab : 'income')
const search = ref(String(route.query.q || ''))

// Qidiruv serverda (F.I.O, telefon, summa, tranzaksiya ID) — sahifalash bilan birga ishlaydi
const list = usePagedList(({ signal }, { page, limit }) =>
  getTransfers(tab.value, { signal, params: { page, limit, q: tab.value === 'income' ? (search.value.trim() || undefined) : undefined } }),
)
const { page, limit, total, loading, error } = list

list.page.value = Number(route.query.page) > 0 ? Number(route.query.page) : 1

function syncQuery() {
  const q = tab.value === 'income' ? search.value.trim() || undefined : undefined
  router.replace({ query: { type: tab.value, page: page.value, q } })
}
function setTab(next) {
  if (next === tab.value) return
  tab.value = next
  page.value = 1
  search.value = '' // qidiruv faqat 'Tushgan mablag‘lar' yorlig'ida (backend q ni faqat shu yerda qo'llaydi)
  syncQuery()
  list.load()
}
function onPage(p) {
  const r = list.setPage(p) // page.value shu yerda sinxron o'rnatiladi
  syncQuery()
  return r
}

let timer = null
watch(search, () => {
  if (tab.value !== 'income') return
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; syncQuery(); list.load() }, 400)
})
onMounted(() => list.load())
onBeforeUnmount(() => clearTimeout(timer))

const plusMinusClass = (sign) => (sign === 1 ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold')

const columns = computed(() => {
  if (tab.value === 'income') {
    return [
      { label: 'Foydalanuvchi ID', key: 'sid', sortable: true },
      { label: 'Foydalanuvchi', key: 'sname', sortable: true },
      { label: 'To‘lov tizimi', key: 'pay', sortable: true },
      { label: 'To‘lov summasi', key: 'amount_fmt' },
      { label: 'To‘lov sanasi', key: 'pay_date_fmt' },
      { label: 'To‘lov vaqti', key: 'pay_time_fmt' },
      { label: 'Bekor qilingan vaqt', key: 'cancel_dt_fmt' },
      { label: 'Amal', key: 'actions' },
    ]
  }
  if (tab.value === 'withdraw') {
    return [
      { label: 'F.I.Sh / kompaniya', key: 'name', sortable: true },
      { label: 'ID', key: 'sid', sortable: true },
      { label: 'Summa (UZS)', key: 'amount_fmt' },
      { label: 'Shartnoma №', key: 'number' },
      { label: 'Sana', key: 'date_fmt' },
      { label: 'Vaqt', key: 'time_fmt' },
      { label: 'Holat', key: 'status' },
    ]
  }
  return [
    { label: 'Yuboruvchi', key: 'sname', sortable: true },
    { label: 'Yuboruvchi ID', key: 'sid' },
    { label: 'Qabul qiluvchi', key: 'rname', sortable: true },
    { label: 'Qabul qiluvchi ID', key: 'rid' },
    { label: 'O‘tkazma summasi (UZS)', key: 'amount_fmt' },
    { label: 'Sana', key: 'date_fmt' },
    { label: 'Vaqt', key: 'time_fmt' },
    { label: 'Holat', key: 'status' },
  ]
})

const rowsForTable = computed(() => {
  const rows = list.rows.value || []
  if (tab.value === 'income') {
    return rows.map((it) => {
      const sign = Number(it.all ?? 0) // 0=plus, 1=minus
      return {
        ...it,
        sid: it.sid ?? it.user_id ?? '',
        sname: it.sname ?? it.full_name ?? '',
        pay: it.pay ?? it.gateway ?? '',
        amount_fmt: `${sign === 1 ? '-' : '+'}${fmtNum(it.amount)}`,
        pay_date_fmt: sign === 0 ? fmtDate(it.created_at, { empty: '—' }) : '—',
        pay_time_fmt: sign === 0 ? (it.time || fmtTime(it.created_at, { empty: '—' })) : '—',
        cancel_dt_fmt: it.cancel_time ? `${fmtDate(it.cancel_time)} ${fmtTime(it.cancel_time)}` : '—',
        _sign: sign,
        _clickCancelable: String(it.pay ?? '').toLowerCase() === 'click' && sign === 0 && Number(it.is_cancel ?? 0) !== 1,
      }
    })
  }
  if (tab.value === 'withdraw') {
    return rows.map((it) => {
      const rawName = (Number(it.dtype) === 1 ? it.company : it.sname) || ''
      return {
        ...it,
        name: String(rawName).trim() || '—',
        sid: it.sid ?? '',
        amount_fmt: fmtNum(it.amount),
        number: it.number != null && String(it.number).trim() !== '' ? it.number : '—',
        date_fmt: fmtDate(it.created_at, { empty: '—' }),
        time_fmt: it.time || fmtTime(it.created_at, { empty: '—' }),
        status: 'Tugallangan',
      }
    })
  }
  return rows.map((it) => ({
    ...it,
    sname: it.sname ?? '', sid: it.sid ?? '', rname: it.rname ?? '', rid: it.rid ?? '',
    amount_fmt: fmtNum(it.amount),
    date_fmt: fmtDate(it.created_at, { empty: '—' }),
    time_fmt: it.time || fmtTime(it.created_at, { empty: '—' }),
    status: 'Tugallangan',
  }))
})

// ---- To'lovni bekor qilish: tasdiq + majburiy sabab + toast ----
const canCancel = computed(() => auth.can('cancelPayment'))
const cancelTarget = ref(null)
const cancelBusy = ref(false)
const cancelError = ref('')

function askCancel(row) { cancelError.value = ''; cancelTarget.value = row }

async function confirmCancel(reason) {
  const row = cancelTarget.value
  if (!row) return
  cancelBusy.value = true; cancelError.value = ''
  try {
    await cancelClickAtm(row.id, { reason })
    toastOk('To‘lov bekor qilindi.')
    cancelTarget.value = null
    await list.load()
  } catch (e) {
    cancelError.value = errMessage(e, 'To‘lovni bekor qilib bo‘lmadi.')
    toastErr(cancelError.value)
  } finally {
    cancelBusy.value = false
  }
}

const tabCls = (active) => [
  'px-3 py-2 rounded-md text-sm font-medium border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
  active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <h1 class="text-2xl font-semibold text-slate-800">{{ TABS[tab].label }}</h1>
      <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="To‘lov turlari">
        <button v-for="(t, key) in TABS" :key="key" type="button" role="tab" :aria-selected="tab === key" :class="tabCls(tab === key)" @click="setTab(key)">{{ t.label }}</button>
      </div>
    </div>

    <div v-if="tab === 'income'" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        </span>
        <input
          v-model="search"
          type="search"
          aria-label="To‘lovlarni qidirish"
          placeholder="F.I.O, telefon, summa yoki tranzaksiya ID bo‘yicha qidirish…"
          class="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>
    </div>

    <DataTable :columns="columns" :rows="rowsForTable" :loading="loading" :error="error" empty-message="To‘lov topilmadi." @retry="list.retry()">
      <template #title>
        <h2 class="text-base font-semibold text-slate-800">Jami ({{ total }})</h2>
      </template>

      <template v-if="tab === 'income'" #cell-amount_fmt="{ row }">
        <span :class="plusMinusClass(row._sign)">{{ row.amount_fmt }}</span>
      </template>
      <template v-else #cell-amount_fmt="{ row }">
        <span class="font-medium text-slate-800">{{ row.amount_fmt }}</span>
      </template>

      <template v-if="tab === 'income'" #cell-actions="{ row }">
        <button
          v-if="row._clickCancelable && canCancel"
          type="button"
          class="inline-flex items-center rounded-md bg-rose-600 px-3 py-1 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          @click="askCancel(row)"
        >To‘lovni bekor qilish</button>
        <span v-else-if="String(row.pay).toLowerCase() === 'click' && Number(row.is_cancel) === 1" class="text-sm text-slate-600">To‘lov admin tomonidan bekor qilingan</span>
      </template>
    </DataTable>

    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="onPage" />

    <ReasonDialog
      :open="Boolean(cancelTarget)"
      title="To‘lovni bekor qilish"
      :message="cancelTarget ? `${cancelTarget.sname || 'Foydalanuvchi'} — ${cancelTarget.amount_fmt} UZS (Click).\nBu amalni qaytarib bo‘lmaydi.` : ''"
      confirm-label="Bekor qilish"
      danger
      :busy="cancelBusy"
      :error="cancelError"
      @confirm="confirmCancel"
      @cancel="cancelTarget = null"
    />
  </div>
</template>
