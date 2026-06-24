<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../lib/axios'

// ---------- TOP STATS ----------
// Har bir karta endi 2 ta ko'rsatkich: asosiy son + "shundan bu oyda" sub-qiymat.
// Backend `/dashboard/statistic` 8 ta qiymatni qaytaradi (4 ta juftlik).
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
const nf = new Intl.NumberFormat('ru-RU')
const fmtN = (v) => nf.format(v ?? 0)
const fmtC = (v) => `${fmtN(v)} UZS`

// Pulni qisqartirilgan ko'rinishda — ming / mln / mlrd (masalan: 164,6 ming, 10 mln, 2,5 mlrd UZS).
// 1000 dan kichik bo'lsa to'liq son ko'rsatiladi.
function fmtMoneyCompact(v) {
  const n = Number(v ?? 0)
  const abs = Math.abs(n)
  const oneDec = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',')
  if (abs >= 1e9) return `${oneDec(n / 1e9)} mlrd UZS`
  if (abs >= 1e6) return `${oneDec(n / 1e6)} mln UZS`
  if (abs >= 1e3) return `${oneDec(n / 1e3)} ming UZS`
  return `${fmtN(n)} UZS`
}

const topStats = computed(() => ([
  {
    key: 'users_registered',
    label: "Ro'yxatdan o'tgan foydalanuvchilar",
    value: fmtN(overviewStats.value.usersRegistered),
    sub: `Shundan bu oyda: ${fmtN(overviewStats.value.usersRegisteredThisMonth)}`,
    icon: 'users',
    tint: 'bg-sky-100 text-sky-600',
  },
  {
    key: 'users_active',
    label: 'Aktiv foydalanuvchilar',
    value: fmtN(overviewStats.value.usersActive),
    sub: `Shundan bu oyda: ${fmtN(overviewStats.value.usersActiveThisMonth)}`,
    icon: 'users',
    tint: 'bg-emerald-100 text-emerald-600',
  },
  {
    key: 'contracts_total',
    label: 'Shartnomalar',
    value: fmtN(overviewStats.value.contractsTotal),
    sub: `Shundan bu oyda: ${fmtN(overviewStats.value.contractsThisMonth)}`,
    icon: 'file-invoice',
    tint: 'bg-indigo-100 text-indigo-600',
  },
  {
    key: 'revenue_total',
    label: 'Jami tushum',
    value: fmtMoneyCompact(overviewStats.value.revenueTotal),
    sub: `Shundan bu oyda: ${fmtMoneyCompact(overviewStats.value.revenueThisMonth)}`,
    icon: 'wallet',
    tint: 'bg-amber-100 text-amber-600',
  },
]))

// ---------- RAW DATA ----------
const regionRaw = ref({ labels: [], values: [] })
const ageRaw    = ref({ labels: [], values: [] })
const genderRaw = ref({ labels: [], values: [] })

// Qarz daftari umumiy summalari (valyuta kesimida)
const qarzDaftari = ref({
  UZS: { soni: 0, berilgan: 0, qaytarilgan: 0, qoldiq: 0 },
  USD: { soni: 0, berilgan: 0, qaytarilgan: 0, qoldiq: 0 },
})
// UZS doim ko'rsatiladi; USD faqat ma'lumot bo'lsa
const qdCards = computed(() => {
  const out = []
  for (const cur of ['UZS', 'USD']) {
    const d = qarzDaftari.value?.[cur]
    if (d && (Number(d.soni) > 0 || cur === 'UZS')) out.push({ cur, ...d })
  }
  return out
})

// Qarz daftari — do'kon kesimida (do'konlar ro'yxati: har do'kon nechta/qancha qarz)
const qdStores = ref([])

const num = (v)=>Number.isFinite(Number(v))?Number(v):0

// ---------- COLOR PALETTE ----------
const palette = ['#0ea5e9','#22d3ee','#6366f1','#a855f7','#f472b6','#f97316','#facc15','#34d399','#14b8a6','#fb7185']
const colorsFor = (n)=>Array.from({length:n},(_,i)=>palette[i%palette.length])

// ---------- LABEL NORMALIZERS ----------
// "Луғат топилмади" / "lug'at topilmadi" kabi aniqlanmagan hududlarni tushunarli qilib ko'rsatamiz.
function normalizeRegionLabel(label){
  const s = String(label ?? '').trim()
  if (!s || /топилмади|topilmadi|lug.?at/i.test(s)) return 'Aniqlanmagan hudud'
  return s
}
// Yosh oralig'ini tushunarli ko'rinishga keltiramiz ("18 - 25" -> "18–25 yosh").
function normalizeAgeLabel(label){
  const s = String(label ?? '').trim()
  // Tug'ilgan sanasi kiritilmagan foydalanuvchilar (backend "Not Filled In (NULL)" qaytaradi)
  if (/not\s*filled|null|nan/i.test(s)) return 'Tug‘ilgan sana kiritilmagan'
  if (/^under\s*\d+/i.test(s))  return s.replace(/^under\s*(\d+)/i, '$1 yoshgacha')
  if (/^over\s*\d+/i.test(s))   return s.replace(/^over\s*(\d+)/i, '$1 yoshdan yuqori')
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/)
  if (m) return `${m[1]}–${m[2]} yosh`
  return s || 'Nomaʼlum'
}

