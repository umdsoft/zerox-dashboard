<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '@/lib/axios' // adjust if your alias/path differs

const route = useRoute()

// state
const loading = ref(false)
const err = ref('')
const rows = ref([])
const page = ref(1)     // 1-based
const limit = ref(10)
const total = ref(0)

// helpers
function fmtDate(val) {
  if (!val) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return val
  const d = new Date(val)
  if (!Number.isFinite(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}
function fmtAmount(n, cur = 'UZS') {
  const v = typeof n === 'number' ? n : Number(String(n ?? '').replace(/[^\d.-]/g, ''))
  const txt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0)
  return `${txt} ${cur}`
}
function normalize(res) {
  const raw = res?.data ?? res
  const list =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.items) && raw.items) ||
    (Array.isArray(raw?.data?.items) && raw.data.items) ||
    []

  const t =
    (typeof raw?.total === 'number' && raw.total) ||
    (typeof raw?.data?.total === 'number' && raw.data.total) ||
    (typeof raw?.meta?.total === 'number' && raw.meta.total) ||
    list.length

  const per =
    (typeof raw?.limit === 'number' && raw.limit) ||
    (typeof raw?.per_page === 'number' && raw.per_page) ||
    (typeof raw?.data?.per_page === 'number' && raw.data.per_page) ||
    limit.value

  return { list, total: t, perPage: per }
}

// fetch
async function load() {
  const id = route.params.id
  if (!id) { err.value = 'Noto‘g‘ri foydalanuvchi ID'; return }
  loading.value = true
  err.value = ''
  try {
    const res = await api.get(`/dashboard/con/ex-history/${id}`, {
      params: { page: page.value, limit: limit.value, type: 'debitor' },
    })

    const { list, total: t, perPage } = normalize(res)

    rows.value = list.map((it) => {
      // creditor (qarz oluvchi) nomi va uid’ini moslab olamiz
      const creditorName =
        it.creditor_name ||
        [it.c_last_name, it.c_first_name, it.c_middle_name].filter(Boolean).join(' ')
      const creditorUid = it.creditor_uid || it.c_uid || it.creditorUid

      return {
        creditor_name: creditorName || '—',
        creditor_uid: creditorUid,
        amount: it.amount ?? 0,
        residual_amount: it.residual_amount ?? it.remain ?? 0,
        currency: it.currency ?? 'UZS',
        created_at: it.created_at ?? it.start_date ?? it.issued_at,
        number: it.number ?? it.contract_no ?? it.code ?? '',
        uid: it.uid ?? it.contract_uid ?? it.contractUid ?? '',
      }
    })

    total.value = t
    if (perPage && perPage !== limit.value) limit.value = perPage
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Yuklashda xatolik'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// pagination
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)
function prevPage() { if (canPrev.value) page.value-- }
function nextPage() { if (canNext.value) page.value++ }

watch([page, limit, () => route.params.id], load, { immediate: true })
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-800">Muddati o‘tgan (debitor)</h1>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr class="text-left text-xs font-semibold text-slate-600">
              <th class="px-4 py-3">Qarz oluvchi</th>
              <th class="px-4 py-3">Qarz summasi</th>
              <th class="px-4 py-3">Qolgan qarz summasi</th>
              <th class="px-4 py-3">Qarz berilgan sana</th>
              <th class="px-4 py-3">Qarz shartnomasi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-6 text-center text-slate-500">Yuklanmoqda…</td>
            </tr>
            <tr v-else-if="err">
              <td colspan="5" class="px-4 py-6 text-center text-rose-600">{{ err }}</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-slate-500">Ma’lumot topilmadi</td>
            </tr>

            <tr v-for="(r, i) in rows" :key="i" class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <RouterLink
                  v-if="r.creditor_uid"
                  :to="`/users/${r.creditor_uid}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ r.creditor_name }}
                </RouterLink>
                <span v-else>{{ r.creditor_name }}</span>
              </td>
              <td class="px-4 py-3 font-medium text-slate-800">
                {{ fmtAmount(r.amount, r.currency) }}
              </td>
              <td class="px-4 py-3">
                {{ fmtAmount(r.residual_amount, r.currency) }}
              </td>
              <td class="px-4 py-3">
                {{ fmtDate(r.created_at) }}
              </td>
              <td class="px-4 py-3">
                <a
                  v-if="r.uid"
                  class="text-primary-600 hover:underline"
                  :href="`https://pdf.zerox.uz/index.php?id=${r.uid}&download=1`"
                  target="_blank"
                  rel="noopener"
                >
                  {{ r.number || '—' }}
                </a>
                <span v-else>{{ r.number || '—' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- footer / pagination -->
      <div class="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
        <div class="text-sm text-slate-600">
          Sahifa {{ page }} / {{ Math.max(1, Math.ceil(total / limit)) }}
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
        </div>
      </div>
    </div>
  </div>
</template>
