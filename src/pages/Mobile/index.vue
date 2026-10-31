<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import DataTable from '../../components/ui/DataTable.vue'
import Swal from 'sweetalert2'
import PagerBar from '../../components/ui/PagerBar.vue'
import { getVersions, createVersion, updateVersion, deleteVersion } from '../../api/version'
import { usePagedList } from '../../composables/useRequest'
import { useAuthStore } from '../../stores/auth'
import { errMessage } from '../../lib/format'

// Versiya boshqaruvi faqat super admin uchun (viewer/operator ma'lumotni ko'radi, o'zgartira olmaydi)
const auth = useAuthStore()
const canEdit = computed(() => auth.can('version'))

const submitting = ref(false)

// Saralash backendda qo'llab-quvvatlanmaydi - DataTable faqat joriy sahifani saralaydi
const list = usePagedList(({ signal }, { page, limit }) =>
  getVersions({ signal, params: { page, limit } }),
)
const { page, limit, total, loading, error } = list
const items = list.rows

// jadval uchun
const rows = computed(() => {
  const start = (page.value - 1) * limit.value
  return (items.value || []).map((x, i) => ({
    ...x,
    __i: start + i + 1,
    type_label: String(x?.type ?? 'android').toLowerCase() === 'ios' ? 'iOS' : 'Android',
    version: x?.version ?? '',
    min_version: x?.min_version || '',
    desc: x?.desc ?? '—',
  }))
})

const loadList = () => list.load()
onMounted(loadList)

// --- modal/CRUD
const isFormModalActive = ref(false)
const isDeleteModalActive = ref(false)
const method = ref('add')
const editId = ref(null)
const form = reactive({ type: 'android', version: '', min_version: '', desc: '' })

// 08.10: majburiy yangilanish — `min_version` (ixtiyoriy). Shu tizimning ENG SO'NGGI yozuvidagi
// qiymat ishlaydi: undan past versiyadagi ilovalar yangilanmaguncha bloklanadi (GET /version/check).
const VERSION_RE = /^\d+(\.\d+){1,2}$/
function cmpVersion(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d > 0 ? 1 : -1
  }
  return 0
}

function openAdd() {
  method.value = 'add'
  editId.value = null
  form.type = 'android'
  form.version = ''
  form.min_version = ''
  form.desc = ''
  isFormModalActive.value = true
}
function openEdit(row) {
  method.value = 'edit'
  editId.value = row?.id ?? row?._id
  form.type = (row?.type || 'android').toString().toLowerCase()
  form.version = row?.version ?? ''
  form.min_version = row?.min_version ?? ''
  form.desc = row?.desc ?? ''
  isFormModalActive.value = true
}
function closeForm(){ isFormModalActive.value = false }

