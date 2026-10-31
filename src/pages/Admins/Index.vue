<script setup>
import { computed, onMounted, ref } from 'vue'
import DataTable from '../../components/ui/DataTable.vue'
import PagerBar from '../../components/ui/PagerBar.vue'
import api from '../../lib/axios'
import { errMessage } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'
import { useAuthStore, ROLE_LABELS } from '../../stores/auth'
import { toastOk, toastErr } from '../../lib/toast'

// Adminlar va rollari (faqat super admin)
const auth = useAuthStore()
const list = usePagedList(({ signal }, { page, limit }) => api.get('/dashboard/admins', { signal, params: { page, limit } }), { limit: 20 })
const { page, limit, total, loading, error } = list

const ROLE_HINTS = {
  viewer: 'Faqat ko‘rish (ma’lumotlar maskalangan)',
  operator: 'Ko‘rish + shaxsiy ma’lumotni ochish + yangiliklar',
  super: 'Hamma amallar',
}
const columns = [
  { label: 'ID', key: 'id', sortable: true },
  { label: 'F.I.O', key: 'fio', sortable: true },
  { label: 'Telefon', key: 'phone_view' },
  { label: 'Rol', key: 'admin_role' },
]
const rows = computed(() => list.rows.value.map((a) => ({ ...a, phone_view: a.phone_masked || '—' })))

const saving = ref(null) // o'zgartirilayotgan admin id
async function changeRole(row, next) {
  const prev = row.admin_role
  if (next === prev) return
  const who = row.fio || `#${row.id}`
  if (!window.confirm(`${who} rolini "${ROLE_LABELS[prev] || prev}" dan "${ROLE_LABELS[next]}" ga o‘zgartirasizmi?`)) {
    await list.load() // select qiymatini asl holatga qaytaradi
    return
  }
  saving.value = row.id
  try {
    await api.patch(`/dashboard/admins/${row.id}/role`, { admin_role: next })
    toastOk('Rol yangilandi.')
  } catch (e) {
    // masalan: oxirgi super adminni pasaytirib bo'lmaydi — backend xabarini ko'rsatamiz
    toastErr(errMessage(e, 'Rolni o‘zgartirib bo‘lmadi.'))
  } finally {
    saving.value = null
    await list.load()
    if (row.id === auth.user?.id) auth.fetchMe().catch(() => {})
  }
}
onMounted(() => list.load())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-800">Adminlar</h1>
      <p class="text-sm text-slate-600">Rol bo‘yicha ruxsatlar: kuzatuvchi — ko‘rish; operator — ko‘rish va shaxsiy ma’lumotni ochish; super — hamma amallar.</p>
    </div>

    <DataTable :columns="columns" :rows="rows" :loading="loading" :error="error" empty-message="Admin topilmadi." @retry="list.retry()">
      <template #title><h2 class="text-base font-semibold text-slate-800">Adminlar ({{ total }})</h2></template>
      <template #cell-admin_role="{ row }">
        <label class="sr-only" :for="`role-${row.id}`">{{ row.fio || row.id }} roli</label>
        <select
          :id="`role-${row.id}`"
          :value="row.admin_role"
          :disabled="saving === row.id"
          :title="ROLE_HINTS[row.admin_role]"
          class="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
          @change="changeRole(row, $event.target.value)"
        >
          <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </template>
    </DataTable>

    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="list.setPage" />
  </div>
</template>