// ---------- ENTRIES (sanitized, >0) ----------
function toEntries(dataset, { sortDesc = false } = {}){
  const labels = dataset.labels || []
  const values = (dataset.values || []).map(num)
  let entries = labels.map((label, i)=>({ label, value: values[i]||0 }))
                      .filter(e=>e.value>0)
  if (sortDesc) entries = entries.slice().sort((a,b)=>b.value-a.value)
  const cols = colorsFor(entries.length)
  return entries.map((e,i)=>({ ...e, color: cols[i] }))
}
// Hududlar — kamayish tartibida (reyting); yosh va jins tabiiy tartibida.
const regionEntries = computed(()=>toEntries(regionRaw.value, { sortDesc: true }))
const ageEntries    = computed(()=>toEntries(ageRaw.value))
const genderEntries = computed(()=>toEntries(genderRaw.value))

const regionTotal = computed(()=>regionEntries.value.reduce((s,e)=>s+e.value,0))
const ageTotal    = computed(()=>ageEntries.value.reduce((s,e)=>s+e.value,0))
const genderTotal = computed(()=>genderEntries.value.reduce((s,e)=>s+e.value,0))

// ---------- SECTION COMPOSITION ----------
const sections = computed(()=>[
  { key:'region', title:'Hududlar kesimida (reyting)', total:regionTotal.value, entries:regionEntries.value },
  { key:'age',    title:'Yosh kesimida',               total:ageTotal.value,    entries:ageEntries.value },
  { key:'gender', title:'Jins kesimida',               total:genderTotal.value, entries:genderEntries.value },
])

