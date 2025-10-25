<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import api from '../../lib/axios'

// ====== CHART.JS ======
import { Chart, PieController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(PieController, ArcElement, Tooltip, Legend)

// ---------- TOP STATS ----------
const overviewStats = ref({
  usersTotal: 0,
  revenueMonthNet: 0,
  contractsTotal: 0,
  contractsToday: 0,
})

const topStats = computed(() => [
  {
    key: 'users_total',
    label: 'Foydalanuvchilar',
    value: formatNumber(overviewStats.value.usersTotal),
    icon: 'users',
    tint: 'bg-sky-100 text-sky-600',
  },
  {
    key: 'month_revenue',
    label: 'Tushumlar',
    value: formatCurrency(overviewStats.value.revenueMonthNet),
    icon: 'wallet',
    tint: 'bg-emerald-100 text-emerald-600',
  },
  {
    key: 'contracts_total',
    label: 'Shartnomalar',
    value: formatNumber(overviewStats.value.contractsTotal),
    icon: 'file-invoice',
    tint: 'bg-indigo-100 text-indigo-600',
  },
  {
    key: 'contracts_today',
    label: 'Bugungi shartnomalar',
    value: formatNumber(overviewStats.value.contractsToday),
    icon: 'calendar-days',
    tint: 'bg-amber-100 text-amber-600',
  },
])

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
const formatCurrency = (value) => `${formatNumber(value)} UZS`

const regionTotal = computed(() => regionChartData.value.values.reduce((sum, v) => sum + v, 0))
const ageTotal = computed(() => ageChartData.value.values.reduce((sum, v) => sum + v, 0))
const genderTotal = computed(() => genderChartData.value.values.reduce((sum, v) => sum + v, 0))

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
          display: false
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

const chartSections = computed(() => [
  {
    key: 'region',
    title: 'Hududlar kesimida',
    total: regionTotal.value,
    detailRoute: '/admin/detail-table/region',
    dataset: regionChartData.value,
    canvasRef: regionChartCanvas,
    emptyText: 'Maʼlumot mavjud emas',
  },
  {
    key: 'age',
    title: 'Yosh kesimida',
    total: ageTotal.value,
    detailRoute: '/admin/detail-table/age',
    dataset: ageChartData.value,
    canvasRef: ageChartCanvas,
    emptyText: 'Maʼlumot mavjud emas',
  },
  {
    key: 'gender',
    title: 'Jins kesimida',
    total: genderTotal.value,
    detailRoute: '/admin/detail-table/gender',
    dataset: genderChartData.value,
    canvasRef: genderChartCanvas,
    emptyText: 'Maʼlumot mavjud emas',
  },
])

function buildDatasetSummary(dataset) {
  if (!dataset || !Array.isArray(dataset.labels) || !Array.isArray(dataset.values)) {
    return []
  }

  const colors = getPieColors(dataset.values.length)
  const total = dataset.values.reduce((sum, value) => sum + (Number(value) || 0), 0)

  return dataset.labels.map((label, index) => {
    const rawValue = Number(dataset.values[index]) || 0
    const percent = total ? ((rawValue / total) * 100).toFixed(1) : '0.0'
    return {
      label,
      value: rawValue,
      percent,
      color: colors[index % colors.length],
    }
  })
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
    const stats = data ?? {}
    console.log('Dashboard statistics data:', stats)
    const regions = Array.isArray(stats.byRegion) ? stats.byRegion : []
    regionChartData.value = {
      labels: regions.map((item) => item.region ?? item.region_name ?? item.name ?? 'Nomaʼlum'),
      values: regions.map((item) => parseNumber(item.cnt ?? item.count ?? item.total))
    }

    const ages = Array.isArray(stats.byAge) ? stats.byAge : []
    ageChartData.value = {
      labels: ages.map((item) => item.age_range ?? item.label ?? 'Nomaʼlum'),
      values: ages.map((item) => parseNumber(item.count ?? item.cnt ?? item.total))
    }

    const genders = Array.isArray(stats.byGender) ? stats.byGender : []
    const genderLabels = []
    const genderValues = []
    genders.forEach((item) => {
      let label = 'Nomaʼlum'
      const genderRaw = item.gender ?? item.label
      if (genderRaw === 1 || genderRaw === '1' || genderRaw === 'male' || genderRaw === 'erkak') {
        label = 'Erkaklar'
      } else if (genderRaw === 2 || genderRaw === '2' || genderRaw === 'female' || genderRaw === 'ayol') {
        label = 'Ayollar'
      }
      genderLabels.push(label)
      genderValues.push(parseNumber(item.cnt ?? item.count ?? item.total))
    })
    genderChartData.value = { labels: genderLabels, values: genderValues }

    const overview = stats.stats ?? {}
    overviewStats.value = {
      usersTotal: parseNumber(
        overview.usersTotal ?? overview.users_total ?? overview.totalUsers ?? overview.users
      ),
      revenueMonthNet: parseNumber(
        overview.revenueMonthNet ??
          overview.revenue_month_net ??
          overview.monthRevenue ??
          overview.revenue ??
          overview.totalRevenue
      ),
      contractsTotal: parseNumber(
        overview.contractsTotal ?? overview.contracts_total ?? overview.totalContracts
      ),
      contractsToday: parseNumber(
        overview.contractsToday ?? overview.contracts_today ?? overview.todayContracts
      ),
    }
  } catch (error) {
    console.error('Failed to load dashboard statistics', error)
    pieError.value = 'Maʼlumotlarni yuklashda xatolik yuz berdi.'
    resetData()
  } finally {
    pieLoading.value = false
    await nextTick()
    regionChartInstance = drawPieChart(regionChartCanvas, regionChartData.value, regionChartInstance)
    ageChartInstance = drawPieChart(ageChartCanvas, ageChartData.value, ageChartInstance)
    genderChartInstance = drawPieChart(genderChartCanvas, genderChartData.value, genderChartInstance)
  }
}

