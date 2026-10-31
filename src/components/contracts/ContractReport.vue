<script setup>
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../../lib/axios'
import { pdfUrl } from '../../lib/config'
import { fmtDate, fmtMoney } from '../../lib/format'
import { usePagedList } from '../../composables/useRequest'
import StateBlock from '../ui/StateBlock.vue'
import PagerBar from '../ui/PagerBar.vue'

// 6 ta foydalanuvchi shartnoma hisoboti sahifasi uchun umumiy komponent.
//   endpoint: 'hisobot' | 'history' | 'ex-history'   type: 'creditor' | 'debitor'
//   withStatus: true bo'lsa — "Tugallangan sana" va "Holat" ustunlari (hisobot), aks holda "Qolgan qarz summasi"
const props = defineProps({
  endpoint: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  withStatus: { type: Boolean, default: false },
})

const route = useRoute()
const isCreditor = computed(() => props.type === 'creditor')
// Kreditor sahifasida qarshi tomon — qarz beruvchi (debitor), debitorda — qarz oluvchi (kreditor)
const counterpartyLabel = computed(() => (isCreditor.value ? 'Qarz beruvchi' : 'Qarz oluvchi'))

function mapRow(it) {
  const names = isCreditor.value
    ? [it.debitor_name, [it.d_last_name, it.d_first_name, it.d_middle_name], it.debitor_uid ?? it.debtor_uid ?? it.d_uid ?? it.debitorUid ?? it.debtorUid, [it.debitor_last_name ?? it.debtor_last_name, it.debitor_first_name ?? it.debtor_first_name, it.debitor_middle_name ?? it.debtor_middle_name]]
    : [it.creditor_name, [it.c_last_name, it.c_first_name, it.c_middle_name], it.creditor_uid ?? it.kreditor_uid ?? it.c_uid ?? it.creditorUid]
  const [direct, parts, uid, alt] = names
  const joined = (arr) => (arr || []).filter(Boolean).join(' ').trim()
  return {
    party_uid: uid,
    party_name: direct || joined(parts) || joined(alt) || '',
    amount: it.amount ?? 0,
    residual_amount: it.residual_amount ?? it.remain ?? 0,
    currency: it.currency ?? 'UZS',
    created_at: it.created_at ?? it.start_date ?? it.issued_at,
    sana: it.sana ?? it.end_date ?? it.finish_date,
    number: it.number ?? it.contract_no ?? it.code ?? '',
    uid: it.uid ?? it.contract_uid ?? it.contractUid ?? '',
    status: it.status,
  }
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

const list = usePagedList(
  ({ signal }, { page, limit }) =>
    api.get(`/dashboard/con/${props.endpoint}/${route.params.id}`, { signal, params: { page, limit, type: props.type } }),
  { map: mapRow },
)
const { rows, page, limit, total, loading, error } = list

onMounted(() => list.load())
watch(() => route.params.id, () => list.reset())
function onPage(p) { window.scrollTo(0, 0); return list.setPage(p) }

const colCount = computed(() => (props.withStatus ? 6 : 5))
const th = 'px-4 py-3'
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ title }}</h2>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <caption class="sr-only">{{ title }}</caption>
        <thead class="bg-slate-50">
          <tr class="text-left text-xs font-semibold text-slate-600">
            <th scope="col" :class="th">{{ counterpartyLabel }}</th>
            <th scope="col" :class="[th, 'text-center']">Qarz summasi</th>
            <template v-if="withStatus">
              <th scope="col" :class="[th, 'text-center']">Qarz olingan sana</th>
              <th scope="col" :class="[th, 'text-center']">Tugallangan sana</th>
            </template>
            <template v-else>
              <th scope="col" :class="[th, 'text-center']">Qolgan qarz summasi</th>
              <th scope="col" :class="[th, 'text-center']">Qarz berilgan sana</th>
            </template>
            <th scope="col" :class="th">Qarz shartnomasi</th>
            <th v-if="withStatus" scope="col" :class="[th, 'text-center']">Holat</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-sm">
          <tr v-if="loading || error || rows.length === 0">
            <td :colspan="colCount" class="p-3">
              <StateBlock :loading="loading" :error="error" :empty="!loading && !error" empty-text="Ma’lumot yo‘q" @retry="list.retry()" />
            </td>
          </tr>
          <template v-else>
            <tr v-for="(r, i) in rows" :key="r.uid || i" class="hover:bg-slate-50">
              <td :class="th">
                <RouterLink v-if="r.party_uid" :to="`/users/${r.party_uid}`" class="text-indigo-700 hover:underline">{{ r.party_name || r.party_uid }}</RouterLink>
                <span v-else>{{ r.party_name || '—' }}</span>
              </td>
              <td :class="[th, 'text-center font-medium']">{{ fmtMoney(r.amount, r.currency) }}</td>
              <template v-if="withStatus">
                <td :class="[th, 'text-center']">{{ fmtDate(r.created_at) }}</td>
                <td :class="[th, 'text-center']">{{ fmtDate(r.sana) }}</td>
              </template>
              <template v-else>
                <td :class="[th, 'text-center']">{{ fmtMoney(r.residual_amount, r.currency) }}</td>
                <td :class="[th, 'text-center']">{{ fmtDate(r.created_at) }}</td>
              </template>
              <td :class="th">
                <a v-if="r.uid" :href="pdfUrl(r.uid, { lang: 'uz' })" target="_blank" rel="noopener" class="text-indigo-700 hover:underline">{{ r.number || r.uid }}</a>
                <span v-else>{{ r.number || '—' }}</span>
              </td>
              <td v-if="withStatus" :class="[th, 'text-center']">
                <span class="inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold" :class="statusBadge(r.status).cls">{{ statusBadge(r.status).text }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex-1"><PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="onPage" /></div>
      <label class="flex items-center gap-2 text-sm text-slate-600">
        Sahifada:
        <select :value="limit" class="rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @change="list.setLimit(Number($event.target.value))">
          <option v-for="n in [10, 20, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </div>
  </div>
</template>
