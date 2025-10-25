<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import api from '../../lib/axios'

// ====== CHART.JS (faqat front mock) ======
import {
  Chart,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Filler,
  PieController, ArcElement, Legend
} from 'chart.js'
Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
  PieController,
  ArcElement,
  Legend
)

// ---------- STATIK TOP STATS ----------
const topStats = ref([
  { key: 'users_total',     label: 'Foydalanuvchilar',     value: '12',             icon: 'users',           tint: 'bg-sky-100 text-sky-600' },
  { key: 'month_revenue',   label: 'Tushumlar',            value: '84 930 000 UZS', icon: 'wallet',          tint: 'bg-emerald-100 text-emerald-600' },
  { key: 'contracts_total', label: 'Shartnomalar',         value: '34',             icon: 'file-invoice',  tint: 'bg-indigo-100 text-indigo-600' },
  { key: 'contracts_today', label: 'Bugungi shartnomalar', value: '0',              icon: 'calendar-days',    tint: 'bg-amber-100 text-amber-600' },
])

// ---------- STATIK CHART MA’LUMOTI ----------
const chartCanvas = ref(null)
let chartInstance = null

const regionChartCanvas = ref(null)
const ageChartCanvas = ref(null)
const genderChartCanvas = ref(null)

let regionChartInstance = null
let ageChartInstance = null
let genderChartInstance = null

const regionChartData = ref({ labels: [], values: [] })
const ageChartData = ref({ labels: [], values: [] })
const genderChartData = ref({ labels: [], values: [] })

const pieLoading = ref(false)
const pieError = ref('')

const numberFormatter = new Intl.NumberFormat('ru-RU')
const formatNumber = (value) => numberFormatter.format(value ?? 0)

const chartLabels = [
  '08:00','09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00','19:00'
]
const chartData = [
  1200000, 800000, 2500000, 3100000, 1000000, 1800000,
  2100000, 1700000, 2900000, 3400000, 2200000, 1600000
]

function drawChart() {
  const ctx = chartCanvas.value?.getContext('2d')
  if (!ctx) return
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Bugungi tushum',
        data: chartData,
        borderWidth: 2,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { intersect: false } },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: (v) => new Intl.NumberFormat('ru-RU').format(v) } }
      }
    }
  })
}

const piePalette = ['#0ea5e9', '#22d3ee', '#6366f1', '#a855f7', '#f472b6', '#f97316', '#facc15', '#34d399', '#14b8a6', '#fb7185']

function getPieColors(count) {
  if (count <= piePalette.length) {
    return piePalette.slice(0, count)
  }
  const colors = []
  for (let i = 0; i < count; i += 1) {
    colors.push(piePalette[i % piePalette.length])
  }
  return colors
}

