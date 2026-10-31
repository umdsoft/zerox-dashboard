<script setup>
import { ref, onMounted } from 'vue'
import { getPersonalFinance } from '../../api/stats'
import { useRequest } from '../../composables/useRequest'
import { fmtNum, fmtDate as fmtDateF, fmtDateTime } from '../../lib/format'

const data = ref(null)

const fmt = fmtNum
const fmtDate = (d) => fmtDateTime(d, { empty: '—' })
const scrollToUsers = () => {
  const el = document.getElementById('pf-users-table')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const gapStatusLabel = (s) => ({ draft: 'Qoralama', active: 'Faol', completed: 'Yakunlangan' }[s] || s || '—')

const req = useRequest(
  ({ signal }) => getPersonalFinance({ signal }),
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
        <h1 class="text-2xl font-semibold text-slate-800">Shaxsiy moliya — statistika</h1>
        <p class="text-sm text-slate-500">Faqat agregat ko‘rsatkichlar. Individual shaxsiy moliya ma‘lumotlari ko‘rsatilmaydi (maxfiylik).</p>
      </div>
      <button type="button" class="px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60" :disabled="loading" @click="load">Yangilash</button>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm py-8 text-center">Yuklanmoqda…</div>
    <div v-else-if="err" class="flex flex-wrap items-center justify-center gap-3 py-8 text-sm text-rose-700" role="alert"><span>{{ err }}</span><button type="button" class="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-medium hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" @click="req.retry()">Qayta urinish</button></div>

    <template v-else-if="data">
      <!-- Foydalanuvchi kartalari -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition"
             @click="scrollToUsers" title="Ro‘yxatni ko‘rish">
          <p class="text-sm text-slate-500">Moliyani yurituvchilar</p>
          <p class="mt-1 text-2xl font-semibold text-indigo-600">{{ fmt(data.users_using) }}</p>
          <p class="mt-1 text-[11px] font-semibold text-indigo-600">Ro‘yxatni ko‘rish →</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Xarajat kirituvchilar</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.expense_users) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Daromad kirituvchilar</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.income_users) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Byudjet / Maqsad (user)</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.budget_users) }} / {{ fmt(data.goal_users) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Xarajatlar (valyuta kesimida) -->
        <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">Xarajatlar (valyuta kesimida)</div>
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr><th class="px-4 py-3">Valyuta</th><th class="px-4 py-3 text-right">Soni</th><th class="px-4 py-3 text-right">Jami</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in data.expenses_by_currency" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">{{ r.currency }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(r.count) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-rose-600">{{ fmt(r.total) }}</td>
              </tr>
              <tr v-if="!data.expenses_by_currency?.length"><td colspan="3" class="px-4 py-6 text-center text-slate-500">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
        <!-- Daromadlar (valyuta kesimida) -->
        <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">Daromadlar (valyuta kesimida)</div>
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr><th class="px-4 py-3">Valyuta</th><th class="px-4 py-3 text-right">Soni</th><th class="px-4 py-3 text-right">Jami</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in data.incomes_by_currency" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">{{ r.currency }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(r.count) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-emerald-600">{{ fmt(r.total) }}</td>
              </tr>
              <tr v-if="!data.incomes_by_currency?.length"><td colspan="3" class="px-4 py-6 text-center text-slate-500">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Byudjet + Maqsad agregat -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Byudjetlar (jami)</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.budgets_total) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Maqsadlar (jami)</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.goals_total) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Maqsadlarga yig‘ilgan / maqsad</p>
          <p class="mt-1 text-lg font-semibold text-slate-800">{{ fmt(data.goals_saved_sum) }} / {{ fmt(data.goals_target_sum) }}</p>
        </div>
      </div>

      <!-- SS-D: Gap + Rejalashtirilgan kartalar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Gaplar (jami)</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.gaps_total) }}</p>
          <p class="mt-1 text-[11px] text-slate-500">Faol a‘zolar: <b>{{ fmt(data.gap_members_total) }}</b></p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Rejalashtirilgan to‘lovlar (yurituvchilar / jami)</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.planned_payment_managers) }} / {{ fmt(data.planned_payments_total) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Rejalashtirilgan daromadlar (yurituvchilar / jami)</p>
          <p class="mt-1 text-2xl font-semibold text-slate-800">{{ fmt(data.planned_income_managers) }} / {{ fmt(data.planned_incomes_total) }}</p>
        </div>
      </div>

      <!-- SS-D: Gaplar ro‘yxati -->
      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
          Gaplar ({{ fmt(data.gaps_list?.length || 0) }})
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">#</th>
                <th class="px-4 py-3">Nomi</th>
                <th class="px-4 py-3">Tashkilotchi</th>
                <th class="px-4 py-3 text-right">Summa</th>
                <th class="px-4 py-3 text-right">A‘zolar soni</th>
                <th class="px-4 py-3">Holat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(g, i) in data.gaps_list" :key="g.id" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ g.name }}</td>
                <td class="px-4 py-3">{{ g.organizer }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ fmt(g.amount) }} <span class="text-xs text-slate-500">{{ g.currency }}</span></td>
                <td class="px-4 py-3 text-right">{{ fmt(g.member_count) }}</td>
                <td class="px-4 py-3 text-slate-600">{{ gapStatusLabel(g.status) }}</td>
              </tr>
              <tr v-if="!data.gaps_list?.length"><td colspan="6" class="px-4 py-6 text-center text-slate-500">Gap yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SS-D: Hududlar bo‘yicha (moliya yurituvchilar soni) -->
      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
          Hududlar bo‘yicha <span class="text-xs font-normal text-slate-500">— moliya yurituvchilar soni</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">Hudud</th>
                <th class="px-4 py-3 text-right">Yurituvchilar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in data.by_region" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{{ r.region }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(r.user_count) }}</td>
              </tr>
              <tr v-if="!data.by_region?.length"><td colspan="2" class="px-4 py-6 text-center text-slate-500">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SS2: Kimlar yuritmoqda — FAQAT metama'lumot (yozuvlar soni + oxirgi faollik), summalarsiz -->
      <div id="pf-users-table" class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
          Kimlar yuritmoqda ({{ fmt(data.users?.length || 0) }})
          <span class="text-xs font-normal text-slate-500">— summalar ko‘rsatilmaydi (maxfiylik)</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">#</th>
                <th class="px-4 py-3">F.I.O</th>
                <th class="px-4 py-3">Telefon</th>
                <th class="px-4 py-3 text-right">Xarajat</th>
                <th class="px-4 py-3 text-right">Daromad</th>
                <th class="px-4 py-3 text-right">Byudjet / Maqsad</th>
                <th class="px-4 py-3 text-right">Oxirgi faollik</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(u, i) in data.users" :key="i" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-slate-500">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ u.fio }}</td>
                <td class="px-4 py-3 font-mono">{{ u.phone_masked || u.phone }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(u.expense_count) }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(u.income_count) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ fmt(u.budget_count) }} / {{ fmt(u.goal_count) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ fmtDate(u.last_activity) }}</td>
              </tr>
              <tr v-if="!data.users?.length"><td colspan="7" class="px-4 py-6 text-center text-slate-500">Moliya yurituvchi foydalanuvchi yo‘q</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
