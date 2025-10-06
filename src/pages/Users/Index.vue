<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DataTable from '../../components/ui/DataTable.vue'
import api from '../../lib/axios'

const loading = ref(false)
const users = ref([])

// Pagination: select yo‘q, default 15
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

// dd.MM.yyyy
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

// Derivatsiya qilingan satrlar
const rowsForTable = computed(() => {
  const start = (page.value - 1) * limit.value
  return (users.value || []).map((u, idx) => ({
    ...u,
    _seq: start + idx + 1,
    created_at_fmt: fmtDate(u?.created_at),
    contract_date_fmt: fmtDate(u?.contract_date),
  }))
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)

// API
const loadUsers = async () => {
  loading.value = true
  try {
    const res = await api.get('dashboard/users/2', {
      params: { page: page.value, limit: limit.value, per_page: limit.value },
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

watch([page, limit], loadUsers)
onMounted(loadUsers)

// Pagination tugmalari
function nextPage() { if (canNext.value) page.value += 1 }
function prevPage() { if (canPrev.value) page.value -= 1 }
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Jismoniy shaxslar</h1>
        <p class="text-sm text-slate-500">Tizimdagi foydalanuvchilar.</p>
      </div>
      <!-- Rows per page select olib tashlandi -->
    </div>

    <DataTable
      :columns="columns"
      :rows="rowsForTable"
      :loading="loading"
      download-filename="users.xlsx"
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
      <template #cell-brithday="{ row }"><div class="text-center">{{ row.brithday }}</div></template>
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
