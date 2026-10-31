<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMobileBalance, getStatistic } from '../../api/stats'
import { useRequest } from '../../composables/useRequest'
import DailyDynamics from '../../components/stats/DailyDynamics.vue'
import StatsCards from '../../components/dashboard/StatsCards.vue'
import DemographicsPanel from '../../components/dashboard/DemographicsPanel.vue'
import QarzDaftariSummary from '../../components/dashboard/QarzDaftariSummary.vue'
import { fmtNum } from '../../lib/format'
import {
  EMPTY_RAW, parseRegions, parseAges, parseGenders, parseOverview, parseQarzDaftari, parseStores,
} from '../../lib/dashboardStats'

const router = useRouter()

const fmtN = (v) => fmtNum(v ?? 0)

// Mobil hisob qoldig'i (jami tushum EMAS — real qoldiq). Ustiga bosganda ro'yxat.
const mobileBalanceTotal = ref(null)
const mobileBalanceUsers = ref(null)
const mobileBalanceReq = useRequest(({ signal }) => getMobileBalance({ signal }), {
  mapError: () => 'Qoldiqni yuklab bo‘lmadi',
  onSuccess(res) {
    const data = res?.data
    const d = data?.data || data || {}
    mobileBalanceTotal.value = Number(d.total_balance || 0)
    mobileBalanceUsers.value = Number(d.users_count || 0)
  },
})
const mobileBalanceError = mobileBalanceReq.error
onMounted(() => mobileBalanceReq.run())

// ---------- /dashboard/statistic ----------
const overviewStats = ref({
  usersRegistered: 0,
  usersRegisteredThisMonth: 0,
  usersActive: 0,
  usersActiveThisMonth: 0,
  contractsTotal: 0,
  contractsThisMonth: 0,
  revenueTotal: 0,
  revenueThisMonth: 0,
})
const regionRaw = ref(EMPTY_RAW())
const ageRaw = ref(EMPTY_RAW())
const genderRaw = ref(EMPTY_RAW())

// Qarz daftari umumiy summalari (valyuta kesimida)
const qarzDaftari = ref({
  UZS: { soni: 0, berilgan: 0, qaytarilgan: 0, voz_kechilgan: 0, qoldiq: 0 },
  USD: { soni: 0, berilgan: 0, qaytarilgan: 0, voz_kechilgan: 0, qoldiq: 0 },
})
// Qarz daftari — do'kon kesimida (do'konlar ro'yxati: har do'kon nechta/qancha qarz)
const qdStores = ref([])

const statisticReq = useRequest(({ signal }) => getStatistic({ signal }), {
  mapError: () => 'Ma’lumotlarni yuklashda xatolik yuz berdi.',
  onSuccess(res) {
    const s = res?.data ?? {}
    regionRaw.value = parseRegions(s)
    ageRaw.value = parseAges(s)
    genderRaw.value = parseGenders(s)
    overviewStats.value = parseOverview(s)
    qarzDaftari.value = parseQarzDaftari(s)
    qdStores.value = parseStores(s)
  },
  // Xatoda faqat hudud/yosh/jins tozalanadi (qolganlari avvalgi qiymatida qoladi) — avvalgidek.
  onError() {
    regionRaw.value = ageRaw.value = genderRaw.value = EMPTY_RAW()
  },
})
const pieLoading = statisticReq.loading
const pieError = statisticReq.error

onMounted(() => statisticReq.run())
</script>

<template>
  <div class="space-y-6">
    <StatsCards :overview="overviewStats" />

    <!-- 28.10: kunlik dinamika (oxirgi 7/14/30 kun) -->
    <DailyDynamics />

    <!-- Mobil hisob qoldig'i — "Jami tushum"дан farqli (u SMS-paketga sarflanishi mumkin).
         Ustiga bosganda qoldig'i bor foydalanuvchilar ro'yxati ochiladi. -->
    <button
      type="button"
      @click="router.push({ name: 'stats-mobile-balance' })"
      class="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-left transition hover:bg-emerald-50 hover:border-emerald-300"
    >
      <div class="flex items-center gap-4 min-w-0">
        <div class="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <fa icon="wallet" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] tracking-wide text-emerald-800 font-semibold">Mobil hisob qoldig‘i (real qoldiq)</div>
          <div class="mt-0.5 text-2xl font-bold text-emerald-700 truncate">
            {{ mobileBalanceTotal === null ? (mobileBalanceError ? '—' : '…') : fmtNum(mobileBalanceTotal) }} <span class="text-base text-emerald-700">so‘m</span>
          </div>
          <div class="text-xs font-medium text-emerald-800">{{ mobileBalanceError || (mobileBalanceUsers === null ? '' : `${fmtN(mobileBalanceUsers)} foydalanuvchida qoldiq bor`) }}</div>
        </div>
      </div>
      <span class="text-sm font-semibold text-emerald-700 shrink-0">Ro‘yxatni ko‘rish →</span>
    </button>

    <DemographicsPanel
      :region="regionRaw"
      :age="ageRaw"
      :gender="genderRaw"
      :loading="pieLoading"
      :error="pieError"
      @retry="statisticReq.retry()"
    />

    <QarzDaftariSummary :qarz-daftari="qarzDaftari" :stores="qdStores" :loading="pieLoading" />
  </div>
</template>
