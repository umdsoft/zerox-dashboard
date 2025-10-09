<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import DataTable from '../../components/ui/DataTable.vue'
import Swal from 'sweetalert2'
import api from '../../lib/axios'

const loading = ref(false)
const submitting = ref(false)

const page = ref(1)
const limit = ref(10)
const total = ref(0)
const query = ref('')

const sortKey = ref(null)
const sortDir = ref(null)

const items = ref([])

const columns = [
  { label: '№', key: '__i', width: 64 },
  { label: 'TIZIM', key: 'type', sortable: true },
  { label: 'ILOVA VERSIYASI', key: 'version', sortable: true },
  { label: "O'ZGARISH", key: 'desc', sortable: true },
  { label: '', key: '__actions', width: 200 },
]

// jadval uchun
const rows = computed(() => {
  const start = (page.value - 1) * limit.value
  return (items.value || []).map((x, i) => ({
    ...x,
    __i: start + i + 1,
    type_label: String(x?.type ?? 'android').toLowerCase() === 'ios' ? 'iOS' : 'Android',
    version: x?.version ?? '',
    desc: x?.desc ?? '—',
  }))
})

function normalize(res) {
  const raw = res?.data ?? res
  const list = Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw?.items) ? raw.items
    : []
  const t = Number(raw?.count) || Number(raw?.total) || list.length
  return { list, total: t || 0 }
}

async function loadList() {
  loading.value = true
  try {
    const res = await api.get('version/for-admin', {
      params: {
        page: page.value,
        limit: limit.value,
        search: query.value || undefined,
        sort_key: sortKey.value || undefined,
        sort_dir: sortDir.value || undefined,
      }
    })
    const { list, total: t } = normalize(res)
    items.value = list
    total.value = t
  } catch (e) {
    items.value = []
    total.value = 0
    Swal.fire('Xatolik!', "Ma'lumotlarni yuklashda xato yuz berdi.", 'error')
  } finally {
    loading.value = false
  }
}

watch([page, limit], loadList)
onMounted(loadList)

function onSortChange({ key, dir }) {
  sortKey.value = key
  sortDir.value = dir
  page.value = 1
  loadList()
}
function onRefresh() {
  page.value = 1
  loadList()
}

// --- modal/CRUD
const isFormModalActive = ref(false)
const isDeleteModalActive = ref(false)
const method = ref('add')
const editId = ref(null)
const form = reactive({ type: 'android', version: '', desc: '' })

function openAdd() {
  method.value = 'add'
  editId.value = null
  form.type = 'android'
  form.version = ''
  form.desc = ''
  isFormModalActive.value = true
}
function openEdit(row) {
  method.value = 'edit'
  editId.value = row?.id ?? row?._id
  form.type = (row?.type || 'android').toString().toLowerCase()
  form.version = row?.version ?? ''
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
      desc: form.desc?.trim(),
    }
    if (!payload.version || !payload.desc) {
      submitting.value = false
      return Swal.fire('Ogohlantirish', "Iltimos, barcha maydonlarni to'ldiring.", 'warning')
    }
    if (method.value === 'add') {
      await api.post('version/create', payload)
      Swal.fire("Qo'shildi!", 'Yangi versiya qo‘shildi.', 'success')
    } else {
      await api.put(`version/${editId.value}`, payload)
      Swal.fire('Yangilandi!', 'Versiya yangilandi.', 'success')
    }
    closeForm()
    await loadList()
  } catch (e) {
    Swal.fire('Xatolik!', "Ma'lumotni saqlashda xato yuz berdi.", 'error')
  } finally {
    submitting.value = false
  }
}

function confirmDelete(id){ editId.value = id; isDeleteModalActive.value = true }
async function executeDelete(){
  try {
    await api.delete(`version/${editId.value}`)
    Swal.fire("O'chirildi!", "Ma'lumot o'chirildi.", 'success')
    isDeleteModalActive.value = false
    await loadList()
  } catch (e) {
    Swal.fire('Xatolik!', "Ma'lumotni o'chirishda xato yuz berdi.", 'error')
  }
}
</script>

<template>
  <!-- 1) Kulrang card/fonni olib tashladik, jadval butun kenglikda -->
  <div class="px-4 sm:px-6 py-4">
    <!-- Yuqori panel: faqat “Qo‘shish” tugmasi -->
    <div class="flex items-center justify-end mb-4">
      <button
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
        { label: `O'ZGARISH`, key: 'desc', sortable: true },
        { label: '', key: '__actions', width: 200 },
      ]"
      :rows="rows"
      :total="total"
      :loading="loading"
      v-model:page="page"
      v-model:limit="limit"
      v-model:query="query"
      :plain="true"           
      class="w-full"
      @sort-change="onSortChange"
      @refresh="onRefresh"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">Ilova versiyalari ({{ total }})</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500">Android/iOS uchun chiqarilgan versiyalar ro‘yxati.</p>
      </template>

      <!-- № -->
      <template #cell-__i="{ row }">
        <div class="text-center">{{ row.__i }}</div>
      </template>

      <!-- Tizim -->
      <template #cell-type="{ row }">
        {{ row.type_label }}
      </template>

      <!-- O'zgarish (truncate) -->
      <template #cell-desc="{ row }">
        <div class="max-w-[700px] line-clamp-1">{{ row.desc }}</div>
      </template>

      <!-- Actions -->
      <template #cell-__actions="{ row }">
        <div class="flex flex-wrap gap-2 justify-end">
          <button
            class="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
            @click="openEdit(row)"
          >
            <fa icon="pen" class="mr-1" /> O'zgartirish
          </button>
          <button
            class="flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-200"
            @click="confirmDelete(row.id ?? row._id)"
          >
            <fa icon="trash" class="mr-1" /> O'chirish
          </button>
        </div>
      </template>
    </DataTable>
  </div>

  <!-- ADD/EDIT MODAL -->
  <div v-show="isFormModalActive" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      @click="isFormModalActive = false"
      class="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300"
    ></div>

    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
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
        <button @click="isDeleteModalActive = false" class="px-4 py-2 bg-gray-300 rounded">Yo'q</button>
        <button @click="executeDelete" class="px-4 py-2 bg-red-500 text-white rounded">Ha</button>
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
