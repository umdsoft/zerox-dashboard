<script setup>
import { reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import DataTable from '../../components/ui/DataTable.vue'
import PagerBar from '../../components/ui/PagerBar.vue'
import api from '../../lib/axios'
import { fmtDateTime } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'

// Audit jurnali (faqat super admin): kim, qachon, qaysi amalni bajargan
// Standart oraliq aniq ko'rsatiladi: so'nggi 7 kun (backend ham shunday qiladi).
const DAY_MS = 24 * 3600 * 1000
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d)
const defaultFrom = () => ymd(new Date(Date.now() - 7 * DAY_MS))
const defaultTo = () => ymd(new Date())
const filters = reactive({ actor_id: '', action: '', object_id: '', from: defaultFrom(), to: defaultTo() })

const list = usePagedList(({ signal }, { page, limit }) => {
  const params = { page, limit }
  for (const k of ['actor_id', 'action', 'object_id']) if (String(filters[k]).trim()) params[k] = String(filters[k]).trim()
  // 'to' kun oxirigacha (aks holda tanlangan kun jurnaldan tushib qoladi)
  if (filters.from) params.from = `${filters.from}T00:00:00`
  if (filters.to) params.to = `${filters.to}T23:59:59`
  return api.get('/dashboard/audit-logs', { signal, params })
}, { limit: 20 })
const { page, limit, total, loading, error } = list

const columns = [
  { label: 'Vaqt', key: 'ts_fmt', sortable: true },
  { label: 'Admin', key: 'actor' , sortable: true },
  { label: 'Amal', key: 'action', sortable: true },
  { label: 'Obyekt ID', key: 'object_id' },
  { label: 'Parametrlar', key: 'query_view' },
  { label: 'IP', key: 'ip' },
]

// Backend qatori: ts, actor_user_id, actor_role, actor_ip, action, route, method, status_code, object_id, payload_json
const payloadText = (p) => {
  if (p == null || p === '') return '—'
  if (typeof p === 'string') return p
  return Object.keys(p).length ? JSON.stringify(p) : '—'
}
const rows = computed(() => list.rows.value.map((r) => {
  const actorId = r.actor_user_id ?? r.actor_id
  return {
    ...r,
    ts_fmt: fmtDateTime(r.ts ?? r.created_at, { empty: '—', seconds: true }),
    actor: actorId != null ? `#${actorId}${r.actor_role ? ` (${r.actor_role})` : ''}` : '—',
    action: [r.action, r.status_code ? `[${r.status_code}]` : ''].filter(Boolean).join(' ') || '—',
    object_id: r.object_id ?? '—',
    ip: r.actor_ip ?? r.ip ?? '—',
    query_view: payloadText(r.payload_json ?? r.query),
  }
}))

let timer = null
// Matn filtrlari kechiktiriladi (debounce); sana filtrlari darhol qo'llanadi
watch(() => [filters.actor_id, filters.action, filters.object_id], () => {
  clearTimeout(timer); timer = setTimeout(() => list.reset(), 400)
})
watch(() => [filters.from, filters.to], () => { clearTimeout(timer); list.reset() })
onMounted(() => list.load())
onBeforeUnmount(() => clearTimeout(timer))

function clearFilters() {
  Object.assign(filters, { actor_id: '', action: '', object_id: '', from: defaultFrom(), to: defaultTo() })
}
const hasFilter = computed(() =>
  ['actor_id', 'action', 'object_id'].some((k) => String(filters[k]).trim())
  || filters.from !== defaultFrom() || filters.to !== defaultTo())

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200'
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-800">Audit jurnali</h1>
      <p class="text-sm text-slate-600">Admin panelda bajarilgan amallar tarixi. Standart oraliq — so‘nggi 7 kun.</p>
    </div>

    <form class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-6" @submit.prevent="list.reset()">
      <label class="text-sm text-slate-700">Admin ID
        <input v-model="filters.actor_id" inputmode="numeric" :class="inputCls" />
      </label>
      <label class="text-sm text-slate-700">Amal
        <input v-model="filters.action" placeholder="masalan: POST /dashboard/…" :class="inputCls" />
      </label>
      <label class="text-sm text-slate-700">Obyekt ID
        <input v-model="filters.object_id" :class="inputCls" />
      </label>
      <label class="text-sm text-slate-700">Dan
        <input v-model="filters.from" type="date" :class="inputCls" />
      </label>
      <label class="text-sm text-slate-700">Gacha
        <input v-model="filters.to" type="date" :class="inputCls" />
      </label>
      <div class="flex items-end">
        <button v-if="hasFilter" type="button" class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="clearFilters">Tozalash</button>
      </div>
    </form>

    <DataTable :columns="columns" :rows="rows" :loading="loading" :error="error" empty-message="Yozuv topilmadi." @retry="list.retry()">
      <template #title><h2 class="text-base font-semibold text-slate-800">Yozuvlar ({{ total }})</h2></template>
      <template #cell-query_view="{ row }">
        <span class="block max-w-xs truncate font-mono text-xs text-slate-600" :title="row.query_view">{{ row.query_view }}</span>
      </template>
    </DataTable>

    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="list.setPage" />
  </div>
</template>
