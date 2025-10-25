<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '../../lib/axios'
// default avatar (fix for vite import)
import defaultAvatar from '../../../assets/img/no-avatar.png'

const route = useRoute()
const loading = ref(false)
const err = ref('')
const raw = ref(null)

function fmtDate(val, withYear = false) {
  if (!val) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return withYear ? `${val} yil` : val
  const d = new Date(val); if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const s = `${dd}.${mm}.${yyyy}`
  return withYear ? `${s} yil` : s
}
function fmtMoney(n) {
  if (n == null) return '0'
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^\d.-]/g, ''))
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num)
}
const genderLabel = (g) => (Number(g) === 1 ? 'Erkak' : Number(g) === 2 ? 'Ayol' : '—')

const user = computed(() => {
  const u = raw.value || {}
  return {
    id: u.id ?? u.user_id,
    uid: u.uid ?? u.user_uid ?? '',
    type: Number(u.type ?? 2),
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    middle_name: u.middle_name ?? '',
    full_name: [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' '),
    phone: u.phone ?? '',
    brithday: u.brithday ? fmtDate(u.brithday, true) : '',
    gender: u.gender,
    region: u.region ?? '',
    district: u.district ?? '',
    address: u.address ?? '',
    contract_date: u.contract_date ? fmtDate(u.contract_date) : '',
    con_time: u.con_time ? String(u.con_time).slice(0, 5) : '',
    passport: u.passport ?? '',
    issued_by: u.issued_by ?? '',
    issued_date: u.issued_date ? fmtDate(u.issued_date, true) : '',
    expiry_date: u.expiry_date ? fmtDate(u.expiry_date, true) : '',
    rating: u.rating ?? 0,
    balance: u.balance ?? 0,
    image: u.image ? `https://app.zerox.uz/${u.image}` : null,
    company: u.company ?? '',
    director: u.director ?? '',
    stir: u.pinfl ?? '',
  }
})

const ofertaPdf = computed(() =>
  user.value.uid ? `https://pdf.zerox.uz/oferta.php?id=${user.value.uid}&download=1` : '#'
)

async function load() {
  const id = route.params.id
  if (!id) { err.value = 'Noto‘g‘ri foydalanuvchi ID'; return }
  loading.value = true; err.value = ''
  try {
    const res = await api.get(`/user/admin/user/${id}`)
    raw.value = res?.data?.data ?? res?.data ?? res
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || 'Ma’lumotni yuklashda xatolik'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
      Yuklanmoqda…
    </div>
    <div v-else-if="err" class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
      {{ err }}
    </div>

    <div v-else-if="user" class="grid gap-6 lg:grid-cols-12">
      <!-- LEFT -->
      <aside class="lg:col-span-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <div class="w-64 h-72 mx-auto rounded-xl overflow-hidden ring-1 ring-slate-200">
            <img :src="user.image || defaultAvatar" alt="avatar" class="w-full h-full object-cover" />
          </div>

          <div class="mt-3 font-semibold text-slate-800">{{ user.full_name }}</div>

          <div class="mt-5 border-t pt-4">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-600">ID raqami</div>
              <RouterLink :to="`/users/${user.uid}`" class="text-sm font-medium text-blue-600 hover:underline">
                {{ user.uid }}
              </RouterLink>
            </div>
          </div>

          <div class="mt-4 border-t pt-4">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-600">Mobil hisobidagi mablag’i</div>
              <div class="text-sm font-semibold">{{ fmtMoney(user.balance) }} UZS</div>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <RouterLink :to="`/users/${user.uid}/contracts`"
              class="block w-full rounded-md bg-blue-500 hover:bg-blue-600 hover:text-white text-white text-sm text-center py-2">
              Qarz shartnomalari
            </RouterLink>

            <RouterLink :to="`/users/${user.id}/logins`"
              class="block w-full rounded-md bg-blue-500 hover:bg-blue-600 hover:text-white text-white text-sm text-center py-2">
              Kirishlar arxivi
            </RouterLink>

            <a :href="ofertaPdf" download class="block w-full">
              <button class="w-full rounded-md bg-blue-500 hover:bg-blue-600 hover:text-white text-white text-sm py-2">
                Tasdiqlangan ommaviy ofertani yuklab olish
              </button>
            </a>
          </div>
        </div>
      </aside>

      <!-- RIGHT -->
      <section class="lg:col-span-8">
        <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full table-auto border-collapse">
              <!-- Jismoniy -->
              <tbody v-if="user.type === 2">
                <tr class="border-b border-slate-200">
                  <td class="w-1/3 px-4 py-3 text-slate-600">Familiya</td>
                  <td class="px-4 py-3">{{ user.last_name }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Ismi</td>
                  <td class="px-4 py-3">{{ user.first_name }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Sharifi</td>
                  <td class="px-4 py-3">{{ user.middle_name }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Tug'ilgan sanasi</td>
                  <td class="px-4 py-3">{{ user.brithday }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Jinsi</td>
                  <td class="px-4 py-3">{{ genderLabel(user.gender) }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Tel raqami</td>
                  <td class="px-4 py-3">{{ user.phone }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Elektron pochta manzili</td>
                  <td class="px-4 py-3">-</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Viloyat</td>
                  <td class="px-4 py-3">{{ user.region }}<span v-if="user.district">, {{ user.district }}</span></td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Yashash manzili</td>
                  <td class="px-4 py-3">{{ user.address }}</td>
                </tr>

                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Oferta tasdiqlangan sana</td>
                  <td class="px-4 py-3">
                    <span v-if="user.contract_date">{{ user.contract_date }} <span v-if="user.con_time">{{ user.con_time
                        }}</span></span>
                    <span v-else>—</span>
                  </td>
                </tr>
                <tr class="border-b border-slate-200 align-top">
                  <td class="px-4 py-3 text-slate-600">Pasport ma'lumoti</td>
                  <td class="px-4 py-3 space-y-1">
                    <div><b>Pasport seriasi:</b> {{ user.passport || '—' }}</div>
                    <div><b>JSHSHIR:</b> {{ user.stir || '—' }}</div>
                    <div><b>Kim tomonidan berilgan:</b> {{ user.issued_by || '—' }}</div>
                    <div><b>Berilgan vaqti:</b> {{ user.issued_date || '—' }}</div>
                    <div><b>Amal qilish muddati:</b> {{ user.expiry_date || '—' }}</div>
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-slate-600">Status</td>
                  <td class="px-4 py-3">{{ user.rating }}</td>
                </tr>
              </tbody>

              <!-- Yuridik -->
              <tbody v-else>
                <tr class="border-b border-slate-200">
                  <td class="w-1/3 px-4 py-3 text-slate-600">Korxona nomi</td>
                  <td class="px-4 py-3">{{ user.company }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Rahbar</td>
                  <td class="px-4 py-3">{{ user.director }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">STIR</td>
                  <td class="px-4 py-3">{{ user.stir }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Tel raqami</td>
                  <td class="px-4 py-3">{{ user.phone }}</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Elektron pochta manzili</td>
                  <td class="px-4 py-3">-</td>
                </tr>
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-3 text-slate-600">Yuridik manzili</td>
                  <td class="px-4 py-3">{{ user.address }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-slate-600">Status</td>
                  <td class="px-4 py-3">{{ user.rating }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
      Ma’lumot topilmadi
    </div>
  </div>
</template>
