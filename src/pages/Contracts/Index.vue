<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DataTable from '../../components/ui/DataTable.vue'
import api from '../../lib/axios'

const loading = ref(false)
const contracts = ref([])

// Pagination: select yo‘q, default 15
const page = ref(1)
const limit = ref(10)
const total = ref(0)

// Ustunlar — sen bergan tartibda
const columns = [
  { label: 'QARZ SHARTNOMASI RAQAMI', key: 'contract_no' },  // clickable → /contracts/:id
  { label: 'QARZ BERUVCHI', key: 'debitor_full_name' },
  { label: 'QARZ BERUVCHINING ID RAQAMI', key: 'debitor_id' },
  { label: 'QARZ OLUVCHI', key: 'creditor_full_name' },      // chapda qoladi
  { label: 'QARZ OLUVCINING ID RAQAMI', key: 'creditor_id' },
  { label: 'QARZ MIQDORI', key: 'amount_fmt' },             // 1 000 000 + currency
  { label: 'QARZNI QAYTARISH SANASI', key: 'return_date_fmt' },        // dd.MM.yyyy
  { label: 'HOLAT', key: 'status' },                 // badge
]

// ---------- helpers ----------
function fmtDate(val) {
  if (!val) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return val
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

// 1 000 000 + currency
function fmtAmount(amount, currency) {
  if (amount == null) return ''
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''))
  const withSpaces = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(isNaN(n) ? 0 : n)
  const cur = currency || 'UZS'
  return `${withSpaces} ${cur}`
}

// Status badge
function statusClass(val) {
  const v = String(val ?? '').toLowerCase()
  if (v === '1' || v === 'done' || v === 'completed' || v === 'tugallangan')
    return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (v === '2' || v === 'pending' || v === 'progress' || v === 'jarayonda')
    return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (v === '3' || v === 'rejected' || v === 'cancelled' || v === 'rad qilingan')
    return 'bg-rose-100 text-rose-700 border border-rose-200'
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}
function statusLabel(val) {
  const v = String(val ?? '').toLowerCase()
  if (v === '1' || v === 'done' || v === 'completed' || v === 'tugallangan') return 'Tugallangan'
  if (v === '2' || v === 'pending' || v === 'progress' || v === 'jarayonda') return 'Jarayonda'
  if (v === '3' || v === 'rejected' || v === 'cancelled' || v === 'rad qilingan') return 'Rad qilingan'
  if (v === '4' || v === 'rejected' || v === 'cancelled' || v === 'rad qilingan') return 'Tasdiqlanmagan'
  return val ?? '—'
}

// Backend javobini aqlli normalize qilish (rows/total/per/current)
function normalizeResponse(res) {
  const raw = res?.data ?? res

  // rows
  const rows =
    Array.isArray(raw) ? raw
      : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.items) ? raw.items
          : Array.isArray(raw?.data?.items) ? raw.data.items
            : []

  // meta variantlari
  const meta = raw?.meta || raw?.pagination || raw?.page || {}
  const dataMeta = raw?.data?.meta || {}
  const headersTotal = Number(res?.headers?.['x-total-count']) || Number(res?.headers?.['x-total']) || 0

  // per_page / limit
  const per =
    Number(raw?.per_page) || Number(raw?.limit) ||
    Number(meta?.per_page) || Number(meta?.limit) ||
    Number(meta?.pageSize) || Number(dataMeta?.per_page) ||
    limit.value

  // current_page
  const current =
    Number(raw?.current_page) ||
    Number(meta?.current_page) || Number(meta?.page) ||
    Number(meta?.pageIndex) || Number(dataMeta?.current_page) ||
    page.value

  // last_page
  const last =
    Number(raw?.last_page) ||
    Number(meta?.last_page) || Number(meta?.totalPages) ||
    Number(dataMeta?.last_page) || null

  // total / count
  let t =
    Number(raw?.total) || Number(raw?.count) || Number(raw?.total_count) ||
    Number(meta?.total) || Number(meta?.count) ||
    Number(dataMeta?.total) || Number(raw?.data?.total) ||
    headersTotal || 0

  if (!t && last && per) t = last * per
  if (!t) t = rows.length

  return { rows, perPage: per || limit.value, currentPage: current || page.value, lastPage: last, total: t }
}

