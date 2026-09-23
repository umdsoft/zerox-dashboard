<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../lib/axios'

const loading = ref(false)
const err = ref('')
const data = ref(null)
const q = ref('')

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n || 0))
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  const p = (x) => String(x).padStart(2, '0')
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}`
}

const filtered = computed(() => {
  const list = data.value?.users || []
  const s = q.value.trim().toLowerCase()
  if (!s) return list
  return list.filter((u) => (u.fio || '').toLowerCase().includes(s) || (u.phone || '').includes(s))
})

async function load() {
  loading.value = true; err.value = ''
  try {
    const res = await api.get('/dashboard/stats/revenue-contributors')
    data.value = res?.data?.data || res?.data || null
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Ma‘lumotlarni yuklashda xatolik.'
  } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Jami tushum — hissa qo‘shganlar</h1>
        <p class="text-sm text-slate-500">Platforma tushumiga kim qancha to‘lagan (to‘lovlar tarixi bo‘yicha).</p>
      </div>
      <button class="px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50" @click="load">Yangilash</button>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm py-8 text-center">Yuklanmoqda…</div>
    <div v-else-if="err" class="text-rose-600 text-sm py-8 text-center">{{ err }}</div>

    <template v-else-if="data">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Jami tushum</p>
          <p class="mt-1 text-2xl font-semibold text-amber-600">{{ fmt(data.total) }} <span class="text-base text-slate-400">UZS</span></p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">To‘lovlar soni</p>
          <p class="mt-1 text-2xl font-semibold text-indigo-600">{{ fmt(data.payments_count) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">To‘lov qilgan foydalanuvchilar</p>
          <p class="mt-1 text-2xl font-semibold text-emerald-600">{{ fmt(data.payers_count) }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <span class="text-sm font-semibold text-slate-700">Foydalanuvchilar ({{ fmt(filtered.length) }})</span>
          <input v-model="q" type="text" placeholder="F.I.O yoki telefon…" class="border rounded-lg px-3 py-1.5 text-sm w-56 outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">#</th>
                <th class="px-4 py-3">F.I.O</th>
                <th class="px-4 py-3">Telefon</th>
                <th class="px-4 py-3 text-right">To‘lovlar</th>
                <th class="px-4 py-3 text-right">Jami (UZS)</th>
                <th class="px-4 py-3 text-right">Oxirgi to‘lov</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(u, i) in filtered" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ u.fio }}</td>
                <td class="px-4 py-3 font-mono">{{ u.phone }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ fmt(u.pay_count) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-amber-600">{{ fmt(u.total) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ fmtDate(u.last_paid) }}</td>
              </tr>
              <tr v-if="!filtered.length"><td colspan="6" class="px-4 py-6 text-center text-slate-400">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
