<script setup>
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import { useRequest } from '../../composables/useRequest'
import { fmtNum, fmtDate as fmtDateF, fmtDateTime } from '../../lib/format'

const data = ref(null)

const fmt = fmtNum
// SS1: "Yurituvchilar" soniга bosilganda — pastdagi ro‘yxatga silliq skroll.
const scrollToUsers = () => {
  const el = document.getElementById('pd-users-table')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const typeLabel = (t) => (t === 'borrowed' ? 'Olingan' : t === 'lent' ? 'Berilgan' : t || '—')
const statusLabel = (s) => ({ active: 'Faol', completed: 'Yakunlangan', overdue: 'Muddati o‘tgan', cancelled: 'Bekor qilingan' }[s] || s || '—')

const req = useRequest(
  ({ signal }) => api.get('/dashboard/stats/personal-debt', { signal }),
  { onSuccess: (res) => { data.value = res?.data?.data || res?.data || null } },
)
const loading = req.loading
const err = req.error
const load = () => req.run()
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Shaxsiy qarz — statistika</h1>
        <p class="text-sm text-slate-500">Foydalanuvchilar shaxsiy qarz daftaridan qanday foydalanmoqda (agregat).</p>
      </div>
      <button type="button" class="px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60" :disabled="loading" @click="load">Yangilash</button>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm py-8 text-center">Yuklanmoqda…</div>
    <div v-else-if="err" class="flex flex-wrap items-center justify-center gap-3 py-8 text-sm text-rose-700" role="alert"><span>{{ err }}</span><button type="button" class="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-medium hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" @click="req.retry()">Qayta urinish</button></div>

    <template v-else-if="data">
      <!-- Umumiy kartalar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Jami qarzlar</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.total) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition"
             @click="scrollToUsers" title="Ro‘yxatni ko‘rish">
          <p class="text-sm text-slate-500">Yurituvchilar (foydalanuvchilar)</p>
          <p class="mt-1 text-2xl font-semibold text-indigo-600">{{ fmt(data.users_using) }}</p>
          <p class="mt-1 text-[11px] font-semibold text-indigo-600">Ro‘yxatni ko‘rish →</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Holat kesimida</p>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span v-for="s in data.by_status" :key="s.status" class="text-slate-700">
              {{ statusLabel(s.status) }}: <b>{{ fmt(s.count) }}</b>
            </span>
          </div>
        </div>
      </div>

      <!-- Valyuta + tur kesimida summa -->
      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">Valyuta va tur kesimida</div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">Valyuta</th>
                <th class="px-4 py-3">Tur</th>
                <th class="px-4 py-3 text-right">Soni</th>
                <th class="px-4 py-3 text-right">Jami summa</th>
                <th class="px-4 py-3 text-right">Qoldiq</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in data.by_currency" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">{{ r.currency }}</td>
                <td class="px-4 py-3">{{ typeLabel(r.type) }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(r.count) }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ fmt(r.total_amount) }}</td>
                <td class="px-4 py-3 text-right text-rose-600">{{ fmt(r.total_remaining) }}</td>
              </tr>
              <tr v-if="!data.by_currency?.length"><td colspan="5" class="px-4 py-6 text-center text-slate-500">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SS-C: Berilgan qarzlar oqimi (valyuta kesimida) -->
      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
          Berilgan qarzlar oqimi (valyuta kesimida)
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">Valyuta</th>
                <th class="px-4 py-3 text-right">Qaytarilgan</th>
                <th class="px-4 py-3 text-right">Kechirilgan (voz kechildi)</th>
                <th class="px-4 py-3 text-right">Kechirilgan soni</th>
                <th class="px-4 py-3 text-right">O‘z vaqtida qaytarilgan %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in data.lent_flow" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">{{ r.currency }}</td>
                <td class="px-4 py-3 text-right font-semibold text-emerald-600">{{ fmt(r.repaid) }}</td>
                <td class="px-4 py-3 text-right text-amber-600">{{ fmt(r.forgiven_amount) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ fmt(r.forgiven_count) }}</td>
                <td class="px-4 py-3 text-right">
                  <span v-if="r.on_time_percent !== null" class="font-semibold"
                        :class="r.on_time_percent >= 70 ? 'text-emerald-600' : 'text-rose-600'">{{ r.on_time_percent }}%</span>
                  <span v-else class="text-slate-500">—</span>
                </td>
              </tr>
              <tr v-if="!data.lent_flow?.length"><td colspan="5" class="px-4 py-6 text-center text-slate-500">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SS-C: Hududlar bo‘yicha (qarz yurituvchilar) -->
      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">Hududlar bo‘yicha</div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">Hudud</th>
                <th class="px-4 py-3 text-right">Yurituvchilar</th>
                <th class="px-4 py-3 text-right">Qarzlar soni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in data.by_region" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{{ r.region }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(r.user_count) }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(r.debt_count) }}</td>
              </tr>
              <tr v-if="!data.by_region?.length"><td colspan="3" class="px-4 py-6 text-center text-slate-500">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Kimlar yuritmoqda (foydalanuvchi darajasidagi agregat) -->
      <div id="pd-users-table" class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
          Kimlar yuritmoqda ({{ fmt(data.users?.length || 0) }})
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">#</th>
                <th class="px-4 py-3">F.I.O</th>
                <th class="px-4 py-3">Telefon</th>
                <th class="px-4 py-3 text-right">Qarzlar soni</th>
                <th class="px-4 py-3 text-right">Jami summa</th>
                <th class="px-4 py-3 text-right">Faol qoldiq</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(u, i) in data.users" :key="u.id" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ u.fio }}</td>
                <td class="px-4 py-3 font-mono">{{ u.phone_masked || u.phone }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(u.debt_count) }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ fmt(u.total_amount) }}</td>
                <td class="px-4 py-3 text-right text-rose-600">{{ fmt(u.active_remaining) }}</td>
              </tr>
              <tr v-if="!data.users?.length"><td colspan="6" class="px-4 py-6 text-center text-slate-500">Qarz kiritган foydalanuvchi yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
