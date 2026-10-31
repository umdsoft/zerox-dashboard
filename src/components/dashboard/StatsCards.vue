<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { fmtNum, fmtCompact } from '../../lib/format'

const props = defineProps({
  overview: { type: Object, required: true },
})

const router = useRouter()

const fmtN = (v) => fmtNum(v ?? 0)

// Pulni qisqartirilgan ko'rinishda — ming / mln / mlrd (masalan: 164,6 ming UZS)
const fmtMoneyCompact = (v) => `${fmtCompact(v)} UZS`

// Har bir karta 2 ta ko'rsatkich: asosiy son + "bu oyda" sub-qiymat.
// Backend `/dashboard/statistic` 8 ta qiymatni qaytaradi (4 ta juftlik).
const topStats = computed(() => ([
  {
    key: 'users_registered',
    label: "Ro'yxatdan o'tgan foydalanuvchilar",
    value: fmtN(props.overview.usersRegistered),
    sub: `Bu oyda: ${fmtN(props.overview.usersRegisteredThisMonth)}`,
    icon: 'users',
    tint: 'bg-sky-100 text-sky-600',
  },
  {
    key: 'users_active',
    label: 'Aktiv foydalanuvchilar',
    value: fmtN(props.overview.usersActive),
    sub: `Bu oyda: ${fmtN(props.overview.usersActiveThisMonth)}`,
    icon: 'users',
    tint: 'bg-emerald-100 text-emerald-600',
  },
  {
    key: 'contracts_total',
    label: 'Shartnomalar',
    value: fmtN(props.overview.contractsTotal),
    sub: `Bu oyda: ${fmtN(props.overview.contractsThisMonth)}`,
    icon: 'file-invoice',
    tint: 'bg-indigo-100 text-indigo-600',
  },
  {
    key: 'revenue_total',
    label: 'Jami tushum',
    value: fmtMoneyCompact(props.overview.revenueTotal),
    sub: `Bu oyda: ${fmtMoneyCompact(props.overview.revenueThisMonth)}`,
    icon: 'wallet',
    tint: 'bg-amber-100 text-amber-600',
  },
]))
</script>

<template>
  <!-- 4 top stats — har biri: asosiy son + "bu oyda" sub-qiymat -->
  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
    <component
      :is="s.key === 'revenue_total' ? 'button' : 'div'"
      v-for="s in topStats"
      :key="s.key"
      :type="s.key === 'revenue_total' ? 'button' : undefined"
      class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition"
      :class="s.key === 'revenue_total' ? 'cursor-pointer hover:border-amber-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500' : ''"
      :title="s.key === 'revenue_total' ? 'Kimlar hissa qo‘shganini ko‘rish' : undefined"
      @click="s.key === 'revenue_total' && router.push({ name: 'stats-revenue' })"
    >
      <div :class="['h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.tint]">
        <fa :icon="s.icon" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] tracking-wide text-slate-500 font-semibold">{{ s.label }}</div>
        <div class="mt-1 text-2xl font-bold text-slate-800 truncate">{{ s.value }}</div>
        <div class="mt-1 text-xs font-medium text-slate-500 truncate">{{ s.sub }}</div>
        <div v-if="s.key === 'revenue_total'" class="mt-1 text-[11px] font-semibold text-amber-600">Ro‘yxatni ko‘rish →</div>
      </div>
    </component>
  </div>
</template>
