<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import DataTable from '../../components/ui/DataTable.vue'
import api from '../../lib/axios'

const loading = ref(false)
const exporting = ref(false)
const users = ref([])

// Qidiruv / filtr
const search = ref('')
const statusFilter = ref('') // '' = barchasi, '1' = tasdiqlangan, '0' = tasdiqlanmagan

// Pagination: select yo‘q, default 10
const page = ref(1)
const limit = ref(10)
const total = ref(0)

// Kolonkalar
const columns = [
  { label: '№', key: '_seq' },
  { label: 'ID raqami', key: 'uid' },
  { label: 'F.I.O', key: 'full_name' },
  { label: 'Tug‘ilgan sanasi', key: 'brithday' },
  { label: 'Ro‘yxatdan o‘tgan sanasi', key: 'created_at_fmt' },
  { label: 'Telefon raqami', key: 'phone' },
  { label: 'JSHSHIR', key: 'pinfl' },
  { label: 'Oferta tasdiqlangan vaqti', key: 'contract_date_fmt' },
  { label: 'Holat', key: 'is_active' },
]

// Fallback
const fallbackUsers = []

// API parametrlari (qidiruv + filtr) — bitta joyda
function buildParams(extra = {}) {
  return {
    search: search.value || undefined,
    is_active: statusFilter.value !== '' ? Number(statusFilter.value) : undefined,
    ...extra,
  }
}

// --- helpers ---
function normalizeUsersResponse(res) {
  const raw = res?.data ?? res

  // rows
  const rows =
    Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw?.items) ? raw.items
    : Array.isArray(raw?.data?.items) ? raw.data.items
    : []

  // keng formatlarni qo‘llab-quvvatlaymiz
  const meta       = raw?.meta || raw?.pagination || raw?.page || {}
  const dataMeta   = raw?.data?.meta || {}
  const hdrTotal   = Number(res?.headers?.['x-total-count']) || Number(res?.headers?.['x-total']) || 0

  const per =
    Number(raw?.per_page) || Number(raw?.limit) ||
    Number(meta?.per_page) || Number(meta?.limit) ||
    Number(meta?.pageSize) || Number(dataMeta?.per_page) ||
    limit.value

  const current =
    Number(raw?.current_page) ||
    Number(meta?.current_page) || Number(meta?.page) ||
    Number(meta?.pageIndex) || Number(dataMeta?.current_page) ||
    page.value

  const last =
    Number(raw?.last_page) ||
    Number(meta?.last_page) || Number(meta?.totalPages) ||
    Number(dataMeta?.last_page) || null

  let t =
    Number(raw?.total) || Number(raw?.count) || Number(raw?.total_count) ||
    Number(meta?.total) || Number(meta?.count) ||
    Number(dataMeta?.total) || Number(raw?.data?.total) ||
    hdrTotal || 0

  if (!t && last && per) t = last * per
  if (!t) t = rows.length

  return { rows, total: t, perPage: per || limit.value, currentPage: current || page.value, lastPage: last }
}