// ---------- STATIK BUGUNGI TRANZAKSIYALAR (10 ta) ----------
const trxToday = ref([
  { id: 'TRX-1001', user: 'Bobur Boburov', system: 'Payme', amount: '1 000 000 UZS', date: '01.09.2025', time: '09:05:18', status: 'Yakunlangan' },
  { id: 'TRX-1002', user: 'Laylo Karimova', system: 'Click', amount: '250 000 UZS', date: '01.09.2025', time: '09:21:43', status: 'Yakunlangan' },
  { id: 'TRX-1003', user: 'Sardor Usmonov', system: 'Payme', amount: '340 000 UZS', date: '01.09.2025', time: '10:02:51', status: 'Yakunlangan' },
  { id: 'TRX-1004', user: 'Aziza Aliyeva', system: 'Payme', amount: '150 000 UZS', date: '01.09.2025', time: '10:17:26', status: 'Bekor qilingan' },
  { id: 'TRX-1005', user: 'Temur Rasulov', system: 'Click', amount: '820 000 UZS', date: '01.09.2025', time: '11:40:03', status: 'Yakunlangan' },
  { id: 'TRX-1006', user: 'Muhlis Sharipov', system: 'Payme', amount: '510 000 UZS', date: '01.09.2025', time: '12:11:57', status: 'Yakunlangan' },
  { id: 'TRX-1007', user: 'Zebo Zokirova', system: 'Click', amount: '980 000 UZS', date: '01.09.2025', time: '13:08:29', status: 'Yakunlangan' },
  { id: 'TRX-1008', user: 'Kamoliddin X.', system: 'Payme', amount: '210 000 UZS', date: '01.09.2025', time: '15:22:10', status: 'Yakunlangan' },
  { id: 'TRX-1009', user: 'Sevara B.', system: 'Payme', amount: '430 000 UZS', date: '01.09.2025', time: '16:55:44', status: 'Bekor qilingan' },
  { id: 'TRX-1010', user: 'Islom Yusufov', system: 'Click', amount: '700 000 UZS', date: '01.09.2025', time: '18:07:33', status: 'Yakunlangan' },
])

