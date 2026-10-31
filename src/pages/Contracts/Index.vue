<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import DataTable from '../../components/ui/DataTable.vue'
import PagerBar from '../../components/ui/PagerBar.vue'
import api from '../../lib/axios'
import { fmtDate, fmtMoney } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'

// Qidiruv / filtr
const search = ref('')
const statusFilter = ref('') // '' = barchasi; '1','2','0','3,4' = holat

const list = usePagedList(({ signal }, { page, limit }) =>
  api.get('/dashboard/contracts', {
    signal,
    params: {
      page, limit,
      search: search.value.trim() || undefined,
      status: statusFilter.value !== '' ? statusFilter.value : undefined,
    },
  }),
)
const { page, limit, total, loading, error } = list
const contracts = list.rows

// Ustunlar — sen bergan tartibda
const columns = [
  { label: 'Qarz shartnomasi raqami', key: 'contract_no' },  // clickable → /contracts/:id
  { label: 'Qarz beruvchi', key: 'debitor_full_name' },
  { label: 'Qarz beruvchining ID raqami', key: 'debitor_id' },
  { label: 'Qarz oluvchi', key: 'creditor_full_name' },      // chapda qoladi
  { label: 'Qarz oluvchining ID raqami', key: 'creditor_id' },
  { label: 'Qarz miqdori', key: 'amount_fmt' },             // 1 000 000 + currency
  { label: 'Qarzni qaytarish sanasi', key: 'return_date_fmt' },        // dd.MM.yyyy
  { label: 'Holat', key: 'status' },                 // badge
]

// ---------- helpers ----------

// Status badge — kod (0..4) va matnli sinonimlar uchun yagona, izchil jadval.
// Avval class/label funksiyalari bir-biriga zid mapping ishlatardi (masalan,
// 'tugallangan' bir joyda yashil, boshqasida "Tasdiqlanmagan" bo'lardi).
const STATUS_MAP = {
  '0': { label: 'Tasdiqlanmagan', cls: 'bg-gray-100 text-gray-700 border border-gray-200' },
  '1': { label: 'Jarayonda',      cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  '2': { label: 'Tugallangan',    cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  '3': { label: 'Rad qilingan',   cls: 'bg-rose-100 text-rose-700 border border-rose-200' },
  '4': { label: 'Rad qilingan',   cls: 'bg-rose-100 text-rose-700 border border-rose-200' },
}
const STATUS_ALIASES = {
  tasdiqlanmagan: '0',
  jarayonda: '1', progress: '1', pending: '1',
  tugallangan: '2', done: '2', completed: '2',
  'rad qilingan': '3', rejected: '3', cancelled: '3',
}
function statusKey(val) {
  const v = String(val ?? '').toLowerCase().trim()
  if (STATUS_MAP[v]) return v
  return STATUS_ALIASES[v] ?? null
}
function statusClass(val) {
  const k = statusKey(val)
  return k ? STATUS_MAP[k].cls : 'bg-gray-100 text-gray-700 border border-gray-200'
}
function statusLabel(val) {
  const k = statusKey(val)
  return k ? STATUS_MAP[k].label : (val ?? '—')
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
      amount_fmt: amount == null ? '' : fmtMoney(amount, currency),
      return_date_fmt: fmtDate(returnDate),
      status,
    }
  })
})

const hasActiveFilter = computed(() => Boolean(search.value) || statusFilter.value !== '')

let searchTimer = null
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => list.reset(), 400) })
watch(statusFilter, () => list.reset())
onMounted(() => list.load())
onBeforeUnmount(() => clearTimeout(searchTimer))

function clearFilters() { search.value = ''; statusFilter.value = '' }
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Qarz shartnomalari</h1>
      </div>
    </div>

    <!-- Qidiruv va filtr paneli -->
    <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        </span>
        <input
          v-model="search"
          type="search"
          aria-label="Shartnomalarni qidirish"
          placeholder="Shartnoma raqami, F.I.O yoki ID bo‘yicha qidirish…"
          class="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <select
        v-model="statusFilter"
        aria-label="Holat bo‘yicha filtr"
        class="min-w-[180px] rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">Barcha holat</option>
        <option value="1">Jarayonda</option>
        <option value="2">Tugallangan</option>
        <option value="3,4">Rad qilingan</option>
        <option value="0">Tasdiqlanmagan</option>
      </select>

      <button
        v-if="hasActiveFilter"
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
        @click="clearFilters"
      >
        Tozalash
      </button>
    </div>

    <DataTable :columns="columns" :rows="rowsForTable" :loading="loading" :error="error" empty-message="Shartnoma topilmadi." class="datatable-center-head" @retry="list.retry()">
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">Barcha shartnomalar soni ({{ total }})</h3>
      </template>

      <!-- Qarz shartnomasi raqami → /contracts/:id -->
      <template #cell-contract_no="{ row }">
        <RouterLink :to="`/contracts/${row.id}`" class="text-indigo-700 hover:underline font-medium">
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

    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="list.setPage" />
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
