<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../../../lib/axios'

const route = useRoute()

const loading = ref(false)
const err = ref('')

const rows = ref([])     // jadval qatorlari
const total = ref(0)     // jami yozuvlar soni (pagination uchun)
const page = ref(1)      // 1-based sahifa
const limit = ref(10)    // sahifadagi elementlar

/* ---------- Helpers ---------- */
function fmtDate(val) {
  if (!val) return ''
  // backendda "sana" yoki "created_at" ISO bo‘lishi mumkin
  const d = new Date(val)
  if (isNaN(d)) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}
function fmtAmount(n) {
  if (n == null) return '0'
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^\d.-]/g, ''))
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num)
}
function statusBadge(v) {
  const s = String(v ?? '').toLowerCase()
  if (s === '2' || s === 'tugallangan' || s === 'done' || s === 'completed') {
    return { text: 'Tugallangan', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  }
  if (s === '3' || s === '4' || s === 'rejected' || s === 'cancelled' || s === 'rad qilingan') {
    return { text: 'Rad qilingan', cls: 'bg-rose-100 text-rose-700 border-rose-200' }
  }
  return { text: 'Jarayonda', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
}

/* Javobni normalizatsiya — har xil strukturalar bilan ishlaydi */
function normalize(res) {
  const raw = res?.data ?? res ?? {}
  // massiv
  const list =
    Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw?.items) ? raw.items
    : Array.isArray(raw?.results) ? raw.results
    : []

  // total
  const t =
    (typeof raw?.total === 'number' && raw.total) ||
    (typeof raw?.count === 'number' && raw.count) ||
    (typeof raw?.data?.total === 'number' && raw.data.total) ||
    list.length

  return { list, total: t }
}

/* API chaqiruv */
async function load() {
  loading.value = true
  err.value = ''
  try {
    const id = route.params.id
    const res = await api.get(`/dashboard/con/hisobot/${id}`, {
      params: { page: page.value, limit: limit.value, type: 'creditor' },
    })
    const { list, total: t } = normalize(res)
    // har bir qatorni tekislab olamiz
    rows.value = list.map((it) => {
      const debtorUid = it.debitor_uid ?? it.debtor_uid ?? it.debitorUid ?? it.debtorUid
      const dFirst = it.d_first_name ?? it.debitor_first_name ?? it.debtor_first_name ?? ''
      const dLast = it.d_last_name ?? it.debitor_last_name ?? it.debtor_last_name ?? ''
      const dMiddle = it.d_middle_name ?? it.debitor_middle_name ?? it.debtor_middle_name ?? ''
      const number = it.number ?? it.contract_no ?? it.code ?? ''
      const uid = it.uid ?? it.contract_uid ?? it.contractUid ?? ''
      const currency = it.currency ?? 'UZS'
      return {
        debtor_uid: debtorUid,
        debtor_name: `${dLast} ${dFirst} ${dMiddle}`.trim(),
        amount: it.amount ?? 0,
        residual_amount: it.residual_amount ?? it.remain ?? null,
        currency,
        created_at: it.created_at ?? it.start_date ?? it.issued_at,
        sana: it.sana ?? it.end_date ?? it.finish_date,
        number,
        uid,
        status: it.status,
      }
    })
    total.value = t
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Yuklashda xatolik'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/* Pagination */
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)
function prevPage() { if (canPrev.value) { page.value -= 1; window.scrollTo(0,0) } }
function nextPage() { if (canNext.value) { page.value += 1; window.scrollTo(0,0) } }

watch([page, limit], load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h4 class="text-xl font-semibold text-slate-800">Olingan qarz (kreditor)</h4>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr class="text-left text-xs font-semibold text-slate-600">
            <th class="px-4 py-3">Qarz beruvchi</th>
            <th class="px-4 py-3 text-center">Qarz summasi</th>
            <th class="px-4 py-3 text-center">Qarz olingan sana</th>
            <th class="px-4 py-3 text-center">Tugallangan sana</th>
            <th class="px-4 py-3">Qarz shartnomasi</th>
            <th class="px-4 py-3 text-center">Holat</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-sm">
          <tr v-if="loading">
            <td colspan="6" class="px-4 py-6 text-center text-slate-500">Yuklanmoqda…</td>
          </tr>
          <tr v-else-if="err">
            <td colspan="6" class="px-4 py-6 text-center text-rose-600">{{ err }}</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-slate-500">Ma’lumot yo‘q</td>
          </tr>

          <tr v-for="(r, i) in rows" :key="i" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <RouterLink
                v-if="r.debtor_uid"
                :to="`/users/${r.debtor_uid}`"
                class="text-primary-600 hover:underline"
              >
                {{ r.debtor_name || r.debtor_uid }}
              </RouterLink>
              <span v-else>{{ r.debtor_name || '—' }}</span>
            </td>
            <td class="px-4 py-3 text-center font-medium">
              {{ fmtAmount(r.amount) }} {{ r.currency }}
            </td>
            <td class="px-4 py-3 text-center">{{ fmtDate(r.created_at) }}</td>
            <td class="px-4 py-3 text-center">{{ fmtDate(r.sana) }}</td>
            <td class="px-4 py-3">
              <a
                v-if="r.uid"
                :href="`https://pdf.zerox.uz/index.php?id=${r.uid}&lang=uz&download=1`"
                class="text-primary-600 hover:underline"
                target="_blank" rel="noopener"
              >
                {{ r.number || r.uid }}
              </a>
              <span v-else>{{ r.number || '—' }}</span>
            </td>
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold"
                :class="statusBadge(r.status).cls"
              >
                {{ statusBadge(r.status).text }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-slate-600">
        Sahifa {{ page }} / {{ pageCount }}
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1 rounded border text-sm disabled:opacity-50"
          :disabled="!canPrev"
          @click="prevPage"
        >
          Oldingi
        </button>
        <button
          class="px-3 py-1 rounded border text-sm disabled:opacity-50"
          :disabled="!canNext"
          @click="nextPage"
        >
          Keyingi
        </button>

        <!-- (ixtiyoriy) Limit tanlash -->
        <select
          class="ml-3 border rounded px-2 py-1 text-sm"
          v-model.number="limit"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* jadvalni chiroyli ko‘rsatish uchun mayda tuzatishlar */
</style>