// ---------- LOAD ----------
const pieLoading = ref(false), pieError = ref('')
async function loadData(){
  pieLoading.value=true; pieError.value=''
  try{
    const { data } = await api.get('/dashboard/statistic')
    const s = data ?? {}
    // Regions
    const rs = Array.isArray(s.byRegion) ? s.byRegion : []
    regionRaw.value = {
      labels: rs.map(r=>normalizeRegionLabel(r.region ?? r.region_name ?? r.name)),
      values: rs.map(r=>num(r.cnt ?? r.count ?? r.total))
    }
    // Age
    const as = Array.isArray(s.byAge) ? s.byAge : []
    ageRaw.value = {
      labels: as.map(a=>normalizeAgeLabel(a.age_range ?? a.label)),
      values: as.map(a=>num(a.count ?? a.cnt ?? a.total))
    }
    // Gender
    const gs = Array.isArray(s.byGender) ? s.byGender : []
    const gL=[], gV=[]
    gs.forEach(g=>{
      const raw = String(g.gender ?? g.label ?? '').toLowerCase()
      let label='Nomaʼlum'
      if(raw==='1'||raw==='male'||raw==='erkak') label='Erkaklar'
      if(raw==='2'||raw==='female'||raw==='ayol') label='Ayollar'
      gL.push(label); gV.push(num(g.cnt ?? g.count ?? g.total))
    })
    genderRaw.value = { labels:gL, values:gV }

    // Overview — 4 ta karta uchun 8 ta ko'rsatkich
    const ov = s.stats ?? {}
    overviewStats.value = {
      usersRegistered:          num(ov.usersRegistered ?? ov.users_registered),
      usersRegisteredThisMonth: num(ov.usersRegisteredThisMonth ?? ov.users_registered_this_month),
      usersActive:              num(ov.usersActive ?? ov.users_active),
      usersActiveThisMonth:     num(ov.usersActiveThisMonth ?? ov.users_active_this_month),
      contractsTotal:           num(ov.contractsTotal ?? ov.contracts_total),
      contractsThisMonth:       num(ov.contractsThisMonth ?? ov.contracts_this_month),
      revenueTotal:             num(ov.revenueTotal ?? ov.revenue_total),
      revenueThisMonth:         num(ov.revenueThisMonth ?? ov.revenue_this_month),
    }

    // Qarz daftari umumiy summalari
    const qd = s.qarzDaftari ?? {}
    const pick = (c) => ({
      soni: num(c?.soni), berilgan: num(c?.berilgan),
      qaytarilgan: num(c?.qaytarilgan), qoldiq: num(c?.qoldiq),
    })
    qarzDaftari.value = { UZS: pick(qd.UZS), USD: pick(qd.USD) }

    // Do'kon kesimi (do'konlar ro'yxati)
    qdStores.value = Array.isArray(s.qarzDaftariByStore) ? s.qarzDaftariByStore : []
  }catch(e){
    pieError.value='Maʼlumotlarni yuklashda xatolik yuz berdi.'
    regionRaw.value=ageRaw.value=genderRaw.value={labels:[],values:[]}
  }finally{
    pieLoading.value=false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <!-- 4 top stats — har biri: asosiy son + "shundan bu oyda" sub-qiymat -->
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="s in topStats"
        :key="s.key"
        class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div :class="['h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.tint]">
          <fa :icon="s.icon" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] tracking-wide text-slate-400 font-semibold">{{ s.label }}</div>
          <div class="mt-1 text-2xl font-bold text-slate-800 truncate">{{ s.value }}</div>
          <div class="mt-1 text-xs font-medium text-slate-500 truncate">{{ s.sub }}</div>
        </div>
      </div>
    </div>

    <!-- 3 ma'lumot bloklari (diagrammasiz, reyting ko'rinishida) -->
    <div class="grid gap-6 xl:grid-cols-3">
      <div v-for="sec in sections" :key="sec.key" class="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-base font-semibold text-slate-800">{{ sec.title }}</h3>
          <span class="text-xs font-semibold text-slate-500">Jami: {{ fmtN(sec.total) }}</span>
        </div>

        <div class="mt-4 rounded-2xl border border-slate-100 bg-white/70 p-4">
          <h4 class="text-sm font-semibold text-slate-700">Maʼlumotlar</h4>

          <div v-if="pieLoading" class="mt-3 text-sm text-slate-400">Yuklanmoqda…</div>
          <div v-else-if="pieError" class="mt-3 text-sm text-rose-500">{{ pieError }}</div>

          <ul v-else-if="sec.entries.length" class="mt-3 divide-y divide-slate-100 text-sm">
            <li v-for="e in sec.entries" :key="e.label" class="flex items-center justify-between gap-3 py-1.5">
              <span class="flex items-center gap-2 text-slate-700 min-w-0">
                <span class="inline-block h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: e.color }"></span>
                <span class="truncate">{{ e.label }}</span>
              </span>
              <span class="font-semibold text-slate-900 tabular-nums shrink-0">{{ fmtN(e.value) }}</span>
            </li>
          </ul>

          <div v-else class="mt-3 text-sm text-slate-400">Maʼlumot mavjud emas</div>
        </div>
      </div>
    </div>

    <!-- Qarz daftari — umumiy summalar (valyuta kesimida) -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-base font-semibold text-slate-800">Qarz daftari (umumiy)</h3>
      </div>

      <div v-if="pieLoading" class="mt-4 text-sm text-slate-400">Yuklanmoqda…</div>
      <div v-else class="mt-4 grid gap-4 sm:grid-cols-2">
        <div v-for="c in qdCards" :key="c.cur" class="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{{ c.cur }}</span>
            <span class="text-xs text-slate-500">{{ fmtN(c.soni) }} ta qarz</span>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-[11px] text-slate-500">Berilgan</div>
              <div class="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">{{ fmtN(c.berilgan) }}</div>
            </div>
            <div>
              <div class="text-[11px] text-slate-500">Qaytarilgan</div>
              <div class="mt-0.5 text-sm font-bold text-emerald-700 tabular-nums">{{ fmtN(c.qaytarilgan) }}</div>
            </div>
            <div>
              <div class="text-[11px] text-slate-500">Qoldiq</div>
              <div class="mt-0.5 text-sm font-bold text-rose-700 tabular-nums">{{ fmtN(c.qoldiq) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Qarz daftari — DO'KONLAR RO'YXATI (har do'kon nechta/qancha qarz ro'yxatga olgan) -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-base font-semibold text-slate-800">Do'konlar ro'yxati</h3>
        <span class="text-xs font-semibold text-slate-500">{{ fmtN(qdStores.length) }} ta do'kon</span>
      </div>

      <div v-if="pieLoading" class="mt-4 text-sm text-slate-400">Yuklanmoqda…</div>
      <div v-else-if="!qdStores.length" class="mt-4 text-sm text-slate-400">Do'kon qarzlari topilmadi</div>
      <div v-else class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th class="px-3 py-2 text-left">Do'kon</th>
              <th class="px-3 py-2 text-center">Qarzlar soni</th>
              <th class="px-3 py-2 text-right">UZS (jami summa)</th>
              <th class="px-3 py-2 text-right">USD (jami summa)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="st in qdStores" :key="st.faoliyat_id" class="hover:bg-slate-50/60">
              <td class="px-3 py-2.5">
                <div class="font-medium text-slate-800">{{ st.nomi }}</div>
                <div v-if="st.manzil" class="text-xs text-slate-400">{{ st.manzil }}</div>
              </td>
              <td class="px-3 py-2.5 text-center font-semibold text-slate-700 tabular-nums">{{ fmtN(st.soni) }}</td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                <template v-if="st.UZS.soni">
                  <span class="font-semibold text-slate-800">{{ fmtN(st.UZS.jami) }}</span>
                  <span class="ml-1 text-xs text-slate-400">({{ st.UZS.soni }} ta)</span>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                <template v-if="st.USD.soni">
                  <span class="font-semibold text-slate-800">{{ fmtN(st.USD.jami) }}</span>
                  <span class="ml-1 text-xs text-slate-400">({{ st.USD.soni }} ta)</span>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
