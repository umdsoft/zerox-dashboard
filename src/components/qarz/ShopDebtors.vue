<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '../../lib/axios'
import PagerBar from '../ui/PagerBar.vue'

// Do'konning BARCHA qarzdorlari (mijozlari): 10 tadan sahifalanadi, telefon + SMS tugmasi.
const props = defineProps({ shopId: { type: [Number, String], required: true } })

const LIMIT = 10
const nf = new Intl.NumberFormat('ru-RU')
const fmtN = (v) => nf.format(Number(v ?? 0))

const items = ref([])
const total = ref(0)
const page = ref(1)
const q = ref('')
const loading = ref(false)
const err = ref('')

async function load() {
  loading.value = true; err.value = ''
  try {
    const res = await api.get(`/dashboard/stats/qarz-daftari/shops/${props.shopId}/debtors`, {
      params: { page: page.value, limit: LIMIT, q: q.value || undefined },
    })
    const d = res?.data?.data || {}
    items.value = d.items || []
    total.value = Number(d.total || 0)
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Yuklashda xatolik'
  } finally { loading.value = false }
}
function setPage(p) { page.value = p; load() }
let timer = null
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; load() }, 350)
}
onMounted(load)
watch(() => props.shopId, () => { page.value = 1; q.value = ''; load() })

// ---- SMS oynasi ----
const SMS_LIMIT = 10
const smsOpen = ref(false)
const smsDebtor = ref(null)
const smsItems = ref([])
const smsTotal = ref(0)
const smsPage = ref(1)
const smsLoading = ref(false)
const smsErr = ref('')

async function loadSms() {
  if (!smsDebtor.value) return
  smsLoading.value = true; smsErr.value = ''
  try {
    const res = await api.get(
      `/dashboard/stats/qarz-daftari/shops/${props.shopId}/debtors/${smsDebtor.value.mijoz_id}/sms`,
      { params: { page: smsPage.value, limit: SMS_LIMIT } },
    )
    const d = res?.data?.data || {}
    smsItems.value = d.items || []
    smsTotal.value = Number(d.total || 0)
  } catch (e) {
    smsErr.value = e?.response?.data?.message || e?.message || 'Yuklashda xatolik'
  } finally { smsLoading.value = false }
}
function openSms(row) {
  smsDebtor.value = row; smsPage.value = 1; smsItems.value = []; smsTotal.value = 0
  smsOpen.value = true
  loadSms()
}
function setSmsPage(p) { smsPage.value = p; loadSms() }

function fmtDateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  const p = (x) => String(x).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const STATUS = {
  sent: { label: 'Yuborilgan', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Xato', cls: 'bg-rose-100 text-rose-700' },
  pending: { label: 'Kutilmoqda', cls: 'bg-amber-100 text-amber-700' },
}
const st = (s) => STATUS[s] || { label: s || '—', cls: 'bg-slate-100 text-slate-600' }
const TYPE = { auto: 'Avto', manual: 'Qo‘lda', registration: 'Ro‘yxat', payment_link: 'To‘lov havolasi' }
const tp = (t) => TYPE[t] || t || '—'
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div class="flex items-center justify-between gap-3 flex-wrap p-6 pb-4">
      <div class="flex items-baseline gap-3">
        <h3 class="text-base font-semibold text-slate-800">Qarzdorlar (mijozlar)</h3>
        <span class="text-xs font-semibold text-slate-500">jami {{ fmtN(total) }} ta</span>
      </div>
      <input
        v-model="q" type="search" placeholder="Ism yoki telefon bo‘yicha qidirish"
        class="border rounded-lg px-3 py-1.5 text-sm w-64" @input="onSearch"
      />
    </div>

    <div v-if="err" class="px-6 pb-4 text-sm text-rose-600">{{ err }}</div>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-y border-slate-200 text-xs font-semibold text-slate-500">
            <th class="px-3 py-2 text-left">Mijoz</th>
            <th class="px-3 py-2 text-left">Telefon</th>
            <th class="px-3 py-2 text-right">Qarzlar</th>
            <th class="px-3 py-2 text-right">Berilgan</th>
            <th class="px-3 py-2 text-right">Qoldiq</th>
            <th class="px-3 py-2 text-right">SMS</th>
            <th class="px-3 py-2 text-center"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="r in items" :key="r.mijoz_id" class="hover:bg-slate-50/60">
            <td class="px-3 py-2.5 font-medium text-slate-800">{{ r.fish }}</td>
            <td class="px-3 py-2.5 tabular-nums text-slate-600">{{ r.telefon || '—' }}</td>
            <td class="px-3 py-2.5 text-right tabular-nums text-slate-600">{{ fmtN(r.qarz_count) }}</td>
            <td class="px-3 py-2.5 text-right tabular-nums text-slate-800">
              <div v-if="r.berilgan_uzs || !r.berilgan_usd">{{ fmtN(r.berilgan_uzs) }} <span class="text-xs text-slate-400">UZS</span></div>
              <div v-if="r.berilgan_usd">{{ fmtN(r.berilgan_usd) }} <span class="text-xs text-slate-400">USD</span></div>
            </td>
            <td class="px-3 py-2.5 text-right tabular-nums text-rose-700">
              <div v-if="r.qoldiq_uzs || !r.qoldiq_usd">{{ fmtN(r.qoldiq_uzs) }} <span class="text-xs text-slate-400">UZS</span></div>
              <div v-if="r.qoldiq_usd">{{ fmtN(r.qoldiq_usd) }} <span class="text-xs text-slate-400">USD</span></div>
            </td>
            <td class="px-3 py-2.5 text-right tabular-nums text-slate-600">{{ fmtN(r.sms_sent) }}<span v-if="r.sms_total !== r.sms_sent" class="text-xs text-slate-400"> / {{ fmtN(r.sms_total) }}</span></td>
            <td class="px-3 py-2.5 text-center">
              <button
                class="px-2.5 py-1 rounded-lg border text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
                :disabled="!r.sms_total" @click="openSms(r)"
              >SMS xabarlar</button>
            </td>
          </tr>
          <tr v-if="!items.length && !loading">
            <td colspan="7" class="px-3 py-6 text-center text-slate-400">Qarzdorlar topilmadi</td>
          </tr>
          <tr v-if="loading"><td colspan="7" class="px-3 py-6 text-center text-slate-400">Yuklanmoqda…</td></tr>
        </tbody>
      </table>
    </div>
    <PagerBar :page="page" :limit="LIMIT" :total="total" :disabled="loading" @change="setPage" />

    <!-- SMS modal -->
    <div v-if="smsOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="smsOpen = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p class="font-semibold text-slate-800">{{ smsDebtor?.fish }}</p>
            <p class="text-xs text-slate-500">{{ smsDebtor?.telefon || '—' }} · yuborilgan SMS xabarlar</p>
          </div>
          <button class="text-slate-400 hover:text-slate-700 text-xl leading-none" @click="smsOpen = false">×</button>
        </div>
        <div class="overflow-y-auto flex-1">
          <div v-if="smsErr" class="p-5 text-sm text-rose-600">{{ smsErr }}</div>
          <div v-else-if="smsLoading" class="p-5 text-sm text-slate-400 text-center">Yuklanmoqda…</div>
          <div v-else-if="!smsItems.length" class="p-5 text-sm text-slate-400 text-center">SMS topilmadi</div>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="m in smsItems" :key="m.id" class="px-5 py-3">
              <div class="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <span class="tabular-nums">{{ fmtDateTime(m.sent_at) }}</span>
                <span>· {{ tp(m.type) }}</span>
                <span :class="['rounded-md px-2 py-0.5 font-medium', st(m.status).cls]">{{ st(m.status).label }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-800 whitespace-pre-wrap break-words">{{ m.message }}</p>
              <p v-if="m.error_message" class="mt-1 text-xs text-rose-600">{{ m.error_message }}</p>
            </li>
          </ul>
        </div>
        <PagerBar :page="smsPage" :limit="SMS_LIMIT" :total="smsTotal" :disabled="smsLoading" @change="setSmsPage" />
      </div>
    </div>
  </div>
</template>
