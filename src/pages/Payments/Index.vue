<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataTable from '../../components/ui/DataTable.vue'
import api from '../../lib/axios'

/* ---------- state ---------- */
const route = useRoute()
const router = useRouter()

// tabs: income | withdraw | p2p
const tab = ref((route.query.type || 'income').toString().toLowerCase())
const loading = ref(false)
const rowsRaw = ref([])
const total = ref(0)

// pagination (1-based)
const page = ref(Number(route.query.page ?? 1) || 1)
const limit = ref(Number(route.query.limit ?? 10) || 10)

/* ---------- helpers ---------- */
function setTab(next) {
  if (next === tab.value) return
  tab.value = next
  page.value = 1
  pushQuery()
  loadList()
}
function pushQuery() {
  router.replace({ query: { ...route.query, type: tab.value, page: page.value, limit: limit.value } })
}

watch([() => route.query.type, () => route.query.page, () => route.query.limit], () => {
  const qType = (route.query.type || 'income').toString().toLowerCase()
  const qPage = Number(route.query.page || 1)
  const qLimit = Number(route.query.limit || 10)
  if (tab.value !== qType) tab.value = qType
  if (page.value !== qPage) page.value = qPage
  if (limit.value !== qLimit) limit.value = qLimit
})

function btnClass(active) {
  return [
    'px-3 py-2 rounded-md text-sm font-medium border transition',
    active ? 'bg-green-600 text-white border-primary-600'
           : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
  ]
}

function fmtDate(val) {
  if (!val) return '—'
  // val 'YYYY-MM-DD...' bo‘lsa ham, Date qilib formatlaymiz
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}
function fmtTime(val) {
  if (!val) return '—'
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(val)) return val
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
function fmtAmount(amount) {
  const n = Number(String(amount ?? 0).replace(/[^\d.-]/g, '')) || 0
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)
}
function plusMinusClass(sign /* 0 plus, 1 minus */) {
  return sign === 1 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'
}

// endpointlar — SEN BERGAN YO‘LLAR
function endpointByTab(t) {
  if (t === 'withdraw') return '/dashboard/trasfer/paid'
  if (t === 'p2p')      return '/dashboard/trasfer/money-transfer'
  return '/dashboard/trasfer/pay'
}

// list javobini normalize
function normalizeResponse(res) {
  const raw = res?.data ?? res
  const items =
    Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw?.items) ? raw.items
    : []
  const count =
    Number(raw?.count) || Number(raw?.total) ||
    Number(raw?.data?.count) || Number(res?.headers?.['x-total-count']) ||
    items.length
  return { items, count }
}

/* ---------- columns per tab ---------- */
const columns = computed(() => {
  if (tab.value === 'income') {
    return [
      { label: 'FOYDALANUVCHI ID', key: 'sid' },
      { label: 'FOYDALANUVCHI', key: 'sname' },
      { label: "TO'LOV TIZIMI", key: 'pay' },
      { label: "TO'LOV SUMMASI", key: 'amount_fmt' }, // +/-
      { label: "TO'LOV SANASI", key: 'pay_date_fmt' },
      { label: "TO'LOV VAQTI", key: 'pay_time_fmt' },
      { label: 'BEKOR QILINGAN VAQT', key: 'cancel_dt_fmt' },
      { label: '', key: 'actions' },
    ]
  }
  if (tab.value === 'withdraw') {
    return [
      { label: 'FISh / KOMPANIYA', key: 'name' },
      { label: 'ID', key: 'sid' },
      { label: "SUMMA (UZS)", key: 'amount_fmt' },
      { label: 'SHARTNOMA №', key: 'number' },
      { label: 'SANA', key: 'date_fmt' },
      { label: 'VAQT', key: 'time_fmt' },
      { label: 'HOLAT', key: 'status' },
    ]
  }
  // p2p
  return [
    { label: 'YUBORUVCHI', key: 'sname' },
    { label: 'YUBORUVCHI ID', key: 'sid' },
    { label: 'QABUL QILUVCHI', key: 'rname' },
    { label: 'QABUL QILUVCHI ID', key: 'rid' },
    { label: 'O‘TKAZMA SUMMASI (UZS)', key: 'amount_fmt' },
    { label: 'SANA', key: 'date_fmt' },
    { label: 'VAQT', key: 'time_fmt' },
    { label: 'HOLAT', key: 'status' },
  ]
})

