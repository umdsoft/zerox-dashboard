<script setup>
import { computed, ref } from 'vue';
import AppButton from './AppButton.vue';

// column: { key, label, render?, sortable?: boolean }
// Saralash faqat JORIY SAHIFA qatorlari bo'yicha (backend sort parametrini qo'llamaydi) —
// sarlavhadagi tooltip buni aytadi.
const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // Eksport tugmasi faqat handler berilganda ko'rinadi (mijoz tomonida xlsx yo'q).
  onExportXlsx: { type: Function, default: null },
  exportLabel: { type: String, default: 'Excelga yuklash' },
  exportBusy: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'Ma\'lumot topilmadi' },
});
const emit = defineEmits(['retry']);

const sortKey = ref('');
const sortDir = ref('asc');

const hasData = computed(() => props.rows && props.rows.length > 0);

const resolveValue = (row, column) => {
  if (!column) return '';
  if (typeof column.render === 'function') return column.render(row);
  if (column.key?.includes('.')) {
    return column.key.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), row) ?? '';
  }
  return column.key ? row[column.key] ?? '' : '';
};

function toggleSort(column) {
  if (!column.sortable || !column.key) return;
  if (sortKey.value === column.key) {
    if (sortDir.value === 'asc') sortDir.value = 'desc';
    else { sortKey.value = ''; sortDir.value = 'asc'; }
  } else {
    sortKey.value = column.key;
    sortDir.value = 'asc';
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows;
  const col = props.columns.find((c) => c.key === sortKey.value);
  if (!col) return props.rows;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  const val = (r) => resolveValue(r, col);
  return [...props.rows].sort((a, b) => {
    const x = val(a); const y = val(b);
    const nx = Number(String(x).replace(/\s/g, '').replace(',', '.'));
    const ny = Number(String(y).replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(nx) && Number.isFinite(ny) && String(x).trim() !== '' && String(y).trim() !== '') return (nx - ny) * dir;
    return String(x).localeCompare(String(y), 'uz') * dir;
  });
});

const ariaSort = (c) => (c.sortable && sortKey.value === c.key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : undefined);
</script>

<template>
  <div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
    <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
      <div>
        <slot name="title">
          <h3 class="text-base font-semibold text-slate-800">Ma'lumotlar</h3>
        </slot>
        <slot name="description"></slot>
      </div>
      <AppButton v-if="props.onExportXlsx" variant="primary" size="sm" :disabled="exportBusy" @click="props.onExportXlsx()">
        {{ exportBusy ? 'Tayyorlanmoqda…' : exportLabel }}
      </AppButton>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in props.columns"
              :key="column.key || column.label"
              scope="col"
              :aria-sort="ariaSort(column)"
              class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-600 sm:px-6"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="inline-flex items-center gap-1 rounded hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="Faqat joriy sahifadagi qatorlar saralanadi"
                @click="toggleSort(column)"
              >
                {{ column.label }}
                <span aria-hidden="true" class="text-slate-500">{{ sortKey === column.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr v-if="props.loading">
            <td :colspan="props.columns.length" class="px-6 py-8 text-center text-sm text-slate-500" role="status">Yuklanmoqda…</td>
          </tr>
          <tr v-else-if="props.error">
            <td :colspan="props.columns.length" class="px-6 py-8 text-center text-sm text-rose-700" role="alert">
              <span>{{ props.error }}</span>
              <button type="button" class="ml-3 rounded-lg border border-rose-300 bg-white px-3 py-1 font-medium text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" @click="emit('retry')">Qayta urinish</button>
            </td>
          </tr>
          <tr v-else-if="!hasData">
            <td :colspan="props.columns.length" class="px-6 py-8 text-center text-sm text-slate-500">{{ props.emptyMessage }}</td>
          </tr>
          <tr v-else v-for="(row, rowIndex) in sortedRows" :key="row.id || rowIndex" class="hover:bg-slate-50/60">
            <td v-for="column in props.columns" :key="column.key || column.label" class="px-4 py-4 text-sm text-slate-700 sm:px-6">
              <slot :name="`cell-${column.key}`" :row="row" :value="resolveValue(row, column)">
                {{ resolveValue(row, column) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
