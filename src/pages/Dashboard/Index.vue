<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import api from '../../lib/axios'
import { Chart, PieController, ArcElement, Tooltip, Legend } from 'chart.js'
Chart.register(PieController, ArcElement, Tooltip, Legend)

// ---------- TOP STATS ----------
const overviewStats = ref({ usersTotal: 0, revenueMonthNet: 0, contractsTotal: 0, contractsToday: 0 })
const nf = new Intl.NumberFormat('ru-RU')
const fmtN = (v) => nf.format(v ?? 0)
const fmtC = (v) => `${fmtN(v)} UZS`
const topStats = computed(() => ([
  { key:'users_total',     label:'Aktiv foydalanuvchilar soni',     value:fmtN(overviewStats.value.usersTotal),     icon:'users',        tint:'bg-sky-100 text-sky-600' },
  { key:'month_revenue',   label:'Bu oydagi tushumlar',            value:fmtC(overviewStats.value.revenueMonthNet), icon:'wallet',       tint:'bg-emerald-100 text-emerald-600' },
  { key:'contracts_total', label:'Umumiy Shartnomalar',          value:fmtN(overviewStats.value.contractsTotal),  icon:'file-invoice', tint:'bg-indigo-100 text-indigo-600' },
  { key:'contracts_today', label:'Bugungi shartnomalar',  value:fmtN(overviewStats.value.contractsToday),  icon:'calendar-days',tint:'bg-amber-100 text-amber-600' },
]))

// ---------- RAW DATA ----------
const regionRaw = ref({ labels: [], values: [] })
const ageRaw    = ref({ labels: [], values: [] })
const genderRaw = ref({ labels: [], values: [] })

const num = (v)=>Number.isFinite(Number(v))?Number(v):0

// ---------- COLOR PALETTE ----------
const palette = ['#0ea5e9','#22d3ee','#6366f1','#a855f7','#f472b6','#f97316','#facc15','#34d399','#14b8a6','#fb7185']
const colorsFor = (n)=>Array.from({length:n},(_,i)=>palette[i%palette.length])

// ---------- ENTRIES (sanitized, >0) ----------
function toEntries(dataset){
  const labels = dataset.labels || []
  const values = (dataset.values || []).map(num)
  const entries = labels.map((label, i)=>({ label, value: values[i]||0 }))
                        .filter(e=>e.value>0)
  const cols = colorsFor(entries.length)
  return entries.map((e,i)=>({ ...e, color: cols[i] }))
}
const regionEntries = computed(()=>toEntries(regionRaw.value))
const ageEntries    = computed(()=>toEntries(ageRaw.value))
const genderEntries = computed(()=>toEntries(genderRaw.value))

const regionTotal = computed(()=>regionEntries.value.reduce((s,e)=>s+e.value,0))
const ageTotal    = computed(()=>ageEntries.value.reduce((s,e)=>s+e.value,0))
const genderTotal = computed(()=>genderEntries.value.reduce((s,e)=>s+e.value,0))

// ---------- CANVAS HANDLING ----------
const canvasMap = new Map()
const setCanvasRef = (key)=>(el)=>{ if(el) canvasMap.set(key, el) }
const getCanvas = (el)=>{
  const c = unref(el)
  if (c instanceof HTMLCanvasElement) return c
  if (c?.$el instanceof HTMLCanvasElement) return c.$el
  return null
}
let regionChart=null, ageChart=null, genderChart=null

function drawPie(el, entries, old){
  if(old) old.destroy()
  const canvas = getCanvas(el)
  if(!canvas || !entries?.length) return null
  const ctx = canvas.getContext('2d'); if(!ctx) return null
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: entries.map(e=>e.label),
      datasets: [{
        data: entries.map(e=>e.value),
        backgroundColor: entries.map(e=>e.color),
        borderColor:'#fff', borderWidth:2, hoverOffset:8
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:300},
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{
        label:(ctx)=>{
          const ds = ctx.chart.data.datasets[0]?.data ?? []
          const tot = ds.reduce((s,v)=>s+num(v),0)
          const val = num(ctx.parsed)
          const pct = tot?((val/tot)*100).toFixed(1):'0.0'
          return `${ctx.label}: ${fmtN(val)} (${pct}%)`
        }
      }}}
    }
  })
}

// ---------- SECTION COMPOSITION ----------
const sections = computed(()=>[
  { key:'region', title:'Hududlar kesimida', total:regionTotal.value, entries:regionEntries.value, legendTop:false },
  { key:'age',    title:'Yosh kesimida',     total:ageTotal.value,    entries:ageEntries.value,    legendTop:true  },
  { key:'gender', title:'Jins kesimida',     total:genderTotal.value, entries:genderEntries.value, legendTop:true  },
])