// dd.MM.yyyy — "YYYY-MM-DD" (tug'ilgan sana) va ISO sanalarni TZ siljishisiz formatlaydi
function fmtDate(val) {
  if (!val) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return val // allaqachon DD.MM.YYYY
  // YYYY-MM-DD yoki YYYY-MM-DDT... — to'g'ridan-to'g'ri ajratamiz (new Date TZ siljishini oldini olamiz)
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}.${m[2]}.${m[1]}`
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

// Derivatsiya qilingan satrlar
const rowsForTable = computed(() => {
  const start = (page.value - 1) * limit.value
  return (users.value || []).map((u, idx) => ({
    ...u,
    _seq: start + idx + 1,
    brithday_fmt: fmtDate(u?.brithday),
    created_at_fmt: fmtDate(u?.created_at),
    contract_date_fmt: fmtDate(u?.contract_date),
  }))
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)
const hasActiveFilter = computed(() => Boolean(search.value) || statusFilter.value !== '')

// API
const loadUsers = async () => {
  loading.value = true
  try {
    const res = await api.get('dashboard/users/2', {
      params: buildParams({ page: page.value, limit: limit.value, per_page: limit.value }),
    })
    const { rows, total: t, perPage: per, currentPage: cur } = normalizeUsersResponse(res)
    users.value = rows?.length ? rows : fallbackUsers
    total.value = t
    if (per && per !== limit.value) limit.value = per
    if (cur && cur !== page.value) page.value = cur
  } catch (e) {
    users.value = fallbackUsers
    total.value = 0
  } finally {
    loading.value = false
  }
}

// Qidiruv/filtr o'zgarsa — 1-sahifaga qaytib qayta yuklaymiz (qo'sh so'rovsiz)
function resetAndLoad() {
  if (page.value !== 1) page.value = 1 // page watcher loadUsers ni chaqiradi
  else loadUsers()
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(resetAndLoad, 400)
})
watch(statusFilter, resetAndLoad)
watch([page, limit], loadUsers)
onMounted(loadUsers)

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
  // watcherlar avtomatik qayta yuklaydi
}

// Pagination tugmalari
function nextPage() { if (canNext.value) page.value += 1 }
function prevPage() { if (canPrev.value) page.value -= 1 }

// ---- Excelga BARCHA foydalanuvchilarni eksport qilish ----
// Loop strategiyasi: avvalgi versiyada `rows.length < lim` ga ishongan edi —
// bu backend `limit` parametrini hurmat qilmasa (default 10 qaytarsa), faqat
// 10 ta yozuv eksport qilinardi. Endi qat'iy ravishda BACKEND TOTAL'ga
// tayanamiz: jami soni ma'lum bo'lguncha sahifalanib boramiz. Total bo'lmasa,
// rows < lim ni fallback sifatida ishlatamiz.
async function fetchAllUsers() {
  const all = []
  const lim = 100
  let p = 1
  let knownTotal = 0
  for (let i = 0; i < 1000; i++) {
    const res = await api.get('dashboard/users/2', {
      params: buildParams({ page: p, limit: lim, per_page: lim }),
    })
    const { rows, total: t, lastPage } = normalizeUsersResponse(res)
    if (t > knownTotal) knownTotal = t
    if (!rows.length) break
    all.push(...rows)
    // Birinchi to'xtash sharti — backend total'iga yetdik
    if (knownTotal && all.length >= knownTotal) break
    // Lastpage paginatsiya meta'si bo'lsa, uni ham hisoblaymiz
    if (lastPage && p >= lastPage) break
    // Fallback: total noma'lum bo'lsa, qisqaroq sahifa = oxirgi sahifa
    if (!knownTotal && rows.length < lim) break
    p++
  }
  return all
}

async function exportAllUsers() {
  if (exporting.value) return
  exporting.value = true
  Swal.fire({
    title: 'Tayyorlanmoqda…',
    text: 'Barcha foydalanuvchilar yuklanmoqda',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })
  try {
    const all = await fetchAllUsers()
    if (!all.length) {
      Swal.fire('Maʼlumot yoʻq', 'Eksport qilish uchun foydalanuvchi topilmadi.', 'info')
      return
    }
    const dataset = all.map((u, idx) => ({
      '№': idx + 1,
      'ID raqami': u.uid ?? '',
      'F.I.O': u.full_name ?? '',
      'Tug‘ilgan sanasi': fmtDate(u.brithday),
      'Ro‘yxatdan o‘tgan sanasi': fmtDate(u.created_at),
      'Telefon raqami': u.phone ?? '',
      'JSHSHIR': u.pinfl ?? '',
      'Oferta tasdiqlangan vaqti': fmtDate(u.contract_date),
      'Holat': u.is_active === 1 ? 'Tasdiqlangan' : (u.is_active === 0 ? 'Tasdiqlanmagan' : ''),
    }))
    const ws = XLSX.utils.json_to_sheet(dataset)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, 'users.xlsx')
    Swal.close()
  } catch (e) {
    Swal.fire('Xatolik', 'Eksport amalga oshmadi. Qayta urinib koʻring.', 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Jismoniy shaxslar</h1>
        <p class="text-sm text-slate-500">Tizimdagi foydalanuvchilar.</p>
      </div>
    </div>

    <!-- Qidiruv va filtr paneli -->
    <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        </span>
        <input
          v-model="search"
          type="text"
          placeholder="F.I.O, telefon, ID yoki JSHSHIR bo‘yicha qidirish…"
          class="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <select
        v-model="statusFilter"
        class="min-w-[180px] rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">Barcha holat</option>
        <option value="1">Tasdiqlangan</option>
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

    <DataTable
      :columns="columns"
      :rows="rowsForTable"
      :loading="loading"
      download-filename="users.xlsx"
      :on-export-xlsx="exportAllUsers"
      class="datatable-center-head"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">
          Barcha foydalanuvchilar ({{ total }})
        </h3>
      </template>

      <template #description>
        <p class="text-sm text-slate-500">
          Tizimda ro'yhatdan o'tgan foydalanuvchilar ro'yxati.
        </p>
      </template>

      <!-- ID raqami → /users/:id -->
      <template #cell-uid="{ row }">
        <RouterLink :to="`/users/${row.uid}`" class="text-primary-600 hover:underline font-medium">
          {{ row.uid }}
        </RouterLink>
      </template>

      <!-- Center qilinadigan kataklar -->
      <template #cell-brithday="{ row }"><div class="text-center">{{ row.brithday_fmt }}</div></template>
      <template #cell-created_at_fmt="{ row }"><div class="text-center">{{ row.created_at_fmt }}</div></template>
      <template #cell-phone="{ row }"><div class="text-center">{{ row.phone }}</div></template>
      <template #cell-pinfl="{ row }"><div class="text-center">{{ row.pinfl }}</div></template>
      <template #cell-contract_date_fmt="{ row }"><div class="text-center">{{ row.contract_date_fmt }}</div></template>

      <!-- Holat badge -->
      <template #cell-is_active="{ row }">
        <span v-if="row?.is_active === 1"
          class="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
          Tasdiqlangan
        </span>
        <span v-else-if="row?.is_active === 0"
          class="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300">
          Tasdiqlanmagan
        </span>
        <span v-else class="text-xs text-slate-500">—</span>
      </template>
    </DataTable>

    <!-- Bo'sh natija -->
    <div v-if="!loading && !rowsForTable.length" class="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
      Qidiruv yoki filtr boʻyicha foydalanuvchi topilmadi.
    </div>

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
/* Headerlarni center */
:deep(.datatable-center-head thead th) { text-align: center; }
/* № va Holat ustunlarini center */
:deep(td:nth-child(1)), :deep(td:last-child) { text-align: center; }
</style>