// ---------- STATIK BUGUNGI RO‘YXATDAN O‘TGANDLAR (10 ta) ----------
const usersToday = ref([
  { id: 'U-1001', name: 'Abdullayev Abdulla', phone: '+998 90 123 45 67', date: '01.09.2025', time: '08:41:22' },
  { id: 'U-1002', name: 'Akromova Mohira', phone: '+998 93 765 43 21', date: '01.09.2025', time: '09:05:13' },
  { id: 'U-1003', name: 'Toshpulatov Aziz', phone: '+998 97 111 22 33', date: '01.09.2025', time: '09:57:30' },
  { id: 'U-1004', name: 'Sodiqova Zarnigor', phone: '+998 99 555 66 77', date: '01.09.2025', time: '10:23:09' },
  { id: 'U-1005', name: 'Oripov Behzod', phone: '+998 90 222 33 44', date: '01.09.2025', time: '11:18:40' },
  { id: 'U-1006', name: 'Elyorova Diyora', phone: '+998 91 444 55 66', date: '01.09.2025', time: '12:27:51' },
  { id: 'U-1007', name: 'Shukurov Mironshoh', phone: '+998 95 101 01 01', date: '01.09.2025', time: '13:19:06' },
  { id: 'U-1008', name: 'Saidova Laylo', phone: '+998 90 555 77 66', date: '01.09.2025', time: '14:04:44' },
  { id: 'U-1009', name: 'Qodirov Nodir', phone: '+998 99 333 22 11', date: '01.09.2025', time: '15:48:28' },
  { id: 'U-1010', name: 'Gulbahor Hamidova', phone: '+998 94 888 77 66', date: '01.09.2025', time: '17:02:59' },
])

onMounted(async () => {
  await loadStatisticPies()
})

onBeforeUnmount(() => {
  regionChartInstance?.destroy()
  ageChartInstance?.destroy()
  genderChartInstance?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 4 top stats -->
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="s in topStats" :key="s.key"
        class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

    <div class="grid gap-6 xl:grid-cols-3">
      <div v-for="section in chartSections" :key="section.key"
        class="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-slate-800">{{ section.title }}</h3>
            <p class="text-sm text-slate-500">Jami: {{ formatNumber(section.total) }}</p>
          </div>
          <RouterLink :to="section.detailRoute"
            class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700">
            Batafsil
          </RouterLink>
        </div>
        <div class="mt-6 flex flex-1 flex-col gap-6 lg:flex-row">
          <div class="flex-1">
            <div v-if="pieLoading" class="flex h-72 items-center justify-center">
              <svg class="h-6 w-6 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <div v-else-if="pieError" class="flex h-72 items-center justify-center text-center text-sm text-rose-500">
              {{ pieError }}
            </div>
            <div v-else-if="!(section.dataset?.values?.length)"
              class="flex h-72 items-center justify-center text-sm text-slate-400">
              {{ section.emptyText }}
            </div>
            <div v-else
              class="relative mx-auto h-72 w-full max-w-[460px] rounded-2xl bg-slate-50 p-4 lg:mx-0">
              <canvas :ref="section.canvasRef"></canvas>
            </div>
          </div>
          <div class="w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-4 lg:w-64">
            <h4 class="text-sm font-semibold text-slate-700">Maʼlumotlar</h4>
            <div class="mt-3 space-y-3">
              <div v-if="pieLoading" class="flex items-center justify-center py-8 text-sm text-slate-400">
                Yuklanmoqda...
              </div>
              <div v-else-if="pieError" class="text-sm text-rose-500">
                {{ pieError }}
              </div>
              <div v-else-if="!(section.dataset?.values?.length)" class="text-sm text-slate-400">
                {{ section.emptyText }}
              </div>
              <ul v-else class="space-y-3">
                <li v-for="item in buildDatasetSummary(section.dataset)" :key="item.label"
                  class="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                  <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }"></span>
                    <span>{{ item.label }}</span>
                  </div>
                  <div class="mt-1 flex items-baseline justify-between text-sm text-slate-700">
                    <span class="font-semibold">{{ formatNumber(item.value) }}</span>
                    <span class="text-xs text-slate-500">{{ item.percent }}%</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- 2 big cards row -->

  </div>
</template>
