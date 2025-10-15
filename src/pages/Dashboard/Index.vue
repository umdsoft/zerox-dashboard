<script setup>
import { onMounted, ref } from 'vue'

// ====== CHART.JS (faqat front mock) ======
import {
  Chart,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Filler
} from 'chart.js'
Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler)

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

onMounted(drawChart)
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