function drawPieChart(canvasRef, dataset, currentInstance) {
  if (currentInstance) {
    currentInstance.destroy()
  }
  const canvas = canvasRef.value
  if (!canvas || !dataset.values.length) {
    return null
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  const colors = getPieColors(dataset.values.length)
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: dataset.labels,
      datasets: [
        {
          data: dataset.values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      layout: { padding: 10 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 10,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const datasetValues = context.chart.data.datasets[0]?.data ?? []
              const total = datasetValues.reduce((sum, value) => sum + (Number(value) || 0), 0)
              const currentValue = Number(context.parsed) || 0
              const percentage = total ? ((currentValue / total) * 100).toFixed(1) : '0.0'
              const formattedValue = formatNumber(currentValue)
              return `${context.label}: ${formattedValue} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

function parseNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.data)) {
      return value.data
    }
    return Object.values(value)
  }
  return []
}

function pickFirst(obj, keys) {
  for (const key of keys) {
    if (key.includes('.')) {
      const [first, second] = key.split('.')
      if (obj?.[first]?.[second] !== undefined) {
        return obj[first][second]
      }
    } else if (Object.prototype.hasOwnProperty.call(obj ?? {}, key)) {
      return obj[key]
    }
  }
  return undefined
}

function resolveLabel(value) {
  if (value == null) {
    return 'Nomaʼlum'
  }
  if (typeof value === 'object') {
    if (typeof value.name === 'string' && value.name.trim()) {
      return value.name
    }
    if (typeof value.title === 'string' && value.title.trim()) {
      return value.title
    }
    return 'Nomaʼlum'
  }
  const label = String(value).trim()
  return label || 'Nomaʼlum'
}

async function loadStatisticPies() {
  pieLoading.value = true
  pieError.value = ''

  const resetData = () => {
    regionChartData.value = { labels: [], values: [] }
    ageChartData.value = { labels: [], values: [] }
    genderChartData.value = { labels: [], values: [] }
  }

  try {
    const { data } = await api.get('/dashboard/statistic')
    const payload = data?.data ?? data ?? {}

    const regions = ensureArray(
      payload.byRegion ??
        payload.region ??
        payload.regions ??
        payload.regionStats ??
        payload.region_statistics ??
        payload.regionStatistics ??
        payload.region_distribution
    )
    regionChartData.value = {
      labels: regions.map((item) => {
        const raw = pickFirst(item, ['region', 'region_name', 'name', 'label', 'title', 'region.title', 'region.name'])
        return resolveLabel(raw)
      }),
      values: regions.map((item) => parseNumber(pickFirst(item, ['cnt', 'count', 'value', 'total', 'amount', 'sum'])))
    }

    const ages = ensureArray(
      payload.byAge ??
        payload.age ??
        payload.ages ??
        payload.ageStats ??
        payload.age_statistics ??
        payload.ageStatistics ??
        payload.age_distribution
    )
    ageChartData.value = {
      labels: ages.map((item) => {
        const raw = pickFirst(item, ['age_range', 'range', 'label', 'title', 'name'])
        return resolveLabel(raw)
      }),
      values: ages.map((item) => parseNumber(pickFirst(item, ['count', 'cnt', 'value', 'total', 'amount'])))
    }

    const genders = ensureArray(
      payload.byGender ??
        payload.gender ??
        payload.genders ??
        payload.genderStats ??
        payload.gender_statistics ??
        payload.genderStatistics ??
        payload.gender_distribution
    )
    const genderLabels = []
    const genderValues = []
    genders.forEach((item) => {
      let label = pickFirst(item, ['label', 'title', 'name'])
      if (!label) {
        const genderRaw = pickFirst(item, ['gender', 'gender_name', 'code'])
        if (genderRaw === 1 || genderRaw === '1' || genderRaw === 'male' || genderRaw === 'erkak') {
          label = 'Erkaklar'
        } else if (genderRaw === 2 || genderRaw === '2' || genderRaw === 'female' || genderRaw === 'ayol') {
          label = 'Ayollar'
        } else if (genderRaw) {
          label = String(genderRaw)
        }
      }
      genderLabels.push(resolveLabel(label))
      genderValues.push(parseNumber(pickFirst(item, ['cnt', 'count', 'value', 'total', 'amount'])))
    })
    genderChartData.value = { labels: genderLabels, values: genderValues }
  } catch (error) {
    console.error('Failed to load dashboard statistics', error)
    pieError.value = 'Maʼlumotlarni yuklashda xatolik yuz berdi.'
    resetData()
  } finally {
    await nextTick()
    regionChartInstance = drawPieChart(regionChartCanvas, regionChartData.value, regionChartInstance)
    ageChartInstance = drawPieChart(ageChartCanvas, ageChartData.value, ageChartInstance)
    genderChartInstance = drawPieChart(genderChartCanvas, genderChartData.value, genderChartInstance)
    pieLoading.value = false
  }
}

// ---------- STATIK BUGUNGI TRANZAKSIYALAR (10 ta) ----------
const trxToday = ref([
  { id: 'TRX-1001', user: 'Bobur Boburov',   system: 'Payme', amount: '1 000 000 UZS', date: '01.09.2025', time: '09:05:18', status: 'Yakunlangan' },
  { id: 'TRX-1002', user: 'Laylo Karimova',  system: 'Click', amount: '250 000 UZS',  date: '01.09.2025', time: '09:21:43', status: 'Yakunlangan' },
  { id: 'TRX-1003', user: 'Sardor Usmonov',  system: 'Payme', amount: '340 000 UZS',  date: '01.09.2025', time: '10:02:51', status: 'Yakunlangan' },
  { id: 'TRX-1004', user: 'Aziza Aliyeva',   system: 'Payme', amount: '150 000 UZS',  date: '01.09.2025', time: '10:17:26', status: 'Bekor qilingan' },
  { id: 'TRX-1005', user: 'Temur Rasulov',   system: 'Click', amount: '820 000 UZS',  date: '01.09.2025', time: '11:40:03', status: 'Yakunlangan' },
  { id: 'TRX-1006', user: 'Muhlis Sharipov', system: 'Payme', amount: '510 000 UZS',  date: '01.09.2025', time: '12:11:57', status: 'Yakunlangan' },
  { id: 'TRX-1007', user: 'Zebo Zokirova',   system: 'Click', amount: '980 000 UZS',  date: '01.09.2025', time: '13:08:29', status: 'Yakunlangan' },
  { id: 'TRX-1008', user: 'Kamoliddin X.',   system: 'Payme', amount: '210 000 UZS',  date: '01.09.2025', time: '15:22:10', status: 'Yakunlangan' },
  { id: 'TRX-1009', user: 'Sevara B.',       system: 'Payme', amount: '430 000 UZS',  date: '01.09.2025', time: '16:55:44', status: 'Bekor qilingan' },
  { id: 'TRX-1010', user: 'Islom Yusufov',   system: 'Click', amount: '700 000 UZS',  date: '01.09.2025', time: '18:07:33', status: 'Yakunlangan' },
])

// ---------- STATIK BUGUNGI RO‘YXATDAN O‘TGANDLAR (10 ta) ----------
const usersToday = ref([
  { id: 'U-1001', name: 'Abdullayev Abdulla', phone: '+998 90 123 45 67', date: '01.09.2025', time: '08:41:22' },
  { id: 'U-1002', name: 'Akromova Mohira',    phone: '+998 93 765 43 21', date: '01.09.2025', time: '09:05:13' },
  { id: 'U-1003', name: 'Toshpulatov Aziz',   phone: '+998 97 111 22 33', date: '01.09.2025', time: '09:57:30' },
  { id: 'U-1004', name: 'Sodiqova Zarnigor',  phone: '+998 99 555 66 77', date: '01.09.2025', time: '10:23:09' },
  { id: 'U-1005', name: 'Oripov Behzod',      phone: '+998 90 222 33 44', date: '01.09.2025', time: '11:18:40' },
  { id: 'U-1006', name: 'Elyorova Diyora',    phone: '+998 91 444 55 66', date: '01.09.2025', time: '12:27:51' },
  { id: 'U-1007', name: 'Shukurov Mironshoh', phone: '+998 95 101 01 01', date: '01.09.2025', time: '13:19:06' },
  { id: 'U-1008', name: 'Saidova Laylo',      phone: '+998 90 555 77 66', date: '01.09.2025', time: '14:04:44' },
  { id: 'U-1009', name: 'Qodirov Nodir',      phone: '+998 99 333 22 11', date: '01.09.2025', time: '15:48:28' },
  { id: 'U-1010', name: 'Gulbahor Hamidova',  phone: '+998 94 888 77 66', date: '01.09.2025', time: '17:02:59' },
])

onMounted(async () => {
  drawChart()
  await loadStatisticPies()
})

onBeforeUnmount(() => {
  chartInstance?.destroy()
  regionChartInstance?.destroy()
  ageChartInstance?.destroy()
  genderChartInstance?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 4 top stats -->
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="s in topStats"
        :key="s.key"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4"
      >
        <!-- FontAwesome icon -->
        <div :class="['h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.tint]">
          <fa :icon="s.icon" />
        </div>
        <div>
          <div class="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{{ s.label }}</div>
          <div class="mt-1 text-2xl font-bold text-slate-800">{{ s.value }}</div>
        </div>
      </div>
    </div>

    <!-- Top full-width chart -->
  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-slate-800">Bugungi saytga tashrif buyurganlar</h3>
          <p class="text-sm text-slate-500">Soatlik kesimda tushgan mablag‘lar dinamikasi (mock).</p>
        </div>
      </div>
      <div class="h-80">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>

    <!-- Distribution pie charts -->
    <div class="grid gap-6 xl:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-slate-800">Hududlar kesimida</h3>
          </div>
          <RouterLink
            to="/admin/detail-table/region"
            class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Batafsil
          </RouterLink>
        </div>
        <div class="mt-6 flex-1">
          <div v-if="pieLoading" class="flex h-64 items-center justify-center">
            <svg class="h-6 w-6 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
          <div v-else-if="pieError" class="flex h-64 items-center justify-center text-center text-sm text-rose-500">
            {{ pieError }}
          </div>
          <div v-else-if="!regionChartData.values.length" class="flex h-64 items-center justify-center text-sm text-slate-400">
            Maʼlumot mavjud emas
          </div>
          <div v-else class="relative mx-auto aspect-square h-64 max-w-xs">
            <canvas ref="regionChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-slate-800">Yosh kesimida</h3>
          </div>
          <RouterLink
            to="/admin/detail-table/age"
            class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Batafsil
          </RouterLink>
        </div>
        <div class="mt-6 flex-1">
          <div v-if="pieLoading" class="flex h-64 items-center justify-center">
            <svg class="h-6 w-6 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
          <div v-else-if="pieError" class="flex h-64 items-center justify-center text-center text-sm text-rose-500">
            {{ pieError }}
          </div>
          <div v-else-if="!ageChartData.values.length" class="flex h-64 items-center justify-center text-sm text-slate-400">
            Maʼlumot mavjud emas
          </div>
          <div v-else class="relative mx-auto aspect-square h-64 max-w-xs">
            <canvas ref="ageChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-slate-800">Jins kesimida</h3>
          </div>
          <RouterLink
            to="/admin/detail-table/gender"
            class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Batafsil
          </RouterLink>
        </div>
        <div class="mt-6 flex-1">
          <div v-if="pieLoading" class="flex h-64 items-center justify-center">
            <svg class="h-6 w-6 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
          <div v-else-if="pieError" class="flex h-64 items-center justify-center text-center text-sm text-rose-500">
            {{ pieError }}
          </div>
          <div v-else-if="!genderChartData.values.length" class="flex h-64 items-center justify-center text-sm text-slate-400">
            Maʼlumot mavjud emas
          </div>
          <div v-else class="relative mx-auto aspect-square h-64 max-w-xs">
            <canvas ref="genderChartCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 2 big cards row -->
    <div class="grid gap-6 xl:grid-cols-2">
      <!-- Bugungi tranzaksiyalar -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-slate-800">Bugungi tranzaksiyalar (10)</h3>
          <p class="text-sm text-slate-500">Click/Payme va boshqa tizimlardan tushgan to‘lovlar (mock).</p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-slate-500">
                <th class="py-2 pr-4">ID</th>
                <th class="py-2 pr-4">Foydalanuvchi</th>
                <th class="py-2 pr-4 text-center">Tizim</th>
                <th class="py-2 pr-4 text-right">Summasi</th>
                <th class="py-2 pr-4 text-center">Sana</th>
                <th class="py-2 pr-4 text-center">Vaqt</th>
                <th class="py-2 pr-4 text-center">Holat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in trxToday" :key="i" class="border-t border-slate-100">
                <td class="py-2 pr-4">{{ r.id }}</td>
                <td class="py-2 pr-4">{{ r.user }}</td>
                <td class="py-2 pr-4 text-center">{{ r.system }}</td>
                <td class="py-2 pr-4 text-right font-medium text-slate-800">{{ r.amount }}</td>
                <td class="py-2 pr-4 text-center">{{ r.date }}</td>
                <td class="py-2 pr-4 text-center">{{ r.time }}</td>
                <td class="py-2 pr-4 text-center">
                  <span
                    class="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
                    :class="r.status === 'Bekor qilingan' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                  >
                    {{ r.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bugungi ro‘yxatdan o‘tganlar -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-slate-800">Bugungi ro‘yxatdan o‘tganlar (10)</h3>
          <p class="text-sm text-slate-500">So‘nggi 24 soatda qo‘shilgan foydalanuvchilar (mock).</p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-slate-500">
                <th class="py-2 pr-4">ID</th>
                <th class="py-2 pr-4">Foydalanuvchi</th>
                <th class="py-2 pr-4">Telefon</th>
                <th class="py-2 pr-4 text-center">Sana</th>
                <th class="py-2 pr-4 text-center">Vaqt</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in usersToday" :key="i" class="border-t border-slate-100">
                <td class="py-2 pr-4">{{ u.id }}</td>
                <td class="py-2 pr-4">{{ u.name }}</td>
                <td class="py-2 pr-4">{{ u.phone }}</td>
                <td class="py-2 pr-4 text-center">{{ u.date }}</td>
                <td class="py-2 pr-4 text-center">{{ u.time }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
