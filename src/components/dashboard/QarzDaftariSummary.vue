<script setup>
import { computed } from 'vue'
import { fmtDate, fmtNum } from '../../lib/format'

const props = defineProps({
  qarzDaftari: { type: Object, required: true },
  stores: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const fmtN = (v) => fmtNum(v ?? 0)
const fmtD = (v) => fmtDate(v, { empty: '—' })

// UZS doim ko'rsatiladi; USD faqat ma'lumot bo'lsa
const qdCards = computed(() => {
  const out = []
  for (const cur of ['UZS', 'USD']) {
    const d = props.qarzDaftari?.[cur]
    if (d && (Number(d.soni) > 0 || cur === 'UZS')) out.push({ cur, ...d })
  }
  return out
})
</script>

<template>
  <div class="space-y-6">
    <!-- Qarz daftari — umumiy summalar (valyuta kesimida) -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-base font-semibold text-slate-800">Qarz daftari (umumiy)</h3>
      </div>

      <div v-if="loading" class="mt-4 text-sm text-slate-500">Yuklanmoqda…</div>
      <!-- UZS va USD tepa-past (vertikal) — ma'lumotlar chalg'itmasligi uchun -->
      <div v-else class="mt-4 space-y-4">
        <div v-for="c in qdCards" :key="c.cur" class="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
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

    <!-- Qarz daftari — DO'KONLAR RO'YXATI (har do'kon nechta/qancha qarz ro'yxatga olgan) -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-base font-semibold text-slate-800">Do'konlar ro'yxati</h3>
        <span class="text-xs font-semibold text-slate-500">{{ fmtN(stores.length) }} ta do'kon</span>
      </div>

      <div v-if="loading" class="mt-4 text-sm text-slate-500">Yuklanmoqda…</div>
      <div v-else-if="!stores.length" class="mt-4 text-sm text-slate-500">Do‘kon qarzlari topilmadi</div>
      <div v-else class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th class="px-3 py-2 text-left">Do'kon</th>
              <th class="px-3 py-2 text-left">Manzil</th>
              <th class="px-3 py-2 text-left">Ro'yxatga olingan</th>
              <th class="px-3 py-2 text-center">Qarzlar soni</th>
              <th class="px-3 py-2 text-center">SMS</th>
              <th class="px-3 py-2 text-center">Tariflar</th>
              <th class="px-3 py-2 text-right">UZS (jami summa)</th>
              <th class="px-3 py-2 text-right">USD (jami summa)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="st in stores"
              :key="st.faoliyat_id"
              class="hover:bg-slate-50/60"
            >
              <td class="px-3 py-2.5">
                <RouterLink :to="{ name: 'stores-detail', params: { id: st.faoliyat_id } }" class="flex items-center gap-1.5 font-medium text-indigo-700 hover:underline">
                  {{ st.nomi }}
                  <fa icon="chevron-right" class="text-[10px] text-slate-500" />
                </RouterLink>
              </td>
              <td class="px-3 py-2.5 text-slate-600">
                <span v-if="st.manzil">{{ st.manzil }}</span>
                <span v-else class="text-slate-500">—</span>
              </td>
              <td class="px-3 py-2.5 text-slate-600 tabular-nums">{{ fmtD(st.royxat_sana) }}</td>
              <td class="px-3 py-2.5 text-center font-semibold text-slate-700 tabular-nums">{{ fmtN(st.soni) }}</td>
              <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ fmtN(st.sms_soni) }}</td>
              <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ fmtN(st.tarif_soni) }}</td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                <template v-if="st.UZS.soni">
                  <span class="font-semibold text-slate-800">{{ fmtN(st.UZS.jami) }}</span>
                  <span class="ml-1 text-xs text-slate-500">({{ st.UZS.soni }} ta)</span>
                </template>
                <span v-else class="text-slate-500">—</span>
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                <template v-if="st.USD.soni">
                  <span class="font-semibold text-slate-800">{{ fmtN(st.USD.jami) }}</span>
                  <span class="ml-1 text-xs text-slate-500">({{ st.USD.soni }} ta)</span>
                </template>
                <span v-else class="text-slate-500">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
