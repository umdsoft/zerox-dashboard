<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../lib/axios'
import PagerBar from '../../components/ui/PagerBar.vue'

const router = useRouter()
// SS8: do'kon qatoriga bosilганда — do'kon batafsil sahifasiga o'tadi.
const goShop = (shopId) => { if (shopId) router.push({ name: 'stores-detail', params: { id: shopId } }) }

const loading = ref(false)
const err = ref('')
const stats = ref(null)      // qarz-daftari
const regions = ref(null)    // shops-by-region
const sortKey = ref('berilgan')  // clickable drill-down: qaysi ko'rsatkich bo'yicha saralanadi
const curFilter = ref('')    // valyuta filtri (bo'sh = hammasi)

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n || 0))
const setSort = (k) => { sortKey.value = k; refetchShops() }

const currencies = computed(() => (stats.value?.totals || []).map((t) => t.currency))

// Do'konlar — serverdan sahifalab olinadi (10 tadan), hudud/valyuta/saralash serverda.
const SHOP_LIMIT = 10
const shopRows = ref([])
const shopTotal = ref(0)
const shopPage = ref(1)
const shopLoading = ref(false)
const shopErr = ref('')
const regionFilter = ref('')  // hudud kartasi bosilganda

async function loadShops() {
  shopLoading.value = true; shopErr.value = ''
  try {
    const res = await api.get('/dashboard/stats/qarz-daftari/shops', {
      params: {
        page: shopPage.value, limit: SHOP_LIMIT,
        region: regionFilter.value || undefined,
        currency: curFilter.value || undefined,
        sort: sortKey.value,
      },
    })
    const d = res?.data?.data || {}
    shopRows.value = d.items || []
    shopTotal.value = Number(d.total || 0)
  } catch (e) {
    shopErr.value = e?.response?.data?.message || e?.message || 'Do‘konlarni yuklashda xatolik.'
  } finally { shopLoading.value = false }
}
function setShopPage(p) { shopPage.value = p; loadShops() }
function refetchShops() { shopPage.value = 1; loadShops() }
function pickRegion(name) {
  regionFilter.value = regionFilter.value === name ? '' : name
  refetchShops()
  nextTick(() => shopsBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function clearRegion() { regionFilter.value = ''; refetchShops() }
const shopsBox = ref(null)

async function load() {
  loading.value = true; err.value = ''
  try {
    const [a, b] = await Promise.all([
      api.get('/dashboard/stats/qarz-daftari', { params: { include_shops: 0 } }),
      api.get('/dashboard/stats/shops-by-region'),
    ])
    stats.value = a?.data?.data || null
    regions.value = b?.data?.data || null
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Ma‘lumotlarni yuklashda xatolik.'
  } finally { loading.value = false }
  shopPage.value = 1
  await loadShops()
}
onMounted(load)

const metricLabel = { berilgan: 'Berilgan', qaytarilgan: 'Qaytarilgan', qoldiq: 'Qoldiq', voz_kechilgan: 'Voz kechilgan' }
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Qarz daftari — analitika</h1>
        <p class="text-sm text-slate-500">Berilgan qarzlarning qaytarilishi, o‘z vaqtida qaytarish foizi va do‘kon/hudud kesimi.</p>
      </div>
      <button class="px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50" @click="load">Yangilash</button>
    </div>

    <div v-if="loading" class="text-slate-500 text-sm py-8 text-center">Yuklanmoqda…</div>
    <div v-else-if="err" class="text-rose-600 text-sm py-8 text-center">{{ err }}</div>

    <template v-else-if="stats">
      <!-- Valyuta bo'yicha umumiy + o'z vaqtida % -->
      <div v-for="t in stats.totals" :key="t.currency" class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold text-slate-700">{{ t.currency }}</span>
          <span v-if="t.on_time_percent !== null"
            class="text-xs font-semibold px-2.5 py-1 rounded-full"
            :class="t.on_time_percent >= 80 ? 'bg-emerald-50 text-emerald-700' : t.on_time_percent >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'">
            O‘z vaqtida qaytarish: {{ t.on_time_percent }}%
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button @click="setSort('berilgan')" class="text-left rounded-lg p-3 transition" :class="sortKey==='berilgan' ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-slate-50 hover:bg-slate-100'">
            <p class="text-xs text-slate-500">Berilgan</p>
            <p class="mt-0.5 font-semibold text-slate-800">{{ fmt(t.berilgan) }}</p>
          </button>
          <button @click="setSort('qaytarilgan')" class="text-left rounded-lg p-3 transition" :class="sortKey==='qaytarilgan' ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-slate-50 hover:bg-slate-100'">
            <p class="text-xs text-slate-500">Qaytarilgan</p>
            <p class="mt-0.5 font-semibold text-emerald-600">{{ fmt(t.qaytarilgan) }}</p>
          </button>
          <button @click="setSort('voz_kechilgan')" class="text-left rounded-lg p-3 transition" :class="sortKey==='voz_kechilgan' ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-slate-50 hover:bg-slate-100'">
            <p class="text-xs text-slate-500">Voz kechilgan</p>
            <p class="mt-0.5 font-semibold text-amber-600">{{ fmt(t.voz_kechilgan) }}</p>
          </button>
          <button @click="setSort('qoldiq')" class="text-left rounded-lg p-3 transition" :class="sortKey==='qoldiq' ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-slate-50 hover:bg-slate-100'">
            <p class="text-xs text-slate-500">Qoldiq</p>
            <p class="mt-0.5 font-semibold text-rose-600">{{ fmt(t.qoldiq) }}</p>
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-400 -mt-2">Ko‘rsatkich ustiga bosing — pastdagi do‘kon kesimi shu bo‘yicha saralanadi.</p>

      <!-- Hudud kesimida do'konlar -->
      <div class="rounded-xl border border-slate-200 bg-white overflow-hidden" v-if="regions">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
          Do‘konlar hudud kesimida (jami {{ fmt(regions.total_shops) }})
        </div>
        <div class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            v-for="r in regions.by_region" :key="r.region" type="button"
            class="rounded-lg border px-3 py-2 flex items-center justify-between text-left transition"
            :class="regionFilter === r.region ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-100 bg-slate-50 hover:bg-indigo-50'"
            :title="'Hududdagi do‘konlarni ko‘rsatish'" @click="pickRegion(r.region)">
            <span class="text-sm text-slate-700 truncate">{{ r.region }}</span>
            <span class="text-sm font-semibold text-indigo-600 ml-2">{{ fmt(r.shop_count) }}</span>
          </button>
        </div>
      </div>

      <!-- Do'kon kesimi drill-down -->
      <div ref="shopsBox" class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <span class="text-sm font-semibold text-slate-700">Do‘kon kesimida — {{ metricLabel[sortKey] }} bo‘yicha</span>
          <span v-if="regionFilter" class="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full pl-2.5 pr-1 py-1">
            Hudud: {{ regionFilter }}
            <button type="button" class="w-5 h-5 rounded-full hover:bg-indigo-100" title="Filtrni bekor qilish" @click="clearRegion">×</button>
          </span>
          <select v-model="curFilter" class="border rounded-lg px-2 py-1 text-sm" @change="refetchShops">
            <option value="">Barcha valyuta</option>
            <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th class="px-4 py-3">Do‘kon</th>
                <th class="px-4 py-3">Hudud</th>
                <th class="px-4 py-3">Val.</th>
                <th class="px-4 py-3 text-right">Berilgan</th>
                <th class="px-4 py-3 text-right">Qaytarilgan</th>
                <th class="px-4 py-3 text-right">Qoldiq</th>
                <th class="px-4 py-3 text-right">Voz kech.</th>
                <th class="px-4 py-3 text-right">Qaytarish %</th>
                <th class="px-4 py-3 text-right">SMS yubor.</th>
                <th class="px-4 py-3 text-right">SMS paket</th>
                <th class="px-4 py-3 text-right">SMS qoldiq</th>
                <th class="px-4 py-3 text-right">Qarzlar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="r in shopRows" :key="r.shop_id + '-' + r.currency" class="hover:bg-indigo-50 cursor-pointer transition" @click="goShop(r.shop_id)" title="Do‘kon tafsilotini ochish">
                <td class="px-4 py-3 font-medium text-indigo-700 hover:underline">{{ r.nomi }}</td>
                <td class="px-4 py-3 text-slate-500">{{ r.region }}</td>
                <td class="px-4 py-3">{{ r.currency }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ fmt(r.berilgan) }}</td>
                <td class="px-4 py-3 text-right text-emerald-600">{{ fmt(r.qaytarilgan) }}</td>
                <td class="px-4 py-3 text-right text-rose-600">{{ fmt(r.qoldiq) }}</td>
                <td class="px-4 py-3 text-right text-amber-600">{{ fmt(r.voz_kechilgan) }}</td>
                <td class="px-4 py-3 text-right font-medium" :class="r.qaytarish_percent >= 70 ? 'text-emerald-600' : r.qaytarish_percent >= 40 ? 'text-amber-600' : 'text-rose-600'">
                  {{ r.qaytarish_percent == null ? '—' : r.qaytarish_percent + '%' }}
                </td>
                <td class="px-4 py-3 text-right text-slate-600">{{ fmt(r.sms_sent) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ fmt(r.sms_packages) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ fmt(r.sms_remaining) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ fmt(r.qarz_count) }}</td>
              </tr>
              <tr v-if="shopErr"><td colspan="12" class="px-4 py-6 text-center text-rose-600">{{ shopErr }}</td></tr>
              <tr v-else-if="shopLoading && !shopRows.length"><td colspan="12" class="px-4 py-6 text-center text-slate-400">Yuklanmoqda…</td></tr>
              <tr v-else-if="!shopRows.length"><td colspan="12" class="px-4 py-6 text-center text-slate-400">Ma‘lumot yo‘q</td></tr>
            </tbody>
          </table>
        </div>
        <PagerBar :page="shopPage" :limit="SHOP_LIMIT" :total="shopTotal" :disabled="shopLoading" @change="setShopPage" />
      </div>
    </template>
  </div>
</template>
