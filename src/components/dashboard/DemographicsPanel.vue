<script setup>
import { computed } from 'vue'
import { fmtNum } from '../../lib/format'
import { toEntries } from '../../lib/dashboardStats'

const props = defineProps({
  region: { type: Object, required: true },
  age: { type: Object, required: true },
  gender: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['retry'])

const fmtN = (v) => fmtNum(v ?? 0)

// Hududlar — kamayish tartibida (reyting); yosh va jins tabiiy tartibida.
const regionEntries = computed(() => toEntries(props.region, { sortDesc: true }))
const ageEntries = computed(() => toEntries(props.age))
const genderEntries = computed(() => toEntries(props.gender))

const sumOf = (entries) => entries.reduce((s, e) => s + e.value, 0)

const sections = computed(() => [
  { key: 'region', title: 'Hududlar kesimida (reyting)', total: sumOf(regionEntries.value), entries: regionEntries.value },
  { key: 'age', title: 'Yosh kesimida', total: sumOf(ageEntries.value), entries: ageEntries.value },
  { key: 'gender', title: 'Jins kesimida', total: sumOf(genderEntries.value), entries: genderEntries.value },
])
</script>

<template>
  <!-- 3 ma'lumot bloklari (diagrammasiz, reyting ko'rinishida) -->
  <div class="grid gap-6 xl:grid-cols-3">
    <div v-for="sec in sections" :key="sec.key" class="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-base font-semibold text-slate-800">{{ sec.title }}</h3>
        <span class="text-xs font-semibold text-slate-500">Jami: {{ fmtN(sec.total) }}</span>
      </div>

      <div class="mt-4 rounded-2xl border border-slate-100 bg-white/70 p-4">
        <h4 class="text-sm font-semibold text-slate-700">Maʼlumotlar</h4>

        <div v-if="loading" class="mt-3 text-sm text-slate-500">Yuklanmoqda…</div>
        <div v-else-if="error" class="mt-3 text-sm text-rose-600" role="alert">{{ error }} <button type="button" class="ml-2 underline" @click="emit('retry')">Qayta urinish</button></div>

        <ul v-else-if="sec.entries.length" class="mt-3 divide-y divide-slate-100 text-sm">
          <li v-for="e in sec.entries" :key="e.label" class="flex items-center justify-between gap-3 py-1.5">
            <span class="flex items-center gap-2 text-slate-700 min-w-0">
              <span class="inline-block h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: e.color }"></span>
              <span class="truncate">{{ e.label }}</span>
            </span>
            <span class="font-semibold text-slate-900 tabular-nums shrink-0">{{ fmtN(e.value) }}</span>
          </li>
        </ul>

        <div v-else class="mt-3 text-sm text-slate-500">Ma’lumot mavjud emas</div>
      </div>
    </div>
  </div>
</template>
