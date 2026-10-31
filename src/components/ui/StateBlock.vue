<script setup>
// Yagona holat bloki: yuklanmoqda / xato (+ Qayta urinish) / bo'sh.
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Ma’lumot topilmadi' },
});
defineEmits(['retry']);
</script>

<template>
  <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500" role="status">Yuklanmoqda…</div>
  <div v-else-if="error" class="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700" role="alert">
    <span>{{ error }}</span>
    <button type="button" class="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" @click="$emit('retry')">Qayta urinish</button>
  </div>
  <div v-else-if="empty" class="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{{ emptyText }}</div>
  <slot v-else />
</template>
