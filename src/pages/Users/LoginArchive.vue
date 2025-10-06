<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../lib/axios'

const route = useRoute()

// state
const loading = ref(false)
const err = ref('')
const logs = ref([])

// pagination
const page = ref(1)           // 1-based
const limit = ref(10)         // default 10 per page
const total = ref(0)

// -------- utils
function fmtDateTime(val, extraTime) {
  // Returns "dd.MM.yyyy HH:mm" (if time provided) or "dd.MM.yyyy"
  if (!val && !extraTime) return ''
  // already like "dd.MM.yyyy"
  if (val && /^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
    return extraTime ? `${val} ${String(extraTime).slice(0,5)}` : val
  }
  // parse date
  const d = val ? new Date(val) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  // prefer server time if given, else derive HH:mm from created_at
  let hhmm = ''
  if (extraTime) {
    hhmm = String(extraTime).slice(0, 5)
  } else if (val) {
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    hhmm = `${hh}:${min}`
  }
  return hhmm ? `${dd}.${mm}.${yyyy} ${hhmm}` : `${dd}.${mm}.${yyyy}`
}

function normalizeResponse(res) {
  const raw = res?.data ?? res
  const items =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.items) && raw.items) ||
    (Array.isArray(raw?.data?.items) && raw.data.items) ||
    []

  const t =
    (typeof raw?.total === 'number' && raw.total) ||
    (typeof raw?.data?.total === 'number' && raw.data.total) ||
    (typeof raw?.meta?.total === 'number' && raw.meta.total) ||
    items.length

  const per =
    (typeof raw?.limit === 'number' && raw.limit) ||
    (typeof raw?.per_page === 'number' && raw.per_page) ||
    (typeof raw?.data?.per_page === 'number' && raw.data.per_page) ||
    limit.value

  return { items, total: t, perPage: per }
}

// computed
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)

// API
async function load() {
  const id = route.params.id
  if (!id) { err.value = 'Foydalanuvchi ID topilmadi'; return }
  loading.value = true
  err.value = ''
  try {
    const res = await api.get(`/user/archive/${id}`, {
      params: {
        page: page.value,
        limit: limit.value,
      },
    })
    const { items, total: t, perPage } = normalizeResponse(res)

    // Map diverse field names → consistent UI model
    logs.value = items.map((it) => {
      const ip = it.ip_address ?? it.ip ?? it.ipaddr ?? '—'
      const region = it.region ?? it.location ?? it.city ?? '—'
      const device = it.device ?? it.ua ?? it.user_agent ?? '—'
      const created = it.created_at ?? it.date ?? it.time_at
      const time = it.time ?? it.login_time ?? null
      return {
        ip,
        region,
        device,
        created_at_fmt: fmtDateTime(created, time),
      }
    })

    total.value = t
    if (perPage && perPage !== limit.value) limit.value = perPage
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Maʼlumotlarni yuklashda xatolik.'
    logs.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function nextPage() { if (canNext.value) page.value += 1 }
function prevPage() { if (canPrev.value) page.value -= 1 }
function changeLimit(e) {
  const v = Number(e?.target?.value || limit.value)
  if (v > 0) { limit.value = v; page.value = 1 }
}

watch([page, limit, () => route.params.id], load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Tizimga kirishlar arxivi</h1>
        <p class="text-sm text-slate-500">Foydalanuvchining login faoliyati.</p>
      </div>

      <!-- rows per page -->
      <div class="flex items-center gap-2">
        <label class="text-sm text-slate-600">Sahifadagi maʼlumotlar:</label>
        <select
          class="border rounded px-2 py-1 text-sm"
          :value="limit"
          @change="changeLimit"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>

    <!-- table -->
    <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr class="text-left text-xs font-semibold text-slate-600">
              <th class="px-4 py-3">IP manzil</th>
              <th class="px-4 py-3">Hudud</th>
              <th class="px-4 py-3">Kirilgan qurilma</th>
              <th class="px-4 py-3">Kirish vaqti</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-if="loading">
              <td colspan="4" class="px-4 py-6 text-center text-slate-500">Yuklanmoqda…</td>
            </tr>
            <tr v-else-if="err">
              <td colspan="4" class="px-4 py-6 text-center text-rose-600">{{ err }}</td>
            </tr>
            <tr v-else-if="!logs.length">
              <td colspan="4" class="px-4 py-6 text-center text-slate-500">Maʼlumot topilmadi</td>
            </tr>

            <tr v-for="(row, i) in logs" :key="i" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-mono">{{ row.ip }}</td>
              <td class="px-4 py-3">{{ row.region }}</td>
              <td class="px-4 py-3">{{ row.device }}</td>
              <td class="px-4 py-3">{{ row.created_at_fmt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- pagination -->
    <div class="flex items-center justify-between">
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
</template>
