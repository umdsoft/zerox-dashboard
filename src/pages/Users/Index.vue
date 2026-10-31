<script setup>
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import DataTable from '../../components/ui/DataTable.vue'
import PagerBar from '../../components/ui/PagerBar.vue'
import ReasonDialog from '../../components/ui/ReasonDialog.vue'
import api from '../../lib/axios'
import { fmtDate, errMessage } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'
import { useAuthStore } from '../../stores/auth'
import { toastOk, toastErr } from '../../lib/toast'

const auth = useAuthStore()

// Qidiruv / filtr
const search = ref('')
const statusFilter = ref('') // '' = barchasi, '1' = tasdiqlangan, '0' = tasdiqlanmagan

// Ro'yxatda JSHSHIR va to'liq telefon yo'q (maskalangan) — to'liq qiymat faqat tafsilot sahifasida, sabab bilan.
const columns = [
  { label: '№', key: '_seq' },
  { label: 'ID raqami', key: 'uid', sortable: true },
  { label: 'F.I.O', key: 'full_name', sortable: true },
  { label: 'Tug‘ilgan sanasi', key: 'brithday_fmt' },
  { label: 'Ro‘yxatdan o‘tgan sanasi', key: 'created_at_fmt' },
  { label: 'Telefon raqami', key: 'phone_view' },
  { label: 'Oferta tasdiqlangan vaqti', key: 'contract_date_fmt' },
  { label: 'Holat', key: 'is_active' },
]

const list = usePagedList(({ signal }, { page, limit }) =>
  api.get('dashboard/users/2', {
    signal,
    params: {
      page, limit,
      search: search.value.trim() || undefined,
      is_active: statusFilter.value !== '' ? Number(statusFilter.value) : undefined,
    },
  }),
)
const { page, limit, total, loading, error } = list

const rowsForTable = computed(() => {
  const start = (page.value - 1) * limit.value
  return list.rows.value.map((u, idx) => ({
    ...u,
    _seq: start + idx + 1,
    brithday_fmt: fmtDate(u?.brithday),
    created_at_fmt: fmtDate(u?.created_at),
    contract_date_fmt: fmtDate(u?.contract_date),
    phone_view: u?.phone_masked || '—',
  }))
})

const hasActiveFilter = computed(() => Boolean(search.value) || statusFilter.value !== '')

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => list.reset(), 400)
})
watch(statusFilter, () => list.reset())
onMounted(() => list.load())
onBeforeUnmount(() => clearTimeout(searchTimer))

function clearFilters() { search.value = ''; statusFilter.value = '' }

// ---- Serverdan eksport (faqat super, sabab bilan) ----
const exportOpen = ref(false)
const exporting = ref(false)
const exportError = ref('')

// Xato javobi blob bo'lib keladi — JSON xabarini ajratib olamiz.
async function blobError(e) {
  const b = e?.response?.data
  if (b instanceof Blob) {
    try { const j = JSON.parse(await b.text()); return j?.message && !/^[a-z0-9_-]+$/i.test(j.message) ? j.message : errMessage(e) } catch (_) { /* pastga */ }
  }
  return errMessage(e)
}

async function doExport(reason) {
  exporting.value = true; exportError.value = ''
  try {
    const res = await api.post('dashboard/users/export', {
      reason,
      filters: {
        search: search.value.trim() || undefined,
        is_active: statusFilter.value !== '' ? Number(statusFilter.value) : undefined,
      },
    }, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.xlsx'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportOpen.value = false
    toastOk('Eksport tayyor: users.xlsx yuklab olindi.')
  } catch (e) {
    exportError.value = await blobError(e)
    toastErr(exportError.value)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold text-slate-800">Jismoniy shaxslar</h1>

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
          aria-label="Foydalanuvchini qidirish"
          placeholder="F.I.O, telefon yoki ID bo‘yicha qidirish…"
          class="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <p v-if="auth.role === 'viewer'" class="mt-1 text-xs text-slate-600">JSHSHIR/pasport bo‘yicha faqat to‘liq qiymat bilan qidiriladi</p>
      </div>

      <select
        v-model="statusFilter"
        aria-label="Holat bo‘yicha filtr"
        class="rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:min-w-[180px]"
      >
        <option value="">Barcha holat</option>
        <option value="1">Tasdiqlangan</option>
        <option value="0">Tasdiqlanmagan</option>
      </select>

      <button
        v-if="hasActiveFilter"
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        @click="clearFilters"
      >Tozalash</button>
    </div>

    <DataTable
      :columns="columns"
      :rows="rowsForTable"
      :loading="loading"
      :error="error"
      :on-export-xlsx="auth.can('export') ? () => { exportError = ''; exportOpen = true } : null"
      :export-busy="exporting"
      empty-message="Qidiruv yoki filtr bo‘yicha foydalanuvchi topilmadi."
      @retry="list.retry()"
    >
      <template #title>
        <h2 class="text-base font-semibold text-slate-800">Barcha foydalanuvchilar ({{ total }})</h2>
      </template>

      <template #cell-uid="{ row }">
        <RouterLink :to="`/users/${row.uid}`" class="font-medium text-indigo-700 hover:underline">{{ row.uid }}</RouterLink>
      </template>

      <template #cell-is_active="{ row }">
        <span v-if="row?.is_active === 1" class="inline-flex items-center rounded border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Tasdiqlangan</span>
        <span v-else-if="row?.is_active === 0" class="inline-flex items-center rounded border border-gray-300 bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Tasdiqlanmagan</span>
        <span v-else class="text-xs text-slate-500">—</span>
      </template>
    </DataTable>

    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="list.setPage" />

    <ReasonDialog
      :open="exportOpen"
      title="Foydalanuvchilarni Excelga eksport qilish"
      message="Eksportda telefon raqamlar to‘liq, JSHSHIR maskalangan holda bo‘ladi. Amal audit jurnaliga yoziladi."
      confirm-label="Eksport qilish"
      :busy="exporting"
      :error="exportError"
      @confirm="doExport"
      @cancel="exportOpen = false"
    />
  </div>
</template>
