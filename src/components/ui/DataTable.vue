<script setup>
import { computed } from 'vue';
import * as XLSX from 'xlsx';
import AppButton from './AppButton.vue';

const props = defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  rows: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  downloadFilename: {
    type: String,
    default: 'export.xlsx'
  },
  onExportXlsx: {
    type: Function,
    default: null
  },
  emptyMessage: {
    type: String,
    default: 'No data available'
  }
});

const hasData = computed(() => props.rows && props.rows.length > 0);

const resolveValue = (row, column) => {
  if (!column) return '';
  if (typeof column.render === 'function') {
    return column.render(row);
  }
  if (column.key?.includes('.')) {
    return column.key.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), row) ?? '';
  }
  return column.key ? row[column.key] ?? '' : '';
};

const handleExport = async () => {
  if (props.onExportXlsx) {
    props.onExportXlsx();
    return;
  }

  const dataset = props.rows.map((row) => {
    return props.columns.reduce((acc, column) => {
      acc[column.label] = resolveValue(row, column);
      return acc;
    }, {});
  });

  const worksheet = XLSX.utils.json_to_sheet(dataset);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, props.downloadFilename);
};
</script>

<template>
  <div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
    <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
      <div>
        <slot name="title">
          <h3 class="text-base font-semibold text-slate-800">Data</h3>
        </slot>
        <slot name="description">
          <p class="text-sm text-slate-500">Export and manage your dataset easily.</p>
        </slot>
      </div>
      <AppButton variant="primary" size="sm" @click="handleExport">Export to Excel</AppButton>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in props.columns"
              :key="column.key || column.label"
              scope="col"
              class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr v-if="props.loading">
            <td :colspan="props.columns.length" class="px-6 py-8 text-center text-sm text-slate-500">
              Loading...
            </td>
          </tr>
          <tr v-else-if="!hasData">
            <td :colspan="props.columns.length" class="px-6 py-8 text-center text-sm text-slate-500">
              {{ props.emptyMessage }}
            </td>
          </tr>
          <tr v-else v-for="(row, rowIndex) in props.rows" :key="row.id || rowIndex">
            <td v-for="column in props.columns" :key="column.key || column.label" class="px-6 py-4 text-sm text-slate-700">
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
