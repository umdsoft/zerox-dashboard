<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../lib/axios'
import { pdfUrl as buildPdfUrl } from '../../lib/config'

// ------- STATE -------
const route = useRoute()
const loading = ref(false)
const err = ref('')
const raw = ref({ contract: null, acts: [] }) // eski panel tuzilmasi bilan mos

// ------- HELPERS -------
function fmtDate(val, withYearWord = true) {
  if (!val) return ''
  // "2025-10-05T..." | "2025-10-05" | "05.10.2025"
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return withYearWord ? `${val} yil` : val
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const s = `${dd}.${mm}.${yyyy}`
  return withYearWord ? `${s} yil` : s
}
function fmtMoney(n) {
  if (n == null) return ''
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^\d.-]/g, ''))
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num)
}

// Hujjat turi mapping — backend Act modelidagi to'liq ro'yxat (8 ta turdan iborat).
// Avval 5 va 7 yo'q edi — natijada rad qilingan qisman voz kechish va talab
// dalolatnomalari "—" ko'rinardi.
const DOC_TYPE_MAP = {
  0: "Qarz mablag‘i olinganligi to‘g‘risida dalolatnoma",
  1: "Qarz qisman qaytarilganligi to‘g‘risida dalolatnoma",
  2: "Qarz to‘liq qaytarilganligi to‘g‘risida dalolatnoma",
  3: "Qarz muddati uzaytirilganligi to‘g‘risida dalolatnoma",
  4: "Qarzdan to‘liq voz kechilganligi to‘g‘risida dalolatnoma",
  5: "Qarzdan qisman voz kechilganligi to‘g‘risida dalolatnoma",
  6: "Qarz muddati uzaytirilganligi to‘g‘risida dalolatnoma",
  7: "Qarzni qaytarishni talab qilish dalolatnomasi",
}
const typeLabel = (t) => DOC_TYPE_MAP[Number(t)] ?? '—'

