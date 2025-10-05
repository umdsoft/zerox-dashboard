<script setup>
import { onMounted, ref } from 'vue';
import DataTable from '../../components/ui/DataTable.vue';
import api from '../../lib/axios';

const loading = ref(false);
const users = ref([]);

const columns = [
  { label: 'ID', key: 'id' },
  { label: 'Name', key: 'name' },
  { label: 'Phone', key: 'phone' },
  { label: 'Role', key: 'role.name' }
];

const fallbackUsers = [
  { id: 1, name: 'John Doe', phone: '+998 90 123 45 67', role: { name: 'Administrator' } },
  { id: 2, name: 'Jane Smith', phone: '+998 91 987 65 43', role: { name: 'Manager' } },
  { id: 3, name: 'Ali Valiyev', phone: '+998 93 555 11 22', role: { name: 'Operator' } }
];

const loadUsers = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/users');
    users.value = Array.isArray(data) ? data : data?.data || fallbackUsers;
  } catch (error) {
    users.value = fallbackUsers;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Users</h1>
        <p class="text-sm text-slate-500">Manage system administrators and platform operators.</p>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="users"
      :loading="loading"
      download-filename="users.xlsx"
    >
      <template #title>
        <h3 class="text-base font-semibold text-slate-800">All users</h3>
      </template>
      <template #description>
        <p class="text-sm text-slate-500">List of registered administrators and operators.</p>
      </template>
    </DataTable>
  </div>
</template>
