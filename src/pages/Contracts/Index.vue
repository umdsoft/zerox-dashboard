<script setup>
import { onMounted, ref } from 'vue';
import DataTable from '../../components/ui/DataTable.vue';
import api from '../../lib/axios';

const loading = ref(false);
const contracts = ref([]);

const columns = [
  { label: 'ID', key: 'id' },
  { label: 'Client', key: 'user.name' },
  { label: 'Amount', key: 'amount' },
  { label: 'Status', key: 'status' },
  { label: 'Signed At', key: 'signed_at' }
];

const fallbackContracts = [
  { id: 'CNT-4001', user: { name: 'John Doe' }, amount: '$4,500.00', status: 'Active', signed_at: '2024-03-21' },
  { id: 'CNT-4002', user: { name: 'Jane Smith' }, amount: '$3,200.00', status: 'Pending', signed_at: '2024-03-18' },
  { id: 'CNT-4003', user: { name: 'Acme Corp.' }, amount: '$9,750.00', status: 'Expired', signed_at: '2024-02-28' }
];

const loadContracts = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/contracts');
    contracts.value = Array.isArray(data) ? data : data?.data || fallbackContracts;
  } catch (error) {
    contracts.value = fallbackContracts;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadContracts();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Contracts</h1>
        <p class="text-sm text-slate-500">Monitor customer agreements and signature status.</p>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="contracts"
      :loading="loading"
      download-filename="contracts.xlsx"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">All contracts</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500">Stay on top of contract performance and renewals.</p>
      </template>
      <template #cell-amount="{ value }">
        <span class="font-medium text-slate-800">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <span
          class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
          :class="[
            value === 'Active'
              ? 'bg-emerald-100 text-emerald-700'
              : value === 'Pending'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-200 text-slate-700'
          ]"
        >
          {{ value }}
        </span>
      </template>
    </DataTable>
  </div>
</template>