// AKT (dalolatnoma) holati: 1=tasdiqlangan, 2=rad, 0=jarayonda
function statusView(s) {
  const v = Number(s)
  if (v === 1) return { text: 'Tasdiqlangan', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  if (v === 2) return { text: 'Rad qilingan', cls: 'bg-rose-100 text-rose-700 border-rose-200' }
  return { text: 'Jarayonda', cls: 'bg-slate-200 text-slate-700 border-slate-300' }
}

// SHARTNOMA (contract) holati — Contracts ro'yxati (Index.vue) bilan AYNAN bir xil mantiq:
// raqamli kod (0..4) ham, matnli sinonim (jarayonda/rad qilingan...) ham qo'llab-quvvatlanadi.
// Bu yerda qo'shimcha `dot`/`accent` (redizayn uchun) ham bor.
const CONTRACT_STATUS = {
  '0': { label: 'Tasdiqlanmagan', dot: 'bg-slate-400',   badge: 'bg-gray-100 text-gray-700 border-gray-200',          accent: 'from-slate-400 to-slate-500' },
  '1': { label: 'Jarayonda',      dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', accent: 'from-emerald-400 to-emerald-500' },
  '2': { label: 'Tugallangan',    dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       accent: 'from-amber-400 to-amber-500' },
  '3': { label: 'Rad qilingan',   dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700 border-rose-200',          accent: 'from-rose-400 to-rose-500' },
  '4': { label: 'Rad qilingan',   dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700 border-rose-200',          accent: 'from-rose-400 to-rose-500' },
}
const STATUS_ALIASES = {
  tasdiqlanmagan: '0',
  jarayonda: '1', progress: '1', pending: '1', active: '1', aktiv: '1',
  tugallangan: '2', done: '2', completed: '2', 'voz kechilgan': '2', voz_kechilgan: '2', yopilgan: '2',
  'rad qilingan': '3', rejected: '3', cancelled: '3', canceled: '3',
}
function contractStatusKey(val) {
  const v = String(val ?? '').toLowerCase().trim()
  if (CONTRACT_STATUS[v]) return v
  return STATUS_ALIASES[v] ?? null
}
const contractStatus = computed(() => {
  const k = contractStatusKey(contract.value?.status)
  return k
    ? CONTRACT_STATUS[k]
    : { label: '—', dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-600 border-slate-200', accent: 'from-slate-300 to-slate-400' }
})

// ------- NORMALIZED GETTERS -------
const contract = computed(() => raw.value?.contract ?? null)
const acts = computed(() => Array.isArray(raw.value?.acts) ? raw.value.acts : [])

// ------- API (moslashuvchan ajratish) -------
// Backend "contract" ni turli joyda qaytarishi mumkin.
function pickContract(payload) {
  if (payload?.contract) return payload.contract
  if (payload?.data?.contract) return payload.data.contract
  // To'g'ridan-to'g'ri obyektning o'zi shartnoma bo'lishi mumkin
  if (payload && (payload.number != null || payload.uid != null) && payload.amount != null) return payload
  return null
}
// "acts" (amaliyotlar / qarz daftari) turli kalitlarda kelishi mumkin — hammasini sinab ko'ramiz.
// MUHIM: agar `payload.acts` mavjud bo'lsa (hatto bo'sh massiv bo'lsa ham), uni
// qaytaramiz — heuristika boshqa nomdagi massivni xato kategoriyaga olib
// chiqmasin (masalan, contract.acts NULL bo'lsa). Backend
// `{ success, contract, acts: [...] }` qaytaradi, shuning uchun shu yagona
// muvofiqlikni hurmat qilamiz.
function pickActs(payload, contract) {
  if (Array.isArray(payload?.acts)) return payload.acts
  if (Array.isArray(payload?.data?.acts)) return payload.data.acts
  const candidates = [
    payload?.documents, payload?.operations, payload?.history,
    payload?.actions, payload?.daftar, payload?.dalolatnoma, payload?.dalolatnomalar,
    payload?.data?.documents,
    contract?.acts, contract?.documents, contract?.operations, contract?.history,
  ]
  for (const c of candidates) if (Array.isArray(c) && c.length) return c
  // Heuristika: ichidagi birinchi "amaliyotga o'xshash" massiv (type/status/summa maydonlari bor)
  for (const src of [payload, contract]) {
    for (const v of Object.values(src || {})) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object' &&
          ('type' in v[0] || 'status' in v[0] || 'residual_amount' in v[0] || 'refundable_amount' in v[0])) {
        return v
      }
    }
  }
  return []
}
// Har bir amaliyot maydonlarini turli nomlarga moslaymiz.
function normalizeAct(a) {
  return {
    id: a.id ?? a._id ?? a.uid,
    type: a.type ?? a.doc_type ?? a.documentType ?? a.act_type,
    created_at: a.created_at ?? a.createdAt ?? a.create_time ?? a.approved_time ?? a.date ?? a.created,
    refundable_amount: a.refundable_amount ?? a.refund_amount ?? a.returned_amount ?? a.paid_amount ?? 0,
    vos_summa: a.vos_summa ?? a.voz_summa ?? a.waived_amount ?? a.vos_amount ?? 0,
    residual_amount: a.residual_amount ?? a.remain ?? a.remainder ?? a.qoldiq ?? 0,
    end_date: a.end_date ?? a.return_date ?? a.due_date ?? a.end,
    status: a.status,
    res_name: a.res_name ?? a.responsible_name ?? a.executor ?? a.res,
  }
}

async function load() {
  const id = route.params.id
  if (!id) { err.value = 'Noto‘g‘ri kontrakt ID'; return }
  loading.value = true
  err.value = ''
  try {
    const res = await api.get(`/contract/admin/contract/${id}`)
    const payload = res?.data?.data ?? res?.data ?? res ?? {}
    const contractObj = pickContract(payload)
    raw.value = {
      contract: contractObj,
      acts: pickActs(payload, contractObj).map(normalizeAct),
    }
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Yuklashda xatolik'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.params.id, load)

// ------- PDF YUKLAB OLISH -------
// Markazlashtirilgan config.js'dagi pdfUrl helper'i orqali — PDF_BASE manzili
// .env dan keladi. Hardcoded URL endi yo'q (testdan testga ko'chirish o'rinli).
const locale = 'uz'
const pdfUrl = computed(() => buildPdfUrl(contract.value?.uid, { lang: locale, download: 1 }))
const pdfAllUrl = computed(() => {
  if (!contract.value?.uid) return '#'
  // Backend "all=1" qo'shimcha parametrini ham kutadi — pdfUrl helper buni
  // qaytarganini "all=1" bilan boyitamiz (raw query qo'shamiz).
  const base = buildPdfUrl(contract.value.uid, { lang: locale, download: 1 })
  return base === '#' ? '#' : `${base}&all=1`
})
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center text-slate-500">
      Yuklanmoqda…
    </div>

    <div v-else-if="err" class="rounded-xl border border-rose-200 bg-rose-50 p-6 shadow-sm text-rose-700">
      {{ err }}
    </div>

    <div v-else-if="contract" class="space-y-6">
      <!-- ====== Shartnoma sarlavha kartasi (redizayn) ====== -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <!-- Statusga mos rangli aksent chizig'i -->
        <div :class="['h-1.5 w-full bg-gradient-to-r', contractStatus.accent]"></div>

        <div class="p-6">
          <!-- Top: sarlavha + status badge + PDF tugmalar -->
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-xl md:text-2xl font-semibold text-slate-800">
                  {{ contract.number }}-sonli qarz shartnomasi
                </h2>
                <span :class="['inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold', contractStatus.badge]">
                  <span :class="['h-2 w-2 rounded-full', contractStatus.dot]"></span>
                  {{ contractStatus.label }}
                </span>
              </div>
              <p class="mt-1.5 text-sm text-slate-400">Shartnoma ID: {{ contract.uid || contract.id }}</p>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <a :href="pdfUrl" download
                 class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
                <span class="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">PDF</span>
                <span>Shartnomani yuklab olish</span>
              </a>
              <a :href="pdfAllUrl" download
                 class="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                <span class="rounded bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-bold">PDF</span>
                <span>Barcha hujjatlar</span>
              </a>
            </div>
          </div>

          <!-- Info kartalar grid -->
          <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <!-- Qarz miqdori (aksent) -->
            <div class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div class="text-xs font-medium text-indigo-500">Qarz miqdori</div>
              <div class="mt-1 text-xl font-bold text-indigo-700">{{ fmtMoney(contract.amount) }} {{ contract.currency }}</div>
            </div>
            <!-- Debitor -->
            <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div class="text-xs font-medium text-slate-500">Qarz beruvchi (Debitor)</div>
              <div class="mt-1 text-sm font-semibold text-slate-800 break-words">{{ contract.debitor_name?.trim() || '—' }}</div>
            </div>
            <!-- Kreditor -->
            <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div class="text-xs font-medium text-slate-500">Qarz oluvchi (Kreditor)</div>
              <div class="mt-1 text-sm font-semibold text-slate-800 break-words">{{ contract.creditor_name?.trim() || '—' }}</div>
            </div>
            <!-- Sanalar -->
            <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div class="text-xs font-medium text-slate-500">Rasmiylashtirilgan</div>
              <div class="mt-1 text-sm font-semibold text-slate-800">{{ fmtDate(contract.created_at, false) || '—' }}</div>
              <div class="mt-2 text-xs font-medium text-slate-500">Qaytarish sanasi</div>
              <div class="mt-0.5 text-sm font-semibold text-slate-800">{{ fmtDate(contract.end_date, false) || '—' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== Aktlar (dalolatnomalar) jadvali — o'zgarmadi ====== -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead>
            <tr class="text-left text-xs font-semibold text-slate-600">
              <th class="px-4 py-3 w-12">№</th>
              <th class="px-4 py-3">Hujjat turi</th>
              <th class="px-4 py-3">Yaratilgan sana</th>
              <th class="px-4 py-3 text-center">Qaytarilgan miqdor</th>
              <th class="px-4 py-3 text-center">Voz kechilgan miqdor</th>
              <th class="px-4 py-3 text-center">Qoldiq qarz miqdori</th>
              <th class="px-4 py-3 text-center">Qarzni qaytarish sanasi</th>
              <th class="px-4 py-3 text-center">Amaliyot</th>
              <th class="px-4 py-3">Amaliyot kim tomonidan bajarildi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-if="!acts.length">
              <td colspan="9" class="px-4 py-6 text-center text-slate-500">Ma’lumot topilmadi</td>
            </tr>

            <tr v-for="(item, index) in acts" :key="item.id || index" class="hover:bg-slate-50">
              <td class="px-4 py-3">{{ index + 1 }}</td>

              <td class="px-4 py-3">{{ typeLabel(item.type) }}</td>

              <td class="px-4 py-3">{{ fmtDate(item.created_at) }}</td>

              <td class="px-4 py-3 text-center">
                <template v-if="Number(item.refundable_amount) !== 0">
                  {{ fmtMoney(item.refundable_amount) }} {{ contract.currency }}
                </template>
                <template v-else>—</template>
              </td>

              <td class="px-4 py-3 text-center">
                <template v-if="Number(item.vos_summa) !== 0">
                  {{ fmtMoney(item.vos_summa) }} {{ contract.currency }}
                </template>
                <template v-else>—</template>
              </td>

              <td class="px-4 py-3 text-center">
                <template v-if="Number(item.residual_amount) !== 0">
                  {{ fmtMoney(item.residual_amount) }} {{ contract.currency }}
                </template>
                <template v-else>—</template>
              </td>

              <td class="px-4 py-3 text-center">{{ fmtDate(item.end_date) }}</td>

              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold"
                      :class="statusView(item.status).cls">
                  {{ statusView(item.status).text }}
                </span>
              </td>

              <td class="px-4 py-3">
                <template v-if="item.res_name">
                  {{ item.res_name }}
                </template>
                <template v-else>
                  Tizim tomonidan {{ fmtDate(item.created_at, false) }} 23:59 da rad qilindi.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-slate-500">
      Ma’lumot topilmadi
    </div>
  </div>
</template>