async function save() {
  submitting.value = true
  try {
    const payload = {
      type: (form.type || 'android').toLowerCase(),
      version: form.version?.trim(),
      min_version: form.min_version?.trim() || null,
      desc: form.desc?.trim(),
    }
    if (!payload.version || !payload.desc) {
      submitting.value = false
      return Swal.fire('Ogohlantirish', "Iltimos, barcha maydonlarni to'ldiring.", 'warning')
    }
    if (!VERSION_RE.test(payload.version) || (payload.min_version && !VERSION_RE.test(payload.min_version))) {
      submitting.value = false
      return Swal.fire('Ogohlantirish', "Versiya 1.7 yoki 1.7.2 ko'rinishida bo'lishi kerak.", 'warning')
    }
    if (payload.min_version && cmpVersion(payload.min_version, payload.version) > 0) {
      submitting.value = false
      return Swal.fire('Ogohlantirish', "Minimal versiya ilova versiyasidan katta bo'lishi mumkin emas.", 'warning')
    }
    if (payload.min_version) {
      const ok = await Swal.fire({
        title: 'Majburiy yangilanish',
        text: `${payload.type === 'ios' ? 'iOS' : 'Android'} ilovasining ${payload.min_version} dan past versiyalari yangilanmaguncha ishlamaydi. Yangi versiya do'konda (Play Market / App Store) allaqachon chiqqanmi?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ha, saqlash',
        cancelButtonText: 'Bekor qilish',
      })
      if (!ok.isConfirmed) { submitting.value = false; return }
    }
    if (method.value === 'add') {
      await createVersion(payload)
      Swal.fire("Qo'shildi!", 'Yangi versiya qo‘shildi.', 'success')
    } else {
      await updateVersion(editId.value, payload)
      Swal.fire('Yangilandi!', 'Versiya yangilandi.', 'success')
    }
    closeForm()
    await loadList()
  } catch (e) {
    Swal.fire('Xatolik!', errMessage(e, "Ma'lumotni saqlashda xato yuz berdi."), 'error')
  } finally {
    submitting.value = false
  }
}

function confirmDelete(id){ editId.value = id; isDeleteModalActive.value = true }
async function executeDelete(){
  try {
    await deleteVersion(editId.value)
    Swal.fire("O'chirildi!", "Ma'lumot o'chirildi.", 'success')
    isDeleteModalActive.value = false
    await loadList()
  } catch (e) {
    Swal.fire('Xatolik!', errMessage(e, "Ma'lumotni o'chirishda xato yuz berdi."), 'error')
  }
}
</script>

<template>
  <!-- 1) Kulrang card/fonni olib tashladik, jadval butun kenglikda -->
  <div class="px-4 sm:px-6 py-4">
    <!-- Yuqori panel: faqat “Qo‘shish” tugmasi -->
    <div class="flex items-center justify-end mb-4">
      <button
        v-if="canEdit"
        type="button"
        @click.prevent="openAdd()"
        class="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-200"
      >
        <fa icon="plus" class="mr-2" /> Qo'shish
      </button>
    </div>

    <!-- DataTable: to‘liq container bo‘yicha -->
    <DataTable
      :columns="[
        { label: '№', key: '__i', width: 64 },
        { label: 'TIZIM', key: 'type', sortable: true },
        { label: 'ILOVA VERSIYASI', key: 'version', sortable: true },
        { label: 'MAJBURIY (MIN)', key: 'min_version', width: 140 },
        { label: `O'ZGARISH`, key: 'desc', sortable: true },
        { label: '', key: '__actions', width: 200 },
      ]"
      :rows="rows"
      :loading="loading"
      :error="error"
      class="w-full"
      @retry="list.retry()"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">Ilova versiyalari ({{ total }})</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-600">Android/iOS uchun chiqarilgan versiyalar ro‘yxati.<template v-if="!canEdit"> Tahrirlash faqat super admin uchun.</template></p>
      </template>

      <!-- № -->
      <template #cell-__i="{ row }">
        <div class="text-center">{{ row.__i }}</div>
      </template>

      <!-- Tizim -->
      <template #cell-type="{ row }">
        {{ row.type_label }}
      </template>

      <!-- 08.10: majburiy yangilanish chegarasi -->
      <template #cell-min_version="{ row }">
        <span v-if="row.min_version" class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold">{{ row.min_version }}</span>
        <span v-else class="text-slate-500">—</span>
      </template>

      <!-- O'zgarish (truncate) -->
      <template #cell-desc="{ row }">
        <div class="max-w-[700px] line-clamp-1">{{ row.desc }}</div>
      </template>

      <!-- Actions -->
      <template #cell-__actions="{ row }">
        <div v-if="canEdit" class="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            class="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
            @click="openEdit(row)"
          >
            <fa icon="pen" class="mr-1" /> O'zgartirish
          </button>
          <button
            type="button"
            class="flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-200"
            @click="confirmDelete(row.id ?? row._id)"
          >
            <fa icon="trash" class="mr-1" /> O'chirish
          </button>
        </div>
      </template>
    </DataTable>
    <PagerBar :page="page" :limit="limit" :total="total" :disabled="loading" @change="list.setPage" />
  </div>

  <!-- ADD/EDIT MODAL -->
  <div v-show="isFormModalActive" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      @click="isFormModalActive = false"
      class="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300"
    ></div>

    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6" role="dialog" aria-modal="true" aria-label="Versiya ma’lumotlari">
      <h2 class="text-2xl font-semibold mb-6 text-gray-800">
        {{ method === 'add' ? "Yangi versiya qo'shish" : 'Versiyani tahrirlash' }}
      </h2>

      <form @submit.prevent="save">
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">Tizim</label>
          <select v-model="form.type" class="w-full border rounded px-3 py-2">
            <option value="android">Android</option>
            <option value="ios">iOS</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">Ilova versiyasi</label>
          <input v-model.trim="form.version" type="text" required class="w-full border rounded px-3 py-2" placeholder="1.0.0" />
        </div>

        <!-- 08.10: majburiy yangilanish -->
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">Minimal versiya (majburiy yangilanish)</label>
          <input v-model.trim="form.min_version" type="text" class="w-full border rounded px-3 py-2" placeholder="Masalan: 1.7 (bo'sh — majburiy emas)" />
          <p class="text-xs text-slate-500 mt-1">
            To'ldirilsa, shu versiyadan past ilovalarda "Ilovaning yangi versiyasi mavjud" oynasi chiqadi va ilova
            yangilanmaguncha ishlamaydi. Faqat yangi versiya do'konda chiqqanidan keyin to'ldiring.
          </p>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold mb-2">O'zgarishlar tavsifi</label>
          <textarea v-model.trim="form.desc" required class="w-full border rounded px-3 py-2 h-32"></textarea>
        </div>

        <div class="flex justify-end gap-3">
          <button type="button" @click="isFormModalActive = false" class="px-4 py-2 bg-red-500 text-white rounded">Bekor qilish</button>
          <button type="submit" :disabled="submitting" class="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-60">
            {{ submitting ? 'Yuborilmoqda…' : (method === 'add' ? "Qo'shish" : 'Saqlash') }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- DELETE MODAL -->
  <div v-show="isDeleteModalActive" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div @click="isDeleteModalActive = false" class="absolute inset-0 bg-black bg-opacity-40"></div>
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
      <h5 class="text-xl font-semibold mb-6">Ma'lumot o'chirilsinmi?</h5>
      <div class="flex justify-center gap-3">
        <button type="button" @click="isDeleteModalActive = false" class="px-4 py-2 bg-gray-300 rounded">Yo'q</button>
        <button type="button" @click="executeDelete" class="px-4 py-2 bg-red-500 text-white rounded">Ha</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
