<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../lib/axios'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'
import StateBlock from '../../components/ui/StateBlock.vue'
import PagerBar from '../../components/ui/PagerBar.vue'

const route = useRoute()

// Server vaqti (HH:mm) berilsa — sana qismi + shu vaqt; aks holda Toshkent vaqtida created_at
function fmtLogin(created, time) {
  if (!created && !time) return ''
  if (time) return `${fmtDate(created)} ${String(time).slice(0, 5)}`.trim()
  return fmtDateTime(created)
}

function mapRow(it) {
  return {
    ip: it.ip_address ?? it.ip ?? it.ipaddr ?? '—',
    region: it.region ?? it.location ?? it.city ?? '—',
    device: it.device ?? it.ua ?? it.user_agent ?? '—',
    created_at_fmt: fmtLogin(it.created_at ?? it.date ?? it.time_at, it.time ?? it.login_time ?? null),
  }
}

const list = usePagedList(
  ({ signal }, { page, limit }) => api.get(`/user/archive/${route.params.id}`, { signal, params: { page, limit } }),
  { map: mapRow },
)
const { rows, page, limit, total, loading, error } = list

onMounted(() => list.load())
watch(() => route.params.id, () => list.reset())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Tizimga kirishlar arxivi</h1>
        <p class="text-sm text-slate-600">Foydalanuvchining login faoliyati.</p>
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-600">
        Sahifadagi ma’lumotlar:
        <select class="rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" :value="limit" @change="list.setLimit(Number($event.target.value))">
          <option v-for="n in [10, 20, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr class="text-left text-xs font-semibold text-slate-600">
              <th scope="col" class="px-4 py-3">IP manzil</th>
              <th scope="col" class="px-4 py-3">Hudud</th>
              <th scope="col" class="px-4 py-3">Kirilgan qurilma</th>
              <th scope="col" class="px-4 py-3">Kirish vaqti</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-if="loading || error || !rows.length">
              <td colspan="4" class="p-3">
                <StateBlock :loading="loading" :error="error" :empty="!loading && !error" empty-text="Ma’lumot topilmadi" @retry="list.retry()" />
              </td>
            </tr>
            <template v-else>
              <tr v-for="(row, i) in rows" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-mono">{{ row.ip }}</td>
                <td class="px-4 py-3">{{ row.region }}</td>
                <td class="px-4 py-3">{{ row.device }}</td>
                <td class="px-4 py-3">{{ row.created_at_fmt }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="list.setPage" />
  </div>
</template>