// ---------- LOAD ----------
const pieLoading = ref(false), pieError = ref('')
async function loadData(){
  pieLoading.value=true; pieError.value=''
  try{
    const { data } = await api.get('/dashboard/statistic')
    const s = data ?? {}
    console.log('Dashboard stats:', s)
    // Regions
    const rs = Array.isArray(s.byRegion) ? s.byRegion : []
    regionRaw.value = {
      labels: rs.map(r=>r.region ?? r.region_name ?? r.name ?? 'Nomaʼlum'),
      values: rs.map(r=>num(r.cnt ?? r.count ?? r.total))
    }
    // Age
    const as = Array.isArray(s.byAge) ? s.byAge : []
    ageRaw.value = {
      labels: as.map(a=>a.age_range ?? a.label ?? 'Nomaʼlum'),
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

    // Overview (ixtiyoriy)
    const ov = s.stats ?? {}
    overviewStats.value = {
      usersTotal:      num(ov.usersActive ?? ov.users_total ?? ov.totalUsers ?? ov.users),
      revenueMonthNet: num(ov.revenueThisMonth ?? ov.revenue_month_net ?? ov.monthRevenue ?? ov.revenue ?? ov.totalRevenue),
      contractsTotal:  num(ov.contractsTotal ?? ov.contracts_total ?? ov.totalContracts),
      contractsToday:  num(ov.contractsToday ?? ov.contracts_today ?? ov.todayContracts),
    }
  }catch(e){
    console.error(e); pieError.value='Maʼlumotlarni yuklashda xatolik yuz berdi.'
    regionRaw.value=ageRaw.value=genderRaw.value={labels:[],values:[]}
  }finally{
    pieLoading.value=false
    await nextTick()
    regionChart = drawPie(canvasMap.get('region'), regionEntries.value, regionChart)
    ageChart    = drawPie(canvasMap.get('age'),    ageEntries.value,    ageChart)
    genderChart = drawPie(canvasMap.get('gender'), genderEntries.value, genderChart)
  }
}

// ---------- RESIZE ----------
let ro
onMounted(async ()=>{
  await loadData()
  ro = new ResizeObserver(async ()=>{
    await nextTick()
    regionChart = drawPie(canvasMap.get('region'), regionEntries.value, regionChart)
    ageChart    = drawPie(canvasMap.get('age'),    ageEntries.value,    ageChart)
    genderChart = drawPie(canvasMap.get('gender'), genderEntries.value, genderChart)
  })
  ;['region','age','gender'].forEach(k=>{
    const el = canvasMap.get(k)
    if(el?.parentElement) ro.observe(el.parentElement)
  })
})
onBeforeUnmount(()=>{ regionChart?.destroy(); ageChart?.destroy(); genderChart?.destroy(); ro?.disconnect() })
</script>

<template>
  <div class="space-y-6">
    <!-- 4 top stats -->
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="s in topStats" :key="s.key" class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div :class="['h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.tint]">
          <fa :icon="s.icon" />
        </div>
        <div>
          <div class="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{{ s.label }}</div>
          <div class="mt-1 text-2xl font-bold text-slate-800">{{ s.value }}</div>
        </div>
      </div>
    </div>

    <!-- 3 charts -->
    <div class="grid gap-6 xl:grid-cols-3">
      <div v-for="sec in sections" :key="sec.key" class="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-slate-800">{{ sec.title }}</h3>
          </div>
        </div>

        <div class="mt-6 flex  flex-col gap-5">
          <!-- Pie -->
          <div class="flex-1">
            <div v-if="pieLoading" class="flex h-[360px] items-center justify-center">Yuklanmoqda…</div>
            <div v-else-if="pieError" class="flex h-[360px] items-center justify-center text-rose-500 text-sm">{{ pieError }}</div>
            <div v-else-if="!sec.entries.length" class="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
              Maʼlumot mavjud emas
            </div>
            <div v-else class="relative h-[360px] w-full overflow-hidden rounded-2xl bg-slate-50 p-4 shadow-inner">
              <canvas :ref="setCanvasRef(sec.key)"></canvas>
            </div>
          </div>

          <!-- Ma'lumotlar: region pastda -->
          <div class="rounded-2xl border border-slate-100 bg-white/70 p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-700">Maʼlumotlar</h4>

            </div>
            <ul v-if="sec.entries.length" class="mt-3 space-y-1.5 text-sm">
              <li v-for="e in sec.entries" :key="e.label" class="flex items-center gap-2 text-slate-700">
                <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: e.color }"></span>
                <span class="truncate">{{ e.label }} — {{ fmtN(e.value) }}</span>
              </li>
            </ul>
            <div v-else class="mt-3 text-sm text-slate-400">Maʼlumot mavjud emas</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
