<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../lib/axios'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const err = ref('')
const data = ref(null)

// ------- HELPERS -------
const nf = new Intl.NumberFormat('ru-RU')
const fmtN = (v) => nf.format(Number(v ?? 0))
function fmtDate(v, withTime = false) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const base = `${dd}.${mm}.${d.getFullYear()}`
  if (!withTime) return base
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${base} ${hh}:${mi}`
}

// Faqat ma'lumot bo'lgan valyutalarni ko'rsatamiz (UZS doim, USD bo'lsa)
const summaryCards = computed(() => {
  const qs = data.value?.qarzSummary || {}
  const out = []
  for (const cur of ['UZS', 'USD']) {
    const d = qs[cur]
    if (d && (Number(d.soni) > 0 || cur === 'UZS')) out.push({ cur, ...d })
  }
  return out
})

// Tarif rejasi belgisi (badge rangi)
const PLAN_BADGE = {
  free: 'bg-slate-100 text-slate-600 border-slate-200',
  start: 'bg-sky-100 text-sky-700 border-sky-200',
  premium: 'bg-amber-100 text-amber-700 border-amber-200',
}
const PLAN_LABEL = { free: 'Free', start: 'Start', premium: 'Premium' }
const planBadge = (p) => PLAN_BADGE[p] || PLAN_BADGE.free
const planLabel = (p) => PLAN_LABEL[p] || (p || '—')

// Obuna holati
const SUB_STATUS = {
  active: { label: 'Aktiv', cls: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Muddati tugagan', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Bekor qilingan', cls: 'bg-rose-100 text-rose-700' },
}
const subStatus = (s) => SUB_STATUS[s] || { label: s || '—', cls: 'bg-slate-100 text-slate-600' }

// Qarz holati
const QARZ_STATUS = {
  aktiv: { label: 'Aktiv', cls: 'bg-emerald-100 text-emerald-700' },
  yopilgan: { label: 'Yopilgan', cls: 'bg-slate-100 text-slate-600' },
  voz_kechilgan: { label: 'Voz kechilgan', cls: 'bg-amber-100 text-amber-700' },
}
const qarzStatus = (s) => QARZ_STATUS[s] || { label: s || '—', cls: 'bg-slate-100 text-slate-600' }
const turiLabel = (t) => (t === 'berish' ? 'Berildi' : t === 'olish' ? 'Olindi' : t || '—')

// ------- API -------
async function load() {
  const id = route.params.id
  if (!id) { err.value = "Noto'g'ri do'kon ID"; return }
  loading.value = true
  err.value = ''
  try {
    const res = await api.get(`/dashboard/store/${id}`)
    data.value = res?.data?.data ?? null
    if (!data.value) err.value = "Do'kon ma'lumoti topilmadi"
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Yuklashda xatolik'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.params.id, load)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="p-4 md:p-6">
    <!-- Orqaga -->
    <button
      class="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
      @click="goBack"
    >
      <fa icon="arrow-left" class="text-xs" />
      Orqaga
    </button>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
      Yuklanmoqda…
    </div>

    <div v-else-if="err" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
      {{ err }}
    </div>

    <div v-else-if="data" class="space-y-6">
      <!-- ====== Do'kon + egasi sarlavha kartasi ====== -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="h-1.5 w-full bg-gradient-to-r from-indigo-400 to-indigo-500"></div>
        <div class="p-6">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <!-- Do'kon -->
            <div class="flex items-start gap-4 min-w-0">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <fa icon="store" class="text-lg" />
              </div>
              <div class="min-w-0">
                <h2 class="text-xl font-semibold text-slate-800 md:text-2xl">{{ data.store.nomi }}</h2>
                <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span class="inline-flex items-center gap-1.5">
                    <fa icon="location-dot" class="text-xs text-slate-400" />
                    {{ data.store.manzil || 'Manzil kiritilmagan' }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <fa icon="calendar-days" class="text-xs text-slate-400" />
                    Ro'yxatga olingan: {{ fmtDate(data.store.royxat_sana) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Egasi -->
            <div class="shrink-0 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:min-w-[260px]">
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Do'kon egasi</div>
              <div class="mt-1.5 text-sm font-semibold text-slate-800">{{ data.owner.name || '—' }}</div>
              <div class="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <fa icon="phone" class="text-xs text-emerald-500" />
                <a v-if="data.owner.phone" :href="`tel:${data.owner.phone}`" class="font-medium !text-slate-700 no-underline hover:!text-emerald-600">
                  {{ data.owner.phone }}
                </a>
                <span v-else class="text-slate-400">—</span>
              </div>
              <div v-if="data.owner.uid" class="mt-1.5 text-xs text-slate-400">ID: {{ data.owner.uid }}</div>
            </div>
          </div>

          <!-- Kichik statistikalar -->
          <div class="mt-6 grid grid-cols-3 gap-4">
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
              <div class="text-xs font-medium text-slate-500">Mijozlar</div>
              <div class="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{{ fmtN(data.mijozlar_soni) }}</div>
            </div>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
              <div class="text-xs font-medium text-slate-500">Yuborilgan SMS</div>
              <div class="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{{ fmtN(data.sms_soni) }}</div>
            </div>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
              <div class="text-xs font-medium text-slate-500">Xarid qilingan tariflar</div>
              <div class="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{{ fmtN(data.tarif_soni) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== Qarz summalari (valyuta kesimida) ====== -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-base font-semibold text-slate-800">Qarz daftari summalari</h3>
        <div class="mt-4 space-y-4">
          <div v-for="c in summaryCards" :key="c.cur" class="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{{ c.cur }}</span>
              <span class="text-xs text-slate-500">{{ fmtN(c.soni) }} ta qarz</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div>
                <div class="text-[11px] text-slate-500">Berilgan</div>
                <div class="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">{{ fmtN(c.berilgan) }}</div>
              </div>
              <div>
                <div class="text-[11px] text-slate-500">Qaytarilgan</div>
                <div class="mt-0.5 text-sm font-bold text-emerald-700 tabular-nums">{{ fmtN(c.qaytarilgan) }}</div>
              </div>
              <div>
                <div class="text-[11px] text-slate-500">Voz kechilgan</div>
                <div class="mt-0.5 text-sm font-bold text-amber-600 tabular-nums">{{ fmtN(c.voz_kechilgan) }}</div>
              </div>
              <div>
                <div class="text-[11px] text-slate-500">Qoldiq</div>
                <div class="mt-0.5 text-sm font-bold text-rose-700 tabular-nums">{{ fmtN(c.qoldiq) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== Tariflar ====== -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-base font-semibold text-slate-800">Tariflar tarixi</h3>
          <span class="text-xs font-semibold text-slate-500">{{ fmtN((data.tariflar || []).length) }} ta</span>
        </div>
        <div v-if="!(data.tariflar || []).length" class="mt-4 text-sm text-slate-400">Tarif tarixi yo'q</div>
        <div v-else class="mt-4 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th class="px-3 py-2 text-left">Tarif</th>
                <th class="px-3 py-2 text-left">Holat</th>
                <th class="px-3 py-2 text-right">Narx</th>
                <th class="px-3 py-2 text-left">To'lov usuli</th>
                <th class="px-3 py-2 text-left">Boshlangan</th>
                <th class="px-3 py-2 text-left">Tugashi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="t in data.tariflar" :key="t.id" class="hover:bg-slate-50/60">
                <td class="px-3 py-2.5">
                  <span :class="['inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', planBadge(t.plan)]">
                    {{ planLabel(t.plan) }}
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <span :class="['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', subStatus(t.status).cls]">
                    {{ subStatus(t.status).label }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums text-slate-700">{{ fmtN(t.price) }}</td>
                <td class="px-3 py-2.5 text-slate-600">{{ t.payment_method || '—' }}</td>
                <td class="px-3 py-2.5 tabular-nums text-slate-600">{{ fmtDate(t.start_date) }}</td>
                <td class="px-3 py-2.5 tabular-nums text-slate-600">{{ t.end_date ? fmtDate(t.end_date) : 'Cheksiz' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ====== So'nggi qarzlar ====== -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-base font-semibold text-slate-800">So'nggi qarzlar</h3>
          <span class="text-xs font-semibold text-slate-500">oxirgi {{ fmtN((data.qarzlar || []).length) }} ta</span>
        </div>
        <div v-if="!(data.qarzlar || []).length" class="mt-4 text-sm text-slate-400">Qarzlar topilmadi</div>
        <div v-else class="mt-4 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th class="px-3 py-2 text-left">Mijoz</th>
                <th class="px-3 py-2 text-left">Turi</th>
                <th class="px-3 py-2 text-right">Miqdor</th>
                <th class="px-3 py-2 text-right">Qoldiq</th>
                <th class="px-3 py-2 text-center">Holat</th>
                <th class="px-3 py-2 text-left">Berilgan</th>
                <th class="px-3 py-2 text-left">Qaytarish</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="q in data.qarzlar" :key="q.id" class="hover:bg-slate-50/60">
                <td class="px-3 py-2.5 font-medium text-slate-800">{{ q.mijoz || '—' }}</td>
                <td class="px-3 py-2.5 text-slate-600">{{ turiLabel(q.turi) }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-slate-800">
                  {{ fmtN(q.miqdor) }} <span class="text-xs text-slate-400">{{ q.valyuta }}</span>
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums text-rose-700">{{ fmtN(q.qoldiq) }}</td>
                <td class="px-3 py-2.5 text-center">
                  <span :class="['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', qarzStatus(q.status).cls]">
                    {{ qarzStatus(q.status).label }}
                  </span>
                </td>
                <td class="px-3 py-2.5 tabular-nums text-slate-600">{{ fmtDate(q.berilgan_sana) }}</td>
                <td class="px-3 py-2.5 tabular-nums text-slate-600">{{ q.qaytarish_sanasi ? fmtDate(q.qaytarish_sanasi) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
      Ma'lumot topilmadi
    </div>
  </div>
</template>