/* ---------- mapping per tab ---------- */
const rowsForTable = computed(() => {
  const list = rowsRaw.value || []
  if (tab.value === 'income') {
    return list.map(it => {
      const sign = Number(it.all ?? 0) // 0=plus, 1=minus
      return {
        ...it,
        sid: it.sid ?? it.user_id ?? '',
        sname: it.sname ?? it.full_name ?? '',
        pay: it.pay ?? it.gateway ?? '',
        amount_fmt: `${sign === 1 ? '-' : '+'}${fmtAmount(it.amount)}`,
        pay_date_fmt: sign === 0 ? fmtDate(it.created_at) : '—',
        pay_time_fmt: sign === 0 ? (it.time || fmtTime(it.created_at)) : '—',
        cancel_dt_fmt: it.cancel_time ? `${fmtDate(it.cancel_time)} ${fmtTime(it.cancel_time)}` : '—',
        _sign: sign,
        _clickCancelable:
          String(it.pay ?? '').toLowerCase() === 'click' &&
          sign === 0 &&
          Number(it.is_cancel ?? 0) !== 1,
      }
    })
  }
  if (tab.value === 'withdraw') {
    return list.map(it => {
      const name = Number(it.dtype) === 1 ? (it.company ?? '') : (it.sname ?? '')
      return {
        ...it,
        name,
        sid: it.sid ?? '',
        amount_fmt: fmtAmount(it.amount),
        number: it.number ?? '—',
        date_fmt: fmtDate(it.created_at),
        time_fmt: it.time || fmtTime(it.created_at),
        status: 'Tugallangan',
      }
    })
  }
  // p2p
  return list.map(it => ({
    ...it,
    sname: it.sname ?? '',
    sid: it.sid ?? '',
    rname: it.rname ?? '',
    rid: it.rid ?? '',
    amount_fmt: fmtAmount(it.amount),
    date_fmt: fmtDate(it.created_at),
    time_fmt: it.time || fmtTime(it.created_at),
    status: 'Tugallangan',
  }))
})

/* ---------- api ---------- */
async function loadList() {
  loading.value = true
  try {
    const res = await api.get(endpointByTab(tab.value), { params: { page: page.value, limit: limit.value } })
    const { items, count } = normalizeResponse(res)
    rowsRaw.value = items
    total.value = count
  } catch (e) {
    rowsRaw.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function cancelClickPayment(id) {
  try {
    await api.post(`/dashboard/transfer/click-atm/${id}`)
    await loadList()
  } catch (e) { /* optional toast */ }
}

/* ---------- effects & pagination ---------- */
onMounted(loadList)
watch([tab, page, limit], pushQuery)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)
function prevPage() { if (canPrev.value) { page.value -= 1; loadList() } }
function nextPage() { if (canNext.value) { page.value += 1; loadList() } }
</script>

<template>
  <div class="space-y-6">
    <!-- Header + Tabs -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">
          {{
            tab === 'income'   ? "Tushgan mablag’lar"
          : tab === 'withdraw' ? "Mobil hisobdan yechilgan mablag‘"
                               : "Mobil hisobdan mobil hisobga o‘tkazmalar"
          }}
        </h1>
        <p class="text-sm text-slate-500">
          {{
            tab === 'income'   ? "Foydalanuvchilardan kelgan to‘lovlar tarixi."
          : tab === 'withdraw' ? "Mobil hisobdan yechilgan mablag‘lar ro‘yxati."
                               : "Foydalanuvchi hisoblari orasidagi o‘tkazmalar ro‘yxati."
          }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button :class="btnClass(tab==='income')"   @click="setTab('income')">Tushgan mablag‘lar</button>
        <button :class="btnClass(tab==='withdraw')" @click="setTab('withdraw')">Mobil hisobdan yechilgan mablag‘</button>
        <button :class="btnClass(tab==='p2p')"      @click="setTab('p2p')">Mobil hisobdan mobil hisobga o‘tkazmalar</button>
      </div>
    </div>

    <!-- DataTable -->
    <DataTable :columns="columns" :rows="rowsForTable" :loading="loading" class="w-full datatable-center-head">
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">Jami ({{ total }})</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500"></p>
      </template>

      <!-- income: amount rangli +/− -->
      <template #cell-amount_fmt="{ row }" v-if="tab==='income'">
        <span :class="plusMinusClass(row._sign)">{{ row.amount_fmt }}</span>
      </template>

      <!-- withdraw/p2p: amount oddiy -->
      <template #cell-amount_fmt="{ row }" v-else>
        <span class="font-medium text-slate-800">{{ row.amount_fmt }}</span>
      </template>

      <!-- income: actions -->
      <template #cell-actions="{ row }" v-if="tab==='income'">
        <div class="text-right">
          <button
            v-if="row._clickCancelable"
            class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            @click="cancelClickPayment(row.id)"
          >
            To'lovni bekor qilish
          </button>
          <span v-else-if="String(row.pay).toLowerCase()==='click' && Number(row.is_cancel)===1" class="text-slate-500 text-sm">
            To‘lov admin tomonidan bekor qilingan
          </span>
        </div>
      </template>
    </DataTable>

    <!-- Pagination -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-slate-600">Sahifa {{ page }} / {{ pageCount }}</div>
      <div class="flex items-center gap-2">
        <button class="px-3 py-1 rounded border text-sm disabled:opacity-50" :disabled="!canPrev" @click="prevPage">Oldingi</button>
        <button class="px-3 py-1 rounded border text-sm disabled:opacity-50" :disabled="!canNext" @click="nextPage">Keyingi</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sarlavhalarni markazlash */
:deep(.datatable-center-head thead th) { text-align: center; }

/* income: user va tizimni chapda, qolganlarini markazda */
:deep(tbody td:nth-child(2)),
:deep(tbody td:nth-child(3)) { text-align: left; }

/* withdraw: 1-ustun (name) chapda, qolganlari markazda */
:deep(.datatable-center-head tbody td) { vertical-align: middle; }
</style>
