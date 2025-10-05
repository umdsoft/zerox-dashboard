<script setup>
import { onMounted, ref } from 'vue';
import DataTable from '../../components/ui/DataTable.vue';
import api from '../../lib/axios';

const loading = ref(false);
const payments = ref([]);

const columns = [
  { label: 'ID', key: 'id' },
  { label: 'User', key: 'user.name' },
  { label: 'Amount', key: 'amount' },
  { label: 'Status', key: 'status' },
  { label: 'Date', key: 'date' }
];

const fallbackPayments = [
  { id: 'PMT-1201', user: { name: 'John Doe' }, amount: '$210.00', status: 'Completed', date: '2024-04-04' },
  { id: 'PMT-1202', user: { name: 'Jane Smith' }, amount: '$340.00', status: 'Pending', date: '2024-04-03' },
  { id: 'PMT-1203', user: { name: 'Acme Corp.' }, amount: '$1,050.00', status: 'Failed', date: '2024-04-01' }
];

const loadPayments = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/payments');
    payments.value = Array.isArray(data) ? data : data?.data || fallbackPayments;
  } catch (error) {
    payments.value = fallbackPayments;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPayments();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Payments</h1>
        <p class="text-sm text-slate-500">Track all incoming and outgoing payments.</p>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="payments"
      :loading="loading"
      download-filename="payments.xlsx"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">All payments</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500">Review and export payment history.</p>
      </template>
      <template #cell-amount="{ value }">
        <span class="font-medium text-slate-800">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <span
          class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
          :class="[
            value === 'Completed'
              ? 'bg-emerald-100 text-emerald-700'
              : value === 'Pending'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-rose-100 text-rose-700'
          ]"
        >
          {{ value }}
        </span>
      </template>
    </DataTable>
  </div>
</template>
