<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getDailyActivity } from '../../api/stats'
import { fmtNum } from '../../lib/format'
import { bestWorst, dayDelta, fmtDayLabel, pctChange } from './dailyDynamics'

const DAY_OPTIONS = [7, 14, 30]
const SKELETON_ROWS = 7
const days = ref(7)
const loading = ref(true)
const err = ref('')
const payload = ref(null)

let seq = 0 // eskirgan javoblardan himoya
let aborter = null

const fmt = fmtNum

async function load() {
  const my = ++seq
  if (aborter) aborter.abort()
  aborter = new AbortController()
  loading.value = true
  err.value = ''
  try {
    const { data } = await getDailyActivity({
      params: { days: days.value }, signal: aborter.signal,
    })
    if (my !== seq) return
    payload.value = data?.data || null
  } catch (e) {
    if (my !== seq || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return
    payload.value = null
    err.value = e?.response?.data?.message || 'Kunlik dinamikani yuklab bo‘lmadi'
  } finally {
    if (my === seq) loading.value = false
  }
}

function setDays(d) {
  if (d === days.value) return
  days.value = d
  load()
}

onMounted(load)
onBeforeUnmount(() => { seq++; if (aborter) aborter.abort() })

// Ustunlar: main = delta chip ko'rsatiladigan asosiy son, sub = faol userlar
const COLUMNS = [
  { key: 'registrations', title: 'Ro‘yxatdan o‘tganlar', main: (m) => m.registrations },
  { key: 'contracts', title: 'Shartnomalar', main: (m) => m.contracts },
  { key: 'qarz_daftari', title: 'Qarz daftari', sub: 'yangi qarzlar / faol userlar', main: (m) => m.qarz_daftari.new_debts, second: (m) => m.qarz_daftari.active_users },
  { key: 'personal_finance', title: 'Shaxsiy moliya', sub: 'yozuvlar / faol userlar', main: (m) => m.personal_finance.records, second: (m) => m.personal_finance.active_users },
  { key: 'personal_debt', title: 'Shaxsiy qarz', sub: 'yangi / faol userlar', main: (m) => m.personal_debt.new_debts, second: (m) => m.personal_debt.active_users },
  { key: 'revenue', title: 'Daromad (so‘m)', main: (m) => m.revenue.total, money: true },
]

const rows = computed(() => {
  const list = payload.value?.days || []
  return list.map((d, i) => {
    // eng yangisi birinchi => keyingi element = oldingi kun; eng eski qator uchun — oynadan oldingi kun (payload.before)
    const prev = list[i + 1] || payload.value?.before
    // 28.10: bugun (i === 0) hali tugamagan — kechaga solishtirib ▼ ko'rsatmaymiz.
    const partial = i === 0 && payload.value?.today_partial === true
    return {
      key: d.date,
      label: fmtDayLabel(d.date),
      weekday: d.weekday,
      partial,
      cells: COLUMNS.map((c) => ({
        key: c.key,
        main: c.main(d),
        second: c.second ? c.second(d) : null,
        money: !!c.money,
        delta: prev && !partial ? dayDelta(c.main(d), c.main(prev)) : null,
      })),
    }
  })
})

const totalCells = computed(() => {
  const t = payload.value?.totals
  const p = payload.value?.prev_totals
  if (!t || !p) return []
  return COLUMNS.map((c) => ({
    key: c.key,
    main: c.main(t),
    second: c.second ? c.second(t) : null,
    money: !!c.money,
    pct: pctChange(c.main(t), c.main(p)),
  }))
})

const windowDays = computed(() => (payload.value ? payload.value.days.length - (payload.value.today_partial ? 1 : 0) : days.value))
const summary = computed(() => bestWorst(payload.value?.totals, payload.value?.prev_totals))
const fmtPct = (p) => `${p > 0 ? '+' : ''}${String(p).replace('.', ',')}%`
const deltaText = (d) => (d.dir === 'up' ? `▲ +${fmt(d.diff)}` : d.dir === 'down' ? `▼ −${fmt(Math.abs(d.diff))}` : '=')
const deltaClass = (d) => (d.dir === 'up' ? 'bg-emerald-50 text-emerald-700' : d.dir === 'down' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500')
const pctClass = (p) => (p === null ? 'text-slate-500' : p > 0 ? 'text-emerald-600' : p < 0 ? 'text-rose-600' : 'text-slate-500')
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div class="min-w-0">
        <h3 class="text-base font-bold text-slate-800">Kunlik dinamika (oxirgi {{ windowDays }} kun + bugun)</h3>
        <div v-if="summary.best || summary.worst" class="mt-2 flex flex-wrap gap-2">
          <span v-if="summary.best" class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Eng kuchli yo‘nalish: {{ summary.best.label }} ({{ fmtPct(summary.best.pct) }})
          </span>
          <span v-if="summary.worst" class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Eng zaif yo‘nalish: {{ summary.worst.label }} ({{ fmtPct(summary.worst.pct) }})
          </span>
        </div>
      </div>
      <div class="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
        <button
          v-for="d in DAY_OPTIONS" :key="d" type="button"
          class="px-3 py-1.5 transition"
          :class="d === days ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
          @click="setDays(d)"
        >{{ d }} kun</button>
      </div>
    </div>

    <div v-if="err" class="flex items-center justify-between gap-3 px-5 py-6 text-sm text-rose-600">
      <span>{{ err }}</span>
      <button type="button" class="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold hover:bg-rose-50" @click="load">Qayta urinish</button>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
          <tr>
            <th class="px-4 py-3 whitespace-nowrap">Kun</th>
            <th v-for="c in COLUMNS" :key="c.key" class="px-4 py-3 text-right whitespace-nowrap">
              {{ c.title }}
              <div v-if="c.sub" class="text-[10px] font-normal text-slate-500">{{ c.sub }}</div>
            </th>
          </tr>
        </thead>
        <tbody v-if="loading && !payload" class="divide-y divide-slate-100">
          <tr v-for="i in SKELETON_ROWS" :key="i">
            <td v-for="j in COLUMNS.length + 1" :key="j" class="px-4 py-3">
              <div class="ml-auto h-4 w-16 animate-pulse rounded bg-slate-100"></div>
            </td>
          </tr>
        </tbody>
        <tbody v-else class="divide-y divide-slate-100" :class="loading ? 'opacity-60' : ''">
          <tr v-for="r in rows" :key="r.key" class="hover:bg-slate-50/60">
            <td class="px-4 py-3 whitespace-nowrap font-semibold text-slate-700">
              {{ r.label }} <span class="text-xs font-medium text-slate-500">{{ r.weekday }}</span>
              <span v-if="r.partial" class="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title="Bugungi kun hali tugamagan — jami va foizlarga kirmaydi">bugun*</span>
            </td>
            <td v-for="c in r.cells" :key="c.key" class="px-4 py-3 text-right whitespace-nowrap tabular-nums text-slate-800">
              <span class="font-semibold">{{ fmt(c.main) }}</span>
              <span v-if="c.second !== null" class="text-slate-500"> / {{ fmt(c.second) }}</span>
              <span v-if="c.delta" class="ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold" :class="deltaClass(c.delta)">{{ deltaText(c.delta) }}</span>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="totalCells.length" class="border-t-2 border-slate-200 bg-slate-50 text-slate-800">
          <tr>
            <td class="px-4 py-3 whitespace-nowrap text-xs font-bold">Jami ({{ windowDays }} to‘liq kun, bugunsiz)</td>
            <td v-for="c in totalCells" :key="c.key" class="px-4 py-3 text-right whitespace-nowrap tabular-nums">
              <span class="font-bold">{{ fmt(c.main) }}</span>
              <span v-if="c.second !== null" class="text-slate-500"> / {{ fmt(c.second) }}</span>
            </td>
          </tr>
          <tr>
            <td class="px-4 py-3 whitespace-nowrap text-xs font-bold">Oldingi {{ windowDays }} kunga nisbatan</td>
            <td v-for="c in totalCells" :key="c.key" class="px-4 py-3 text-right whitespace-nowrap text-xs font-bold tabular-nums" :class="pctClass(c.pct)">
              {{ c.pct === null ? '—' : fmtPct(c.pct) }}
            </td>
          </tr>
        </tfoot>
      </table>
      <p class="px-5 py-3 text-[11px] text-slate-500">
        * Bugun hali tugamagan: kunlik o‘zgarish chipi, “Jami” va foizlarga kirmaydi. “Faol userlar” jami qatorida kunlik noyob userlar yig‘indisi (user-kun).
      </p>
    </div>
  </div>
</template>