// Backenddan kelgan obyektni jadval uchun boyitish/normalize
const rowsForTable = computed(() => {
  return (contracts.value || []).map((c) => {
    const id = c.id ?? c.contract_id ?? c._id
    const no = c.contract_no ?? c.number ?? c.code ?? id
    const cred = c.creditor_full_name ?? c.creditor_name ?? c.creditor ?? ''
    const credId = c.creditor_id ?? c.creditor_uid ?? c.creditor_code ?? c.creditor_user_uid ?? ''
    const deb = c.debitor_full_name ?? c.debtor_full_name ?? c.debitor_name ?? c.debtor_name ?? ''
    const debId = c.debitor_id ?? c.debitor_uid ?? c.debtor_uid ?? c.debitor_code ?? c.debtor_code ?? ''
    const amount = c.amount ?? c.sum ?? c.total
    const currency = c.currency ?? c.curr ?? 'UZS'
    const returnDate = c.return_date ?? c.payback_date ?? c.deadline ?? c.end_date ?? c.contract_return_date
    const status = c.status

    return {
      ...c,
      id,
      contract_no: no,
      creditor_full_name: cred,
      creditor_id: credId,
      debitor_full_name: deb,
      debitor_id: debId,
      amount_fmt: fmtAmount(amount, currency),
      return_date_fmt: fmtDate(returnDate),
      status,
    }
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)

// ---------- API ----------
async function loadContracts() {
  loading.value = true
  try {
    const res = await api.get('/dashboard/contracts', {
      params: {
        page: page.value,
        limit: limit.value,
        per_page: limit.value, // ayrim backendlar shuni kutadi
      },
    })
    const { rows, total: t, perPage: per, currentPage: cur } = normalizeResponse(res)
    contracts.value = rows?.length ? rows : []
    total.value = t
    if (per && per !== limit.value) limit.value = per
    if (cur && cur !== page.value) page.value = cur
  } catch (e) {
    contracts.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch([page, limit], loadContracts)
onMounted(loadContracts)

// Pagination tugmalari
function nextPage() { if (canNext.value) page.value += 1 }
function prevPage() { if (canPrev.value) page.value -= 1 }
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Qarz shartnomalari</h1>
        <p class="text-sm text-slate-500">Foydalanuvchilar tomonidan imzolangan shartnomalar.</p>
      </div>
    </div>

    <DataTable :columns="columns" :rows="rowsForTable" :loading="loading" download-filename="contracts.xlsx"
      class="datatable-center-head">
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">Barcha shartnomalar soni ({{ total }})</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500">Qarz beruvchi va qarz oluvchi o'rtasida tuzilgan shartnomalar.</p>
      </template>

      <!-- Qarz shartnomasi raqami → /contracts/:id -->
      <template #cell-contract_no="{ row }">
        <RouterLink :to="`/contracts/${row.id}`" class="text-primary-600 hover:underline font-medium">
          {{ row.contract_no }}
        </RouterLink>
      </template>

      <!-- Qarz oluvchi (chap) -->
      <template #cell-debitor_full_name="{ row }">
        <div class="text-left">{{ row.debitor_full_name }}</div>
      </template>

      <!-- Amount (center, minglik + currency) -->
      <template #cell-amount_fmt="{ row }">
        <div class="text-center font-medium text-slate-800">{{ row.amount_fmt }}</div>
      </template>

      <!-- Qaytarish sanasi (center, dd.MM.yyyy) -->
      <template #cell-return_date_fmt="{ row }">
        <div class="text-center">{{ row.return_date_fmt }}</div>
      </template>

      <!-- Holat badge (center) -->
      <template #cell-status="{ row }">
        <div class="text-center">
          <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
            :class="statusClass(row.status)">
            {{ statusLabel(row.status) }}
          </span>
        </div>
      </template>
    </DataTable>

    <!-- Pagination -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-slate-600">
        Sahifa {{ page }} / {{ Math.max(1, Math.ceil(total / limit)) }}
      </div>
      <div class="flex items-center gap-2">
        <button class="px-3 py-1 rounded border text-sm disabled:opacity-50" :disabled="!canPrev" @click="prevPage">
          Oldingi
        </button>
        <button class="px-3 py-1 rounded border text-sm disabled:opacity-50" :disabled="!canNext" @click="nextPage">
          Keyingi
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Headerlarni markazga */
:deep(.datatable-center-head thead th) {
  text-align: center;
}

/* Center: Creditor ID (3), Debtor ID (5), Amount (6), Return date (7), Status (8) */
:deep(td:nth-child(3)),
:deep(td:nth-child(5)),
:deep(td:nth-child(6)),
:deep(td:nth-child(7)),
:deep(td:nth-child(8)) {
  text-align: center;
}

/* Debtor name (4) – majburan chapga */
:deep(td:nth-child(4)) {
  text-align: left;
}
</style>
