<script setup>
import { onMounted, ref } from 'vue';
import AppCard from '../../components/ui/AppCard.vue';
import DataTable from '../../components/ui/DataTable.vue';
import api from '../../lib/axios';

const stats = ref([
  { label: 'Total Users', value: '1,248', subtitle: 'Users' },
  { label: 'Monthly Revenue', value: '$84,930', subtitle: 'Revenue' },
  { label: 'Active Contracts', value: '312', subtitle: 'Contracts' },
  { label: 'Pending Payments', value: '$12,450', subtitle: 'Payments' }
]);

const recentPayments = ref([]);
const loading = ref(false);

const columns = [
  { label: 'Payment ID', key: 'id' },
  { label: 'User', key: 'user.name' },
  { label: 'Amount', key: 'amount' },
  { label: 'Status', key: 'status' },
  { label: 'Date', key: 'date' }
];

const fallbackRows = [
  {
    id: 'PMT-001',
    user: { name: 'John Doe' },
    amount: '$320.00',
    status: 'Completed',
    date: '2024-04-04'
  },
  {
    id: 'PMT-002',
    user: { name: 'Jane Smith' },
    amount: '$180.00',
    status: 'Pending',
    date: '2024-04-03'
  },
  {
    id: 'PMT-003',
    user: { name: 'Acme Corp.' },
    amount: '$1,200.00',
    status: 'Completed',
    date: '2024-04-02'
  }
];

const loadRecentPayments = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/payments', { params: { limit: 5 } });
    recentPayments.value = Array.isArray(data) ? data : data?.data || fallbackRows;
  } catch (error) {
    recentPayments.value = fallbackRows;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadRecentPayments();
});
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <AppCard v-for="stat in stats" :key="stat.label" :title="stat.value" :subtitle="stat.subtitle">
        {{ stat.label }}
      </AppCard>
    </div>

    <DataTable
      :columns="columns"
      :rows="recentPayments"
      :loading="loading"
      download-filename="recent-payments.xlsx"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">Recent payments</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500">Latest financial activity synced from your payment provider.</p>
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
              : 'bg-slate-100 text-slate-600'
          ]"
        >
          {{ value }}
        </span>
      </template>
    </DataTable>
  </div>
</template>
